import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../index';
import { resetRateLimitStore } from './rate-limit';
import { qqMusicProvider } from '../providers/qqmusic';
import { installMockCaches, type MockCachesHandle } from '../test-utils/caches-mock';

function createMockCtx(): ExecutionContext {
  return {
    waitUntil(_p: Promise<any>) {},
    passThroughOnException() {},
  } as ExecutionContext;
}

describe('Abuse Protection & Security Hardening (Phase 6)', () => {
  let cachesHandle: MockCachesHandle;
  beforeEach(() => {
    resetRateLimitStore();
    vi.restoreAllMocks();
    cachesHandle = installMockCaches();
  });
  afterEach(() => {
    cachesHandle.restore();
  });

  it('enforces rate limits (30 req/min for web frontend) and returns 429 with Retry-After', async () => {
    vi.spyOn(qqMusicProvider, 'parse').mockResolvedValue({
      platform: 'qqmusic',
      id: '123',
      name: 'Rate Limit Test',
      trackCount: 1,
      tracks: [{ index: 1, title: 'T1', artist: 'A1' }],
    });

    const clientIp = '203.0.113.195';

    // First 30 requests succeed with web origin credentials
    for (let i = 0; i < 30; i++) {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
        headers: {
          'cf-connecting-ip': clientIp,
          Origin: 'https://playlistout.com',
          'Sec-Fetch-Site': 'same-site',
        },
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
    }

    // 31st request must be rate limited with 429
    const limitedRequest = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
      headers: {
        'cf-connecting-ip': clientIp,
        Origin: 'https://playlistout.com',
        'Sec-Fetch-Site': 'same-site',
      },
    });
    const limitedResponse = await worker.fetch(limitedRequest, {}, createMockCtx());

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('Retry-After')).toBeTruthy();
    const body: any = await limitedResponse.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('enforces strict dual-track rate limits (6 req/min) for direct API / script access without web credentials', async () => {
    vi.spyOn(qqMusicProvider, 'parse').mockResolvedValue({
      platform: 'qqmusic',
      id: '123',
      name: 'Rate Limit Direct API Test',
      trackCount: 1,
      tracks: [{ index: 1, title: 'T1', artist: 'A1' }],
    });

    const clientIp = '198.51.100.42';

    // First 6 requests succeed
    for (let i = 0; i < 6; i++) {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
        headers: { 'cf-connecting-ip': clientIp },
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
    }

    // 7th request must be rate limited with 429
    const limitedRequest = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
      headers: { 'cf-connecting-ip': clientIp },
    });
    const limitedResponse = await worker.fetch(limitedRequest, {}, createMockCtx());

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('Retry-After')).toBeTruthy();
    const body: any = await limitedResponse.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('isolates rate limits by endpoint scope (stats limit does not exhaust playlist/resolve limit)', async () => {
    vi.spyOn(qqMusicProvider, 'parse').mockResolvedValue({
      platform: 'qqmusic',
      id: '123',
      name: 'Rate Limit Scope Test',
      trackCount: 1,
      tracks: [{ index: 1, title: 'T1', artist: 'A1' }],
    });

    const clientIp = '203.0.113.210';

    // Exhaust stats rate limit (60 requests)
    for (let i = 0; i < 60; i++) {
      const statsReq = new Request('https://playlistout-api.lengxiqwq.com/api/v1/stats', {
        headers: { 'cf-connecting-ip': clientIp },
      });
      const res = await worker.fetch(statsReq, {}, createMockCtx());
      expect(res.status).toBe(200);
    }

    // 61st stats request must be rate limited with 429
    const limitedStatsReq = new Request('https://playlistout-api.lengxiqwq.com/api/v1/stats', {
      headers: { 'cf-connecting-ip': clientIp },
    });
    const limitedStatsRes = await worker.fetch(limitedStatsReq, {}, createMockCtx());
    expect(limitedStatsRes.status).toBe(429);

    // But request to /api/v1/playlist with the SAME IP must NOT be rate limited!
    const playlistReq = new Request('https://playlistout-api.lengxiqwq.com/api/v1/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
      headers: { 'cf-connecting-ip': clientIp },
    });
    const playlistRes = await worker.fetch(playlistReq, {}, createMockCtx());
    expect(playlistRes.status).toBe(200);
  });

  it('attaches standard OWASP security headers to all responses', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/health');
    const response = await worker.fetch(request, {}, createMockCtx());

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('Permissions-Policy')).toContain('camera=()');
  });

  it('rejects SSRF attacks targeting cloud metadata, local addresses, or arbitrary protocols', async () => {
    const ssrfTargets = [
      'http://169.254.169.254/latest/meta-data',
      'http://127.0.0.1:8080/admin',
      'http://localhost/private',
      'http://10.0.0.1/router',
      'ftp://c.y.qq.com/passwd',
      'file:///etc/passwd',
      'javascript:alert(1)',
    ];

    for (const target of ssrfTargets) {
      const request = new Request(`https://playlistout-api.lengxiqwq.com/api/playlist?url=${encodeURIComponent(target)}`, {
        headers: { Origin: 'https://playlistout.com', 'Sec-Fetch-Site': 'same-site' },
      });
      const response = await worker.fetch(request, {}, createMockCtx());

      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNSUPPORTED_URL');
    }
  });

  it('strictly blocks arbitrary proxy attempts', async () => {
    const proxyRequests = [
      'https://playlistout-api.lengxiqwq.com/proxy?url=https://google.com',
      'https://playlistout-api.lengxiqwq.com/proxy/raw?url=https://169.254.169.254',
      'https://playlistout-api.lengxiqwq.com/api/proxy?target=internal',
    ];

    for (const url of proxyRequests) {
      const request = new Request(url);
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(403);
      const body: any = await response.json();
      expect(body.error.code).toBe('FORBIDDEN');
    }
  });

  it('rejects oversized inputs (> 2048 chars) with INVALID_INPUT', async () => {
    const hugeUrl = 'https://y.qq.com/n/ryqq/playlist/' + '9'.repeat(2500);
    const request = new Request(`https://playlistout-api.lengxiqwq.com/api/playlist?url=${encodeURIComponent(hugeUrl)}`);
    const response = await worker.fetch(request, {}, createMockCtx());

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('never leaks stack traces, environment variables, or database connection strings', async () => {
    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
      new Error('FATAL: password="super_secret_token_12345" connection to postgres://internal.net:5432 failed\n    at internal/db.ts:123'),
    );

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123');
    const response = await worker.fetch(request, {}, createMockCtx());

    expect(response.status).toBe(500);
    const body: any = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');

    const rawResponse = JSON.stringify(body);
    expect(rawResponse).not.toContain('super_secret_token');
    expect(rawResponse).not.toContain('postgres');
    expect(rawResponse).not.toContain('internal/db.ts');
  });
});

