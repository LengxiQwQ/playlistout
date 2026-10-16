-- Migration 0018: Cross-client Daily Active User deduplication
-- Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9 and DAU-TELEMETRY-PLAN.md
--
-- PRIVACY GUARANTEE:
-- No raw IP addresses, User-Agents, cookies, or user identifiers are EVER stored.
-- Daily active users (plugin / CLI) are deduplicated per UTC day with a one-way,
-- truncated SHA-256 hash of (date + scope + IP + version-stripped UA + salt).
-- The hash cannot be reversed to discover user identities.
--
-- The `scope` column separates channels/client ids (e.g. 'plugin:musicfree',
-- 'cli:official_cli') so the same person on two clients can be counted once per
-- client per day, matching the per-channel DAU metric semantics.

-- 1. Ephemeral daily active hash table for same-day DAU deduplication (7-day retention)
CREATE TABLE IF NOT EXISTS daily_active_hashes (
  date TEXT NOT NULL,         -- 'YYYY-MM-DD' (UTC)
  scope TEXT NOT NULL,        -- 'plugin:musicfree' | 'cli:official_cli' | ...
  hash TEXT NOT NULL,         -- truncated one-way SHA-256 hash (16 chars)
  PRIMARY KEY (date, scope, hash)
);

CREATE INDEX IF NOT EXISTS idx_daily_active_hashes_date ON daily_active_hashes (date);
