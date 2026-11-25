-- Replace the constrained columns in place to preserve booking foreign keys.
DROP INDEX trip_requests_email_created;
ALTER TABLE trip_requests RENAME COLUMN email TO legacy_email;
ALTER TABLE trip_requests ADD COLUMN email TEXT COLLATE NOCASE;
ALTER TABLE trip_requests RENAME COLUMN email_status TO legacy_email_status;
ALTER TABLE trip_requests ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_requested'
  CHECK (email_status IN ('not_requested','pending','sending','accepted','failed','unconfigured','review_required','simulated'));
UPDATE trip_requests SET email = legacy_email, email_status = legacy_email_status;
ALTER TABLE trip_requests DROP COLUMN legacy_email;
ALTER TABLE trip_requests DROP COLUMN legacy_email_status;
CREATE INDEX trip_requests_email_created ON trip_requests(email, created_at);
