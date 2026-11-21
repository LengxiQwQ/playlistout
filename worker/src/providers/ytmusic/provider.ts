import type { MusicProvider } from '../types';
import { fetchYoutubeMusicPlaylist } from './client';
import { ytmusicId } from './input';

export const ytmusicProvider: MusicProvider = {
  meta: {
    id: 'ytmusic',
    name: 'YouTube Music',
    nameEn: 'YouTube Music',
    themeColor: '#ff0000',
    capabilities: {
      playlist: true,
      userProfile: false,
      shortLink: true,
    },
  },
  matches: (input: string) => ytmusicId(input) !== null,
  extractPlaylistId: ytmusicId,
  fetchPlaylist: fetchYoutubeMusicPlaylist,
};
