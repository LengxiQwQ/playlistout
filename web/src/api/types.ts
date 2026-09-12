/**
 * PlaylistOut Normalized Data Contract
 * Defined in docs/PROJECT-CONSTITUTION.md Section 6
 */

export interface Track {
  index: number;
  id?: string;
  title: string;
  artists: string[];
  album?: string;
  durationMs?: number;
  sourceUrl?: string;
}

export interface Playlist {
  platform: string;
  id: string;
  name: string;
  creator?: string;
  coverUrl?: string;
  trackCount: number;
  tracks: Track[];
}

export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_URL'
  | 'PLAYLIST_NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'INCOMPLETE_PLAYLIST'
  | 'PARSE_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';


export interface ApiError {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
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

