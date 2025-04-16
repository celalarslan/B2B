/*
  # User Profile Management System

  1. New Tables
    - user_profiles
      - Core user profile information
      - Linked to auth.users
      - Includes audit triggers
    - profile_audit_logs
      - Tracks all changes to profiles
      - Stores complete change history
  
  2. Security
    - RLS policies for profile access
    - Audit logging triggers
    - Data validation constraints
*/

-- Create enum for supported languages
CREATE TYPE supported_language AS ENUM ('EN', 'TR', 'AR', 'FR');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name varchar(100) NOT NULL,
  profile_photo_url varchar,
  language_preference supported_language DEFAULT 'EN',
  job_title varchar(100),
  phone_number varchar(20),
  last_login_at timestamptz,
  last_login_device jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_phone CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- Create profile audit logs table
CREATE TABLE IF NOT EXISTS profile_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action varchar(50) NOT NULL,
  changes jsonb NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_profiles(language_preference);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_profile_id ON profile_audit_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_logs_created_at ON profile_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit logs"
  ON profile_audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create audit trigger function
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profile_audit_logs (
    profile_id,
    user_id,
    action,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    NEW.id,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'CREATE'
      WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
      ELSE TG_OP
    END,
    jsonb_build_object(
      'old', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END,
      'new', row_to_json(NEW)
    ),
    inet_client_addr(),
    current_setting('app.user_agent', true)
  );
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER log_profile_changes
  AFTER INSERT OR UPDATE
  ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profile_timestamp
  BEFORE UPDATE
  ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();