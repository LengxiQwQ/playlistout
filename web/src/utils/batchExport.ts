import type { Playlist, UserPlaylistSummary } from '../api/types';
import { parsePlaylist } from '../api/client';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  buildPlaylistStem,
  generateCSV,
  generateJSON,
  generateM3U8,
  generateTXT,
  generateXLSX,
  makeUniqueFilename,
  sanitizeFilename,
  sanitizeSpreadsheetCell,
  formatArtists,
  formatTotalDuration,
  cleanSingleLine,
  triggerDownload,
} from './export';
import { formatDuration } from './format';
import { getPlatformName, getPlatformPlaylistUrl } from './platform';

export type BatchExportFormat = 'multi_sheet_xlsx' | 'json' | 'xlsx' | 'txt' | 'csv' | 'm3u8';

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
  platform?: 'qqmusic' | 'netease' | 'kugou',
  batchTicket?: string,
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
      const isBareSonglistUrl =
        summary.sourceUrl &&
        (summary.sourceUrl.endsWith('/songlist/') || summary.sourceUrl.endsWith('/songlist'));
      const targetUrl =
        summary.sourceUrl && !isBareSonglistUrl
          ? summary.sourceUrl
          : summary.id
          ? (platform === 'kugou' ? `https://m.kugou.com/songlist/?listid=${summary.id}` : summary.id)
          : summary.sourceUrl || summary.id;
      let res = await parsePlaylist(targetUrl, signal, platform, undefined, false, undefined, batchTicket);

      // Self-healing retry if rate-limited
      if (!res.success && res.error?.code === 'RATE_LIMITED' && !signal?.aborted) {
        const retryAfterSec = Math.min(10, Math.max(1, (res.error as any).retryAfter || 5));
        await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000));
        if (!signal?.aborted) {
          res = await parsePlaylist(targetUrl, signal, platform, undefined, false, undefined, batchTicket);
        }
      }

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

    // Courteous smooth pause between items to prevent upstream congestion (450ms + 0~50ms jitter)
    if (i < total - 1) {
      const jitter = Math.floor(Math.random() * 50);
      await new Promise((resolve) => setTimeout(resolve, 450 + jitter));
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
      ['歌单链接', getPlatformPlaylistUrl(pl.platform || platform, pl.id, pl.sourceUrl), '', ''],
    ];

    if (pl.description) {
      metaRows.push(['歌单简介', cleanSingleLine(pl.description), '', '']);
    }

    metaRows.push([]); // blank line

    const tableHeader = ['序号', '歌曲标题', '歌手', '专辑', '时长'];
    const songRows = pl.tracks.map((t) => [
      t.index,
      sanitizeSpreadsheetCell(t.title || ''),
      sanitizeSpreadsheetCell(formatArtists(t.artist || (t as any).artists)),
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
  format: 'xlsx' | 'csv' | 'txt' | 'json' | 'm3u8',
  platform?: string,
): Promise<{ filename: string }> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];
  const usedEntryNames = new Set<string>();

  playlists.forEach((pl) => {
    // Inside the archive every playlist is an equal peer: `歌单名 - 作者.ext`,
    // no index prefix and no platform prefix (the archive name already carries it).
    const baseName = buildPlaylistStem(pl.name, pl.creator);
    const entryName = (ext: string): string =>
      makeUniqueFilename(`${baseName}.${ext}`, usedEntryNames);

    switch (format) {
      case 'xlsx': {
        const xlsxBytes = generateXLSX(pl);
        zip.file(entryName('xlsx'), xlsxBytes);
        break;
      }
      case 'csv': {
        const csvContent = generateCSV(pl);
        zip.file(entryName('csv'), csvContent);
        break;
      }
      case 'txt': {
        const txtContent = generateTXT(pl);
        zip.file(entryName('txt'), txtContent);
        break;
      }
      case 'json': {
        const jsonContent = generateJSON(pl);
        zip.file(entryName('json'), jsonContent);
        break;
      }
      case 'm3u8': {
        const m3u8Content = generateM3U8(pl);
        zip.file(entryName('m3u8'), m3u8Content);
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
