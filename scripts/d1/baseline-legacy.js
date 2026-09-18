#!/usr/bin/env node
/**
 * Explicit Legacy D1 Baseline Tool
 *
 * Used ONLY when an existing untracked database needs to be brought under
 * Wrangler migration control.
 *
 * Safety Constraints:
 * 1. Requires explicit flags: --baseline-existing and --confirm.
 * 2. Verifies schema evidence: checks that required tables and columns actually exist.
 * 3. Bounded to known historical migrations (0001-0008): NEVER marks unreviewed future migrations as applied.
 */

import { executeD1Query, REQUIRED_TABLES, REQUIRED_COLUMNS } from './verify-schema.js';

export const HISTORICAL_BASELINE_MIGRATIONS = [
  '0001_initial_stats.sql',
  '0002_analytics_foundation.sql',
  '0003_replace_events_with_aggregates.sql',
  '0004_visitors_and_site_metrics.sql',
  '0005_geo_city_support.sql',
  '0006_seed_netease_platform_stats.sql',
  '0007_cleanup_seeded_fake_stats.sql',
  '0008_security_rate_limits.sql',
];

export async function baselineLegacyDatabase(options = {}) {
  const isBaselineRequested = options.baselineExisting ?? process.argv.includes('--baseline-existing');
  const isConfirmed = options.confirm ?? process.argv.includes('--confirm');

  if (!isBaselineRequested || !isConfirmed) {
    throw new Error(
      'Legacy baseline requires explicit operator flags: --baseline-existing --confirm\n' +
      'Automatic guessing or unconfirmed baselining of untracked databases is strictly prohibited.'
    );
  }

  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));

  // 1. Verify schema evidence
  console.log('Verifying existing schema evidence before establishing baseline...');
  const tablesResult = await queryFn("SELECT name FROM sqlite_master WHERE type='table';");
  const existingTables = new Set(tablesResult.map((r) => r.name));

  // Verify non-migrations required tables
  const businessTables = REQUIRED_TABLES.filter((t) => t !== 'd1_migrations');
  const missingTables = businessTables.filter((t) => !existingTables.has(t));
  if (missingTables.length > 0) {
    throw new Error(
      `Refusing to baseline: target database is missing required schema tables: ${missingTables.join(', ')}\n` +
      'Cannot establish legacy baseline on an unverified or incomplete schema.'
    );
  }

  // Check critical column: city in daily_geo_stats (0005 evidence)
  const geoColumns = await queryFn('PRAGMA table_info(daily_geo_stats);');
  const hasCity = geoColumns.some((c) => c.name === 'city');
  if (!hasCity) {
    throw new Error('Refusing to baseline: daily_geo_stats does not contain "city" column (migration 0005 evidence missing).');
  }

  // Check critical column: reset_at in security_rate_limits (0008 evidence)
  const rateLimitCols = await queryFn('PRAGMA table_info(security_rate_limits);');
  const hasResetAt = rateLimitCols.some((c) => c.name === 'reset_at');
  if (!hasResetAt) {
    throw new Error('Refusing to baseline: security_rate_limits does not contain "reset_at" column (migration 0008 evidence missing).');
  }

  // 2. Ensure d1_migrations table exists
  await queryFn(`
    CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Insert ONLY the historical baseline migrations
  let baselinedCount = 0;
  for (const migrationFile of HISTORICAL_BASELINE_MIGRATIONS) {
    await queryFn(
      `INSERT OR IGNORE INTO d1_migrations (name) VALUES ('${migrationFile}');`
    );
    baselinedCount++;
  }

  console.log(`✔ Successfully established baseline for ${baselinedCount} historical migrations (${HISTORICAL_BASELINE_MIGRATIONS[0]} to ${HISTORICAL_BASELINE_MIGRATIONS[HISTORICAL_BASELINE_MIGRATIONS.length - 1]}).`);
  return {
    baselined: true,
    count: baselinedCount,
    migrations: HISTORICAL_BASELINE_MIGRATIONS,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  baselineLegacyDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`✖ Baseline failed: ${err.message}`);
      process.exit(1);
    });
}
