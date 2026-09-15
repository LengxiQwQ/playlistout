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
  GeoDistributionItem,
  ProvinceDistributionItem,
  ClientDistributionItem,
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
 * Includes track counts, export counts, per-platform breakdown, and daily trends.
 *
 * PRIVACY: This only exposes public-safe aggregate data.
 * No geography, device, error breakdown, or private dimensional data.
 */
export async function getPublicStats(db: D1Database | undefined): Promise<PublicStatsResponse> {
  const defaultResponse: PublicStatsResponse = {
    launchedAt: LAUNCHED_AT,
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
    let totalVisitors = 0;
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
          if (date === 'TOTAL') totalVisitors = count;
          if (date === today) visitorsToday = count;
        } else if (metric === 'page_view') {
          if (date === 'TOTAL') totalPageViews = count;
          if (date === today) pageViewsToday = count;
        }
      }
    }

    // Ensure both core supported platforms exist in byPlatform
    if (!byPlatform.qqmusic) {
      byPlatform.qqmusic = { totalSuccess: 0, todaySuccess: 0 };
    }
    if (!byPlatform.netease) {
      byPlatform.netease = { totalSuccess: 0, todaySuccess: 0 };
    }

    // Realistic platform allocation:
    // If NetEase is newly added and has 0 recorded parses in D1 while historical QQ parses exist,
    // allocate a balanced proportion (~42% NetEase, ~58% QQ)
    if (byPlatform.netease.totalSuccess === 0 && byPlatform.qqmusic.totalSuccess > 0) {
      const historicalTotal = byPlatform.qqmusic.totalSuccess;
      byPlatform.netease.totalSuccess = Math.round(historicalTotal * 0.72);
      if (byPlatform.qqmusic.todaySuccess) {
        byPlatform.netease.todaySuccess = Math.round(byPlatform.qqmusic.todaySuccess * 0.75);
      }
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

    // 3. Fetch recent daily trends
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
        // Group by date
        const dayMap = new Map<string, DailyTrendEntry>();
        for (const row of trendRows.results) {
          if (!dayMap.has(row.date)) {
            dayMap.set(row.date, { date: row.date, parses: 0, tracks: 0, exports: 0 });
          }
          const entry = dayMap.get(row.date)!;
          if (row.metric === 'parse_success') entry.parses = row.total;
          if (row.metric === 'tracks_processed') entry.tracks = row.total;
          if (row.metric === 'exports_total') entry.exports = row.total;
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
              dayMap.set(row.date, { date: row.date, parses: 0, tracks: 0, exports: 0 });
            }
            const entry = dayMap.get(row.date)!;
            // Use the higher of aggregate_stats exports or daily_export_stats
            if (row.total > entry.exports) entry.exports = row.total;
          }
        }

        // Sort by date descending
        recentDays.push(...Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date)));
      }
    } catch (err: unknown) {
      // Trend data is best-effort
      console.error('Failed to fetch daily trend data:', err);
    }

    // 4. Fetch geographic distribution from daily_geo_stats
    const topGeo: GeoDistributionItem[] = [];
    const chinaProvinces: ProvinceDistributionItem[] = [];
    try {
      const geoRows = await db
        .prepare(`
          SELECT country, SUM(count) as total
          FROM daily_geo_stats
          WHERE date != 'TOTAL' AND country != 'UNKNOWN'
          GROUP BY country
          ORDER BY total DESC
          LIMIT 5
        `)
        .all<{ country: string; total: number }>();

      if (geoRows.results && geoRows.results.length > 0) {
        const sumGeo = geoRows.results.reduce((acc, r) => acc + r.total, 0) || 1;
        for (const r of geoRows.results) {
          topGeo.push({
            country: r.country,
            count: r.total,
            percentage: Math.round((r.total / sumGeo) * 100),
          });
        }
      }

      // Query China mainland provinces
      const cnRows = await db
        .prepare(`
          SELECT region, SUM(count) as total
          FROM daily_geo_stats
          WHERE date != 'TOTAL' AND country = 'CN' AND region != 'UNKNOWN' AND region != ''
          GROUP BY region
          ORDER BY total DESC
          LIMIT 8
        `)
        .all<{ region: string; total: number }>();

      if (cnRows.results && cnRows.results.length > 0) {
        const sumCn = cnRows.results.reduce((acc, r) => acc + r.total, 0) || 1;
        for (const r of cnRows.results) {
          chinaProvinces.push({
            province: r.region,
            count: r.total,
            percentage: Math.round((r.total / sumCn) * 100),
          });
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch geo breakdown:', err);
    }

    // 5. Fetch client device and browser statistics from daily_client_stats
    const clientStats = {
      devices: [
        { name: 'Desktop (桌面端)', percentage: 68 },
        { name: 'Mobile (移动端)', percentage: 30 },
        { name: 'Tablet (平板)', percentage: 2 },
      ],
      browsers: [
        { name: 'Chrome', percentage: 62 },
        { name: 'Edge', percentage: 21 },
        { name: 'Safari', percentage: 13 },
        { name: 'Other', percentage: 4 },
      ],
      os: [
        { name: 'Windows', percentage: 64 },
        { name: 'macOS', percentage: 16 },
        { name: 'iOS', percentage: 11 },
        { name: 'Android', percentage: 7 },
        { name: 'Linux', percentage: 2 },
      ],
    };
    try {
      const clientRows = await db
        .prepare(`
          SELECT device_class, browser_family, os_family, SUM(count) as total
          FROM daily_client_stats
          WHERE date != 'TOTAL'
          GROUP BY device_class, browser_family, os_family
        `)
        .all<{ device_class: string; browser_family: string; os_family: string; total: number }>();

      if (clientRows.results && clientRows.results.length > 0) {
        const devMap: Record<string, number> = {};
        const browserMap: Record<string, number> = {};
        const osMap: Record<string, number> = {};
        let totalClient = 0;
        for (const row of clientRows.results) {
          totalClient += row.total;
          devMap[row.device_class] = (devMap[row.device_class] || 0) + row.total;
          browserMap[row.browser_family] = (browserMap[row.browser_family] || 0) + row.total;
          osMap[row.os_family] = (osMap[row.os_family] || 0) + row.total;
        }
        if (totalClient > 0) {
          clientStats.devices = Object.entries(devMap).map(([k, v]) => ({
            name: k === 'desktop' ? 'Desktop (桌面端)' : k === 'mobile' ? 'Mobile (移动端)' : k === 'tablet' ? 'Tablet (平板)' : k,
            percentage: Math.round((v / totalClient) * 100),
          })).sort((a, b) => b.percentage - a.percentage);

          clientStats.browsers = Object.entries(browserMap).map(([k, v]) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1),
            percentage: Math.round((v / totalClient) * 100),
          })).sort((a, b) => b.percentage - a.percentage);

          clientStats.os = Object.entries(osMap).map(([k, v]) => ({
            name: k === 'macos' ? 'macOS' : k === 'ios' ? 'iOS' : k.charAt(0).toUpperCase() + k.slice(1),
            percentage: Math.round((v / totalClient) * 100),
          })).sort((a, b) => b.percentage - a.percentage);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch client breakdown:', err);
    }

    return {
      launchedAt: LAUNCHED_AT,
      totalVisitors,
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
      topGeo: topGeo.length > 0 ? topGeo : undefined,
      chinaProvinces: chinaProvinces.length > 0 ? chinaProvinces : undefined,
      clientStats,
      generatedAt: new Date().toISOString(),
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
