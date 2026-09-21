-- PlaylistOut D1 数据重置：删除 2026-09-19 之前的所有统计，重建累计行（TOTAL）
-- 保留 2026-09-19 当天及之后的数据。执行前已备份：
--   insights/backups/d1-playlistout-stats-backup-2026-09-21-pre-reset.sql
-- 幂等：可安全重跑（DELETE 与 INSERT OR REPLACE）。
-- 注意：D1 不接受显式 BEGIN/COMMIT；wrangler 上传的文件按批次原子执行。

-- 1. aggregate_stats：删 9/19 前按日行 + 重建 TOTAL（按 platform, metric 求和）
DELETE FROM aggregate_stats WHERE date < '2026-09-19';
DELETE FROM aggregate_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', platform, metric, SUM(count) FROM aggregate_stats WHERE date != 'TOTAL' GROUP BY platform, metric;

-- 2. hourly_stats：无 TOTAL 行，直接删 9/19 前
DELETE FROM hourly_stats WHERE date < '2026-09-19';

-- 3. daily_geo_stats：删 9/19 前 + 重建 TOTAL（platform, country, region, city）
DELETE FROM daily_geo_stats WHERE date < '2026-09-19';
DELETE FROM daily_geo_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_geo_stats (date, platform, country, region, city, count)
SELECT 'TOTAL', platform, country, region, city, SUM(count) FROM daily_geo_stats WHERE date != 'TOTAL' GROUP BY platform, country, region, city;

-- 4. daily_client_stats：删 9/19 前 + 重建 TOTAL（platform, device_class, browser_family, os_family）
DELETE FROM daily_client_stats WHERE date < '2026-09-19';
DELETE FROM daily_client_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_client_stats (date, platform, device_class, browser_family, os_family, count)
SELECT 'TOTAL', platform, device_class, browser_family, os_family, SUM(count) FROM daily_client_stats WHERE date != 'TOTAL' GROUP BY platform, device_class, browser_family, os_family;

-- 5. daily_performance_stats：删 9/19 前 + 重建 TOTAL（platform, dimension, value）
DELETE FROM daily_performance_stats WHERE date < '2026-09-19';
DELETE FROM daily_performance_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_performance_stats (date, platform, dimension, value, count)
SELECT 'TOTAL', platform, dimension, value, SUM(count) FROM daily_performance_stats WHERE date != 'TOTAL' GROUP BY platform, dimension, value;

-- 6. daily_clipboard_stats：删 9/19 前 + 重建 TOTAL（platform, clipboard_mode）
DELETE FROM daily_clipboard_stats WHERE date < '2026-09-19';
DELETE FROM daily_clipboard_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_clipboard_stats (date, platform, clipboard_mode, count)
SELECT 'TOTAL', platform, clipboard_mode, SUM(count) FROM daily_clipboard_stats WHERE date != 'TOTAL' GROUP BY platform, clipboard_mode;

-- 7. daily_export_stats：删 9/19 前 + 重建 TOTAL（platform, export_format）
DELETE FROM daily_export_stats WHERE date < '2026-09-19';
DELETE FROM daily_export_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, count)
SELECT 'TOTAL', platform, export_format, SUM(count) FROM daily_export_stats WHERE date != 'TOTAL' GROUP BY platform, export_format;

-- 8. daily_visitor_hashes：无 TOTAL 行，直接删 9/19 前（当日去重哈希，历史无意义）
DELETE FROM daily_visitor_hashes WHERE date < '2026-09-19';
