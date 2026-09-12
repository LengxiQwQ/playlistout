import type { Playlist } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import {
  type RawCYQQResponse,
  type RawMusicUResponse,
  type RawQQSong,
  extractTotalExpected,
  normalizeCYQQResponse,
  normalizeMusicUResponse,
} from './normalize';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const MAX_PAGES = 50; // Safety guard: max 50 pages * 1000 = 50,000 songs
export const PAGE_SIZE = 1000;
const FETCH_TIMEOUT_MS = 15000;

export const ALLOWED_UPSTREAM_HOSTS: ReadonlySet<string> = new Set(['c.y.qq.com', 'u.y.qq.com']);

/**
 * Fetch with timeout and strict host allowlist helper.
 * Enforces redirect: 'error' to prevent arbitrary redirects from becoming arbitrary fetches.
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  // 1. Strict outbound host verification
  try {
    const parsed = new URL(url);
    if (!ALLOWED_UPSTREAM_HOSTS.has(parsed.hostname)) {
      throw new ProviderError('FORBIDDEN', `Outbound request to unauthorized host ${parsed.hostname} is strictly prohibited.`, 403);
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
      redirect: 'error', // Never follow arbitrary redirects
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof ProviderError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError('UPSTREAM_TIMEOUT', `Request to QQ Music timed out after ${timeoutMs}ms.`, 504);
    }
    throw new ProviderError('UPSTREAM_ERROR', `Failed to connect to QQ Music: ${err instanceof Error ? err.message : String(err)}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}


/**
 * Constructs a distinctive key for a song to detect stalled or repeated pages.
 */
export function getSongKey(song: RawQQSong): string {
  if (!song || typeof song !== 'object') return '';
  const mid = (song.songmid || song.mid || '').trim();
  if (mid) return `mid:${mid}`;
  const id = song.songid ?? song.id;
  if (id !== undefined && id !== null && String(id).trim().length > 0) {
    return `id:${String(id).trim()}`;
  }
  const name = (song.songname || song.name || song.title || '').trim();
  let singer = '';
  if (Array.isArray(song.singer)) {
    singer = song.singer.map((s) => (s?.name || s?.title || '').trim()).filter(Boolean).join(',');
  }
  return `name:${name}_singer:${singer}`;
}

/**
 * Checks whether a retrieved pagination page indicates a stalled or replayed response
 * (e.g. upstream ignored the offset and re-returned the beginning of the playlist).
 *
 * NOTE: QQ Music APIs use absolute 0-indexed offsets (song_begin). They do not return
 * sliding protocol overlaps. Legitimate consecutive or repeated songs added by users
 * must NEVER be stripped or deduplicated by content/ID.
 */
export function validatePageNotStalled(
  existingSongs: RawQQSong[],
  pageSongs: RawQQSong[],
  expectedTotal: number,
  offset: number,
  reportedSongBegin?: number,
): void {
  if (!Array.isArray(pageSongs) || pageSongs.length === 0) {
    return;
  }

  // 1. Upstream explicitly reported a song_begin that did not advance
  if (typeof reportedSongBegin === 'number' && offset > 0 && reportedSongBegin !== offset) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Stalled pagination: Upstream reported song_begin ${reportedSongBegin} instead of requested offset ${offset}.`,
      502,
      { expectedCount: expectedTotal, actualCount: existingSongs.length, offset },
    );
  }

  // 2. Upstream ignored offset and re-sent a page replaying the start of the playlist (page 1 from index 0)
  if (existingSongs.length >= 3 && pageSongs.length >= 3) {
    const compareCount = Math.min(pageSongs.length, existingSongs.length, 10);
    const isReplayFromZero = pageSongs
      .slice(0, compareCount)
      .every((song, i) => getSongKey(song) === getSongKey(existingSongs[i]));

    if (isReplayFromZero) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Stalled pagination: Upstream ignored offset and returned repeated songs from index 0 at offset ${offset}.`,
        502,
        { expectedCount: expectedTotal, actualCount: existingSongs.length, offset },
      );
    }
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
    song_begin: '0',
    song_num: String(PAGE_SIZE),
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
  const totalExpected = extractTotalExpected(cd);
  const allSongs: RawQQSong[] = Array.isArray(cd.songlist) ? [...cd.songlist] : [];

  // Fail closed if total is positive but initial songlist is empty
  if (totalExpected !== undefined && totalExpected > 0 && allSongs.length === 0) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: QQ Music reported ${totalExpected} songs, but returned an empty song list.`,
      502,
      { expectedCount: totalExpected, actualCount: 0 },
    );
  }

  // If there are more songs than returned in the first page, paginate with song_begin
  if (totalExpected !== undefined && totalExpected > allSongs.length) {
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
        break;
      }

      let pageJson: RawCYQQResponse;
      try {
        const pageText = await pageResp.text();
        const pageMatch = pageText.match(/^[^(]*\((.*)\)\s*;?\s*$/s);
        pageJson = JSON.parse(pageMatch ? pageMatch[1] : pageText);
      } catch {
        break;
      }

      const pageCd = pageJson.cdlist?.[0];
      const pageSongs = pageCd?.songlist;
      if (!Array.isArray(pageSongs) || pageSongs.length === 0) {
        break;
      }

      validatePageNotStalled(allSongs, pageSongs, totalExpected, songBegin, pageCd?.song_begin);
      allSongs.push(...pageSongs);
    }

    // Strict completeness verification (docs/PROJECT-CONSTITUTION.md & P1 Prompt Section 7)
    if (allSongs.length !== totalExpected) {
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
  const headers = {
    'User-Agent': UPSTREAM_USER_AGENT,
    Referer: `https://y.qq.com/n/ryqq/playlist/${playlistId}`,
    Origin: 'https://y.qq.com',
    'Content-Type': 'application/json',
  };

  const initialPayload = {
    comm: { ct: 24, cv: 0 },
    playlist: {
      module: 'srf_diss_info.DissInfoServer',
      method: 'CgiGetDiss',
      param: {
        disstid: numericId,
        onlysonglist: 0,
        song_begin: 0,
        song_num: PAGE_SIZE,
      },
    },
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(initialPayload),
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

  const pl = rawJson.playlist;
  if (!pl || pl.code !== 0 || !pl.data) {
    throw new ProviderError('UPSTREAM_ERROR', 'QQ Music musicu returned non-zero code or missing data.', 502);
  }

  const data = pl.data;
  const dirinfo = data.dirinfo || {};
  const totalExpected = extractTotalExpected(dirinfo);
  const allSongs: RawQQSong[] = Array.isArray(data.songlist) ? [...data.songlist] : [];

  // Fail closed if total is positive but initial songlist is empty
  if (totalExpected !== undefined && totalExpected > 0 && allSongs.length === 0) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: QQ Music fallback reported ${totalExpected} songs, but returned an empty song list.`,
      502,
      { expectedCount: totalExpected, actualCount: 0 },
    );
  }

  // If there are more songs than returned in the first page, paginate with song_begin
  if (totalExpected !== undefined && totalExpected > allSongs.length) {
    let pageCount = 1;
    while (allSongs.length < totalExpected && pageCount < MAX_PAGES) {
      pageCount++;
      const songBegin = allSongs.length;
      const songNum = Math.min(PAGE_SIZE, totalExpected - songBegin);

      const pagePayload = {
        comm: { ct: 24, cv: 0 },
        playlist: {
          module: 'srf_diss_info.DissInfoServer',
          method: 'CgiGetDiss',
          param: {
            disstid: numericId,
            onlysonglist: 1,
            song_begin: songBegin,
            song_num: songNum,
          },
        },
      };

      const pageResp = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(pagePayload),
      });

      if (!pageResp.ok) {
        break;
      }

      let pageJson: RawMusicUResponse;
      try {
        pageJson = await pageResp.json();
      } catch {
        break;
      }

      const pageSongs = pageJson.playlist?.data?.songlist;
      if (!Array.isArray(pageSongs) || pageSongs.length === 0) {
        break;
      }

      validatePageNotStalled(allSongs, pageSongs, totalExpected, songBegin);
      allSongs.push(...pageSongs);
    }

    // Strict completeness verification (docs/PROJECT-CONSTITUTION.md & P1 Prompt Section 7)
    if (allSongs.length !== totalExpected) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Incomplete playlist: QQ Music fallback reported ${totalExpected} songs, but only ${allSongs.length} could be retrieved.`,
        502,
        { expectedCount: totalExpected, actualCount: allSongs.length },
      );
    }
  }

  // Assign combined songs back to data before normalization
  data.songlist = allSongs;
  return normalizeMusicUResponse(rawJson, playlistId);
}

/**
 * Fetches and normalizes a QQ Music public playlist with failover support.
 */
export async function fetchQQPlaylist(playlistId: string): Promise<Playlist> {
  try {
    return await fetchFromCYQQ(playlistId);
  } catch (primaryErr: unknown) {
    // If it's a 404 (not found / private), do not retry with fallback
    if (primaryErr instanceof ProviderError && primaryErr.statusCode === 404) {
      throw primaryErr;
    }

    // Try fallback endpoint
    try {
      return await fetchFromMusicU(playlistId);
    } catch (fallbackErr: unknown) {
      // If fallback detected a specific semantic error (like INCOMPLETE_PLAYLIST or 404), prioritize it
      if (
        fallbackErr instanceof ProviderError &&
        (fallbackErr.code === 'INCOMPLETE_PLAYLIST' || fallbackErr.statusCode === 404)
      ) {
        throw fallbackErr;
      }
      // Otherwise rethrow the original primary error
      throw primaryErr;
    }
  }
}
