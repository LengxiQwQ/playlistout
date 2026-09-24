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
  isSample?: boolean,
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
  if (isSample) {
    requestHeaders['X-Sample-Request'] = '1';
  }
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
  /**
   * 累计日独立访问人次（Canonical 正式字段）。
   * 每天先进行匿名去重，再将各日独立访客数累加。
   * PlaylistOut 不进行跨日身份追踪，同一访客在不同日期访问时可能再次计入。
   */
  cumulativeDailyVisitors?: number;
  /**
   * @deprecated Use cumulativeDailyVisitors.
   * Legacy alias for cumulativeDailyVisitors (累计日独立访问人次).
   * Semantically identical to cumulativeDailyVisitors; this is NOT an all-time globally unique person count.
   */
  totalVisitors: number;
  /** 今日独立访客数（当前 UTC 日期内经过匿名去重后的访客数） */
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

/**
 * Cleans up legacy client-side device identifiers to adhere to R4 trust boundary.
 * Clients must not generate or transmit persistent device identifiers.
 */
export function cleanupLegacyDeviceId(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('playlistout_did');
    }
  } catch {
    // localStorage security restrictions
  }
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

export const REFERRER_SOURCES = [
  'direct',
  'chatgpt',
  'claude',
  'deepseek',
  'copilot',
  'gemini',
  'kimi',
  'google',
  'baidu',
  'bing',
  'sogou',
  '360search',
  'github',
  'v2ex',
  'juejin',
  'zhihu',
  'bilibili',
  'xiaohongshu',
  'wechat',
  'weibo',
  'twitter_x',
  'reddit',
  'meta_fb',
  'douyin_tiktok',
  'other_web',
] as const;
export type ReferrerSource = (typeof REFERRER_SOURCES)[number];

/**
 * Checks if a hostname matches a domain or subdomain of domain,
 * avoiding suffix spoofing (e.g. google.com.evil.com or evilgoogle.com).
 */
export function matchesDomain(hostname: string, domain: string): boolean {
  if (!hostname || !domain) return false;
  const h = hostname.toLowerCase();
  const d = domain.toLowerCase();
  return h === d || h.endsWith('.' + d);
}

/**
 * Tests if a hostname belongs to PlaylistOut official or local development environments.
 */
export function isSelfOrigin(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    matchesDomain(h, 'playlistout.com') ||
    matchesDomain(h, 'playlistout.lengxiqwq.com') ||
    matchesDomain(h, 'playlistout.pages.dev') ||
    matchesDomain(h, 'lengxiqwq.github.io') ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1'
  );
}

/**
 * Classifies an external web hostname strictly into a coarse category.
 * PRIVACY INVARIANT: Only the hostname is evaluated. Path, query, fragment, and userinfo are NEVER read.
 */
export function classifyHostname(hostname: string): ReferrerSource {
  if (!hostname) return 'direct';
  const h = hostname.toLowerCase().trim();
  if (isSelfOrigin(h)) return 'direct';

  // 1. AI Assistants
  if (matchesDomain(h, 'chatgpt.com') || matchesDomain(h, 'openai.com') || matchesDomain(h, 'oaistatic.com')) return 'chatgpt';
  if (matchesDomain(h, 'claude.ai') || matchesDomain(h, 'anthropic.com')) return 'claude';
  if (matchesDomain(h, 'deepseek.com')) return 'deepseek';
  if (matchesDomain(h, 'copilot.microsoft.com') || h === 'copilot.com' || matchesDomain(h, 'copilot.com')) return 'copilot';
  if (matchesDomain(h, 'gemini.google.com') || h === 'gemini.google') return 'gemini';
  if (matchesDomain(h, 'kimi.ai') || matchesDomain(h, 'kimi.moonshot.cn') || matchesDomain(h, 'moonshot.cn')) return 'kimi';

  // 2. Search Engines
  if (
    matchesDomain(h, 'google.com') ||
    matchesDomain(h, 'google.cn') ||
    /^([a-z0-9-]+\.)*google\.(com|cn|net|org|co\.[a-z]{2}|com?\.[a-z]{2}|[a-z]{2})$/i.test(h)
  ) return 'google';
  if (matchesDomain(h, 'baidu.com')) return 'baidu';
  if (matchesDomain(h, 'bing.com')) return 'bing';
  if (matchesDomain(h, 'sogou.com')) return 'sogou';
  if (matchesDomain(h, 'so.com') || matchesDomain(h, '360.cn')) return '360search';

  // 3. Tech & Developer Communities
  if (matchesDomain(h, 'github.com')) return 'github';
  if (matchesDomain(h, 'v2ex.com')) return 'v2ex';
  if (matchesDomain(h, 'juejin.cn')) return 'juejin';
  if (matchesDomain(h, 'zhihu.com')) return 'zhihu';
  if (matchesDomain(h, 'bilibili.com')) return 'bilibili';
  if (matchesDomain(h, 'xiaohongshu.com') || matchesDomain(h, 'xhslink.com')) return 'xiaohongshu';

  // 4. Social & Messaging
  if (matchesDomain(h, 'weixin.qq.com') || matchesDomain(h, 'wx.qq.com') || matchesDomain(h, 'wechat.com')) return 'wechat';
  if (matchesDomain(h, 'weibo.com') || matchesDomain(h, 'weibo.cn') || matchesDomain(h, 't.cn')) return 'weibo';
  if (matchesDomain(h, 'twitter.com') || matchesDomain(h, 'x.com') || matchesDomain(h, 't.co')) return 'twitter_x';
  if (matchesDomain(h, 'reddit.com')) return 'reddit';
  if (matchesDomain(h, 'facebook.com') || matchesDomain(h, 'fb.me') || matchesDomain(h, 'instagram.com')) return 'meta_fb';
  if (matchesDomain(h, 'douyin.com') || matchesDomain(h, 'tiktok.com')) return 'douyin_tiktok';

  // Other valid external web host
  return 'other_web';
}

/**
 * Normalizes campaign attribution hints (utm_source, ref, from) into a safe coarse category.
 * PRIVACY INVARIANT: Unrecognized campaign values (e.g. emails, tokens, private URLs)
 * are NEVER forwarded; they are strictly normalized to 'other_web'.
 */
export function classifyCampaignHint(hint: string | null | undefined): ReferrerSource | null {
  if (!hint) return null;
  const lower = hint.trim().toLowerCase();
  if (!lower) return null;

  if (lower === 'direct') return 'direct';

  // AI Assistants
  if (lower === 'chatgpt' || lower === 'openai') return 'chatgpt';
  if (lower === 'claude' || lower === 'anthropic') return 'claude';
  if (lower === 'deepseek') return 'deepseek';
  if (lower === 'copilot') return 'copilot';
  if (lower === 'gemini') return 'gemini';
  if (lower === 'kimi' || lower === 'moonshot') return 'kimi';

  // Search Engines
  if (lower === 'google') return 'google';
  if (lower === 'baidu') return 'baidu';
  if (lower === 'bing') return 'bing';
  if (lower === 'sogou') return 'sogou';
  if (lower === '360' || lower === '360search' || lower === 'so') return '360search';

  // Tech & Communities
  if (lower === 'github') return 'github';
  if (lower === 'v2ex') return 'v2ex';
  if (lower === 'juejin') return 'juejin';
  if (lower === 'zhihu') return 'zhihu';
  if (lower === 'bilibili' || lower === 'b站') return 'bilibili';
  if (lower === 'xiaohongshu' || lower === 'xhs' || lower === '小红书') return 'xiaohongshu';

  // Social & Messaging
  if (lower === 'wechat' || lower === 'weixin' || lower === '微信') return 'wechat';
  if (lower === 'weibo' || lower === '微博') return 'weibo';
  if (lower === 'twitter' || lower === 'x' || lower === 'twitter_x') return 'twitter_x';
  if (lower === 'reddit') return 'reddit';
  if (lower === 'facebook' || lower === 'fb' || lower === 'instagram' || lower === 'meta') return 'meta_fb';
  if (lower === 'douyin' || lower === 'tiktok' || lower === '抖音') return 'douyin_tiktok';

  // Any other campaign value (e.g. user emails, arbitrary tokens) -> 'other_web'
  return 'other_web';
}

/**
 * Classifies visitor acquisition source in the browser before telemetry transmission.
 *
 * PRECEDENCE:
 * 1. External document.referrer -> parsed strictly for hostname, classified via classifyHostname().
 * 2. If no external referrer (or self-origin navigation) -> inspects campaign parameters (utm_source, ref, from).
 * 3. If neither -> 'direct'.
 *
 * PRIVACY GUARANTEE:
 * - Full URLs, paths, search queries, fragments, or auth tokens NEVER leave the browser.
 * - Only the resulting ReferrerSource category token is returned.
 */
export function classifyReferrerSource(
  referrerUrl?: string | null,
  searchQuery?: URLSearchParams | string | null,
): ReferrerSource {
  // 1. External document.referrer
  if (referrerUrl && typeof referrerUrl === 'string') {
    try {
      const url = new URL(referrerUrl);
      const hostname = url.hostname;
      if (hostname && !isSelfOrigin(hostname)) {
        return classifyHostname(hostname);
      }
    } catch {
      // Invalid URL string: do not transmit, treat as no external referrer
    }
  }

  // 2. Campaign hint fallback
  if (searchQuery) {
    try {
      const params = typeof searchQuery === 'string'
        ? new URLSearchParams(searchQuery.startsWith('?') ? searchQuery : '?' + searchQuery)
        : searchQuery;
      const rawHint = params.get('utm_source') || params.get('ref') || params.get('from');
      if (rawHint) {
        const classified = classifyCampaignHint(rawHint);
        if (classified) return classified;
      }
    } catch {
      // ignore query parsing errors
    }
  }

  // 3. Fallback
  return 'direct';
}

/**
 * Fires an anonymous page visit event.
 * Server derives daily unique visitor identity safely without trusting client deviceId.
 * Emits live stats refresh when successfully processed.
 */
export async function recordVisit(): Promise<void> {
  cleanupLegacyDeviceId();

  // Compute coarse acquisition source locally; full URLs/paths/queries NEVER leave the browser
  const referrerUrl = typeof document !== 'undefined' ? document.referrer : undefined;
  const searchParams = typeof window !== 'undefined' && window.location ? window.location.search : undefined;
  const referrerSource = classifyReferrerSource(referrerUrl, searchParams);

  const payload = JSON.stringify({
    type: 'visit',
    referrerSource,
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


/**
 * Submits a failed playlist URL for maintainer review.
 * Users explicitly opt in by clicking "一键反馈" on error cards.
 * The URL and error code are stored so the maintainer can diagnose and fix parsing issues.
 *
 * PRIVACY: Only the submitted URL, error code, and optional platform hint are sent.
 * No user identifiers, IP, or device information is transmitted by this function.
 */
export async function submitFeedback(
  url: string,
  errorCode: string,
  platform?: string,
): Promise<{ success: boolean; alreadyReported?: boolean }> {
  const payload = JSON.stringify({ url, errorCode, platform });
  const endpoint = `${API_BASE_URL || REMOTE_API_BASE_URL}/api/feedback`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
    if (res.ok) {
      try {
        const data = await res.json();
        return { success: true, alreadyReported: data?.alreadyReported };
      } catch {
        return { success: true };
      }
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}
