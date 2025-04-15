/*
  # Trend Insights View Creation

  1. New Views
    - trend_insights: Provides trend analysis with period-over-period comparisons
  
  2. New Functions
    - get_trend_summary: Retrieves trend data with optional filtering
    - detect_trend_anomalies: Identifies statistical anomalies in trend data
    - forecast_trend: Generates simple linear forecast for future periods

  3. Indexes
    - Added indexes for conversations table to optimize trend queries
*/

-- Create trend_insights view
CREATE OR REPLACE VIEW trend_insights AS
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

-- Create function to get trend summary
CREATE OR REPLACE FUNCTION get_trend_summary(
  p_organization_id uuid,
  p_trend_type text DEFAULT 'daily',
  p_limit integer DEFAULT 90,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  dimension text,
  conversation_count bigint,
  customer_count bigint,
  avg_duration_seconds integer,
  completion_rate numeric,
  avg_sentiment numeric,
  trend_direction text,
  change_percentage numeric,
  is_anomaly boolean,
  forecast_7d bigint,
  category text,
  trend_summary jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ti.dimension,
    ti.conversation_count,
    ti.customer_count,
    ti.avg_duration_seconds,
    ti.completion_rate,
    ti.avg_sentiment,
    ti.trend_direction,
    ti.change_percentage,
    ti.is_anomaly,
    ti.forecast_7d,
    ti.category,
    ti.trend_summary
  FROM trend_insights ti
  WHERE ti.organization_id = p_organization_id
    AND ti.trend_type = p_trend_type
    AND (p_category IS NULL OR ti.category = p_category)
  ORDER BY ti.dimension DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to detect anomalies
CREATE OR REPLACE FUNCTION detect_trend_anomalies(
  p_organization_id uuid,
  p_days integer DEFAULT 30,
  p_z_threshold numeric DEFAULT 2.0
)
RETURNS TABLE (
  dimension text,
  metric_name text,
  actual_value numeric,
  expected_value numeric,
  z_score numeric,
  deviation_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_metrics AS (
    SELECT
      dimension,
      conversation_count,
      customer_count,
      avg_duration_seconds,
      completion_rate,
      avg_sentiment,
      trend_summary->>'z_score' AS z_score
    FROM trend_insights
    WHERE organization_id = p_organization_id
      AND trend_type = 'daily'
      AND dimension::date >= CURRENT_DATE - (p_days || ' days')::interval
  ),
  anomalies AS (
    SELECT
      dimension,
      'conversation_count' AS metric_name,
      conversation_count AS actual_value,
      (trend_summary->>'ma30_conversation_count')::numeric AS expected_value,
      (z_score)::numeric AS z_score,
      CASE
        WHEN (trend_summary->>'ma30_conversation_count')::numeric = 0 THEN NULL
        ELSE ((conversation_count - (trend_summary->>'ma30_conversation_count')::numeric) / (trend_summary->>'ma30_conversation_count')::numeric) * 100
      END AS deviation_percentage
    FROM recent_metrics
    WHERE ABS((z_score)::numeric) > p_z_threshold
  )
  SELECT * FROM anomalies
  ORDER BY ABS(z_score) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to forecast trends
CREATE OR REPLACE FUNCTION forecast_trend(
  p_organization_id uuid,
  p_days_ahead integer DEFAULT 7,
  p_history_days integer DEFAULT 30
)
RETURNS TABLE (
  forecast_date date,
  predicted_conversations numeric,
  prediction_interval_low numeric,
  prediction_interval_high numeric
) AS $$
DECLARE
  v_slope numeric;
  v_intercept numeric;
  v_std_dev numeric;
  v_last_date date;
  v_x_mean numeric;
  v_y_mean numeric;
  v_n integer;
  v_sum_xy numeric;
  v_sum_xx numeric;
BEGIN
  -- Get historical data for linear regression
  WITH historical_data AS (
    SELECT
      dimension::date AS date,
      ROW_NUMBER() OVER (ORDER BY dimension::date) AS x,
      conversation_count AS y
    FROM trend_insights
    WHERE organization_id = p_organization_id
      AND trend_type = 'daily'
      AND dimension::date >= CURRENT_DATE - (p_history_days || ' days')::interval
      AND dimension::date <= CURRENT_DATE
    ORDER BY dimension::date
  )
  SELECT
    COUNT(*),
    AVG(x),
    AVG(y),
    SUM(x * y),
    SUM(x * x),
    MAX(date),
    STDDEV(y)
  INTO
    v_n,
    v_x_mean,
    v_y_mean,
    v_sum_xy,
    v_sum_xx,
    v_last_date,
    v_std_dev
  FROM historical_data;

  -- Calculate regression coefficients
  v_slope := (v_sum_xy - v_n * v_x_mean * v_y_mean) / (v_sum_xx - v_n * v_x_mean * v_x_mean);
  v_intercept := v_y_mean - v_slope * v_x_mean;

  -- Generate forecast
  FOR i IN 1..p_days_ahead LOOP
    forecast_date := v_last_date + (i || ' days')::interval;
    predicted_conversations := v_intercept + v_slope * (v_n + i);
    prediction_interval_low := GREATEST(0, predicted_conversations - 1.96 * v_std_dev);
    prediction_interval_high := predicted_conversations + 1.96 * v_std_dev;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes to support the view
CREATE INDEX IF NOT EXISTS idx_conversations_created_at_org 
ON conversations(created_at, organization_id);

CREATE INDEX IF NOT EXISTS idx_conversations_status_sentiment 
ON conversations(status, sentiment_score);

CREATE INDEX IF NOT EXISTS idx_conversations_language_org 
ON conversations(language, organization_id);

-- Add comments
COMMENT ON VIEW trend_insights IS 'Provides trend analysis with period-over-period comparisons';
COMMENT ON FUNCTION get_trend_summary IS 'Retrieves trend data with optional filtering';
COMMENT ON FUNCTION detect_trend_anomalies IS 'Identifies statistical anomalies in trend data';
COMMENT ON FUNCTION forecast_trend IS 'Generates simple linear forecast for future periods';