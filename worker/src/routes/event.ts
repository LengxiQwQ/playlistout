/**
 * POST /api/event — Frontend Event Ingestion Endpoint
 *
 * Accepts export/clipboard events from the frontend for analytics tracking.
 * Validates payload strictly, records to D1, returns 204 No Content.
 *
 * PRIVACY: No user-identifying data accepted or stored.
 * This endpoint does NOT expose any read data — it is write-only.
 */

import type { Env } from '../index';
import type { ApiResponse } from '../models/playlist';
import type { EventPayload, ExportFormat } from '../analytics/types';
import { VALID_EXPORT_FORMATS } from '../analytics/types';
import { recordExportEvent } from '../analytics/recorder';

const MAX_EVENT_BODY_SIZE = 1024; // 1KB max for event payload

/**
 * Validates and normalizes the event payload.
 * Returns null if invalid, with an error message.
 */
function validateEventPayload(body: unknown): { valid: true; payload: EventPayload } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  // type: required, must be 'export' or 'clipboard'
  if (!obj.type || (obj.type !== 'export' && obj.type !== 'clipboard')) {
    return { valid: false, error: 'Field "type" must be "export" or "clipboard".' };
  }

  // format: required, must be a valid export format
  if (!obj.format || typeof obj.format !== 'string') {
    return { valid: false, error: 'Field "format" must be a non-empty string.' };
  }

  const format = obj.format.toLowerCase();
  if (!(VALID_EXPORT_FORMATS as readonly string[]).includes(format)) {
    return { valid: false, error: `Field "format" must be one of: ${VALID_EXPORT_FORMATS.join(', ')}.` };
  }

  // platform: required, must be a non-empty string, max 50 chars
  if (!obj.platform || typeof obj.platform !== 'string' || obj.platform.length > 50) {
    return { valid: false, error: 'Field "platform" must be a non-empty string (max 50 chars).' };
  }

  // trackCount: optional, must be non-negative integer if present
  let trackCount: number | undefined;
  if (obj.trackCount !== undefined) {
    if (typeof obj.trackCount !== 'number' || !Number.isInteger(obj.trackCount) || obj.trackCount < 0) {
      return { valid: false, error: 'Field "trackCount" must be a non-negative integer if provided.' };
    }
    trackCount = obj.trackCount;
  }

  return {
    valid: true,
    payload: {
      type: obj.type as 'export' | 'clipboard',
      format: format,
      platform: obj.platform,
      trackCount,
    },
  };
}

export async function handleEvent(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  responseHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `HTTP method ${request.method} is not allowed on this endpoint. Use POST.`,
        },
      } satisfies ApiResponse<never>),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          Allow: 'POST, OPTIONS',
          ...responseHeaders,
        },
      },
    );
  }

  // Size guard
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_EVENT_BODY_SIZE) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Event payload too large.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...responseHeaders },
      },
    );
  }

  // Parse JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid JSON in request body.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...responseHeaders },
      },
    );
  }

  // Validate payload
  const validation = validateEventPayload(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: validation.error,
        },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...responseHeaders },
      },
    );
  }

  const { payload } = validation;

  // Record event asynchronously (best-effort via waitUntil)
  ctx.waitUntil(
    recordExportEvent(
      env.DB,
      request,
      payload.platform,
      payload.format as ExportFormat,
      payload.type,
      payload.trackCount,
    ),
  );

  // 204 No Content — fire-and-forget from frontend perspective
  return new Response(null, {
    status: 204,
    headers: responseHeaders,
  });
}
