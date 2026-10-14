import { Hono } from 'hono';
import { handleOptions } from './cors';
import { getStandardResponseHeaders } from './utils/response';
import { hasForbiddenCredentialQueryParams } from './security/client-auth';
import { constantTimeCompare } from './auth';
import type { Env } from './env';

// Route modules
import { healthRoutes } from './routes/health';
import { sessionRoutes } from './routes/session';
import { resolveRoutes } from './routes/resolve';
import { playlistRoutes } from './routes/playlist';
import { userRoutes } from './routes/user';
import { kugouAuthRoutes } from './routes/kugouAuth';
import { statsRoutes } from './routes/stats';
import { internalRoutes } from './routes/internal';
import { handleSoundiizMigration } from './routes/migration';
import { handleEvent } from './routes/event';
import { handleFeedback, handleInternalFeedback } from './routes/feedback';
import { handleInternalQuarantine } from './routes/quarantine';

const app = new Hono<{ Bindings: Env }>();

// 1. Global Preflight & Security Check
app.use('*', async (c, next) => {
  const req = c.req.raw;
  const url = new URL(req.url);

  // Handle CORS preflight directly
  if (req.method === 'OPTIONS') {
    return handleOptions(req, url.pathname);
  }

  const responseHeaders = getStandardResponseHeaders(req, url.pathname);

  // Explicitly reject any arbitrary proxy requests (strict constitutional rule §1 & §8)
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

  // Global security check: strictly prohibit passing credentials in query parameters
  if (hasForbiddenCredentialQueryParams(url)) {
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

  return next();
});

// 2. Mount Route Modules
app.route('/', healthRoutes);
app.route('/api', sessionRoutes);
app.route('/api', resolveRoutes);
app.route('/api', playlistRoutes);
app.route('/api', userRoutes);
app.route('/api', kugouAuthRoutes);
app.route('/api', statsRoutes);
app.route('/api', internalRoutes);

// 3. Mount standalone route handlers with correct argument signatures
app.all('/api/migrate/soundiiz', (c) => {
  const req = c.req.raw;
  const headers = getStandardResponseHeaders(req, '/api/migrate/soundiiz');
  const ctx = c.executionCtx as any as ExecutionContext;
  return handleSoundiizMigration(req, c.env, headers, ctx);
});

app.all('/api/event', (c) => {
  const req = c.req.raw;
  const headers = getStandardResponseHeaders(req, '/api/event');
  const ctx = c.executionCtx as any as ExecutionContext;
  return handleEvent(req, c.env, ctx, headers);
});

app.all('/api/feedback', (c) => {
  const req = c.req.raw;
  const headers = getStandardResponseHeaders(req, '/api/feedback');
  const ctx = c.executionCtx as any as ExecutionContext;
  return handleFeedback(req, c.env, ctx, headers);
});

app.all('/api/internal/feedback', (c) => {
  const req = c.req.raw;
  const headers = getStandardResponseHeaders(req, '/api/internal/feedback');
  return handleInternalFeedback(req, c.env, headers, constantTimeCompare);
});

app.all('/api/internal/quarantine', (c) => {
  const req = c.req.raw;
  const headers = getStandardResponseHeaders(req, '/api/internal/quarantine');
  return handleInternalQuarantine(req, c.env, headers, constantTimeCompare);
});

// 4. 404 for unrecognized paths
app.notFound((c) => {
  const req = c.req.raw;
  const url = new URL(req.url);
  const responseHeaders = getStandardResponseHeaders(req, url.pathname);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint "${url.pathname}" does not exist.`,
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
});

export default app;
