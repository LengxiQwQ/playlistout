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

export interface DailyTrendEntry {
  date: string;
  parses: number;
  tracks: number;
  exports: number;
}

export interface GeoDistributionItem {
  country: string;
  region?: string;
  count: number;
  percentage: number;
}

export interface ProvinceDistributionItem {
  province: string;
  count: number;
  percentage: number;
}

export interface ClientDistributionItem {
  name: string;
  percentage: number;
}

export interface PublicStatsResponse {
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
  topGeo?: GeoDistributionItem[];
  chinaProvinces?: ProvinceDistributionItem[];
  clientStats?: {
    devices: ClientDistributionItem[];
    browsers: ClientDistributionItem[];
    os: ClientDistributionItem[];
  };
  generatedAt: string;
}

// ── Event Ingestion Types (POST /api/event) ──

export const SUPPORTED_PLATFORMS = ['qqmusic', 'netease', 'kugou'] as const;
export type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number];

export const VALID_EXPORT_FORMATS = ['txt', 'csv', 'xlsx', 'json'] as const;
export type ExportFormat = typeof VALID_EXPORT_FORMATS[number];

export const VALID_CLIPBOARD_MODES = [
  'title',
  'title-artist',
  'title-artist-album',
  'title_artist',
  'title_artist_album',
] as const;
export type ClipboardMode = typeof VALID_CLIPBOARD_MODES[number];

export const CANONICAL_CLIPBOARD_MODES = [
  'title',
  'title_artist',
  'title_artist_album',
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

export interface VisitEventPayload {
  type: 'visit';
  deviceId?: string;
}

export type EventPayload = ExportEventPayload | ClipboardEventPayload | VisitEventPayload;

// ── Parse Analytics Context (internal, passed to recorder) ──

export interface ParseAnalyticsContext {
  request: Request;
  platform: string;
  inputType: string;
  success: boolean;
  trackCount?: number;
  errorCategory?: string;
  latencyMs?: number;
  providerPath?: 'primary' | 'fallback';
}

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
export type DeviceClass = typeof DEVICE_CLASSES[number];

export const BROWSER_FAMILIES = ['chrome', 'firefox', 'safari', 'edge', 'other'] as const;
export type BrowserFamily = typeof BROWSER_FAMILIES[number];

export const OS_FAMILIES = ['windows', 'macos', 'linux', 'android', 'ios', 'other'] as const;
export type OsFamily = typeof OS_FAMILIES[number];

export const INPUT_TYPES = ['web_url', 'mobile_share_link', 'raw_id', 'other'] as const;
export type InputType = typeof INPUT_TYPES[number];
