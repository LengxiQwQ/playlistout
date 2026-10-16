/**
 * Universal Input Resolver Service (Public API v1)
 *
 * Implements the core product behavior of PlaylistOut's main search box on the server:
 * 1. Cleans input (strips promotional text, emojis, boundaries)
 * 2. Identifies input kind (single playlist, user profile, short link, numeric ID)
 * 3. Identifies platform via dynamic ProviderRegistry
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
import { providerRegistry, type SupportedPlatform } from '../providers';
import { recordResolveV2 } from '../analytics/v2-recorder';
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
import type { ResolvePlatformParam } from '../providers/platforms';

export interface ResolveServiceOptions {
  q: string;
  type?: string | null;
  platform?: string | null;
  channel?: string | null;
  auth?: {
    token?: string;
    userid?: string;
  };
  request?: Request;
  db?: D1Database;
  ctx?: ExecutionContext;
}

export type SupportedType = 'auto' | 'playlist' | 'user';
export type SupportedPlatformParam = ResolvePlatformParam;

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

function toPlaylistCandidate(playlist: Playlist): DisambiguationCandidate {
  return {
    id: playlist.id,
    kind: 'playlist',
    platform: playlist.platform as SupportedPlatform,
    title: playlist.name,
    subtitle: `创建者: ${playlist.creator || '未知'}`,
    trackCount: playlist.trackCount,
    coverUrl: playlist.coverUrl,
  };
}

function toUserCandidate(userData: UserPlaylistsData, inputId: string): DisambiguationCandidate {
  const count = userData.total || (userData.playlists ? userData.playlists.length : 0);
  const defaultTitle =
    userData.platform === 'qqmusic'
      ? `QQ 用户 (${inputId})`
      : userData.platform === 'netease'
      ? `网易云用户 (${inputId})`
      : `酷狗用户 (${inputId})`;

  return {
    id: userData.userId,
    kind: 'user_playlists',
    platform: userData.platform as SupportedPlatform,
    title: userData.nickname || defaultTitle,
    subtitle: `包含 ${count} 个公开歌单`,
    trackCount: count,
    coverUrl: userData.playlists?.[0]?.coverUrl,
  };
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

  if (request) {
    const playlist = data.kind === 'playlist' ? (data.result as Playlist) : undefined;
    const providerPath = playlist
      ? ((playlist as any).__providerPath as ('primary' | 'fallback') | undefined)
      : undefined;
    runAsync(
      recordResolveV2(db, {
        request,
        outcome,
        platform,
        trackCount: playlist?.tracks.length,
        latencyMs,
        inputType,
        requestedType: tracking.requestedType,
        requestedPlatform: tracking.requestedPlatform,
        providerFailurePath: providerPath,
        endpoint: 'resolve',
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

  if (request) {
    runAsync(
      recordResolveV2(db, {
        request,
        outcome: 'failure',
        platform,
        latencyMs: Date.now() - startTime,
        inputType,
        requestedType: tracking.requestedType,
        requestedPlatform: tracking.requestedPlatform,
        failureCode,
        failureClass,
        failureStage,
        providerFailurePath: providerFailurePath !== 'not_applicable' ? providerFailurePath : undefined,
        endpoint: 'resolve',
      }),
    );
  }
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
 * Internal resolver core execution driven by ProviderRegistry.
 */
async function resolveServiceCore(
  options: ResolveServiceOptions,
  tracking: ResolveTracking,
): Promise<ResolveData> {
  const { q, type, platform, channel, auth, request, db, ctx } = options;

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
  let normalizedPlatform: SupportedPlatformParam = 'auto';
  if (
    rawPlatform === 'auto' ||
    rawPlatform === 'qqmusic' ||
    rawPlatform === 'netease' ||
    rawPlatform === 'kugou' ||
    rawPlatform === 'qishui' ||
    rawPlatform === 'kuwo' ||
    rawPlatform === 'migu'
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
      `Unsupported platform "${platform}". Supported platforms: auto, qqmusic, netease, kugou, qishui, kuwo, migu.`,
      400,
    );
  }

  const cleanInput = extractCleanUrlOrInput(q);
  const trimmed = cleanInput.trim();
  const isNumeric = /^\d{4,20}$/.test(trimmed);

  // Check capability: reject if requested platform does not support user profiles
  if (normalizedPlatform !== 'auto' && normalizedType === 'user') {
    const targetProvider = providerRegistry.get(normalizedPlatform);
    if (targetProvider && !targetProvider.meta.capabilities.userProfile) {
      const name = targetProvider.meta.nameEn || targetProvider.meta.name;
      throw new ProviderError(
        'INVALID_INPUT',
        `${name} does not support user profiles or user playlists.`,
        400,
      );
    }
  }

  // ── Non-numeric input routing ──
  if (!isNumeric) {
    const userProfileProvider = providerRegistry.resolveUserProfile(trimmed);
    const inputMatchedProvider = providerRegistry.resolveByInput(trimmed);
    const shortLinkProvider = providerRegistry.resolveShortLink(trimmed);
    const detectedProvider = userProfileProvider || inputMatchedProvider;
    const detectedPlatform = detectedProvider?.meta.id || null;

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

    // Reject type constraint conflict
    const isExplicitProfile = Boolean(userProfileProvider);
    if (normalizedType === 'playlist' && isExplicitProfile) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Input URL is a user profile, which conflicts with specified type constraint "playlist".',
        400,
      );
    }

    const isExplicitPlaylist = !isExplicitProfile && !shortLinkProvider && Boolean(inputMatchedProvider);
    if (normalizedType === 'user' && isExplicitPlaylist) {
      throw new ProviderError(
        'INVALID_INPUT',
        'Input URL is a playlist, which conflicts with specified type constraint "user".',
        400,
      );
    }

    tracking.stage = 'routing';

    // 1. Explicit user profile URLs or forced user type on detected platform
    if (userProfileProvider || (detectedPlatform && normalizedType === 'user')) {
      const targetPlatform = userProfileProvider?.meta.id || detectedPlatform!;
      tracking.stage = 'user_resolution';
      tracking.platform = targetPlatform;
      const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
        rawInput: trimmed,
        platformParam: targetPlatform,
        auth,
      });
      return { kind: 'user_playlists', platform: actualPlatform, result: userData };
    }

    // 2. Short links (QQ, NetEase, KuGou, Qishui)
    if (shortLinkProvider) {
      tracking.stage = 'short_link_resolution';
      tracking.platform = shortLinkProvider.meta.id;
      const pid = shortLinkProvider.meta.id;

      if (normalizedType === 'user') {
        const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
          rawInput: trimmed,
          platformParam: pid,
          auth,
        });
        return { kind: 'user_playlists', platform: actualPlatform, result: userData };
      }

      if (normalizedType === 'playlist' || !shortLinkProvider.meta.capabilities.userProfile) {
        const { playlist, platform: actualPlatform } = await parsePlaylistService({
          rawInput: trimmed,
          platformParam: pid,
          channel,
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
          platformParam: pid,
          channel,
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

        // If provider requires auth for user profile and credentials are missing, do not attempt user resolution
        if (shortLinkProvider.meta.capabilities.userProfileRequiresAuth && (!auth?.token || !auth?.userid)) {
          throw playlistErr;
        }

        try {
          const { userData, platform: actualPlatform } = await fetchUserPlaylistsService({
            rawInput: trimmed,
            platformParam: pid,
            auth,
          });
          return { kind: 'user_playlists', platform: actualPlatform, result: userData };
        } catch (userErr: unknown) {
          if (!isNegativeProbeError(userErr)) {
            throw userErr;
          }
          const providerName =
            pid === 'qqmusic' ? 'QQ Music' : pid === 'netease' ? 'NetEase' : shortLinkProvider.meta.name;
          throw new ProviderError(
            'PLAYLIST_NOT_FOUND',
            `Failed to resolve ${providerName} short link as playlist or user profile.`,
            404,
          );
        }
      }
    }

    // 3. Known single playlist URLs
    tracking.stage = 'playlist_resolution';
    const platformParam = normalizedPlatform !== 'auto' ? normalizedPlatform : null;
    const { playlist, platform: actualPlatform } = await parsePlaylistService({
      rawInput: trimmed,
      platformParam,
      channel,
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
        channel,
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
    const provider = providerRegistry.get(normalizedPlatform);
    const supportsUser =
      provider?.meta.capabilities.userProfile &&
      (!provider.meta.capabilities.userProfileRequiresAuth || (auth?.token && auth?.userid));

    if (!supportsUser) {
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
    }

    tracking.stage = 'disambiguation_probe';
    const [singleRes, userRes] = await Promise.allSettled([
      parsePlaylistService({
        rawInput: trimmed,
        platformParam: normalizedPlatform,
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      }),
      fetchUserPlaylistsService({ rawInput: trimmed, platformParam: normalizedPlatform, auth }),
    ]);

    const candidates: DisambiguationCandidate[] = [];
    if (singleRes.status === 'fulfilled') {
      candidates.push(toPlaylistCandidate(singleRes.value.playlist));
    }
    if (userRes.status === 'fulfilled' && userRes.value.userData.playlists?.length > 0) {
      candidates.push(toUserCandidate(userRes.value.userData, trimmed));
    }

    if (candidates.length > 1) {
      const pName =
        normalizedPlatform === 'qqmusic'
          ? 'QQ Music'
          : normalizedPlatform === 'netease'
          ? 'NetEase'
          : 'KuGou';
      throw new ProviderError(
        'AMBIGUOUS_INPUT',
        `Numeric ID matched both ${pName} playlist and ${normalizedPlatform === 'qqmusic' ? 'QQ' : pName} user profile. Please specify &type=playlist or &type=user to disambiguate.`,
        409,
        { candidates },
      );
    }
    if (singleRes.status === 'fulfilled') {
      return { kind: 'playlist', platform: normalizedPlatform, result: singleRes.value.playlist };
    }
    if (userRes.status === 'fulfilled') {
      return { kind: 'user_playlists', platform: normalizedPlatform, result: userRes.value.userData };
    }

    const probeList: ProbeResultWithPlatform[] = [
      { platform: normalizedPlatform, result: singleRes },
      { platform: normalizedPlatform, result: userRes },
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

    const notFoundPlatformName =
      normalizedPlatform === 'qqmusic'
        ? 'QQ Music'
        : normalizedPlatform === 'netease'
        ? 'NetEase Cloud Music'
        : 'KuGou';
    throw new ProviderError(
      'PLAYLIST_NOT_FOUND',
      `Target with ID "${trimmed}" not found on ${notFoundPlatformName}.`,
      404,
    );
  }

  // Case 3: Explicit type, auto platform -> Probe cross-platform
  if (normalizedType !== 'auto' && normalizedPlatform === 'auto') {
    tracking.stage = 'disambiguation_probe';
    if (normalizedType === 'playlist') {
      const probeTasks: Array<{ platform: SupportedPlatform; task: Promise<any> }> = [
        {
          platform: 'qqmusic',
          task: parsePlaylistService({
            rawInput: trimmed,
            platformParam: 'qqmusic',
            auth,
            request,
            db,
            ctx,
            skipAnalytics: true,
          }),
        },
        {
          platform: 'netease',
          task: parsePlaylistService({
            rawInput: trimmed,
            platformParam: 'netease',
            auth,
            request,
            db,
            ctx,
            skipAnalytics: true,
          }),
        },
      ];
      if (trimmed.length >= 19) {
        probeTasks.push({
          platform: 'qishui',
          task: parsePlaylistService({
            rawInput: trimmed,
            platformParam: 'qishui',
            channel,
            auth,
            request,
            db,
            ctx,
            skipAnalytics: true,
          }),
        });
      }

      const settled = await Promise.allSettled(probeTasks.map((t) => t.task));
      const probeList: ProbeResultWithPlatform[] = probeTasks.map((t, idx) => ({
        platform: t.platform,
        result: settled[idx],
      }));

      const candidates: DisambiguationCandidate[] = [];
      const successful: { platform: SupportedPlatform; playlist: Playlist }[] = [];

      for (let i = 0; i < settled.length; i++) {
        const res = settled[i];
        if (res.status === 'fulfilled') {
          successful.push(res.value as any);
          candidates.push(toPlaylistCandidate(res.value.playlist));
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

      throw new ProviderError(
        'PLAYLIST_NOT_FOUND',
        `Playlist with ID "${trimmed}" was not found on supported platforms.`,
        404,
      );
    }

    if (normalizedType === 'user') {
      const [qqUserRes, neteaseUserRes] = await Promise.allSettled([
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
        fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'netease', auth }),
      ]);

      const candidates: DisambiguationCandidate[] = [];
      const successful: { platform: SupportedPlatform; userData: UserPlaylistsData }[] = [];

      if (qqUserRes.status === 'fulfilled' && qqUserRes.value.userData.playlists?.length > 0) {
        successful.push(qqUserRes.value as any);
        candidates.push(toUserCandidate(qqUserRes.value.userData, trimmed));
      }

      if (neteaseUserRes.status === 'fulfilled' && neteaseUserRes.value.userData.playlists?.length > 0) {
        successful.push(neteaseUserRes.value as any);
        candidates.push(toUserCandidate(neteaseUserRes.value.userData, trimmed));
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

      throw new ProviderError(
        'USER_NOT_FOUND',
        `User profile with ID "${trimmed}" was not found on supported platforms.`,
        404,
      );
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
        channel,
        auth,
        request,
        db,
        ctx,
        skipAnalytics: true,
      });
      return { kind: 'playlist', platform: 'qishui', result: qishuiRes.playlist };
    } catch (err: unknown) {
      const probeList: ProbeResultWithPlatform[] = [
        { platform: 'qishui', result: { status: 'rejected', reason: err } },
      ];
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
    }
  }

  // 4-way concurrent probing across QQ & NetEase (single playlist & user playlists)
  const [qqSingle, qqUser, neteaseSingle, neteaseUser] = await Promise.allSettled([
    parsePlaylistService({
      rawInput: trimmed,
      platformParam: 'qqmusic',
      auth,
      request,
      db,
      ctx,
      skipAnalytics: true,
    }),
    fetchUserPlaylistsService({ rawInput: trimmed, platformParam: 'qqmusic', auth }),
    parsePlaylistService({
      rawInput: trimmed,
      platformParam: 'netease',
      auth,
      request,
      db,
      ctx,
      skipAnalytics: true,
    }),
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
    candidates.push(toPlaylistCandidate(qqSingle.value.playlist));
  }

  if (qqUser.status === 'fulfilled' && qqUser.value.userData.playlists?.length > 0) {
    successfulResults.push({
      kind: 'user_playlists',
      platform: 'qqmusic',
      result: qqUser.value.userData,
    });
    candidates.push(toUserCandidate(qqUser.value.userData, trimmed));
  }

  if (neteaseSingle.status === 'fulfilled' && neteaseSingle.value.playlist.name) {
    successfulResults.push({
      kind: 'playlist',
      platform: 'netease',
      result: neteaseSingle.value.playlist,
    });
    candidates.push(toPlaylistCandidate(neteaseSingle.value.playlist));
  }

  if (neteaseUser.status === 'fulfilled' && neteaseUser.value.userData.playlists?.length > 0) {
    successfulResults.push({
      kind: 'user_playlists',
      platform: 'netease',
      result: neteaseUser.value.userData,
    });
    candidates.push(toUserCandidate(neteaseUser.value.userData, trimmed));
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
