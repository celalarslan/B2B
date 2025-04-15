/*
  # Usage Metering System Implementation

  1. New Tables
    - usage_metrics: Detailed usage tracking
    - billing_events: Usage-related events and notifications
    
  2. Features
    - Real-time usage tracking
    - Plan limit enforcement
    - Usage warnings and notifications
    - Audit logging
*/

-- Create billing event type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_event_type') THEN
    CREATE TYPE billing_event_type AS ENUM (
      'usage_update',
      'plan_upgrade',
      'limit_warning',
      'overage_charge'
    );
  END IF;
END $$;

-- Create usage_metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id text NOT NULL,
  month date NOT NULL,
  conversation_count integer DEFAULT 0,
  call_minutes integer DEFAULT 0,
  ai_message_count integer DEFAULT 0,
  audio_storage_mb integer DEFAULT 0,
  transcript_tokens integer DEFAULT 0,
  edge_function_calls integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_metrics CHECK (
    conversation_count >= 0 AND
    call_minutes >= 0 AND
    ai_message_count >= 0 AND
    audio_storage_mb >= 0 AND
    transcript_tokens >= 0 AND
    edge_function_calls >= 0
  ),
  CONSTRAINT unique_org_month UNIQUE (organization_id, month)
);

-- Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  type billing_event_type NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_month 
ON usage_metrics(organization_id, month);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_plan 
ON usage_metrics(plan_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_org 
ON billing_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_billing_events_type 
ON billing_events(type);

CREATE INDEX IF NOT EXISTS idx_billing_events_timestamp 
ON billing_events(timestamp DESC);

-- Enable RLS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization members can view usage metrics"
ON usage_metrics
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

CREATE POLICY "Only billing admins can modify usage metrics"
ON usage_metrics
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
)
WITH CHECK (
  organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    AND ou.roles @> '[{"role": "admin"}]'::jsonb
  )
);

CREATE POLICY "Organization members can view billing events"
ON billing_events
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

-- Create function to increment usage metrics
CREATE OR REPLACE FUNCTION increment_usage_metric(
  p_organization_id uuid,
  p_plan_id text,
  p_metric text,
  p_value integer DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_current_month date;
  v_current_value integer;
  v_limit integer;
  v_warning_threshold numeric := 0.8; -- 80% warning threshold
BEGIN
  -- Get current month
  v_current_month := date_trunc('month', current_date)::date;

  -- Upsert usage record
  INSERT INTO usage_metrics (
    organization_id,
    plan_id,
    month,
    conversation_count,
    call_minutes,
    ai_message_count,
    audio_storage_mb,
    transcript_tokens,
    edge_function_calls
  )
  VALUES (
    p_organization_id,
    p_plan_id,
    v_current_month,
    CASE WHEN p_metric = 'conversation_count' THEN p_value ELSE 0 END,
    CASE WHEN p_metric = 'call_minutes' THEN p_value ELSE 0 END,
    CASE WHEN p_metric = 'ai_message_count' THEN p_value ELSE 0 END,
    CASE WHEN p_metric = 'audio_storage_mb' THEN p_value ELSE 0 END,
    CASE WHEN p_metric = 'transcript_tokens' THEN p_value ELSE 0 END,
    CASE WHEN p_metric = 'edge_function_calls' THEN p_value ELSE 0 END
  )
  ON CONFLICT (organization_id, month)
  DO UPDATE SET
    conversation_count = CASE 
      WHEN p_metric = 'conversation_count' 
      THEN usage_metrics.conversation_count + p_value 
      ELSE usage_metrics.conversation_count 
    END,
    call_minutes = CASE 
      WHEN p_metric = 'call_minutes' 
      THEN usage_metrics.call_minutes + p_value 
      ELSE usage_metrics.call_minutes 
    END,
    ai_message_count = CASE 
      WHEN p_metric = 'ai_message_count' 
      THEN usage_metrics.ai_message_count + p_value 
      ELSE usage_metrics.ai_message_count 
    END,
    audio_storage_mb = CASE 
      WHEN p_metric = 'audio_storage_mb' 
      THEN usage_metrics.audio_storage_mb + p_value 
      ELSE usage_metrics.audio_storage_mb 
    END,
    transcript_tokens = CASE 
      WHEN p_metric = 'transcript_tokens' 
      THEN usage_metrics.transcript_tokens + p_value 
      ELSE usage_metrics.transcript_tokens 
    END,
    edge_function_calls = CASE 
      WHEN p_metric = 'edge_function_calls' 
      THEN usage_metrics.edge_function_calls + p_value 
      ELSE usage_metrics.edge_function_calls 
    END,
    updated_at = now()
  RETURNING CASE 
    WHEN p_metric = 'conversation_count' THEN conversation_count
    WHEN p_metric = 'call_minutes' THEN call_minutes
    WHEN p_metric = 'ai_message_count' THEN ai_message_count
    WHEN p_metric = 'audio_storage_mb' THEN audio_storage_mb
    WHEN p_metric = 'transcript_tokens' THEN transcript_tokens
    WHEN p_metric = 'edge_function_calls' THEN edge_function_calls
  END INTO v_current_value;

  -- Get plan limit
  SELECT CASE p_metric
    WHEN 'conversation_count' THEN 
      CASE p_plan_id
        WHEN 'starter' THEN 500
        WHEN 'professional' THEN 3000
        ELSE -1
      END
    WHEN 'call_minutes' THEN
      CASE p_plan_id
        WHEN 'starter' THEN 1000
        WHEN 'professional' THEN 5000
        ELSE -1
      END
    ELSE -1
  END INTO v_limit;

  -- Check if warning needed
  IF v_limit > 0 AND (v_current_value::numeric / v_limit) >= v_warning_threshold THEN
    INSERT INTO billing_events (
      organization_id,
      type,
      metadata
    ) VALUES (
      p_organization_id,
      'limit_warning',
      jsonb_build_object(
        'metric', p_metric,
        'current_value', v_current_value,
        'limit', v_limit,
        'usage_percentage', round((v_current_value::numeric / v_limit) * 100, 2)
      )
    );
  END IF;

  -- Log usage update
  INSERT INTO billing_events (
    organization_id,
    type,
    metadata
  ) VALUES (
    p_organization_id,
    'usage_update',
    jsonb_build_object(
      'metric', p_metric,
      'value', p_value,
      'new_total', v_current_value
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_organization_id uuid,
  p_plan_id text,
  p_metric text
)
RETURNS boolean AS $$
DECLARE
  v_current_usage integer;
  v_limit integer;
BEGIN
  -- Get current usage
  SELECT CASE p_metric
    WHEN 'conversation_count' THEN conversation_count
    WHEN 'call_minutes' THEN call_minutes
    WHEN 'ai_message_count' THEN ai_message_count
    WHEN 'audio_storage_mb' THEN audio_storage_mb
    WHEN 'transcript_tokens' THEN transcript_tokens
    WHEN 'edge_function_calls' THEN edge_function_calls
  END INTO v_current_usage
  FROM usage_metrics
  WHERE organization_id = p_organization_id
  AND month = date_trunc('month', current_date)::date;

  -- Get plan limit
  SELECT CASE p_metric
    WHEN 'conversation_count' THEN 
      CASE p_plan_id
        WHEN 'starter' THEN 500
        WHEN 'professional' THEN 3000
        ELSE -1
      END
    WHEN 'call_minutes' THEN
      CASE p_plan_id
        WHEN 'starter' THEN 1000
        WHEN 'professional' THEN 5000
        ELSE -1
      END
    ELSE -1
  END INTO v_limit;

  -- Check limit (-1 means unlimited)
  RETURN v_limit = -1 OR COALESCE(v_current_usage, 0) < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create monthly reset function
CREATE OR REPLACE FUNCTION reset_monthly_metrics()
RETURNS void AS $$
BEGIN
  -- Archive current month's metrics
  INSERT INTO billing_events (
    organization_id,
    type,
    metadata
  )
  SELECT
    organization_id,
    'usage_update'::billing_event_type,
    jsonb_build_object(
      'month', month,
      'final_metrics', to_jsonb(usage_metrics.*)
    )
  FROM usage_metrics
  WHERE month < date_trunc('month', current_date)::date;

  -- Reset metrics for new month
  INSERT INTO usage_metrics (
    organization_id,
    plan_id,
    month
  )
  SELECT DISTINCT
    organization_id,
    plan_id,
    date_trunc('month', current_date)::date
  FROM usage_metrics
  WHERE month < date_trunc('month', current_date)::date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE usage_metrics IS 'Stores detailed usage metrics per organization';
COMMENT ON TABLE billing_events IS 'Tracks billing-related events and notifications';

COMMENT ON FUNCTION increment_usage_metric IS 'Increments a specific usage metric and checks limits';
COMMENT ON FUNCTION check_usage_limit IS 'Checks if a specific usage metric is within plan limits';
COMMENT ON FUNCTION reset_monthly_metrics IS 'Resets usage metrics at the start of each month';