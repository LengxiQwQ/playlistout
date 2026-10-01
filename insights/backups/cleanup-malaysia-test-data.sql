-- PlaylistOut D1 数据清理：删除最近 3 天（2026-09-29、2026-09-30、2026-10-01）来自马来西亚（MY）的测试解析与访问记录
-- 执行前已完整备份远端数据库：
--   insights/backups/d1-playlistout-stats-backup-2026-10-01-pre-cleanup.sql
-- 幂等：可安全重复执行（DELETE 与 INSERT OR REPLACE）。
-- 注意：D1 不接受显式 BEGIN/COMMIT；wrangler 文件执行按批次原子提交。

-- 1. daily_geo_stats：删除 2026-09-29 至 2026-10-01 期间所有国家代码为 MY 的测试解析与访问记录
DELETE FROM daily_geo_stats
WHERE country = 'MY'
  AND date IN ('2026-09-29', '2026-09-30', '2026-10-01');

-- 2. daily_geo_stats：重建累计统计行（date = 'TOTAL'），重新由所有非 TOTAL 记录聚合计算
DELETE FROM daily_geo_stats WHERE date = 'TOTAL';

INSERT OR REPLACE INTO daily_geo_stats (date, platform, country, region, city, count)
SELECT 'TOTAL', platform, country, region, city, SUM(count)
FROM daily_geo_stats
WHERE date != 'TOTAL'
GROUP BY platform, country, region, city;
