import { getCorsHeaders, handleOptions } from './cors';
import type { ApiResponse } from './models/playlist';

export interface Env {
  // Bindings like D1 database will be added in Phase 5
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'playlistout-api',
          version: '0.1.0',
          phase: 'P0-Infrastructure',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        },
      );
    }

    // Playlist parse endpoint (P0 skeleton)
    if (url.pathname === '/api/playlist') {
      const playlistUrl = url.searchParams.get('url');

      if (!playlistUrl) {
        const errorResponse: ApiResponse<never> = {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required query parameter: url',
          },
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }

      // Explicitly reject arbitrary URLs - only approved platforms in later phases
      const skeletonResponse: ApiResponse<never> = {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED_P0',
          message:
            'PlaylistOut is currently in Phase 0 (Infrastructure Foundation). QQ Music provider parsing will be implemented in Phase 1.',
        },
      };

      return new Response(JSON.stringify(skeletonResponse), {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Explicitly reject any arbitrary proxy requests (strict constitutional rule)
    if (url.pathname === '/proxy') {
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
            ...corsHeaders,
          },
        },
      );
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
          ...corsHeaders,
        },
      },
    );
  },
};
