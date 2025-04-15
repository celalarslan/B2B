import { supabase } from './config';
import { isValidOrganizationId } from '../utils/validation';

/**
 * Optimized query to fetch user profile with specific columns
 * @param userId User ID
 * @returns User profile data
 */
export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, profile_photo_url, language_preference, job_title, organization_id')
    .eq('user_id', userId)
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Optimized query to fetch organization details with specific columns
 * @param organizationId Organization ID
 * @returns Organization data
 */
export async function fetchOrganization(organizationId: string) {
  if (!isValidOrganizationId(organizationId)) {
    throw new Error('Invalid organization ID');
  }
  
  const { data, error } = await supabase
    .from('organizations')
    .select('id, legal_name, trading_name, logo_url, primary_sector, primary_language, timezone')
    .eq('id', organizationId)
    .single();
    
  if (error) throw error;
  return data;
}

/**
 * Optimized query to fetch recent conversations with specific columns
 * @param organizationId Organization ID
 * @param limit Number of conversations to fetch
 * @returns Recent conversations
 */
export async function fetchRecentConversations(organizationId: string, limit = 10) {
  if (!isValidOrganizationId(organizationId)) {
    throw new Error('Invalid organization ID');
  }
  
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, 
      customer_id, 
      status, 
      language, 
      created_at, 
      sentiment_score,
      customers (id, name, phone_number)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data;
}

/**
 * Optimized query to fetch usage metrics with specific columns
 * @param organizationId Organization ID
 * @param months Number of months to fetch
 * @returns Usage metrics
 */
export async function fetchUsageMetrics(organizationId: string, months = 3) {
  if (!isValidOrganizationId(organizationId)) {
    throw new Error('Invalid organization ID');
  }
  
  const { data, error } = await supabase
    .from('usage_metrics')
    .select('id, month, conversation_count, call_minutes, ai_message_count, plan_id')
    .eq('organization_id', organizationId)
    .gte('month', new Date(new Date().setMonth(new Date().getMonth() - months)).toISOString())
    .order('month', { ascending: false });
    
  if (error) throw error;
  return data;
}

/**
 * Optimized query to fetch performance metrics with specific columns
 * @param organizationId Organization ID
 * @param days Number of days to fetch
 * @returns Performance metrics
 */
export async function fetchPerformanceMetrics(organizationId: string, days = 7) {
  if (!isValidOrganizationId(organizationId)) {
    throw new Error('Invalid organization ID');
  }
  
  const { data, error } = await supabase
    .from('performance_metrics')
    .select('id, ai_response_time_ms, success, stt_latency_ms, tts_latency_ms, timestamp')
    .eq('organization_id', organizationId)
    .gte('timestamp', new Date(new Date().setDate(new Date().getDate() - days)).toISOString())
    .order('timestamp', { ascending: false });
    
  if (error) throw error;
  return data;
}

/**
 * Optimized query to fetch saved reports with specific columns
 * @param organizationId Organization ID
 * @returns Saved reports
 */
export async function fetchSavedReports(organizationId: string) {
  if (!isValidOrganizationId(organizationId)) {
    throw new Error('Invalid organization ID');
  }
  
  const { data, error } = await supabase
    .from('saved_reports')
    .select('id, name, description, type, visualization_type, is_favorite, last_viewed_at, created_at')
    .eq('organization_id', organizationId)
    .order('last_viewed_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

/**
 * Optimized query to fetch trend data with specific columns
 * @param organizationId Organization ID
 * @param trendType Trend type
 * @param limit Number of records to fetch
 * @returns Trend data
 */
export async function fetchTrendData(organizationId: string, trendType = 'daily', limit = 30) {
  if (!isValidOrganizationId(organizationId)) {
    throw new Error('Invalid organization ID');
  }
  
  const { data, error } = await supabase
    .rpc('get_trend_data_cached', {
      p_organization_id: organizationId,
      p_trend_type: trendType,
      p_limit: limit
    });
    
  if (error) throw error;
  return data;
}