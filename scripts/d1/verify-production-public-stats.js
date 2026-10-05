#!/usr/bin/env node
/**
 * Production /api/stats reconciliation smoke test.
 *
 * Uses a public API read before and after a direct D1 read. Because production
 * traffic may increment counters concurrently, the D1 expectation only needs
 * to fall inside the monotonic [first API read, second API read] interval.
 *
 * This verifies the deployed Worker is serving the V2 continuity bridge rather
 * than merely proving that the database itself is internally consistent.
 */

import { executeD1Query } from './verify-migration-history.js';

const PUBLIC_PLATFORMS = ['qqmusic', 'netease', 'kugou', 'qishui'];
const EXPORT_FORMATS = ['txt', 'csv', 'xlsx', 'json', 'm3u8'];
const DEFAULT_API_BASE = 'https://playlistout-api.lengxiqwq.com';

async function query(sql, options) {
  const queryFn = options.queryFn || ((statement) => executeD1Query(statement, options));
  return queryFn(sql);
}

async function fetchPublicStats(options) {
  const fetchFn = options.fetchFn || fetch;
  const base = (options.apiBase || process.env.PLAYLISTOUT_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
  const response = await fetchFn(`${base}/api/stats?verify=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`GET /api/stats returned HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!body || body.success !== true || !body.data) {
    throw new Error('GET /api/stats did not return the expected success envelope.');
  }
  return body.data;
}

function baselineMap(rows) {
  return new Map(rows.map((row) => [row.key, row]));
}

function bridge(baseline, v2Total, v2Today, today) {
  if (!baseline) throw new Error('Missing public cutover baseline row.');
  const totalDelta = Number(v2Total || 0) - Number(baseline.v2_total || 0);
  if (totalDelta < 0) throw new Error(`V2 total regressed for ${baseline.key}`);

  const day = today === baseline.baseline_date
    ? Number(baseline.legacy_day || 0) +
      (Number(v2Today || 0) - Number(baseline.v2_day || 0))
    : Number(v2Today || 0);

  if (day < 0) throw new Error(`V2 daily counter regressed for ${baseline.key}`);

  return {
    total: Number(baseline.legacy_total || 0) + totalDelta,
    day,
  };
}

export async function collectExpectedPublicStats(options = {}) {
  const stateRows = await query(
    "SELECT status, baseline_date, frozen_at FROM analytics_v2_cutover_state WHERE id=1;",
    options,
  );
  const state = stateRows[0];
  if (!state || state.status !== 'frozen' || !state.frozen_at) {
    throw new Error('Analytics V2 cutover is not frozen.');
  }

  const baselines = baselineMap(await query(
    `SELECT key, baseline_date, legacy_total, v2_total, legacy_day, v2_day
     FROM analytics_v2_public_baseline;`,
    options,
  ));

  const todayRows = await query("SELECT date('now') AS today;", options);
  const today = todayRows[0]?.today;
  if (!today) throw new Error('Unable to resolve current UTC date from D1.');

  const metricRows = await query(`
    SELECT metric,
      SUM(count) AS total,
      SUM(CASE WHEN date = date('now') THEN count ELSE 0 END) AS today
    FROM analytics_v2_daily_core
    WHERE metric IN ('page_view','visitor_unique','playlist_success','tracks_processed','export')
    GROUP BY metric;
  `, options);
  const metricMap = new Map(metricRows.map((row) => [row.metric, row]));

  const pageView = bridge(
    baselines.get('metric:page_view'),
    metricMap.get('page_view')?.total,
    metricMap.get('page_view')?.today,
    today,
  );
  const visitors = bridge(
    baselines.get('metric:visitor_unique'),
    metricMap.get('visitor_unique')?.total,
    metricMap.get('visitor_unique')?.today,
    today,
  );
  const parses = bridge(
    baselines.get('metric:playlist_success'),
    metricMap.get('playlist_success')?.total,
    metricMap.get('playlist_success')?.today,
    today,
  );
  const tracks = bridge(
    baselines.get('metric:tracks_processed'),
    metricMap.get('tracks_processed')?.total,
    metricMap.get('tracks_processed')?.today,
    today,
  );
  const exports = bridge(
    baselines.get('metric:export'),
    metricMap.get('export')?.total,
    metricMap.get('export')?.today,
    today,
  );

  const platformRows = await query(`
    SELECT platform,
      SUM(count) AS total,
      SUM(CASE WHEN date = date('now') THEN count ELSE 0 END) AS today
    FROM analytics_v2_daily_core
    WHERE metric='playlist_success'
      AND platform IN ('qqmusic','netease','kugou','qishui')
    GROUP BY platform;
  `, options);
  const platformMap = new Map(platformRows.map((row) => [row.platform, row]));
  const byPlatform = {};
  for (const platform of PUBLIC_PLATFORMS) {
    const row = platformMap.get(platform) || {};
    const value = bridge(
      baselines.get(`platform_success:${platform}`),
      row.total,
      row.today,
      today,
    );
    byPlatform[platform] = {
      totalSuccess: value.total,
      todaySuccess: value.day,
    };
  }

  const formatRows = await query(`
    SELECT value,
      SUM(count) AS total,
      SUM(CASE WHEN date = date('now') THEN count ELSE 0 END) AS today
    FROM analytics_v2_breakdown
    WHERE dimension='export_format'
      AND value IN ('txt','csv','xlsx','json','m3u8')
    GROUP BY value;
  `, options);
  const formatMap = new Map(formatRows.map((row) => [row.value, row]));
  const exportFormatsBreakdown = {};
  for (const format of EXPORT_FORMATS) {
    const row = formatMap.get(format) || {};
    exportFormatsBreakdown[format] = bridge(
      baselines.get(`export_format:${format}`),
      row.total,
      row.today,
      today,
    ).total;
  }

  return {
    totalPageViews: pageView.total,
    pageViewsToday: pageView.day,
    cumulativeDailyVisitors: visitors.total,
    totalVisitors: visitors.total,
    visitorsToday: visitors.day,
    totalPlaylistsParsed: parses.total,
    playlistsParsedToday: parses.day,
    totalTracksProcessed: tracks.total,
    tracksProcessedToday: tracks.day,
    totalExports: exports.total,
    exportsToday: exports.day,
    exportFormatsBreakdown,
    byPlatform,
  };
}

function numericPaths(data) {
  const entries = [
    ['totalPageViews', data.totalPageViews],
    ['pageViewsToday', data.pageViewsToday],
    ['cumulativeDailyVisitors', data.cumulativeDailyVisitors],
    ['totalVisitors', data.totalVisitors],
    ['visitorsToday', data.visitorsToday],
    ['totalPlaylistsParsed', data.totalPlaylistsParsed],
    ['playlistsParsedToday', data.playlistsParsedToday],
    ['totalTracksProcessed', data.totalTracksProcessed],
    ['tracksProcessedToday', data.tracksProcessedToday],
    ['totalExports', data.totalExports],
    ['exportsToday', data.exportsToday],
  ];
  for (const platform of PUBLIC_PLATFORMS) {
    entries.push(
      [`byPlatform.${platform}.totalSuccess`, data.byPlatform?.[platform]?.totalSuccess],
      [`byPlatform.${platform}.todaySuccess`, data.byPlatform?.[platform]?.todaySuccess],
    );
  }
  for (const format of EXPORT_FORMATS) {
    entries.push(
      [`exportFormatsBreakdown.${format}`, data.exportFormatsBreakdown?.[format]],
    );
  }
  return new Map(entries.map(([path, value]) => [path, Number(value)]));
}

export function verifyExpectedIsBracketed(first, expected, second) {
  const a = numericPaths(first);
  const e = numericPaths(expected);
  const b = numericPaths(second);
  const checks = [];

  for (const [path, expectedValue] of e) {
    const firstValue = a.get(path);
    const secondValue = b.get(path);
    const ok =
      Number.isFinite(firstValue) &&
      Number.isFinite(expectedValue) &&
      Number.isFinite(secondValue) &&
      firstValue <= expectedValue &&
      expectedValue <= secondValue;

    checks.push({ path, firstValue, expectedValue, secondValue, ok });
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    throw new Error(
      'Production /api/stats reconciliation failed:\n' +
      failed.map((check) =>
        `- ${check.path}: first=${check.firstValue}, D1=${check.expectedValue}, second=${check.secondValue}`
      ).join('\n')
    );
  }

  if (first.totalVisitors !== first.cumulativeDailyVisitors ||
      second.totalVisitors !== second.cumulativeDailyVisitors) {
    throw new Error('Public totalVisitors compatibility alias diverged from cumulativeDailyVisitors.');
  }

  return checks;
}

export async function verifyProductionPublicStats(options = {}) {
  const first = await fetchPublicStats(options);
  const expected = await collectExpectedPublicStats(options);
  const second = await fetchPublicStats(options);
  const checks = verifyExpectedIsBracketed(first, expected, second);

  return {
    verified: true,
    checks,
    generatedAt: second.generatedAt || null,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  verifyProductionPublicStats({ remote: true })
    .then((result) => {
      console.log(
        `✔ Production /api/stats matches the Analytics V2 continuity bridge across ${result.checks.length} public counters.`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(`✖ ${err.message}`);
      process.exit(1);
    });
}
