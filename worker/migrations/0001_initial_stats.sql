-- Migration 0001: Anonymous Aggregate Statistics Table
-- Strictly compliant with docs/PROJECT-CONSTITUTION.md Section 7 & 9
-- No URLs, track contents, IP addresses, or user identifiers are ever recorded.

CREATE TABLE IF NOT EXISTS aggregate_stats (
  date TEXT NOT NULL,         -- 'YYYY-MM-DD' (UTC) or 'TOTAL'
  platform TEXT NOT NULL,     -- 'qqmusic' or 'all'
  metric TEXT NOT NULL,       -- 'parse_success', 'parse_failure'
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, platform, metric)
);

CREATE INDEX IF NOT EXISTS idx_stats_date_platform ON aggregate_stats (date, platform);
