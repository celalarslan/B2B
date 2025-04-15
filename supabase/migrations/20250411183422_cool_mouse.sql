/*
  # Transcript Analysis System Migration

  1. New Columns
    - Added to conversations table:
      * transcript: TEXT (raw conversation content)
      * summary: VARCHAR(500) (AI-generated synopsis)
      * sentiment_score: DECIMAL(3,2) (-1 to 1 range)
      * keywords: TEXT[] (extracted key terms)
      * tags: TEXT[] (categorization labels)
      * language_code: VARCHAR(5) (ISO language code)
      * analysis_status: VARCHAR(20) (pending/completed/failed)
      * last_analyzed_at: TIMESTAMP
      * model_version: VARCHAR(50)

  2. New Tables
    - transcript_analysis_logs: Tracks analysis operations and errors

  3. Security
    - RLS policies for analysis data
    - Audit logging for analysis operations
*/

-- Add new columns to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS summary varchar(500),
ADD COLUMN IF NOT EXISTS sentiment_score decimal(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS language_code varchar(5),
ADD COLUMN IF NOT EXISTS analysis_status varchar(20) CHECK (analysis_status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS last_analyzed_at timestamptz,
ADD COLUMN IF NOT EXISTS model_version varchar(50);

-- Create transcript analysis logs table
CREATE TABLE IF NOT EXISTS transcript_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action varchar(50) NOT NULL,
  status varchar(20) CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for new columns and table
CREATE INDEX IF NOT EXISTS idx_conversations_analysis_status ON conversations(analysis_status);
CREATE INDEX IF NOT EXISTS idx_conversations_language ON conversations(language_code);
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON conversations(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_conversations_last_analyzed ON conversations(last_analyzed_at);
CREATE INDEX IF NOT EXISTS idx_conversations_keywords ON conversations USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON conversations USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_analysis_logs_conversation ON transcript_analysis_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_status ON transcript_analysis_logs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_created ON transcript_analysis_logs(created_at);

-- Enable RLS on new table
ALTER TABLE transcript_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transcript analysis logs
CREATE POLICY "Users can view analysis logs for their organization's conversations"
ON transcript_analysis_logs
FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT c.id
    FROM conversations c
    WHERE c.organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  )
);

-- Create function to log analysis operations
CREATE OR REPLACE FUNCTION log_transcript_analysis(
  p_conversation_id uuid,
  p_action varchar(50),
  p_status varchar(20),
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO transcript_analysis_logs (
    conversation_id,
    user_id,
    action,
    status,
    error_message,
    metadata
  ) VALUES (
    p_conversation_id,
    auth.uid(),
    p_action,
    p_status,
    p_error_message,
    p_metadata
  );
END;
$$;

-- Create function to update analysis status
CREATE OR REPLACE FUNCTION update_analysis_status(
  p_conversation_id uuid,
  p_status varchar(20),
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET 
    analysis_status = p_status,
    last_analyzed_at = CASE 
      WHEN p_status = 'completed' THEN now()
      ELSE last_analyzed_at
    END,
    metadata = CASE 
      WHEN p_error_message IS NOT NULL 
      THEN jsonb_set(
        metadata,
        '{analysis_error}',
        to_jsonb(p_error_message)
      )
      ELSE metadata
    END
  WHERE id = p_conversation_id;

  -- Log the status change
  PERFORM log_transcript_analysis(
    p_conversation_id,
    'status_update',
    p_status,
    p_error_message
  );
END;
$$;

-- Create function to check analysis queue status
CREATE OR REPLACE FUNCTION get_pending_analysis_count(p_organization_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count integer;
BEGIN
  SELECT COUNT(*)
  INTO pending_count
  FROM conversations
  WHERE organization_id = p_organization_id
    AND analysis_status = 'pending';
    
  RETURN pending_count;
END;
$$;

COMMENT ON TABLE transcript_analysis_logs IS 'Tracks transcript analysis operations and errors';
COMMENT ON COLUMN conversations.transcript IS 'Raw conversation content';
COMMENT ON COLUMN conversations.summary IS 'AI-generated conversation synopsis';
COMMENT ON COLUMN conversations.sentiment_score IS 'Conversation sentiment score (-1 to 1)';
COMMENT ON COLUMN conversations.keywords IS 'Array of extracted key terms';
COMMENT ON COLUMN conversations.tags IS 'Array of categorization labels';
COMMENT ON COLUMN conversations.language_code IS 'ISO 639-1/2 language code';
COMMENT ON COLUMN conversations.analysis_status IS 'Current status of transcript analysis';
COMMENT ON COLUMN conversations.last_analyzed_at IS 'Timestamp of last successful analysis';
COMMENT ON COLUMN conversations.model_version IS 'Version of AI model used for analysis';