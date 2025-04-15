/*
  # Add Password Reset Logging System

  1. New Tables
    - `password_reset_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `request_timestamp` (timestamptz)
      - `completion_timestamp` (timestamptz)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `status` (text)
      - `reset_token_hash` (text)

  2. Security
    - Enable RLS
    - Add policies for access control
    - Add audit logging
*/

-- Create password reset logs table
CREATE TABLE IF NOT EXISTS password_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_timestamp timestamptz DEFAULT now(),
  completion_timestamp timestamptz,
  ip_address inet,
  user_agent text,
  status text NOT NULL CHECK (status IN ('requested', 'completed', 'expired', 'failed')),
  reset_token_hash text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user_id 
  ON password_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_status 
  ON password_reset_logs(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_request_timestamp 
  ON password_reset_logs(request_timestamp DESC);

-- Enable RLS
ALTER TABLE password_reset_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reset logs"
  ON password_reset_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to log password reset attempts
CREATE OR REPLACE FUNCTION log_password_reset_attempt(
  p_user_id uuid,
  p_status text,
  p_token_hash text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO password_reset_logs (
    user_id,
    status,
    reset_token_hash,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_status,
    p_token_hash,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete password reset
CREATE OR REPLACE FUNCTION complete_password_reset(
  p_log_id uuid,
  p_status text
)
RETURNS boolean AS $$
BEGIN
  UPDATE password_reset_logs
  SET 
    status = p_status,
    completion_timestamp = now()
  WHERE id = p_log_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE password_reset_logs IS 'Tracks password reset requests and their outcomes';
COMMENT ON COLUMN password_reset_logs.status IS 'Current status of the reset request';
COMMENT ON COLUMN password_reset_logs.reset_token_hash IS 'Hashed version of the reset token';