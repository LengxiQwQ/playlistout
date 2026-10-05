import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateMigrations } from '../../scripts/d1/validate-migrations.js';
import {
  verifyD1Schema,
  REQUIRED_TABLES,
  REQUIRED_COLUMNS,
  REQUIRED_INDEXES,
} from '../../scripts/d1/verify-schema.js';
import { verifyDatabaseIdentity } from '../../scripts/d1/verify-db.js';
import {
  updateWranglerDatabaseId,
  provisionDatabase,
} from '../../scripts/d1/provision-db.js';
import {
  baselineLegacyDatabase,
  HISTORICAL_BASELINE_MIGRATIONS,
} from '../../scripts/d1/baseline-legacy.js';
import { validateMigrationHistory } from '../../scripts/d1/verify-migration-history.js';
import { verifyAnalyticsV2 } from '../../scripts/d1/verify-analytics-v2.js';
import { finalizeAnalyticsCutover } from '../../scripts/d1/finalize-analytics-v2-cutover.js';
import { verifyAnalyticsV1Retired } from '../../scripts/d1/verify-analytics-v1-retired.js';
import { verifyExpectedIsBracketed } from '../../scripts/d1/verify-production-public-stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const workerDir = path.resolve(rootDir, 'worker');
const migrationsDir = path.resolve(workerDir, 'migrations');

// Helper to apply migrations using SQLite transaction runner
function applyMigrationsToDb(db: DatabaseSync, migrationFileList?: string[]) {
  // Ensure d1_migrations exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = db.prepare('SELECT name FROM d1_migrations;').all() as { name: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  const files =
    migrationFileList ||
    fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Execute in transaction
    db.exec('BEGIN TRANSACTION;');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO d1_migrations (name) VALUES (?);').run(file);
      db.exec('COMMIT;');
      newlyApplied.push(file);
      appliedSet.add(file);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  return newlyApplied;
}

// Helper to bridge DatabaseSync queries to verifyD1Schema
function makeQueryFn(db: DatabaseSync) {
  return async (sql: string) => {
    return db.prepare(sql).all() as any[];
  };
}

function makeMutableQueryFn(db: DatabaseSync) {
  return async (sql: string) => {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT') || normalized.startsWith('PRAGMA') || normalized.startsWith('WITH')) {
      return db.prepare(sql).all() as any[];
    }
    db.exec(sql);
    return [];
  };
}

describe('PlaylistOut Insights R8 — D1 Provisioning & Migration Safety', () => {
  describe('1. Migration File Integrity, Naming & Immutability', () => {
    it('passes validation for current 0001-0014 migrations with matching manifest hashes', () => {
      const result = validateMigrations();
      expect(result.valid).toBe(true);
      expect(result.count).toBe(14);
      expect(result.files).toHaveLength(14);
      expect(result.files[0]).toBe('0001_initial_stats.sql');
      expect(result.files[8]).toBe('0009_parse_feedback.sql');
      expect(result.files[9]).toBe('0010_geo_attribution_expansion.sql');
      expect(result.files[10]).toBe('0011_analytics_v2.sql');
      expect(result.files[11]).toBe('0012_analytics_v2_cutover.sql');
      expect(result.files[12]).toBe('0013_freeze_analytics_v1_archive.sql');
      expect(result.files[13]).toBe('0014_retire_analytics_v1.sql');
    });

    it('rejects invalid migration filename format', () => {
      const tempDir = path.join(rootDir, 'node_modules', '.tmp_test_mig_name');
      fs.mkdirSync(tempDir, { recursive: true });
      try {
        fs.writeFileSync(path.join(tempDir, 'invalid_name.sql'), 'SELECT 1;');
        expect(() =>
          validateMigrations({ migrationsDir: tempDir, manifestPath: 'nonexistent' })
        ).toThrowError(/Invalid migration filename format/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('rejects sequence gaps (e.g. 0001 then 0003)', () => {
      const tempDir = path.join(rootDir, 'node_modules', '.tmp_test_mig_gap');
      fs.mkdirSync(tempDir, { recursive: true });
      try {
        fs.writeFileSync(path.join(tempDir, '0001_first.sql'), 'SELECT 1;');
        fs.writeFileSync(path.join(tempDir, '0003_third.sql'), 'SELECT 1;');
        expect(() =>
          validateMigrations({ migrationsDir: tempDir, manifestPath: 'nonexistent' })
        ).toThrowError(/Migration sequence gap or out-of-order/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('fails if any historical migration (0001-0008) is tampered with or modified', () => {
      const tempDir = path.join(rootDir, 'node_modules', '.tmp_test_mig_mutate');
      fs.mkdirSync(tempDir, { recursive: true });
      const tempManifest = path.join(tempDir, 'manifest.json');
      try {
        fs.writeFileSync(path.join(tempDir, '0001_initial_stats.sql'), 'ALTERED SQL CONTENT');
        fs.writeFileSync(
          tempManifest,
          JSON.stringify({
            '0001_initial_stats.sql': 'ac2fd8da1959eb626396608ce597531dba9363688274c62807adc4a083d73fb4',
          })
        );
        expect(() =>
          validateMigrations({ migrationsDir: tempDir, manifestPath: tempManifest })
        ).toThrowError(/Historical migration mutated/);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('2. Fresh Database Migration Apply & Schema Completeness', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('applies all 14 migrations sequentially from empty database', () => {
      const applied = applyMigrationsToDb(db);
      expect(applied).toHaveLength(14);
      expect(applied).toEqual([
        '0001_initial_stats.sql',
        '0002_analytics_foundation.sql',
        '0003_replace_events_with_aggregates.sql',
        '0004_visitors_and_site_metrics.sql',
        '0005_geo_city_support.sql',
        '0006_seed_netease_platform_stats.sql',
        '0007_cleanup_seeded_fake_stats.sql',
        '0008_security_rate_limits.sql',
        '0009_parse_feedback.sql',
        '0010_geo_attribution_expansion.sql',
        '0011_analytics_v2.sql',
        '0012_analytics_v2_cutover.sql',
        '0013_freeze_analytics_v1_archive.sql',
        '0014_retire_analytics_v1.sql',
      ]);
    });

    it('creates the post-retirement schema and removes every V1 fact table', async () => {
      applyMigrationsToDb(db);
      const queryFn = makeQueryFn(db);

      const verification = await verifyD1Schema({ queryFn });
      expect(verification.verified).toBe(true);
      expect(verification.appliedMigrationsCount).toBe(14);
      expect(verification.pendingCount).toBe(0);

      const existingTables = new Set(
        (await queryFn("SELECT name FROM sqlite_master WHERE type='table';") as { name: string }[])
          .map((row) => row.name)
      );
      for (const retired of [
        'aggregate_stats',
        'hourly_stats',
        'daily_geo_stats',
        'daily_client_stats',
        'daily_performance_stats',
        'daily_export_stats',
        'daily_clipboard_stats',
      ]) {
        expect(existingTables.has(retired)).toBe(false);
      }

      const dailyCoreCols = (await queryFn('PRAGMA table_info(analytics_v2_daily_core);')) as { name: string }[];
      const dailyCoreNames = dailyCoreCols.map((col) => col.name);
      expect(dailyCoreNames).toContain('channel');
      expect(dailyCoreNames).toContain('client_id');
      expect(dailyCoreNames).toContain('metric');

      const cutoverState = (await queryFn(
        'SELECT status, baseline_date, frozen_at FROM analytics_v2_cutover_state WHERE id=1;'
      )) as any[];
      expect(cutoverState).toHaveLength(1);
      expect(cutoverState[0].status).toBe('frozen');
      expect(cutoverState[0].frozen_at).toBeTruthy();

      const archiveManifest = (await queryFn(
        'SELECT table_name FROM analytics_v1_archive_manifest ORDER BY table_name;'
      )) as { table_name: string }[];
      expect(archiveManifest).toHaveLength(7);

      const cleanupState = (await queryFn(
        'SELECT status, archived_table_count, public_history_rows FROM analytics_v1_cleanup_state WHERE id=1;'
      )) as any[];
      expect(cleanupState).toHaveLength(1);
      expect(cleanupState[0].status).toBe('retired');
      expect(Number(cleanupState[0].archived_table_count)).toBe(7);

      const retirement = await verifyAnalyticsV1Retired({ queryFn });
      expect(retirement.verified).toBe(true);
      expect(retirement.manifestRows).toBe(7);
    });
  });

  describe('3. Second Apply Strict No-Op & Current Data Preservation', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      applyMigrationsToDb(db);
    });

    afterEach(() => {
      db.close();
    });

    it('performs strict no-op on second apply with 0 newly applied migrations', () => {
      const secondRun = applyMigrationsToDb(db);
      expect(secondRun).toHaveLength(0);
    });

    it('preserves current V2 and feedback data on a second apply', () => {
      db.prepare(`
        INSERT INTO analytics_v2_daily_core
          (date, channel, client_id, platform, metric, count)
        VALUES ('2026-10-05', 'web', 'official_web', 'qqmusic', 'playlist_success', 42)
      `).run();

      db.prepare(`
        INSERT INTO parse_feedback
          (id, fingerprint, platform, error_code, status, report_count, created_at, last_reported_at)
        VALUES ('sentinel-feedback', 'sentinel-fingerprint', 'qqmusic', 'upstream_error',
          'pending', 3, '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z')
      `).run();

      const secondRun = applyMigrationsToDb(db);
      expect(secondRun).toHaveLength(0);

      const metric = db.prepare(`
        SELECT count FROM analytics_v2_daily_core
        WHERE date='2026-10-05' AND channel='web' AND client_id='official_web'
          AND platform='qqmusic' AND metric='playlist_success'
      `).get() as any;
      expect(metric.count).toBe(42);

      const feedback = db.prepare(
        "SELECT report_count FROM parse_feedback WHERE id='sentinel-feedback'"
      ).get() as any;
      expect(feedback.report_count).toBe(3);
    });
  });

  describe('4. Partial Migration Continuation', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('resumes from partially applied state (0001-0004 -> applies 0005-0014)', async () => {
      const firstBatch = [
        '0001_initial_stats.sql',
        '0002_analytics_foundation.sql',
        '0003_replace_events_with_aggregates.sql',
        '0004_visitors_and_site_metrics.sql',
      ];
      applyMigrationsToDb(db, firstBatch);

      const appliedBefore = (db.prepare('SELECT name FROM d1_migrations;').all() as any[]).map(
        (row) => row.name
      );
      expect(appliedBefore).toEqual(firstBatch);

      const geoColsBefore = (db.prepare('PRAGMA table_info(daily_geo_stats);').all() as any[]).map(
        (col) => col.name
      );
      expect(geoColsBefore).not.toContain('city');

      const newlyApplied = applyMigrationsToDb(db);
      expect(newlyApplied).toEqual([
        '0005_geo_city_support.sql',
        '0006_seed_netease_platform_stats.sql',
        '0007_cleanup_seeded_fake_stats.sql',
        '0008_security_rate_limits.sql',
        '0009_parse_feedback.sql',
        '0010_geo_attribution_expansion.sql',
        '0011_analytics_v2.sql',
        '0012_analytics_v2_cutover.sql',
        '0013_freeze_analytics_v1_archive.sql',
        '0014_retire_analytics_v1.sql',
      ]);

      const verification = await verifyD1Schema({ queryFn: makeQueryFn(db) });
      expect(verification.verified).toBe(true);
      expect(verification.appliedMigrationsCount).toBe(14);
      expect(verification.pendingCount).toBe(0);

      const retired = db.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='daily_geo_stats';"
      ).get() as any;
      expect(retired.count).toBe(0);
    });
  });

  describe('5. Migration Failure Atomicity & Recovery', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    });

    afterEach(() => {
      db.close();
    });

    it('rolls back completely when a statement fails, leaving no partial table or history', () => {
      const faultyMigrationSql = `
        CREATE TABLE r8_failure_test (id INT PRIMARY KEY);
        INSERT INTO r8_failure_test (id) VALUES (1);
        INTENTIONAL_SYNTAX_ERROR_ABORT_TRANSACTION;
      `;

      expect(() => {
        db.exec('BEGIN TRANSACTION;');
        try {
          db.exec(faultyMigrationSql);
          db.prepare("INSERT INTO d1_migrations (name) VALUES ('0099_faulty.sql');").run();
          db.exec('COMMIT;');
        } catch (err) {
          db.exec('ROLLBACK;');
          throw err;
        }
      }).toThrow();

      // Verify table was rolled back and does not exist
      const tableCheck = db
        .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='r8_failure_test';")
        .get() as any;
      expect(tableCheck.count).toBe(0);

      // Verify d1_migrations was not updated
      const historyCheck = db
        .prepare("SELECT count(*) as count FROM d1_migrations WHERE name='0099_faulty.sql';")
        .get() as any;
      expect(historyCheck.count).toBe(0);
    });
  });

  describe('5.5 Analytics V2 Public Cutover Reconciliation', () => {
    let db: DatabaseSync;
    const through0013 = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .slice(0, 13);

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      applyMigrationsToDb(db, through0013);
    });

    afterEach(() => {
      db.close();
    });

    it('freezes a reconciled zero-delta cutover baseline before retirement', async () => {
      const result = await finalizeAnalyticsCutover({
        queryFn: makeMutableQueryFn(db),
        confirm: true,
      });

      expect(result.finalized).toBe(true);
      expect(result.alreadyFrozen).toBe(false);
      expect(result.checks).toHaveLength(14);
      expect(result.checks.every((check: any) => check.totalOk && check.dayOk)).toBe(true);

      const state = db.prepare(
        "SELECT status, frozen_at FROM analytics_v2_cutover_state WHERE id=1"
      ).get() as any;
      expect(state.status).toBe('frozen');
      expect(state.frozen_at).toBeTruthy();
    });

    it('fails closed when V1 and V2 advance by different deltas', async () => {
      const today = new Date().toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO aggregate_stats (date, platform, metric, count)
        VALUES (?, 'all', 'parse_success', 1)
      `).run(today);
      db.prepare(`
        INSERT INTO aggregate_stats (date, platform, metric, count)
        VALUES ('TOTAL', 'all', 'parse_success', 1)
      `).run();

      await expect(
        finalizeAnalyticsCutover({
          queryFn: makeMutableQueryFn(db),
          confirm: true,
        })
      ).rejects.toThrow(/Cutover reconciliation failed for metric:playlist_success/);

      const state = db.prepare(
        "SELECT status FROM analytics_v2_cutover_state WHERE id=1"
      ).get() as any;
      expect(state.status).toBe('prepared');
    });
  });

  describe('5.6 Analytics V1 Retirement & Public Contract Hardening', () => {
    let db: DatabaseSync;
    const through0013 = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .slice(0, 13);

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      applyMigrationsToDb(db, through0013);
    });

    afterEach(() => {
      db.close();
    });

    it('materializes public history and permanently removes all V1 fact tables', async () => {
      await finalizeAnalyticsCutover({
        queryFn: makeMutableQueryFn(db),
        confirm: true,
      });

      const applied = applyMigrationsToDb(db, ['0014_retire_analytics_v1.sql']);
      expect(applied).toEqual(['0014_retire_analytics_v1.sql']);

      const result = await verifyAnalyticsV1Retired({
        queryFn: makeQueryFn(db),
      });
      expect(result.verified).toBe(true);
      expect(result.manifestRows).toBe(7);

      const legacyTableCount = db.prepare(`
        SELECT COUNT(*) AS count
        FROM sqlite_master
        WHERE type='table'
          AND name IN (
            'aggregate_stats','hourly_stats','daily_geo_stats','daily_client_stats',
            'daily_performance_stats','daily_export_stats','daily_clipboard_stats'
          )
      `).get() as any;
      expect(legacyTableCount.count).toBe(0);
    });

    it('rolls back and keeps V1 tables if the frozen archive changed after migration 0013', async () => {
      await finalizeAnalyticsCutover({
        queryFn: makeMutableQueryFn(db),
        confirm: true,
      });

      db.prepare(`
        INSERT INTO aggregate_stats (date, platform, metric, count)
        VALUES ('2099-01-01', 'qqmusic', 'parse_success', 1)
      `).run();

      expect(() =>
        applyMigrationsToDb(db, ['0014_retire_analytics_v1.sql'])
      ).toThrow();

      const legacyStillExists = db.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='aggregate_stats';"
      ).get() as any;
      expect(legacyStillExists.count).toBe(1);

      const cleanupState = db.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='analytics_v1_cleanup_state';"
      ).get() as any;
      expect(cleanupState.count).toBe(0);
    });

    it('accepts a D1 expectation bracketed by two monotonic public API reads', () => {
      const base = {
        totalPageViews: 100,
        pageViewsToday: 10,
        cumulativeDailyVisitors: 50,
        totalVisitors: 50,
        visitorsToday: 5,
        totalPlaylistsParsed: 40,
        playlistsParsedToday: 4,
        totalTracksProcessed: 400,
        tracksProcessedToday: 40,
        totalExports: 20,
        exportsToday: 2,
        exportFormatsBreakdown: { txt: 4, csv: 4, xlsx: 4, json: 4, m3u8: 4 },
        byPlatform: {
          qqmusic: { totalSuccess: 10, todaySuccess: 1 },
          netease: { totalSuccess: 10, todaySuccess: 1 },
          kugou: { totalSuccess: 10, todaySuccess: 1 },
          qishui: { totalSuccess: 10, todaySuccess: 1 },
        },
      };

      const expected = {
        ...base,
        totalPageViews: 101,
        pageViewsToday: 11,
        totalPlaylistsParsed: 41,
        playlistsParsedToday: 5,
        byPlatform: {
          ...base.byPlatform,
          qqmusic: { totalSuccess: 11, todaySuccess: 2 },
        },
      };

      const after = {
        ...expected,
        totalPageViews: 102,
        pageViewsToday: 12,
        totalPlaylistsParsed: 42,
        playlistsParsedToday: 6,
        byPlatform: {
          ...expected.byPlatform,
          qqmusic: { totalSuccess: 12, todaySuccess: 3 },
        },
      };

      expect(verifyExpectedIsBracketed(base, expected, after).length).toBeGreaterThan(20);
    });

    it('rejects a public API response that cannot bracket the D1 expectation', () => {
      const sample = {
        totalPageViews: 100,
        pageViewsToday: 10,
        cumulativeDailyVisitors: 50,
        totalVisitors: 50,
        visitorsToday: 5,
        totalPlaylistsParsed: 40,
        playlistsParsedToday: 4,
        totalTracksProcessed: 400,
        tracksProcessedToday: 40,
        totalExports: 20,
        exportsToday: 2,
        exportFormatsBreakdown: { txt: 4, csv: 4, xlsx: 4, json: 4, m3u8: 4 },
        byPlatform: {
          qqmusic: { totalSuccess: 10, todaySuccess: 1 },
          netease: { totalSuccess: 10, todaySuccess: 1 },
          kugou: { totalSuccess: 10, todaySuccess: 1 },
          qishui: { totalSuccess: 10, todaySuccess: 1 },
        },
      };

      const expected = { ...sample, totalPageViews: 105 };
      expect(() =>
        verifyExpectedIsBracketed(sample, expected, sample)
      ).toThrow(/Production \/api\/stats reconciliation failed/);
    });
  });

  describe('6. Legacy Untracked Database & Explicit Baseline', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('fails closed on normal deploy if schema exists without trustworthy d1_migrations', async () => {
      // Create partial business table without d1_migrations
      db.exec('CREATE TABLE aggregate_stats (date TEXT, platform TEXT, metric TEXT, count INT);');

      const queryFn = makeQueryFn(db);
      await expect(verifyD1Schema({ queryFn })).rejects.toThrow(/Missing required tables:.*d1_migrations/);
    });

    it('refuses legacy baseline without explicit --baseline-existing and --confirm flags', async () => {
      const queryFn = makeQueryFn(db);
      await expect(
        baselineLegacyDatabase({ queryFn, baselineExisting: false, confirm: false })
      ).rejects.toThrow(/Legacy baseline requires explicit operator flags/);
    });

    it('refuses legacy baseline if schema evidence is missing or incomplete', async () => {
      // Create only aggregate_stats, missing the rest
      db.exec('CREATE TABLE aggregate_stats (date TEXT, platform TEXT, metric TEXT, count INT);');

      const queryFn = makeQueryFn(db);
      await expect(
        baselineLegacyDatabase({ queryFn, baselineExisting: true, confirm: true })
      ).rejects.toThrow(/missing required schema tables/);
    });

    it('successfully baselines known boundary (0001-0008) when schema evidence is verified', async () => {
      // Pre-apply migrations 0001-0008 without recording in d1_migrations to simulate untracked legacy DB
      for (const file of HISTORICAL_BASELINE_MIGRATIONS) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        db.exec(sql);
      }

      // Establish explicit baseline
      const queryFn = makeQueryFn(db);
      const result = await baselineLegacyDatabase({
        queryFn,
        baselineExisting: true,
        confirm: true,
      });

      expect(result.baselined).toBe(true);
      expect(result.count).toBe(8);

      // Verify d1_migrations now contains exactly 0001-0008
      const recorded = (db.prepare('SELECT name FROM d1_migrations ORDER BY id ASC;').all() as any[]).map(
        (r) => r.name
      );
      expect(recorded).toEqual(HISTORICAL_BASELINE_MIGRATIONS);

      // Apply pending 0009 migration on top of baseline
      applyMigrationsToDb(db);

      // Normal schema verification now passes
      const verification = await verifyD1Schema({ queryFn });
      expect(verification.verified).toBe(true);
      expect(verification.pendingCount).toBe(0);
    });

    it('does NOT swallow future migrations (e.g. 0009): future migration remains pending after legacy baseline', async () => {
      // Pre-apply 0001-0008
      for (const file of HISTORICAL_BASELINE_MIGRATIONS) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        db.exec(sql);
      }

      // Establish explicit baseline
      const queryFn = makeQueryFn(db);
      await baselineLegacyDatabase({
        queryFn,
        baselineExisting: true,
        confirm: true,
      });

      // Verify that if a 0009 migration exists, it is recognized as pending and not in d1_migrations
      const applied = (db.prepare('SELECT name FROM d1_migrations;').all() as any[]).map((r) => r.name);
      expect(applied).not.toContain('0009_future_schema.sql');

      // If we query applied against a list containing 0009:
      const allWithFuture = [...HISTORICAL_BASELINE_MIGRATIONS, '0009_future_schema.sql'];
      const pending = allWithFuture.filter((f) => !applied.includes(f));
      expect(pending).toEqual(['0009_future_schema.sql']);
    });
  });

  describe('7. Production Database Identity Verification (Fail-Closed)', () => {
    it('fails closed when expected database is missing from Cloudflare account (never creates)', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ name: 'some-other-database', uuid: 'other-uuid' }],
        }),
      });

      await expect(
        verifyDatabaseIdentity({
          token: 'mock-token',
          accountId: 'mock-account',
          expected: { databaseName: 'playlistout-stats', databaseId: '0d6cbfb5-70bb-4a61-b2f0-f9cac30cf76e' },
          fetch: mockFetch as any,
        })
      ).rejects.toThrow(/Production D1 database "playlistout-stats" not found[\s\S]*fails closed/);
    });

    it('fails closed when database UUID mismatches wrangler.jsonc', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ name: 'playlistout-stats', uuid: 'wrong-uuid-12345' }],
        }),
      });

      await expect(
        verifyDatabaseIdentity({
          token: 'mock-token',
          accountId: 'mock-account',
          expected: { databaseName: 'playlistout-stats', databaseId: '0d6cbfb5-70bb-4a61-b2f0-f9cac30cf76e' },
          fetch: mockFetch as any,
        })
      ).rejects.toThrow(/UUID mismatch/);
    });

    it('passes when database name and UUID strictly match', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ name: 'playlistout-stats', uuid: '0d6cbfb5-70bb-4a61-b2f0-f9cac30cf76e' }],
        }),
      });

      const res = await verifyDatabaseIdentity({
        token: 'mock-token',
        accountId: 'mock-account',
        expected: { databaseName: 'playlistout-stats', databaseId: '0d6cbfb5-70bb-4a61-b2f0-f9cac30cf76e' },
        fetch: mockFetch as any,
      });

      expect(res.verified).toBe(true);
      expect(res.databaseId).toBe('0d6cbfb5-70bb-4a61-b2f0-f9cac30cf76e');
    });
  });

  describe('8. Explicit Provisioning & wrangler.jsonc Bug A Regression', () => {
    const tempConfigPath = path.join(rootDir, 'node_modules', '.tmp_wrangler_test.jsonc');

    afterEach(() => {
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
    });

    it('correctly updates database_id even when "routes" block is completely absent (Bug A fix)', () => {
      const initialJsonc = `{\n  "name": "playlistout-api",\n  "d1_databases": [\n    {\n      "binding": "DB",\n      "database_name": "playlistout-stats",\n      "database_id": "old-uuid-1111"\n    }\n  ]\n}`;
      fs.writeFileSync(tempConfigPath, initialJsonc, 'utf8');

      const result = updateWranglerDatabaseId(tempConfigPath, 'new-uuid-2222');
      expect(result.updated).toBe(true);
      expect(result.oldUuid).toBe('old-uuid-1111');
      expect(result.newUuid).toBe('new-uuid-2222');

      const updatedFile = fs.readFileSync(tempConfigPath, 'utf8');
      expect(updatedFile).toContain('"database_id": "new-uuid-2222"');
      expect(updatedFile).not.toContain('old-uuid-1111');
    });

    it('leaves file untouched when database_id is already identical (idempotent)', () => {
      const initialJsonc = `{\n  "database_id": "identical-uuid-3333"\n}`;
      fs.writeFileSync(tempConfigPath, initialJsonc, 'utf8');

      const result = updateWranglerDatabaseId(tempConfigPath, 'identical-uuid-3333');
      expect(result.updated).toBe(false);
    });

    it('creates database only in explicit provision mode when DB does not exist', async () => {
      let created = false;
      const mockFetch = async (url: string, opts?: any) => {
        if (opts?.method === 'POST') {
          created = true;
          return {
            ok: true,
            json: async () => ({
              success: true,
              result: { uuid: 'newly-created-db-uuid' },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            success: true,
            result: [], // empty -> not found
          }),
        };
      };

      fs.writeFileSync(
        tempConfigPath,
        `{\n  "database_name": "playlistout-stats",\n  "database_id": "placeholder-uuid"\n}`,
        'utf8'
      );

      const res = await provisionDatabase({
        token: 'mock-token',
        accountId: 'mock-account',
        fetch: mockFetch as any,
        wranglerPath: tempConfigPath,
        skipMigrations: true,
      });

      expect(created).toBe(true);
      expect(res.dbUuid).toBe('newly-created-db-uuid');
      const updatedConfig = fs.readFileSync(tempConfigPath, 'utf8');
      expect(updatedConfig).toContain('"database_id": "newly-created-db-uuid"');
    });
  });

  describe('9. Deployment Workflow Static Security & Concurrency Verification', () => {
    const workflowPath = path.resolve(rootDir, '.github/workflows/deploy-worker.yml');

    it('enforces concurrency group with cancel-in-progress: false (serialized migrations)', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).toContain('concurrency:');
      expect(content).toContain('cancel-in-progress: false');
    });

    it('adheres to least privilege with permissions: contents: read', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).toContain('contents: read');
      expect(content).not.toContain('contents: write');
    });

    it('ensures migration step precedes worker deployment step', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      const identityIdx = content.indexOf('Verify Production D1 Identity');
      const preflightIdx = content.indexOf('Preflight D1 Migration History');
      const migrationIdx = content.indexOf('Apply Pending D1 Migrations');
      const postflightIdx = content.indexOf('Postflight D1 Schema and History Completeness');
      const v2IntegrityIdx = content.indexOf('Verify Analytics V2 Data Integrity');
      const finalizerIdx = content.indexOf('Finalize Analytics V2 Public Cutover');
      const archiveIdx = content.indexOf('Verify Analytics V1 Fully Retired');
      const deployIdx = content.indexOf('Deploy to Cloudflare Workers');
      const publicSmokeIdx = content.indexOf('Reconcile Production Public Stats');

      expect(identityIdx).toBeGreaterThan(0);
      expect(preflightIdx).toBeGreaterThan(identityIdx);
      expect(migrationIdx).toBeGreaterThan(preflightIdx);
      expect(postflightIdx).toBeGreaterThan(migrationIdx);
      expect(v2IntegrityIdx).toBeGreaterThan(postflightIdx);
      expect(finalizerIdx).toBeGreaterThan(v2IntegrityIdx);
      expect(archiveIdx).toBeGreaterThan(finalizerIdx);
      expect(deployIdx).toBeGreaterThan(archiveIdx);
      expect(publicSmokeIdx).toBeGreaterThan(deployIdx);
    });

    it('does not contain bot git commit / push step (zero source-tree mutation)', () => {
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).not.toContain('git commit');
      expect(content).not.toContain('git push');
    });
  });

  describe('10. Source Tree Cleanliness & Non-Mutation', () => {
    it('verifies that normal operations do not leave behind stray temporary SQLite or wrangler artifacts', () => {
      const gitStatus = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' });
      const lines = gitStatus.split('\n').filter(Boolean);
      for (const line of lines) {
        expect(line).not.toMatch(/\.sqlite/);
        expect(line).not.toMatch(/\.wrangler/);
        expect(line).not.toMatch(/\.tmp_/);
      }
    });
  });


  describe('10.5 Analytics V2 Integrity Gate', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
      applyMigrationsToDb(db);
    });

    afterEach(() => {
      db.close();
    });

    it('accepts canonical resolver, export, and clipboard aggregates', async () => {
      db.exec(`
        INSERT INTO analytics_v2_daily_core
          (date, channel, client_id, platform, metric, count)
        VALUES
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'resolve_request', 3),
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'playlist_success', 2),
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'resolve_failure', 1),
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'export', 2),
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'clipboard', 1);

        INSERT INTO analytics_v2_breakdown
          (date, channel, client_id, platform, dimension, value, count)
        VALUES
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'export_format', 'json', 2),
          ('2026-10-05', 'api', 'anonymous_api', 'netease', 'clipboard_mode', 'title', 1);
      `);

      const result = await verifyAnalyticsV2({ queryFn: makeQueryFn(db) });
      expect(result.verified).toBe(true);
    });

    it('fails closed when resolver request and terminal counts diverge', async () => {
      db.exec(`
        INSERT INTO analytics_v2_daily_core
          (date, channel, client_id, platform, metric, count)
        VALUES
          ('2026-10-05', 'plugin', 'musicfree', 'qqmusic', 'resolve_request', 2),
          ('2026-10-05', 'plugin', 'musicfree', 'qqmusic', 'playlist_success', 1);
      `);

      await expect(
        verifyAnalyticsV2({ queryFn: makeQueryFn(db) })
      ).rejects.toThrow(/resolver terminal invariant/);
    });
  });

  describe('11. R8.1 Preflight Migration History & Adversarial Gates', () => {
    let db: DatabaseSync;

    beforeEach(() => {
      db = new DatabaseSync(':memory:');
    });

    afterEach(() => {
      db.close();
    });

    it('untracked existing DB cannot reach apply step: fails closed in preflight when business tables exist without d1_migrations', async () => {
      db.exec(`
        CREATE TABLE aggregate_stats (date TEXT, platform TEXT, metric TEXT, count INT);
        CREATE TABLE daily_geo_stats (date TEXT, platform TEXT, country TEXT, region TEXT, city TEXT, count INT);
      `);

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'pre-apply', queryFn })
      ).rejects.toThrow(/\[FAIL-CLOSED\] Untracked database detected/);
    });

    it('untracked existing DB fails closed when business tables exist and d1_migrations has 0 records', async () => {
      db.exec(`
        CREATE TABLE aggregate_stats (date TEXT, platform TEXT, metric TEXT, count INT);
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'pre-apply', queryFn })
      ).rejects.toThrow(/\[FAIL-CLOSED\] Untracked database detected/);
    });

    it('preflight rejects unknown applied migration (e.g. 0099_manual_hotfix.sql)', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO d1_migrations (name) VALUES ('0001_initial_stats.sql');
        INSERT INTO d1_migrations (name) VALUES ('0099_manual_hotfix.sql');
      `);

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'pre-apply', queryFn })
      ).rejects.toThrow(/Unknown migration in database history.*0099_manual_hotfix\.sql/);
    });

    it('preflight rejects history sequence gap (e.g. 0001 then 0003, skipping 0002)', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO d1_migrations (name) VALUES ('0001_initial_stats.sql');
        INSERT INTO d1_migrations (name) VALUES ('0003_replace_events_with_aggregates.sql');
      `);

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'pre-apply', queryFn })
      ).rejects.toThrow(/Migration history mismatch or out-of-order/);
    });

    it('preflight rejects out-of-order history (e.g. 0002 then 0001)', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO d1_migrations (name) VALUES ('0002_analytics_foundation.sql');
        INSERT INTO d1_migrations (name) VALUES ('0001_initial_stats.sql');
      `);

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'pre-apply', queryFn })
      ).rejects.toThrow(/Migration history mismatch or out-of-order/);
    });

    it('preflight accepts valid partial sequential prefix (e.g. 0001-0003) and identifies pending', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO d1_migrations (name) VALUES ('0001_initial_stats.sql');
        INSERT INTO d1_migrations (name) VALUES ('0002_analytics_foundation.sql');
        INSERT INTO d1_migrations (name) VALUES ('0003_replace_events_with_aggregates.sql');
      `);

      const queryFn = makeQueryFn(db);
      const res = await validateMigrationHistory({ mode: 'pre-apply', queryFn });
      expect(res.valid).toBe(true);
      expect(res.appliedCount).toBe(3);
      expect(res.pendingCount).toBe(11);
      expect(res.pendingFiles[0]).toBe('0004_visitors_and_site_metrics.sql');
    });

    it('postflight requires exact equality and rejects incomplete history', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO d1_migrations (name) VALUES ('0001_initial_stats.sql');
        INSERT INTO d1_migrations (name) VALUES ('0002_analytics_foundation.sql');
      `);

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'post-apply', queryFn })
      ).rejects.toThrow(/Post-apply history verification failed: exact equality required/);
    });

    it('postflight rejects extra migrations exceeding repository count', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      for (const file of HISTORICAL_BASELINE_MIGRATIONS) {
        db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run(file);
      }
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0009_parse_feedback.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0010_geo_attribution_expansion.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0011_analytics_v2.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0012_analytics_v2_cutover.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0013_freeze_analytics_v1_archive.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0014_retire_analytics_v1.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0015_unexpected_extra.sql');

      const queryFn = makeQueryFn(db);
      await expect(
        validateMigrationHistory({ mode: 'post-apply', queryFn })
      ).rejects.toThrow(/exceeding repository count/);
    });

    it('postflight accepts exact matching history', async () => {
      db.exec(`
        CREATE TABLE d1_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      for (const file of HISTORICAL_BASELINE_MIGRATIONS) {
        db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run(file);
      }
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0009_parse_feedback.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0010_geo_attribution_expansion.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0011_analytics_v2.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0012_analytics_v2_cutover.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0013_freeze_analytics_v1_archive.sql');
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0014_retire_analytics_v1.sql');

      const queryFn = makeQueryFn(db);
      const res = await validateMigrationHistory({ mode: 'post-apply', queryFn });
      expect(res.valid).toBe(true);
      expect(res.appliedCount).toBe(14);
      expect(res.pendingCount).toBe(0);
    });

    it('explicit provision rejects existing untracked database target before applying migrations', async () => {
      db.exec(`
        CREATE TABLE aggregate_stats (date TEXT, platform TEXT, metric TEXT, count INT);
      `);

      const queryFn = makeQueryFn(db);
      let applyCalled = false;
      const applyFn = async () => {
        applyCalled = true;
      };

      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          result: [{ name: 'playlistout-stats', uuid: 'existing-untracked-uuid' }],
        }),
      });

      const tempConfig = path.join(rootDir, 'node_modules', '.tmp_provision_untracked.jsonc');
      fs.writeFileSync(tempConfig, '{\n  "database_id": "placeholder"\n}', 'utf8');

      try {
        await expect(
          provisionDatabase({
            token: 'mock-token',
            accountId: 'mock-account',
            fetch: mockFetch as any,
            wranglerPath: tempConfig,
            queryFn,
            applyFn,
          })
        ).rejects.toThrow(/\[FAIL-CLOSED\] Untracked database detected/);

        expect(applyCalled).toBe(false);
      } finally {
        if (fs.existsSync(tempConfig)) fs.unlinkSync(tempConfig);
      }
    });
  });
});
