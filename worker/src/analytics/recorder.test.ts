import { describe, it, expect, vi } from 'vitest';
import { recordParseEvent, recordExportEvent } from './recorder';
import type { ParseAnalyticsContext, ExportFormat } from './types';
import { getUtcDateString } from '../stats';

// Mock in-memory D1 Database for deterministic testing
function createMockD1() {
  const store = new Map<string, number>();
  const eventRows: any[] = [];

  const db = {
    _store: store,
    _eventRows: eventRows,
    prepare(sql: string) {
      return {
        _sql: sql,
        _params: [] as any[],
        bind(...args: any[]) {
          this._params = args;
          return this;
        },
        async run() {
          // If this is an analytics_events or daily_export_stats INSERT
          if (this._sql.includes('analytics_events')) {
            eventRows.push({ params: [...this._params], sql: this._sql });
          }
          if (this._sql.includes('daily_export_stats')) {
            const [date, platform, format] = this._params;
            const key = `export::${date}::${platform}::${format}`;
            store.set(key, (store.get(key) || 0) + 1);
          }
          return { success: true };
        },
        async all() {
          const results: any[] = [];
          for (const [key, count] of store.entries()) {
            if (key.startsWith('export::')) continue;
            const [date, platform, metric] = key.split('::');
            results.push({ date, platform, metric, count });
          }
          return { results };
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        const sql = stmt._sql as string;
        if (sql.includes('tracks_processed') || sql.includes('exports_total')) {
          // track_count upsert — the count is passed as a bind param
          const params = stmt._params;
          const date = params[0];
          const platform = params[1];
          const metric = sql.includes('tracks_processed') ? 'tracks_processed' : 'exports_total';
          const increment = params[2] ?? 1;
          const key = `${date}::${platform}::${metric}`;
          store.set(key, (store.get(key) || 0) + increment);
        } else if (sql.includes('daily_export_stats')) {
          const [date, platform, format] = stmt._params;
          const key = `export::${date}::${platform}::${format}`;
          store.set(key, (store.get(key) || 0) + 1);
        } else {
          // Standard aggregate_stats upsert
          const [date, platform, metric] = stmt._params;
          const key = `${date}::${platform}::${metric}`;
          store.set(key, (store.get(key) || 0) + 1);
        }
      }
      return [];
    },
  };

  return db as unknown as D1Database & { _store: Map<string, number>; _eventRows: any[] };
}

function createMockRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://api.playlistout.com/api/playlist?url=test', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      ...headers,
    },
  });
}

describe('Analytics Recorder', () => {
  describe('recordParseEvent', () => {
    it('records aggregate counters and analytics event for successful parse', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      await recordParseEvent(mockDb, {
        request: createMockRequest(),
        platform: 'qqmusic',
        inputType: 'web_url',
        success: true,
        trackCount: 42,
        latencyMs: 1500,
        providerPath: 'primary',
      });

      // Verify aggregate counters
      expect(mockDb._store.get(`${today}::qqmusic::parse_success`)).toBe(1);
      expect(mockDb._store.get(`TOTAL::qqmusic::parse_success`)).toBe(1);
      expect(mockDb._store.get(`${today}::all::parse_success`)).toBe(1);
      expect(mockDb._store.get(`TOTAL::all::parse_success`)).toBe(1);

      // Verify track count aggregation
      expect(mockDb._store.get(`${today}::qqmusic::tracks_processed`)).toBe(42);
      expect(mockDb._store.get(`TOTAL::qqmusic::tracks_processed`)).toBe(42);
      expect(mockDb._store.get(`TOTAL::all::tracks_processed`)).toBe(42);

      // Verify analytics event was recorded
      expect(mockDb._eventRows.length).toBe(1);
      const event = mockDb._eventRows[0];
      expect(event.params).toContain('qqmusic');
      expect(event.params).toContain('success');
    });

    it('records failure without track counts and with error category', async () => {
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

      expect(mockDb._store.get(`${today}::qqmusic::parse_failure`)).toBe(1);
      expect(mockDb._store.get(`TOTAL::qqmusic::parse_failure`)).toBe(1);
      // No track counts for failure
      expect(mockDb._store.get(`${today}::qqmusic::tracks_processed`)).toBeUndefined();
    });

    it('handles D1 failure gracefully (never throws)', async () => {
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

    it('handles undefined DB gracefully', async () => {
      await expect(
        recordParseEvent(undefined, {
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

  describe('recordExportEvent', () => {
    it('records export aggregate counters and analytics event', async () => {
      const mockDb = createMockD1();
      const today = getUtcDateString();

      await recordExportEvent(
        mockDb,
        createMockRequest(),
        'qqmusic',
        'xlsx' as ExportFormat,
        'export',
        42,
      );

      // Verify export aggregate counters
      expect(mockDb._store.get(`${today}::qqmusic::exports_total`)).toBe(1);
      expect(mockDb._store.get(`TOTAL::qqmusic::exports_total`)).toBe(1);
      expect(mockDb._store.get(`${today}::all::exports_total`)).toBe(1);
      expect(mockDb._store.get(`TOTAL::all::exports_total`)).toBe(1);

      // Verify export format breakdown
      expect(mockDb._store.get(`export::${today}::qqmusic::xlsx`)).toBe(1);
      expect(mockDb._store.get(`export::TOTAL::qqmusic::xlsx`)).toBe(1);

      // Verify analytics event was recorded
      expect(mockDb._eventRows.length).toBe(1);
    });

    it('records clipboard event correctly', async () => {
      const mockDb = createMockD1();

      await recordExportEvent(
        mockDb,
        createMockRequest(),
        'qqmusic',
        'clipboard_title_artist' as ExportFormat,
        'clipboard',
        10,
      );

      expect(mockDb._eventRows.length).toBe(1);
    });

    it('handles D1 failure gracefully (never throws)', async () => {
      const failingDb = {
        prepare() { throw new Error('D1 disconnected'); },
        async batch() { throw new Error('D1 disconnected'); },
      } as unknown as D1Database;

      await expect(
        recordExportEvent(failingDb, createMockRequest(), 'qqmusic', 'txt' as ExportFormat, 'export', 5),
      ).resolves.not.toThrow();
    });
  });

  describe('Privacy boundary', () => {
    it('never stores raw IP, playlist URL, or song content in aggregate keys', async () => {
      const mockDb = createMockD1();

      await recordParseEvent(mockDb, {
        request: createMockRequest(),
        platform: 'qqmusic',
        inputType: 'web_url',
        success: true,
        trackCount: 42,
        latencyMs: 1500,
      });

      for (const key of mockDb._store.keys()) {
        expect(key).not.toContain('http');
        expect(key).not.toContain('y.qq.com');
        expect(key).not.toContain('127.0.0.1');
        expect(key).not.toContain('playlist');
        expect(key).not.toContain('song');
      }
    });

    it('does not store full User-Agent string in analytics events', async () => {
      const mockDb = createMockD1();
      const fullUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

      await recordParseEvent(mockDb, {
        request: createMockRequest({ 'User-Agent': fullUA }),
        platform: 'qqmusic',
        inputType: 'web_url',
        success: true,
        trackCount: 10,
        latencyMs: 100,
      });

      // The event params should contain coarse categories, not the full UA
      if (mockDb._eventRows.length > 0) {
        const params = mockDb._eventRows[0].params;
        const paramsStr = JSON.stringify(params);
        expect(paramsStr).not.toContain('Mozilla');
        expect(paramsStr).not.toContain('AppleWebKit');
        expect(paramsStr).not.toContain('537.36');
        // But should contain coarse classifications
        expect(paramsStr).toContain('desktop');
        expect(paramsStr).toContain('chrome');
        expect(paramsStr).toContain('windows');
      }
    });
  });
});
