import { API_BASE_URL, REMOTE_API_BASE_URL } from './base';
import { notifyStatsIncrement } from './stats';

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
 * Cleans up legacy client-side device identifiers to adhere to R4 trust boundary.
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

/**
 * Fires an anonymous page visit event.
 */
export async function recordVisit(): Promise<void> {
  cleanupLegacyDeviceId();

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
      notifyStatsIncrement({ kind: 'visit' });
      return;
    }
  } catch {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        notifyStatsIncrement({ kind: 'visit' });
      }
    } catch {
      // Fire-and-forget best-effort
    }
  }
}

/**
 * Fires an anonymous file export event (TXT, CSV, XLSX, JSON, M3U8).
 */
export async function recordExportEvent(
  format: 'txt' | 'csv' | 'xlsx' | 'json' | 'm3u8',
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
      notifyStatsIncrement({ kind: 'export', format });
      return;
    }
  } catch {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        notifyStatsIncrement({ kind: 'export', format });
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
  format: 'title' | 'title-artist' | 'title-artist-album' | 'json',
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
