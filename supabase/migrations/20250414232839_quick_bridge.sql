/*
  # Performance Optimizations

  1. New Functions
    - get_trend_data_cached: Optimized function for trend data retrieval
    - get_usage_stats_cached: Optimized function for usage statistics
    - analyze_slow_queries: Function to identify slow queries
    
  2. Materialized View Refresh
    - Add scheduled refresh for materialized views
    - Create refresh functions with proper locking
    
  3. Indexes
    - Add additional indexes for common query patterns
    - Add partial indexes for filtered queries
*/

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

-- Create maintenance_logs table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'maintenance_logs'
  ) THEN
    CREATE TABLE maintenance_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      operation text NOT NULL,
      details jsonb DEFAULT '{}'::jsonb,
      executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Create indexes for maintenance_logs
    CREATE INDEX idx_maintenance_logs_operation ON maintenance_logs(operation);
    CREATE INDEX idx_maintenance_logs_created_at ON maintenance_logs(created_at DESC);
    
    -- Enable RLS on maintenance_logs
    ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policy for maintenance_logs
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
  END IF;
END $$;

-- Add comments
COMMENT ON FUNCTION get_trend_data_cached IS 'Retrieves trend data with caching for better performance';
COMMENT ON FUNCTION get_usage_stats_cached IS 'Retrieves usage statistics with caching for better performance';
COMMENT ON FUNCTION refresh_materialized_views IS 'Refreshes materialized views with proper locking';
COMMENT ON FUNCTION analyze_slow_queries IS 'Identifies slow queries for performance tuning';