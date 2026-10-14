import type { MusicProvider, Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { extractQishuiPlaylistId, matchesQishuiInput } from './input';
import { fetchQishuiPlaylist } from './client';

export type DualQishuiProvider = MusicProvider & Provider & {
  parse(inputOrId: string, options?: { channel?: 'qishui' | 'douyin' }): Promise<Playlist>;
};

export const qishuiProvider: DualQishuiProvider = {
  name: 'qishui',

  meta: {
    id: 'qishui',
    name: '汽水音乐',
    nameEn: 'Soda Music',
    themeColor: '#65a30d',
    capabilities: {
      playlist: true,
      userProfile: false,
      numericId: true,
      shortLink: true,
    },
  },

  matches(input: string): boolean {
    return matchesQishuiInput(input);
  },

  isShortLink(input: string): boolean {
    return /(?:qishui\.douyin\.com|(?:[a-zA-Z0-9-]+\.)*qishui\.com)\/s\//i.test(input);
  },

  extractId(input: string): string | null {
    const directMatch = input.match(/(?:[?&](?:playlist_id|playlistId|id)=|\/(?:share\/)?playlist\/)(\d{4,20})/i);
    if (directMatch) return directMatch[1];
    if (/^\d{4,20}$/.test(input.trim())) return input.trim();
    const anyIdMatch = input.match(/\b\d{16,20}\b/);
    if (anyIdMatch) return anyIdMatch[0];
    return null;
  },

  extractPlaylistId(input: string): string | null {
    return this.extractId(input);
  },

  async parse(inputOrId: string, options?: { channel?: 'qishui' | 'douyin' }): Promise<Playlist> {
    const playlistId = await extractQishuiPlaylistId(inputOrId);
    const channel = options?.channel === 'douyin' ? 'douyin' : 'qishui';
    return fetchQishuiPlaylist(playlistId, { ...options, channel });
  },

  async fetchPlaylist(inputOrId: string, options?: { channel?: 'qishui' | 'douyin' }): Promise<Playlist> {
    const channel = options?.channel === 'douyin' ? 'douyin' : 'qishui';
    return this.parse(inputOrId, { ...options, channel });
  },

  async probeAsPlaylist(id: string, options?: { channel?: 'qishui' | 'douyin' }): Promise<Playlist> {
    return this.parse(id, options);
  },
};
