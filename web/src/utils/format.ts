/**
 * Formats duration in milliseconds to mm:ss string.
 */
export function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null || isNaN(ms) || ms <= 0) {
    return '—';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
