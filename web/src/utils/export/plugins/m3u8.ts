import type { Playlist } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import {
  cleanSingleLine,
  formatArtists,
  sanitizeFilename,
} from '../helpers';

/**
 * Generates standard Extended M3U8 playlist content.
 * Universally compatible with Navidrome, Jellyfin, Foobar2000, VLC,
 * Salt Player (椒盐音乐), Poweramp, AIMP, etc.
 */
export function generateM3U8(playlist: Playlist): string {
  const lines: string[] = ['#EXTM3U'];

  if (playlist.name) {
    lines.push(`#PLAYLIST:${cleanSingleLine(playlist.name)}`);
  }

  for (const track of playlist.tracks) {
    const durationSec =
      track.durationMs && track.durationMs > 0
        ? Math.round(track.durationMs / 1000)
        : -1;

    const artistStr = cleanSingleLine(formatArtists(track.artist));
    const titleStr = cleanSingleLine(track.title || '');
    const displayName = artistStr ? `${artistStr} - ${titleStr}` : titleStr;

    lines.push(`#EXTINF:${durationSec},${displayName}`);
    const filename = sanitizeFilename(displayName, 'track');
    lines.push(`${filename}.mp3`);
  }

  return lines.join('\n') + '\n';
}

export const m3u8ExportPlugin: ExportPlugin = {
  id: 'm3u8',
  name: '播放列表 (M3U8)',
  fileExtension: 'm3u8',
  mimeType: 'application/x-mpegurl;charset=utf-8',
  description: 'Extended M3U8 格式，兼容各类本地音乐播放器及流媒体服务',
  export(ctx: ExportContext): ExportResult {
    const baseName = sanitizeFilename(
      `${ctx.playlist.name || 'playlist'}${ctx.playlist.creator ? ' - ' + ctx.playlist.creator : ''}`,
    );
    const content = generateM3U8(ctx.playlist);
    return {
      filename: `${baseName}.m3u8`,
      content,
      mimeType: this.mimeType,
    };
  },
};
