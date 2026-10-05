import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import worker from '../index';
import { getPublicStats } from './index';

function wrapSqlite(db: DatabaseSync): D1Database {
  return {
    prepare(sql: string) {
      let params: any[] = [];
      const stmt: any = {
        bind(...args: any[]) {
          params = args;
          return stmt;
        },
        async all() {
          return { results: db.prepare(sql).all(...params) as any[] };
        },
        async first() {
          return db.prepare(sql).get(...params) as any;
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedPublicV2(db: DatabaseSync, frozen = true) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = addDays(today, -1);

  db.exec(`
    CREATE TABLE analytics_v2_cutover_state (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      baseline_date TEXT NOT NULL,
      prepared_at TEXT,
      frozen_at TEXT
    );
    CREATE TABLE analytics_v2_public_baseline (
      key TEXT PRIMARY KEY,
      baseline_date TEXT NOT NULL,
      legacy_total INTEGER NOT NULL,
      v2_total INTEGER NOT NULL,
      legacy_day INTEGER NOT NULL,
      v2_day INTEGER NOT NULL
    );
    CREATE TABLE analytics_v2_daily_core (
      date TEXT NOT NULL,
      channel TEXT NOT NULL,
      client_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      metric TEXT NOT NULL,
      count INTEGER NOT NULL
    );
    CREATE TABLE analytics_v2_breakdown (
      date TEXT NOT NULL,
      channel TEXT NOT NULL,
      client_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      dimension TEXT NOT NULL,
      value TEXT NOT NULL,
      count INTEGER NOT NULL
    );
    CREATE TABLE analytics_v2_public_history (
      date TEXT PRIMARY KEY,
      parses INTEGER NOT NULL,
      tracks INTEGER NOT NULL,
      exports INTEGER NOT NULL
    );
  `);

  db.prepare(`
    INSERT INTO analytics_v2_cutover_state
      (id, status, baseline_date, prepared_at, frozen_at)
    VALUES (1, ?, ?, CURRENT_TIMESTAMP, ?)
  `).run(frozen ? 'frozen' : 'prepared', today, frozen ? new Date().toISOString() : null);

  const baselines: Array<[string, number, number]> = [
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
  ];
  const baselineStmt = db.prepare(`
    INSERT INTO analytics_v2_public_baseline
      (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
    VALUES (?, ?, ?, 0, ?, 0)
  `);
  for (const [key, total, day] of baselines) {
    baselineStmt.run(key, today, total, day);
  }

  db.prepare(`
    INSERT INTO analytics_v2_public_history (date, parses, tracks, exports)
    VALUES (?, 7, 70, 3)
  `).run(yesterday);

  const core = db.prepare(`
    INSERT INTO analytics_v2_daily_core
      (date, channel, client_id, platform, metric, count)
    VALUES (?, 'web', 'official_web', ?, ?, ?)
  `);
  core.run(today, 'none', 'page_view', 2);
  core.run(today, 'none', 'visitor_unique', 1);
  core.run(today, 'qqmusic', 'playlist_success', 1);
  core.run(today, 'netease', 'playlist_success', 1);
  core.run(today, 'qqmusic', 'tracks_processed', 20);
  core.run(today, 'qqmusic', 'export', 1);

  db.prepare(`
    INSERT INTO analytics_v2_breakdown
      (date, channel, client_id, platform, dimension, value, count)
    VALUES (?, 'web', 'official_web', 'qqmusic', 'export_format', 'txt', 1)
  `).run(today);

  return { today, yesterday };
}

describe('Analytics V2 public stats after V1 retirement', () => {
  it('preserves lifetime continuity and reads old daily trend from compact history', async () => {
    const db = new DatabaseSync(':memory:');
    try {
      const { today, yesterday } = seedPublicV2(db, true);
      const stats = await getPublicStats(wrapSqlite(db));

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
    } finally {
      db.close();
    }
  });

  it('fails closed if a non-empty database has not completed the cutover', async () => {
    const db = new DatabaseSync(':memory:');
    try {
      seedPublicV2(db, false);
      await expect(getPublicStats(wrapSqlite(db))).rejects.toThrow(
        /unavailable before a frozen cutover/
      );
    } finally {
      db.close();
    }
  });

  it('returns 404 for the retired /api/internal/stats endpoint', async () => {
    const response = await worker.fetch(
      new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats'),
      {},
      { waitUntil() {}, passThroughOnException() {} } as ExecutionContext,
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});
