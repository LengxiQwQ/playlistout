/**
 * Analytics Type Definitions
 * Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9
 * and docs/ROADMAP.md Section 2 (Analytics Foundation).
 */

// ── Public Stats Response (served via GET /api/stats) ──

export interface PlatformBreakdown {
  totalSuccess: number;
  todaySuccess?: number;
}

export interface PublicDailyTrendEntry {
  date: string;
  parses: number;
  tracks: number;
  exports: number;
}

/** Legacy alias for backward compatibility */
export type DailyTrendEntry = PublicDailyTrendEntry;

export interface PublicStatsResponse {
  launchedAt: string;
  /**
   * 累计日独立访问人次（Canonical 正式字段）。
   * 每天先进行匿名去重，再将各日独立访客数累加。
   * PlaylistOut 不进行跨日身份追踪，同一访客在不同日期访问时可能再次计入。
   */
  cumulativeDailyVisitors: number;
  /**
   * @deprecated Use cumulativeDailyVisitors.
   * Legacy compatibility alias for cumulativeDailyVisitors.
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
  recentDays: PublicDailyTrendEntry[];
  generatedAt: string;
}

// ── Event Ingestion Types (POST /api/event) ──

export const SUPPORTED_PLATFORMS = ['qqmusic', 'netease', 'kugou', 'qishui'] as const;
export type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number];

export const VALID_EXPORT_FORMATS = ['xlsx', 'json', 'txt', 'csv', 'm3u8'] as const;
export type ExportFormat = typeof VALID_EXPORT_FORMATS[number];

export const VALID_CLIPBOARD_MODES = [
  'title',
  'title-artist',
  'title-artist-album',
  'title_artist',
  'title_artist_album',
  'json',
] as const;
export type ClipboardMode = typeof VALID_CLIPBOARD_MODES[number];

export const CANONICAL_CLIPBOARD_MODES = [
  'title',
  'title_artist',
  'title_artist_album',
  'json',
] as const;
export type CanonicalClipboardMode = typeof CANONICAL_CLIPBOARD_MODES[number];

export const MAX_TRACK_COUNT = 50000;

export interface ExportEventPayload {
  type: 'export';
  format: ExportFormat;
  platform: SupportedPlatform;
  trackCount?: number;
}

export interface ClipboardEventPayload {
  type: 'clipboard';
  format: ClipboardMode;
  platform: SupportedPlatform;
  trackCount?: number;
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

export interface VisitEventPayload {
  type: 'visit';
  referrerSource?: ReferrerSource;
}

export type EventPayload = ExportEventPayload | ClipboardEventPayload | VisitEventPayload;

// ── Dimension Constants ──

export const PLAYLIST_SIZE_BUCKETS = [
  '1-50', '51-200', '201-500', '501-1000', '1000+',
] as const;
export type PlaylistSizeBucket = typeof PLAYLIST_SIZE_BUCKETS[number];

export const LATENCY_BUCKETS = [
  '<500ms', '500-1000ms', '1-3s', '3-5s', '5s+',
] as const;
export type LatencyBucket = typeof LATENCY_BUCKETS[number];

export const ERROR_CATEGORIES = [
  'error_upstream', 'error_validation', 'error_timeout',
  'error_rate_limit', 'error_internal',
] as const;
export type ErrorCategory = typeof ERROR_CATEGORIES[number];

export const DEVICE_CLASSES = ['desktop', 'mobile', 'tablet'] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export const BROWSER_FAMILIES = [
  'chrome',
  'firefox',
  'safari',
  'edge',
  'wechat',
  'qqbrowser',
  'quark',
  'uc',
  'baidu',
  '360',
  'sogou',
  'opera',
  'vivaldi',
  'brave',
  'samsung_browser',
  'miui_browser',
  'huawei_browser',
  'oppo_browser',
  'vivo_browser',
  'honor_browser',
  'via',
  'xbrowser',
  '115_browser',
  'alipay',
  'dingtalk',
  'weibo',
  'bilibili',
  'douyin',
  'yandex',
  'arc',
  'tor',
  'duckduckgo',
  'bot_crawler',
  'other',
] as const;
export type BrowserFamily = (typeof BROWSER_FAMILIES)[number] | (string & {});



export const OS_FAMILIES = ['windows', 'macos', 'linux', 'android', 'ios', 'other'] as const;
export type OsFamily = typeof OS_FAMILIES[number];

export const INPUT_TYPES = ['web_url', 'mobile_share_link', 'raw_id', 'other'] as const;
export type InputType = typeof INPUT_TYPES[number];

// ── R7 Resolve Failure Telemetry Constants & Types ──

export const RESOLVE_OUTCOMES = [
  'success_playlist',
  'success_user',
  'failure',
] as const;
export type ResolveOutcome = typeof RESOLVE_OUTCOMES[number];

export const RESOLVE_FAILURE_CODES = [
  'invalid_input',
  'unsupported_url',
  'unsupported_platform',
  'playlist_not_found',
  'user_not_found',
  'upstream_error',
  'upstream_timeout',
  'incomplete_playlist',
  'parse_error',
  'forbidden',
  'rate_limited',
  'ambiguous_input',
  'internal_error',
] as const;
export type ResolveFailureCode = typeof RESOLVE_FAILURE_CODES[number];

export const RESOLVE_FAILURE_CLASSES = [
  'input',
  'not_found',
  'ambiguous',
  'auth',
  'upstream',
  'timeout',
  'incomplete',
  'parse',
  'internal',
] as const;
export type ResolveFailureClass = typeof RESOLVE_FAILURE_CLASSES[number];

export const RESOLVE_FAILURE_STAGES = [
  'input_validation',
  'routing',
  'short_link_resolution',
  'playlist_resolution',
  'user_resolution',
  'disambiguation_probe',
  'provider_fetch',
  'finalization',
] as const;
export type ResolveFailureStage = typeof RESOLVE_FAILURE_STAGES[number];

export const RESOLVE_REQUESTED_TYPES = ['auto', 'playlist', 'user', 'unknown'] as const;
export type ResolveRequestedType = typeof RESOLVE_REQUESTED_TYPES[number];

export const RESOLVE_REQUESTED_PLATFORMS = [
  'auto',
  'qqmusic',
  'netease',
  'kugou',
  'qishui',
  'unknown',
] as const;
export type ResolveRequestedPlatform = typeof RESOLVE_REQUESTED_PLATFORMS[number];

/** Internal platform token for analytics only; never exposed as a public input option */
export const ANALYTICS_PLATFORMS = [
  'qqmusic',
  'netease',
  'kugou',
  'qishui',
  'unknown',
] as const;
export type AnalyticsPlatform = typeof ANALYTICS_PLATFORMS[number];

export const PROVIDER_FAILURE_PATHS = [
  'primary',
  'fallback',
  'both',
  'not_applicable',
  'unknown',
] as const;
export type ProviderFailurePath = typeof PROVIDER_FAILURE_PATHS[number];
