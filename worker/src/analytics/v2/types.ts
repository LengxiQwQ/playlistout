export const ANALYTICS_CHANNELS = ['web', 'plugin', 'api', 'internal', 'legacy_mixed'] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

export const ANALYTICS_TRUST_CLASSES = ['attested', 'declared', 'untrusted', 'automated', 'abusive'] as const;
export type AnalyticsTrustClass = (typeof ANALYTICS_TRUST_CLASSES)[number];

export const ANALYTICS_CLIENT_IDS = [
  'official_web',
  'musicfree',
  'moosync',
  'anonymous_api',
  'legacy_unknown',
] as const;
export type AnalyticsClientId = (typeof ANALYTICS_CLIENT_IDS)[number];

export const ANALYTICS_HOST_PLATFORMS = [
  'windows', 'macos', 'linux', 'android', 'ios', 'other', 'unknown',
] as const;
export type AnalyticsHostPlatform = (typeof ANALYTICS_HOST_PLATFORMS)[number];

export type AnalyticsPlatformToken =
  | 'qqmusic'
  | 'netease'
  | 'kugou'
  | 'qishui'
  | 'unknown'
  | 'none';

export interface AnalyticsRequestContext {
  dateUtc: string;
  hourUtc: number;
  channel: AnalyticsChannel;
  clientId: AnalyticsClientId;
  clientVersion: string;
  hostPlatform: AnalyticsHostPlatform;
  trustClass: AnalyticsTrustClass;
  endpoint: string;
  country: string;
  region: string;
  deviceClass: string;
  browserFamily: string;
  osFamily: string;
  deviceBrand?: string;
}

export interface AnalyticsV2MetricWrite {
  metric: string;
  platform?: string | null;
  countDelta?: number;
  valueSumDelta?: number;
  endpoint?: string;
  includeHourly?: boolean;
}

export interface AnalyticsV2DimensionWrite {
  dimension: string;
  value: string;
  platform?: string | null;
  endpoint?: string;
  countDelta?: number;
}
