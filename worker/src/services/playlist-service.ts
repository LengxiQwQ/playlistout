/**
 * Shared Playlist Service
 * Encapsulates single playlist fetching, platform resolution, validation,
 * error handling, and anonymous aggregate telemetry.
 */

import { type Playlist, ProviderError } from '../models/playlist';
import { qqMusicProvider } from '../providers/qqmusic';
import { neteaseProvider } from '../providers/netease';
import { kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';
import { extractCleanUrlOrInput } from '../utils/clean-url';
import { recordParseEvent } from '../analytics/recorder';
import { classifyInputType, classifyErrorCategory } from '../analytics/dimensions';

export interface PlaylistServiceOptions {
  rawInput: string;
  platformParam?: string | null;
  auth?: {
    token?: string;
    userid?: string;
  };
  request?: Request;
  db?: D1Database;
  ctx?: ExecutionContext;
  skipAnalytics?: boolean;
}

export interface PlaylistServiceResult {
  playlist: Playlist;
  platform: 'qqmusic' | 'netease' | 'kugou' | 'qishui';
}

export async function parsePlaylistService(
  options: PlaylistServiceOptions,
): Promise<PlaylistServiceResult> {
  const { rawInput, platformParam, auth, request, db, ctx } = options;

  if (!rawInput || rawInput.trim().length === 0) {
    throw new ProviderError('INVALID_INPUT', 'Missing or empty required playlist input.', 400);
  }

  if (rawInput.length > 2048) {
    throw new ProviderError(
      'INVALID_INPUT',
      'Input parameter exceeds maximum allowed length of 2048 characters.',
      400,
    );
  }

  const playlistInput = extractCleanUrlOrInput(rawInput);

  // Check provider matching
  let matchedProvider:
    | typeof qqMusicProvider
    | typeof neteaseProvider
    | typeof kugouProvider
    | typeof qishuiProvider
    | null = null;
  let targetPlatform: 'qqmusic' | 'netease' | 'kugou' | 'qishui' = 'qqmusic';

  if (kugouProvider.matches(playlistInput)) {
    matchedProvider = kugouProvider;
    targetPlatform = 'kugou';
  } else if (qishuiProvider.matches(playlistInput)) {
    matchedProvider = qishuiProvider;
    targetPlatform = 'qishui';
  } else if (neteaseProvider.matches(playlistInput)) {
    matchedProvider = neteaseProvider;
    targetPlatform = 'netease';
  } else if (/^\d{4,20}$/.test(playlistInput.trim())) {
    if (platformParam === 'kugou') {
      matchedProvider = kugouProvider;
      targetPlatform = 'kugou';
    } else if (platformParam === 'qishui') {
      matchedProvider = qishuiProvider;
      targetPlatform = 'qishui';
    } else if (platformParam === 'netease') {
      matchedProvider = neteaseProvider;
      targetPlatform = 'netease';
    } else if (playlistInput.trim().length >= 19) {
      matchedProvider = qishuiProvider;
      targetPlatform = 'qishui';
    } else {
      matchedProvider = qqMusicProvider;
      targetPlatform = 'qqmusic';
    }
  } else if (qqMusicProvider.matches(playlistInput)) {
    matchedProvider = qqMusicProvider;
    targetPlatform = 'qqmusic';
  }

  if (!matchedProvider) {
    throw new ProviderError(
      'UNSUPPORTED_URL',
      'The provided URL is not a supported QQ Music, NetEase Cloud Music, KuGou Music, or Qishui Music playlist URL.',
      400,
    );
  }

  // If a specific platform constraint was passed and the input URL belongs to another platform, reject with 400
  if (
    platformParam &&
    platformParam !== 'auto' &&
    !/^\d{4,20}$/.test(playlistInput.trim()) &&
    targetPlatform !== platformParam
  ) {
    throw new ProviderError(
      'INVALID_INPUT',
      `Input URL belongs to "${targetPlatform}", which conflicts with specified platform constraint "${platformParam}".`,
      400,
    );
  }

  const startTime = Date.now();
  const inputType = classifyInputType(playlistInput);

  try {
    let playlist: Playlist;
    let actualPlatform: 'qqmusic' | 'netease' | 'kugou' | 'qishui' = targetPlatform;
    let providerPath: ('primary' | 'fallback') | undefined;

    try {
      if (matchedProvider === kugouProvider) {
        playlist = await kugouProvider.parse(playlistInput, {
          token: auth?.token,
          userid: auth?.userid,
        });
        actualPlatform = 'kugou';
      } else {
        playlist = await matchedProvider.parse(playlistInput);
        actualPlatform = (playlist.platform as 'qqmusic' | 'netease' | 'kugou' | 'qishui') || targetPlatform;
        providerPath = (playlist as any).__providerPath as ('primary' | 'fallback') | undefined;
      }
    } catch (err: unknown) {
      if (
        !platformParam &&
        /^\d{4,20}$/.test(playlistInput.trim()) &&
        matchedProvider === qqMusicProvider
      ) {
        playlist = await neteaseProvider.parse(playlistInput);
        actualPlatform = 'netease';
      } else {
        throw err;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Best-effort anonymous statistics recording (success)
    if (!options.skipAnalytics && ctx && typeof ctx.waitUntil === 'function' && request) {
      ctx.waitUntil(
        recordParseEvent(db, {
          request,
          platform: actualPlatform,
          inputType,
          success: true,
          trackCount: playlist.tracks.length,
          latencyMs,
          providerPath,
        }),
      );
    }

    return { playlist, platform: actualPlatform };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorCode = err instanceof ProviderError ? err.code : 'INTERNAL_ERROR';
    const errorCategory = classifyErrorCategory(errorCode);

    // Best-effort anonymous statistics recording (failure)
    if (!options.skipAnalytics && ctx && typeof ctx.waitUntil === 'function' && request) {
      ctx.waitUntil(
        recordParseEvent(db, {
          request,
          platform: targetPlatform,
          inputType,
          success: false,
          errorCategory,
          latencyMs,
        }),
      );
    }

    throw err;
  }
}
