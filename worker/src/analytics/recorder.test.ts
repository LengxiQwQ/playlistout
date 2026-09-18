import { describe, it, expect } from 'vitest';
import {
  recordParseEvent,
  recordExportEvent,
  recordClipboardEvent,
  recordRateLimitEvent,
  recordVisitEvent,
  computeVisitorHash,
  normalizeClipboardMode,
} from './recorder';
import type { ExportFormat, ClipboardMode } from './types';
import { getUtcDateString } from '../stats';

// Mock in-memory D1 Database for aggregate testing
function createMockD1() {
  const store = new Map<string, number>();
  const insertedHashes = new Set<string>();

  const db = {
    _store: store,
    _insertedHashes: insertedHashes,
    prepare(sql: string) {
      return {
        _sql: sql,
        _params: [] as any[],
        bind(...args: any[]) {
          this._params = args;
          return this;
        },
        async run() {
          if (sql.includes('daily_visitor_hashes')) {
            const key = `${this._params[0]}::${this._params[1]}`;
            if (insertedHashes.has(key)) {
              return { success: true, meta: { changes: 0 } };
            }
            insertedHashes.add(key);
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 1 } };
        },
        async all() {
          return { results: [] };
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        const sql = stmt._sql as string;
        const params = stmt._params;

        if (sql.includes('aggregate_stats')) {
          let date: string;
          let platform: string;
          let metric: string;
          let increment = 1;

          if (sql.includes("'all'")) {
            date = params[0];
            platform = 'all';
            metric = params[1];
          } else {
            date = params[0];
            platform = params[1];
            metric = sql.includes('tracks_processed') ? 'tracks_processed' : params[2];
            increment = sql.includes('tracks_processed') ? (params[2] ?? 1) : 1;
          }
          const key = `agg::${date}::${platform}::${metric}`;
          store.set(key, (store.get(key) || 0) + increment);
        } else if (sql.includes('hourly_stats')) {
          const [date, hour, platform, metric] = params;
          const key = `hourly::${date}::${hour}::${platform}::${metric}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else if (sql.includes('daily_geo_stats')) {
          let date: string, platform: string, country: string, region: string, city: string;
          if (sql.includes("'all'")) {
            [date, country, region, city] = params;
            platform = 'all';
          } else {
            [date, platform, country, region, city] = params;
          }
          const key = `geo::${date}::${platform}::${country}::${region}::${city || 'UNKNOWN'}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else if (sql.includes('daily_client_stats')) {
          let date: string, platform: string, dev: string, browser: string, os: string;
          if (sql.includes("'all'")) {
            [date, dev, browser, os] = params;
            platform = 'all';
          } else {
            [date, platform, dev, browser, os] = params;
          }
          const key = `client::${date}::${platform}::${dev}::${browser}::${os}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else if (sql.includes('daily_performance_stats')) {
          let date: string, platform: string, dim: string, val: string;
          if (params.length === 3) {
            [date, dim, val] = params;
            platform = 'all';
          } else {
            [date, platform, dim, val] = params;
          }
          const key = `perf::${date}::${platform}::${dim}::${val}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else if (sql.includes('daily_export_stats')) {
          const [date, platform, format] = params;
          const key = `export::${date}::${platform}::${format}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else if (sql.includes('daily_clipboard_stats')) {
          const [date, platform, mode] = params;
          const key = `clipboard::${date}::${platform}::${mode}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else if (sql.includes('daily_visitor_hashes') && sql.includes('DELETE')) {
          const cutoff = params[0];
          for (const key of Array.from(insertedHashes)) {
            const datePart = key.split('::')[0];
            if (datePart < cutoff) {
              insertedHashes.delete(key);
            }
          }
        }
      }
      return [];
    },
  };

  return db as unknown as D1Database & { _store: Map<string, number>; _insertedHashes: Set<string> };
}

function createMockRequest(headers: Record<string, string> = {}, cf?: any): Request {
  const req = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=test', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      ...headers,
    },
  });
  if (cf) {
    (req as any).cf = cf;
  }
  return req;
}

describe('Analytics Recorder (Pure Aggregate Architecture)', () => {
  describe('normalizeClipboardMode', () => {
    it('normalizes hyphenated modes to canonical underscore format', () => {
      expect(normalizeClipboardMode('title')).toBe('title');
      expect(normalizeClipboardMode('title-artist')).toBe('title_artist');
      expect(normalizeClipboardMode('title_artist')).toBe('title_artist');
      expect(normalizeClipboardMode('title-artist-album')).toBe('title_artist_album');
      expect(normalizeClipboardMode('title_artist_album')).toBe('title_artist_album');
    });
  });

  describe('recordParseEvent', () => {
    it('records pure atomic aggregate counters across tables without per-request log rows', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();
      const hour = new Date().getUTCHours();

      await recordParseEvent(mockDb, {
        request: createMockRequest({}, { country: 'CN', region: 'Beijing', city: 'Beijing' }),
        platform: 'qqmusic',
        inputType: 'web_url',
        success: true,
        trackCount: 42,
        latencyMs: 1500,
        providerPath: 'primary',
      });

      // 1. aggregate_stats
      expect(mockDb._store.get(`agg::${today}::qqmusic::parse_success`)).toBe(1);
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::parse_success`)).toBe(1);
      expect(mockDb._store.get(`agg::${today}::all::parse_success`)).toBe(1);
      expect(mockDb._store.get(`agg::TOTAL::all::parse_success`)).toBe(1);

      // Track totals
      expect(mockDb._store.get(`agg::${today}::qqmusic::tracks_processed`)).toBe(42);
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::tracks_processed`)).toBe(42);

      // 2. hourly_stats
      expect(mockDb._store.get(`hourly::${today}::${hour}::qqmusic::parse_success`)).toBe(1);
      expect(mockDb._store.get(`hourly::${today}::${hour}::all::parse_success`)).toBe(1);

      // 3. daily_geo_stats
      expect(mockDb._store.get(`geo::${today}::qqmusic::CN::Beijing::Beijing`)).toBe(1);
      expect(mockDb._store.get(`geo::TOTAL::qqmusic::CN::Beijing::Beijing`)).toBe(1);

      // 4. daily_client_stats
      expect(mockDb._store.get(`client::${today}::qqmusic::desktop::chrome::windows`)).toBe(1);
      expect(mockDb._store.get(`client::TOTAL::qqmusic::desktop::chrome::windows`)).toBe(1);

      // 5. daily_performance_stats
      expect(mockDb._store.get(`perf::${today}::qqmusic::input_type::web_url`)).toBe(1);
      expect(mockDb._store.get(`perf::${today}::qqmusic::playlist_size::1-50`)).toBe(1);
      expect(mockDb._store.get(`perf::${today}::qqmusic::provider_path::primary`)).toBe(1);
      expect(mockDb._store.get(`perf::${today}::qqmusic::latency_bucket::1-3s`)).toBe(1);
    });

    it('records parse failures with error category and no track counts', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      await recordParseEvent(mockDb, {
        request: createMockRequest(),
        platform: 'qqmusic',
        inputType: 'raw_id',
        success: false,
        errorCategory: 'error_upstream',
        latencyMs: 5500,
      });

      expect(mockDb._store.get(`agg::${today}::qqmusic::parse_failure`)).toBe(1);
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::parse_failure`)).toBe(1);
      expect(mockDb._store.get(`agg::${today}::qqmusic::tracks_processed`)).toBeUndefined();
      expect(mockDb._store.get(`perf::${today}::qqmusic::error_category::error_upstream`)).toBe(1);
      expect(mockDb._store.get(`perf::${today}::qqmusic::latency_bucket::5s+`)).toBe(1);
      // Ensure no fake provider path is recorded on failure
      expect(mockDb._store.get(`perf::${today}::qqmusic::provider_path::primary`)).toBeUndefined();
    });

    it('handles D1 failure gracefully (best-effort guarantee)', async () => {
      const failingDb = {
        prepare() { throw new Error('D1 disconnected'); },
        async batch() { throw new Error('D1 disconnected'); },
      } as unknown as D1Database;

      await expect(
        recordParseEvent(failingDb, {
          request: createMockRequest(),
          platform: 'qqmusic',
          inputType: 'web_url',
          success: true,
          trackCount: 10,
          latencyMs: 100,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('recordExportEvent vs recordClipboardEvent separation', () => {
    it('recordExportEvent increments exports_total and daily_export_stats ONLY', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      await recordExportEvent(
        mockDb,
        createMockRequest(),
        'qqmusic',
        'xlsx' as ExportFormat,
        42,
      );

      // aggregate_stats
      expect(mockDb._store.get(`agg::${today}::qqmusic::exports_total`)).toBe(1);
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::exports_total`)).toBe(1);

      // daily_export_stats
      expect(mockDb._store.get(`export::${today}::qqmusic::xlsx`)).toBe(1);
      expect(mockDb._store.get(`export::TOTAL::qqmusic::xlsx`)).toBe(1);

      // Must NOT increment clipboards_total or daily_clipboard_stats!
      expect(mockDb._store.get(`agg::${today}::qqmusic::clipboards_total`)).toBeUndefined();
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::clipboards_total`)).toBeUndefined();
      for (const key of mockDb._store.keys()) {
        expect(key).not.toContain('clipboard::');
      }
    });

    it('recordClipboardEvent increments clipboards_total and daily_clipboard_stats ONLY', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      await recordClipboardEvent(
        mockDb,
        createMockRequest(),
        'qqmusic',
        'title-artist' as ClipboardMode,
        15,
      );

      // aggregate_stats
      expect(mockDb._store.get(`agg::${today}::qqmusic::clipboards_total`)).toBe(1);
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::clipboards_total`)).toBe(1);

      // daily_clipboard_stats
      expect(mockDb._store.get(`clipboard::${today}::qqmusic::title_artist`)).toBe(1);
      expect(mockDb._store.get(`clipboard::TOTAL::qqmusic::title_artist`)).toBe(1);

      // Must NOT increment exports_total or daily_export_stats!
      expect(mockDb._store.get(`agg::${today}::qqmusic::exports_total`)).toBeUndefined();
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::exports_total`)).toBeUndefined();
      for (const key of mockDb._store.keys()) {
        expect(key).not.toContain('export::');
      }
    });
  });

  describe('recordRateLimitEvent', () => {
    it('records anonymous rate limit metrics', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();
      const hour = new Date().getUTCHours();

      await recordRateLimitEvent(mockDb, 'playlist', 'qqmusic');

      expect(mockDb._store.get(`agg::${today}::qqmusic::rate_limited`)).toBe(1);
      expect(mockDb._store.get(`agg::TOTAL::qqmusic::rate_limited`)).toBe(1);
      expect(mockDb._store.get(`hourly::${today}::${hour}::qqmusic::rate_limited`)).toBe(1);
      expect(mockDb._store.get(`perf::${today}::qqmusic::rate_limit_endpoint::playlist`)).toBe(1);

      // Verify no IP is in store keys
      for (const key of mockDb._store.keys()) {
        expect(key).not.toContain('127.0.0.1');
        expect(key).not.toContain('ip');
      }
    });
  });

  describe('recordVisitEvent & computeVisitorHash (Server-Observed UA & UV Deduplication)', () => {
    it('generates distinct 16-char hashes for different user-agents on the same IP', async () => {
      const date = '2026-09-15';
      const ip = '198.51.100.1';
      const hashPhone = await computeVisitorHash(date, ip, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
      const hashLaptop = await computeVisitorHash(date, ip, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0');
      expect(hashPhone).not.toBe(hashLaptop);
      expect(hashPhone).toHaveLength(16);
      expect(hashLaptop).toHaveLength(16);
    });

    it('records unique visitors for multiple user agents on the same IP (same Wi-Fi)', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();
      const ip = '198.51.100.1';

      // Device 1 (e.g. iPhone)
      await recordVisitEvent(
        mockDb,
        createMockRequest({ 'cf-connecting-ip': ip, 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }),
      );

      // Device 2 (e.g. Laptop on same Wi-Fi)
      await recordVisitEvent(
        mockDb,
        createMockRequest({ 'cf-connecting-ip': ip, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }),
      );

      // Both devices counted as unique visitors
      expect(mockDb._store.get(`agg::${today}::all::visitor_unique`)).toBe(2);
      expect(mockDb._store.get(`agg::TOTAL::all::visitor_unique`)).toBe(2);
      expect(mockDb._store.get(`agg::${today}::all::page_view`)).toBe(2);

      // Device 1 refreshes the page
      await recordVisitEvent(
        mockDb,
        createMockRequest({ 'cf-connecting-ip': ip, 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }),
      );

      // visitor_unique does NOT increase, page_view DOES increase
      expect(mockDb._store.get(`agg::${today}::all::visitor_unique`)).toBe(2);
      expect(mockDb._store.get(`agg::TOTAL::all::visitor_unique`)).toBe(2);
      expect(mockDb._store.get(`agg::${today}::all::page_view`)).toBe(3);
    });

    it('prunes ephemeral visitor hashes older than 7 days', async () => {
      const mockDb = createMockD1();
      const tenDaysAgo = new Date(Date.now() - 10 * 86400 * 1000).toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 1 * 86400 * 1000).toISOString().slice(0, 10);
      mockDb._insertedHashes.add(`${tenDaysAgo}::oldhash12345678`);
      mockDb._insertedHashes.add(`${yesterday}::recenthash12345`);

      await recordVisitEvent(
        mockDb,
        createMockRequest({ 'cf-connecting-ip': '1.2.3.4' }),
      );

      // Old hash should be deleted, recent hash preserved
      expect(mockDb._insertedHashes.has(`${tenDaysAgo}::oldhash12345678`)).toBe(false);
      expect(mockDb._insertedHashes.has(`${yesterday}::recenthash12345`)).toBe(true);
    });

    it('records coarse referrerSource without raw URLs, paths, queries, or headers', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      await recordVisitEvent(
        mockDb,
        createMockRequest({ 'cf-connecting-ip': '1.2.3.4' }),
        'chatgpt',
      );

      // Verify that coarse category was recorded in performance stats
      expect(mockDb._store.get(`perf::${today}::all::referrer_source::chatgpt`)).toBe(1);
      expect(mockDb._store.get(`perf::TOTAL::all::referrer_source::chatgpt`)).toBe(1);

      // Verify unlisted category is normalized to other_web
      await recordVisitEvent(
        mockDb,
        createMockRequest({ 'cf-connecting-ip': '1.2.3.5' }),
        'unknown_random_category' as any,
      );

      expect(mockDb._store.get(`perf::${today}::all::referrer_source::other_web`)).toBe(1);
      expect(mockDb._store.get(`perf::TOTAL::all::referrer_source::other_web`)).toBe(1);

      // CRITICAL PRIVACY ASSERTION: Zero raw URLs, queries, paths, or tokens in D1 keys
      for (const key of mockDb._store.keys()) {
        expect(key).not.toContain('http');
        expect(key).not.toContain('https');
        expect(key).not.toContain('://');
        expect(key).not.toContain('?');
        expect(key).not.toContain('&');
        expect(key).not.toContain('token');
        expect(key).not.toContain('secret');
      }
    });
  });

  describe('Privacy boundary verification', () => {
    it('strictly does not store raw IP, URL, or song content in any aggregate key', async () => {
      const mockDb = createMockD1();

      await recordParseEvent(mockDb, {
        request: createMockRequest({ 'cf-connecting-ip': '1.2.3.4' }),
        platform: 'qqmusic',
        inputType: 'web_url',
        success: true,
        trackCount: 42,
        latencyMs: 500,
      });

      for (const key of mockDb._store.keys()) {
        expect(key).not.toContain('1.2.3.4');
        expect(key).not.toContain('http');
        expect(key).not.toContain('y.qq.com');
        expect(key).not.toContain('song');
        expect(key).not.toContain('test');
      }
    });
  });
});
