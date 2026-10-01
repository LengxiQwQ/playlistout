-- Migration 0010: Complete IP Coarse Geographic Attribution Across Telemetry
-- 1. Upgrade daily_export_stats with country, region, city
-- 2. Upgrade daily_clipboard_stats with country, region, city
-- 3. Upgrade parse_feedback with country, region, city
-- 4. Purge contaminated historical test JSON exports and align aggregate_stats.exports_total

-- 1. Upgrade daily_export_stats
CREATE TABLE IF NOT EXISTS daily_export_stats_v2 (
  date TEXT NOT NULL,
  platform TEXT NOT NULL,
  export_format TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UNKNOWN',
  region TEXT NOT NULL DEFAULT 'UNKNOWN',
  city TEXT NOT NULL DEFAULT 'UNKNOWN',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, export_format, country, region, city)
);

-- Safely copy existing export records
INSERT OR IGNORE INTO daily_export_stats_v2 (date, platform, export_format, country, region, city, count)
SELECT date, platform, export_format, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', count
FROM daily_export_stats;

DROP TABLE IF EXISTS daily_export_stats;
ALTER TABLE daily_export_stats_v2 RENAME TO daily_export_stats;

CREATE INDEX IF NOT EXISTS idx_export_stats_date ON daily_export_stats (date);
CREATE INDEX IF NOT EXISTS idx_export_stats_country ON daily_export_stats (country, date);

-- Rebuild TOTAL in daily_export_stats
DELETE FROM daily_export_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
SELECT 'TOTAL', platform, export_format, country, region, city, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY platform, export_format, country, region, city;

-- 2. Upgrade daily_clipboard_stats
CREATE TABLE IF NOT EXISTS daily_clipboard_stats_v2 (
  date TEXT NOT NULL,
  platform TEXT NOT NULL,
  clipboard_mode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UNKNOWN',
  region TEXT NOT NULL DEFAULT 'UNKNOWN',
  city TEXT NOT NULL DEFAULT 'UNKNOWN',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, clipboard_mode, country, region, city)
);

INSERT OR IGNORE INTO daily_clipboard_stats_v2 (date, platform, clipboard_mode, country, region, city, count)
SELECT date, platform, clipboard_mode, 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', count
FROM daily_clipboard_stats;

DROP TABLE IF EXISTS daily_clipboard_stats;
ALTER TABLE daily_clipboard_stats_v2 RENAME TO daily_clipboard_stats;

CREATE INDEX IF NOT EXISTS idx_clipboard_stats_date ON daily_clipboard_stats (date);
CREATE INDEX IF NOT EXISTS idx_clipboard_stats_country ON daily_clipboard_stats (country, date);

-- Rebuild TOTAL in daily_clipboard_stats
DELETE FROM daily_clipboard_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_clipboard_stats (date, platform, clipboard_mode, country, region, city, count)
SELECT 'TOTAL', platform, clipboard_mode, country, region, city, SUM(count)
FROM daily_clipboard_stats
WHERE date != 'TOTAL'
GROUP BY platform, clipboard_mode, country, region, city;

-- 3. Upgrade parse_feedback with geographic attribution
ALTER TABLE parse_feedback ADD COLUMN country TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE parse_feedback ADD COLUMN region TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE parse_feedback ADD COLUMN city TEXT NOT NULL DEFAULT 'UNKNOWN';
CREATE INDEX IF NOT EXISTS idx_feedback_country ON parse_feedback (country);

-- Rebuild daily_performance_stats TOTAL
DELETE FROM daily_performance_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_performance_stats (date, platform, dimension, value, count)
SELECT 'TOTAL', platform, dimension, value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
GROUP BY platform, dimension, value;

-- Align aggregate_stats.exports_total strictly with daily_export_stats
DELETE FROM aggregate_stats WHERE metric = 'exports_total';
INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, platform, 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY date, platform;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, 'all', 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY date;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', platform, 'exports_total', SUM(count)
FROM aggregate_stats
WHERE metric = 'exports_total' AND date != 'TOTAL'
GROUP BY platform;
