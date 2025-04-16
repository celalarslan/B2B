export * from './csrfMiddleware';
export * from './rateLimitMiddleware';
export * from './securityHeadersMiddleware';

import { initCsrfProtection } from './csrfMiddleware';
import { initSecurityHeaders } from './securityHeadersMiddleware';

/**
 * Initializes all security middleware
 */
export function initSecurityMiddleware(): void {
  // Initialize CSRF protection
  initCsrfProtection();
  
  // Initialize security headers
  initSecurityHeaders();
  
  console.log('Security middleware initialized');
}