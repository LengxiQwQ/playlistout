import { getCorsHeaders, handleOptions } from './cors';
import { type ApiResponse, type Playlist, ProviderError } from './models/playlist';
import { qqMusicProvider } from './providers/qqmusic';
import { recordParse, getAggregateStats, type AggregateStatsData } from './stats';
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
          version: '0.1.0',
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

      // Check if input is recognized by QQ Music provider
      if (!qqMusicProvider.matches(playlistInput)) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            code: 'UNSUPPORTED_URL',
            message: 'The provided URL is not a supported QQ Music playlist URL. Expected: https://y.qq.com/n/ryqq/playlist/<id>',
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
        const playlist: Playlist = await qqMusicProvider.parse(playlistInput);
        // Best-effort anonymous statistics recording (success)
        await recordParse(_env.DB, 'qqmusic', true);

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
        // Best-effort anonymous statistics recording (failure, no payload recorded)
        await recordParse(_env.DB, 'qqmusic', false);

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

      const stats: AggregateStatsData = await getAggregateStats(_env.DB);
      const response: ApiResponse<AggregateStatsData> = {
        success: true,
        data: stats,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...responseHeaders,
        },
      });
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
