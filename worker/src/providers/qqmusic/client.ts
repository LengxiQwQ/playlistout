import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import {
  type RawCYQQResponse,
  type RawMusicUResponse,
  type RawQQSong,
  normalizeCYQQResponse,
  normalizeMusicUResponse,
} from './normalize';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MAX_PAGES = 50; // Safety guard: max 50 pages * 1000 = 50,000 songs
const PAGE_SIZE = 1000;
const FETCH_TIMEOUT_MS = 15000;

/**
 * Fetch with timeout helper.
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError('UPSTREAM_ERROR', `Request to QQ Music timed out after ${timeoutMs}ms.`, 504);
    }
    throw new ProviderError('UPSTREAM_ERROR', `Failed to connect to QQ Music: ${err instanceof Error ? err.message : String(err)}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Primary fetcher: c.y.qq.com
 */
async function fetchFromCYQQ(playlistId: string): Promise<Playlist> {
  const baseUrl = 'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg';
  const headers = {
    'User-Agent': UPSTREAM_USER_AGENT,
    Referer: `https://y.qq.com/n/ryqq/playlist/${playlistId}`,
    Origin: 'https://y.qq.com',
    Accept: 'application/json',
  };

  const initialParams = new URLSearchParams({
    disstid: playlistId,
    type: '1',
    json: '1',
    utf8: '1',
    onlysong: '0',
    format: 'json',
  });

  const response = await fetchWithTimeout(`${baseUrl}?${initialParams.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new ProviderError('UPSTREAM_ERROR', `QQ Music returned HTTP status ${response.status}.`, 502);
  }

  let rawJson: RawCYQQResponse;
  try {
    const text = await response.text();
    // In case of JSONP padding
    const jsonpMatch = text.match(/^[^(]*\((.*)\)\s*;?\s*$/s);
    const jsonStr = jsonpMatch ? jsonpMatch[1] : text;
    rawJson = JSON.parse(jsonStr);
  } catch {
    throw new ProviderError('PARSE_ERROR', 'Failed to parse JSON response from QQ Music.', 502);
  }

  if (rawJson.code !== 0) {
    if (rawJson.code === 10 || rawJson.code === -1) {
      throw new ProviderError('PLAYLIST_NOT_FOUND', `QQ Music playlist ${playlistId} does not exist or is private.`, 404);
    }
    throw new ProviderError('UPSTREAM_ERROR', `QQ Music returned error code ${rawJson.code}.`, 502);
  }

  if (!Array.isArray(rawJson.cdlist) || rawJson.cdlist.length === 0) {
    throw new ProviderError('PLAYLIST_NOT_FOUND', `QQ Music playlist ${playlistId} was not found or is empty.`, 404);
  }

  const cd = rawJson.cdlist[0];
  const totalExpected = typeof cd.total_song_num === 'number' && cd.total_song_num > 0 ? cd.total_song_num : cd.songnum;
  const allSongs: RawQQSong[] = Array.isArray(cd.songlist) ? [...cd.songlist] : [];

  // If there are more songs than returned in the first page, paginate with song_begin
  if (typeof totalExpected === 'number' && totalExpected > allSongs.length) {
    let pageCount = 1;
    while (allSongs.length < totalExpected && pageCount < MAX_PAGES) {
      pageCount++;
      const songBegin = allSongs.length;
      const songNum = Math.min(PAGE_SIZE, totalExpected - songBegin);

      const pageParams = new URLSearchParams({
        disstid: playlistId,
        type: '1',
        json: '1',
        utf8: '1',
        onlysong: '0',
        format: 'json',
        song_begin: String(songBegin),
        song_num: String(songNum),
      });

      const pageResp = await fetchWithTimeout(`${baseUrl}?${pageParams.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!pageResp.ok) {
        break; // Stop pagination and check completeness below
      }

      const pageText = await pageResp.text();
      const pageMatch = pageText.match(/^[^(]*\((.*)\)\s*;?\s*$/s);
      const pageJson: RawCYQQResponse = JSON.parse(pageMatch ? pageMatch[1] : pageText);
      const pageCd = pageJson.cdlist?.[0];
      const pageSongs = pageCd?.songlist;

      if (!Array.isArray(pageSongs) || pageSongs.length === 0) {
        break; // No more songs returned
      }

      allSongs.push(...pageSongs);
    }

    // Strict completeness verification (docs/PROJECT-CONSTITUTION.md & P1 Prompt Section 7)
    if (allSongs.length < totalExpected) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Incomplete playlist: QQ Music reported ${totalExpected} songs, but only ${allSongs.length} could be retrieved.`,
        502,
        { expectedCount: totalExpected, actualCount: allSongs.length },
      );
    }
  }

  // Assign combined songs back to cd before normalization
  cd.songlist = allSongs;
  return normalizeCYQQResponse(rawJson, playlistId);
}

/**
 * Fallback fetcher: u.y.qq.com (musicu.fcg with srf_diss_info.DissInfoServer)
 */
async function fetchFromMusicU(playlistId: string): Promise<Playlist> {
  const url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
  const numericId = Number(playlistId);

  const payload = {
    comm: { ct: 24, cv: 0 },
    playlist: {
      module: 'srf_diss_info.DissInfoServer',
      method: 'CgiGetDiss',
      param: {
        disstid: numericId,
        onlysonglist: 0,
        song_begin: 0,
        song_num: 1000,
      },
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'User-Agent': UPSTREAM_USER_AGENT,
      Referer: `https://y.qq.com/n/ryqq/playlist/${playlistId}`,
      Origin: 'https://y.qq.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ProviderError('UPSTREAM_ERROR', `QQ Music fallback returned HTTP status ${response.status}.`, 502);
  }

  let rawJson: RawMusicUResponse;
  try {
    rawJson = await response.json();
  } catch {
    throw new ProviderError('PARSE_ERROR', 'Failed to parse JSON response from QQ Music fallback.', 502);
  }

  return normalizeMusicUResponse(rawJson, playlistId);
}

/**
 * Fetches and normalizes a QQ Music public playlist with failover support.
 */
export async function fetchQQPlaylist(playlistId: string): Promise<Playlist> {
  try {
    return await fetchFromCYQQ(playlistId);
  } catch (err: unknown) {
    // If it's a 404 (not found / private), do not retry with fallback
    if (err instanceof ProviderError && err.statusCode === 404) {
      throw err;
    }

    // Try fallback endpoint
    try {
      return await fetchFromMusicU(playlistId);
    } catch {
      // If fallback also fails, rethrow the original primary error
      throw err;
    }
  }
}
