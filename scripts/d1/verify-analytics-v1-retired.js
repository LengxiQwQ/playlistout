#!/usr/bin/env node
/**
 * Analytics V1 retirement gate.
 *
 * Migration 0015 permanently retires the seven V1 analytics fact tables after
 * preserving the public daily history needed by /api/stats. This verifier is
 * the permanent post-cutover deployment gate.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeD1Query } from './verify-migration-history.js';

export const RETIRED_V1_TABLES = [
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

export async function verifyAnalyticsV1Retired(options = {}) {
  const stateRows = await query(
    `SELECT status, baseline_date, frozen_at
     FROM analytics_v2_cutover_state
     WHERE id = 1;`,
    options,
  );
  const state = stateRows[0];
  if (!state || state.status !== 'frozen' || !state.frozen_at) {
    throw new Error('Analytics V2 cutover is not frozen.');
  }

  const cleanupRows = await query(
    `SELECT status, retired_at, archived_table_count, public_history_rows
     FROM analytics_v1_cleanup_state
     WHERE id = 1;`,
    options,
  );
  const cleanup = cleanupRows[0];
  if (!cleanup || cleanup.status !== 'retired' || !cleanup.retired_at) {
    throw new Error('Analytics V1 cleanup state is missing or not retired.');
  }
  if (Number(cleanup.archived_table_count || 0) !== RETIRED_V1_TABLES.length) {
    throw new Error(
      `Analytics V1 cleanup expected ${RETIRED_V1_TABLES.length} archived tables, got ${cleanup.archived_table_count}.`
    );
  }

  const manifestRows = await query(
    'SELECT table_name FROM analytics_v1_archive_manifest ORDER BY table_name;',
    options,
  );
  const manifestNames = manifestRows.map((row) => String(row.table_name));
  const missingManifest = RETIRED_V1_TABLES.filter((table) => !manifestNames.includes(table));
  if (manifestNames.length !== RETIRED_V1_TABLES.length || missingManifest.length > 0) {
    throw new Error(
      `Analytics V1 archive manifest is incomplete after retirement: missing ${missingManifest.join(', ') || 'unknown rows'}.`
    );
  }

  const tableRows = await query(
    "SELECT name FROM sqlite_master WHERE type='table';",
    options,
  );
  const existing = new Set(tableRows.map((row) => String(row.name)));
  const stillPresent = RETIRED_V1_TABLES.filter((table) => existing.has(table));
  if (stillPresent.length > 0) {
    throw new Error(
      `Retired Analytics V1 tables still exist: ${stillPresent.join(', ')}`
    );
  }

  const historyRows = await query(
    `SELECT
       COUNT(*) AS row_count,
       MIN(date) AS min_date,
       MAX(date) AS max_date
     FROM analytics_v2_public_history;`,
    options,
  );
  const history = historyRows[0] || {};
  const historyCount = Number(history.row_count || 0);
  if (historyCount !== Number(cleanup.public_history_rows || 0)) {
    throw new Error(
      `Public history row count mismatch: table=${historyCount}, cleanup_state=${cleanup.public_history_rows}.`
    );
  }

  if (
    history.max_date &&
    state.baseline_date &&
    String(history.max_date) >= String(state.baseline_date)
  ) {
    throw new Error(
      `Legacy public history overlaps cutover day: max=${history.max_date}, baseline=${state.baseline_date}.`
    );
  }

  return {
    verified: true,
    frozenAt: state.frozen_at,
    retiredAt: cleanup.retired_at,
    manifestRows: manifestNames.length,
    publicHistoryRows: historyCount,
    minHistoryDate: history.min_date || null,
    maxHistoryDate: history.max_date || null,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const remote = process.argv.includes('--remote');
  verifyAnalyticsV1Retired({ remote })
    .then((result) => {
      console.log(
        `✔ Analytics V1 fully retired: ${result.manifestRows} archived table manifests preserved, ` +
        `${result.publicHistoryRows} public-history days materialized, zero V1 fact tables remain.`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ ${err.message}`);
      process.exit(1);
    });
}
