#!/usr/bin/env node
/**
 * Analytics V2 Data Quality Verifier
 *
 * Read-only. Fails closed when V2 storage violates canonical invariants.
 */
import { fileURLToPath } from 'node:url';
import { executeD1Query } from '../d1/verify-migration-history.js';

const __filename = fileURLToPath(import.meta.url);

async function scalar(queryFn, sql, key = 'value') {
  const rows = await queryFn(sql);
  return Number(rows?.[0]?.[key] ?? 0);
}

export async function verifyAnalyticsV2(options = {}) {
  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));
  const checks = {};

  const requiredTables = [
    'analytics_v2_daily_core',
    'analytics_v2_hourly_core',
    'analytics_v2_daily_dimensions',
    'analytics_v2_meta',
  ];

  const tableRows = await queryFn("SELECT name FROM sqlite_master WHERE type='table';");
  const tableSet = new Set(tableRows.map((row) => row.name));
  const missing = requiredTables.filter((table) => !tableSet.has(table));
  if (missing.length) {
    throw new Error(`Analytics V2 tables missing: ${missing.join(', ')}`);
  }

  checks.sentinelRows =
    await scalar(queryFn, `
      SELECT
        (SELECT COUNT(*) FROM analytics_v2_daily_core WHERE date='TOTAL' OR platform='all') +
        (SELECT COUNT(*) FROM analytics_v2_hourly_core WHERE date='TOTAL' OR platform='all') +
        (SELECT COUNT(*) FROM analytics_v2_daily_dimensions WHERE date='TOTAL' OR platform='all')
        AS value;
    `);
  if (checks.sentinelRows !== 0) {
    throw new Error(`Analytics V2 contains ${checks.sentinelRows} forbidden TOTAL/all sentinel rows`);
  }

  checks.invalidOrigins =
    await scalar(queryFn, `
      SELECT COUNT(*) AS value FROM (
        SELECT data_origin FROM analytics_v2_daily_core
        WHERE data_origin NOT IN ('historical','live')
        UNION ALL
        SELECT data_origin FROM analytics_v2_hourly_core
        WHERE data_origin NOT IN ('historical','live')
        UNION ALL
        SELECT data_origin FROM analytics_v2_daily_dimensions
        WHERE data_origin NOT IN ('historical','live')
      );
    `);
  if (checks.invalidOrigins !== 0) {
    throw new Error(`Analytics V2 contains ${checks.invalidOrigins} invalid data_origin rows`);
  }

  checks.invalidChannels =
    await scalar(queryFn, `
      SELECT COUNT(*) AS value FROM (
        SELECT channel FROM analytics_v2_daily_core
        WHERE channel NOT IN ('web','plugin','api','internal','legacy_mixed')
        UNION ALL
        SELECT channel FROM analytics_v2_hourly_core
        WHERE channel NOT IN ('web','plugin','api','internal','legacy_mixed')
        UNION ALL
        SELECT channel FROM analytics_v2_daily_dimensions
        WHERE channel NOT IN ('web','plugin','api','internal','legacy_mixed')
      );
    `);
  if (checks.invalidChannels !== 0) {
    throw new Error(`Analytics V2 contains ${checks.invalidChannels} invalid channel rows`);
  }

  checks.negativeCounters =
    await scalar(queryFn, `
      SELECT COUNT(*) AS value FROM (
        SELECT count FROM analytics_v2_daily_core WHERE count < 0 OR value_sum < 0
        UNION ALL
        SELECT count FROM analytics_v2_hourly_core WHERE count < 0 OR value_sum < 0
        UNION ALL
        SELECT count FROM analytics_v2_daily_dimensions WHERE count < 0
      );
    `);
  if (checks.negativeCounters !== 0) {
    throw new Error(`Analytics V2 contains ${checks.negativeCounters} negative counter rows`);
  }

  checks.exportMismatches =
    await scalar(queryFn, `
      WITH core AS (
        SELECT date, data_origin, channel, client_id, client_version, host_platform,
               trust_class, platform, country, region, SUM(count) AS total
        FROM analytics_v2_daily_core
        WHERE endpoint='event_export' AND metric='export'
        GROUP BY date, data_origin, channel, client_id, client_version, host_platform,
                 trust_class, platform, country, region
      ),
      dims AS (
        SELECT date, data_origin, channel, client_id, client_version, host_platform,
               trust_class, platform, country, region, SUM(count) AS total
        FROM analytics_v2_daily_dimensions
        WHERE endpoint='event_export' AND dimension='export_format'
        GROUP BY date, data_origin, channel, client_id, client_version, host_platform,
                 trust_class, platform, country, region
      ),
      mismatch AS (
        SELECT 1
        FROM core c
        LEFT JOIN dims d
          ON d.date=c.date AND d.data_origin=c.data_origin AND d.channel=c.channel
         AND d.client_id=c.client_id AND d.client_version=c.client_version
         AND d.host_platform=c.host_platform AND d.trust_class=c.trust_class
         AND d.platform=c.platform AND d.country=c.country AND d.region=c.region
        WHERE COALESCE(d.total, -1) != c.total
        UNION ALL
        SELECT 1
        FROM dims d
        LEFT JOIN core c
          ON c.date=d.date AND c.data_origin=d.data_origin AND c.channel=d.channel
         AND c.client_id=d.client_id AND c.client_version=d.client_version
         AND c.host_platform=d.host_platform AND c.trust_class=d.trust_class
         AND c.platform=d.platform AND c.country=d.country AND c.region=d.region
        WHERE c.total IS NULL
      )
      SELECT COUNT(*) AS value FROM mismatch;
    `);
  if (checks.exportMismatches !== 0) {
    throw new Error(`Analytics V2 export invariant failed in ${checks.exportMismatches} scopes`);
  }

  checks.clipboardMismatches =
    await scalar(queryFn, `
      WITH core AS (
        SELECT date, data_origin, channel, client_id, client_version, host_platform,
               trust_class, platform, country, region, SUM(count) AS total
        FROM analytics_v2_daily_core
        WHERE endpoint='event_clipboard' AND metric='clipboard'
        GROUP BY date, data_origin, channel, client_id, client_version, host_platform,
                 trust_class, platform, country, region
      ),
      dims AS (
        SELECT date, data_origin, channel, client_id, client_version, host_platform,
               trust_class, platform, country, region, SUM(count) AS total
        FROM analytics_v2_daily_dimensions
        WHERE endpoint='event_clipboard' AND dimension='clipboard_mode'
        GROUP BY date, data_origin, channel, client_id, client_version, host_platform,
                 trust_class, platform, country, region
      ),
      mismatch AS (
        SELECT 1
        FROM core c
        LEFT JOIN dims d
          ON d.date=c.date AND d.data_origin=c.data_origin AND d.channel=c.channel
         AND d.client_id=c.client_id AND d.client_version=c.client_version
         AND d.host_platform=c.host_platform AND d.trust_class=c.trust_class
         AND d.platform=c.platform AND d.country=c.country AND d.region=c.region
        WHERE COALESCE(d.total, -1) != c.total
        UNION ALL
        SELECT 1
        FROM dims d
        LEFT JOIN core c
          ON c.date=d.date AND c.data_origin=d.data_origin AND c.channel=d.channel
         AND c.client_id=d.client_id AND c.client_version=d.client_version
         AND c.host_platform=d.host_platform AND c.trust_class=d.trust_class
         AND c.platform=d.platform AND c.country=d.country AND c.region=d.region
        WHERE c.total IS NULL
      )
      SELECT COUNT(*) AS value FROM mismatch;
    `);
  if (checks.clipboardMismatches !== 0) {
    throw new Error(`Analytics V2 clipboard invariant failed in ${checks.clipboardMismatches} scopes`);
  }

  checks.resolveMismatches =
    await scalar(queryFn, `
      WITH r AS (
        SELECT
          date, data_origin, channel, client_id, client_version, host_platform,
          trust_class, platform, country, region,
          SUM(CASE WHEN metric='resolve_request' THEN count ELSE 0 END) AS requests,
          SUM(CASE WHEN metric IN ('playlist_success','user_success','resolve_failure') THEN count ELSE 0 END) AS outcomes
        FROM analytics_v2_daily_core
        WHERE endpoint='resolve'
        GROUP BY date, data_origin, channel, client_id, client_version, host_platform,
                 trust_class, platform, country, region
      )
      SELECT COUNT(*) AS value FROM r WHERE requests != outcomes;
    `);
  if (checks.resolveMismatches !== 0) {
    throw new Error(`Analytics V2 resolve invariant failed in ${checks.resolveMismatches} scopes`);
  }

  const metaRows = await queryFn("SELECT key, value FROM analytics_v2_meta;");
  const meta = Object.fromEntries(metaRows.map((row) => [row.key, row.value]));
  checks.schemaVersion = meta.schema_version || null;
  checks.historicalBackfillStatus = meta.historical_backfill_status || null;

  if (checks.schemaVersion !== '2') {
    throw new Error(`Analytics V2 schema version mismatch: expected 2, got ${checks.schemaVersion}`);
  }
  if (options.requireHistorical !== false && checks.historicalBackfillStatus !== 'complete') {
    throw new Error(
      `Analytics V2 historical backfill is not complete: ${checks.historicalBackfillStatus || 'missing'}`,
    );
  }

  return {
    verified: true,
    generatedAt: new Date().toISOString(),
    checks,
  };
}

if (process.argv[1] === __filename) {
  const remote = process.argv.includes('--remote');
  verifyAnalyticsV2({ remote })
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[analytics:v2:verify] ${err.message}`);
      process.exit(1);
    });
}
