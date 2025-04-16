/*
  # Create Maintenance Logs Table

  1. New Table
    - maintenance_logs: Tracks database maintenance operations
    - Stores operation type, details, and timestamps
    
  2. Security
    - Enable RLS
    - Add policy for admin access
*/

-- Create maintenance_logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_operation 
ON maintenance_logs(operation);

CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created_at 
ON maintenance_logs(created_at DESC);

-- Enable RLS
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Only admins can view maintenance logs"
  ON maintenance_logs
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

-- Add comment
COMMENT ON TABLE maintenance_logs IS 'Tracks database maintenance operations and cleanup tasks';