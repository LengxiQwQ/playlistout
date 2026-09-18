import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import { qqMusicProvider } from '../providers/qqmusic';
import { neteaseProvider } from '../providers/netease';
import { kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';
import * as qqUser from '../providers/qqmusic/user';
import * as neteaseUser from '../providers/netease/user';
import * as kugouClient from '../providers/kugou/client';
import { ProviderError } from '../models/playlist';
import { resetRateLimitStore } from '../security/rate-limit';
import { recordParseEvent } from './recorder';
import { getPrivateAnalytics, getPublicStats, getUtcDateString } from '../stats';
import {
  RESOLVE_OUTCOMES,
  RESOLVE_FAILURE_CODES,
  RESOLVE_FAILURE_CLASSES,
  RESOLVE_FAILURE_STAGES,
  RESOLVE_REQUESTED_TYPES,
  RESOLVE_REQUESTED_PLATFORMS,
  ANALYTICS_PLATFORMS,
  PROVIDER_FAILURE_PATHS,
  INPUT_TYPES,
} from './types';

interface MockExecutionContext extends ExecutionContext {
  _promises: Promise<any>[];
}

function createMockCtx(): MockExecutionContext {
  const promises: Promise<any>[] = [];
  return {
    waitUntil(p: Promise<any>) {
      promises.push(p);
    },
    passThroughOnException() {},
    _promises: promises,
  } as unknown as MockExecutionContext;
}

interface BoundCall {
  sql: string;
  params: any[];
}

function createTelemetryMockD1() {
  const perfMap = new Map<string, number>(); // key: `${date}::${platform}::${dimension}::${value}`
  const aggMap = new Map<string, number>(); // key: `${date}::${platform}::${metric}`
  const allBinds: BoundCall[] = [];

  const db = {
    _perfMap: perfMap,
    _aggMap: aggMap,
    _allBinds: allBinds,
    prepare(sql: string) {
      return {
        _sql: sql,
        _params: [] as any[],
        bind(...args: any[]) {
          this._params = args;
          allBinds.push({ sql, params: args });
          return this;
        },
        async run() {
          const params = this._params;
          if (sql.includes('daily_performance_stats')) {
            const [date, platform, dim, val] = params;
            const key = `${date}::${platform}::${dim}::${val}`;
            perfMap.set(key, (perfMap.get(key) || 0) + 1);
          } else if (sql.includes('aggregate_stats')) {
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
            const key = `${date}::${platform}::${metric}`;
            aggMap.set(key, (aggMap.get(key) || 0) + increment);
          }
          return { success: true };
        },
        async all() {
          const sql = this._sql as string;
          if (sql.includes('daily_performance_stats')) {
            if (sql.includes("dimension = 'resolve_outcome'") && sql.includes("value = 'failure'")) {
              // GROUP BY platform
              const platCounts = new Map<string, number>();
              for (const [key, count] of perfMap.entries()) {
                const [date, platform, dim, val] = key.split('::');
                if (date !== 'TOTAL' && dim === 'resolve_outcome' && val === 'failure') {
                  platCounts.set(platform, (platCounts.get(platform) || 0) + count);
                }
              }
              const results = Array.from(platCounts.entries()).map(([platform, total]) => ({ platform, total }));
              return { results };
            }

            if (sql.includes('GROUP BY dimension, value')) {
              const dimCounts = new Map<string, number>();
              for (const [key, count] of perfMap.entries()) {
                const [date, , dim, val] = key.split('::');
                if (date !== 'TOTAL') {
                  const subKey = `${dim}::${val}`;
                  dimCounts.set(subKey, (dimCounts.get(subKey) || 0) + count);
                }
              }
              const results = Array.from(dimCounts.entries()).map(([subKey, total]) => {
                const [dimension, value] = subKey.split('::');
                return { dimension, value, total };
              });
              return { results };
            }
          }

          if (sql.includes('aggregate_stats')) {
            if (sql.includes('GROUP BY date, metric')) {
              const threshold = this._params[0];
              const dateMetricCounts = new Map<string, number>();
              for (const [key, count] of aggMap.entries()) {
                const [date, platform, metric] = key.split('::');
                if (platform === 'all' && date !== 'TOTAL' && date >= threshold) {
                  const subKey = `${date}::${metric}`;
                  dateMetricCounts.set(subKey, (dateMetricCounts.get(subKey) || 0) + count);
                }
              }
              const results = Array.from(dateMetricCounts.entries()).map(([subKey, total]) => {
                const [date, metric] = subKey.split('::');
                return { date, metric, total };
              });
              return { results };
            }

            // SELECT date, platform, metric, count FROM aggregate_stats WHERE date IN (?1, ?2)
            const d1 = this._params[0];
            const d2 = this._params[1];
            const results: any[] = [];
            for (const [key, count] of aggMap.entries()) {
              const [date, platform, metric] = key.split('::');
              if (date === d1 || date === d2) {
                results.push({ date, platform, metric, count });
              }
            }
            return { results };
          }

          return { results: [] };
        },
      };
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        await stmt.run();
      }
      return [];
    },
  };

  return db as unknown as D1Database & {
    _perfMap: Map<string, number>;
    _aggMap: Map<string, number>;
    _allBinds: BoundCall[];
  };
}

const mockPlaylistData = (platform: string, id: string, name: string) => ({
  platform,
  id,
  name,
  creator: 'Test Creator',
  coverUrl: 'https://img.test/cover.jpg',
  trackCount: 2,
  tracks: [
    { index: 1, id: 't1', title: 'Song 1', artists: ['Artist 1'], album: 'Album 1', durationMs: 180000 },
    { index: 2, id: 't2', title: 'Song 2', artists: ['Artist 2'], album: 'Album 2', durationMs: 200000 },
  ],
});

const mockUserData = (platform: string, userId: string, nickname: string) => ({
  platform,
  userId,
  nickname,
  total: 1,
  playlists: [
    {
      id: 'p1',
      name: `${nickname} 的歌单`,
      coverUrl: 'https://img.test/user-cover.jpg',
      trackCount: 10,
      sourceUrl: 'https://test.com/p1',
    },
  ],
});

describe('PlaylistOut Insights R7 — Resolve Failure Telemetry (Deterministic Tests A-N)', () => {
  const ADMIN_SECRET = 'valid_insights_secret_r7_test_xyz';

  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimitStore();
  });

  // ── Test A: Numeric 4-probe not found ──
  it('Test A: Numeric 4-probe not found records exactly 1 failure outcome and 0 probe pollution', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    // All probes fail with 404 NOT_FOUND
    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValue(
      new ProviderError('PLAYLIST_NOT_FOUND', 'QQ Playlist not found', 404),
    );
    vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValue(
      new ProviderError('USER_NOT_FOUND', 'QQ User not found', 404),
    );
    vi.spyOn(neteaseProvider, 'parse').mockRejectedValue(
      new ProviderError('PLAYLIST_NOT_FOUND', 'NetEase Playlist not found', 404),
    );
    vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValue(
      new ProviderError('USER_NOT_FOUND', 'NetEase User not found', 404),
    );

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345678');
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(404);
    const body: any = await response.json();
    expect(body.error.code).toBe('PLAYLIST_NOT_FOUND');

    // 1. Authoritative resolve outcome in daily_performance_stats: exactly 1 failure
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_code::playlist_not_found`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_class::not_found`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_stage::disambiguation_probe`)).toBe(1);

    // 2. Zero probe pollution in aggregate_stats
    expect(mockDb._aggMap.get(`${today}::qqmusic::parse_failure`)).toBeUndefined();
    expect(mockDb._aggMap.get(`${today}::netease::parse_failure`)).toBeUndefined();
    expect(mockDb._aggMap.get(`${today}::all::parse_failure`)).toBeUndefined();
  });

  // ── Test B: Operational probe timeout / error ──
  it('Test B: Operational probe failure is attributed to that platform with disambiguation_probe stage', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValue(
      new ProviderError('PLAYLIST_NOT_FOUND', 'QQ Playlist not found', 404),
    );
    vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValue(
      new ProviderError('USER_NOT_FOUND', 'QQ User not found', 404),
    );
    // NetEase has an upstream 504 timeout error
    vi.spyOn(neteaseProvider, 'parse').mockRejectedValue(
      new ProviderError('UPSTREAM_TIMEOUT', 'NetEase gateway timeout', 504),
    );
    vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValue(
      new ProviderError('USER_NOT_FOUND', 'NetEase User not found', 404),
    );

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345678');
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(504);
    const body: any = await response.json();
    expect(body.error.code).toBe('UPSTREAM_TIMEOUT');

    // Attributed to NetEase at stage disambiguation_probe
    expect(mockDb._perfMap.get(`${today}::netease::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::netease::resolve_failure_code::upstream_timeout`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::netease::resolve_failure_class::timeout`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::netease::resolve_failure_stage::disambiguation_probe`)).toBe(1);
  });

  // ── Test C: Ambiguous input 409 ──
  it('Test C: Ambiguous numeric conflict returns 409 and records ambiguous failure class with 0 success outcomes', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    // Multiple probes succeed (QQ and NetEase)
    vi.spyOn(qqMusicProvider, 'parse').mockResolvedValue(
      mockPlaylistData('qqmusic', '12345678', 'QQ Conflict Playlist') as any,
    );
    vi.spyOn(qqUser, 'fetchQQUserPlaylists').mockRejectedValue(
      new ProviderError('USER_NOT_FOUND', 'Not found', 404),
    );
    vi.spyOn(neteaseProvider, 'parse').mockResolvedValue(
      mockPlaylistData('netease', '12345678', 'NetEase Conflict Playlist') as any,
    );
    vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockRejectedValue(
      new ProviderError('USER_NOT_FOUND', 'Not found', 404),
    );

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345678');
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(409);
    const body: any = await response.json();
    expect(body.error.code).toBe('AMBIGUOUS_INPUT');

    expect(mockDb._perfMap.get(`${today}::unknown::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_code::ambiguous_input`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_class::ambiguous`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_outcome::success_playlist`)).toBeUndefined();
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_outcome::success_user`)).toBeUndefined();
  });

  // ── Test D: Input validation error 400 ──
  it('Test D: Input validation error records class input, stage input_validation, and zero raw input leakage', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=%20%20');
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.error.code).toBe('INVALID_INPUT');

    expect(mockDb._perfMap.get(`${today}::unknown::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_code::invalid_input`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_class::input`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::unknown::resolve_failure_stage::input_validation`)).toBe(1);

    // Verify zero raw input leakage in bind parameters
    for (const bind of mockDb._allBinds) {
      for (const p of bind.params) {
        expect(String(p)).not.toContain('%20');
      }
    }
  });

  // ── Test E: Single playlist success ──
  it('Test E: Single playlist success records success_playlist and parse_success exactly once', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    vi.spyOn(qqMusicProvider, 'parse').mockResolvedValue(
      mockPlaylistData('qqmusic', '9044196528', 'My QQ Playlist') as any,
    );

    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/playlist/9044196528',
    );
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.kind).toBe('playlist');

    // Authoritative resolve outcome
    expect(mockDb._perfMap.get(`${today}::qqmusic::resolve_outcome::success_playlist`)).toBe(1);
    // Parse event also recorded for playlist
    expect(mockDb._aggMap.get(`${today}::qqmusic::parse_success`)).toBe(1);
    expect(mockDb._aggMap.get(`${today}::all::parse_success`)).toBe(1);
    expect(mockDb._aggMap.get(`${today}::qqmusic::tracks_processed`)).toBe(2);
  });

  // ── Test F: User profile success ──
  it('Test F: User profile success records success_user without incrementing parse_success or tracks', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    vi.spyOn(neteaseUser, 'fetchNeteaseUserPlaylists').mockResolvedValue(
      mockUserData('netease', '1825474783', 'NetEase User 1825') as any,
    );

    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://music.163.com/user/home?id=1825474783',
    );
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.kind).toBe('user_playlists');

    // Authoritative outcome is success_user
    expect(mockDb._perfMap.get(`${today}::netease::resolve_outcome::success_user`)).toBe(1);

    // CRITICAL: User profiles do NOT increment parse_success or tracks_processed in aggregate_stats!
    expect(mockDb._aggMap.get(`${today}::netease::parse_success`)).toBeUndefined();
    expect(mockDb._aggMap.get(`${today}::all::parse_success`)).toBeUndefined();
    expect(mockDb._aggMap.get(`${today}::netease::tracks_processed`)).toBeUndefined();
  });

  // ── Test G & H: Parse failure global aggregate writes platform='all' and updates operationalRecentDays ──
  it('Test G & H: recordParseEvent failure writes platform=all to aggregate_stats and reflects in operationalRecentDays.failures', async () => {
    const mockDb = createTelemetryMockD1();
    const today = getUtcDateString();

    const req = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=test');
    await recordParseEvent(mockDb, {
      request: req,
      platform: 'kugou',
      inputType: 'web_url',
      success: false,
      errorCategory: 'error_upstream',
      latencyMs: 1200,
    });

    // 1. Both platform-specific and 'all' written for parse_failure
    expect(mockDb._aggMap.get(`${today}::kugou::parse_failure`)).toBe(1);
    expect(mockDb._aggMap.get(`TOTAL::kugou::parse_failure`)).toBe(1);
    expect(mockDb._aggMap.get(`${today}::all::parse_failure`)).toBe(1);
    expect(mockDb._aggMap.get(`TOTAL::all::parse_failure`)).toBe(1);

    // 2. Verified via getPrivateAnalytics operationalRecentDays
    const analytics = await getPrivateAnalytics(mockDb);
    expect(analytics.operationalRecentDays).toBeDefined();
    const todayEntry = analytics.operationalRecentDays.find((d) => d.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry?.failures).toBe(1);
  });

  // ── Test I: Telemetry DB failure resilience ──
  it('Test I: D1 failure during resolve telemetry recording does not alter API response or status code', async () => {
    const failingDb = {
      prepare() {
        throw new Error('D1 database unreachable');
      },
      batch() {
        throw new Error('D1 database unreachable');
      },
    } as unknown as D1Database;

    const ctx = createMockCtx();
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=%20');

    // Should complete cleanly with 400 INVALID_INPUT without unhandled throw
    const response = await worker.fetch(request, { DB: failingDb }, ctx);
    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  // ── Test J: Privacy sentinel ──
  it('Test J: D1 parameters never contain raw URLs, playlist IDs, tokens, user queries, or error messages', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();

    const secretToken = 'super_secret_user_token_9999';
    const targetPlaylistUrl = 'https://y.qq.com/n/ryqq/playlist/9044196528?foo=bar';

    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValue(
      new ProviderError('UPSTREAM_ERROR', 'Sensitive upstream internal details here', 500),
    );

    const request = new Request(
      `https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=${encodeURIComponent(targetPlaylistUrl)}`,
      { headers: { Authorization: `Bearer ${secretToken}` } },
    );

    await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    const forbiddenSubstrings = [
      secretToken,
      targetPlaylistUrl,
      '9044196528',
      'y.qq.com',
      'Sensitive upstream internal details here',
      'Bearer',
      'http://',
      'https://',
    ];

    for (const bind of mockDb._allBinds) {
      for (const param of bind.params) {
        const paramStr = String(param);
        for (const forbidden of forbiddenSubstrings) {
          expect(paramStr).not.toContain(forbidden);
        }
      }
    }
  });

  // ── Test K: Finite cardinality assertion across all dimensions ──
  it('Test K: All recorded dimensions and values in daily_performance_stats belong to bounded enum sets', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();

    // Trigger resolve failure
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=bad_input&platform=qqmusic&type=playlist');
    await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    for (const key of mockDb._perfMap.keys()) {
      const [date, platform, dimension, value] = key.split('::');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$|^TOTAL$/);
      expect((ANALYTICS_PLATFORMS as readonly string[]).includes(platform)).toBe(true);

      if (dimension === 'resolve_outcome') {
        expect((RESOLVE_OUTCOMES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'resolve_failure_code') {
        expect((RESOLVE_FAILURE_CODES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'resolve_failure_class') {
        expect((RESOLVE_FAILURE_CLASSES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'resolve_failure_stage') {
        expect((RESOLVE_FAILURE_STAGES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'resolve_requested_type') {
        expect((RESOLVE_REQUESTED_TYPES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'resolve_requested_platform') {
        expect((RESOLVE_REQUESTED_PLATFORMS as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'resolve_input_type') {
        expect((INPUT_TYPES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'provider_failure_path') {
        expect((PROVIDER_FAILURE_PATHS as readonly string[]).includes(value)).toBe(true);
      }
    }
  });

  // ── Test L: R6 Public Boundary (0 R7 private keys in public stats) ──
  it('Test L: GET /api/stats and GET /api/v1/stats strictly contain 0 R7 private keys', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();

    // Public /api/stats
    const req1 = new Request('https://playlistout-api.lengxiqwq.com/api/stats');
    const res1 = await worker.fetch(req1, { DB: mockDb }, ctx);
    const body1: any = await res1.json();
    expect(body1.success).toBe(true);

    const r7Keys = [
      'resolveOutcomes',
      'resolveFailureCodes',
      'resolveFailureClasses',
      'resolveFailureStages',
      'resolveRequestedTypes',
      'resolveRequestedPlatforms',
      'resolveInputTypes',
      'resolveInputTypeDistribution',
      'resolveFailuresByPlatform',
      'providerFailurePaths',
      'resolveOutcomeDistribution',
      'resolveFailureCodeDistribution',
    ];

    for (const key of r7Keys) {
      expect(body1.data[key]).toBeUndefined();
    }

    // Public /api/v1/stats
    const req2 = new Request('https://playlistout-api.lengxiqwq.com/api/v1/stats');
    const res2 = await worker.fetch(req2, { DB: mockDb }, ctx);
    const body2: any = await res2.json();
    expect(body2.success).toBe(true);

    for (const key of r7Keys) {
      expect(body2.data[key]).toBeUndefined();
    }
  });

  // ── Test M: Private Positive (Authenticated internal endpoint returns all R7 dimensions) ──
  it('Test M: GET /api/internal/stats returns all R7 failure telemetry arrays including resolveInputTypes', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    // Seed some performance stats
    mockDb._perfMap.set(`${today}::qqmusic::resolve_outcome::failure`, 4);
    mockDb._perfMap.set(`${today}::netease::resolve_outcome::failure`, 2);
    mockDb._perfMap.set(`${today}::all::resolve_failure_code::playlist_not_found`, 5);
    mockDb._perfMap.set(`${today}::all::resolve_failure_class::not_found`, 5);
    mockDb._perfMap.set(`${today}::all::resolve_failure_stage::provider_fetch`, 3);
    mockDb._perfMap.set(`${today}::all::resolve_requested_type::playlist`, 4);
    mockDb._perfMap.set(`${today}::all::resolve_requested_platform::auto`, 6);
    mockDb._perfMap.set(`${today}::all::resolve_input_type::web_url`, 3);
    mockDb._perfMap.set(`${today}::qqmusic::provider_failure_path::primary`, 1);

    const req = new Request('https://playlistout-api.lengxiqwq.com/api/internal/stats', {
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    const res = await worker.fetch(req, { DB: mockDb, INSIGHTS_ADMIN_TOKEN: ADMIN_SECRET }, ctx);
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(body.success).toBe(true);
    const ins = body.data.insights;

    // All R7 arrays must be present
    expect(Array.isArray(ins.resolveOutcomes)).toBe(true);
    expect(Array.isArray(ins.resolveFailureCodes)).toBe(true);
    expect(Array.isArray(ins.resolveFailureClasses)).toBe(true);
    expect(Array.isArray(ins.resolveFailureStages)).toBe(true);
    expect(Array.isArray(ins.resolveRequestedTypes)).toBe(true);
    expect(Array.isArray(ins.resolveRequestedPlatforms)).toBe(true);
    expect(Array.isArray(ins.resolveInputTypes)).toBe(true);
    expect(Array.isArray(ins.resolveInputTypeDistribution)).toBe(true);
    expect(Array.isArray(ins.resolveFailuresByPlatform)).toBe(true);
    expect(Array.isArray(ins.providerFailurePaths)).toBe(true);

    // Verify content of resolveFailuresByPlatform
    const qqFailures = ins.resolveFailuresByPlatform.find((x: any) => x.name === 'qqmusic');
    expect(qqFailures).toBeDefined();
    expect(qqFailures.count).toBe(4);

    // Verify content of resolveInputTypes
    const inputTypeItem = ins.resolveInputTypes.find((x: any) => x.name === 'web_url');
    expect(inputTypeItem).toBeDefined();
    expect(inputTypeItem.count).toBe(3);
  });

  // ── Test N: ProviderError telemetry metadata never leaks into API JSON response envelope ──
  it('Test N: ProviderError telemetry property is stripped and never leaks into JSON response', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();

    const providerErr = new ProviderError('PARSE_ERROR', 'Failed to parse playlist body', 422);
    providerErr.telemetry = {
      platform: 'qqmusic',
      stage: 'provider_fetch',
      providerFailurePath: 'fallback',
    };

    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValue(providerErr);

    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/playlist/9044196528',
    );
    const response = await worker.fetch(request, { DB: mockDb }, ctx);

    expect(response.status).toBe(422);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('PARSE_ERROR');
    expect(body.error.message).toBe('Failed to parse playlist body');

    // Telemetry property must NOT be present on error or body
    expect(body.error.telemetry).toBeUndefined();
    expect(body.telemetry).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('providerFailurePath');
    expect(JSON.stringify(body)).not.toContain('provider_fetch');
  });

  // ── Test O: Adversarial stage normalization bounds arbitrary string to finalization ──
  it('Test O: Malicious or unlisted telemetry stage is safely normalized to finalization', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();
    const today = getUtcDateString();

    const providerErr = new ProviderError('PARSE_ERROR', 'Crash', 422);
    providerErr.telemetry = {
      platform: 'qqmusic',
      stage: 'malicious_sql_injection_or_unbounded_stage' as any,
    };

    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValue(providerErr);

    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=https://y.qq.com/n/ryqq/playlist/9044196528',
    );
    await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    // Stage must be bounded strictly to 'finalization'
    expect(mockDb._perfMap.get(`${today}::qqmusic::resolve_failure_stage::finalization`)).toBe(1);
    expect(mockDb._perfMap.get(`${today}::qqmusic::resolve_failure_stage::malicious_sql_injection_or_unbounded_stage`)).toBeUndefined();
  });
});
