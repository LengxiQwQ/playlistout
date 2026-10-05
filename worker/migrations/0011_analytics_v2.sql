-- Analytics V2 schema
-- Adds source-aware aggregate facts without TOTAL/all sentinel rows.
-- V1 tables remain untouched for rollback and reconciliation.

CREATE TABLE IF NOT EXISTS analytics_v2_daily_core (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_version TEXT NOT NULL DEFAULT 'unknown',
  host_platform TEXT NOT NULL DEFAULT 'unknown',
  trust_class TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  platform TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UNKNOWN',
  region TEXT NOT NULL DEFAULT 'UNKNOWN',
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  value_sum INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (
    date, channel, client_id, client_version, host_platform, trust_class,
    endpoint, platform, country, region, metric
  )
);

CREATE TABLE IF NOT EXISTS analytics_v2_hourly_core (
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_version TEXT NOT NULL DEFAULT 'unknown',
  host_platform TEXT NOT NULL DEFAULT 'unknown',
  trust_class TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  platform TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UNKNOWN',
  region TEXT NOT NULL DEFAULT 'UNKNOWN',
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  value_sum INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (
    date, hour, channel, client_id, client_version, host_platform, trust_class,
    endpoint, platform, country, region, metric
  )
);

CREATE TABLE IF NOT EXISTS analytics_v2_daily_dimensions (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_version TEXT NOT NULL DEFAULT 'unknown',
  host_platform TEXT NOT NULL DEFAULT 'unknown',
  trust_class TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  platform TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UNKNOWN',
  region TEXT NOT NULL DEFAULT 'UNKNOWN',
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (
    date, channel, client_id, client_version, host_platform, trust_class,
    endpoint, platform, country, region, dimension, value
  )
);

CREATE TABLE IF NOT EXISTS analytics_v2_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_v2_daily_date ON analytics_v2_daily_core (date);
CREATE INDEX IF NOT EXISTS idx_v2_daily_metric ON analytics_v2_daily_core (metric, date);
CREATE INDEX IF NOT EXISTS idx_v2_daily_filters ON analytics_v2_daily_core (date, channel, client_id, platform, country, region);
CREATE INDEX IF NOT EXISTS idx_v2_hourly_date ON analytics_v2_hourly_core (date, hour);
CREATE INDEX IF NOT EXISTS idx_v2_hourly_filters ON analytics_v2_hourly_core (date, channel, client_id, platform, country, region);
CREATE INDEX IF NOT EXISTS idx_v2_dimension_date ON analytics_v2_daily_dimensions (date);
CREATE INDEX IF NOT EXISTS idx_v2_dimension_lookup ON analytics_v2_daily_dimensions (dimension, value, date);
CREATE INDEX IF NOT EXISTS idx_v2_dimension_filters ON analytics_v2_daily_dimensions (date, channel, client_id, platform, country, region);

INSERT OR REPLACE INTO analytics_v2_meta (key, value) VALUES ('schema_version', '2');
INSERT OR REPLACE INTO analytics_v2_meta (key, value) VALUES ('historical_backfill_status', 'pending');
