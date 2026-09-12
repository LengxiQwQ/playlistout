import { describe, it, expect, vi } from 'vitest';
import { recordParse, getAggregateStats, getUtcDateString } from './index';
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
          const results: any[] = [];
          for (const [key, count] of store.entries()) {
            const [date, platform, metric] = key.split('::');
            results.push({ date, platform, metric, count });
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

describe('Anonymous Aggregate Statistics (Phase 5)', () => {
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

    const request = new Request('https://api.playlistout.com/api/stats', {
      headers: { Origin: 'https://playlistout.com' },
    });

    const response = await worker.fetch(request, { DB: mockDb }, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.com');

    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.totalSuccessfulParses).toBe(100);
  });

  it('rejects POST to /api/stats with 405 Method Not Allowed', async () => {
    const request = new Request('https://api.playlistout.com/api/stats', {
      method: 'POST',
    });

    const response = await worker.fetch(request, {}, {} as ExecutionContext);
    expect(response.status).toBe(405);
    const body: any = await response.json();
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('records stats during /api/playlist execution without affecting response', async () => {
    const mockDb = createMockD1();
    const today = getUtcDateString();

    const parseSpy = vi.spyOn(qqMusicProvider, 'parse').mockResolvedValueOnce({
      platform: 'qqmusic',
      id: '123',
      name: 'Test',
      trackCount: 1,
      tracks: [{ index: 1, title: 'T1', artists: ['A1'] }],
    });

    const request = new Request('https://api.playlistout.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123');
    const response = await worker.fetch(request, { DB: mockDb }, {} as ExecutionContext);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);

    // Verify stats were recorded
    expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBe(1);

    parseSpy.mockRestore();
  });
});
