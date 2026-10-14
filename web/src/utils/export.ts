/**
 * Facade entry for playlist export utilities.
 * Completely backwards-compatible re-export while delegating to the modular plugin registry.
 */

import type { Playlist } from '../api/types';
import { exportRegistry } from './export/registry';

export * from './export/index';

/**
 * High-level export helper for any supported format.
 * Delegates directly to the modular ExportRegistry.
 */
export function exportPlaylist(
  playlist: Playlist,
  format: 'txt' | 'csv' | 'xlsx' | 'json' | 'm3u8' | 'markdown' | string,
): { filename: string } {
  return exportRegistry.exportSync(format, playlist);
}
