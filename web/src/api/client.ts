import type { ApiResponse, Playlist } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.playlistout.com';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }
  return response.json();
}

/**
 * Skeleton API client method.
 * Real provider parsing will be implemented in Phase 1 (QQ Music) and beyond.
 */
export async function parsePlaylist(urlOrId: string): Promise<ApiResponse<Playlist>> {
  const response = await fetch(`${API_BASE_URL}/api/playlist?url=${encodeURIComponent(urlOrId)}`);
  return response.json();
}
