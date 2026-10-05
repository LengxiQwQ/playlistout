-- Migration 0012: Analytics V2 public cutover baseline
--
-- Captures an exact V1 <-> V2 bridge before legacy writes are frozen.
-- The deployment workflow finalizes these baselines immediately before
-- deploying the V2-only writer. Public counters can therefore continue
-- monotonically without guessing historical attribution.

CREATE TABLE IF NOT EXISTS analytics_v2_public_baseline (
  key TEXT PRIMARY KEY,
  baseline_date TEXT NOT NULL,
  legacy_total INTEGER NOT NULL DEFAULT 0,
  v2_total INTEGER NOT NULL DEFAULT 0,
  legacy_day INTEGER NOT NULL DEFAULT 0,
  v2_day INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analytics_v2_cutover_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL CHECK (status IN ('prepared', 'frozen')),
  baseline_date TEXT NOT NULL,
  prepared_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  frozen_at TEXT
);

INSERT OR IGNORE INTO analytics_v2_cutover_state (id, status, baseline_date)
VALUES (1, 'prepared', date('now'));

-- Global public metrics.
INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'metric:page_view',
  date('now'),
  COALESCE((SELECT count FROM aggregate_stats WHERE date='TOTAL' AND platform='all' AND metric='page_view'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric='page_view'), 0),
  COALESCE((SELECT count FROM aggregate_stats WHERE date=date('now') AND platform='all' AND metric='page_view'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE date=date('now') AND metric='page_view'), 0);

INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'metric:visitor_unique',
  date('now'),
  COALESCE((SELECT count FROM aggregate_stats WHERE date='TOTAL' AND platform='all' AND metric='visitor_unique'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric='visitor_unique'), 0),
  COALESCE((SELECT count FROM aggregate_stats WHERE date=date('now') AND platform='all' AND metric='visitor_unique'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE date=date('now') AND metric='visitor_unique'), 0);

INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'metric:playlist_success',
  date('now'),
  COALESCE((SELECT count FROM aggregate_stats WHERE date='TOTAL' AND platform='all' AND metric='parse_success'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric='playlist_success'), 0),
  COALESCE((SELECT count FROM aggregate_stats WHERE date=date('now') AND platform='all' AND metric='parse_success'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE date=date('now') AND metric='playlist_success'), 0);

INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'metric:tracks_processed',
  date('now'),
  COALESCE((SELECT count FROM aggregate_stats WHERE date='TOTAL' AND platform='all' AND metric='tracks_processed'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric='tracks_processed'), 0),
  COALESCE((SELECT count FROM aggregate_stats WHERE date=date('now') AND platform='all' AND metric='tracks_processed'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE date=date('now') AND metric='tracks_processed'), 0);

INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'metric:export',
  date('now'),
  COALESCE((SELECT count FROM aggregate_stats WHERE date='TOTAL' AND platform='all' AND metric='exports_total'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE metric='export'), 0),
  COALESCE((SELECT count FROM aggregate_stats WHERE date=date('now') AND platform='all' AND metric='exports_total'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE date=date('now') AND metric='export'), 0);

-- Per-platform public parse counters.
INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'platform_success:' || p.platform,
  date('now'),
  COALESCE((SELECT count FROM aggregate_stats WHERE date='TOTAL' AND platform=p.platform AND metric='parse_success'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE platform=p.platform AND metric='playlist_success'), 0),
  COALESCE((SELECT count FROM aggregate_stats WHERE date=date('now') AND platform=p.platform AND metric='parse_success'), 0),
  COALESCE((SELECT SUM(count) FROM analytics_v2_daily_core WHERE date=date('now') AND platform=p.platform AND metric='playlist_success'), 0)
FROM (
  SELECT 'qqmusic' AS platform
  UNION ALL SELECT 'netease'
  UNION ALL SELECT 'kugou'
  UNION ALL SELECT 'qishui'
) p;

-- Public export-format lifetime counters.
INSERT OR REPLACE INTO analytics_v2_public_baseline
  (key, baseline_date, legacy_total, v2_total, legacy_day, v2_day)
SELECT
  'export_format:' || f.format,
  date('now'),
  COALESCE((
    SELECT SUM(count) FROM daily_export_stats
    WHERE date!='TOTAL' AND platform!='all' AND export_format=f.format
  ), 0),
  COALESCE((
    SELECT SUM(count) FROM analytics_v2_breakdown
    WHERE dimension='export_format' AND value=f.format
  ), 0),
  COALESCE((
    SELECT SUM(count) FROM daily_export_stats
    WHERE date=date('now') AND platform!='all' AND export_format=f.format
  ), 0),
  COALESCE((
    SELECT SUM(count) FROM analytics_v2_breakdown
    WHERE date=date('now') AND dimension='export_format' AND value=f.format
  ), 0)
FROM (
  SELECT 'txt' AS format
  UNION ALL SELECT 'csv'
  UNION ALL SELECT 'xlsx'
  UNION ALL SELECT 'json'
  UNION ALL SELECT 'm3u8'
) f;

CREATE INDEX IF NOT EXISTS idx_v2_public_baseline_date
  ON analytics_v2_public_baseline (baseline_date);
