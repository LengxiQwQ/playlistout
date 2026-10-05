import {
  classifyAnalyticsPlatform,
  classifyLatency,
  classifyPlaylistSize,
  classifyProviderFailurePath,
  classifyResolveFailureClass,
  classifyResolveFailureCode,
  classifyResolveFailureStage,
  classifyResolveRequestedPlatform,
  classifyResolveRequestedType,
} from '../dimensions';
import type {
  CanonicalClipboardMode,
  ExportFormat,
  InputType,
  ReferrerSource,
  ResolveAnalyticsContext,
} from '../types';
import type {
  AnalyticsPlatformToken,
  AnalyticsRequestContext,
  AnalyticsV2DimensionWrite,
  AnalyticsV2MetricWrite,
} from './types';

function normalizePlatform(platform: string | null | undefined): AnalyticsPlatformToken {
  if (!platform || platform === 'all') return 'none';
  const normalized = classifyAnalyticsPlatform(platform);
  return normalized === 'unknown' ? 'unknown' : normalized;
}

function normalizeToken(value: string | null | undefined, fallback = 'unknown', max = 64): string {
  const clean = (value || '').trim();
  return clean ? clean.slice(0, max) : fallback;
}

export async function writeAnalyticsV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  metrics: AnalyticsV2MetricWrite[] = [],
  dimensions: AnalyticsV2DimensionWrite[] = [],
): Promise<void> {
  if (!db || typeof db.prepare !== 'function') return;

  const upsertDaily = `
    INSERT INTO analytics_v2_daily_core (
      date, data_origin, channel, client_id, client_version, host_platform, trust_class,
      endpoint, platform, country, region, metric, count, value_sum
    ) VALUES (?1, 'live', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
    ON CONFLICT (
      date, data_origin, channel, client_id, client_version, host_platform, trust_class,
      endpoint, platform, country, region, metric
    ) DO UPDATE SET
      count = count + excluded.count,
      value_sum = value_sum + excluded.value_sum;
  `;

  const upsertHourly = `
    INSERT INTO analytics_v2_hourly_core (
      date, hour, data_origin, channel, client_id, client_version, host_platform, trust_class,
      endpoint, platform, country, region, metric, count, value_sum
    ) VALUES (?1, ?2, 'live', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
    ON CONFLICT (
      date, hour, data_origin, channel, client_id, client_version, host_platform, trust_class,
      endpoint, platform, country, region, metric
    ) DO UPDATE SET
      count = count + excluded.count,
      value_sum = value_sum + excluded.value_sum;
  `;

  const upsertDimension = `
    INSERT INTO analytics_v2_daily_dimensions (
      date, data_origin, channel, client_id, client_version, host_platform, trust_class,
      endpoint, platform, country, region, dimension, value, count
    ) VALUES (?1, 'live', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
    ON CONFLICT (
      date, data_origin, channel, client_id, client_version, host_platform, trust_class,
      endpoint, platform, country, region, dimension, value
    ) DO UPDATE SET count = count + excluded.count;
  `;

  const statements: D1PreparedStatement[] = [];

  for (const metric of metrics) {
    const endpoint = normalizeToken(metric.endpoint || context.endpoint, 'other', 48);
    const platform = normalizePlatform(metric.platform);
    const metricName = normalizeToken(metric.metric, 'unknown_metric', 64);
    const countDelta = Number.isFinite(metric.countDelta) ? Math.max(0, Math.trunc(metric.countDelta!)) : 1;
    const valueSumDelta = Number.isFinite(metric.valueSumDelta) ? Math.max(0, Math.trunc(metric.valueSumDelta!)) : 0;

    statements.push(
      db.prepare(upsertDaily).bind(
        context.dateUtc, context.channel, context.clientId, context.clientVersion,
        context.hostPlatform, context.trustClass, endpoint, platform,
        context.country, context.region, metricName, countDelta, valueSumDelta,
      ),
    );

    if (metric.includeHourly !== false) {
      statements.push(
        db.prepare(upsertHourly).bind(
          context.dateUtc, context.hourUtc, context.channel, context.clientId, context.clientVersion,
          context.hostPlatform, context.trustClass, endpoint, platform,
          context.country, context.region, metricName, countDelta, valueSumDelta,
        ),
      );
    }
  }

  for (const dimension of dimensions) {
    statements.push(
      db.prepare(upsertDimension).bind(
        context.dateUtc, context.channel, context.clientId, context.clientVersion,
        context.hostPlatform, context.trustClass,
        normalizeToken(dimension.endpoint || context.endpoint, 'other', 48),
        normalizePlatform(dimension.platform), context.country, context.region,
        normalizeToken(dimension.dimension, 'unknown_dimension', 64),
        normalizeToken(dimension.value, 'unknown', 96),
        Number.isFinite(dimension.countDelta) ? Math.max(0, Math.trunc(dimension.countDelta!)) : 1,
      ),
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

export async function recordResolveV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  resolve: ResolveAnalyticsContext,
): Promise<void> {
  const platform = normalizePlatform(resolve.platform);
  const outcomeMetric = resolve.outcome === 'success_playlist'
    ? 'playlist_success'
    : resolve.outcome === 'success_user'
    ? 'user_success'
    : 'resolve_failure';

  const dimensions: AnalyticsV2DimensionWrite[] = [];
  if (resolve.requestedType) {
    dimensions.push({ dimension: 'requested_type', value: classifyResolveRequestedType(resolve.requestedType), platform });
  }
  if (resolve.requestedPlatform) {
    dimensions.push({ dimension: 'requested_platform', value: classifyResolveRequestedPlatform(resolve.requestedPlatform), platform });
  }
  if (resolve.inputType) {
    dimensions.push({ dimension: 'input_type', value: resolve.inputType, platform });
  }
  if (resolve.outcome === 'failure') {
    const failureCode = classifyResolveFailureCode(resolve.failureCode);
    dimensions.push(
      { dimension: 'failure_code', value: failureCode, platform },
      { dimension: 'failure_class', value: resolve.failureClass || classifyResolveFailureClass(failureCode), platform },
      { dimension: 'failure_stage', value: classifyResolveFailureStage(resolve.failureStage), platform },
    );
    if (resolve.providerFailurePath) {
      dimensions.push({
        dimension: 'provider_failure_path',
        value: classifyProviderFailurePath(resolve.providerFailurePath),
        platform,
      });
    }
  }

  await writeAnalyticsV2(
    db,
    context,
    [
      { metric: 'resolve_request', platform },
      { metric: outcomeMetric, platform },
    ],
    dimensions,
  );
}

export interface ParseV2Input {
  platform: string;
  inputType: InputType | string;
  success: boolean;
  trackCount?: number;
  errorCategory?: string;
  latencyMs?: number;
  providerPath?: 'primary' | 'fallback';
}

export async function recordParseV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  input: ParseV2Input,
): Promise<void> {
  const platform = normalizePlatform(input.platform);
  const metrics: AnalyticsV2MetricWrite[] = [];
  const dimensions: AnalyticsV2DimensionWrite[] = [
    { dimension: 'input_type', value: input.inputType || 'other', platform },
  ];

  if (context.endpoint !== 'resolve') {
    metrics.push({ metric: input.success ? 'parse_success' : 'parse_failure', platform });
  }

  if (input.success) {
    if (typeof input.trackCount === 'number' && input.trackCount >= 0) {
      metrics.push({ metric: 'tracks_processed', platform, countDelta: 1, valueSumDelta: input.trackCount });
      const size = classifyPlaylistSize(input.trackCount);
      if (size) dimensions.push({ dimension: 'playlist_size', value: size, platform });
    }
    if (input.providerPath) {
      dimensions.push({ dimension: 'provider_path', value: input.providerPath, platform });
    }
  } else if (input.errorCategory) {
    dimensions.push({ dimension: 'error_category', value: input.errorCategory, platform });
  }

  if (typeof input.latencyMs === 'number') {
    const latency = classifyLatency(input.latencyMs);
    if (latency) dimensions.push({ dimension: 'latency_bucket', value: latency, platform });
  }

  await writeAnalyticsV2(db, context, metrics, dimensions);
}

export async function recordExportV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  platform: string,
  format: ExportFormat,
  trackCount?: number,
): Promise<void> {
  const p = normalizePlatform(platform);
  const dimensions: AnalyticsV2DimensionWrite[] = [
    { dimension: 'export_format', value: format, platform: p, endpoint: 'event_export' },
  ];
  if (typeof trackCount === 'number' && trackCount >= 0) {
    const size = classifyPlaylistSize(trackCount);
    if (size) dimensions.push({ dimension: 'export_playlist_size', value: size, platform: p, endpoint: 'event_export' });
  }
  await writeAnalyticsV2(
    db,
    context,
    [{ metric: 'export', platform: p, endpoint: 'event_export' }],
    dimensions,
  );
}

export async function recordClipboardV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  platform: string,
  mode: CanonicalClipboardMode,
  trackCount?: number,
): Promise<void> {
  const p = normalizePlatform(platform);
  const dimensions: AnalyticsV2DimensionWrite[] = [
    { dimension: 'clipboard_mode', value: mode, platform: p, endpoint: 'event_clipboard' },
  ];
  if (typeof trackCount === 'number' && trackCount >= 0) {
    const size = classifyPlaylistSize(trackCount);
    if (size) dimensions.push({ dimension: 'clipboard_playlist_size', value: size, platform: p, endpoint: 'event_clipboard' });
  }
  await writeAnalyticsV2(
    db,
    context,
    [{ metric: 'clipboard', platform: p, endpoint: 'event_clipboard' }],
    dimensions,
  );
}

export async function recordVisitV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  referrerSource: ReferrerSource,
  isNewVisitor: boolean,
): Promise<void> {
  const metrics: AnalyticsV2MetricWrite[] = [{ metric: 'page_view', platform: 'none', endpoint: 'web_visit' }];
  if (isNewVisitor) metrics.push({ metric: 'daily_unique', platform: 'none', endpoint: 'web_visit' });
  const dimensions: AnalyticsV2DimensionWrite[] = [
    { dimension: 'referrer_source', value: referrerSource, platform: 'none', endpoint: 'web_visit' },
    { dimension: 'device_class', value: context.deviceClass, platform: 'none', endpoint: 'web_visit' },
    { dimension: 'browser_family', value: context.browserFamily, platform: 'none', endpoint: 'web_visit' },
    { dimension: 'os_family', value: context.osFamily, platform: 'none', endpoint: 'web_visit' },
  ];
  if (context.deviceBrand) {
    dimensions.push({ dimension: 'device_brand', value: context.deviceBrand, platform: 'none', endpoint: 'web_visit' });
  }
  await writeAnalyticsV2(db, context, metrics, dimensions);
}

export async function recordRateLimitV2(
  db: D1Database | undefined,
  context: AnalyticsRequestContext,
  endpoint: string,
  platform: string,
): Promise<void> {
  await writeAnalyticsV2(
    db,
    { ...context, trustClass: 'abusive' },
    [{ metric: 'rate_limited', platform, endpoint }],
    [{ dimension: 'rate_limit_endpoint', value: endpoint, platform, endpoint }],
  );
}
