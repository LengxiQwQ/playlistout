-- Migration 0002: Analytics Foundation
-- Extends aggregate statistics and adds private dimensional analytics.
-- Strictly compliant with docs/PROJECT-CONSTITUTION.md Section 7 & 9
-- and docs/ROADMAP.md Section 2 (Analytics Foundation).
--
-- PRIVACY: No raw IP, playlist URLs/IDs, song/artist/album content,
-- cookies, auth data, or full User-Agent strings are ever stored.

-- 1. Add track_count column to existing aggregate_stats table.
--    This enables "total tracks processed" and "tracks processed today" queries.
--    Uses the same (date, platform, metric) model: metric = 'tracks_processed'.
--    No schema ALTER needed — we reuse the existing table with a new metric key.

-- 2. Export/clipboard event aggregation (public-safe aggregate counters).
CREATE TABLE IF NOT EXISTS daily_export_stats (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,            -- 'qqmusic', 'all', etc.
  export_format TEXT NOT NULL,       -- 'txt', 'csv', 'xlsx', 'json',
                                     -- 'clipboard_title', 'clipboard_title_artist',
                                     -- 'clipboard_title_artist_album'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, export_format)
);

CREATE INDEX IF NOT EXISTS idx_export_stats_date ON daily_export_stats (date);

-- 3. Private dimensional analytics events (NOT exposed via public API).
--    Each row represents one anonymized request event with coarse dimensions.
--    Used for product reliability insights by the maintainer via direct D1 access.
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC)
  hour_bucket INTEGER NOT NULL,      -- 0-23
  country TEXT,                      -- ISO 3166-1 alpha-2, from cf.country
  region TEXT,                       -- first-level region, from cf.region
  platform TEXT NOT NULL,            -- 'qqmusic', etc.
  event_type TEXT NOT NULL,          -- 'parse', 'export', 'clipboard'
  input_type TEXT,                   -- 'web_url', 'mobile_share_link', 'raw_id', 'other'
  result TEXT NOT NULL,              -- 'success', 'error_upstream', 'error_validation',
                                     -- 'error_timeout', 'error_rate_limit', 'error_internal'
  error_category TEXT,               -- stable error slug when result != 'success'
  playlist_size_bucket TEXT,         -- '1-50', '51-200', '201-500', '501-1000', '1000+'
  track_count INTEGER,               -- actual track count for this event
  export_format TEXT,                -- for export/clipboard events
  device_class TEXT,                 -- 'desktop', 'mobile', 'tablet'
  browser_family TEXT,               -- 'chrome', 'firefox', 'safari', 'edge', 'other'
  os_family TEXT,                    -- 'windows', 'macos', 'linux', 'android', 'ios', 'other'
  latency_bucket TEXT,               -- '<500ms', '500-1000ms', '1-3s', '3-5s', '5s+'
  provider_path TEXT,                -- 'primary', 'fallback'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events (date);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events (platform, date);
