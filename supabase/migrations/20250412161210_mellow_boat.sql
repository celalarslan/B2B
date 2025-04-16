/*
  # Usage Statistics Materialized View

  1. New Materialized View
    - usage_statistics_materialized: Materialized version of usage_statistics view
  
  2. Indexes
    - Added indexes for usage_statistics_materialized
  
  3. Functions
    - refresh_usage_statistics_materialized: Refreshes the materialized view
*/

-- Create materialized view for usage_statistics if the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_views WHERE viewname = 'usage_statistics'
  ) THEN
    -- Create materialized view
    EXECUTE 'CREATE MATERIALIZED VIEW IF NOT EXISTS usage_statistics_materialized AS SELECT * FROM usage_statistics';
    
    -- Create indexes
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_usage_stats_mat_org ON usage_statistics_materialized(organization_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_usage_stats_mat_type ON usage_statistics_materialized(metric_type)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_usage_stats_mat_date ON usage_statistics_materialized(date_dimension) WHERE date_dimension IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_usage_stats_mat_hour ON usage_statistics_materialized(hour_dimension) WHERE hour_dimension IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_usage_stats_mat_string ON usage_statistics_materialized(string_dimension) WHERE string_dimension IS NOT NULL';
  END IF;
END $$;

-- Create function to refresh usage_statistics_materialized
CREATE OR REPLACE FUNCTION refresh_usage_statistics_materialized() RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_matviews WHERE matviewname = 'usage_statistics_materialized'
  ) THEN
    REFRESH MATERIALIZED VIEW usage_statistics_materialized;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION refresh_usage_statistics_materialized IS 'Refreshes the usage_statistics_materialized view';