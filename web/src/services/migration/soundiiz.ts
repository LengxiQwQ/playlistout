import type { Playlist } from '../../api/types';
import { API_BASE_URL, REMOTE_API_BASE_URL } from '../../api/client';

export const SOUNDIIZ_MAX_TRACKS = 200;

export type SoundiizDestination =
  | 'spotify'
  | 'apple'
  | 'youtube'
  | 'deezer'
  | 'tidal'
  | null;

export interface SoundiizMigrationResult {
  shareUrl: string;
  nbTracks: number;
  expiresAt?: number;
}

interface MigrationApiResponse {
  success: boolean;
  data?: SoundiizMigrationResult;
  error?: {
    code?: string;
    message?: string;
  };
}

function getTrackIsrc(rawIds?: Record<string, string | number>): string | undefined {
  if (!rawIds) return undefined;
  for (const [key, value] of Object.entries(rawIds)) {
    if (key.toLowerCase() === 'isrc' && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export function buildSoundiizMigrationPayload(
  playlist: Playlist,
  destination: SoundiizDestination,
) {
  const isPartial = playlist.tracks.length < playlist.trackCount;

  return {
    title: playlist.name,
    description: isPartial
      ? `Playlist Out parsed ${playlist.tracks.length} of ${playlist.trackCount} tracks from ${playlist.platform}.`
      : `Transferred from ${playlist.platform} with Playlist Out.`,
    destination: destination || undefined,
    sourcePlatform: playlist.platform,
    trackCount: playlist.trackCount,
    loadedTrackCount: playlist.tracks.length,
    isPartial,
    tracks: playlist.tracks.map((track) => ({
      title: track.title,
      artists: track.artists,
      album: track.album || undefined,
      isrc: getTrackIsrc(track.rawIds),
    })),
  };
}

function validateSoundiizShareUrl(value: string): string {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  const isSoundiizHost = hostname === 'soundiiz.com' || hostname.endsWith('.soundiiz.com');

  if (
    url.protocol !== 'https:' ||
    !isSoundiizHost ||
    !url.pathname.startsWith('/go/import-playlist/')
  ) {
    throw new Error('INVALID_MIGRATION_URL');
  }

  return url.toString();
}

async function requestMigration(
  endpointBase: string,
  playlist: Playlist,
  destination: SoundiizDestination,
): Promise<SoundiizMigrationResult> {
  const response = await fetch(`${endpointBase}/api/migrate/soundiiz`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildSoundiizMigrationPayload(playlist, destination)),
  });

  let body: MigrationApiResponse | null = null;
  try {
    body = (await response.json()) as MigrationApiResponse;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success || !body.data?.shareUrl) {
    throw new Error(body?.error?.message || `Migration request failed (${response.status})`);
  }

  return {
    ...body.data,
    shareUrl: validateSoundiizShareUrl(body.data.shareUrl),
  };
}

export async function createSoundiizMigration(
  playlist: Playlist,
  destination: SoundiizDestination,
): Promise<SoundiizMigrationResult> {
  if (playlist.tracks.length < 1) {
    throw new Error('EMPTY_PLAYLIST');
  }
  if (playlist.tracks.length > SOUNDIIZ_MAX_TRACKS) {
    throw new Error('TRACK_LIMIT_EXCEEDED');
  }

  const primaryBase = API_BASE_URL || '';

  try {
    return await requestMigration(primaryBase, playlist, destination);
  } catch (error) {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL && primaryBase !== REMOTE_API_BASE_URL) {
      return requestMigration(REMOTE_API_BASE_URL, playlist, destination);
    }
    throw error;
  }
}
