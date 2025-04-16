import { supabase } from './supabase';

/**
 * Sends a manual email notification about a conversation
 * @param to Recipient email address
 * @param subject Email subject
 * @param body Email body
 * @param conversationId Optional conversation ID
 * @param businessId Optional business ID
 * @returns Promise resolving to success status
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  body: string,
  conversationId?: string,
  businessId?: string
): Promise<boolean> {
  try {
    // Call the Supabase Edge Function to send the email
    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: {
        to,
        subject,
        body,
        conversationId,
        businessId
      }
    });

    if (error) throw error;
    
    return data.success;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

/**
 * Processes pending email notifications
 * @returns Promise resolving to the number of emails sent
 */
export async function processPendingEmails(): Promise<number> {
  try {
    // Call the Supabase Edge Function to process pending emails
    const { data, error } = await supabase.functions.invoke('send-conversation-email', {
      body: {}
    });

    if (error) throw error;
    
    return data.sent || 0;
  } catch (error) {
    console.error('Error processing pending emails:', error);
    return 0;
  }
}

/**
 * Gets email notification settings for a business
 * @param businessId Business ID
 * @returns Promise resolving to email notification settings
 */
export async function getEmailNotificationSettings(businessId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('email_notification_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting email notification settings:', error);
    return null;
  }
}

/**
 * Updates email notification settings for a business
 * @param businessId Business ID
 * @param settings Email notification settings
 * @returns Promise resolving to success status
 */
export async function updateEmailNotificationSettings(
  businessId: string,
  settings: {
    enabled: boolean;
    recipientEmail: string;
    sendTranscript: boolean;
    sendAudioLink: boolean;
    includeCustomerInfo: boolean;
    notifyOnMissedCalls: boolean;
    notifyOnCompletedCalls: boolean;
  }
): Promise<boolean> {
  try {
    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('email_notification_settings')
      .select('id')
      .eq('business_id', businessId)
      .single();
    
    const settingsData = {
      business_id: businessId,
      enabled: settings.enabled,
      recipient_email: settings.recipientEmail,
      send_transcript: settings.sendTranscript,
      send_audio_link: settings.sendAudioLink,
      include_customer_info: settings.includeCustomerInfo,
      notify_on_missed_calls: settings.notifyOnMissedCalls,
      notify_on_completed_calls: settings.notifyOnCompletedCalls,
    };
    
    if (existingSettings) {
      // Update existing settings
      const { error } = await supabase
        .from('email_notification_settings')
        .update(settingsData)
        .eq('id', existingSettings.id);
      
      if (error) throw error;
    } else {
      // Insert new settings
      const { error } = await supabase
        .from('email_notification_settings')
        .insert(settingsData);
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating email notification settings:', error);
    return false;
  }
}

/**
 * Gets email notification templates for a business
 * @param businessId Business ID
 * @returns Promise resolving to email templates
 */
export async function getEmailTemplates(businessId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('business_id', businessId);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting email templates:', error);
    return [];
  }
}

/**
 * Gets email notification logs for a business
 * @param businessId Business ID
 * @param limit Number of logs to return
 * @param offset Offset for pagination
 * @returns Promise resolving to email logs
 */
export async function getEmailLogs(
  businessId: string,
  limit = 10,
  offset = 0
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('metadata->business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting email logs:', error);
    return [];
  }
}