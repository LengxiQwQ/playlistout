import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('POST /api/event — Frontend Event Ingestion', () => {
  const baseUrl = 'https://api.playlistout.com/api/event';

  // Mock env with a mock D1 that doesn't error
  function createMockEnv() {
    return {
      DB: {
        prepare() {
          return {
            bind() { return this; },
            async run() { return { success: true }; },
            async all() { return { results: [] }; },
          };
        },
        async batch() { return []; },
      } as unknown as D1Database,
    };
  }

  // Mock ExecutionContext with waitUntil
  function createMockCtx() {
    const promises: Promise<any>[] = [];
    return {
      waitUntil(p: Promise<any>) { promises.push(p); },
      passThroughOnException() {},
      _promises: promises,
    } as unknown as ExecutionContext & { _promises: Promise<any>[] };
  }

  it('accepts valid export event and returns 204', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        type: 'export',
        format: 'xlsx',
        platform: 'qqmusic',
        trackCount: 42,
      }),
    });

    const ctx = createMockCtx();
    const response = await worker.fetch(request, createMockEnv(), ctx);
    expect(response.status).toBe(204);

    // Wait for all waitUntil promises to settle
    await Promise.allSettled(ctx._promises);
  });

  it('accepts valid clipboard event and returns 204', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        type: 'clipboard',
        format: 'clipboard_title_artist',
        platform: 'qqmusic',
      }),
    });

    const ctx = createMockCtx();
    const response = await worker.fetch(request, createMockEnv(), ctx);
    expect(response.status).toBe(204);

    await Promise.allSettled(ctx._promises);
  });

  it('rejects GET method with 405', async () => {
    const request = new Request(baseUrl, {
      method: 'GET',
      headers: { Origin: 'https://playlistout.com' },
    });

    const response = await worker.fetch(request, createMockEnv(), createMockCtx());
    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('rejects invalid JSON body with 400', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: 'not json',
    });

    const response = await worker.fetch(request, createMockEnv(), createMockCtx());
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('rejects missing type field', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        format: 'xlsx',
        platform: 'qqmusic',
      }),
    });

    const response = await worker.fetch(request, createMockEnv(), createMockCtx());
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.error.message).toContain('type');
  });

  it('rejects invalid export format', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        type: 'export',
        format: 'pdf',
        platform: 'qqmusic',
      }),
    });

    const response = await worker.fetch(request, createMockEnv(), createMockCtx());
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.error.message).toContain('format');
  });

  it('rejects missing platform', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        type: 'export',
        format: 'txt',
      }),
    });

    const response = await worker.fetch(request, createMockEnv(), createMockCtx());
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.error.message).toContain('platform');
  });

  it('rejects negative trackCount', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        type: 'export',
        format: 'csv',
        platform: 'qqmusic',
        trackCount: -1,
      }),
    });

    const response = await worker.fetch(request, createMockEnv(), createMockCtx());
    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.error.message).toContain('trackCount');
  });

  it('returns 204 even when D1 is unavailable (best-effort)', async () => {
    const request = new Request(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://playlistout.com',
      },
      body: JSON.stringify({
        type: 'export',
        format: 'json',
        platform: 'qqmusic',
        trackCount: 5,
      }),
    });

    // Env with no DB
    const ctx = createMockCtx();
    const response = await worker.fetch(request, {}, ctx);
    expect(response.status).toBe(204);

    await Promise.allSettled(ctx._promises);
  });
});
