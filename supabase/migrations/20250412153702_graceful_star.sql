-- Create event_type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM (
      'login',
      'ai_chat',
      'report_view',
      'export_csv',
      'call_playback',
      'nlp_training',
      'settings_update',
      'voice_recording',
      'customer_add',
      'dashboard_view',
      'search',
      'feedback_submit',
      'error'
    );
  END IF;
END $$;

-- Create usage_events table
CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  event_type event_type NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  device_type text,
  language text,
  sector text,
  session_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_organization ON usage_events(organization_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at);
CREATE INDEX idx_usage_events_language ON usage_events(language) WHERE language IS NOT NULL;
CREATE INDEX idx_usage_events_sector ON usage_events(sector) WHERE sector IS NOT NULL;
CREATE INDEX idx_usage_events_device ON usage_events(device_type) WHERE device_type IS NOT NULL;
CREATE INDEX idx_usage_events_session ON usage_events(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization isolation for usage events"
  ON usage_events
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

-- Create usage_statistics view with proper type casting
CREATE OR REPLACE VIEW usage_statistics AS
WITH daily_active_users AS (
  SELECT
    organization_id,
    date_trunc('day', created_at)::date AS day,
    COUNT(DISTINCT user_id) AS dau
  FROM usage_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY organization_id, date_trunc('day', created_at)::date
),
monthly_active_users AS (
  SELECT
    organization_id,
    date_trunc('month', created_at)::date AS month,
    COUNT(DISTINCT user_id) AS mau
  FROM usage_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY organization_id, date_trunc('month', created_at)::date
),
feature_usage AS (
  SELECT
    organization_id,
    event_type,
    date_trunc('day', created_at)::date AS day,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM usage_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY organization_id, event_type, date_trunc('day', created_at)::date
),
hourly_usage AS (
  SELECT
    organization_id,
    EXTRACT(HOUR FROM created_at)::integer AS hour_of_day,
    COUNT(*) AS event_count
  FROM usage_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY organization_id, EXTRACT(HOUR FROM created_at)
),
language_usage AS (
  SELECT
    organization_id,
    language,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM usage_events
  WHERE 
    created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND language IS NOT NULL
  GROUP BY organization_id, language
),
sector_usage AS (
  SELECT
    organization_id,
    sector,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM usage_events
  WHERE 
    created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND sector IS NOT NULL
  GROUP BY organization_id, sector
),
device_usage AS (
  SELECT
    organization_id,
    device_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
  FROM usage_events
  WHERE 
    created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND device_type IS NOT NULL
  GROUP BY organization_id, device_type
),
session_metrics AS (
  SELECT
    organization_id,
    session_id,
    MIN(created_at) AS session_start,
    MAX(created_at) AS session_end,
    COUNT(*) AS events_count,
    user_id
  FROM usage_events
  WHERE 
    created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND session_id IS NOT NULL
  GROUP BY organization_id, session_id, user_id
),
session_duration AS (
  SELECT
    organization_id,
    AVG(EXTRACT(EPOCH FROM (session_end - session_start))) AS avg_session_seconds,
    COUNT(DISTINCT session_id) AS total_sessions,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT session_id)::float / NULLIF(COUNT(DISTINCT user_id), 0) AS sessions_per_user
  FROM session_metrics
  GROUP BY organization_id
),
top_organizations AS (
  SELECT
    organization_id,
    COUNT(*) AS total_events,
    COUNT(DISTINCT user_id) AS total_users,
    COUNT(DISTINCT date_trunc('day', created_at)) AS active_days
  FROM usage_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY organization_id
  ORDER BY total_events DESC
  LIMIT 5
)
SELECT
  'daily_active_users' AS metric_type,
  organization_id,
  day::text AS date_dimension,
  NULL::integer AS hour_dimension,
  NULL::text AS string_dimension,
  dau::bigint AS metric_value,
  NULL::bigint AS secondary_value
FROM daily_active_users

UNION ALL

SELECT
  'monthly_active_users' AS metric_type,
  organization_id,
  month::text AS date_dimension,
  NULL::integer AS hour_dimension,
  NULL::text AS string_dimension,
  mau::bigint AS metric_value,
  NULL::bigint AS secondary_value
FROM monthly_active_users

UNION ALL

SELECT
  'feature_usage' AS metric_type,
  organization_id,
  day::text AS date_dimension,
  NULL::integer AS hour_dimension,
  event_type::text AS string_dimension,
  event_count::bigint AS metric_value,
  unique_users::bigint AS secondary_value
FROM feature_usage

UNION ALL

SELECT
  'hourly_usage' AS metric_type,
  organization_id,
  NULL::text AS date_dimension,
  hour_of_day AS hour_dimension,
  NULL::text AS string_dimension,
  event_count::bigint AS metric_value,
  NULL::bigint AS secondary_value
FROM hourly_usage

UNION ALL

SELECT
  'language_usage' AS metric_type,
  organization_id,
  NULL::text AS date_dimension,
  NULL::integer AS hour_dimension,
  language AS string_dimension,
  event_count::bigint AS metric_value,
  unique_users::bigint AS secondary_value
FROM language_usage

UNION ALL

SELECT
  'sector_usage' AS metric_type,
  organization_id,
  NULL::text AS date_dimension,
  NULL::integer AS hour_dimension,
  sector AS string_dimension,
  event_count::bigint AS metric_value,
  unique_users::bigint AS secondary_value
FROM sector_usage

UNION ALL

SELECT
  'device_usage' AS metric_type,
  organization_id,
  NULL::text AS date_dimension,
  NULL::integer AS hour_dimension,
  device_type AS string_dimension,
  event_count::bigint AS metric_value,
  unique_users::bigint AS secondary_value
FROM device_usage

UNION ALL

SELECT
  'session_metrics' AS metric_type,
  organization_id,
  NULL::text AS date_dimension,
  NULL::integer AS hour_dimension,
  'avg_session_duration' AS string_dimension,
  avg_session_seconds::bigint AS metric_value,
  sessions_per_user::bigint AS secondary_value
FROM session_duration

UNION ALL

SELECT
  'top_organizations' AS metric_type,
  organization_id,
  NULL::text AS date_dimension,
  NULL::integer AS hour_dimension,
  'total_activity' AS string_dimension,
  total_events::bigint AS metric_value,
  total_users::bigint AS secondary_value
FROM top_organizations;

-- Create function to log usage event
CREATE OR REPLACE FUNCTION log_usage_event(
  p_user_id uuid,
  p_organization_id uuid,
  p_event_type event_type,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_device_type text DEFAULT NULL,
  p_language text DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO usage_events (
    user_id,
    organization_id,
    event_type,
    event_data,
    device_type,
    language,
    sector,
    session_id,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_event_type,
    p_event_data,
    p_device_type,
    p_language,
    p_sector,
    p_session_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get usage summary
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_organization_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  metric_name text,
  metric_value bigint,
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
      COUNT(*) AS total_events,
      COUNT(DISTINCT user_id) AS unique_users,
      COUNT(DISTINCT date_trunc('day', created_at)) AS active_days,
      COUNT(DISTINCT session_id) AS total_sessions
    FROM usage_events
    WHERE organization_id = p_organization_id
      AND created_at BETWEEN v_current_start AND v_current_end
  ),
  previous_period AS (
    SELECT
      COUNT(*) AS total_events,
      COUNT(DISTINCT user_id) AS unique_users,
      COUNT(DISTINCT date_trunc('day', created_at)) AS active_days,
      COUNT(DISTINCT session_id) AS total_sessions
    FROM usage_events
    WHERE organization_id = p_organization_id
      AND created_at BETWEEN v_previous_start AND v_previous_end
  )
  SELECT
    metric_name,
    current_value,
    CASE
      WHEN previous_value = 0 THEN NULL
      ELSE ((current_value - previous_value)::numeric / previous_value) * 100
    END AS change_percentage
  FROM (
    SELECT 'total_events' AS metric_name, 
           cp.total_events AS current_value, 
           pp.total_events AS previous_value
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'unique_users', 
           cp.unique_users, 
           pp.unique_users
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'active_days', 
           cp.active_days, 
           pp.active_days
    FROM current_period cp, previous_period pp
    UNION ALL
    SELECT 'total_sessions', 
           cp.total_sessions, 
           pp.total_sessions
    FROM current_period cp, previous_period pp
  ) AS metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE usage_events IS 'Stores detailed usage event data for analytics';
COMMENT ON VIEW usage_statistics IS 'Aggregated usage metrics for dashboards and reporting';
COMMENT ON FUNCTION log_usage_event IS 'Logs a usage event with context information';
COMMENT ON FUNCTION get_usage_summary IS 'Gets usage summary metrics with period-over-period comparison';