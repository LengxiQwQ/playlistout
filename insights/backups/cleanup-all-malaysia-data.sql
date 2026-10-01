-- PlaylistOut D1 数据彻底清理：全量清除所有来自马来西亚（MY）的记录（访问与解析），并重建 TOTAL 累计行
-- 执行前已完整备份：
--   insights/backups/d1-playlistout-stats-backup-2026-10-01-pre-full-cleanup.sql

-- 1. daily_geo_stats：全量删除国家代码为 MY 的所有记录（包括各平台解析以及 platform='all' 的访问上线）
DELETE FROM daily_geo_stats WHERE country = 'MY';

-- 2. daily_geo_stats：重建累计统计行（date = 'TOTAL'），重新由所有非 TOTAL 记录聚合计算
DELETE FROM daily_geo_stats WHERE date = 'TOTAL';

INSERT OR REPLACE INTO daily_geo_stats (date, platform, country, region, city, count)
SELECT 'TOTAL', platform, country, region, city, SUM(count)
FROM daily_geo_stats
WHERE date != 'TOTAL'
GROUP BY platform, country, region, city;
