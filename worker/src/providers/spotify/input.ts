import { playlistUrl } from '../international/http';

export function spotifyId(input: string): string | null {
  try { return playlistUrl(input, 'open.spotify.com').pathname.match(/^\/(?:intl-[A-Za-z-]+\/)?playlist\/([A-Za-z0-9]{22})\/?$/)?.[1] || null; }
  catch { return null; }
}
