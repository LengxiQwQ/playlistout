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
    const reason = url.searchParams.get('reason')?.trim() || '';
    const rawFrom = url.searchParams.get('from') || '';
    const rawTo = url.searchParams.get('to') || '';
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
    let from = validDate(rawFrom) ? rawFrom : '';
    let to = validDate(rawTo) ? rawTo : '';
    if (from && to && from > to) [from, to] = [to, from];

    const clauses: string[] = [];
    const bindings: string[] = [];
    if (reason) {
      clauses.push('reason = ?');
      bindings.push(reason);
    }
    if (from) {
      clauses.push('incident_date >= ?');
      bindings.push(from);
    }
    if (to) {
      clauses.push('incident_date <= ?');
      bindings.push(to);
    }
    const whereSql = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';

    const querySql = `SELECT * FROM quarantined_stats${whereSql} ORDER BY incident_date DESC, id DESC LIMIT ${limit};`;
    const rowStmt = env.DB.prepare(querySql);
    const rows = bindings.length > 0 ? await rowStmt.bind(...bindings).all() : await rowStmt.all();

    const summarySql = `
      SELECT incident_date, batch_id, reason, source_table, count(*) as records_count, sum(count) as total_events
      FROM quarantined_stats${whereSql}
      GROUP BY incident_date, batch_id, reason, source_table
      ORDER BY incident_date DESC, total_events DESC;
    `;
    const summaryStmt = env.DB.prepare(summarySql);
    const summaryRows = bindings.length > 0 ? await summaryStmt.bind(...bindings).all() : await summaryStmt.all();

    const totalSql = `
      SELECT count(*) as total_records, sum(count) as total_events
      FROM quarantined_stats${whereSql};
    `;
    const totalStmt = env.DB.prepare(totalSql);
    const totalStats = bindings.length > 0
      ? await totalStmt.bind(...bindings).first<{ total_records: number; total_events: number }>()
      : await totalStmt.first<{ total_records: number; total_events: number }>();

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
