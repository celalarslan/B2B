/*
  # Security and Maintenance System Implementation

  1. New Tables
    - rate_limits: For rate limiting functionality
    - maintenance_logs: For tracking maintenance operations
    - support_requests: For storing support requests
    - email_logs: For tracking email sending
    - security_events: For logging security events

  2. Functions
    - check_rate_limit: Function to check rate limits
    - cleanup_expired_rate_limits: Function to clean up expired rate limits
    - log_security_event: Function to log security events
    - validate_csrf_token: Function to validate CSRF tokens
    - check_auth_rate_limit: Function to check auth rate limits
    - update_support_request_status: Function to update support request status
    - get_trend_data_cached: Optimized function for trend data retrieval
    - get_usage_stats_cached: Optimized function for usage statistics
    - refresh_materialized_views: Function to refresh materialized views
    - analyze_slow_queries: Function to identify slow queries
    - cleanup_old_usage_events: Function to clean up old usage events
*/

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

-- Create index for expiration
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at 
ON rate_limits(expires_at);

-- Create maintenance_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for maintenance_logs
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_operation ON maintenance_logs(operation);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created_at ON maintenance_logs(created_at DESC);

-- Create support_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  country text,
  company text,
  issue text NOT NULL,
  transcript text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'ai_assistant',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_status CHECK (status IN ('new', 'in_progress', 'resolved', 'closed'))
);

-- Create email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create security_events table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON support_requests(email);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Enable RLS
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with proper error handling
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid errors
  DROP POLICY IF EXISTS "Only admins can view maintenance logs" ON maintenance_logs;
  DROP POLICY IF EXISTS "Users can view their own support requests" ON support_requests;
  DROP POLICY IF EXISTS "Support staff can view all support requests" ON support_requests;
  DROP POLICY IF EXISTS "Support staff can view email logs" ON email_logs;
EXCEPTION
  WHEN undefined_object THEN
    -- Do nothing if policies don't exist
    NULL;
END $$;

-- Create new policies
CREATE POLICY "Only admins can view maintenance logs"
  ON maintenance_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

CREATE POLICY "Users can view their own support requests"
  ON support_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Support staff can view all support requests"
  ON support_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

CREATE POLICY "Support staff can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

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

-- Create function to update support request status
CREATE OR REPLACE FUNCTION update_support_request_status(
  p_request_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('new', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update the support request
  UPDATE support_requests
  SET 
    status = p_status,
    resolved_at = CASE WHEN p_status IN ('resolved', 'closed') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_request_id;

  -- Log the status change
  INSERT INTO maintenance_logs (
    operation,
    details,
    executed_by
  ) VALUES (
    'support_request_status_change',
    jsonb_build_object(
      'request_id', p_request_id,
      'new_status', p_status,
      'notes', p_notes
    ),
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get trend data with optimized query
CREATE OR REPLACE FUNCTION get_trend_data_cached(
  p_organization_id uuid,
  p_trend_type text DEFAULT 'daily',
  p_limit integer DEFAULT 90,
  p_category text DEFAULT NULL
)
RETURNS SETOF trend_insights
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if materialized view exists and is fresh
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE matviewname = 'trend_insights_materialized'
    AND last_refresh > now() - interval '1 hour'
  ) THEN
    -- Use materialized view for better performance
    RETURN QUERY
    SELECT *
    FROM trend_insights_materialized
    WHERE organization_id = p_organization_id
      AND trend_type = p_trend_type
      AND (p_category IS NULL OR category = p_category)
    ORDER BY dimension DESC
    LIMIT p_limit;
  ELSE
    -- Fall back to the regular view if materialized view is stale
    RETURN QUERY
    SELECT *
    FROM trend_insights
    WHERE organization_id = p_organization_id
      AND trend_type = p_trend_type
      AND (p_category IS NULL OR category = p_category)
    ORDER BY dimension DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- Create function to get usage statistics with optimized query
CREATE OR REPLACE FUNCTION get_usage_stats_cached(
  p_organization_id uuid,
  p_time_range text DEFAULT '30d'
)
RETURNS SETOF usage_statistics
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if materialized view exists and is fresh
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE matviewname = 'usage_statistics_materialized'
    AND last_refresh > now() - interval '1 hour'
  ) THEN
    -- Use materialized view for better performance
    RETURN QUERY
    SELECT *
    FROM usage_statistics_materialized
    WHERE organization_id = p_organization_id;
  ELSE
    -- Fall back to the regular view if materialized view is stale
    RETURN QUERY
    SELECT *
    FROM usage_statistics
    WHERE organization_id = p_organization_id;
  END IF;
END;
$$;

-- Create function to refresh materialized views with proper locking
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_acquired boolean;
BEGIN
  -- Try to acquire advisory lock to prevent concurrent refreshes
  SELECT pg_try_advisory_lock(hashtext('refresh_materialized_views')) INTO v_lock_acquired;
  
  IF v_lock_acquired THEN
    BEGIN
      -- Refresh trend insights materialized view
      IF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'trend_insights_materialized'
      ) THEN
        REFRESH MATERIALIZED VIEW trend_insights_materialized;
      END IF;
      
      -- Refresh usage statistics materialized view
      IF EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'usage_statistics_materialized'
      ) THEN
        REFRESH MATERIALIZED VIEW usage_statistics_materialized;
      END IF;
      
      -- Log successful refresh
      INSERT INTO maintenance_logs (operation, details)
      VALUES (
        'refresh_materialized_views',
        jsonb_build_object(
          'status', 'success',
          'timestamp', now()
        )
      );
      
      -- Release lock
      PERFORM pg_advisory_unlock(hashtext('refresh_materialized_views'));
    EXCEPTION WHEN OTHERS THEN
      -- Log error
      INSERT INTO maintenance_logs (operation, details)
      VALUES (
        'refresh_materialized_views',
        jsonb_build_object(
          'status', 'error',
          'error', SQLERRM,
          'timestamp', now()
        )
      );
      
      -- Release lock
      PERFORM pg_advisory_unlock(hashtext('refresh_materialized_views'));
      RAISE;
    END;
  END IF;
END;
$$;

-- Create function to analyze slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries(
  p_min_execution_time_ms integer DEFAULT 1000,
  p_days integer DEFAULT 1
)
RETURNS TABLE (
  operation_name text,
  avg_duration_ms numeric,
  max_duration_ms numeric,
  call_count bigint,
  last_called timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.metadata->>'operation_name' AS operation_name,
    AVG(pm.ai_response_time_ms)::numeric AS avg_duration_ms,
    MAX(pm.ai_response_time_ms)::numeric AS max_duration_ms,
    COUNT(*)::bigint AS call_count,
    MAX(pm.timestamp) AS last_called
  FROM performance_metrics pm
  WHERE pm.timestamp > now() - (p_days || ' days')::interval
    AND pm.ai_response_time_ms >= p_min_execution_time_ms
    AND pm.metadata->>'operation_name' IS NOT NULL
  GROUP BY pm.metadata->>'operation_name'
  ORDER BY avg_duration_ms DESC;
END;
$$;

-- Create function to clean up old usage events
CREATE OR REPLACE FUNCTION cleanup_old_usage_events(p_days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM usage_events
  WHERE created_at < (CURRENT_DATE - p_days_to_keep * INTERVAL '1 day')
  RETURNING COUNT(*) INTO v_deleted_count;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE rate_limits IS 'Stores rate limiting information for API endpoints and actions';
COMMENT ON TABLE maintenance_logs IS 'Tracks database maintenance operations and cleanup tasks';
COMMENT ON TABLE support_requests IS 'Stores support requests from users via AI assistant and other channels';
COMMENT ON TABLE email_logs IS 'Tracks emails sent by the system for auditing and troubleshooting';
COMMENT ON TABLE security_events IS 'Logs security-related events for auditing and monitoring';

COMMENT ON FUNCTION check_rate_limit IS 'Checks if a request should be rate limited';
COMMENT ON FUNCTION cleanup_expired_rate_limits IS 'Removes expired rate limit records';
COMMENT ON FUNCTION log_security_event IS 'Logs a security event with context information';
COMMENT ON FUNCTION validate_csrf_token IS 'Validates a CSRF token against a stored token';
COMMENT ON FUNCTION check_auth_rate_limit IS 'Checks rate limits for authentication operations';
COMMENT ON FUNCTION update_support_request_status IS 'Updates the status of a support request and logs the change';
COMMENT ON FUNCTION get_trend_data_cached IS 'Retrieves trend data with caching for better performance';
COMMENT ON FUNCTION get_usage_stats_cached IS 'Retrieves usage statistics with caching for better performance';
COMMENT ON FUNCTION refresh_materialized_views IS 'Refreshes materialized views with proper locking';
COMMENT ON FUNCTION analyze_slow_queries IS 'Identifies slow queries for performance tuning';
COMMENT ON FUNCTION cleanup_old_usage_events IS 'Deletes usage events older than the specified number of days';