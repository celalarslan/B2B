/*
  # Create Error Logs Table

  1. New Tables
    - error_logs
      - Stores application error information
      - Tracks error details and user context
      
  2. Security
    - Enable RLS
    - Add policy for authenticated users
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  stack_trace text,
  component_name text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  business_id uuid REFERENCES businesses(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert for all authenticated users
CREATE POLICY "Users can create error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only allow users to view their own error logs
CREATE POLICY "Users can view own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id
  ON error_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_business_id
  ON error_logs (business_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp
  ON error_logs (timestamp DESC);

COMMENT ON TABLE error_logs IS 'Stores application error information and context';