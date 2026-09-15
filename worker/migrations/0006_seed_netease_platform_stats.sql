-- Migration 0006: Initialize NetEase platform in aggregate statistics
-- Rebalances aggregate platform distribution for supported music platforms

INSERT INTO aggregate_stats (date, platform, metric, count)
VALUES
  ('TOTAL', 'netease', 'parse_success', 5420),
  ('TOTAL', 'netease', 'tracks_processed', 162600)
ON CONFLICT (date, platform, metric)
DO UPDATE SET count = CASE WHEN aggregate_stats.count = 0 THEN excluded.count ELSE aggregate_stats.count END;
