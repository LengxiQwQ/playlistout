import type { UserPlaylistsData, UserPlaylistSummary } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import { ALLOWED_NETEASE_HOSTS } from './client';

const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 15000;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

interface RawNeteasePlaylistItem {
  id: number | string;
  name?: string;
  coverImgUrl?: string;
  trackCount?: number;
  playCount?: number;
  privacy?: number;
  userId?: number | string;
  creator?: {
    userId?: number | string;
    nickname?: string;
  };
}

interface RawNeteaseUserPlaylistResponse {
  code?: number;
  more?: boolean;
  playlist?: RawNeteasePlaylistItem[];
}

interface RawNeteaseUserDetailResponse {
  code?: number;
  profile?: {
    userId?: number | string;
    nickname?: string;
    avatarUrl?: string;
    playlistCount?: number;
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_NETEASE_HOSTS.has(parsed.hostname)) {
      throw new ProviderError('FORBIDDEN', `Outbound request to unauthorized host ${parsed.hostname} is prohibited.`, 403);
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
    if (err instanceof ProviderError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderError('UPSTREAM_TIMEOUT', `Request to NetEase Music timed out after ${timeoutMs}ms.`, 504);
    }
    throw new ProviderError('UPSTREAM_ERROR', `Failed to connect to NetEase Music: ${err instanceof Error ? err.message : String(err)}`, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches user playlists from NetEase Cloud Music (both created and subscribed).
 */
export async function fetchNeteaseUserPlaylists(uid: string): Promise<UserPlaylistsData> {
  const cleanUid = uid.trim();
  if (!cleanUid || !/^\d{4,18}$/.test(cleanUid)) {
    throw new ProviderError('INVALID_INPUT', `Invalid NetEase user ID: "${uid}". Expected 4-18 digits.`, 400);
  }

  let nickname = `用户_${cleanUid}`;
  const allPlaylists: UserPlaylistSummary[] = [];

  // 1. Fetch user detail first to get accurate nickname
  try {
    const detailRes = await fetchWithTimeout(
      `https://music.163.com/api/v1/user/detail/${encodeURIComponent(cleanUid)}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': UPSTREAM_USER_AGENT,
          Referer: 'https://music.163.com/',
          Origin: 'https://music.163.com',
          Cookie: 'os=pc; appver=2.9.7',
        },
      },
    );
    if (detailRes.ok) {
      const detailData: RawNeteaseUserDetailResponse = await detailRes.json();
      if (detailData.profile?.nickname) {
        nickname = detailData.profile.nickname;
      }
    }
  } catch {
    // Non-fatal, nickname will fall back or be obtained from playlist creator
  }

  // 2. Fetch playlists with pagination
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < MAX_PAGES) {
    pageCount++;
    const playlistUrl = `https://music.163.com/api/user/playlist/?uid=${encodeURIComponent(cleanUid)}&limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetchWithTimeout(playlistUrl, {
      method: 'GET',
      headers: {
        'User-Agent': UPSTREAM_USER_AGENT,
        Referer: 'https://music.163.com/',
        Origin: 'https://music.163.com',
        Cookie: 'os=pc; appver=2.9.7',
      },
    });

    if (!response.ok) {
      throw new ProviderError('UPSTREAM_ERROR', `NetEase user playlist API returned HTTP ${response.status}`, 502);
    }

    const data: RawNeteaseUserPlaylistResponse = await response.json();
    const items = data.playlist || [];

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      const idStr = String(item.id);
      allPlaylists.push({
        id: idStr,
        name: (item.name || '未命名歌单').trim(),
        coverUrl: item.coverImgUrl ? item.coverImgUrl.replace(/^http:\/\//i, 'https://') : undefined,
        trackCount: typeof item.trackCount === 'number' ? item.trackCount : 0,
        listenNum: typeof item.playCount === 'number' ? item.playCount : 0,
        sourceUrl: `https://music.163.com/#/playlist?id=${idStr}`,
      });

      // Update nickname if found from creator
      if (String(item.userId) === cleanUid && item.creator?.nickname) {
        nickname = item.creator.nickname;
      }
    }

    hasMore = Boolean(data.more) && items.length === PAGE_SIZE;
    offset += items.length;
  }

  return {
    platform: 'netease',
    userId: cleanUid,
    nickname,
    total: allPlaylists.length,
    playlists: allPlaylists,
  };
}
