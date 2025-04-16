/*
  # Security Functions and Improvements

  1. New Functions
    - validate_csrf_token: Validates CSRF tokens
    - check_auth_rate_limit: Checks rate limits for auth operations
    - log_security_event: Logs security-related events
    
  2. Security Improvements
    - Add rate limiting for sensitive operations
    - Add CSRF protection for state-changing operations
    - Add security event logging
*/

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ip_address inet,
  user_agent text,
  request_data jsonb,
  severity text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type 
ON security_events(event_type);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id 
ON security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_security_events_created_at 
ON security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_severity 
ON security_events(severity);

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_request_data jsonb,
  p_severity text DEFAULT 'info'
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    ip_address,
    user_agent,
    request_data,
    severity
  ) VALUES (
    p_user_id,
    p_event_type,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    p_request_data,
    p_severity
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate CSRF token
CREATE OR REPLACE FUNCTION validate_csrf_token(
  p_token text,
  p_stored_token text
)
RETURNS boolean AS $$
BEGIN
  -- Simple equality check for now
  -- In a real implementation, you might want to use a more secure comparison
  RETURN p_token = p_stored_token;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check auth rate limit
CREATE OR REPLACE FUNCTION check_auth_rate_limit(
  p_identifier text,
  p_action text DEFAULT 'login'
)
RETURNS boolean AS $$
DECLARE
  v_limit integer;
  v_window_seconds integer;
  v_key text;
BEGIN
  -- Set limits based on action
  CASE p_action
    WHEN 'login' THEN
      v_limit := 5;
      v_window_seconds := 300; -- 5 minutes
    WHEN 'signup' THEN
      v_limit := 3;
      v_window_seconds := 3600; -- 1 hour
    WHEN 'reset_password' THEN
      v_limit := 3;
      v_window_seconds := 3600; -- 1 hour
    ELSE
      v_limit := 10;
      v_window_seconds := 3600; -- 1 hour
  END CASE;
  
  v_key := 'auth:' || p_action || ':' || p_identifier;
  
  -- Use the generic rate limit function
  RETURN check_rate_limit(v_key, v_limit, v_window_seconds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE security_events IS 'Logs security-related events for auditing and monitoring';
COMMENT ON FUNCTION log_security_event IS 'Logs a security event with context information';
COMMENT ON FUNCTION validate_csrf_token IS 'Validates a CSRF token against a stored token';
COMMENT ON FUNCTION check_auth_rate_limit IS 'Checks rate limits for authentication operations';