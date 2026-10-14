import type { ApiResponse, Playlist } from './types';
import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';
import { getWebSessionToken } from './session';
import { notifyStatsIncrement } from './stats';
import { getKugouAuth } from '../utils/kugouAuth';

/**
 * API client method to parse a playlist.
 * In dev mode, proxies through local Vite dev server to local Cloudflare Worker on port 8787.
 * If the local Worker is not running or proxy times out in dev mode, automatically falls back to production API.
 * In production mode, requests https://playlistout-api.lengxiqwq.com directly.
 */
export async function parsePlaylist(
  urlOrId: string,
  signal?: AbortSignal,
  platform?: 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo',
  authOptions?: { token?: string; userid?: string },
  isSample?: boolean,
  channel?: 'qishui' | 'douyin',
): Promise<ApiResponse<Playlist>> {
  const platformParam = platform ? `&platform=${encodeURIComponent(platform)}` : '';
  const channelParam = channel ? `&channel=${encodeURIComponent(channel)}` : '';

  let token = authOptions?.token;
  let userid = authOptions?.userid;
  if (!token || !userid) {
    const isKugou =
      platform === 'kugou' ||
      /kugou\.com|gcid_|src_cid=|special\/single\/|t\d?\.kugou\.com/i.test(urlOrId);
    if (isKugou) {
      const stored = getKugouAuth();
      if (stored) {
        token = stored.token;
        userid = stored.userid;
      }
    }
  }
  const queryString = `url=${encodeURIComponent(urlOrId)}${platformParam}${channelParam}`;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (isSample) {
    requestHeaders['X-Sample-Request'] = '1';
  }
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    if (userid) {
      requestHeaders['X-Kugou-Userid'] = userid;
    }
  }

  const sessionToken = await getWebSessionToken();
  if (sessionToken) {
    requestHeaders['X-PlaylistOut-Session'] = sessionToken;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/playlist?${queryString}`, {
      signal,
      headers: requestHeaders,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data: ApiResponse<Playlist> = await response.json();
      if (data.success) {
        notifyStatsIncrement({
          kind: 'parse',
          trackCount: data.data?.trackCount ?? data.data?.tracks?.length,
        });
      }
      return data;
    }

    // If local dev proxy returned HTML, fallback to remote API
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      console.warn('[PlaylistOut Dev] Local worker proxy returned non-JSON. Falling back to remote API...');
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/playlist?${queryString}`, {
        signal,
        headers: requestHeaders,
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        const fallbackData: ApiResponse<Playlist> = await fallbackRes.json();
        if (fallbackData.success) {
          notifyStatsIncrement({
            kind: 'parse',
            trackCount: fallbackData.data?.trackCount ?? fallbackData.data?.tracks?.length,
          });
        }
        return fallbackData;
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `本地服务异常 (${response.status} ${response.statusText})，请确保 Worker (端口 8787) 已启动。`,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }

    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        console.warn('[PlaylistOut Dev] Local fetch failed. Falling back to remote API...');
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/playlist?${queryString}`, {
          signal,
          headers: requestHeaders,
        });
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // Fallback also failed
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '网络连接失败，请检查网络后重试。',
      },
    };
  }
}
