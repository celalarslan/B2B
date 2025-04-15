/*
  # Audio Management System Schema

  1. New Tables
    - `recordings` table for storing audio file metadata
      - id (uuid, primary key)
      - conversation_id (uuid, references conversations)
      - organization_id (uuid, required)
      - file_path (text, required)
      - file_size (integer)
      - duration_seconds (integer)
      - mime_type (varchar)
      - uploaded_by (uuid, references auth.users)
      - uploaded_at (timestamp)
      - last_accessed_at (timestamp)
      - status (varchar)

  2. Security
    - Enable RLS on recordings table
    - Add policy for organization isolation
    - Add policy for role-based access

  3. Functions
    - check_recording_access() for validating user permissions
    - cleanup_old_recordings() for automatic deletion
*/

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  duration_seconds integer,
  mime_type varchar(50),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz,
  status varchar(20) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recordings_conversation ON recordings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_recordings_organization ON recordings(organization_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_uploaded_at ON recordings(uploaded_at DESC);

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access recordings in their organization"
ON recordings
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT o.id 
    FROM organizations o
    INNER JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = auth.uid()
    AND ou.roles @> '[{"role": "admin"}]'::jsonb
    OR ou.roles @> '[{"role": "agent"}]'::jsonb
    OR ou.roles @> '[{"role": "supervisor"}]'::jsonb
  )
);

-- Create function to check recording access
CREATE OR REPLACE FUNCTION check_recording_access(p_recording_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id uuid;
  v_user_roles jsonb;
BEGIN
  -- Get recording's organization and user's roles
  SELECT r.organization_id, ou.roles
  INTO v_organization_id, v_user_roles
  FROM recordings r
  INNER JOIN organization_users ou 
    ON r.organization_id = ou.organization_id
  WHERE r.id = p_recording_id
    AND ou.user_id = auth.uid();

  -- Check if user has required role
  RETURN v_user_roles @> '[{"role": "admin"}]'::jsonb
    OR v_user_roles @> '[{"role": "agent"}]'::jsonb
    OR v_user_roles @> '[{"role": "supervisor"}]'::jsonb;
END;
$$;

-- Create function to cleanup old recordings
CREATE OR REPLACE FUNCTION cleanup_old_recordings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE recordings
  SET status = 'deleted'
  WHERE status = 'active'
    AND uploaded_at < now() - interval '90 days';
END;
$$;

-- Create trigger to update last_accessed_at
CREATE OR REPLACE FUNCTION update_recording_access_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_recording_access
  BEFORE UPDATE
  ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_recording_access_timestamp();