import { describe, it, expect, vi } from 'vitest';
import { recordParse, getAggregateStats, getPublicStats, getUtcDateString } from './index';
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

function createMockD1() {
  const store = new Map<string, number>();
  const geoRows: MockGeoRow[] = [];

  const db = {
    _store: store,
    _geoRows: geoRows,
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
              if (key.startsWith('export::') || key.startsWith('clipboard::') || key.startsWith('hourly::')) continue;
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

  return db as unknown as D1Database & { _store: Map<string, number>; _geoRows: MockGeoRow[] };
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

    it('exposes dimensional aggregate data as coarse anonymous counters (no raw privacy-sensitive values)', async () => {
      const mockDb = createMockD1();
      mockDb._store.set(`TOTAL::all::parse_success`, 100);
      mockDb._store.set(`TOTAL::qqmusic::parse_success`, 100);

      const stats = await getPublicStats(mockDb);
      const statsStr = JSON.stringify(stats);

      // New dimensional fields ARE now present in the public API
      expect(stats.topGeo).toBeDefined();
      expect(stats.chinaProvinces).toBeDefined();
      expect(stats.clientStats).toBeDefined();
      expect(stats.todayHourlyPageViews).toBeDefined();
      expect(stats.last24HourlyPageViews).toBeDefined();
      expect(stats.referrerDistribution).toBeDefined();

      // todayHourlyPageViews must be exactly 24 slots (one per UTC hour)
      expect(stats.todayHourlyPageViews).toHaveLength(24);
      for (const slot of stats.todayHourlyPageViews!) {
        expect(slot.hour).toBeGreaterThanOrEqual(0);
        expect(slot.hour).toBeLessThanOrEqual(23);
        expect(typeof slot.pageViews).toBe('number');
        expect(typeof slot.visitors).toBe('number');
      }

      expect(stats.last24HourlyPageViews).toHaveLength(24);
      for (const slot of stats.last24HourlyPageViews!) {
        expect(Number.isNaN(Date.parse(slot.timestamp))).toBe(false);
        expect(typeof slot.pageViews).toBe('number');
        expect(typeof slot.visitors).toBe('number');
      }

      // Raw privacy-sensitive field names must NOT appear — only coarse category labels
      expect(statsStr).not.toContain('deviceClass');     // raw UA field name
      expect(statsStr).not.toContain('browserFamily');   // raw UA field name
      expect(statsStr).not.toContain('osFamily');        // raw UA field name
      expect(statsStr).not.toContain('providerPath');    // internal infra field
      // 'country' is allowed as coarse ISO code; 'region' is allowed as coarse province name
    });


    it('returns a true rolling 24-hour window across a UTC date boundary', async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-09-18T06:30:00.000Z'));
        const mockDb = createMockD1();

        mockDb._store.set('hourly::2026-09-17::7::all::page_view', 11);
        mockDb._store.set('hourly::2026-09-18::6::all::page_view', 22);
        mockDb._store.set('hourly::2026-09-18::6::all::visitor_unique', 5);

        const stats = await getPublicStats(mockDb);
        const rolling = stats.last24HourlyPageViews!;

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
        expect(rolling.every((slot, i) => {
          if (i === 0) return true;
          return Date.parse(slot.timestamp) - Date.parse(rolling[i - 1].timestamp) === 60 * 60 * 1000;
        })).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });


    it('does NOT fabricate NetEase statistics when NetEase parses are 0 (0 is 0)', async () => {
      const mockDb = createMockD1();
      mockDb._store.set(`TOTAL::all::parse_success`, 100);
      mockDb._store.set(`TOTAL::qqmusic::parse_success`, 100);

      const stats = await getPublicStats(mockDb);
      expect(stats.byPlatform['netease'].totalSuccess).toBe(0);
      expect(stats.byPlatform['kugou'].totalSuccess).toBe(0);
      expect(stats.byPlatform['qqmusic'].totalSuccess).toBe(100);
    });

    it('handles D1 failure gracefully for public stats', async () => {
      const failingDb = {
        prepare() { throw new Error('D1 disconnected'); },
        async batch() { throw new Error('D1 disconnected'); },
      } as unknown as D1Database;

      const stats = await getPublicStats(failingDb);
      expect(stats.totalPlaylistsParsed).toBe(0);
      expect(stats.launchedAt).toBe('2026-09-12');
      expect(stats.cumulativeDailyVisitors).toBe(0);
      expect(stats.totalVisitors).toBe(0);
    });

    it('maintains cumulativeDailyVisitors as canonical and totalVisitors as strictly identical alias (R2 Test A & B)', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();
      // Record TOTAL cumulative daily uniques (309) and today's uniques (103)
      mockDb._store.set(`TOTAL::all::visitor_unique`, 309);
      mockDb._store.set(`${today}::all::visitor_unique`, 103);

      const stats = await getPublicStats(mockDb);

      // Canonical field must be 309
      expect(stats.cumulativeDailyVisitors).toBe(309);
      // Legacy compatibility alias must be strictly equal
      expect(stats.totalVisitors).toBe(309);
      expect(stats.totalVisitors).toBe(stats.cumulativeDailyVisitors);
      // Today's UV must remain independent (Test C)
      expect(stats.visitorsToday).toBe(103);
    });

    // ── R3: Correct Geographic Percentage Denominators ──

    it('calculates country percentage against full known population, not Top 10 sum (R3 Country >10 Test)', async () => {
      const mockDb = createMockD1();
      // 11 known countries with total count = 100
      // Top 10 count sum = 97, 11th country (KR) count = 3
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

      const stats = await getPublicStats(mockDb);

      expect(stats.topGeo).toBeDefined();
      expect(stats.topGeo).toHaveLength(10);

      // Denominator is 100 (full known population).
      // MY: 30 / 100 = 30% (Under old bug: 30 / 97 ≈ 31%)
      expect(stats.topGeo![0].country).toBe('MY');
      expect(stats.topGeo![0].count).toBe(30);
      expect(stats.topGeo![0].percentage).toBe(30);

      // US: 20 / 100 = 20%
      expect(stats.topGeo![1].country).toBe('US');
      expect(stats.topGeo![1].count).toBe(20);
      expect(stats.topGeo![1].percentage).toBe(20);

      // Sum of Top 10 percentages must be strictly less than 100% because tail countries exist
      const top10PctSum = stats.topGeo!.reduce((sum, r) => sum + r.percentage, 0);
      expect(top10PctSum).toBe(97);
      expect(top10PctSum).toBeLessThan(100);
    });

    it('calculates China province percentage against all known CN regions, not Top 10 sum (R3 Province >10 Test)', async () => {
      const mockDb = createMockD1();
      // 11 known CN provinces with total count = 100
      // Top 10 count sum = 97, 11th province (Henan) count = 3
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

      const stats = await getPublicStats(mockDb);

      expect(stats.chinaProvinces).toBeDefined();
      expect(stats.chinaProvinces).toHaveLength(10);

      // Denominator is 100 (full known CN population).
      // Guangdong: 30 / 100 = 30% (Under old bug: 30 / 97 ≈ 31%)
      expect(stats.chinaProvinces![0].province).toBe('Guangdong');
      expect(stats.chinaProvinces![0].count).toBe(30);
      expect(stats.chinaProvinces![0].percentage).toBe(30);

      // Zhejiang: 20 / 100 = 20%
      expect(stats.chinaProvinces![1].province).toBe('Zhejiang');
      expect(stats.chinaProvinces![1].count).toBe(20);
      expect(stats.chinaProvinces![1].percentage).toBe(20);

      // Sum of Top 10 percentages must be strictly less than 100% because 11th province exists
      const top10PctSum = stats.chinaProvinces!.reduce((sum, r) => sum + r.percentage, 0);
      expect(top10PctSum).toBe(97);
      expect(top10PctSum).toBeLessThan(100);
    });

    it('excludes UNKNOWN from country denominator and from topGeo list (R3 UNKNOWN Country Test)', async () => {
      const mockDb = createMockD1();
      // MY = 40, US = 40, UNKNOWN = 20
      mockDb._geoRows.push(
        { date: 'TOTAL', platform: 'all', country: 'MY', region: 'UNKNOWN', count: 40 },
        { date: 'TOTAL', platform: 'all', country: 'US', region: 'UNKNOWN', count: 40 },
        { date: 'TOTAL', platform: 'all', country: 'UNKNOWN', region: 'UNKNOWN', count: 20 },
      );

      const stats = await getPublicStats(mockDb);

      expect(stats.topGeo).toHaveLength(2);
      expect(stats.topGeo!.some((r) => r.country === 'UNKNOWN')).toBe(false);

      // Known geography total = 80 -> MY = 50%, US = 50%
      const my = stats.topGeo!.find((r) => r.country === 'MY')!;
      const us = stats.topGeo!.find((r) => r.country === 'US')!;
      expect(my.count).toBe(40);
      expect(my.percentage).toBe(50);
      expect(us.count).toBe(40);
      expect(us.percentage).toBe(50);
    });

    it('excludes UNKNOWN from province denominator and from chinaProvinces list (R3 UNKNOWN Region Test)', async () => {
      const mockDb = createMockD1();
      // CN / Guangdong = 30, CN / Zhejiang = 30, CN / UNKNOWN = 40
      mockDb._geoRows.push(
        { date: 'TOTAL', platform: 'all', country: 'CN', region: 'Guangdong', count: 30 },
        { date: 'TOTAL', platform: 'all', country: 'CN', region: 'Zhejiang', count: 30 },
        { date: 'TOTAL', platform: 'all', country: 'CN', region: 'UNKNOWN', count: 40 },
      );

      const stats = await getPublicStats(mockDb);

      expect(stats.chinaProvinces).toHaveLength(2);
      expect(stats.chinaProvinces!.some((r) => r.province === 'UNKNOWN')).toBe(false);

      // Known CN province denominator = 60 -> Guangdong = 50%, Zhejiang = 50%
      const gd = stats.chinaProvinces!.find((r) => r.province === 'Guangdong')!;
      const zj = stats.chinaProvinces!.find((r) => r.province === 'Zhejiang')!;
      expect(gd.count).toBe(30);
      expect(gd.percentage).toBe(50);
      expect(zj.count).toBe(30);
      expect(zj.percentage).toBe(50);
    });

    it('returns empty array without dividing by zero or error when no geo data exists (R3 Empty Geo Test)', async () => {
      const mockDb = createMockD1();
      // No geo records
      const stats = await getPublicStats(mockDb);
      expect(stats.topGeo).toEqual([]);
      expect(stats.chinaProvinces).toEqual([]);
    });

    it('preserves Top 10 sorting and count integrity (R3 Ranking and Count Integrity Test)', async () => {
      const mockDb = createMockD1();
      mockDb._geoRows.push(
        { date: 'TOTAL', platform: 'all', country: 'DE', region: 'UNKNOWN', count: 15 },
        { date: 'TOTAL', platform: 'all', country: 'MY', region: 'UNKNOWN', count: 80 },
        { date: 'TOTAL', platform: 'all', country: 'US', region: 'UNKNOWN', count: 50 },
      );

      const stats = await getPublicStats(mockDb);
      expect(stats.topGeo).toHaveLength(3);
      expect(stats.topGeo![0].country).toBe('MY');
      expect(stats.topGeo![0].count).toBe(80);
      expect(stats.topGeo![1].country).toBe('US');
      expect(stats.topGeo![1].count).toBe(50);
      expect(stats.topGeo![2].country).toBe('DE');
    });
  });
});

