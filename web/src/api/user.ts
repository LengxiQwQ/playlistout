import type { ApiResponse, UserPlaylistsData } from './types';
import { API_BASE_URL } from './base';
import { getWebSessionToken } from './session';
import { getKugouAuth } from '../utils/kugouAuth';

/**
 * API client method to fetch public playlists created by a specific user.
 */
export async function fetchUserPlaylists(
  uinOrUrl: string,
  signal?: AbortSignal,
  platform?: 'qqmusic' | 'netease' | 'kugou',
  authOptions?: { token?: string; userid?: string },
): Promise<ApiResponse<UserPlaylistsData>> {
  try {
    const platformParam = platform ? `&platform=${encodeURIComponent(platform)}` : '';
    let token = authOptions?.token;
    let userid = authOptions?.userid;
    if (!token || !userid) {
      const isKugou = platform === 'kugou' || /kugou\.com|gcid_|src_cid=/i.test(uinOrUrl);
      if (isKugou) {
        const stored = getKugouAuth();
        if (stored) {
          token = stored.token;
          userid = stored.userid;
        }
      }
    }
    const queryString = `uin=${encodeURIComponent(uinOrUrl)}${platformParam}`;
    const userHeaders: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      userHeaders['Authorization'] = `Bearer ${token}`;
      if (userid) {
        userHeaders['X-Kugou-Userid'] = userid;
      }
    }

    const sessionToken = await getWebSessionToken();
    if (sessionToken) {
      userHeaders['X-PlaylistOut-Session'] = sessionToken;
    }

    const response = await fetch(`${API_BASE_URL}/api/user/playlists?${queryString}`, {
      signal,
      headers: userHeaders,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '本地后端 Worker 服务未启动 (127.0.0.1:8787)。请运行根目录的 start-dev.bat 或 npm run dev 启动全栈服务。',
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '本地后端 Worker 服务未启动 (127.0.0.1:8787)。请运行根目录的 start-dev.bat 或 npm run dev 启动全栈服务。',
      },
    };
  }
}
