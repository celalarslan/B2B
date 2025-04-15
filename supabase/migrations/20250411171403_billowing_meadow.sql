/*
  # Add Organization Invites System

  1. New Tables
    - `organization_invites`
      - `id` (uuid, primary key)
      - `email` (text, required)
      - `organization_id` (uuid, references organizations)
      - `role` (text, required)
      - `status` (text, required)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `created_by` (uuid, references auth.users)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on organization_invites table
    - Add policies for organization admins and invited users
    - Add indexes for performance optimization

  3. Changes
    - Add invitation management functions
    - Add trigger for invitation expiry
    - Add audit logging
*/

DO $$ BEGIN
  -- Create enums if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_role') THEN
    CREATE TYPE organization_role AS ENUM ('admin', 'member', 'viewer');
  END IF;
END $$;

-- Create organization invites table
CREATE TABLE IF NOT EXISTS organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  status invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_invite_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invites_email') THEN
    CREATE INDEX idx_organization_invites_email ON organization_invites(email);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invites_org_id') THEN
    CREATE INDEX idx_organization_invites_org_id ON organization_invites(organization_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invites_status') THEN
    CREATE INDEX idx_organization_invites_status ON organization_invites(status) WHERE status = 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organization_invites_expires_at') THEN
    CREATE INDEX idx_organization_invites_expires_at ON organization_invites(expires_at) WHERE status = 'pending';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Organization admins can manage invites" ON organization_invites;
  DROP POLICY IF EXISTS "Users can view their own invites" ON organization_invites;
END $$;

CREATE POLICY "Organization admins can manage invites"
  ON organization_invites
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own invites"
  ON organization_invites
  FOR SELECT
  TO authenticated
  USING (
    email = (
      SELECT email FROM auth.users 
      WHERE id = auth.uid()
    )
    AND status = 'pending'
  );

-- Function to check for valid invitations
CREATE OR REPLACE FUNCTION check_valid_invitation(p_email text)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  role organization_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.organization_id,
    o.legal_name as organization_name,
    i.role
  FROM organization_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE 
    i.email = p_email
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_email text, p_organization_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE organization_invites
  SET 
    status = 'accepted',
    updated_at = now()
  WHERE 
    email = p_email
    AND organization_id = p_organization_id
    AND status = 'pending'
    AND expires_at > now();
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire invitations
CREATE OR REPLACE FUNCTION expire_invitations()
RETURNS trigger AS $$
BEGIN
  UPDATE organization_invites
  SET 
    status = 'expired',
    updated_at = now()
  WHERE expires_at <= now()
    AND status = 'pending';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for expiring invitations
DROP TRIGGER IF EXISTS expire_old_invitations ON organization_invites;
CREATE TRIGGER expire_old_invitations
  AFTER INSERT OR UPDATE ON organization_invites
  EXECUTE FUNCTION expire_invitations();

-- Function to log invitation changes
CREATE OR REPLACE FUNCTION log_invitation_changes()
RETURNS trigger AS $$
BEGIN
  INSERT INTO organization_audit_logs (
    organization_id,
    user_id,
    action,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    NEW.organization_id,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'INVITE_CREATED'
      WHEN TG_OP = 'UPDATE' THEN 'INVITE_UPDATED'
      ELSE 'INVITE_' || TG_OP
    END,
    jsonb_build_object(
      'old', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      'new', to_jsonb(NEW)
    ),
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging changes
DROP TRIGGER IF EXISTS log_invitation_changes ON organization_invites;
CREATE TRIGGER log_invitation_changes
  AFTER INSERT OR UPDATE ON organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION log_invitation_changes();

-- Comments
COMMENT ON TABLE organization_invites IS 'Stores organization membership invitations';
COMMENT ON COLUMN organization_invites.email IS 'Email address of the invited user';
COMMENT ON COLUMN organization_invites.role IS 'Role to be assigned upon acceptance';
COMMENT ON COLUMN organization_invites.status IS 'Current status of the invitation';
COMMENT ON COLUMN organization_invites.expires_at IS 'Timestamp when the invitation expires';