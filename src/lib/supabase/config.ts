import { createClient, SupabaseClient, AuthError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { securityHeaders } from '../middleware/securityHeadersMiddleware';
import { addCsrfTokenMiddleware } from '../middleware/csrfMiddleware';
import { isProduction, logError } from '../security';

/**
 * Environment configuration interface
 */
interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isPreview: boolean;
}

/**
 * Custom error types
 */
class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

class SupabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConnectionError';
  }
}

/**
 * Debug logging configuration
 */
const DEBUG = process.env.NODE_ENV === 'development';
const debug = DEBUG && typeof console !== 'undefined' && console.debug ? 
  (...args: any[]) => console.debug('[Supabase]', ...args) : 
  () => {};

/**
 * Validates environment variables
 */
function validateEnvironment(): EnvironmentConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseConfigError(
      'Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY'
    );
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch {
    throw new SupabaseConfigError('Invalid SUPABASE_URL format');
  }

  // Determine environment
  const isProduction = import.meta.env.PROD;
  const isDevelopment = import.meta.env.DEV;
  const isPreview = window.location.hostname.includes('.webcontainer.io') || 
                   window.location.hostname.includes('.bolt.new');

  return {
    supabaseUrl,
    supabaseAnonKey,
    isProduction,
    isDevelopment,
    isPreview
  };
}

/**
 * Retry configuration
 */
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // ms

/**
 * Retry handler for failed requests
 */
async function retryHandler<T>(
  operation: () => Promise<T>,
  retries: number = RETRY_COUNT
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof Error && !isAuthError(error)) {
      debug(`Operation failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryHandler(operation, retries - 1);
    }
    throw error;
  }
}

/**
 * Type guard for auth errors
 */
function isAuthError(error: Error): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Client options based on environment
 */
function getClientOptions(config: EnvironmentConfig) {
  const baseOptions = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        getItem: (key: string) => {
          try {
            return window.localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            // Fallback to memory storage if localStorage is not available
            console.warn('LocalStorage not available, falling back to memory storage');
          }
        },
        removeItem: (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch {
            // Ignore removal errors in restricted environments
          }
        }
      }
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.x',
        ...securityHeaders
      }
    }
  };

  // Add environment-specific options
  if (config.isProduction) {
    return {
      ...baseOptions,
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    };
  }

  if (config.isPreview) {
    return {
      ...baseOptions,
      headers: {
        'X-WebContainer': 'true',
        ...securityHeaders
      },
      auth: {
        ...baseOptions.auth,
        storageKey: 'sb-preview-auth',
        storage: baseOptions.auth.storage
      }
    };
  }

  return {
    ...baseOptions,
    db: {
      schema: 'public'
    },
    auth: {
      ...baseOptions.auth,
      storageKey: 'sb-dev-auth',
      storage: baseOptions.auth.storage
    }
  };
}

/**
 * Creates and initializes the Supabase client
 */
function createSupabaseClient(): SupabaseClient<Database> {
  try {
    const config = validateEnvironment();
    debug('Environment validated successfully');

    const options = getClientOptions(config);
    debug('Client options configured:', options);

    const client = createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
      options
    );

    // Add request interceptor for CSRF protection and debugging
    if (client.rest && typeof client.rest.request === 'function') {
      const originalRequest = client.rest.request;
      client.rest.request = async (...args) => {
        // Add CSRF token to request
        if (args[1] && typeof args[1] === 'object') {
          args[1] = addCsrfTokenMiddleware(args[1]);
        }
        
        // Debug logging in development
        if (DEBUG) {
          debug('Making request:', {
            url: args[0],
            options: args[1],
            headers: args[1]?.headers
          });
        }
        
        try {
          const result = await originalRequest.apply(client.rest, args);
          if (DEBUG) {
            debug('Request result:', result);
          }
          return result;
        } catch (error) {
          if (DEBUG) {
            debug('Request failed:', error);
          }
          throw error;
        }
      };
    }

    return client;
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      throw error;
    }
    throw new SupabaseConnectionError(
      `Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Singleton instance
 */
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Gets the Supabase client instance
 */
function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

/**
 * Wraps Supabase operations with retry logic
 */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  return retryHandler(operation);
}

/**
 * Health check function
 */
async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('health_check').select('*').limit(1);
    
    if (error) throw error;
    return true;
  } catch (error) {
    debug('Health check failed:', error);
    return false;
  }
}

/**
 * Exports
 */
export const supabase = getSupabaseClient();