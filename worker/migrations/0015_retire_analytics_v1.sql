-- Migration 0015: permanently retire Analytics V1 fact tables (contract phase).
--
-- Preconditions:
-- - 0014 prepared analytics_v2_public_history and analytics_v1_cleanup_state.
-- - The V2-only Worker has already been deployed and no longer reads/writes V1.
-- - The seven V1 tables still match the immutable 0013 archive manifest.
--
-- Any mismatch aborts the migration before a DROP occurs.

CREATE TABLE _v1_retire_guard (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

INSERT INTO _v1_retire_guard (ok)
VALUES (
  CASE WHEN COALESCE((
    SELECT CASE WHEN status='frozen' AND frozen_at IS NOT NULL THEN 1 ELSE 0 END
    FROM analytics_v2_cutover_state
    WHERE id=1
  ), 0) = 1 THEN 1 ELSE 0 END
);

INSERT INTO _v1_retire_guard (ok)
VALUES (
  CASE WHEN COALESCE((
    SELECT CASE
      WHEN status='prepared'
       AND retired_at IS NULL
       AND archived_table_count=7
       AND public_history_rows=(SELECT COUNT(*) FROM analytics_v2_public_history)
      THEN 1 ELSE 0 END
    FROM analytics_v1_cleanup_state
    WHERE id=1
  ), 0) = 1 THEN 1 ELSE 0 END
);

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM aggregate_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM aggregate_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM aggregate_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM aggregate_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='aggregate_stats';

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM hourly_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM hourly_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM hourly_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM hourly_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='hourly_stats';

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_geo_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_geo_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_geo_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_geo_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_geo_stats';

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_client_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_client_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_client_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_client_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_client_stats';

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_performance_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_performance_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_performance_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_performance_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_performance_stats';

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_export_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_export_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_export_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_export_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_export_stats';

INSERT INTO _v1_retire_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_clipboard_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_clipboard_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_clipboard_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_clipboard_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_clipboard_stats';

INSERT INTO _v1_retire_guard (ok)
VALUES (
  CASE WHEN (SELECT COUNT(*) FROM analytics_v1_archive_manifest)=7
         AND (SELECT COUNT(*) FROM _v1_retire_guard)=9
         AND NOT EXISTS (
           SELECT 1
           FROM analytics_v2_public_history
           WHERE date >= (SELECT baseline_date FROM analytics_v2_cutover_state WHERE id=1)
         )
       THEN 1 ELSE 0 END
);

UPDATE analytics_v1_cleanup_state
SET status='retired',
    retired_at=CURRENT_TIMESTAMP
WHERE id=1
  AND status='prepared';

DROP TABLE daily_clipboard_stats;
DROP TABLE daily_export_stats;
DROP TABLE daily_performance_stats;
DROP TABLE daily_client_stats;
DROP TABLE daily_geo_stats;
DROP TABLE hourly_stats;
DROP TABLE aggregate_stats;

DROP TABLE _v1_retire_guard;
