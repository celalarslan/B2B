/*
  # Performance Optimization Migration

  1. New Indexes
    - Add indexes to high-read tables for better query performance
    - Optimize common query patterns
    - Support efficient filtering and sorting
    
  2. RLS Optimization
    - Simplify RLS policies using EXISTS instead of IN with subqueries
    - Improve query execution plans
    
  3. Maintenance
    - Add function to clean up old usage events
    - Set up automated data retention
*/

-- Add indexes to performance_metrics table
CREATE INDEX IF NOT EXISTS idx_perf_metrics_org_created_at 
ON performance_metrics(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_org_timestamp 
ON performance_metrics(organization_id, timestamp);

-- Add indexes to usage_events table
CREATE INDEX IF NOT EXISTS idx_usage_events_user_org 
ON usage_events(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_timestamp 
ON usage_events(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_usage_events_type_timestamp 
ON usage_events(event_type, created_at);

-- Optimize RLS policies using EXISTS instead of IN with subqueries

-- Update performance_metrics RLS policy
DROP POLICY IF EXISTS "Organization isolation for performance metrics" ON performance_metrics;

CREATE POLICY "Organization isolation for performance metrics"
  ON performance_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND o.id = performance_metrics.organization_id
    )
  );

-- Update usage_events RLS policy
DROP POLICY IF EXISTS "Organization isolation for usage events" ON usage_events;

CREATE POLICY "Organization isolation for usage events"
  ON usage_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
      AND o.id = usage_events.organization_id
    )
  );

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

-- Create specialized performance metric logging functions

-- Function for API call metrics
CREATE OR REPLACE FUNCTION log_api_call_metric(
  p_organization_id uuid,
  p_endpoint text,
  p_duration_ms integer,
  p_status_code integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  -- Validate organization_id
  IF p_organization_id IS NULL OR p_organization_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'Invalid organization_id';
  END IF;

  -- Insert metric
  INSERT INTO performance_metrics (
    organization_id,
    ai_response_time_ms,
    success,
    metadata,
    timestamp
  ) VALUES (
    p_organization_id,
    p_duration_ms,
    p_status_code BETWEEN 200 AND 299,
    jsonb_build_object(
      'metric_type', 'api_call',
      'endpoint', p_endpoint,
      'status_code', p_status_code,
      'custom_data', p_metadata
    ),
    now()
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for audio processing metrics
CREATE OR REPLACE FUNCTION log_audio_latency_metric(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_stt_latency_ms integer,
  p_tts_latency_ms integer,
  p_total_duration_ms integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  -- Validate organization_id
  IF p_organization_id IS NULL OR p_organization_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'Invalid organization_id';
  END IF;

  -- Insert metric
  INSERT INTO performance_metrics (
    organization_id,
    conversation_id,
    stt_latency_ms,
    tts_latency_ms,
    total_duration_ms,
    success,
    metadata,
    timestamp
  ) VALUES (
    p_organization_id,
    p_conversation_id,
    p_stt_latency_ms,
    p_tts_latency_ms,
    p_total_duration_ms,
    true,
    jsonb_build_object(
      'metric_type', 'audio_processing',
      'custom_data', p_metadata
    ),
    now()
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for UI component metrics
CREATE OR REPLACE FUNCTION log_ui_performance_metric(
  p_organization_id uuid,
  p_component_name text,
  p_render_time_ms integer,
  p_interaction_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  -- Validate organization_id
  IF p_organization_id IS NULL OR p_organization_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'Invalid organization_id';
  END IF;

  -- Insert metric
  INSERT INTO performance_metrics (
    organization_id,
    ai_response_time_ms,
    success,
    metadata,
    timestamp
  ) VALUES (
    p_organization_id,
    p_render_time_ms,
    true,
    jsonb_build_object(
      'metric_type', 'ui_performance',
      'component_name', p_component_name,
      'interaction_type', p_interaction_type,
      'custom_data', p_metadata
    ),
    now()
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION cleanup_old_usage_events IS 'Deletes usage events older than the specified number of days';
COMMENT ON FUNCTION log_api_call_metric IS 'Logs API call performance metrics';
COMMENT ON FUNCTION log_audio_latency_metric IS 'Logs audio processing latency metrics';
COMMENT ON FUNCTION log_ui_performance_metric IS 'Logs UI component performance metrics';