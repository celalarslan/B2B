/*
  # Audio Recording System Migration

  1. New Tables
    - conversations: Stores conversation metadata and audio file info
    - audio_access_logs: Tracks recording access and audit trail
  
  2. Security
    - RLS policies for organization-level isolation
    - Audit logging functions
    - Cleanup automation
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  audio_file_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_seconds integer,
  status text CHECK (status IN ('pending', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audio access logs table
CREATE TABLE IF NOT EXISTS audio_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  access_timestamp timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_audio_logs_conversation ON audio_access_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audio_logs_user ON audio_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_logs_timestamp ON audio_access_logs(access_timestamp DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "org_isolation" ON conversations
FOR ALL USING (
  organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    AND (
      ou.roles @> '[{"role": "admin"}]'::jsonb OR
      ou.roles @> '[{"role": "agent"}]'::jsonb OR
      ou.roles @> '[{"role": "ai_assistant"}]'::jsonb
    )
  )
);

CREATE POLICY "access_log_isolation" ON audio_access_logs
FOR ALL USING (
  conversation_id IN (
    SELECT c.id
    FROM conversations c
    WHERE c.organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  )
);

-- Create function to log audio access
CREATE OR REPLACE FUNCTION log_audio_access(
  p_conversation_id uuid,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audio_access_logs (
    conversation_id,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    p_conversation_id,
    auth.uid(),
    inet_client_addr(),
    COALESCE(p_user_agent, current_setting('request.headers', true)::json->>'user-agent')
  );
END;
$$;

-- Create function to clean up old recordings
CREATE OR REPLACE FUNCTION cleanup_old_recordings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark recordings older than 90 days for deletion
  UPDATE conversations
  SET metadata = jsonb_set(
    metadata,
    '{status}',
    '"expired"'
  )
  WHERE created_at < now() - interval '90 days'
  AND (metadata->>'status')::text != 'expired';
END;
$$;