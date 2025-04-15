/*
  # Add Language Support to AI Training System

  1. Changes
    - Add language column to:
      * conversations_transcript
      * conversation_labels
      * ai_models
    - Add language-specific indexes
    - Update existing language columns to use VARCHAR(5)
    
  2. Validation
    - Add CHECK constraints for ISO 639-1 compliance
    - Set default values to 'en'
    - Ensure UTF-8 encoding
    
  3. Indexes
    - Create indexes for language-based queries
    - Optimize multilingual content access
*/

-- Function to validate language code format
CREATE OR REPLACE FUNCTION is_valid_language_code(code text)
RETURNS boolean AS $$
BEGIN
  RETURN code ~ '^[a-z]{2}(-[A-Z]{2})?$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add language column to conversations_transcript
ALTER TABLE conversations_transcript
ALTER COLUMN language TYPE VARCHAR(5),
ALTER COLUMN language SET DEFAULT 'en',
ADD CONSTRAINT valid_transcript_language 
  CHECK (is_valid_language_code(language));

-- Add language column to conversation_labels
ALTER TABLE conversation_labels
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en',
ADD CONSTRAINT valid_label_language 
  CHECK (is_valid_language_code(language));

-- Update ai_models table
ALTER TABLE ai_models
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS supported_languages VARCHAR(5)[] DEFAULT ARRAY['en']::VARCHAR(5)[],
ADD CONSTRAINT valid_model_language 
  CHECK (is_valid_language_code(language)),
ADD CONSTRAINT valid_supported_languages 
  CHECK (array_length(supported_languages, 1) > 0);

-- Create language-specific indexes
CREATE INDEX IF NOT EXISTS idx_transcript_language 
ON conversations_transcript(language);

CREATE INDEX IF NOT EXISTS idx_labels_language 
ON conversation_labels(language);

CREATE INDEX IF NOT EXISTS idx_models_language 
ON ai_models(language);

CREATE INDEX IF NOT EXISTS idx_models_supported_languages 
ON ai_models USING gin(supported_languages);

-- Add comments
COMMENT ON COLUMN conversations_transcript.language IS 'ISO 639-1 language code with optional region tag';
COMMENT ON COLUMN conversation_labels.language IS 'ISO 639-1 language code with optional region tag';
COMMENT ON COLUMN ai_models.language IS 'Primary language of the model';
COMMENT ON COLUMN ai_models.supported_languages IS 'Array of supported language codes';

-- Update existing data to ensure consistency
UPDATE conversations_transcript
SET language = 'en'
WHERE language IS NULL OR NOT is_valid_language_code(language);

UPDATE conversation_labels
SET language = 'en'
WHERE language IS NULL OR NOT is_valid_language_code(language);

UPDATE ai_models
SET language = 'en'
WHERE language IS NULL OR NOT is_valid_language_code(language);