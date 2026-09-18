#!/usr/bin/env node
/**
 * D1 Migration History Validator (Preflight & Postflight)
 *
 * Implements strict, shared migration history safety checks:
 * - Preflight ('pre-apply'):
 *     Database history MUST be an exact prefix of repository migrations.
 *     If existing business tables exist without trustworthy migration history,
 *     FAILS CLOSED before any migrations can be applied.
 * - Postflight ('post-apply'):
 *     Database history MUST be exactly equal to repository migrations
 *     (exact length, exact sequential order, exact names, 0 extra, 0 missing).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const workerDir = path.resolve(rootDir, 'worker');
const migrationsDir = path.resolve(workerDir, 'migrations');

export const KNOWN_BUSINESS_TABLES = [
  'aggregate_stats',
  'daily_export_stats',
  'hourly_stats',
  'daily_geo_stats',
  'daily_client_stats',
  'daily_performance_stats',
  'daily_clipboard_stats',
  'daily_visitor_hashes',
  'security_rate_limits',
];

export async function executeD1Query(sql, options = {}) {
  const isRemote = options.remote ?? process.argv.includes('--remote');
  const dbName = options.databaseName || 'playlistout-stats';
  const persistTo = options.persistTo ? `--persist-to "${options.persistTo}"` : '';
  const flag = isRemote ? '--remote' : `--local ${persistTo}`.trim();

  // Escape SQL quotes for shell execution
  const escapedSql = sql.replace(/"/g, '\\"');
  const cmd = `npx wrangler d1 execute ${dbName} ${flag} --command "${escapedSql}" --json`;

  try {
    const stdout = execSync(cmd, {
      cwd: workerDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });

    const jsonStart = stdout.indexOf('[');
    const jsonEnd = stdout.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`Invalid JSON output from wrangler d1 execute: ${stdout}`);
    }
    const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
    return parsed[0]?.results || [];
  } catch (err) {
    throw new Error(`D1 query failed: ${err.message}`);
  }
}

export async function validateMigrationHistory(options = {}) {
  const mode =
    options.mode ||
    (process.argv.includes('--mode=post-apply') ? 'post-apply' : 'pre-apply');

  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));
  const dir = options.migrationsDir || migrationsDir;

  const localFiles = (
    options.localFiles ||
    fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))
  ).sort();

  if (localFiles.length === 0) {
    throw new Error(`No migration files found in ${dir}`);
  }

  // 1. Inspect existing tables in the database
  const tablesResult = await queryFn("SELECT name FROM sqlite_master WHERE type='table';");
  const existingTables = new Set(tablesResult.map((r) => r.name));

  // User tables exclude sqlite internal tables and CF KV internal tables
  const userTables = Array.from(existingTables).filter(
    (t) => !t.startsWith('sqlite_') && !t.startsWith('_cf_')
  );
  const businessTables = userTables.filter((t) => t !== 'd1_migrations');
  const hasD1Migrations = existingTables.has('d1_migrations');

  // 2. Untracked Database Guard (Existing business tables without d1_migrations)
  if (!hasD1Migrations) {
    if (businessTables.length > 0) {
      throw new Error(
        `[FAIL-CLOSED] Untracked database detected!\n` +
        `Existing business tables found (${businessTables.join(', ')}) but "d1_migrations" table does not exist.\n` +
        `Refusing to apply migrations to prevent data corruption (e.g. Migration 0005 rewriting city data).\n` +
        `To bring this database under migration control safely, run the explicit legacy baseline procedure:\n` +
        `  node scripts/d1/baseline-legacy.js --baseline-existing --confirm`
      );
    }

    // Completely empty database (or only sqlite internal tables)
    if (mode === 'post-apply') {
      throw new Error(
        '[FAIL-CLOSED] Post-apply verification failed: "d1_migrations" table does not exist after migrations apply!'
      );
    }

    // Fresh empty database before apply is completely valid; 0 migrations applied so far.
    return {
      valid: true,
      mode,
      appliedCount: 0,
      pendingCount: localFiles.length,
      appliedNames: [],
      pendingFiles: [...localFiles],
      isEmpty: true,
    };
  }

  // 3. Query applied migrations from d1_migrations table
  const appliedRows = await queryFn('SELECT name FROM d1_migrations ORDER BY id ASC;');
  const appliedNames = appliedRows.map((r) => r.name);

  // If business tables exist, but d1_migrations has 0 records: also untracked!
  if (businessTables.length > 0 && appliedNames.length === 0) {
    throw new Error(
      `[FAIL-CLOSED] Untracked database detected!\n` +
      `Existing business tables found (${businessTables.join(', ')}) but "d1_migrations" has 0 recorded migrations.\n` +
      `Refusing to apply migrations to prevent data corruption.\n` +
      `Run the explicit legacy baseline procedure:\n` +
      `  node scripts/d1/baseline-legacy.js --baseline-existing --confirm`
    );
  }

  // 4. Reject if database has more migrations than the repository
  if (appliedNames.length > localFiles.length) {
    const extra = appliedNames.slice(localFiles.length);
    throw new Error(
      `[FAIL-CLOSED] Database migration history has ${appliedNames.length} migrations, exceeding repository count (${localFiles.length}).\n` +
      `Unexpected extra migrations in database: ${extra.join(', ')}`
    );
  }

  // 5. Check each applied migration strictly matches corresponding repository file
  for (let i = 0; i < appliedNames.length; i++) {
    const applied = appliedNames[i];
    const expected = localFiles[i];

    if (!localFiles.includes(applied)) {
      throw new Error(
        `[FAIL-CLOSED] Unknown migration in database history at position ${i + 1}: "${applied}" does not exist in repository migration files!`
      );
    }

    if (applied !== expected) {
      throw new Error(
        `[FAIL-CLOSED] Migration history mismatch or out-of-order at position ${i + 1}:\n` +
        `  Database has:   "${applied}"\n` +
        `  Repository has: "${expected}"\n` +
        `Database history must be an exact sequential prefix of repository migrations.`
      );
    }
  }

  const pendingFiles = localFiles.slice(appliedNames.length);

  // 6. Postflight exact equality requirement
  if (mode === 'post-apply') {
    if (appliedNames.length !== localFiles.length) {
      throw new Error(
        `[FAIL-CLOSED] Post-apply history verification failed: exact equality required!\n` +
        `  Expected ${localFiles.length} migrations, but found ${appliedNames.length} applied.\n` +
        `  Unapplied / pending migrations: ${pendingFiles.join(', ')}`
      );
    }
  }

  return {
    valid: true,
    mode,
    appliedCount: appliedNames.length,
    pendingCount: pendingFiles.length,
    appliedNames,
    pendingFiles,
    isEmpty: false,
  };
}

if (process.argv[1] === __filename) {
  const isRemote = process.argv.includes('--remote');
  const mode = process.argv.includes('--mode=post-apply') ? 'post-apply' : 'pre-apply';
  const targetDesc = isRemote ? 'remote production' : 'local';

  console.log(`[D1 Migration Validator] Running ${mode} check on ${targetDesc} database...`);

  validateMigrationHistory({ mode, remote: isRemote })
    .then((result) => {
      if (mode === 'pre-apply') {
        console.log(
          `✔ Preflight migration history verified: ${result.appliedCount} applied (valid exact prefix), ${result.pendingCount} pending to apply.`
        );
      } else {
        console.log(
          `✔ Postflight migration history verified: ${result.appliedCount} applied, exactly matches repository migrations (0 pending, 0 extra).`
        );
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ Migration history verification failed:\n${err.message}`);
      process.exit(1);
    });
}
