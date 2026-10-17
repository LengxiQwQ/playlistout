/**
 * PlaylistOut Analytics & Review In-Memory Slice Engine
 * Faithfully ported from scripts/utils/dashboard.py to TypeScript
 */

import type {
  AnalyticsSnapshot,
  AnalyticsSlice,
  FeedbackSlice,
  FeedbackStats,
  QuarantineSlice,
  FilterParams,
  SnapshotDailyCoreRow,
  SnapshotHourlyCoreRow,
  SnapshotGeoRow,
  SnapshotBreakdownRow,
  SnapshotClientEnvRow,
  CountItem,
  QualityCheck,
  IntegrationClientSummary,
  DauChannelTotals,
  DauDailyPoint,
  DauHourlyPoint,
  DauClientRow,
  DauCumulativeHourlyPoint,
  DauCoverage,
  DauAnnotation,
  DauComparisonMeta,
  DauSingleDayStats,
  DauMultiDayStats,
} from './types';
import { PAGE_FILTER_CAPABILITIES } from './types';

export const CORE_METRICS = [
  'resolve_request',
  'playlist_success',
  'user_success',
  'resolve_failure',
  'tracks_processed',
  'export',
  'clipboard',
  'page_view',
  'visitor_unique',
  'active_user',
  'rate_limited',
  'migration_handoff',
] as const;
 
export const LATENCY_BUCKET_ORDER = [
  '<500ms',
  '500-1000ms',
  '1-3s',
  '3-5s',
  '5s+',
] as const;

export function sumBy<T>(rows: T[], key: keyof T): CountItem[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const rawVal = row[key];
    const name = String(rawVal ?? '').trim();
    if (!name) continue;
    const count = Number((row as Record<string, unknown>).count || 0);
    totals.set(name, (totals.get(name) || 0) + count);
  }
  return Array.from(totals.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function reconcileDailyCore(rows: SnapshotDailyCoreRow[]): SnapshotDailyCoreRow[] {
  const reconciled = new Map<string, Record<string, number>>();
  const legacyGroups = new Set<string>();

  for (const row of rows) {
    const groupKey = `${row.date || ''}|${row.channel || ''}|${row.client_id || ''}|${row.platform || ''}`;
    const metric = String(row.metric || '');
    const count = Number(row.count || 0);

    let metrics = reconciled.get(groupKey);
    if (!metrics) {
      metrics = {};
      reconciled.set(groupKey, metrics);
    }
    if (metric === 'parse_success_legacy' || metric === 'parse_failure_legacy') {
      legacyGroups.add(groupKey);
    }
    metrics[metric] = Math.max(metrics[metric] || 0, count);
  }

  if (legacyGroups.size === 0) {
    return rows;
  }

  const result: SnapshotDailyCoreRow[] = [];
  for (const [groupKey, metrics] of reconciled.entries()) {
    const [date, channel, client_id, platform] = groupKey.split('|');

    if (legacyGroups.has(groupKey)) {
      const legSuccess = metrics['parse_success_legacy'] || 0;
      const legFail = metrics['parse_failure_legacy'] || 0;
      delete metrics['parse_success_legacy'];
      delete metrics['parse_failure_legacy'];

      metrics['playlist_success'] = Math.max(metrics['playlist_success'] || 0, legSuccess);
      metrics['resolve_failure'] = Math.max(metrics['resolve_failure'] || 0, legFail);
      const req =
        (metrics['playlist_success'] || 0) +
        (metrics['user_success'] || 0) +
        (metrics['resolve_failure'] || 0);
      metrics['resolve_request'] = Math.max(metrics['resolve_request'] || 0, req);
    }

    for (const [metric, count] of Object.entries(metrics)) {
      if (metric !== 'parse_success_legacy' && metric !== 'parse_failure_legacy') {
        result.push({
          date,
          channel,
          client_id,
          platform,
          metric,
          count,
        });
      }
    }
  }

  return result;
}

export function reconcileClientEnv(rows: SnapshotClientEnvRow[]): SnapshotClientEnvRow[] {
  const merged = new Map<string, number>();

  for (const row of rows) {
    const d = String(row.date || '');
    let ch = String(row.channel || '');
    let cl = String(row.client_id || '');
    let dev = String(row.device_class || '');
    let bf = String(row.browser_family || '');
    let os_f = String(row.os_family || '');
    const cnt = Number(row.count || 0);

    if (bf === 'playlistout_musicfree' || bf === 'playlistout_plugin') {
      bf = 'plugin:musicfree';
      if (ch === 'legacy_mixed') ch = 'plugin';
      if (cl === 'legacy_unknown') cl = 'musicfree';
    } else if (bf === 'bbplayer_playlistout' || cl === 'bbplayer') {
      bf = 'plugin:bbplayer';
      if (ch === 'legacy_mixed' || ch === 'api') ch = 'plugin';
      if (cl === 'legacy_unknown' || cl === 'anonymous_api') cl = 'bbplayer';
      if (dev === 'desktop' && os_f === 'other') {
        dev = 'mobile';
        os_f = 'android';
      }
    }

    const key = `${d}|${ch}|${cl}|${dev}|${bf}|${os_f}`;
    merged.set(key, (merged.get(key) || 0) + cnt);
  }

  const result: SnapshotClientEnvRow[] = [];
  for (const [key, count] of merged.entries()) {
    const [date, channel, client_id, device_class, browser_family, os_family] = key.split('|');
    result.push({
      date,
      channel,
      client_id,
      device_class,
      browser_family,
      os_family,
      count,
    });
  }
  return result;
}

export function reconcileBreakdownRows(rows: SnapshotBreakdownRow[]): SnapshotBreakdownRow[] {
  const merged = new Map<string, number>();

  for (const row of rows) {
    const d = String(row.date || '');
    const ch = String(row.channel || '');
    const cl = String(row.client_id || '');
    const p = String(row.platform || '');
    const dim = String(row.dimension || '');
    let val = String(row.value || '');
    const cnt = Number(row.count || 0);

    if (dim === 'latency_bucket') {
      if (val === '_500ms') {
        val = '<500ms';
      } else if (val === '500ms_1s') {
        val = '500-1000ms';
      } else if (val === '1s_3s') {
        val = '1-3s';
      } else if (val === '3s_5s') {
        val = '3-5s';
      } else if (val === '>5s' || val === '5s') {
        val = '5s+';
      }
    }

    const key = `${d}|${ch}|${cl}|${p}|${dim}|${val}`;
    merged.set(key, (merged.get(key) || 0) + cnt);
  }

  const result: SnapshotBreakdownRow[] = [];
  for (const [key, count] of merged.entries()) {
    const [date, channel, client_id, platform, dimension, value] = key.split('|');
    result.push({
      date,
      channel,
      client_id,
      platform,
      dimension,
      value,
      count,
    });
  }
  return result;
}

function scaleGroupRows<T extends { count: number }>(rows: T[], ratio: number): T[] {
  if (ratio <= 0) return [];
  if (ratio >= 1) return rows;

  const origTotal = rows.reduce((acc, r) => acc + Number(r.count || 0), 0);
  const targetTotal = Math.round(origTotal * ratio);
  if (targetTotal <= 0) return [];

  const exact = rows.map((r) => Number(r.count || 0) * ratio);
  const floored = exact.map((v) => Math.floor(v));
  let rem = targetTotal - floored.reduce((acc, v) => acc + v, 0);

  if (rem > 0) {
    const order = rows
      .map((r, i) => ({ index: i, diff: exact[i] - floored[i], orig: Number(r.count || 0) }))
      .sort((a, b) => b.diff - a.diff || b.orig - a.orig);

    for (let i = 0; i < rem && i < order.length; i++) {
      floored[order[i].index]++;
    }
  }

  const out: T[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (floored[i] > 0) {
      out.push({ ...rows[i], count: floored[i] });
    }
  }
  return out;
}

export function applyCountryExclusion(
  daily: SnapshotDailyCoreRow[],
  geo: SnapshotGeoRow[],
  hourly: SnapshotHourlyCoreRow[],
  excludedCountry = 'MY',
  breakdowns: SnapshotBreakdownRow[] = [],
  envRows: SnapshotClientEnvRow[] = [],
): {
  daily: SnapshotDailyCoreRow[];
  geo: SnapshotGeoRow[];
  hourly: SnapshotHourlyCoreRow[];
  breakdowns: SnapshotBreakdownRow[];
  envRows: SnapshotClientEnvRow[];
} {
  const filteredGeo = geo.filter(
    (row) => String(row.country || '').toUpperCase() !== excludedCountry,
  );

  const excludedMap = new Map<string, number>();
  const legacyParseReq = new Map<string, number>();

  for (const row of geo) {
    if (String(row.country || '').toUpperCase() === excludedCountry) {
      const d = String(row.date || '');
      const ch = String(row.channel || '');
      const cl = String(row.client_id || '');
      const p = String(row.platform || '');
      const m = String(row.metric || '');
      const cnt = Number(row.count || 0);

      const mapKey = `${d}|${ch}|${cl}|${p}|${m}`;
      excludedMap.set(mapKey, (excludedMap.get(mapKey) || 0) + cnt);

      if (m === 'parse_request') {
        const legKey = `${d}|${p}`;
        legacyParseReq.set(legKey, (legacyParseReq.get(legKey) || 0) + cnt);
      }
    }
  }

  if (excludedMap.size === 0 && legacyParseReq.size === 0) {
    return { daily, geo: filteredGeo, hourly, breakdowns, envRows };
  }

  const groupedDaily = new Map<string, Record<string, number>>();
  for (const row of daily) {
    const key = `${row.date || ''}|${row.channel || ''}|${row.client_id || ''}|${row.platform || ''}`;
    let metrics = groupedDaily.get(key);
    if (!metrics) {
      metrics = {};
      groupedDaily.set(key, metrics);
    }
    metrics[String(row.metric || '')] = Number(row.count || 0);
  }

  const filteredDaily: SnapshotDailyCoreRow[] = [];
  const dailyTotalsBefore = new Map<string, number>();
  const dailyTotalsAfter = new Map<string, number>();
  const groupReqBefore = new Map<string, number>();
  const groupReqAfter = new Map<string, number>();
  const clientReqBefore = new Map<string, number>();
  const clientReqAfter = new Map<string, number>();

  for (const [key, metrics] of groupedDaily.entries()) {
    const [d, ch, cl, p] = key.split('|');
    const origReq = Number(metrics['resolve_request'] || 0);

    const groupKey = `${d}|${ch}|${cl}|${p}`;
    groupReqBefore.set(groupKey, (groupReqBefore.get(groupKey) || 0) + origReq);

    const clientKey = `${d}|${ch}|${cl}`;
    clientReqBefore.set(clientKey, (clientReqBefore.get(clientKey) || 0) + origReq);

    for (const [m, c] of Object.entries(metrics)) {
      const totBeforeKey = `${d}|${m}`;
      dailyTotalsBefore.set(totBeforeKey, (dailyTotalsBefore.get(totBeforeKey) || 0) + c);

      const deduction = excludedMap.get(`${d}|${ch}|${cl}|${p}|${m}`) || 0;
      metrics[m] = Math.max(0, c - deduction);
    }

    if (ch === 'legacy_mixed' && legacyParseReq.has(`${d}|${p}`)) {
      const legDed = legacyParseReq.get(`${d}|${p}`) || 0;
      const succ = metrics['playlist_success'] || 0;
      const fromSucc = Math.min(succ, legDed);
      metrics['playlist_success'] = succ - fromSucc;
      const rem = legDed - fromSucc;
      if (rem > 0 && metrics['resolve_failure']) {
        metrics['resolve_failure'] = Math.max(0, metrics['resolve_failure'] - rem);
      }
    }

    if (
      metrics['playlist_success'] !== undefined ||
      metrics['user_success'] !== undefined ||
      metrics['resolve_failure'] !== undefined
    ) {
      const req =
        (metrics['playlist_success'] || 0) +
        (metrics['user_success'] || 0) +
        (metrics['resolve_failure'] || 0);
      metrics['resolve_request'] = req;
    }

    const afterReq = Number(metrics['resolve_request'] || 0);
    groupReqAfter.set(groupKey, (groupReqAfter.get(groupKey) || 0) + afterReq);
    clientReqAfter.set(clientKey, (clientReqAfter.get(clientKey) || 0) + afterReq);

    for (const [m, c] of Object.entries(metrics)) {
      const totAfterKey = `${d}|${m}`;
      dailyTotalsAfter.set(totAfterKey, (dailyTotalsAfter.get(totAfterKey) || 0) + c);

      if (c > 0) {
        filteredDaily.push({
          date: d,
          channel: ch,
          client_id: cl,
          platform: p,
          metric: m,
          count: c,
        });
      }
    }
  }

  const filteredHourly: SnapshotHourlyCoreRow[] = [];
  for (const row of hourly) {
    const d = String(row.date || '');
    const m = String(row.metric || '');
    const origCount = Number(row.count || 0);
    const totBefore = dailyTotalsBefore.get(`${d}|${m}`) || 0;
    const totAfter = dailyTotalsAfter.get(`${d}|${m}`) || 0;

    const newCount =
      totBefore > 0 ? Math.round(origCount * (totAfter / totBefore)) : origCount;

    if (newCount > 0) {
      filteredHourly.push({
        ...row,
        count: newCount,
      });
    }
  }

  const nonResolveDims = new Set([
    'export_format',
    'clipboard_mode',
    'export_playlist_size',
    'referrer_source',
    'migration_destination',
    'migration_provider',
  ]);

  const groupedB = new Map<string, SnapshotBreakdownRow[]>();
  const filteredBreakdowns: SnapshotBreakdownRow[] = [];

  for (const row of breakdowns) {
    const dim = String(row.dimension || '');
    if (nonResolveDims.has(dim)) {
      filteredBreakdowns.push(row);
      continue;
    }
    const key = `${row.date || ''}|${row.channel || ''}|${row.client_id || ''}|${row.platform || ''}|${dim}`;
    let list = groupedB.get(key);
    if (!list) {
      list = [];
      groupedB.set(key, list);
    }
    list.push(row);
  }

  for (const [key, rows] of groupedB.entries()) {
    const [d, ch, cl, p] = key.split('|');
    const before = groupReqBefore.get(`${d}|${ch}|${cl}|${p}`) || 0;
    const after = groupReqAfter.get(`${d}|${ch}|${cl}|${p}`) || 0;
    if (before > 0 && after < before) {
      filteredBreakdowns.push(...scaleGroupRows(rows, after / before));
    } else {
      filteredBreakdowns.push(...rows);
    }
  }

  const groupedE = new Map<string, SnapshotClientEnvRow[]>();
  for (const row of envRows) {
    const key = `${row.date || ''}|${row.channel || ''}|${row.client_id || ''}`;
    let list = groupedE.get(key);
    if (!list) {
      list = [];
      groupedE.set(key, list);
    }
    list.push(row);
  }

  const filteredEnvRows: SnapshotClientEnvRow[] = [];
  for (const [key, rows] of groupedE.entries()) {
    const before = clientReqBefore.get(key) || 0;
    const after = clientReqAfter.get(key) || 0;
    if (before > 0 && after < before) {
      filteredEnvRows.push(...scaleGroupRows(rows, after / before));
    } else {
      filteredEnvRows.push(...rows);
    }
  }

  return {
    daily: filteredDaily,
    geo: filteredGeo,
    hourly: filteredHourly,
    breakdowns: filteredBreakdowns,
    envRows: filteredEnvRows,
  };
}

export function matchesFilter<
  T extends {
    date?: string;
    channel?: string;
    client_id?: string;
    platform?: string;
    country?: string;
    region?: string;
    metric?: string;
  },
>(
  row: T,
  filters: {
    from: string;
    to: string;
    channel?: string;
    client?: string;
    platform?: string;
    country?: string;
    region?: string;
  },
  options: {
    includeGeo?: boolean;
    environment?: boolean;
    platformAgnostic?: boolean;
    omit?: 'channel' | 'client' | 'platform' | 'country' | 'region';
  } = {},
): boolean {
  const dateValue = String(row.date || '');
  if (dateValue < filters.from || dateValue > filters.to) {
    return false;
  }
  if (options.omit !== 'channel' && filters.channel && row.channel !== undefined && row.channel !== filters.channel) {
    return false;
  }
  if (options.omit !== 'client' && filters.client && row.client_id !== undefined && row.client_id !== filters.client) {
    return false;
  }
  if (
    !options.environment &&
    !options.platformAgnostic &&
    options.omit !== 'platform' &&
    filters.platform &&
    row.platform !== undefined &&
    row.platform !== 'none' &&
    row.platform !== filters.platform
  ) {
    return false;
  }
  if (options.includeGeo) {
    if (options.omit !== 'country' && filters.country && row.country !== undefined && row.country !== filters.country) {
      return false;
    }
    if (options.omit !== 'region' && filters.region && row.region !== undefined && row.region !== filters.region) {
      return false;
    }
  }
  return true;
}

export function resolvePageFilterParams(query: FilterParams, page: string): FilterParams {
  const caps = PAGE_FILTER_CAPABILITIES[page] || { supportedDimensions: [] };
  const supported = new Set(caps.supportedDimensions);

  return {
    from: (query.from || '').trim(),
    to: (query.to || '').trim(),
    channel: supported.has('channel') ? (query.channel || '').trim().toLowerCase() : '',
    client: supported.has('client') ? (query.client || '').trim().toLowerCase() : '',
    platform: supported.has('platform') ? (query.platform || '').trim().toLowerCase() : '',
    country: supported.has('country') ? (query.country || '').trim().toUpperCase() : '',
    region: supported.has('region') ? (query.region || '').trim() : '',
    exclude_my: query.exclude_my,
  };
}



// ── Cross-channel Daily Active Users (DAU) aggregation ──
// Web activity is `visitor_unique` on channel `web`; plugin / CLI activity is
// `active_user` recorded per UTC day and scope. Missing metrics default to 0 so
// older snapshots without DAU rows render naturally.

const DAU_METRICS = new Set(['visitor_unique', 'active_user']);

type DauChannelSlot = 'web' | 'plugin' | 'cli';

function dauChannelFor(metric: string, channel: string): DauChannelSlot | null {
  const ch = String(channel || '').trim();
  if (metric === 'visitor_unique' && (ch === 'web' || !ch)) return 'web';
  if (metric === 'active_user' && ch === 'plugin') return 'plugin';
  if (metric === 'active_user' && ch === 'cli') return 'cli';
  if (metric === 'active_user' && !ch) return 'plugin';
  return null;
}

function emptyDauTotals(): DauChannelTotals {
  return { total: 0, web: 0, plugin: 0, cli: 0 };
}

function addDauCount(
  totals: DauChannelTotals,
  metric: string,
  channel: string,
  count: number,
): void {
  const slot = dauChannelFor(metric, channel);
  if (!slot || !Number.isFinite(count) || count <= 0) return;
  totals[slot] += count;
  totals.total += count;
}

export const SYSTEM_TELEMETRY_MILESTONES: Record<
  'web' | 'plugin' | 'cli',
  { coverageStart: string; title: string; description: string }
> = {
  web: {
    coverageStart: '2026-03-01',
    title: '网页端访客统计启动',
    description: 'Web 端 visitor_unique 匿名去重访客统计上线',
  },
  plugin: {
    coverageStart: '2026-10-15',
    title: '生态插件活跃开始采集',
    description: 'MusicFree 等生态插件接入心跳与活跃遥测',
  },
  cli: {
    coverageStart: '2026-10-15',
    title: 'CLI 活跃开始采集',
    description: 'Playlist Out CLI 接入使用活跃遥测',
  },
};

export function detectDauCoverage(rows: SnapshotDailyCoreRow[]): DauCoverage {
  let hasWebRow = false;
  let minWeb: string | null = null;
  let minPlugin: string | null = null;
  let minCli: string | null = null;
  let maxDate: string | null = null;

  for (const row of rows) {
    const d = String(row.date || '').trim();
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (!maxDate || d > maxDate) maxDate = d;
    const m = String(row.metric || '').trim();
    const ch = String(row.channel || '').trim();

    if (m === 'visitor_unique' && (ch === 'web' || !ch)) {
      hasWebRow = true;
      if (!minWeb || d < minWeb) minWeb = d;
    } else if (m === 'active_user' && ch === 'plugin') {
      if (!minPlugin || d < minPlugin) minPlugin = d;
    } else if (m === 'active_user' && ch === 'cli') {
      if (!minCli || d < minCli) minCli = d;
    }
  }

  const webMilestone = SYSTEM_TELEMETRY_MILESTONES.web.coverageStart;
  const pluginMilestone = SYSTEM_TELEMETRY_MILESTONES.plugin.coverageStart;
  const cliMilestone = SYSTEM_TELEMETRY_MILESTONES.cli.coverageStart;

  const hasWeb = Boolean(hasWebRow || (maxDate && maxDate >= webMilestone) || !maxDate);
  const webStart = minWeb || webMilestone;

  const hasPlugin = Boolean(minPlugin || (maxDate && maxDate >= pluginMilestone) || !maxDate);
  const pluginStart = hasPlugin
    ? (minPlugin && minPlugin < pluginMilestone ? minPlugin : pluginMilestone)
    : null;

  const hasCli = Boolean(minCli || (maxDate && maxDate >= cliMilestone) || !maxDate);
  const cliStart = hasCli
    ? (minCli && minCli < cliMilestone ? minCli : cliMilestone)
    : null;

  return {
    web: { earliestDate: webStart, hasCoverage: hasWeb },
    plugin: { earliestDate: pluginStart, hasCoverage: hasPlugin },
    cli: { earliestDate: cliStart, hasCoverage: hasCli },
  };
}

export function generateDauAnnotations(coverage: DauCoverage): DauAnnotation[] {
  const annotations: DauAnnotation[] = [];
  if (coverage.web.hasCoverage && coverage.web.earliestDate) {
    annotations.push({
      date: coverage.web.earliestDate,
      type: 'coverage_start',
      title: SYSTEM_TELEMETRY_MILESTONES.web.title,
      description: SYSTEM_TELEMETRY_MILESTONES.web.description,
      channel: 'web',
    });
  }
  if (coverage.plugin.hasCoverage && coverage.plugin.earliestDate) {
    annotations.push({
      date: coverage.plugin.earliestDate,
      type: 'coverage_start',
      title: SYSTEM_TELEMETRY_MILESTONES.plugin.title,
      description: SYSTEM_TELEMETRY_MILESTONES.plugin.description,
      channel: 'plugin',
    });
  }
  if (coverage.cli.hasCoverage && coverage.cli.earliestDate) {
    annotations.push({
      date: coverage.cli.earliestDate,
      type: 'coverage_start',
      title: SYSTEM_TELEMETRY_MILESTONES.cli.title,
      description: SYSTEM_TELEMETRY_MILESTONES.cli.description,
      channel: 'cli',
    });
  }
  return annotations.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildAnalyticsSlice(
  snapshot: AnalyticsSnapshot,
  query: FilterParams,
): AnalyticsSlice {
  const rawDaily = reconcileDailyCore(snapshot.dailyCore || []);
  const rawHourly = snapshot.hourlyCore || [];
  const rawGeo = snapshot.geo || [];
  const rawBreakdowns = reconcileBreakdownRows(snapshot.breakdowns || []);
  const rawEnvRows = reconcileClientEnv(snapshot.clientEnv || []);

  const excludeMy =
    String(query.country || '').trim().toUpperCase() === 'MY'
      ? false
      : Boolean(query.exclude_my);

  const { daily, geo: geoRows, hourly, breakdowns: breakdownRows, envRows } =
    excludeMy
      ? applyCountryExclusion(rawDaily, rawGeo, rawHourly, 'MY', rawBreakdowns, rawEnvRows)
      : {
          daily: rawDaily,
          geo: rawGeo,
          hourly: rawHourly,
          breakdowns: rawBreakdowns,
          envRows: rawEnvRows,
        };

  const allDates = Array.from(new Set(daily.map((r) => String(r.date || '')).filter(Boolean))).sort();
  const latest = allDates.length ? allDates[allDates.length - 1] : '';
  const earliest = allDates.length ? allDates[0] : '';

  let fromDate = (query.from || earliest || latest).trim();
  let toDate = (query.to || latest || earliest).trim();
  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  const filters = {
    from: fromDate,
    to: toDate,
    channel: (query.channel || '').trim().toLowerCase(),
    client: (query.client || '').trim().toLowerCase(),
    platform: (query.platform || '').trim().toLowerCase(),
    country: (query.country || '').trim().toUpperCase(),
    region: (query.region || '').trim(),
    exclude_my: excludeMy ? '1' : '0',
  };

  const geoActive = Boolean(filters.country || filters.region);
  const source = geoActive ? geoRows : daily;

  const filteredSource = source.filter((row) =>
    matchesFilter(row, filters, { includeGeo: geoActive }),
  );

  const overviewRaw: Record<string, number> = {};
  for (const m of CORE_METRICS) overviewRaw[m] = 0;
  for (const row of filteredSource) {
    const m = String(row.metric || '');
    overviewRaw[m] = (overviewRaw[m] || 0) + Number(row.count || 0);
  }

  const resolveRequest = overviewRaw['resolve_request'] || 0;
  const resolveTerminal =
    (overviewRaw['playlist_success'] || 0) +
    (overviewRaw['user_success'] || 0) +
    (overviewRaw['resolve_failure'] || 0);

  const byDay = new Map<string, Record<string, string | number>>();
  for (const row of filteredSource) {
    const day = String(row.date || '');
    const metric = String(row.metric || '');
    if (!day || !metric) continue;
    let target = byDay.get(day);
    if (!target) {
      target = { date: day };
      byDay.set(day, target);
    }
    target[metric] = (Number(target[metric] || 0)) + Number(row.count || 0);
  }
  const timeseries = Array.from(byDay.keys())
    .sort()
    .map((k) => byDay.get(k)!);

  let hourlyTimeseries: Array<Record<string, string | number>> = [];
  if (!geoActive && fromDate === toDate) {
    const byHour = new Map<number, Record<string, string | number>>();
    for (const row of hourly) {
      if (!matchesFilter(row, filters)) continue;
      const h = Number(row.hour || 0);
      const metric = String(row.metric || '');
      let target = byHour.get(h);
      if (!target) {
        target = { date: fromDate, hour: h };
        byHour.set(h, target);
      }
      target[metric] = (Number(target[metric] || 0)) + Number(row.count || 0);
    }
    hourlyTimeseries = Array.from(byHour.keys())
      .sort((a, b) => a - b)
      .map((h) => byHour.get(h)!);
  }

  // Web Traffic Timeseries (strictly channel=web, naturally Web-scoped)
  const webFilters = { ...filters, channel: 'web' };
  const webFilteredSource = source.filter((row) =>
    row.channel === 'web' && matchesFilter(row, webFilters, { includeGeo: geoActive }),
  );
  const webByDay = new Map<string, Record<string, string | number>>();
  for (const row of webFilteredSource) {
    const day = String(row.date || '');
    const metric = String(row.metric || '');
    if (!day || !metric) continue;
    let target = webByDay.get(day);
    if (!target) {
      target = { date: day };
      webByDay.set(day, target);
    }
    target[metric] = (Number(target[metric] || 0)) + Number(row.count || 0);
  }
  const webTimeseries = Array.from(webByDay.keys())
    .sort()
    .map((k) => webByDay.get(k)!);

  let webHourlyTimeseries: Array<Record<string, string | number>> = [];
  if (!geoActive && fromDate === toDate) {
    const webByHour = new Map<number, Record<string, string | number>>();
    for (let h = 0; h < 24; h++) {
      webByHour.set(h, { date: fromDate, hour: h, page_view: 0, visitor_unique: 0 });
    }
    for (const row of hourly) {
      if (row.channel !== 'web' && row.channel !== undefined) continue;
      if (!matchesFilter(row, webFilters)) continue;
      const h = Number(row.hour || 0);
      const metric = String(row.metric || '');
      const target = webByHour.get(h);
      if (target) {
        target[metric] = (Number(target[metric] || 0)) + Number(row.count || 0);
      }
    }
    webHourlyTimeseries = Array.from(webByHour.keys())
      .sort((a, b) => a - b)
      .map((h) => webByHour.get(h)!);
  }


  const breakdownTotals = new Map<string, Map<string, number>>();
  for (const row of breakdownRows) {
    if (!matchesFilter(row, filters)) continue;
    const dim = String(row.dimension || '');
    const val = String(row.value || '');
    const cl = String(row.client_id || '');
    const cnt = Number(row.count || 0);
    if (dim && val) {
      if (!breakdownTotals.has(dim)) breakdownTotals.set(dim, new Map());
      const dimMap = breakdownTotals.get(dim)!;
      dimMap.set(val, (dimMap.get(val) || 0) + cnt);

      if (dim === 'client_version' && cl) {
        const clVerKey = `${cl}_version`;
        if (!breakdownTotals.has(clVerKey)) breakdownTotals.set(clVerKey, new Map());
        const clMap = breakdownTotals.get(clVerKey)!;
        clMap.set(val, (clMap.get(val) || 0) + cnt);
      } else if (dim === 'host_platform' && cl) {
        const clHostKey = `${cl}_host`;
        if (!breakdownTotals.has(clHostKey)) breakdownTotals.set(clHostKey, new Map());
        const clMap = breakdownTotals.get(clHostKey)!;
        clMap.set(val, (clMap.get(val) || 0) + cnt);
      }
    }
  }

  // Backfill early BBPlayer test requests before version/host headers were introduced
  const bbplayerReqTotal = filteredSource
    .filter((r) => r.client_id === 'bbplayer' && r.metric === 'resolve_request')
    .reduce((acc, r) => acc + Number(r.count || 0), 0);

  const bbplayerVerRecorded = Array.from(
    breakdownTotals.get('bbplayer_version')?.values() || [],
  ).reduce((acc, v) => acc + v, 0);

  if (bbplayerReqTotal > bbplayerVerRecorded) {
    const diff = bbplayerReqTotal - bbplayerVerRecorded;
    if (!breakdownTotals.has('bbplayer_version')) breakdownTotals.set('bbplayer_version', new Map());
    breakdownTotals.get('bbplayer_version')!.set('2.7.0', (breakdownTotals.get('bbplayer_version')!.get('2.7.0') || 0) + diff);

    if (!breakdownTotals.has('client_version')) breakdownTotals.set('client_version', new Map());
    breakdownTotals.get('client_version')!.set('2.7.0', (breakdownTotals.get('client_version')!.get('2.7.0') || 0) + diff);
  }

  const bbplayerHostRecorded = Array.from(
    breakdownTotals.get('bbplayer_host')?.values() || [],
  ).reduce((acc, v) => acc + v, 0);

  if (bbplayerReqTotal > bbplayerHostRecorded) {
    const diff = bbplayerReqTotal - bbplayerHostRecorded;
    if (!breakdownTotals.has('bbplayer_host')) breakdownTotals.set('bbplayer_host', new Map());
    breakdownTotals.get('bbplayer_host')!.set('android', (breakdownTotals.get('bbplayer_host')!.get('android') || 0) + diff);

    if (!breakdownTotals.has('host_platform')) breakdownTotals.set('host_platform', new Map());
    breakdownTotals.get('host_platform')!.set('android', (breakdownTotals.get('host_platform')!.get('android') || 0) + diff);
  }

  const breakdowns: Record<string, CountItem[]> = {};
  for (const [dim, valMap] of breakdownTotals.entries()) {
    const items = Array.from(valMap.entries())
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({ name, count }));

    if (dim === 'latency_bucket') {
      const orderMap = new Map<string, number>(
        LATENCY_BUCKET_ORDER.map((name, i) => [name, i]),
      );
      items.sort((a, b) => {
        const idxA = orderMap.has(a.name) ? orderMap.get(a.name)! : 999;
        const idxB = orderMap.has(b.name) ? orderMap.get(b.name)! : 999;
        if (idxA !== idxB) return idxA - idxB;
        return a.name.localeCompare(b.name);
      });
    } else {
      items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }

    if (items.length > 0) {
      breakdowns[dim] = items;
    }
  }

  const filteredGeo = geoRows.filter((r) =>
    matchesFilter(r, filters, { includeGeo: true }),
  );

  // Web Geo: strictly channel=web and metric=visitor_unique
  const webGeoRows = geoRows.filter((r) =>
    r.channel === 'web' &&
    r.metric === 'visitor_unique' &&
    matchesFilter(r, filters, { includeGeo: true }),
  );
  const webCountries = sumBy(
    webGeoRows.filter((r) => r.country !== 'UNKNOWN'),
    'country',
  );
  const webRegions = sumBy(
    webGeoRows.filter((r) => r.region !== 'UNKNOWN' && (r.country === 'CN' || !r.country)),
    'region',
  );

  // Request Geo: strictly resolve_request (or fallback to any resolve row if legacy)
  const reqGeoRows = filteredGeo.filter((r) => r.metric === 'resolve_request');
  const reqCountries = sumBy(
    reqGeoRows.filter((r) => r.country !== 'UNKNOWN'),
    'country',
  );
  const reqRegions = sumBy(
    reqGeoRows.filter((r) => r.region !== 'UNKNOWN' && (r.country === 'CN' || !r.country)),
    'region',
  );
  const countries = reqCountries.length > 0
    ? reqCountries
    : (webCountries.length > 0 ? webCountries : sumBy(filteredGeo.filter((r) => r.country !== 'UNKNOWN'), 'country'));
  const regions = reqRegions.length > 0
    ? reqRegions
    : (webRegions.length > 0 ? webRegions : sumBy(filteredGeo.filter((r) => r.region !== 'UNKNOWN' && (r.country === 'CN' || !r.country)), 'region'));

  // ── DAU slice: per-day channel series, dynamic target/comparison totals, clients, geo ──
  const coverage = detectDauCoverage(snapshot.dailyCore || []);
  const annotations = generateDauAnnotations(coverage);

  const isSingleDay = fromDate === toDate;
  const targetDate = toDate;
  const shiftDate = (dateStr: string, offsetDays: number): string => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
    return dt.toISOString().slice(0, 10);
  };
  const comparisonDate = shiftDate(targetDate, -1);

  const todayUtc = snapshot.generatedAt ? snapshot.generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const isToday = isSingleDay && targetDate === todayUtc;

  // For platform-agnostic metrics (visitor_unique, active_user, page_view), ensure they are not
  // wiped out when a specific provider platform is selected
  const dauFilteredSource = filters.platform
    ? source.filter((row) =>
        matchesFilter(row, filters, { includeGeo: geoActive, platformAgnostic: true }),
      )
    : filteredSource;

  // Query source across all dates (without date restriction) to ensure targetDate and comparisonDate
  // have full data even if comparisonDate < fromDate (or targetDate was a past date).
  const allDatesSource = source.filter((row) =>
    matchesFilter(
      row,
      { ...filters, from: '0000-00-00', to: '9999-99-99' },
      { includeGeo: geoActive, platformAgnostic: true },
    ),
  );

  const dauAllDatesMap = new Map<string, DauChannelTotals>();
  const clientTargetMap = new Map<string, number>();
  const clientCompMap = new Map<string, number>();
  const clientChannelMap = new Map<string, string>();

  for (const row of allDatesSource) {
    const metric = String(row.metric || '').trim();
    if (!DAU_METRICS.has(metric)) continue;
    const date = String(row.date || '');
    if (!date) continue;
    const count = Number(row.count || 0);

    let dt = dauAllDatesMap.get(date);
    if (!dt) {
      dt = emptyDauTotals();
      dauAllDatesMap.set(date, dt);
    }
    addDauCount(dt, metric, String(row.channel || ''), count);

    if (metric === 'active_user') {
      const channel = String(row.channel || '').trim();
      const client = String(row.client_id || '').trim();
      if ((channel === 'plugin' || channel === 'cli') && client) {
        clientChannelMap.set(client, channel);
        if (date === targetDate) {
          clientTargetMap.set(client, (clientTargetMap.get(client) || 0) + count);
        }
        if (date === comparisonDate) {
          clientCompMap.set(client, (clientCompMap.get(client) || 0) + count);
        }
      }
    }
  }

  const dauByDate = new Map<string, DauChannelTotals>();
  const dauClientWindowTotals = new Map<string, number>();
  const windowTotals = emptyDauTotals();

  for (const row of dauFilteredSource) {
    const metric = String(row.metric || '').trim();
    if (!DAU_METRICS.has(metric)) continue;
    const date = String(row.date || '');
    if (!date) continue;
    const count = Number(row.count || 0);

    let dayTotals = dauByDate.get(date);
    if (!dayTotals) {
      dayTotals = emptyDauTotals();
      dauByDate.set(date, dayTotals);
    }
    addDauCount(dayTotals, metric, String(row.channel || ''), count);
    addDauCount(windowTotals, metric, String(row.channel || ''), count);

    if (metric === 'active_user') {
      const channel = String(row.channel || '').trim();
      const client = String(row.client_id || '').trim();
      if ((channel === 'plugin' || channel === 'cli') && client) {
        clientChannelMap.set(client, channel);
        dauClientWindowTotals.set(client, (dauClientWindowTotals.get(client) || 0) + count);
      }
    }
  }

  const dauSeries: DauDailyPoint[] = [];
  if (dauAllDatesMap.size > 0 || dauByDate.size > 0) {
    if (fromDate && toDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate) && /^\d{4}-\d{2}-\d{2}$/.test(toDate) && fromDate <= toDate) {
      let curr = fromDate;
      while (curr <= toDate) {
        const totals = dauByDate.get(curr) || emptyDauTotals();
        const webUncollected = Boolean(coverage.web.hasCoverage && coverage.web.earliestDate && curr < coverage.web.earliestDate);
        const pluginUncollected = Boolean(coverage.plugin.hasCoverage && coverage.plugin.earliestDate && curr < coverage.plugin.earliestDate);
        const cliUncollected = Boolean(coverage.cli.hasCoverage && coverage.cli.earliestDate && curr < coverage.cli.earliestDate);
        dauSeries.push({
          date: curr,
          ...totals,
          webUncollected,
          pluginUncollected,
          cliUncollected,
        });
        curr = shiftDate(curr, 1);
      }
    } else {
      for (const [date, totals] of Array.from(dauByDate.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        const webUncollected = Boolean(coverage.web.hasCoverage && coverage.web.earliestDate && date < coverage.web.earliestDate);
        const pluginUncollected = Boolean(coverage.plugin.hasCoverage && coverage.plugin.earliestDate && date < coverage.plugin.earliestDate);
        const cliUncollected = Boolean(coverage.cli.hasCoverage && coverage.cli.earliestDate && date < coverage.cli.earliestDate);
        dauSeries.push({
          date,
          ...totals,
          webUncollected,
          pluginUncollected,
          cliUncollected,
        });
      }
    }
  }

  const dauToday = dauAllDatesMap.get(targetDate) || dauByDate.get(targetDate) || emptyDauTotals();
  const dauYesterday = dauAllDatesMap.get(comparisonDate) || dauByDate.get(comparisonDate) || emptyDauTotals();

  // Determine currentHour & effectiveHour (for today: fair comparison cutoff up to latest completed full hour)
  let currentHour = 23;
  let effectiveHour: number | null = 23;
  let hasFullHour = true;
  let isLatestFullHour = true;

  if (isToday) {
    const todayHours = hourly
      .filter((r) => r.date === targetDate && DAU_METRICS.has(String(r.metric || '').trim()))
      .map((r) => Number(r.hour || 0));
    const maxH = todayHours.length > 0 ? Math.max(...todayHours) : 0;
    const genDate = snapshot.generatedAt ? new Date(snapshot.generatedAt) : new Date();
    const genH = genDate.getUTCHours();
    currentHour = Math.min(23, Math.max(maxH, genH));

    // Today's current clock hour (genH) is underway and incomplete.
    // The latest completed full hour is strictly genH - 1.
    // If genH === 0 (e.g. 00:30 UTC), no full hour has elapsed yet today.
    if (genH > 0) {
      effectiveHour = Math.min(23, genH - 1);
      hasFullHour = true;
      isLatestFullHour = true;
    } else {
      effectiveHour = null;
      hasFullHour = false;
      isLatestFullHour = false;
    }
  }

  // Hourly breakdown function for any single date
  const getHourlyBreakdown = (dateStr: string, isTargetToday: boolean, curH: number): DauHourlyPoint[] => {
    const map = new Map<number, { web: number; plugin: number; cli: number }>();
    for (let h = 0; h < 24; h++) {
      map.set(h, { web: 0, plugin: 0, cli: 0 });
    }
    if (!geoActive) {
      for (const row of hourly) {
        if (row.date !== dateStr) continue;
        const m = String(row.metric || '').trim();
        if (!DAU_METRICS.has(m)) continue;
        if (!matchesFilter(row, { ...filters, from: '0000-00-00', to: '9999-99-99' }, { platformAgnostic: true })) continue;
        const h = Number(row.hour || 0);
        if (h < 0 || h > 23) continue;
        const slot = dauChannelFor(m, String(row.channel || ''));
        if (!slot) continue;
        map.get(h)![slot] += Number(row.count || 0);
      }
    }
    const res: DauHourlyPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const entry = map.get(h)!;
      const isFuture = isTargetToday && h > curH;
      const tot = isFuture ? 0 : entry.web + entry.plugin + entry.cli;
      res.push({
        hour: h,
        total: tot,
        web: isFuture ? 0 : entry.web,
        plugin: isFuture ? 0 : entry.plugin,
        cli: isFuture ? 0 : entry.cli,
        isFuture,
      });
    }
    return res;
  };

  const targetHourly = getHourlyBreakdown(targetDate, isToday, currentHour);
  const compHourly = getHourlyBreakdown(comparisonDate, false, 23);

  // Compute cumulative curves for target and comparison day
  let cTargetWeb = 0;
  let cTargetPlugin = 0;
  let cTargetCli = 0;
  let cTargetTotal = 0;

  let cCompWeb = 0;
  let cCompPlugin = 0;
  let cCompCli = 0;
  let cCompTotal = 0;

  const targetCumulative: DauCumulativeHourlyPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const tPoint = targetHourly[h];
    const cPoint = compHourly[h];

    cCompWeb += cPoint.web || 0;
    cCompPlugin += cPoint.plugin || 0;
    cCompCli += cPoint.cli || 0;
    cCompTotal += cPoint.total || 0;

    const isFuture = isToday && h > currentHour;
    if (!isFuture) {
      cTargetWeb += tPoint.web || 0;
      cTargetPlugin += tPoint.plugin || 0;
      cTargetCli += tPoint.cli || 0;
      cTargetTotal += tPoint.total || 0;
    }

    targetCumulative.push({
      hour: h,
      targetTotal: isFuture ? null : cTargetTotal,
      targetWeb: isFuture ? null : cTargetWeb,
      targetPlugin: isFuture ? null : cTargetPlugin,
      targetCli: isFuture ? null : cTargetCli,
      comparisonTotal: cCompTotal,
      comparisonWeb: cCompWeb,
      comparisonPlugin: cCompPlugin,
      comparisonCli: cCompCli,
      baselineTotal: null,
      isFuture,
    });
  }

  // Compute 7-day same-hour baseline
  const baselineHourlyCumulative: number[][] = [];
  for (let i = 1; i <= 7; i++) {
    const bDate = shiftDate(targetDate, -i);
    const dayInc = getHourlyBreakdown(bDate, false, 23);
    let cum = 0;
    const dayCum: number[] = [];
    let hasData = false;
    for (let h = 0; h < 24; h++) {
      cum += dayInc[h].total;
      if (dayInc[h].total > 0) hasData = true;
      dayCum.push(cum);
    }
    const isCovered = Boolean(coverage.web.hasCoverage && coverage.web.earliestDate && bDate >= coverage.web.earliestDate);
    if (isCovered || hasData) {
      baselineHourlyCumulative.push(dayCum);
    }
  }

  const sevenDayBaseline: { hour: number; total: number }[] = [];
  for (let h = 0; h < 24; h++) {
    let sumH = 0;
    for (const dayCum of baselineHourlyCumulative) {
      sumH += dayCum[h];
    }
    const avgH = baselineHourlyCumulative.length > 0 ? Math.round(sumH / baselineHourlyCumulative.length) : 0;
    sevenDayBaseline.push({ hour: h, total: avgH });
    targetCumulative[h].baselineTotal = avgH;
  }

  // Peak first-active hour on target day
  let peakHour: { hour: number; count: number } | null = null;
  let maxInc = -1;
  const maxSearchHour = isToday
    ? (effectiveHour !== null ? effectiveHour : currentHour)
    : 23;
  for (let h = 0; h <= maxSearchHour; h++) {
    const cnt = targetHourly[h].total;
    if (cnt > maxInc) {
      maxInc = cnt;
      peakHour = { hour: h, count: cnt };
    }
  }
  if (!peakHour || maxInc < 0) {
    peakHour = { hour: 0, count: 0 };
  }

  // Coverage comparability check
  let comparable = true;
  let incomparableReason: string | undefined;
  if (coverage.plugin.earliestDate && targetDate >= coverage.plugin.earliestDate && comparisonDate < coverage.plugin.earliestDate) {
    comparable = false;
    incomparableReason = '统计覆盖发生变化（对比日插件尚未采集）';
  } else if (coverage.cli.earliestDate && targetDate >= coverage.cli.earliestDate && comparisonDate < coverage.cli.earliestDate) {
    comparable = false;
    incomparableReason = '统计覆盖发生变化（对比日 CLI 尚未采集）';
  }

  let targetCount = 0;
  let comparisonCount = 0;
  let deltaCount = 0;
  let deltaPercent: number | null = null;
  let baselineCount = 0;
  let baselineDeltaPercent: number | null = null;
  let compLabel = '';
  let targetLabel = '';

  if (isSingleDay) {
    if (isToday) {
      if (effectiveHour !== null) {
        const hStr = String(effectiveHour).padStart(2, '0') + ':00';
        compLabel = `较昨日同期 (00:00~${hStr})`;
        targetLabel = `今日截至 ${hStr}`;
        targetCount = targetCumulative[effectiveHour]?.targetTotal ?? 0;
        comparisonCount = targetCumulative[effectiveHour]?.comparisonTotal ?? 0;
        baselineCount = sevenDayBaseline[effectiveHour]?.total ?? 0;
        deltaCount = targetCount - comparisonCount;
        deltaPercent = (comparable && comparisonCount > 0)
          ? Math.round(((targetCount - comparisonCount) / comparisonCount) * 1000) / 10
          : null;
        const baselineDelta = targetCount - baselineCount;
        baselineDeltaPercent = (comparable && baselineCount > 0)
          ? Math.round((baselineDelta / baselineCount) * 1000) / 10
          : null;
      } else {
        compLabel = '暂无完整小时可比较 (今日 00:00~01:00 尚未结束)';
        targetLabel = '今日进行中 (未满1小时)';
        targetCount = targetCumulative[0]?.targetTotal ?? 0;
        comparisonCount = 0;
        baselineCount = 0;
        deltaCount = 0;
        deltaPercent = null;
        baselineDeltaPercent = null;
      }
    } else {
      compLabel = '较前日全天';
      targetLabel = '当日完整';
      targetCount = dauToday.total;
      comparisonCount = dauYesterday.total;
      baselineCount = sevenDayBaseline[23]?.total ?? 0;
      deltaCount = targetCount - comparisonCount;
      deltaPercent = (comparable && comparisonCount > 0)
        ? Math.round(((targetCount - comparisonCount) / comparisonCount) * 1000) / 10
        : null;
      const baselineDelta = targetCount - baselineCount;
      baselineDeltaPercent = (comparable && baselineCount > 0)
        ? Math.round((baselineDelta / baselineCount) * 1000) / 10
        : null;
    }
  } else {
    compLabel = '较上一等长周期';
    targetLabel = '期末日';
    targetCount = dauToday.total;
    comparisonCount = dauYesterday.total;
    deltaCount = targetCount - comparisonCount;
    deltaPercent = (comparable && comparisonCount > 0)
      ? Math.round(((targetCount - comparisonCount) / comparisonCount) * 1000) / 10
      : null;
  }

  const comparisonMeta: DauComparisonMeta = {
    mode: isSingleDay ? 'prev_day' : 'prev_period',
    label: compLabel,
    targetLabel,
    isSameHour: isToday,
    currentHour: isToday ? currentHour : undefined,
    effectiveHour: isToday ? effectiveHour : undefined,
    hasFullHour: isToday ? hasFullHour : true,
    isLatestFullHour: isToday ? isLatestFullHour : undefined,
    comparable,
    incomparableReason,
    targetCount,
    comparisonCount,
    deltaCount,
    deltaPercent,
    baselineCount: isSingleDay ? baselineCount : undefined,
    baselineDeltaPercent: isSingleDay ? baselineDeltaPercent : undefined,
  };

  const getClientHourlySum = (dateStr: string, client: string, maxHour: number): number => {
    let sum = 0;
    const isWeb = client === 'official_web';
    for (const row of hourly) {
      if (row.date !== dateStr) continue;
      const h = Number(row.hour || 0);
      if (h < 0 || h > maxHour) continue;
      const m = String(row.metric || '').trim();
      if (!DAU_METRICS.has(m)) continue;
      if (!matchesFilter(row, { ...filters, from: '0000-00-00', to: '9999-99-99' }, { platformAgnostic: true })) continue;
      const ch = String(row.channel || '').trim();
      const cl = String(row.client_id || '').trim();

      if (isWeb) {
        if (m === 'visitor_unique' && (ch === 'web' || !ch || cl === 'official_web' || cl === 'web')) {
          sum += Number(row.count || 0);
        }
      } else {
        if (m === 'active_user' && (cl === client || (!cl && ch === clientChannelMap.get(client)))) {
          sum += Number(row.count || 0);
        }
      }
    }
    return sum;
  };

  const getClientPeriodSum = (fromD: string, toD: string, client: string): number => {
    let sum = 0;
    const isWeb = client === 'official_web';
    for (const row of allDatesSource) {
      const d = String(row.date || '');
      if (d < fromD || d > toD) continue;
      const m = String(row.metric || '').trim();
      if (!DAU_METRICS.has(m)) continue;
      const ch = String(row.channel || '').trim();
      const cl = String(row.client_id || '').trim();

      if (isWeb) {
        if (m === 'visitor_unique' && (ch === 'web' || !ch || cl === 'official_web' || cl === 'web')) {
          sum += Number(row.count || 0);
        }
      } else {
        if (m === 'active_user' && (cl === client || (!cl && ch === clientChannelMap.get(client)))) {
          sum += Number(row.count || 0);
        }
      }
    }
    return sum;
  };

  const rangeIncludesToday = !isSingleDay && toDate >= todayUtc;
  const fullDays = rangeIncludesToday
    ? dauSeries.filter((p) => p.date < todayUtc)
    : dauSeries;
  const compDayCount = Math.max(1, fullDays.length);
  const fullDaysTotal = fullDays.reduce((acc, p) => acc + p.total, 0);
  const fullDayAverage = Math.round(fullDaysTotal / compDayCount);
  const dailyAverage = rangeIncludesToday ? fullDayAverage : Math.round(windowTotals.total / Math.max(1, dauSeries.length));

  const completedFromDate = fullDays.length > 0 ? fullDays[0].date : fromDate;
  const prevTo = shiftDate(completedFromDate, -1);
  const prevFrom = shiftDate(prevTo, -(compDayCount - 1));

  const allClients = new Set([
    'official_web',
    ...clientChannelMap.keys(),
    ...dauClientWindowTotals.keys(),
    ...clientTargetMap.keys(),
    ...clientCompMap.keys(),
  ]);

  const dauClients: DauClientRow[] = Array.from(allClients)
    .map((client) => {
      const isWeb = client === 'official_web';
      const channel = isWeb ? 'web' : (clientChannelMap.get(client) || 'plugin');
      const total = isWeb
        ? (isSingleDay ? dauToday.web : windowTotals.web)
        : (dauClientWindowTotals.get(client) || 0);
      const today = isWeb ? dauToday.web : (clientTargetMap.get(client) || 0);
      const yesterday = isWeb ? dauYesterday.web : (clientCompMap.get(client) || 0);

      let targetCount = today;
      let compCount = yesterday;
      let currentPeriodDailyAvg: number | undefined;
      let previousPeriodDailyAvg: number | undefined;

      if (isSingleDay) {
        if (isToday) {
          if (effectiveHour !== null) {
            targetCount = isWeb
              ? (targetCumulative[effectiveHour]?.targetWeb ?? today)
              : getClientHourlySum(targetDate, client, effectiveHour);
            compCount = isWeb
              ? (targetCumulative[effectiveHour]?.comparisonWeb ?? yesterday)
              : getClientHourlySum(comparisonDate, client, effectiveHour);
          } else {
            targetCount = 0;
            compCount = 0;
          }
        } else {
          targetCount = today;
          compCount = yesterday;
        }
      } else {
        const completedFrom = fullDays.length > 0 ? fullDays[0].date : fromDate;
        const completedTo = fullDays.length > 0 ? fullDays[fullDays.length - 1].date : toDate;
        const currClientSum = getClientPeriodSum(completedFrom, completedTo, client);
        const prevClientSum = getClientPeriodSum(prevFrom, prevTo, client);
        currentPeriodDailyAvg = Math.round(currClientSum / compDayCount);
        previousPeriodDailyAvg = Math.round(prevClientSum / compDayCount);
        targetCount = currentPeriodDailyAvg;
        compCount = previousPeriodDailyAvg;
      }

      const dCount = targetCount - compCount;
      const dPct = compCount > 0 ? Math.round(((targetCount - compCount) / compCount) * 1000) / 10 : null;
      const denom = isSingleDay
        ? (dauToday.total || 1)
        : (dailyAverage || 1);
      const sharePct = Math.round((targetCount / denom) * 1000) / 10;

      return {
        client,
        channel,
        total,
        today,
        yesterday,
        targetCount,
        comparisonCount: compCount,
        deltaCount: dCount,
        deltaPercent: dPct,
        sharePercent: sharePct,
        currentPeriodDailyAvg,
        previousPeriodDailyAvg,
      };
    })
    .filter((c) => c.total > 0 || c.today > 0 || c.yesterday > 0 || (c.targetCount ?? 0) > 0 || (c.comparisonCount ?? 0) > 0)
    .sort((a, b) => (b.targetCount ?? b.total) - (a.targetCount ?? a.total) || b.total - a.total || a.client.localeCompare(b.client));

  let multiDayStats: DauMultiDayStats | undefined;
  if (!isSingleDay) {
    let peakDay: { date: string; total: number } | null = null;
    for (const pt of dauSeries) {
      if (!peakDay || pt.total > peakDay.total) {
        peakDay = { date: pt.date, total: pt.total };
      }
    }

    let latestFullDay: { date: string; total: number } | null = null;
    if (fullDays.length > 0) {
      const lastFullPt = fullDays[fullDays.length - 1];
      latestFullDay = { date: lastFullPt.date, total: lastFullPt.total };
    } else if (dauSeries.length > 0) {
      const lastPt = dauSeries[dauSeries.length - 1];
      latestFullDay = { date: lastPt.date, total: lastPt.total };
    }

    const previousPeriodSeries: DauDailyPoint[] = [];
    let prevTotal = 0;

    for (let i = 0; i < compDayCount; i++) {
      const dStr = shiftDate(prevFrom, i);
      const totals = dauAllDatesMap.get(dStr) || emptyDauTotals();
      previousPeriodSeries.push({ date: dStr, ...totals });
      prevTotal += totals.total;
    }
    const prevDailyAvg = Math.round(prevTotal / compDayCount);

    let multiComparable = true;
    let multiIncomparableReason: string | undefined;
    if (coverage.plugin.earliestDate && toDate >= coverage.plugin.earliestDate && prevFrom < coverage.plugin.earliestDate) {
      multiComparable = false;
      multiIncomparableReason = '统计覆盖发生变化（上一周期插件尚未采集）';
    } else if (coverage.cli.earliestDate && toDate >= coverage.cli.earliestDate && prevFrom < coverage.cli.earliestDate) {
      multiComparable = false;
      multiIncomparableReason = '统计覆盖发生变化（上一周期 CLI 尚未采集）';
    }

    const mDelta = dailyAverage - prevDailyAvg;
    const mDeltaPct = (multiComparable && prevDailyAvg > 0)
      ? Math.round((mDelta / prevDailyAvg) * 1000) / 10
      : null;

    comparisonMeta.comparable = multiComparable;
    comparisonMeta.incomparableReason = multiIncomparableReason;
    comparisonMeta.targetCount = dailyAverage;
    comparisonMeta.comparisonCount = prevDailyAvg;
    comparisonMeta.deltaCount = mDelta;
    comparisonMeta.deltaPercent = mDeltaPct;
    comparisonMeta.label = '较上一周期日均';

    const sevenDayMovingAverage: { date: string; value: number }[] = [];
    for (const pt of dauSeries) {
      let sum7 = 0;
      let validDays = 0;
      for (let o = 0; o < 7; o++) {
        const d = shiftDate(pt.date, -o);
        const dayTotals = dauAllDatesMap.get(d);
        const isCovered = Boolean(coverage.web.hasCoverage && coverage.web.earliestDate && d >= coverage.web.earliestDate);
        if (dayTotals !== undefined) {
          sum7 += dayTotals.total;
          validDays++;
        } else if (isCovered) {
          validDays++;
        }
      }
      const ma7Val = validDays > 0 ? Math.round(sum7 / validDays) : pt.total;
      pt.ma7 = ma7Val;
      sevenDayMovingAverage.push({ date: pt.date, value: ma7Val });
    }

    multiDayStats = {
      fromDate,
      toDate,
      dayCount: dauSeries.length,
      dailyAverage,
      fullDayCount: compDayCount,
      fullDayAverage,
      rangeIncludesToday,
      latestFullDay,
      peakDay,
      previousPeriodFrom: prevFrom,
      previousPeriodTo: prevTo,
      previousPeriodSeries,
      sevenDayMovingAverage,
    };
  }

  const singleDayStats: DauSingleDayStats = {
    targetDate,
    comparisonDate,
    currentHour,
    effectiveHour,
    hasFullHour,
    isToday,
    targetCumulative,
    hourlyIncrements: targetHourly,
    comparisonHourlyIncrements: compHourly,
    peakHour,
    sevenDayBaseline,
  };

  let dauHours: DauHourlyPoint[] = [];
  if (!geoActive) {
    const dauByHour = new Map<number, { total: number; web: number; plugin: number; cli: number }>();
    for (const row of hourly) {
      const metric = String(row.metric || '').trim();
      if (!DAU_METRICS.has(metric)) continue;
      if (!matchesFilter(row, filters, { platformAgnostic: true })) continue;
      const h = Number(row.hour || 0);
      let entry = dauByHour.get(h);
      if (!entry) {
        entry = { total: 0, web: 0, plugin: 0, cli: 0 };
        dauByHour.set(h, entry);
      }
      const slot = dauChannelFor(metric, String(row.channel || ''));
      const cnt = Number(row.count || 0);
      entry.total += cnt;
      if (slot) entry[slot] += cnt;
    }
    dauHours = Array.from(dauByHour.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, val]) => ({ hour, total: val.total, web: val.web, plugin: val.plugin, cli: val.cli }));
  }

  const dauGeoSource = filters.platform
    ? geoRows.filter((r) => matchesFilter(r, filters, { includeGeo: true, platformAgnostic: true }))
    : filteredGeo;
  const dauGeoRows = dauGeoSource.filter(
    (row) => dauChannelFor(String(row.metric || '').trim(), String(row.channel || '')) !== null,
  );
  const dauCountries = sumBy(
    dauGeoRows.filter((r) => r.country !== 'UNKNOWN'),
    'country',
  );
  const dauRegions = sumBy(
    dauGeoRows.filter((r) => r.region !== 'UNKNOWN' && (r.country === 'CN' || !r.country)),
    'region',
  );

  function filterOptionRows(omit: 'channel' | 'client' | 'platform', metrics: Set<string>) {
    return source.filter(
      (row) =>
        metrics.has(String(row.metric || '')) &&
        matchesFilter(row, filters, { includeGeo: geoActive, omit }),
    );
  }

  const channels = sumBy(filterOptionRows('channel', new Set(['resolve_request'])), 'channel');
  const clients = sumBy(filterOptionRows('client', new Set(['resolve_request'])), 'client_id');
  const platforms = sumBy(
    filterOptionRows('platform', new Set(['resolve_request'])),
    'platform',
  );

  const matchedChannels = sumBy(
    filteredSource.filter((r) => r.metric === 'resolve_request'),
    'channel',
  );
  const matchedClients = sumBy(
    filteredSource.filter((r) => r.metric === 'resolve_request'),
    'client_id',
  );
  const matchedPlatforms = sumBy(
    filteredSource.filter((r) => r.metric === 'resolve_request'),
    'platform',
  );

  const countryOptionRows = geoRows.filter(
    (row) =>
      row.country !== 'UNKNOWN' &&
      matchesFilter(row, filters, { includeGeo: false, omit: 'country' }),
  );
  const regionOptionRows = geoRows.filter(
    (row) =>
      row.region !== 'UNKNOWN' &&
      (row.country === 'CN' || !row.country) &&
      matchesFilter(row, filters, { includeGeo: true, omit: 'region' }),
  );

  const filteredEnv = envRows.filter((row) =>
    matchesFilter(row, filters, { environment: true }),
  );
  const devices = sumBy(filteredEnv, 'device_class');
  const browsers = sumBy(filteredEnv, 'browser_family');
  const operatingSystems = sumBy(filteredEnv, 'os_family');

  const webEnvRows = envRows.filter((row) =>
    row.channel === 'web' &&
    matchesFilter(row, filters, { environment: true }),
  );
  const webDevices = sumBy(webEnvRows, 'device_class');
  const webBrowsers = sumBy(webEnvRows, 'browser_family');
  const webOperatingSystems = sumBy(webEnvRows, 'os_family');

  const exportTotal = (breakdowns['export_format'] || []).reduce((acc, it) => acc + it.count, 0);
  const clipboardTotal = (breakdowns['clipboard_mode'] || []).reduce((acc, it) => acc + it.count, 0);

  let invalidCount = 0;
  for (const list of [daily, hourly, breakdownRows, geoRows]) {
    for (const r of list as Array<{ date?: string; platform?: string }>) {
      if (r.date === 'TOTAL' || r.platform === 'all') {
        invalidCount++;
      }
    }
  }

  const filteredResolve = daily.filter(
    (row) => row.metric === 'resolve_request' && matchesFilter(row, filters),
  );
  const totalCount = filteredResolve.reduce((acc, r) => acc + Number(r.count || 0), 0);
  const legacyCount = filteredResolve
    .filter((r) => r.channel === 'legacy_mixed')
    .reduce((acc, r) => acc + Number(r.count || 0), 0);

  const checks: QualityCheck[] = [
    {
      id: 'resolve_invariant',
      ok: resolveRequest === resolveTerminal,
      expected: resolveRequest,
      actual: resolveTerminal,
      note: 'resolve_request must equal playlist_success + user_success + resolve_failure',
    },
    {
      id: 'export_breakdown',
      ok: geoActive || excludeMy || Number(overviewRaw['export'] || 0) === exportTotal,
      expected: Number(overviewRaw['export'] || 0),
      actual: exportTotal,
      note:
        geoActive || excludeMy
          ? 'Geo filtering intentionally does not correlate reliability/breakdown cubes.'
          : 'export must equal sum(export_format)',
    },
    {
      id: 'clipboard_breakdown',
      ok: geoActive || excludeMy || Number(overviewRaw['clipboard'] || 0) === clipboardTotal,
      expected: Number(overviewRaw['clipboard'] || 0),
      actual: clipboardTotal,
      note:
        geoActive || excludeMy
          ? 'Geo filtering intentionally does not correlate reliability/breakdown cubes.'
          : 'clipboard must equal sum(clipboard_mode)',
    },
    {
      id: 'forbidden_rollups',
      ok: invalidCount === 0,
      expected: 0,
      actual: invalidCount,
      note: 'V2 tables must never contain TOTAL/all rollups',
    },
  ];

  let fbRows = snapshot.feedback || [];
  if (excludeMy) {
    fbRows = fbRows.filter((r) => String(r.country || '').toUpperCase() !== 'MY');
  }
  const fbPending = fbRows.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length;

  const successCount = Number(overviewRaw['playlist_success'] || 0) + Number(overviewRaw['user_success'] || 0);

  // Period comparison for Overview KPIs
  let previousOverview: AnalyticsSlice['previousOverview'] = undefined;
  let previousWebOverview: AnalyticsSlice['previousWebOverview'] = undefined;
  let previousWebTimeseries: AnalyticsSlice['previousWebTimeseries'] = undefined;
  let previousWebHourlyTimeseries: AnalyticsSlice['previousWebHourlyTimeseries'] = undefined;
  if (fromDate && toDate) {
    const d1 = new Date(fromDate).getTime();
    const d2 = new Date(toDate).getTime();
    const days = Math.max(1, Math.round((d2 - d1) / (86400 * 1000)) + 1);
    const prevTo = shiftDate(fromDate, -1);
    const prevFrom = shiftDate(prevTo, -(days - 1));

    const prevFilters = {
      ...filters,
      from: prevFrom,
      to: prevTo,
    };
    const prevSource = source.filter((row) =>
      matchesFilter(row, prevFilters, { includeGeo: geoActive }),
    );
    const prevRaw: Record<string, number> = {};
    for (const m of CORE_METRICS) prevRaw[m] = 0;
    for (const r of prevSource) {
      const m = String(r.metric || '');
      prevRaw[m] = (prevRaw[m] || 0) + Number(r.count || 0);
    }
    const prevReq = prevRaw['resolve_request'] || 0;
    const prevSucc = Number(prevRaw['playlist_success'] || 0) + Number(prevRaw['user_success'] || 0);
    previousOverview = {
      resolve_request: prevReq,
      playlist_success: prevRaw['playlist_success'] || 0,
      user_success: prevRaw['user_success'] || 0,
      resolve_failure: prevRaw['resolve_failure'] || 0,
      tracks_processed: prevRaw['tracks_processed'] || 0,
      export: prevRaw['export'] || 0,
      clipboard: prevRaw['clipboard'] || 0,
      page_view: prevRaw['page_view'] || 0,
      visitor_unique: prevRaw['visitor_unique'] || 0,
      rate_limited: prevRaw['rate_limited'] || 0,
      migration_handoff: prevRaw['migration_handoff'] || 0,
      success_rate: prevReq > 0 ? Math.round((prevSucc / prevReq) * 10000) / 100 : 0,
      pending_feedback: fbPending,
    };

    const prevWebFilters = {
      ...webFilters,
      from: prevFrom,
      to: prevTo,
    };
    const prevWebSource = source.filter((row) =>
      row.channel === 'web' && matchesFilter(row, prevWebFilters, { includeGeo: geoActive }),
    );
    let prevPV = 0;
    let prevUV = 0;
    const prevWebByDay = new Map<string, Record<string, string | number>>();
    for (const row of prevWebSource) {
      const day = String(row.date || '');
      const metric = String(row.metric || '');
      const cnt = Number(row.count || 0);
      if (metric === 'page_view') prevPV += cnt;
      if (metric === 'visitor_unique') prevUV += cnt;
      if (day && metric) {
        let target = prevWebByDay.get(day);
        if (!target) {
          target = { date: day };
          prevWebByDay.set(day, target);
        }
        target[metric] = (Number(target[metric] || 0)) + cnt;
      }
    }
    previousWebOverview = {
      page_view: prevPV,
      visitor_unique: prevUV,
    };
    previousWebTimeseries = Array.from(prevWebByDay.keys()).sort().map((k) => prevWebByDay.get(k)!);

    if (!geoActive && fromDate === toDate) {
      const prevWebByHour = new Map<number, Record<string, string | number>>();
      for (let h = 0; h < 24; h++) {
        prevWebByHour.set(h, { date: prevFrom, hour: h, page_view: 0, visitor_unique: 0 });
      }
      for (const row of hourly) {
        if (row.channel !== 'web' && row.channel !== undefined) continue;
        if (!matchesFilter(row, prevWebFilters)) continue;
        const h = Number(row.hour || 0);
        const metric = String(row.metric || '');
        const target = prevWebByHour.get(h);
        if (target) {
          target[metric] = (Number(target[metric] || 0)) + Number(row.count || 0);
        }
      }
      previousWebHourlyTimeseries = Array.from(prevWebByHour.keys()).sort((a, b) => a - b).map((h) => prevWebByHour.get(h)!);
    }
  }

  // ── Integration Clients Dynamic Summary ──
  const clientStatsMap = new Map<string, { requests: number; success: number; channel: string }>();
  for (const row of source) {
    if (!matchesFilter(row, filters, { includeGeo: geoActive })) continue;
    const cl = String(row.client_id || '').trim();
    if (!cl || cl === 'none') continue;
    let stat = clientStatsMap.get(cl);
    if (!stat) {
      stat = { requests: 0, success: 0, channel: String(row.channel || 'unknown') };
      clientStatsMap.set(cl, stat);
    }
    const m = String(row.metric || '');
    const cnt = Number(row.count || 0);
    if (m === 'resolve_request') stat.requests += cnt;
    if (m === 'playlist_success' || m === 'user_success') stat.success += cnt;
    if (row.channel && (!stat.channel || stat.channel === 'unknown')) stat.channel = String(row.channel);
  }

  for (const it of clients) {
    if (!clientStatsMap.has(it.name) && it.name && it.name !== 'none') {
      clientStatsMap.set(it.name, { requests: it.count, success: 0, channel: 'unknown' });
    }
  }

  const prevClientStatsMap = new Map<string, { requests: number; success: number }>();
  if (prevFrom && prevTo) {
    const prevClientFilters = { ...filters, from: prevFrom, to: prevTo };
    for (const row of source) {
      if (!matchesFilter(row, prevClientFilters, { includeGeo: geoActive })) continue;
      const cl = String(row.client_id || '').trim();
      if (!cl || cl === 'none') continue;
      let stat = prevClientStatsMap.get(cl);
      if (!stat) {
        stat = { requests: 0, success: 0 };
        prevClientStatsMap.set(cl, stat);
      }
      const m = String(row.metric || '');
      const cnt = Number(row.count || 0);
      if (m === 'resolve_request') stat.requests += cnt;
      if (m === 'playlist_success' || m === 'user_success') stat.success += cnt;
    }
  }

  const integrationClients: IntegrationClientSummary[] = Array.from(clientStatsMap.entries())
    .map(([clientId, stat]) => {
      const requests = stat.requests;
      const successRate = requests > 0 ? Math.round((stat.success / requests) * 1000) / 10 : 0;
      const prevStat = prevClientStatsMap.get(clientId);
      const prevRequests = prevStat?.requests;
      const prevSuccessRate = prevStat && prevStat.requests > 0
        ? Math.round((prevStat.success / prevStat.requests) * 1000) / 10
        : undefined;

      let requestDeltaText = '—';
      let requestDeltaColor = 'var(--m)';
      if (prevRequests !== undefined && prevRequests !== null) {
        const diff = requests - prevRequests;
        if (diff === 0) {
          requestDeltaText = '— 持平';
        } else if (prevRequests === 0) {
          requestDeltaText = '+100% vs 上期';
          requestDeltaColor = 'var(--g)';
        } else {
          const pctVal = ((diff / prevRequests) * 100).toFixed(1);
          requestDeltaText = `${diff > 0 ? '+' : ''}${pctVal}% vs 上期`;
          requestDeltaColor = diff > 0 ? 'var(--g)' : 'var(--r)';
        }
      }

      const clKey = clientId.toLowerCase();
      const versionDist = breakdowns[`${clKey}_version`] || (clKey === 'musicfree' ? breakdowns['client_version'] : []) || [];
      const hostDist = breakdowns[`${clKey}_host`] || (clKey === 'musicfree' ? breakdowns['host_platform'] : []) || [];

      return {
        clientId,
        channel: stat.channel,
        requests,
        successRate,
        prevRequests,
        prevSuccessRate,
        requestDeltaText,
        requestDeltaColor,
        topVersion: versionDist[0]?.name,
        topHost: hostDist[0]?.name,
        versionDistribution: versionDist,
        hostDistribution: hostDist,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  return {
    version: 2,
    filters,
    generatedAt: snapshot.generatedAt,
    availableDateRange: {
      from: earliest || null,
      to: latest || null,
    },
    overview: {
      resolve_request: overviewRaw['resolve_request'] || 0,
      playlist_success: overviewRaw['playlist_success'] || 0,
      user_success: overviewRaw['user_success'] || 0,
      resolve_failure: overviewRaw['resolve_failure'] || 0,
      tracks_processed: overviewRaw['tracks_processed'] || 0,
      export: overviewRaw['export'] || 0,
      clipboard: overviewRaw['clipboard'] || 0,
      page_view: overviewRaw['page_view'] || 0,
      visitor_unique: overviewRaw['visitor_unique'] || 0,
      active_user: overviewRaw['active_user'] || 0,
      rate_limited: overviewRaw['rate_limited'] || 0,
      migration_handoff: overviewRaw['migration_handoff'] || 0,
      success_rate:
        resolveRequest > 0
          ? Math.round((successCount / resolveRequest) * 10000) / 100
          : 0,
      active_clients: matchedClients.filter((it) => it.count > 0).length,
      pending_feedback: fbPending,
    },
    previousOverview,
    webTimeseries,
    webHourlyTimeseries,
    previousWebOverview,
    previousWebTimeseries,
    previousWebHourlyTimeseries,
    dau: {
      targetDate,
      comparisonDate,
      isSingleDay,
      today: dauToday,
      yesterday: dauYesterday,
      windowTotals,
      series: dauSeries,
      hours: dauHours,
      clients: dauClients,
      countries: dauCountries,
      regions: dauRegions,
      coverage,
      annotations,
      comparison: comparisonMeta,
      singleDay: isSingleDay ? singleDayStats : undefined,
      multiDay: isSingleDay ? undefined : multiDayStats,
      targetCumulative: isSingleDay ? targetCumulative : undefined,
      comparisonCumulative: isSingleDay ? targetCumulative.map((p) => ({ hour: p.hour, total: p.comparisonTotal })) : undefined,
      sevenDayBaseline: isSingleDay ? sevenDayBaseline : undefined,
    },
    timeseries,
    hourlyTimeseries,

    breakdowns,
    distributions: {
      channels: matchedChannels,
      clients: matchedClients,
      platforms: matchedPlatforms,
    },
    environment: {
      devices,
      browsers,
      operatingSystems,
      filterScope:
        'Environment supports date/channel/client filters. Platform and geography are intentionally separate privacy cubes.',
    },
    webEnvironment: {
      devices: webDevices,
      browsers: webBrowsers,
      operatingSystems: webOperatingSystems,
      filterScope: 'Web 终端环境基于官方 Web 渠道请求分布。',
    },
    geo: {
      countries,
      regions,
      filterScope:
        'Geography is intentionally stored in a separate privacy-preserving cube. Geo filters affect overview/timeseries/geo, not reliability breakdowns.',
    },
    webGeo: {
      countries: webCountries,
      regions: webRegions,
      filterScope: 'Web 独立访客地域基于官方 Web 渠道的 visitor_unique 指标聚合。',
    },
    availableFilters: {
      channels,
      clients,
      platforms,
      countries: sumBy(countryOptionRows, 'country'),
      regions: sumBy(regionOptionRows, 'region'),
    },
    integrationClients,
    dataQuality: {
      status: checks.every((c) => c.ok) ? 'healthy' : 'error',
      checks,
      latestDate: latest || null,
      legacyMixedShare:
        totalCount > 0 ? Math.round((legacyCount / totalCount) * 10000) / 100 : 0,
    },
    filterContract: {
      supportedDimensions: ['channel', 'client', 'platform', 'country', 'region'],
      scopeNote: '全局分析切片覆盖渠道、接入端、平台及地域维度。',
    },
  };
}

export function buildQuarantineSlice(
  snapshot: AnalyticsSnapshot,
  query: FilterParams & { reason?: string; limit?: number },
): QuarantineSlice {
  let rows = snapshot.quarantine || [];
  const excludeMy =
    String(query.country || '').trim().toUpperCase() === 'MY'
      ? false
      : Boolean(query.exclude_my);

  if (excludeMy) {
    rows = rows.filter((r) => String(r.country || '').toUpperCase() !== 'MY');
  }

  let fromDate = (query.from || '').trim();
  let toDate = (query.to || '').trim();
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  const reason = (query.reason || '').trim();
  const platform = (query.platform || '').trim().toLowerCase();
  const country = (query.country || '').trim().toUpperCase();
  const region = (query.region || '').trim();
  const limit = Math.max(1, Math.min(500, query.limit || 100));

  const filtered = rows.filter((row) => {
    const incDate = String(row.incident_date || '');
    if (fromDate && incDate < fromDate) return false;
    if (toDate && incDate > toDate) return false;
    if (reason && row.reason !== reason) return false;
    if (platform && String(row.platform || '').toLowerCase() !== platform) return false;
    if (country && String(row.country || '').toUpperCase() !== country) return false;
    if (region && String(row.region || '') !== region) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const dateComp = String(b.incident_date || '').localeCompare(String(a.incident_date || ''));
    if (dateComp !== 0) return dateComp;
    return Number(b.id || 0) - Number(a.id || 0);
  });

  // Calculate timeline / timeseries grouped by incident_date ascending
  const timeseriesMap = new Map<string, { count: number; events: number }>();
  // Calculate reasons distribution grouped by reason
  const reasonsMap = new Map<string, number>();

  for (const r of filtered) {
    const d = String(r.incident_date || '').slice(0, 10);
    const cnt = Number(r.count || 0);
    if (d) {
      const cur = timeseriesMap.get(d) || { count: 0, events: 0 };
      cur.count += 1;
      cur.events += cnt;
      timeseriesMap.set(d, cur);
    }
    const rsn = String(r.reason || 'unknown');
    reasonsMap.set(rsn, (reasonsMap.get(rsn) || 0) + cnt);
  }

  const timeseries = Array.from(timeseriesMap.entries())
    .map(([date, val]) => ({ date, count: val.count, events: val.events }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const reasons = Array.from(reasonsMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    quarantine: filtered.slice(0, limit),
    totalRecords: filtered.length,
    totalEvents: filtered.reduce((acc, r) => acc + Number(r.count || 0), 0),
    reasons,
    timeseries,
    filterContract: {
      supportedDimensions: ['platform', 'country', 'region'],
      scopeNote: PAGE_FILTER_CAPABILITIES.security.scopeNote,
    },
  };
}

export function buildFeedbackSlice(
  snapshot: AnalyticsSnapshot,
  query: FilterParams & {
    status?: string;
    error_code?: string;
    sort_by?: 'recent' | 'frequent' | 'oldest_pending';
    limit?: number;
    offset?: number;
  },
): FeedbackSlice {
  let allRows = snapshot.feedback || [];
  const excludeMy =
    String(query.country || '').trim().toUpperCase() === 'MY'
      ? false
      : Boolean(query.exclude_my);

  if (excludeMy) {
    allRows = allRows.filter((r) => String(r.country || '').toUpperCase() !== 'MY');
  }

  let fromDate = (query.from || '').trim();
  let toDate = (query.to || '').trim();
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  const platform = (query.platform || '').trim().toLowerCase();
  const country = (query.country || '').trim().toUpperCase();
  const region = (query.region || '').trim();

  allRows = allRows.filter((r) => {
    const reportDate = String(
      r.last_reported_at || r.first_reported_at || (r as { created_at?: string }).created_at || '',
    ).slice(0, 10);
    if (fromDate && reportDate && reportDate < fromDate) return false;
    if (toDate && reportDate && reportDate > toDate) return false;
    if (platform && String(r.platform || '').toLowerCase() !== platform) return false;
    if (country && String(r.country || '').toUpperCase() !== country) return false;
    if (region && String(r.region || '') !== region) return false;
    return true;
  });

  // Calculate availableErrorCodes from allRows
  const errorCodeCounts = new Map<string, number>();
  const platformCounts = new Map<string, number>();
  const uniqueUrls = new Set<string>();
  let totalReports = 0;

  for (const r of allRows) {
    const code = String(r.error_code || '').trim();
    if (code) {
      errorCodeCounts.set(code, (errorCodeCounts.get(code) || 0) + 1);
    }
    const p = String(r.platform || '').trim().toLowerCase();
    if (p) {
      platformCounts.set(p, (platformCounts.get(p) || 0) + 1);
    }
    if (r.source_url) {
      uniqueUrls.add(r.source_url);
    }
    totalReports += Number(r.report_count || 1);
  }

  const availableErrorCodes = Array.from(errorCodeCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  let topPlatform = '—';
  let maxPCount = 0;
  for (const [p, c] of platformCounts.entries()) {
    if (c > maxPCount) {
      maxPCount = c;
      topPlatform = p;
    }
  }

  let topErrorCode = '—';
  let maxECount = 0;
  for (const [e, c] of errorCodeCounts.entries()) {
    if (c > maxECount) {
      maxECount = c;
      topErrorCode = e;
    }
  }

  const stats: FeedbackStats = {
    uniqueUrls: uniqueUrls.size,
    totalReports,
    topPlatform,
    topErrorCode,
  };

  const statusCounts = { all: allRows.length, pending: 0, resolved: 0, ignored: 0 };
  for (const r of allRows) {
    const s = String(r.status || 'pending').toLowerCase() as 'pending' | 'resolved' | 'ignored';
    if (s in statusCounts) {
      statusCounts[s]++;
    } else {
      statusCounts.pending++;
    }
  }

  let rows = allRows;

  // Filter by status if specified
  const targetStatus = (query.status || '').trim().toLowerCase();
  if (targetStatus && targetStatus !== 'all') {
    rows = rows.filter((r) => (r.status || 'pending').toLowerCase() === targetStatus);
  }

  // Filter by error_code if specified
  const targetErrorCode = (query.error_code || '').trim();
  if (targetErrorCode) {
    rows = rows.filter((r) => String(r.error_code || '').trim() === targetErrorCode);
  }

  // Sorting
  const sortBy = query.sort_by || 'recent';
  rows.sort((a, b) => {
    if (sortBy === 'frequent') {
      const diff = Number(b.report_count || 0) - Number(a.report_count || 0);
      if (diff !== 0) return diff;
    } else if (sortBy === 'oldest_pending') {
      const aPending = (a.status || 'pending') === 'pending';
      const bPending = (b.status || 'pending') === 'pending';
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      if (aPending && bPending) {
        const dateA = String(a.first_reported_at || a.last_reported_at || '');
        const dateB = String(b.first_reported_at || b.last_reported_at || '');
        const dateComp = dateA.localeCompare(dateB);
        if (dateComp !== 0) return dateComp;
      }
    }
    // Default or fallback: recent first
    const dateA = String(
      a.last_reported_at || a.first_reported_at || (a as { created_at?: string }).created_at || '',
    );
    const dateB = String(
      b.last_reported_at || b.first_reported_at || (b as { created_at?: string }).created_at || '',
    );
    const dateComp = dateB.localeCompare(dateA);
    if (dateComp !== 0) return dateComp;
    return Number(b.id || 0) - Number(a.id || 0);
  });

  const limit = Math.max(1, Math.min(200, query.limit || 50));
  const offset = Math.max(0, query.offset || 0);

  return {
    entries: rows.slice(offset, offset + limit),
    total: rows.length,
    counts: statusCounts,
    availableErrorCodes,
    stats,
    filterContract: {
      supportedDimensions: ['platform', 'country', 'region'],
      scopeNote: PAGE_FILTER_CAPABILITIES.feedback.scopeNote,
    },
  };
}

export function normalizeDauCompareMode(
  mode: import('./types').DauCompareMode,
  isSingle: boolean,
): import('./types').DauCompareMode {
  if (isSingle) {
    if (mode === 'prev_period') {
      return 'auto';
    }
  } else {
    if (mode === 'seven_day_baseline') {
      return 'auto';
    }
  }
  return mode;
}

