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

export interface PublicStatsResponse {
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

// ── Event Ingestion Payload (POST /api/event) ──

export type EventType = 'export' | 'clipboard';

export const VALID_EXPORT_FORMATS = [
  'txt', 'csv', 'xlsx', 'json',
  'clipboard_title', 'clipboard_title_artist', 'clipboard_title_artist_album',
] as const;

export type ExportFormat = typeof VALID_EXPORT_FORMATS[number];

export interface EventPayload {
  type: EventType;
  format: string;       // validated against VALID_EXPORT_FORMATS
  platform: string;
  trackCount?: number;
}

// ── Parse Analytics Context (internal, passed to recorder) ──

export interface ParseAnalyticsContext {
  request: Request;
  platform: string;
  inputType: string;
  success: boolean;
  trackCount?: number;
  errorCategory?: string;
  latencyMs?: number;
  providerPath?: string;
}

// ── Private Analytics Event Row ──

export interface AnalyticsEventRow {
  date: string;
  hour_bucket: number;
  country: string | null;
  region: string | null;
  platform: string;
  event_type: string;
  input_type: string | null;
  result: string;
  error_category: string | null;
  playlist_size_bucket: string | null;
  track_count: number | null;
  export_format: string | null;
  device_class: string | null;
  browser_family: string | null;
  os_family: string | null;
  latency_bucket: string | null;
  provider_path: string | null;
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
