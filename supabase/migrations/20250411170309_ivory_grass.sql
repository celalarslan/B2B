/*
  # Organization Profile Schema Setup

  1. New Tables
    - organizations
      - Core business information
      - Contact details
      - Industry classification
      - Operational details
    - organization_audit_logs
      - Tracks all changes to organization profiles
    - organization_languages
      - Tracks supported languages for each organization

  2. Security
    - Enable RLS on all tables
    - Add policies for organization access
    - Implement audit logging

  3. Indexes
    - Optimize common queries
    - Support text search
    - Improve join performance
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  legal_name text NOT NULL,
  trading_name text,
  registration_number text NOT NULL,
  logo_url text,
  primary_sector text NOT NULL,
  secondary_sectors text[] DEFAULT '{}',
  year_founded date NOT NULL,
  company_size_range text NOT NULL,
  country text NOT NULL,
  region text,
  city text NOT NULL,
  address text NOT NULL,
  primary_email text NOT NULL,
  phone_number text NOT NULL,
  annual_revenue_range text NOT NULL,
  primary_language text NOT NULL,
  timezone text NOT NULL,
  is_active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_email CHECK (primary_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_phone CHECK (phone_number ~* '^\+[1-9]\d{1,14}$')
);

-- Organization Languages Junction Table
CREATE TABLE IF NOT EXISTS organization_languages (
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (organization_id, language_code)
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS organization_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  changes jsonb NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_legal_name_trgm ON organizations USING gin (legal_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_organizations_trading_name_trgm ON organizations USING gin (trading_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_organizations_primary_sector ON organizations(primary_sector);
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active) WHERE is_active = true;

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON organization_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON organization_audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own organization"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own organization"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their organization languages"
  ON organization_languages
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization languages"
  ON organization_languages
  FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their organization audit logs"
  ON organization_audit_logs
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT id FROM organizations WHERE user_id = auth.uid()
  ));

-- Triggers for Audit Logging
CREATE OR REPLACE FUNCTION log_organization_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO organization_audit_logs (
      organization_id,
      user_id,
      action,
      changes,
      ip_address,
      user_agent
    ) VALUES (
      NEW.id,
      auth.uid(),
      'UPDATE',
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      ),
      inet_client_addr(),
      current_setting('request.headers')::json->>'user-agent'
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO organization_audit_logs (
      organization_id,
      user_id,
      action,
      changes,
      ip_address,
      user_agent
    ) VALUES (
      NEW.id,
      auth.uid(),
      'INSERT',
      jsonb_build_object('new', to_jsonb(NEW)),
      inet_client_addr(),
      current_setting('request.headers')::json->>'user-agent'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER organization_audit_trigger
  AFTER INSERT OR UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION log_organization_changes();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE organizations IS 'Stores organization profile information';
COMMENT ON TABLE organization_languages IS 'Tracks supported languages for each organization';
COMMENT ON TABLE organization_audit_logs IS 'Audit trail for organization profile changes';