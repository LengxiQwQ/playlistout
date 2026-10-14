/**
 * Shared Playlist Service
 * Encapsulates single playlist fetching, platform resolution, validation,
 * error handling, and anonymous aggregate telemetry.
 */

import { type Playlist, ProviderError } from '../models/playlist';
import { providerRegistry, type MusicProvider, type SupportedPlatform } from '../providers';
import { extractCleanUrlOrInput } from '../utils/clean-url';
import { recordResolveV2 } from '../analytics/v2-recorder';
import { classifyInputType, classifyErrorCategory } from '../analytics/dimensions';

export interface PlaylistServiceOptions {
  rawInput: string;
  platformParam?: string | null;
  channel?: 'qishui' | 'douyin' | string | null;
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
  platform: SupportedPlatform;
}

export async function parsePlaylistService(
  options: PlaylistServiceOptions,
): Promise<PlaylistServiceResult> {
  const { rawInput, platformParam, auth, request, db, ctx } = options;

  // Sample requests (triggered by website example links) are excluded from analytics
  const isSampleRequest = request?.headers.get('x-sample-request') === '1';
  const shouldSkipAnalytics = options.skipAnalytics || isSampleRequest;

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
  const isNumeric = /^\d{4,20}$/.test(playlistInput.trim());

  let matchedProvider: MusicProvider | null = null;
  let targetPlatform: SupportedPlatform = 'qqmusic';

  if (!isNumeric) {
    matchedProvider = providerRegistry.resolveByInput(playlistInput);
    if (matchedProvider) {
      targetPlatform = matchedProvider.meta.id;
    }
  } else {
    if (platformParam && platformParam !== 'auto') {
      const explicit = providerRegistry.get(platformParam);
      if (explicit) {
        matchedProvider = explicit;
        targetPlatform = explicit.meta.id;
      }
    } else if (playlistInput.trim().length >= 19) {
      matchedProvider = providerRegistry.get('qishui') || null;
      targetPlatform = 'qishui';
    } else {
      matchedProvider = providerRegistry.get('qqmusic') || null;
      targetPlatform = 'qqmusic';
    }
  }

  if (!matchedProvider) {
    throw new ProviderError(
      'UNSUPPORTED_URL',
      'The provided URL is not a supported QQ Music, NetEase Cloud Music, KuGou Music, Qishui Music, or Kuwo Music playlist URL.',
      400,
    );
  }

  // If a specific platform constraint was passed and the input URL belongs to another platform, reject with 400
  if (
    platformParam &&
    platformParam !== 'auto' &&
    !isNumeric &&
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
    let actualPlatform: SupportedPlatform = targetPlatform;
    let providerPath: ('primary' | 'fallback') | undefined;

    try {
      playlist = await matchedProvider.fetchPlaylist(playlistInput, {
        channel: options.channel || undefined,
        token: auth?.token,
        userid: auth?.userid,
      });
      actualPlatform = (playlist.platform as SupportedPlatform) || targetPlatform;
      providerPath = (playlist as any).__providerPath as ('primary' | 'fallback') | undefined;
    } catch (err: unknown) {
      if (
        !platformParam &&
        isNumeric &&
        targetPlatform === 'qqmusic'
      ) {
        const netease = providerRegistry.get('netease');
        if (netease) {
          playlist = await netease.fetchPlaylist(playlistInput);
          actualPlatform = 'netease';
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Best-effort anonymous statistics recording (success)
    if (!shouldSkipAnalytics && ctx && typeof ctx.waitUntil === 'function' && request) {
      ctx.waitUntil(
        recordResolveV2(db, {
          request,
          platform: actualPlatform,
          outcome: 'success_playlist',
          trackCount: playlist.tracks.length,
          latencyMs,
          inputType,
          requestedType: 'playlist',
          requestedPlatform: platformParam || 'auto',
          providerFailurePath: providerPath,
          endpoint: 'playlist',
        }),
      );
    }

    return { playlist, platform: actualPlatform };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const errorCode = err instanceof ProviderError ? err.code : 'INTERNAL_ERROR';
    const errorCategory = classifyErrorCategory(errorCode);

    // Best-effort anonymous statistics recording (failure)
    if (!shouldSkipAnalytics && ctx && typeof ctx.waitUntil === 'function' && request) {
      ctx.waitUntil(
        recordResolveV2(db, {
          request,
          platform: targetPlatform,
          outcome: 'failure',
          latencyMs,
          inputType,
          requestedType: 'playlist',
          requestedPlatform: platformParam || 'auto',
          failureCode: errorCode,
          failureClass: errorCategory,
          failureStage: 'playlist_resolution',
          endpoint: 'playlist',
        }),
      );
    }

    throw err;
  }
}
