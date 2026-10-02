/**
 * Quarantined Crawler & Anomaly Analytics Route
 *
 * GET /api/internal/quarantine — Maintainer queries isolated crawler records
 * Requires INSIGHTS_ADMIN_TOKEN via Authorization Bearer header.
 */

import type { Env } from '../index';

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function handleInternalQuarantine(
  request: Request,
  env: Env,
  responseHeaders: Record<string, string>,
  constantTimeCompare: (a: string, b: string) => Promise<boolean>,
): Promise<Response> {
  const noAuthHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    ...responseHeaders,
  };

  // 1. Token authentication
  const configuredSecret = env.INSIGHTS_ADMIN_TOKEN?.trim();
  if (!configuredSecret) {
    return jsonResponse(
      { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Maintainer authentication secret is not configured.' } },
      503,
      noAuthHeaders,
    );
  }

  const rawAuth = request.headers.get('authorization') || '';
  const bearerMatch = rawAuth.match(/^Bearer\s+(.+)$/i);
  const providedToken = bearerMatch ? bearerMatch[1].trim() : '';
  if (!providedToken) {
    return jsonResponse(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization Bearer token.' } },
      401,
      noAuthHeaders,
    );
  }

  const isValid = await constantTimeCompare(providedToken, configuredSecret);
  if (!isValid) {
    return jsonResponse(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid maintainer authorization token.' } },
      401,
      noAuthHeaders,
    );
  }

  if (request.method !== 'GET') {
    return jsonResponse(
      { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } },
      405,
      { Allow: 'GET, OPTIONS', ...noAuthHeaders },
    );
  }

  if (!env.DB) {
    return jsonResponse(
      { success: true, data: { quarantine: [], summary: [], totalRecords: 0, totalEvents: 0 } },
      200,
      noAuthHeaders,
    );
  }

  try {
    // Check if table exists
    const tableCheck = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='quarantined_stats';"
    ).first();

    if (!tableCheck) {
      return jsonResponse(
        { success: true, data: { quarantine: [], summary: [], totalRecords: 0, totalEvents: 0 } },
        200,
        noAuthHeaders,
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '200', 10)));
    const reason = url.searchParams.get('reason');

    let querySql = 'SELECT * FROM quarantined_stats';
    const bindings: string[] = [];
    if (reason) {
      querySql += ' WHERE reason = ?1';
      bindings.push(reason);
    }
    querySql += ` ORDER BY id ASC LIMIT ${limit};`;

    const stmt = env.DB.prepare(querySql);
    const rows = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

    const summaryRows = await env.DB.prepare(`
      SELECT incident_date, batch_id, reason, source_table, count(*) as records_count, sum(count) as total_events
      FROM quarantined_stats
      GROUP BY incident_date, batch_id, reason, source_table
      ORDER BY incident_date DESC, total_events DESC;
    `).all();

    const totalStats = await env.DB.prepare(`
      SELECT count(*) as total_records, sum(count) as total_events
      FROM quarantined_stats;
    `).first<{ total_records: number; total_events: number }>();

    return jsonResponse(
      {
        success: true,
        data: {
          quarantine: rows.results || [],
          summary: summaryRows.results || [],
          totalRecords: totalStats?.total_records || 0,
          totalEvents: totalStats?.total_events || 0,
        },
      },
      200,
      noAuthHeaders,
    );
  } catch (err: unknown) {
    return jsonResponse(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Database error' } },
      500,
      noAuthHeaders,
    );
  }
}
