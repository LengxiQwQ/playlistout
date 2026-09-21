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

export const CLARITY_EVENTS = [
  'playlist_parse_success',
  'playlist_parse_failure',
  'playlist_export',
  'clipboard_copy',
] as const;
export type ClarityEvent = (typeof CLARITY_EVENTS)[number];

export const CLARITY_TAG_KEYS = [
  'platform',
  'export_format',
  'clipboard_mode',
  'playlist_size_bucket',
  'language',
] as const;
export type ClarityTagKey = (typeof CLARITY_TAG_KEYS)[number];

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

/**
 * Evaluates whether Clarity should run in the current runtime environment.
 * Default:
 * - Disabled in server/headless environments
 * - Disabled in test environments
 * - Disabled in localhost/dev environments (unless explicitly overridden via localStorage)
 * - Enabled in production browser environments
 */
export function shouldEnableClarity(): boolean {
  if (typeof window === 'undefined') return false;

  // Allow explicit debug override in dev or test environments
  try {
    if (window.localStorage?.getItem('playlistout_clarity_debug') === 'true') {
      return true;
    }
  } catch {
    // ignore
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    return false;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return false;
  }

  return true;
}

/**
 * Initializes Microsoft Clarity once on canonical production domains.
 * Protected against duplicate calls from React StrictMode, HMR, or component remounts.
 */
export function initClarity(customProjectId?: string): boolean {
  if (isInitialized) {
    return true;
  }

  if (!shouldEnableClarity()) {
    return false;
  }

  const projectId = customProjectId || CLARITY_PROJECT_ID;
  if (!projectId || typeof projectId !== 'string' || projectId.trim().length === 0) {
    return false;
  }

  try {
    Clarity.init(projectId.trim());
    isInitialized = true;
    return true;
  } catch (err) {
    // Best-effort: fail silently
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[Clarity] Initialization failed:', err);
    }
    return false;
  }
}

/**
 * Fires a lightweight product event to Clarity.
 * Best-effort and fails silently if Clarity is unavailable or blocked.
 */
export function trackClarityEvent(event: ClarityEvent): void {
  if (!isInitialized) return;

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
 * Best-effort and fails silently if Clarity is unavailable or blocked.
 */
export function setClarityTag(key: ClarityTagKey, value: string | string[]): void {
  if (!isInitialized) return;

  try {
    if ((CLARITY_TAG_KEYS as readonly string[]).includes(key)) {
      Clarity.setTag(key, value);
    }
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
