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
         SET report_count = ?1, last_reported_at = ?2
         WHERE id = ?3`,
      )
      .bind(newCount, timestamp, existing.id)
      .run();
    return { alreadyReported: true, reportCount: newCount };
  }

  await db
    .prepare(
      `INSERT INTO parse_feedback (url, error_code, platform, status, report_count, first_reported_at, last_reported_at)
       VALUES (?1, ?2, ?3, 'pending', 1, ?4, ?4)`,
    )
    .bind(cleanUrl, errorCode, cleanPlatform, timestamp)
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
