/*
  # Add Rate Limiting Table

  1. New Table
    - rate_limits: Stores rate limiting information
      - key (text, primary key): Unique identifier for the rate limit
      - count (integer): Number of requests made
      - updated_at (timestamptz): Last update time
      - expires_at (timestamptz): When the rate limit expires
  
  2. Security
    - No RLS policies (only accessible via service role)
    - Automatic cleanup of expired records
*/

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Create index for expiration
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at 
ON rate_limits(expires_at);

-- Create function to clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS integer AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM rate_limits
  WHERE expires_at < now()
  RETURNING COUNT(*) INTO v_deleted_count;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean AS $$
DECLARE
  v_count integer;
  v_updated_at timestamptz;
  v_now timestamptz := now();
BEGIN
  -- Get current count
  SELECT count, updated_at INTO v_count, v_updated_at
  FROM rate_limits
  WHERE key = p_key;
  
  -- If no record or window has expired, create/reset record
  IF v_count IS NULL OR (v_now - v_updated_at) > (p_window_seconds * interval '1 second') THEN
    INSERT INTO rate_limits (key, count, updated_at, expires_at)
    VALUES (p_key, 1, v_now, v_now + (p_window_seconds * interval '1 second'))
    ON CONFLICT (key)
    DO UPDATE SET
      count = 1,
      updated_at = v_now,
      expires_at = v_now + (p_window_seconds * interval '1 second');
    
    RETURN true;
  END IF;
  
  -- If limit exceeded
  IF v_count >= p_limit THEN
    RETURN false;
  END IF;
  
  -- Increment count
  UPDATE rate_limits
  SET 
    count = count + 1,
    updated_at = v_now
  WHERE key = p_key;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE rate_limits IS 'Stores rate limiting information for API endpoints and actions';
COMMENT ON FUNCTION cleanup_expired_rate_limits IS 'Removes expired rate limit records';
COMMENT ON FUNCTION check_rate_limit IS 'Checks if a request should be rate limited';