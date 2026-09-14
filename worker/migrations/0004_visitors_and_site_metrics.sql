-- Migration 0004: Anonymous Visitor Tracking and Site Metrics
-- Strictly compliant with docs/PROJECT-CONSTITUTION.md Section 7 & 9
--
-- PRIVACY GUARANTEE:
-- No raw IP addresses, cookies, or user identifiers are EVER stored.
-- Daily unique visitors are deduplicated using a one-way, truncated SHA-256 hash (date + IP + salt).
-- The hash cannot be reversed to discover user identities.

-- 1. Ephemeral daily visitor hash table for same-day UV deduplication
CREATE TABLE IF NOT EXISTS daily_visitor_hashes (
  date TEXT NOT NULL,         -- 'YYYY-MM-DD' (UTC)
  hash TEXT NOT NULL,         -- truncated one-way SHA-256 hash (16 chars)
  PRIMARY KEY (date, hash)
);

CREATE INDEX IF NOT EXISTS idx_visitor_hashes_date ON daily_visitor_hashes (date);

-- aggregate_stats table already handles (date, platform, metric, count).
-- New metrics used in aggregate_stats:
--   - 'visitor_unique': daily unique visitors (date=YYYY-MM-DD) and all-time unique visitors (date='TOTAL')
--   - 'page_view': daily page hits (date=YYYY-MM-DD) and all-time page hits (date='TOTAL')
