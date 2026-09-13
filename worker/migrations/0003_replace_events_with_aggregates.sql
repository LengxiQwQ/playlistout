-- Migration 0003: Replace event-level table with privacy-preserving daily/hourly aggregate tables
-- Strictly compliant with docs/ROADMAP.md Section 2 (Analytics Foundation):
-- "Prefer daily/hourly aggregate counters over long-lived event-level tracking"
-- No per-request detail rows. Zero ability to correlate dimensions to single user requests.

-- 1. Safely remove deprecated event-level log table
DROP TABLE IF EXISTS analytics_events;
DROP INDEX IF EXISTS idx_analytics_events_date;
DROP INDEX IF EXISTS idx_analytics_events_platform;

-- 2. Hourly activity aggregates (for throughput and peak traffic insights)
CREATE TABLE IF NOT EXISTS hourly_stats (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC)
  hour INTEGER NOT NULL,             -- 0-23
  platform TEXT NOT NULL,            -- 'qqmusic', 'all'
  metric TEXT NOT NULL,              -- 'parse_success', 'parse_failure', 'rate_limited', 'export', 'clipboard'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, hour, platform, metric)
);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_date ON hourly_stats (date);

-- 3. Daily geographic distribution aggregates
CREATE TABLE IF NOT EXISTS daily_geo_stats (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,            -- 'qqmusic', 'all'
  country TEXT NOT NULL,             -- ISO 3166-1 alpha-2, e.g. 'CN', 'US', or 'UNKNOWN'
  region TEXT NOT NULL,              -- First-level subdivision, or 'UNKNOWN'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, country, region)
);
CREATE INDEX IF NOT EXISTS idx_geo_stats_date ON daily_geo_stats (date);

-- 4. Daily client environment aggregates (coarse device class, browser, OS)
CREATE TABLE IF NOT EXISTS daily_client_stats (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,            -- 'qqmusic', 'all'
  device_class TEXT NOT NULL,        -- 'desktop', 'mobile', 'tablet', 'unknown'
  browser_family TEXT NOT NULL,      -- 'chrome', 'firefox', 'safari', 'edge', 'other'
  os_family TEXT NOT NULL,           -- 'windows', 'macos', 'linux', 'android', 'ios', 'other'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, device_class, browser_family, os_family)
);
CREATE INDEX IF NOT EXISTS idx_client_stats_date ON daily_client_stats (date);

-- 5. Daily performance & reliability dimension aggregates
-- Covers: input_type, playlist_size, latency_bucket, provider_path, error_category, rate_limit_endpoint
CREATE TABLE IF NOT EXISTS daily_performance_stats (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,            -- 'qqmusic', 'all'
  dimension TEXT NOT NULL,           -- 'input_type', 'playlist_size', 'latency_bucket', 'provider_path', 'error_category', 'rate_limit_endpoint'
  value TEXT NOT NULL,               -- e.g. 'web_url', '1-50', '<500ms', 'primary', 'error_upstream'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, dimension, value)
);
CREATE INDEX IF NOT EXISTS idx_perf_stats_date ON daily_performance_stats (date);

-- 6. Dedicated daily clipboard aggregates (strictly separated from file exports)
CREATE TABLE IF NOT EXISTS daily_clipboard_stats (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,            -- 'qqmusic', 'all'
  clipboard_mode TEXT NOT NULL,      -- 'title', 'title_artist', 'title_artist_album'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, clipboard_mode)
);
CREATE INDEX IF NOT EXISTS idx_clipboard_stats_date ON daily_clipboard_stats (date);

-- 7. Clean up any invalid export formats from daily_export_stats if contaminated
DELETE FROM daily_export_stats WHERE export_format NOT IN ('txt', 'csv', 'xlsx', 'json');
