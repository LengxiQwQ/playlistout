import type { MusicProvider } from '../types';
import { fetchSpotifyPlaylist } from './client';
import { spotifyId } from './input';

export const spotifyProvider: MusicProvider = {
  meta: { id: 'spotify', name: 'Spotify', nameEn: 'Spotify', themeColor: '#1db954', capabilities: { playlist: true, userProfile: false, shortLink: true } },
  matches: input => { try { return ['open.spotify.com', 'spotify.link', 'spoti.fi'].includes(new URL(input).hostname); } catch { return false; } },
  extractPlaylistId: spotifyId,
  fetchPlaylist: fetchSpotifyPlaylist,
};
