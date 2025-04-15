import { supabase } from '../supabase';

/**
 * CDN configuration for the application
 */
export const CDN_CONFIG = {
  // Base URL for Supabase Storage CDN
  STORAGE_URL: import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public` : '',
  
  // Cache durations in seconds
  CACHE_DURATIONS: {
    STATIC: 31536000, // 1 year for static assets
    IMAGES: 2592000,  // 30 days for images
    AUDIO: 604800,    // 7 days for audio
    DYNAMIC: 300      // 5 minutes for dynamic content
  },
  
  // Available buckets
  BUCKETS: {
    IMAGES: 'images',
    AUDIO: 'recordings',
    PROFILES: 'profiles',
    DOCUMENTS: 'documents'
  }
};

/**
 * Creates a CDN URL for a file in Supabase Storage
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @param options Additional options
 * @returns The CDN URL for the file
 */
function getCdnUrl(
  bucket: string, 
  path: string, 
  options: {
    download?: boolean;
    transform?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'png' | 'jpeg';
    }
  } = {}
): string {
  if (!path) return '';
  
  // If path is already a full URL, return it
  if (path.startsWith('http')) return path;
  
  // Construct the base URL
  let url = `${CDN_CONFIG.STORAGE_URL}/${bucket}/${path}`;
  
  // Add download parameter if needed
  if (options.download) {
    url += `?download=${options.download ? 'true' : 'false'}`;
  }
  
  // Add transformation parameters if provided
  if (options.transform) {
    const params = new URLSearchParams();
    
    if (options.transform.width) {
      params.append('width', options.transform.width.toString());
    }
    
    if (options.transform.height) {
      params.append('height', options.transform.height.toString());
    }
    
    if (options.transform.quality) {
      params.append('quality', options.transform.quality.toString());
    }
    
    if (options.transform.format) {
      params.append('format', options.transform.format);
    }
    
    if (params.toString()) {
      url += url.includes('?') ? `&${params.toString()}` : `?${params.toString()}`;
    }
  }
  
  return url;
}

/**
 * Creates a signed URL with an expiration time
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @param expiresIn Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Promise resolving to the signed URL
 */
async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return '';
  }
}

/**
 * Uploads a file to Supabase Storage with appropriate cache headers
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @param file The file to upload
 * @param options Additional options
 * @returns Promise resolving to the CDN URL for the uploaded file
 */
async function uploadToCdn(
  bucket: string,
  path: string,
  file: File,
  options: {
    cacheControl?: number;
    contentType?: string;
    upsert?: boolean;
    isPublic?: boolean;
  } = {}
): Promise<string> {
  try {
    // Determine cache control header based on file type
    let cacheControl = options.cacheControl;
    if (!cacheControl) {
      if (file.type.startsWith('image/')) {
        cacheControl = CDN_CONFIG.CACHE_DURATIONS.IMAGES;
      } else if (file.type.startsWith('audio/')) {
        cacheControl = CDN_CONFIG.CACHE_DURATIONS.AUDIO;
      } else {
        cacheControl = CDN_CONFIG.CACHE_DURATIONS.STATIC;
      }
    }
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: `max-age=${cacheControl}, stale-while-revalidate=60`,
        contentType: options.contentType || file.type,
        upsert: options.upsert !== false
      });
    
    if (error) throw error;
    
    // Return the CDN URL
    return getCdnUrl(bucket, data.path);
  } catch (error) {
    console.error('Error uploading to CDN:', error);
    throw error;
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param bucket The storage bucket name
 * @param path The file path within the bucket
 * @returns Promise resolving to a boolean indicating success
 */
async function deleteFromCdn(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting from CDN:', error);
    return false;
  }
}

/**
 * Creates a URL for a public asset with cache busting
 * @param path The path to the asset
 * @returns The URL with cache busting parameter
 */
function getPublicAssetUrl(path: string): string {
  // Add cache busting for development only
  if (import.meta.env.DEV) {
    const cacheBuster = `?v=${Date.now()}`;
    return path + cacheBuster;
  }
  
  // In production, rely on the build hash for cache busting
  return path;
}