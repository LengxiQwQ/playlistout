import type {
  PublicStatsResponse,
  PublicDailyTrendEntry,
  PlatformBreakdown,
} from '../analytics/types';

const LAUNCHED_AT = '2026-09-12';
const PUBLIC_PLATFORMS = ['qqmusic', 'netease', 'kugou', 'qishui'] as const;
const EXPORT_FORMATS = ['txt', 'csv', 'xlsx', 'json', 'm3u8'] as const;

interface BaselineRow {
  key: string;
  baseline_date: string;
  legacy_total: number;
  v2_total: number;
  legacy_day: number;
  v2_day: number;
}

interface MetricRow {
  metric: string;
  platform: string;
  total: number;
  today: number;
}

function utcDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return utcDate(d);
}

function emptyPublicStats(): PublicStatsResponse {
  return {
    launchedAt: LAUNCHED_AT,
    cumulativeDailyVisitors: 0,
    totalVisitors: 0,
    visitorsToday: 0,
    totalPageViews: 0,
    pageViewsToday: 0,
    totalPlaylistsParsed: 0,
    playlistsParsedToday: 0,
    totalTracksProcessed: 0,
    tracksProcessedToday: 0,
    totalExports: 0,
    exportsToday: 0,
    exportFormatsBreakdown: { txt: 0, csv: 0, xlsx: 0, json: 0, m3u8: 0 },
    byPlatform: {
      qqmusic: { totalSuccess: 0, todaySuccess: 0 },
      netease: { totalSuccess: 0, todaySuccess: 0 },
      kugou: { totalSuccess: 0, todaySuccess: 0 },
      qishui: { totalSuccess: 0, todaySuccess: 0 },
    },
    recentDays: [],
    generatedAt: new Date().toISOString(),
  };
}

function bridgedValue(
  baseline: BaselineRow,
  currentV2Total: number,
  currentV2ForDate: number,
  requestedDate: string,
): { total: number; day: number } {
  const totalDelta = currentV2Total - Number(baseline.v2_total || 0);
  if (totalDelta < 0) {
    throw new Error(`Analytics V2 counter regressed for ${baseline.key}`);
  }

  let day: number;
  if (requestedDate === baseline.baseline_date) {
    const dayDelta = currentV2ForDate - Number(baseline.v2_day || 0);
    if (dayDelta < 0) {
      throw new Error(`Analytics V2 daily counter regressed for ${baseline.key}`);
    }
    day = Number(baseline.legacy_day || 0) + dayDelta;
  } else {
    day = currentV2ForDate;
  }

  return {
    total: Number(baseline.legacy_total || 0) + totalDelta,
    day,
  };
}

export async function getPublicStatsV2Cutover(
  db: D1Database | undefined,
): Promise<PublicStatsResponse | null> {
  if (!db) return emptyPublicStats();

  const state = await db.prepare(`
    SELECT status, baseline_date
    FROM analytics_v2_cutover_state
    WHERE id = 1
  `).first<{ status: string; baseline_date: string }>();

  if (!state || state.status !== 'frozen' || !state.baseline_date) {
    return null;
  }

  const baselineResult = await db.prepare(`
    SELECT key, baseline_date, legacy_total, v2_total, legacy_day, v2_day
    FROM analytics_v2_public_baseline
  `).all<BaselineRow>();
  const baselines = new Map<string, BaselineRow>(
    (baselineResult.results || []).map((row) => [row.key, row]),
  );

  const requiredKeys = [
    'metric:page_view',
    'metric:visitor_unique',
    'metric:playlist_success',
    'metric:tracks_processed',
    'metric:export',
    ...PUBLIC_PLATFORMS.map((p) => `platform_success:${p}`),
    ...EXPORT_FORMATS.map((f) => `export_format:${f}`),
  ];
  for (const key of requiredKeys) {
    if (!baselines.has(key)) {
      throw new Error(`Missing Analytics V2 public baseline: ${key}`);
    }
  }

  const today = utcDate();

  const metricResult = await db.prepare(`
    SELECT
      metric,
      platform,
      SUM(count) AS total,
      SUM(CASE WHEN date = ?1 THEN count ELSE 0 END) AS today
    FROM analytics_v2_daily_core
    WHERE metric IN ('page_view','visitor_unique','playlist_success','tracks_processed','export')
    GROUP BY metric, platform
  `).bind(today).all<MetricRow>();

  const metricRows = metricResult.results || [];
  const sumMetric = (metric: string, dateField: 'total' | 'today'): number =>
    metricRows
      .filter((row) => row.metric === metric)
      .reduce((sum, row) => sum + Number(row[dateField] || 0), 0);

  const platformMetric = (platform: string, dateField: 'total' | 'today'): number =>
    metricRows
      .filter((row) => row.metric === 'playlist_success' && row.platform === platform)
      .reduce((sum, row) => sum + Number(row[dateField] || 0), 0);

  const baselineDateResult = await db.prepare(`
    SELECT metric, platform, SUM(count) AS count
    FROM analytics_v2_daily_core
    WHERE date = ?1
      AND metric IN ('page_view','visitor_unique','playlist_success','tracks_processed','export')
    GROUP BY metric, platform
  `).bind(state.baseline_date).all<{ metric: string; platform: string; count: number }>();
  const baselineDateRows = baselineDateResult.results || [];
  const baselineDateMetric = (metric: string): number =>
    baselineDateRows
      .filter((row) => row.metric === metric)
      .reduce((sum, row) => sum + Number(row.count || 0), 0);
  const baselineDatePlatform = (platform: string): number =>
    baselineDateRows
      .filter((row) => row.metric === 'playlist_success' && row.platform === platform)
      .reduce((sum, row) => sum + Number(row.count || 0), 0);

  const pageView = bridgedValue(
    baselines.get('metric:page_view')!,
    sumMetric('page_view', 'total'),
    today === state.baseline_date ? baselineDateMetric('page_view') : sumMetric('page_view', 'today'),
    today,
  );
  const visitors = bridgedValue(
    baselines.get('metric:visitor_unique')!,
    sumMetric('visitor_unique', 'total'),
    today === state.baseline_date ? baselineDateMetric('visitor_unique') : sumMetric('visitor_unique', 'today'),
    today,
  );
  const parses = bridgedValue(
    baselines.get('metric:playlist_success')!,
    sumMetric('playlist_success', 'total'),
    today === state.baseline_date ? baselineDateMetric('playlist_success') : sumMetric('playlist_success', 'today'),
    today,
  );
  const tracks = bridgedValue(
    baselines.get('metric:tracks_processed')!,
    sumMetric('tracks_processed', 'total'),
    today === state.baseline_date ? baselineDateMetric('tracks_processed') : sumMetric('tracks_processed', 'today'),
    today,
  );
  const exports = bridgedValue(
    baselines.get('metric:export')!,
    sumMetric('export', 'total'),
    today === state.baseline_date ? baselineDateMetric('export') : sumMetric('export', 'today'),
    today,
  );

  const byPlatform: Record<string, PlatformBreakdown> = {};
  for (const platform of PUBLIC_PLATFORMS) {
    const bridged = bridgedValue(
      baselines.get(`platform_success:${platform}`)!,
      platformMetric(platform, 'total'),
      today === state.baseline_date
        ? baselineDatePlatform(platform)
        : platformMetric(platform, 'today'),
      today,
    );
    byPlatform[platform] = {
      totalSuccess: bridged.total,
      todaySuccess: bridged.day,
    };
  }

  const formatResult = await db.prepare(`
    SELECT
      value,
      SUM(count) AS total,
      SUM(CASE WHEN date = ?1 THEN count ELSE 0 END) AS today,
      SUM(CASE WHEN date = ?2 THEN count ELSE 0 END) AS baseline_day
    FROM analytics_v2_breakdown
    WHERE dimension = 'export_format'
      AND value IN ('txt','csv','xlsx','json','m3u8')
    GROUP BY value
  `).bind(today, state.baseline_date)
    .all<{ value: string; total: number; today: number; baseline_day: number }>();
  const formatMap = new Map((formatResult.results || []).map((row) => [row.value, row]));
  const exportFormatsBreakdown: Record<string, number> = {};
  for (const format of EXPORT_FORMATS) {
    const row = formatMap.get(format);
    const bridged = bridgedValue(
      baselines.get(`export_format:${format}`)!,
      Number(row?.total || 0),
      today === state.baseline_date ? Number(row?.baseline_day || 0) : Number(row?.today || 0),
      today,
    );
    exportFormatsBreakdown[format] = bridged.total;
  }

  const recentStart = dateDaysAgo(30);
  const legacyTrend = await db.prepare(`
    SELECT date, parses, tracks, exports
    FROM analytics_v2_public_history
    WHERE date >= ?1
      AND date < ?2
    ORDER BY date ASC
  `).bind(recentStart, state.baseline_date)
    .all<{ date: string; parses: number; tracks: number; exports: number }>();

  const v2Trend = await db.prepare(`
    SELECT date, metric, SUM(count) AS total
    FROM analytics_v2_daily_core
    WHERE date >= ?1
      AND metric IN ('playlist_success','tracks_processed','export')
    GROUP BY date, metric
  `).bind(state.baseline_date)
    .all<{ date: string; metric: string; total: number }>();

  const dayMap = new Map<string, PublicDailyTrendEntry>();
  const ensureDay = (date: string) => {
    if (!dayMap.has(date)) {
      dayMap.set(date, { date, parses: 0, tracks: 0, exports: 0 });
    }
    return dayMap.get(date)!;
  };

  for (const row of legacyTrend.results || []) {
    const entry = ensureDay(row.date);
    entry.parses = Number(row.parses || 0);
    entry.tracks = Number(row.tracks || 0);
    entry.exports = Number(row.exports || 0);
  }

  const v2ByDate = new Map<string, Record<string, number>>();
  for (const row of v2Trend.results || []) {
    if (!v2ByDate.has(row.date)) v2ByDate.set(row.date, {});
    v2ByDate.get(row.date)![row.metric] = Number(row.total || 0);
  }

  for (const [date, metrics] of v2ByDate) {
    const entry = ensureDay(date);
    if (date === state.baseline_date) {
      entry.parses = bridgedValue(
        baselines.get('metric:playlist_success')!,
        sumMetric('playlist_success', 'total'),
        metrics.playlist_success || 0,
        state.baseline_date,
      ).day;
      entry.tracks = bridgedValue(
        baselines.get('metric:tracks_processed')!,
        sumMetric('tracks_processed', 'total'),
        metrics.tracks_processed || 0,
        state.baseline_date,
      ).day;
      entry.exports = bridgedValue(
        baselines.get('metric:export')!,
        sumMetric('export', 'total'),
        metrics.export || 0,
        state.baseline_date,
      ).day;
    } else {
      entry.parses = metrics.playlist_success || 0;
      entry.tracks = metrics.tracks_processed || 0;
      entry.exports = metrics.export || 0;
    }
  }

  return {
    launchedAt: LAUNCHED_AT,
    cumulativeDailyVisitors: visitors.total,
    totalVisitors: visitors.total,
    visitorsToday: visitors.day,
    totalPageViews: pageView.total,
    pageViewsToday: pageView.day,
    totalPlaylistsParsed: parses.total,
    playlistsParsedToday: parses.day,
    totalTracksProcessed: tracks.total,
    tracksProcessedToday: tracks.day,
    totalExports: exports.total,
    exportsToday: exports.day,
    exportFormatsBreakdown: {
      txt: exportFormatsBreakdown.txt || 0,
      csv: exportFormatsBreakdown.csv || 0,
      xlsx: exportFormatsBreakdown.xlsx || 0,
      json: exportFormatsBreakdown.json || 0,
      m3u8: exportFormatsBreakdown.m3u8 || 0,
    },
    byPlatform,
    recentDays: Array.from(dayMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30),
    generatedAt: new Date().toISOString(),
  };
}
