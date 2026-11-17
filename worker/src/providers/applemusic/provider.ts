import type { MusicProvider } from '../types';
import { fetchApplePlaylist } from './client';
import { appleInput } from './input';

export const appleMusicProvider: MusicProvider = {
  meta: { id: 'applemusic', name: 'Apple Music', nameEn: 'Apple Music', themeColor: '#fa243c', capabilities: { playlist: true, userProfile: false, shortLink: true } },
  matches: input => { try { return ['music.apple.com', 'geo.music.apple.com'].includes(new URL(input).hostname); } catch { return false; } },
  extractPlaylistId: input => appleInput(input)?.id || null,
  fetchPlaylist: fetchApplePlaylist,
};
