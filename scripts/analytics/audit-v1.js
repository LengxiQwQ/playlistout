#!/usr/bin/env node
/**
 * Read-only Analytics V1 audit.
 *
 * Produces a machine-readable snapshot of table sizes and known V1 invariants.
 * It never mutates D1. Use --remote only with explicit maintainer intent.
 */
import { executeD1Query } from '../d1/verify-migration-history.js';

const isRemote = process.argv.includes('--remote');
const pretty = process.argv.includes('--pretty');

const TABLES = [
  'aggregate_stats',
  'daily_export_stats',
  'hourly_stats',
  'daily_geo_stats',
  'daily_client_stats',
  'daily_performance_stats',
  'daily_clipboard_stats',
  'daily_visitor_hashes',
  'security_rate_limits',
  'parse_feedback',
  'quarantined_stats',
  'd1_migrations',
];

async function query(sql) {
  return executeD1Query(sql, { remote: isRemote });
}

async function tableExists(table) {
  const rows = await query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`);
  return rows.length > 0;
}

async function scalar(sql, key = 'value') {
  const rows = await query(sql);
  return Number(rows[0]?.[key] ?? 0);
}

async function auditV1() {
  const generatedAt = new Date().toISOString();
  const tables = {};
  for (const table of TABLES) {
    const exists = await tableExists(table);
    tables[table] = {
      exists,
      rows: exists ? await scalar(`SELECT COUNT(*) AS value FROM ${table};`) : 0,
    };
  }

  const checks = {};

  if (tables.daily_export_stats.exists) {
    const platformFacts = await scalar(`
      SELECT COALESCE(SUM(count), 0) AS value
      FROM daily_export_stats
      WHERE date != 'TOTAL' AND platform != 'all';
    `);
    const allRollups = await scalar(`
      SELECT COALESCE(SUM(count), 0) AS value
      FROM daily_export_stats
      WHERE date != 'TOTAL' AND platform = 'all';
    `);
    const formatFacts = await query(`
      SELECT export_format AS name, COALESCE(SUM(count), 0) AS count
      FROM daily_export_stats
      WHERE date != 'TOTAL' AND platform != 'all'
      GROUP BY export_format ORDER BY export_format;
    `);
    checks.exports = {
      platformFacts,
      allRollups,
      rollupMatchesFacts: platformFacts === allRollups,
      formatFacts,
      formatSum: formatFacts.reduce((sum, row) => sum + Number(row.count || 0), 0),
    };
  }

  if (tables.daily_clipboard_stats.exists) {
    const platformFacts = await scalar(`
      SELECT COALESCE(SUM(count), 0) AS value
      FROM daily_clipboard_stats
      WHERE date != 'TOTAL' AND platform != 'all';
    `);
    const allRollups = await scalar(`
      SELECT COALESCE(SUM(count), 0) AS value
      FROM daily_clipboard_stats
      WHERE date != 'TOTAL' AND platform = 'all';
    `);
    const modeFacts = await query(`
      SELECT clipboard_mode AS name, COALESCE(SUM(count), 0) AS count
      FROM daily_clipboard_stats
      WHERE date != 'TOTAL' AND platform != 'all'
      GROUP BY clipboard_mode ORDER BY clipboard_mode;
    `);
    checks.clipboard = {
      platformFacts,
      allRollups,
      rollupMatchesFacts: platformFacts === allRollups,
      modeFacts,
      modeSum: modeFacts.reduce((sum, row) => sum + Number(row.count || 0), 0),
    };
  }

  if (tables.aggregate_stats.exists) {
    const totalRows = await scalar(`SELECT COUNT(*) AS value FROM aggregate_stats WHERE date='TOTAL';`);
    const allRows = await scalar(`SELECT COUNT(*) AS value FROM aggregate_stats WHERE platform='all';`);
    checks.aggregateSentinels = { totalRows, allRows };
  }

  if (tables.daily_performance_stats.exists) {
    checks.performanceDimensions = await query(`
      SELECT dimension AS name, COALESCE(SUM(count), 0) AS count
      FROM daily_performance_stats
      WHERE date != 'TOTAL'
      GROUP BY dimension ORDER BY dimension;
    `);
  }

  if (tables.d1_migrations.exists) {
    checks.migrations = await query('SELECT id, name, applied_at FROM d1_migrations ORDER BY id ASC;');
  }

  const report = {
    schemaVersion: 1,
    target: isRemote ? 'remote' : 'local',
    generatedAt,
    readOnly: true,
    tables,
    checks,
  };

  process.stdout.write(JSON.stringify(report, null, pretty ? 2 : 0) + '\n');
}

auditV1().catch((err) => {
  console.error(`[analytics:audit] ${err.message}`);
  process.exit(1);
});
