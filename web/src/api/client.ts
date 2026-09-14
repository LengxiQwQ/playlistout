import type { ApiResponse, Playlist } from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '' : 'https://api.playlistout.com');

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

export const REMOTE_API_BASE_URL = 'https://api.playlistout.com';

/**
 * API client method to parse a playlist.
 * In dev mode, proxies through local Vite dev server to local Cloudflare Worker on port 8787.
 * If the local Worker is not running or proxy times out in dev mode, automatically falls back to production API.
 * In production mode, requests https://api.playlistout.com directly.
 */
export async function parsePlaylist(urlOrId: string, signal?: AbortSignal): Promise<ApiResponse<Playlist>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/playlist?url=${encodeURIComponent(urlOrId)}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data: ApiResponse<Playlist> = await response.json();
      return data;
    }

    // If local dev proxy returned HTML (e.g. 504 Gateway Timeout when local worker is down), fallback to remote API
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      console.warn('[PlaylistOut Dev] Local worker proxy returned non-JSON. Falling back to remote API...');
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/playlist?url=${encodeURIComponent(urlOrId)}`, {
        signal,
        headers: { Accept: 'application/json' },
      });
      if (fallbackRes.headers.get('content-type')?.includes('application/json')) {
        return await fallbackRes.json();
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
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/playlist?url=${encodeURIComponent(urlOrId)}`, {
          signal,
          headers: { Accept: 'application/json' },
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

export async function fetchStats(): Promise<ApiResponse<StatsResponse>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/stats`, {
        headers: { Accept: 'application/json' },
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
        const fallbackRes = await fetch(`${REMOTE_API_BASE_URL}/api/stats`, {
          headers: { Accept: 'application/json' },
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
 * Session-level cached to prevent spam from manual tab reloads.
 */
export async function recordVisit(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (window.sessionStorage.getItem('playlistout_visit_logged')) {
        return;
      }
      window.sessionStorage.setItem('playlistout_visit_logged', '1');
    }
  } catch {
    // Ignore sessionStorage security exceptions
  }

  const payload = JSON.stringify({ type: 'visit' });
  const url = `${API_BASE_URL || REMOTE_API_BASE_URL}/api/event`;

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Fire-and-forget best-effort
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
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Fire-and-forget
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
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Fire-and-forget
  }
}

