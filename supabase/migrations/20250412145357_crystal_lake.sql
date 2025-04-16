/*
  # Usage Tracking and Quota System

  1. New Tables
    - usage_limits: Stores plan-based usage quotas
    - usage_logs: Tracks all usage events
    - usage_aggregates: View for monthly usage stats

  2. Security
    - RLS policies for data access
    - Admin role permissions
    - Audit logging
*/

-- Create usage type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usage_type') THEN
    CREATE TYPE usage_type AS ENUM (
      'conversation',
      'tts',
      'stt',
      'api_call'
    );
  END IF;
END $$;

-- Create usage_limits table
CREATE TABLE IF NOT EXISTS usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan text NOT NULL,
  conversation_limit integer NOT NULL,
  minutes_limit integer NOT NULL,
  period_start timestamptz DEFAULT now() NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_limits CHECK (
    (conversation_limit >= -1) AND
    (minutes_limit >= -1)
  ),
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  type usage_type NOT NULL,
  tokens_used integer DEFAULT 0,
  minutes_used numeric(10,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_usage CHECK (
    (tokens_used >= 0) AND
    (minutes_used >= 0)
  )
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_usage_limits_user;
DROP INDEX IF EXISTS idx_usage_limits_org;
DROP INDEX IF EXISTS idx_usage_limits_plan;
DROP INDEX IF EXISTS idx_usage_limits_period;
DROP INDEX IF EXISTS idx_usage_logs_user;
DROP INDEX IF EXISTS idx_usage_logs_org;
DROP INDEX IF EXISTS idx_usage_logs_type;
DROP INDEX IF EXISTS idx_usage_logs_timestamp;
DROP INDEX IF EXISTS idx_usage_logs_user_timestamp;

-- Create indexes
CREATE INDEX idx_usage_limits_user ON usage_limits(user_id);
CREATE INDEX idx_usage_limits_org ON usage_limits(organization_id);
CREATE INDEX idx_usage_limits_plan ON usage_limits(plan);
CREATE INDEX idx_usage_limits_period ON usage_limits(period_start, period_end);

CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_org ON usage_logs(organization_id);
CREATE INDEX idx_usage_logs_type ON usage_logs(type);
CREATE INDEX idx_usage_logs_timestamp ON usage_logs(timestamp);
CREATE INDEX idx_usage_logs_user_timestamp ON usage_logs(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own usage limits" ON usage_limits;
DROP POLICY IF EXISTS "Users can read own usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Users can create own usage logs" ON usage_logs;

-- Create RLS policies
CREATE POLICY "Users can read own usage limits"
  ON usage_limits
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

CREATE POLICY "Users can read own usage logs"
  ON usage_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

CREATE POLICY "Users can create own usage logs"
  ON usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop existing view if it exists
DROP VIEW IF EXISTS usage_aggregates;

-- Create usage aggregates view
CREATE VIEW usage_aggregates AS
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

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_usage_limits(uuid, uuid, usage_type, numeric);
DROP FUNCTION IF EXISTS create_plan_limits(uuid, uuid, text, timestamptz);
DROP FUNCTION IF EXISTS log_usage(uuid, uuid, usage_type, integer, numeric, jsonb);

-- Function to check usage limits
CREATE FUNCTION check_usage_limits(
  p_user_id uuid,
  p_organization_id uuid,
  p_type usage_type,
  p_minutes numeric DEFAULT 0
)
RETURNS boolean AS $$
DECLARE
  v_limit record;
  v_current_usage record;
BEGIN
  -- Get current limits
  SELECT * INTO v_limit
  FROM usage_limits
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND period_start <= now()
    AND period_end > now()
  ORDER BY period_start DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get current usage
  SELECT 
    COUNT(CASE WHEN type = 'conversation' THEN 1 END) as conversations,
    COALESCE(SUM(CASE WHEN type IN ('tts', 'stt') THEN minutes_used ELSE 0 END), 0) as minutes
  INTO v_current_usage
  FROM usage_logs
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND timestamp >= date_trunc('month', now());

  -- Check limits
  IF p_type = 'conversation' AND v_limit.conversation_limit != -1 THEN
    RETURN v_current_usage.conversations < v_limit.conversation_limit;
  END IF;

  IF p_type IN ('tts', 'stt') AND v_limit.minutes_limit != -1 THEN
    RETURN (v_current_usage.minutes + p_minutes) <= v_limit.minutes_limit;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create usage limits for new plan
CREATE FUNCTION create_plan_limits(
  p_user_id uuid,
  p_organization_id uuid,
  p_plan text,
  p_start_date timestamptz DEFAULT now()
)
RETURNS uuid AS $$
DECLARE
  v_limit_id uuid;
  v_conversation_limit integer;
  v_minutes_limit integer;
BEGIN
  -- Set limits based on plan
  CASE p_plan
    WHEN 'trial' THEN
      v_conversation_limit := 100;
      v_minutes_limit := 60;
    WHEN 'starter' THEN
      v_conversation_limit := 500;
      v_minutes_limit := 300;
    WHEN 'professional' THEN
      v_conversation_limit := -1;
      v_minutes_limit := 1000;
    WHEN 'enterprise' THEN
      v_conversation_limit := -1;
      v_minutes_limit := -1;
    ELSE
      RAISE EXCEPTION 'Invalid plan: %', p_plan;
  END CASE;

  -- Insert new limits
  INSERT INTO usage_limits (
    user_id,
    organization_id,
    plan,
    conversation_limit,
    minutes_limit,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_plan,
    v_conversation_limit,
    v_minutes_limit,
    p_start_date,
    p_start_date + interval '1 month'
  )
  RETURNING id INTO v_limit_id;

  RETURN v_limit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log usage
CREATE FUNCTION log_usage(
  p_user_id uuid,
  p_organization_id uuid,
  p_type usage_type,
  p_tokens integer DEFAULT 0,
  p_minutes numeric DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Check limits first
  IF NOT check_usage_limits(p_user_id, p_organization_id, p_type, p_minutes) THEN
    RAISE EXCEPTION 'Usage limit exceeded for type: %', p_type;
  END IF;

  -- Log usage
  INSERT INTO usage_logs (
    user_id,
    organization_id,
    type,
    tokens_used,
    minutes_used,
    metadata
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_type,
    p_tokens,
    p_minutes,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE usage_limits IS 'Stores plan-based usage quotas and limits';
COMMENT ON TABLE usage_logs IS 'Tracks all usage events with detailed metrics';
COMMENT ON VIEW usage_aggregates IS 'Aggregated monthly usage statistics per user';

COMMENT ON COLUMN usage_limits.conversation_limit IS 'Maximum conversations per period (-1 for unlimited)';
COMMENT ON COLUMN usage_limits.minutes_limit IS 'Maximum minutes per period (-1 for unlimited)';

COMMENT ON FUNCTION check_usage_limits IS 'Checks if a usage action would exceed limits';
COMMENT ON FUNCTION create_plan_limits IS 'Creates usage limits for a new subscription plan';
COMMENT ON FUNCTION log_usage IS 'Logs a usage event after checking limits';