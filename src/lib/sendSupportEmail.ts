import { supabase } from './supabase';
import { SupportEmailData } from '../types/chat';

/**
 * Sends a support request email with user information
 * @param data User information and support request details
 * @returns Promise that resolves when the email is sent
 */
export async function sendSupportEmail(data: SupportEmailData): Promise<void> {
  try {
    // Call the Supabase Edge Function to send the email
    const { data: responseData, error } = await supabase.functions.invoke('send-support-email', {
      body: {
        to: 'guartexcom@gmail.com',
        subject: 'New Support Request via AI Assistant',
        name: data.name,
        email: data.email,
        issue: data.issue,
        transcript: data.transcript,
        country: data.country,
        company: data.company
      }
    });

    if (error) {
      console.error('Error sending support email:', error);
      throw new Error('Failed to send support email');
    }

    // Log the support request in the database
    await logSupportRequest(data);

  } catch (error) {
    console.error('Error in sendSupportEmail:', error);
    throw error;
  }
}

/**
 * Logs the support request in the database
 * @param data User information and support request details
 */
async function logSupportRequest(data: SupportEmailData): Promise<void> {
  try {
    // Get the current user if they're logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    // Insert the support request into the database
    const { error } = await supabase
      .from('support_requests')
      .insert({
        user_id: user?.id, // Will be null for anonymous users
        name: data.name,
        email: data.email,
        country: data.country || null,
        company: data.company || null,
        issue: data.issue,
        transcript: data.transcript,
        status: 'new',
        source: 'ai_assistant'
      });

    if (error) {
      console.error('Error logging support request:', error);
      // Don't throw here - we still want to send the email even if logging fails
    }
  } catch (error) {
    console.error('Error in logSupportRequest:', error);
    // Don't throw here - we still want to send the email even if logging fails
  }
}