import type { Playlist, Track } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import { getPlatformPlaylistUrl } from '../../platform';
import {
  buildExportBaseName,
  formatArtists,
  formatDateTime,
  formatTimestamp,
  formatTotalDuration,
  getTrackStatusText,
} from '../helpers';

/**
 * Generates normalized JSON export representation.
 * Creation time first, Export time second (adjacent).
 * Kept faithful to source text without formula injection escaping.
 */
export function generateJSON(playlist: Playlist): string {
  const isPartial = playlist.tracks.length < playlist.trackCount;
  const createdStr = formatTimestamp(playlist.createTime) || undefined;
  const exportedStr = formatDateTime();
  const updatedStr = formatTimestamp(playlist.updateTime) || undefined;
  const durationStr = formatTotalDuration(playlist.tracks) || undefined;
  const loadedDurationMs = playlist.tracks.reduce((acc: number, t: Track) => acc + (t.durationMs || 0), 0);
  const sourceUrl = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl);

  const exportPayload = {
    createTime: createdStr,
    exportedAt: exportedStr,
    generator: 'Playlist Out',
    generatorUrl: 'https://playlistout.lengxiqwq.com',
    name: playlist.name,
    creator: playlist.creator || undefined,
    coverUrl: playlist.coverUrl || undefined,
    updateTime: updatedStr,
    platform: playlist.platform,
    id: playlist.id,
    sourceUrl: sourceUrl || undefined,
    trackCount: playlist.trackCount,
    loadedTrackCount: playlist.tracks.length,
    isPartial,
    totalDuration: isPartial ? undefined : durationStr,
    totalDurationMs: isPartial ? undefined : loadedDurationMs,
    loadedDuration: durationStr,
    loadedDurationMs,
    playCount: playlist.playCount || undefined,
    tags: playlist.tags && playlist.tags.length > 0 ? playlist.tags : undefined,
    description: playlist.description ? playlist.description : undefined,
    tracks: playlist.tracks.map((t: Track) => ({
      index: t.index,
      title: t.title,
      artist: formatArtists(t.artist),
      album: t.album || undefined,
      id: t.id || undefined,
      isrc: t.isrc || undefined,
      durationMs: t.durationMs !== undefined ? t.durationMs : undefined,
      releaseDate: t.releaseDate || undefined,
      trackNumber: t.trackNumber !== undefined ? t.trackNumber : undefined,
      discNumber: t.discNumber !== undefined ? t.discNumber : undefined,
      sourceUrl: t.sourceUrl || undefined,
      playbackUrl: t.playbackUrl || undefined,
      coverUrl: t.coverUrl || undefined,
      isOriginalSound: t.isOriginalSound !== undefined ? t.isOriginalSound : undefined,
      isVip: t.isVip !== undefined ? t.isVip : (t.status === 'vip' ? true : undefined),
      isAvailable: t.isAvailable !== undefined ? t.isAvailable : undefined,
      status: t.status || (t.isAvailable === false ? 'unplayable' : 'playable'),
      statusText: getTrackStatusText(t),
      maxQuality: t.maxQuality || undefined,
      mvId: t.mvId || undefined,
      mvUrl: t.mvUrl || undefined,
    })),
  };

  return JSON.stringify(exportPayload, null, 2);
}

export const jsonExportPlugin: ExportPlugin = {
  id: 'json',
  name: '结构化数据 (JSON)',
  fileExtension: 'json',
  mimeType: 'application/json;charset=utf-8',
  description: '完整机器可读结构化数据，保留全部扩展字段',
  export(ctx: ExportContext): ExportResult {
    const baseName = buildExportBaseName(ctx.playlist);
    const content = generateJSON(ctx.playlist);
    return {
      filename: `${baseName}.json`,
      content,
      mimeType: this.mimeType,
    };
  },
};
