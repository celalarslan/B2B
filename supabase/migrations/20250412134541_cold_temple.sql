/*
  # Fix Organization Policy Migration

  1. Changes
    - Drop existing policy if it exists
    - Create new policy with correct table name
    - Add organization_id check to policy
*/

-- Drop existing policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Organization isolation for transcripts'
    AND tablename = 'conversations_transcript'
  ) THEN
    DROP POLICY IF EXISTS "Organization isolation for transcripts" ON conversations_transcript;
  END IF;
END $$;

-- Create new policy with correct table name and organization check
CREATE POLICY "Organization isolation for transcripts"
ON conversations_transcript
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

-- Add comment
COMMENT ON POLICY "Organization isolation for transcripts" ON conversations_transcript
IS 'Restricts access to transcripts based on organization membership';