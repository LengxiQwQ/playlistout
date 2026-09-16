import { describe, it, expect, vi } from 'vitest';
import worker from './index';
import { qqMusicProvider } from './providers/qqmusic';
import { neteaseProvider } from './providers/netease';
import { ProviderError } from './models/playlist';

interface HealthResponseBody {
  status: string;
  service: string;
  version: string;
}

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function createMockCtx(): ExecutionContext {
  return {
    waitUntil(_p: Promise<any>) {},
    passThroughOnException() {},
  } as ExecutionContext;
}

describe('Worker Endpoints (Phase 2 Public API Contract & Reliability)', () => {
  it('responds with ok to /health and returns minimal payload', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/health');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(200);
    const body = (await response.json()) as HealthResponseBody;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('playlistout-api');
    expect(body.version).toBe('2.0.0');
  });

  it('rejects non-GET methods on /health with 405 Method Not Allowed', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/health', { method: 'POST' });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(405);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('responds with CORS header to /api/health for allowed origin', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/health', {
      headers: { Origin: 'https://playlistout.lengxiqwq.com' },
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.lengxiqwq.com');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('does NOT return Access-Control-Allow-Origin for unauthorized origin', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
      headers: { Origin: 'https://evil-site.com' },
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it.each([
    'https://playlistout.com',
    'https://playlistout.lengxiqwq.com',
    'https://lengxiqwq.github.io',
    'http://localhost:5173',
  ])('handles CORS OPTIONS preflight for allowed origin: %s', async (origin) => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist', {
      method: 'OPTIONS',
      headers: { Origin: origin },
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('rejects CORS OPTIONS preflight for unauthorized origin with 403', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist', {
      method: 'OPTIONS',
      headers: { Origin: 'https://malicious-domain.com' },
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns Cache-Control no-cache, no-store on /api/stats', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/stats');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });

  it('rejects non-GET methods on /api/playlist with 405 Method Not Allowed', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/123', {
      method: 'POST',
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(405);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('returns 400 when /api/playlist is missing url parameter', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when /api/playlist has empty or whitespace url parameter', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=%20%20%20');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('returns 400 when /api/playlist url parameter exceeds 2048 characters', async () => {
    const oversizedUrl = 'https://y.qq.com/n/ryqq/playlist/' + 'a'.repeat(2100);
    const request = new Request(`https://playlistout-api.lengxiqwq.com/api/playlist?url=${encodeURIComponent(oversizedUrl)}`);
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
    expect(body.error.message).toContain('2048 characters');
  });

  it('returns 400 when /api/playlist is queried with unsupported music platform', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNSUPPORTED_URL');
  });

  it('strictly blocks generic /proxy, /proxy/..., and /api/proxy attempts with 403 Forbidden', async () => {
    const proxyPaths = [
      'https://playlistout-api.lengxiqwq.com/proxy?url=https://example.com',
      'https://playlistout-api.lengxiqwq.com/proxy/subpath?target=10.0.0.1',
      'https://playlistout-api.lengxiqwq.com/api/proxy?url=https://qq.com',
    ];

    for (const p of proxyPaths) {
      const request = new Request(p);
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(403);
      const body = (await response.json()) as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    }
  });

  it('maps ProviderError correctly to HTTP status and clean error body', async () => {
    const parseSpy = vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
      new ProviderError('UPSTREAM_TIMEOUT', 'Request to QQ Music timed out after 15000ms.', 504),
    );

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/12345');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(504);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UPSTREAM_TIMEOUT');
    expect(body.error.message).toBe('Request to QQ Music timed out after 15000ms.');

    parseSpy.mockRestore();
  });

  it('safely handles unexpected internal errors without leaking stack traces or sensitive info', async () => {
    const parseSpy = vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
      new Error('SecretDatabaseConnectionFailed: pass=hunter2 at Object.<anonymous> (/internal/app.ts:42)'),
    );

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=https://y.qq.com/n/ryqq/playlist/12345');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(500);
    const body = (await response.json()) as ErrorResponseBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('hunter2');
    expect(body.error.message).not.toContain('SecretDatabaseConnectionFailed');

    parseSpy.mockRestore();
  });

  it('falls back from QQ Music to NetEase when numeric ID without platform parameter is not found on QQ', async () => {
    const qqSpy = vi.spyOn(qqMusicProvider, 'parse').mockRejectedValueOnce(
      new ProviderError('PLAYLIST_NOT_FOUND', 'Playlist not found on QQ Music'),
    );
    const neteaseSpy = vi.spyOn(neteaseProvider, 'parse').mockResolvedValueOnce({
      platform: 'netease',
      id: '2756674066',
      name: '网易云兜底歌单',
      trackCount: 1,
      tracks: [
        { index: 1, title: '测试歌曲', artists: ['测试歌手'] },
      ],
    });

    const request = new Request('https://playlistout-api.lengxiqwq.com/api/playlist?url=2756674066');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(200);

    const body = (await response.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.platform).toBe('netease');
    expect(body.data.name).toBe('网易云兜底歌单');

    qqSpy.mockRestore();
    neteaseSpy.mockRestore();
  });

  it('returns 404 for unknown routes', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/unknown');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(404);
  });

  describe('/api/user/playlists', () => {
    it('rejects non-GET methods with 405 Method Not Allowed', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/user/playlists?uin=10001', { method: 'POST' });
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(405);
      const body = (await response.json()) as ErrorResponseBody;
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('rejects missing uin query parameter with 400 INVALID_INPUT', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/user/playlists');
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponseBody;
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects invalid uin format with 400 INVALID_INPUT', async () => {
      const request = new Request('https://playlistout-api.lengxiqwq.com/api/user/playlists?uin=not-valid');
      const response = await worker.fetch(request, {}, createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponseBody;
      expect(body.error.code).toBe('INVALID_INPUT');
    });
  });
});


