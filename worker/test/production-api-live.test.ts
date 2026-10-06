import { describe, expect, it } from 'vitest';
import { PLAYLISTOUT_VERSION } from '../src/version';

const API_BASE = 'https://playlistout-api.lengxiqwq.com';
const TEMPORARY_STATUSES = new Set([429, 500, 502, 503, 504]);

const commonHeaders = {
  Accept: 'application/json',
  Origin: 'https://github.com',
  'User-Agent': `PlaylistOut-Live-Acceptance/${PLAYLISTOUT_VERSION}`,
  'X-PlaylistOut-Client-Type': 'api',
  'X-PlaylistOut-Client-Id': 'github_live_acceptance',
  'X-PlaylistOut-Client-Version': PLAYLISTOUT_VERSION,
  'X-PlaylistOut-Host': 'github_actions',
};

async function requestJson(path: string, maxRetries = 2): Promise<{ response: Response; body: any }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_BASE + path, { headers: commonHeaders });
      const raw = await response.text();
      let body: any = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`Production API returned non-JSON body for ${path}: ${raw.slice(0, 240)}`);
      }

      if (response.ok) {
        return { response, body };
      }

      const detail = body?.error?.code || body?.error?.message || raw.slice(0, 240);
      if (!TEMPORARY_STATUSES.has(response.status) || attempt === maxRetries) {
        throw new Error(`Production API ${path} failed with HTTP ${response.status}: ${detail}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Production API request failed unexpectedly.');
}

function resolvePath(input: string): string {
  return '/api/v1/resolve?q=' + encodeURIComponent(input) + '&type=playlist';
}

function assertPlaylistEnvelope(body: any, platform: string) {
  expect(body?.success).toBe(true);
  expect(body?.data?.kind).toBe('playlist');
  expect(body?.data?.platform).toBe(platform);

  const playlist = body?.data?.result;
  expect(playlist).toBeTruthy();
  expect(playlist.platform).toBe(platform);
  expect(typeof playlist.id).toBe('string');
  expect(playlist.id.length).toBeGreaterThan(0);
  expect(typeof playlist.name).toBe('string');
  expect(playlist.name.length).toBeGreaterThan(0);
  expect(Array.isArray(playlist.tracks)).toBe(true);
  expect(playlist.tracks.length).toBeGreaterThan(0);
  expect(Number(playlist.trackCount)).toBeGreaterThanOrEqual(playlist.tracks.length);

  playlist.tracks.slice(0, 10).forEach((track: any, index: number) => {
    expect(track.index).toBe(index + 1);
    expect(typeof track.title).toBe('string');
    expect(track.title.length).toBeGreaterThan(0);
    expect(Array.isArray(track.artists)).toBe(true);
  });

  return playlist;
}

describe('Production Public API live smoke', { timeout: 90000 }, () => {
  it('serves the current API version with public CORS', async () => {
    const { response, body } = await requestJson('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(body.status).toBe('ok');
    expect(body.service).toBe('playlistout-api');
    expect(body.version).toBe(PLAYLISTOUT_VERSION);
  });

  it('resolves a real QQ Music playlist through production', async () => {
    const { response, body } = await requestJson(
      resolvePath('https://y.qq.com/n/ryqq/playlist/9547521556'),
    );
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const playlist = assertPlaylistEnvelope(body, 'qqmusic');
    expect(playlist.tracks.length).toBe(playlist.trackCount);
  });

  it('resolves a real NetEase playlist through production', async () => {
    const { response, body } = await requestJson(
      resolvePath('https://music.163.com/playlist?id=3778678'),
    );
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const playlist = assertPlaylistEnvelope(body, 'netease');
    expect(playlist.tracks.length).toBe(playlist.trackCount);
  });

  it('resolves a real KuGou preview through production without credentials', async () => {
    const { response, body } = await requestJson(
      resolvePath('https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/'),
    );
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const playlist = assertPlaylistEnvelope(body, 'kugou');
    expect(playlist.retrieval?.mode).toBe('preview');
    expect(playlist.retrieval?.reason).toBe('auth_required');
    expect(playlist.tracks.length).toBeLessThanOrEqual(playlist.trackCount);
  });

  it('resolves a real Qishui playlist through production', async () => {
    const { response, body } = await requestJson(
      resolvePath('https://www.qishui.com/share/playlist?playlist_id=7087507348697186339'),
    );
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const playlist = assertPlaylistEnvelope(body, 'qishui');
    expect(playlist.tracks.length).toBe(playlist.trackCount);
  });
});
