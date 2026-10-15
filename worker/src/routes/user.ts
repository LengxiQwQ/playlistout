import { Hono } from 'hono';
import { type ApiResponse, type UserPlaylistsData, ProviderError } from '../models/playlist';
import { checkDualTrackRateLimit, checkRateLimit } from '../security/rate-limit';
import { recordRateLimitEventV2 } from '../analytics/v2-recorder';
import { fetchUserPlaylistsService } from '../services/user-service';
import { buildResponseMetadata } from '../analytics/context';
import { PLAYLISTOUT_VERSION } from '../version';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import { getClientIp, extractClientAuth } from '../security/client-auth';
import { generateBatchTicket } from '../security/batch-ticket';
import type { Env } from '../env';

export const userRoutes = new Hono<{ Bindings: Env }>();

const handleUserPlaylists = async (c: any) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders);
  }

  const clientIp = getClientIp(request);
  const env: Env = c.env;
  let ctx: ExecutionContext | undefined;
  try {
    ctx = c.executionCtx;
  } catch {
    ctx = undefined;
  }

  // Rate limit check: dual-track rate limit (Web front: 30 req/min, Direct API: 6 req/min)
  const rateCheck = await checkDualTrackRateLimit(request, clientIp, 'user_playlists', env.INSIGHTS_ADMIN_TOKEN || '');
  if (!rateCheck.allowed) {
    const userPlatformParam = url.searchParams.get('platform') || 'all';
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(recordRateLimitEventV2(env.DB, request, 'user_playlists', userPlatformParam));
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment before trying again.',
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.resetSeconds),
          ...responseHeaders,
        },
      },
    );
  }

  const rawUserInputParam =
    url.searchParams.get('uin') ||
    url.searchParams.get('uid') ||
    url.searchParams.get('url') ||
    url.searchParams.get('id');

  if (!rawUserInputParam || rawUserInputParam.trim().length === 0) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Missing or empty required query parameter: uin or uid',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...responseHeaders,
      },
    });
  }

  const platformParam = url.searchParams.get('platform');
  const auth = extractClientAuth(request);

  try {
    const { userData } = await fetchUserPlaylistsService({
      rawInput: rawUserInputParam,
      platformParam,
      auth,
    });

    const playlistIds = (userData.playlists || [])
      .map((p) => p.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    let batchTicket: string | undefined;
    let batchCooldownSeconds: number | undefined;

    if (playlistIds.length > 0) {
      // Rate limit ticket issuance: max 2 batch tickets per 60 seconds per client IP
      const issueCheck = checkRateLimit(clientIp, 2, 60, 'batch_ticket_issue');
      if (issueCheck.allowed) {
        batchTicket = await generateBatchTicket({
          clientIp,
          platform: userData.platform,
          playlistIds,
          secret: env.INSIGHTS_ADMIN_TOKEN || '',
        });
      } else {
        batchCooldownSeconds = issueCheck.resetSeconds;
      }
    }

    const responseUserData: UserPlaylistsData = {
      ...userData,
      ...(batchTicket ? { batchTicket } : {}),
      ...(batchCooldownSeconds ? { batchCooldownSeconds } : {}),
    };

    const meta = buildResponseMetadata(request, {
      resolvedPlatform: userData.platform,
      trackCount: userData.total || (userData.playlists ? userData.playlists.length : undefined),
    });

    const successResponse: ApiResponse<UserPlaylistsData> = {
      success: true,
      data: responseUserData,
      ...(meta ? { meta } : {}),
    };
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-PlaylistOut-Server-Version': PLAYLISTOUT_VERSION,
        ...(batchTicket ? { 'X-PlaylistOut-Batch-Ticket': batchTicket } : {}),
        ...(batchCooldownSeconds ? { 'X-PlaylistOut-Batch-Cooldown': String(batchCooldownSeconds) } : {}),
        ...(meta?.client?.deviceClass ? { 'X-PlaylistOut-Client-Device': meta.client.deviceClass } : {}),
        ...(meta?.client?.id ? { 'X-PlaylistOut-Client-Id': meta.client.id } : {}),
        ...responseHeaders,
      },
    });
  } catch (err: unknown) {
    if (err instanceof ProviderError) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: err.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...responseHeaders,
        },
      });
    }

    const fallbackResponse: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred while fetching user playlists.',
      },
    };
    return new Response(JSON.stringify(fallbackResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...responseHeaders,
      },
    });
  }
};

userRoutes.all('/user/playlists', handleUserPlaylists);
userRoutes.all('/v1/user/playlists', handleUserPlaylists);
