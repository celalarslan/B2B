/*
  # Organization Schema Audit and Fix

  1. Changes
    - Add organization_id to tables missing it
    - Create indexes for organization_id columns
    - Update RLS policies for organization isolation
    - Add cascading rules for organization deletion

  2. Tables Modified
    - conversations_transcript
    - conversation_labels
    - conversation_entities
    - conversation_topics
    - nlp_feedback
    - model_feedback
    - model_deployments
    - training_history
    - recordings
*/

-- Function to check if column exists
CREATE OR REPLACE FUNCTION column_exists(
  p_table text,
  p_column text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = p_table
    AND column_name = p_column
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all tables first
ALTER TABLE conversations_transcript ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlp_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Add organization_id columns and indexes
DO $$ 
BEGIN
  -- conversations_transcript
  IF NOT column_exists('conversations_transcript', 'organization_id') THEN
    ALTER TABLE conversations_transcript
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_transcript_organization 
    ON conversations_transcript(organization_id);
  END IF;

  -- conversation_labels
  IF NOT column_exists('conversation_labels', 'organization_id') THEN
    ALTER TABLE conversation_labels
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_labels_organization 
    ON conversation_labels(organization_id);
  END IF;

  -- conversation_entities
  IF NOT column_exists('conversation_entities', 'organization_id') THEN
    ALTER TABLE conversation_entities
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_entities_organization 
    ON conversation_entities(organization_id);
  END IF;

  -- conversation_topics
  IF NOT column_exists('conversation_topics', 'organization_id') THEN
    ALTER TABLE conversation_topics
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_topics_organization 
    ON conversation_topics(organization_id);
  END IF;

  -- nlp_feedback
  IF NOT column_exists('nlp_feedback', 'organization_id') THEN
    ALTER TABLE nlp_feedback
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_feedback_organization 
    ON nlp_feedback(organization_id);
  END IF;

  -- model_feedback
  IF NOT column_exists('model_feedback', 'organization_id') THEN
    ALTER TABLE model_feedback
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_model_feedback_organization 
    ON model_feedback(organization_id);
  END IF;

  -- model_deployments
  IF NOT column_exists('model_deployments', 'organization_id') THEN
    ALTER TABLE model_deployments
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_deployments_organization 
    ON model_deployments(organization_id);
  END IF;

  -- training_history
  IF NOT column_exists('training_history', 'organization_id') THEN
    ALTER TABLE training_history
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_training_organization 
    ON training_history(organization_id);
  END IF;

  -- recordings
  IF NOT column_exists('recordings', 'organization_id') THEN
    ALTER TABLE recordings
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_recordings_organization 
    ON recordings(organization_id);
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Organization isolation for transcripts" ON conversations_transcript;
  DROP POLICY IF EXISTS "Organization isolation for labels" ON conversation_labels;
  DROP POLICY IF EXISTS "Organization isolation for entities" ON conversation_entities;
  DROP POLICY IF EXISTS "Organization isolation for topics" ON conversation_topics;
  DROP POLICY IF EXISTS "Organization isolation for feedback" ON nlp_feedback;
  DROP POLICY IF EXISTS "Organization isolation for model feedback" ON model_feedback;
  DROP POLICY IF EXISTS "Organization isolation for deployments" ON model_deployments;
  DROP POLICY IF EXISTS "Organization isolation for training" ON training_history;
  DROP POLICY IF EXISTS "Organization isolation for recordings" ON recordings;
END $$;

-- Create new policies
CREATE POLICY "Organization isolation for transcripts" ON conversations_transcript
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for labels" ON conversation_labels
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for entities" ON conversation_entities
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for topics" ON conversation_topics
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for feedback" ON nlp_feedback
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for model feedback" ON model_feedback
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for deployments" ON model_deployments
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for training" ON training_history
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for recordings" ON recordings
  FOR ALL TO authenticated
  USING (organization_id IN (
    SELECT o.id FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

-- Create verification function
CREATE OR REPLACE FUNCTION verify_organization_schema()
RETURNS TABLE (
  table_name text,
  has_organization_id boolean,
  has_index boolean,
  has_rls boolean,
  has_policy boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    column_exists(t.table_name::text, 'organization_id'),
    EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = t.table_name 
      AND indexname LIKE '%organization%'
    ),
    t.rowsecurity,
    EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = t.table_name 
      AND policyname LIKE '%organization%'
    )
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.table_name IN (
    'conversations_transcript',
    'conversation_labels',
    'conversation_entities',
    'conversation_topics',
    'nlp_feedback',
    'model_feedback',
    'model_deployments',
    'training_history',
    'recordings'
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION verify_organization_schema IS 'Verifies organization schema implementation across tables';
COMMENT ON FUNCTION column_exists IS 'Checks if a column exists in a table';