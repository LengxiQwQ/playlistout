import type { ApiResponse, Playlist } from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '' : 'https://api.playlistout.com');

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}

/**
 * API client method to parse a playlist.
 * In dev mode, proxies through local Vite dev server to local Cloudflare Worker on port 8787.
 * In production mode, requests https://api.playlistout.com.
 */
export async function parsePlaylist(urlOrId: string, signal?: AbortSignal): Promise<ApiResponse<Playlist>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/playlist?url=${encodeURIComponent(urlOrId)}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    const data: ApiResponse<Playlist> = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
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
  totalPlaylistsParsed: number;
  playlistsParsedToday: number;
  totalTracksProcessed: number;
  tracksProcessedToday: number;
  totalExports: number;
  exportsToday: number;
  byPlatform: Record<string, PlatformBreakdown>;
  recentDays: DailyTrendEntry[];
  generatedAt: string;
}

export async function fetchStats(): Promise<ApiResponse<StatsResponse>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`, {
      headers: { Accept: 'application/json' },
    });
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : '获取统计数据失败',
      },
    };
  }
}
