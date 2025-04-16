/*
  # Add Conversation Status Column

  1. New Types
    - Create conversation_status_type ENUM with values:
      * completed
      * missed
      * failed
      * scheduled

  2. Changes
    - Add status column to conversations table
    - Add index for status column
    - Ensure backward compatibility
*/

-- Create conversation status type
DO $$ BEGIN
  CREATE TYPE conversation_status_type AS ENUM ('completed', 'missed', 'failed', 'scheduled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add status column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE conversations 
  ADD COLUMN status conversation_status_type DEFAULT NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index for status column
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_conversations_call_status 
  ON conversations(status);
END $$;

-- Add comment to explain column usage
COMMENT ON COLUMN conversations.status IS 'Tracks the final status of the conversation (completed, missed, failed, scheduled)';