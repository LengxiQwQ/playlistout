import type { Playlist, UserPlaylistSummary } from '../api/types';
import { parsePlaylist } from '../api/client';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  generateCSV,
  generateJSON,
  generateTXT,
  generateXLSX,
  sanitizeFilename,
  sanitizeSpreadsheetCell,
  formatArtists,
  formatTotalDuration,
  cleanSingleLine,
  triggerDownload,
} from './export';
import { formatDuration } from './format';
import { getPlatformName, getPlatformPlaylistUrl } from './platform';

export type BatchExportFormat = 'multi_sheet_xlsx' | 'xlsx' | 'csv' | 'txt' | 'json';

export interface BatchFetchProgress {
  current: number;
  total: number;
  currentPlaylistName: string;
  status: 'fetching' | 'packaging' | 'done' | 'aborted' | 'error';
  failedCount: number;
}

/**
 * Sanitizes and trims an Excel sheet name (max 31 chars, no forbidden chars: \ / ? * [ ] :)
 */
export function sanitizeSheetName(name: string, fallback: string = '歌单'): string {
  let clean = (name || fallback)
    .replace(/[\\/?*[\]:]/g, '_')
    .replace(/[\x00-\x1f]/g, '')
    .trim();

  if (clean.length > 28) {
    clean = clean.substring(0, 28).trim();
  }

  return clean || fallback;
}

/**
 * Safely fetches multiple playlists sequentially/in small batches to respect rate limits.
 */
export async function fetchMultiplePlaylists(
  playlists: UserPlaylistSummary[],
  onProgress?: (progress: BatchFetchProgress) => void,
  signal?: AbortSignal,
  platform?: 'qqmusic' | 'netease',
): Promise<{ successfulPlaylists: Playlist[]; failedCount: number }> {
  const successfulPlaylists: Playlist[] = [];
  let failedCount = 0;
  const total = playlists.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      onProgress?.({
        current: i,
        total,
        currentPlaylistName: '',
        status: 'aborted',
        failedCount,
      });
      break;
    }

    const summary = playlists[i];
    onProgress?.({
      current: i + 1,
      total,
      currentPlaylistName: summary.name,
      status: 'fetching',
      failedCount,
    });

    try {
      const targetUrl = summary.sourceUrl || summary.id;
      const res = await parsePlaylist(targetUrl, signal, platform);
      if (res.success && res.data) {
        successfulPlaylists.push(res.data);
      } else {
        failedCount++;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        break;
      }
      failedCount++;
    }

    // Small courteous pause between items to prevent upstream congestion
    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return { successfulPlaylists, failedCount };
}

/**
 * Builds and downloads a multi-sheet Excel (.xlsx) file containing all playlists.
 */
export function exportToMultiSheetExcel(
  playlists: Playlist[],
  nickname: string,
  platform?: string,
): { filename: string } {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Index Sheet (Catalog)
  const catalogHeader = ['序号', '歌单名称', '曲目总数', '歌单作者', '风格标签', '总播放量', '歌单链接'];
  const catalogRows = playlists.map((pl, idx) => [
    idx + 1,
    pl.name,
    pl.trackCount,
    pl.creator || nickname || '-',
    (pl.tags || []).join(', ') || '-',
    pl.playCount ? pl.playCount.toLocaleString() : '-',
    getPlatformPlaylistUrl(pl.platform || platform, pl.id, pl.sourceUrl),
  ]);

  const indexWs = XLSX.utils.aoa_to_sheet([
    ['【歌单手账目录】', `${nickname} 的公开歌单合集`, '', ''],
    ['整理时间', new Date().toLocaleString(), '歌单总数', `${playlists.length} 个`],
    [],
    catalogHeader,
    ...catalogRows,
  ]);

  indexWs['!cols'] = [
    { wch: 8 },
    { wch: 32 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 15 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, indexWs, '【目录】歌单索引');

  // 2. Individual Playlist Sheets
  const usedSheetNames = new Set<string>(['【目录】歌单索引']);

  playlists.forEach((pl, pIdx) => {
    let baseSheet = sanitizeSheetName(pl.name, `歌单_${pIdx + 1}`);
    let finalSheet = baseSheet;
    let counter = 2;
    while (usedSheetNames.has(finalSheet)) {
      finalSheet = `${baseSheet.substring(0, 25)}_${counter}`;
      counter++;
    }
    usedSheetNames.add(finalSheet);

    const durationStr = formatTotalDuration(pl.tracks);
    const metaRows: (string | number)[][] = [
      ['歌单名称', pl.name, '', ''],
      ['歌单作者', pl.creator || nickname || '未知', '歌曲总数', `${pl.trackCount} 首${durationStr ? ` (${durationStr})` : ''}`],
      ['风格标签', (pl.tags || []).join(', ') || '-', '总播放量', pl.playCount ? `${pl.playCount.toLocaleString()} 次` : '-'],
      ['歌单链接', pl.sourceUrl || `https://y.qq.com/n/ryqq/playlist/${pl.id}`, '', ''],
    ];

    if (pl.description) {
      metaRows.push(['歌单简介', cleanSingleLine(pl.description), '', '']);
    }

    metaRows.push([]); // blank line

    const tableHeader = ['序号', '歌曲标题', '歌手', '专辑', '时长'];
    const songRows = pl.tracks.map((t) => [
      t.index,
      sanitizeSpreadsheetCell(t.title || ''),
      sanitizeSpreadsheetCell(formatArtists(t.artists)),
      sanitizeSpreadsheetCell(t.album || ''),
      formatDuration(t.durationMs),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...metaRows, tableHeader, ...songRows]);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 32 },
      { wch: 24 },
      { wch: 24 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, finalSheet);
  });

  const rawBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const targetPlatform = platform || playlists[0]?.platform;
  const platformName = getPlatformName(targetPlatform);
  const filename = sanitizeFilename(`【${platformName}歌单合集】${nickname} - 共${playlists.length}个歌单_${dateStr}.xlsx`);
  triggerDownload(rawBytes, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  return { filename };
}

/**
 * Packages all playlists into a single .zip file.
 */
export async function exportToZip(
  playlists: Playlist[],
  nickname: string,
  format: 'xlsx' | 'csv' | 'txt' | 'json',
  platform?: string,
): Promise<{ filename: string }> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];

  playlists.forEach((pl, idx) => {
    const baseName = sanitizeFilename(`${idx + 1}. ${pl.name || 'playlist'}${pl.creator ? ' - ' + pl.creator : ''}`);

    switch (format) {
      case 'xlsx': {
        const xlsxBytes = generateXLSX(pl);
        zip.file(`${baseName}.xlsx`, xlsxBytes);
        break;
      }
      case 'csv': {
        const csvContent = generateCSV(pl);
        zip.file(`${baseName}.csv`, csvContent);
        break;
      }
      case 'txt': {
        const txtContent = generateTXT(pl);
        zip.file(`${baseName}.txt`, txtContent);
        break;
      }
      case 'json': {
        const jsonContent = generateJSON(pl);
        zip.file(`${baseName}.json`, jsonContent);
        break;
      }
    }
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const targetPlatform = platform || playlists[0]?.platform;
  const platformName = getPlatformName(targetPlatform);
  const zipFilename = sanitizeFilename(`【${platformName}歌单合集】${nickname} - 共${playlists.length}个歌单 (${format.toUpperCase()})_${dateStr}.zip`);
  triggerDownload(blob, zipFilename, 'application/zip');

  return { filename: zipFilename };
}
