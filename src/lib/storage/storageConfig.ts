import { supabase } from '../supabase';
import { CDN_CONFIG } from './cdn';
import { useAuthStore } from '../../hooks/useSupabase';

/**
 * Initializes storage buckets and sets up public/private access
 * This should be called during application initialization
 */
export async function initializeStorage(): Promise<void> {
  try {
    // Wait for auth to be initialized
    const authStore = useAuthStore.getState();
    
    // Add delay and retry if auth not initialized
    let retries = 0;
    const maxRetries = 3;
    
    while (!authStore.isInitialized && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (!authStore.isInitialized) {
      console.warn('Auth initialization timed out');
      return;
    }

    // Check for valid session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.warn('Auth session error:', authError);
      return;
    }
    
    if (!session?.access_token || !session?.user) {
      console.warn('No valid auth session found');
      return;
    }

    // Verify organization exists and is valid
    const organization = authStore.organization;
    if (!organization?.id || organization.id === '00000000-0000-0000-0000-000000000000') {
      console.warn('No valid organization found');
      return;
    }

    // Call edge function to create buckets
    const { data, error } = await supabase.functions.invoke('create-storage-buckets', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) throw error;

    console.log('Storage buckets initialized successfully:', data);
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
    // Don't throw, just log error to prevent app crash
    console.warn('Storage initialization failed, will retry on next auth state change');
  }
}

/**
 * Gets the file extension from a file name or path
 * @param fileName File name or path
 * @returns File extension
 */
function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generates a unique file path for storage
 * @param bucket Bucket name
 * @param fileName Original file name
 * @param prefix Optional path prefix
 * @returns Unique file path
 */
function generateFilePath(bucket: string, fileName: string, prefix?: string): string {
  const extension = getFileExtension(fileName);
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const uniqueId = crypto.randomUUID();
  
  let path = '';
  
  // Add prefix if provided
  if (prefix) {
    path += `${prefix}/`;
  }
  
  // Add date-based folder structure for better organization
  path += `${timestamp}/`;
  
  // Add unique ID and original file extension
  path += `${uniqueId}${extension ? `.${extension}` : ''}`;
  
  return path;
}

/**
 * Determines the appropriate bucket for a file based on its MIME type
 * @param mimeType File MIME type
 * @returns Bucket name
 */
function getBucketForFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return CDN_CONFIG.BUCKETS.IMAGES;
  } else if (mimeType.startsWith('audio/')) {
    return CDN_CONFIG.BUCKETS.AUDIO;
  } else if (mimeType === 'application/pdf') {
    return CDN_CONFIG.BUCKETS.DOCUMENTS;
  } else {
    return CDN_CONFIG.BUCKETS.DOCUMENTS;
  }
}