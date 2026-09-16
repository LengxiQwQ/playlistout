-- Migration 0007: Clean up synthetic seed data in aggregate_stats
-- Resets NetEase TOTAL metrics to true historical sums from real daily entries

UPDATE aggregate_stats
SET count = COALESCE((
  SELECT SUM(s.count)
  FROM aggregate_stats s
  WHERE s.platform = 'netease'
    AND s.metric = aggregate_stats.metric
    AND s.date != 'TOTAL'
), 0)
WHERE date = 'TOTAL'
  AND platform = 'netease'
  AND metric IN ('parse_success', 'tracks_processed');

-- Remove rows if true count is zero
DELETE FROM aggregate_stats
WHERE date = 'TOTAL'
  AND platform = 'netease'
  AND count = 0;
