import { describe, it, expect } from 'vitest';
import worker from '../index';

function createMockCtx(): ExecutionContext {
  return {
    waitUntil(_p: Promise<any>) {},
    passThroughOnException() {},
  } as ExecutionContext;
}

describe('Providers Route', () => {
  it('GET /api/providers returns all registered music providers', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/providers', {
      headers: { Origin: 'https://example.com' },
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(6);

    const ids = body.data.map((p: any) => p.id);
    expect(ids).toContain('qqmusic');
    expect(ids).toContain('netease');
    expect(ids).toContain('kugou');
    expect(ids).toContain('qishui');
    expect(ids).toContain('kuwo');
    expect(ids).toContain('migu');

    const qq = body.data.find((p: any) => p.id === 'qqmusic');
    expect(qq.name).toBe('QQ 音乐');
    expect(qq.capabilities.playlist).toBe(true);
    expect(qq.capabilities.userProfile).toBe(true);
  });

  it('GET /api/v1/providers also returns all registered music providers', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/v1/providers');
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(200);

    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(6);
  });

  it('rejects POST /api/providers with 405 Method Not Allowed', async () => {
    const request = new Request('https://playlistout-api.lengxiqwq.com/api/providers', {
      method: 'POST',
    });
    const response = await worker.fetch(request, {}, createMockCtx());
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toContain('GET');
    const body: any = await response.json();
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });
});
