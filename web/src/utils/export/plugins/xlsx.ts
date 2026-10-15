import * as XLSX from 'xlsx';
import type { Playlist, Track } from '../../../api/types';
import type { ExportPlugin, ExportContext, ExportResult } from '../types';
import { getPlatformPlaylistUrl } from '../../platform';
import {
  buildExportBaseName,
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
  sanitizeSpreadsheetCell,
} from '../helpers';

/**
 * Generates an interoperability-oriented XLSX workbook.
 * The first sheet is a clean one-track-per-row table for migration/import tools.
 * Playlist metadata is kept on a separate second sheet so human-readable context is preserved
 * without confusing importers that expect headers on row 1.
 * Formula injection protected.
 */
export function generateXLSX(playlist: Playlist): Uint8Array {
  const isPartial = playlist.tracks.length < playlist.trackCount;
  const createdStr = formatTimestamp(playlist.createTime) || '';
  const exportedStr = formatDateTime();
  const updatedStr = formatTimestamp(playlist.updateTime) || '';
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = getPlatformPlaylistUrl(playlist.platform, playlist.id, playlist.sourceUrl);

  const trackHeader = ['title', 'artist', 'album', 'isrc', 'duration', 'url', 'index', 'type', 'vip', 'status'];
  const trackRows = playlist.tracks.map((track: Track) => [
    sanitizeSpreadsheetCell(track.title || ''),
    sanitizeSpreadsheetCell(formatArtists(track.artist)),
    sanitizeSpreadsheetCell(track.album || ''),
    sanitizeSpreadsheetCell(getTrackIsrc(track)),
    getTrackDurationSeconds(track.durationMs),
    sanitizeSpreadsheetCell(track.sourceUrl || ''),
    track.index,
    getTrackTypeCode(track),
    getTrackIsVip(track),
    getTrackStatusCode(track),
  ]);

  const metadataRows: (string | number | boolean)[][] = [
    ['field', 'value'],
    ['name', sanitizeSpreadsheetCell(playlist.name)],
    ['creator', sanitizeSpreadsheetCell(playlist.creator || '')],
    ['platform', playlist.platform],
    ['id', sanitizeSpreadsheetCell(playlist.id)],
    ['sourceUrl', sanitizeSpreadsheetCell(sourceUrl)],
    ['trackCount', playlist.trackCount],
    ['loadedTrackCount', playlist.tracks.length],
    ['isPartial', isPartial],
    ['createTime', createdStr],
    ['updateTime', updatedStr],
    ['exportedAt', exportedStr],
    ['totalDuration', durationStr],
    ['playCount', playlist.playCount || ''],
    ['tags', sanitizeSpreadsheetCell((playlist.tags || []).join(', '))],
    ['description', sanitizeSpreadsheetCell(cleanSingleLine(playlist.description || ''))],
    ['generator', 'Playlist Out'],
    ['generatorUrl', 'https://playlistout.lengxiqwq.com'],
  ];

  const wb = XLSX.utils.book_new();

  const tracksWs = XLSX.utils.aoa_to_sheet([trackHeader, ...trackRows]);
  tracksWs['!cols'] = [
    { wch: 34 }, // title
    { wch: 26 }, // artist
    { wch: 28 }, // album
    { wch: 16 }, // isrc
    { wch: 10 }, // duration (seconds)
    { wch: 48 }, // url
    { wch: 8 },  // index
    { wch: 16 }, // type
    { wch: 8 },  // vip
    { wch: 14 }, // status
  ];

  const infoWs = XLSX.utils.aoa_to_sheet(metadataRows);
  infoWs['!cols'] = [{ wch: 20 }, { wch: 72 }];

  // Keep Tracks first: many importers inspect only the first worksheet.
  XLSX.utils.book_append_sheet(wb, tracksWs, 'Tracks');
  XLSX.utils.book_append_sheet(wb, infoWs, 'Playlist Info');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export const xlsxExportPlugin: ExportPlugin = {
  id: 'xlsx',
  name: '电子表格 (Excel XLSX)',
  fileExtension: 'xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  description: 'Microsoft Excel 多 Sheet 工作簿，含清晰列宽与元数据页',
  export(ctx: ExportContext): ExportResult {
    const baseName = buildExportBaseName(ctx.playlist);
    const xlsxBytes = generateXLSX(ctx.playlist);
    return {
      filename: `${baseName}.xlsx`,
      content: xlsxBytes as unknown as BlobPart,
      mimeType: this.mimeType,
    };
  },
};
