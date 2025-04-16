import { supabase } from './supabase';

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
  retryAfter?: number;
  error?: string;
}

/**
 * Checks if an action should be rate limited
 * @param action The action category (auth, support, api)
 * @param identifier Unique identifier (email, user ID)
 * @returns Promise resolving to rate limit check result
 */
export async function checkRateLimit(
  action: string,
  identifier: string
): Promise<RateLimitResponse> {
  try {
    // Get client IP address if available
    const ip = await getClientIp();
    
    // Call rate limiter edge function
    const { data, error } = await supabase.functions.invoke('rate-limiter', {
      body: { action, identifier, ip }
    });
    
    if (error) {
      console.error('Rate limiter error:', error);
      // Default to allowing the request if the rate limiter fails
      return { allowed: true, remaining: 1 };
    }
    
    return data as RateLimitResponse;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Default to allowing the request if there's an error
    return { allowed: true, remaining: 1 };
  }
}

/**
 * Applies rate limiting to a function
 * @param fn The function to rate limit
 * @param action The action category
 * @param getIdentifier Function to extract identifier from arguments
 * @returns Rate-limited function
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  action: string,
  getIdentifier: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async function rateLimitedFn(...args: Parameters<T>): Promise<ReturnType<T>> {
    const identifier = getIdentifier(...args);
    
    const rateLimitResult = await checkRateLimit(action, identifier);
    
    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.retryAfter || 60;
      throw new Error(`Rate limit exceeded. Please try again after ${retryAfter} seconds.`);
    }
    
    return fn(...args);
  };
}

/**
 * Gets the client's IP address
 * @returns Promise resolving to IP address or empty string
 */
async function getClientIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || '';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return '';
  }
}