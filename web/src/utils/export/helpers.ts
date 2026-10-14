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
 * Formats artist into readable string.
 */
export function formatArtists(artists?: string[] | string): string {
  if (!artists) return '';
  if (Array.isArray(artists)) {
    return artists.join(', ');
  }
  return String(artists).trim();
}

export function getTrackIsrc(track: { isrc?: string }): string {
  if (track.isrc && typeof track.isrc === 'string' && track.isrc.trim()) {
    return track.isrc.trim().toUpperCase();
  }
  return '';
}

export function getTrackDurationSeconds(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '';
  return String(Math.round(durationMs / 1000));
}

export function getTrackTypeCode(track: { isOriginalSound?: boolean; statusText?: string }): string {
  if (track.isOriginalSound) return 'original_sound';
  if (track.statusText === '视频') return 'video';
  return 'track';
}

export function getTrackStatusCode(track: {
  status?: string;
  isAvailable?: boolean;
  isVip?: boolean;
}): string {
  if (track.status) return track.status;
  if (track.isAvailable === false) return 'unplayable';
  if (track.isVip) return 'vip';
  return 'playable';
}

export function cleanSingleLine(str: string): string {
  return (str || '').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Formats a Unix timestamp (seconds) into standard YYYY-MM-DD HH:mm:ss.
 */
export function formatTimestamp(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const sec = seconds > 1e11 ? Math.floor(seconds / 1000) : seconds;
  const d = new Date(sec * 1000);
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
 * Returns user-friendly status text for a track.
 */
export function getTrackStatusText(track: { statusText?: string; isAvailable?: boolean; status?: string }): string {
  if (track.isAvailable === false || track.status === 'unplayable') return '下架/无版权';
  if (track.status === 'paid') return '付费专辑';
  if (track.statusText && track.statusText !== '仅海外受限') return track.statusText;
  return '正常';
}

export function getTrackIsVip(track: { isVip?: boolean; status?: string }): boolean {
  return Boolean(track.isVip || track.status === 'vip');
}

/**
 * Returns user-friendly track type text (e.g. 视频原声, 视频片段, 歌曲).
 */
export function getTrackTypeText(track: { isOriginalSound?: boolean; statusText?: string }): string {
  if (track.isOriginalSound) return '视频原声';
  if (track.statusText === '视频') return '视频片段';
  return '歌曲';
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
