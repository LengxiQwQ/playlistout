import { isEventOriginAllowed, isOriginAllowed } from '../../cors';
import { verifySessionToken } from '../../security/session';
import { parseUserAgent } from '../ua-parser';
import type {
  AnalyticsClientId,
  AnalyticsHostPlatform,
  AnalyticsRequestContext,
  AnalyticsTrustClass,
} from './types';

const KNOWN_PLUGIN_IDS = new Set<AnalyticsClientId>(['musicfree', 'moosync']);
const HOST_PLATFORMS = new Set<AnalyticsHostPlatform>([
  'windows', 'macos', 'linux', 'android', 'ios', 'other', 'unknown',
]);

function normalizeClientVersion(raw: string | null): string {
  if (!raw) return 'unknown';
  const match = raw.trim().match(/^v?(\d{1,4})(?:\.(\d{1,4}))?(?:\.(\d{1,4}))?/i);
  if (!match) return 'unknown';
  return [match[1], match[2] ?? '0', match[3] ?? '0'].join('.');
}

function normalizeHostPlatform(raw: string | null): AnalyticsHostPlatform {
  const clean = (raw || '').trim().toLowerCase() as AnalyticsHostPlatform;
  return HOST_PLATFORMS.has(clean) ? clean : 'unknown';
}

function normalizeGeo(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return 'UNKNOWN';
  const clean = value.trim();
  if (!clean) return 'UNKNOWN';
  return clean.slice(0, maxLength);
}

function endpointFromPath(pathname: string): string {
  switch (pathname) {
    case '/api/resolve':
    case '/api/v1/resolve':
      return 'resolve';
    case '/api/playlist':
    case '/api/v1/playlist':
      return 'playlist';
    case '/api/user/playlists':
    case '/api/v1/user/playlists':
      return 'user_playlists';
    case '/api/event':
      return 'event';
    case '/api/stats':
    case '/api/v1/stats':
      return 'stats';
    case '/api/migrate/soundiiz':
      return 'migration_soundiiz';
    default:
      return pathname.startsWith('/api/internal/') ? 'internal' : 'other';
  }
}

function isExplicitAutomation(userAgent: string): boolean {
  return /bot|spider|crawler|crawl\/|slurp|headless|github-camo|uptimerobot|lighthouse|synthetic-monitor|health-checker/i.test(
    userAgent,
  );
}

function hasOfficialWebOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')?.trim() || '';
  if (origin && isOriginAllowed(origin)) return true;
  const referer = request.headers.get('referer')?.trim() || '';
  if (!referer) return false;
  try {
    return isOriginAllowed(new URL(referer).origin);
  } catch {
    return false;
  }
}

export async function createAnalyticsRequestContext(
  request: Request,
  sessionSecret = '',
): Promise<AnalyticsRequestContext> {
  const now = new Date();
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent')?.trim() || '';
  const explicitAutomation = isExplicitAutomation(userAgent);
  const declaredType = request.headers.get('x-playlistout-client-type')?.trim().toLowerCase() || '';
  const declaredClient = request.headers.get('x-playlistout-client-id')?.trim().toLowerCase() || '';
  const pluginClient = KNOWN_PLUGIN_IDS.has(declaredClient as AnalyticsClientId)
    ? (declaredClient as AnalyticsClientId)
    : null;

  const officialOrigin = hasOfficialWebOrigin(request);
  const sessionHeader = request.headers.get('x-playlistout-session')?.trim() || '';
  const sessionValid = Boolean(sessionHeader) && await verifySessionToken(sessionHeader, sessionSecret);
  const eventOrigin = isEventOriginAllowed(request.headers.get('origin'));

  let channel: AnalyticsRequestContext['channel'];
  let clientId: AnalyticsClientId;
  let trustClass: AnalyticsTrustClass;

  if (url.pathname.startsWith('/api/internal/')) {
    channel = 'internal';
    clientId = 'anonymous_api';
    trustClass = explicitAutomation ? 'automated' : 'untrusted';
  } else if (declaredType === 'plugin' && pluginClient) {
    channel = 'plugin';
    clientId = pluginClient;
    trustClass = explicitAutomation ? 'automated' : 'declared';
  } else if (officialOrigin && sessionValid) {
    channel = 'web';
    clientId = 'official_web';
    trustClass = explicitAutomation ? 'automated' : 'attested';
  } else if ((url.pathname === '/api/event' && eventOrigin) || officialOrigin) {
    channel = 'web';
    clientId = 'official_web';
    trustClass = explicitAutomation ? 'automated' : 'declared';
  } else {
    channel = 'api';
    clientId = 'anonymous_api';
    trustClass = explicitAutomation ? 'automated' : 'untrusted';
  }

  const cf = (request as any).cf;
  const country = normalizeGeo(cf?.country, 2).toUpperCase();
  const region = normalizeGeo(cf?.region, 50);
  const ua = parseUserAgent(userAgent);

  return {
    dateUtc: now.toISOString().slice(0, 10),
    hourUtc: now.getUTCHours(),
    channel,
    clientId,
    clientVersion: channel === 'plugin'
      ? normalizeClientVersion(request.headers.get('x-playlistout-client-version'))
      : 'unknown',
    hostPlatform: channel === 'plugin'
      ? normalizeHostPlatform(request.headers.get('x-playlistout-host-platform'))
      : 'unknown',
    trustClass,
    endpoint: endpointFromPath(url.pathname),
    country,
    region,
    deviceClass: ua.deviceClass || 'other',
    browserFamily: ua.browserFamily || 'other',
    osFamily: ua.osFamily || 'other',
    deviceBrand: ua.deviceBrand || undefined,
  };
}
