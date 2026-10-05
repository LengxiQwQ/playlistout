import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleSoundiizMigration } from './migration';
import { resetRateLimits } from '../security/rate-limit';

const headers = {
  Origin: 'https://playlistout.lengxiqwq.com',
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function makeRequest(body: unknown, requestHeaders: Record<string, string> = headers) {
  return new Request('https://playlistout-api.lengxiqwq.com/api/migrate/soundiiz', {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}

interface CapturedBind {
  sql: string;
  params: unknown[];
}

function createAnalyticsCaptureDb() {
  const binds: CapturedBind[] = [];
  const db = {
    _binds: binds,
    prepare(sql: string) {
      const statement: any = {
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          statement._params = params;
          binds.push({ sql, params });
          return statement;
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
    async batch(statements: any[]) {
      for (const statement of statements) {
        await statement.run();
      }
      return [];
    },
  };
  return db as unknown as D1Database & { _binds: CapturedBind[] };
}

function createCtx() {
  const promises: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        promises.push(promise);
      },
      passThroughOnException() {},
    } as unknown as ExecutionContext,
    promises,
  };
}

const validBody = {
  title: 'Test Playlist',
  sourcePlatform: 'qqmusic',
  trackCount: 2,
  loadedTrackCount: 2,
  isPartial: false,
  destination: 'spotify',
  tracks: [
    { title: 'Song A', artists: ['Artist A'], album: 'Album A' },
    { title: 'Song B', artists: ['Artist B'] },
  ],
};

describe('handleSoundiizMigration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetRateLimits();
  });

  it('rejects requests that are not from an allowed Playlist Out web origin', async () => {
    const response = await handleSoundiizMigration(
      makeRequest(validBody, {
        Origin: 'https://example.com',
        'Content-Type': 'application/json',
      }),
      {},
      {},
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' },
    });
  });

  it('enforces the 200-track Soundiiz handoff limit', async () => {
    const response = await handleSoundiizMigration(
      makeRequest({
        ...validBody,
        trackCount: 201,
        loadedTrackCount: 201,
        tracks: Array.from({ length: 201 }, (_, index) => ({
          title: `Song ${index + 1}`,
          artists: ['Artist'],
        })),
      }),
      {},
      {},
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('forwards a clean tracklist and returns the temporary Soundiiz share URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          nbTracks: 2,
          shareUrl: 'https://soundiiz.com/go/import-playlist/abc123',
          expiresAt: 1782220923,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const db = createAnalyticsCaptureDb();
    const { ctx, promises } = createCtx();
    const response = await handleSoundiizMigration(makeRequest(validBody), { DB: db }, {}, ctx);
    await Promise.all(promises);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      success: true,
      data: {
        nbTracks: 2,
        shareUrl: 'https://soundiiz.com/go/import-playlist/abc123',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const upstream = JSON.parse(String(init?.body));
    expect(upstream).toMatchObject({
      title: 'Test Playlist',
      sourceName: 'Playlist Out',
      destination: 'spotify',
      tracklist: [
        { title: 'Song A', artists: ['Artist A'], album: 'Album A' },
        { title: 'Song B', artists: ['Artist B'] },
      ],
    });

    const v2Sql = db._binds.map((entry) => entry.sql).join('\n');
    expect(v2Sql).toContain('analytics_v2_daily_core');
    expect(v2Sql).toContain('analytics_v2_breakdown');
    expect(v2Sql).not.toContain('aggregate_stats');
    expect(v2Sql).not.toContain('daily_performance_stats');

    const flattened = db._binds.flatMap((entry) => entry.params.map(String));
    expect(flattened).toContain('migration_handoff');
    expect(flattened).toContain('migration_destination');
    expect(flattened).toContain('spotify');
    expect(flattened).toContain('migration_provider');
    expect(flattened).toContain('soundiiz');
  });

  it('blocks an unexpected upstream redirect URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'success',
            nbTracks: 2,
            shareUrl: 'https://example.com/redirect',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const response = await handleSoundiizMigration(makeRequest(validBody), {}, {});
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UPSTREAM_ERROR' },
    });
  });
});
