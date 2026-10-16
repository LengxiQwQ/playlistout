import type { MusicProvider, Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractMiguPlaylistId, matchesMiguInput } from './input';
import { fetchMiguPlaylist } from './client';

export type DualMiguProvider = MusicProvider & Provider;

export const miguProvider: DualMiguProvider = {
  name: 'migu',

  meta: {
    id: 'migu',
    name: '咪咕音乐',
    nameEn: 'Migu Music',
    themeColor: '#ec4899',
    capabilities: {
      playlist: true,
      userProfile: false,
      numericId: true,
      shortLink: true,
    },
  },

  matches(input: string): boolean {
    return matchesMiguInput(input);
  },

  isShortLink(input: string): boolean {
    return /(?:^|[^a-zA-Z0-9])c\.migu\.cn/i.test(input);
  },

  extractId(input: string): string | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (/^\d{4,20}$/.test(trimmed)) return trimmed;
    const directMatch = trimmed.match(/(?:[?&](?:id|playlistId|playlist_id|musicListId)=|\/playlist\/)(\d{4,20})/i);
    if (directMatch) return directMatch[1];
    return null;
  },

  extractPlaylistId(input: string): string | null {
    return this.extractId(input);
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = await extractMiguPlaylistId(inputOrId);
    return fetchMiguPlaylist(playlistId);
  },

  async fetchPlaylist(inputOrId: string): Promise<Playlist> {
    return this.parse(inputOrId);
  },

  async probeAsPlaylist(id: string): Promise<Playlist> {
    return this.parse(id);
  },
};
