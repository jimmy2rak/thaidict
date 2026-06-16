-- OTP codes table for email verification
-- Used for login verification and password reset via Brevo

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('login', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

-- RLS policy: only Edge Functions can access (using service role key)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Rate limiting function: check if OTP was sent in last 60 seconds
CREATE OR REPLACE FUNCTION check_otp_rate_limit(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM otp_codes
    WHERE email = p_email
    AND created_at > NOW() - INTERVAL '60 seconds'
  );
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup function: delete expired OTPs (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;
