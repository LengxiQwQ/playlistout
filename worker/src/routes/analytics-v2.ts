import type { Env } from '../index';
import type { ApiResponse } from '../models/playlist';
import {
  getAnalyticsV2Dashboard,
  getAnalyticsV2FilterOptions,
  parseAnalyticsV2Filters,
} from '../analytics/v2/query';

type TokenCompare = (provided: string, configured: string) => Promise<boolean>;

function noStoreHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Vary: 'Origin',
    ...extra,
  };
}

export async function handleInternalAnalyticsV2(
  request: Request,
  env: Env,
  responseHeaders: Record<string, string>,
  compareToken: TokenCompare,
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } }),
      { status: 405, headers: noStoreHeaders({ Allow: 'GET, OPTIONS' }) },
    );
  }

  const configured = (env.INSIGHTS_ADMIN_TOKEN || '').trim();
  if (!configured) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Maintainer analytics is not configured.' } }),
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const auth = request.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1]?.trim() || '';
  if (!provided || !(await compareToken(provided, configured))) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid maintainer authorization token.' } }),
      { status: 401, headers: noStoreHeaders() },
    );
  }

  try {
    const url = new URL(request.url);
    const filters = parseAnalyticsV2Filters(url);
    const mode = url.searchParams.get('mode') || 'dashboard';
    const data = mode === 'filters'
      ? await getAnalyticsV2FilterOptions(env.DB, filters)
      : await getAnalyticsV2Dashboard(env.DB, filters);

    const response: ApiResponse<typeof data> = { success: true, data };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: noStoreHeaders(responseHeaders),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Analytics query failed.';
    const status = /Invalid|date range|filter|may not exceed/.test(message) ? 400 : 500;
    return new Response(
      JSON.stringify({ success: false, error: { code: status === 400 ? 'INVALID_INPUT' : 'INTERNAL_ERROR', message } }),
      { status, headers: noStoreHeaders() },
    );
  }
}
