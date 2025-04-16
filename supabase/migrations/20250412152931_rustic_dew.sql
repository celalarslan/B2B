/*
  # Fix UNION Type Mismatch in Performance Insights View

  1. Changes
    - Fix type mismatch between timestamp and text in UNION
    - Cast NULL values to consistent types across all queries
    - Add comments explaining the fix
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS performance_insights;

-- Create performance_insights view with fixed type casting
CREATE VIEW performance_insights AS
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
    SUM(CASE WHEN success = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) AS success_rate,
    AVG(stt_latency_ms) AS avg_stt_latency,
    AVG(tts_latency_ms) AS avg_tts_latency,
    NULL::text AS sector_code,
    NULL::text AS language
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

-- Add comments
COMMENT ON VIEW performance_insights IS 'Aggregated performance metrics for analysis';
COMMENT ON COLUMN performance_insights.dimension IS 'Date dimension for daily metrics, NULL for other metric types';
COMMENT ON COLUMN performance_insights.metric_type IS 'Type of metric grouping (daily, sector, language)';
COMMENT ON COLUMN performance_insights.sector_code IS 'Business sector code, only populated for sector metrics';
COMMENT ON COLUMN performance_insights.language IS 'Language code, only populated for language metrics';