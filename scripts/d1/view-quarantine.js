#!/usr/bin/env node
/**
 * D1 Telemetry Quarantined Crawler Data Viewer
 *
 * Inspects all isolated dirty crawler data preserved in `quarantined_stats`.
 *
 * Usage:
 *   node scripts/d1/view-quarantine.js --remote
 *   node scripts/d1/view-quarantine.js --remote --limit 50
 *   node scripts/d1/view-quarantine.js --remote --json
 */

import { executeD1Query } from './verify-migration-history.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 100;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10) || 100;
    }
  }
  return {
    remote: args.includes('--remote'),
    json: args.includes('--json'),
    limit,
  };
}

export async function viewQuarantinedData(options = {}) {
  const queryFn = options.queryFn || ((sql) => executeD1Query(sql, options));
  const limit = options.limit || 100;
  const isJson = Boolean(options.json);

  // Check if quarantined_stats table exists
  const tableCheck = await queryFn("SELECT name FROM sqlite_master WHERE type='table' AND name='quarantined_stats';");
  if (!tableCheck || tableCheck.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ success: true, data: { quarantine: [], summary: [], totalRecords: 0, totalEvents: 0 } }));
    } else {
      console.log('\n=======================================================');
      console.log('📁  PlaylistOut D1 Quarantined Crawler Records Viewer');
      console.log('=======================================================\n');
      console.log('No "quarantined_stats" table found in the database. No data has been quarantined yet.');
    }
    return;
  }

  // Summary by incident & reason
  const summary = await queryFn(`
    SELECT incident_date, batch_id, reason, source_table, count(*) as records_count, sum(count) as total_events
    FROM quarantined_stats
    GROUP BY incident_date, batch_id, reason, source_table
    ORDER BY incident_date DESC, total_events DESC;
  `);

  // Totals
  const totals = await queryFn(`
    SELECT count(*) as total_records, sum(count) as total_events
    FROM quarantined_stats;
  `);
  const totalRecords = totals?.[0]?.total_records || 0;
  const totalEvents = totals?.[0]?.total_events || 0;

  // Recent detailed records
  const details = await queryFn(`
    SELECT id, quarantined_at, incident_date, batch_id, reason, source_table, platform, metric_or_dimension, value, country, region, city, client_info, count, details_json
    FROM quarantined_stats
    ORDER BY id ASC
    LIMIT ${limit};
  `);

  if (isJson) {
    console.log(JSON.stringify({
      success: true,
      data: {
        quarantine: details,
        summary,
        totalRecords,
        totalEvents,
      }
    }));
    return;
  }

  console.log(`\n=======================================================`);
  console.log(`📁  PlaylistOut D1 Quarantined Crawler Records Viewer`);
  console.log(`=======================================================\n`);

  console.log('--- Quarantined Batches & Reasons Summary ---');
  if (summary.length === 0) {
    console.log('  (Table exists but is empty)');
    return;
  }

  console.table(summary);

  console.log(`\n--- Detailed Quarantined Records (Showing ${details.length} of ${limit}) ---`);
  for (const d of details) {
    const loc = d.city ? ` [City: ${d.city}]` : '';
    console.log(`[#${d.id}] ${d.quarantined_at} | ${d.reason} | ${d.source_table} | ${d.platform} | ${d.metric_or_dimension}${loc} => count: ${d.count}`);
    if (d.details_json) {
      try {
        const parsed = JSON.parse(d.details_json);
        console.log(`      Payload: ${JSON.stringify(parsed)}`);
      } catch {
        console.log(`      Payload: ${d.details_json}`);
      }
    }
  }
}

if (process.argv[1] === __filename) {
  const options = parseArgs();
  viewQuarantinedData(options)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`✖ Error viewing quarantined data: ${err.message}`);
      process.exit(1);
    });
}
