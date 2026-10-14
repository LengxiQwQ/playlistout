import { Hono } from 'hono';
import { PLAYLISTOUT_VERSION } from '../version';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import type { Env } from '../env';

export const healthRoutes = new Hono<{ Bindings: Env }>();

const handleHealth = (c: any) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders);
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'playlistout-api',
      version: PLAYLISTOUT_VERSION,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...responseHeaders,
      },
    },
  );
};

healthRoutes.all('/health', handleHealth);
healthRoutes.all('/api/health', handleHealth);
healthRoutes.all('/api/v1/health', handleHealth);
