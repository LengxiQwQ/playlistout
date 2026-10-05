#!/usr/bin/env node
/**
 * Analytics V1 archive immutability gate.
 *
 * After Analytics V2 cutover, the seven V1 analytics fact tables are a
 * read-only historical archive. Migration 0013 captures their compact
 * fingerprints. Every production deploy verifies that no legacy writer,
 * manual edit, or accidental code path changed them.
 */

import { executeD1Query } from './verify-migration-history.js';

export const FROZEN_V1_TABLES = [
  'aggregate_stats',
  'hourly_stats',
  'daily_geo_stats',
  'daily_client_stats',
  'daily_performance_stats',
  'daily_export_stats',
  'daily_clipboard_stats',
];

async function query(sql, options) {
  const queryFn = options.queryFn || ((statement) => executeD1Query(statement, options));
  return queryFn(sql);
}

function normalizedNullable(value) {
  return value === null || value === undefined ? null : String(value);
}

export async function verifyAnalyticsV1Frozen(options = {}) {
  const stateRows = await query(
    "SELECT status, baseline_date, frozen_at FROM analytics_v2_cutover_state WHERE id=1;",
    options,
  );
  const state = stateRows[0];

  if (!state || state.status !== 'frozen' || !state.frozen_at) {
    throw new Error(
      'Analytics V1 archive cannot be verified before Analytics V2 cutover is frozen.'
    );
  }

  const manifestRows = await query(
    `SELECT table_name, captured_at, row_count, count_sum, min_date, max_date
     FROM analytics_v1_archive_manifest
     ORDER BY table_name;`,
    options,
  );
  const manifest = new Map(manifestRows.map((row) => [row.table_name, row]));

  if (manifest.size !== FROZEN_V1_TABLES.length) {
    throw new Error(
      `Analytics V1 archive manifest is incomplete: expected ${FROZEN_V1_TABLES.length} tables, found ${manifest.size}.`
    );
  }

  const unexpected = [...manifest.keys()].filter((name) => !FROZEN_V1_TABLES.includes(name));
  if (unexpected.length > 0) {
    throw new Error(
      `Analytics V1 archive manifest contains unexpected tables: ${unexpected.join(', ')}`
    );
  }

  const checks = [];
  for (const table of FROZEN_V1_TABLES) {
    const snapshot = manifest.get(table);
    if (!snapshot) {
      throw new Error(`Analytics V1 archive manifest is missing ${table}.`);
    }

    // Table name comes exclusively from the hard-coded allowlist above.
    const currentRows = await query(
      `SELECT
         COUNT(*) AS row_count,
         COALESCE(SUM(count), 0) AS count_sum,
         MIN(date) AS min_date,
         MAX(date) AS max_date
       FROM ${table};`,
      options,
    );
    const current = currentRows[0] || {};

    const check = {
      table,
      rowCount: Number(current.row_count || 0),
      expectedRowCount: Number(snapshot.row_count || 0),
      countSum: Number(current.count_sum || 0),
      expectedCountSum: Number(snapshot.count_sum || 0),
      minDate: normalizedNullable(current.min_date),
      expectedMinDate: normalizedNullable(snapshot.min_date),
      maxDate: normalizedNullable(current.max_date),
      expectedMaxDate: normalizedNullable(snapshot.max_date),
    };

    check.ok =
      check.rowCount === check.expectedRowCount &&
      check.countSum === check.expectedCountSum &&
      check.minDate === check.expectedMinDate &&
      check.maxDate === check.expectedMaxDate;

    checks.push(check);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new Error(
      'Analytics V1 archive immutability gate failed:\n' +
      failed.map((check) =>
        `- ${check.table}: rows ${check.rowCount}/${check.expectedRowCount}, ` +
        `sum ${check.countSum}/${check.expectedCountSum}, ` +
        `date range ${check.minDate}..${check.maxDate} / ` +
        `${check.expectedMinDate}..${check.expectedMaxDate}`
      ).join('\n')
    );
  }

  return {
    verified: true,
    frozenAt: state.frozen_at,
    capturedAt: manifestRows[0]?.captured_at || null,
    checks,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const remote = process.argv.includes('--remote');
  verifyAnalyticsV1Frozen({ remote })
    .then((result) => {
      console.log(
        `✔ Analytics V1 archive remains frozen: ${result.checks.length} tables match the migration 0013 manifest.`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ ${err.message}`);
      process.exit(1);
    });
}
