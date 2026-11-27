import type { Playlist, Track } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import {
  buildPlaylistStem,
  cleanSingleLine,
  formatArtists,
  sanitizeFilename,
} from '../helpers';

/**
 * Maps PlaylistOut platform identifier to LX Music platform source code:
 * - tx: QQ 音乐 (qqmusic)
 * - wy: 网易云音乐 (netease)
 * - kg: 酷狗音乐 (kugou)
 * - kw: 酷我音乐 (kuwo)
 * - mg: 咪咕音乐 (migu)
 */
export function mapPlatformToLxSource(platform?: string): string {
  switch (platform?.toLowerCase()) {
    case 'qqmusic':
    case 'qq':
      return 'tx';
    case 'netease':
    case '163':
      return 'wy';
    case 'kugou':
      return 'kg';
    case 'kuwo':
      return 'kw';
    case 'migu':
      return 'mg';
    default:
      return 'tx';
  }
}

/**
 * Formats duration in milliseconds to MM:SS string required by LX Music.
 */
export function formatLxInterval(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export interface LxMusicItem {
  name: string;
  singer: string;
  source: string;
  songmid: string;
  interval: string;
  albumName: string;
  img?: string;
  types: unknown[];
  _types: Record<string, unknown>;
}

export interface LxPlayListObject {
  id: string;
  name: string;
  list: LxMusicItem[];
}

export interface LxExportPayload {
  type: 'playListPart';
  version: 1;
  data: LxPlayListObject;
}

/**
 * Converts a PlaylistOut Playlist into LX Music's single-list import format.
 */
export function generateLxMusicJSON(playlist: Playlist): string {
  if (['spotify', 'applemusic', 'ytmusic'].includes(playlist.platform)) throw new Error('此播放器格式不支持该来源，请使用通用 JSON、CSV 或 XLSX。');
  const source = mapPlatformToLxSource(playlist.platform);
  const listName = cleanSingleLine(playlist.name) || 'PlaylistOut 歌单';
  const listId = `playlist_${cleanSingleLine(playlist.id) || Date.now()}`;

  const items: LxMusicItem[] = playlist.tracks.map((t: Track) => {
    const title = cleanSingleLine(t.title || '');
    const singer = cleanSingleLine(formatArtists(t.artist));
    const albumName = cleanSingleLine(t.album || '');
    const songmid = cleanSingleLine(t.id || '');
    const interval = formatLxInterval(t.durationMs);
    const img = t.coverUrl || playlist.coverUrl || undefined;

    return {
      name: title,
      singer,
      source,
      songmid,
      interval,
      albumName,
      img,
      types: [],
      // LX Music reads the quality lookup even when no qualities are known.
      _types: {},
    };
  });

  const payload: LxExportPayload = {
    type: 'playListPart',
    version: 1,
    data: {
      id: listId,
      name: listName,
      list: items,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export const lxMusicExportPlugin: ExportPlugin = {
  id: 'lx-music',
  name: '洛雪音乐 (LX Music)',
  fileExtension: 'json',
  mimeType: 'application/json;charset=utf-8',
  description: '洛雪音乐桌面版歌单格式，在「我的列表」右键点击一个列表并选择「导入」',
  export(ctx: ExportContext): ExportResult {
    const stem = buildPlaylistStem(ctx.playlist.name, ctx.playlist.creator);
    const filename = sanitizeFilename(`【洛雪音乐】${stem}.json`);
    const content = generateLxMusicJSON(ctx.playlist);
    return {
      filename,
      content,
      mimeType: this.mimeType,
    };
  },
};
