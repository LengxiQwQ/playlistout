import { describe, expect, it } from 'vitest';
import { recordResolveV2, maybeRecordDailyActiveV2 } from './v2-recorder';

interface CapturedStatement {
  sql: string;
  binds: unknown[];
}

function createDb(captured: CapturedStatement[]): D1Database {
  return {
    prepare(sql: string) {
      const entry: CapturedStatement = { sql, binds: [] };
      captured.push(entry);
      const statement: any = {
        bind(...args: unknown[]) {
          entry.binds = args;
          return statement;
        },
        async run() {
          return { meta: { changes: 0 } };
        },
        async all() {
          return { results: [] };
        },
      };
      return statement;
    },
    async batch() {
      return { results: [] };
    },
  } as unknown as D1Database;
}

function apiRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345', {
    headers,
  });
}

function findStatement(captured: CapturedStatement[], table: string): CapturedStatement {
  const statement = captured.find((entry) => entry.sql.includes(`INSERT INTO ${table}`));
  if (!statement) throw new Error(`No prepared statement for ${table}`);
  return statement;
}

describe('Analytics V2 recorder attribution', () => {
  it('records a registered plugin request with Host-derived environment and version dims', async () => {
    const captured: CapturedStatement[] = [];
    await recordResolveV2(createDb(captured), {
      request: apiRequest({
        'X-PlaylistOut-Client-Type': 'plugin',
        'X-PlaylistOut-Client-Id': 'musicfree',
        'X-PlaylistOut-Client-Version': '1.3.9',
        'X-PlaylistOut-Host': 'android',
        'User-Agent': 'PlaylistOut-MusicFree/1.3.9',
      }),
      outcome: 'success_playlist',
      platform: 'qqmusic',
    });

    const daily = findStatement(captured, 'analytics_v2_daily_core');
    expect(daily.binds.slice(1, 4)).toEqual(['plugin', 'musicfree', 'qqmusic']);

    const env = findStatement(captured, 'analytics_v2_client_env');
    expect(env.binds).toEqual([
      expect.any(String),
      'plugin',
      'musicfree',
      'mobile',
      'plugin:musicfree',
      'android',
    ]);

    const versionDim = captured.find(
      (entry) => entry.binds.includes('client_version'),
    );
    expect(versionDim?.binds).toContain('1.3.9');
    const hostDim = captured.find((entry) => entry.binds.includes('host_platform'));
    expect(hostDim?.binds).toContain('android');
  });

  it('bounds an unregistered plugin id to unknown_plugin', async () => {
    const captured: CapturedStatement[] = [];
    await recordResolveV2(createDb(captured), {
      request: apiRequest({
        'X-PlaylistOut-Client-Type': 'plugin',
        'X-PlaylistOut-Client-Id': 'someone-else',
        'X-PlaylistOut-Client-Version': '0.1.0',
        'X-PlaylistOut-Host': 'android',
        'User-Agent': 'PlaylistOut-MusicFree/1.3.9',
      }),
      outcome: 'failure',
      platform: 'unknown',
    });

    const daily = findStatement(captured, 'analytics_v2_daily_core');
    expect(daily.binds[2]).toBe('unknown_plugin');
  });

  it('records official web traffic with UA-derived environment and no plugin dims', async () => {
    const captured: CapturedStatement[] = [];
    await recordResolveV2(createDb(captured), {
      request: apiRequest({
        Origin: 'https://playlistout.lengxiqwq.com',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      }),
      outcome: 'success_playlist',
      platform: 'netease',
    });

    const env = findStatement(captured, 'analytics_v2_client_env');
    expect(env.binds).toEqual([
      expect.any(String),
      'web',
      'official_web',
      'desktop',
      'chrome',
      'windows',
    ]);

    expect(captured.some((entry) => entry.binds.includes('client_version'))).toBe(false);
    expect(captured.some((entry) => entry.binds.includes('host_platform'))).toBe(false);
  });
});

describe('Daily active (DAU) recording', () => {
  function createActiveDb(
    captured: CapturedStatement[],
    changesForActiveInsert = 1,
  ): { db: D1Database; batches: CapturedStatement[][] } {
    const batches: CapturedStatement[][] = [];
    const db = {
      prepare(sql: string) {
        const entry: any = { sql, binds: [] as unknown[] };
        captured.push(entry);
        const statement: any = {
          __entry: entry,
          bind(...args: unknown[]) {
            entry.binds = args;
            return statement;
          },
          async run() {
            return { meta: { changes: sql.includes('daily_active_hashes') ? changesForActiveInsert : 1 } };
          },
          async all() {
            return { results: [] };
          },
        };
        return statement;
      },
      async batch(stmts: any[]) {
        batches.push(stmts.map((s) => s.__entry));
        return { results: [] };
      },
    } as unknown as D1Database;
    return { db, batches };
  }

  function pluginRequest(overrides: { ua?: string; id?: string } = {}): Request {
    return apiRequest({
      'X-PlaylistOut-Client-Type': 'plugin',
      'X-PlaylistOut-Client-Id': overrides.id ?? 'musicfree',
      'X-PlaylistOut-Client-Version': '2.1.4',
      'X-PlaylistOut-Host': 'windows',
      'User-Agent': overrides.ua ?? 'PlaylistOut-MusicFree/2.1.3 (desktop; windows)',
    });
  }

  it('records a new plugin daily-active user with platform none', async () => {
    const captured: CapturedStatement[] = [];
    const { db, batches } = createActiveDb(captured);

    const recorded = await maybeRecordDailyActiveV2(db, pluginRequest());

    expect(recorded).toBe(true);

    const activeInsert = captured.find((entry) => entry.sql.includes('INSERT OR IGNORE INTO daily_active_hashes'));
    expect(activeInsert).toBeDefined();
    expect(activeInsert!.binds).toEqual([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      'plugin:musicfree',
      expect.stringMatching(/^[0-9a-f]{16}$/),
    ]);

    const dailyCore = batches[0].find((entry) => entry.sql.includes('analytics_v2_daily_core'));
    expect(dailyCore).toBeDefined();
    expect(dailyCore!.binds).toEqual([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      'plugin',
      'musicfree',
      'none',
      'active_user',
      1,
    ]);

    const prune = captured.find((entry) => entry.sql.includes('DELETE FROM daily_active_hashes'));
    expect(prune).toBeDefined();
  });

  it('does not double count when the daily hash already exists', async () => {
    const captured: CapturedStatement[] = [];
    const { db, batches } = createActiveDb(captured, 0);

    const recorded = await maybeRecordDailyActiveV2(db, pluginRequest());

    expect(recorded).toBe(false);
    expect(batches).toHaveLength(0);
    expect(captured.some((entry) => entry.sql.includes('DELETE FROM daily_active_hashes'))).toBe(false);
  });

  it('is a no-op for unregistered plugins, anonymous API, and web traffic', async () => {
    for (const request of [
      pluginRequest({ id: 'someone_else' }),
      apiRequest({}),
      new Request('https://playlistout-api.lengxiqwq.com/api/event', {
        headers: { Origin: 'https://playlistout.lengxiqwq.com' },
      }),
    ]) {
      const captured: CapturedStatement[] = [];
      const { db, batches } = createActiveDb(captured);
      const recorded = await maybeRecordDailyActiveV2(db, request);
      expect(recorded).toBe(false);
      expect(captured.some((entry) => entry.sql.includes('daily_active_hashes'))).toBe(false);
      expect(batches).toHaveLength(0);
    }
  });

  it('records the official CLI but not anonymous CLI clients', async () => {
    const officialCaptured: CapturedStatement[] = [];
    const official = await maybeRecordDailyActiveV2(
      createActiveDb(officialCaptured).db,
      apiRequest({
        'X-PlaylistOut-Client-Type': 'cli',
        'X-PlaylistOut-Client-Id': 'official_cli',
        'User-Agent': 'PlaylistOut-CLI/2.2.0',
      }),
    );
    expect(official).toBe(true);
    expect(officialCaptured.some((entry) =>
      entry.sql.includes('INSERT OR IGNORE INTO daily_active_hashes') && entry.binds[1] === 'cli:official_cli',
    )).toBe(true);

    const anonymousCaptured: CapturedStatement[] = [];
    const anonymous = await maybeRecordDailyActiveV2(
      createActiveDb(anonymousCaptured).db,
      apiRequest({
        'X-PlaylistOut-Client-Type': 'cli',
        'X-PlaylistOut-Client-Id': 'homebrew_script',
        'User-Agent': 'PlaylistOut-CLI/2.2.0',
      }),
    );
    expect(anonymous).toBe(false);
    expect(anonymousCaptured.some((entry) => entry.sql.includes('daily_active_hashes'))).toBe(false);
  });

  it('normalizes UA versions so a same-day client upgrade dedupes to one hash', async () => {
    const firstCaptured: CapturedStatement[] = [];
    await maybeRecordDailyActiveV2(
      createActiveDb(firstCaptured).db,
      pluginRequest({ ua: 'PlaylistOut-MusicFree/2.1.3 (desktop; windows)' }),
    );
    const secondCaptured: CapturedStatement[] = [];
    await maybeRecordDailyActiveV2(
      createActiveDb(secondCaptured).db,
      pluginRequest({ ua: 'PlaylistOut-MusicFree/2.1.4 (desktop; windows)' }),
    );

    const firstHash = firstCaptured.find((entry) => entry.sql.includes('INSERT OR IGNORE INTO daily_active_hashes'))!.binds[2];
    const secondHash = secondCaptured.find((entry) => entry.sql.includes('INSERT OR IGNORE INTO daily_active_hashes'))!.binds[2];
    expect(firstHash).toBe(secondHash);
  });

  it('derives daily-active from registered plugin resolve traffic (old client versions)', async () => {
    const captured: CapturedStatement[] = [];
    await recordResolveV2(createActiveDb(captured).db, {
      request: pluginRequest(),
      outcome: 'success_playlist',
      platform: 'qqmusic',
    });

    expect(captured.some((entry) => entry.sql.includes('daily_active_hashes'))).toBe(true);
  });

  it('does not derive daily-active for unregistered plugin resolve traffic', async () => {
    const captured: CapturedStatement[] = [];
    await recordResolveV2(createActiveDb(captured).db, {
      request: pluginRequest({ id: 'someone_else' }),
      outcome: 'success_playlist',
      platform: 'qqmusic',
    });

    expect(captured.some((entry) => entry.sql.includes('daily_active_hashes'))).toBe(false);
  });
});
