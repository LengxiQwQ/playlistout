/**
 * Analytics Dimension Classifiers
 *
 * Pure functions to classify request properties into aggregate dimension values.
 * No side effects, no data persistence, no privacy-sensitive data handling.
 */

import type {
  InputType,
  PlaylistSizeBucket,
  LatencyBucket,
  ErrorCategory,
  ResolveFailureCode,
  ResolveFailureClass,
  ResolveRequestedType,
  ResolveRequestedPlatform,
  AnalyticsPlatform,
  ProviderFailurePath,
} from './types';

/**
 * Classifies the user's input into a coarse input-type category.
 * PRIVACY: The raw input URL/ID is NOT stored — only the classification.
 */
export function classifyInputType(input: string): InputType {
  if (!input) return 'other';
  const trimmed = input.trim();

  // Raw numeric playlist ID
  if (/^\d{5,18}$/.test(trimmed)) {
    return 'raw_id';
  }

  // Mobile share links
  if (
    /i\.y\.qq\.com/i.test(trimmed) ||
    /taoge\.html/i.test(trimmed) ||
    /detail\/taoge/i.test(trimmed) ||
    /163cn\.tv/i.test(trimmed) ||
    /y\.music\.163\.com/i.test(trimmed) ||
    /m\.kugou\.com/i.test(trimmed) ||
    /t\d?\.kugou\.com/i.test(trimmed) ||
    /qishui\.douyin\.com\/s\//i.test(trimmed)
  ) {
    return 'mobile_share_link';
  }

  // Standard web URLs
  if (
    /y\.qq\.com/i.test(trimmed) ||
    /music\.163\.com/i.test(trimmed) ||
    /kugou\.com/i.test(trimmed) ||
    /qishui\.douyin\.com/i.test(trimmed) ||
    /music\.douyin\.com/i.test(trimmed)
  ) {
    return 'web_url';
  }

  return 'other';
}

/**
 * Classifies a track count into a size bucket for aggregate analysis.
 */
export function classifyPlaylistSize(trackCount: number | undefined): PlaylistSizeBucket | null {
  if (trackCount === undefined || trackCount === null || trackCount < 0) return null;
  if (trackCount <= 50) return '1-50';
  if (trackCount <= 200) return '51-200';
  if (trackCount <= 500) return '201-500';
  if (trackCount <= 1000) return '501-1000';
  return '1000+';
}

/**
 * Classifies request latency (in milliseconds) into a coarse bucket.
 */
export function classifyLatency(ms: number | undefined): LatencyBucket | null {
  if (ms === undefined || ms === null || ms < 0) return null;
  if (ms < 500) return '<500ms';
  if (ms < 1000) return '500-1000ms';
  if (ms < 3000) return '1-3s';
  if (ms < 5000) return '3-5s';
  return '5s+';
}

/**
 * Classifies an error code into a stable analytics error category.
 * Maps ProviderError codes and general error patterns to fixed categories.
 *
 * NOTE (R7): PARSE_ERROR is mapped to 'error_upstream' as upstream response
 * formatting breakages belong to upstream operational errors, not user validation.
 */
export function classifyErrorCategory(errorCode: string | undefined): ErrorCategory {
  if (!errorCode) return 'error_internal';

  switch (errorCode) {
    case 'UPSTREAM_ERROR':
    case 'UPSTREAM_TIMEOUT':
    case 'INCOMPLETE_PLAYLIST':
    case 'PLAYLIST_NOT_FOUND':
    case 'PARSE_ERROR':
      return errorCode === 'UPSTREAM_TIMEOUT' ? 'error_timeout' : 'error_upstream';

    case 'INVALID_INPUT':
    case 'UNSUPPORTED_URL':
      return 'error_validation';

    case 'RATE_LIMITED':
      return 'error_rate_limit';

    default:
      return 'error_internal';
  }
}

// ── R7 Resolve Failure Telemetry Classifiers ──

/**
 * Normalizes an API error code into a bounded lowercase resolve failure token.
 * Unknown codes safely default to 'internal_error'.
 */
export function classifyResolveFailureCode(errorCode: string | undefined): ResolveFailureCode {
  if (!errorCode) return 'internal_error';
  const clean = errorCode.trim().toLowerCase();
  switch (clean) {
    case 'invalid_input':
      return 'invalid_input';
    case 'unsupported_url':
      return 'unsupported_url';
    case 'unsupported_platform':
      return 'unsupported_platform';
    case 'playlist_not_found':
      return 'playlist_not_found';
    case 'user_not_found':
      return 'user_not_found';
    case 'upstream_error':
      return 'upstream_error';
    case 'upstream_timeout':
      return 'upstream_timeout';
    case 'incomplete_playlist':
      return 'incomplete_playlist';
    case 'parse_error':
      return 'parse_error';
    case 'forbidden':
      return 'forbidden';
    case 'rate_limited':
      return 'rate_limited';
    case 'ambiguous_input':
      return 'ambiguous_input';
    case 'internal_error':
      return 'internal_error';
    default:
      return 'internal_error';
  }
}

/**
 * Classifies a resolve failure code into a high-level stable failure class.
 */
export function classifyResolveFailureClass(
  codeOrClass: ResolveFailureCode | string | undefined,
): ResolveFailureClass {
  const code = classifyResolveFailureCode(codeOrClass);
  switch (code) {
    case 'invalid_input':
    case 'unsupported_url':
    case 'unsupported_platform':
      return 'input';
    case 'playlist_not_found':
    case 'user_not_found':
      return 'not_found';
    case 'ambiguous_input':
      return 'ambiguous';
    case 'forbidden':
      return 'auth';
    case 'upstream_error':
      return 'upstream';
    case 'upstream_timeout':
      return 'timeout';
    case 'incomplete_playlist':
      return 'incomplete';
    case 'parse_error':
      return 'parse';
    case 'rate_limited':
      return 'upstream';
    case 'internal_error':
    default:
      return 'internal';
  }
}

/**
 * Normalizes user-specified 'type' parameter into bounded enum.
 * Invalid values normalize to 'unknown' rather than leaking.
 */
export function classifyResolveRequestedType(
  rawType: string | null | undefined,
): ResolveRequestedType {
  if (!rawType) return 'auto';
  const clean = rawType.trim().toLowerCase();
  if (clean === 'playlist') return 'playlist';
  if (clean === 'user' || clean === 'user_playlists') return 'user';
  if (clean === 'auto') return 'auto';
  return 'unknown';
}

/**
 * Normalizes user-specified 'platform' parameter into bounded enum.
 * Invalid values normalize to 'unknown' rather than leaking.
 */
export function classifyResolveRequestedPlatform(
  rawPlatform: string | null | undefined,
): ResolveRequestedPlatform {
  if (!rawPlatform) return 'auto';
  const clean = rawPlatform.trim().toLowerCase();
  if (
    clean === 'auto' ||
    clean === 'qqmusic' ||
    clean === 'netease' ||
    clean === 'kugou' ||
    clean === 'qishui'
  ) {
    return clean;
  }
  return 'unknown';
}

/**
 * Normalizes internal analytics platform into bounded enum.
 */
export function classifyAnalyticsPlatform(
  platform: string | null | undefined,
): AnalyticsPlatform {
  if (!platform) return 'unknown';
  const clean = platform.trim().toLowerCase();
  if (clean === 'qqmusic' || clean === 'netease' || clean === 'kugou' || clean === 'qishui') {
    return clean;
  }
  return 'unknown';
}

/**
 * Normalizes provider failure path metadata into bounded enum.
 */
export function classifyProviderFailurePath(
  path: string | undefined,
): ProviderFailurePath {
  if (!path) return 'not_applicable';
  const clean = path.trim().toLowerCase();
  if (clean === 'primary' || clean === 'fallback' || clean === 'both' || clean === 'not_applicable') {
    return clean as ProviderFailurePath;
  }
  return 'unknown';
}
