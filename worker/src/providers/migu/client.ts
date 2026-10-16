import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import type { RawMiguPlaylistResponse, RawMiguSongListResponse } from './types';
import { normalizeMiguPlaylist, normalizeMiguTrack } from './normalize';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const FETCH_TIMEOUT_MS = 15000;
const PAGE_SIZE = 50;
const MAX_PAGES = 50;
const CONCURRENT_BATCH_SIZE = 5;

export const ALLOWED_MIGU_HOSTS: ReadonlySet<string> = new Set([
  'c.migu.cn',
  'h5.nf.migu.cn',
  'c.musicapp.migu.cn',
  'music.migu.cn',
  'm.music.migu.cn',
  'd.musicapp.migu.cn',
]);

/**
 * Fetch helper with host allowlist and timeout protection against SSRF.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_MIGU_HOSTS.has(parsed.hostname)) {
      throw new ProviderError(
        'FORBIDDEN',
        `Outbound request to unauthorized host ${parsed.hostname} is strictly prohibited.`,
        403,
      );
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError('INVALID_INPUT', 'Malformed upstream request URL.', 400);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof ProviderError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError(
        'UPSTREAM_TIMEOUT',
        `Request to Migu Music timed out after ${timeoutMs}ms.`,
        504,
      );
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Failed to connect to Migu Music: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches playlist metadata from Migu Music API.
 */
async function fetchPlaylistMeta(playlistId: string): Promise<RawMiguPlaylistResponse['data']> {
  const metaUrl = `https://c.musicapp.migu.cn/MIGUM3.0/resource/playlist/v2.0?playlistId=${encodeURIComponent(playlistId)}`;
  const resp = await fetchWithTimeout(metaUrl, {
    method: 'GET',
    headers: {
      'User-Agent': UPSTREAM_USER_AGENT,
      'Referer': 'https://h5.nf.migu.cn/',
    },
  });

  if (!resp.ok) {
    if (resp.status === 404) {
      throw new ProviderError('PLAYLIST_NOT_FOUND', `Migu playlist ${playlistId} not found.`, 404);
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Migu Music returned HTTP ${resp.status} while fetching playlist metadata.`,
      502,
    );
  }

  let body: RawMiguPlaylistResponse;
  try {
    body = (await resp.json()) as RawMiguPlaylistResponse;
  } catch {
    throw new ProviderError(
      'UPSTREAM_ERROR',
      'Failed to parse Migu playlist metadata JSON response.',
      502,
    );
  }

  if (body.code !== '000000') {
    throw new ProviderError(
      'PLAYLIST_NOT_FOUND',
      `Migu Music returned error code ${body.code}: ${body.info || 'Playlist not found or unavailable'}.`,
      404,
    );
  }

  return body.data;
}

/**
 * Fetches a single page of songs from Migu Music API.
 */
async function fetchSongPage(
  playlistId: string,
  pageNo: number,
): Promise<RawMiguSongListResponse['data']> {
  const songUrl = `https://c.musicapp.migu.cn/MIGUM3.0/resource/playlist/song/v2.0?playlistId=${encodeURIComponent(playlistId)}&pageNo=${pageNo}&pageSize=${PAGE_SIZE}`;
  const resp = await fetchWithTimeout(songUrl, {
    method: 'GET',
    headers: {
      'User-Agent': UPSTREAM_USER_AGENT,
      'Referer': 'https://h5.nf.migu.cn/',
    },
  });

  if (!resp.ok) {
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Migu Music returned HTTP ${resp.status} while fetching songs page ${pageNo}.`,
      502,
    );
  }

  let body: RawMiguSongListResponse;
  try {
    body = (await resp.json()) as RawMiguSongListResponse;
  } catch {
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Failed to parse Migu song list page ${pageNo} response.`,
      502,
    );
  }

  if (body.code !== '000000') {
    return { songList: [], totalCount: 0 };
  }

  return body.data;
}

/**
 * Fetches a complete Migu Music playlist by ID.
 * Automatically paginates through all songs up to MAX_PAGES.
 */
export async function fetchMiguPlaylist(playlistId: string): Promise<Playlist> {
  const cleanId = String(playlistId).trim();
  if (!cleanId) {
    throw new ProviderError('INVALID_INPUT', 'Playlist ID cannot be empty.', 400);
  }

  // 1. Fetch metadata and first page of songs in parallel
  const [meta, page1Data] = await Promise.all([
    fetchPlaylistMeta(cleanId),
    fetchSongPage(cleanId, 1),
  ]);

  const rawSongList = [...(page1Data?.songList || [])];
  const totalCount = page1Data?.totalCount ?? meta?.musicNum ?? rawSongList.length;

  // 2. Paginate if playlist has more than PAGE_SIZE songs
  if (totalCount > PAGE_SIZE && rawSongList.length >= PAGE_SIZE) {
    const totalPagesNeeded = Math.min(MAX_PAGES, Math.ceil(totalCount / PAGE_SIZE));
    const remainingPages = Array.from({ length: totalPagesNeeded - 1 }, (_, i) => i + 2);

    for (let i = 0; i < remainingPages.length; i += CONCURRENT_BATCH_SIZE) {
      const batch = remainingPages.slice(i, i + CONCURRENT_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((pageNo) => fetchSongPage(cleanId, pageNo)),
      );

      for (const pageData of batchResults) {
        if (pageData?.songList && pageData.songList.length > 0) {
          rawSongList.push(...pageData.songList);
        }
      }
    }
  }

  // 3. Normalize all songs and playlist meta
  const tracks: Track[] = rawSongList.map((raw, idx) => normalizeMiguTrack(raw, idx + 1));
  return normalizeMiguPlaylist(meta, tracks, cleanId);
}
