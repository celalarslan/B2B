/*
  # Add Organization ID to Required Tables

  1. Changes
    - Add organization_id column to:
      - conversations table
      - user_profiles table
    - Create foreign key constraints
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add organization-based access control
*/

-- Add organization_id to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_organization 
ON conversations(organization_id);

-- Update conversations RLS policy
DROP POLICY IF EXISTS "Users can access their organization's conversations" ON conversations;
CREATE POLICY "Users can access their organization's conversations"
ON conversations
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
  )
);

-- Add organization_id to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_organization 
ON user_profiles(organization_id);

-- Update user_profiles RLS policy
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
CREATE POLICY "Users can view profiles in their organization"
ON user_profiles
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

-- Note: customers table already has organization_id column