import Clarity from '@microsoft/clarity';

/**
 * Microsoft Clarity Analytics Adapter for PlaylistOut
 *
 * GOVERNANCE:
 * - Parallel, lightweight, non-invasive UX observation layer.
 * - Does NOT alter, replace, or depend on existing Worker / D1 / /api/event statistics.
 * - ZERO IDENTIFICATION: Never calls Clarity.identify(); zero user tracking or cross-day fingerprinting.
 * - STRICT PRIVACY: Playlist URLs, IDs, song titles, artists, albums, auth tokens,
 *   and raw queries/errors are strictly prohibited from being passed to Clarity.
 * - BEST-EFFORT: All invocations fail silently; Clarity errors NEVER break user flows.
 */

export const CLARITY_PROJECT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLARITY_PROJECT_ID) ||
  'yloiqvw5lu';

export const CANONICAL_CLARITY_HOST = 'playlistout.lengxiqwq.com';
export const CLARITY_CONSENT_STORAGE_KEY = 'playlistout_clarity_consent_v1';
export type ClarityConsent = 'granted' | 'denied' | null;

export const CLARITY_EVENTS = [
  'playlist_parse_success',
  'playlist_parse_failure',
  'playlist_export',
  'clipboard_copy',
] as const;
export type ClarityEvent = (typeof CLARITY_EVENTS)[number];

export interface ClarityTagMap {
  platform: 'qqmusic' | 'netease' | 'kugou' | 'qishui';
  export_format: 'txt' | 'csv' | 'xlsx' | 'json';
  clipboard_mode:
    | 'title'
    | 'title-artist'
    | 'title-artist-album'
    | 'title_artist'
    | 'title_artist_album';
  playlist_size_bucket: '1-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  language: 'zh-CN' | 'en-US';
}
export type ClarityTagKey = keyof ClarityTagMap;

export const CLARITY_TAG_KEYS = Object.keys({
  platform: true,
  export_format: true,
  clipboard_mode: true,
  playlist_size_bucket: true,
  language: true,
}) as ClarityTagKey[];

/**
 * Strict runtime whitelist mapping every tag key to allowed canonical values.
 * Prevents unknown strings, URLs, song titles, or IDs from leaking into Clarity.
 */
export const CLARITY_TAG_VALUE_WHITELIST: {
  readonly [K in ClarityTagKey]: readonly ClarityTagMap[K][];
} = {
  platform: ['qqmusic', 'netease', 'kugou', 'qishui'],
  export_format: ['txt', 'csv', 'xlsx', 'json'],
  clipboard_mode: [
    'title',
    'title-artist',
    'title-artist-album',
    'title_artist',
    'title_artist_album',
  ],
  playlist_size_bucket: ['1-50', '51-200', '201-500', '501-1000', '1000+'],
  language: ['zh-CN', 'en-US'],
};

export const PLAYLIST_SIZE_BUCKETS = [
  '1-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+',
] as const;
export type PlaylistSizeBucket = (typeof PLAYLIST_SIZE_BUCKETS)[number];

/**
 * Reuses the canonical playlist size bucket classifier matching backend dimensions.
 */
export function classifyPlaylistSize(trackCount: number | undefined): PlaylistSizeBucket | null {
  if (trackCount === undefined || trackCount === null || trackCount < 0) return null;
  if (trackCount <= 50) return '1-50';
  if (trackCount <= 200) return '51-200';
  if (trackCount <= 500) return '201-500';
  if (trackCount <= 1000) return '501-1000';
  return '1000+';
}

let isInitialized = false;

export function isClarityInitialized(): boolean {
  return isInitialized;
}

function hasClarityDebugOverride(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem('playlistout_clarity_debug') === 'true';
  } catch {
    return false;
  }
}

export function getClarityConsent(): ClarityConsent {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage?.getItem(CLARITY_CONSENT_STORAGE_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : null;
  } catch {
    return null;
  }
}

function persistClarityConsent(consent: Exclude<ClarityConsent, null>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(CLARITY_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Storage may be unavailable in hardened/private browsing contexts.
  }
}

function signalClarityConsent(consent: Exclude<ClarityConsent, null>): void {
  if (!isInitialized) return;
  try {
    Clarity.consentV2({
      ad_Storage: 'denied',
      analytics_Storage: consent === 'granted' ? 'granted' : 'denied',
    });
  } catch {
    // Consent signaling is best-effort and must never affect product behavior.
  }
}

/**
 * Evaluates whether Clarity should run in the current runtime environment.
 * Default:
 * - Disabled in server/headless environments
 * - Disabled in test environments
 * - Disabled in localhost/dev environments
 * - Disabled on non-canonical hosts (Vite preview, GitHub Pages, etc.)
 * - Enabled strictly on canonical production host (playlistout.lengxiqwq.com)
 * - Can be explicitly overridden in dev/test via localStorage debug flag
 */
export function isCanonicalClarityHost(hostname?: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  return hostname.trim().toLowerCase() === CANONICAL_CLARITY_HOST;
}

/**
 * Evaluates whether Clarity should run in the current runtime environment.
 * Default:
 * - Disabled in server/headless environments
 * - Disabled in test environments
 * - Disabled in localhost/dev environments
 * - Disabled on non-canonical hosts (Vite preview, GitHub Pages, etc.)
 * - Enabled strictly on canonical production host (playlistout.lengxiqwq.com)
 * - Can be explicitly overridden in dev/test via localStorage debug flag
 */
export function shouldEnableClarity(hostname?: string): boolean {
  if (typeof window === 'undefined') return false;

  // Allow explicit maintainer-only debug override in dev or test environments.
  if (hasClarityDebugOverride()) {
    return true;
  }

  // If an explicit hostname is provided to check (e.g. host guard validation)
  if (hostname) {
    return isCanonicalClarityHost(hostname);
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    return false;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return false;
  }

  const currentHost = ((window.location && window.location.hostname) || '').toLowerCase();
  return isCanonicalClarityHost(currentHost);
}

/**
 * Initializes Microsoft Clarity once on canonical production domains.
 * Protected against duplicate calls from React StrictMode, HMR, or component remounts.
 */
export function initClarity(customProjectId?: string, customHost?: string): boolean {
  if (isInitialized) {
    return true;
  }

  if (!shouldEnableClarity(customHost)) {
    return false;
  }

  // Privacy-by-default: production Clarity never starts until analytics consent is explicitly granted.
  // The local debug override remains available for maintainers without polluting normal development.
  if (getClarityConsent() !== 'granted' && !hasClarityDebugOverride()) {
    return false;
  }

  const projectId = customProjectId || CLARITY_PROJECT_ID;
  if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
    return false;
  }

  try {
    Clarity.init(projectId.trim());
    isInitialized = true;
    signalClarityConsent('granted');
    return true;
  } catch (err) {
    // Best-effort: fail silently and do NOT mark initialized
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[Clarity] Initialization failed:', err);
    }
    isInitialized = false;
    return false;
  }
}

/**
 * Persists and applies the visitor's Clarity analytics-cookie preference.
 * Advertising storage is always denied; PlaylistOut only requests analytics storage.
 */
export function updateClarityConsent(consent: Exclude<ClarityConsent, null>): boolean {
  persistClarityConsent(consent);

  if (consent === 'granted') {
    if (!isInitialized) {
      return initClarity();
    }
    signalClarityConsent('granted');
    return true;
  }

  // If Clarity was already active, immediately revoke analytics/ad storage via Consent V2.
  // On subsequent page loads, initClarity() stays disabled because stored consent is denied.
  signalClarityConsent('denied');
  return true;
}

/**
 * Fires a lightweight product event to Clarity.
 * Best-effort and fails silently if Clarity is unavailable or blocked.
 */
export function trackClarityEvent(event: ClarityEvent): void {
  if (!isInitialized) return;
  if (getClarityConsent() !== 'granted' && !hasClarityDebugOverride()) return;

  try {
    if ((CLARITY_EVENTS as readonly string[]).includes(event)) {
      Clarity.event(event);
    }
  } catch {
    // Fail silently
  }
}

/**
 * Attaches a low-sensitivity dimension tag to the Clarity session.
 * Runtime-validated against strict value whitelist; any arbitrary or sensitive string is rejected.
 */
export function setClarityTag<K extends ClarityTagKey>(key: K, value: ClarityTagMap[K]): void {
  if (!isInitialized) return;
  if (getClarityConsent() !== 'granted' && !hasClarityDebugOverride()) return;

  try {
    const allowed = CLARITY_TAG_VALUE_WHITELIST[key] as readonly string[] | undefined;
    if (!allowed || typeof value !== 'string' || !allowed.includes(value)) {
      return;
    }
    Clarity.setTag(key, value);
  } catch {
    // Fail silently
  }
}

/**
 * Resets adapter internal state strictly for unit tests.
 */
export function _resetClarityForTesting(): void {
  isInitialized = false;
}
