-- Migration 0019: Performance and covering indexes for public stats and analytics
--
-- Optimization context:
-- Reduces D1 row scan amplification on public statistics endpoints (GET /api/stats)
-- by providing covering indexes for core metric rollups and breakdown aggregations.
-- Eliminates full-table SCAN on analytics_v2_daily_core and analytics_v2_breakdown.

-- 1. Covering index for multi-metric platform rollup
CREATE INDEX IF NOT EXISTS idx_v2_daily_metric_platform_covering
ON analytics_v2_daily_core (metric, platform, date, count);

-- 2. Covering index for recent daily trend rollup
CREATE INDEX IF NOT EXISTS idx_v2_daily_date_metric_covering
ON analytics_v2_daily_core (date, metric, count);

-- 3. Covering index for export format breakdown aggregations
CREATE INDEX IF NOT EXISTS idx_v2_breakdown_dim_val_covering
ON analytics_v2_breakdown (dimension, value, date, count);
