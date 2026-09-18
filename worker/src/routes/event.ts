/**
 * POST /api/event — Frontend Event Ingestion Endpoint
 *
 * Accepts export/clipboard/visit events from the frontend for analytics tracking.
 * Strictly enforces Event Origin Gate, strict Content-Type, actual byte size guard,
 * strict JSON schema (rejecting any unknown fields), and durable abuse rate limiting.
 *
 * PRIVACY & SECURITY:
 * - No user-identifying data accepted or stored.
 * - Client deviceId is strictly removed and rejected (UV determined by server-derived hash).
 * - Supported platforms: qqmusic, netease, kugou, qishui.
 * - Export formats strictly separated from clipboard copy modes.
 * - Track counts bounded to realistic maximums (<= 50,000).
 * - Write-only endpoint — does NOT expose any statistics or data.
 * - Non-amplifying abuse protection: 429 rejections do not write to D1.
 * - Best-effort guarantee: failures never interrupt playlist parsing, exporting, or responses.
 */

import type { Env } from '../index';
import type { ApiResponse } from '../models/playlist';
import type {
  EventPayload,
  ExportFormat,
  ClipboardMode,
  SupportedPlatform,
} from '../analytics/types';
import {
  SUPPORTED_PLATFORMS,
  VALID_EXPORT_FORMATS,
  VALID_CLIPBOARD_MODES,
  MAX_TRACK_COUNT,
} from '../analytics/types';
import { recordExportEvent, recordClipboardEvent, recordVisitEvent } from '../analytics/recorder';
import { isEventOriginAllowed } from '../cors';
import { getClientIp, checkDurableRateLimit } from '../security/rate-limit';

const MAX_EVENT_BODY_SIZE = 1024; // 1KB max for event payload

interface ValidationResult {
  valid: boolean;
  error?: { code: string; message: string };
  payload?: EventPayload;
}

/**
 * Validates and normalizes the event payload strictly against schema rules.
 * Strictly rejects any unknown or extra fields to prevent data smuggling.
 */
export function validateEventPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'Request body must be a valid JSON object.' },
    };
  }

  const obj = body as Record<string, unknown>;

  // 1. type: required, must be 'export', 'clipboard', or 'visit'
  if (!('type' in obj) || typeof obj.type !== 'string') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'Field "type" is required and must be a string.' },
    };
  }

  const type = obj.type.toLowerCase().trim();
  if (type !== 'export' && type !== 'clipboard' && type !== 'visit') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'Field "type" must be either "export", "clipboard", or "visit".' },
    };
  }

  const keys = Object.keys(obj);

  // Visit payload schema
  if (type === 'visit') {
    const allowedVisitKeys = new Set(['type', 'referrer']);
    for (const key of keys) {
      if (!allowedVisitKeys.has(key)) {
        return {
          valid: false,
          error: { code: 'INVALID_INPUT', message: `Unknown field "${key}" in payload.` },
        };
      }
    }

    let referrer: string | undefined;
    if ('referrer' in obj && obj.referrer !== undefined) {
      if (typeof obj.referrer !== 'string') {
        return {
          valid: false,
          error: { code: 'INVALID_INPUT', message: 'Field "referrer" must be a string if provided.' },
        };
      }
      referrer = obj.referrer.trim().slice(0, 500);
    }

    return {
      valid: true,
      payload: { type: 'visit', referrer },
    };
  }

  // Export / Clipboard payload schema
  const allowedActionKeys = new Set(['type', 'platform', 'format', 'trackCount']);
  for (const key of keys) {
    if (!allowedActionKeys.has(key)) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: `Unknown field "${key}" in payload.` },
      };
    }
  }

  // 2. platform: required, must be in SUPPORTED_PLATFORMS allowlist
  if (!('platform' in obj) || typeof obj.platform !== 'string') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'Field "platform" is required and must be a string.' },
    };
  }

  const platform = obj.platform.toLowerCase().trim();
  if (!(SUPPORTED_PLATFORMS as readonly string[]).includes(platform)) {
    return {
      valid: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: `Platform "${obj.platform}" is not supported. Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`,
      },
    };
  }

  // 3. format: required, must match type-specific allowlist
  if (!('format' in obj) || typeof obj.format !== 'string') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'Field "format" is required and must be a string.' },
    };
  }

  const format = obj.format.toLowerCase().trim();

  if (type === 'export') {
    if (!(VALID_EXPORT_FORMATS as readonly string[]).includes(format)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: `Field "format" for export must be one of: ${VALID_EXPORT_FORMATS.join(', ')}. Received: "${obj.format}".`,
        },
      };
    }
  } else {
    // type === 'clipboard'
    if (!(VALID_CLIPBOARD_MODES as readonly string[]).includes(format)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: `Field "format" for clipboard must be one of: title, title-artist, title-artist-album. Received: "${obj.format}".`,
        },
      };
    }
  }

  // 4. trackCount: optional, but if present must be integer in [0, MAX_TRACK_COUNT]
  let trackCount: number | undefined;
  if ('trackCount' in obj && obj.trackCount !== undefined) {
    if (
      obj.trackCount === null ||
      typeof obj.trackCount !== 'number' ||
      !Number.isInteger(obj.trackCount) ||
      isNaN(obj.trackCount)
    ) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'Field "trackCount" must be an integer if provided.' },
      };
    }

    if (obj.trackCount < 0) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'Field "trackCount" cannot be negative.' },
      };
    }

    if (obj.trackCount > MAX_TRACK_COUNT) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: `Field "trackCount" exceeds maximum allowed limit of ${MAX_TRACK_COUNT}.`,
        },
      };
    }

    trackCount = obj.trackCount;
  }

  if (type === 'export') {
    return {
      valid: true,
      payload: {
        type: 'export',
        format: format as ExportFormat,
        platform: platform as SupportedPlatform,
        trackCount,
      },
    };
  }

  return {
    valid: true,
    payload: {
      type: 'clipboard',
      format: format as ClipboardMode,
      platform: platform as SupportedPlatform,
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
  // 1. Method check: only POST is allowed
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

  // 2. Exact Origin Gate: reject missing, null, or unauthorized origins before any parsing or DB access
  const origin = request.headers.get('Origin');
  if (!origin || !isEventOriginAllowed(origin)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Origin not allowed or missing.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          Vary: 'Origin',
        },
      },
    );
  }

  // Effective response headers with exact Origin for CORS
  const eventResponseHeaders: Record<string, string> = {
    ...responseHeaders,
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };

  // 3. Content-Type check: strictly require application/json
  const rawContentType = request.headers.get('content-type') || '';
  const mediaType = rawContentType.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 415,
        headers: {
          'Content-Type': 'application/json',
          ...eventResponseHeaders,
        },
      },
    );
  }

  // 4. Body size check (Fast check via Content-Length, plus actual raw buffer byteLength)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_EVENT_BODY_SIZE) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Event payload too large. Maximum allowed size is 1024 bytes.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...eventResponseHeaders },
      },
    );
  }

  let rawBuffer: ArrayBuffer;
  try {
    rawBuffer = await request.arrayBuffer();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Failed to read request body.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...eventResponseHeaders },
      },
    );
  }

  if (rawBuffer.byteLength > MAX_EVENT_BODY_SIZE) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Event payload too large. Maximum allowed size is 1024 bytes.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...eventResponseHeaders },
      },
    );
  }

  // 5. Parse JSON
  let body: unknown;
  try {
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(rawBuffer);
    body = JSON.parse(text);
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
        headers: { 'Content-Type': 'application/json', ...eventResponseHeaders },
      },
    );
  }

  // 6. Validate payload against strict schema and reject unknown fields
  const validation = validateEventPayload(body);
  if (!validation.valid || !validation.payload) {
    return new Response(
      JSON.stringify({
        success: false,
        error: validation.error || { code: 'INVALID_INPUT', message: 'Invalid payload.' },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...eventResponseHeaders },
      },
    );
  }

  const { payload } = validation;

  // 7. Abuse / Rate Limiting (Multi-tier: In-Memory + Durable D1)
  const clientIp = getClientIp(request);
  const rateCheck = await checkDurableRateLimit(env.DB, clientIp, 60, 60, 'event');

  if (!rateCheck.allowed) {
    if (rateCheck.limiterFailed) {
      // Limiter experienced a database error.
      // FAIL-CLOSED for telemetry writes (skip recorder, 0 D1 writes),
      // but return 204 to user so legitimate user operations are never broken.
      return new Response(null, {
        status: 204,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          ...eventResponseHeaders,
        },
      });
    }

    // Genuinely rate-limited (exceeded budget). Return 429 without writing telemetry to D1.
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment before trying again.',
        },
      } satisfies ApiResponse<never>),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.resetSeconds),
          ...eventResponseHeaders,
        },
      },
    );
  }

  // 8. Record event asynchronously (best-effort via waitUntil)
  if (ctx && typeof ctx.waitUntil === 'function') {
    if (payload.type === 'export') {
      ctx.waitUntil(
        recordExportEvent(
          env.DB,
          request,
          payload.platform,
          payload.format,
          payload.trackCount,
        ),
      );
    } else if (payload.type === 'clipboard') {
      ctx.waitUntil(
        recordClipboardEvent(
          env.DB,
          request,
          payload.platform,
          payload.format,
          payload.trackCount,
        ),
      );
    } else if (payload.type === 'visit') {
      ctx.waitUntil(
        recordVisitEvent(
          env.DB,
          request,
          payload.referrer,
        ),
      );
    }
  }

  // 9. 204 No Content — fire-and-forget from frontend perspective
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...eventResponseHeaders,
    },
  });
}
