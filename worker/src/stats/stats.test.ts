import { describe, it, expect, vi } from 'vitest';
import {
  recordParse,
  getAggregateStats,
  getPublicStats,
  getPrivateAnalytics,
  getMaintainerStats,
  getUtcDateString,
} from './index';
import worker from '../index';
import { qqMusicProvider } from '../providers/qqmusic';

// Mock in-memory D1 Database for deterministic testing
interface MockGeoRow {
  date: string;
  platform: string;
  country: string;
  region: string;
  city?: string;
  count: number;
}

interface MockClientRow {
  device_class: string;
  browser_family: string;
  os_family: string;
  total: number;
}

interface MockPerfRow {
  dimension: string;
  value: string;
  total: number;
}

function createMockD1() {
  const store = new Map<string, number>();
  const geoRows: MockGeoRow[] = [];
  const clientRows: MockClientRow[] = [];
  const perfRows: MockPerfRow[] = [];
  const recordedQueries: string[] = [];

  const db = {
    _store: store,
    _geoRows: geoRows,
    _clientRows: clientRows,
    _perfRows: perfRows,
    _recordedQueries: recordedQueries,
    prepare(sql: string) {
      recordedQueries.push(sql);
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

          if (sql.includes('daily_geo_stats')) {
            // Geographic distribution queries
            if (sql.includes("country = 'CN'") && sql.includes("region != 'UNKNOWN'")) {
              // CN Province queries
              const filtered = geoRows.filter(
                (r) => r.date === 'TOTAL' && r.platform === 'all' && r.country === 'CN' && r.region !== 'UNKNOWN',
              );
              if (sql.includes('GROUP BY region')) {
                // Top 10 CN regions
                const map = new Map<string, number>();
                for (const r of filtered) {
                  map.set(r.region, (map.get(r.region) || 0) + r.count);
                }
                const sorted = Array.from(map.entries())
                  .map(([region, total]) => ({ region, total }))
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 10);
                results.push(...sorted);
              } else {
                // Total known CN region sum
                const sum = filtered.reduce((acc, r) => acc + r.count, 0);
                results.push({ total: sum > 0 ? sum : null });
              }
            } else if (sql.includes("country != 'UNKNOWN'")) {
              // Country queries
              const filtered = geoRows.filter(
                (r) => r.date === 'TOTAL' && r.platform === 'all' && r.country !== 'UNKNOWN',
              );
              if (sql.includes('GROUP BY country')) {
                // Top 10 countries
                const map = new Map<string, number>();
                for (const r of filtered) {
                  map.set(r.country, (map.get(r.country) || 0) + r.count);
                }
                const sorted = Array.from(map.entries())
                  .map(([country, total]) => ({ country, total }))
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 10);
                results.push(...sorted);
              } else {
                // Total known country sum
                const sum = filtered.reduce((acc, r) => acc + r.count, 0);
                results.push({ total: sum > 0 ? sum : null });
              }
            }
          } else if (sql.includes('daily_client_stats')) {
            results.push(...clientRows);
          } else if (sql.includes('daily_performance_stats')) {
            results.push(...perfRows);
          } else if (sql.includes('daily_clipboard_stats')) {
            const dateThreshold = this._params[0];
            if (sql.includes('GROUP BY clipboard_mode')) {
              for (const [key, count] of store.entries()) {
                if (key.startsWith('clipboard_mode::')) {
                  const [, mode] = key.split('::');
                  results.push({ clipboard_mode: mode, total: count });
                }
              }
            } else if (dateThreshold) {
              for (const [key, count] of store.entries()) {
                if (key.startsWith('clipboard::')) {
                  const parts = key.split('::');
                  const date = parts[1];
                  if (date !== 'TOTAL' && date >= dateThreshold) {
                    results.push({ date, total: count });
                  }
                }
              }
            }
          } else if (sql.includes('hourly_stats')) {
            const requestedDates = this._params.filter((p) => typeof p === 'string');
            const includeDate = sql.includes('SELECT date, hour');
            for (const [key, count] of store.entries()) {
              if (!key.startsWith('hourly::')) continue;
              const [, date, hourRaw, platform, metric] = key.split('::');
              if (!requestedDates.includes(date)) continue;
              if (platform !== 'all' || !['page_view', 'visitor_unique'].includes(metric)) continue;
              const row = { hour: Number(hourRaw), metric, total: count };
              results.push(includeDate ? { date, ...row } : row);
            }
          } else if (sql.includes('GROUP BY date, metric')) {
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
              if (
                key.startsWith('export::') ||
                key.startsWith('clipboard::') ||
                key.startsWith('hourly::') ||
                key.startsWith('clipboard_mode::')
              )
                continue;
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

  return db as unknown as D1Database & {
    _store: Map<string, number>;
    _geoRows: MockGeoRow[];
    _clientRows: MockClientRow[];
    _perfRows: MockPerfRow[];
    _recordedQueries: string[];
  };
}

function createMockCtx() {
  const promises: Promise<any>[] = [];
  return {
    waitUntil(p: Promise<any>) {
      promises.push(p);
    },
    passThroughOnException() {},
    _promises: promises,
  } as unknown as ExecutionContext & { _promises: Promise<any>[] };
}

const EXPECTED_PUBLIC_KEYS = [
  'launchedAt',
  'cumulativeDailyVisitors',
  'totalVisitors',
  'visitorsToday',
  'totalPageViews',
  'pageViewsToday',
  'totalPlaylistsParsed',
  'playlistsParsedToday',
  'totalTracksProcessed',
  'tracksProcessedToday',
  'totalExports',
  'exportsToday',
  'exportFormatsBreakdown',
  'byPlatform',
  'recentDays',
  'generatedAt',
].sort();

const FORBIDDEN_PUBLIC_KEYS = [
  'todayHourlyPageViews',
  'last24HourlyPageViews',
  'topGeo',
  'chinaProvinces',
  'clientStats',
  'clipboardFormatsBreakdown',
  'referrerDistribution',
  'inputTypeDistribution',
  'latencyDistribution',
  'errorCategoryDistribution',
  'playlistSizeDistribution',
  'providerPathDistribution',
  'exportPlaylistSizeDistribution',
  'clipboardPlaylistSizeDistribution',
  'rateLimitEndpointDistribution',
  'operationalRecentDays',
];

describe('Anonymous Aggregate Statistics (Phase 5 + Analytics Foundation + R6 Split)', () => {
  // --- Backward compatibility tests (from v2.0.0) ---

  it('increments success counters atomically without persisting payload data', async () => {
    const mockDb = createMockD1();
    const today = getUtcDateString();

    await recordParse(mockDb, 'qqmusic', true);

    expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBe(1);
    expect(mockDb._store.get(`TOTAL::qqmusic::parse_success`)).toBe(1);
    expect(mockDb._store.get(`TOTAL::all::parse_success`)).toBe(1);

    await recordParse(mockDb, 'qqmusic', true);
    expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBe(2);
    expect(mockDb._store.get(`TOTAL::qqmusic::parse_success`)).toBe(2);

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

    await expect(recordParse(failingDb, 'qqmusic', true)).resolves.not.toThrow();

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
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

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

    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123',
    );
    const ctx = createMockCtx();
    const response = await worker.fetch(request, { DB: mockDb }, ctx);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);

    await Promise.allSettled(ctx._promises);
    parseSpy.mockRestore();
  });

  // ── R6 Public Contract Tests ──

  describe('getPublicStats & /api/stats (R6 Public Boundary)', () => {
    it('returns exact allowed public keys (Exact-Shape Test)', async () => {
      const mockDb = createMockD1();
      const stats = await getPublicStats(mockDb);
      const actualKeys = Object.keys(stats).sort();

      expect(actualKeys).toEqual(EXPECTED_PUBLIC_KEYS);

      for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
        expect((stats as any)[forbidden]).toBeUndefined();
      }
    });

    it('returns strictly public fields in recentDays[] (Nested-Shape Test)', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      mockDb._store.set(`${today}::all::parse_success`, 10);
      mockDb._store.set(`${today}::all::tracks_processed`, 50);
      mockDb._store.set(`export::${today}::xlsx`, 5);

      // Operational fields that must NOT leak into public recentDays
      mockDb._store.set(`${today}::all::visitor_unique`, 8);
      mockDb._store.set(`${today}::all::parse_failure`, 2);
      mockDb._store.set(`${today}::all::clipboards_total`, 15);

      const stats = await getPublicStats(mockDb);
      expect(stats.recentDays.length).toBeGreaterThan(0);

      for (const entry of stats.recentDays) {
        expect(Object.keys(entry).sort()).toEqual(['date', 'exports', 'parses', 'tracks']);
        expect((entry as any).visitors).toBeUndefined();
        expect((entry as any).failures).toBeUndefined();
        expect((entry as any).clipboards).toBeUndefined();
      }
    });

    it('never queries private analytics tables (Public SQL Boundary Test)', async () => {
      const mockDb = createMockD1();
      await getPublicStats(mockDb);

      const queries = mockDb._recordedQueries;
      expect(queries.length).toBeGreaterThan(0);

      // Must NEVER query private analytics tables
      for (const sql of queries) {
        expect(sql).not.toContain('daily_geo_stats');
        expect(sql).not.toContain('daily_client_stats');
        expect(sql).not.toContain('daily_performance_stats');
        expect(sql).not.toContain('hourly_stats');
        expect(sql).not.toContain('daily_clipboard_stats');
      }
    });

    it('does not leak private dimensions even when seeded in D1 (Public Adversarial Test)', async () => {
      const mockDb = createMockD1();

      // Seed private dimensional data into D1
      mockDb._geoRows.push(
        { date: 'TOTAL', platform: 'all', country: 'MY', region: 'Shanghai', count: 100 },
      );
      mockDb._clientRows.push(
        { device_class: 'mobile', browser_family: 'Chrome', os_family: 'Android', total: 50 },
      );
      mockDb._perfRows.push(
        { dimension: 'referrer_source', value: 'ChatGPT', total: 20 },
        { dimension: 'error_category', value: 'error_timeout', total: 10 },
        { dimension: 'provider_path', value: 'provider_fallback', total: 5 },
      );

      const request = new Request('https://playlistout-api.lengxiqwq.com/api/stats');
      const response = await worker.fetch(request, { DB: mockDb }, createMockCtx());

      expect(response.status).toBe(200);
      const jsonText = await response.text();

      // Strictly verify no forbidden field names appear in output JSON
      for (const key of FORBIDDEN_PUBLIC_KEYS) {
        expect(jsonText).not.toContain(`"${key}"`);
      }

      // Strictly verify none of the sensitive private dimension values appear in public response
      expect(jsonText).not.toContain('Shanghai');
      expect(jsonText).not.toContain('Chrome');
      expect(jsonText).not.toContain('Android');
      expect(jsonText).not.toContain('ChatGPT');
      expect(jsonText).not.toContain('error_timeout');
      expect(jsonText).not.toContain('provider_fallback');
    });

    it('keeps GET /api/stats strictly public even when called with valid Admin token (No Escalation Test)', async () => {
      const mockDb = createMockD1();
      const adminToken = 'a'.repeat(64);

      const request = new Request('https://playlistout-api.lengxiqwq.com/api/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: adminToken },
        createMockCtx(),
      );

      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);

      const actualKeys = Object.keys(body.data).sort();
      expect(actualKeys).toEqual(EXPECTED_PUBLIC_KEYS);

      for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
        expect(body.data[forbidden]).toBeUndefined();
      }
    });

    it('maintains cumulativeDailyVisitors as canonical and totalVisitors as strictly identical alias', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();
      mockDb._store.set(`TOTAL::all::visitor_unique`, 309);
      mockDb._store.set(`${today}::all::visitor_unique`, 103);

      const stats = await getPublicStats(mockDb);

      expect(stats.cumulativeDailyVisitors).toBe(309);
      expect(stats.totalVisitors).toBe(309);
      expect(stats.totalVisitors).toBe(stats.cumulativeDailyVisitors);
      expect(stats.visitorsToday).toBe(103);
    });

    it('handles D1 failure gracefully for public stats', async () => {
      const failingDb = {
        prepare() {
          throw new Error('D1 disconnected');
        },
        async batch() {
          throw new Error('D1 disconnected');
        },
      } as unknown as D1Database;

      const stats = await getPublicStats(failingDb);
      expect(stats.totalPlaylistsParsed).toBe(0);
      expect(stats.launchedAt).toBe('2026-09-12');
      expect(stats.cumulativeDailyVisitors).toBe(0);
      expect(stats.totalVisitors).toBe(0);
    });
  });

  // ── R6 Private Maintainer Endpoint Tests (/api/internal/stats) ──

  describe('GET /api/internal/stats (R6 Private Boundary & Auth)', () => {
    const REAL_SECRET = '6f8a92b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1';

    it('rejects request with 401 when Authorization header is missing', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats');

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(401);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      // Zero DB queries on auth rejection
      expect(mockDb._recordedQueries).toHaveLength(0);
    });

    it('rejects request with 401 on malformed Authorization header', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: { Authorization: 'Basic someuser:somepass' },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(401);
      expect(mockDb._recordedQueries).toHaveLength(0);
    });

    it('rejects request with 401 on empty Bearer token', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: { Authorization: 'Bearer   ' },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(401);
      expect(mockDb._recordedQueries).toHaveLength(0);
    });

    it('rejects request with 401 on wrong Bearer token', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: { Authorization: 'Bearer WRONG_TOKEN_VALUE_123456789' },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(401);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(mockDb._recordedQueries).toHaveLength(0);
    });

    it('fails closed with 503 when Secret is missing from Env', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: { Authorization: `Bearer ${REAL_SECRET}` },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: undefined },
        createMockCtx(),
      );

      expect(response.status).toBe(503);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(mockDb._recordedQueries).toHaveLength(0);
    });

    it('rejects POST to /api/internal/stats with 405 Method Not Allowed', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        method: 'POST',
        headers: { Authorization: `Bearer ${REAL_SECRET}` },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET');
      expect(mockDb._recordedQueries).toHaveLength(0);
    });

    it('does NOT provide public CORS for /api/internal/stats (CORS Gate)', async () => {
      const mockDb = createMockD1();

      // Preflight OPTIONS from browser
      const optRequest = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        method: 'OPTIONS',
        headers: { Origin: 'https://playlistout.com' },
      });
      const optResponse = await worker.fetch(
        optRequest,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );
      expect(optResponse.status).toBe(403);
      expect(optResponse.headers.get('Access-Control-Allow-Origin')).toBeNull();

      // Authenticated GET with Origin header
      const getRequest = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: {
          Authorization: `Bearer ${REAL_SECRET}`,
          Origin: 'https://playlistout.com',
        },
      });
      const getResponse = await worker.fetch(
        getRequest,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );
      expect(getResponse.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('sets Cache-Control: no-store and Pragma: no-cache on private endpoint', async () => {
      const mockDb = createMockD1();
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: { Authorization: `Bearer ${REAL_SECRET}` },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('Pragma')).toBe('no-cache');
    });

    it('succeeds with 200 and returns complete public + insights structure when authenticated', async () => {
      const mockDb = createMockD1();

      // Seed data
      mockDb._store.set(`TOTAL::all::parse_success`, 250);
      mockDb._geoRows.push({
        date: 'TOTAL',
        platform: 'all',
        country: 'MY',
        region: 'UNKNOWN',
        count: 80,
      });
      mockDb._clientRows.push({
        device_class: 'desktop',
        browser_family: 'chrome',
        os_family: 'windows',
        total: 100,
      });
      mockDb._perfRows.push(
        { dimension: 'playlist_size', value: '1-50', total: 60 },
        { dimension: 'provider_path', value: 'primary', total: 70 },
        { dimension: 'export_playlist_size', value: '51-200', total: 30 },
        { dimension: 'clipboard_playlist_size', value: '1-50', total: 40 },
        { dimension: 'rate_limit_endpoint', value: 'stats', total: 5 },
      );

      const request = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
        headers: { Authorization: `Bearer ${REAL_SECRET}` },
      });

      const response = await worker.fetch(
        request,
        { DB: mockDb, INSIGHTS_ADMIN_TOKEN: REAL_SECRET },
        createMockCtx(),
      );

      expect(response.status).toBe(200);
      const body: any = await response.json();
      expect(body.success).toBe(true);

      // Contract verification: data has { public, insights }
      expect(body.data.public).toBeDefined();
      expect(body.data.insights).toBeDefined();

      const p = body.data.public;
      expect(p.totalPlaylistsParsed).toBe(250);
      expect(Object.keys(p).sort()).toEqual(EXPECTED_PUBLIC_KEYS);

      const ins = body.data.insights;
      expect(ins.topGeo).toBeDefined();
      expect(ins.chinaProvinces).toBeDefined();
      expect(ins.clientStats).toBeDefined();
      expect(ins.todayHourlyPageViews).toBeDefined();
      expect(ins.last24HourlyPageViews).toBeDefined();
      expect(ins.clipboardFormatsBreakdown).toBeDefined();
      expect(ins.referrerDistribution).toBeDefined();
      expect(ins.inputTypeDistribution).toBeDefined();
      expect(ins.latencyDistribution).toBeDefined();
      expect(ins.errorCategoryDistribution).toBeDefined();
      // Approved D1 inventory dimensions
      expect(ins.playlistSizeDistribution).toBeDefined();
      expect(ins.providerPathDistribution).toBeDefined();
      expect(ins.exportPlaylistSizeDistribution).toBeDefined();
      expect(ins.clipboardPlaylistSizeDistribution).toBeDefined();
      expect(ins.rateLimitEndpointDistribution).toBeDefined();
      expect(ins.operationalRecentDays).toBeDefined();
    });
  });

  // ── Maintainer Insights Calculation & Integrity Tests ──

  describe('getPrivateAnalytics (Dimensional Calculations & R3 Integrity)', () => {
    it('returns rolling 24-hour window across UTC boundary', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-09-18T06:30:00.000Z'));
        const mockDb = createMockD1();

        mockDb._store.set('hourly::2026-09-17::7::all::page_view', 11);
        mockDb._store.set('hourly::2026-09-18::6::all::page_view', 22);
        mockDb._store.set('hourly::2026-09-18::6::all::visitor_unique', 5);

        const insights = await getPrivateAnalytics(mockDb);
        const rolling = insights.last24HourlyPageViews;

        expect(rolling).toHaveLength(24);
        expect(rolling[0]).toEqual({
          timestamp: '2026-09-17T07:00:00.000Z',
          pageViews: 11,
          visitors: 0,
        });
        expect(rolling[23]).toEqual({
          timestamp: '2026-09-18T06:00:00.000Z',
          pageViews: 22,
          visitors: 5,
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('calculates country percentage against full known population, not Top 10 sum (R3 Country >10 Test)', async () => {
      const mockDb = createMockD1();
      const countryCounts = [
        { country: 'MY', count: 30 },
        { country: 'US', count: 20 },
        { country: 'CN', count: 10 },
        { country: 'JP', count: 10 },
        { country: 'SG', count: 5 },
        { country: 'GB', count: 5 },
        { country: 'DE', count: 5 },
        { country: 'CA', count: 5 },
        { country: 'FR', count: 4 },
        { country: 'AU', count: 3 },
        { country: 'KR', count: 3 },
      ];

      for (const item of countryCounts) {
        mockDb._geoRows.push({
          date: 'TOTAL',
          platform: 'all',
          country: item.country,
          region: 'UNKNOWN',
          count: item.count,
        });
      }

      const insights = await getPrivateAnalytics(mockDb);

      expect(insights.topGeo).toHaveLength(10);
      expect(insights.topGeo[0].country).toBe('MY');
      expect(insights.topGeo[0].count).toBe(30);
      expect(insights.topGeo[0].percentage).toBe(30);

      expect(insights.topGeo[1].country).toBe('US');
      expect(insights.topGeo[1].count).toBe(20);
      expect(insights.topGeo[1].percentage).toBe(20);

      const top10PctSum = insights.topGeo.reduce((sum, r) => sum + r.percentage, 0);
      expect(top10PctSum).toBe(97);
      expect(top10PctSum).toBeLessThan(100);
    });

    it('calculates China province percentage against all known CN regions, not Top 10 sum (R3 Province >10 Test)', async () => {
      const mockDb = createMockD1();
      const provinceCounts = [
        { region: 'Guangdong', count: 30 },
        { region: 'Zhejiang', count: 20 },
        { region: 'Jiangsu', count: 10 },
        { region: 'Beijing', count: 10 },
        { region: 'Shanghai', count: 5 },
        { region: 'Sichuan', count: 5 },
        { region: 'Shandong', count: 5 },
        { region: 'Hubei', count: 5 },
        { region: 'Hunan', count: 4 },
        { region: 'Fujian', count: 3 },
        { region: 'Henan', count: 3 },
      ];

      for (const item of provinceCounts) {
        mockDb._geoRows.push({
          date: 'TOTAL',
          platform: 'all',
          country: 'CN',
          region: item.region,
          count: item.count,
        });
      }

      const insights = await getPrivateAnalytics(mockDb);

      expect(insights.chinaProvinces).toHaveLength(10);
      expect(insights.chinaProvinces[0].province).toBe('Guangdong');
      expect(insights.chinaProvinces[0].count).toBe(30);
      expect(insights.chinaProvinces[0].percentage).toBe(30);

      expect(insights.chinaProvinces[1].province).toBe('Zhejiang');
      expect(insights.chinaProvinces[1].count).toBe(20);
      expect(insights.chinaProvinces[1].percentage).toBe(20);

      const top10PctSum = insights.chinaProvinces.reduce((sum, r) => sum + r.percentage, 0);
      expect(top10PctSum).toBe(97);
      expect(top10PctSum).toBeLessThan(100);
    });

    it('excludes UNKNOWN from country and province denominators (R3 UNKNOWN Test)', async () => {
      const mockDb = createMockD1();
      mockDb._geoRows.push(
        { date: 'TOTAL', platform: 'all', country: 'MY', region: 'UNKNOWN', count: 40 },
        { date: 'TOTAL', platform: 'all', country: 'US', region: 'UNKNOWN', count: 40 },
        { date: 'TOTAL', platform: 'all', country: 'UNKNOWN', region: 'UNKNOWN', count: 20 },
        { date: 'TOTAL', platform: 'all', country: 'CN', region: 'Guangdong', count: 30 },
        { date: 'TOTAL', platform: 'all', country: 'CN', region: 'Zhejiang', count: 30 },
        { date: 'TOTAL', platform: 'all', country: 'CN', region: 'UNKNOWN', count: 40 },
      );

      const insights = await getPrivateAnalytics(mockDb);

      expect(insights.topGeo.some((r) => r.country === 'UNKNOWN')).toBe(false);
      expect(insights.chinaProvinces.some((r) => r.province === 'UNKNOWN')).toBe(false);

      const gd = insights.chinaProvinces.find((r) => r.province === 'Guangdong')!;
      expect(gd.percentage).toBe(50);
    });

    it('returns empty arrays without error when no dimensional data exists', async () => {
      const mockDb = createMockD1();
      const insights = await getPrivateAnalytics(mockDb);
      expect(insights.topGeo).toEqual([]);
      expect(insights.chinaProvinces).toEqual([]);
      expect(insights.clientStats.browsers).toEqual([]);
    });
  });
});
