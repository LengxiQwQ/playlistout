import type { Playlist } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import { getPlatformPlaylistUrl } from '../../platform';
import {
  cleanSingleLine,
  formatArtists,
  formatDateTime,
  formatTimestamp,
  formatTotalDuration,
  getTrackDurationSeconds,
  getTrackIsVip,
  getTrackIsrc,
  getTrackStatusCode,
  getTrackTypeCode,
  sanitizeFilename,
  sanitizeSpreadsheetCell,
} from '../helpers';

/**
 * Escapes a field for standard RFC 4180 CSV.
 */
function escapeCsvField(field: string): string {
  const sanitized = sanitizeSpreadsheetCell(field);
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export interface CsvExportOptions {
  includeMetadata?: boolean;
}

/**
 * Generates CSV content with UTF-8 BOM (\uFEFF).
 * Default output is standard RFC 4180 pure table (no # comments) for maximum compatibility with
 * external spreadsheet and music migration tools.
 * When options.includeMetadata is true, prepends stationery comments.
 * Formula injection protected.
 */
export function generateCSV(playlist: Playlist, options?: CsvExportOptions): string {
  const isPartial = playlist.tracks.length < playlist.trackCount;
  const createdStr = formatTimestamp(playlist.createTime) || '未知';
  const exportedStr = formatDateTime();
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl);

  const headerComments: string[] = [
    `# 创建时间: ${createdStr}`,
    `# 导出时间: ${exportedStr}`,
    '# 导出工具: Playlist Out (https://playlistout.lengxiqwq.com)',
    `# 歌单名称: ${cleanSingleLine(playlist.name)}`,
    playlist.creator ? `# 歌单作者: ${cleanSingleLine(playlist.creator)}` : null,
    isPartial
      ? `# 已解析歌曲: ${playlist.tracks.length} / ${playlist.trackCount} 首${durationStr ? ` (已解析时长: ${durationStr})` : ''}`
      : `# 歌曲总数: ${playlist.trackCount} 首${durationStr ? ` (${durationStr})` : ''}`,
    playlist.tags && playlist.tags.length > 0 ? `# 风格标签: ${playlist.tags.join(', ')}` : null,
    playlist.playCount ? `# 总播放量: ${playlist.playCount.toLocaleString()} 次` : null,
    `# 歌单链接: ${sourceUrl}`,
  ].filter((line): line is string => line !== null);

  // Keep the first columns intentionally aligned with common playlist migration/import tools.
  // Extra Playlist Out fields follow afterwards and can be safely ignored by importers.
  const header = ['title', 'artist', 'album', 'isrc', 'duration', 'url', 'index', 'type', 'vip', 'status'];
  const rows: string[][] = [header];

  for (const track of playlist.tracks) {
    rows.push([
      track.title || '',
      formatArtists(track.artist),
      track.album || '',
      getTrackIsrc(track),
      getTrackDurationSeconds(track.durationMs),
      track.sourceUrl || '',
      String(track.index),
      getTrackTypeCode(track),
      getTrackIsVip(track) ? 'true' : 'false',
      getTrackStatusCode(track),
    ]);
  }

  const csvBody = rows
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\r\n');

  // RFC 4180 Pure CSV by default; include comments only when explicitly requested
  if (options?.includeMetadata) {
    const commentsBlock = headerComments.join('\r\n') + '\r\n';
    return `\uFEFF${commentsBlock}${csvBody}`;
  }

  return `\uFEFF${csvBody}`;
}

export const csvExportPlugin: ExportPlugin = {
  id: 'csv',
  name: '表格数据 (CSV)',
  fileExtension: 'csv',
  mimeType: 'text/csv;charset=utf-8',
  description: '标准 RFC 4180 CSV，兼容各类迁移工具与表格软件',
  export(ctx: ExportContext): ExportResult {
    const baseName = sanitizeFilename(
      `${ctx.playlist.name || 'playlist'}${ctx.playlist.creator ? ' - ' + ctx.playlist.creator : ''}`,
    );
    const content = generateCSV(ctx.playlist, ctx.options as CsvExportOptions | undefined);
    return {
      filename: `${baseName}.csv`,
      content,
      mimeType: this.mimeType,
    };
  },
};
