/**
 * Universal Input Resolver Service (Public API v1)
 *
 * Implements the core product behavior of PlaylistOut's main search box on the server:
 * 1. Cleans input (strips promotional text, emojis, boundaries)
 * 2. Identifies input kind (single playlist, user profile, short link, numeric ID)
 * 3. Identifies platform (QQ Music, NetEase Cloud Music, KuGou, Qishui)
 * 4. Resolves explicit disambiguation parameters (type, platform)
 * 5. Executes concurrent probing for ambiguous numeric IDs (returning 409 AMBIGUOUS_INPUT with candidates if conflicting)
 * 6. Dispatches to shared playlist/user services
 * 7. Returns normalized envelope: { kind, platform, result }
 *
 * R7 OBSERVABILITY & PRIVACY RULES:
 * - Exactly once: Every resolve request produces exactly one final outcome (success_playlist, success_user, or failure).
 * - Internal probes remain silent (skipAnalytics: true) and never pollute failure counts.
 * - Bounded dimensions only: no raw q, URLs, IDs, tokens, or error messages stored.
 */

import {
  type Playlist,
  type UserPlaylistsData,
  type DisambiguationCandidate,
  type ResolveData,
  ProviderError,
} from '../models/playlist';
import { parsePlaylistService } from './playlist-service';
import { fetchUserPlaylistsService } from './user-service';
import { extractCleanUrlOrInput } from '../utils/clean-url';
import { qqMusicProvider } from '../providers/qqmusic';
import { neteaseProvider } from '../providers/netease';
import { kugouProvider } from '../providers/kugou';
import { qishuiProvider } from '../providers/qishui';
import { recordParseEvent, recordResolveOutcome } from '../analytics/recorder';
import {
  classifyInputType,
  classifyResolveFailureCode,
  classifyResolveFailureClass,
  classifyResolveFailureStage,
  classifyResolveRequestedType,
  classifyResolveRequestedPlatform,
  classifyAnalyticsPlatform,
  classifyProviderFailurePath,
} from '../analytics/dimensions';
import type {
  ResolveOutcome,
  ResolveFailureStage,
  ResolveRequestedType,
  ResolveRequestedPlatform,
  AnalyticsPlatform,
  ProviderFailurePath,
} from '../analytics/types';

export interface ResolveServiceOptions {
  q: string;
  type?: string | null;
  platform?: string | null;
  auth?: {
    token?: string;
    userid?: string;
  };
  request?: Request;
  db?: D1Database;
  ctx?: ExecutionContext;
}

export type SupportedType = 'auto' | 'playlist' | 'user';
export type SupportedPlatform = 'auto' | 'qqmusic' | 'netease' | 'kugou' | 'qishui';

interface ResolveTracking {
  stage: ResolveFailureStage;
  platform: AnalyticsPlatform;
  requestedType: ResolveRequestedType;
  requestedPlatform: ResolveRequestedPlatform;
  providerFailurePath?: ProviderFailurePath;
}

interface ProbeResultWithPlatform {
  platform: AnalyticsPlatform;
  result: PromiseSettledResult<any>;
}

function isNegativeProbeError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    return (
      err.code === 'PLAYLIST_NOT_FOUND' ||
      err.code === 'USER_NOT_FOUND' ||
      err.code === 'INVALID_INPUT' ||
      err.code === 'UNSUPPORTED_URL' ||
      err.statusCode === 404 ||
      err.statusCode === 400
    );
  }
  return false;
}

function findPropagatableProbeWithPlatform(
  probes: ProbeResultWithPlatform[],
): { error: unknown; platform: AnalyticsPlatform } | null {
  const rejected = probes
    .filter((p): p is { platform: AnalyticsPlatform; result: PromiseRejectedResult } => p.result.status === 'rejected')
    .map((p) => ({ platform: p.platform, error: p.result.reason }));

  // 1. Prioritize explicit upstream operational errors (502, 504, 500)
  const operational = rejected.find(
    (entry) =>
      entry.error instanceof ProviderError &&
      (entry.error.code === 'UPSTREAM_ERROR' ||
        entry.error.code === 'UPSTREAM_TIMEOUT' ||
        entry.error.code === 'PARSE_ERROR' ||
        (typeof entry.error.statusCode === 'number' && entry.error.statusCode >= 500)),
  );
  if (operational) return operational;

  // 2. Next check for any unexpected non-negative errors (e.g. bare Error, network crash)
  const unexpected = rejected.find((entry) => !isNegativeProbeError(entry.error));
  if (unexpected) return unexpected;

  return null;
}

function recordResolveSuccess(
  request: Request | undefined,
  db: D1Database | undefined,
  ctx: ExecutionContext | undefined,
  rawInput: string,
  startTime: number,
  data: ResolveData,
  tracking: ResolveTracking,
): ResolveData {
  const latencyMs = Date.now() - startTime;
  const inputType = classifyInputType(rawInput);
  const platform = classifyAnalyticsPlatform(data.platform);
  const outcome: ResolveOutcome = data.kind === 'playlist' ? 'success_playlist' : 'success_user';

  const runAsync = (promise: Promise<unknown>) => {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(promise);
    } else {
      promise.catch(() => {});
    }
  };

  // 1. Authoritative final resolve outcome
  runAsync(
    recordResolveOutcome(db, {
      request,
      outcome,
      platform,
      requestedType: tracking.requestedType,
      requestedPlatform: tracking.requestedPlatform,
      inputType,
    }),
  );

  // 2. If it is a playlist, ALSO record parse event (parse_success + tracks_processed)
  if (data.kind === 'playlist' && request) {
    const playlist = data.result as Playlist;
    const providerPath = (playlist as any).__providerPath as ('primary' | 'fallback') | undefined;
    runAsync(
      recordParseEvent(db, {
        request,
        platform: data.platform,
        inputType,
        success: true,
        trackCount: playlist.tracks.length,
        latencyMs,
        providerPath,
      }),
    );
  }

  return data;
}

function recordResolveFailure(
  request: Request | undefined,
  db: D1Database | undefined,
  ctx: ExecutionContext | undefined,
  rawInput: string,
  startTime: number,
  err: unknown,
  tracking: ResolveTracking,
): void {
  if (!db) return;

  const errTelemetry = err instanceof ProviderError ? err.telemetry : undefined;
  const rawCode = err instanceof ProviderError ? err.code : 'INTERNAL_ERROR';
  const failureCode = classifyResolveFailureCode(rawCode);
  const failureClass = classifyResolveFailureClass(failureCode);
  const failureStage = classifyResolveFailureStage(errTelemetry?.stage || tracking.stage);
  const platform = classifyAnalyticsPlatform(errTelemetry?.platform || tracking.platform);
  const providerFailurePath = classifyProviderFailurePath(
    errTelemetry?.providerFailurePath || tracking.providerFailurePath,
  );
  const inputType = classifyInputType(rawInput || '');

  const runAsync = (promise: Promise<unknown>) => {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(promise);
    } else {
      promise.catch(() => {});
    }
  };

  runAsync(
    recordResolveOutcome(db, {
      request,
      outcome: 'failure',
      platform,
      requestedType: tracking.requestedType,
      requestedPlatform: tracking.requestedPlatform,
      inputType,
      failureCode,
      failureClass,
      failureStage,
      providerFailurePath: providerFailurePath !== 'not_applicable' ? providerFailurePath : undefined,
    }),
  );
}

/**
 * Universal resolve service entry point with authoritative telemetry wrapping.
 */
export async function resolveService(
  options: ResolveServiceOptions,
): Promise<ResolveData> {
  const { q, type, platform, request, db, ctx } = options;
  const startTime = Date.now();

  const tracking: ResolveTracking = {
    stage: 'input_validation',
    platform: 'unknown',
    requestedType: classifyResolveRequestedType(type),
    requestedPlatform: classifyResolveRequestedPlatform(platform),
  };

  // Sample requests (triggered by website example links) are excluded from analytics
  const isSampleRequest = request?.headers.get('x-sample-request') === '1';
  if (isSampleRequest) {
    return resolveServiceCore(options, tracking);
  }

  try {
    const data = await resolveServiceCore(options, tracking);
    return recordResolveSuccess(request, db, ctx, q || '', startTime, data, tracking);
  } catch (err: unknown) {
    recordResolveFailure(request, db, ctx, q || '', startTime, err, tracking);
    throw err;
  }
}

/**
 * Internal resolver core execution.
 */
async function resolveServiceCore(
  options: ResolveServiceOptions,
  tracking: ResolveTracking,
): Promise<ResolveData> {
  const { q, type, platform, auth, request, db, ctx } = options;

  if (!q || q.trim().length === 0) {
    throw new ProviderError('INVALID_INPUT', 'Missing or empty required query parameter: q', 400);
  }

  if (q.length > 2048) {
    throw new ProviderError(
      'INVALID_INPUT',
      'Input parameter q exceeds maximum allowed length of 2048 characters.',
      400,
    );
  }

  // Type parameter validation
  const rawType = (type || 'auto').toLowerCase().trim();
  let normalizedType: SupportedType = 'auto';
  if (rawType === 'playlist') {
    normalizedType = 'playlist';
    tracking.requestedType = 'playlist';
  } else if (rawType === 'user' || rawType === 'user_playlists') {
    normalizedType = 'user';
    tracking.requestedType = 'user';
  } else if (rawType === 'auto') {
    normalizedType = 'auto';
    tracking.requestedType = 'auto';
  } else {
    tracking.requestedType = 'unknown';
    throw new ProviderError(
      'INVALID_INPUT',
      `Invalid type parameter "${type}". Supported types: auto, playlist, user.`,
      400,
    );
  }

  // Platform parameter validation
  const rawPlatform = (platform || 'auto').toLowerCase().trim();
  let normalizedPlatform: SupportedPlatform = 'auto';
  if (
    rawPlatform === 'auto' ||
    rawPlatform === 'qqmusic' ||
    rawPlatform === 'netease' ||
    rawPlatform === 'kugou' ||
    rawPlatform === 'qishui'
  ) {
    normalizedPlatform = rawPlatform;
    tracking.requestedPlatform = rawPlatform;
    if (rawPlatform !== 'auto') {
      tracking.platform = rawPlatform;
    }
  } else {
    tracking.requestedPlatform = 'unknown';
    throw new ProviderError(
      'UNSUPPORTED_PLATFORM',
      `Unsupported platform "${platform}". Supported platforms: auto, qqmusic, netease, kugou, qishui.`,
      400,
    );
  }

  const cleanInput = extractCleanUrlOrInput(q);
  const trimmed = cleanInput.trim();

  // ── Input platform & type contract validation ──
  let detectedPlatform: SupportedPlatform | null = null;
  if (/(?:y\.qq\.com|music\.qq\.com)/i.test(trimmed)) {
    detectedPlatform = 'qqmusic';
  } else if (/(?:music\.163\.com|163cn\.tv)/i.test(trimmed)) {
    detectedPlatform = 'netease';
  } else if (/(?:kugou\.com)/i.test(trimmed)) {
    detectedPlatform = 'kugou';
  } else if (/(?:qishui\.douyin\.com)/i.test(trimmed)) {
    detectedPlatform = 'qishui';
  }

  if (detectedPlatform) {
    tracking.platform = detectedPlatform;
  }

  // Reject platform constraint conflict
  if (detectedPlatform && normalizedPlatform !== 'auto' && detectedPlatform !== normalizedPlatform) {
    throw new ProviderError(
      'INVALID_INPUT',
      `Input URL belongs to "${detectedPlatform}", which conflicts with specified platform constraint "${normalizedPlatform}".`,
      400,
    );
  }

  // Qishui does not support user profiles
  if (normalizedPlatform === 'qishui' && normalizedType === 'user') {
    throw new ProviderError('INVALID_INPUT', 'Qishui Music does not support user profiles or user playlists.', 400);
  }

  // Detect explicit user profile URLs
  const isQQPlaylistCandidate =
    /(?:playlist|taoge|playsquare)/i.test(trimmed) ||
    /[?&](?:id|disstid|dissid|tid)=\d+/i.test(trimmed);

  const isQQProfile =
    /(?:y\.qq\.com|music\.qq\.com)/i.test(trimmed) &&
    (/(?:portal\/profile|\/profile)/i.test(trimmed) ||
      (/(?:[?&]uin=|[?&]hostuin=)/i.test(trimmed) && !isQQPlaylistCandidate));
  const isNeteaseProfile =
    /(?:music\.163\.com|y\.music\.163\.com)/i.test(trimmed) &&
    (/\/user\//i.test(trimmed) || (/[?&]id=\d+/i.test(trimmed) && /user/i.test(trimmed)));
  const isKugouProfile =
    /kugou\.com/i.test(trimmed) &&
    !/(?:songlist|gcid_|special\/single)/i.test(trimmed) &&
    (/\/user/i.test(trimmed) || /\/profile/i.test(trimmed) || /\/home/i.test(trimmed));

  const isExplicitProfile = isQQProfile || isNeteaseProfile || isKugouProfile;

  // Reject if type constraint conflicts with detected URL type
  if (normalizedType === 'playlist' && isExplicitProfile) {
    throw new ProviderError(
      'INVALID_INPUT',
      'Input URL is a user profile, which conflicts with specified type constraint "playlist".',
      400,
    );
  }

  const isKugouPlaylist =
    /kugou\.com/i.test(trimmed) &&
    (/(?:songlist|gcid_|special\/single)/i.test(trimmed) || /src_cid=[a-zA-Z0-9]+/i.test(trimmed));

  const isExplicitPlaylist =
    (/(?:y\.qq\.com|music\.qq\.com)\/.*(?:playlist|taoge|playsquare)/i.test(trimmed) ||
      (/(?:y\.qq\.com|music\.qq\.com)\/.*[?&](?:id|disstid|dissid|tid)=\d+/i.test(trimmed) && !isQQProfile)) ||
    (/music\.163\.com\/.*playlist/i.test(trimmed)) ||
    isKugouPlaylist ||
    (qishuiProvider.matches(trimmed));

  if (normalizedType === 'user' && isExplicitPlaylist) {
    throw new ProviderError(
      'INVALID_INPUT',
      'Input URL is a playlist, which conflicts with specified type constraint "user".',
      400,
    );
  }

  // Check if input is pure numeric ID (4-20 digits)
  const isNumeric = /^\d{4,20}$/.test(trimmed);

  if (!isNumeric) {
    // ── Non-numeric input routing ──
    tracking.stage = 'routing';

    // 1. Detect explicit user profile URLs
    if (isQQProfile || (detectedPlatform === 'qqmusic' && normalizedType === 'user')) {
      tracking.stage = 'user_resolution';
      tracking.platform = 'qqmusic';
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: 'qqmusic',
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    if (isNeteaseProfile || (detectedPlatform === 'netease' && normalizedType === 'user')) {
      tracking.stage = 'user_resolution';
      tracking.platform = 'netease';
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: 'netease',
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    if (isKugouProfile || (detectedPlatform === 'kugou' && normalizedType === 'user')) {
      tracking.stage = 'user_resolution';
      tracking.platform = 'kugou';
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: 'kugou',
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    // 2. Short links resolution
    if (/163cn\.tv/i.test(trimmed)) {
      tracking.stage = 'short_link_resolution';
      tracking.platform = 'netease';
      if (normalizedType === 'user') {
        const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
          rawInput: trimmed,
          platformParam: 'netease',
          auth,
        });
        return { kind: 'user_playlists', platform: actualPlatform, result: userData };
      }
      if (normalizedType === 'playlist') {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: 'netease',
          auth,
          request,
          db,
          ctx,
          skipAnalytics: true,
        });
        return { kind: 'playlist', platform: actualPlatform, result: playlist };
      }
      // auto: try single playlist first, fallback to user playlists
      try {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: 'netease',
          auth,
          request,
          db,
          ctx,
          skipAnalytics: true,
        });
        return { kind: 'playlist', platform: actualPlatform, result: playlist };
      } catch (playlistErr: unknown) {
        if (!isNegativeProbeError(playlistErr)) {
          throw playlistErr;
        }
        try {
          const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
            rawInput: trimmed,
            platformParam: 'netease',
            auth,
          });
          return { kind: 'user_playlists', platform: actualPlatform, result: userData };
        } catch (userErr: unknown) {
          if (!isNegativeProbeError(userErr)) {
            throw userErr;
          }
          throw new ProviderError(
            'PLAYLIST_NOT_FOUND',
            'Failed to resolve NetEase short link as playlist or user profile.',
            404,
          );
        }
      }
    }

    if (/t\d?\.kugou\.com/i.test(trimmed)) {
      tracking.stage = 'short_link_resolution';
      tracking.platform = 'kugou';
      if (normalizedType === 'user') {
        const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
          rawInput: trimmed,
          platformParam: 'kugou',
          auth,
        });
        return { kind: 'user_playlists', platform: actualPlatform, result: userData };
      }
      try {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: 'kugou',
          auth,
          request,
          db,
          ctx,
          skipAnalytics: true,
        });
        return { kind: 'playlist', platform: actualPlatform, result: playlist };
      } catch (err: unknown) {
        if (!isNegativeProbeError(err)) {
          throw err;
        }
        if (auth?.token && auth?.userid) {
          try {
            const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
              rawInput: trimmed,
              platformParam: 'kugou',
              auth,
            });
            return { kind: 'user_playlists', platform: actualPlatform, result: userData };
          } catch (userErr: unknown) {
            if (!isNegativeProbeError(userErr)) {
              throw userErr;
            }
            // fall through
          }
        }
        throw err;
      }
    }

    if (/qishui\.douyin\.com\/s\//i.test(trimmed)) {
      tracking.stage = 'short_link_resolution';
      tracking.platform = 'qishui';
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'qishui',
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    }

    // 3. Known single playlist URLs
    tracking.stage = 'playlist_resolution';
    const platformParam = normalizedPlatform !== 'auto' ? normalizedPlatform : null;
    const { playlist, platform: actualPlatform } = await parsePlaylistService({
      rawInput: trimmed,
      platformParam,
      auth,
      request,
      db,
      ctx,
      skipAnalytics: true,
    });
    return { kind: 'playlist', platform: actualPlatform, result: playlist };
  }

  // ── Numeric input routing & disambiguation ──

  // Case 1: Explicit type AND explicit platform
  if (normalizedType !== 'auto' && normalizedPlatform !== 'auto') {
    tracking.platform = normalizedPlatform;
    if (normalizedType === 'playlist') {
      tracking.stage = 'playlist_resolution';
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: normalizedPlatform,
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    } else {
      tracking.stage = 'user_resolution';
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: normalizedPlatform,
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }
  }

  // Case 2: Explicit platform, auto type -> Probe single vs user within that platform
  if (normalizedPlatform !== 'auto' && normalizedType === 'auto') {
    tracking.platform = normalizedPlatform;
    if (normalizedPlatform === 'qishui') {
      tracking.stage = 'playlist_resolution';
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'qishui',
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    }

    if (normalizedPlatform === 'kugou') {
      if (auth?.token && auth?.userid) {
        tracking.stage = 'disambiguation_probe';
        const [singleRes, userRes] = await Promise.allSettled([
          parsePlaylistService({ rawInput: trimmed, platformParam: 'kugou', auth, request, db, ctx, skipAnalytics: true }),
          fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'kugou', auth }),
        ]);

        const candidates: DisambiguationCandidate[] = [];
        if (singleRes.status === 'fulfilled') {
          candidates.push({
            id: singleRes.value.playlist.id,
            kind: 'playlist',
            platform: 'kugou',
            title: singleRes.value.playlist.name,
            subtitle: `创建者: ${singleRes.value.playlist.creator || '未知'}`,
            trackCount: singleRes.value.playlist.trackCount,
            coverUrl: singleRes.value.playlist.coverUrl,
          });
        }
        if (userRes.status === 'fulfilled' && userRes.value.userData.playlists.length > 0) {
          candidates.push({
            id: userRes.value.userData.userId,
            kind: 'user_playlists',
            platform: 'kugou',
            title: userRes.value.userData.nickname || `酷狗用户 (${trimmed})`,
            subtitle: `包含 ${userRes.value.userData.total || userRes.value.userData.playlists.length} 个公开歌单`,
            trackCount: userRes.value.userData.total || userRes.value.userData.playlists.length,
            coverUrl: userRes.value.userData.playlists[0]?.coverUrl,
          });
        }

        if (candidates.length > 1) {
          throw new ProviderError(
            'AMBIGUOUS_INPUT',
            'Numeric ID matched both KuGou playlist and user profile. Please specify &type=playlist or &type=user to disambiguate.',
            409,
            { candidates },
          );
        }
        if (singleRes.status === 'fulfilled') {
          return { kind: 'playlist', platform: 'kugou', result: singleRes.value.playlist };
        }
        if (userRes.status === 'fulfilled') {
          return { kind: 'user_playlists', platform: 'kugou', result: userRes.value.userData };
        }

        const probeList: ProbeResultWithPlatform[] = [
          { platform: 'kugou', result: singleRes },
          { platform: 'kugou', result: userRes },
        ];
        const propagatable = findPropagatableProbeWithPlatform(probeList);
        if (propagatable) {
          if (propagatable.error instanceof ProviderError) {
            propagatable.error.telemetry = {
              platform: propagatable.platform,
              stage: 'disambiguation_probe',
              ...propagatable.error.telemetry,
            };
          }
          throw propagatable.error;
        }

        throw new ProviderError('PLAYLIST_NOT_FOUND', `Target with ID "${trimmed}" not found on KuGou.`, 404);
      }

      tracking.stage = 'playlist_resolution';
      const { playlist, platform: actualPlatform } = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'kugou',
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      });
      return { kind: 'playlist', platform: actualPlatform, result: playlist };
    }

    if (normalizedPlatform === 'qqmusic') {
      tracking.stage = 'disambiguation_probe';
      const [singleRes, userRes] = await Promise.allSettled([
        parsePlaylistService({ rawInput: trimmed, platformParam: 'qqmusic', auth, request, db, ctx, skipAnalytics: true }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      if (singleRes.status === 'fulfilled') {
        candidates.push({
          id: singleRes.value.playlist.id,
          kind: 'playlist',
          platform: 'qqmusic',
          title: singleRes.value.playlist.name,
          subtitle: `创建者: ${singleRes.value.playlist.creator || '未知'}`,
          trackCount: singleRes.value.playlist.trackCount,
          coverUrl: singleRes.value.playlist.coverUrl,
        });
      }
      if (userRes.status === 'fulfilled' && userRes.value.userData.playlists.length > 0) {
        candidates.push({
          id: userRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'qqmusic',
          title: userRes.value.userData.nickname || `QQ 用户 (${trimmed})`,
          subtitle: `包含 ${userRes.value.userData.total || userRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: userRes.value.userData.total || userRes.value.userData.playlists.length,
          coverUrl: userRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched both QQ Music playlist and QQ user profile. Please specify &type=playlist or &type=user to disambiguate.',
          409,
          { candidates },
        );
      }
      if (singleRes.status === 'fulfilled') {
        return { kind: 'playlist', platform: 'qqmusic', result: singleRes.value.playlist };
      }
      if (userRes.status === 'fulfilled') {
        return { kind: 'user_playlists', platform: 'qqmusic', result: userRes.value.userData };
      }

      const probeList: ProbeResultWithPlatform[] = [
        { platform: 'qqmusic', result: singleRes },
        { platform: 'qqmusic', result: userRes },
      ];
      const propagatable = findPropagatableProbeWithPlatform(probeList);
      if (propagatable) {
        if (propagatable.error instanceof ProviderError) {
          propagatable.error.telemetry = {
            platform: propagatable.platform,
            stage: 'disambiguation_probe',
            ...propagatable.error.telemetry,
          };
        }
        throw propagatable.error;
      }

      throw new ProviderError('PLAYLIST_NOT_FOUND', `Target with ID "${trimmed}" not found on QQ Music.`, 404);
    }

    if (normalizedPlatform === 'netease') {
      tracking.stage = 'disambiguation_probe';
      const [singleRes, userRes] = await Promise.allSettled([
        parsePlaylistService({ rawInput: trimmed, platformParam: 'netease', auth, request, db, ctx, skipAnalytics: true }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      if (singleRes.status === 'fulfilled') {
        candidates.push({
          id: singleRes.value.playlist.id,
          kind: 'playlist',
          platform: 'netease',
          title: singleRes.value.playlist.name,
          subtitle: `创建者: ${singleRes.value.playlist.creator || '未知'}`,
          trackCount: singleRes.value.playlist.trackCount,
          coverUrl: singleRes.value.playlist.coverUrl,
        });
      }
      if (userRes.status === 'fulfilled' && userRes.value.userData.playlists.length > 0) {
        candidates.push({
          id: userRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'netease',
          title: userRes.value.userData.nickname || `网易云用户 (${trimmed})`,
          subtitle: `包含 ${userRes.value.userData.total || userRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: userRes.value.userData.total || userRes.value.userData.playlists.length,
          coverUrl: userRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched both NetEase playlist and NetEase user profile. Please specify &type=playlist or &type=user to disambiguate.',
          409,
          { candidates },
        );
      }
      if (singleRes.status === 'fulfilled') {
        return { kind: 'playlist', platform: 'netease', result: singleRes.value.playlist };
      }
      if (userRes.status === 'fulfilled') {
        return { kind: 'user_playlists', platform: 'netease', result: userRes.value.userData };
      }

      const probeList: ProbeResultWithPlatform[] = [
        { platform: 'netease', result: singleRes },
        { platform: 'netease', result: userRes },
      ];
      const propagatable = findPropagatableProbeWithPlatform(probeList);
      if (propagatable) {
        if (propagatable.error instanceof ProviderError) {
          propagatable.error.telemetry = {
            platform: propagatable.platform,
            stage: 'disambiguation_probe',
            ...propagatable.error.telemetry,
          };
        }
        throw propagatable.error;
      }

      throw new ProviderError('PLAYLIST_NOT_FOUND', `Target with ID "${trimmed}" not found on NetEase Cloud Music.`, 404);
    }
  }

  // Case 3: Explicit type, auto platform -> Probe cross-platform
  if (normalizedType !== 'auto' && normalizedPlatform === 'auto') {
    tracking.stage = 'disambiguation_probe';
    if (normalizedType === 'playlist') {
      const probeTasks: Array<{ platform: AnalyticsPlatform; task: Promise<any> }> = [
        { platform: 'qqmusic', task: parsePlaylistService({ rawInput: trimmed, platformParam: 'qqmusic', auth, request, db, ctx, skipAnalytics: true }) },
        { platform: 'netease', task: parsePlaylistService({ rawInput: trimmed, platformParam: 'netease', auth, request, db, ctx, skipAnalytics: true }) },
      ];
      if (trimmed.length >= 19) {
        probeTasks.push({
          platform: 'qishui',
          task: parsePlaylistService({ rawInput: trimmed, platformParam: 'qishui', auth, request, db, ctx, skipAnalytics: true }),
        });
      }

      const settled = await Promise.allSettled(probeTasks.map((t) => t.task));
      const probeList: ProbeResultWithPlatform[] = probeTasks.map((t, idx) => ({
        platform: t.platform,
        result: settled[idx],
      }));

      const candidates: DisambiguationCandidate[] = [];
      const successful: { platform: 'qqmusic' | 'netease' | 'qishui'; playlist: Playlist }[] = [];

      for (let i = 0; i < settled.length; i++) {
        const res = settled[i];
        if (res.status === 'fulfilled') {
          successful.push(res.value as any);
          candidates.push({
            id: res.value.playlist.id,
            kind: 'playlist',
            platform: res.value.platform,
            title: res.value.playlist.name,
            subtitle: `创建者: ${res.value.playlist.creator || '未知'}`,
            trackCount: res.value.playlist.trackCount,
            coverUrl: res.value.playlist.coverUrl,
          });
        }
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched playlists across multiple platforms. Please specify &platform= to disambiguate.',
          409,
          { candidates },
        );
      }
      if (candidates.length === 1) {
        return {
          kind: 'playlist',
          platform: successful[0].platform,
          result: successful[0].playlist,
        };
      }

      const propagatable = findPropagatableProbeWithPlatform(probeList);
      if (propagatable) {
        if (propagatable.error instanceof ProviderError) {
          propagatable.error.telemetry = {
            platform: propagatable.platform,
            stage: 'disambiguation_probe',
            ...propagatable.error.telemetry,
          };
        }
        throw propagatable.error;
      }

      throw new ProviderError('PLAYLIST_NOT_FOUND', `Playlist with ID "${trimmed}" was not found on supported platforms.`, 404);
    }

    if (normalizedType === 'user') {
      const [qqUserRes, neteaseUserRes] = await Promise.allSettled([
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      const successful: { platform: 'qqmusic' | 'netease'; userData: UserPlaylistsData }[] = [];

      if (qqUserRes.status === 'fulfilled' && qqUserRes.value.userData.playlists.length > 0) {
        successful.push(qqUserRes.value as any);
        candidates.push({
          id: qqUserRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'qqmusic',
          title: qqUserRes.value.userData.nickname || `QQ 用户 (${trimmed})`,
          subtitle: `包含 ${qqUserRes.value.userData.total || qqUserRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: qqUserRes.value.userData.total || qqUserRes.value.userData.playlists.length,
          coverUrl: qqUserRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (neteaseUserRes.status === 'fulfilled' && neteaseUserRes.value.userData.playlists.length > 0) {
        successful.push(neteaseUserRes.value as any);
        candidates.push({
          id: neteaseUserRes.value.userData.userId,
          kind: 'user_playlists',
          platform: 'netease',
          title: neteaseUserRes.value.userData.nickname || `网易云用户 (${trimmed})`,
          subtitle: `包含 ${neteaseUserRes.value.userData.total || neteaseUserRes.value.userData.playlists.length} 个公开歌单`,
          trackCount: neteaseUserRes.value.userData.total || neteaseUserRes.value.userData.playlists.length,
          coverUrl: neteaseUserRes.value.userData.playlists[0]?.coverUrl,
        });
      }

      if (candidates.length > 1) {
        throw new ProviderError(
          'AMBIGUOUS_INPUT',
          'Numeric ID matched user profiles across multiple platforms. Please specify &platform= to disambiguate.',
          409,
          { candidates },
        );
      }
      if (candidates.length === 1) {
        return {
          kind: 'user_playlists',
          platform: successful[0].platform,
          result: successful[0].userData,
        };
      }

      const probeList: ProbeResultWithPlatform[] = [
        { platform: 'qqmusic', result: qqUserRes },
        { platform: 'netease', result: neteaseUserRes },
      ];
      const propagatable = findPropagatableProbeWithPlatform(probeList);
      if (propagatable) {
        if (propagatable.error instanceof ProviderError) {
          propagatable.error.telemetry = {
            platform: propagatable.platform,
            stage: 'disambiguation_probe',
            ...propagatable.error.telemetry,
          };
        }
        throw propagatable.error;
      }

      throw new ProviderError('USER_NOT_FOUND', `User profile with ID "${trimmed}" was not found on supported platforms.`, 404);
    }
  }

  // Case 4: Complete auto mode (type === auto AND platform === auto)
  tracking.stage = 'disambiguation_probe';

  // For IDs >= 19 digits, attempt Qishui playlist first
  if (trimmed.length >= 19) {
    try {
      const qishuiRes = await parsePlaylistService({
        rawInput: trimmed,
        platformParam: 'qishui',
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      });
      return { kind: 'playlist', platform: 'qishui', result: qishuiRes.playlist };
    } catch (err: unknown) {
      const probeList: ProbeResultWithPlatform[] = [{ platform: 'qishui', result: { status: 'rejected', reason: err } }];
      const propagatable = findPropagatableProbeWithPlatform(probeList);
      if (propagatable) {
        if (propagatable.error instanceof ProviderError) {
          propagatable.error.telemetry = {
            platform: 'qishui',
            stage: 'disambiguation_probe',
            ...propagatable.error.telemetry,
          };
        }
        throw propagatable.error;
      }
      // Continue to standard 4-way probing
    }
  }

  // 4-way concurrent probing across QQ & NetEase (single playlist & user playlists)
  const [qqSingle, qqUser, neteaseSingle, neteaseUser] = await Promise.allSettled([
    parsePlaylistService({ rawInput: trimmed, platformParam: 'qqmusic', auth, request, db, ctx, skipAnalytics: true }),
    fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
    parsePlaylistService({ rawInput: trimmed, platformParam: 'netease', auth, request, db, ctx, skipAnalytics: true }),
    fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
  ]);

  const candidates: DisambiguationCandidate[] = [];
  const successfulResults: ResolveData[] = [];

  if (qqSingle.status === 'fulfilled' && qqSingle.value.playlist.name) {
    successfulResults.push({
      kind: 'playlist',
      platform: 'qqmusic',
      result: qqSingle.value.playlist,
    });
    candidates.push({
      id: qqSingle.value.playlist.id,
      kind: 'playlist',
      platform: 'qqmusic',
      title: qqSingle.value.playlist.name,
      subtitle: `创建者: ${qqSingle.value.playlist.creator || '未知'}`,
      trackCount: qqSingle.value.playlist.trackCount,
      coverUrl: qqSingle.value.playlist.coverUrl,
    });
  }

  if (qqUser.status === 'fulfilled' && qqUser.value.userData.playlists?.length > 0) {
    successfulResults.push({
      kind: 'user_playlists',
      platform: 'qqmusic',
      result: qqUser.value.userData,
    });
    candidates.push({
      id: qqUser.value.userData.userId,
      kind: 'user_playlists',
      platform: 'qqmusic',
      title: qqUser.value.userData.nickname || `QQ 用户 (${trimmed})`,
      subtitle: `包含 ${qqUser.value.userData.total || qqUser.value.userData.playlists.length} 个公开歌单`,
      trackCount: qqUser.value.userData.total || qqUser.value.userData.playlists.length,
      coverUrl: qqUser.value.userData.playlists[0]?.coverUrl,
    });
  }

  if (neteaseSingle.status === 'fulfilled' && neteaseSingle.value.playlist.name) {
    successfulResults.push({
      kind: 'playlist',
      platform: 'netease',
      result: neteaseSingle.value.playlist,
    });
    candidates.push({
      id: neteaseSingle.value.playlist.id,
      kind: 'playlist',
      platform: 'netease',
      title: neteaseSingle.value.playlist.name,
      subtitle: `创建者: ${neteaseSingle.value.playlist.creator || '未知'}`,
      trackCount: neteaseSingle.value.playlist.trackCount,
      coverUrl: neteaseSingle.value.playlist.coverUrl,
    });
  }

  if (neteaseUser.status === 'fulfilled' && neteaseUser.value.userData.playlists?.length > 0) {
    successfulResults.push({
      kind: 'user_playlists',
      platform: 'netease',
      result: neteaseUser.value.userData,
    });
    candidates.push({
      id: neteaseUser.value.userData.userId,
      kind: 'user_playlists',
      platform: 'netease',
      title: neteaseUser.value.userData.nickname || `网易云用户 (${trimmed})`,
      subtitle: `包含 ${neteaseUser.value.userData.total || neteaseUser.value.userData.playlists.length} 个公开歌单`,
      trackCount: neteaseUser.value.userData.total || neteaseUser.value.userData.playlists.length,
      coverUrl: neteaseUser.value.userData.playlists[0]?.coverUrl,
    });
  }

  if (candidates.length === 1) {
    return successfulResults[0];
  }

  if (candidates.length > 1) {
    throw new ProviderError(
      'AMBIGUOUS_INPUT',
      'Numeric ID matched multiple targets across platforms/types. Please specify &platform= and/or &type= to disambiguate.',
      409,
      { candidates },
    );
  }

  const probeList: ProbeResultWithPlatform[] = [
    { platform: 'qqmusic', result: qqSingle },
    { platform: 'qqmusic', result: qqUser },
    { platform: 'netease', result: neteaseSingle },
    { platform: 'netease', result: neteaseUser },
  ];
  const propagatable = findPropagatableProbeWithPlatform(probeList);
  if (propagatable) {
    if (propagatable.error instanceof ProviderError) {
      propagatable.error.telemetry = {
        platform: propagatable.platform,
        stage: 'disambiguation_probe',
        ...propagatable.error.telemetry,
      };
    }
    throw propagatable.error;
  }

  throw new ProviderError(
    'PLAYLIST_NOT_FOUND',
    `在 QQ 音乐 与 网易云音乐 中均未找到 ID 为 “${trimmed}” 的公开歌单或用户主页。`,
    404,
  );
}
