import { describe, expect, it } from 'vitest';
import worker from '../index';
import { getPublicStats } from './index';

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function createPublicStatsMock(frozen = true): D1Database {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = addDays(today, -1);

  const baselines = [
    ['metric:page_view', 100, 10],
    ['metric:visitor_unique', 50, 5],
    ['metric:playlist_success', 40, 4],
    ['metric:tracks_processed', 400, 40],
    ['metric:export', 20, 2],
    ['platform_success:qqmusic', 10, 1],
    ['platform_success:netease', 10, 1],
    ['platform_success:kugou', 10, 1],
    ['platform_success:qishui', 10, 1],
    ['export_format:txt', 4, 0],
    ['export_format:csv', 4, 0],
    ['export_format:xlsx', 4, 0],
    ['export_format:json', 4, 0],
    ['export_format:m3u8', 4, 0],
  ].map(([key, legacyTotal, legacyDay]) => ({
    key: String(key),
    baseline_date: today,
    legacy_total: Number(legacyTotal),
    v2_total: 0,
    legacy_day: Number(legacyDay),
    v2_day: 0,
  }));

  const metricRows = [
    { metric: 'page_view', platform: 'none', total: 2, today: 2 },
    { metric: 'visitor_unique', platform: 'none', total: 1, today: 1 },
    { metric: 'playlist_success', platform: 'qqmusic', total: 1, today: 1 },
    { metric: 'playlist_success', platform: 'netease', total: 1, today: 1 },
    { metric: 'tracks_processed', platform: 'qqmusic', total: 20, today: 20 },
    { metric: 'export', platform: 'qqmusic', total: 1, today: 1 },
  ];

  const baselineDayRows = [
    { metric: 'page_view', platform: 'none', count: 2 },
    { metric: 'visitor_unique', platform: 'none', count: 1 },
    { metric: 'playlist_success', platform: 'qqmusic', count: 1 },
    { metric: 'playlist_success', platform: 'netease', count: 1 },
    { metric: 'tracks_processed', platform: 'qqmusic', count: 20 },
    { metric: 'export', platform: 'qqmusic', count: 1 },
  ];

  const formatRows = [
    { value: 'txt', total: 1, today: 1, baseline_day: 1 },
  ];

  const v2TrendRows = [
    { date: today, metric: 'playlist_success', total: 2 },
    { date: today, metric: 'tracks_processed', total: 20 },
    { date: today, metric: 'export', total: 1 },
  ];

  const legacyHistory = [{ date: yesterday, parses: 7, tracks: 70, exports: 3 }];

  return {
    prepare(sql: string) {
      let binds: unknown[] = [];
      const statement: any = {
        bind(...args: unknown[]) {
          binds = args;
          return statement;
        },
        async first() {
          if (sql.includes('FROM analytics_v2_cutover_state')) {
            return {
              status: frozen ? 'frozen' : 'prepared',
              baseline_date: today,
            };
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM analytics_v2_public_baseline')) {
            return { results: baselines };
          }
          if (sql.includes('FROM analytics_v2_daily_core') && sql.includes('SUM(CASE WHEN date = ?1')) {
            return { results: metricRows };
          }
          if (sql.includes('FROM analytics_v2_daily_core') && sql.includes('WHERE date = ?1')) {
            return { results: baselineDayRows };
          }
          if (sql.includes('FROM analytics_v2_breakdown')) {
            return { results: formatRows };
          }
          if (sql.includes('FROM analytics_v2_public_history')) {
            expect(binds.length).toBe(2);
            return { results: legacyHistory };
          }
          if (sql.includes('FROM analytics_v2_daily_core') && sql.includes('GROUP BY date, metric')) {
            return { results: v2TrendRows };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}

describe('Analytics V2 public stats after V1 retirement', () => {
  it('preserves lifetime continuity and reads old daily trend from compact history', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = addDays(today, -1);
    const stats = await getPublicStats(createPublicStatsMock(true));

    expect(stats.totalPageViews).toBe(102);
    expect(stats.pageViewsToday).toBe(12);
    expect(stats.totalVisitors).toBe(51);
    expect(stats.visitorsToday).toBe(6);
    expect(stats.totalPlaylistsParsed).toBe(42);
    expect(stats.playlistsParsedToday).toBe(6);
    expect(stats.totalTracksProcessed).toBe(420);
    expect(stats.tracksProcessedToday).toBe(60);
    expect(stats.totalExports).toBe(21);
    expect(stats.exportsToday).toBe(3);

    expect(stats.byPlatform.qqmusic.totalSuccess).toBe(11);
    expect(stats.byPlatform.netease.totalSuccess).toBe(11);
    expect(stats.byPlatform.kugou.totalSuccess).toBe(10);
    expect(stats.exportFormatsBreakdown.txt).toBe(5);
    expect(stats.exportFormatsBreakdown.csv).toBe(4);

    const platformSuccessTotal = Object.values(stats.byPlatform)
      .reduce((sum, platform) => sum + platform.totalSuccess, 0);
    expect(platformSuccessTotal).toBe(stats.totalPlaylistsParsed);

    const exportFormatTotal = Object.values(stats.exportFormatsBreakdown)
      .reduce((sum, count) => sum + count, 0);
    expect(exportFormatTotal).toBe(stats.totalExports);

    expect(stats.recentDays.find((row) => row.date === yesterday)).toEqual({
      date: yesterday,
      parses: 7,
      tracks: 70,
      exports: 3,
    });
    expect(stats.recentDays.find((row) => row.date === today)).toEqual({
      date: today,
      parses: 6,
      tracks: 60,
      exports: 3,
    });
  });

  it('fails closed if the cutover is not frozen', async () => {
    await expect(getPublicStats(createPublicStatsMock(false))).rejects.toThrow(
      /unavailable before a frozen cutover/
    );
  });

  it('returns 404 for the retired /api/internal/stats endpoint', async () => {
    const response = await worker.fetch(
      new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats'),
      {},
      {
        waitUntil() {},
        passThroughOnException() {},
      } as unknown as ExecutionContext,
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});
