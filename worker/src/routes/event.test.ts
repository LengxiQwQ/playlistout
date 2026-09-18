import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../index';
import { resetRateLimitStore, checkDurableRateLimit } from '../security/rate-limit';

describe('POST /api/event — Frontend Event Ingestion (Adversarial & Acceptance)', () => {
  const baseUrl = 'https://playlistout-api.lengxiqwq.com/api/event';

  beforeEach(() => {
    resetRateLimitStore();
  });

  interface MockDbOptions {
    failRateLimit?: boolean;
    failAnalytics?: boolean;
    limitCount?: number;
  }

  function createMockEnv(opts: MockDbOptions = {}) {
    const executedStatements: string[] = [];
    let d1RateLimitCount = opts.limitCount ?? 0;

    const db = {
      _statements: executedStatements,
      _rateLimitCount: () => d1RateLimitCount,
      prepare(sql: string) {
        let boundArgs: any[] = [];
        return {
          bind(...args: any[]) {
            boundArgs = args;
            return this;
          },
          async first() {
            executedStatements.push(sql);
            if (opts.failRateLimit && sql.includes('security_rate_limits')) {
              throw new Error('D1 rate limiter failure');
            }
            if (sql.includes('security_rate_limits')) {
              // Bound args: [key, resetAt, maxRequests]
              const maxRequests = (boundArgs[2] as number | undefined) ?? 60;
              const resetAt = (boundArgs[1] as number | undefined) ?? (Math.floor(Date.now() / 1000) + 60);
              if (d1RateLimitCount < maxRequests) {
                d1RateLimitCount += 1;
                return { count: d1RateLimitCount, reset_at: resetAt };
              }
              // Limit reached: DO UPDATE skipped via WHERE count < ?3, RETURNING yields 0 rows (null)
              return null;
            }
            return null;
          },
          async run() {
            if (opts.failRateLimit && sql.includes('security_rate_limits')) {
              throw new Error('D1 rate limiter failure');
            }
            if (opts.failAnalytics && sql.includes('INSERT INTO aggregate_stats')) {
              throw new Error('Analytics D1 error');
            }
            executedStatements.push(sql);
            return { success: true, meta: { changes: 1 } };
          },
          async all() {
            executedStatements.push(sql);
            return { results: [] };
          },
        };
      },
      async batch(stmts: any[]) {
        if (opts.failRateLimit) {
          throw new Error('D1 rate limiter failure');
        }
        if (opts.failAnalytics && stmts.length > 2) {
          throw new Error('D1 analytics failure');
        }
        for (const _s of stmts) {
          executedStatements.push('batch_statement');
        }
        return [{ success: true }];
      },
    };

    return {
      DB: db as unknown as D1Database & { _statements: string[]; _rateLimitCount: () => number },
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

  describe('Happy Path & Multi-Platform Support', () => {
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
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.lengxiqwq.com');
      await Promise.allSettled(ctx._promises);
    });

    it.each(['qqmusic', 'netease', 'kugou', 'qishui'])('accepts valid export for supported platform: %s', async (platform) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.com',
        },
        body: JSON.stringify({
          type: 'export',
          format: 'json',
          platform,
          trackCount: 100,
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.com');
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
          Origin: 'https://www.playlistout.com',
        },
        body: JSON.stringify({
          type: 'clipboard',
          format,
          platform: 'netease',
          trackCount: 15,
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
          headers: { 'Content-Type': 'application/json', Origin: 'https://lengxiqwq.github.io' },
          body: JSON.stringify({
            type: 'export',
            format: 'json',
            platform: 'kugou',
            trackCount,
          }),
        });

        const ctx = createMockCtx();
        const response = await worker.fetch(request, createMockEnv(), ctx);
        expect(response.status).toBe(204);
        await Promise.allSettled(ctx._promises);
      }
    });

    it('accepts anonymous visit event with referrer and returns Cache-Control', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
          'cf-connecting-ip': '203.0.113.195',
        },
        body: JSON.stringify({
          type: 'visit',
          referrer: 'https://chatgpt.com',
        }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, createMockEnv(), ctx);
      expect(response.status).toBe(204);
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://playlistout.lengxiqwq.com');
      await Promise.allSettled(ctx._promises);
    });

    it('handles CORS OPTIONS preflight for exact official origins with 204 and ACAO', async () => {
      for (const origin of [
        'https://playlistout.com',
        'https://www.playlistout.com',
        'https://playlistout.lengxiqwq.com',
        'https://lengxiqwq.github.io',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]) {
        const request = new Request(baseUrl, {
          method: 'OPTIONS',
          headers: { Origin: origin },
        });

        const response = await worker.fetch(request, createMockEnv(), createMockCtx());
        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      }
    });
  });

  describe('Adversarial Event Origin Gate (Exact Matching Only)', () => {
    it.each([
      ['missing Origin', {}],
      ['null Origin', { Origin: 'null' }],
      ['evil.com', { Origin: 'https://evil.com' }],
      ['evil.example', { Origin: 'https://evil.example' }],
      ['unauthorized subdomain foo.lengxiqwq.com', { Origin: 'https://foo.lengxiqwq.com' }],
      ['unauthorized subdomain fake.playlistout.com', { Origin: 'https://fake.playlistout.com' }],
      ['suffix attack playlistout.com.evil.com', { Origin: 'https://playlistout.com.evil.com' }],
      ['suffix attack lengxiqwq.com.evil.example', { Origin: 'https://lengxiqwq.com.evil.example' }],
      ['arbitrary localhost port 9999', { Origin: 'http://localhost:9999' }],
      ['arbitrary localhost port 8080', { Origin: 'http://127.0.0.1:8080' }],
    ])('rejects unauthorized origin (%s) with 403 FORBIDDEN and 0 D1 writes', async (_, headers) => {
      const mockEnv = createMockEnv();
      const ctx = createMockCtx();

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          type: 'export',
          format: 'txt',
          platform: 'qqmusic',
          trackCount: 1,
        }),
      });

      const response = await worker.fetch(request, mockEnv, ctx);
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();

      const body = (await response.json()) as any;
      expect(body.error.code).toBe('FORBIDDEN');

      // CRITICAL: 0 database writes executed
      expect(mockEnv.DB._statements).toHaveLength(0);
      expect(ctx._promises).toHaveLength(0);
    });

    it('rejects CORS OPTIONS preflight for unauthorized origin with 403 and no ACAO', async () => {
      const request = new Request(baseUrl, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.com' },
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('rejects CORS OPTIONS preflight when Origin is missing with 403', async () => {
      const request = new Request(baseUrl, {
        method: 'OPTIONS',
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(403);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('Adversarial Method, Content-Type & Payload Guards', () => {
    it.each(['GET', 'PUT', 'DELETE', 'PATCH'])('rejects HTTP %s with 405 Method Not Allowed and 0 writes', async (method) => {
      const mockEnv = createMockEnv();
      const ctx = createMockCtx();
      const request = new Request(baseUrl, {
        method,
        headers: { Origin: 'https://playlistout.lengxiqwq.com' },
      });

      const response = await worker.fetch(request, mockEnv, ctx);
      expect(response.status).toBe(405);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
      expect(mockEnv.DB._statements).toHaveLength(0);
    });

    it.each([
      ['text/plain', 'text/plain'],
      ['form-urlencoded', 'application/x-www-form-urlencoded'],
      ['multipart/form-data', 'multipart/form-data; boundary=---123'],
      ['empty content-type', ''],
    ])('rejects non-JSON content-type %s with 415 UNSUPPORTED_MEDIA_TYPE and 0 writes', async (_, contentType) => {
      const mockEnv = createMockEnv();
      const ctx = createMockCtx();
      const headers: Record<string, string> = {
        Origin: 'https://playlistout.lengxiqwq.com',
      };
      if (contentType) {
        headers['Content-Type'] = contentType;
      }

      const request = new Request(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'visit' }),
      });

      const response = await worker.fetch(request, mockEnv, ctx);
      expect(response.status).toBe(415);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(mockEnv.DB._statements).toHaveLength(0);
    });

    it('accepts application/json with standard charset parameter', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({ type: 'visit' }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(204);
    });

    it('rejects malformed JSON payload with 400 INVALID_INPUT', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: '{ malformed json: true, ',
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
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
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
    });

    it('rejects oversized body via Content-Length (> 1024 bytes) with 400', async () => {
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
          padding: 'x'.repeat(1500),
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('too large');
    });

    it('rejects oversized body even without Content-Length when actual bytes > 1024', async () => {
      // Create body with > 1024 UTF-8 bytes and remove Content-Length header
      const oversizedPayload = JSON.stringify({
        type: 'visit',
        referrer: 'https://example.com/' + 'a'.repeat(1100),
      });

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: oversizedPayload,
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('too large');
    });

    it('correctly calculates byte length for multi-byte Unicode characters', async () => {
      // 350 Chinese characters * 3 bytes each = 1050 bytes > 1024
      const unicodeString = '中'.repeat(350);
      const payload = JSON.stringify({
        type: 'visit',
        referrer: unicodeString,
      });

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: payload,
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('too large');
    });

    it('immediately cancels stream reader and aborts when payload exceeds 1024 bytes without reading full body', async () => {
      let chunksRead = 0;
      let streamCancelled = false;

      // Simulated streaming body that can yield unlimited chunks
      const stream = new ReadableStream({
        pull(controller) {
          chunksRead++;
          // Yield 512 bytes each pull
          controller.enqueue(new Uint8Array(512));
        },
        cancel() {
          streamCancelled = true;
        },
      });

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: stream,
        // @ts-ignore
        duplex: 'half',
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('too large');

      // Crucial abuse boundary: stream was cancelled immediately upon exceeding 1024 bytes (at chunk 3 = 1536 bytes)
      expect(streamCancelled).toBe(true);
      expect(chunksRead).toBeLessThanOrEqual(3);
    });
  });

  describe('Strict Schema & Unknown Fields Rejection', () => {
    it.each([
      ['deviceId', { deviceId: 'random_attacker_did' }],
      ['token', { token: 'secret_token' }],
      ['playlistId', { playlistId: '123456' }],
      ['playlistUrl', { playlistUrl: 'https://y.qq.com/...' }],
      ['userId', { userId: 'attacker_uid' }],
      ['song', { song: 'Private Song' }],
      ['artist', { artist: 'Private Artist' }],
      ['arbitrary random key', { fooBarBaz: 12345 }],
    ])('strictly rejects unknown field "%s" in export payload with 400 INVALID_INPUT', async (fieldName, extraField) => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'export',
          format: 'txt',
          platform: 'qqmusic',
          trackCount: 5,
          ...extraField,
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('Unknown field');
    });

    it('strictly rejects client-supplied deviceId in visit payload (UV inflation prevention)', async () => {
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://playlistout.lengxiqwq.com' },
        body: JSON.stringify({
          type: 'visit',
          deviceId: 'd_attacker_controlled_id',
        }),
      });

      const response = await worker.fetch(request, createMockEnv(), createMockCtx());
      expect(response.status).toBe(400);
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('Unknown field "deviceId"');
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
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('UNSUPPORTED_PLATFORM');
      expect(body.error.message).toContain(unsupportedPlatform);
    });

    it.each([
      -1,
      -100,
      3.14,
      NaN,
      50001,
      1000000,
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
      const body = (await response.json()) as any;
      expect(body.error.code).toBe('INVALID_INPUT');
      expect(body.error.message).toContain('trackCount');
    });
  });

  describe('Rate Limiting, Abuse Boundary & Failure Modes', () => {
    it('returns 429 Too Many Requests with Retry-After when rate limit is exceeded', async () => {
      const mockEnv = createMockEnv({ limitCount: 60 });
      const clientIp = '203.0.113.88';

      // 61st request should be rejected
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
          'cf-connecting-ip': clientIp,
        },
        body: JSON.stringify({ type: 'visit' }),
      });

      const ctx = createMockCtx();
      const response = await worker.fetch(request, mockEnv, ctx);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(parseInt(response.headers.get('Retry-After')!, 10)).toBeGreaterThan(0);

      // Rate limited requests must NOT trigger analytics writes
      expect(ctx._promises).toHaveLength(0);
    });

    it('prohibits bypassing rate limit by altering X-Forwarded-For', async () => {
      const mockEnv = createMockEnv({ limitCount: 60 });
      const realEdgeIp = '203.0.113.99';

      // Attacker tries to bypass by rotating XFF header
      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
          'cf-connecting-ip': realEdgeIp,
          'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        },
        body: JSON.stringify({ type: 'visit' }),
      });

      const response = await worker.fetch(request, mockEnv, createMockCtx());
      // Security identity strictly binds to cf-connecting-ip
      expect(response.status).toBe(429);
    });

    it('fails closed for telemetry writes (0 writes) and returns 204 when rate limiter D1 is down', async () => {
      // Simulating D1 database failure in rate limiter
      const mockEnv = createMockEnv({ failRateLimit: true });
      const ctx = createMockCtx();

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'export',
          format: 'txt',
          platform: 'qqmusic',
          trackCount: 1,
        }),
      });

      const response = await worker.fetch(request, mockEnv, ctx);
      // User experience is preserved (204), but D1 is protected from unmetered writes (0 recorder writes)
      expect(response.status).toBe(204);
      expect(ctx._promises).toHaveLength(0);
    });

    it('succeeds with 204 even when analytics D1 writes fail (best-effort guarantee)', async () => {
      const mockEnv = createMockEnv({ failAnalytics: true });
      const ctx = createMockCtx();

      const request = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
        },
        body: JSON.stringify({
          type: 'export',
          format: 'txt',
          platform: 'qqmusic',
          trackCount: 5,
        }),
      });

      const response = await worker.fetch(request, mockEnv, ctx);
      expect(response.status).toBe(204);
      await Promise.allSettled(ctx._promises);
    });

    it('enforces non-amplifying durable rate limiting: DB count caps at limit and does not increment on 100 subsequent 429 requests', async () => {
      // Start with limit reached (count = 59)
      const mockEnv = createMockEnv({ limitCount: 59 });
      const clientIp = '198.51.100.42';

      // 60th request: Allowed (count becomes 60, reaching the limit)
      const req60 = new Request(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://playlistout.lengxiqwq.com',
          'cf-connecting-ip': clientIp,
        },
        body: JSON.stringify({ type: 'visit' }),
      });
      const res60 = await worker.fetch(req60, mockEnv, createMockCtx());
      expect(res60.status).toBe(204);
      expect(mockEnv.DB._rateLimitCount()).toBe(60);

      // Now send 100 subsequent requests across simulated isolate restarts/instances
      for (let i = 0; i < 100; i++) {
        // Clear in-memory isolate store to simulate a fresh isolate hitting D1
        resetRateLimitStore();

        const req = new Request(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://playlistout.lengxiqwq.com',
            'cf-connecting-ip': clientIp,
          },
          body: JSON.stringify({ type: 'visit' }),
        });

        const res = await worker.fetch(req, mockEnv, createMockCtx());
        expect(res.status).toBe(429);
      }

      // CRITICAL R4 SECURITY INVARIANT:
      // Authoritative DB count MUST remain strictly 60, NOT 160. Zero D1 write amplification.
      expect(mockEnv.DB._rateLimitCount()).toBe(60);
    });

    it('attaches rate limit cleanup tasks to ctx.waitUntil with reliable execution semantics', async () => {
      const pruneStatements: string[] = [];
      const testDb = {
        prepare(sql: string) {
          return {
            bind() {
              return this;
            },
            first: async () => ({ count: 1, reset_at: 100 }),
            run: async () => {
              pruneStatements.push(sql);
              return { success: true };
            },
          };
        },
      } as unknown as D1Database;

      const ctx = createMockCtx();
      const originalRandom = Math.random;
      Math.random = () => 0.01; // Force cleanup branch (< 0.05)

      try {
        await checkDurableRateLimit(testDb, '1.2.3.4', 60, 60, 'event', ctx);
        // Prune promise must be explicitly registered on ctx.waitUntil
        expect(ctx._promises.length).toBeGreaterThanOrEqual(1);
        await Promise.all(ctx._promises);
        expect(pruneStatements.some((s) => s.includes('DELETE FROM security_rate_limits'))).toBe(true);
      } finally {
        Math.random = originalRandom;
      }
    });
  });
});