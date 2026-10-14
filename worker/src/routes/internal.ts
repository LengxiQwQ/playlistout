import { Hono } from 'hono';
import { verifyMaintainerAuth } from '../auth';
import { getAnalyticsV2, getAnalyticsV2Snapshot, parseAnalyticsV2Filters } from '../stats/v2';
import { getStandardResponseHeaders, methodNotAllowed } from '../utils/response';
import type { Env } from '../env';

export const internalRoutes = new Hono<{ Bindings: Env }>();

// GET /api/internal/auth/verify
internalRoutes.all('/internal/auth/verify', async (c) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  const env: Env = c.env;
  const hasConfiguredSecret = Boolean(env.INSIGHTS_ADMIN_TOKEN?.trim() || env.DASHBOARD_PASSWORD?.trim());
  if (!hasConfiguredSecret) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Maintainer authentication secret is not configured on server.' } }),
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
  if (!providedToken || !(await verifyMaintainerAuth(providedToken, env))) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid maintainer authorization token.' } }),
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

  return new Response(
    JSON.stringify({ success: true, data: { ok: true, verifiedAt: new Date().toISOString() } }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        ...responseHeaders,
      },
    },
  );
});

// GET /api/internal/analytics/v2 and /api/internal/analytics/v2/snapshot
const handleAnalytics = async (c: any) => {
  const request = c.req.raw;
  const url = new URL(request.url);
  const responseHeaders = getStandardResponseHeaders(request, url.pathname);

  if (request.method !== 'GET') {
    return methodNotAllowed(request, ['GET'], responseHeaders, 'Use GET.');
  }

  const env: Env = c.env;
  const hasConfiguredSecret = Boolean(env.INSIGHTS_ADMIN_TOKEN?.trim() || env.DASHBOARD_PASSWORD?.trim());
  if (!hasConfiguredSecret) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Maintainer authentication secret is not configured on server.' } }),
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
  if (!providedToken || !(await verifyMaintainerAuth(providedToken, env))) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid maintainer authorization token.' } }),
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

  if (url.pathname.endsWith('/snapshot')) {
    const analytics = await getAnalyticsV2Snapshot(env.DB);

    let quarantine: unknown[] = [];
    let feedback: unknown[] = [];
    if (env.DB) {
      const [quarantineResult, feedbackResult] = await Promise.all([
        (async () => {
          try {
            const table = await env.DB!.prepare(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='quarantined_stats';",
            ).first();
            if (!table) return [];
            const rows = await env.DB!.prepare(
              'SELECT * FROM quarantined_stats ORDER BY incident_date DESC, id DESC',
            ).all();
            return rows.results || [];
          } catch {
            return [];
          }
        })(),
        (async () => {
          try {
            const table = await env.DB!.prepare(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='parse_feedback';",
            ).first();
            if (!table) return [];
            const rows = await env.DB!.prepare(
              'SELECT * FROM parse_feedback ORDER BY last_reported_at DESC, id DESC',
            ).all();
            return rows.results || [];
          } catch {
            return [];
          }
        })(),
      ]);
      quarantine = quarantineResult;
      feedback = feedbackResult;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...analytics,
          quarantine,
          feedback,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          ...responseHeaders,
        },
      },
    );
  }

  const analytics = await getAnalyticsV2(env.DB, parseAnalyticsV2Filters(url));
  return new Response(JSON.stringify({ success: true, data: analytics }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      ...responseHeaders,
    },
  });
};

internalRoutes.all('/internal/analytics/v2', handleAnalytics);
internalRoutes.all('/internal/analytics/v2/snapshot', handleAnalytics);
