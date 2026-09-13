/**
 * Analytics Recorder — Extended for Analytics Foundation
 * Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9
 * and docs/ROADMAP.md Section 2 (Analytics Foundation).
 *
 * STRICT PRIVACY RULES:
 * Never store raw IP addresses, playlist URLs/IDs, track/artist/album content,
 * cookies, authentication data, or full User-Agent strings.
 * Only anonymous aggregate counters and coarse dimensional classifications are recorded.
 *
 * All writes are best-effort: failures never interrupt playlist parsing or exporting.
 */

import { parseUserAgent } from './ua-parser';
import { classifyInputType, classifyPlaylistSize, classifyLatency, classifyErrorCategory } from './dimensions';
import type { ParseAnalyticsContext, ExportFormat } from './types';
import { getUtcDateString } from '../stats';

/**
 * Records a parse event with enriched dimensional data.
 * Writes to:
 *   1. aggregate_stats — existing public counters (success/failure + tracks_processed)
 *   2. analytics_events — private dimensional row (NOT publicly exposed)
 *
 * Best-effort: catches all D1 errors internally, never throws.
 */
export async function recordParseEvent(
  db: D1Database | undefined,
  ctx: ParseAnalyticsContext,
): Promise<void> {
  if (!db) return;

  const date = getUtcDateString();
  const metric = ctx.success ? 'parse_success' : 'parse_failure';

  const upsertSql = `
    INSERT INTO aggregate_stats (date, platform, metric, count)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT (date, platform, metric)
    DO UPDATE SET count = count + 1;
  `;

  try {
    const statements: D1PreparedStatement[] = [
      // Today's per-platform counter
      db.prepare(upsertSql).bind(date, ctx.platform, metric),
      // All-time per-platform counter
      db.prepare(upsertSql).bind('TOTAL', ctx.platform, metric),
    ];

    if (ctx.success) {
      // Global counters for all platforms combined
      statements.push(db.prepare(upsertSql).bind(date, 'all', metric));
      statements.push(db.prepare(upsertSql).bind('TOTAL', 'all', metric));

      // Track count aggregation
      if (ctx.trackCount !== undefined && ctx.trackCount > 0) {
        const trackUpsertSql = `
          INSERT INTO aggregate_stats (date, platform, metric, count)
          VALUES (?1, ?2, 'tracks_processed', ?3)
          ON CONFLICT (date, platform, metric)
          DO UPDATE SET count = count + ?3;
        `;
        statements.push(db.prepare(trackUpsertSql).bind(date, ctx.platform, ctx.trackCount));
        statements.push(db.prepare(trackUpsertSql).bind('TOTAL', ctx.platform, ctx.trackCount));
        statements.push(db.prepare(trackUpsertSql).bind(date, 'all', ctx.trackCount));
        statements.push(db.prepare(trackUpsertSql).bind('TOTAL', 'all', ctx.trackCount));
      }
    }

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record aggregate stats:', err);
  }

  // Write private dimensional analytics event (separate try/catch)
  try {
    const ua = parseUserAgent(ctx.request.headers.get('User-Agent'));
    const now = new Date();
    const hourBucket = now.getUTCHours();

    // Extract geography from Cloudflare's cf object (available on production Workers)
    const cf = (ctx.request as any).cf;
    const country: string | null = cf?.country ?? null;
    const region: string | null = cf?.region ?? null;

    const result = ctx.success ? 'success' : (ctx.errorCategory ?? classifyErrorCategory(undefined));
    const errorCat = ctx.success ? null : (ctx.errorCategory ?? classifyErrorCategory(undefined));

    await db.prepare(`
      INSERT INTO analytics_events (
        date, hour_bucket, country, region, platform, event_type,
        input_type, result, error_category, playlist_size_bucket,
        track_count, export_format, device_class, browser_family,
        os_family, latency_bucket, provider_path
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, 'parse',
        ?6, ?7, ?8, ?9,
        ?10, NULL, ?11, ?12,
        ?13, ?14, ?15
      )
    `).bind(
      date,
      hourBucket,
      country,
      region,
      ctx.platform,
      ctx.inputType ?? null,
      result,
      errorCat,
      ctx.trackCount !== undefined ? classifyPlaylistSize(ctx.trackCount) : null,
      ctx.trackCount ?? null,
      ua.deviceClass,
      ua.browserFamily,
      ua.osFamily,
      classifyLatency(ctx.latencyMs),
      ctx.providerPath ?? null,
    ).run();
  } catch (err: unknown) {
    console.error('Failed to record analytics event:', err);
  }
}

/**
 * Records an export or clipboard event.
 * Writes to:
 *   1. aggregate_stats — increment 'exports_total' metric
 *   2. daily_export_stats — aggregate by format
 *   3. analytics_events — private dimensional row
 *
 * Best-effort: catches all D1 errors internally, never throws.
 */
export async function recordExportEvent(
  db: D1Database | undefined,
  request: Request,
  platform: string,
  exportFormat: ExportFormat,
  eventType: 'export' | 'clipboard',
  trackCount?: number,
): Promise<void> {
  if (!db) return;

  const date = getUtcDateString();

  // 1. Increment global export counter
  try {
    const upsertSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, 'exports_total', 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const exportUpsertSql = `
      INSERT INTO daily_export_stats (date, platform, export_format, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, export_format)
      DO UPDATE SET count = count + 1;
    `;

    await db.batch([
      db.prepare(upsertSql).bind(date, platform),
      db.prepare(upsertSql).bind('TOTAL', platform),
      db.prepare(upsertSql).bind(date, 'all'),
      db.prepare(upsertSql).bind('TOTAL', 'all'),
      db.prepare(exportUpsertSql).bind(date, platform, exportFormat),
      db.prepare(exportUpsertSql).bind('TOTAL', platform, exportFormat),
    ]);
  } catch (err: unknown) {
    console.error('Failed to record export aggregate stats:', err);
  }

  // 2. Write private dimensional analytics event
  try {
    const ua = parseUserAgent(request.headers.get('User-Agent'));
    const now = new Date();
    const hourBucket = now.getUTCHours();

    const cf = (request as any).cf;
    const country: string | null = cf?.country ?? null;
    const region: string | null = cf?.region ?? null;

    await db.prepare(`
      INSERT INTO analytics_events (
        date, hour_bucket, country, region, platform, event_type,
        input_type, result, error_category, playlist_size_bucket,
        track_count, export_format, device_class, browser_family,
        os_family, latency_bucket, provider_path
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6,
        NULL, 'success', NULL, ?7,
        ?8, ?9, ?10, ?11,
        ?12, NULL, NULL
      )
    `).bind(
      date,
      hourBucket,
      country,
      region,
      platform,
      eventType,
      trackCount !== undefined ? classifyPlaylistSize(trackCount) : null,
      trackCount ?? null,
      exportFormat,
      ua.deviceClass,
      ua.browserFamily,
      ua.osFamily,
    ).run();
  } catch (err: unknown) {
    console.error('Failed to record export analytics event:', err);
  }
}
