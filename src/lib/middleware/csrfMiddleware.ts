import { generateCsrfToken, validateCsrfToken } from '../security';

/**
 * Middleware to add CSRF token to requests
 * @param req The request object
 * @returns Modified request with CSRF token
 */
export function addCsrfTokenMiddleware(req: RequestInit): RequestInit {
  const token = localStorage.getItem('csrf_token') || generateCsrfToken();
  
  return {
    ...req,
    headers: {
      ...req.headers,
      'X-CSRF-Token': token
    }
  };
}

/**
 * Middleware to validate CSRF token in responses
 * @param response The response object
 * @returns Boolean indicating if the CSRF token is valid
 */
export function validateCsrfTokenMiddleware(response: Response): boolean {
  const csrfToken = response.headers.get('X-CSRF-Token');
  
  if (!csrfToken) {
    console.error('CSRF token missing in response');
    return false;
  }
  
  return validateCsrfToken(csrfToken);
}

/**
 * Initializes CSRF protection for the application
 * Generates a token and sets up event listeners for form submissions
 */
export function initCsrfProtection(): void {
  // Generate initial CSRF token
  const token = generateCsrfToken();
  
  // Add CSRF token to all forms
  document.addEventListener('submit', (event) => {
    const form = event.target as HTMLFormElement;
    
    // Skip if not a form or if it already has a CSRF token
    if (!(form instanceof HTMLFormElement) || form.querySelector('input[name="csrf_token"]')) {
      return;
    }
    
    // Create and append CSRF token input
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token';
    csrfInput.value = token;
    form.appendChild(csrfInput);
  });
  
  // Add CSRF token to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    // Only add CSRF token to same-origin requests
    const url = input instanceof Request ? input.url : input.toString();
    const isSameOrigin = url.startsWith(window.location.origin) || url.startsWith('/');
    
    if (isSameOrigin && init) {
      init = addCsrfTokenMiddleware(init);
    }
    
    return originalFetch.call(window, input, init);
  };
}