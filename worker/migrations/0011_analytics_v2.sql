-- Migration 0011: Analytics V2 canonical aggregates + deterministic V1 repair
--
-- Safety rules:
-- - Never mutate migration files 0001-0010.
-- - Preserve legacy tables for rollback/forensics.
-- - Repair only deterministic V1 rollups.
-- - V2 stores base facts only: no date='TOTAL', no platform='all'.
-- - Ambiguous historical attribution is explicitly legacy_mixed/legacy_unknown.

CREATE TABLE IF NOT EXISTS analytics_v2_daily_core (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (date, channel, client_id, platform, metric),
  CHECK (date != 'TOTAL'),
  CHECK (platform != 'all')
);

CREATE TABLE IF NOT EXISTS analytics_v2_hourly_core (
  date TEXT NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (date, hour, channel, client_id, platform, metric),
  CHECK (date != 'TOTAL'),
  CHECK (platform != 'all')
);

CREATE TABLE IF NOT EXISTS analytics_v2_geo (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UNKNOWN',
  region TEXT NOT NULL DEFAULT 'UNKNOWN',
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (date, channel, client_id, platform, country, region, metric),
  CHECK (date != 'TOTAL'),
  CHECK (platform != 'all')
);

CREATE TABLE IF NOT EXISTS analytics_v2_breakdown (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (date, channel, client_id, platform, dimension, value),
  CHECK (date != 'TOTAL'),
  CHECK (platform != 'all')
);

CREATE TABLE IF NOT EXISTS analytics_v2_client_env (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  device_class TEXT NOT NULL,
  browser_family TEXT NOT NULL,
  os_family TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (date, channel, client_id, device_class, browser_family, os_family),
  CHECK (date != 'TOTAL')
);

CREATE INDEX IF NOT EXISTS idx_v2_daily_date ON analytics_v2_daily_core (date);
CREATE INDEX IF NOT EXISTS idx_v2_daily_channel_client ON analytics_v2_daily_core (channel, client_id, date);
CREATE INDEX IF NOT EXISTS idx_v2_daily_platform ON analytics_v2_daily_core (platform, date);
CREATE INDEX IF NOT EXISTS idx_v2_hourly_date_hour ON analytics_v2_hourly_core (date, hour);
CREATE INDEX IF NOT EXISTS idx_v2_geo_date_country_region ON analytics_v2_geo (date, country, region);
CREATE INDEX IF NOT EXISTS idx_v2_geo_channel_client ON analytics_v2_geo (channel, client_id, date);
CREATE INDEX IF NOT EXISTS idx_v2_breakdown_lookup ON analytics_v2_breakdown (dimension, date, channel, client_id);
CREATE INDEX IF NOT EXISTS idx_v2_env_lookup ON analytics_v2_client_env (date, channel, client_id);

-- ---------------------------------------------------------------------------
-- Deterministic V1 repair: export counters.
-- Base rows are platform-specific daily_export_stats rows only.
-- ---------------------------------------------------------------------------

-- Preserve any deterministic residual that existed only in the legacy "all" rollup.
-- This avoids losing old exports recorded before per-platform attribution was complete.
DROP TABLE IF EXISTS _migration_0011_export_residual;
CREATE TABLE _migration_0011_export_residual AS
SELECT
  a.date,
  a.export_format,
  a.country,
  a.region,
  a.city,
  a.count - COALESCE((
    SELECT SUM(s.count)
    FROM daily_export_stats s
    WHERE s.date = a.date
      AND s.date != 'TOTAL'
      AND s.platform != 'all'
      AND s.export_format = a.export_format
      AND s.country = a.country
      AND s.region = a.region
      AND s.city = a.city
  ), 0) AS count
FROM daily_export_stats a
WHERE a.date != 'TOTAL'
  AND a.platform = 'all'
  AND a.count > COALESCE((
    SELECT SUM(s.count)
    FROM daily_export_stats s
    WHERE s.date = a.date
      AND s.date != 'TOTAL'
      AND s.platform != 'all'
      AND s.export_format = a.export_format
      AND s.country = a.country
      AND s.region = a.region
      AND s.city = a.city
  ), 0);

DELETE FROM daily_export_stats WHERE date = 'TOTAL' OR platform = 'all';

INSERT INTO daily_export_stats (date, platform, export_format, country, region, city, count)
SELECT date, 'unknown', export_format, country, region, city, count
FROM _migration_0011_export_residual
WHERE count > 0
ON CONFLICT (date, platform, export_format, country, region, city)
DO UPDATE SET count = count + excluded.count;

DROP TABLE _migration_0011_export_residual;

INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
SELECT date, 'all', export_format, country, region, city, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, export_format, country, region, city;

INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
SELECT 'TOTAL', platform, export_format, country, region, city, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY platform, export_format, country, region, city;

INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
SELECT 'TOTAL', 'all', export_format, country, region, city, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY export_format, country, region, city;

DELETE FROM aggregate_stats WHERE metric = 'exports_total';

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, platform, 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, 'all', 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', platform, 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY platform;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', 'all', 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all';

-- Deterministic V1 repair: clipboard counters.

-- Preserve deterministic clipboard residuals from legacy all-only rollups.
DROP TABLE IF EXISTS _migration_0011_clipboard_residual;
CREATE TABLE _migration_0011_clipboard_residual AS
SELECT
  a.date,
  a.clipboard_mode,
  a.country,
  a.region,
  a.city,
  a.count - COALESCE((
    SELECT SUM(s.count)
    FROM daily_clipboard_stats s
    WHERE s.date = a.date
      AND s.date != 'TOTAL'
      AND s.platform != 'all'
      AND s.clipboard_mode = a.clipboard_mode
      AND s.country = a.country
      AND s.region = a.region
      AND s.city = a.city
  ), 0) AS count
FROM daily_clipboard_stats a
WHERE a.date != 'TOTAL'
  AND a.platform = 'all'
  AND a.count > COALESCE((
    SELECT SUM(s.count)
    FROM daily_clipboard_stats s
    WHERE s.date = a.date
      AND s.date != 'TOTAL'
      AND s.platform != 'all'
      AND s.clipboard_mode = a.clipboard_mode
      AND s.country = a.country
      AND s.region = a.region
      AND s.city = a.city
  ), 0);

DELETE FROM daily_clipboard_stats WHERE date = 'TOTAL' OR platform = 'all';

INSERT INTO daily_clipboard_stats (date, platform, clipboard_mode, country, region, city, count)
SELECT date, 'unknown', clipboard_mode, country, region, city, count
FROM _migration_0011_clipboard_residual
WHERE count > 0
ON CONFLICT (date, platform, clipboard_mode, country, region, city)
DO UPDATE SET count = count + excluded.count;

DROP TABLE _migration_0011_clipboard_residual;

INSERT OR REPLACE INTO daily_clipboard_stats (date, platform, clipboard_mode, country, region, city, count)
SELECT date, 'all', clipboard_mode, country, region, city, SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, clipboard_mode, country, region, city;

INSERT OR REPLACE INTO daily_clipboard_stats (date, platform, clipboard_mode, country, region, city, count)
SELECT 'TOTAL', platform, clipboard_mode, country, region, city, SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY platform, clipboard_mode, country, region, city;

INSERT OR REPLACE INTO daily_clipboard_stats (date, platform, clipboard_mode, country, region, city, count)
SELECT 'TOTAL', 'all', clipboard_mode, country, region, city, SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY clipboard_mode, country, region, city;

DELETE FROM aggregate_stats WHERE metric = 'clipboards_total';

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, platform, 'clipboards_total', SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, 'all', 'clipboards_total', SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', platform, 'clipboards_total', SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY platform;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', 'all', 'clipboards_total', SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all';

-- ---------------------------------------------------------------------------
-- Historical V2 rebuild.
-- Known website-only visit metrics can be attributed to official_web.
-- Historical parse/API/plugin attribution cannot be safely separated.
-- ---------------------------------------------------------------------------

INSERT OR REPLACE INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT date, 'web', 'official_web', 'none', metric, count
FROM aggregate_stats
WHERE date != 'TOTAL' AND platform = 'all'
  AND metric IN ('page_view', 'visitor_unique');

INSERT OR REPLACE INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform,
       CASE metric
         WHEN 'parse_success' THEN 'parse_success_legacy'
         WHEN 'parse_failure' THEN 'parse_failure_legacy'
         WHEN 'tracks_processed' THEN 'tracks_processed'
         WHEN 'exports_total' THEN 'export'
         WHEN 'clipboards_total' THEN 'clipboard'
         WHEN 'rate_limited' THEN 'rate_limited'
         ELSE metric
       END,
       count
FROM aggregate_stats
WHERE date != 'TOTAL' AND platform != 'all'
  AND metric IN ('parse_success', 'parse_failure', 'tracks_processed', 'exports_total', 'clipboards_total', 'rate_limited');

-- Resolver outcome history is authoritative for resolve_request population.
INSERT OR REPLACE INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, 'resolve_request', SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL' AND platform != 'all' AND dimension = 'resolve_outcome'
GROUP BY date, platform;

INSERT OR REPLACE INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform,
       CASE value
         WHEN 'success_playlist' THEN 'playlist_success'
         WHEN 'success_user' THEN 'user_success'
         WHEN 'failure' THEN 'resolve_failure'
       END,
       count
FROM daily_performance_stats
WHERE date != 'TOTAL' AND platform != 'all'
  AND dimension = 'resolve_outcome'
  AND value IN ('success_playlist', 'success_user', 'failure');

-- Export/clipboard format breakdowns are reconstructed from base platform rows only.
INSERT OR REPLACE INTO analytics_v2_breakdown (date, channel, client_id, platform, dimension, value, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, 'export_format', export_format, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, export_format;

INSERT OR REPLACE INTO analytics_v2_breakdown (date, channel, client_id, platform, dimension, value, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, 'clipboard_mode', clipboard_mode, SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, clipboard_mode;

-- Import bounded reliability dimensions without inventing a historical client/channel.
INSERT OR REPLACE INTO analytics_v2_breakdown (date, channel, client_id, platform, dimension, value, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, dimension, value, count
FROM daily_performance_stats
WHERE date != 'TOTAL' AND platform != 'all'
  AND dimension IN (
    'input_type', 'latency_bucket', 'error_category', 'playlist_size', 'provider_path',
    'resolve_outcome', 'resolve_failure_code', 'resolve_failure_class', 'resolve_failure_stage',
    'resolve_requested_type', 'resolve_requested_platform', 'resolve_input_type',
    'provider_failure_path', 'export_playlist_size', 'clipboard_playlist_size'
  );

-- Geography remains a separate cube.
INSERT OR REPLACE INTO analytics_v2_geo (date, channel, client_id, platform, country, region, metric, count)
SELECT date, 'web', 'official_web', 'none', country, region, 'page_view', SUM(count)
FROM daily_geo_stats
WHERE date != 'TOTAL' AND platform = 'all'
GROUP BY date, country, region;

INSERT OR REPLACE INTO analytics_v2_geo (date, channel, client_id, platform, country, region, metric, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, country, region, 'parse_request', SUM(count)
FROM daily_geo_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region;

INSERT OR REPLACE INTO analytics_v2_geo (date, channel, client_id, platform, country, region, metric, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, country, region, 'export', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region;

INSERT OR REPLACE INTO analytics_v2_geo (date, channel, client_id, platform, country, region, metric, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', platform, country, region, 'clipboard', SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, platform, country, region;

-- Historical environment cube.
INSERT OR REPLACE INTO analytics_v2_client_env (date, channel, client_id, device_class, browser_family, os_family, count)
SELECT date, 'web', 'official_web', device_class, browser_family, os_family, SUM(count)
FROM daily_client_stats
WHERE date != 'TOTAL' AND platform = 'all'
GROUP BY date, device_class, browser_family, os_family;

INSERT OR REPLACE INTO analytics_v2_client_env (date, channel, client_id, device_class, browser_family, os_family, count)
SELECT date, 'legacy_mixed', 'legacy_unknown', device_class, browser_family, os_family, SUM(count)
FROM daily_client_stats
WHERE date != 'TOTAL' AND platform != 'all'
GROUP BY date, device_class, browser_family, os_family;
