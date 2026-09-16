/**
 * Kugou Music Provider Implementation
 */

import type { Provider } from '../types';
import type { Playlist } from '../../models/playlist';
import { ProviderError } from '../../models/playlist';
import { matchesKugouInput, extractKugouTarget } from './input';
import { fetchKugouPlaylist, type KugouAuthCredentials } from './client';

export const kugouProvider: Provider = {
  name: 'kugou',

  matches(input: string): boolean {
    return matchesKugouInput(input);
  },

  extractId(input: string): string | null {
    const trimmed = input.trim();
    const gcidMatch = trimmed.match(/(?:songlist\/|src_cid=)?(gcid_[a-zA-Z0-9]+)/i);
    if (gcidMatch) return gcidMatch[1];
    const specialMatch = trimmed.match(/special\/single\/(\d+)/i);
    if (specialMatch) return specialMatch[1];
    if (/^gcid_[a-zA-Z0-9]+$/i.test(trimmed)) return trimmed;
    return null;
  },

  async parse(inputOrId: string, auth?: KugouAuthCredentials): Promise<Playlist> {
    const target = await extractKugouTarget(inputOrId);
    if (!target) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Could not extract a valid Kugou songlist ID or link from the provided input.',
        400,
      );
    }
    return fetchKugouPlaylist(target, auth);
  },
};

export * from './input';
export * from './client';
export * from './normalize';
export * from './auth';
export * from './crypto';
