import { Hono } from 'hono';
import { type ApiResponse, type ResolveData, ProviderError } from '../models/playlist';
import { checkDualTrackRateLimit } from '../security/rate-limit';
import { recordRateLimitEventV2 } from '../analytics/v2-recorder';
import { resolveService } from '../services/resolve-service';
import { buildResponseMetadata } from '../analytics/context';
import { PLAYLISTOUT_VERSION } from '../version';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import { getClientIp, extractClientAuth } from '../security/client-auth';
import type { Env } from '../env';

export const resolveRoutes = new Hono<{ Bindings: Env }>();

const handleResolve = async (c: any) => {
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
  const rateCheck = await checkDualTrackRateLimit(request, clientIp, 'resolve', env.INSIGHTS_ADMIN_TOKEN || '');
  if (!rateCheck.allowed) {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(recordRateLimitEventV2(env.DB, request, 'resolve'));
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

  const rawQ = url.searchParams.get('q');
  const rawType = url.searchParams.get('type');
  const rawPlatform = url.searchParams.get('platform');
  const rawChannel = url.searchParams.get('channel') || url.searchParams.get('mode');
  const auth = extractClientAuth(request);

  try {
    const resolveData: ResolveData = await resolveService({
      q: rawQ || '',
      type: rawType,
      platform: rawPlatform,
      channel: rawChannel,
      auth,
      request,
      db: env.DB,
      ctx,
    });

    const meta = buildResponseMetadata(request, {
      resolvedPlatform: resolveData.platform,
      trackCount: Array.isArray((resolveData.result as any)?.tracks)
        ? (resolveData.result as any).tracks.length
        : undefined,
      mode: (resolveData.result as any)?.retrieval?.mode,
    });

    const successResponse: ApiResponse<ResolveData> = {
      success: true,
      data: resolveData,
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
        message: 'An unexpected internal error occurred while resolving the input.',
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

resolveRoutes.all('/resolve', handleResolve);
resolveRoutes.all('/v1/resolve', handleResolve);
