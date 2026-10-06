-- Migration 0014: prepare Analytics V1 retirement (expand phase).
-- Backward-compatible with the currently deployed Worker: no V1 fact table is removed.

CREATE TABLE IF NOT EXISTS quarantined_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quarantined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  incident_date TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_table TEXT NOT NULL,
  platform TEXT NOT NULL,
  metric_or_dimension TEXT NOT NULL,
  value TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  client_info TEXT,
  count INTEGER NOT NULL,
  details_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_quarantined_date ON quarantined_stats (incident_date);
CREATE INDEX IF NOT EXISTS idx_quarantined_reason ON quarantined_stats (reason);
CREATE INDEX IF NOT EXISTS idx_quarantined_platform ON quarantined_stats (platform);

-- Fresh databases have no legacy traffic, so their zero-volume cutover can be frozen here.
UPDATE analytics_v2_cutover_state
SET status='frozen', frozen_at=COALESCE(frozen_at, CURRENT_TIMESTAMP)
WHERE id=1
  AND status='prepared'
  AND NOT EXISTS (
    SELECT 1 FROM analytics_v1_archive_manifest WHERE count_sum != 0
  );

CREATE TABLE _v1_prepare_guard (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

-- Cutover must already be frozen (or the verified zero-volume fresh DB case above).
INSERT INTO _v1_prepare_guard (ok)
VALUES (
  CASE WHEN COALESCE((
    SELECT CASE WHEN status='frozen' AND frozen_at IS NOT NULL THEN 1 ELSE 0 END
    FROM analytics_v2_cutover_state
    WHERE id=1
  ), 0) = 1 THEN 1 ELSE 0 END
);

-- Re-verify all seven V1 fact tables independently against migration 0013.
-- Separate checks avoid Cloudflare D1 compound-SELECT limits.
INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM aggregate_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM aggregate_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM aggregate_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM aggregate_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='aggregate_stats';

INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM hourly_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM hourly_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM hourly_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM hourly_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='hourly_stats';

INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_geo_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_geo_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_geo_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_geo_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_geo_stats';

INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_client_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_client_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_client_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_client_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_client_stats';

INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_performance_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_performance_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_performance_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_performance_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_performance_stats';

INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_export_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_export_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_export_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_export_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_export_stats';

INSERT INTO _v1_prepare_guard (ok)
SELECT CASE WHEN
  m.row_count = (SELECT COUNT(*) FROM daily_clipboard_stats)
  AND m.count_sum = (SELECT COALESCE(SUM(count),0) FROM daily_clipboard_stats)
  AND COALESCE(m.min_date,'') = COALESCE((SELECT MIN(date) FROM daily_clipboard_stats),'')
  AND COALESCE(m.max_date,'') = COALESCE((SELECT MAX(date) FROM daily_clipboard_stats),'')
THEN 1 ELSE 0 END
FROM analytics_v1_archive_manifest m
WHERE m.table_name='daily_clipboard_stats';

INSERT INTO _v1_prepare_guard (ok)
VALUES (
  CASE WHEN (SELECT COUNT(*) FROM analytics_v1_archive_manifest)=7
         AND (SELECT COUNT(*) FROM _v1_prepare_guard)=8
       THEN 1 ELSE 0 END
);

CREATE TABLE IF NOT EXISTS analytics_v2_public_history (
  date TEXT PRIMARY KEY,
  parses INTEGER NOT NULL DEFAULT 0 CHECK (parses >= 0),
  tracks INTEGER NOT NULL DEFAULT 0 CHECK (tracks >= 0),
  exports INTEGER NOT NULL DEFAULT 0 CHECK (exports >= 0)
);

INSERT OR REPLACE INTO analytics_v2_public_history (date, parses, tracks, exports)
SELECT
  date,
  SUM(CASE WHEN metric='parse_success' THEN count ELSE 0 END),
  SUM(CASE WHEN metric='tracks_processed' THEN count ELSE 0 END),
  SUM(CASE WHEN metric='exports_total' THEN count ELSE 0 END)
FROM aggregate_stats
WHERE platform='all'
  AND date!='TOTAL'
  AND date < (SELECT baseline_date FROM analytics_v2_cutover_state WHERE id=1)
  AND metric IN ('parse_success','tracks_processed','exports_total')
GROUP BY date;

CREATE TABLE IF NOT EXISTS analytics_v1_cleanup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL CHECK (status IN ('prepared','retired')),
  prepared_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at TEXT,
  archived_table_count INTEGER NOT NULL,
  public_history_rows INTEGER NOT NULL
);

INSERT OR REPLACE INTO analytics_v1_cleanup_state
  (id, status, prepared_at, retired_at, archived_table_count, public_history_rows)
VALUES (
  1, 'prepared', CURRENT_TIMESTAMP, NULL,
  (SELECT COUNT(*) FROM analytics_v1_archive_manifest),
  (SELECT COUNT(*) FROM analytics_v2_public_history)
);

DROP TABLE _v1_prepare_guard;
