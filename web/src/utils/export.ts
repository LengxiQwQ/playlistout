import type { Playlist } from '../api/types';
import * as XLSX from 'xlsx';
import { formatDuration } from './format';


/**
 * Windows / macOS / Linux filename sanitization.
 * Replaces invalid characters (< > : " / \ | ? *) with empty or space,
 * handles reserved Windows device names, trims whitespace and dots,
 * and limits length safely.
 */
export function sanitizeFilename(name: string, fallback: string = 'playlist'): string {
  if (!name) return fallback;

  // Remove control characters (0-31)
  let clean = name.replace(/[\x00-\x1f\x7f]/g, '');

  // Replace forbidden filesystem characters with space
  clean = clean.replace(/[<>:"/\\|?*]/g, ' ');

  // Collapse multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  // Strip leading and trailing dots
  clean = clean.replace(/^\.+|\.+$/g, '');

  // Check Windows reserved names
  const reservedRegex = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedRegex.test(clean)) {
    clean = `${clean}_file`;
  }

  // Cap length to 100 characters to prevent path length issues
  if (clean.length > 100) {
    clean = clean.substring(0, 100).trim();
  }

  return clean || fallback;
}

/**
 * Mitigates spreadsheet formula injection (CSV Injection / Formula Injection).
 * If a cell string starts with =, +, -, @, \t, or \r, prepends a single quote (').
 */
export function sanitizeSpreadsheetCell(value: string): string {
  if (!value) return '';
  if (/^[\s]*[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Formats artist array into readable string.
 */
export function formatArtists(artists?: string[]): string {
  if (!artists || artists.length === 0) return '';
  return artists.join(', ');
}

export function cleanSingleLine(str: string): string {
  return (str || '').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Generates plain text content.
 * Kept faithful to source text without formula injection escaping.
 * Internal newlines are normalized to spaces so each track is one line.
 */
export function generateTXT(playlist: Playlist): string {
  const lines: string[] = [];

  for (const track of playlist.tracks) {
    const title = cleanSingleLine(track.title || '');
    const artistStr = cleanSingleLine(formatArtists(track.artists));
    const albumStr = cleanSingleLine(track.album || '');

    if (albumStr && artistStr) {
      lines.push(`${title} - ${artistStr} - ${albumStr}`);
    } else if (artistStr) {
      lines.push(`${title} - ${artistStr}`);
    } else {
      lines.push(title);
    }
  }

  return lines.join('\n');
}


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

/**
 * Generates CSV content with UTF-8 BOM (\uFEFF) for Excel compatibility.
 * Formula injection protected.
 */
export function generateCSV(playlist: Playlist): string {
  const header = ['序号', '歌曲标题', '歌手', '专辑', '时长'];
  const rows: string[][] = [header];

  for (const track of playlist.tracks) {
    rows.push([
      String(track.index),
      track.title || '',
      formatArtists(track.artists),
      track.album || '',
      formatDuration(track.durationMs),
    ]);
  }

  const csvBody = rows
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\r\n');

  // Prepend UTF-8 BOM
  return `\uFEFF${csvBody}`;
}

/**
 * Generates XLSX binary buffer using SheetJS.
 * Formula injection protected.
 */
export function generateXLSX(playlist: Playlist): Uint8Array {
  const data = [
    ['序号', '歌曲标题', '歌手', '专辑', '时长'],
    ...playlist.tracks.map((track) => [
      track.index,
      sanitizeSpreadsheetCell(track.title || ''),
      sanitizeSpreadsheetCell(formatArtists(track.artists)),
      sanitizeSpreadsheetCell(track.album || ''),
      formatDuration(track.durationMs),
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set reasonable column widths
  ws['!cols'] = [
    { wch: 8 },  // 序号
    { wch: 30 }, // 歌曲标题
    { wch: 22 }, // 歌手
    { wch: 25 }, // 专辑
    { wch: 10 }, // 时长
  ];

  XLSX.utils.book_append_sheet(wb, ws, '歌单歌曲');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

/**
 * Generates normalized JSON export representation.
 * Kept faithful to source text without formula injection escaping.
 */
export function generateJSON(playlist: Playlist): string {
  const exportPayload = {
    platform: playlist.platform,
    id: playlist.id,
    name: playlist.name,
    creator: playlist.creator || '',
    trackCount: playlist.trackCount,
    exportedAt: new Date().toISOString(),
    tracks: playlist.tracks.map((t) => ({
      index: t.index,
      id: t.id,
      title: t.title,
      artists: t.artists,
      album: t.album || '',
      durationMs: t.durationMs,
      sourceUrl: t.sourceUrl,
    })),
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Triggers a browser file download without sending anything to a server.
 */
export function triggerDownload(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * High-level export helper for any supported format.
 */
export function exportPlaylist(
  playlist: Playlist,
  format: 'txt' | 'csv' | 'xlsx' | 'json',
): { filename: string } {
  const baseName = sanitizeFilename(
    `${playlist.name || 'playlist'}${playlist.creator ? ' - ' + playlist.creator : ''}`,
  );

  switch (format) {
    case 'txt': {
      const filename = `${baseName}.txt`;
      const text = generateTXT(playlist);
      triggerDownload(text, filename, 'text/plain;charset=utf-8');
      return { filename };
    }
    case 'csv': {
      const filename = `${baseName}.csv`;
      const csv = generateCSV(playlist);
      triggerDownload(csv, filename, 'text/csv;charset=utf-8');
      return { filename };
    }
    case 'xlsx': {
      const filename = `${baseName}.xlsx`;
      const xlsxBytes = generateXLSX(playlist);
      triggerDownload(
        xlsxBytes as unknown as BlobPart,
        filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      return { filename };
    }

    case 'json': {
      const filename = `${baseName}.json`;
      const json = generateJSON(playlist);
      triggerDownload(json, filename, 'application/json;charset=utf-8');
      return { filename };
    }
  }
}
