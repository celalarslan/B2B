/*
  # Create AI Training System Schema

  1. New Tables
    - conversations_transcript: Stores training data
    - conversation_labels: Manages annotations
    - ai_models: Tracks model versions
    - training_history: Records training runs
    - model_feedback: Stores user feedback
    - model_deployments: Tracks deployments

  2. Security
    - Enable RLS on all tables
    - Add organization isolation policies
    - Implement UUID validation

  3. Indexes & Constraints
    - Add performance indexes
    - Implement data validation
    - Ensure referential integrity
*/

-- Create enum types
CREATE TYPE model_provider AS ENUM ('openai', 'huggingface', 'anthropic', 'custom');
CREATE TYPE training_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
CREATE TYPE annotation_source AS ENUM ('human', 'ai', 'automated', 'user_feedback');
CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create conversations_transcript table
CREATE TABLE IF NOT EXISTS conversations_transcript (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_data_id uuid NOT NULL,
  sector_code text REFERENCES sectors(code) ON DELETE RESTRICT,
  content jsonb NOT NULL,
  language text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_validated boolean DEFAULT false,
  validation_score decimal(4,3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT valid_language CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  CONSTRAINT valid_validation_score CHECK (validation_score >= 0 AND validation_score <= 1)
);

-- Create conversation_labels table
CREATE TABLE IF NOT EXISTS conversation_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations_transcript(id) ON DELETE CASCADE,
  label_type text NOT NULL,
  label_value text NOT NULL,
  confidence_score decimal(4,3),
  annotation_source annotation_source NOT NULL,
  annotated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_status text DEFAULT 'pending',
  feedback_priority feedback_priority DEFAULT 'low',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Create ai_models table
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL,
  sector_code text REFERENCES sectors(code) ON DELETE RESTRICT,
  version text NOT NULL,
  provider model_provider NOT NULL,
  base_model text NOT NULL,
  training_metadata jsonb DEFAULT '{}'::jsonb,
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_model_version UNIQUE (model_id, version, organization_id)
);

-- Create training_history table
CREATE TABLE IF NOT EXISTS training_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ai_models(id) ON DELETE CASCADE,
  training_run_id text NOT NULL,
  parameters jsonb NOT NULL,
  results jsonb DEFAULT '{}'::jsonb,
  status training_status NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT valid_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  )
);

-- Create model_feedback table
CREATE TABLE IF NOT EXISTS model_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ai_models(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations_transcript(id) ON DELETE SET NULL,
  feedback_type text NOT NULL,
  feedback_content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_incorporated boolean DEFAULT false,
  priority feedback_priority DEFAULT 'low',
  created_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create model_deployments table
CREATE TABLE IF NOT EXISTS model_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES ai_models(id) ON DELETE CASCADE,
  environment text NOT NULL,
  status text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  deployed_at timestamptz DEFAULT now(),
  deployed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT valid_environment CHECK (environment IN ('development', 'staging', 'production'))
);

-- Create helper function for UUID validation
CREATE OR REPLACE FUNCTION is_valid_uuid(str text)
RETURNS boolean AS $$
BEGIN
  RETURN str IS NOT NULL AND str ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to safely cast to UUID
CREATE OR REPLACE FUNCTION safe_cast_uuid(str text)
RETURNS uuid AS $$
BEGIN
  IF is_valid_uuid(str) THEN
    RETURN str::uuid;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create indexes
CREATE INDEX idx_transcript_sector ON conversations_transcript(sector_code);
CREATE INDEX idx_transcript_language ON conversations_transcript(language);
CREATE INDEX idx_transcript_organization ON conversations_transcript(organization_id);
CREATE INDEX idx_transcript_validation ON conversations_transcript(is_validated, validation_score);
CREATE INDEX idx_transcript_content ON conversations_transcript USING gin (content jsonb_path_ops);

CREATE INDEX idx_labels_conversation ON conversation_labels(conversation_id);
CREATE INDEX idx_labels_type_value ON conversation_labels(label_type, label_value);
CREATE INDEX idx_labels_priority ON conversation_labels(feedback_priority);
CREATE INDEX idx_labels_confidence ON conversation_labels(confidence_score);

CREATE INDEX idx_models_sector ON ai_models(sector_code);
CREATE INDEX idx_models_active ON ai_models(is_active);
CREATE INDEX idx_models_organization ON ai_models(organization_id);
CREATE INDEX idx_models_performance ON ai_models USING gin (performance_metrics jsonb_path_ops);

CREATE INDEX idx_training_model ON training_history(model_id);
CREATE INDEX idx_training_status ON training_history(status);
CREATE INDEX idx_training_dates ON training_history(started_at, completed_at);
CREATE INDEX idx_training_organization ON training_history(organization_id);

CREATE INDEX idx_feedback_model ON model_feedback(model_id);
CREATE INDEX idx_feedback_priority ON model_feedback(priority);
CREATE INDEX idx_feedback_incorporated ON model_feedback(is_incorporated);
CREATE INDEX idx_feedback_organization ON model_feedback(organization_id);

CREATE INDEX idx_deployments_model ON model_deployments(model_id);
CREATE INDEX idx_deployments_environment ON model_deployments(environment);
CREATE INDEX idx_deployments_organization ON model_deployments(organization_id);

-- Enable RLS
ALTER TABLE conversations_transcript ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization isolation for transcripts"
  ON conversations_transcript
  FOR ALL
  TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Organization isolation for labels"
  ON conversation_labels
  FOR ALL
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations_transcript
      WHERE organization_id = (auth.jwt() ->> 'organization_id')::uuid
    )
  );

CREATE POLICY "Organization isolation for models"
  ON ai_models
  FOR ALL
  TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Organization isolation for training"
  ON training_history
  FOR ALL
  TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Organization isolation for feedback"
  ON model_feedback
  FOR ALL
  TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Organization isolation for deployments"
  ON model_deployments
  FOR ALL
  TO authenticated
  USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

-- Add check constraints
ALTER TABLE conversations_transcript
  ADD CONSTRAINT valid_training_data_id 
  CHECK (is_valid_uuid(training_data_id::text));

ALTER TABLE conversation_labels
  ADD CONSTRAINT valid_conversation_id 
  CHECK (is_valid_uuid(conversation_id::text));

ALTER TABLE training_history
  ADD CONSTRAINT valid_model_id 
  CHECK (is_valid_uuid(model_id::text));

ALTER TABLE model_feedback
  ADD CONSTRAINT valid_model_feedback_ids
  CHECK (
    is_valid_uuid(model_id::text) AND
    (conversation_id IS NULL OR is_valid_uuid(conversation_id::text))
  );

ALTER TABLE model_deployments
  ADD CONSTRAINT valid_deployment_model_id
  CHECK (is_valid_uuid(model_id::text));

-- Create function for timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for timestamp updates
CREATE TRIGGER update_conversations_transcript_modtime
    BEFORE UPDATE ON conversations_transcript
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_labels_modtime
    BEFORE UPDATE ON conversation_labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_modtime
    BEFORE UPDATE ON ai_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE conversations_transcript IS 'Stores training data with sector-specific content';
COMMENT ON TABLE conversation_labels IS 'Manages annotations and feedback for training data';
COMMENT ON TABLE ai_models IS 'Tracks AI model versions and configurations';
COMMENT ON TABLE training_history IS 'Records model training runs and results';
COMMENT ON TABLE model_feedback IS 'Stores user feedback for model improvements';
COMMENT ON TABLE model_deployments IS 'Tracks model deployment status and configuration';
COMMENT ON FUNCTION is_valid_uuid IS 'Validates if a string is a valid UUID';
COMMENT ON FUNCTION safe_cast_uuid IS 'Safely casts a string to UUID, returns NULL if invalid';