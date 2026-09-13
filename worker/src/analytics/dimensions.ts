/**
 * Analytics Dimension Classifiers
 *
 * Pure functions to classify request properties into aggregate dimension values.
 * No side effects, no data persistence, no privacy-sensitive data handling.
 */

import type { InputType, PlaylistSizeBucket, LatencyBucket, ErrorCategory } from './types';

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
  if (/i\.y\.qq\.com/i.test(trimmed) || /taoge\.html/i.test(trimmed) || /detail\/taoge/i.test(trimmed)) {
    return 'mobile_share_link';
  }

  // Standard web URLs
  if (/y\.qq\.com/i.test(trimmed)) {
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
 */
export function classifyErrorCategory(errorCode: string | undefined): ErrorCategory {
  if (!errorCode) return 'error_internal';

  switch (errorCode) {
    case 'UPSTREAM_ERROR':
    case 'UPSTREAM_TIMEOUT':
    case 'INCOMPLETE_PLAYLIST':
    case 'PLAYLIST_NOT_FOUND':
      return errorCode === 'UPSTREAM_TIMEOUT' ? 'error_timeout' : 'error_upstream';

    case 'INVALID_INPUT':
    case 'UNSUPPORTED_URL':
    case 'PARSE_ERROR':
      return 'error_validation';

    case 'RATE_LIMITED':
      return 'error_rate_limit';

    default:
      return 'error_internal';
  }
}
