import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { resetRateLimits } from '../security/rate-limit';
import { generateBatchTicket } from '../security/batch-ticket';
import * as playlistService from '../services/playlist-service';
import * as userService from '../services/user-service';

describe('Batch Export Rate Limit Integration & Isolation', () => {
  const secret = 'test-insights-admin-token';
  const clientIp = '203.0.113.42';

  const mockEnv: any = {
    INSIGHTS_ADMIN_TOKEN: secret,
    DB: undefined,
  };

  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
    vi.spyOn(playlistService, 'parsePlaylistService').mockResolvedValue({
      playlist: {
        id: '1001',
        platform: 'qqmusic',
        name: 'Mock Playlist',
        trackCount: 1,
        tracks: [],
      } as any,
      platform: 'qqmusic',
    });
  });

  it('proves standard web requests are rate-limited after 30 requests within a minute', async () => {
    // Generate valid session token so it is classified as 'web' (30 req/min limit)
    const sessionRes = await app.request('/api/session/token', {
      method: 'GET',
      headers: {
        'cf-connecting-ip': clientIp,
        origin: 'https://playlistout.lengxiqwq.com',
      },
    }, mockEnv);
    const sessionData: any = await sessionRes.json();
    const sessionToken = sessionData.data.token;

    // Send 30 requests (all should succeed or return mock 200/400)
    for (let i = 1; i <= 30; i++) {
      const res = await app.request('/api/playlist?url=1001', {
        method: 'GET',
        headers: {
          'cf-connecting-ip': clientIp,
          'x-playlistout-session': sessionToken,
          origin: 'https://playlistout.lengxiqwq.com',
        },
      }, mockEnv);
      expect(res.status).not.toBe(429);
    }

    // The 31st request MUST be rejected with HTTP 429
    const blockedRes = await app.request('/api/playlist?url=1001', {
      method: 'GET',
      headers: {
        'cf-connecting-ip': clientIp,
        'x-playlistout-session': sessionToken,
        origin: 'https://playlistout.lengxiqwq.com',
      },
    }, mockEnv);

    expect(blockedRes.status).toBe(429);
    const body: any = await blockedRes.json();
    expect(body.error?.code).toBe('RATE_LIMITED');
    expect(blockedRes.headers.get('retry-after')).toBeTruthy();
  });

  it('allows 50 batch requests without 429 when carrying a valid Scoped Batch Ticket', async () => {
    // 50 playlist IDs
    const playlistIds = Array.from({ length: 50 }, (_, i) => `batch_pl_${i + 1}`);

    const batchTicket = await generateBatchTicket({
      clientIp,
      platform: 'netease',
      playlistIds,
      secret,
    });

    // Make 50 requests with X-PlaylistOut-Batch
    for (let i = 0; i < 50; i++) {
      const id = playlistIds[i];
      const res = await app.request(`/api/playlist?url=${id}`, {
        method: 'GET',
        headers: {
          'cf-connecting-ip': clientIp,
          'x-playlistout-batch': batchTicket,
          origin: 'https://playlistout.lengxiqwq.com',
        },
      }, mockEnv);

      // Must NOT be rate-limited
      expect(res.status).not.toBe(429);
    }
  });

  it('preserves the user universal interactive 30 req/min quota when batch requests execute', async () => {
    // Generate session token
    const sessionRes = await app.request('/api/session/token', {
      method: 'GET',
      headers: {
        'cf-connecting-ip': clientIp,
        origin: 'https://playlistout.lengxiqwq.com',
      },
    }, mockEnv);
    const sessionData: any = await sessionRes.json();
    const sessionToken = sessionData.data.token;

    // Run 35 batch requests using batch ticket
    const playlistIds = Array.from({ length: 40 }, (_, i) => `batch_id_${i}`);
    const batchTicket = await generateBatchTicket({
      clientIp,
      platform: 'netease',
      playlistIds,
      secret,
    });

    for (let i = 0; i < 35; i++) {
      const res = await app.request(`/api/playlist?url=${playlistIds[i]}`, {
        method: 'GET',
        headers: {
          'cf-connecting-ip': clientIp,
          'x-playlistout-batch': batchTicket,
        },
      }, mockEnv);
      expect(res.status).not.toBe(429);
    }

    // Now test regular interactive request: universal quota should STILL be intact and NOT hit 429!
    const interactiveRes = await app.request('/api/playlist?url=regular_interactive_playlist', {
      method: 'GET',
      headers: {
        'cf-connecting-ip': clientIp,
        'x-playlistout-session': sessionToken,
        origin: 'https://playlistout.lengxiqwq.com',
      },
    }, mockEnv);

    expect(interactiveRes.status).not.toBe(429);
  });

  it('rejects unlisted playlist IDs from the batch bucket and falls back to standard limiter', async () => {
    const playlistIds = ['allowed_1', 'allowed_2'];
    const batchTicket = await generateBatchTicket({
      clientIp,
      platform: 'netease',
      playlistIds,
      secret,
    });

    // Make 6 requests with an unlisted ID (direct API bot threshold is 6 req/min)
    for (let i = 0; i < 6; i++) {
      const res = await app.request('/api/playlist?url=unlisted_target_id', {
        method: 'GET',
        headers: {
          'cf-connecting-ip': clientIp,
          'x-playlistout-batch': batchTicket, // Invalid resource for this ticket
        },
      }, mockEnv);
      expect(res.status).not.toBe(429);
    }

    // The 7th request on direct API must be 429
    const blockedRes = await app.request('/api/playlist?url=unlisted_target_id', {
      method: 'GET',
      headers: {
        'cf-connecting-ip': clientIp,
        'x-playlistout-batch': batchTicket,
      },
    }, mockEnv);

    expect(blockedRes.status).toBe(429);
  });

  it('enforces a maximum of 2 batch ticket issuances per 60s on user playlists and enters cooldown', async () => {
    vi.spyOn(userService, 'fetchUserPlaylistsService').mockResolvedValue({
      userData: {
        platform: 'netease',
        userId: 'test_user',
        nickname: 'Test User',
        total: 2,
        playlists: [
          { id: 'p1', name: 'PL 1', trackCount: 5, sourceUrl: 'https://test/p1' },
          { id: 'p2', name: 'PL 2', trackCount: 5, sourceUrl: 'https://test/p2' },
        ],
      },
      platform: 'netease',
    });

    const testIp = '198.51.100.99';

    // Request 1: should issue batch ticket
    const res1 = await app.request('/api/user/playlists?uin=test_user&platform=netease', {
      method: 'GET',
      headers: { 'cf-connecting-ip': testIp },
    }, mockEnv);
    const data1: any = await res1.json();
    expect(data1.data.batchTicket).toBeTruthy();
    expect(data1.data.batchCooldownSeconds).toBeUndefined();

    // Request 2: should issue batch ticket
    const res2 = await app.request('/api/user/playlists?uin=test_user&platform=netease', {
      method: 'GET',
      headers: { 'cf-connecting-ip': testIp },
    }, mockEnv);
    const data2: any = await res2.json();
    expect(data2.data.batchTicket).toBeTruthy();

    // Request 3: within same minute, should NOT issue batch ticket and should set cooldown
    const res3 = await app.request('/api/user/playlists?uin=test_user&platform=netease', {
      method: 'GET',
      headers: { 'cf-connecting-ip': testIp },
    }, mockEnv);
    const data3: any = await res3.json();
    expect(res3.status).toBe(200); // User playlists still returned for viewing!
    expect(data3.data.batchTicket).toBeUndefined();
    expect(data3.data.batchCooldownSeconds).toBeGreaterThan(0);
    expect(res3.headers.get('x-playlistout-batch-cooldown')).toBeTruthy();
  });
});
