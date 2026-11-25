UPDATE trip_requests SET booking_reference = lower(hex(randomblob(32))) WHERE booking_reference IS NULL;

-- Delivery ledger only. The booking and its lifecycle belong to Cal.com.
CREATE TABLE cal_notification_emails (
  booking_uid TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES trip_requests(id),
  payload_json TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','sending','accepted','simulated','review_required')),
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER,
  due_at INTEGER NOT NULL,
  lease_token TEXT,
  resend_id TEXT
);
CREATE INDEX cal_notification_due ON cal_notification_emails(status, due_at);
