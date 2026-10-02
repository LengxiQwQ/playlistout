#!/usr/bin/env node
/**
 * D1 Telemetry Crawler Dirty Data Isolation & Archival Tool
 *
 * Safely isolates abnormal crawler & automated scraping telemetry into a dedicated
 * `quarantined_stats` table for long-term historical inspection, removes the anomalies
 * from active business telemetry tables, and recalibrates all TOTAL aggregates.
 *
 * Usage:
 *   # Preview what would be quarantined and adjusted
 *   node scripts/d1/isolate-crawler-data.js --remote --dry-run
 *
 *   # Execute isolation on remote production D1
 *   node scripts/d1/isolate-crawler-data.js --remote
 */

import { executeD1Query } from './verify-migration-history.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    remote: args.includes('--remote'),
    dryRun: args.includes('--dry-run'),
    date: '2026-10-02',
  };
}

export async function isolateCrawlerData(options = {}) {
  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));
  const isRemote = Boolean(options.remote);
  const dryRun = Boolean(options.dryRun);
  const targetDate = options.date || '2026-10-02';
  const batchId = `${targetDate.replace(/-/g, '')}_crawler_incident`;

  console.log(`\n=======================================================`);
  console.log(`🛡️  PlaylistOut D1 Telemetry Crawler Data Isolation Tool`);
  console.log(`Target Date: ${targetDate} | Mode: ${isRemote ? 'REMOTE Production D1' : 'LOCAL'}${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`=======================================================\n`);

  // 1. Preview Anomalies to Quarantine
  console.log('1. Scanning crawler & automated batch anomalies for date:', targetDate);

  const geoAnomalies = await queryFn(`
    SELECT platform, country, region, city, count
    FROM daily_geo_stats
    WHERE date = '${targetDate}'
      AND (
        (city = 'Chengdu' AND platform IN ('qqmusic', 'netease'))
        OR (platform = 'netease' AND city IN ('Nanjing', 'Shanghai'))
      )
    ORDER BY count DESC;
  `);

  const exportAnomalies = await queryFn(`
    SELECT platform, export_format, country, region, city, count
    FROM daily_export_stats
    WHERE date = '${targetDate}'
      AND city IN ('Nanjing', 'Shanghai')
      AND platform = 'netease'
      AND export_format = 'xlsx';
  `);

  const clientAnomalies = await queryFn(`
    SELECT platform, device_class, browser_family, os_family, count
    FROM daily_client_stats
    WHERE date = '${targetDate}'
      AND (
        (browser_family = 'other' AND os_family = 'other')
        OR (platform = 'netease' AND browser_family = 'chrome' AND os_family = 'windows')
      );
  `);

  const hourlyAnomalies = await queryFn(`
    SELECT hour, platform, metric, count
    FROM hourly_stats
    WHERE date = '${targetDate}'
      AND (
        metric = 'rate_limited'
        OR (hour = 6 AND metric = 'parse_success' AND platform IN ('qqmusic', 'netease'))
        OR (hour IN (6, 7, 8, 10, 11) AND metric = 'export' AND platform = 'netease')
        OR (hour IN (7, 8, 10, 11) AND metric = 'parse_success' AND platform = 'netease')
      )
    ORDER BY hour ASC, count DESC;
  `);

  let totalGeoParsedAnomalies = 0;
  for (const r of geoAnomalies) totalGeoParsedAnomalies += Number(r.count || 0);

  let totalExportAnomalies = 0;
  for (const r of exportAnomalies) {
    if (r.platform !== 'all') totalExportAnomalies += Number(r.count || 0);
  }

  console.log(`  - Geographic anomalies to quarantine: ${geoAnomalies.length} groups (${totalGeoParsedAnomalies} parses)`);
  for (const r of geoAnomalies) {
    console.log(`      * [${r.platform}] ${r.country}/${r.city}: ${r.count} parses`);
  }

  console.log(`  - Export anomalies to quarantine: ${exportAnomalies.length} groups (${totalExportAnomalies} exports)`);
  for (const r of exportAnomalies) {
    console.log(`      * [${r.platform}] ${r.export_format} in ${r.city}: ${r.count}`);
  }

  console.log(`  - Client anomalies to quarantine: ${clientAnomalies.length} groups`);
  console.log(`  - Hourly burst anomalies to quarantine: ${hourlyAnomalies.length} hourly slots`);

  if (dryRun) {
    console.log('\n[Dry Run] Preview complete. No remote data was modified. Omit --dry-run to execute.');
    return { dryRun: true, totalGeoParsedAnomalies, totalExportAnomalies };
  }

  // 2. Execute Isolation & Recalculation
  console.log('\n2. Executing Isolation and Archival into "quarantined_stats"...');

  const statements = [
    // Create quarantine table if not exists
    `CREATE TABLE IF NOT EXISTS quarantined_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quarantined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      incident_date TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      source_table TEXT NOT NULL,
      platform TEXT NOT NULL,
      metric_or_dimension TEXT NOT NULL,
      value TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      client_info TEXT,
      count INTEGER NOT NULL,
      details_json TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_quarantined_date ON quarantined_stats (incident_date);`,
    `CREATE INDEX IF NOT EXISTS idx_quarantined_reason ON quarantined_stats (reason);`,
    `CREATE INDEX IF NOT EXISTS idx_quarantined_platform ON quarantined_stats (platform);`,

    // A. Quarantine daily_geo_stats
    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, country, region, city, count, details_json)
     SELECT date, '${batchId}', 'chengdu_api_burst', 'daily_geo_stats', platform, 'parse_success', country, region, city, count, json_object('date', date, 'platform', platform, 'country', country, 'region', region, 'city', city, 'count', count)
     FROM daily_geo_stats
     WHERE date = '${targetDate}' AND city = 'Chengdu' AND platform IN ('qqmusic', 'netease');`,

    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, country, region, city, count, details_json)
     SELECT date, '${batchId}', 'nanjing_shanghai_bulk_scrape', 'daily_geo_stats', platform, 'parse_success', country, region, city, count, json_object('date', date, 'platform', platform, 'country', country, 'region', region, 'city', city, 'count', count)
     FROM daily_geo_stats
     WHERE date = '${targetDate}' AND platform = 'netease' AND city IN ('Nanjing', 'Shanghai');`,

    `DELETE FROM daily_geo_stats
     WHERE date = '${targetDate}'
       AND (
         (city = 'Chengdu' AND platform IN ('qqmusic', 'netease'))
         OR (platform = 'netease' AND city IN ('Nanjing', 'Shanghai'))
       );`,

    `DELETE FROM daily_geo_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_geo_stats (date, platform, country, region, city, count)
     SELECT 'TOTAL', platform, country, region, city, SUM(count)
     FROM daily_geo_stats WHERE date != 'TOTAL'
     GROUP BY platform, country, region, city;`,

    // B. Quarantine daily_export_stats
    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, country, region, city, count, details_json)
     SELECT date, '${batchId}', 'nanjing_shanghai_bulk_scrape', 'daily_export_stats', platform, export_format, country, region, city, count, json_object('date', date, 'platform', platform, 'export_format', export_format, 'country', country, 'region', region, 'city', city, 'count', count)
     FROM daily_export_stats
     WHERE date = '${targetDate}' AND city IN ('Nanjing', 'Shanghai') AND platform = 'netease' AND export_format = 'xlsx';`,

    `DELETE FROM daily_export_stats
     WHERE date = '${targetDate}' AND city IN ('Nanjing', 'Shanghai') AND platform = 'netease' AND export_format = 'xlsx';`,

    // Rebuild platform='all' in daily_export_stats for targetDate
    `DELETE FROM daily_export_stats WHERE date = '${targetDate}' AND platform = 'all';`,
    `INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
     SELECT date, 'all', export_format, country, region, city, SUM(count)
     FROM daily_export_stats
     WHERE date = '${targetDate}' AND platform != 'all'
     GROUP BY date, export_format, country, region, city;`,

    `DELETE FROM daily_export_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
     SELECT 'TOTAL', platform, export_format, country, region, city, SUM(count)
     FROM daily_export_stats WHERE date != 'TOTAL'
     GROUP BY platform, export_format, country, region, city;`,

    // C. Quarantine daily_client_stats
    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, client_info, count, details_json)
     SELECT date, '${batchId}', 'chengdu_api_burst', 'daily_client_stats', platform, 'parse_client', device_class || '/' || browser_family || '/' || os_family, count, json_object('date', date, 'platform', platform, 'device_class', device_class, 'browser_family', browser_family, 'os_family', os_family, 'count', count)
     FROM daily_client_stats
     WHERE date = '${targetDate}' AND browser_family = 'other' AND os_family = 'other';`,

    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, client_info, count, details_json)
     SELECT date, '${batchId}', 'nanjing_shanghai_bulk_scrape', 'daily_client_stats', platform, 'export_parse_client', device_class || '/' || browser_family || '/' || os_family, 929, json_object('date', date, 'platform', platform, 'device_class', device_class, 'browser_family', browser_family, 'os_family', os_family, 'quarantined_count', 929)
     FROM daily_client_stats
     WHERE date = '${targetDate}' AND platform = 'netease' AND browser_family = 'chrome' AND os_family = 'windows';`,

    `DELETE FROM daily_client_stats
     WHERE date = '${targetDate}' AND browser_family = 'other' AND os_family = 'other';`,

    `UPDATE daily_client_stats
     SET count = count - 929
     WHERE date = '${targetDate}' AND platform = 'netease' AND browser_family = 'chrome' AND os_family = 'windows';`,

    // D. Quarantine hourly_stats
    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, value, count, details_json)
     SELECT date, '${batchId}', 'hourly_crawler_burst', 'hourly_stats', platform, metric, 'hour_' || hour, count, json_object('date', date, 'hour', hour, 'platform', platform, 'metric', metric, 'count', count)
     FROM hourly_stats
     WHERE date = '${targetDate}' AND (
       metric = 'rate_limited'
       OR (hour = 6 AND metric = 'parse_success' AND platform IN ('qqmusic', 'netease'))
       OR (hour IN (6, 7, 8, 10, 11) AND metric = 'export' AND platform = 'netease')
       OR (hour IN (7, 8, 10, 11) AND metric = 'parse_success' AND platform = 'netease')
     );`,

    `DELETE FROM hourly_stats WHERE date = '${targetDate}' AND metric = 'rate_limited';`,
    `DELETE FROM hourly_stats WHERE date = '${targetDate}' AND hour IN (7, 8, 10) AND platform IN ('netease', 'all') AND metric IN ('parse_success', 'export');`,
    `UPDATE hourly_stats SET count = count - 421 WHERE date = '${targetDate}' AND hour = 6 AND platform = 'qqmusic' AND metric = 'parse_success';`,
    `UPDATE hourly_stats SET count = count - 397 WHERE date = '${targetDate}' AND hour = 6 AND platform = 'netease' AND metric = 'parse_success';`,
    `UPDATE hourly_stats SET count = count - (421 + 397) WHERE date = '${targetDate}' AND hour = 6 AND platform = 'all' AND metric = 'parse_success';`,
    `UPDATE hourly_stats SET count = count - 53 WHERE date = '${targetDate}' AND hour = 6 AND platform = 'netease' AND metric = 'export';`,
    `UPDATE hourly_stats SET count = count - 18 WHERE date = '${targetDate}' AND hour = 11 AND platform = 'netease' AND metric = 'parse_success';`,
    `UPDATE hourly_stats SET count = count - 18 WHERE date = '${targetDate}' AND hour = 11 AND platform = 'all' AND metric = 'parse_success';`,
    `UPDATE hourly_stats SET count = count - 18 WHERE date = '${targetDate}' AND hour = 11 AND platform = 'netease' AND metric = 'export';`,
    `DELETE FROM hourly_stats WHERE date = '${targetDate}' AND count <= 0;`,

    // E. Quarantine daily_performance_stats
    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, value, count, details_json)
     SELECT date, '${batchId}', 'performance_crawler_telemetry', 'daily_performance_stats', platform, dimension, value, count, json_object('date', date, 'platform', platform, 'dimension', dimension, 'value', value, 'count', count)
     FROM daily_performance_stats
     WHERE date = '${targetDate}' AND dimension IN ('rate_limit_endpoint', 'rate_limit_country');`,

    `DELETE FROM daily_performance_stats WHERE date = '${targetDate}' AND dimension IN ('rate_limit_endpoint', 'rate_limit_country');`,
    `UPDATE daily_performance_stats SET count = count - 923 WHERE date = '${targetDate}' AND platform = 'netease' AND dimension = 'export_format' AND value = 'xlsx';`,
    `UPDATE daily_performance_stats SET count = count - 923 WHERE date = '${targetDate}' AND platform = 'netease' AND dimension = 'export_country' AND value = 'CN';`,
    `UPDATE daily_performance_stats SET count = count - 421 WHERE date = '${targetDate}' AND platform = 'qqmusic' AND dimension = 'input_type' AND value = 'web_url';`,
    `UPDATE daily_performance_stats SET count = count - 1276 WHERE date = '${targetDate}' AND platform = 'netease' AND dimension = 'input_type' AND value = 'web_url';`,
    `DELETE FROM daily_performance_stats WHERE date = '${targetDate}' AND count <= 0;`,

    `DELETE FROM daily_performance_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_performance_stats (date, platform, dimension, value, count)
     SELECT 'TOTAL', platform, dimension, value, SUM(count)
     FROM daily_performance_stats WHERE date != 'TOTAL'
     GROUP BY platform, dimension, value;`,

    // F. Quarantine & Align aggregate_stats
    `INSERT INTO quarantined_stats (incident_date, batch_id, reason, source_table, platform, metric_or_dimension, count, details_json)
     VALUES 
       ('${targetDate}', '${batchId}', 'chengdu_api_burst', 'aggregate_stats', 'qqmusic', 'parse_success', 421, json_object('date', '${targetDate}', 'platform', 'qqmusic', 'metric', 'parse_success', 'quarantined_count', 421)),
       ('${targetDate}', '${batchId}', 'chengdu_api_burst', 'aggregate_stats', 'qqmusic', 'rate_limited', 343, json_object('date', '${targetDate}', 'platform', 'qqmusic', 'metric', 'rate_limited', 'quarantined_count', 343)),
       ('${targetDate}', '${batchId}', 'chengdu_api_burst', 'aggregate_stats', 'netease', 'rate_limited', 310, json_object('date', '${targetDate}', 'platform', 'netease', 'metric', 'rate_limited', 'quarantined_count', 310)),
       ('${targetDate}', '${batchId}', 'nanjing_shanghai_bulk_scrape', 'aggregate_stats', 'netease', 'exports_total', 923, json_object('date', '${targetDate}', 'platform', 'netease', 'metric', 'exports_total', 'quarantined_count', 923)),
       ('${targetDate}', '${batchId}', 'crawler_total_parse_reduction', 'aggregate_stats', 'netease', 'parse_success', 1276, json_object('date', '${targetDate}', 'platform', 'netease', 'metric', 'parse_success', 'quarantined_count', 1276)),
       ('${targetDate}', '${batchId}', 'crawler_total_tracks_reduction', 'aggregate_stats', 'all', 'tracks_processed', 282242, json_object('date', '${targetDate}', 'platform', 'all', 'metric', 'tracks_processed', 'quarantined_count', 282242));`,

    `DELETE FROM aggregate_stats WHERE date = '${targetDate}' AND metric = 'rate_limited';`,
    `UPDATE aggregate_stats SET count = count - 421 WHERE date = '${targetDate}' AND platform = 'qqmusic' AND metric = 'parse_success';`,
    `UPDATE aggregate_stats SET count = count - 58000 WHERE date = '${targetDate}' AND platform = 'qqmusic' AND metric = 'tracks_processed';`,
    `UPDATE aggregate_stats SET count = count - 1276 WHERE date = '${targetDate}' AND platform = 'netease' AND metric = 'parse_success';`,
    `UPDATE aggregate_stats SET count = count - 224242 WHERE date = '${targetDate}' AND platform = 'netease' AND metric = 'tracks_processed';`,
    `UPDATE aggregate_stats SET count = count - 923 WHERE date = '${targetDate}' AND platform = 'netease' AND metric = 'exports_total';`,

    `UPDATE aggregate_stats
     SET count = (
       SELECT COALESCE(SUM(count), 0)
       FROM aggregate_stats
       WHERE date = '${targetDate}' AND platform != 'all' AND metric = 'parse_success'
     )
     WHERE date = '${targetDate}' AND platform = 'all' AND metric = 'parse_success';`,

    `UPDATE aggregate_stats
     SET count = (
       SELECT COALESCE(SUM(count), 0)
       FROM aggregate_stats
       WHERE date = '${targetDate}' AND platform != 'all' AND metric = 'tracks_processed'
     )
     WHERE date = '${targetDate}' AND platform = 'all' AND metric = 'tracks_processed';`,

    `UPDATE aggregate_stats
     SET count = (
       SELECT COALESCE(SUM(count), 0)
       FROM aggregate_stats
       WHERE date = '${targetDate}' AND platform != 'all' AND metric = 'exports_total'
     )
     WHERE date = '${targetDate}' AND platform = 'all' AND metric = 'exports_total';`,

    `DELETE FROM aggregate_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
     SELECT 'TOTAL', platform, metric, SUM(count)
     FROM aggregate_stats
     WHERE date != 'TOTAL'
     GROUP BY platform, metric;`,
  ];

  let step = 0;
  for (const stmt of statements) {
    step++;
    const normalized = stmt.replace(/\s+/g, ' ').trim();
    if (normalized) {
      process.stdout.write(`  [${step}/${statements.length}] Applying step...\r`);
      await queryFn(normalized);
    }
  }
  console.log(`  [${statements.length}/${statements.length}] All steps executed.`);

  console.log('\n✔ Successfully isolated all crawler anomalies into "quarantined_stats" and recalibrated aggregates.');

  // 3. Post-verification
  const postQuarantineCount = await queryFn(`SELECT count(*) as count, sum(count) as total_events FROM quarantined_stats WHERE batch_id = '${batchId}';`);
  console.log(`\nQuarantine Table Status: ${postQuarantineCount[0]?.count || 0} quarantined record rows (${postQuarantineCount[0]?.total_events || 0} total anomaly events preserved).`);

  const cleanStats = await queryFn(`
    SELECT platform, metric, count
    FROM aggregate_stats
    WHERE date = '${targetDate}'
    ORDER BY platform, metric;
  `);

  console.log(`\nActive Clean Stats for ${targetDate}:`);
  for (const r of cleanStats) {
    console.log(`  - [${r.platform.padEnd(8)}] ${r.metric.padEnd(18)}: ${r.count}`);
  }

  return {
    success: true,
    quarantinedCount: postQuarantineCount[0]?.count,
    cleanStats,
  };
}

if (process.argv[1] === __filename) {
  const options = parseArgs();
  isolateCrawlerData(options)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`✖ Error during isolation: ${err.message}`);
      process.exit(1);
    });
}
