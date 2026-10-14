import { Hono } from 'hono';
import { type ApiResponse } from '../models/playlist';
import { getPublicStats } from '../stats';
import { checkRateLimit } from '../security/rate-limit';
import { recordRateLimitEventV2 } from '../analytics/v2-recorder';
import type { PublicStatsResponse } from '../analytics/types';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import { getClientIp } from '../security/client-auth';
import type { Env } from '../env';

export const statsRoutes = new Hono<{ Bindings: Env }>();

const handleStats = async (c: any) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders);
  }

  const clientIp = getClientIp(request);
  const env: Env = c.env;
  const ctx: ExecutionContext = c.executionCtx;

  // Rate limit check: max 60 requests / minute per client IP
  const rateCheck = checkRateLimit(clientIp, 60, 60, 'stats');
  if (!rateCheck.allowed) {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(recordRateLimitEventV2(env.DB, request, 'stats'));
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

  // Edge cache: share one stats snapshot across all clients for 90 seconds
  const statsCache = caches.default;
  const statsCacheKey = 'https://playlistout-api.internal/cache/public-stats';
  const cachedStatsResponse = await statsCache.match(statsCacheKey);
  if (cachedStatsResponse) {
    return cachedStatsResponse;
  }

  const stats: PublicStatsResponse = await getPublicStats(env.DB);
  const statsResponse = new Response(
    JSON.stringify({
      success: true,
      data: stats,
    } satisfies ApiResponse<PublicStatsResponse>),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=90, s-maxage=90',
        ...responseHeaders,
      },
    },
  );
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(statsCache.put(statsCacheKey, statsResponse.clone()));
  }
  return statsResponse;
};

statsRoutes.all('/stats', handleStats);
statsRoutes.all('/v1/stats', handleStats);
