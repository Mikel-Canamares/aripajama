CREATE TABLE IF NOT EXISTS trip_requests (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  retry_token_hash TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  answers_json TEXT NOT NULL,
  details_json TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending','sending','accepted','failed','unconfigured','review_required','simulated')),
  email_payload_json TEXT,
  email_key TEXT NOT NULL UNIQUE,
  resend_id TEXT,
  email_error_code TEXT,
  first_attempt_at INTEGER,
  lease_until INTEGER,
  lease_token TEXT,
  next_retry_at INTEGER,
  email_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS trip_requests_email_created ON trip_requests(email, created_at);
