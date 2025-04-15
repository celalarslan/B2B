/*
  # Add RBAC System

  1. New Tables
    - `organization_users`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `organization_id` (uuid, references organizations)
      - `roles` (jsonb, stores role and permissions)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references auth.users)

    - `roles`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `permissions` (jsonb)
      - `organization_id` (uuid, references organizations)
      - `is_system_role` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access
    - Add audit logging for role changes

  3. Changes
    - Add role management functions
    - Add permission validation functions
    - Add role assignment triggers
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]',
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  is_system_role boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_role_name_per_org UNIQUE (name, organization_id)
);

-- Create organization_users table
CREATE TABLE IF NOT EXISTS organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  roles jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT unique_user_per_org UNIQUE (user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON organization_users(organization_id);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'
    )
  );

CREATE POLICY "Users can view roles in their organization"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage users"
  ON organization_users
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT o.id 
      FROM organizations o
      JOIN organization_users ou ON o.id = ou.organization_id
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'
    )
  );

CREATE POLICY "Users can view their own roles"
  ON organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Functions for role management
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_permission text
)
RETURNS boolean AS $$
DECLARE
  v_roles jsonb;
BEGIN
  SELECT roles INTO v_roles
  FROM organization_users
  WHERE user_id = p_user_id
  AND organization_id = p_organization_id;
  
  RETURN v_roles @> jsonb_build_array(jsonb_build_object('permission', p_permission));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_role(
  p_user_id uuid,
  p_organization_id uuid,
  p_role_name text
)
RETURNS boolean AS $$
DECLARE
  v_role_data jsonb;
BEGIN
  -- Get role data
  SELECT jsonb_build_object(
    'role', name,
    'permissions', permissions
  ) INTO v_role_data
  FROM roles
  WHERE name = p_role_name
  AND organization_id = p_organization_id;
  
  IF v_role_data IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update or insert role assignment
  INSERT INTO organization_users (
    user_id,
    organization_id,
    roles,
    created_by
  ) VALUES (
    p_user_id,
    p_organization_id,
    jsonb_build_array(v_role_data),
    auth.uid()
  )
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET
    roles = organization_users.roles || v_role_data,
    updated_at = now();
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default system roles
INSERT INTO roles (name, description, permissions, is_system_role)
VALUES 
  ('admin', 'Full system access', '[
    {"permission": "manage_users"},
    {"permission": "manage_roles"},
    {"permission": "manage_organization"},
    {"permission": "view_analytics"},
    {"permission": "manage_billing"}
  ]', true),
  ('manager', 'Department manager access', '[
    {"permission": "view_users"},
    {"permission": "manage_team"},
    {"permission": "view_analytics"}
  ]', true),
  ('agent', 'Standard user access', '[
    {"permission": "view_assigned_data"},
    {"permission": "manage_own_profile"}
  ]', true),
  ('viewer', 'Read-only access', '[
    {"permission": "view_public_data"}
  ]', true)
ON CONFLICT (name, organization_id) DO NOTHING;

-- Add audit logging trigger
CREATE OR REPLACE FUNCTION log_role_changes()
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
      WHEN TG_OP = 'INSERT' THEN 'ROLE_ASSIGNED'
      WHEN TG_OP = 'UPDATE' THEN 'ROLE_UPDATED'
      ELSE 'ROLE_' || TG_OP
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

CREATE TRIGGER log_role_changes
  AFTER INSERT OR UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION log_role_changes();

-- Comments
COMMENT ON TABLE roles IS 'Stores role definitions and permissions';
COMMENT ON TABLE organization_users IS 'Maps users to organizations with their roles';
COMMENT ON COLUMN roles.permissions IS 'JSON array of permission objects';
COMMENT ON COLUMN organization_users.roles IS 'JSON array of assigned roles and their permissions';