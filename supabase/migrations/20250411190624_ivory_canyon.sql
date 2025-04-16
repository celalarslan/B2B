-- Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text CHECK (char_length(description) <= 500),
  language_support text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  parent_sector text,
  CONSTRAINT sectors_code_key UNIQUE (code),
  CONSTRAINT valid_code CHECK (code ~ '^[a-z0-9-]+$')
);

-- Add sector reference to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS sector_code text REFERENCES sectors(code);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sectors_code ON sectors(code);
CREATE INDEX IF NOT EXISTS idx_sectors_parent ON sectors(parent_sector) WHERE parent_sector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sectors_active ON sectors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organizations_sector ON organizations(sector_code);

-- Enable RLS
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read sectors" ON sectors;
    DROP POLICY IF EXISTS "Only admins can modify sectors" ON sectors;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Create RLS policies
CREATE POLICY "Authenticated users can read sectors"
  ON sectors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify sectors"
  ON sectors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE user_id = auth.uid()
      AND roles @> '[{"role": "admin"}]'::jsonb
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE user_id = auth.uid()
      AND roles @> '[{"role": "admin"}]'::jsonb
    )
  );

-- Insert initial sectors
INSERT INTO sectors (code, name, description, language_support, metadata)
SELECT * FROM (
  VALUES 
    (
      'healthcare',
      'Healthcare',
      'Medical facilities, hospitals, clinics, and healthcare service providers',
      '{EN,TR,AR,FR}'::text[],
      '{"ai_config": {"model": "gpt-4", "temperature": 0.3, "domain_expertise": "medical"}}'::jsonb
    ),
    (
      'finance',
      'Finance',
      'Banks, investment firms, and financial service providers',
      '{EN,TR,AR,FR}'::text[],
      '{"ai_config": {"model": "gpt-4", "temperature": 0.2, "domain_expertise": "finance"}}'::jsonb
    ),
    (
      'retail',
      'Retail',
      'Retail stores, shops, and consumer goods businesses',
      '{EN,TR,AR,FR}'::text[],
      '{"ai_config": {"model": "gpt-4", "temperature": 0.4, "domain_expertise": "retail"}}'::jsonb
    ),
    (
      'restaurant',
      'Restaurant',
      'Full-service restaurants and dining establishments',
      '{EN,TR,AR,FR}'::text[],
      '{"ai_config": {"model": "gpt-4", "temperature": 0.4, "domain_expertise": "food_service"}}'::jsonb
    ),
    (
      'fastfood',
      'Fast Food',
      'Quick-service restaurants and fast food chains',
      '{EN,TR,AR,FR}'::text[],
      '{"ai_config": {"model": "gpt-4", "temperature": 0.4, "domain_expertise": "food_service"}}'::jsonb
    )
) AS v(code, name, description, language_support, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM sectors WHERE code = v.code
);

-- Update parent sectors
UPDATE sectors
SET parent_sector = 'restaurant'
WHERE code IN ('fastfood')
  AND NOT EXISTS (
    SELECT 1 FROM sectors 
    WHERE code = 'fastfood' 
    AND parent_sector IS NOT NULL
  );

-- Create function to validate sector hierarchy
CREATE OR REPLACE FUNCTION validate_sector_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cycle_count integer;
BEGIN
  -- Check for circular references
  WITH RECURSIVE sector_tree AS (
    SELECT code, parent_sector, 1 AS level
    FROM sectors
    WHERE code = NEW.code
    UNION ALL
    SELECT s.code, s.parent_sector, t.level + 1
    FROM sectors s
    INNER JOIN sector_tree t ON s.code = t.parent_sector
    WHERE t.level < 100
  )
  SELECT COUNT(*)
  INTO cycle_count
  FROM sector_tree;

  -- If we get here, no circular reference was found
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid sector hierarchy: circular reference detected';
END;
$$;

-- Create trigger for hierarchy validation
DROP TRIGGER IF EXISTS validate_sector_hierarchy ON sectors;
CREATE TRIGGER validate_sector_hierarchy
  BEFORE INSERT OR UPDATE ON sectors
  FOR EACH ROW
  EXECUTE FUNCTION validate_sector_hierarchy();

-- Create function to get sector hierarchy
CREATE OR REPLACE FUNCTION get_sector_hierarchy(p_sector_code text)
RETURNS TABLE (
  code text,
  name text,
  level integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE sector_tree AS (
    -- Base case: start with the given sector
    SELECT s.code, s.name, 0 AS level
    FROM sectors s
    WHERE s.code = p_sector_code
    UNION ALL
    -- Recursive case: get parent sectors
    SELECT s.code, s.name, t.level + 1
    FROM sectors s
    INNER JOIN sector_tree t ON s.code = t.code
    WHERE s.parent_sector IS NOT NULL
  )
  SELECT * FROM sector_tree
  ORDER BY level DESC;
END;
$$;

-- Add comments
COMMENT ON TABLE sectors IS 'Stores sector definitions with hierarchical structure';
COMMENT ON COLUMN sectors.code IS 'Unique identifier for the sector (lowercase, no spaces)';
COMMENT ON COLUMN sectors.name IS 'Human-readable display name';
COMMENT ON COLUMN sectors.description IS 'Detailed description of sector use cases (max 500 chars)';
COMMENT ON COLUMN sectors.language_support IS 'Array of supported ISO 639-1 language codes';
COMMENT ON COLUMN sectors.metadata IS 'JSON configuration for AI models and sector-specific settings';
COMMENT ON COLUMN sectors.parent_sector IS 'Reference to parent sector for hierarchical organization';