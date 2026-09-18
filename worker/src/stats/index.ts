/**
 * Anonymous Product Statistics — Extended for Analytics Foundation
 * Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9
 * and docs/ROADMAP.md Section 2 (Analytics Foundation).
 *
 * STRICT PRIVACY RULES:
 * Never store playlist URLs, playlist IDs, track titles, artists, albums,
 * user identifiers, IP addresses, cookies, or exported files.
 * Only anonymous atomic counters are incremented.
 *
 * This module handles the PUBLIC stats contract (GET /api/stats).
 * Private dimensional data is handled by analytics/recorder.ts and is
 * NOT exposed through any unauthenticated public endpoint.
 */

import type {
  PublicStatsResponse,
  DailyTrendEntry,
  PlatformBreakdown,
  HourlyEntry,
  RollingHourlyEntry,
  GeoDistributionItem,
  ProvinceDistributionItem,
  ClientDistributionItem,
  ClientStats,
} from '../analytics/types';

/** Backward-compat re-export for existing imports */
export interface PlatformStat {
  total: number;
  today: number;
}

export interface AggregateStatsData {
  totalSuccessfulParses: number;
  todaySuccessfulParses: number;
  totalFailedParses: number;
  byPlatform: Record<string, PlatformStat>;
}

/** Project launch date — the official launch date of Playlist Out Web (2026-09-12). */
const LAUNCHED_AT = '2026-09-12';

/** Number of recent days to include in the daily trend response */
const RECENT_DAYS_COUNT = 30;

export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Records an anonymous parse event using atomic upserts.
 * Best-effort: failures never interrupt user workflow.
 *
 * BACKWARD COMPATIBILITY: This is the original recordParse signature.
 * The enriched version is in analytics/recorder.ts.
 */
export async function recordParse(
  db: D1Database | undefined,
  platform: string,
  success: boolean,
): Promise<void> {
  if (!db) {
    return;
  }

  const date = getUtcDateString();
  const metric = success ? 'parse_success' : 'parse_failure';

  const upsertSql = `
    INSERT INTO aggregate_stats (date, platform, metric, count)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT (date, platform, metric)
    DO UPDATE SET count = count + 1;
  `;

  try {
    const statements: D1PreparedStatement[] = [
      // Today's per-platform counter
      db.prepare(upsertSql).bind(date, platform, metric),
      // All-time per-platform counter
      db.prepare(upsertSql).bind('TOTAL', platform, metric),
    ];

    if (success) {
      // Global counters for all platforms combined
      statements.push(db.prepare(upsertSql).bind(date, 'all', metric));
      statements.push(db.prepare(upsertSql).bind('TOTAL', 'all', metric));
    }

    await db.batch(statements);
  } catch (err: unknown) {
    // Best-effort guarantee: do not throw or fail the parse request
    console.error('Failed to record anonymous aggregate stats:', err);
  }
}

/**
 * Retrieves aggregate product stats in the LEGACY format.
 * Used internally by backward-compatible code paths.
 * Returns zeroed structure if DB is unavailable.
 */
export async function getAggregateStats(db: D1Database | undefined): Promise<AggregateStatsData> {
  const defaultStats: AggregateStatsData = {
    totalSuccessfulParses: 0,
    todaySuccessfulParses: 0,
    totalFailedParses: 0,
    byPlatform: {},
  };

  if (!db) {
    return defaultStats;
  }

  const today = getUtcDateString();

  try {
    const rows = await db
      .prepare('SELECT date, platform, metric, count FROM aggregate_stats WHERE date IN (?1, ?2)')
      .bind(today, 'TOTAL')
      .all<{ date: string; platform: string; metric: string; count: number }>();

    if (!rows.results || rows.results.length === 0) {
      return defaultStats;
    }

    let totalSuccess = 0;
    let todaySuccess = 0;
    let totalFailure = 0;
    const byPlatform: Record<string, PlatformStat> = {};

    for (const row of rows.results) {
      const { date, platform, metric, count } = row;

      if (metric === 'parse_success') {
        if (platform === 'all' || (platform === 'qqmusic' && totalSuccess === 0)) {
          if (date === 'TOTAL') totalSuccess = count;
          if (date === today) todaySuccess = count;
        }

        if (platform !== 'all') {
          if (!byPlatform[platform]) {
            byPlatform[platform] = { total: 0, today: 0 };
          }
          if (date === 'TOTAL') byPlatform[platform].total = count;
          if (date === today) byPlatform[platform].today = count;
        }
      } else if (metric === 'parse_failure') {
        if (date === 'TOTAL') {
          totalFailure += count;
        }
      }
    }

    return {
      totalSuccessfulParses: totalSuccess,
      todaySuccessfulParses: todaySuccess,
      totalFailedParses: totalFailure,
      byPlatform,
    };
  } catch (err: unknown) {
    console.error('Failed to fetch aggregate stats:', err);
    return defaultStats;
  }
}

/**
 * Retrieves the enriched PUBLIC stats response (Analytics Foundation).
 * Includes track counts, export counts, per-platform breakdown, daily trends,
 * hourly distribution, geographic distribution, client/browser/OS breakdown,
 * referrer sources, input types, latency and error categories.
 *
 * PRIVACY: All data is strictly coarse-grained anonymous aggregate counters.
 * No raw IPs, identifiers, playlist content, or per-request rows are ever stored or exposed.
 */
export async function getPublicStats(db: D1Database | undefined): Promise<PublicStatsResponse> {
  const defaultResponse: PublicStatsResponse = {
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
    exportFormatsBreakdown: { txt: 0, csv: 0, xlsx: 0, json: 0 },
    byPlatform: {
      qqmusic: { totalSuccess: 0, todaySuccess: 0 },
      netease: { totalSuccess: 0, todaySuccess: 0 },
    },
    recentDays: [],
    generatedAt: new Date().toISOString(),
    todayHourlyPageViews: [],
    last24HourlyPageViews: [],
    topGeo: [],
    chinaProvinces: [],
    clientStats: { browsers: [], devices: [], os: [], deviceBrands: [] },
    clipboardFormatsBreakdown: {},
    referrerDistribution: [],
    inputTypeDistribution: [],
    latencyDistribution: [],
    errorCategoryDistribution: [],
  };


  if (!db) {
    return defaultResponse;
  }

  const today = getUtcDateString();

  try {
    // 1. Fetch total + today aggregate_stats rows
    const statsRows = await db
      .prepare('SELECT date, platform, metric, count FROM aggregate_stats WHERE date IN (?1, ?2)')
      .bind(today, 'TOTAL')
      .all<{ date: string; platform: string; metric: string; count: number }>();

    let totalParses = 0;
    let todayParses = 0;
    let totalTracks = 0;
    let todayTracks = 0;
    let totalExports = 0;
    let todayExports = 0;
    let cumulativeDailyVisitors = 0;
    let visitorsToday = 0;
    let totalPageViews = 0;
    let pageViewsToday = 0;
    const byPlatform: Record<string, PlatformBreakdown> = {
      qqmusic: { totalSuccess: 0, todaySuccess: 0 },
      netease: { totalSuccess: 0, todaySuccess: 0 },
    };

    if (statsRows.results) {
      for (const row of statsRows.results) {
        const { date, platform, metric, count } = row;

        if (metric === 'parse_success') {
          if (platform === 'all' || (!byPlatform[platform] && platform !== 'all')) {
            if (date === 'TOTAL' && platform === 'all') totalParses = count;
            if (date === today && platform === 'all') todayParses = count;
          }

          if (platform !== 'all') {
            if (!byPlatform[platform]) {
              byPlatform[platform] = { totalSuccess: 0 };
            }
            if (date === 'TOTAL') byPlatform[platform].totalSuccess = count;
            if (date === today) byPlatform[platform].todaySuccess = count;
          }
        } else if (metric === 'tracks_processed') {
          if (platform === 'all') {
            if (date === 'TOTAL') totalTracks = count;
            if (date === today) todayTracks = count;
          }
        } else if (metric === 'exports_total') {
          if (platform === 'all') {
            if (date === 'TOTAL') totalExports = count;
            if (date === today) todayExports = count;
          }
        } else if (metric === 'visitor_unique') {
          if (date === 'TOTAL') cumulativeDailyVisitors = count;
          if (date === today) visitorsToday = count;
        } else if (metric === 'page_view') {
          if (date === 'TOTAL') totalPageViews = count;
          if (date === today) pageViewsToday = count;
        }
      }
    }

    // Ensure all supported platforms exist in byPlatform with true counts (0 is 0)
    if (!byPlatform.qqmusic) {
      byPlatform.qqmusic = { totalSuccess: 0, todaySuccess: 0 };
    }
    if (!byPlatform.netease) {
      byPlatform.netease = { totalSuccess: 0, todaySuccess: 0 };
    }
    if (!byPlatform.kugou) {
      byPlatform.kugou = { totalSuccess: 0, todaySuccess: 0 };
    }

    // If 'all' platform not yet recorded (before analytics_foundation was deployed),
    // fall back to per-platform totals
    if (totalParses === 0 && Object.keys(byPlatform).length > 0) {
      for (const bp of Object.values(byPlatform)) {
        totalParses += bp.totalSuccess;
        todayParses += bp.todaySuccess ?? 0;
      }
    }

    // 2. Fetch export format breakdown
    const exportFormatsBreakdown: Record<string, number> = { txt: 0, csv: 0, xlsx: 0, json: 0 };
    try {
      const formatRows = await db
        .prepare(`
          SELECT export_format, SUM(count) as total
          FROM daily_export_stats
          WHERE date != 'TOTAL' AND export_format IN ('txt', 'csv', 'xlsx', 'json')
          GROUP BY export_format
        `)
        .all<{ export_format: string; total: number }>();

      if (formatRows.results) {
        for (const r of formatRows.results) {
          exportFormatsBreakdown[r.export_format] = r.total;
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch export format breakdown:', err);
    }

    // 3. Fetch recent daily trends (extended with clipboards, visitors, failures)
    const recentDays: DailyTrendEntry[] = [];
    try {
      const trendRows = await db
        .prepare(`
          SELECT date, metric, SUM(count) as total
          FROM aggregate_stats
          WHERE platform = 'all' AND date != 'TOTAL'
          AND date >= ?1
          GROUP BY date, metric
          ORDER BY date DESC
        `)
        .bind(getDateNDaysAgo(RECENT_DAYS_COUNT))
        .all<{ date: string; metric: string; total: number }>();

      if (trendRows.results && trendRows.results.length > 0) {
        const dayMap = new Map<string, DailyTrendEntry>();
        for (const row of trendRows.results) {
          if (!dayMap.has(row.date)) {
            dayMap.set(row.date, { date: row.date, parses: 0, tracks: 0, exports: 0, clipboards: 0, visitors: 0, failures: 0 });
          }
          const entry = dayMap.get(row.date)!;
          if (row.metric === 'parse_success') entry.parses = row.total;
          if (row.metric === 'tracks_processed') entry.tracks = row.total;
          if (row.metric === 'exports_total') entry.exports = row.total;
          if (row.metric === 'clipboards_total') entry.clipboards = row.total;
          if (row.metric === 'visitor_unique') entry.visitors = row.total;
          if (row.metric === 'parse_failure') entry.failures = row.total;
        }

        // Also fetch from daily_export_stats for exports if not in aggregate_stats
        const exportTrendRows = await db
          .prepare(`
            SELECT date, SUM(count) as total
            FROM daily_export_stats
            WHERE date != 'TOTAL' AND date >= ?1
            GROUP BY date
            ORDER BY date DESC
          `)
          .bind(getDateNDaysAgo(RECENT_DAYS_COUNT))
          .all<{ date: string; total: number }>();

        if (exportTrendRows.results) {
          for (const row of exportTrendRows.results) {
            if (!dayMap.has(row.date)) {
              dayMap.set(row.date, { date: row.date, parses: 0, tracks: 0, exports: 0, clipboards: 0, visitors: 0, failures: 0 });
            }
            const entry = dayMap.get(row.date)!;
            if (row.total > entry.exports) entry.exports = row.total;
          }
        }

        // Also fetch clipboard totals from daily_clipboard_stats for trend
        const clipboardTrendRows = await db
          .prepare(`
            SELECT date, SUM(count) as total
            FROM daily_clipboard_stats
            WHERE date != 'TOTAL' AND date >= ?1
            GROUP BY date
            ORDER BY date DESC
          `)
          .bind(getDateNDaysAgo(RECENT_DAYS_COUNT))
          .all<{ date: string; total: number }>();

        if (clipboardTrendRows.results) {
          for (const row of clipboardTrendRows.results) {
            if (!dayMap.has(row.date)) {
              dayMap.set(row.date, { date: row.date, parses: 0, tracks: 0, exports: 0, clipboards: 0, visitors: 0, failures: 0 });
            }
            const entry = dayMap.get(row.date)!;
            if (row.total > entry.clipboards) entry.clipboards = row.total;
          }
        }

        recentDays.push(...Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)));
      }
    } catch (err: unknown) {
      console.error('Failed to fetch daily trend data:', err);
    }

    // 4a. Legacy UTC-calendar-day hourly distribution (kept for API compatibility).
    const todayHourlyPageViews: HourlyEntry[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, pageViews: 0, visitors: 0 }));
    try {
      const hourlyRows = await db
        .prepare(`
          SELECT hour, metric, SUM(count) as total
          FROM hourly_stats
          WHERE date = ?1 AND platform = 'all' AND metric IN ('page_view', 'visitor_unique')
          GROUP BY hour, metric
        `)
        .bind(today)
        .all<{ hour: number; metric: string; total: number }>();

      if (hourlyRows.results) {
        for (const row of hourlyRows.results) {
          const slot = todayHourlyPageViews[row.hour];
          if (slot) {
            if (row.metric === 'page_view') slot.pageViews = row.total;
            if (row.metric === 'visitor_unique') slot.visitors = row.total;
          }
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch UTC-day hourly stats:', err);
    }

    // 4b. True rolling last-24-hours window.
    // Storage remains UTC; timestamps make timezone conversion a pure presentation concern.
    const last24HourlyPageViews: RollingHourlyEntry[] = [];
    try {
      const currentHourUtc = new Date();
      currentHourUtc.setUTCMinutes(0, 0, 0);
      const startHourUtc = new Date(currentHourUtc.getTime() - 23 * 60 * 60 * 1000);
      const startDate = getUtcDateString(startHourUtc);
      const endDate = getUtcDateString(currentHourUtc);

      const rollingRows = await db
        .prepare(`
          SELECT date, hour, metric, SUM(count) as total
          FROM hourly_stats
          WHERE date IN (?1, ?2)
            AND platform = 'all'
            AND metric IN ('page_view', 'visitor_unique')
          GROUP BY date, hour, metric
        `)
        .bind(startDate, endDate)
        .all<{ date: string; hour: number; metric: string; total: number }>();

      const rollingMap = new Map<string, { pageViews: number; visitors: number }>();
      if (rollingRows.results) {
        for (const row of rollingRows.results) {
          const key = `${row.date}:${Number(row.hour)}`;
          const slot = rollingMap.get(key) ?? { pageViews: 0, visitors: 0 };
          if (row.metric === 'page_view') slot.pageViews = row.total;
          if (row.metric === 'visitor_unique') slot.visitors = row.total;
          rollingMap.set(key, slot);
        }
      }

      for (let i = 0; i < 24; i += 1) {
        const bucketTime = new Date(startHourUtc.getTime() + i * 60 * 60 * 1000);
        const key = `${getUtcDateString(bucketTime)}:${bucketTime.getUTCHours()}`;
        const values = rollingMap.get(key) ?? { pageViews: 0, visitors: 0 };
        last24HourlyPageViews.push({
          timestamp: bucketTime.toISOString(),
          pageViews: values.pageViews,
          visitors: values.visitors,
        });
      }
    } catch (err: unknown) {
      console.error('Failed to fetch rolling 24-hour stats:', err);
    }
    // 5. Geographic distribution — TOP 10 countries + China province breakdown
    const topGeo: GeoDistributionItem[] = [];
    const chinaProvinces: ProvinceDistributionItem[] = [];
    try {
      // R3: Denominator is all known geographic visit records (full population), not just Top 10 sum.
      const geoTotalRow = await db
        .prepare(`
          SELECT SUM(count) as total
          FROM daily_geo_stats
          WHERE date = 'TOTAL' AND platform = 'all' AND country != 'UNKNOWN'
        `)
        .all<{ total: number | null }>();
      const geoTotal = geoTotalRow.results?.[0]?.total || 0;

      const geoRows = await db
        .prepare(`
          SELECT country, SUM(count) as total
          FROM daily_geo_stats
          WHERE date = 'TOTAL' AND platform = 'all' AND country != 'UNKNOWN'
          GROUP BY country
          ORDER BY total DESC
          LIMIT 10
        `)
        .all<{ country: string; total: number }>();

      if (geoRows.results && geoRows.results.length > 0 && geoTotal > 0) {
        for (const r of geoRows.results) {
          topGeo.push({
            country: r.country,
            count: r.total,
            percentage: Math.round((r.total / geoTotal) * 100),
          });
        }
      }

      // China province distribution — Denominator is all known CN regions, not just Top 10 sum.
      const cnTotalRow = await db
        .prepare(`
          SELECT SUM(count) as total
          FROM daily_geo_stats
          WHERE date = 'TOTAL' AND platform = 'all' AND country = 'CN' AND region != 'UNKNOWN'
        `)
        .all<{ total: number | null }>();
      const cnTotal = cnTotalRow.results?.[0]?.total || 0;

      const cnRows = await db
        .prepare(`
          SELECT region, SUM(count) as total
          FROM daily_geo_stats
          WHERE date = 'TOTAL' AND platform = 'all' AND country = 'CN' AND region != 'UNKNOWN'
          GROUP BY region
          ORDER BY total DESC
          LIMIT 10
        `)
        .all<{ region: string; total: number }>();

      if (cnRows.results && cnRows.results.length > 0 && cnTotal > 0) {
        for (const r of cnRows.results) {
          chinaProvinces.push({
            province: r.region,
            count: r.total,
            percentage: Math.round((r.total / cnTotal) * 100),
          });
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch geo distribution:', err);
    }

    // 6. Client stats — device / browser / OS distribution
    const clientStats: ClientStats = { browsers: [], devices: [], os: [] };
    try {
      const clientRows = await db
        .prepare(`
          SELECT device_class, browser_family, os_family, SUM(count) as total
          FROM daily_client_stats
          WHERE date = 'TOTAL' AND platform = 'all'
          GROUP BY device_class, browser_family, os_family
        `)
        .all<{ device_class: string; browser_family: string; os_family: string; total: number }>();

      if (clientRows.results && clientRows.results.length > 0) {
        const deviceMap = new Map<string, number>();
        const browserMap = new Map<string, number>();
        const osMap = new Map<string, number>();

        for (const r of clientRows.results) {
          deviceMap.set(r.device_class, (deviceMap.get(r.device_class) ?? 0) + r.total);
          browserMap.set(r.browser_family, (browserMap.get(r.browser_family) ?? 0) + r.total);
          osMap.set(r.os_family, (osMap.get(r.os_family) ?? 0) + r.total);
        }

        const toDistribution = (map: Map<string, number>): ClientDistributionItem[] => {
          const grandTotal = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
          return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, percentage: Math.round((count / grandTotal) * 100) }));
        };

        clientStats.devices = toDistribution(deviceMap);
        clientStats.browsers = toDistribution(browserMap);
        clientStats.os = toDistribution(osMap);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch client stats:', err);
    }

    // 7. Clipboard format breakdown (total across all platforms)
    const clipboardFormatsBreakdown: Record<string, number> = {};
    try {
      const cbRows = await db
        .prepare(`
          SELECT clipboard_mode, SUM(count) as total
          FROM daily_clipboard_stats
          WHERE date != 'TOTAL'
          GROUP BY clipboard_mode
        `)
        .all<{ clipboard_mode: string; total: number }>();

      if (cbRows.results) {
        for (const r of cbRows.results) {
          clipboardFormatsBreakdown[r.clipboard_mode] = r.total;
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch clipboard format breakdown:', err);
    }

    // 8. Performance dimensions — referrer, input_type, latency_bucket, error_category
    // (Aggregated across all platforms where date != 'TOTAL' to include per-platform daily counters)
    const referrerDistribution: ClientDistributionItem[] = [];
    const inputTypeDistribution: ClientDistributionItem[] = [];
    const latencyDistribution: ClientDistributionItem[] = [];
    const errorCategoryDistribution: ClientDistributionItem[] = [];
    try {
      const perfRows = await db
        .prepare(`
          SELECT dimension, value, SUM(count) as total
          FROM daily_performance_stats
          WHERE date != 'TOTAL'
          AND dimension IN ('referrer_source', 'input_type', 'latency_bucket', 'error_category', 'device_brand')
          GROUP BY dimension, value
          ORDER BY dimension, total DESC
        `)
        .all<{ dimension: string; value: string; total: number }>();

      if (perfRows.results && perfRows.results.length > 0) {
        const dimMap = new Map<string, Array<{ value: string; total: number }>>();
        for (const r of perfRows.results) {
          if (!dimMap.has(r.dimension)) dimMap.set(r.dimension, []);
          dimMap.get(r.dimension)!.push({ value: r.value, total: r.total });
        }

        const toDistributionFromDim = (items: Array<{ value: string; total: number }>): ClientDistributionItem[] => {
          const grandTotal = items.reduce((s, i) => s + i.total, 0) || 1;
          return items.map(i => ({ name: i.value, count: i.total, percentage: Math.round((i.total / grandTotal) * 100) }));
        };

        const referrerItems = dimMap.get('referrer_source');
        if (referrerItems) referrerDistribution.push(...toDistributionFromDim(referrerItems));

        const inputItems = dimMap.get('input_type');
        if (inputItems) inputTypeDistribution.push(...toDistributionFromDim(inputItems));

        const latencyItems = dimMap.get('latency_bucket');
        if (latencyItems) latencyDistribution.push(...toDistributionFromDim(latencyItems));

        const errorItems = dimMap.get('error_category');
        if (errorItems) errorCategoryDistribution.push(...toDistributionFromDim(errorItems));

        const brandItems = dimMap.get('device_brand');
        if (brandItems) clientStats.deviceBrands = toDistributionFromDim(brandItems);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch performance dimension stats:', err);
    }


    return {
      launchedAt: LAUNCHED_AT,
      cumulativeDailyVisitors,
      totalVisitors: cumulativeDailyVisitors,
      visitorsToday,
      totalPageViews,
      pageViewsToday,
      totalPlaylistsParsed: totalParses,
      playlistsParsedToday: todayParses,
      totalTracksProcessed: totalTracks,
      tracksProcessedToday: todayTracks,
      totalExports: totalExports,
      exportsToday: todayExports,
      exportFormatsBreakdown,
      byPlatform,
      recentDays,
      generatedAt: new Date().toISOString(),
      // ── 新增维度数据 ──
      todayHourlyPageViews,
      last24HourlyPageViews,
      topGeo,
      chinaProvinces,
      clientStats,
      clipboardFormatsBreakdown,
      referrerDistribution,
      inputTypeDistribution,
      latencyDistribution,
      errorCategoryDistribution,
    };
  } catch (err: unknown) {
    console.error('Failed to fetch public stats:', err);
    return defaultResponse;
  }
}

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return getUtcDateString(d);
}
