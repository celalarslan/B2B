/*
  # Support System Schema

  1. New Tables
    - support_requests: Stores support requests from users
    - email_logs: Tracks emails sent by the system
    
  2. Security
    - RLS policies for data access
    - Audit logging
*/

-- Create support_requests table
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  country text,
  company text,
  issue text NOT NULL,
  transcript text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'ai_assistant',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_status CHECK (status IN ('new', 'in_progress', 'resolved', 'closed'))
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON support_requests(email);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own support requests"
  ON support_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Support staff can view all support requests"
  ON support_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

CREATE POLICY "Support staff can view email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.roles @> '[{"role": "admin"}]'::jsonb
    )
  );

-- Create function to update support request status
CREATE OR REPLACE FUNCTION update_support_request_status(
  p_request_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('new', 'in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update the support request
  UPDATE support_requests
  SET 
    status = p_status,
    resolved_at = CASE WHEN p_status IN ('resolved', 'closed') THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_request_id;

  -- Log the status change
  INSERT INTO maintenance_logs (
    operation,
    details,
    executed_by
  ) VALUES (
    'support_request_status_change',
    jsonb_build_object(
      'request_id', p_request_id,
      'new_status', p_status,
      'notes', p_notes
    ),
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE support_requests IS 'Stores support requests from users via AI assistant and other channels';
COMMENT ON TABLE email_logs IS 'Tracks emails sent by the system for auditing and troubleshooting';
COMMENT ON FUNCTION update_support_request_status IS 'Updates the status of a support request and logs the change';