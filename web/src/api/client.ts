/**
 * PlaylistOut Web API Client (Unified Entrypoint)
 * ===============================================
 * Re-exports all single-responsibility API domain modules.
 * Ensures 100% backward compatibility for all components and test suites.
 */

// Base configuration
export { API_BASE_URL, REMOTE_API_BASE_URL } from './base';

// Session attestation
export { getWebSessionToken, resetSessionToken } from './session';

// Health checks
export { fetchHealth, type HealthResponse } from './health';

// Kugou Authentication & QR login
export {
  fetchKugouQrCode,
  checkKugouQrCode,
  validateKugouAuth,
  fetchKugouProfile,
  streamKugouQrStatus,
  type KugouQrSession,
  type KugouQrStatusResult,
  type KugouUserProfile,
  type KugouSessionValidationResult,
  type KugouStreamHandlers,
} from './kugouAuth';

// Playlist & User Playlists
export { parsePlaylist } from './playlist';
export { fetchUserPlaylists } from './user';

// Statistics
export {
  fetchStats,
  notifyStatsRefresh,
  notifyStatsIncrement,
  type PlatformBreakdown,
  type DailyTrendEntry,
  type StatsResponse,
  type StatsIncrementDetail,
} from './stats';

// Privacy-preserving telemetry
export {
  REFERRER_SOURCES,
  matchesDomain,
  isSelfOrigin,
  classifyHostname,
  classifyCampaignHint,
  classifyReferrerSource,
  cleanupLegacyDeviceId,
  recordVisit,
  recordExportEvent,
  recordClipboardEvent,
  submitFeedback,
  type ReferrerSource,
} from './telemetry';
