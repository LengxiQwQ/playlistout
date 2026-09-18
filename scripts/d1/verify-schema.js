#!/usr/bin/env node
/**
 * D1 Schema & Migration Completeness Verifier
 *
 * Verifies that:
 * 1. All required tables exist.
 * 2. Critical columns exist in every table (e.g. city in daily_geo_stats).
 * 3. Required performance and query indexes exist.
 * 4. Migration history matches repo migration files and 0 pending migrations remain.
 */

import { fileURLToPath } from 'node:url';
import {
  executeD1Query,
  validateMigrationHistory,
} from './verify-migration-history.js';

const __filename = fileURLToPath(import.meta.url);

export { executeD1Query, validateMigrationHistory };

export const REQUIRED_TABLES = [
  'aggregate_stats',
  'daily_export_stats',
  'hourly_stats',
  'daily_geo_stats',
  'daily_client_stats',
  'daily_performance_stats',
  'daily_clipboard_stats',
  'daily_visitor_hashes',
  'security_rate_limits',
  'd1_migrations',
];

export const REQUIRED_COLUMNS = {
  aggregate_stats: ['date', 'platform', 'metric', 'count'],
  daily_export_stats: ['date', 'platform', 'export_format', 'count'],
  hourly_stats: ['date', 'hour', 'platform', 'metric', 'count'],
  daily_geo_stats: ['date', 'platform', 'country', 'region', 'city', 'count'],
  daily_client_stats: ['date', 'platform', 'device_class', 'browser_family', 'os_family', 'count'],
  daily_performance_stats: ['date', 'platform', 'dimension', 'value', 'count'],
  daily_clipboard_stats: ['date', 'platform', 'clipboard_mode', 'count'],
  daily_visitor_hashes: ['date', 'hash'],
  security_rate_limits: ['key', 'count', 'reset_at'],
  d1_migrations: ['id', 'name', 'applied_at'],
};

export const REQUIRED_INDEXES = [
  'idx_stats_date_platform',
  'idx_export_stats_date',
  'idx_hourly_stats_date',
  'idx_geo_stats_date',
  'idx_geo_stats_country',
  'idx_client_stats_date',
  'idx_perf_stats_date',
  'idx_clipboard_stats_date',
  'idx_visitor_hashes_date',
  'idx_security_rate_limits_reset_at',
];

export async function verifyD1Schema(options = {}) {
  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));

  // 1. Verify tables
  const tablesResult = await queryFn("SELECT name FROM sqlite_master WHERE type='table';");
  const existingTables = new Set(tablesResult.map((r) => r.name));

  const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));
  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
  }

  // 2. Verify columns for each critical table
  for (const [table, expectedColumns] of Object.entries(REQUIRED_COLUMNS)) {
    const colInfo = await queryFn(`PRAGMA table_info(${table});`);
    const actualColumns = new Set(colInfo.map((c) => c.name));
    const missingCols = expectedColumns.filter((c) => !actualColumns.has(c));
    if (missingCols.length > 0) {
      throw new Error(`Table "${table}" is missing columns: ${missingCols.join(', ')}`);
    }
  }

  // 3. Verify indexes
  const indexesResult = await queryFn("SELECT name FROM sqlite_master WHERE type='index';");
  const existingIndexes = new Set(indexesResult.map((r) => r.name));
  const missingIndexes = REQUIRED_INDEXES.filter((idx) => !existingIndexes.has(idx));
  if (missingIndexes.length > 0) {
    throw new Error(`Missing required indexes: ${missingIndexes.join(', ')}`);
  }

  // 4. Verify postflight migration history exact equality (length, order, names)
  const historyResult = await validateMigrationHistory({
    ...options,
    mode: 'post-apply',
    queryFn,
  });

  return {
    verified: true,
    tablesCount: existingTables.size,
    appliedMigrationsCount: historyResult.appliedCount,
    pendingCount: historyResult.pendingCount,
    appliedNames: historyResult.appliedNames,
  };
}

if (process.argv[1] === __filename) {
  const isRemote = process.argv.includes('--remote');
  const mode = isRemote ? 'remote' : 'local';
  console.log(`Verifying D1 schema and migration history (${mode})...`);
  verifyD1Schema()
    .then((result) => {
      console.log(`✔ Schema verification passed: ${result.tablesCount} tables checked, ${result.appliedMigrationsCount} migrations applied, 0 pending.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ Schema verification failed: ${err.message}`);
      process.exit(1);
    });
}
