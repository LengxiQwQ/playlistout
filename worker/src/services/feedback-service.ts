/**
 * Parse Failure Feedback Service
 *
 * Stores user-submitted feedback for playlist URLs that failed to parse.
 * Users explicitly opt in by clicking "Report this" on error cards.
 *
 * PRIVACY:
 * - No IP addresses, user agents, cookies, or user identifiers are stored.
 * - Only the submitted URL, error code, platform hint, and timestamps are kept.
 * - Feedback data is exposed ONLY through the token-authenticated internal endpoint.
 */

import type { ApiErrorCode } from '../models/playlist';
import { SUPPORTED_PLATFORMS } from '../analytics/types';

/** Error codes that are eligible for user feedback (excludes rate-limit / auth / method errors). */
export const FEEDBACK_ELIGIBLE_CODES: readonly ApiErrorCode[] = [
  'INVALID_INPUT',
  'UNSUPPORTED_URL',
  'UNSUPPORTED_PLATFORM',
  'PLAYLIST_NOT_FOUND',
  'USER_NOT_FOUND',
  'UPSTREAM_ERROR',
  'UPSTREAM_TIMEOUT',
  'INCOMPLETE_PLAYLIST',
  'PARSE_ERROR',
  'INTERNAL_ERROR',
  'AMBIGUOUS_INPUT',
] as const;

export type FeedbackStatus = 'pending' | 'resolved' | 'ignored';
export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = ['pending', 'resolved', 'ignored'] as const;

export interface FeedbackEntry {
  id: number;
  url: string;
  error_code: string;
  platform: string | null;
  status: FeedbackStatus;
  report_count: number;
  first_reported_at: string;
  last_reported_at: string;
  resolved_at: string | null;
  country?: string;
  region?: string;
  city?: string;
}

export interface SubmitFeedbackResult {
  alreadyReported: boolean;
  reportCount: number;
}

const MAX_FEEDBACK_URL_LENGTH = 2048;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Inserts or updates a feedback entry.
 * If the same (url, error_code) pair already exists, increments report_count
 * and updates last_reported_at instead of creating a duplicate row.
 */
export async function submitFeedback(
  db: D1Database | undefined,
  url: string,
  errorCode: ApiErrorCode,
  platform?: string | null,
  requestOrGeo?: Request | { country?: string; region?: string; city?: string },
): Promise<SubmitFeedbackResult> {
  if (!db) {
    return { alreadyReported: false, reportCount: 1 };
  }

  const cleanUrl = url.trim().slice(0, MAX_FEEDBACK_URL_LENGTH);
  const cleanPlatform =
    platform && (SUPPORTED_PLATFORMS as readonly string[]).includes(platform.toLowerCase())
      ? platform.toLowerCase()
      : null;
  const timestamp = nowIso();

  let country = 'UNKNOWN';
  let region = 'UNKNOWN';
  let city = 'UNKNOWN';

  if (requestOrGeo) {
    if ('cf' in (requestOrGeo as any)) {
      const cf = (requestOrGeo as any).cf;
      country = cf?.country ? String(cf.country).toUpperCase().slice(0, 2) : 'UNKNOWN';
      region = cf?.region ? String(cf.region).slice(0, 50) : 'UNKNOWN';
      city = cf?.city ? String(cf.city).slice(0, 50) : 'UNKNOWN';
    } else {
      const geo = requestOrGeo as { country?: string; region?: string; city?: string };
      if (geo.country) country = String(geo.country).toUpperCase().slice(0, 2);
      if (geo.region) region = String(geo.region).slice(0, 50);
      if (geo.city) city = String(geo.city).slice(0, 50);
    }
  }

  // Try to find existing row first
  const existing = await db
    .prepare(
      `SELECT id, report_count FROM parse_feedback WHERE url = ?1 AND error_code = ?2 LIMIT 1`,
    )
    .bind(cleanUrl, errorCode)
    .first<{ id: number; report_count: number }>();

  if (existing) {
    const newCount = existing.report_count + 1;
    await db
      .prepare(
        `UPDATE parse_feedback
         SET report_count = ?1, last_reported_at = ?2, country = ?4, region = ?5, city = ?6
         WHERE id = ?3`,
      )
      .bind(newCount, timestamp, existing.id, country, region, city)
      .run();
    return { alreadyReported: true, reportCount: newCount };
  }

  await db
    .prepare(
      `INSERT INTO parse_feedback (url, error_code, platform, status, report_count, first_reported_at, last_reported_at, country, region, city)
       VALUES (?1, ?2, ?3, 'pending', 1, ?4, ?4, ?5, ?6, ?7)`,
    )
    .bind(cleanUrl, errorCode, cleanPlatform, timestamp, country, region, city)
    .run();

  return { alreadyReported: false, reportCount: 1 };
}

/**
 * Lists feedback entries for the maintainer dashboard.
 * Supports optional status filter and pagination.
 */
export async function listFeedback(
  db: D1Database | undefined,
  options?: { status?: FeedbackStatus; limit?: number; offset?: number },
): Promise<{ entries: FeedbackEntry[]; total: number }> {
  if (!db) {
    return { entries: [], total: 0 };
  }

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  const status = options?.status;

  let countSql = `SELECT COUNT(*) as total FROM parse_feedback`;
  let listSql = `SELECT * FROM parse_feedback`;
  const params: (string | number)[] = [];

  if (status) {
    countSql += ` WHERE status = ?1`;
    listSql += ` WHERE status = ?1`;
    params.push(status);
  }

  listSql += ` ORDER BY last_reported_at DESC LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`;
  params.push(limit, offset);

  const countResult = await db.prepare(countSql).bind(...(status ? [status] : [])).first<{ total: number }>();
  const listResult = await db.prepare(listSql).bind(...params).all<FeedbackEntry>();

  return {
    entries: listResult.results || [],
    total: countResult?.total ?? 0,
  };
}

/**
 * Updates the status of a feedback entry (resolved / ignored).
 * Sets resolved_at when marking as resolved, clears it otherwise.
 */
export async function updateFeedbackStatus(
  db: D1Database | undefined,
  id: number,
  status: FeedbackStatus,
): Promise<boolean> {
  if (!db) return false;

  const resolvedAt = status === 'resolved' ? nowIso() : null;
  const result = await db
    .prepare(
      `UPDATE parse_feedback SET status = ?1, resolved_at = ?2 WHERE id = ?3`,
    )
    .bind(status, resolvedAt, id)
    .run();

  return result.meta.changes > 0;
}
