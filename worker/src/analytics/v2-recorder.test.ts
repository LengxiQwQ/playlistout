import { describe, expect, it } from 'vitest';
import { recordResolveV2 } from './v2-recorder';

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
