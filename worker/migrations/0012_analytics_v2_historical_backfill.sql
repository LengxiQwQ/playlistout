-- Analytics V2 deterministic historical backfill
-- Source: immutable V1 aggregate facts.
-- Safety: V1 tables are never mutated. Ambiguous historical request origin is
-- explicitly labeled legacy_mixed / legacy_unknown rather than guessed.

-- 1. Official Web page views with authentic coarse geography.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', country, region, 'page_view', SUM(count), 0
FROM daily_geo_stats
WHERE date != 'TOTAL' AND platform = 'all'
GROUP BY date, country, region;

-- 2. Daily unique visitors cannot be assigned to geography after aggregation.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', 'UNKNOWN', 'UNKNOWN', 'daily_unique', count, 0
FROM aggregate_stats
WHERE date != 'TOTAL' AND platform = 'all' AND metric = 'visitor_unique' AND count > 0;

-- 3. Authoritative historical resolve outcomes. Origin is intentionally legacy_mixed.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'resolve',
  CASE WHEN platform = 'all' THEN 'unknown' ELSE platform END,
  'UNKNOWN', 'UNKNOWN',
  CASE value
    WHEN 'success_playlist' THEN 'playlist_success'
    WHEN 'success_user' THEN 'user_success'
    WHEN 'failure' THEN 'resolve_failure'
    ELSE 'resolve_failure'
  END,
  SUM(count), 0
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND dimension = 'resolve_outcome'
  AND value IN ('success_playlist', 'success_user', 'failure')
GROUP BY date, platform, value;

INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'resolve',
  CASE WHEN platform = 'all' THEN 'unknown' ELSE platform END,
  'UNKNOWN', 'UNKNOWN', 'resolve_request', SUM(count), 0
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND dimension = 'resolve_outcome'
  AND value IN ('success_playlist', 'success_user', 'failure')
GROUP BY date, platform;

-- 4. Direct/legacy parse success = V1 parse successes minus known resolve playlist successes.
-- This prevents R7 resolve-success rows from being counted twice.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  a.date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'playlist', a.platform, 'UNKNOWN', 'UNKNOWN', 'parse_success',
  CASE
    WHEN a.count - COALESCE(r.resolve_success, 0) > 0
    THEN a.count - COALESCE(r.resolve_success, 0)
    ELSE 0
  END,
  0
FROM aggregate_stats a
LEFT JOIN (
  SELECT date, platform, SUM(count) AS resolve_success
  FROM daily_performance_stats
  WHERE date != 'TOTAL'
    AND dimension = 'resolve_outcome'
    AND value = 'success_playlist'
  GROUP BY date, platform
) r ON r.date = a.date AND r.platform = a.platform
WHERE a.date != 'TOTAL'
  AND a.platform != 'all'
  AND a.metric = 'parse_success'
  AND a.count - COALESCE(r.resolve_success, 0) > 0;

-- 5. V1 parse failures represent direct playlist terminal failures.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'playlist', platform, 'UNKNOWN', 'UNKNOWN', 'parse_failure', count, 0
FROM aggregate_stats
WHERE date != 'TOTAL'
  AND platform != 'all'
  AND metric = 'parse_failure'
  AND count > 0;

-- 6. Tracks processed: exact V1 value sum. Count is successful playlist operations.
-- Endpoint cannot be recovered for old rows, so preserve that uncertainty explicitly.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  tracks.date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'legacy_playlist_or_resolve', tracks.platform, 'UNKNOWN', 'UNKNOWN',
  'tracks_processed', COALESCE(success.count, 0), tracks.count
FROM aggregate_stats tracks
LEFT JOIN aggregate_stats success
  ON success.date = tracks.date
  AND success.platform = tracks.platform
  AND success.metric = 'parse_success'
WHERE tracks.date != 'TOTAL'
  AND tracks.platform != 'all'
  AND tracks.metric = 'tracks_processed'
  AND tracks.count > 0;

-- 7. File exports: dedicated platform facts are authoritative; discard V1 all-rollup duplicates.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'event_export', platform, country, region, 'export', SUM(count), 0
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region;

INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'event_export', platform, country, region, 'export_format', export_format, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region, export_format;

-- 8. Clipboard actions: dedicated platform facts are authoritative; discard V1 all-rollup duplicates.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'event_clipboard', platform, country, region, 'clipboard', SUM(count), 0
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region;

INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'event_clipboard', platform, country, region, 'clipboard_mode', clipboard_mode, SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region, clipboard_mode;

-- 9. Web acquisition/device dimensions from visit-only V1 rows.
INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', 'UNKNOWN', 'UNKNOWN', dimension, value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND platform = 'all'
  AND dimension IN ('referrer_source', 'device_brand')
GROUP BY date, dimension, value;

INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', 'UNKNOWN', 'UNKNOWN', 'device_class', device_class, SUM(count)
FROM daily_client_stats
WHERE date != 'TOTAL' AND platform = 'all'
GROUP BY date, device_class;

INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', 'UNKNOWN', 'UNKNOWN', 'browser_family', browser_family, SUM(count)
FROM daily_client_stats
WHERE date != 'TOTAL' AND platform = 'all'
GROUP BY date, browser_family;

INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', 'UNKNOWN', 'UNKNOWN', 'os_family', os_family, SUM(count)
FROM daily_client_stats
WHERE date != 'TOTAL' AND platform = 'all'
GROUP BY date, os_family;

-- 10. Resolve diagnostic dimensions. Rename R7 field names to the V2 taxonomy.
INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'resolve',
  CASE WHEN platform = 'all' THEN 'unknown' ELSE platform END,
  'UNKNOWN', 'UNKNOWN',
  CASE dimension
    WHEN 'resolve_failure_code' THEN 'failure_code'
    WHEN 'resolve_failure_class' THEN 'failure_class'
    WHEN 'resolve_failure_stage' THEN 'failure_stage'
    WHEN 'resolve_requested_type' THEN 'requested_type'
    WHEN 'resolve_requested_platform' THEN 'requested_platform'
    WHEN 'resolve_input_type' THEN 'input_type'
    ELSE dimension
  END,
  value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND dimension IN (
    'resolve_failure_code', 'resolve_failure_class', 'resolve_failure_stage',
    'resolve_requested_type', 'resolve_requested_platform', 'resolve_input_type',
    'provider_failure_path', 'resolve_country'
  )
GROUP BY date, platform, dimension, value;

-- 11. Legacy parse/reliability dimensions whose old channel cannot be recovered.
INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'legacy_playlist_or_resolve', platform, 'UNKNOWN', 'UNKNOWN',
  dimension, value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND platform != 'all'
  AND dimension IN (
    'input_type', 'latency_bucket', 'error_category', 'playlist_size', 'provider_path'
  )
GROUP BY date, platform, dimension, value;

-- Dedicated export/clipboard size dimensions are known Web interactions.
INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  CASE dimension
    WHEN 'export_playlist_size' THEN 'event_export'
    ELSE 'event_clipboard'
  END,
  platform, 'UNKNOWN', 'UNKNOWN', dimension, value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND platform != 'all'
  AND dimension IN ('export_playlist_size', 'clipboard_playlist_size')
GROUP BY date, platform, dimension, value;

-- 12. Rate limiting is security/reliability data. V1 'all' means no platform attribution,
-- not an aggregate rollup for this recorder path.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'abusive',
  'legacy_unknown',
  CASE WHEN platform = 'all' THEN 'none' ELSE platform END,
  'UNKNOWN', 'UNKNOWN', 'rate_limited', SUM(count), 0
FROM aggregate_stats
WHERE date != 'TOTAL' AND metric = 'rate_limited'
GROUP BY date, platform;

INSERT INTO analytics_v2_daily_dimensions (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, dimension, value, count
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'abusive',
  'legacy_unknown',
  CASE WHEN platform = 'all' THEN 'none' ELSE platform END,
  'UNKNOWN', 'UNKNOWN', dimension, value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
  AND dimension IN ('rate_limit_endpoint', 'rate_limit_country')
GROUP BY date, platform, dimension, value;

-- 13. Historical hourly Web traffic is exact.
INSERT INTO analytics_v2_hourly_core (
  date, hour, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, hour, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  'web_visit', 'none', 'UNKNOWN', 'UNKNOWN',
  CASE metric WHEN 'visitor_unique' THEN 'daily_unique' ELSE metric END,
  SUM(count), 0
FROM hourly_stats
WHERE platform = 'all' AND metric IN ('page_view', 'visitor_unique')
GROUP BY date, hour, metric;

-- Historical export/clipboard hourly data is also exact because those V1 writers stored
-- only the actual platform in hourly_stats.
INSERT INTO analytics_v2_hourly_core (
  date, hour, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, hour, 'historical', 'web', 'official_web', 'unknown', 'unknown', 'declared',
  CASE metric WHEN 'export' THEN 'event_export' ELSE 'event_clipboard' END,
  platform, 'UNKNOWN', 'UNKNOWN', metric, SUM(count), 0
FROM hourly_stats
WHERE platform != 'all' AND metric IN ('export', 'clipboard')
GROUP BY date, hour, platform, metric;

-- 14. Historical parse geography is useful demand information, but success/failure cannot
-- be correlated to geography after V1 aggregation. Preserve it under an honest legacy metric.
INSERT INTO analytics_v2_daily_core (
  date, data_origin, channel, client_id, client_version, host_platform, trust_class,
  endpoint, platform, country, region, metric, count, value_sum
)
SELECT
  date, 'historical', 'legacy_mixed', 'legacy_unknown', 'unknown', 'unknown', 'untrusted',
  'legacy_playlist_or_resolve', platform, country, region, 'legacy_playlist_activity', SUM(count), 0
FROM daily_geo_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region;

INSERT OR REPLACE INTO analytics_v2_meta (key, value)
VALUES ('historical_backfill_status', 'complete');

INSERT OR REPLACE INTO analytics_v2_meta (key, value)
VALUES ('historical_backfill_version', '0012');

INSERT OR REPLACE INTO analytics_v2_meta (key, value)
VALUES ('historical_attribution_policy', 'deterministic-v1-facts; ambiguous origin=legacy_mixed');

INSERT OR REPLACE INTO analytics_v2_meta (key, value)
VALUES ('historical_backfill_at', CURRENT_TIMESTAMP);
