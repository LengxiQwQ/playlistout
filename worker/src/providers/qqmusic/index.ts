import type { Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractQQPlaylistId, matchesQQMusicInput } from './input';
import { fetchQQPlaylist } from './client';

/**
 * QQ Music Provider Implementation (Phase 1)
 */
export const qqMusicProvider: Provider = {
  name: 'qqmusic',

  matches(input: string): boolean {
    return matchesQQMusicInput(input);
  },

  extractId(input: string): string | null {
    try {
      return extractQQPlaylistId(input);
    } catch {
      return null;
    }
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = extractQQPlaylistId(inputOrId);
    return fetchQQPlaylist(playlistId);
  },
};

export * from './input';
export * from './client';
export * from './normalize';
