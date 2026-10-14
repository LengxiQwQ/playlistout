import { Hono } from 'hono';
import { providerRegistry } from '../providers';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import type { Env } from '../env';

export const providersRoutes = new Hono<{ Bindings: Env }>();

const handleProviders = (c: any) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders);
  }

  const providers = providerRegistry.getAllMeta();

  return new Response(
    JSON.stringify({
      success: true,
      data: providers,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        ...responseHeaders,
      },
    },
  );
};

providersRoutes.all('/providers', handleProviders);
providersRoutes.all('/v1/providers', handleProviders);
