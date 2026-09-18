-- Migration 0008: Security Rate Limits (Cross-Isolate Abuse Control)
-- Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9
--
-- PRIVACY GUARANTEE:
-- No raw IP addresses, cookies, or user identifiers are EVER stored.
-- Keys are short-lived, one-way truncated SHA-256 hashes with salt.
-- Entries are ephemeral and pruned periodically.
-- Used strictly for security rate limiting; not part of public analytics or insights.

CREATE TABLE IF NOT EXISTS security_rate_limits (
  key TEXT NOT NULL PRIMARY KEY,   -- one-way hashed key: hash(scope, bucket, ip, salt)
  count INTEGER NOT NULL DEFAULT 1,
  reset_at INTEGER NOT NULL        -- unix timestamp in seconds
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limits_reset_at ON security_rate_limits (reset_at);