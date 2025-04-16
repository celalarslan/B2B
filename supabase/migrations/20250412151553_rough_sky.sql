/*
  # Performance Metrics System

  1. New Tables
    - performance_metrics: Stores detailed performance data
    - performance_aggregates: View for aggregated insights
    
  2. Security
    - RLS policies for organization isolation
    - Audit logging for performance data
    
  3. Indexes
    - Optimize for time-series queries
    - Support efficient aggregation
*/

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  ai_response_time_ms integer NOT NULL,
  user_response_delay_ms integer,
  total_duration_ms integer,
  success boolean,
  stt_latency_ms integer,
  tts_latency_ms integer,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_latency CHECK (
    ai_response_time_ms >= 0 AND
    (user_response_delay_ms IS NULL OR user_response_delay_ms >= 0) AND
    (total_duration_ms IS NULL OR total_duration_ms >= 0) AND
    (stt_latency_ms IS NULL OR stt_latency_ms >= 0) AND
    (tts_latency_ms IS NULL OR tts_latency_ms >= 0)
  )
);

-- Create indexes
CREATE INDEX idx_perf_metrics_conversation ON performance_metrics(conversation_id);
CREATE INDEX idx_perf_metrics_organization ON performance_metrics(organization_id);
CREATE INDEX idx_perf_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_perf_metrics_success ON performance_metrics(success);
CREATE INDEX idx_perf_metrics_ai_response_time ON performance_metrics(ai_response_time_ms);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization isolation for performance metrics"
  ON performance_metrics
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

-- Create performance_insights view
CREATE OR REPLACE VIEW performance_insights AS
WITH daily_metrics AS (
  SELECT
    organization_id,
    date_trunc('day', timestamp) AS day,
    COUNT(*) AS total_interactions,
    AVG(ai_response_time_ms) AS avg_ai_response_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ai_response_time_ms) AS median_ai_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ai_response_time_ms) AS p95_ai_response_time,
    MAX(ai_response_time_ms) AS max_ai_response_time,
    AVG(user_response_delay_ms) AS avg_user_delay,
    AVG(total_duration_ms) AS avg_duration,
    SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate,
    AVG(stt_latency_ms) AS avg_stt_latency,
    AVG(tts_latency_ms) AS avg_tts_latency
  FROM performance_metrics
  GROUP BY organization_id, date_trunc('day', timestamp)
),
sector_metrics AS (
  SELECT
    pm.organization_id,
    c.sector_code,
    COUNT(*) AS total_interactions,
    AVG(pm.ai_response_time_ms) AS avg_ai_response_time,
    SUM(CASE WHEN pm.success = true THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate
  FROM performance_metrics pm
  JOIN conversations conv ON pm.conversation_id = conv.id
  JOIN organizations c ON pm.organization_id = c.id
  GROUP BY pm.organization_id, c.sector_code
),
language_metrics AS (
  SELECT
    pm.organization_id,
    conv.language,
    COUNT(*) AS total_interactions,
    AVG(pm.ai_response_time_ms) AS avg_ai_response_time,
    SUM(CASE WHEN pm.success = true THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate
  FROM performance_metrics pm
  JOIN conversations conv ON pm.conversation_id = conv.id
  WHERE conv.language IS NOT NULL
  GROUP BY pm.organization_id, conv.language
)
SELECT
  'daily' AS metric_type,
  organization_id,
  day AS dimension,
  total_interactions,
  avg_ai_response_time,
  median_ai_response_time,
  p95_ai_response_time,
  max_ai_response_time,
  avg_user_delay,
  avg_duration,
  success_rate,
  avg_stt_latency,
  avg_tts_latency,
  NULL AS sector_code,
  NULL AS language
FROM daily_metrics

UNION ALL

SELECT
  'sector' AS metric_type,
  organization_id,
  NULL AS day,
  total_interactions,
  avg_ai_response_time,
  NULL AS median_ai_response_time,
  NULL AS p95_ai_response_time,
  NULL AS max_ai_response_time,
  NULL AS avg_user_delay,
  NULL AS avg_duration,
  success_rate,
  NULL AS avg_stt_latency,
  NULL AS avg_tts_latency,
  sector_code,
  NULL AS language
FROM sector_metrics

UNION ALL

SELECT
  'language' AS metric_type,
  organization_id,
  NULL AS day,
  total_interactions,
  avg_ai_response_time,
  NULL AS median_ai_response_time,
  NULL AS p95_ai_response_time,
  NULL AS max_ai_response_time,
  NULL AS avg_user_delay,
  NULL AS avg_duration,
  success_rate,
  NULL AS avg_stt_latency,
  NULL AS avg_tts_latency,
  NULL AS sector_code,
  language
FROM language_metrics;

-- Create function to log performance metrics
CREATE OR REPLACE FUNCTION log_performance_metric(
  p_conversation_id uuid,
  p_organization_id uuid,
  p_ai_response_time_ms integer,
  p_user_response_delay_ms integer DEFAULT NULL,
  p_total_duration_ms integer DEFAULT NULL,
  p_success boolean DEFAULT NULL,
  p_stt_latency_ms integer DEFAULT NULL,
  p_tts_latency_ms integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO performance_metrics (
    conversation_id,
    organization_id,
    ai_response_time_ms,
    user_response_delay_ms,
    total_duration_ms,
    success,
    stt_latency_ms,
    tts_latency_ms,
    metadata
  ) VALUES (
    p_conversation_id,
    p_organization_id,
    p_ai_response_time_ms,
    p_user_response_delay_ms,
    p_total_duration_ms,
    p_success,
    p_stt_latency_ms,
    p_tts_latency_ms,
    p_metadata
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get performance stats
CREATE OR REPLACE FUNCTION get_performance_stats(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  metric_name text,
  current_value numeric,
  previous_value numeric,
  change_percentage numeric
) AS $$
DECLARE
  v_current_start timestamptz;
  v_current_end timestamptz;
  v_previous_start timestamptz;
  v_previous_end timestamptz;
BEGIN
  -- Set time periods
  v_current_end := now();
  v_current_start := v_current_end - (p_days || ' days')::interval;
  v_previous_end := v_current_start;
  v_previous_start := v_previous_end - (p_days || ' days')::interval;

  RETURN QUERY
  WITH current_period AS (
    SELECT
      AVG(ai_response_time_ms) AS avg_response_time,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ai_response_time_ms) AS p95_response_time,
      AVG(user_response_delay_ms) AS avg_user_delay,
      AVG(total_duration_ms) AS avg_duration,
      SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate
    FROM performance_metrics
    WHERE organization_id = p_organization_id
      AND timestamp BETWEEN v_current_start AND v_current_end
  ),
  previous_period AS (
    SELECT
      AVG(ai_response_time_ms) AS avg_response_time,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ai_response_time_ms) AS p95_response_time,
      AVG(user_response_delay_ms) AS avg_user_delay,
      AVG(total_duration_ms) AS avg_duration,
      SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate
    FROM performance_metrics
    WHERE organization_id = p_organization_id
      AND timestamp BETWEEN v_previous_start AND v_previous_end
  )
  SELECT
    metric_name,
    current_value,
    previous_value,
    CASE
      WHEN previous_value = 0 THEN NULL
      ELSE ((current_value - previous_value) / previous_value) * 100
    END AS change_percentage
  FROM (
    SELECT 'avg_response_time' AS metric_name, 
           cp.avg_response_time AS current_value, 
           pp.avg_response_time AS previous_value
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'p95_response_time', 
           cp.p95_response_time, 
           pp.p95_response_time
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'avg_user_delay', 
           cp.avg_user_delay, 
           pp.avg_user_delay
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'avg_duration', 
           cp.avg_duration, 
           pp.avg_duration
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'success_rate', 
           cp.success_rate * 100, 
           pp.success_rate * 100
    FROM current_period cp, previous_period pp
  ) AS metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE performance_metrics IS 'Stores detailed performance metrics for AI interactions';
COMMENT ON VIEW performance_insights IS 'Aggregated performance metrics for analysis';
COMMENT ON FUNCTION log_performance_metric IS 'Logs a performance metric entry with validation';
COMMENT ON FUNCTION get_performance_stats IS 'Calculates performance statistics with period comparison';