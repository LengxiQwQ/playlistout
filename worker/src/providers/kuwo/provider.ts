import type { MusicProvider, Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractKuwoPlaylistId, matchesKuwoInput } from './input';
import { fetchKuwoPlaylist } from './client';

export type DualKuwoProvider = MusicProvider & Provider;

export const kuwoProvider: DualKuwoProvider = {
  name: 'kuwo',

  meta: {
    id: 'kuwo',
    name: '酷我音乐',
    nameEn: 'Kuwo Music',
    themeColor: '#ca8a04',
    capabilities: {
      playlist: true,
      userProfile: false,
      numericId: true,
      shortLink: false,
    },
  },

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

  extractPlaylistId(input: string): string | null {
    return this.extractId(input);
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = extractKuwoPlaylistId(inputOrId);
    return fetchKuwoPlaylist(playlistId);
  },

  async fetchPlaylist(inputOrId: string): Promise<Playlist> {
    return this.parse(inputOrId);
  },

  async probeAsPlaylist(id: string): Promise<Playlist> {
    return this.parse(id);
  },
};
