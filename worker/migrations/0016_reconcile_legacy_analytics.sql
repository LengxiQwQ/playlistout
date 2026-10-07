-- Migration 0016: Reconcile legacy parse stats into canonical V2 resolver metrics
--
-- Reconciles parse_success_legacy and parse_failure_legacy into canonical
-- playlist_success, resolve_failure, and resolve_request for legacy_mixed channel,
-- preserving all mathematical invariants (resolve_request = playlist_success + user_success + resolve_failure).

-- 1. Upsert reconciled playlist_success
INSERT INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT
  l.date,
  l.channel,
  l.client_id,
  l.platform,
  'playlist_success',
  MAX(COALESCE(c.count, 0), l.count)
FROM analytics_v2_daily_core l
LEFT JOIN analytics_v2_daily_core c
  ON c.date = l.date
  AND c.channel = l.channel
  AND c.client_id = l.client_id
  AND c.platform = l.platform
  AND c.metric = 'playlist_success'
WHERE l.metric = 'parse_success_legacy'
ON CONFLICT (date, channel, client_id, platform, metric)
DO UPDATE SET count = excluded.count;

-- 2. Upsert reconciled resolve_failure
INSERT INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT
  l.date,
  l.channel,
  l.client_id,
  l.platform,
  'resolve_failure',
  MAX(COALESCE(c.count, 0), l.count)
FROM analytics_v2_daily_core l
LEFT JOIN analytics_v2_daily_core c
  ON c.date = l.date
  AND c.channel = l.channel
  AND c.client_id = l.client_id
  AND c.platform = l.platform
  AND c.metric = 'resolve_failure'
WHERE l.metric = 'parse_failure_legacy'
ON CONFLICT (date, channel, client_id, platform, metric)
DO UPDATE SET count = excluded.count;

-- 3. Ensure resolve_request equals playlist_success + user_success + resolve_failure for each (date, channel, client_id, platform)
INSERT INTO analytics_v2_daily_core (date, channel, client_id, platform, metric, count)
SELECT
  date,
  channel,
  client_id,
  platform,
  'resolve_request',
  SUM(count)
FROM analytics_v2_daily_core
WHERE metric IN ('playlist_success', 'user_success', 'resolve_failure')
  AND channel = 'legacy_mixed'
GROUP BY date, channel, client_id, platform
ON CONFLICT (date, channel, client_id, platform, metric)
DO UPDATE SET count = excluded.count;

-- 4. Clean up temporary legacy metric markers from daily_core
DELETE FROM analytics_v2_daily_core
WHERE metric IN ('parse_success_legacy', 'parse_failure_legacy');
