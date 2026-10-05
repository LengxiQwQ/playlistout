import type { AnalyticsChannel } from './types';

const CHANNELS = new Set<AnalyticsChannel>(['web', 'plugin', 'api', 'internal', 'legacy_mixed']);
const PLATFORMS = new Set(['qqmusic', 'netease', 'kugou', 'qishui', 'unknown', 'none']);
const SCOPES = new Set(['product', 'all']);

export interface AnalyticsV2Filters {
  from: string;
  to: string;
  channel?: string;
  client?: string;
  platform?: string;
  country?: string;
  region?: string;
  scope: 'product' | 'all';
}

function utcDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function isDateToken(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateDistanceDays(from: string, to: string): number {
  return Math.floor(
    (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000,
  );
}

function boundedToken(value: string | null, max = 64): string | undefined {
  if (!value || value === 'all') return undefined;
  const clean = value.trim();
  if (!clean || clean.length > max || /[\u0000-\u001f]/.test(clean)) {
    throw new Error('Invalid analytics filter token.');
  }
  return clean;
}

export function parseAnalyticsV2Filters(url: URL): AnalyticsV2Filters {
  const today = utcDate();
  const from = url.searchParams.get('from') || today;
  const to = url.searchParams.get('to') || from;
  if (!isDateToken(from) || !isDateToken(to) || from > to) {
    throw new Error('Invalid date range. Use YYYY-MM-DD with from <= to.');
  }
  const span = dateDistanceDays(from, to);
  if (span < 0 || span > 366) {
    throw new Error('Analytics date range may not exceed 367 calendar days.');
  }

  const channel = boundedToken(url.searchParams.get('channel'), 32);
  if (channel && !CHANNELS.has(channel as AnalyticsChannel)) {
    throw new Error('Invalid channel filter.');
  }

  const platform = boundedToken(url.searchParams.get('platform'), 32);
  if (platform && !PLATFORMS.has(platform)) {
    throw new Error('Invalid platform filter.');
  }

  const client = boundedToken(url.searchParams.get('client'), 48);
  const rawCountry = boundedToken(url.searchParams.get('country'), 16);
  const country = rawCountry ? rawCountry.toUpperCase() : undefined;
  if (country && country !== 'UNKNOWN' && !/^[A-Z]{2}$/.test(country)) {
    throw new Error('Invalid country filter.');
  }

  const region = boundedToken(url.searchParams.get('region'), 50);
  const scopeRaw = (url.searchParams.get('scope') || 'product').trim().toLowerCase();
  if (!SCOPES.has(scopeRaw)) throw new Error('Invalid analytics scope.');

  return {
    from,
    to,
    channel,
    client,
    platform,
    country,
    region,
    scope: scopeRaw as 'product' | 'all',
  };
}

function whereFor(filters: AnalyticsV2Filters, alias = '') {
  const prefix = alias ? alias + '.' : '';
  const values: unknown[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return '?' + values.length;
  };

  const clauses = [
    `${prefix}date >= ${bind(filters.from)}`,
    `${prefix}date <= ${bind(filters.to)}`,
  ];

  if (filters.scope === 'product') {
    clauses.push(`${prefix}channel != 'internal'`);
    clauses.push(`${prefix}trust_class NOT IN ('automated', 'abusive')`);
  }
  if (filters.channel) clauses.push(`${prefix}channel = ${bind(filters.channel)}`);
  if (filters.client) clauses.push(`${prefix}client_id = ${bind(filters.client)}`);
  if (filters.platform) clauses.push(`${prefix}platform = ${bind(filters.platform)}`);
  if (filters.country) clauses.push(`${prefix}country = ${bind(filters.country)}`);
  if (filters.region) clauses.push(`${prefix}region = ${bind(filters.region)}`);

  return { sql: clauses.join(' AND '), values };
}

async function rows<T>(
  db: D1Database,
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = values.length ? await stmt.bind(...values).all<T>() : await stmt.all<T>();
  return result.results || [];
}

function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

async function distribution(
  db: D1Database,
  filters: AnalyticsV2Filters,
  field: 'channel' | 'client_id' | 'client_version' | 'host_platform' | 'platform' | 'country' | 'region',
  limit = 30,
) {
  const where = whereFor(filters);
  const activityPredicate = `
    (
      (data_origin='live' AND metric IN ('resolve_request','parse_success','parse_failure','user_request'))
      OR
      (data_origin='historical' AND metric IN ('resolve_request','parse_success','parse_failure','legacy_playlist_activity'))
    )
  `;
  const result = await rows<{ name: string; count: number }>(
    db,
    `SELECT ${field} AS name, SUM(count) AS count
     FROM analytics_v2_daily_core
     WHERE ${where.sql} AND ${activityPredicate}
     GROUP BY ${field}
     ORDER BY count DESC
     LIMIT ${Math.max(1, Math.min(100, limit))}`,
    where.values,
  );
  const total = result.reduce((sum, item) => sum + safeNumber(item.count), 0);
  return result.map((item) => ({
    name: item.name,
    count: safeNumber(item.count),
    percentage: pct(safeNumber(item.count), total),
  }));
}

async function dimensionDistribution(
  db: D1Database,
  filters: AnalyticsV2Filters,
  dimension: string,
  limit = 30,
) {
  const where = whereFor(filters);
  const result = await rows<{ name: string; count: number }>(
    db,
    `SELECT value AS name, SUM(count) AS count
     FROM analytics_v2_daily_dimensions
     WHERE ${where.sql} AND dimension = ?${where.values.length + 1}
     GROUP BY value
     ORDER BY count DESC
     LIMIT ${Math.max(1, Math.min(100, limit))}`,
    [...where.values, dimension],
  );
  const total = result.reduce((sum, item) => sum + safeNumber(item.count), 0);
  return result.map((item) => ({
    name: item.name,
    count: safeNumber(item.count),
    percentage: pct(safeNumber(item.count), total),
  }));
}

export async function getAnalyticsV2Dashboard(
  db: D1Database | undefined,
  filters: AnalyticsV2Filters,
) {
  if (!db) throw new Error('Analytics database is unavailable.');

  const where = whereFor(filters);
  const summaryRows = await rows<Record<string, unknown>>(
    db,
    `SELECT
       SUM(CASE WHEN metric='resolve_request' THEN count ELSE 0 END)
       + SUM(CASE WHEN metric IN ('parse_success','parse_failure') THEN count ELSE 0 END)
       + SUM(CASE WHEN metric='user_request' THEN count ELSE 0 END) AS requests,
       SUM(CASE WHEN metric IN ('playlist_success','parse_success') THEN count ELSE 0 END) AS playlist_success,
       SUM(CASE WHEN metric='user_success' THEN count ELSE 0 END) AS user_success,
       SUM(CASE WHEN metric IN ('resolve_failure','parse_failure','user_failure') THEN count ELSE 0 END) AS failures,
       SUM(CASE WHEN metric='tracks_processed' THEN value_sum ELSE 0 END) AS tracks,
       SUM(CASE WHEN metric='export' THEN count ELSE 0 END) AS exports,
       SUM(CASE WHEN metric='clipboard' THEN count ELSE 0 END) AS clipboards,
       SUM(CASE WHEN metric='page_view' THEN count ELSE 0 END) AS page_views,
       SUM(CASE WHEN metric='daily_unique' THEN count ELSE 0 END) AS daily_unique,
       SUM(CASE WHEN metric='rate_limited' THEN count ELSE 0 END) AS rate_limited
     FROM analytics_v2_daily_core
     WHERE ${where.sql}`,
    where.values,
  );
  const raw = summaryRows[0] || {};
  const requests = safeNumber(raw.requests);
  const playlistSuccess = safeNumber(raw.playlist_success);
  const userSuccess = safeNumber(raw.user_success);
  const failures = safeNumber(raw.failures);
  const successfulRequests = playlistSuccess + userSuccess;

  const integrationWhere = whereFor({ ...filters, scope: 'all' });
  const integrationRows = await rows<{ total: number }>(
    db,
    `SELECT COUNT(DISTINCT client_id) AS total
     FROM analytics_v2_daily_core
     WHERE ${integrationWhere.sql}
       AND channel IN ('plugin','api')
       AND metric IN ('resolve_request','parse_success','parse_failure','user_request')
       AND count > 0`,
    integrationWhere.values,
  );

  const seriesRows = await rows<{ date: string; metric: string; count: number; value_sum: number }>(
    db,
    `SELECT date, metric, SUM(count) AS count, SUM(value_sum) AS value_sum
     FROM analytics_v2_daily_core
     WHERE ${where.sql}
       AND metric IN (
         'resolve_request','playlist_success','user_success','resolve_failure',
         'parse_success','parse_failure','user_request','user_failure',
         'tracks_processed','export','clipboard','page_view','daily_unique','rate_limited'
       )
     GROUP BY date, metric
     ORDER BY date ASC`,
    where.values,
  );
  const dayMap = new Map<string, any>();
  for (const row of seriesRows) {
    const item = dayMap.get(row.date) || {
      date: row.date, requests: 0, playlistSuccess: 0, userSuccess: 0, failures: 0,
      tracks: 0, exports: 0, clipboards: 0, pageViews: 0, dailyUnique: 0, rateLimited: 0,
    };
    const count = safeNumber(row.count);
    if (row.metric === 'resolve_request') item.requests += count;
    if (row.metric === 'parse_success' || row.metric === 'parse_failure' || row.metric === 'user_request') item.requests += count;
    if (row.metric === 'playlist_success' || row.metric === 'parse_success') item.playlistSuccess += count;
    if (row.metric === 'user_success') item.userSuccess += count;
    if (row.metric === 'resolve_failure' || row.metric === 'parse_failure' || row.metric === 'user_failure') item.failures += count;
    if (row.metric === 'tracks_processed') item.tracks += safeNumber(row.value_sum);
    if (row.metric === 'export') item.exports += count;
    if (row.metric === 'clipboard') item.clipboards += count;
    if (row.metric === 'page_view') item.pageViews += count;
    if (row.metric === 'daily_unique') item.dailyUnique += count;
    if (row.metric === 'rate_limited') item.rateLimited += count;
    dayMap.set(row.date, item);
  }

  const hourlyWhere = whereFor(filters);
  const hourlyRows = await rows<{ date: string; hour: number; metric: string; count: number; value_sum: number }>(
    db,
    `SELECT date, hour, metric, SUM(count) AS count, SUM(value_sum) AS value_sum
     FROM analytics_v2_hourly_core
     WHERE ${hourlyWhere.sql}
       AND metric IN ('resolve_request','parse_success','parse_failure','tracks_processed','export','clipboard','page_view','daily_unique','rate_limited')
     GROUP BY date, hour, metric
     ORDER BY date ASC, hour ASC`,
    hourlyWhere.values,
  );
  const hourMap = new Map<string, any>();
  for (const row of hourlyRows) {
    const key = row.date + ':' + row.hour;
    const item = hourMap.get(key) || {
      timestamp: row.date + 'T' + String(row.hour).padStart(2, '0') + ':00:00.000Z',
      requests: 0, tracks: 0, exports: 0, clipboards: 0, pageViews: 0, dailyUnique: 0, rateLimited: 0,
    };
    const count = safeNumber(row.count);
    if (row.metric === 'resolve_request' || row.metric === 'parse_success' || row.metric === 'parse_failure') item.requests += count;
    if (row.metric === 'tracks_processed') item.tracks += safeNumber(row.value_sum);
    if (row.metric === 'export') item.exports += count;
    if (row.metric === 'clipboard') item.clipboards += count;
    if (row.metric === 'page_view') item.pageViews += count;
    if (row.metric === 'daily_unique') item.dailyUnique += count;
    if (row.metric === 'rate_limited') item.rateLimited += count;
    hourMap.set(key, item);
  }

  const originRows = await rows<{ data_origin: string; count: number }>(
    db,
    `SELECT data_origin, SUM(count) AS count
     FROM analytics_v2_daily_core
     WHERE ${where.sql}
     GROUP BY data_origin`,
    where.values,
  );
  const hasHistorical = originRows.some((row) => row.data_origin === 'historical' && safeNumber(row.count) > 0);
  const geoSliceRequested = Boolean(filters.country || filters.region);

  const metaRows = await rows<{ key: string; value: string }>(
    db,
    "SELECT key, value FROM analytics_v2_meta ORDER BY key;",
  );

  const dimensionNames = [
    'export_format', 'clipboard_mode', 'referrer_source',
    'device_class', 'browser_family', 'os_family', 'device_brand',
    'input_type', 'latency_bucket', 'error_category', 'playlist_size',
    'provider_path', 'failure_code', 'failure_class', 'failure_stage',
    'provider_failure_path', 'requested_type', 'requested_platform',
    'rate_limit_endpoint', 'rate_limit_country',
  ];
  const dimensions: Record<string, unknown> = {};
  for (const name of dimensionNames) {
    dimensions[name] = await dimensionDistribution(db, filters, name, 30);
  }

  return {
    filters,
    summary: {
      requests,
      successfulRequests,
      playlistSuccess,
      userSuccess,
      failures,
      successRate: pct(successfulRequests, requests),
      tracksProcessed: safeNumber(raw.tracks),
      exports: safeNumber(raw.exports),
      clipboards: safeNumber(raw.clipboards),
      pageViews: safeNumber(raw.page_views),
      cumulativeDailyUnique: safeNumber(raw.daily_unique),
      rateLimited: safeNumber(raw.rate_limited),
      activeIntegrations: safeNumber(integrationRows[0]?.total),
    },
    dailySeries: Array.from(dayMap.values()),
    hourlySeries: Array.from(hourMap.values()),
    breakdowns: {
      channels: await distribution(db, filters, 'channel'),
      clients: await distribution(db, filters, 'client_id'),
      clientVersions: await distribution(db, filters, 'client_version'),
      hostPlatforms: await distribution(db, filters, 'host_platform'),
      platforms: await distribution(db, filters, 'platform'),
      countries: await distribution(db, filters, 'country'),
      regions: await distribution(db, filters, 'region'),
    },
    dimensions,
    coverage: {
      hasHistorical,
      geoSliceRequested,
      historicalCrossDimensionLimited: hasHistorical && geoSliceRequested,
      note: hasHistorical && geoSliceRequested
        ? 'Historical V1 success/outcome rows cannot be truthfully cross-attributed to geography. Geographic historical demand is available as legacy activity; post-V2 live rows support full slicing.'
        : null,
    },
    meta: Object.fromEntries(metaRows.map((row) => [row.key, row.value])),
    generatedAt: new Date().toISOString(),
  };
}

export async function getAnalyticsV2FilterOptions(
  db: D1Database | undefined,
  filters: AnalyticsV2Filters,
) {
  if (!db) throw new Error('Analytics database is unavailable.');

  const base: AnalyticsV2Filters = { ...filters, channel: undefined, client: undefined, platform: undefined, region: undefined };
  const where = whereFor(base);
  const optionRows = async (field: 'channel' | 'client_id' | 'platform' | 'country' | 'region') => {
    const result = await rows<{ value: string }>(
      db,
      `SELECT DISTINCT ${field} AS value
       FROM analytics_v2_daily_core
       WHERE ${where.sql}
       ORDER BY value ASC`,
      where.values,
    );
    return result.map((row) => row.value).filter(Boolean);
  };

  return {
    channels: await optionRows('channel'),
    clients: await optionRows('client_id'),
    platforms: await optionRows('platform'),
    countries: await optionRows('country'),
    regions: await optionRows('region'),
  };
}
