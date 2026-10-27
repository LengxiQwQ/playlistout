import type { Playlist, Track } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import { getPlatformPlaylistUrl } from '../../platform';
import {
  buildPlaylistStem,
  cleanSingleLine,
  formatArtists,
  sanitizeFilename,
} from '../helpers';

/**
 * Maps PlaylistOut platform identifier to Listen 1 source name:
 * - qq: QQ 音乐
 * - netease: 网易云音乐
 * - kugou: 酷狗音乐
 * - kuwo: 酷我音乐
 * - migu: 咪咕音乐
 */
export function mapPlatformToListen1Source(platform?: string): string {
  switch (platform?.toLowerCase()) {
    case 'qqmusic':
    case 'qq':
      return 'qq';
    case 'netease':
    case '163':
      return 'netease';
    case 'kugou':
      return 'kugou';
    case 'kuwo':
      return 'kuwo';
    case 'migu':
      return 'migu';
    default:
      return 'qq';
  }
}

/**
 * Returns the track ID prefix Listen 1 expects for platform track keys:
 * e.g. qqtrack_..., netrack_..., kgtrack_..., kwtrack_...
 */
export function getListen1TrackPrefix(platform?: string): string {
  switch (platform?.toLowerCase()) {
    case 'qqmusic':
    case 'qq':
      return 'qqtrack';
    case 'netease':
    case '163':
      return 'netrack';
    case 'kugou':
      return 'kgtrack';
    case 'kuwo':
      return 'kwtrack';
    case 'migu':
      return 'mgtrack';
    default:
      return 'track';
  }
}

export interface Listen1Track {
  id: string;
  title: string;
  artist: string;
  artist_id: string;
  album: string;
  album_id: string;
  source: string;
  source_url: string;
  img_url: string;
  disabled: boolean;
}

export interface Listen1PlaylistEntry {
  is_mine: 1;
  info: {
    id: string;
    title: string;
    cover_img_url: string;
    source_url: string;
  };
  tracks: Listen1Track[];
}

export type Listen1ExportPayload = Record<string, Listen1PlaylistEntry>;

/**
 * Generates Listen 1 native backup JSON format.
 * Can be restored via Listen 1: "设置" -> "备份与恢复" -> "从本地文件恢复".
 */
export function generateListen1JSON(playlist: Playlist): string {
  const source = mapPlatformToListen1Source(playlist.platform);
  const prefix = getListen1TrackPrefix(playlist.platform);
  const rawId = cleanSingleLine(playlist.id) || String(Date.now());
  const playlistKey = `myplaylist_${rawId}`;
  const playlistUrl = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl) || '';
  const playlistCover = playlist.coverUrl || '';

  const tracks: Listen1Track[] = playlist.tracks.map((t: Track, idx: number) => {
    const rawSongId = cleanSingleLine(t.id || String(idx + 1));
    const trackId = `${prefix}_${rawSongId}`;
    const title = cleanSingleLine(t.title || '');
    const artist = cleanSingleLine(formatArtists(t.artist));
    const album = cleanSingleLine(t.album || '');
    const sourceUrl = t.sourceUrl || '';
    const imgUrl = t.coverUrl || playlistCover;

    return {
      id: trackId,
      title,
      artist,
      artist_id: '',
      album,
      album_id: '',
      source,
      source_url: sourceUrl,
      img_url: imgUrl,
      disabled: t.isAvailable === false || t.status === 'unplayable',
    };
  });

  const payload: Listen1ExportPayload = {
    [playlistKey]: {
      is_mine: 1,
      info: {
        id: playlistKey,
        title: cleanSingleLine(playlist.name) || 'PlaylistOut 歌单',
        cover_img_url: playlistCover,
        source_url: playlistUrl,
      },
      tracks,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export const listen1ExportPlugin: ExportPlugin = {
  id: 'listen1',
  name: 'Listen 1',
  fileExtension: 'json',
  mimeType: 'application/json;charset=utf-8',
  description: 'Listen 1 备份恢复格式，在「设置」➜「备份与恢复」点击「从本地文件恢复」一键导入',
  export(ctx: ExportContext): ExportResult {
    const stem = buildPlaylistStem(ctx.playlist.name, ctx.playlist.creator);
    const filename = sanitizeFilename(`【Listen 1】${stem}.json`);
    const content = generateListen1JSON(ctx.playlist);
    return {
      filename,
      content,
      mimeType: this.mimeType,
    };
  },
};
