import { Hono } from 'hono';
import { type ApiResponse } from '../models/playlist';
import { getPublicStats } from '../stats';
import { checkRateLimit } from '../security/rate-limit';
import { recordRateLimitEventV2 } from '../analytics/v2-recorder';
import type { PublicStatsResponse } from '../analytics/types';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import { getClientIp } from '../security/client-auth';
import type { Env } from '../env';

interface MemoryStatsCache {
  responsePayload: string;
  cachedAt: number;
}

let inMemoryStatsCache: MemoryStatsCache | null = null;
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory isolate cache

export function resetStatsMemoryCache(): void {
  inMemoryStatsCache = null;
}

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

  // 1. Edge & In-Memory cache: share one stats snapshot across all clients
  const shouldBypassCache = url.searchParams.has('verify');
  const now = Date.now();
  const statsCacheKey = 'https://playlistout-api.internal/cache/public-stats';

  if (shouldBypassCache) {
    inMemoryStatsCache = null;
  } else {
    // Check in-memory isolate cache first (0ms, 0 I/O)
    if (inMemoryStatsCache && now - inMemoryStatsCache.cachedAt < MEMORY_CACHE_TTL_MS) {
      return new Response(inMemoryStatsCache.responsePayload, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600, s-maxage=600',
          ...responseHeaders,
        },
      });
    }

    // Check Cloudflare Edge Cache API second
    const statsCache = caches.default;
    const cachedStatsResponse = await statsCache.match(statsCacheKey);
    if (cachedStatsResponse) {
      try {
        const text = await cachedStatsResponse.clone().text();
        inMemoryStatsCache = { responsePayload: text, cachedAt: now };
      } catch {
        // best-effort memory population
      }
      return cachedStatsResponse;
    }
  }

  const stats: PublicStatsResponse = await getPublicStats(env.DB);
  const responsePayload = JSON.stringify({
    success: true,
    data: stats,
  } satisfies ApiResponse<PublicStatsResponse>);

  if (!shouldBypassCache) {
    inMemoryStatsCache = { responsePayload, cachedAt: now };
  }

  const statsResponse = new Response(
    responsePayload,
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': shouldBypassCache
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=600, s-maxage=600',
        ...responseHeaders,
      },
    },
  );
  if (!shouldBypassCache && ctx && typeof ctx.waitUntil === 'function') {
    const statsCache = caches.default;
    ctx.waitUntil(statsCache.put(statsCacheKey, statsResponse.clone()));
  }
  return statsResponse;
};

statsRoutes.all('/stats', handleStats);
statsRoutes.all('/v1/stats', handleStats);
