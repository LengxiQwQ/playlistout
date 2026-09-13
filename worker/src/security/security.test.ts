import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index';
import { resetRateLimitStore } from './rate-limit';
import { qqMusicProvider } from '../providers/qqmusic';

function createMockCtx(): ExecutionContext {
  return {
    waitUntil(_p: Promise<any>) {},
    passThroughOnException() {},
  } as ExecutionContext;
}

describe('Abuse Protection & Security Hardening (Phase 6)', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.restoreAllMocks();
  });

  it('enforces rate limits (30 req/min for /api/playlist) and returns 429 with Retry-After', async () => {
    vi.spyOn(qqMusicProvider, 'parse').mockResolvedValue({
      platform: 'qqmusic',
      id: '123',
      name: 'Rate Limit Test',
      trackCount: 1,
      tracks: [{ index: 1, title: 'T1', artists: ['A1'] }],
    });

    const clientIp = '203.0.113.195';

    // First 30 requests succeed
    for (let i = 0; i < 30; i++) {
      const request = new Request('https://api.playlistout.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
        headers: { 'cf-connecting-ip': clientIp },
      });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(200);
    }

    // 31st request must be rate limited with 429
    const limitedRequest = new Request('https://api.playlistout.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
      headers: { 'cf-connecting-ip': clientIp },
    });
    const limitedResponse = await worker.fetch(limitedRequest, {}, createMockCtx());

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('Retry-After')).toBeTruthy();
    const body: any = await limitedResponse.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('attaches standard OWASP security headers to all responses', async () => {
    const request = new Request('https://api.playlistout.com/health');
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
      const request = new Request(`https://api.playlistout.com/api/playlist?url=${encodeURIComponent(target)}`);
      const response = await worker.fetch(request, {}, createMockCtx());

      expect(response.status).toBe(400);
      const body: any = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNSUPPORTED_URL');
    }
  });

  it('strictly blocks arbitrary proxy attempts', async () => {
    const proxyRequests = [
      'https://api.playlistout.com/proxy?url=https://google.com',
      'https://api.playlistout.com/proxy/raw?url=https://169.254.169.254',
      'https://api.playlistout.com/api/proxy?target=internal',
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
    const request = new Request(`https://api.playlistout.com/api/playlist?url=${encodeURIComponent(hugeUrl)}`);
    const response = await worker.fetch(request, {}, createMockCtx());

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('never leaks stack traces, environment variables, or database connection strings', async () => {
    vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
      new Error('FATAL: password="super_secret_token_12345" connection to postgres://internal.net:5432 failed\n    at internal/db.ts:123'),
    );

    const request = new Request('https://api.playlistout.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123');
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

