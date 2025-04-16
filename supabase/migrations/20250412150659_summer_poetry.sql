/*
  # Reporting System Schema

  1. New Tables
    - saved_reports: Stores report configurations
    - report_logs: Tracks report generation activity
    - report_schedules: Manages automated report exports
    
  2. Security
    - RLS policies for organization isolation
    - Role-based access control
    - Audit logging
*/

-- Create report type enum
CREATE TYPE report_type AS ENUM (
  'conversations',
  'customers',
  'errors',
  'sentiment',
  'usage',
  'billing'
);

-- Create report format enum
CREATE TYPE report_format AS ENUM (
  'table',
  'line_chart',
  'bar_chart',
  'pie_chart'
);

-- Create export format enum
CREATE TYPE export_format AS ENUM (
  'csv',
  'pdf',
  'json'
);

-- Create schedule frequency enum
CREATE TYPE schedule_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly'
);

-- Create saved_reports table
CREATE TABLE saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  type report_type NOT NULL,
  config jsonb NOT NULL,
  visualization_type report_format NOT NULL,
  is_favorite boolean DEFAULT false,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_config CHECK (
    jsonb_typeof(config->'metrics') = 'array' AND
    jsonb_typeof(config->'filters') = 'object' AND
    jsonb_typeof(config->'groupBy') = 'string'
  )
);

-- Create report_logs table
CREATE TABLE report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES saved_reports(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'in_progress')),
  format export_format,
  duration_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create report_schedules table
CREATE TABLE report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES saved_reports(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  frequency schedule_frequency NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month integer CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day time NOT NULL,
  export_format export_format NOT NULL,
  recipients jsonb NOT NULL,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_schedule CHECK (
    (frequency = 'weekly' AND day_of_week IS NOT NULL) OR
    (frequency = 'monthly' AND day_of_month IS NOT NULL) OR
    (frequency = 'daily')
  ),
  CONSTRAINT valid_recipients CHECK (
    jsonb_typeof(recipients) = 'array' AND
    jsonb_array_length(recipients) > 0
  )
);

-- Create indexes
CREATE INDEX idx_saved_reports_org ON saved_reports(organization_id);
CREATE INDEX idx_saved_reports_user ON saved_reports(user_id);
CREATE INDEX idx_saved_reports_type ON saved_reports(type);
CREATE INDEX idx_saved_reports_favorite ON saved_reports(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_saved_reports_viewed ON saved_reports(last_viewed_at DESC);

CREATE INDEX idx_report_logs_org ON report_logs(organization_id);
CREATE INDEX idx_report_logs_report ON report_logs(report_id);
CREATE INDEX idx_report_logs_status ON report_logs(status);
CREATE INDEX idx_report_logs_created ON report_logs(created_at DESC);

CREATE INDEX idx_report_schedules_org ON report_schedules(organization_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_report_schedules_frequency ON report_schedules(frequency);

-- Enable RLS
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view reports in their organization"
  ON saved_reports
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with editor role can manage reports"
  ON saved_reports
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND (
        ou.roles @> '[{"role": "admin"}]'::jsonb OR
        ou.roles @> '[{"role": "editor"}]'::jsonb
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND (
        ou.roles @> '[{"role": "admin"}]'::jsonb OR
        ou.roles @> '[{"role": "editor"}]'::jsonb
      )
    )
  );

CREATE POLICY "Users can view report logs in their organization"
  ON report_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Users with editor role can manage schedules"
  ON report_schedules
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND (
        ou.roles @> '[{"role": "admin"}]'::jsonb OR
        ou.roles @> '[{"role": "editor"}]'::jsonb
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND (
        ou.roles @> '[{"role": "admin"}]'::jsonb OR
        ou.roles @> '[{"role": "editor"}]'::jsonb
      )
    )
  );

-- Create function to update report view timestamp
CREATE OR REPLACE FUNCTION update_report_viewed_at()
RETURNS trigger AS $$
BEGIN
  NEW.last_viewed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for view timestamp
CREATE TRIGGER update_report_viewed_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_report_viewed_at();

-- Create function to calculate next schedule run
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  p_frequency schedule_frequency,
  p_day_of_week integer,
  p_day_of_month integer,
  p_time_of_day time
)
RETURNS timestamptz AS $$
DECLARE
  v_next timestamptz;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next := date_trunc('day', now()) + p_time_of_day;
      IF v_next <= now() THEN
        v_next := v_next + interval '1 day';
      END IF;
    
    WHEN 'weekly' THEN
      v_next := date_trunc('week', now()) + 
                (p_day_of_week || ' days')::interval +
                p_time_of_day;
      IF v_next <= now() THEN
        v_next := v_next + interval '1 week';
      END IF;
    
    WHEN 'monthly' THEN
      v_next := date_trunc('month', now()) + 
                ((p_day_of_month - 1) || ' days')::interval +
                p_time_of_day;
      IF v_next <= now() THEN
        v_next := v_next + interval '1 month';
      END IF;
  END CASE;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- Create function to update schedule next run
CREATE OR REPLACE FUNCTION update_schedule_next_run()
RETURNS trigger AS $$
BEGIN
  NEW.next_run_at := calculate_next_run_at(
    NEW.frequency,
    NEW.day_of_week,
    NEW.day_of_month,
    NEW.time_of_day
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schedule updates
CREATE TRIGGER update_schedule_next_run
  BEFORE INSERT OR UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_next_run();

-- Add comments
COMMENT ON TABLE saved_reports IS 'Stores user-created report configurations';
COMMENT ON TABLE report_logs IS 'Tracks report generation activity and errors';
COMMENT ON TABLE report_schedules IS 'Manages automated report export schedules';

COMMENT ON COLUMN saved_reports.config IS 'JSON configuration including metrics, filters, and grouping';
COMMENT ON COLUMN report_schedules.recipients IS 'Array of email addresses to receive the report';