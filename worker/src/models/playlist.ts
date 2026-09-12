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

export type ProviderErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_URL'
  | 'PLAYLIST_NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'INCOMPLETE_PLAYLIST'
  | 'PARSE_ERROR';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ProviderErrorCode, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
