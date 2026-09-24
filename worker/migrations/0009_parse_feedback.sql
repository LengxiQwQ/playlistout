-- Migration 0009: Parse Failure Feedback Collection
--
-- Stores user-submitted feedback for playlist URLs that failed to parse.
-- Users opt in by clicking "一键反馈" on error cards; the URL is explicitly
-- transmitted to the maintainer for diagnosis and repair.
--
-- PRIVACY:
-- No IP addresses, user agents, cookies, or user identifiers are stored.
-- Only the submitted URL, error code, platform hint, and timestamps are kept.
-- Feedback data is exposed ONLY through the token-authenticated internal endpoint.

CREATE TABLE IF NOT EXISTS parse_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  error_code TEXT NOT NULL,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  report_count INTEGER NOT NULL DEFAULT 1,
  first_reported_at TEXT NOT NULL,
  last_reported_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON parse_feedback (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_url_error ON parse_feedback (url, error_code);
