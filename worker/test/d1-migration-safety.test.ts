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

describe('PlaylistOut Insights R8 — D1 Provisioning & Migration Safety', () => {
  describe('1. Migration File Integrity, Naming & Immutability', () => {
    it('passes validation for current 0001-0008 migrations with matching manifest hashes', () => {
      const result = validateMigrations();
      expect(result.valid).toBe(true);
      expect(result.count).toBe(8);
      expect(result.files).toHaveLength(8);
      expect(result.files[0]).toBe('0001_initial_stats.sql');
      expect(result.files[7]).toBe('0008_security_rate_limits.sql');
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

    it('applies all 8 migrations sequentially from empty database', () => {
      const applied = applyMigrationsToDb(db);
      expect(applied).toHaveLength(8);
      expect(applied).toEqual([
        '0001_initial_stats.sql',
        '0002_analytics_foundation.sql',
        '0003_replace_events_with_aggregates.sql',
        '0004_visitors_and_site_metrics.sql',
        '0005_geo_city_support.sql',
        '0006_seed_netease_platform_stats.sql',
        '0007_cleanup_seeded_fake_stats.sql',
        '0008_security_rate_limits.sql',
      ]);
    });

    it('creates all required tables, critical columns, and indexes', async () => {
      applyMigrationsToDb(db);
      const queryFn = makeQueryFn(db);

      const verification = await verifyD1Schema({ queryFn });
      expect(verification.verified).toBe(true);
      expect(verification.appliedMigrationsCount).toBe(8);
      expect(verification.pendingCount).toBe(0);

      // Verify specific critical columns
      const geoCols = (await queryFn('PRAGMA table_info(daily_geo_stats);')) as { name: string }[];
      const geoColNames = geoCols.map((c) => c.name);
      expect(geoColNames).toContain('city');
      expect(geoColNames).toContain('region');
      expect(geoColNames).toContain('country');

      const perfCols = (await queryFn('PRAGMA table_info(daily_performance_stats);')) as { name: string }[];
      const perfColNames = perfCols.map((c) => c.name);
      expect(perfColNames).toContain('dimension');
      expect(perfColNames).toContain('value');

      const rateLimitCols = (await queryFn('PRAGMA table_info(security_rate_limits);')) as { name: string }[];
      const rateLimitColNames = rateLimitCols.map((c) => c.name);
      expect(rateLimitColNames).toContain('key');
      expect(rateLimitColNames).toContain('reset_at');
    });
  });

  describe('3. Second Apply Strict No-Op & Data Preservation', () => {
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

    it('preserves sentinel data without modification (protects Migration 0005 city data)', () => {
      // Insert sentinel data into tables
      db.prepare(`
        INSERT INTO aggregate_stats (date, platform, metric, count)
        VALUES ('2026-09-18', 'qqmusic', 'parse_success', 42);
      `).run();

      db.prepare(`
        INSERT INTO daily_geo_stats (date, platform, country, region, city, count)
        VALUES ('2026-09-18', 'qqmusic', 'CN', 'Zhejiang', 'Hangzhou', 100);
      `).run();

      db.prepare(`
        INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
        VALUES ('2026-09-18', 'qqmusic', 'latency_bucket', '<500ms', 99);
      `).run();

      // Run second apply
      const secondRun = applyMigrationsToDb(db);
      expect(secondRun).toHaveLength(0);

      // Verify sentinels are completely untouched
      const aggRow = db
        .prepare("SELECT * FROM aggregate_stats WHERE date = '2026-09-18' AND metric = 'parse_success';")
        .get() as any;
      expect(aggRow.count).toBe(42);

      const geoRow = db
        .prepare("SELECT * FROM daily_geo_stats WHERE date = '2026-09-18' AND city = 'Hangzhou';")
        .get() as any;
      expect(geoRow.count).toBe(100);
      expect(geoRow.city).toBe('Hangzhou'); // Proves 0005 did NOT clobber city to UNKNOWN!

      const perfRow = db
        .prepare("SELECT * FROM daily_performance_stats WHERE date = '2026-09-18' AND value = '<500ms';")
        .get() as any;
      expect(perfRow.count).toBe(99);
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

    it('resumes from partially applied state (0001-0004 -> applies 0005-0008)', async () => {
      // Simulate database that only applied 0001 to 0004
      const firstBatch = [
        '0001_initial_stats.sql',
        '0002_analytics_foundation.sql',
        '0003_replace_events_with_aggregates.sql',
        '0004_visitors_and_site_metrics.sql',
      ];
      applyMigrationsToDb(db, firstBatch);

      const appliedBefore = (db.prepare('SELECT name FROM d1_migrations;').all() as any[]).map(
        (r) => r.name
      );
      expect(appliedBefore).toEqual(firstBatch);

      // Verify city column does not exist yet (comes from 0005)
      const geoColsBefore = (db.prepare('PRAGMA table_info(daily_geo_stats);').all() as any[]).map(
        (c) => c.name
      );
      expect(geoColsBefore).not.toContain('city');

      // Now run full migration suite
      const newlyApplied = applyMigrationsToDb(db);
      expect(newlyApplied).toEqual([
        '0005_geo_city_support.sql',
        '0006_seed_netease_platform_stats.sql',
        '0007_cleanup_seeded_fake_stats.sql',
        '0008_security_rate_limits.sql',
      ]);

      // Verify schema is now complete
      const verification = await verifyD1Schema({ queryFn: makeQueryFn(db) });
      expect(verification.verified).toBe(true);
      expect(verification.appliedMigrationsCount).toBe(8);
      expect(verification.pendingCount).toBe(0);
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
      const deployIdx = content.indexOf('Deploy to Cloudflare Workers');

      expect(identityIdx).toBeGreaterThan(0);
      expect(preflightIdx).toBeGreaterThan(identityIdx);
      expect(migrationIdx).toBeGreaterThan(preflightIdx);
      expect(postflightIdx).toBeGreaterThan(migrationIdx);
      expect(deployIdx).toBeGreaterThan(postflightIdx);
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
      expect(res.pendingCount).toBe(5);
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
      db.prepare("INSERT INTO d1_migrations (name) VALUES (?);").run('0009_unexpected_extra.sql');

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

      const queryFn = makeQueryFn(db);
      const res = await validateMigrationHistory({ mode: 'post-apply', queryFn });
      expect(res.valid).toBe(true);
      expect(res.appliedCount).toBe(8);
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
