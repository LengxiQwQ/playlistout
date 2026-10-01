#!/usr/bin/env node
/**
 * D1 Telemetry Geo-Data Cleanup Tool
 *
 * Safely purges test/contaminated telemetry records by coarse location
 * (country, region, city, and date ranges) across all tables, and automatically
 * recalculates all TOTAL aggregations and aggregate_stats metrics.
 *
 * Usage:
 *   # Preview what would be deleted
 *   node scripts/d1/cleanup-by-geo.js --country MY --remote --dry-run
 *
 *   # Execute cleanup on remote production D1
 *   node scripts/d1/cleanup-by-geo.js --country MY --remote
 *
 *   # Cleanup specific city and date range
 *   node scripts/d1/cleanup-by-geo.js --country MY --city Cyberjaya --from 2026-09-28 --remote
 */

import { executeD1Query } from './verify-migration-history.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    country: null,
    region: null,
    city: null,
    from: null,
    to: null,
    remote: args.includes('--remote'),
    dryRun: args.includes('--dry-run'),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--country' && args[i + 1]) {
      options.country = args[++i].toUpperCase();
    } else if (args[i] === '--region' && args[i + 1]) {
      options.region = args[++i];
    } else if (args[i] === '--city' && args[i + 1]) {
      options.city = args[++i];
    } else if (args[i] === '--from' && args[i + 1]) {
      options.from = args[++i];
    } else if (args[i] === '--to' && args[i + 1]) {
      options.to = args[++i];
    }
  }

  return options;
}

export async function cleanupGeoTelemetry(options = {}) {
  const country = options.country?.toUpperCase();
  if (!country) {
    throw new Error('Missing required option: --country <ISO-CODE> (e.g. --country MY)');
  }

  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));
  const isRemote = Boolean(options.remote);
  const dryRun = Boolean(options.dryRun);

  // Build filter conditions
  let geoFilter = `country = '${country}'`;
  if (options.region) geoFilter += ` AND region = '${options.region}'`;
  if (options.city) geoFilter += ` AND city = '${options.city}'`;

  let dateFilter = '';
  if (options.from) dateFilter += ` AND date >= '${options.from}'`;
  if (options.to) dateFilter += ` AND date <= '${options.to}'`;

  // 1. Scan / preview matching records
  const scanSql = [
    `SELECT 'daily_geo_stats' as tbl, count(*) as count FROM daily_geo_stats WHERE ${geoFilter} ${dateFilter}`,
    `SELECT 'daily_export_stats' as tbl, count(*) as count FROM daily_export_stats WHERE ${geoFilter} ${dateFilter}`,
    `SELECT 'daily_clipboard_stats' as tbl, count(*) as count FROM daily_clipboard_stats WHERE ${geoFilter} ${dateFilter}`,
    `SELECT 'parse_feedback' as tbl, count(*) as count FROM parse_feedback WHERE ${geoFilter}`,
    `SELECT 'daily_performance_stats' as tbl, count(*) as count FROM daily_performance_stats WHERE dimension IN ('export_country', 'clipboard_country', 'rate_limit_country', 'resolve_country') AND value = '${country}' ${dateFilter}`,
  ].join(' UNION ALL ');

  const normalizedScanSql = scanSql.replace(/\s+/g, ' ').trim();
  const scanResults = await queryFn(normalizedScanSql);
  const countsByTable = {};
  let totalRows = 0;
  for (const r of scanResults) {
    countsByTable[r.tbl] = Number(r.count || 0);
    totalRows += Number(r.count || 0);
  }

  console.log(`\nScan summary for target [country: ${country}${options.city ? ', city: ' + options.city : ''}${options.from ? ', from: ' + options.from : ''}]:`);
  for (const [tbl, c] of Object.entries(countsByTable)) {
    console.log(`  - ${tbl.padEnd(25)}: ${c} row(s)`);
  }
  console.log(`Total matching records: ${totalRows}`);

  if (dryRun) {
    console.log('\n[Dry Run] No data was deleted. Omit --dry-run to apply cleanup.');
    return { dryRun: true, totalRows, countsByTable };
  }

  if (totalRows === 0) {
    console.log('\nNo matching records found. Nothing to delete.');
    return { dryRun: false, totalRows: 0, countsByTable };
  }

  // 2. Perform deletion and recalculation in sequence
  console.log('\nExecuting deletion and rebuilding aggregations...');

  const cleanupCommands = [
    // Delete target records
    `DELETE FROM daily_geo_stats WHERE ${geoFilter} ${dateFilter};`,
    `DELETE FROM daily_export_stats WHERE ${geoFilter} ${dateFilter};`,
    `DELETE FROM daily_clipboard_stats WHERE ${geoFilter} ${dateFilter};`,
    `DELETE FROM parse_feedback WHERE ${geoFilter};`,
    `DELETE FROM daily_performance_stats WHERE dimension IN ('export_country', 'clipboard_country', 'rate_limit_country', 'resolve_country') AND value = '${country}' ${dateFilter};`,

    // Rebuild TOTAL in daily_geo_stats
    `DELETE FROM daily_geo_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_geo_stats (date, platform, country, region, city, count)
     SELECT 'TOTAL', platform, country, region, city, SUM(count)
     FROM daily_geo_stats WHERE date != 'TOTAL'
     GROUP BY platform, country, region, city;`,

    // Rebuild TOTAL in daily_export_stats
    `DELETE FROM daily_export_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
     SELECT 'TOTAL', platform, export_format, country, region, city, SUM(count)
     FROM daily_export_stats WHERE date != 'TOTAL'
     GROUP BY platform, export_format, country, region, city;`,

    // Rebuild TOTAL in daily_clipboard_stats
    `DELETE FROM daily_clipboard_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_clipboard_stats (date, platform, clipboard_mode, country, region, city, count)
     SELECT 'TOTAL', platform, clipboard_mode, country, region, city, SUM(count)
     FROM daily_clipboard_stats WHERE date != 'TOTAL'
     GROUP BY platform, clipboard_mode, country, region, city;`,

    // Rebuild TOTAL in daily_performance_stats
    `DELETE FROM daily_performance_stats WHERE date = 'TOTAL';`,
    `INSERT OR REPLACE INTO daily_performance_stats (date, platform, dimension, value, count)
     SELECT 'TOTAL', platform, dimension, value, SUM(count)
     FROM daily_performance_stats WHERE date != 'TOTAL'
     GROUP BY platform, dimension, value;`,

    // Re-synchronize aggregate_stats.exports_total
    `DELETE FROM aggregate_stats WHERE metric = 'exports_total';`,
    `INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
     SELECT date, platform, 'exports_total', SUM(count)
     FROM daily_export_stats WHERE date != 'TOTAL'
     GROUP BY date, platform;`,
    `INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
     SELECT date, 'all', 'exports_total', SUM(count)
     FROM daily_export_stats WHERE date != 'TOTAL'
     GROUP BY date;`,
    `INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
     SELECT 'TOTAL', platform, 'exports_total', SUM(count)
     FROM aggregate_stats WHERE metric = 'exports_total' AND date != 'TOTAL'
     GROUP BY platform;`,
  ];

  for (const cmd of cleanupCommands) {
    const normalized = cmd.replace(/\s+/g, ' ').trim();
    if (normalized) {
      await queryFn(normalized);
    }
  }

  console.log('✔ Cleanup completed successfully and all aggregate totals were synchronized.');
  return { dryRun: false, totalRows, countsByTable };
}

if (process.argv[1] === __filename) {
  const options = parseArgs();
  cleanupGeoTelemetry(options)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`✖ Error during cleanup: ${err.message}`);
      process.exit(1);
    });
}
