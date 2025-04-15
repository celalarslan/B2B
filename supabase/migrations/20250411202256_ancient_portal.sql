/*
  # NLP System Schema Update

  1. New Tables
    - conversation_labels: Intent and sentiment analysis
    - conversation_entities: Named entity recognition
    - conversation_topics: Topic clustering
    - nlp_feedback: Model improvement feedback
    
  2. Security
    - Enable RLS on all tables
    - Add organization-level isolation
    - Implement audit logging
*/

-- Create enum types if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_source') THEN
    CREATE TYPE annotation_source AS ENUM ('human', 'ai', 'automated', 'user_feedback');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_priority') THEN
    CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS conversation_labels CASCADE;
DROP TABLE IF EXISTS conversation_entities CASCADE;
DROP TABLE IF EXISTS conversation_topics CASCADE;
DROP TABLE IF EXISTS nlp_feedback CASCADE;

-- Create conversation_labels table
CREATE TABLE conversation_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  label_type text NOT NULL,
  label_value text NOT NULL,
  confidence_score decimal(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  emotion text CHECK (emotion IN ('joy', 'anger', 'sadness', 'neutral', 'frustration')),
  language varchar(5) DEFAULT 'en',
  source annotation_source NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  CONSTRAINT valid_label_language CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

-- Create conversation_entities table
CREATE TABLE conversation_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('name', 'location', 'product', 'date', 'amount')),
  entity_value text NOT NULL,
  start_position integer,
  end_position integer,
  confidence_score decimal(4,3) CHECK (confidence_score BETWEEN 0 AND 1),
  language varchar(5) DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  CONSTRAINT valid_entity_language CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  CONSTRAINT valid_position CHECK (start_position <= end_position)
);

-- Create conversation_topics table
CREATE TABLE conversation_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  confidence_score decimal(4,3) CHECK (confidence_score >= 0.7),
  keywords text[] DEFAULT '{}',
  language varchar(5) DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  CONSTRAINT valid_topic_language CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

-- Create nlp_feedback table
CREATE TABLE nlp_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  original_classification jsonb NOT NULL,
  corrected_classification jsonb NOT NULL,
  feedback_type text NOT NULL,
  priority feedback_priority DEFAULT 'low',
  notes text,
  submitted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  is_processed boolean DEFAULT false
);

-- Create extension for text search if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes with IF NOT EXISTS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_labels_conversation') THEN
    CREATE INDEX idx_labels_conversation ON conversation_labels(conversation_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_labels_type') THEN
    CREATE INDEX idx_labels_type ON conversation_labels(label_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_labels_value') THEN
    CREATE INDEX idx_labels_value ON conversation_labels(label_value);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_labels_emotion') THEN
    CREATE INDEX idx_labels_emotion ON conversation_labels(emotion);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_labels_confidence') THEN
    CREATE INDEX idx_labels_confidence ON conversation_labels(confidence_score);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_labels_organization') THEN
    CREATE INDEX idx_labels_organization ON conversation_labels(organization_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_entities_conversation') THEN
    CREATE INDEX idx_entities_conversation ON conversation_entities(conversation_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_entities_type') THEN
    CREATE INDEX idx_entities_type ON conversation_entities(entity_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_entities_value') THEN
    CREATE INDEX idx_entities_value ON conversation_entities USING gin (entity_value gin_trgm_ops);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_entities_confidence') THEN
    CREATE INDEX idx_entities_confidence ON conversation_entities(confidence_score);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_entities_organization') THEN
    CREATE INDEX idx_entities_organization ON conversation_entities(organization_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_conversation') THEN
    CREATE INDEX idx_topics_conversation ON conversation_topics(conversation_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_name') THEN
    CREATE INDEX idx_topics_name ON conversation_topics USING gin (topic_name gin_trgm_ops);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_keywords') THEN
    CREATE INDEX idx_topics_keywords ON conversation_topics USING gin (keywords);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_confidence') THEN
    CREATE INDEX idx_topics_confidence ON conversation_topics(confidence_score);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_topics_organization') THEN
    CREATE INDEX idx_topics_organization ON conversation_topics(organization_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_conversation') THEN
    CREATE INDEX idx_feedback_conversation ON nlp_feedback(conversation_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_type') THEN
    CREATE INDEX idx_feedback_type ON nlp_feedback(feedback_type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_priority') THEN
    CREATE INDEX idx_feedback_priority ON nlp_feedback(priority);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_processed') THEN
    CREATE INDEX idx_feedback_processed ON nlp_feedback(is_processed) WHERE NOT is_processed;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_organization') THEN
    CREATE INDEX idx_feedback_organization ON nlp_feedback(organization_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlp_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization isolation for labels"
  ON conversation_labels
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for entities"
  ON conversation_entities
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for topics"
  ON conversation_topics
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

CREATE POLICY "Organization isolation for feedback"
  ON nlp_feedback
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  ));

-- Add comments
COMMENT ON TABLE conversation_labels IS 'Stores conversation intent and sentiment analysis';
COMMENT ON TABLE conversation_entities IS 'Stores named entities extracted from conversations';
COMMENT ON TABLE conversation_topics IS 'Stores conversation topic clustering results';
COMMENT ON TABLE nlp_feedback IS 'Stores user feedback for NLP model improvement';