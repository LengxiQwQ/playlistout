import type { Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractQishuiPlaylistId, matchesQishuiInput } from './input';
import { fetchQishuiPlaylist } from './client';

/**
 * Soda Music (汽水音乐) Provider Implementation
 */
export const qishuiProvider: Provider = {
  name: 'qishui',

  matches(input: string): boolean {
    return matchesQishuiInput(input);
  },

  extractId(input: string): string | null {
    const directMatch = input.match(/(?:[?&]playlist_id=|\/playlist\/)(\d{4,20})/i);
    if (directMatch) return directMatch[1];
    if (/^\d{4,20}$/.test(input.trim())) return input.trim();
    return null;
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = await extractQishuiPlaylistId(inputOrId);
    return fetchQishuiPlaylist(playlistId);
  },
};

export * from './input';
export * from './client';
export * from './normalize';
