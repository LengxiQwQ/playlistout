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

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
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
  | 'PLAYLIST_NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'INCOMPLETE_PLAYLIST'
  | 'PARSE_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';

export type ProviderErrorCode = ApiErrorCode;

export class ProviderError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

