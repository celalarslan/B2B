/*
  # Email Verification System

  1. New Tables
    - `email_verification_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `ip_address` (inet)
      - `user_agent` (text)
      - `timestamp` (timestamptz)
      - `status` (text)
      - `verification_token` (text)
      - `attempts` (int)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on email_verification_logs table
    - Add policies for authenticated users
    - Add rate limiting function
*/

-- Create email verification logs table
CREATE TABLE IF NOT EXISTS email_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now(),
  status text CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  verification_token text,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_verification_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON email_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_status ON email_verification_logs(status);
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON email_verification_logs(timestamp DESC);

-- Create policies
CREATE POLICY "Users can view their own verification logs"
  ON email_verification_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION check_verification_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_count integer;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM email_verification_logs
  WHERE user_id = p_user_id
    AND timestamp > now() - interval '1 hour';
    
  RETURN attempt_count < 3;
END;
$$;