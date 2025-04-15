/*
  # Pricing Plans Schema Update

  1. New Table
    - pricing_plans
      - Core plan information
      - Usage limits
      - Timestamps and tracking
  
  2. Changes
    - Create table if not exists
    - Insert/update default plans
    - Add validation constraints
    - Add indexes for performance
*/

-- Create pricing_plans table
CREATE TABLE IF NOT EXISTS pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  price_usd decimal(10,2) NOT NULL CHECK (price_usd >= 0),
  description text NOT NULL,
  max_conversations integer CHECK (max_conversations > 0 OR max_conversations IS NULL),
  max_tokens integer CHECK (max_tokens > 0 OR max_tokens IS NULL),
  max_characters_tts integer CHECK (max_characters_tts > 0 OR max_characters_tts IS NULL),
  max_stt_minutes integer CHECK (max_stt_minutes > 0 OR max_stt_minutes IS NULL),
  is_custom boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pricing_plans_slug ON pricing_plans(slug);
CREATE INDEX IF NOT EXISTS idx_pricing_plans_is_active ON pricing_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_plans_price ON pricing_plans(price_usd) WHERE NOT is_custom;

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_pricing_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_updated
CREATE TRIGGER update_pricing_plan_last_updated
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_plan_timestamp();

-- Insert or update plans
INSERT INTO pricing_plans (
  slug,
  name,
  price_usd,
  description,
  max_conversations,
  max_tokens,
  max_characters_tts,
  max_stt_minutes,
  is_custom
) VALUES
  (
    'trial',
    'Trial',
    0,
    '1-month free trial with limited usage',
    100,
    100000,
    100000,
    100,
    false
  ),
  (
    'starter',
    'Starter',
    25,
    'Perfect for small businesses starting with AI',
    500,
    500000,
    500000,
    300,
    false
  ),
  (
    'professional',
    'Professional',
    75,
    'Ideal for growing businesses',
    2000,
    2000000,
    2000000,
    1000,
    false
  ),
  (
    'enterprise',
    'Enterprise',
    500,
    'Full-featured AI solution for large teams',
    10000,
    10000000,
    10000000,
    5000,
    false
  ),
  (
    'custom',
    'Custom',
    0,
    'Contact us for a tailored solution',
    NULL,
    NULL,
    NULL,
    NULL,
    true
  )
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  price_usd = EXCLUDED.price_usd,
  description = EXCLUDED.description,
  max_conversations = EXCLUDED.max_conversations,
  max_tokens = EXCLUDED.max_tokens,
  max_characters_tts = EXCLUDED.max_characters_tts,
  max_stt_minutes = EXCLUDED.max_stt_minutes,
  is_custom = EXCLUDED.is_custom,
  last_updated = now();

-- Add RLS policies
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to pricing plans"
  ON pricing_plans
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can modify pricing plans"
  ON pricing_plans
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

-- Add comments
COMMENT ON TABLE pricing_plans IS 'Stores subscription plan configurations and limits';
COMMENT ON COLUMN pricing_plans.slug IS 'Unique identifier for the plan';
COMMENT ON COLUMN pricing_plans.price_usd IS 'Monthly price in USD';
COMMENT ON COLUMN pricing_plans.max_conversations IS 'Maximum number of conversations per month';
COMMENT ON COLUMN pricing_plans.max_tokens IS 'Maximum number of tokens per month';
COMMENT ON COLUMN pricing_plans.max_characters_tts IS 'Maximum number of characters for text-to-speech per month';
COMMENT ON COLUMN pricing_plans.max_stt_minutes IS 'Maximum number of speech-to-text minutes per month';
COMMENT ON COLUMN pricing_plans.is_custom IS 'Indicates if this is a custom plan requiring manual setup';