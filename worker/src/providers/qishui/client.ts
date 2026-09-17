import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import {
  type RawAwemeMusic,
  type RawQishuiMediaResource,
  type RawQishuiPlaylist,
  normalizeAwemeMusicTrack,
  normalizeQishuiPlaylist,
  normalizeQishuiTrack,
} from './normalize';

const UPSTREAM_USER_AGENT = 'Luna/19.1.0 Android';
const AWEME_USER_AGENT = 'com.ss.android.ugc.aweme/280001 (Linux; U; Android 13; zh_CN;)';
const FETCH_TIMEOUT_MS = 15000;
const MAX_PAGES = 50;
const PAGE_COUNT = 200;

export const ALLOWED_QISHUI_HOSTS: ReadonlySet<string> = new Set([
  'qishui.douyin.com',
  'music.douyin.com',
  'beta-luna.douyin.com',
  'aweme.snssdk.com',
]);

interface RawQishuiDetailResponse {
  status_info?: {
    log_id?: string;
    now?: number;
  };
  has_more?: boolean;
  next_cursor?: string | number;
  playlist?: RawQishuiPlaylist;
  media_resources?: RawQishuiMediaResource[];
}

/**
 * Fetch with timeout and strict host allowlist helper.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_QISHUI_HOSTS.has(parsed.hostname)) {
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
        `Request to Qishui Music timed out after ${timeoutMs}ms.`,
        504,
      );
    }
    throw new ProviderError(
      'UPSTREAM_ERROR',
      `Failed to connect to Qishui Music: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RawAwemeMusicCollectResponse {
  status_code?: number;
  msg?: string;
  has_more?: number;
  cursor?: number;
  mc_list?: RawAwemeMusic[];
}

/**
 * Fetches all user favorite sounds/tracks from Douyin's official collection endpoint.
 * Bypasses Luna's filter to retrieve 100% of collected music and video original soundtracks.
 */
async function fetchAwemeUserMusicCollect(userId: string): Promise<Track[] | null> {
  let cursor = 0;
  let hasMore = 1;
  let page = 0;
  const maxAwemePages = 40;
  const allTracks: Track[] = [];

  while (hasMore === 1 && page < maxAwemePages) {
    page++;
    const url = `https://aweme.snssdk.com/aweme/v1/user/music/collect/?user_id=${userId}&cursor=${cursor}&count=30`;
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: {
            'User-Agent': AWEME_USER_AGENT,
          },
        },
        FETCH_TIMEOUT_MS,
      );

      if (!response.ok) {
        return null;
      }

      const data: RawAwemeMusicCollectResponse = await response.json();
      if (data.status_code !== 0 || !Array.isArray(data.mc_list)) {
        return null;
      }

      const items = data.mc_list;
      for (const item of items) {
        allTracks.push(normalizeAwemeMusicTrack(item, allTracks.length));
      }

      if (items.length === 0 || data.has_more !== 1) {
        break;
      }

      cursor = typeof data.cursor === 'number' ? data.cursor : 0;
    } catch {
      return null;
    }
  }

  return allTracks.length > 0 ? allTracks : null;
}

/**
 * Fetches a full Qishui playlist with pagination.
 */
export async function fetchQishuiPlaylist(playlistId: string): Promise<Playlist> {
  let cursor = '0';
  let page = 0;
  let playlistMeta: RawQishuiPlaylist | undefined;
  const allMediaResources: RawQishuiMediaResource[] = [];

  while (page < MAX_PAGES) {
    page++;

    const payload = {
      playlist_id: playlistId,
      cursor,
      count: PAGE_COUNT,
    };

    const response = await fetchWithTimeout(
      'https://beta-luna.douyin.com/luna/playlist/detail',
      {
        method: 'POST',
        headers: {
          'User-Agent': UPSTREAM_USER_AGENT,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      },
      FETCH_TIMEOUT_MS,
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new ProviderError(
          'PLAYLIST_NOT_FOUND',
          `Qishui playlist ${playlistId} was not found or is private.`,
          404,
        );
      }
      throw new ProviderError(
        'UPSTREAM_ERROR',
        `Qishui API returned HTTP ${response.status}`,
        502,
      );
    }

    let data: RawQishuiDetailResponse;
    try {
      data = await response.json();
    } catch {
      throw new ProviderError('PARSE_ERROR', 'Failed to parse Qishui upstream JSON response.', 502);
    }

    if (!playlistMeta && data.playlist) {
      playlistMeta = data.playlist;

      // If this is a Douyin-synced favorite playlist (type === 4), fetch the complete user music collection directly
      if (playlistMeta.type === 4 && playlistMeta.owner?.id) {
        const awemeTracks = await fetchAwemeUserMusicCollect(String(playlistMeta.owner.id));
        if (awemeTracks && awemeTracks.length > 0) {
          playlistMeta.count_tracks = awemeTracks.length;
          return normalizeQishuiPlaylist(playlistMeta, awemeTracks);
        }
      }
    }

    const medias = Array.isArray(data.media_resources) ? data.media_resources : [];
    allMediaResources.push(...medias);

    const hasMore = Boolean(data.has_more);
    const nextCursor = data.next_cursor !== undefined && data.next_cursor !== null ? String(data.next_cursor) : '';

    if (!hasMore || !nextCursor || nextCursor === cursor || medias.length === 0) {
      break;
    }

    cursor = nextCursor;
  }

  if (!playlistMeta) {
    throw new ProviderError(
      'PLAYLIST_NOT_FOUND',
      `Qishui playlist ${playlistId} could not be retrieved.`,
      404,
    );
  }

  const tracks: Track[] = allMediaResources.map((m, idx) => normalizeQishuiTrack(m, idx));

  return normalizeQishuiPlaylist(playlistMeta, tracks);
}
