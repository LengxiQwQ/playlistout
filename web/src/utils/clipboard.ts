import type { Playlist } from '../api/types';
import { formatArtists, cleanSingleLine } from './export';

export type ClipboardMode = 'title' | 'title-artist' | 'title-artist-album';

/**
 * Formats playlist tracks for clipboard copying according to specified mode.
 */
export function formatTracksForClipboard(playlist: Playlist, mode: ClipboardMode): string {
  const lines: string[] = [];

  for (const track of playlist.tracks) {
    const title = cleanSingleLine(track.title || '');
    const artists = cleanSingleLine(formatArtists(track.artists));
    const album = cleanSingleLine(track.album || '');

    switch (mode) {
      case 'title':
        lines.push(title);
        break;
      case 'title-artist':
        lines.push(artists ? `${title} - ${artists}` : title);
        break;
      case 'title-artist-album':
        if (album && artists) {
          lines.push(`${title} - ${artists} - ${album}`);
        } else if (artists) {
          lines.push(`${title} - ${artists}`);
        } else {
          lines.push(title);
        }
        break;
    }
  }

  return lines.join('\n');
}


/**
 * Copies formatted playlist content to clipboard.
 * Uses navigator.clipboard with fallback for older environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback using textarea execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
