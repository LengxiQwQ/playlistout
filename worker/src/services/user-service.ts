/**
 * Shared User Playlists Service
 * Encapsulates user playlist fetching driven by ProviderRegistry & capabilities.
 */

import { type UserPlaylistsData, ProviderError } from '../models/playlist';
import { providerRegistry, type MusicProvider, type SupportedPlatform } from '../providers';
import { extractCleanUrlOrInput } from '../utils/clean-url';

export interface UserServiceOptions {
  rawInput: string;
  platformParam?: string | null;
  auth?: {
    token?: string;
    userid?: string;
  };
}

export interface UserServiceResult {
  userData: UserPlaylistsData;
  platform: SupportedPlatform;
}

export async function fetchUserPlaylistsService(
  options: UserServiceOptions,
): Promise<UserServiceResult> {
  const { rawInput, platformParam, auth } = options;

  if (!rawInput || rawInput.trim().length === 0) {
    throw new ProviderError('INVALID_INPUT', 'Missing or empty required query parameter: uin or uid', 400);
  }

  if (rawInput.length > 2048) {
    throw new ProviderError(
      'INVALID_INPUT',
      'Input parameter exceeds maximum allowed length of 2048 characters.',
      400,
    );
  }

  const cleanInput = extractCleanUrlOrInput(rawInput);
  const isNumeric = /^\d{4,20}$/.test(cleanInput.trim());

  let targetProvider: MusicProvider | null = null;

  if (platformParam && platformParam !== 'auto') {
    targetProvider = providerRegistry.get(platformParam) || null;
  } else if (!isNumeric) {
    targetProvider =
      providerRegistry.resolveUserProfile(cleanInput) ||
      providerRegistry.resolveByInput(cleanInput);
  }

  // Capability check: reject if provider is resolved and does not support user profiles
  if (targetProvider && !targetProvider.meta.capabilities.userProfile) {
    const name = targetProvider.meta.name;
    throw new ProviderError('INVALID_INPUT', `${name} does not support user profiles or user playlists export.`, 400);
  }

  // Auth requirement check (e.g. Kugou)
  if (targetProvider && targetProvider.meta.capabilities.userProfileRequiresAuth) {
    const token = auth?.token;
    const userid = auth?.userid;
    if (!token || !userid) {
      throw new ProviderError(
        'INVALID_INPUT',
        `${targetProvider.meta.name} user playlists require both token and userid passed via Authorization / X-${targetProvider.meta.id}-* headers from QR login.`,
        400,
        { authRequired: true, platform: targetProvider.meta.id },
      );
    }
  }

  // If a non-numeric provider is identified and supports user playlists, execute directly
  if (targetProvider && targetProvider.fetchUserPlaylists) {
    const userData = await targetProvider.fetchUserPlaylists(cleanInput, auth);
    return { userData, platform: targetProvider.meta.id };
  }

  // If numeric ID with no explicit platform, try QQ Music first, fallback to NetEase
  const qqProvider = providerRegistry.get('qqmusic')!;
  try {
    const userData = await qqProvider.fetchUserPlaylists!(cleanInput, auth);
    return { userData, platform: 'qqmusic' };
  } catch (err: unknown) {
    if (!platformParam && isNumeric) {
      try {
        const netease = providerRegistry.get('netease')!;
        const neteaseUserData = await netease.fetchUserPlaylists!(cleanInput.trim(), auth);
        return { userData: neteaseUserData, platform: 'netease' };
      } catch {
        // Fall through to original error
      }
    }
    throw err;
  }
}
