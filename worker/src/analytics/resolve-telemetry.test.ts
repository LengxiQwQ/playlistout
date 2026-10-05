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
import { getUtcDateString } from '../stats';
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
  const v2CoreMap = new Map<string, number>(); // key: `${date}::${platform}::${metric}`
  const v2BreakdownMap = new Map<string, number>(); // key: `${date}::${platform}::${dimension}::${value}`
  const allBinds: BoundCall[] = [];

  const db = {
    _v2CoreMap: v2CoreMap,
    _v2BreakdownMap: v2BreakdownMap,
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
          if (sql.includes('analytics_v2_daily_core')) {
            const [date, , , platform, metric, increment] = params;
            const key = `${date}::${platform}::${metric}`;
            v2CoreMap.set(key, (v2CoreMap.get(key) || 0) + Number(increment || 0));
          } else if (sql.includes('analytics_v2_breakdown')) {
            const [date, , , platform, dimension, value, increment] = params;
            const key = `${date}::${platform}::${dimension}::${value}`;
            v2BreakdownMap.set(key, (v2BreakdownMap.get(key) || 0) + Number(increment || 0));
          }
          return { success: true };
        },
        async all() {
          const sql = this._sql as string;

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
    _v2CoreMap: Map<string, number>;
    _v2BreakdownMap: Map<string, number>;
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
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_code::playlist_not_found`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_class::not_found`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_stage::disambiguation_probe`)).toBe(1);

    // 2. Zero legacy/probe pollution: only V2 tables may be written.
    expect(mockDb._allBinds.some((bind) => bind.sql.includes('aggregate_stats'))).toBe(false);
    expect(mockDb._allBinds.some((bind) => bind.sql.includes('daily_performance_stats'))).toBe(false);
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
    expect(mockDb._v2BreakdownMap.get(`${today}::netease::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::netease::failure_code::upstream_timeout`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::netease::failure_class::timeout`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::netease::failure_stage::disambiguation_probe`)).toBe(1);
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

    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_code::ambiguous_input`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_class::ambiguous`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::resolve_outcome::success_playlist`)).toBeUndefined();
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::resolve_outcome::success_user`)).toBeUndefined();
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

    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::resolve_outcome::failure`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_code::invalid_input`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_class::input`)).toBe(1);
    expect(mockDb._v2BreakdownMap.get(`${today}::unknown::failure_stage::input_validation`)).toBe(1);

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
      {
        headers: { Origin: 'https://playlistout.com', 'Sec-Fetch-Site': 'same-site' },
      },
    );
    const response = await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.kind).toBe('playlist');

    // Authoritative resolve outcome
    expect(mockDb._v2BreakdownMap.get(`${today}::qqmusic::resolve_outcome::success_playlist`)).toBe(1);
    // V2 core event is recorded exactly once without legacy all/TOTAL rollups.
    expect(mockDb._v2CoreMap.get(`${today}::qqmusic::resolve_request`)).toBe(1);
    expect(mockDb._v2CoreMap.get(`${today}::qqmusic::playlist_success`)).toBe(1);
    expect(mockDb._v2CoreMap.get(`${today}::qqmusic::tracks_processed`)).toBe(2);
    expect(mockDb._allBinds.some((bind) => bind.sql.includes('aggregate_stats'))).toBe(false);
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
    expect(mockDb._v2BreakdownMap.get(`${today}::netease::resolve_outcome::success_user`)).toBe(1);

    // CRITICAL: user profiles increment user_success, never playlist_success/tracks.
    expect(mockDb._v2CoreMap.get(`${today}::netease::resolve_request`)).toBe(1);
    expect(mockDb._v2CoreMap.get(`${today}::netease::user_success`)).toBe(1);
    expect(mockDb._v2CoreMap.get(`${today}::netease::playlist_success`)).toBeUndefined();
    expect(mockDb._v2CoreMap.get(`${today}::netease::tracks_processed`)).toBeUndefined();
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

  // ── Test K: Finite cardinality assertion across V2 dimensions ──
  it('Test K: V2 resolve telemetry uses bounded dimensions and enum values', async () => {
    const mockDb = createTelemetryMockD1();
    const ctx = createMockCtx();

    const request = new Request(
      'https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=bad_input&platform=qqmusic&type=playlist'
    );
    await worker.fetch(request, { DB: mockDb }, ctx);
    await Promise.all(ctx._promises);

    expect(mockDb._v2BreakdownMap.size).toBeGreaterThan(0);
    for (const key of mockDb._v2BreakdownMap.keys()) {
      const [date, platform, dimension, value] = key.split('::');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((ANALYTICS_PLATFORMS as readonly string[]).includes(platform)).toBe(true);

      if (dimension === 'resolve_outcome') {
        expect((RESOLVE_OUTCOMES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'failure_code') {
        expect((RESOLVE_FAILURE_CODES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'failure_class') {
        expect((RESOLVE_FAILURE_CLASSES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'failure_stage') {
        expect((RESOLVE_FAILURE_STAGES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'requested_type') {
        expect((RESOLVE_REQUESTED_TYPES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'requested_platform') {
        expect((RESOLVE_REQUESTED_PLATFORMS as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'input_type') {
        expect((INPUT_TYPES as readonly string[]).includes(value)).toBe(true);
      } else if (dimension === 'provider_failure_path') {
        expect((PROVIDER_FAILURE_PATHS as readonly string[]).includes(value)).toBe(true);
      }
    }
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
    expect(mockDb._v2BreakdownMap.get(`${today}::qqmusic::failure_stage::finalization`)).toBe(1);
    expect(mockDb._allBinds.some((bind) => bind.sql.includes('daily_performance_stats'))).toBe(false);
  });
});
