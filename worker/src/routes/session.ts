import { Hono } from 'hono';
import { generateSessionToken } from '../security/session';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import type { Env } from '../env';

export const sessionRoutes = new Hono<{ Bindings: Env }>();

sessionRoutes.all('/session/token', async (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  const sessionToken = await generateSessionToken(c.env.INSIGHTS_ADMIN_TOKEN || '');
  return new Response(
    JSON.stringify({ success: true, data: { token: sessionToken } }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...responseHeaders,
      },
    },
  );
});
