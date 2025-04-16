/*
  # Add Organization ID to Conversations

  1. Changes
    - Add organization_id column to conversations table
    - Create foreign key constraint to organizations table
    - Create index for organization_id
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add organization-based access policies
*/

-- Add organization_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE conversations 
    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'conversations' 
    AND indexname = 'idx_conversations_organization'
  ) THEN
    CREATE INDEX idx_conversations_organization ON conversations(organization_id);
  END IF;
END $$;

-- Update RLS policies
DROP POLICY IF EXISTS "org_isolation" ON conversations;

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

-- Add comment explaining the column
COMMENT ON COLUMN conversations.organization_id IS 'References the organization that owns this conversation';