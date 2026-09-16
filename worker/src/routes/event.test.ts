import { describe, it, expect } from 'vitest';
import worker from '../index';

describe('POST /api/event — Frontend Event Ingestion (Adversarial & Acceptance)', () => {
  const baseUrl = 'https://playlistout-api.lengxiqwq.com/api/event';

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

  function createMockCtx() {
    const promises: Promise<any>[] = [];
    return {
      waitUntil(p: Promise<any>) { promises.push(p); },
      passThroughOnException() {},
      _promises: promises,
    } as unknown as ExecutionContext & { _promises: Promise<any>[] };
  }

  describe('Happy Path', () => {
    it.each(['txt', 'csv', 'xlsx', 'json'])('accepts valid export format: %s', async (format) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'export',
          format,
          platform: 'qqmusic',
          trackCount: 42,
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      await Promise.allSettled(ctx._promises);
    });

    it('accepts valid export event for netease platform', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'export',
          format: 'json',
          platform: 'netease',
          trackCount: 42,
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      await Promise.allSettled(ctx._promises);
    });

    it('accepts valid export event for kugou platform', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'export',
          format: 'json',
          platform: 'kugou',
          trackCount: 124,
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      await Promise.allSettled(ctx._promises);
    });

    it.each([
      'title',
      'title-artist',
      'title-artist-album',
      'title_artist',
      'title_artist_album',
    ])('accepts valid clipboard mode: %s', async (format) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'clipboard',
          format,
          platform: 'qqmusic',
          trackCount: 10,
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      await Promise.allSettled(ctx._promises);
    });

    it('accepts boundary trackCount values: 0 and 50000', async () => {
      for (const trackCount of [0, 50000]) {
        const request = new Request(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
          body: JSON.stringify({
            type: 'export',
            format: 'json',
            platform: 'qqmusic',
            trackCount,
          }),
        });

        const ctx = createMockCtx();
        const response = await worker.fetch(request, createMockEnv(), ctx);
        expect(response.status).toBe(204);
        await Promise.allSettled(ctx._promises);
      }
    });

    it('accepts anonymous visit event with deviceId and returns Cache-Control', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
          'cf-connecting-ip': '203.0.113.195',
        },
        body: JSON.stringify({
          type: 'visit',
          deviceId: 'd_device_abc123',
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.lengxiqwq.com');
      await Promise.allSettled(ctx._promises);
    });

    it('succeeds with 204 even when DB is disconnected (best-effort guarantee)', async () => {
      const failingDb = {
        prepare() { throw new Error('D1 connection failed'); },
        async batch() { throw new Error('D1 connection failed'); },
      } as unknown as D1Database;

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'export',
          format: 'txt',
          platform: 'qqmusic',
          trackCount: 5,
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, { DB: failingDb }, ctx);
      expect(response.status).toBe(204);
      await Promise.allSettled(ctx._promises);
    });
  });

  describe('Adversarial & Strict Validation', () => {
    it.each(['GET', 'PUT', 'DELETE', 'PATCH'])('rejects method %s with 405 Method Not Allowed', async (method) => {
      const request = new Request(baseUrl, {
        method,
        headers: { Origin: 'https://playlistout.lengxiqwq.com' },
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(405);
      const body = await response.json() as any;
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('rejects malformed non-JSON payload with 400 INVALID_INPUT', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: '{ malformed json: true, ',
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects JSON array payload with 400 INVALID_INPUT', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify([{ type: 'export', format: 'txt', platform: 'qqmusic' }]),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects oversized body (> 1024 bytes) with 400 INVALID_INPUT', async () => {
      const hugePadding = 'x'.repeat(1500);
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '1600',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'export',
          format: 'txt',
          platform: 'qqmusic',
          padding: hugePadding,
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('too large');
    });

    it.each(['download', 'parse', 'stream', 'admin', ''])('rejects invalid event type: "%s"', async (invalidType) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: invalidType,
          format: 'txt',
          platform: 'qqmusic',
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('type');
    });

    it.each([
      'spotify',
      'apple',
      'migu',
      'kuwo',
      'arbitrary_platform',
      '<script>alert(1)</script>',
    ])('rejects unsupported platform "%s" with UNSUPPORTED_PLATFORM', async (unsupportedPlatform) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'export',
          format: 'xlsx',
          platform: unsupportedPlatform,
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('UNSUPPORTED_PLATFORM');
      expect(body.error.message).toContain(unsupportedPlatform);
    });

    it('rejects export event with clipboard format', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'export',
          format: 'title_artist',
          platform: 'qqmusic',
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('Field "format" for export');
    });

    it('rejects export event with disallowed format (e.g. pdf, mp3)', async () => {
      for (const badFormat of ['pdf', 'mp3', 'docx', 'zip']) {
        const request = new Request(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
          body: JSON.stringify({
            type: 'export',
            format: badFormat,
            platform: 'qqmusic',
          }),
        });

        const response = await worker.fetch(request, createMockEnv(), createMockCtx());
        expect(response.status).toBe(400);
        const body = await response.json() as any;
        expect(body.error.code).toBe('INVALID_INPUT');
      }
    });

    it('rejects clipboard event with export format', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'clipboard',
          format: 'xlsx',
          platform: 'qqmusic',
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('Field "format" for clipboard');
    });

    it.each([
      -1,
      -100,
      3.14,
      NaN,
      50001,
      1000000,
      9999999999,
      'forty-two',
      [10],
      { count: 10 },
    ])('rejects invalid trackCount: %s', async (badTrackCount) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'export',
          format: 'csv',
          platform: 'qqmusic',
          trackCount: badTrackCount,
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = await response.json() as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('trackCount');
    });
  });
});
