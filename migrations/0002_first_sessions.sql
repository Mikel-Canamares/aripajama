-- Existing requests and their prepared emails are deliberately left untouched.
ALTER TABLE trip_requests ADD COLUMN booking_reference TEXT;
CREATE UNIQUE INDEX trip_requests_booking_reference ON trip_requests(booking_reference);

CREATE TABLE session_bookings (
  uid TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES trip_requests(id),
  booking_status TEXT NOT NULL CHECK (booking_status IN ('unknown','pending','confirmed','cancelled')),
  booking_at INTEGER NOT NULL,
  appointment_json TEXT,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unknown','pending','confirmed','failed')),
  payment_at INTEGER NOT NULL,
  payment_id TEXT UNIQUE,
  amount_cents INTEGER CHECK (amount_cents IS NULL OR (typeof(amount_cents) = 'integer' AND amount_cents >= 0)),
  currency TEXT,
  review_required INTEGER NOT NULL DEFAULT 0 CHECK (review_required IN (0,1)),
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX session_bookings_request ON session_bookings(request_id);

CREATE TABLE session_events (
  event_key TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  booking_uid TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received','applying','processed','ignored','incident')),
  incident_code TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE session_notifications (
  booking_uid TEXT PRIMARY KEY REFERENCES session_bookings(uid),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','accepted','failed','unconfigured','review_required','simulated','suppressed')),
  email_key TEXT NOT NULL UNIQUE,
  payload_json TEXT,
  payload_revision TEXT,
  first_attempt_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,
  lease_token TEXT,
  lease_until INTEGER,
  resend_id TEXT,
  error_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX session_notifications_due ON session_notifications(status, next_retry_at, lease_until);
