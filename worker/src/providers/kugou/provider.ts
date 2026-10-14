import type { MusicProvider, Provider, AuthCredentials } from '../types';
import type { Playlist, UserPlaylistsData } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import { matchesKugouInput, extractKugouTarget } from './input';
import { fetchKugouPlaylist, fetchKugouUserPlaylists, type KugouAuthCredentials } from './client';

export function isKugouProfile(input: string): boolean {
  return (
    /kugou\.com/i.test(input) &&
    !/(?:songlist|gcid_|special\/single)/i.test(input) &&
    (/\/user/i.test(input) || /\/profile/i.test(input) || /\/home/i.test(input) || /[?&]uid=\d+/i.test(input))
  );
}

export type DualKugouProvider = MusicProvider & Provider & {
  parse(inputOrId: string, auth?: KugouAuthCredentials): Promise<Playlist>;
};
export type KugouProvider = DualKugouProvider;

export const kugouProvider: DualKugouProvider = {
  name: 'kugou',

  meta: {
    id: 'kugou',
    name: '酷狗音乐',
    nameEn: 'KuGou Music',
    themeColor: '#2563eb',
    capabilities: {
      playlist: true,
      userProfile: true,
      userProfileRequiresAuth: true,
      numericId: true,
      shortLink: true,
    },
  },

  matches(input: string): boolean {
    return matchesKugouInput(input);
  },

  isShortLink(input: string): boolean {
    return /t\d?\.kugou\.com/i.test(input);
  },

  isUserProfileUrl(input: string): boolean {
    return isKugouProfile(input);
  },

  extractId(input: string): string | null {
    const trimmed = input.trim();
    const collectionMatch =
      trimmed.match(/[?&]global_specialid=(collection_\d+_\d+_\d+_\d+)/i) ||
      trimmed.match(/\b(collection_\d+_\d+_\d+_\d+)\b/i);
    if (collectionMatch) return collectionMatch[1];
    const gcidMatch = trimmed.match(/(?:songlist\/|src_cid=)?(gcid_[a-zA-Z0-9]+)/i);
    if (gcidMatch) return gcidMatch[1];
    const specialMatch = trimmed.match(/special\/single\/(\d+)/i);
    if (specialMatch) return specialMatch[1];
    const cloudlistMatch =
      trimmed.match(/(?:listid=|kugou_cloudlist_)(\d+)/i) ||
      trimmed.match(/songlist\/(\d+)\/?(?:[?#]|$)/i);
    if (cloudlistMatch) return cloudlistMatch[1];
    if (/^gcid_[a-zA-Z0-9]+$/i.test(trimmed)) return trimmed;
    if (/^\d{1,12}$/.test(trimmed)) return trimmed;
    return null;
  },

  extractPlaylistId(input: string): string | null {
    return this.extractId(input);
  },

  extractUserId(input: string): string | null {
    const m = input.match(/[?&](?:uid|userid)=(\d+)/i);
    return m ? m[1] : null;
  },

  async parse(inputOrId: string, auth?: KugouAuthCredentials): Promise<Playlist> {
    const target = await extractKugouTarget(inputOrId);
    if (!target) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Could not extract a valid Kugou songlist ID or link from the provided input.',
        400,
      );
    }
    return fetchKugouPlaylist(target, auth);
  },

  async fetchPlaylist(inputOrId: string, options?: KugouAuthCredentials): Promise<Playlist> {
    return this.parse(inputOrId, options);
  },

  async fetchUserPlaylists(_inputOrUserId: string, auth?: AuthCredentials): Promise<UserPlaylistsData> {
    if (!auth?.token || !auth?.userid) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Kugou user playlists require both token and userid passed via Authorization / X-Kugou-* headers from QR login.',
        400,
        { authRequired: true, platform: 'kugou' },
      );
    }
    return fetchKugouUserPlaylists(auth.token, auth.userid);
  },

  async probeAsPlaylist(id: string, options?: KugouAuthCredentials): Promise<Playlist> {
    return this.parse(id, options);
  },

  async probeAsUser(id: string, auth?: AuthCredentials): Promise<UserPlaylistsData> {
    return this.fetchUserPlaylists!(id, auth);
  },
};
