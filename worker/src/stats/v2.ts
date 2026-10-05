import {
  ANALYTICS_CHANNELS,
  ANALYTICS_CLIENT_IDS,
  ANALYTICS_PLATFORMS_V2,
  type AnalyticsChannel,
  type AnalyticsClientId,
  type AnalyticsPlatformV2,
} from '../analytics/context';
import { getUtcDateString } from './index';

export interface AnalyticsV2Filters {
  from: string;
  to: string;
  channel?: AnalyticsChannel;
  client?: AnalyticsClientId;
  platform?: AnalyticsPlatformV2;
  country?: string;
  region?: string;
}

interface CountRow {
  name: string;
  count: number;
}

const CORE_METRICS = [
  'resolve_request',
  'playlist_success',
  'user_success',
  'resolve_failure',
  'tracks_processed',
  'export',
  'clipboard',
  'page_view',
  'visitor_unique',
  'rate_limited',
  'migration_handoff',
] as const;

const BREAKDOWN_DIMENSIONS = [
  'endpoint',
  'input_type',
  'requested_type',
  'requested_platform',
  'resolve_outcome',
  'failure_code',
  'failure_class',
  'failure_stage',
  'provider_failure_path',
  'latency_bucket',
  'export_format',
  'clipboard_mode',
  'export_playlist_size',
  'client_version',
  'host_platform',
  'referrer_source',
  'rate_limit_endpoint',
  'migration_destination',
  'migration_provider',
] as const;

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return getUtcDateString(d);
}

function validDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00.000Z`).getTime();
  const b = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((b - a) / 86400000);
}

function boundedRegion(value: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 50);
  return cleaned || undefined;
}

export function parseAnalyticsV2Filters(url: URL): AnalyticsV2Filters {
  const today = getUtcDateString();
  let from = validDate(url.searchParams.get('from')) || dateDaysAgo(29);
  let to = validDate(url.searchParams.get('to')) || today;

  if (from > to) [from, to] = [to, from];
  if (daysBetween(from, to) > 365) {
    from = dateDaysAgo(365);
  }

  const rawChannel = url.searchParams.get('channel')?.trim().toLowerCase();
  const rawClient = url.searchParams.get('client')?.trim().toLowerCase();
  const rawPlatform = url.searchParams.get('platform')?.trim().toLowerCase();
  const rawCountry = url.searchParams.get('country')?.trim().toUpperCase();

  return {
    from,
    to,
    channel: (ANALYTICS_CHANNELS as readonly string[]).includes(rawChannel || '')
      ? (rawChannel as AnalyticsChannel)
      : undefined,
    client: (ANALYTICS_CLIENT_IDS as readonly string[]).includes(rawClient || '')
      ? (rawClient as AnalyticsClientId)
      : undefined,
    platform: (ANALYTICS_PLATFORMS_V2 as readonly string[]).includes(rawPlatform || '')
      ? (rawPlatform as AnalyticsPlatformV2)
      : undefined,
    country: rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined,
    region: boundedRegion(url.searchParams.get('region')),
  };
}

function buildWhere(
  filters: AnalyticsV2Filters,
  options: { geo?: boolean } = {},
): { sql: string; binds: unknown[] } {
  const clauses = ['date >= ?', 'date <= ?'];
  const binds: unknown[] = [filters.from, filters.to];

  if (filters.channel) {
    clauses.push('channel = ?');
    binds.push(filters.channel);
  }
  if (filters.client) {
    clauses.push('client_id = ?');
    binds.push(filters.client);
  }
  if (filters.platform) {
    clauses.push('platform = ?');
    binds.push(filters.platform);
  }

  if (options.geo) {
    if (filters.country) {
      clauses.push('country = ?');
      binds.push(filters.country);
    }
    if (filters.region) {
      clauses.push('region = ?');
      binds.push(filters.region);
    }
  }

  return { sql: clauses.join(' AND '), binds };
}

function bindAll(statement: D1PreparedStatement, binds: unknown[]): D1PreparedStatement {
  return statement.bind(...binds);
}

function sumByName(rows: Array<{ name: string; count: number }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) result[row.name] = Number(row.count || 0);
  return result;
}

async function queryBreakdown(
  db: D1Database,
  filters: AnalyticsV2Filters,
  dimension: string,
): Promise<CountRow[]> {
  const where = buildWhere(filters);
  const result = await bindAll(
    db.prepare(`
      SELECT value AS name, SUM(count) AS count
      FROM analytics_v2_breakdown
      WHERE ${where.sql} AND dimension = ?
      GROUP BY value
      ORDER BY count DESC
      LIMIT 50
    `),
    [...where.binds, dimension],
  ).all<{ name: string; count: number }>();

  return (result.results || []).map((row) => ({ name: row.name, count: Number(row.count || 0) }));
}

export async function getAnalyticsV2(
  db: D1Database | undefined,
  filters: AnalyticsV2Filters,
): Promise<Record<string, unknown>> {
  if (!db) {
    return {
      version: 2,
      filters,
      generatedAt: new Date().toISOString(),
      overview: {},
      timeseries: [],
      breakdowns: {},
      geo: { countries: [], regions: [] },
      availableFilters: { channels: [], clients: [], platforms: [], countries: [], regions: [] },
      dataQuality: { status: 'unavailable', checks: [] },
    };
  }

  const geoActive = Boolean(filters.country || filters.region);
  const sourceTable = geoActive ? 'analytics_v2_geo' : 'analytics_v2_daily_core';
  const where = buildWhere(filters, { geo: geoActive });

  const metricRows = await bindAll(
    db.prepare(`
      SELECT metric AS name, SUM(count) AS count
      FROM ${sourceTable}
      WHERE ${where.sql}
      GROUP BY metric
    `),
    where.binds,
  ).all<{ name: string; count: number }>();

  const overviewRaw = sumByName((metricRows.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })));

  const overview = Object.fromEntries(CORE_METRICS.map((metric) => [metric, overviewRaw[metric] || 0]));
  const resolveRequest = Number(overview.resolve_request || 0);
  const resolveTerminal =
    Number(overview.playlist_success || 0) +
    Number(overview.user_success || 0) +
    Number(overview.resolve_failure || 0);

  const timeseriesRows = await bindAll(
    db.prepare(`
      SELECT date, metric, SUM(count) AS count
      FROM ${sourceTable}
      WHERE ${where.sql}
      GROUP BY date, metric
      ORDER BY date ASC
    `),
    where.binds,
  ).all<{ date: string; metric: string; count: number }>();

  const dayMap = new Map<string, Record<string, number | string>>();
  for (const row of timeseriesRows.results || []) {
    if (!dayMap.has(row.date)) dayMap.set(row.date, { date: row.date });
    dayMap.get(row.date)![row.metric] = Number(row.count || 0);
  }

  const breakdowns: Record<string, CountRow[]> = {};
  for (const dimension of BREAKDOWN_DIMENSIONS) {
    breakdowns[dimension] = await queryBreakdown(db, filters, dimension);
  }

  const geoWhere = buildWhere(filters, { geo: true });
  const countryRows = await bindAll(
    db.prepare(`
      SELECT country AS name, SUM(count) AS count
      FROM analytics_v2_geo
      WHERE ${geoWhere.sql} AND country != 'UNKNOWN'
      GROUP BY country
      ORDER BY count DESC
      LIMIT 50
    `),
    geoWhere.binds,
  ).all<{ name: string; count: number }>();

  const regionRows = await bindAll(
    db.prepare(`
      SELECT region AS name, SUM(count) AS count
      FROM analytics_v2_geo
      WHERE ${geoWhere.sql} AND region != 'UNKNOWN'
      GROUP BY region
      ORDER BY count DESC
      LIMIT 80
    `),
    geoWhere.binds,
  ).all<{ name: string; count: number }>();

  const filterWhere = buildWhere(filters);
  const channels = await bindAll(
    db.prepare(`
      SELECT channel AS name, SUM(count) AS count
      FROM analytics_v2_daily_core
      WHERE ${filterWhere.sql} AND metric = 'resolve_request'
      GROUP BY channel ORDER BY count DESC
    `),
    filterWhere.binds,
  ).all<{ name: string; count: number }>();

  const clients = await bindAll(
    db.prepare(`
      SELECT client_id AS name, SUM(count) AS count
      FROM analytics_v2_daily_core
      WHERE ${filterWhere.sql} AND metric = 'resolve_request'
      GROUP BY client_id ORDER BY count DESC
    `),
    filterWhere.binds,
  ).all<{ name: string; count: number }>();

  const platforms = await bindAll(
    db.prepare(`
      SELECT platform AS name, SUM(count) AS count
      FROM analytics_v2_daily_core
      WHERE ${filterWhere.sql} AND metric IN ('resolve_request', 'export', 'clipboard')
      GROUP BY platform ORDER BY count DESC
    `),
    filterWhere.binds,
  ).all<{ name: string; count: number }>();

  const envClauses = ['date >= ?', 'date <= ?'];
  const envBinds: unknown[] = [filters.from, filters.to];
  if (filters.channel) {
    envClauses.push('channel = ?');
    envBinds.push(filters.channel);
  }
  if (filters.client) {
    envClauses.push('client_id = ?');
    envBinds.push(filters.client);
  }
  const envWhere = envClauses.join(' AND ');
  const envRows = await bindAll(
    db.prepare(`
      SELECT device_class, browser_family, os_family, SUM(count) AS count
      FROM analytics_v2_client_env
      WHERE ${envWhere}
      GROUP BY device_class, browser_family, os_family
      ORDER BY count DESC
      LIMIT 100
    `),
    envBinds,
  ).all<{ device_class: string; browser_family: string; os_family: string; count: number }>();

  const envAggregate = (field: 'device_class' | 'browser_family' | 'os_family') => {
    const totals = new Map<string, number>();
    for (const row of envRows.results || []) {
      totals.set(row[field], (totals.get(row[field]) || 0) + Number(row.count || 0));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  };

  const exportFormats = breakdowns.export_format || [];
  const clipboardModes = breakdowns.clipboard_mode || [];
  const exportBreakdownTotal = exportFormats.reduce((sum, item) => sum + item.count, 0);
  const clipboardBreakdownTotal = clipboardModes.reduce((sum, item) => sum + item.count, 0);

  const invalidRows = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM analytics_v2_daily_core WHERE date = 'TOTAL' OR platform = 'all') +
      (SELECT COUNT(*) FROM analytics_v2_hourly_core WHERE date = 'TOTAL' OR platform = 'all') +
      (SELECT COUNT(*) FROM analytics_v2_geo WHERE date = 'TOTAL' OR platform = 'all') +
      (SELECT COUNT(*) FROM analytics_v2_breakdown WHERE date = 'TOTAL' OR platform = 'all') AS invalid_count
  `).all<{ invalid_count: number }>();
  const invalidCount = Number(invalidRows.results?.[0]?.invalid_count || 0);

  const latest = await db.prepare(`
    SELECT MAX(date) AS latest_date FROM analytics_v2_daily_core
  `).all<{ latest_date: string | null }>();

  const legacyRows = await bindAll(
    db.prepare(`
      SELECT
        SUM(CASE WHEN channel = 'legacy_mixed' THEN count ELSE 0 END) AS legacy_count,
        SUM(count) AS total_count
      FROM analytics_v2_daily_core
      WHERE ${filterWhere.sql} AND metric = 'resolve_request'
    `),
    filterWhere.binds,
  ).all<{ legacy_count: number | null; total_count: number | null }>();
  const legacyCount = Number(legacyRows.results?.[0]?.legacy_count || 0);
  const totalCount = Number(legacyRows.results?.[0]?.total_count || 0);

  const checks = [
    {
      id: 'resolve_invariant',
      ok: resolveRequest === resolveTerminal,
      expected: resolveRequest,
      actual: resolveTerminal,
      note: 'resolve_request must equal playlist_success + user_success + resolve_failure',
    },
    {
      id: 'export_breakdown',
      ok: geoActive || Number(overview.export || 0) === exportBreakdownTotal,
      expected: Number(overview.export || 0),
      actual: exportBreakdownTotal,
      note: geoActive ? 'Geo filtering intentionally does not correlate reliability/breakdown cubes.' : 'export must equal sum(export_format)',
    },
    {
      id: 'clipboard_breakdown',
      ok: geoActive || Number(overview.clipboard || 0) === clipboardBreakdownTotal,
      expected: Number(overview.clipboard || 0),
      actual: clipboardBreakdownTotal,
      note: geoActive ? 'Geo filtering intentionally does not correlate reliability/breakdown cubes.' : 'clipboard must equal sum(clipboard_mode)',
    },
    {
      id: 'forbidden_rollups',
      ok: invalidCount === 0,
      expected: 0,
      actual: invalidCount,
      note: 'V2 tables must never contain TOTAL/all rollups',
    },
  ];

  return {
    version: 2,
    filters,
    generatedAt: new Date().toISOString(),
    overview: {
      ...overview,
      success_rate: resolveRequest > 0
        ? Math.round(((Number(overview.playlist_success || 0) + Number(overview.user_success || 0)) / resolveRequest) * 10000) / 100
        : 0,
      active_clients: (clients.results || []).filter((r) => Number(r.count || 0) > 0).length,
    },
    timeseries: Array.from(dayMap.values()),
    breakdowns,
    environment: {
      devices: envAggregate('device_class'),
      browsers: envAggregate('browser_family'),
      operatingSystems: envAggregate('os_family'),
      filterScope: 'Environment supports date/channel/client filters. Platform and geography are intentionally separate privacy cubes.',
    },
    geo: {
      countries: (countryRows.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
      regions: (regionRows.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
      filterScope: 'Geography is intentionally stored in a separate privacy-preserving cube. Geo filters affect overview/timeseries/geo, not reliability breakdowns.',
    },
    availableFilters: {
      channels: (channels.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
      clients: (clients.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
      platforms: (platforms.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
      countries: (countryRows.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
      regions: (regionRows.results || []).map((r) => ({ name: r.name, count: Number(r.count || 0) })),
    },
    dataQuality: {
      status: checks.every((check) => check.ok) ? 'healthy' : 'error',
      checks,
      latestDate: latest.results?.[0]?.latest_date || null,
      legacyMixedShare: totalCount > 0 ? Math.round((legacyCount / totalCount) * 10000) / 100 : 0,
    },
  };
}
