import { Hono } from 'hono';
import { type ApiResponse, type Playlist, ProviderError } from '../models/playlist';
import { checkDualTrackRateLimit } from '../security/rate-limit';
import { recordRateLimitEventV2 } from '../analytics/v2-recorder';
import { parsePlaylistService } from '../services/playlist-service';
import { buildResponseMetadata } from '../analytics/context';
import { PLAYLISTOUT_VERSION } from '../version';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import { getClientIp, extractClientAuth } from '../security/client-auth';
import type { Env } from '../env';

export const playlistRoutes = new Hono<{ Bindings: Env }>();

const handlePlaylist = async (c: any) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders);
  }

  const clientIp = getClientIp(request);
  const env: Env = c.env;
  const ctx: ExecutionContext = c.executionCtx;

  // Rate limit check: dual-track rate limit (Web front: 30 req/min, Direct API: 6 req/min)
  const rateCheck = await checkDualTrackRateLimit(request, clientIp, 'playlist', env.INSIGHTS_ADMIN_TOKEN || '');
  if (!rateCheck.allowed) {
    const rawPlatformParam = url.searchParams.get('platform') || 'all';

    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(recordRateLimitEventV2(env.DB, request, 'playlist', rawPlatformParam));
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

  const rawPlaylistParam = url.searchParams.get('url') || url.searchParams.get('id');

  if (!rawPlaylistParam || rawPlaylistParam.trim().length === 0) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Missing or empty required query parameter: url',
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
  const channelParam = url.searchParams.get('channel') || url.searchParams.get('mode');
  const auth = extractClientAuth(request);

  try {
    const { playlist } = await parsePlaylistService({
      rawInput: rawPlaylistParam,
      platformParam,
      channel: channelParam,
      auth,
      request,
      db: env.DB,
      ctx,
    });

    const meta = buildResponseMetadata(request, {
      resolvedPlatform: playlist.platform,
      trackCount: playlist.trackCount || (playlist.tracks ? playlist.tracks.length : undefined),
      mode: playlist.retrieval?.mode,
    });

    const successResponse: ApiResponse<Playlist> = {
      success: true,
      data: playlist,
      ...(meta ? { meta } : {}),
    };
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-PlaylistOut-Server-Version': PLAYLISTOUT_VERSION,
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
        message: 'An unexpected internal error occurred while processing the playlist.',
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

playlistRoutes.all('/playlist', handlePlaylist);
playlistRoutes.all('/v1/playlist', handlePlaylist);
