import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from './client';
import type { Playlist, Track } from './types';

describe('Web API Client & Types', () => {
  it('has default API_BASE_URL configured', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  it('validates normalized Playlist contract shape', () => {
    const track: Track = {
      index: 1,
      id: '101',
      title: 'Sample Track',
      artist: 'Artist A, Artist B',
      album: 'Sample Album',
      durationMs: 210000,
      sourceUrl: 'https://example.com/track/101',
    };

    const playlist: Playlist = {
      platform: 'qqmusic',
      id: '123456',
      name: 'My Playlist',
      creator: 'User1',
      trackCount: 1,
      tracks: [track],
    };

    expect(playlist.platform).toBe('qqmusic');
    expect(playlist.tracks).toHaveLength(1);
    expect(playlist.tracks[0].artist).toBe('Artist A, Artist B');
    expect(playlist.tracks[0].index).toBe(1);
  });

  it('validates public StatsResponse contract shape', () => {
    const stats: import('./client').StatsResponse = {
      launchedAt: '2026-09-12',
      totalVisitors: 50,
      visitorsToday: 8,
      totalPageViews: 200,
      pageViewsToday: 25,
      totalPlaylistsParsed: 100,
      playlistsParsedToday: 10,
      totalTracksProcessed: 5000,
      tracksProcessedToday: 300,
      totalExports: 40,
      exportsToday: 4,
      exportFormatsBreakdown: { xlsx: 20, csv: 12, txt: 6, json: 2, m3u8: 0 },
      byPlatform: {
        qqmusic: {
          totalSuccess: 100,
          todaySuccess: 10,
        },
      },
      recentDays: [
        {
          date: '2026-09-13',
          parses: 10,
          tracks: 300,
          exports: 4,
        },
      ],
      generatedAt: '2026-09-13T08:00:00.000Z',
    };

    expect(stats.launchedAt).toBe('2026-09-12');
    expect(stats.totalPlaylistsParsed).toBe(100);
    expect(stats.totalTracksProcessed).toBe(5000);
    expect(stats.totalExports).toBe(40);
    expect(stats.byPlatform.qqmusic.totalSuccess).toBe(100);
    expect(stats.recentDays).toHaveLength(1);
    expect(stats.recentDays[0].parses).toBe(10);
  });

  it('cleans up legacy device identifier from localStorage and does not persist client deviceId', async () => {
    const { cleanupLegacyDeviceId } = await import('./client');
    window.localStorage.setItem('playlistout_did', 'd_legacy123');
    expect(window.localStorage.getItem('playlistout_did')).toBe('d_legacy123');

    cleanupLegacyDeviceId();
    expect(window.localStorage.getItem('playlistout_did')).toBeNull();
  });

  it('notifies window of stats refresh event', async () => {
    const { notifyStatsRefresh } = await import('./client');
    let eventDispatched = false;
    const handler = () => {
      eventDispatched = true;
    };
    window.addEventListener('playlistout:stats-refresh', handler);

    notifyStatsRefresh(10);
    await new Promise((r) => setTimeout(r, 50));

    expect(eventDispatched).toBe(true);
    window.removeEventListener('playlistout:stats-refresh', handler);
  });

  describe('Insights R5 — Referrer Minimization & Privacy Boundary', () => {
    it('accurately matches exact domains and subdomains while preventing suffix spoofing', async () => {
      const { matchesDomain } = await import('./client');
      expect(matchesDomain('chatgpt.com', 'chatgpt.com')).toBe(true);
      expect(matchesDomain('chat.openai.com', 'openai.com')).toBe(true);
      expect(matchesDomain('www.google.com', 'google.com')).toBe(true);

      // Suffix spoofing prevention
      expect(matchesDomain('evilgoogle.com', 'google.com')).toBe(false);
      expect(matchesDomain('google.com.evil.com', 'google.com')).toBe(false);
      expect(matchesDomain('chatgpt.com.attacker.org', 'chatgpt.com')).toBe(false);
    });

    it('identifies self origins for internal navigation', async () => {
      const { isSelfOrigin } = await import('./client');
      expect(isSelfOrigin('playlistout.com')).toBe(true);
      expect(isSelfOrigin('playlistout.lengxiqwq.com')).toBe(true);
      expect(isSelfOrigin('playlistout.pages.dev')).toBe(true);
      expect(isSelfOrigin('lengxiqwq.github.io')).toBe(true);
      expect(isSelfOrigin('localhost')).toBe(true);
      expect(isSelfOrigin('127.0.0.1')).toBe(true);

      expect(isSelfOrigin('google.com')).toBe(false);
      expect(isSelfOrigin('evil.example')).toBe(false);
    });

    it('classifies external hostnames strictly into coarse categories without inspecting path or query', async () => {
      const { classifyHostname } = await import('./client');

      // AI Assistants
      expect(classifyHostname('chatgpt.com')).toBe('chatgpt');
      expect(classifyHostname('chat.openai.com')).toBe('chatgpt');
      expect(classifyHostname('claude.ai')).toBe('claude');
      expect(classifyHostname('deepseek.com')).toBe('deepseek');
      expect(classifyHostname('copilot.microsoft.com')).toBe('copilot');
      expect(classifyHostname('gemini.google.com')).toBe('gemini');
      expect(classifyHostname('kimi.moonshot.cn')).toBe('kimi');

      // Search Engines
      expect(classifyHostname('www.google.com')).toBe('google');
      expect(classifyHostname('google.com.hk')).toBe('google');
      expect(classifyHostname('google.co.jp')).toBe('google');
      expect(classifyHostname('www.baidu.com')).toBe('baidu');
      expect(classifyHostname('cn.bing.com')).toBe('bing');
      expect(classifyHostname('www.sogou.com')).toBe('sogou');
      expect(classifyHostname('www.so.com')).toBe('360search');

      // Tech & Communities
      expect(classifyHostname('github.com')).toBe('github');
      expect(classifyHostname('v2ex.com')).toBe('v2ex');
      expect(classifyHostname('juejin.cn')).toBe('juejin');
      expect(classifyHostname('www.zhihu.com')).toBe('zhihu');
      expect(classifyHostname('www.bilibili.com')).toBe('bilibili');
      expect(classifyHostname('www.xiaohongshu.com')).toBe('xiaohongshu');

      // Social & Messaging
      expect(classifyHostname('weixin.qq.com')).toBe('wechat');
      expect(classifyHostname('weibo.com')).toBe('weibo');
      expect(classifyHostname('x.com')).toBe('twitter_x');
      expect(classifyHostname('twitter.com')).toBe('twitter_x');
      expect(classifyHostname('www.reddit.com')).toBe('reddit');
      expect(classifyHostname('www.facebook.com')).toBe('meta_fb');
      expect(classifyHostname('www.douyin.com')).toBe('douyin_tiktok');

      // Unrecognized domains map to bounded other_web
      expect(classifyHostname('random-blog.org')).toBe('other_web');
      expect(classifyHostname('personal-site.xyz')).toBe('other_web');

      // Spoofed suffixes map to other_web, NOT the spoofed target
      expect(classifyHostname('google.com.evil.org')).toBe('other_web');
      expect(classifyHostname('evilchatgpt.com')).toBe('other_web');
    });

    it('normalizes campaign parameters into coarse categories and never leaks raw values', async () => {
      const { classifyCampaignHint } = await import('./client');

      // Known campaign aliases
      expect(classifyCampaignHint('chatgpt')).toBe('chatgpt');
      expect(classifyCampaignHint('openai')).toBe('chatgpt');
      expect(classifyCampaignHint('github')).toBe('github');
      expect(classifyCampaignHint('deepseek')).toBe('deepseek');
      expect(classifyCampaignHint('bilibili')).toBe('bilibili');

      // Unknown or sensitive campaign values must NEVER be returned raw; strictly normalized to other_web
      expect(classifyCampaignHint('john@example.com')).toBe('other_web');
      expect(classifyCampaignHint('secret_token_12345')).toBe('other_web');
      expect(classifyCampaignHint('https://private.site/path?id=1')).toBe('other_web');

      // Empty / null
      expect(classifyCampaignHint(null)).toBeNull();
      expect(classifyCampaignHint('')).toBeNull();
    });

    it('enforces precedence: external referrer > campaign parameter > direct', async () => {
      const { classifyReferrerSource } = await import('./client');

      // 1. External referrer has highest priority
      expect(
        classifyReferrerSource('https://chatgpt.com/c/secret-path', '?utm_source=github'),
      ).toBe('chatgpt');

      // 2. Self-origin referrer allows fallback to campaign parameter
      expect(
        classifyReferrerSource('https://playlistout.com/', '?utm_source=github'),
      ).toBe('github');
      expect(
        classifyReferrerSource('http://localhost:5173/app', '?from=deepseek'),
      ).toBe('deepseek');
      expect(
        classifyReferrerSource('https://playlistout.lengxiqwq.com', '?ref=john@example.com'),
      ).toBe('other_web');

      // 3. No external referrer and no campaign -> direct
      expect(classifyReferrerSource(undefined, undefined)).toBe('direct');
      expect(classifyReferrerSource('', '')).toBe('direct');
      expect(classifyReferrerSource('https://playlistout.com', '')).toBe('direct');
    });

    it('strictly transmits only referrerSource without any raw URLs, paths, queries, or tokens in recordVisit', async () => {
      const { recordVisit } = await import('./client');

      // Set up sensitive document.referrer and query parameters in browser environment
      Object.defineProperty(document, 'referrer', {
        value: 'https://chatgpt.com/c/private-conversation-id?token=VERY_SECRET_AUTH#sensitive-hash',
        configurable: true,
      });

      let capturedUrl = '';
      let capturedBodyText = '';
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (url: any, init: any) => {
        capturedUrl = String(url);
        capturedBodyText = String(init?.body || '');
        return new Response(null, { status: 204 });
      }) as any;

      try {
        await recordVisit();

        expect(capturedUrl).toContain('/api/event');
        const parsedBody = JSON.parse(capturedBodyText);

        // Core R5 invariant: only coarse referrerSource is present
        expect(parsedBody).toEqual({
          type: 'visit',
          referrerSource: 'chatgpt',
        });

        // Strict verification: ZERO raw URL components leaked across network
        expect(parsedBody).not.toHaveProperty('referrer');
        expect(capturedBodyText).not.toContain('"referrer":');
        expect(capturedBodyText).not.toContain('private-conversation-id');
        expect(capturedBodyText).not.toContain('VERY_SECRET_AUTH');
        expect(capturedBodyText).not.toContain('sensitive-hash');
        expect(capturedBodyText).not.toContain('chatgpt.com/c/');
        expect(capturedBodyText).not.toContain('https://');
        expect(capturedBodyText).not.toContain('?token');
        expect(capturedBodyText).not.toContain('#');
      } finally {
        globalThis.fetch = originalFetch;
        Object.defineProperty(document, 'referrer', { value: '', configurable: true });
      }
    });

    it('packs multiple export formats into 1 single batch HTTP request', async () => {
      const { recordExportFormats } = await import('./client');

      let callCount = 0;
      let capturedBody: any = null;
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (_url: any, init: any) => {
        callCount++;
        capturedBody = JSON.parse(String(init?.body || '{}'));
        return new Response(null, { status: 204 });
      }) as any;

      try {
        await recordExportFormats(['xlsx', 'csv', 'json', 'txt', 'm3u8'], 80, 'qqmusic');

        // Exactly 1 network request sent, not 5!
        expect(callCount).toBe(1);
        expect(capturedBody).toEqual({
          type: 'batch',
          events: [
            { type: 'export', format: 'xlsx', platform: 'qqmusic', trackCount: 80 },
            { type: 'export', format: 'csv', platform: 'qqmusic', trackCount: 80 },
            { type: 'export', format: 'json', platform: 'qqmusic', trackCount: 80 },
            { type: 'export', format: 'txt', platform: 'qqmusic', trackCount: 80 },
            { type: 'export', format: 'm3u8', platform: 'qqmusic', trackCount: 80 },
          ],
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('sends single export event directly when only 1 format is exported', async () => {
      const { recordExportFormats } = await import('./client');

      let callCount = 0;
      let capturedBody: any = null;
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (_url: any, init: any) => {
        callCount++;
        capturedBody = JSON.parse(String(init?.body || '{}'));
        return new Response(null, { status: 204 });
      }) as any;

      try {
        await recordExportFormats(['xlsx'], 25, 'netease');

        expect(callCount).toBe(1);
        expect(capturedBody).toEqual({
          type: 'export',
          format: 'xlsx',
          platform: 'netease',
          trackCount: 25,
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('In-Memory Parse Cache, Deduplication & Strict Retry Safety', () => {
    it('caches successful parse and eliminates redundant network requests on duplicate calls', async () => {
      const { parsePlaylist, clearParseCache } = await import('./client');
      clearParseCache();

      let parseFetchCount = 0;
      const originalFetch = globalThis.fetch;

      const mockSuccessData = {
        success: true,
        data: {
          platform: 'qqmusic',
          id: 'mock_pl_1',
          name: 'Cached Playlist',
          trackCount: 2,
          tracks: [],
        },
      };

      globalThis.fetch = (async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/session/token')) {
          return new Response(JSON.stringify({ success: true, data: { token: 'mock_session_token' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        parseFetchCount++;
        return new Response(JSON.stringify(mockSuccessData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as any;

      try {
        // First parse: makes real network fetch
        const res1 = await parsePlaylist('https://y.qq.com/n/ryqq/playlist/mock_pl_1');
        expect(res1.success).toBe(true);
        expect(parseFetchCount).toBe(1);

        // Second parse (same URL): hits memory cache directly, 0 network requests!
        const res2 = await parsePlaylist('https://y.qq.com/n/ryqq/playlist/mock_pl_1');
        expect(res2.success).toBe(true);
        expect(res2.success && res2.data.name).toBe('Cached Playlist');
        expect(parseFetchCount).toBe(1); // Still 1!
      } finally {
        globalThis.fetch = originalFetch;
        clearParseCache();
      }
    });

    it('NEVER caches failed responses: retry ALWAYS triggers a real network request', async () => {
      const { parsePlaylist, clearParseCache } = await import('./client');
      clearParseCache();

      let parseFetchCount = 0;
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/session/token')) {
          return new Response(JSON.stringify({ success: true, data: { token: 'mock_session_token' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        parseFetchCount++;
        if (parseFetchCount === 1) {
          // First attempt fails
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'UPSTREAM_ERROR', message: 'Upstream server error' },
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
        // Second attempt (retry) succeeds!
        return new Response(
          JSON.stringify({
            success: true,
            data: { platform: 'qqmusic', id: 'retry_pl_1', name: 'Retried Success', tracks: [] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;

      try {
        // 1. Initial attempt fails
        const res1 = await parsePlaylist('https://y.qq.com/n/ryqq/playlist/retry_pl_1');
        expect(res1.success).toBe(false);
        expect(!res1.success && res1.error.code).toBe('UPSTREAM_ERROR');
        expect(parseFetchCount).toBe(1);

        // 2. CRITICAL USER INVARIANT: Retrying MUST perform a genuine network request!
        // It must NOT read the failed error from memory!
        const res2 = await parsePlaylist('https://y.qq.com/n/ryqq/playlist/retry_pl_1');
        expect(parseFetchCount).toBe(2); // Network was called again!
        expect(res2.success).toBe(true);
        expect(res2.success && res2.data.name).toBe('Retried Success');
      } finally {
        globalThis.fetch = originalFetch;
        clearParseCache();
      }
    });

    it('merges identical in-flight requests into 1 single network fetch', async () => {
      const { parsePlaylist, clearParseCache } = await import('./client');
      clearParseCache();

      let parseFetchCount = 0;
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/session/token')) {
          return new Response(JSON.stringify({ success: true, data: { token: 'mock_session_token' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        parseFetchCount++;
        // Small delay to simulate in-flight request
        await new Promise((r) => setTimeout(r, 20));
        return new Response(
          JSON.stringify({
            success: true,
            data: { platform: 'netease', id: 'inflight_1', name: 'In Flight Playlist', tracks: [] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;

      try {
        // User rapid double-clicks (fired simultaneously)
        const [p1, p2] = await Promise.all([
          parsePlaylist('https://music.163.com/playlist?id=inflight_1'),
          parsePlaylist('https://music.163.com/playlist?id=inflight_1'),
        ]);

        expect(p1.success).toBe(true);
        expect(p2.success).toBe(true);
        expect(parseFetchCount).toBe(1); // Deduplicated! Only 1 fetch was made!
      } finally {
        globalThis.fetch = originalFetch;
        clearParseCache();
      }
    });

    it('bypasses cache when forceRefresh=true is specified', async () => {
      const { parsePlaylist, clearParseCache } = await import('./client');
      clearParseCache();

      let parseFetchCount = 0;
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/session/token')) {
          return new Response(JSON.stringify({ success: true, data: { token: 'mock_session_token' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        parseFetchCount++;
        return new Response(
          JSON.stringify({
            success: true,
            data: { platform: 'qqmusic', id: 'refresh_pl', name: `Call ${parseFetchCount}`, tracks: [] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as any;

      try {
        const res1 = await parsePlaylist('https://y.qq.com/n/ryqq/playlist/refresh_pl');
        expect(res1.success && res1.data.name).toBe('Call 1');
        expect(parseFetchCount).toBe(1);

        // Force refresh
        const res2 = await parsePlaylist(
          'https://y.qq.com/n/ryqq/playlist/refresh_pl',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
        );
        expect(res2.success && res2.data.name).toBe('Call 2');
        expect(parseFetchCount).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
        clearParseCache();
      }
    });
  });
});

