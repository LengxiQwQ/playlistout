import type { ApiResponse, Playlist } from './types';
import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';
import { getWebSessionToken } from './session';
import { notifyStatsIncrement } from './stats';
import { getKugouAuth } from '../utils/kugouAuth';

interface CacheEntry {
  timestamp: number;
  data: ApiResponse<Playlist>;
}

const PARSE_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache
const PARSE_CACHE_MAX_SIZE = 25;

const _parseCache = new Map<string, CacheEntry>();
const _inFlightRequests = new Map<string, Promise<ApiResponse<Playlist>>>();

/**
 * Clears the in-memory parse cache and in-flight deduplication map (testing & session reset utility).
 */
export function clearParseCache(): void {
  _parseCache.clear();
  _inFlightRequests.clear();
}

/**
 * Synchronously checks if a valid, successful parsed playlist exists in memory cache.
 */
export function getCachedPlaylist(
  urlOrId: string,
  platform?: string,
  channel?: string,
): Playlist | null {
  const key = [platform || '', channel || '', '', '', urlOrId.trim()].join('|');
  const cached = _parseCache.get(key);
  if (cached && Date.now() - cached.timestamp < PARSE_CACHE_TTL_MS && cached.data.success && cached.data.data) {
    return cached.data.data;
  }
  return null;
}

async function executeFetchPlaylist(
  queryString: string,
  requestHeaders: Record<string, string>,
  signal?: AbortSignal,
): Promise<ApiResponse<Playlist>> {
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
      } else if (response.status === 429 && data.error) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          (data.error as any).retryAfter = parseInt(retryAfter, 10) || 5;
        }
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

/**
 * API client method to parse a playlist.
 * Features:
 * 1. Short-term in-memory LRU cache (TTL = 3 min) to eliminate redundant Worker requests.
 * 2. In-flight request deduplication to prevent parallel duplicate fetches on rapid clicks.
 * 3. STRICT INVARIANT: FAILED RESPONSES ARE NEVER CACHED. Retries ALWAYS trigger genuine network requests.
 * 4. Force-refresh support via optional forceRefresh flag.
 */
export async function parsePlaylist(
  urlOrId: string,
  signal?: AbortSignal,
  platform?: 'qqmusic' | 'netease' | 'kugou' | 'qishui' | 'kuwo' | 'migu',
  authOptions?: { token?: string; userid?: string },
  isSample?: boolean,
  channel?: 'qishui' | 'douyin',
  batchTicket?: string,
  forceRefresh?: boolean,
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

  const trimmed = urlOrId ? urlOrId.trim() : '';
  const canCache = !isSample && !batchTicket && Boolean(trimmed);
  const cacheKey = [
    platform || '',
    channel || '',
    token || '',
    userid || '',
    trimmed,
  ].join('|');

  if (canCache) {
    if (forceRefresh) {
      _parseCache.delete(cacheKey);
      _inFlightRequests.delete(cacheKey);
    } else {
      const cached = _parseCache.get(cacheKey);
      if (cached) {
        const isFresh = Date.now() - cached.timestamp < PARSE_CACHE_TTL_MS;
        // CRITICAL INVARIANT: ONLY genuine successful responses are returned from cache!
        if (isFresh && cached.data.success && cached.data.data) {
          return cached.data;
        }
        _parseCache.delete(cacheKey);
      }
      // Deduplicate in-flight requests: return existing promise if already pending
      const inFlight = _inFlightRequests.get(cacheKey);
      if (inFlight) {
        return inFlight;
      }
    }
  }

  const fetchPromise = (async () => {
    try {
      const queryString = `url=${encodeURIComponent(trimmed)}${platformParam}${channelParam}`;
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
      if (batchTicket) {
        requestHeaders['X-PlaylistOut-Batch'] = batchTicket;
      }

      const result = await executeFetchPlaylist(queryString, requestHeaders, signal);
      // CRITICAL INVARIANT: ONLY genuine successful responses are cached!
      // If result.success is false (error, timeout, 429, not found), NEVER cache it.
      // This guarantees that any retry will execute a real network request.
      if (canCache && result.success && result.data) {
        if (_parseCache.size >= PARSE_CACHE_MAX_SIZE) {
          const oldestKey = _parseCache.keys().next().value;
          if (oldestKey) _parseCache.delete(oldestKey);
        }
        _parseCache.set(cacheKey, {
          timestamp: Date.now(),
          data: result,
        });
      }
      return result;
    } finally {
      if (canCache) {
        _inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (canCache && !forceRefresh) {
    _inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}
