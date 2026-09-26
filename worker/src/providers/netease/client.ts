import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import {
  type RawNeteasePlaylistDetailResponse,
  type RawNeteasePrivilege,
  type RawNeteaseSong,
  type RawNeteaseSongDetailResponse,
  normalizeNeteasePlaylist,
  normalizeNeteaseTrack,
} from './normalize';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 15000;
const BATCH_SIZE = 500;

export const ALLOWED_NETEASE_HOSTS: ReadonlySet<string> = new Set([
  'music.163.com',
  '163cn.tv',
  'y.music.163.com',
]);

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_NETEASE_HOSTS.has(parsed.hostname)) {
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
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof ProviderError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError('UPSTREAM_TIMEOUT', `Request to NetEase Music timed out after ${timeoutMs}ms.`, 504);
    }
    throw new ProviderError('UPSTREAM_ERROR', `Failed to connect to NetEase Music: ${err instanceof Error ? err.message : String(err)}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Batches song details from NetEase api/v3/song/detail
 */
export async function fetchSongDetails(
  songIds: Array<number | string>,
  batchSize: number = BATCH_SIZE,
): Promise<{ songs: RawNeteaseSong[]; privileges: RawNeteasePrivilege[] }> {
  if (songIds.length === 0) {
    return { songs: [], privileges: [] };
  }

  const allSongs: RawNeteaseSong[] = [];
  const allPrivileges: RawNeteasePrivilege[] = [];

  for (let i = 0; i < songIds.length; i += batchSize) {
    const chunk = songIds.slice(i, i + batchSize);
    const cParam = JSON.stringify(chunk.map((id) => ({ id: Number(id) })));
    const postBody = new URLSearchParams({ c: cParam }).toString();

    const response = await fetchWithTimeout(
      'https://music.163.com/api/v3/song/detail',
      {
        method: 'POST',
        headers: {
          'User-Agent': UPSTREAM_USER_AGENT,
          Referer: 'https://music.163.com/',
          Origin: 'https://music.163.com',
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: 'os=pc; appver=2.9.7',
        },
        body: postBody,
      },
    );

    if (!response.ok) {
      throw new ProviderError('UPSTREAM_ERROR', `NetEase song detail API returned HTTP ${response.status}`, 502);
    }

    const data: RawNeteaseSongDetailResponse = await response.json();
    if (Array.isArray(data.songs)) {
      allSongs.push(...data.songs);
    }
    if (Array.isArray(data.privileges)) {
      allPrivileges.push(...data.privileges);
    }
  }

  return { songs: allSongs, privileges: allPrivileges };
}

/**
 * Primary fetcher for NetEase playlists
 */
export async function fetchNeteasePlaylist(playlistId: string): Promise<Playlist> {
  const cleanId = playlistId.trim();
  if (!cleanId) {
    throw new ProviderError('INVALID_INPUT', 'Playlist ID must not be empty.', 400);
  }

  const commonHeaders = {
    'User-Agent': UPSTREAM_USER_AGENT,
    Referer: 'https://music.163.com/',
    Origin: 'https://music.163.com',
    Cookie: 'os=pc; appver=2.9.7',
  };

  let rawJson: RawNeteasePlaylistDetailResponse;

  // Try v6 API first, fall back to legacy API on -462 (anti-bot) or missing playlist
  const v6Url = `https://music.163.com/api/v6/playlist/detail?id=${encodeURIComponent(cleanId)}`;
  const v6Response = await fetchWithTimeout(v6Url, { method: 'GET', headers: commonHeaders });

  if (!v6Response.ok) {
    throw new ProviderError('UPSTREAM_ERROR', `NetEase playlist detail API returned HTTP ${v6Response.status}`, 502);
  }

  rawJson = await v6Response.json();

  // Fallback to legacy API if v6 returns -462 (anti-bot captcha) or has no playlist data
  if (rawJson.code === -462 || (!rawJson.playlist && rawJson.code !== 404)) {
    const legacyUrl = `https://music.163.com/api/playlist/detail?id=${encodeURIComponent(cleanId)}`;
    const legacyResponse = await fetchWithTimeout(legacyUrl, { method: 'GET', headers: commonHeaders });

    if (legacyResponse.ok) {
      const legacyJson = await legacyResponse.json() as Record<string, any>;
      if (legacyJson.code === 200 && legacyJson.result) {
        // Legacy API uses "result" instead of "playlist" — normalize to our expected shape
        rawJson = {
          code: legacyJson.code,
          playlist: legacyJson.result as RawNeteasePlaylistDetailResponse['playlist'],
          privileges: legacyJson.privileges,
        };
      }
    }
  }

  if (rawJson.code === 404 || !rawJson.playlist) {
    throw new ProviderError('PLAYLIST_NOT_FOUND', `Playlist with ID "${cleanId}" was not found or is private.`, 404);
  }

  const playlistDetail = rawJson.playlist;
  const expectedTotal = Number(playlistDetail.trackCount || 0);
  let trackIdList = (playlistDetail.trackIds || []).map((t) => t.id);

  // Augment trackIdList with any missing IDs found in inline tracks (e.g. Yunpan songs dropped from trackIds)
  if (trackIdList.length > 0 && trackIdList.length < expectedTotal && Array.isArray(playlistDetail.tracks)) {
    const existingIds = new Set(trackIdList.map(String));
    for (const inlineSong of playlistDetail.tracks) {
      if (inlineSong && inlineSong.id && !existingIds.has(String(inlineSong.id))) {
        trackIdList.push(inlineSong.id);
        existingIds.add(String(inlineSong.id));
      }
    }
  }

  // Level 1: Metadata ↔ IDs Completeness Check
  if (expectedTotal > 0) {
    if (trackIdList.length > 0 && trackIdList.length !== expectedTotal) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Incomplete playlist: NetEase metadata reported ${expectedTotal} tracks, but only ${trackIdList.length} track IDs were provided.`,
        502,
        { expectedCount: expectedTotal, actualCount: trackIdList.length },
      );
    }
    if (trackIdList.length === 0 && (!Array.isArray(playlistDetail.tracks) || playlistDetail.tracks.length !== expectedTotal)) {
      const inlineCount = Array.isArray(playlistDetail.tracks) ? playlistDetail.tracks.length : 0;
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Incomplete playlist: NetEase metadata reported ${expectedTotal} tracks, but only ${inlineCount} inline tracks were provided.`,
        502,
        { expectedCount: expectedTotal, actualCount: inlineCount },
      );
    }
  }

  let tracks: Track[] = [];

  if (trackIdList.length > 0) {
    // If playlist has trackIds, batch fetch all details to avoid 10-song limit
    const { songs, privileges } = await fetchSongDetails(trackIdList);

    // Map by song ID for fast lookup
    const songMap = new Map<string, RawNeteaseSong>();
    for (const s of songs) {
      if (s.id !== undefined && s.id !== null) {
        songMap.set(String(s.id), s);
      }
    }

    const privMap = new Map<string, RawNeteasePrivilege>();
    for (const p of privileges) {
      if (p.id !== undefined && p.id !== null) {
        privMap.set(String(p.id), p);
      }
    }

    // Completeness verification: Check for missing song IDs
    const missingIds = trackIdList.filter((id) => !songMap.has(String(id)));
    if (missingIds.length > 0) {
      // Retry missing IDs in smaller chunks (100 per batch)
      try {
        const retryRes = await fetchSongDetails(missingIds, 100);
        for (const s of retryRes.songs) {
          if (s.id !== undefined && s.id !== null) {
            songMap.set(String(s.id), s);
          }
        }
        for (const p of retryRes.privileges) {
          if (p.id !== undefined && p.id !== null) {
            privMap.set(String(p.id), p);
          }
        }
      } catch {
        // Retry failed; will be caught by completeness check below
      }
    }

    let stillMissingIds = trackIdList.filter((id) => !songMap.has(String(id)));

    // Fallback: Check if missing songs are available in the inline tracks from playlist detail
    // (This handles Cloud Drive / Yunpan songs that are dropped by v3/song/detail but present inline)
    if (stillMissingIds.length > 0 && Array.isArray(playlistDetail.tracks)) {
      for (const inlineSong of playlistDetail.tracks) {
        if (inlineSong && inlineSong.id !== undefined && inlineSong.id !== null) {
          const idStr = String(inlineSong.id);
          if (!songMap.has(idStr)) {
            songMap.set(idStr, inlineSong);
            
            // Try to find corresponding privilege
            if (Array.isArray(rawJson.privileges)) {
              const inlinePriv = rawJson.privileges.find((p: any) => p && String(p.id) === idStr);
              if (inlinePriv) {
                privMap.set(idStr, inlinePriv);
              }
            }
          }
        }
      }
      // Re-evaluate missing ids
      stillMissingIds = trackIdList.filter((id) => !songMap.has(String(id)));
    }

    // Last-resort fallback: v6 inline tracks are often limited to ~10 previews.
    // If songs are still missing, fetch the legacy API which returns ALL tracks inline.
    if (stillMissingIds.length > 0) {
      try {
        const legacyUrl = `https://music.163.com/api/playlist/detail?id=${encodeURIComponent(cleanId)}`;
        const legacyRes = await fetchWithTimeout(legacyUrl, { method: 'GET', headers: commonHeaders });
        if (legacyRes.ok) {
          const legacyJson = await legacyRes.json() as Record<string, any>;
          const legacyTracks: RawNeteaseSong[] = legacyJson.result?.tracks || [];
          for (const lt of legacyTracks) {
            if (lt && lt.id !== undefined && lt.id !== null) {
              const idStr = String(lt.id);
              if (!songMap.has(idStr)) {
                songMap.set(idStr, lt);
              }
            }
          }
          stillMissingIds = trackIdList.filter((id) => !songMap.has(String(id)));
        }
      } catch {
        // Legacy fallback failed; will be caught by completeness check below
      }
    }

    if (stillMissingIds.length > 0) {
      throw new ProviderError(
        'INCOMPLETE_PLAYLIST',
        `Incomplete playlist: NetEase playlist reported ${trackIdList.length} songs, but only ${trackIdList.length - stillMissingIds.length} could be retrieved (${stillMissingIds.length} missing).`,
        502,
        {
          expectedCount: trackIdList.length,
          actualCount: trackIdList.length - stillMissingIds.length,
          missingIds: stillMissingIds.slice(0, 10),
        },
      );
    }

    // Keep exact order from trackIds (no fabricated placeholders)
    tracks = trackIdList.map((id, index) => {
      const idStr = String(id);
      const rawSong = songMap.get(idStr)!;
      const priv = privMap.get(idStr);
      return normalizeNeteaseTrack(rawSong, index + 1, priv);
    });
  } else if (Array.isArray(playlistDetail.tracks) && playlistDetail.tracks.length > 0) {
    // Fallback to inline tracks if trackIds array wasn't provided
    tracks = playlistDetail.tracks.map((song, index) => {
      const priv = rawJson.privileges?.[index];
      return normalizeNeteaseTrack(song, index + 1, priv);
    });
  }

  // Level 3: Output ↔ Expected Count Verification
  if (expectedTotal > 0 && tracks.length !== expectedTotal) {
    throw new ProviderError(
      'INCOMPLETE_PLAYLIST',
      `Incomplete playlist: NetEase metadata expected ${expectedTotal} tracks, but final output has ${tracks.length} tracks.`,
      502,
      { expectedCount: expectedTotal, actualCount: tracks.length },
    );
  }

  return normalizeNeteasePlaylist(playlistDetail, tracks);
}
