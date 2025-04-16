/*
  # Trend Insights Materialized View

  1. New Materialized View
    - trend_insights_materialized: Materialized version of trend_insights view
  
  2. Indexes
    - Added indexes for trend_insights_materialized
  
  3. Functions
    - refresh_trend_insights_materialized: Refreshes the materialized view
*/

-- Create materialized view for trend_insights if the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_views WHERE viewname = 'trend_insights'
  ) THEN
    -- Create materialized view
    EXECUTE 'CREATE MATERIALIZED VIEW IF NOT EXISTS trend_insights_materialized AS SELECT * FROM trend_insights';
    
    -- Create indexes
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trend_insights_mat_org ON trend_insights_materialized(organization_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trend_insights_mat_type ON trend_insights_materialized(trend_type)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trend_insights_mat_dimension ON trend_insights_materialized(dimension)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trend_insights_mat_category ON trend_insights_materialized(category) WHERE category IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trend_insights_mat_conversation_count ON trend_insights_materialized(conversation_count)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_trend_insights_mat_trend_direction ON trend_insights_materialized(trend_direction)';
  END IF;
END $$;

-- Create function to refresh trend_insights_materialized
CREATE OR REPLACE FUNCTION refresh_trend_insights_materialized() RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_matviews WHERE matviewname = 'trend_insights_materialized'
  ) THEN
    REFRESH MATERIALIZED VIEW trend_insights_materialized;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION refresh_trend_insights_materialized IS 'Refreshes the trend_insights_materialized view';