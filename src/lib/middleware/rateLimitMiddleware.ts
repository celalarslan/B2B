import { checkRateLimit } from '../security';

// Store rate limit configurations
const rateLimitConfigs: Record<string, { maxAttempts: number; timeWindowMs: number }> = {
  'auth': { maxAttempts: 5, timeWindowMs: 60000 }, // 5 attempts per minute
  'support': { maxAttempts: 3, timeWindowMs: 300000 }, // 3 attempts per 5 minutes
  'api': { maxAttempts: 100, timeWindowMs: 60000 }, // 100 attempts per minute
  'default': { maxAttempts: 30, timeWindowMs: 60000 } // 30 attempts per minute
};

/**
 * Middleware to check rate limits for different actions
 * @param action The action to check rate limits for
 * @param identifier Unique identifier for the rate limit (e.g., IP, user ID)
 * @returns Boolean indicating if the request should be allowed
 */
export function checkRateLimitMiddleware(action: string, identifier: string): boolean {
  const config = rateLimitConfigs[action] || rateLimitConfigs.default;
  return checkRateLimit(`${action}:${identifier}`, config.maxAttempts, config.timeWindowMs);
}

/**
 * Middleware to apply rate limiting to a function
 * @param fn The function to rate limit
 * @param action The action category for rate limiting
 * @param getIdentifier Function to extract the identifier from function arguments
 * @returns Rate-limited function
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  action: string,
  getIdentifier: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async function rateLimitedFn(...args: Parameters<T>): Promise<ReturnType<T>> {
    const identifier = getIdentifier(...args);
    
    if (!checkRateLimitMiddleware(action, identifier)) {
      throw new Error(`Rate limit exceeded for ${action}. Please try again later.`);
    }
    
    return fn(...args);
  };
}

/**
 * Applies rate limiting to authentication functions
 * @param authFn Authentication function to rate limit
 * @returns Rate-limited authentication function
 */
export function withAuthRateLimit<T extends (email: string, password: string, ...args: any[]) => Promise<any>>(
  authFn: T
): T {
  return withRateLimit(
    authFn,
    'auth',
    (email) => email
  ) as T;
}

/**
 * Applies rate limiting to support request functions
 * @param supportFn Support function to rate limit
 * @returns Rate-limited support function
 */
export function withSupportRateLimit<T extends (data: { email: string; [key: string]: any }) => Promise<any>>(
  supportFn: T
): T {
  return withRateLimit(
    supportFn,
    'support',
    (data) => data.email
  ) as T;
}