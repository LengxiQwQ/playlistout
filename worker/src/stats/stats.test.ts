import { describe, it, expect, vi } from 'vitest';
import { recordParse, getAggregateStats, getPublicStats, getUtcDateString } from './index';
import worker from '../index';
import { qqMusicProvider } from '../providers/qqmusic';

// Mock in-memory D1 Database for deterministic testing
function createMockD1() {
  const store = new Map<string, number>();

  const db = {
    _store: store,
    prepare(sql: string) {
      return {
        _sql: sql,
        _params: [] as any[],
        bind(...args: any[]) {
          this._params = args;
          return this;
        },
        async run() {
          return { success: true };
        },
        async all() {
          const sql = this._sql as string;
          const results: any[] = [];

          if (sql.includes('GROUP BY date, metric')) {
            // Daily trend query
            const dateThreshold = this._params[0];
            for (const [key, count] of store.entries()) {
              const [date, platform, metric] = key.split('::');
              if (platform === 'all' && date !== 'TOTAL' && date >= dateThreshold) {
                results.push({ date, metric, total: count });
              }
            }
          } else if (sql.includes('daily_export_stats')) {
            // Export trend query
            const dateThreshold = this._params[0];
            for (const [key, count] of store.entries()) {
              if (key.startsWith('export::')) {
                const parts = key.split('::');
                const date = parts[1];
                if (date !== 'TOTAL' && date >= dateThreshold) {
                  results.push({ date, total: count });
                }
              }
            }
          } else {
            // Standard aggregate_stats query (date IN (?1, ?2))
            for (const [key, count] of store.entries()) {
              if (key.startsWith('export::') || key.startsWith('clipboard::')) continue;
              const [date, platform, metric] = key.split('::');
              results.push({ date, platform, metric, count });
            }
          }
          return { results };
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        const [date, platform, metric] = stmt._params;
        const key = `${date}::${platform}::${metric}`;
        const current = store.get(key) || 0;
        store.set(key, current + 1);
      }
      return [];
    },
  };

  return db as unknown as D1Database & { _store: Map<string, number> };
}

function createMockCtx() {
  const promises: Promise<any>[] = [];
  return {
    waitUntil(p: Promise<any>) { promises.push(p); },
    passThroughOnException() {},
    _promises: promises,
  } as unknown as ExecutionContext & { _promises: Promise<any>[] };
}

describe('Anonymous Aggregate Statistics (Phase 5 + Analytics Foundation)', () => {
  // --- Backward compatibility tests (from v2.0.0) ---

  it('increments success counters atomically without persisting payload data', async () => {
    const mockDb = createMockD1();
    const today = getUtcDateString();

    await recordParse(mockDb, 'qqmusic', true);

    // Verify today's counter
    expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBe(1);
    // Verify TOTAL counter
    expect(mockDb._store.get(`TOTAL::qqmusic::parse_success`)).toBe(1);
    // Verify global 'all' counter
    expect(mockDb._store.get(`TOTAL::all::parse_success`)).toBe(1);

    // Increment again
    await recordParse(mockDb, 'qqmusic', true);
    expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBe(2);
    expect(mockDb._store.get(`TOTAL::qqmusic::parse_success`)).toBe(2);

    // Verify NO playlist URL or song title exists in the store keys
    for (const key of mockDb._store.keys()) {
      expect(key).not.toContain('http');
      expect(key).not.toContain('y.qq.com');
      expect(key).not.toContain('song');
      expect(key).not.toContain('playlist');
    }
  });

  it('records failures separately without capturing error payloads or input IDs', async () => {
    const mockDb = createMockD1();
    const today = getUtcDateString();

    await recordParse(mockDb, 'qqmusic', false);

    expect(mockDb._store.get(`${today}::qqmusic::parse_failure`)).toBe(1);
    expect(mockDb._store.get(`TOTAL::qqmusic::parse_failure`)).toBe(1);
    // Failure should NOT increment success
    expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBeUndefined();
  });

  it('handles D1 failure gracefully (best-effort guarantee: never breaks request)', async () => {
    const failingDb = {
      prepare() {
        throw new Error('D1 Database Disconnected');
      },
      async batch() {
        throw new Error('D1 Database Disconnected');
      },
    } as unknown as D1Database;

    // Should not throw
    await expect(recordParse(failingDb, 'qqmusic', true)).resolves.not.toThrow();

    // Stats retrieval on failing db returns default zeroed stats
    const stats = await getAggregateStats(failingDb);
    expect(stats.totalSuccessfulParses).toBe(0);
  });

  it('retrieves aggregate stats correctly from D1', async () => {
    const mockDb = createMockD1();
    const today = getUtcDateString();

    mockDb._store.set(`TOTAL::qqmusic::parse_success`, 42);
    mockDb._store.set(`${today}::qqmusic::parse_success`, 10);
    mockDb._store.set(`TOTAL::qqmusic::parse_failure`, 5);
    mockDb._store.set(`TOTAL::all::parse_success`, 42);
    mockDb._store.set(`${today}::all::parse_success`, 10);

    const stats = await getAggregateStats(mockDb);

    expect(stats.totalSuccessfulParses).toBe(42);
    expect(stats.todaySuccessfulParses).toBe(10);
    expect(stats.totalFailedParses).toBe(5);
    expect(stats.byPlatform['qqmusic'].total).toBe(42);
    expect(stats.byPlatform['qqmusic'].today).toBe(10);
  });

  it('serves GET /api/stats with aggregate JSON data and CORS headers', async () => {
    const mockDb = createMockD1();
    mockDb._store.set(`TOTAL::all::parse_success`, 100);
    mockDb._store.set(`TOTAL::qqmusic::parse_success`, 100);

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/stats', {
      headers: { Origin: 'https://playlistout.lengxiqwq.com' },
    });

    const response = await worker.fetch(request, { DB: mockDb }, createMockCtx());
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.lengxiqwq.com');

    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.totalPlaylistsParsed).toBe(100);
  });

  it('rejects POST to /api/stats with 405 Method Not Allowed', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/stats', {
      method: 'POST',
    });

    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(405);
    const body: any = await response.json();
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('records stats during /api/playlist execution without affecting response', async () => {
    const mockDb = createMockD1();

    const parseSpy = vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce({
      platform: 'qqmusic',
      id: '123',
      name: 'Test',
      trackCount: 1,
      tracks: [{ index: 1, title: 'T1', artists: ['A1'] }],
    });

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123');
    const ctx = createMockCtx();
    const response = await worker.fetch(request, { DB: mockDb }, ctx);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);

    // Wait for waitUntil promises to settle
    await Promise.allSettled(ctx._promises);

    parseSpy.mockRestore();
  });

  // --- Analytics Foundation tests ---

  describe('getPublicStats (Analytics Foundation)', () => {
    it('returns official launchedAt date (2026-09-12)', async () => {
      const stats = await getPublicStats(undefined);
      expect(stats.launchedAt).toBe('2026-09-12');
    });

    it('returns zeroed stats when DB is unavailable', async () => {
      const stats = await getPublicStats(undefined);
      expect(stats.totalPlaylistsParsed).toBe(0);
      expect(stats.playlistsParsedToday).toBe(0);
      expect(stats.totalTracksProcessed).toBe(0);
      expect(stats.tracksProcessedToday).toBe(0);
      expect(stats.totalExports).toBe(0);
      expect(stats.exportsToday).toBe(0);
      expect(stats.recentDays).toEqual([]);
      expect(stats.generatedAt).toBeTruthy();
    });

    it('returns enriched stats with track and export counts', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      mockDb._store.set(`TOTAL::all::parse_success`, 200);
      mockDb._store.set(`${today}::all::parse_success`, 15);
      mockDb._store.set(`TOTAL::qqmusic::parse_success`, 200);
      mockDb._store.set(`${today}::qqmusic::parse_success`, 15);
      mockDb._store.set(`TOTAL::all::tracks_processed`, 5000);
      mockDb._store.set(`${today}::all::tracks_processed`, 300);
      mockDb._store.set(`TOTAL::all::exports_total`, 150);
      mockDb._store.set(`${today}::all::exports_total`, 8);
      mockDb._store.set(`TOTAL::all::visitor_unique`, 88);
      mockDb._store.set(`${today}::all::visitor_unique`, 12);

      const stats = await getPublicStats(mockDb);

      expect(stats.totalPlaylistsParsed).toBe(200);
      expect(stats.playlistsParsedToday).toBe(15);
      expect(stats.totalTracksProcessed).toBe(5000);
      expect(stats.tracksProcessedToday).toBe(300);
      expect(stats.totalExports).toBe(150);
      expect(stats.exportsToday).toBe(8);
      expect(stats.totalVisitors).toBe(88);
      expect(stats.visitorsToday).toBe(12);
      expect(stats.byPlatform['qqmusic'].totalSuccess).toBe(200);
    });

    it('strictly isolates exports from clipboard copies (totalExports and exportsToday DO NOT count clipboard)', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      // Set file exports: 100 total, 5 today
      mockDb._store.set(`TOTAL::all::exports_total`, 100);
      mockDb._store.set(`${today}::all::exports_total`, 5);

      // Set clipboard copies: 500 total, 50 today
      mockDb._store.set(`TOTAL::all::clipboards_total`, 500);
      mockDb._store.set(`${today}::all::clipboards_total`, 50);

      const stats = await getPublicStats(mockDb);

      // totalExports and exportsToday must ONLY reflect exports_total
      expect(stats.totalExports).toBe(100);
      expect(stats.exportsToday).toBe(5);
    });

    it('does NOT expose private dimensional data in public stats', async () => {
      const mockDb = createMockD1();
      mockDb._store.set(`TOTAL::all::parse_success`, 100);
      mockDb._store.set(`TOTAL::qqmusic::parse_success`, 100);

      const stats = await getPublicStats(mockDb);
      const statsStr = JSON.stringify(stats);

      // Should not contain any private dimensional fields
      expect(statsStr).not.toContain('country');
      expect(statsStr).not.toContain('region');
      expect(statsStr).not.toContain('deviceClass');
      expect(statsStr).not.toContain('browserFamily');
      expect(statsStr).not.toContain('osFamily');
      expect(statsStr).not.toContain('errorCategory');
      expect(statsStr).not.toContain('latencyBucket');
      expect(statsStr).not.toContain('inputType');
      expect(statsStr).not.toContain('providerPath');
    });

    it('handles D1 failure gracefully for public stats', async () => {
      const failingDb = {
        prepare() { throw new Error('D1 disconnected'); },
        async batch() { throw new Error('D1 disconnected'); },
      } as unknown as D1Database;

      const stats = await getPublicStats(failingDb);
      expect(stats.totalPlaylistsParsed).toBe(0);
      expect(stats.launchedAt).toBe('2026-09-12');
    });
  });
});
