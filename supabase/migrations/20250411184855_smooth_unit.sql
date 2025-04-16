/*
  # Tagging System Implementation

  1. New Tables
    - tags: Stores tag definitions with organization scope
    - conversation_tags: Maps tags to conversations
    - customer_tags: Maps tags to customers

  2. Security
    - Enable RLS on all tables
    - Create policies for organization-based access
    - Add audit triggers for tag changes

  3. Indexes
    - Optimize tag search and filtering
    - Support efficient tag usage analytics
*/

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name varchar(100) NOT NULL,
  category varchar(50),
  color varchar(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  language varchar(5),
  is_system_tag boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (organization_id, name, language)
);

-- Create conversation_tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_ai_suggested boolean DEFAULT false,
  confidence_score decimal(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  PRIMARY KEY (conversation_id, tag_id)
);

-- Create customer_tags table
CREATE TABLE IF NOT EXISTS customer_tags (
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (customer_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tags_organization ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_language ON tags(language) WHERE language IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_archived ON tags(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag ON conversation_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_ai ON conversation_tags(is_ai_suggested) WHERE is_ai_suggested = true;
CREATE INDEX IF NOT EXISTS idx_conversation_tags_confidence ON conversation_tags(confidence_score) WHERE is_ai_suggested = true;

CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag_id);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tags in their organization"
ON tags
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

CREATE POLICY "Admins can manage tags"
ON tags
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

CREATE POLICY "Users can view conversation tags"
ON conversation_tags
FOR SELECT
TO authenticated
USING (
  tag_id IN (
    SELECT t.id
    FROM tags t
    WHERE t.organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage conversation tags"
ON conversation_tags
FOR ALL
TO authenticated
USING (
  tag_id IN (
    SELECT t.id
    FROM tags t
    WHERE t.organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND (
        ou.roles @> '[{"role": "admin"}]'::jsonb OR
        ou.roles @> '[{"role": "agent"}]'::jsonb
      )
    )
  )
);

CREATE POLICY "Users can view customer tags"
ON customer_tags
FOR SELECT
TO authenticated
USING (
  tag_id IN (
    SELECT t.id
    FROM tags t
    WHERE t.organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage customer tags"
ON customer_tags
FOR ALL
TO authenticated
USING (
  tag_id IN (
    SELECT t.id
    FROM tags t
    WHERE t.organization_id IN (
      SELECT o.id 
      FROM organizations o
      INNER JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND (
        ou.roles @> '[{"role": "admin"}]'::jsonb OR
        ou.roles @> '[{"role": "agent"}]'::jsonb
      )
    )
  )
);

-- Create function to increment tag usage count
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tags
  SET usage_count = usage_count + 1
  WHERE id = NEW.tag_id;
  RETURN NEW;
END;
$$;

-- Create function to decrement tag usage count
CREATE OR REPLACE FUNCTION decrement_tag_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tags
  SET usage_count = GREATEST(0, usage_count - 1)
  WHERE id = OLD.tag_id;
  RETURN OLD;
END;
$$;

-- Create triggers for usage tracking
CREATE TRIGGER track_conversation_tag_usage
  AFTER INSERT ON conversation_tags
  FOR EACH ROW
  EXECUTE FUNCTION increment_tag_usage();

CREATE TRIGGER track_conversation_tag_removal
  AFTER DELETE ON conversation_tags
  FOR EACH ROW
  EXECUTE FUNCTION decrement_tag_usage();

CREATE TRIGGER track_customer_tag_usage
  AFTER INSERT ON customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION increment_tag_usage();

CREATE TRIGGER track_customer_tag_removal
  AFTER DELETE ON customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION decrement_tag_usage();

-- Add comments
COMMENT ON TABLE tags IS 'Stores tag definitions with multi-language support and categorization';
COMMENT ON TABLE conversation_tags IS 'Maps tags to conversations with AI suggestion support';
COMMENT ON TABLE customer_tags IS 'Maps tags to customers for categorization';

COMMENT ON COLUMN tags.color IS 'Hex color code for tag visualization';
COMMENT ON COLUMN tags.is_system_tag IS 'Indicates if tag is system-defined or user-created';
COMMENT ON COLUMN tags.usage_count IS 'Number of times tag has been used';
COMMENT ON COLUMN conversation_tags.is_ai_suggested IS 'Indicates if tag was suggested by AI';
COMMENT ON COLUMN conversation_tags.confidence_score IS 'AI confidence score for suggested tags';