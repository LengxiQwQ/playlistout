-- Migration 0013: Freeze manifest for the legacy Analytics V1 archive
--
-- Analytics V2 is already the sole production write path. This migration
-- captures a compact immutable fingerprint for every V1 analytics fact table
-- that must remain read-only after cutover.
--
-- Intentionally excluded:
-- - daily_visitor_hashes: short-lived UV deduplication helper, still pruned.
-- - quarantined_stats: active security archive.
-- - parse_feedback: active maintainer feedback workflow.
-- - security_rate_limits: active abuse-control state.

CREATE TABLE IF NOT EXISTS analytics_v1_archive_manifest (
  table_name TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_count INTEGER NOT NULL,
  count_sum INTEGER NOT NULL,
  min_date TEXT,
  max_date TEXT
);

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'aggregate_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM aggregate_stats;

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'hourly_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM hourly_stats;

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'daily_geo_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM daily_geo_stats;

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'daily_client_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM daily_client_stats;

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'daily_performance_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM daily_performance_stats;

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'daily_export_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM daily_export_stats;

INSERT OR REPLACE INTO analytics_v1_archive_manifest
  (table_name, captured_at, row_count, count_sum, min_date, max_date)
SELECT
  'daily_clipboard_stats',
  CURRENT_TIMESTAMP,
  COUNT(*),
  COALESCE(SUM(count), 0),
  MIN(date),
  MAX(date)
FROM daily_clipboard_stats;
