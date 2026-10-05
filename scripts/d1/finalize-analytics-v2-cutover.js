#!/usr/bin/env node
/**
 * Analytics V2 public cutover finalizer.
 *
 * Before the V2-only writer is deployed, the old production Worker is still
 * dual-writing V1 and V2. Migration 0012 captures an initial bridge snapshot.
 * This script verifies that both sides advanced by exactly the same amount,
 * then refreshes the bridge to the last pre-cutover snapshot and marks the
 * legacy writer frozen.
 */

import { executeD1Query } from './verify-migration-history.js';

function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

async function query(sql, options) {
  const queryFn = options.queryFn || ((statement) => executeD1Query(statement, options));
  return queryFn(sql);
}

async function one(sql, options) {
  const rows = await query(sql, options);
  return rows[0] || {};
}

async function currentForKey(key, baselineDate, options) {
  const day = sqlString(baselineDate);

  if (key.startsWith('metric:')) {
    const metric = key.slice('metric:'.length);
    const legacyMetric = metric === 'playlist_success'
      ? 'parse_success'
      : metric === 'export'
      ? 'exports_total'
      : metric;

    const legacy = await one(`
      SELECT
        COALESCE((SELECT count FROM aggregate_stats
          WHERE date='TOTAL' AND platform='all' AND metric=${sqlString(legacyMetric)}), 0) AS total,
        COALESCE((SELECT count FROM aggregate_stats
          WHERE date=${day} AND platform='all' AND metric=${sqlString(legacyMetric)}), 0) AS day;
    `, options);

    const v2 = await one(`
      SELECT
        COALESCE(SUM(count), 0) AS total,
        COALESCE(SUM(CASE WHEN date=${day} THEN count ELSE 0 END), 0) AS day
      FROM analytics_v2_daily_core
      WHERE metric=${sqlString(metric)};
    `, options);

    return {
      legacyTotal: Number(legacy.total || 0),
      legacyDay: Number(legacy.day || 0),
      v2Total: Number(v2.total || 0),
      v2Day: Number(v2.day || 0),
    };
  }

  if (key.startsWith('platform_success:')) {
    const platform = key.slice('platform_success:'.length);
    const legacy = await one(`
      SELECT
        COALESCE((SELECT count FROM aggregate_stats
          WHERE date='TOTAL' AND platform=${sqlString(platform)} AND metric='parse_success'), 0) AS total,
        COALESCE((SELECT count FROM aggregate_stats
          WHERE date=${day} AND platform=${sqlString(platform)} AND metric='parse_success'), 0) AS day;
    `, options);

    const v2 = await one(`
      SELECT
        COALESCE(SUM(count), 0) AS total,
        COALESCE(SUM(CASE WHEN date=${day} THEN count ELSE 0 END), 0) AS day
      FROM analytics_v2_daily_core
      WHERE metric='playlist_success' AND platform=${sqlString(platform)};
    `, options);

    return {
      legacyTotal: Number(legacy.total || 0),
      legacyDay: Number(legacy.day || 0),
      v2Total: Number(v2.total || 0),
      v2Day: Number(v2.day || 0),
    };
  }

  if (key.startsWith('export_format:')) {
    const format = key.slice('export_format:'.length);
    const legacy = await one(`
      SELECT
        COALESCE(SUM(count), 0) AS total,
        COALESCE(SUM(CASE WHEN date=${day} THEN count ELSE 0 END), 0) AS day
      FROM daily_export_stats
      WHERE date!='TOTAL' AND platform!='all' AND export_format=${sqlString(format)};
    `, options);

    const v2 = await one(`
      SELECT
        COALESCE(SUM(count), 0) AS total,
        COALESCE(SUM(CASE WHEN date=${day} THEN count ELSE 0 END), 0) AS day
      FROM analytics_v2_breakdown
      WHERE dimension='export_format' AND value=${sqlString(format)};
    `, options);

    return {
      legacyTotal: Number(legacy.total || 0),
      legacyDay: Number(legacy.day || 0),
      v2Total: Number(v2.total || 0),
      v2Day: Number(v2.day || 0),
    };
  }

  throw new Error(`Unknown cutover baseline key: ${key}`);
}

export async function finalizeAnalyticsCutover(options = {}) {
  const state = await one(
    "SELECT status, baseline_date, prepared_at, frozen_at FROM analytics_v2_cutover_state WHERE id=1;",
    options,
  );

  if (!state.status || !state.baseline_date) {
    throw new Error('Analytics V2 cutover state is missing. Migration 0012 must be applied first.');
  }

  if (state.status === 'frozen') {
    return {
      finalized: false,
      alreadyFrozen: true,
      baselineDate: state.baseline_date,
      checks: [],
    };
  }

  if (state.status !== 'prepared') {
    throw new Error(`Unexpected cutover state: ${state.status}`);
  }

  const rows = await query(
    'SELECT key, baseline_date, legacy_total, v2_total, legacy_day, v2_day FROM analytics_v2_public_baseline ORDER BY key;',
    options,
  );

  if (rows.length !== 14) {
    throw new Error(`Expected 14 public baseline rows, found ${rows.length}.`);
  }

  const checks = [];
  const currentRows = [];

  for (const row of rows) {
    const current = await currentForKey(row.key, row.baseline_date, options);
    const legacyTotalDelta = current.legacyTotal - Number(row.legacy_total || 0);
    const v2TotalDelta = current.v2Total - Number(row.v2_total || 0);
    const legacyDayDelta = current.legacyDay - Number(row.legacy_day || 0);
    const v2DayDelta = current.v2Day - Number(row.v2_day || 0);

    const totalOk = legacyTotalDelta === v2TotalDelta;
    const dayOk = legacyDayDelta === v2DayDelta;
    checks.push({
      key: row.key,
      totalOk,
      dayOk,
      legacyTotalDelta,
      v2TotalDelta,
      legacyDayDelta,
      v2DayDelta,
    });

    if (!totalOk || !dayOk) {
      throw new Error(
        `Cutover reconciliation failed for ${row.key}: ` +
        `total delta V1=${legacyTotalDelta}, V2=${v2TotalDelta}; ` +
        `day delta V1=${legacyDayDelta}, V2=${v2DayDelta}`
      );
    }

    currentRows.push({ key: row.key, ...current });
  }

  const shouldMutate = options.confirm ?? process.argv.includes('--confirm');
  if (!shouldMutate) {
    return {
      finalized: false,
      alreadyFrozen: false,
      baselineDate: state.baseline_date,
      checks,
    };
  }

  for (const row of currentRows) {
    await query(`
      UPDATE analytics_v2_public_baseline
      SET legacy_total=${row.legacyTotal},
          v2_total=${row.v2Total},
          legacy_day=${row.legacyDay},
          v2_day=${row.v2Day}
      WHERE key=${sqlString(row.key)};
    `, options);
  }

  await query(`
    UPDATE analytics_v2_cutover_state
    SET status='frozen', frozen_at=CURRENT_TIMESTAMP
    WHERE id=1 AND status='prepared';
  `, options);

  const finalState = await one(
    "SELECT status, baseline_date, frozen_at FROM analytics_v2_cutover_state WHERE id=1;",
    options,
  );

  if (finalState.status !== 'frozen') {
    throw new Error('Failed to mark Analytics V2 cutover as frozen.');
  }

  return {
    finalized: true,
    alreadyFrozen: false,
    baselineDate: finalState.baseline_date,
    frozenAt: finalState.frozen_at,
    checks,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const remote = process.argv.includes('--remote');
  const confirm = process.argv.includes('--confirm');

  finalizeAnalyticsCutover({ remote, confirm })
    .then((result) => {
      if (result.alreadyFrozen) {
        console.log(`✔ Analytics V2 public cutover already frozen (baseline ${result.baselineDate}).`);
      } else if (result.finalized) {
        console.log(`✔ Analytics V2 public cutover reconciled and frozen at ${result.frozenAt}.`);
      } else {
        console.log('✔ Analytics V2 public cutover reconciliation passed (dry run).');
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ Analytics V2 public cutover failed:\n${err.message}`);
      process.exit(1);
    });
}
