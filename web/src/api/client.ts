import type { ApiResponse, Playlist, UserPlaylistsData } from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '' : 'https://playlistout-api.lengxiqwq.com');

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      return response.json();
    }
  } catch {
    // If local dev check fails, try remote API
  }
  if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
    const remoteResponse = await fetch(`${REMOTE_API_BASE_URL}/health`);
    if (remoteResponse.ok) {
      return remoteResponse.json();
    }
  }
  throw new Error('Health check failed');
}

export const REMOTE_API_BASE_URL = 'https://playlistout-api.lengxiqwq.com';

import { getKugouAuth } from '../utils/kugouAuth';

export interface KugouQrSession {
  qrcode: string;
  qrcodeImg: string;
  loginUrl: string;
  expiresAt: number;
}

export interface KugouQrStatusResult {
  status: 'waiting' | 'scanned' | 'success' | 'expired' | 'failed';
  token?: string;
  userid?: string;
  message?: string;
}

/**
 * Requests a new Kugou QR code session from Worker backend.
 */
export async function fetchKugouQrCode(): Promise<ApiResponse<KugouQrSession>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kugou/login/qr`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/login/qr`, {
        headers: { Accept: 'application/json' },
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '获取酷狗登录二维码失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/login/qr`, {
          headers: { Accept: 'application/json' },
        });
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '获取酷狗登录二维码失败',
      },
    };
  }
}

/**
 * Checks status of Kugou QR code session.
 */
export async function checkKugouQrCode(qrcode: string): Promise<ApiResponse<KugouQrStatusResult>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kugou/login/check?qrcode=${encodeURIComponent(qrcode)}`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(
        `${REMOTE_API_BASE_URL}/api/kugou/login/check?qrcode=${encodeURIComponent(qrcode)}`,
        { headers: { Accept: 'application/json' } },
      );
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '检测酷狗登录状态失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(
          `${REMOTE_API_BASE_URL}/api/kugou/login/check?qrcode=${encodeURIComponent(qrcode)}`,
          { headers: { Accept: 'application/json' } },
        );
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '检测酷狗登录状态失败',
      },
    };
  }
}

export interface KugouSessionValidationResult {
  status: 'valid' | 'invalid';
  userid?: string;
  message?: string;
}

/**
 * Validates whether existing Kugou credentials are still active and accepted by upstream service.
 * Follows zero-trust: passes credentials strictly via headers (Authorization: Bearer + X-Kugou-Userid).
 */
export async function validateKugouAuth(
  token: string,
  userid: string,
): Promise<ApiResponse<KugouSessionValidationResult>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Kugou-Userid': userid,
  };
  try {
    const response = await fetch(`${API_BASE_URL}/api/kugou/auth/status`, {
      headers,
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/auth/status`, {
        headers,
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: '验证酷狗登录状态失败' },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/kugou/auth/status`, {
          headers,
        });
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // ignore
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '验证酷狗登录状态失败',
      },
    };
  }
}

/**
 * API client method to parse a playlist.
 * In dev mode, proxies through local Vite dev server to local Cloudflare Worker on port 8787.
 * If the local Worker is not running or proxy times out in dev mode, automatically falls back to production API.
 * In production mode, requests https://playlistout-api.lengxiqwq.com directly.
 */
export async function parsePlaylist(
  urlOrId: string,
  signal?: AbortSignal,
  platform?: 'qqmusic' | 'netease' | 'kugou' | 'qishui',
  authOptions?: { token?: string; userid?: string },
): Promise<ApiResponse<Playlist>> {
  const platformParam = platform ? `&platform=${encodeURIComponent(platform)}` : '';

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
  const queryString = `url=${encodeURIComponent(urlOrId)}${platformParam}`;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
    if (userid) {
      requestHeaders['X-Kugou-Userid'] = userid;
    }
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
        notifyStatsRefresh(500);
      }
      return data;
    }

    // If local dev proxy returned HTML (e.g. 504 Gateway Timeout when local worker is down), fallback to remote API
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      console.warn('[PlaylistOut Dev] Local worker proxy returned non-JSON. Falling back to remote API...');
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/playlist?${queryString}`, {
        signal,
        headers: requestHeaders,
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        const fallbackData: ApiResponse<Playlist> = await fallbackRes.json();
        if (fallbackData.success) {
          notifyStatsRefresh(500);
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

    // In dev mode, if fetch failed completely (e.g. connection refused), attempt remote API fallback
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
        // Fallback also failed, proceed to error response below
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

// ── Public Statistics Contract (aligns with Worker PublicStatsResponse) ──

export interface PlatformBreakdown {
  totalSuccess: number;
  todaySuccess?: number;
}

export interface DailyTrendEntry {
  date: string;
  parses: number;
  tracks: number;
  exports: number;
}

export interface StatsResponse {
  launchedAt: string;
  totalVisitors: number;
  cumulativeDailyVisitors?: number;
  visitorsToday: number;
  totalPageViews: number;
  pageViewsToday: number;
  totalPlaylistsParsed: number;
  playlistsParsedToday: number;
  totalTracksProcessed: number;
  tracksProcessedToday: number;
  totalExports: number;
  exportsToday: number;
  exportFormatsBreakdown: Record<string, number>;
  byPlatform: Record<string, PlatformBreakdown>;
  recentDays: DailyTrendEntry[];
  generatedAt: string;
}

/**
 * Emits a custom event on the window to prompt StatsJournal to refetch latest metrics.
 */
export function notifyStatsRefresh(delayMs: number = 800): void {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('playlistout:stats-refresh'));
    }, delayMs);
  }
}

/**
 * Generates or retrieves an anonymous, random device token persisted in localStorage.
 * Used solely for deduplicating daily unique visits across multiple devices on the same Wi-Fi.
 * Contains zero personal or hardware information.
 */
export function getAnonymousDeviceId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let id = window.localStorage.getItem('playlistout_did');
      if (!id) {
        id = 'd_' + Math.random().toString(36).substring(2, 12);
        window.localStorage.setItem('playlistout_did', id);
      }
      return id;
    }
  } catch {
    // localStorage security restrictions
  }
  return '';
}

export async function fetchStats(): Promise<ApiResponse<StatsResponse>> {
  const timestamp = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats?_t=${timestamp}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/stats?_t=${timestamp}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '获取统计数据失败',
      },
    };
  } catch (err: unknown) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      try {
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/stats?_t=${timestamp}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
          return await fallbackRes.json();
        }
      } catch {
        // Fallback failed
      }
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '获取统计数据失败',
      },
    };
  }
}

/**
 * Fires an anonymous page visit event.
 * Uses anonymous client-side deviceId to distinguish devices on the same Wi-Fi.
 * Emits live stats refresh when successfully processed.
 */
export async function recordVisit(): Promise<void> {
  const deviceId = getAnonymousDeviceId();

  // Capture real external referrer (Google, ChatGPT, GitHub, etc.) or campaign params
  let referrer: string | undefined = undefined;
  if (typeof document !== 'undefined' && document.referrer) {
    referrer = document.referrer;
  }
  if (!referrer && typeof window !== 'undefined' && window.location) {
    try {
      const search = new URLSearchParams(window.location.search);
      referrer = search.get('utm_source') || search.get('ref') || search.get('from') || undefined;
    } catch {
      // ignore
    }
  }

  const payload = JSON.stringify({
    type: 'visit',
    deviceId,
    referrer: referrer ? referrer.slice(0, 500) : undefined,
  });
  const url = `${API_BASE_URL || REMOTE_API_BASE_URL}/api/event`;


  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
    if (res.ok) {
      notifyStatsRefresh(800);
      return;
    }
  } catch {
    // Fallback to sendBeacon if fetch fails
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        notifyStatsRefresh(1000);
      }
    } catch {
      // Fire-and-forget best-effort
    }
  }
}

/**
 * Fires an anonymous file export event (TXT, CSV, XLSX, JSON).
 */
export async function recordExportEvent(
  format: 'txt' | 'csv' | 'xlsx' | 'json',
  trackCount?: number,
  platform: string = 'qqmusic',
): Promise<void> {
  const payload = JSON.stringify({
    type: 'export',
    format,
    platform,
    trackCount,
  });
  const url = `${API_BASE_URL || REMOTE_API_BASE_URL}/api/event`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
    if (res.ok) {
      notifyStatsRefresh(500);
      return;
    }
  } catch {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        notifyStatsRefresh(800);
      }
    } catch {
      // Fire-and-forget
    }
  }
}

/**
 * Fires an anonymous clipboard copy event.
 */
export async function recordClipboardEvent(
  format: 'title' | 'title-artist' | 'title-artist-album',
  trackCount?: number,
  platform: string = 'qqmusic',
): Promise<void> {
  const payload = JSON.stringify({
    type: 'clipboard',
    format,
    platform,
    trackCount,
  });
  const url = `${API_BASE_URL || REMOTE_API_BASE_URL}/api/event`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    } catch {
      // Fire-and-forget
    }
  }
}

