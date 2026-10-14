import type { MusicProvider, Provider } from '../types';
import type { Playlist, UserPlaylistsData } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import { extractNeteasePlaylistId, matchesNeteaseInput, extractNeteaseUserId } from './input';
import { fetchNeteasePlaylist } from './client';
import { fetchNeteaseUserPlaylists } from './user';

export function isNeteaseProfile(input: string): boolean {
  const isNeteasePlaylistCandidate = /(?:playlist|songlist)/i.test(input);
  return (
    /(?:music\.163\.com|y\.music\.163\.com)/i.test(input) &&
    !isNeteasePlaylistCandidate &&
    (/(?:\/user\/|\/m\/user|\/user\?)/i.test(input) || (/\/user(?:\/home)?\?.*[?&]id=\d+/i.test(input)))
  );
}

export type DualNeteaseProvider = MusicProvider & Provider;

export const neteaseProvider: DualNeteaseProvider = {
  name: 'netease',

  meta: {
    id: 'netease',
    name: '网易云音乐',
    nameEn: 'NetEase Cloud Music',
    themeColor: '#e11d48',
    capabilities: {
      playlist: true,
      userProfile: true,
      numericId: true,
      shortLink: true,
    },
  },

  matches(input: string): boolean {
    return matchesNeteaseInput(input);
  },

  isShortLink(input: string): boolean {
    return /163cn\.tv/i.test(input);
  },

  isUserProfileUrl(input: string): boolean {
    return isNeteaseProfile(input);
  },

  extractId(input: string): string | null {
    const directMatch = input.match(/(?:[?&]id=|\/playlist\/|\/playlist\?id=)(\d{4,18})/i);
    if (directMatch) return directMatch[1];
    if (/^\d{4,18}$/.test(input.trim())) return input.trim();
    return null;
  },

  extractPlaylistId(input: string): string | null {
    return this.extractId(input);
  },

  extractUserId(input: string): string | null {
    const match = input.match(/[?&]id=(\d+)/i) || input.match(/\/user\/(?:home\/)?(\d+)/i);
    return match ? match[1] : null;
  },

  async parse(inputOrId: string): Promise<Playlist> {
    const playlistId = await extractNeteasePlaylistId(inputOrId);
    return fetchNeteasePlaylist(playlistId);
  },

  async fetchPlaylist(inputOrId: string): Promise<Playlist> {
    return this.parse(inputOrId);
  },

  async fetchUserPlaylists(inputOrUserId: string): Promise<UserPlaylistsData> {
    const uid = await extractNeteaseUserId(inputOrUserId);
    if (!uid) {
      throw new ProviderError(
        'INVALID_INPUT',
        `The provided input is not a valid NetEase user ID or profile URL: "${inputOrUserId}"`,
        400,
      );
    }
    return fetchNeteaseUserPlaylists(uid);
  },

  async probeAsPlaylist(id: string): Promise<Playlist> {
    return this.parse(id);
  },

  async probeAsUser(id: string): Promise<UserPlaylistsData> {
    return this.fetchUserPlaylists!(id);
  },
};
