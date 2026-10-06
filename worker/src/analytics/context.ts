import { isOriginAllowed } from '../cors';
import { parseUserAgent } from './ua-parser';
import {
  REGISTERED_PLUGIN_ID_SET,
  type RegisteredPluginId,
} from './generated/registered-plugins';
import type { BrowserFamily, DeviceClass, OsFamily } from './types';

export const ANALYTICS_CHANNELS = ['web', 'plugin', 'api', 'internal', 'legacy_mixed'] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

/**
 * Non-plugin client IDs. Registered plugin IDs are appended via the generated
 * registry; AnalyticsClientId is the union of both.
 */
export const ANALYTICS_CLIENT_IDS = [
  'official_web',
  'anonymous_api',
  'internal',
  'legacy_unknown',
  'unknown_plugin',
] as const;
export type AnalyticsClientId =
  | (typeof ANALYTICS_CLIENT_IDS)[number]
  | RegisteredPluginId;

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
  deviceClass: DeviceClass;
  browserFamily: BrowserFamily;
  osFamily: OsFamily;
  isAutomated: boolean;
}

const HOST_PLATFORMS = new Set(['android', 'windows', 'macos', 'linux', 'ios', 'unknown']);

/**
 * Maps a declared plugin host platform to coarse environment categories.
 * Plugin runtimes (especially on Android) do not send a device-bearing UA,
 * so the explicit Host header is authoritative for plugin traffic.
 */
export function mapHostPlatformToEnv(
  hostPlatform: string | null,
): { deviceClass: DeviceClass; osFamily: OsFamily } | null {
  switch (hostPlatform) {
    case 'android':
      return { deviceClass: 'mobile', osFamily: 'android' };
    case 'ios':
      return { deviceClass: 'mobile', osFamily: 'ios' };
    case 'windows':
      return { deviceClass: 'desktop', osFamily: 'windows' };
    case 'macos':
      return { deviceClass: 'desktop', osFamily: 'macos' };
    case 'linux':
      return { deviceClass: 'desktop', osFamily: 'linux' };
    default:
      return null;
  }
}

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
  const parsedUA = parseUserAgent(request.headers.get('user-agent'));

  const declaredType = request.headers.get('x-playlistout-client-type')?.trim().toLowerCase() || '';
  const declaredId = request.headers.get('x-playlistout-client-id')?.trim().toLowerCase() || '';
  const declaredVersion = normalizeVersion(request.headers.get('x-playlistout-client-version'));
  const hostPlatform = normalizeHostPlatform(request.headers.get('x-playlistout-host'));

  let channel: AnalyticsChannel;
  let clientId: AnalyticsClientId;

  if (declaredType === 'plugin') {
    channel = 'plugin';
    clientId = REGISTERED_PLUGIN_ID_SET.has(declaredId)
      ? (declaredId as AnalyticsClientId)
      : 'unknown_plugin';
  } else if (hasOfficialWebOrigin(request)) {
    channel = 'web';
    clientId = 'official_web';
  } else {
    channel = 'api';
    clientId = 'anonymous_api';
  }

  // Plugin UA carries no device/OS hints; the explicit Host header is
  // authoritative when it maps to a known environment.
  let deviceClass = parsedUA.deviceClass;
  let osFamily = parsedUA.osFamily;
  if (channel === 'plugin') {
    const hostEnv = mapHostPlatformToEnv(hostPlatform);
    if (hostEnv) {
      deviceClass = hostEnv.deviceClass;
      osFamily = hostEnv.osFamily;
    }
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
    deviceClass,
    browserFamily: parsedUA.browserFamily,
    osFamily,
    isAutomated: requestLooksAutomated(request),
  };
}
