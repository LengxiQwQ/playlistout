/**
 * PlaylistOut Normalized Data Contract
 * Defined in docs/PROJECT-CONSTITUTION.md Section 6
 */

export type TrackAvailability = 'playable' | 'unplayable' | 'geo_blocked' | 'vip' | 'paid';

export interface Track {
  index: number;
  id?: string;
  title: string;
  artists: string[];
  album?: string;
  durationMs?: number;
  sourceUrl?: string;
  coverUrl?: string;
  isAvailable?: boolean;
  isVip?: boolean;
  status?: TrackAvailability;
  statusText?: string;
  isOriginalSound?: boolean;
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


export interface ApiError {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
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

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

