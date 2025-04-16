/*
  # Add Email Notification System

  1. New Tables
    - email_notification_settings: Stores user preferences for email notifications
    - email_templates: Stores customizable email templates for different notification types
    
  2. Security
    - Enable RLS on all tables
    - Add policies for business owners
    
  3. Functions
    - send_conversation_notification: Sends email notification for new conversations
*/

-- Create email_notification_settings table
CREATE TABLE IF NOT EXISTS email_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  enabled boolean DEFAULT false,
  recipient_email text NOT NULL,
  send_transcript boolean DEFAULT true,
  send_audio_link boolean DEFAULT true,
  include_customer_info boolean DEFAULT true,
  notify_on_missed_calls boolean DEFAULT true,
  notify_on_completed_calls boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_template_type_per_business UNIQUE (business_id, template_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_settings_business_id ON email_notification_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_business_id ON email_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_default ON email_templates(is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE email_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Business owners can manage their email notification settings"
  ON email_notification_settings
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage their email templates"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Create function to send conversation notification
CREATE OR REPLACE FUNCTION send_conversation_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_settings record;
  v_business record;
  v_customer record;
  v_template record;
  v_subject text;
  v_body text;
  v_audio_url text;
  v_transcript text;
BEGIN
  -- Check if notifications are enabled for this business
  SELECT * INTO v_settings
  FROM email_notification_settings
  WHERE business_id = NEW.business_id
    AND enabled = true;
  
  -- Exit if no settings found or notifications disabled
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Check if we should notify based on call status
  IF (NEW.status = 'missed' AND NOT v_settings.notify_on_missed_calls) OR
     (NEW.status = 'completed' AND NOT v_settings.notify_on_completed_calls) THEN
    RETURN NEW;
  END IF;
  
  -- Get business info
  SELECT * INTO v_business
  FROM businesses
  WHERE id = NEW.business_id;
  
  -- Get customer info if available and settings allow
  IF v_settings.include_customer_info AND NEW.customer_id IS NOT NULL THEN
    SELECT * INTO v_customer
    FROM customers
    WHERE id = NEW.customer_id;
  END IF;
  
  -- Get template
  SELECT * INTO v_template
  FROM email_templates
  WHERE business_id = NEW.business_id
    AND template_type = 'conversation_notification'
  ORDER BY is_default DESC
  LIMIT 1;
  
  -- If no custom template, use default
  IF NOT FOUND THEN
    v_subject := 'New Call Notification - ' || COALESCE(v_business.name, 'Your Business');
    
    v_body := 'Hello,

A new call was received by your AI assistant.

Call Details:
- Status: ' || COALESCE(NEW.status, 'Unknown') || '
- Date: ' || to_char(NEW.created_at, 'YYYY-MM-DD HH:MI:SS') || '
- Language: ' || COALESCE(NEW.language, 'Unknown');

    -- Add customer info if available and enabled
    IF v_settings.include_customer_info AND v_customer.id IS NOT NULL THEN
      v_body := v_body || '

Customer Information:
- Name: ' || COALESCE(v_customer.name, 'Unknown') || '
- Phone: ' || COALESCE(v_customer.phone_number, 'Unknown') || '
- Email: ' || COALESCE(v_customer.email, 'Unknown');
    END IF;
    
    -- Add transcript if enabled
    IF v_settings.send_transcript AND NEW.transcript IS NOT NULL THEN
      v_body := v_body || '

Conversation Transcript:
' || jsonb_pretty(NEW.transcript);
    END IF;
    
    -- Add audio link if enabled
    IF v_settings.send_audio_link AND NEW.audio_url IS NOT NULL THEN
      v_body := v_body || '

Audio Recording: ' || NEW.audio_url;
    END IF;
    
    v_body := v_body || '

This is an automated notification from your B2B AI Call Assistant.
';
  ELSE
    -- Use custom template
    v_subject := v_template.subject;
    v_body := v_template.body;
    
    -- Replace placeholders
    v_subject := replace(v_subject, '{{business_name}}', COALESCE(v_business.name, 'Your Business'));
    v_subject := replace(v_subject, '{{call_status}}', COALESCE(NEW.status, 'Unknown'));
    
    v_body := replace(v_body, '{{business_name}}', COALESCE(v_business.name, 'Your Business'));
    v_body := replace(v_body, '{{call_status}}', COALESCE(NEW.status, 'Unknown'));
    v_body := replace(v_body, '{{call_date}}', to_char(NEW.created_at, 'YYYY-MM-DD HH:MI:SS'));
    v_body := replace(v_body, '{{call_language}}', COALESCE(NEW.language, 'Unknown'));
    
    -- Add customer info if available and enabled
    IF v_settings.include_customer_info AND v_customer.id IS NOT NULL THEN
      v_body := replace(v_body, '{{customer_name}}', COALESCE(v_customer.name, 'Unknown'));
      v_body := replace(v_body, '{{customer_phone}}', COALESCE(v_customer.phone_number, 'Unknown'));
      v_body := replace(v_body, '{{customer_email}}', COALESCE(v_customer.email, 'Unknown'));
    ELSE
      v_body := replace(v_body, '{{customer_name}}', 'Unknown');
      v_body := replace(v_body, '{{customer_phone}}', 'Unknown');
      v_body := replace(v_body, '{{customer_email}}', 'Unknown');
    END IF;
    
    -- Add transcript if enabled
    IF v_settings.send_transcript AND NEW.transcript IS NOT NULL THEN
      v_body := replace(v_body, '{{transcript}}', jsonb_pretty(NEW.transcript));
    ELSE
      v_body := replace(v_body, '{{transcript}}', 'Transcript not available');
    END IF;
    
    -- Add audio link if enabled
    IF v_settings.send_audio_link AND NEW.audio_url IS NOT NULL THEN
      v_body := replace(v_body, '{{audio_url}}', NEW.audio_url);
    ELSE
      v_body := replace(v_body, '{{audio_url}}', 'Audio not available');
    END IF;
  END IF;
  
  -- Log email to be sent
  INSERT INTO email_logs (
    to_email,
    from_email,
    subject,
    status,
    metadata
  ) VALUES (
    v_settings.recipient_email,
    'info@b2b.wf',
    v_subject,
    'pending',
    jsonb_build_object(
      'conversation_id', NEW.id,
      'business_id', NEW.business_id,
      'template_type', 'conversation_notification',
      'body', v_body
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for conversation notifications
CREATE TRIGGER send_conversation_email_notification
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION send_conversation_notification();

-- Insert default email templates
INSERT INTO email_templates (
  template_type,
  subject,
  body,
  is_default
) VALUES (
  'conversation_notification',
  'New Call Notification - {{business_name}}',
  'Hello,

A new call was received by your AI assistant.

Call Details:
- Status: {{call_status}}
- Date: {{call_date}}
- Language: {{call_language}}

Customer Information:
- Name: {{customer_name}}
- Phone: {{customer_phone}}
- Email: {{customer_email}}

Conversation Transcript:
{{transcript}}

Audio Recording: {{audio_url}}

This is an automated notification from your B2B AI Call Assistant.
',
  true
);

-- Add comments
COMMENT ON TABLE email_notification_settings IS 'Stores user preferences for email notifications';
COMMENT ON TABLE email_templates IS 'Stores customizable email templates for different notification types';
COMMENT ON FUNCTION send_conversation_notification() IS 'Sends email notification for new conversations';