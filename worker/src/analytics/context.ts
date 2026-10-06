import { isOriginAllowed } from '../cors';
import { parseUserAgent } from './ua-parser';

export const ANALYTICS_CHANNELS = ['web', 'plugin', 'api', 'internal', 'legacy_mixed'] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

export const ANALYTICS_CLIENT_IDS = [
  'official_web',
  'musicfree',
  'anonymous_api',
  'internal',
  'legacy_unknown',
  'unknown_plugin',
] as const;
export type AnalyticsClientId = (typeof ANALYTICS_CLIENT_IDS)[number];

export const ANALYTICS_PLATFORMS_V2 = [
  'qqmusic',
  'netease',
  'kugou',
  'qishui',
  'unknown',
  'none',
] as const;
export type AnalyticsPlatformV2 = (typeof ANALYTICS_PLATFORMS_V2)[number];

export interface AnalyticsRequestContextV2 {
  date: string;
  hour: number;
  channel: AnalyticsChannel;
  clientId: AnalyticsClientId;
  clientVersion: string | null;
  hostPlatform: string | null;
  country: string;
  region: string;
  deviceClass: string;
  browserFamily: string;
  osFamily: string;
  isAutomated: boolean;
}

const REGISTERED_PLUGIN_IDS = new Set(['musicfree']);
const HOST_PLATFORMS = new Set(['android', 'windows', 'macos', 'linux', 'ios', 'unknown']);

function normalizeCountry(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(raw) ? raw : 'UNKNOWN';
}

function normalizeRegion(value: unknown): string {
  if (typeof value !== 'string') return 'UNKNOWN';
  const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 50);
  return cleaned || 'UNKNOWN';
}

function normalizeVersion(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().slice(0, 32);
  return /^[0-9A-Za-z][0-9A-Za-z._+\-]{0,31}$/.test(cleaned) ? cleaned : null;
}

function normalizeHostPlatform(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  return HOST_PLATFORMS.has(cleaned) ? cleaned : 'unknown';
}

function requestLooksAutomated(request: Request): boolean {
  const ua = request.headers.get('user-agent')?.trim() || '';
  return /bot|spider|crawler|crawl|slurp|uptimerobot|github-camo|headless|lighthouse/i.test(ua);
}

function hasOfficialWebOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')?.trim() || '';
  if (origin && isOriginAllowed(origin)) return true;

  const referer = request.headers.get('referer')?.trim() || '';
  if (referer) {
    try {
      return isOriginAllowed(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
}

export function normalizeAnalyticsPlatformV2(value: unknown): AnalyticsPlatformV2 {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (ANALYTICS_PLATFORMS_V2 as readonly string[]).includes(raw)
    ? (raw as AnalyticsPlatformV2)
    : 'unknown';
}

export function createAnalyticsRequestContextV2(request: Request): AnalyticsRequestContextV2 {
  const cf = (request as any).cf;
  const ua = parseUserAgent(request.headers.get('user-agent'));

  const declaredType = request.headers.get('x-playlistout-client-type')?.trim().toLowerCase() || '';
  const declaredId = request.headers.get('x-playlistout-client-id')?.trim().toLowerCase() || '';
  const declaredVersion = normalizeVersion(request.headers.get('x-playlistout-client-version'));
  const hostPlatform = normalizeHostPlatform(request.headers.get('x-playlistout-host'));

  let channel: AnalyticsChannel;
  let clientId: AnalyticsClientId;

  if (declaredType === 'plugin') {
    channel = 'plugin';
    clientId = REGISTERED_PLUGIN_IDS.has(declaredId)
      ? (declaredId as AnalyticsClientId)
      : 'unknown_plugin';
  } else if (hasOfficialWebOrigin(request)) {
    channel = 'web';
    clientId = 'official_web';
  } else {
    channel = 'api';
    clientId = 'anonymous_api';
  }

  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    hour: now.getUTCHours(),
    channel,
    clientId,
    clientVersion: channel === 'plugin' ? declaredVersion : null,
    hostPlatform: channel === 'plugin' ? hostPlatform : null,
    country: normalizeCountry(cf?.country),
    region: normalizeRegion(cf?.region),
    deviceClass: ua.deviceClass,
    browserFamily: ua.browserFamily,
    osFamily: ua.osFamily,
    isAutomated: requestLooksAutomated(request),
  };
}
