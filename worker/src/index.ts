import { getCorsHeaders, handleOptions } from './cors';
import { type ApiResponse, type Playlist, type UserPlaylistsData, ProviderError } from './models/playlist';
import { qqMusicProvider, fetchQQUserPlaylists, extractQQNumber } from './providers/qqmusic';
import { neteaseProvider, fetchNeteaseUserPlaylists, extractNeteaseUserId, matchesNeteaseInput } from './providers/netease';
import { kugouProvider, createKugouQrCode, checkKugouQrCode, fetchKugouUserPlaylists } from './providers/kugou';
import { getPublicStats } from './stats';
import { recordParseEvent, recordRateLimitEvent } from './analytics/recorder';
import { classifyInputType, classifyErrorCategory } from './analytics/dimensions';
import type { PublicStatsResponse } from './analytics/types';
import { handleEvent } from './routes/event';
import { applySecurityHeaders } from './security/headers';
import { checkRateLimit } from './security/rate-limit';

export interface Env {
  ENVIRONMENT?: string;
  DB?: D1Database;
}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);
    const responseHeaders = applySecurityHeaders(corsHeaders);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/api/health') {
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

    // Kugou QR login endpoints
    if (url.pathname === '/api/kugou/login/qr') {
      if (request.method !== 'GET') {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' },
          }),
          { status: 405, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
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
          { status: 405, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
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

    // Playlist parse endpoint
    if (url.pathname === '/api/playlist') {
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
      const rateCheck = checkRateLimit(clientIp, 30, 60);
      if (!rateCheck.allowed) {
        // Record rate limit occurrence anonymously (best effort)
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'playlist', 'qqmusic'));
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

      const playlistInput = url.searchParams.get('url');

      if (!playlistInput || playlistInput.trim().length === 0) {
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

      if (playlistInput.length > 2048) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Input parameter url exceeds maximum allowed length of 2048 characters.',
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

      const authHeader = request.headers.get('authorization') || '';
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      const token =
        (bearerMatch ? bearerMatch[1].trim() : '') ||
        request.headers.get('x-kugou-token')?.trim() ||
        url.searchParams.get('token') ||
        undefined;

      const userid =
        request.headers.get('x-kugou-userid')?.trim() ||
        url.searchParams.get('userid') ||
        undefined;

      // Check provider matching
      let matchedProvider: typeof qqMusicProvider | typeof neteaseProvider | typeof kugouProvider | null = null;
      let targetPlatform: 'qqmusic' | 'netease' | 'kugou' = 'qqmusic';

      if (kugouProvider.matches(playlistInput)) {
        matchedProvider = kugouProvider;
        targetPlatform = 'kugou';
      } else if (neteaseProvider.matches(playlistInput)) {
        matchedProvider = neteaseProvider;
        targetPlatform = 'netease';
      } else if (qqMusicProvider.matches(playlistInput)) {
        matchedProvider = qqMusicProvider;
        targetPlatform = 'qqmusic';
      } else if (/^\d{4,18}$/.test(playlistInput.trim())) {
        const platformParam = url.searchParams.get('platform');
        if (platformParam === 'kugou') {
          matchedProvider = kugouProvider;
          targetPlatform = 'kugou';
        } else if (platformParam === 'netease') {
          matchedProvider = neteaseProvider;
          targetPlatform = 'netease';
        } else {
          matchedProvider = qqMusicProvider;
          targetPlatform = 'qqmusic';
        }
      }

      if (!matchedProvider) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            code: 'UNSUPPORTED_URL',
            message: 'The provided URL is not a supported QQ Music, NetEase Cloud Music, or KuGou Music playlist URL.',
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

      const startTime = Date.now();
      const inputType = classifyInputType(playlistInput);

      try {
        let playlist: Playlist;
        let actualPlatform: 'qqmusic' | 'netease' | 'kugou' = targetPlatform;
        let providerPath: ('primary' | 'fallback') | undefined;

        try {
          if (matchedProvider === kugouProvider) {
            playlist = await kugouProvider.parse(playlistInput, { token, userid });
            actualPlatform = 'kugou';
          } else {
            playlist = await matchedProvider.parse(playlistInput);
            actualPlatform = (playlist.platform as 'qqmusic' | 'netease' | 'kugou') || targetPlatform;
            providerPath = (playlist as any).__providerPath as ('primary' | 'fallback') | undefined;
          }
        } catch (err: unknown) {
          const platformParam = url.searchParams.get('platform');
          if (!platformParam && /^\d{4,18}$/.test(playlistInput.trim()) && matchedProvider === qqMusicProvider) {
            playlist = await neteaseProvider.parse(playlistInput);
            actualPlatform = 'netease';
            targetPlatform = 'netease';
          } else {
            throw err;
          }
        }

        const latencyMs = Date.now() - startTime;

        // Best-effort anonymous statistics recording (success) with real providerPath
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(
            recordParseEvent(_env.DB, {
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
        const latencyMs = Date.now() - startTime;
        const errorCode = err instanceof ProviderError ? err.code : 'INTERNAL_ERROR';
        const errorCategory = classifyErrorCategory(errorCode);

        // Best-effort anonymous statistics recording (failure)
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(
            recordParseEvent(_env.DB, {
              request,
              platform: targetPlatform,
              inputType,
              success: false,
              errorCategory,
              latencyMs,
            }),
          );
        }

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

    // User playlists endpoint (Batch QQ Music support)
    if (url.pathname === '/api/user/playlists') {
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
      const rateCheck = checkRateLimit(clientIp, 30, 60);
      if (!rateCheck.allowed) {
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'playlist', 'qqmusic'));
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

      const rawUserInput = url.searchParams.get('uin') || url.searchParams.get('uid') || url.searchParams.get('url');
      if (!rawUserInput || rawUserInput.trim().length === 0) {
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

      // Kugou User Playlists branch (requires token & userid)
      if (platformParam === 'kugou' || kugouProvider.matches(rawUserInput)) {
        const authHeader = request.headers.get('authorization') || '';
        const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        const token =
          (bearerMatch ? bearerMatch[1].trim() : '') ||
          request.headers.get('x-kugou-token')?.trim() ||
          url.searchParams.get('token');
        const userid =
          request.headers.get('x-kugou-userid')?.trim() ||
          url.searchParams.get('userid') ||
          url.searchParams.get('uid') ||
          url.searchParams.get('uin');
        if (!token || !userid) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'Kugou user playlists require both token and userid from QR login.',
              },
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
          );
        }
        try {
          const userData = await fetchKugouUserPlaylists(token, userid);
          return new Response(JSON.stringify({ success: true, data: userData }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...responseHeaders },
          });
        } catch (err: unknown) {
          if (err instanceof ProviderError) {
            return new Response(
              JSON.stringify({
                success: false,
                error: { code: err.code, message: err.message, details: err.details },
              }),
              { status: err.statusCode, headers: { 'Content-Type': 'application/json', ...responseHeaders } },
            );
          }
          throw err;
        }
      }

      const isNetease = matchesNeteaseInput(rawUserInput) || platformParam === 'netease';

      if (isNetease) {
        const extractedUid = await extractNeteaseUserId(rawUserInput);
        if (!extractedUid) {
          const errorResponse: ApiResponse<never> = {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: `The provided input is not a valid NetEase user ID or profile URL: "${rawUserInput}"`,
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

        try {
          const userData: UserPlaylistsData = await fetchNeteaseUserPlaylists(extractedUid);
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
          throw err;
        }
      }

      const extractedUin = extractQQNumber(rawUserInput);
      if (!extractedUin) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `The provided input is not a valid QQ number or profile URL: "${rawUserInput}"`,
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

      try {
        const userData: UserPlaylistsData = await fetchQQUserPlaylists(extractedUin);
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
        if (!platformParam && /^\d{4,18}$/.test(rawUserInput.trim())) {
          try {
            const neteaseUserData = await fetchNeteaseUserPlaylists(rawUserInput.trim());
            const successResponse: ApiResponse<UserPlaylistsData> = {
              success: true,
              data: neteaseUserData,
            };
            return new Response(JSON.stringify(successResponse), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ...responseHeaders,
              },
            });
          } catch {
            // Proceed to error handling below
          }
        }

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

    // Anonymous aggregate statistics endpoint
    if (url.pathname === '/api/stats') {
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
      const rateCheck = checkRateLimit(clientIp, 60, 60);
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

    // Frontend event ingestion endpoint (export/clipboard analytics)
    if (url.pathname === '/api/event') {
      // Rate limit check: max 60 requests / minute per client IP
      const rateCheck = checkRateLimit(clientIp, 60, 60);
      if (!rateCheck.allowed) {
        if (_ctx && typeof _ctx.waitUntil === 'function') {
          _ctx.waitUntil(recordRateLimitEvent(_env.DB, 'event', 'all'));
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
