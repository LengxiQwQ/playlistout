#!/usr/bin/env node
/**
 * Analytics V2 post-migration integrity gate.
 *
 * Runs after schema verification and before Worker deployment.
 * Fails closed if canonical V2 invariants are violated.
 */

import { executeD1Query } from './verify-migration-history.js';

async function one(sql, options) {
  const rows = await executeD1Query(sql, options);
  return rows[0] || {};
}

export async function verifyAnalyticsV2(options = {}) {
  const invalid = await one(`
    SELECT
      (SELECT COUNT(*) FROM analytics_v2_daily_core WHERE date = 'TOTAL' OR platform = 'all') +
      (SELECT COUNT(*) FROM analytics_v2_hourly_core WHERE date = 'TOTAL' OR platform = 'all') +
      (SELECT COUNT(*) FROM analytics_v2_geo WHERE date = 'TOTAL' OR platform = 'all') +
      (SELECT COUNT(*) FROM analytics_v2_breakdown WHERE date = 'TOTAL' OR platform = 'all')
      AS invalid_count;
  `, options);

  const resolver = await one(`
    SELECT COUNT(*) AS violation_count
    FROM (
      SELECT date, channel, client_id, platform,
        SUM(CASE WHEN metric = 'resolve_request' THEN count ELSE 0 END) AS requests,
        SUM(CASE WHEN metric IN ('playlist_success','user_success','resolve_failure') THEN count ELSE 0 END) AS terminals
      FROM analytics_v2_daily_core
      WHERE metric IN ('resolve_request','playlist_success','user_success','resolve_failure')
      GROUP BY date, channel, client_id, platform
      HAVING requests != terminals
    );
  `, options);

  const exports = await one(`
    SELECT
      COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric = 'export'), 0) AS core_count,
      COALESCE((SELECT SUM(count) FROM analytics_v2_breakdown WHERE dimension = 'export_format'), 0) AS breakdown_count;
  `, options);

  const clipboards = await one(`
    SELECT
      COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric = 'clipboard'), 0) AS core_count,
      COALESCE((SELECT SUM(count) FROM analytics_v2_breakdown WHERE dimension = 'clipboard_mode'), 0) AS breakdown_count;
  `, options);

  const checks = [
    {
      name: 'forbidden TOTAL/all rollups',
      ok: Number(invalid.invalid_count || 0) === 0,
      actual: Number(invalid.invalid_count || 0),
      expected: 0,
    },
    {
      name: 'resolver terminal invariant',
      ok: Number(resolver.violation_count || 0) === 0,
      actual: Number(resolver.violation_count || 0),
      expected: 0,
    },
    {
      name: 'export core equals format breakdown',
      ok: Number(exports.core_count || 0) === Number(exports.breakdown_count || 0),
      actual: Number(exports.core_count || 0),
      expected: Number(exports.breakdown_count || 0),
    },
    {
      name: 'clipboard core equals mode breakdown',
      ok: Number(clipboards.core_count || 0) === Number(clipboards.breakdown_count || 0),
      actual: Number(clipboards.core_count || 0),
      expected: Number(clipboards.breakdown_count || 0),
    },
  ];

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new Error(
      'Analytics V2 integrity gate failed:\n' +
      failed.map((check) =>
        `- ${check.name}: actual=${check.actual}, expected=${check.expected}`
      ).join('\n')
    );
  }

  return { verified: true, checks };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const remote = process.argv.includes('--remote');
  console.log(`Verifying Analytics V2 integrity (${remote ? 'remote' : 'local'})...`);
  verifyAnalyticsV2({ remote })
    .then((result) => {
      for (const check of result.checks) {
        console.log(`✔ ${check.name}`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ ${err.message}`);
      process.exit(1);
    });
}
