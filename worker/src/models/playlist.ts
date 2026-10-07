/**
 * PlaylistOut Normalized Data Contract
 * Defined in docs/PROJECT-CONSTITUTION.md Section 6
 */

import type { DeviceClass, ResolveFailureStage } from '../analytics/types';

export type TrackAvailability = 'playable' | 'unplayable' | 'geo_blocked' | 'vip' | 'paid';

export interface Track {
  index: number;
  title: string;
  artist: string;
  album?: string;
  id?: string;
  isrc?: string;
  durationMs?: number;
  releaseDate?: string;
  trackNumber?: number;
  discNumber?: number;
  sourceUrl?: string;
  playbackUrl?: string;
  coverUrl?: string;
  isOriginalSound?: boolean;
  isVip?: boolean;
  isAvailable?: boolean;
  status?: TrackAvailability;
  statusText?: string;
  maxQuality?: string;
  mvId?: string;
  mvUrl?: string;
}

export type PlaylistRetrievalMode = 'full' | 'preview';

export type PlaylistRetrievalReason =
  | 'auth_required'
  | 'auth_invalid'
  | 'owner_unconfirmed'
  | 'owner_mismatch'
  | 'identity_unresolved'
  | 'upstream_unavailable'
  | 'platform_preview';

export interface PlaylistRetrievalInfo {
  mode: PlaylistRetrievalMode;
  reason?: PlaylistRetrievalReason;
  message?: string;
}

export type PlaylistChannel = 'qishui' | 'douyin';

export interface Playlist {
  platform: string;
  id: string;
  name: string;
  creator?: string;
  coverUrl?: string;
  trackCount: number;
  tracks: Track[];
  // Enriched metadata fields
  createTime?: number;
  updateTime?: number;
  description?: string;
  tags?: string[];
  playCount?: number;
  sourceUrl?: string;
  retrieval?: PlaylistRetrievalInfo;
  channel?: PlaylistChannel;
  availableChannels?: PlaylistChannel[];
}

export interface UserPlaylistSummary {
  id: string;
  name: string;
  coverUrl?: string;
  trackCount: number;
  listenNum?: number;
  sourceUrl: string;
}

export interface UserPlaylistsData {
  platform: string;
  userId: string;
  nickname: string;
  total: number;
  playlists: UserPlaylistSummary[];
}

export interface ResponseClientMetadata {
  channel: string;
  id: string;
  version: string | null;
  deviceClass: DeviceClass;
  osFamily: string;
  rawHost: string | null;
}

export interface ResponseParseInfo {
  resolvedPlatform: string;
  trackCount?: number;
  mode?: string;
  timestamp: number;
}

export interface ResponseMetadata {
  server: {
    service: string;
    version: string;
  };
  client: ResponseClientMetadata;
  parseInfo?: ResponseParseInfo;
  hints?: string[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ResponseMetadata;
}

export type ResolveKind = 'playlist' | 'user_playlists';

export interface DisambiguationCandidate {
  id: string;
  kind: ResolveKind;
  platform: string;
  title: string;
  subtitle?: string;
  trackCount?: number;
  coverUrl?: string;
}

export interface ResolveData<T = Playlist | UserPlaylistsData> {
  kind: ResolveKind;
  platform: string;
  result: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'PLAYLIST_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'INCOMPLETE_PLAYLIST'
  | 'PARSE_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'AMBIGUOUS_INPUT';


export type ProviderErrorCode = ApiErrorCode;

export interface ProviderErrorTelemetry {
  providerFailurePath?: 'primary' | 'fallback' | 'both' | 'not_applicable' | 'unknown';
  stage?: ResolveFailureStage | string;
  platform?: string;
}

export class ProviderError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;
  /** Internal telemetry metadata for server-side observability only; never included in API JSON */
  telemetry?: ProviderErrorTelemetry;

  constructor(code: ApiErrorCode, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

