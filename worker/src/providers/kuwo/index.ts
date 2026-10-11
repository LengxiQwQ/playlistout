import type { Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractKuwoPlaylistId, matchesKuwoInput } from './input';
import { fetchKuwoPlaylist } from './client';

/**
 * Kuwo Music (酷我音乐) Provider Implementation
 */
export const kuwoProvider: Provider = {
  name: 'kuwo',

  matches(input: string): boolean {
    return matchesKuwoInput(input);
  },

  extractId(input: string): string | null {
    try {
      return extractKuwoPlaylistId(input);
    } catch {
      return null;
    }
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = extractKuwoPlaylistId(inputOrId);
    return fetchKuwoPlaylist(playlistId);
  },
};

export * from './input';
export * from './client';
export * from './normalize';
export * from './types';
