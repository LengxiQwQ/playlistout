/**
 * Shared User Playlists Service
 * Encapsulates user playlist fetching for QQ Music, NetEase Cloud Music, and KuGou Music.
 */

import { type UserPlaylistsData, ProviderError } from '../models/playlist';
import { extractQQNumber, fetchQQUserPlaylists } from '../providers/qqmusic';
import { extractNeteaseUserId, fetchNeteaseUserPlaylists, matchesNeteaseInput } from '../providers/netease';
import { fetchKugouUserPlaylists, kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';
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
  platform: 'qqmusic' | 'netease' | 'kugou';
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

  if (platformParam === 'qishui' || qishuiProvider.matches(cleanInput)) {
    throw new ProviderError('INVALID_INPUT', 'Qishui Music does not support user playlists export.', 400);
  }

  // Kugou User Playlists branch (requires token & userid via headers)
  if (platformParam === 'kugou' || kugouProvider.matches(cleanInput)) {
    const token = auth?.token;
    const userid = auth?.userid;
    if (!token || !userid) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Kugou user playlists require both token and userid passed via Authorization / X-Kugou-* headers from QR login.',
        400,
      );
    }

    const userData = await fetchKugouUserPlaylists(token, userid);
    return { userData, platform: 'kugou' };
  }

  const isNetease = matchesNeteaseInput(cleanInput) || platformParam === 'netease';

  if (isNetease) {
    const extractedUid = await extractNeteaseUserId(cleanInput);
    if (!extractedUid) {
      throw new ProviderError(
        'INVALID_INPUT',
        `The provided input is not a valid NetEase user ID or profile URL: "${cleanInput}"`,
        400,
      );
    }

    const userData = await fetchNeteaseUserPlaylists(extractedUid);
    return { userData, platform: 'netease' };
  }

  const extractedUin = extractQQNumber(cleanInput);
  if (!extractedUin) {
    throw new ProviderError(
      'INVALID_INPUT',
      `The provided input is not a valid QQ number or profile URL: "${cleanInput}"`,
      400,
    );
  }

  try {
    const userData = await fetchQQUserPlaylists(extractedUin);
    return { userData, platform: 'qqmusic' };
  } catch (err: unknown) {
    if (!platformParam && /^\d{4,18}$/.test(cleanInput.trim())) {
      try {
        const neteaseUserData = await fetchNeteaseUserPlaylists(cleanInput.trim());
        return { userData: neteaseUserData, platform: 'netease' };
      } catch {
        // Fall through to original error
      }
    }
    throw err;
  }
}
