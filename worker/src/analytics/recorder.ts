/**
 * Analytics Recorder — Pure Aggregate Counters
 * Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9
 * and docs/ROADMAP.md Section 2 (Analytics Foundation).
 *
 * STRICT PRIVACY RULES:
 * - Never store raw IP addresses, playlist URLs/IDs, track/artist/album content,
 *   cookies, authentication data, or full User-Agent strings.
 * - Do NOT persist per-request detail rows (no transaction log).
 * - All metrics are stored as discrete daily/hourly atomic aggregate counters.
 * - Zero ability to correlate dimensions to single user requests.
 * - Best-effort guarantee: failures never interrupt playlist parsing, exporting, or responses.
 */

import { parseUserAgent } from './ua-parser';
import { classifyPlaylistSize, classifyLatency, classifyErrorCategory } from './dimensions';
import type {
  ParseAnalyticsContext,
  ExportFormat,
  ClipboardMode,
  CanonicalClipboardMode,
} from './types';
import { getUtcDateString } from '../stats';

/**
 * Classifies a Referer header or document.referrer into a coarse, privacy-safe source category.
 * PRIVACY: The full Referer URL is NEVER stored — only the coarse category label.
 */
export function classifyReferrer(referer: string | null): string {
  if (!referer) return 'direct';
  const lower = referer.toLowerCase().trim();
  if (!lower || lower === 'direct') return 'direct';

  // Self domains (internal clicks / refreshes)
  if (/playlistout\.lengxiqwq\.com|localhost|127\.0\.0\.1/i.test(lower)) {
    return 'direct';
  }

  // 1. AI Assistants (ChatGPT, Claude, DeepSeek, Copilot, Gemini, Kimi)
  if (/chatgpt\.|openai\./i.test(lower) || lower.includes('chatgpt')) return 'chatgpt';
  if (/claude\.ai/i.test(lower) || lower.includes('claude')) return 'claude';
  if (/deepseek\./i.test(lower) || lower.includes('deepseek')) return 'deepseek';
  if (/copilot\.microsoft|github\.com\/copilot/i.test(lower)) return 'copilot';
  if (/gemini\.google/i.test(lower)) return 'gemini';
  if (/kimi\.moonshot/i.test(lower)) return 'kimi';

  // 2. Search Engines
  if (/google\./i.test(lower)) return 'google';
  if (/baidu\./i.test(lower)) return 'baidu';
  if (/bing\./i.test(lower)) return 'bing';
  if (/sogou\./i.test(lower)) return 'sogou';
  if (/so\.com/i.test(lower)) return '360search';

  // 3. Tech & Developer Communities
  if (/github\./i.test(lower)) return 'github';
  if (/v2ex\./i.test(lower)) return 'v2ex';
  if (/juejin\./i.test(lower)) return 'juejin';
  if (/zhihu\./i.test(lower)) return 'zhihu';
  if (/bilibili\./i.test(lower)) return 'bilibili';
  if (/xiaohongshu\.|xhslink\./i.test(lower)) return 'xiaohongshu';

  // 4. Social & Messaging
  if (/weixin|wechat/i.test(lower)) return 'wechat';
  if (/weibo\./i.test(lower)) return 'weibo';
  if (/twitter\.|x\.com|t\.co/i.test(lower)) return 'twitter_x';
  if (/reddit\./i.test(lower)) return 'reddit';
  if (/facebook\.|instagram\./i.test(lower)) return 'meta_fb';
  if (/douyin\.|tiktok\./i.test(lower)) return 'douyin_tiktok';

  return 'other_web';
}


/**
 * Normalizes clipboard modes (e.g. 'title-artist' -> 'title_artist')
 */
export function normalizeClipboardMode(mode: ClipboardMode): CanonicalClipboardMode {
  if (mode === 'title-artist' || mode === 'title_artist') {
    return 'title_artist';
  }
  if (mode === 'title-artist-album' || mode === 'title_artist_album') {
    return 'title_artist_album';
  }
  return 'title';
}

/**
 * Records a parse event into purpose-built aggregate tables.
 * Writes to:
 *   1. aggregate_stats — public-safe counters (success, failure, tracks_processed)
 *   2. hourly_stats — coarse hourly throughput
 *   3. daily_geo_stats — coarse country/region distribution
 *   4. daily_client_stats — coarse device, browser, and OS distribution
 *   5. daily_performance_stats — input type, size bucket, latency, provider path, error category
 *
 * Zero per-request event log rows. Best-effort: never throws.
 */
export async function recordParseEvent(
  db: D1Database | undefined,
  ctx: ParseAnalyticsContext,
): Promise<void> {
  if (!db) return;

  try {
    const date = getUtcDateString();
    const hour = new Date().getUTCHours();
    const metric = ctx.success ? 'parse_success' : 'parse_failure';

    const upsertAggregateSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertTracksSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, 'tracks_processed', ?3)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + ?3;
    `;

    const upsertHourlySql = `
      INSERT INTO hourly_stats (date, hour, platform, metric, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, hour, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertGeoSql = `
      INSERT INTO daily_geo_stats (date, platform, country, region, city, count)
      VALUES (?1, ?2, ?3, ?4, ?5, 1)
      ON CONFLICT (date, platform, country, region, city)
      DO UPDATE SET count = count + 1;
    `;

    const upsertClientSql = `
      INSERT INTO daily_client_stats (date, platform, device_class, browser_family, os_family, count)
      VALUES (?1, ?2, ?3, ?4, ?5, 1)
      ON CONFLICT (date, platform, device_class, browser_family, os_family)
      DO UPDATE SET count = count + 1;
    `;

    const upsertPerfSql = `
      INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, platform, dimension, value)
      DO UPDATE SET count = count + 1;
    `;

    const statements: D1PreparedStatement[] = [];

    // 1. aggregate_stats
    statements.push(db.prepare(upsertAggregateSql).bind(date, ctx.platform, metric));
    statements.push(db.prepare(upsertAggregateSql).bind('TOTAL', ctx.platform, metric));

    if (ctx.success) {
      statements.push(db.prepare(upsertAggregateSql).bind(date, 'all', metric));
      statements.push(db.prepare(upsertAggregateSql).bind('TOTAL', 'all', metric));

      if (ctx.trackCount !== undefined && ctx.trackCount > 0) {
        statements.push(db.prepare(upsertTracksSql).bind(date, ctx.platform, ctx.trackCount));
        statements.push(db.prepare(upsertTracksSql).bind('TOTAL', ctx.platform, ctx.trackCount));
        statements.push(db.prepare(upsertTracksSql).bind(date, 'all', ctx.trackCount));
        statements.push(db.prepare(upsertTracksSql).bind('TOTAL', 'all', ctx.trackCount));
      }
    }

    // 2. hourly_stats
    statements.push(db.prepare(upsertHourlySql).bind(date, hour, ctx.platform, metric));
    statements.push(db.prepare(upsertHourlySql).bind(date, hour, 'all', metric));

    // 3. daily_geo_stats (derived coarse geography from Cloudflare request.cf)
    const cf = (ctx.request as any).cf;
    const country: string = cf?.country ? String(cf.country).toUpperCase().slice(0, 2) : 'UNKNOWN';
    const region: string = cf?.region ? String(cf.region).slice(0, 50) : 'UNKNOWN';
    const city: string = cf?.city ? String(cf.city).slice(0, 50) : 'UNKNOWN';

    statements.push(db.prepare(upsertGeoSql).bind(date, ctx.platform, country, region, city));
    statements.push(db.prepare(upsertGeoSql).bind('TOTAL', ctx.platform, country, region, city));

    // 4. daily_client_stats (coarse parsed categories, full UA never saved)
    const ua = parseUserAgent(ctx.request.headers.get('User-Agent'));
    statements.push(db.prepare(upsertClientSql).bind(date, ctx.platform, ua.deviceClass, ua.browserFamily, ua.osFamily));
    statements.push(db.prepare(upsertClientSql).bind('TOTAL', ctx.platform, ua.deviceClass, ua.browserFamily, ua.osFamily));

    // 5. daily_performance_stats (isolated dimension counters)
    statements.push(db.prepare(upsertPerfSql).bind(date, ctx.platform, 'input_type', ctx.inputType));

    if (ctx.success) {
      if (ctx.trackCount !== undefined && ctx.trackCount >= 0) {
        const sizeBucket = classifyPlaylistSize(ctx.trackCount);
        if (sizeBucket) {
          statements.push(db.prepare(upsertPerfSql).bind(date, ctx.platform, 'playlist_size', sizeBucket));
        }
      }
      if (ctx.providerPath) {
        statements.push(db.prepare(upsertPerfSql).bind(date, ctx.platform, 'provider_path', ctx.providerPath));
      }
      if (ctx.latencyMs !== undefined) {
        const latBucket = classifyLatency(ctx.latencyMs);
        if (latBucket) {
          statements.push(db.prepare(upsertPerfSql).bind(date, ctx.platform, 'latency_bucket', latBucket));
        }
      }
    } else {
      const errCat = ctx.errorCategory || classifyErrorCategory(undefined);
      statements.push(db.prepare(upsertPerfSql).bind(date, ctx.platform, 'error_category', errCat));
      if (ctx.latencyMs !== undefined) {
        const latBucket = classifyLatency(ctx.latencyMs);
        if (latBucket) {
          statements.push(db.prepare(upsertPerfSql).bind(date, ctx.platform, 'latency_bucket', latBucket));
        }
      }
    }

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record parse aggregate stats:', err);
  }
}

/**
 * Records a file export event (TXT, CSV, XLSX, JSON).
 * Strictly isolated from clipboard copy metrics.
 */
export async function recordExportEvent(
  db: D1Database | undefined,
  request: Request,
  platform: string,
  exportFormat: ExportFormat,
  trackCount?: number,
): Promise<void> {
  if (!db) return;

  try {
    const date = getUtcDateString();
    const hour = new Date().getUTCHours();

    const upsertAggregateSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertExportSql = `
      INSERT INTO daily_export_stats (date, platform, export_format, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, export_format)
      DO UPDATE SET count = count + 1;
    `;

    const upsertHourlySql = `
      INSERT INTO hourly_stats (date, hour, platform, metric, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, hour, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertPerfSql = `
      INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, platform, dimension, value)
      DO UPDATE SET count = count + 1;
    `;

    const statements: D1PreparedStatement[] = [
      db.prepare(upsertAggregateSql).bind(date, platform, 'exports_total'),
      db.prepare(upsertAggregateSql).bind('TOTAL', platform, 'exports_total'),
      db.prepare(upsertAggregateSql).bind(date, 'all', 'exports_total'),
      db.prepare(upsertAggregateSql).bind('TOTAL', 'all', 'exports_total'),
      db.prepare(upsertExportSql).bind(date, platform, exportFormat),
      db.prepare(upsertExportSql).bind('TOTAL', platform, exportFormat),
      db.prepare(upsertHourlySql).bind(date, hour, platform, 'export'),
      db.prepare(upsertPerfSql).bind(date, platform, 'export_format', exportFormat),
    ];

    if (trackCount !== undefined && trackCount >= 0) {
      const sizeBucket = classifyPlaylistSize(trackCount);
      if (sizeBucket) {
        statements.push(db.prepare(upsertPerfSql).bind(date, platform, 'export_playlist_size', sizeBucket));
      }
    }

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record export aggregate stats:', err);
  }
}

/**
 * Records a clipboard copy event.
 * Uses daily_clipboard_stats and 'clipboards_total'.
 * Strictly does NOT touch exports_total or daily_export_stats.
 */
export async function recordClipboardEvent(
  db: D1Database | undefined,
  request: Request,
  platform: string,
  mode: ClipboardMode,
  trackCount?: number,
): Promise<void> {
  if (!db) return;

  try {
    const date = getUtcDateString();
    const hour = new Date().getUTCHours();
    const canonicalMode = normalizeClipboardMode(mode);

    const upsertAggregateSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertClipboardSql = `
      INSERT INTO daily_clipboard_stats (date, platform, clipboard_mode, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, clipboard_mode)
      DO UPDATE SET count = count + 1;
    `;

    const upsertHourlySql = `
      INSERT INTO hourly_stats (date, hour, platform, metric, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, hour, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertPerfSql = `
      INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, platform, dimension, value)
      DO UPDATE SET count = count + 1;
    `;

    const statements: D1PreparedStatement[] = [
      db.prepare(upsertAggregateSql).bind(date, platform, 'clipboards_total'),
      db.prepare(upsertAggregateSql).bind('TOTAL', platform, 'clipboards_total'),
      db.prepare(upsertAggregateSql).bind(date, 'all', 'clipboards_total'),
      db.prepare(upsertAggregateSql).bind('TOTAL', 'all', 'clipboards_total'),
      db.prepare(upsertClipboardSql).bind(date, platform, canonicalMode),
      db.prepare(upsertClipboardSql).bind('TOTAL', platform, canonicalMode),
      db.prepare(upsertHourlySql).bind(date, hour, platform, 'clipboard'),
      db.prepare(upsertPerfSql).bind(date, platform, 'clipboard_mode', canonicalMode),
    ];

    if (trackCount !== undefined && trackCount >= 0) {
      const sizeBucket = classifyPlaylistSize(trackCount);
      if (sizeBucket) {
        statements.push(db.prepare(upsertPerfSql).bind(date, platform, 'clipboard_playlist_size', sizeBucket));
      }
    }

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record clipboard aggregate stats:', err);
  }
}

/**
 * Records an anonymous rate limit occurrence (HTTP 429).
 * Does NOT persist client IP or request URLs.
 */
export async function recordRateLimitEvent(
  db: D1Database | undefined,
  endpoint: string,
  platform: string = 'all',
): Promise<void> {
  if (!db) return;

  try {
    const date = getUtcDateString();
    const hour = new Date().getUTCHours();

    const upsertAggregateSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertHourlySql = `
      INSERT INTO hourly_stats (date, hour, platform, metric, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, hour, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertPerfSql = `
      INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
      VALUES (?1, ?2, ?3, ?4, 1)
      ON CONFLICT (date, platform, dimension, value)
      DO UPDATE SET count = count + 1;
    `;

    const statements: D1PreparedStatement[] = [
      db.prepare(upsertAggregateSql).bind(date, platform, 'rate_limited'),
      db.prepare(upsertAggregateSql).bind('TOTAL', platform, 'rate_limited'),
      db.prepare(upsertHourlySql).bind(date, hour, platform, 'rate_limited'),
      db.prepare(upsertPerfSql).bind(date, platform, 'rate_limit_endpoint', endpoint),
    ];

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record rate limit aggregate stats:', err);
  }
}

/**
 * Generates a one-way, truncated SHA-256 hash from date + clientIp + deviceIdentifier + salt.
 * Ensures zero raw IP addresses or identifiable strings are ever stored,
 * while distinguishing multiple devices behind the same Wi-Fi/NAT router.
 */
export async function computeVisitorHash(
  date: string,
  ip: string,
  deviceIdentifier: string = '',
): Promise<string> {
  const salt = 'playlistout_v_salt_2026';
  const cleanDevice = deviceIdentifier.trim().slice(0, 128);
  const data = new TextEncoder().encode(`${date}:${ip}:${cleanDevice}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16);
}

/**
 * Records an anonymous page visit event.
 * Computes a salted one-way hash to identify daily unique visitors without recording IP.
 * Uses device identifier (or User-Agent) to distinguish different devices on the same NAT.
 * Best-effort: errors never interrupt user operations.
 */
export async function recordVisitEvent(
  db: D1Database | undefined,
  request: Request,
  deviceId?: string,
  clientReferrer?: string,
): Promise<void> {
  if (!db) return;

  try {
    const date = getUtcDateString();
    const hour = new Date().getUTCHours();
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';
    const deviceIdentifier = deviceId || userAgent;

    const hash = await computeVisitorHash(date, clientIp, deviceIdentifier);

    const insertHashSql = `
      INSERT OR IGNORE INTO daily_visitor_hashes (date, hash)
      VALUES (?1, ?2);
    `;

    const upsertAggregateSql = `
      INSERT INTO aggregate_stats (date, platform, metric, count)
      VALUES (?1, 'all', ?2, 1)
      ON CONFLICT (date, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    const upsertHourlySql = `
      INSERT INTO hourly_stats (date, hour, platform, metric, count)
      VALUES (?1, ?2, 'all', ?3, 1)
      ON CONFLICT (date, hour, platform, metric)
      DO UPDATE SET count = count + 1;
    `;

    // Attempt to insert daily hash
    let isNewVisitor = true;
    try {
      const res = await db.prepare(insertHashSql).bind(date, hash).run();
      if (res && res.meta && typeof res.meta.changes === 'number') {
        isNewVisitor = res.meta.changes > 0;
      }
    } catch {
      // If table doesn't exist yet in mock tests or first run, fallback gracefully
      isNewVisitor = true;
    }

    const statements: D1PreparedStatement[] = [
      db.prepare(upsertAggregateSql).bind(date, 'page_view'),
      db.prepare(upsertAggregateSql).bind('TOTAL', 'page_view'),
      db.prepare(upsertHourlySql).bind(date, hour, 'page_view'),
    ];

    if (isNewVisitor) {
      statements.push(db.prepare(upsertAggregateSql).bind(date, 'visitor_unique'));
      statements.push(db.prepare(upsertAggregateSql).bind('TOTAL', 'visitor_unique'));
      statements.push(db.prepare(upsertHourlySql).bind(date, hour, 'visitor_unique'));
    }

    // Record coarse geography and client device info
    const cf = (request as any).cf;
    const country: string = cf?.country ? String(cf.country).toUpperCase().slice(0, 2) : 'UNKNOWN';
    const region: string = cf?.region ? String(cf.region).slice(0, 50) : 'UNKNOWN';
    const city: string = cf?.city ? String(cf.city).slice(0, 50) : 'UNKNOWN';

    const upsertGeoSql = `
      INSERT INTO daily_geo_stats (date, platform, country, region, city, count)
      VALUES (?1, 'all', ?2, ?3, ?4, 1)
      ON CONFLICT (date, platform, country, region, city)
      DO UPDATE SET count = count + 1;
    `;
    statements.push(db.prepare(upsertGeoSql).bind(date, country, region, city));
    statements.push(db.prepare(upsertGeoSql).bind('TOTAL', country, region, city));

    const ua = parseUserAgent(userAgent);
    const upsertClientSql = `
      INSERT INTO daily_client_stats (date, platform, device_class, browser_family, os_family, count)
      VALUES (?1, 'all', ?2, ?3, ?4, 1)
      ON CONFLICT (date, platform, device_class, browser_family, os_family)
      DO UPDATE SET count = count + 1;
    `;
    statements.push(db.prepare(upsertClientSql).bind(date, ua.deviceClass, ua.browserFamily, ua.osFamily));
    statements.push(db.prepare(upsertClientSql).bind('TOTAL', ua.deviceClass, ua.browserFamily, ua.osFamily));

    // Referrer source classification (coarse category only, full URL never stored)
    const rawReferer = clientReferrer || request.headers.get('referer') || request.headers.get('referrer') || null;
    const referrerSource = classifyReferrer(rawReferer);
    const upsertPerfSql = `
      INSERT INTO daily_performance_stats (date, platform, dimension, value, count)
      VALUES (?1, 'all', ?2, ?3, 1)
      ON CONFLICT (date, platform, dimension, value)
      DO UPDATE SET count = count + 1;
    `;
    statements.push(db.prepare(upsertPerfSql).bind(date, 'referrer_source', referrerSource));
    statements.push(db.prepare(upsertPerfSql).bind('TOTAL', 'referrer_source', referrerSource));

    // Mobile Brand & Device Hardware classification
    if (ua.deviceBrand) {
      statements.push(db.prepare(upsertPerfSql).bind(date, 'device_brand', ua.deviceBrand));
      statements.push(db.prepare(upsertPerfSql).bind('TOTAL', 'device_brand', ua.deviceBrand));
    }

    // Prune ephemeral visitor hashes older than 7 days to prevent unbounded table growth
    const cutoffDate = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
    const pruneHashesSql = `
      DELETE FROM daily_visitor_hashes
      WHERE date < ?1;
    `;
    statements.push(db.prepare(pruneHashesSql).bind(cutoffDate));

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record visit aggregate stats:', err);
  }
}


