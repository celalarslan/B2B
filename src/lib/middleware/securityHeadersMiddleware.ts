/**
 * Security headers to apply to all responses
 */
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://yvwhtdnuevvehjqnqcnv.supabase.co wss://yvwhtdnuevvehjqnqcnv.supabase.co https://api.openai.com https://api.elevenlabs.io; frame-ancestors 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

/**
 * Applies security headers to a Response object
 * @param response The Response object to modify
 * @returns The modified Response object
 */
export function applySecurityHeaders(response: Response): Response {
  // Create a new response with the same body but with security headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers({
      ...Object.fromEntries(response.headers.entries()),
      ...securityHeaders
    })
  });
}

/**
 * Middleware to add security headers to fetch requests
 * @param originalFetch The original fetch function
 * @returns A new fetch function that adds security headers
 */
export function createSecureFetch(originalFetch: typeof fetch): typeof fetch {
  return async function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await originalFetch(input, init);
    return applySecurityHeaders(response);
  };
}

/**
 * Initializes security headers for the application
 * Applies security headers to all fetch requests
 */
export function initSecurityHeaders(): void {
  // Apply security headers to the document
  Object.entries(securityHeaders).forEach(([header, value]) => {
    if (document.head.querySelector(`meta[http-equiv="${header}"]`)) {
      return;
    }
    
    const meta = document.createElement('meta');
    meta.httpEquiv = header;
    meta.content = value;
    document.head.appendChild(meta);
  });
  
  // Override fetch to apply security headers
  const originalFetch = window.fetch;
  window.fetch = createSecureFetch(originalFetch);
}