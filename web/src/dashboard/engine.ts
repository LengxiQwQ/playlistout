/**
 * PlaylistOut Analytics & Review In-Memory Slice Engine
 * Faithfully ported from scripts/utils/dashboard.py to TypeScript
 */

import type {
  AnalyticsSnapshot,
  AnalyticsSlice,
  FeedbackSlice,
  QuarantineSlice,
  FilterParams,
  SnapshotDailyCoreRow,
  SnapshotHourlyCoreRow,
  SnapshotGeoRow,
  SnapshotBreakdownRow,
  SnapshotClientEnvRow,
  CountItem,
  QualityCheck,
  DauChannelTotals,
  DauDailyPoint,
  DauHourlyPoint,
  DauClientRow,
} from './types';

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

    if (dim === 'latency_bucket' && val === '_500ms') {
      val = '<500ms';
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
    omit?: 'channel' | 'client' | 'platform' | 'country' | 'region';
  } = {},
): boolean {
  const dateValue = String(row.date || '');
  if (dateValue < filters.from || dateValue > filters.to) {
    return false;
  }
  if (options.omit !== 'channel' && filters.channel && row.channel !== filters.channel) {
    return false;
  }
  if (options.omit !== 'client' && filters.client && row.client_id !== filters.client) {
    return false;
  }
  if (!options.environment && options.omit !== 'platform' && filters.platform && row.platform !== filters.platform) {
    return false;
  }
  if (options.includeGeo) {
    if (options.omit !== 'country' && filters.country && row.country !== filters.country) {
      return false;
    }
    if (options.omit !== 'region' && filters.region && row.region !== filters.region) {
      return false;
    }
  }
  return true;
}

// ── Cross-channel Daily Active Users (DAU) aggregation ──
// Web activity is `visitor_unique` on channel `web`; plugin / CLI activity is
// `active_user` recorded per UTC day and scope. Missing metrics default to 0 so
// older snapshots without DAU rows render naturally.

const DAU_METRICS = new Set(['visitor_unique', 'active_user']);

type DauChannelSlot = 'web' | 'plugin' | 'cli';

function dauChannelFor(metric: string, channel: string): DauChannelSlot | null {
  const ch = String(channel || '').trim();
  if (metric === 'visitor_unique' && ch === 'web') return 'web';
  if (metric === 'active_user' && ch === 'plugin') return 'plugin';
  if (metric === 'active_user' && ch === 'cli') return 'cli';
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

function utcDayKey(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
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
      : query.exclude_my !== false;

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
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 50);

    if (items.length > 0) {
      breakdowns[dim] = items;
    }
  }

  const filteredGeo = geoRows.filter((r) =>
    matchesFilter(r, filters, { includeGeo: true }),
  );
  const countries = sumBy(
    filteredGeo.filter((r) => r.country !== 'UNKNOWN'),
    'country',
  ).slice(0, 50);
  const regions = sumBy(
    filteredGeo.filter((r) => r.region !== 'UNKNOWN'),
    'region',
  ).slice(0, 80);

  // ── DAU slice: per-day channel series, today/yesterday totals, clients, geo ──
  const dauByDate = new Map<string, DauChannelTotals>();
  const dauClientTotals = new Map<string, DauClientRow>();
  for (const row of filteredSource) {
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

    if (metric === 'active_user') {
      const channel = String(row.channel || '').trim();
      const client = String(row.client_id || '').trim();
      if ((channel === 'plugin' || channel === 'cli') && client) {
        let clientEntry = dauClientTotals.get(client);
        if (!clientEntry) {
          clientEntry = { client, channel, total: 0, today: 0, yesterday: 0 };
          dauClientTotals.set(client, clientEntry);
        }
        clientEntry.total += count;
        if (date === utcDayKey(0)) clientEntry.today += count;
        if (date === utcDayKey(-1)) clientEntry.yesterday += count;
      }
    }
  }

  const dauSeries: DauDailyPoint[] = Array.from(dauByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, totals]) => ({ date, ...totals }));
  const dauToday = dauByDate.get(utcDayKey(0)) || emptyDauTotals();
  const dauYesterday = dauByDate.get(utcDayKey(-1)) || emptyDauTotals();
  const dauClients = Array.from(dauClientTotals.values()).sort(
    (a, b) => b.total - a.total || a.client.localeCompare(b.client),
  );

  let dauHours: DauHourlyPoint[] = [];
  if (!geoActive && fromDate === toDate) {
    const dauByHour = new Map<number, number>();
    for (const row of hourly) {
      const metric = String(row.metric || '').trim();
      if (metric !== 'visitor_unique' && metric !== 'active_user') continue;
      if (!matchesFilter(row, filters)) continue;
      const h = Number(row.hour || 0);
      dauByHour.set(h, (dauByHour.get(h) || 0) + Number(row.count || 0));
    }
    dauHours = Array.from(dauByHour.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, total]) => ({ hour, total }));
  }

  const dauGeoRows = filteredGeo.filter(
    (row) => dauChannelFor(String(row.metric || '').trim(), String(row.channel || '')) !== null,
  );
  const dauCountries = sumBy(
    dauGeoRows.filter((r) => r.country !== 'UNKNOWN'),
    'country',
  ).slice(0, 10);
  const dauRegions = sumBy(
    dauGeoRows.filter((r) => r.region !== 'UNKNOWN'),
    'region',
  ).slice(0, 10);

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
    filterOptionRows('platform', new Set(['resolve_request', 'export', 'clipboard'])),
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
    filteredSource.filter((r) => ['resolve_request', 'export', 'clipboard'].includes(String(r.metric))),
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
      matchesFilter(row, filters, { includeGeo: true, omit: 'region' }),
  );

  const filteredEnv = envRows.filter((row) =>
    matchesFilter(row, filters, { environment: true }),
  );
  const devices = sumBy(filteredEnv, 'device_class');
  const browsers = sumBy(filteredEnv, 'browser_family');
  const operatingSystems = sumBy(filteredEnv, 'os_family');

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
    dau: {
      today: dauToday,
      yesterday: dauYesterday,
      series: dauSeries,
      hours: dauHours,
      clients: dauClients,
      countries: dauCountries,
      regions: dauRegions,
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
    geo: {
      countries,
      regions,
      filterScope:
        'Geography is intentionally stored in a separate privacy-preserving cube. Geo filters affect overview/timeseries/geo, not reliability breakdowns.',
    },
    availableFilters: {
      channels,
      clients,
      platforms,
      countries: sumBy(countryOptionRows, 'country').slice(0, 50),
      regions: sumBy(regionOptionRows, 'region').slice(0, 80),
    },
    dataQuality: {
      status: checks.every((c) => c.ok) ? 'healthy' : 'error',
      checks,
      latestDate: latest || null,
      legacyMixedShare:
        totalCount > 0 ? Math.round((legacyCount / totalCount) * 10000) / 100 : 0,
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
      : query.exclude_my !== false;

  if (excludeMy) {
    rows = rows.filter((r) => String(r.country || '').toUpperCase() !== 'MY');
  }

  let fromDate = (query.from || '').trim();
  let toDate = (query.to || '').trim();
  if (fromDate && toDate && fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  const reason = (query.reason || '').trim();
  const limit = Math.max(1, Math.min(500, query.limit || 100));

  const filtered = rows.filter((row) => {
    const incDate = String(row.incident_date || '');
    if (fromDate && incDate < fromDate) return false;
    if (toDate && incDate > toDate) return false;
    if (reason && row.reason !== reason) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const dateComp = String(b.incident_date || '').localeCompare(String(a.incident_date || ''));
    if (dateComp !== 0) return dateComp;
    return (Number(b.id || 0)) - (Number(a.id || 0));
  });

  return {
    quarantine: filtered.slice(0, limit),
    totalRecords: filtered.length,
    totalEvents: filtered.reduce((acc, r) => acc + Number(r.count || 0), 0),
  };
}

export function buildFeedbackSlice(
  snapshot: AnalyticsSnapshot,
  query: FilterParams & { status?: string; limit?: number; offset?: number },
): FeedbackSlice {
  let allRows = snapshot.feedback || [];
  const excludeMy =
    String(query.country || '').trim().toUpperCase() === 'MY'
      ? false
      : query.exclude_my !== false;

  if (excludeMy) {
    allRows = allRows.filter((r) => String(r.country || '').toUpperCase() !== 'MY');
  }

  const statusCounts = { all: allRows.length, pending: 0, resolved: 0, ignored: 0 };
  for (const r of allRows) {
    const s = String(r.status || 'pending').toLowerCase() as 'pending' | 'resolved' | 'ignored';
    if (s in statusCounts) {
      statusCounts[s]++;
    } else {
      statusCounts.pending++;
    }
  }

  const targetStatus = (query.status || '').trim().toLowerCase();
  let rows = allRows;
  if (targetStatus && targetStatus !== 'all') {
    rows = allRows.filter((r) => (r.status || 'pending').toLowerCase() === targetStatus);
  }

  rows.sort((a, b) => {
    const dateA = String(a.last_reported_at || a.first_reported_at || '');
    const dateB = String(b.last_reported_at || b.first_reported_at || '');
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
  };
}
