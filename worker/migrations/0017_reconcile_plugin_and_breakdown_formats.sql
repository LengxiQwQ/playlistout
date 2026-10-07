-- Migration 0017: Reconcile legacy plugin runtime browser tokens and latency breakdown formats
--
-- 1. In analytics_v2_client_env, normalize legacy browser_family tokens:
--    'playlistout_musicfree' and 'playlistout_plugin' -> 'plugin:musicfree'.
-- 2. In analytics_v2_breakdown, normalize legacy latency_bucket:
--    '_500ms' -> '<500ms'.

-- 1. Merge legacy browser_family into canonical 'plugin:musicfree'
INSERT INTO analytics_v2_client_env (date, channel, client_id, device_class, browser_family, os_family, count)
SELECT
  date,
  CASE WHEN channel = 'legacy_mixed' THEN 'plugin' ELSE channel END AS channel,
  CASE WHEN client_id = 'legacy_unknown' THEN 'musicfree' ELSE client_id END AS client_id,
  device_class,
  'plugin:musicfree' AS browser_family,
  os_family,
  SUM(count) AS count
FROM analytics_v2_client_env
WHERE browser_family IN ('playlistout_musicfree', 'playlistout_plugin')
GROUP BY date, CASE WHEN channel = 'legacy_mixed' THEN 'plugin' ELSE channel END, CASE WHEN client_id = 'legacy_unknown' THEN 'musicfree' ELSE client_id END, device_class, os_family
ON CONFLICT (date, channel, client_id, device_class, browser_family, os_family)
DO UPDATE SET count = analytics_v2_client_env.count + excluded.count;

DELETE FROM analytics_v2_client_env
WHERE browser_family IN ('playlistout_musicfree', 'playlistout_plugin');

-- 2. Merge legacy latency_bucket '_500ms' into canonical '<500ms'
INSERT INTO analytics_v2_breakdown (date, channel, client_id, platform, dimension, value, count)
SELECT
  date,
  channel,
  client_id,
  platform,
  'latency_bucket' AS dimension,
  '<500ms' AS value,
  SUM(count) AS count
FROM analytics_v2_breakdown
WHERE dimension = 'latency_bucket' AND value = '_500ms'
GROUP BY date, channel, client_id, platform
ON CONFLICT (date, channel, client_id, platform, dimension, value)
DO UPDATE SET count = analytics_v2_breakdown.count + excluded.count;

DELETE FROM analytics_v2_breakdown
WHERE dimension = 'latency_bucket' AND value = '_500ms';
