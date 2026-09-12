import type { Provider } from '../types';
import type { Playlist } from '../../models/playlist';

/**
 * QQ Music Provider Stub (P0 Infrastructure Skeleton)
 * Full implementation will be ported in Phase 1 following docs/ROADMAP.md.
 */
export const qqMusicProvider: Provider = {
  name: 'qqmusic',
  matches(input: string): boolean {
    return input.includes('y.qq.com') || /^\d+$/.test(input.trim());
  },
  extractId(input: string): string | null {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/(\d{5,})/);
    return match ? match[1] : null;
  },
  async parse(_id: string): Promise<Playlist> {
    throw new Error('QQ Music provider parsing is not implemented in P0. Scheduled for Phase 1.');
  },
};
