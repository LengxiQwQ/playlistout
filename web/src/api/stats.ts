import type { ApiResponse } from './types';
import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';

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
  cumulativeDailyVisitors?: number;
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

/**
 * Emits a custom event on the window to prompt StatsJournal to refetch latest metrics.
 */
export function notifyStatsRefresh(delayMs: number = 800): void {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('playlistout:stats-refresh'));
        }
      } catch {
        // ignore if window is torn down before timeout
      }
    }, delayMs);
  }
}

export type StatsIncrementDetail =
  | { kind: 'visit' }
  | { kind: 'parse'; trackCount?: number }
  | { kind: 'export'; format: string };

/**
 * Tells StatsJournal to bump its displayed counters locally after a recorded event,
 * without sending another GET /api/stats request. The event itself has already been
 * persisted server-side.
 */
export function notifyStatsIncrement(detail: StatsIncrementDetail): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('playlistout:stats-increment', { detail }));
    } catch {
      // ignore if window is torn down
    }
  }
}

export async function fetchStats(options: { force?: boolean } = {}): Promise<ApiResponse<StatsResponse>> {
  const url = options.force
    ? `${API_BASE_URL}/api/stats?_t=${Date.now()}`
    : `${API_BASE_URL}/api/stats`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(options.force ? { cache: 'no-store' } : {}),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
      const fallbackUrl = options.force
        ? `${REMOTE_API_BASE_URL}/api/stats?_t=${Date.now()}`
        : `${REMOTE_API_BASE_URL}/api/stats`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json' },
        ...(options.force ? { cache: 'no-store' } : {}),
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
        const fallbackUrl = options.force
          ? `${REMOTE_API_BASE_URL}/api/stats?_t=${Date.now()}`
          : `${REMOTE_API_BASE_URL}/api/stats`;
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { Accept: 'application/json' },
          ...(options.force ? { cache: 'no-store' } : {}),
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
