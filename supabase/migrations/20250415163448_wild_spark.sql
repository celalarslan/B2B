/*
  # Fix Security Issues Migration

  1. Changes
    - Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER
    - Enable RLS on tables that are missing it
    - Add RLS policies for tables that need them

  2. Security
    - Ensure all tables have RLS enabled
    - Ensure all views use SECURITY INVOKER
    - Add appropriate RLS policies
*/

-- Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER

-- 1. Fix performance_insights view
CREATE OR REPLACE VIEW performance_insights SECURITY INVOKER AS
WITH daily_metrics AS (
  SELECT
    'daily' AS metric_type,
    organization_id,
    date_trunc('day', timestamp) AS dimension,
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
    'sector' AS metric_type,
    pm.organization_id,
    NULL::timestamptz AS dimension, -- Cast NULL to timestamptz to match daily_metrics
    COUNT(*) AS total_interactions,
    AVG(pm.ai_response_time_ms) AS avg_ai_response_time,
    NULL::double precision AS median_ai_response_time, -- Cast NULL to double precision
    NULL::double precision AS p95_ai_response_time, -- Cast NULL to double precision
    NULL::integer AS max_ai_response_time, -- Cast NULL to integer
    NULL::numeric AS avg_user_delay, -- Cast NULL to numeric
    NULL::numeric AS avg_duration, -- Cast NULL to numeric
    SUM(CASE WHEN pm.success = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) AS success_rate,
    NULL::numeric AS avg_stt_latency, -- Cast NULL to numeric
    NULL::numeric AS avg_tts_latency, -- Cast NULL to numeric
    o.sector_code,
    NULL::text AS language
  FROM performance_metrics pm
  JOIN organizations o ON pm.organization_id = o.id
  GROUP BY pm.organization_id, o.sector_code
),
language_metrics AS (
  SELECT
    'language' AS metric_type,
    pm.organization_id,
    NULL::timestamptz AS dimension, -- Cast NULL to timestamptz to match daily_metrics
    COUNT(*) AS total_interactions,
    AVG(pm.ai_response_time_ms) AS avg_ai_response_time,
    NULL::double precision AS median_ai_response_time, -- Cast NULL to double precision
    NULL::double precision AS p95_ai_response_time, -- Cast NULL to double precision
    NULL::integer AS max_ai_response_time, -- Cast NULL to integer
    NULL::numeric AS avg_user_delay, -- Cast NULL to numeric
    NULL::numeric AS avg_duration, -- Cast NULL to numeric
    SUM(CASE WHEN pm.success = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) AS success_rate,
    NULL::numeric AS avg_stt_latency, -- Cast NULL to numeric
    NULL::numeric AS avg_tts_latency, -- Cast NULL to numeric
    NULL::text AS sector_code,
    c.language
  FROM performance_metrics pm
  JOIN conversations c ON pm.conversation_id = c.id
  WHERE c.language IS NOT NULL
  GROUP BY pm.organization_id, c.language
)
SELECT * FROM daily_metrics
UNION ALL
SELECT * FROM sector_metrics
UNION ALL
SELECT * FROM language_metrics;

-- 2. Fix usage_aggregates view
CREATE OR REPLACE VIEW usage_aggregates SECURITY INVOKER AS
WITH monthly_usage AS (
  SELECT
    user_id,
    organization_id,
    date_trunc('month', timestamp) as month,
    COUNT(CASE WHEN type = 'conversation' THEN 1 END) as conversations_used,
    COALESCE(SUM(CASE 
      WHEN type IN ('tts', 'stt') THEN minutes_used 
      ELSE 0 
    END), 0) as minutes_used
  FROM usage_logs
  GROUP BY user_id, organization_id, date_trunc('month', timestamp)
),
current_limits AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    organization_id,
    conversation_limit,
    minutes_limit
  FROM usage_limits
  WHERE period_end > now()
  ORDER BY user_id, period_start DESC
)
SELECT 
  mu.user_id,
  mu.organization_id,
  mu.month,
  mu.conversations_used,
  mu.minutes_used,
  cl.conversation_limit,
  cl.minutes_limit,
  CASE 
    WHEN cl.conversation_limit = -1 THEN NULL
    ELSE GREATEST(0, cl.conversation_limit - mu.conversations_used)
  END as remaining_conversations,
  CASE 
    WHEN cl.minutes_limit = -1 THEN NULL
    ELSE GREATEST(0, cl.minutes_limit - mu.minutes_used)
  END as remaining_minutes
FROM monthly_usage mu
LEFT JOIN current_limits cl ON mu.user_id = cl.user_id;

-- 3. Fix usage_statistics view
CREATE OR REPLACE VIEW usage_statistics SECURITY INVOKER AS
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

-- 4. Fix trend_insights view
CREATE OR REPLACE VIEW trend_insights SECURITY INVOKER AS
WITH 
-- Daily metrics for the last 90 days
daily_metrics AS (
  SELECT
    'daily' AS period_type,
    c.organization_id,
    date_trunc('day', c.created_at)::date AS period,
    COUNT(*) AS conversation_count,
    COUNT(DISTINCT c.customer_id) AS customer_count,
    -- Using 0 as default duration since the duration column doesn't exist
    0 AS avg_duration_seconds,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 AS completion_rate,
    AVG(CASE WHEN c.sentiment_score IS NOT NULL THEN c.sentiment_score ELSE 0 END) AS avg_sentiment
  FROM conversations c
  WHERE c.created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY c.organization_id, date_trunc('day', c.created_at)::date
),

-- Weekly metrics for the last 52 weeks
weekly_metrics AS (
  SELECT
    'weekly' AS period_type,
    c.organization_id,
    date_trunc('week', c.created_at)::date AS period,
    COUNT(*) AS conversation_count,
    COUNT(DISTINCT c.customer_id) AS customer_count,
    -- Using 0 as default duration since the duration column doesn't exist
    0 AS avg_duration_seconds,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 AS completion_rate,
    AVG(CASE WHEN c.sentiment_score IS NOT NULL THEN c.sentiment_score ELSE 0 END) AS avg_sentiment
  FROM conversations c
  WHERE c.created_at >= CURRENT_DATE - INTERVAL '52 weeks'
  GROUP BY c.organization_id, date_trunc('week', c.created_at)::date
),

-- Monthly metrics for the last 24 months
monthly_metrics AS (
  SELECT
    'monthly' AS period_type,
    c.organization_id,
    date_trunc('month', c.created_at)::date AS period,
    COUNT(*) AS conversation_count,
    COUNT(DISTINCT c.customer_id) AS customer_count,
    -- Using 0 as default duration since the duration column doesn't exist
    0 AS avg_duration_seconds,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 AS completion_rate,
    AVG(CASE WHEN c.sentiment_score IS NOT NULL THEN c.sentiment_score ELSE 0 END) AS avg_sentiment
  FROM conversations c
  WHERE c.created_at >= CURRENT_DATE - INTERVAL '24 months'
  GROUP BY c.organization_id, date_trunc('month', c.created_at)::date
),

-- Sector metrics by month
sector_metrics AS (
  SELECT
    'sector' AS period_type,
    c.organization_id,
    date_trunc('month', c.created_at)::date AS period,
    o.sector_code,
    COUNT(*) AS conversation_count,
    COUNT(DISTINCT c.customer_id) AS customer_count,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 AS completion_rate
  FROM conversations c
  JOIN organizations o ON c.organization_id = o.id
  WHERE c.created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY c.organization_id, date_trunc('month', c.created_at)::date, o.sector_code
),

-- Language metrics by month
language_metrics AS (
  SELECT
    'language' AS period_type,
    c.organization_id,
    date_trunc('month', c.created_at)::date AS period,
    c.language,
    COUNT(*) AS conversation_count,
    COUNT(DISTINCT c.customer_id) AS customer_count,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 AS completion_rate
  FROM conversations c
  WHERE 
    c.created_at >= CURRENT_DATE - INTERVAL '12 months'
    AND c.language IS NOT NULL
  GROUP BY c.organization_id, date_trunc('month', c.created_at)::date, c.language
),

-- Calculate moving averages and trend indicators for daily metrics
daily_trends AS (
  SELECT
    d.*,
    AVG(d.conversation_count) OVER (
      PARTITION BY d.organization_id 
      ORDER BY d.period 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS ma7_conversation_count,
    AVG(d.conversation_count) OVER (
      PARTITION BY d.organization_id 
      ORDER BY d.period 
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS ma30_conversation_count,
    LAG(d.conversation_count, 1) OVER (
      PARTITION BY d.organization_id 
      ORDER BY d.period
    ) AS prev_day_conversation_count,
    LAG(d.conversation_count, 7) OVER (
      PARTITION BY d.organization_id 
      ORDER BY d.period
    ) AS prev_week_conversation_count,
    LAG(d.conversation_count, 30) OVER (
      PARTITION BY d.organization_id 
      ORDER BY d.period
    ) AS prev_month_conversation_count,
    -- Calculate z-score for anomaly detection
    (d.conversation_count - AVG(d.conversation_count) OVER (
      PARTITION BY d.organization_id 
      ORDER BY d.period 
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    )) / NULLIF(
      STDDEV(d.conversation_count) OVER (
        PARTITION BY d.organization_id 
        ORDER BY d.period 
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
      ), 0
    ) AS conversation_count_z_score,
    -- Calculate day of week for seasonality detection
    EXTRACT(DOW FROM d.period) AS day_of_week
  FROM daily_metrics d
),

-- Calculate trend directions and changes
daily_trend_analysis AS (
  SELECT
    dt.*,
    -- Daily change
    CASE 
      WHEN dt.prev_day_conversation_count IS NULL THEN NULL
      WHEN dt.conversation_count > dt.prev_day_conversation_count THEN 'up'
      WHEN dt.conversation_count < dt.prev_day_conversation_count THEN 'down'
      ELSE 'no_change'
    END AS daily_trend,
    CASE
      WHEN dt.prev_day_conversation_count IS NULL OR dt.prev_day_conversation_count = 0 THEN NULL
      ELSE ((dt.conversation_count - dt.prev_day_conversation_count)::float / dt.prev_day_conversation_count) * 100
    END AS daily_change_pct,
    
    -- Weekly change
    CASE 
      WHEN dt.prev_week_conversation_count IS NULL THEN NULL
      WHEN dt.conversation_count > dt.prev_week_conversation_count THEN 'up'
      WHEN dt.conversation_count < dt.prev_week_conversation_count THEN 'down'
      ELSE 'no_change'
    END AS weekly_trend,
    CASE
      WHEN dt.prev_week_conversation_count IS NULL OR dt.prev_week_conversation_count = 0 THEN NULL
      ELSE ((dt.conversation_count - dt.prev_week_conversation_count)::float / dt.prev_week_conversation_count) * 100
    END AS weekly_change_pct,
    
    -- Monthly change
    CASE 
      WHEN dt.prev_month_conversation_count IS NULL THEN NULL
      WHEN dt.conversation_count > dt.prev_month_conversation_count THEN 'up'
      WHEN dt.conversation_count < dt.prev_month_conversation_count THEN 'down'
      ELSE 'no_change'
    END AS monthly_trend,
    CASE
      WHEN dt.prev_month_conversation_count IS NULL OR dt.prev_month_conversation_count = 0 THEN NULL
      ELSE ((dt.conversation_count - dt.prev_month_conversation_count)::float / dt.prev_month_conversation_count) * 100
    END AS monthly_change_pct,
    
    -- Anomaly detection
    CASE
      WHEN ABS(dt.conversation_count_z_score) > 2 THEN TRUE
      ELSE FALSE
    END AS is_anomaly,
    
    -- Simple forecast (linear projection for next 7 days)
    CASE
      WHEN dt.period = CURRENT_DATE THEN
        dt.conversation_count + (
          (dt.conversation_count - LAG(dt.conversation_count, 7) OVER (PARTITION BY dt.organization_id ORDER BY dt.period)) / 7
        ) * 7
      ELSE NULL
    END AS forecast_7d,
    
    -- Create JSON summary for frontend
    jsonb_build_object(
      'period', dt.period,
      'conversation_count', dt.conversation_count,
      'customer_count', dt.customer_count,
      'avg_duration_seconds', dt.avg_duration_seconds,
      'completion_rate', dt.completion_rate,
      'avg_sentiment', dt.avg_sentiment,
      'ma7_conversation_count', dt.ma7_conversation_count,
      'ma30_conversation_count', dt.ma30_conversation_count,
      'daily_trend', CASE 
        WHEN dt.prev_day_conversation_count IS NULL THEN NULL
        WHEN dt.conversation_count > dt.prev_day_conversation_count THEN 'up'
        WHEN dt.conversation_count < dt.prev_day_conversation_count THEN 'down'
        ELSE 'no_change'
      END,
      'daily_change_pct', CASE
        WHEN dt.prev_day_conversation_count IS NULL OR dt.prev_day_conversation_count = 0 THEN NULL
        ELSE ((dt.conversation_count - dt.prev_day_conversation_count)::float / dt.prev_day_conversation_count) * 100
      END,
      'weekly_trend', CASE 
        WHEN dt.prev_week_conversation_count IS NULL THEN NULL
        WHEN dt.conversation_count > dt.prev_week_conversation_count THEN 'up'
        WHEN dt.conversation_count < dt.prev_week_conversation_count THEN 'down'
        ELSE 'no_change'
      END,
      'weekly_change_pct', CASE
        WHEN dt.prev_week_conversation_count IS NULL OR dt.prev_week_conversation_count = 0 THEN NULL
        ELSE ((dt.conversation_count - dt.prev_week_conversation_count)::float / dt.prev_week_conversation_count) * 100
      END,
      'is_anomaly', CASE
        WHEN ABS(dt.conversation_count_z_score) > 2 THEN TRUE
        ELSE FALSE
      END,
      'z_score', dt.conversation_count_z_score,
      'day_of_week', dt.day_of_week
    ) AS trend_summary
  FROM daily_trends dt
),

-- Calculate weekly trends
weekly_trend_analysis AS (
  SELECT
    w.*,
    LAG(w.conversation_count, 1) OVER (
      PARTITION BY w.organization_id 
      ORDER BY w.period
    ) AS prev_week_conversation_count,
    LAG(w.conversation_count, 4) OVER (
      PARTITION BY w.organization_id 
      ORDER BY w.period
    ) AS prev_month_conversation_count,
    -- Calculate trend direction
    CASE 
      WHEN LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) IS NULL THEN NULL
      WHEN w.conversation_count > LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) THEN 'up'
      WHEN w.conversation_count < LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) THEN 'down'
      ELSE 'no_change'
    END AS weekly_trend,
    -- Calculate change percentage
    CASE
      WHEN LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) IS NULL 
        OR LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) = 0 THEN NULL
      ELSE ((w.conversation_count - LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period))::float 
        / LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period)) * 100
    END AS weekly_change_pct,
    -- Create JSON summary
    jsonb_build_object(
      'period', w.period,
      'conversation_count', w.conversation_count,
      'customer_count', w.customer_count,
      'avg_duration_seconds', w.avg_duration_seconds,
      'completion_rate', w.completion_rate,
      'avg_sentiment', w.avg_sentiment,
      'weekly_trend', CASE 
        WHEN LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) IS NULL THEN NULL
        WHEN w.conversation_count > LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) THEN 'up'
        WHEN w.conversation_count < LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) THEN 'down'
        ELSE 'no_change'
      END,
      'weekly_change_pct', CASE
        WHEN LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) IS NULL 
          OR LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period) = 0 THEN NULL
        ELSE ((w.conversation_count - LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period))::float 
          / LAG(w.conversation_count, 1) OVER (PARTITION BY w.organization_id ORDER BY w.period)) * 100
      END,
      'monthly_trend', CASE 
        WHEN LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period) IS NULL THEN NULL
        WHEN w.conversation_count > LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period) THEN 'up'
        WHEN w.conversation_count < LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period) THEN 'down'
        ELSE 'no_change'
      END,
      'monthly_change_pct', CASE
        WHEN LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period) IS NULL 
          OR LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period) = 0 THEN NULL
        ELSE ((w.conversation_count - LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period))::float 
          / LAG(w.conversation_count, 4) OVER (PARTITION BY w.organization_id ORDER BY w.period)) * 100
      END
    ) AS trend_summary
  FROM weekly_metrics w
),

-- Calculate monthly trends
monthly_trend_analysis AS (
  SELECT
    m.*,
    LAG(m.conversation_count, 1) OVER (
      PARTITION BY m.organization_id 
      ORDER BY m.period
    ) AS prev_month_conversation_count,
    LAG(m.conversation_count, 12) OVER (
      PARTITION BY m.organization_id 
      ORDER BY m.period
    ) AS prev_year_conversation_count,
    -- Calculate trend direction
    CASE 
      WHEN LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) IS NULL THEN NULL
      WHEN m.conversation_count > LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) THEN 'up'
      WHEN m.conversation_count < LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) THEN 'down'
      ELSE 'no_change'
    END AS monthly_trend,
    -- Calculate change percentage
    CASE
      WHEN LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) IS NULL 
        OR LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) = 0 THEN NULL
      ELSE ((m.conversation_count - LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period))::float 
        / LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period)) * 100
    END AS monthly_change_pct,
    -- Create JSON summary
    jsonb_build_object(
      'period', m.period,
      'conversation_count', m.conversation_count,
      'customer_count', m.customer_count,
      'avg_duration_seconds', m.avg_duration_seconds,
      'completion_rate', m.completion_rate,
      'avg_sentiment', m.avg_sentiment,
      'monthly_trend', CASE 
        WHEN LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) IS NULL THEN NULL
        WHEN m.conversation_count > LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) THEN 'up'
        WHEN m.conversation_count < LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) THEN 'down'
        ELSE 'no_change'
      END,
      'monthly_change_pct', CASE
        WHEN LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) IS NULL 
          OR LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period) = 0 THEN NULL
        ELSE ((m.conversation_count - LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period))::float 
          / LAG(m.conversation_count, 1) OVER (PARTITION BY m.organization_id ORDER BY m.period)) * 100
      END,
      'yearly_trend', CASE 
        WHEN LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period) IS NULL THEN NULL
        WHEN m.conversation_count > LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period) THEN 'up'
        WHEN m.conversation_count < LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period) THEN 'down'
        ELSE 'no_change'
      END,
      'yearly_change_pct', CASE
        WHEN LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period) IS NULL 
          OR LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period) = 0 THEN NULL
        ELSE ((m.conversation_count - LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period))::float 
          / LAG(m.conversation_count, 12) OVER (PARTITION BY m.organization_id ORDER BY m.period)) * 100
      END
    ) AS trend_summary
  FROM monthly_metrics m
),

-- Calculate sector trends
sector_trend_analysis AS (
  SELECT
    s.*,
    LAG(s.conversation_count, 1) OVER (
      PARTITION BY s.organization_id, s.sector_code
      ORDER BY s.period
    ) AS prev_month_conversation_count,
    -- Calculate trend direction
    CASE 
      WHEN LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) IS NULL THEN NULL
      WHEN s.conversation_count > LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) THEN 'up'
      WHEN s.conversation_count < LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) THEN 'down'
      ELSE 'no_change'
    END AS monthly_trend,
    -- Calculate change percentage
    CASE
      WHEN LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) IS NULL 
        OR LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) = 0 THEN NULL
      ELSE ((s.conversation_count - LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period))::float 
        / LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period)) * 100
    END AS monthly_change_pct,
    -- Create JSON summary
    jsonb_build_object(
      'period', s.period,
      'sector_code', s.sector_code,
      'conversation_count', s.conversation_count,
      'customer_count', s.customer_count,
      'completion_rate', s.completion_rate,
      'monthly_trend', CASE 
        WHEN LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) IS NULL THEN NULL
        WHEN s.conversation_count > LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) THEN 'up'
        WHEN s.conversation_count < LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) THEN 'down'
        ELSE 'no_change'
      END,
      'monthly_change_pct', CASE
        WHEN LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) IS NULL 
          OR LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period) = 0 THEN NULL
        ELSE ((s.conversation_count - LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period))::float 
          / LAG(s.conversation_count, 1) OVER (PARTITION BY s.organization_id, s.sector_code ORDER BY s.period)) * 100
      END
    ) AS trend_summary
  FROM sector_metrics s
),

-- Calculate language trends
language_trend_analysis AS (
  SELECT
    l.*,
    LAG(l.conversation_count, 1) OVER (
      PARTITION BY l.organization_id, l.language
      ORDER BY l.period
    ) AS prev_month_conversation_count,
    -- Calculate trend direction
    CASE 
      WHEN LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) IS NULL THEN NULL
      WHEN l.conversation_count > LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) THEN 'up'
      WHEN l.conversation_count < LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) THEN 'down'
      ELSE 'no_change'
    END AS monthly_trend,
    -- Calculate change percentage
    CASE
      WHEN LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) IS NULL 
        OR LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) = 0 THEN NULL
      ELSE ((l.conversation_count - LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period))::float 
        / LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period)) * 100
    END AS monthly_change_pct,
    -- Create JSON summary
    jsonb_build_object(
      'period', l.period,
      'language', l.language,
      'conversation_count', l.conversation_count,
      'customer_count', l.customer_count,
      'completion_rate', l.completion_rate,
      'monthly_trend', CASE 
        WHEN LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) IS NULL THEN NULL
        WHEN l.conversation_count > LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) THEN 'up'
        WHEN l.conversation_count < LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) THEN 'down'
        ELSE 'no_change'
      END,
      'monthly_change_pct', CASE
        WHEN LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) IS NULL 
          OR LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period) = 0 THEN NULL
        ELSE ((l.conversation_count - LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period))::float 
          / LAG(l.conversation_count, 1) OVER (PARTITION BY l.organization_id, l.language ORDER BY l.period)) * 100
      END
    ) AS trend_summary
  FROM language_metrics l
)

-- Combine all trend analyses
SELECT
  'daily' AS trend_type,
  organization_id,
  period::text AS dimension,
  conversation_count,
  customer_count,
  avg_duration_seconds,
  completion_rate,
  avg_sentiment,
  daily_trend AS trend_direction,
  daily_change_pct AS change_percentage,
  is_anomaly,
  forecast_7d,
  NULL::text AS category,
  trend_summary
FROM daily_trend_analysis

UNION ALL

SELECT
  'weekly' AS trend_type,
  organization_id,
  period::text AS dimension,
  conversation_count,
  customer_count,
  avg_duration_seconds,
  completion_rate,
  avg_sentiment,
  weekly_trend AS trend_direction,
  weekly_change_pct AS change_percentage,
  NULL::boolean AS is_anomaly,
  NULL::bigint AS forecast_7d,
  NULL::text AS category,
  trend_summary
FROM weekly_trend_analysis

UNION ALL

SELECT
  'monthly' AS trend_type,
  organization_id,
  period::text AS dimension,
  conversation_count,
  customer_count,
  avg_duration_seconds,
  completion_rate,
  avg_sentiment,
  monthly_trend AS trend_direction,
  monthly_change_pct AS change_percentage,
  NULL::boolean AS is_anomaly,
  NULL::bigint AS forecast_7d,
  NULL::text AS category,
  trend_summary
FROM monthly_trend_analysis

UNION ALL

SELECT
  'sector' AS trend_type,
  organization_id,
  period::text AS dimension,
  conversation_count,
  customer_count,
  NULL::integer AS avg_duration_seconds,
  completion_rate,
  NULL::numeric AS avg_sentiment,
  monthly_trend AS trend_direction,
  monthly_change_pct AS change_percentage,
  NULL::boolean AS is_anomaly,
  NULL::bigint AS forecast_7d,
  sector_code AS category,
  trend_summary
FROM sector_trend_analysis

UNION ALL

SELECT
  'language' AS trend_type,
  organization_id,
  period::text AS dimension,
  conversation_count,
  customer_count,
  NULL::integer AS avg_duration_seconds,
  completion_rate,
  NULL::numeric AS avg_sentiment,
  monthly_trend AS trend_direction,
  monthly_change_pct AS change_percentage,
  NULL::boolean AS is_anomaly,
  NULL::bigint AS forecast_7d,
  language AS category,
  trend_summary
FROM language_trend_analysis;

-- Enable RLS on tables that are missing it
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rate_limits table
CREATE POLICY "Only service role can access rate limits"
  ON rate_limits
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ? 'service_role'
  );

-- Create RLS policies for security_events table
CREATE POLICY "Only admins can view security events"
  ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

CREATE POLICY "Only service role can insert security events"
  ON security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ? 'service_role'
  );

-- Add comments
COMMENT ON VIEW performance_insights IS 'Aggregated performance metrics for analysis (SECURITY INVOKER)';
COMMENT ON VIEW usage_aggregates IS 'Aggregated monthly usage statistics per user (SECURITY INVOKER)';
COMMENT ON VIEW usage_statistics IS 'Aggregated usage metrics for dashboards and reporting (SECURITY INVOKER)';
COMMENT ON VIEW trend_insights IS 'Provides trend analysis with period-over-period comparisons (SECURITY INVOKER)';

COMMENT ON TABLE rate_limits IS 'Stores rate limiting information for API endpoints and actions (RLS enabled)';
COMMENT ON TABLE security_events IS 'Logs security-related events for auditing and monitoring (RLS enabled)';