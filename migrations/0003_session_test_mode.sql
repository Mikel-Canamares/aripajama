-- Explicitly distinguish simulated facts from verified provider payments.
ALTER TABLE session_bookings ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0 CHECK (is_test IN (0,1));
