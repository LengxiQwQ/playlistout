-- Migration 0014: Retire Analytics V1 fact tables
--
-- Preconditions:
-- - Analytics V2 cutover is frozen.
-- - Migration 0013 captured exact V1 archive fingerprints.
-- - No V1 table changed after that snapshot.
--
-- This migration first materializes the only remaining runtime dependency
-- (legacy public daily trend values), then permanently drops the seven V1
-- analytics fact tables. The compact archive manifest remains as audit
-- metadata; Time Travel / external backups remain the recovery mechanism.

CREATE TABLE _analytics_v1_retirement_guard (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

-- Fresh databases can reach 0014 before the deployment finalizer. If the
-- entire V1 archive is provably zero-volume, freezing is equivalent to a
-- no-history cutover and is safe to finalize inside the migration.
UPDATE analytics_v2_cutover_state
SET status = 'frozen',
    frozen_at = COALESCE(frozen_at, CURRENT_TIMESTAMP)
WHERE id = 1
  AND status = 'prepared'
  AND NOT EXISTS (
    SELECT 1
    FROM analytics_v1_archive_manifest
    WHERE count_sum != 0
  );

-- Cutover must already be final (or the verified zero-volume fresh-DB case above).
INSERT INTO _analytics_v1_retirement_guard (ok)
VALUES (
  CASE WHEN COALESCE((
    SELECT CASE WHEN status = 'frozen' AND frozen_at IS NOT NULL THEN 1 ELSE 0 END
    FROM analytics_v2_cutover_state
    WHERE id = 1
  ), 0) = 1 THEN 1 ELSE 0 END
);

-- Every frozen V1 table must still match the 0013 manifest exactly.
INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM aggregate_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM aggregate_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM aggregate_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM aggregate_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'aggregate_stats';

INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM hourly_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM hourly_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM hourly_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM hourly_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'hourly_stats';

INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_geo_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM daily_geo_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM daily_geo_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM daily_geo_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'daily_geo_stats';

INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_client_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM daily_client_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM daily_client_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM daily_client_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'daily_client_stats';

INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_performance_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM daily_performance_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM daily_performance_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM daily_performance_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'daily_performance_stats';

INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_export_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM daily_export_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM daily_export_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM daily_export_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'daily_export_stats';

INSERT INTO _analytics_v1_retirement_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_clipboard_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count), 0) FROM daily_clipboard_stats)
  AND COALESCE(m.min_date, '') = COALESCE((SELECT MIN(date) FROM daily_clipboard_stats), '')
  AND COALESCE(m.max_date, '') = COALESCE((SELECT MAX(date) FROM daily_clipboard_stats), '')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name = 'daily_clipboard_stats';

-- Ensure all seven manifest rows existed and all seven checks inserted.
INSERT INTO _analytics_v1_retirement_guard (ok)
VALUES (
  CASE WHEN (SELECT COUNT(*) FROM analytics_v1_archive_manifest) = 7
         AND (SELECT COUNT(*) FROM _analytics_v1_retirement_guard) = 8
       THEN 1 ELSE 0 END
);

-- Compact immutable public history for dates before the cutover day.
CREATE TABLE IF NOT EXISTS analytics_v2_public_history (
  date TEXT PRIMARY KEY,
  parses INTEGER NOT NULL DEFAULT 0 CHECK (parses >= 0),
  tracks INTEGER NOT NULL DEFAULT 0 CHECK (tracks >= 0),
  exports INTEGER NOT NULL DEFAULT 0 CHECK (exports >= 0)
);

INSERT OR REPLACE INTO analytics_v2_public_history (date, parses, tracks, exports)
SELECT
  date,
  SUM(CASE WHEN metric = 'parse_success' THEN count ELSE 0 END) AS parses,
  SUM(CASE WHEN metric = 'tracks_processed' THEN count ELSE 0 END) AS tracks,
  SUM(CASE WHEN metric = 'exports_total' THEN count ELSE 0 END) AS exports
FROM aggregate_stats
WHERE platform = 'all'
  AND date != 'TOTAL'
  AND date < (SELECT baseline_date FROM analytics_v2_cutover_state WHERE id = 1)
  AND metric IN ('parse_success', 'tracks_processed', 'exports_total')
GROUP BY date;

CREATE TABLE IF NOT EXISTS analytics_v1_cleanup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL CHECK (status = 'retired'),
  retired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_table_count INTEGER NOT NULL,
  public_history_rows INTEGER NOT NULL
);

INSERT OR REPLACE INTO analytics_v1_cleanup_state
  (id, status, retired_at, archived_table_count, public_history_rows)
VALUES (
  1,
  'retired',
  CURRENT_TIMESTAMP,
  (SELECT COUNT(*) FROM analytics_v1_archive_manifest),
  (SELECT COUNT(*) FROM analytics_v2_public_history)
);

-- V1 fact tables are now fully retired.
DROP TABLE daily_clipboard_stats;
DROP TABLE daily_export_stats;
DROP TABLE daily_performance_stats;
DROP TABLE daily_client_stats;
DROP TABLE daily_geo_stats;
DROP TABLE hourly_stats;
DROP TABLE aggregate_stats;

DROP TABLE _analytics_v1_retirement_guard;
