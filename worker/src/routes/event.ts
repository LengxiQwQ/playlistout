/**
 * POST /api/event — Frontend Event Ingestion Endpoint
 *
 * Accepts export/clipboard events from the frontend for analytics tracking.
 * Validates payload strictly, records to aggregate tables in D1, returns 204 No Content.
 *
 * PRIVACY & SECURITY:
 * - No user-identifying data accepted or stored.
 * - Platform allowlist strictly enforced (qqmusic only).
 * - Export formats strictly separated from clipboard copy modes.
 * - Track counts bounded to realistic maximums (<= 50,000).
 * - Write-only endpoint — does NOT expose any statistics or data.
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

const MAX_EVENT_BODY_SIZE = 1024; // 1KB max for event payload

interface ValidationResult {
  valid: boolean;
  error?: { code: string; message: string };
  payload?: EventPayload;
}

/**
 * Validates and normalizes the event payload strictly against schema rules.
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
  if (!obj.type || typeof obj.type !== 'string') {
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

  if (type === 'visit') {
    const rawDeviceId = obj.deviceId;
    const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim().slice(0, 64) : undefined;
    return {
      valid: true,
      payload: { type: 'visit', deviceId },
    };
  }

  // 2. platform: required, must be in SUPPORTED_PLATFORMS allowlist
  if (!obj.platform || typeof obj.platform !== 'string') {
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
  if (!obj.format || typeof obj.format !== 'string') {
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
          message: 'Event payload too large. Maximum allowed size is 1024 bytes.',
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
  if (!validation.valid || !validation.payload) {
    return new Response(
      JSON.stringify({
        success: false,
        error: validation.error || { code: 'INVALID_INPUT', message: 'Invalid payload.' },
      } satisfies ApiResponse<never>),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...responseHeaders },
      },
    );
  }

  const { payload } = validation;

  // Record event asynchronously (best-effort via waitUntil)
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
          payload.deviceId,
        ),
      );
    }
  }

  // 204 No Content — fire-and-forget from frontend perspective
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...responseHeaders,
    },
  });
}
