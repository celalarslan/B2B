import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { supabase as configuredClient } from './supabase/config';
import { Message } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

// Re-export the configured client
export const supabase = configuredClient;

export async function getCurrentUser() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    // If no session exists, return null instead of throwing an error
    if (!session) return null;

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getUserBusiness() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return business;
  } catch (error) {
    console.error('Error getting user business:', error);
    return null;
  }
}

export async function getBusinessCustomers(businessId: string) {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);

    if (error) throw error;
    return customers;
  } catch (error) {
    console.error('Error getting business customers:', error);
    return [];
  }
}

export async function getBusinessConversations(businessId: string) {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        customers (
          name,
          phone_number
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return conversations;
  } catch (error) {
    console.error('Error getting business conversations:', error);
    return [];
  }
}

export async function updateBusinessSettings(
  businessId: string,
  settings: {
    name?: string;
    sector?: string;
    phone_number?: string;
    forwarding_number?: string;
    language?: string;
    voice_id?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .update(settings)
      .eq('id', businessId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating business settings:', error);
    throw error;
  }
}

export async function createCustomer(
  businessId: string,
  customer: {
    name: string;
    phone_number: string;
    email?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        ...customer
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

export async function saveConversation(
  businessId: string,
  customerId: string,
  conversation: {
    transcript: any;
    audio_url?: string;
    language: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        ...conversation
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Logs a conversation to Supabase for analytics and history
 * @param messages Array of chat messages to log
 * @returns Promise that resolves when the conversation is logged
 */
export async function logConversation(messages: Message[]): Promise<void> {
  try {
    // Get current user
    const user = await getCurrentUser();
    
    // Get organization ID if available
    let organizationId = null;
    if (user) {
      const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!error && data) {
        organizationId = data.id;
      }
    }
    
    // Format transcript
    const transcript = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
    
    // Create conversation record
    await supabase.from('conversations').insert({
      id: uuidv4(),
      organization_id: organizationId,
      transcript,
      language: document.documentElement.lang || 'en',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging conversation:', error);
    // Don't throw, just log the error
  }
}