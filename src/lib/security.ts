import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Define base security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Extended headers for verification endpoints
const verificationSecurityHeaders = {
  ...securityHeaders,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' ${import.meta.env.VITE_SUPABASE_URL};
    frame-ancestors 'none';
  `.replace(/\s+/g, ' ').trim(),
};

/**
 * Generates a CSRF token and stores it in localStorage
 * @returns The generated CSRF token
 */
export function generateCsrfToken(): string {
  const token = crypto.getRandomValues(new Uint8Array(16)).join('');
  localStorage.setItem('csrf_token', token);
  return token;
}

/**
 * Validates a CSRF token against the stored token
 * @param token The token to validate
 * @returns Boolean indicating if the token is valid
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = localStorage.getItem('csrf_token');
  return token === storedToken;
}

/**
 * Adds CSRF token to a request object
 * @param requestInit Request initialization object
 * @returns Updated request object with CSRF token
 */
export function addCsrfToken(requestInit: RequestInit = {}): RequestInit {
  const token = localStorage.getItem('csrf_token') || generateCsrfToken();
  
  return {
    ...requestInit,
    headers: {
      ...requestInit.headers,
      'X-CSRF-Token': token
    }
  };
}

// Rate limiting implementation using a Map to store attempts in memory
const rateLimitMap = new Map<string, { attempts: number; timestamp: number }>();

/**
 * Checks if a request should be rate limited
 * @param key Unique key for the rate limit (e.g., IP, user ID, endpoint)
 * @param maxAttempts Maximum number of attempts allowed in the time window
 * @param timeWindowMs Time window in milliseconds
 * @returns Boolean indicating if the request should be allowed
 */
export function checkRateLimit(key: string, maxAttempts: number, timeWindowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // If no record exists or the time window has passed, create/reset the record
  if (!record || (now - record.timestamp) > timeWindowMs) {
    rateLimitMap.set(key, { attempts: 1, timestamp: now });
    return true;
  }

  // If within time window, check attempts
  if (record.attempts >= maxAttempts) {
    return false;
  }

  // Increment attempts
  record.attempts += 1;
  rateLimitMap.set(key, record);
  return true;
}

/**
 * Applies security headers to a Response object
 * @param response The Response object to modify
 * @param headers Optional additional headers
 * @returns The modified Response object
 */
export function applySecurityHeaders(response: Response, headers: Record<string, string> = {}): Response {
  const combinedHeaders = { ...securityHeaders, ...headers };
  
  // Create a new response with the same body but with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers({
      ...Object.fromEntries(response.headers.entries()),
      ...combinedHeaders
    })
  });
}

/**
 * Validates a verification token
 * @param token The token to validate
 * @returns Promise resolving to a boolean indicating if the token is valid
 */
export async function validateVerificationToken(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });

    if (error) throw error;
    return !!data.user;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Checks if a user has exceeded the verification rate limit
 * @param userId The user ID to check
 * @returns Promise resolving to a boolean indicating if the user is rate limited
 */
export async function checkVerificationRateLimit(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_verification_rate_limit', { p_user_id: userId });

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false;
  }
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input The input to sanitize
 * @returns The sanitized input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Checks if the current environment is production
 * @returns Boolean indicating if the current environment is production
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Logs an error with environment-appropriate detail level
 * @param error The error to log
 * @param context Additional context information
 */
export function logError(error: unknown, context: string = ''): void {
  if (isProduction()) {
    // In production, log minimal information
    console.error(`Error in ${context}`);
  } else {
    // In development, log detailed information
    console.error(`Error in ${context}:`, error);
  }
}