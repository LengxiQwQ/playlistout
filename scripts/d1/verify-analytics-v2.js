#!/usr/bin/env node
/**
 * Analytics V2 post-migration integrity gate.
 *
 * Runs after schema verification and before Worker deployment.
 * Fails closed if canonical V2 invariants are violated.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeD1Query } from './verify-migration-history.js';

async function one(sql, options) {
  const queryFn = options.queryFn || ((statement) => executeD1Query(statement, options));
  const rows = await queryFn(sql);
  return rows[0] || {};
}

export async function verifyAnalyticsV2(options = {}) {
  const queryFn = options.queryFn || ((statement) => executeD1Query(statement, options));
  const rows = await queryFn(`
    SELECT
      (
        (SELECT COUNT(*) FROM analytics_v2_daily_core WHERE date = 'TOTAL' OR platform = 'all') +
        (SELECT COUNT(*) FROM analytics_v2_hourly_core WHERE date = 'TOTAL' OR platform = 'all') +
        (SELECT COUNT(*) FROM analytics_v2_geo WHERE date = 'TOTAL' OR platform = 'all') +
        (SELECT COUNT(*) FROM analytics_v2_breakdown WHERE date = 'TOTAL' OR platform = 'all')
      ) AS invalid_count,
      (
        SELECT COUNT(*)
        FROM (
          SELECT date, channel, client_id, platform,
            SUM(CASE WHEN metric = 'resolve_request' THEN count ELSE 0 END) AS requests,
            SUM(CASE WHEN metric IN ('playlist_success','user_success','resolve_failure') THEN count ELSE 0 END) AS terminals
          FROM analytics_v2_daily_core
          WHERE metric IN ('resolve_request','playlist_success','user_success','resolve_failure')
          GROUP BY date, channel, client_id, platform
          HAVING requests != terminals
        )
      ) AS violation_count,
      COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric = 'export'), 0) AS export_core_count,
      COALESCE((SELECT SUM(count) FROM analytics_v2_breakdown WHERE dimension = 'export_format'), 0) AS export_breakdown_count,
      COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric = 'clipboard'), 0) AS clipboard_core_count,
      COALESCE((SELECT SUM(count) FROM analytics_v2_breakdown WHERE dimension = 'clipboard_mode'), 0) AS clipboard_breakdown_count;
  `);

  const res = rows[0] || {};

  const checks = [
    {
      name: 'forbidden TOTAL/all rollups',
      ok: Number(res.invalid_count || 0) === 0,
      actual: Number(res.invalid_count || 0),
      expected: 0,
    },
    {
      name: 'resolver terminal invariant',
      ok: Number(res.violation_count || 0) === 0,
      actual: Number(res.violation_count || 0),
      expected: 0,
    },
    {
      name: 'export core equals format breakdown',
      ok: Number(res.export_core_count || 0) === Number(res.export_breakdown_count || 0),
      actual: Number(res.export_core_count || 0),
      expected: Number(res.export_breakdown_count || 0),
    },
    {
      name: 'clipboard core equals mode breakdown',
      ok: Number(res.clipboard_core_count || 0) === Number(res.clipboard_breakdown_count || 0),
      actual: Number(res.clipboard_core_count || 0),
      expected: Number(res.clipboard_breakdown_count || 0),
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
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
