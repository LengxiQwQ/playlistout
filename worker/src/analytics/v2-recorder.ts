import { classifyLatency } from './dimensions';
import { getClientIp } from '../security/rate-limit';
import {
  createAnalyticsRequestContextV2,
  normalizeAnalyticsPlatformV2,
  type AnalyticsRequestContextV2,
  type AnalyticsPlatformV2,
} from './context';

export interface ResolveV2Input {
  request: Request;
  platform?: string;
  outcome: 'success_playlist' | 'success_user' | 'failure';
  trackCount?: number;
  latencyMs?: number;
  inputType?: string;
  requestedType?: string;
  requestedPlatform?: string;
  failureCode?: string;
  failureClass?: string;
  failureStage?: string;
  providerFailurePath?: string;
  endpoint?: 'resolve' | 'playlist';
}

export interface ProductEventV2Input {
  request: Request;
  type: 'export' | 'clipboard' | 'visit' | 'rate_limited' | 'migration';
  platform?: string;
  format?: string;
  trackCount?: number;
  referrerSource?: string;
  endpoint?: string;
  destination?: string;
  provider?: string;
}

async function computeDailyVisitorHash(request: Request, date: string): Promise<string> {
  const ip = getClientIp(request);
  const ua = (request.headers.get('user-agent') || '').trim().slice(0, 128);
  const payload = new TextEncoder().encode(`${date}:${ip}:${ua}:playlistout_v_salt_2026`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

async function recordAutomatedSecurityEvent(
  db: D1Database,
  ctx: AnalyticsRequestContextV2,
  platform: AnalyticsPlatformV2,
  input: ResolveV2Input,
): Promise<void> {
  const details = JSON.stringify({
    channel: ctx.channel,
    clientId: ctx.clientId,
    outcome: input.outcome,
    endpoint: input.endpoint || 'resolve',
    failureCode: input.failureCode || undefined,
  });

  await db.prepare(`
    INSERT INTO quarantined_stats (
      incident_date, batch_id, reason, source_table, platform,
      metric_or_dimension, country, region, city, client_info, count, details_json
    ) VALUES (?1, ?2, 'auto_quarantined_bot_ua', 'analytics_v2_security',
      ?3, 'resolve_request', ?4, ?5, 'UNKNOWN', 'automated', 1, ?6)
  `).bind(
    ctx.date,
    `v2_auto_${ctx.date.replace(/-/g, '')}`,
    platform,
    ctx.country,
    ctx.region,
    details,
  ).run();
}

function boundedToken(value: unknown, fallback: string = 'unknown', max = 64): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_.:+\-]/g, '_').slice(0, max);
  return cleaned || fallback;
}

function coreUpsert(
  db: D1Database,
  ctx: AnalyticsRequestContextV2,
  platform: AnalyticsPlatformV2,
  metric: string,
  count: number,
): D1PreparedStatement[] {
  const daily = db.prepare(`
    INSERT INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
    ON CONFLICT (date, channel, client_id, platform, metric)
    DO UPDATE SET count = count + excluded.count
  `).bind(ctx.date, ctx.channel, ctx.clientId, platform, metric, count);

  const hourly = db.prepare(`
    INSERT INTO analytics_v2_hourly_core (date, hour, channel, client_id, platform, metric, count)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT (date, hour, channel, client_id, platform, metric)
    DO UPDATE SET count = count + excluded.count
  `).bind(ctx.date, ctx.hour, ctx.channel, ctx.clientId, platform, metric, count);

  const geo = db.prepare(`
    INSERT INTO analytics_v2_geo (date, channel, client_id, platform, country, region, metric, count)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    ON CONFLICT (date, channel, client_id, platform, country, region, metric)
    DO UPDATE SET count = count + excluded.count
  `).bind(ctx.date, ctx.channel, ctx.clientId, platform, ctx.country, ctx.region, metric, count);

  return [daily, hourly, geo];
}

function breakdownUpsert(
  db: D1Database,
  ctx: AnalyticsRequestContextV2,
  platform: AnalyticsPlatformV2,
  dimension: string,
  value: unknown,
  count = 1,
): D1PreparedStatement | null {
  if (value === undefined || value === null || value === '') return null;
  const safeDimension = boundedToken(dimension, 'unknown_dimension', 48);
  const safeValue = boundedToken(value, 'unknown', 64);
  return db.prepare(`
    INSERT INTO analytics_v2_breakdown (date, channel, client_id, platform, dimension, value, count)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT (date, channel, client_id, platform, dimension, value)
    DO UPDATE SET count = count + excluded.count
  `).bind(ctx.date, ctx.channel, ctx.clientId, platform, safeDimension, safeValue, count);
}

function envUpsert(
  db: D1Database,
  ctx: AnalyticsRequestContextV2,
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO analytics_v2_client_env (date, channel, client_id, device_class, browser_family, os_family, count)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
    ON CONFLICT (date, channel, client_id, device_class, browser_family, os_family)
    DO UPDATE SET count = count + 1
  `).bind(ctx.date, ctx.channel, ctx.clientId, ctx.deviceClass, ctx.browserFamily, ctx.osFamily);
}

function appendClientBreakdowns(
  statements: D1PreparedStatement[],
  db: D1Database,
  ctx: AnalyticsRequestContextV2,
  platform: AnalyticsPlatformV2,
): void {
  const clientVersion = breakdownUpsert(db, ctx, platform, 'client_version', ctx.clientVersion);
  if (clientVersion) statements.push(clientVersion);
  const host = breakdownUpsert(db, ctx, platform, 'host_platform', ctx.hostPlatform);
  if (host) statements.push(host);
}

export async function recordResolveV2(
  db: D1Database | undefined,
  input: ResolveV2Input,
): Promise<void> {
  if (!db) return;

  try {
    const ctx = createAnalyticsRequestContextV2(input.request);
    const platform = normalizeAnalyticsPlatformV2(input.platform);
    if (ctx.isAutomated) {
      await recordAutomatedSecurityEvent(db, ctx, platform, input);
      return;
    }
    const statements: D1PreparedStatement[] = [];

    statements.push(...coreUpsert(db, ctx, platform, 'resolve_request', 1));

    if (input.outcome === 'success_playlist') {
      statements.push(...coreUpsert(db, ctx, platform, 'playlist_success', 1));
      if (typeof input.trackCount === 'number' && input.trackCount > 0) {
        statements.push(...coreUpsert(db, ctx, platform, 'tracks_processed', Math.floor(input.trackCount)));
      }
    } else if (input.outcome === 'success_user') {
      statements.push(...coreUpsert(db, ctx, platform, 'user_success', 1));
    } else {
      statements.push(...coreUpsert(db, ctx, platform, 'resolve_failure', 1));
    }

    const endpoint = breakdownUpsert(db, ctx, platform, 'endpoint', input.endpoint || 'resolve');
    if (endpoint) statements.push(endpoint);

    const dims: Array<[string, unknown]> = [
      ['input_type', input.inputType],
      ['requested_type', input.requestedType],
      ['requested_platform', input.requestedPlatform],
      ['resolve_outcome', input.outcome],
      ['failure_code', input.failureCode],
      ['failure_class', input.failureClass],
      ['failure_stage', input.failureStage],
      ['provider_failure_path', input.providerFailurePath],
    ];

    if (typeof input.latencyMs === 'number' && Number.isFinite(input.latencyMs)) {
      dims.push(['latency_bucket', classifyLatency(input.latencyMs)]);
    }

    for (const [dimension, value] of dims) {
      const stmt = breakdownUpsert(db, ctx, platform, dimension, value);
      if (stmt) statements.push(stmt);
    }

    appendClientBreakdowns(statements, db, ctx, platform);
    statements.push(envUpsert(db, ctx));

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record Analytics V2 resolve event:', err);
  }
}

export async function recordProductEventV2(
  db: D1Database | undefined,
  input: ProductEventV2Input,
): Promise<void> {
  if (!db) return;

  try {
    const ctx = createAnalyticsRequestContextV2(input.request);
    if (ctx.isAutomated && input.type !== 'rate_limited') return;
    const platform = input.type === 'visit'
      ? 'none'
      : normalizeAnalyticsPlatformV2(input.platform);
    const statements: D1PreparedStatement[] = [];

    if (input.type === 'export') {
      statements.push(...coreUpsert(db, ctx, platform, 'export', 1));
      const format = breakdownUpsert(db, ctx, platform, 'export_format', input.format);
      if (format) statements.push(format);
      if (typeof input.trackCount === 'number' && input.trackCount >= 0) {
        const size = input.trackCount <= 50 ? '1-50'
          : input.trackCount <= 200 ? '51-200'
          : input.trackCount <= 500 ? '201-500'
          : input.trackCount <= 1000 ? '501-1000'
          : '1000+';
        const sizeStmt = breakdownUpsert(db, ctx, platform, 'export_playlist_size', size);
        if (sizeStmt) statements.push(sizeStmt);
      }
    } else if (input.type === 'clipboard') {
      statements.push(...coreUpsert(db, ctx, platform, 'clipboard', 1));
      const mode = breakdownUpsert(db, ctx, platform, 'clipboard_mode', input.format);
      if (mode) statements.push(mode);
    } else if (input.type === 'visit') {
      statements.push(...coreUpsert(db, ctx, 'none', 'page_view', 1));
      const referrer = breakdownUpsert(db, ctx, 'none', 'referrer_source', input.referrerSource || 'direct');
      if (referrer) statements.push(referrer);
    } else if (input.type === 'rate_limited') {
      statements.push(...coreUpsert(db, ctx, platform, 'rate_limited', 1));
      const endpoint = breakdownUpsert(db, ctx, platform, 'rate_limit_endpoint', input.endpoint || 'unknown');
      if (endpoint) statements.push(endpoint);
    } else if (input.type === 'migration') {
      statements.push(...coreUpsert(db, ctx, platform, 'migration_handoff', 1));
      const destination = breakdownUpsert(db, ctx, platform, 'migration_destination', input.destination || 'other');
      if (destination) statements.push(destination);
      const provider = breakdownUpsert(db, ctx, platform, 'migration_provider', input.provider || 'unknown');
      if (provider) statements.push(provider);
    }

    appendClientBreakdowns(statements, db, ctx, platform);
    statements.push(envUpsert(db, ctx));

    await db.batch(statements);
  } catch (err: unknown) {
    console.error('Failed to record Analytics V2 product event:', err);
  }
}

export async function recordDailyUniqueV2(
  db: D1Database | undefined,
  request: Request,
  incremented: boolean,
): Promise<void> {
  if (!db || !incremented) return;
  try {
    const ctx = createAnalyticsRequestContextV2(request);
    await db.batch(coreUpsert(db, ctx, 'none', 'visitor_unique', 1));
  } catch (err: unknown) {
    console.error('Failed to record Analytics V2 daily unique:', err);
  }
}


export async function recordVisitEventV2(
  db: D1Database | undefined,
  request: Request,
  referrerSource: string = 'direct',
): Promise<void> {
  if (!db) return;

  try {
    const ctx = createAnalyticsRequestContextV2(request);
    if (ctx.isAutomated) return;

    const hash = await computeDailyVisitorHash(request, ctx.date);
    let isNewVisitor = true;
    try {
      const result = await db.prepare(`
        INSERT OR IGNORE INTO daily_visitor_hashes (date, hash)
        VALUES (?1, ?2)
      `).bind(ctx.date, hash).run();
      if (result?.meta && typeof result.meta.changes === 'number') {
        isNewVisitor = result.meta.changes > 0;
      }
    } catch {
      isNewVisitor = true;
    }

    await recordProductEventV2(db, {
      request,
      type: 'visit',
      referrerSource,
    });
    await recordDailyUniqueV2(db, request, isNewVisitor);

    const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10);
    await db.prepare('DELETE FROM daily_visitor_hashes WHERE date < ?1').bind(cutoff).run();
  } catch (err: unknown) {
    console.error('Failed to record Analytics V2 visit event:', err);
  }
}

export async function recordRateLimitEventV2(
  db: D1Database | undefined,
  request: Request,
  endpoint: string,
  platform?: string,
): Promise<void> {
  await recordProductEventV2(db, {
    request,
    type: 'rate_limited',
    endpoint,
    platform,
  });
}

export function normalizeClipboardModeV2(mode: string): string {
  if (mode === 'title-artist') return 'title_artist';
  if (mode === 'title-artist-album') return 'title_artist_album';
  return mode;
}
