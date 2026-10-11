import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import type { RawKuwoPlaylistResponse } from './types';
import { normalizeKuwoPlaylist, normalizeKuwoTrack } from './normalize';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const FETCH_TIMEOUT_MS = 15000;
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const CONCURRENT_BATCH_SIZE = 5;

export const ALLOWED_KUWO_HOSTS: ReadonlySet<string> = new Set([
  'm.kuwo.cn',
  'www.kuwo.cn',
  'kuwo.cn',
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
    if (!ALLOWED_KUWO_HOSTS.has(parsed.hostname)) {
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
        `Request to Kuwo Music timed out after ${timeoutMs}ms.`,
        504,
      );
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Failed to connect to Kuwo Music: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Builds the H5 wapi URL for playlist detail.
 */
function buildKuwoPlaylistUrl(playlistId: string, page: number, pageSize: number): string {
  return `https://m.kuwo.cn/newh5app/wapi/api/www/playlist/playListInfo?pid=${encodeURIComponent(playlistId)}&pn=${page}&rn=${pageSize}`;
}

/**
 * Fetches single page of Kuwo playlist.
 */
async function fetchKuwoPage(
  playlistId: string,
  page: number,
  pageSize: number = PAGE_SIZE,
): Promise<RawKuwoPlaylistResponse> {
  const url = buildKuwoPlaylistUrl(playlistId, page, pageSize);
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'User-Agent': UPSTREAM_USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      Referer: `https://m.kuwo.cn/newh5app/playlist_detail/${playlistId}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new ProviderError('PLAYLIST_NOT_FOUND', `Kuwo playlist ${playlistId} not found.`, 404);
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Kuwo upstream returned HTTP ${response.status}`,
      502,
    );
  }

  try {
    const data = (await response.json()) as RawKuwoPlaylistResponse;
    return data;
  } catch {
    throw new ProviderError('PARSE_ERROR', 'Failed to parse Kuwo response as JSON.', 502);
  }
}

/**
 * Fetches a full Kuwo playlist by ID, handling automatic multi-page pagination.
 */
export async function fetchKuwoPlaylist(playlistId: string): Promise<Playlist> {
  // 1. Fetch first page to acquire playlist metadata and total track count
  const page1Res = await fetchKuwoPage(playlistId, 1, PAGE_SIZE);

  if (page1Res.code !== 200 || !page1Res.data) {
    const errorMsg = String(page1Res.msg || '');
    if (/不存在|未找到|not found/i.test(errorMsg)) {
      throw new ProviderError('PLAYLIST_NOT_FOUND', `Kuwo playlist ${playlistId} not found.`, 404);
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Kuwo API error (code ${page1Res.code}): ${errorMsg || 'Unknown error'}`,
      502,
    );
  }

  const playlistData = page1Res.data;

  // Empty playlist validation: if no name, no songs, and total === 0
  const initialSongs = playlistData.musicList || [];
  const rawTotal = typeof playlistData.total === 'number'
    ? playlistData.total
    : Number(playlistData.total || 0);

  if (!playlistData.name && initialSongs.length === 0 && rawTotal === 0) {
    throw new ProviderError('PLAYLIST_NOT_FOUND', `Kuwo playlist ${playlistId} not found or is empty.`, 404);
  }

  const allSongs = [...initialSongs];
  const totalTracks = rawTotal > 0 ? rawTotal : initialSongs.length;
  const totalPages = Math.ceil(totalTracks / PAGE_SIZE);

  // 2. Paginate subsequent pages if playlist contains more than PAGE_SIZE tracks
  if (totalPages > 1) {
    const targetPages = Math.min(totalPages, MAX_PAGES);
    const remainingPageNumbers: number[] = [];
    for (let p = 2; p <= targetPages; p++) {
      remainingPageNumbers.push(p);
    }

    // Process in concurrent batches to prevent socket saturation
    for (let i = 0; i < remainingPageNumbers.length; i += CONCURRENT_BATCH_SIZE) {
      const batch = remainingPageNumbers.slice(i, i + CONCURRENT_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((p) =>
          fetchKuwoPage(playlistId, p, PAGE_SIZE).catch((err) => {
            console.warn(`[Kuwo Provider] Failed to fetch page ${p} for playlist ${playlistId}:`, err);
            return null;
          }),
        ),
      );

      for (const res of batchResults) {
        if (res && res.code === 200 && res.data && Array.isArray(res.data.musicList)) {
          allSongs.push(...res.data.musicList);
        }
      }
    }
  }

  // 3. Normalize all tracks with 1-based indices
  const normalizedTracks: Track[] = allSongs.map((song, idx) =>
    normalizeKuwoTrack(song, idx + 1),
  );

  // 4. Return normalized Playlist
  return normalizeKuwoPlaylist(playlistId, playlistData, normalizedTracks);
}
