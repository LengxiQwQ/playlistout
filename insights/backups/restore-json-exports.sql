INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-19', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 3);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-21', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-22', 'kugou', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-22', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-23', 'qishui', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 2);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-23', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-24', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 6);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-24', 'netease', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 2);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-27', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 2);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-28', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-28', 'kugou', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-29', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 3);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-29', 'netease', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 6);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-30', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 6);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-09-30', 'netease', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 3);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-10-01', 'qqmusic', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 4);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-10-01', 'netease', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 1);
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count) VALUES ('2026-10-01', 'qishui', 'json', 'UNKNOWN', 'UNKNOWN', 'UNKNOWN', 3);

-- Rebuild TOTAL in daily_export_stats
DELETE FROM daily_export_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_export_stats (date, platform, export_format, country, region, city, count)
SELECT 'TOTAL', platform, export_format, country, region, city, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY platform, export_format, country, region, city;

-- Rebuild daily_performance_stats for export_format
DELETE FROM daily_performance_stats WHERE dimension = 'export_format';
INSERT OR REPLACE INTO daily_performance_stats (date, platform, dimension, value, count)
SELECT date, platform, 'export_format', export_format, SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY date, platform, export_format;

DELETE FROM daily_performance_stats WHERE date = 'TOTAL';
INSERT OR REPLACE INTO daily_performance_stats (date, platform, dimension, value, count)
SELECT 'TOTAL', platform, dimension, value, SUM(count)
FROM daily_performance_stats
WHERE date != 'TOTAL'
GROUP BY platform, dimension, value;

-- Rebuild aggregate_stats for exports_total
DELETE FROM aggregate_stats WHERE metric = 'exports_total';
INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, platform, 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY date, platform;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT date, 'all', 'exports_total', SUM(count)
FROM daily_export_stats
WHERE date != 'TOTAL'
GROUP BY date;

INSERT OR REPLACE INTO aggregate_stats (date, platform, metric, count)
SELECT 'TOTAL', platform, 'exports_total', SUM(count)
FROM aggregate_stats
WHERE metric = 'exports_total' AND date != 'TOTAL'
GROUP BY platform;
