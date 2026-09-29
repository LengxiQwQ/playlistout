import type { Playlist, Track } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import {
  type RawQishuiMediaResource,
  type RawQishuiPlaylist,
  type RawAwemeMusic,
  normalizeQishuiPlaylist,
  normalizeQishuiTrack,
  normalizeAwemeMusicTrack,
} from './normalize';

const UPSTREAM_USER_AGENT = 'Luna/19.1.0 Android';
const AWEME_USER_AGENT = 'com.ss.android.ugc.aweme/280001 (Linux; U; Android 13; zh_CN;)';
const FETCH_TIMEOUT_MS = 15000;
const MAX_PAGES = 50;
const PAGE_COUNT = 200;
const AWEME_PAGE_COUNT = 30;
const MAX_AWEME_PAGES = 45;

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

/**
 * Fetches a Qishui playlist with pagination.
 * Supports dual-channel parsing for Douyin-synced playlists (type === 4):
 * - 'qishui': Luna API (official clean tracks with genuine titles)
 * - 'douyin': Douyin Aweme user music collect API (full collection including UGC video sounds)
 */
export async function fetchQishuiPlaylist(
  playlistId: string,
  options?: { channel?: 'qishui' | 'douyin' },
): Promise<Playlist> {
  let cursor = '0';
  let page = 0;
  let playlistMeta: RawQishuiPlaylist | undefined;
  const allMediaResources: RawQishuiMediaResource[] = [];

  // 1. Fetch first page to inspect playlist metadata & channel capability
  const firstPayload = {
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
      body: JSON.stringify(firstPayload),
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

  if (!data.playlist) {
    throw new ProviderError(
      'PLAYLIST_NOT_FOUND',
      `Qishui playlist ${playlistId} could not be retrieved.`,
      404,
    );
  }

  playlistMeta = data.playlist;

  const isDouyinSync = Boolean(playlistMeta.type === 4 && playlistMeta.owner?.id);
  const availableChannels: ('qishui' | 'douyin')[] = isDouyinSync ? ['qishui', 'douyin'] : ['qishui'];
  const targetChannel = (options?.channel === 'douyin' && isDouyinSync) ? 'douyin' : 'qishui';

  // 2. Channel: Douyin full user collection (including UGC original sounds)
  if (targetChannel === 'douyin') {
    const ownerId = String(playlistMeta.owner!.id).trim();
    const allAwemeItems: RawAwemeMusic[] = [];
    let awemeCursor = '0';
    let awemePage = 0;

    while (awemePage < MAX_AWEME_PAGES) {
      awemePage++;
      const awemeUrl = `https://aweme.snssdk.com/aweme/v1/user/music/collect/?user_id=${encodeURIComponent(ownerId)}&cursor=${encodeURIComponent(awemeCursor)}&count=${AWEME_PAGE_COUNT}`;
      const awemeRes = await fetchWithTimeout(
        awemeUrl,
        {
          method: 'GET',
          headers: {
            'User-Agent': AWEME_USER_AGENT,
          },
        },
        FETCH_TIMEOUT_MS,
      );

      if (!awemeRes.ok) {
        throw new ProviderError(
          'UPSTREAM_ERROR',
          `Douyin collection API returned HTTP ${awemeRes.status}`,
          502,
        );
      }

      let awemeData: any;
      try {
        awemeData = await awemeRes.json();
      } catch {
        throw new ProviderError('PARSE_ERROR', 'Failed to parse Douyin upstream JSON response.', 502);
      }

      const items: RawAwemeMusic[] = Array.isArray(awemeData.mc_list) ? awemeData.mc_list : [];
      allAwemeItems.push(...items);

      const hasMore = Boolean(awemeData.has_more);
      const nextCursor = awemeData.cursor !== undefined && awemeData.cursor !== null ? String(awemeData.cursor) : '';

      if (!hasMore || !nextCursor || nextCursor === awemeCursor || items.length === 0) {
        break;
      }
      awemeCursor = nextCursor;
    }

    const tracks: Track[] = allAwemeItems.map((item, idx) => normalizeAwemeMusicTrack(item, idx));
    const normalized = normalizeQishuiPlaylist(playlistMeta, tracks);
    return {
      ...normalized,
      channel: 'douyin',
      availableChannels,
      trackCount: tracks.length,
    };
  }

  // 3. Channel: Qishui official licensed tracks (pure clean titles)
  const firstMedias = Array.isArray(data.media_resources) ? data.media_resources : [];
  allMediaResources.push(...firstMedias);

  let hasMore = Boolean(data.has_more);
  let nextCursor = data.next_cursor !== undefined && data.next_cursor !== null ? String(data.next_cursor) : '';

  while (hasMore && nextCursor && nextCursor !== cursor && page < MAX_PAGES) {
    cursor = nextCursor;
    page++;

    const payload = {
      playlist_id: playlistId,
      cursor,
      count: PAGE_COUNT,
    };

    const nextResponse = await fetchWithTimeout(
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

    if (!nextResponse.ok) {
      throw new ProviderError(
        'UPSTREAM_ERROR',
        `Qishui API returned HTTP ${nextResponse.status}`,
        502,
      );
    }

    let nextData: RawQishuiDetailResponse;
    try {
      nextData = await nextResponse.json();
    } catch {
      throw new ProviderError('PARSE_ERROR', 'Failed to parse Qishui upstream JSON response.', 502);
    }

    const medias = Array.isArray(nextData.media_resources) ? nextData.media_resources : [];
    allMediaResources.push(...medias);

    hasMore = Boolean(nextData.has_more);
    nextCursor = nextData.next_cursor !== undefined && nextData.next_cursor !== null ? String(nextData.next_cursor) : '';
  }

  const tracks: Track[] = allMediaResources.map((m, idx) => normalizeQishuiTrack(m, idx));
  const normalized = normalizeQishuiPlaylist(playlistMeta, tracks);
  return {
    ...normalized,
    channel: 'qishui',
    availableChannels,
  };
}
