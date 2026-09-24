/**
 * Feedback Endpoints
 *
 * POST /api/feedback           — User submits a failed playlist URL for maintainer review
 * GET  /api/internal/feedback  — Maintainer lists feedback entries (token required)
 * PUT  /api/internal/feedback  — Maintainer updates entry status (token required)
 *
 * SECURITY:
 * - POST endpoint enforces exact Origin allowlist (same as /api/event).
 * - Durable rate limiting prevents abuse.
 * - Internal endpoints require INSIGHTS_ADMIN_TOKEN via Authorization header.
 * - URL length bounded to 2048; error code restricted to eligible allowlist.
 */

import type { Env } from '../index';
import type { ApiResponse } from '../models/playlist';
import type { ApiErrorCode } from '../models/playlist';
import {
  submitFeedback,
  listFeedback,
  updateFeedbackStatus,
  FEEDBACK_ELIGIBLE_CODES,
  FEEDBACK_STATUSES,
  type FeedbackStatus,
} from '../services/feedback-service';
import { isEventOriginAllowed } from '../cors';
import { getClientIp, checkDurableRateLimit } from '../security/rate-limit';

const MAX_FEEDBACK_BODY = 2048;

interface FeedbackPayload {
  url: string;
  errorCode: ApiErrorCode;
  platform?: string;
}

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

/**
 * POST /api/feedback — user-submitted parse failure feedback.
 */
export async function handleFeedback(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  responseHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } },
      405,
      { Allow: 'POST, OPTIONS', ...responseHeaders },
    );
  }

  // 1. Exact Origin Gate
  const origin = request.headers.get('Origin');
  if (!origin || !isEventOriginAllowed(origin)) {
    return jsonResponse(
      { success: false, error: { code: 'FORBIDDEN', message: 'Origin not allowed or missing.' } },
      403,
      { Vary: 'Origin' },
    );
  }

  const feedbackHeaders: Record<string, string> = {
    ...responseHeaders,
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };

  // 2. Content-Type check
  const mediaType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return jsonResponse(
      { success: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json.' } },
      415,
      feedbackHeaders,
    );
  }

  // 3. Bounded body read
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsed = parseInt(contentLength, 10);
    if (!isNaN(parsed) && parsed > MAX_FEEDBACK_BODY) {
      return jsonResponse(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Request body too large.' } },
        400,
        feedbackHeaders,
      );
    }
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_FEEDBACK_BODY) {
      return jsonResponse(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Request body too large.' } },
        400,
        feedbackHeaders,
      );
    }
    body = JSON.parse(text);
  } catch {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Invalid JSON in request body.' } },
      400,
      feedbackHeaders,
    );
  }

  // 4. Schema validation
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Request body must be a JSON object.' } },
      400,
      feedbackHeaders,
    );
  }

  const obj = body as Record<string, unknown>;
  const allowedKeys = new Set(['url', 'errorCode', 'platform']);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return jsonResponse(
        { success: false, error: { code: 'INVALID_INPUT', message: `Unknown field "${key}".` } },
        400,
        feedbackHeaders,
      );
    }
  }

  if (typeof obj.url !== 'string' || obj.url.trim().length === 0) {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Field "url" is required and must be a non-empty string.' } },
      400,
      feedbackHeaders,
    );
  }

  if (typeof obj.errorCode !== 'string') {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Field "errorCode" is required and must be a string.' } },
      400,
      feedbackHeaders,
    );
  }

  if (!(FEEDBACK_ELIGIBLE_CODES as readonly string[]).includes(obj.errorCode)) {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_INPUT', message: 'Field "errorCode" is not eligible for feedback.' } },
      400,
      feedbackHeaders,
    );
  }

  const platform =
    typeof obj.platform === 'string' && obj.platform.trim().length > 0
      ? obj.platform.trim()
      : undefined;

  // 5. Rate limiting (10 submissions per minute per IP)
  const clientIp = getClientIp(request);
  const rateCheck = await checkDurableRateLimit(env.DB, clientIp, 10, 60, 'feedback', ctx);
  if (!rateCheck.allowed) {
    if (rateCheck.limiterFailed) {
      return new Response(null, { status: 204, headers: feedbackHeaders });
    }
    return jsonResponse(
      { success: false, error: { code: 'RATE_LIMITED', message: 'Too many feedback submissions. Please wait a moment.' } },
      429,
      { 'Retry-After': String(rateCheck.resetSeconds), ...feedbackHeaders },
    );
  }

  // 6. Submit feedback (best-effort, never throws to user)
  try {
    const result = await submitFeedback(
      env.DB,
      obj.url,
      obj.errorCode as ApiErrorCode,
      platform,
    );
    return jsonResponse(
      { success: true, alreadyReported: result.alreadyReported, reportCount: result.reportCount },
      200,
      feedbackHeaders,
    );
  } catch {
    return jsonResponse(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to submit feedback.' } },
      500,
      feedbackHeaders,
    );
  }
}

/**
 * GET /api/internal/feedback  — list feedback entries
 * PUT /api/internal/feedback  — update entry status (?id=xxx&status=resolved)
 * Both require INSIGHTS_ADMIN_TOKEN.
 */
export async function handleInternalFeedback(
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

  // 1. Token auth (same as /api/internal/stats)
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

  const url = new URL(request.url);

  // 2. GET — list entries
  if (request.method === 'GET') {
    const statusParam = url.searchParams.get('status');
    const status =
      statusParam && (FEEDBACK_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as FeedbackStatus)
        : undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const result = await listFeedback(env.DB, {
      status,
      limit: isNaN(limit) ? 50 : limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    return jsonResponse({ success: true, data: result }, 200, noAuthHeaders);
  }

  // 3. PUT — update status
  if (request.method === 'PUT') {
    const idParam = url.searchParams.get('id');
    const statusParam = url.searchParams.get('status');

    if (!idParam || isNaN(parseInt(idParam, 10))) {
      return jsonResponse(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Query parameter "id" is required and must be a number.' } },
        400,
        noAuthHeaders,
      );
    }

    if (!statusParam || !(FEEDBACK_STATUSES as readonly string[]).includes(statusParam)) {
      return jsonResponse(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Query parameter "status" must be one of: pending, resolved, ignored.' } },
        400,
        noAuthHeaders,
      );
    }

    const updated = await updateFeedbackStatus(env.DB, parseInt(idParam, 10), statusParam as FeedbackStatus);
    if (!updated) {
      return jsonResponse(
        { success: false, error: { code: 'NOT_FOUND', message: `Feedback entry with id ${idParam} not found.` } },
        404,
        noAuthHeaders,
      );
    }

    return jsonResponse({ success: true }, 200, noAuthHeaders);
  }

  return jsonResponse(
    { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or PUT.' } },
    405,
    { Allow: 'GET, PUT, OPTIONS', ...noAuthHeaders },
  );
}
