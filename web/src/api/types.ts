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

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
