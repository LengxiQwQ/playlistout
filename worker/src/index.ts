import { getCorsHeaders, handleOptions } from './cors';
import { type ApiResponse, type Playlist, type UserPlaylistsData, type ResolveData, ProviderError } from './models/playlist';
import { createKugouQrCode, checkKugouQrCode, fetchKugouUserPlaylists } from './providers/kugou';
import { getPublicStats, getMaintainerStats } from './stats';
import { recordRateLimitEvent } from './analytics/recorder';
import type { PublicStatsResponse, MaintainerStatsResponse } from './analytics/types';
import { handleEvent } from './routes/event';
import { applySecurityHeaders } from './security/headers';
import { checkRateLimit } from './security/rate-limit';
import { parsePlaylistService } from './services/playlist-service';
import { fetchUserPlaylistsService } from './services/user-service';
import { resolveService } from './services/resolve-service';

export interface Env {
  ENVIRONMENT?: string;
  DB?: D1Database;
  INSIGHTS_ADMIN_TOKEN?: string;
}

/**
 * Constant-time comparison for token verification using SHA-256 digests.
 * Prevents timing side-channel leaks and never exposes token details.
 */
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const hashA = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(a)));
  const hashB = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(b)));
  if (hashA.length !== hashB.length) return false;
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }
  return diff === 0;
}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, url.pathname);
    const responseHeaders = applySecurityHeaders(corsHeaders);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, url.pathname);
    }

    // Health check endpoints (/health, /api/health, /api/v1/health)
    if (
      url.pathname === '/health' ||
      url.pathname === '/api/health' ||
      url.pathname === '/api/v1/health'
    ) {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `HTTP method ${request.method} is not allowed on this endpoint. Use GET.`,
            },
          }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              Allow: 'GET, OPTIONS',
              ...responseHeaders,
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'playlistout-api',
          version: '2.0.0',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...responseHeaders,
          },
        },
      );
    }

    // Explicitly reject any arbitrary proxy requests (strict constitutional rule)
    if (url.pathname === '/proxy' || url.pathname.startsWith('/proxy/') || url.pathname.startsWith('/api/proxy')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Arbitrary proxying is strictly prohibited by PlaylistOut Constitution.',
          },
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...responseHeaders,
          },
        },
      );
    }

    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    // Global security check: strictly prohibit passing credentials in query parameters
    if (
      url.searchParams.has('token') ||
      url.searchParams.has('auth') ||
      url.searchParams.has('credential') ||
      url.searchParams.has('kugou_token')
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message:
              'Passing credentials in query parameters is strictly forbidden. Use Authorization: Bearer <token> and X-Kugou-Userid headers.',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
      );
    }

    // Extract optional client credentials from HTTP headers only
    const authHeader = request.headers.get('authorization') || '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token =
      (bearerMatch ? bearerMatch[1].trim() : '') ||
      request.headers.get('x-kugou-token')?.trim() ||
      undefined;
    const userid = request.headers.get('x-kugou-userid')?.trim() || undefined;
    const auth = (token || userid) ? { token, userid } : undefined;

    // ── Kugou QR login endpoints (Sensitive / Auth API) ──
    if (url.pathname === '/api/kugou/login/qr') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' },
          }),
          { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET, OPTIONS', ...responseHeaders } },
        );
      }
      try {
        const qrSession = await createKugouQrCode();
        return new Response(JSON.stringify({ success: true, data: qrSession }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...responseHeaders },
        });
      } catch (err: unknown) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UPSTREAM_ERROR',
              message: err instanceof Error ? err.message : 'Failed to generate Kugou QR code',
            },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
        );
      }
    }

    if (url.pathname === '/api/kugou/login/check') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' },
          }),
          { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET, OPTIONS', ...responseHeaders } },
        );
      }
      const qrcode = url.searchParams.get('qrcode');
      if (!qrcode) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Missing required query parameter: qrcode' },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
        );
      }
      try {
        const statusResult = await checkKugouQrCode(qrcode);
        return new Response(JSON.stringify({ success: true, data: statusResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...responseHeaders },
        });
      } catch (err: unknown) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UPSTREAM_ERROR',
              message: err instanceof Error ? err.message : 'Failed to check Kugou QR status',
            },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
        );
      }
    }

    // Kugou session status validation endpoint
    if (url.pathname === '/api/kugou/auth/status') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' },
          }),
          { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET, OPTIONS', ...responseHeaders } },
        );
      }

      if (!token || !userid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Missing Authorization Bearer token or X-Kugou-Userid header.',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
        );
      }

      try {
        await fetchKugouUserPlaylists(token, userid);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: 'valid',
              userid,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
        );
      } catch (err: unknown) {
        if (
          err instanceof ProviderError &&
          (err.code === 'FORBIDDEN' || (err.details as any)?.authInvalid)
        ) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                status: 'invalid',
                message: 'Kugou session expired or rejected by upstream service.',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UPSTREAM_ERROR',
              message: 'Kugou upstream service temporarily unavailable. Could not verify session status.',
            },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
        );
      }
    }

    // ── Public API v1: Universal Search / Auto Resolver ──
    if (url.pathname === '/api/v1/resolve') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `HTTP method ${request.method} is not allowed on this endpoint. Use GET.`,
            },
          }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              Allow: 'GET, OPTIONS',
              ...responseHeaders,
            },
          },
        );
      }

      // Rate limit check: max 30 requests / minute per client IP
      const rateCheck = checkRateLimit(clientIp, 30, 60, 'resolve');
      if (!rateCheck.allowed) {
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'resolve', 'all'));
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

      try {
        const resolveData: ResolveData = await resolveService({
          q: rawQ || '',
          type: rawType,
          platform: rawPlatform,
          auth,
          request,
          db: _env.DB,
          ctx: _ctx,
        });

        const successResponse: ApiResponse<ResolveData> = {
          success: true,
          data: resolveData,
        };
        return new Response(JSON.stringify(successResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
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
    }

    // ── Single Playlist Endpoints (/api/v1/playlist & /api/playlist) ──
    if (url.pathname === '/api/playlist' || url.pathname === '/api/v1/playlist') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `HTTP method ${request.method} is not allowed on this endpoint. Use GET.`,
            },
          }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              Allow: 'GET, OPTIONS',
              ...responseHeaders,
            },
          },
        );
      }

      // Rate limit check: max 30 requests / minute per client IP
      const rateCheck = checkRateLimit(clientIp, 30, 60, 'playlist');
      if (!rateCheck.allowed) {
        const rawUrlParam = url.searchParams.get('url') || url.searchParams.get('id') || '';
        const rawPlatformParam = url.searchParams.get('platform') || 'all';

        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'playlist', rawPlatformParam));
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

      try {
        const { playlist } = await parsePlaylistService({
          rawInput: rawPlaylistParam,
          platformParam,
          auth,
          request,
          db: _env.DB,
          ctx: _ctx,
        });

        const successResponse: ApiResponse<Playlist> = {
          success: true,
          data: playlist,
        };
        return new Response(JSON.stringify(successResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
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
    }

    // ── User Playlists Endpoints (/api/v1/user/playlists & /api/user/playlists) ──
    if (url.pathname === '/api/user/playlists' || url.pathname === '/api/v1/user/playlists') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `HTTP method ${request.method} is not allowed on this endpoint. Use GET.`,
            },
          }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              Allow: 'GET, OPTIONS',
              ...responseHeaders,
            },
          },
        );
      }

      // Rate limit check: max 30 requests / minute per client IP
      const rateCheck = checkRateLimit(clientIp, 30, 60, 'user_playlists');
      if (!rateCheck.allowed) {
        const userPlatformParam = url.searchParams.get('platform') || 'all';
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'user_playlists', userPlatformParam));
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

      try {
        const { userData } = await fetchUserPlaylistsService({
          rawInput: rawUserInputParam,
          platformParam,
          auth,
        });

        const successResponse: ApiResponse<UserPlaylistsData> = {
          success: true,
          data: userData,
        };
        return new Response(JSON.stringify(successResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
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
    }

    // ── Anonymous Aggregate Statistics Endpoints (/api/v1/stats & /api/stats) ──
    if (url.pathname === '/api/stats' || url.pathname === '/api/v1/stats') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `HTTP method ${request.method} is not allowed on this endpoint. Use GET.`,
            },
          }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              Allow: 'GET, OPTIONS',
              ...responseHeaders,
            },
          },
        );
      }

      // Rate limit check: max 60 requests / minute per client IP
      const rateCheck = checkRateLimit(clientIp, 60, 60, 'stats');
      if (!rateCheck.allowed) {
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'stats', 'all'));
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

      const stats: PublicStatsResponse = await getPublicStats(_env.DB);
      const response: ApiResponse<PublicStatsResponse> = {
        success: true,
        data: stats,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...responseHeaders,
        },
      });
    }

    // ── Maintainer Machine Analytics Endpoint (GET /api/internal/stats) ──
    if (url.pathname === '/api/internal/stats') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: `HTTP method ${request.method} is not allowed on this endpoint. Use GET.`,
            },
          }),
          {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              Allow: 'GET',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              Pragma: 'no-cache',
              ...responseHeaders,
            },
          },
        );
      }

      // Authentication check BEFORE any DB access
      const configuredSecret = _env.INSIGHTS_ADMIN_TOKEN?.trim();
      if (!configuredSecret) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Maintainer authentication secret is not configured on server.',
            },
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              Pragma: 'no-cache',
              ...responseHeaders,
            },
          },
        );
      }

      const rawAuth = request.headers.get('authorization') || '';
      const bearerMatch = rawAuth.match(/^Bearer\s+(.+)$/i);
      const providedToken = bearerMatch ? bearerMatch[1].trim() : '';

      if (!providedToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Missing or invalid Authorization Bearer token.',
            },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              Pragma: 'no-cache',
              ...responseHeaders,
            },
          },
        );
      }

      const isValid = await constantTimeCompare(providedToken, configuredSecret);
      if (!isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid maintainer authorization token.',
            },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              Pragma: 'no-cache',
              ...responseHeaders,
            },
          },
        );
      }

      // Auth verified — now query DB
      const stats: MaintainerStatsResponse = await getMaintainerStats(_env.DB);
      const response: ApiResponse<MaintainerStatsResponse> = {
        success: true,
        data: stats,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          ...responseHeaders,
        },
      });
    }

    // ── Frontend Event Ingestion Endpoint (POST /api/event) ──
    if (url.pathname === '/api/event') {
      return handleEvent(request, _env, _ctx, responseHeaders);
    }

    // Default 404
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...responseHeaders,
        },
      },
    );
  },
};
