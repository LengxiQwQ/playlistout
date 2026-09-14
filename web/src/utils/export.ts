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
 * Formats a Unix timestamp (seconds) into standard YYYY-MM-DD HH:mm:ss.
 */
export function formatTimestamp(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const d = new Date(seconds * 1000);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/**
 * Formats a Date into standard YYYY-MM-DD HH:mm:ss.
 */
export function formatDateTime(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/**
 * Formats total playlist duration in readable Chinese/English.
 */
export function formatTotalDuration(tracks: { durationMs?: number }[]): string {
  const totalMs = tracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  if (totalMs <= 0) return '';
  const totalMinutes = Math.floor(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }
  return `${minutes} 分钟`;
}

/**
 * Generates plain text content with stationery header.
 * Creation time first, Export time second (adjacent).
 * Kept faithful to source text without formula injection escaping.
 */
export function generateTXT(playlist: Playlist): string {
  const lines: string[] = [];
  const createdStr = formatTimestamp(playlist.createTime) || '未知';
  const exportedStr = formatDateTime();
  const updatedStr = formatTimestamp(playlist.updateTime);
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = playlist.sourceUrl || `https://y.qq.com/n/ryqq/playlist/${playlist.id}`;

  lines.push('==================================================');
  lines.push(`  创建时间: ${createdStr}`);
  lines.push(`  导出时间: ${exportedStr}`);
  lines.push('  导出工具: PlaylistOut (https://playlistout.com)');
  lines.push(`  歌单名称: ${playlist.name}`);
  if (playlist.creator) {
    lines.push(`  歌单作者: ${playlist.creator}`);
  }
  if (updatedStr) {
    lines.push(`  最后更新: ${updatedStr}`);
  }
  lines.push(`  歌曲总数: ${playlist.trackCount} 首${durationStr ? ` (总时长 ${durationStr})` : ''}`);
  if (playlist.tags && playlist.tags.length > 0) {
    lines.push(`  风格标签: ${playlist.tags.join(' · ')}`);
  }
  if (playlist.playCount) {
    lines.push(`  总播放量: ${playlist.playCount.toLocaleString()} 次`);
  }
  lines.push(`  歌单链接: ${sourceUrl}`);
  if (playlist.description) {
    lines.push('--------------------------------------------------');
    lines.push('  歌单简介:');
    lines.push(`  ${cleanSingleLine(playlist.description)}`);
  }
  lines.push('==================================================');
  lines.push('');

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
 * Generates CSV content with UTF-8 BOM (\uFEFF) and metadata comments.
 * Creation time first, Export time second (adjacent).
 * Formula injection protected.
 */
export function generateCSV(playlist: Playlist): string {
  const createdStr = formatTimestamp(playlist.createTime) || '未知';
  const exportedStr = formatDateTime();
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = playlist.sourceUrl || `https://y.qq.com/n/ryqq/playlist/${playlist.id}`;

  const headerComments: string[] = [
    `# 创建时间: ${createdStr}`,
    `# 导出时间: ${exportedStr}`,
    '# 导出工具: PlaylistOut (https://playlistout.com)',
    `# 歌单名称: ${cleanSingleLine(playlist.name)}`,
    playlist.creator ? `# 歌单作者: ${cleanSingleLine(playlist.creator)}` : null,
    `# 歌曲总数: ${playlist.trackCount} 首${durationStr ? ` (${durationStr})` : ''}`,
    playlist.tags && playlist.tags.length > 0 ? `# 风格标签: ${playlist.tags.join(', ')}` : null,
    playlist.playCount ? `# 总播放量: ${playlist.playCount.toLocaleString()} 次` : null,
    `# 歌单链接: ${sourceUrl}`,
  ].filter((line): line is string => line !== null);

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

  // Prepend UTF-8 BOM and metadata header comments
  const commentsBlock = headerComments.join('\r\n') + '\r\n';
  return `\uFEFF${commentsBlock}${csvBody}`;
}

/**
 * Generates XLSX binary buffer using SheetJS.
 * Metadata card at top (Creation time first, Export time second), blank line, then song data table.
 * Formula injection protected.
 */
export function generateXLSX(playlist: Playlist): Uint8Array {
  const createdStr = formatTimestamp(playlist.createTime) || '未知';
  const exportedStr = formatDateTime();
  const updatedStr = formatTimestamp(playlist.updateTime) || '-';
  const durationStr = formatTotalDuration(playlist.tracks);
  const sourceUrl = playlist.sourceUrl || `https://y.qq.com/n/ryqq/playlist/${playlist.id}`;

  const metaRows: (string | number)[][] = [
    ['歌单名称', playlist.name, '', ''],
    ['创建时间', createdStr, '导出时间', exportedStr],
    ['导出工具', 'PlaylistOut', '平台网址', 'https://playlistout.com'],
    ['歌单作者', playlist.creator || '未知', '歌曲总数', `${playlist.trackCount} 首${durationStr ? ` (${durationStr})` : ''}`],
    ['最后更新', updatedStr, '总播放量', playlist.playCount ? `${playlist.playCount.toLocaleString()} 次` : '-'],
    ['风格标签', (playlist.tags || []).join(', ') || '-', '歌单链接', sourceUrl],
  ];

  if (playlist.description) {
    metaRows.push(['歌单简介', cleanSingleLine(playlist.description), '', '']);
  }

  // Blank separator row
  metaRows.push([]);

  const tableHeader = ['序号', '歌曲标题', '歌手', '专辑', '时长'];
  const songRows = playlist.tracks.map((track) => [
    track.index,
    sanitizeSpreadsheetCell(track.title || ''),
    sanitizeSpreadsheetCell(formatArtists(track.artists)),
    sanitizeSpreadsheetCell(track.album || ''),
    formatDuration(track.durationMs),
  ]);

  const allRows = [...metaRows, tableHeader, ...songRows];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set reasonable column widths
  ws['!cols'] = [
    { wch: 10 }, // 序号 / 属性名
    { wch: 32 }, // 歌曲标题 / 属性值
    { wch: 22 }, // 歌手 / 辅助属性名
    { wch: 25 }, // 专辑 / 辅助属性值
    { wch: 10 }, // 时长
  ];

  XLSX.utils.book_append_sheet(wb, ws, '歌单歌曲');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

/**
 * Generates normalized JSON export representation.
 * Creation time first, Export time second (adjacent).
 * Kept faithful to source text without formula injection escaping.
 */
export function generateJSON(playlist: Playlist): string {
  const createdStr = formatTimestamp(playlist.createTime) || null;
  const exportedStr = formatDateTime();
  const updatedStr = formatTimestamp(playlist.updateTime) || null;
  const durationStr = formatTotalDuration(playlist.tracks) || null;
  const sourceUrl = playlist.sourceUrl || `https://y.qq.com/n/ryqq/playlist/${playlist.id}`;

  const exportPayload = {
    createTime: createdStr,
    exportedAt: exportedStr,
    generator: 'PlaylistOut',
    generatorUrl: 'https://playlistout.com',
    name: playlist.name,
    creator: playlist.creator || '',
    updateTime: updatedStr,
    platform: playlist.platform,
    id: playlist.id,
    sourceUrl,
    trackCount: playlist.trackCount,
    totalDuration: durationStr,
    playCount: playlist.playCount || null,
    tags: playlist.tags || [],
    description: playlist.description || '',
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
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Delay revoking the object URL so the browser download manager
  // has ample time to resolve the blob stream before it is freed.
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Best-effort cleanup
    }
  }, 5000);
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
