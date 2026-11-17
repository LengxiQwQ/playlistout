import { playlistUrl } from '../international/http';

export function appleInput(input: string): { id: string; country: string } | null {
  try {
    const match = playlistUrl(input, 'music.apple.com').pathname.match(/^\/([a-z]{2})\/playlist\/(?:[^/]+\/)?(pl\.[A-Za-z0-9.-]+)\/?$/i);
    return match ? { id: match[2], country: match[1].toLowerCase() } : null;
  } catch { return null; }
}
