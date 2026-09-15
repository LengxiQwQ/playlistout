-- Migration 0005: Add city granularity to geographic statistics
-- Strictly compliant with docs/PROJECT-CONSTITUTION.md Section 7 & 9
-- PRIVACY: Coarse geographic aggregates only (country, region, city).
-- No raw IP addresses, cookies, or user identifiers are EVER stored.

CREATE TABLE IF NOT EXISTS daily_geo_stats_v2 (
  date TEXT NOT NULL,                -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,            -- 'qqmusic', 'netease', 'all'
  country TEXT NOT NULL,             -- ISO 3166-1 alpha-2, e.g. 'CN', 'US', or 'UNKNOWN'
  region TEXT NOT NULL,              -- First-level subdivision / province, or 'UNKNOWN'
  city TEXT NOT NULL DEFAULT 'UNKNOWN', -- City name, or 'UNKNOWN'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, country, region, city)
);

-- Safely copy over any existing records
INSERT OR IGNORE INTO daily_geo_stats_v2 (date, platform, country, region, city, count)
SELECT date, platform, country, region, 'UNKNOWN', count FROM daily_geo_stats;

DROP TABLE IF EXISTS daily_geo_stats;
ALTER TABLE daily_geo_stats_v2 RENAME TO daily_geo_stats;

CREATE INDEX IF NOT EXISTS idx_geo_stats_date ON daily_geo_stats (date);
CREATE INDEX IF NOT EXISTS idx_geo_stats_country ON daily_geo_stats (country, date);
