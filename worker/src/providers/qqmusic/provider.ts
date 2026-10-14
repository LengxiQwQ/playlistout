import type { MusicProvider, Provider } from '../types';
import { type Playlist, type UserPlaylistsData, ProviderError } from '../../models/playlist';
import {
  matchesQQMusicInput,
  isQQShortLink,
  extractQQPlaylistId,
  extractQQPlaylistIdAsync,
} from './input';
import { fetchQQPlaylist } from './client';
import { fetchQQUserPlaylists, extractQQNumberAsync } from './user';

export function isQQProfile(input: string): boolean {
  const isQQPlaylistCandidate =
    /(?:playlist|taoge|playsquare)/i.test(input) ||
    /[?&](?:id|disstid|dissid|tid)=\d+/i.test(input);

  return (
    /(?:y\.qq\.com|music\.qq\.com)/i.test(input) &&
    (/(?:portal\/profile|\/profile)/i.test(input) ||
      (/(?:[?&]uin=|[?&]hostuin=)/i.test(input) && !isQQPlaylistCandidate))
  );
}

export type DualQQMusicProvider = MusicProvider & Provider;

export const qqMusicProvider: DualQQMusicProvider = {
  name: 'qqmusic',

  meta: {
    id: 'qqmusic',
    name: 'QQ 音乐',
    nameEn: 'QQ Music',
    themeColor: '#31c27c',
    capabilities: {
      playlist: true,
      userProfile: true,
      numericId: true,
      shortLink: true,
    },
  },

  matches(input: string): boolean {
    return matchesQQMusicInput(input);
  },

  isShortLink(input: string): boolean {
    return isQQShortLink(input);
  },

  isUserProfileUrl(input: string): boolean {
    return isQQProfile(input);
  },

  extractId(input: string): string | null {
    try {
      return extractQQPlaylistId(input);
    } catch {
      return null;
    }
  },

  extractPlaylistId(input: string): string | null {
    try {
      return extractQQPlaylistId(input);
    } catch {
      return null;
    }
  },

  extractUserId(input: string): string | null {
    const match = input.match(/[?&](?:uin|hostuin)=(\d+)/);
    return match ? match[1] : null;
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = await extractQQPlaylistIdAsync(inputOrId);
    return fetchQQPlaylist(playlistId);
  },

  async fetchPlaylist(inputOrId: string): Promise<Playlist> {
    return this.parse(inputOrId);
  },

  async fetchUserPlaylists(inputOrUserId: string): Promise<UserPlaylistsData> {
    const uin = await extractQQNumberAsync(inputOrUserId);
    if (!uin) {
      throw new ProviderError(
        'INVALID_INPUT',
        `The provided input is not a valid QQ number or profile URL: "${inputOrUserId}"`,
        400,
      );
    }
    return fetchQQUserPlaylists(uin);
  },

  async probeAsPlaylist(id: string): Promise<Playlist> {
    return this.parse(id);
  },

  async probeAsUser(id: string): Promise<UserPlaylistsData> {
    return this.fetchUserPlaylists!(id);
  },
};
