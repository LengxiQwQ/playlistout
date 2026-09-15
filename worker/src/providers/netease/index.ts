import type { Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractNeteasePlaylistId, matchesNeteaseInput } from './input';
import { fetchNeteasePlaylist } from './client';

/**
 * NetEase Cloud Music Provider Implementation
 */
export const neteaseProvider: Provider = {
  name: 'netease',

  matches(input: string): boolean {
    return matchesNeteaseInput(input);
  },

  extractId(input: string): string | null {
    // Note: for async short link resolution, caller should use extractNeteasePlaylistId directly
    const directMatch = input.match(/(?:[?&]id=|\/playlist\/|\/playlist\?id=)(\d{4,18})/i);
    if (directMatch) return directMatch[1];
    if (/^\d{4,18}$/.test(input.trim())) return input.trim();
    return null;
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = await extractNeteasePlaylistId(inputOrId);
    return fetchNeteasePlaylist(playlistId);
  },
};

export * from './input';
export * from './client';
export * from './normalize';
export * from './user';
