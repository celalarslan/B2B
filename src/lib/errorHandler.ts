import { toast } from '../components/Toast';
import { supabase } from './supabase';
import { isProduction, logError } from './security';

interface ErrorOptions {
  context?: string;
  metadata?: Record<string, any>;
  showToast?: boolean;
  logToServer?: boolean;
}

/**
 * Centralized error handler for API and async operations
 * @param error The error object
 * @param options Additional options for error handling
 */
export async function handleApiError(error: unknown, options: ErrorOptions = {}): Promise<void> {
  const {
    context = 'operation',
    metadata = {},
    showToast = true,
    logToServer = true
  } = options;
  
  // Default error message
  let errorMessage = `An error occurred during ${context}`;
  let errorDetails = '';
  
  // Extract error message based on error type
  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    // Handle Supabase error format
    if ('message' in error) {
      errorMessage = (error as any).message;
    }
    if ('details' in error) {
      errorDetails = (error as any).details;
    }
  }
  
  // Log to console with environment-appropriate detail level
  logError(error, context);
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(errorMessage);
  }
  
  // Log to server if enabled
  if (logToServer) {
    try {
      const componentName = context.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');
      
      // Sanitize error details for production
      const sanitizedDetails = isProduction() 
        ? errorDetails.split('\n')[0] // Only include first line in production
        : errorDetails;
      
      await supabase.from('error_logs').insert({
        error_message: errorMessage,
        stack_trace: sanitizedDetails,
        component_name: componentName,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          environment: isProduction() ? 'production' : 'development'
        }
      });
    } catch (loggingError) {
      // Don't throw from error handler
      console.error('Failed to log error to server:', loggingError);
    }
  }
}

/**
 * Creates a safe async function wrapper that handles errors
 * @param fn The async function to wrap
 * @param options Error handling options
 * @returns A wrapped function that handles errors
 */
export function createSafeAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleApiError(error, options);
      return undefined;
    }
  };
}

/**
 * HOC to add error boundary to a component
 * @param Component The component to wrap
 * @param options Error boundary options
 * @returns A wrapped component with error boundary
 */
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  options: ErrorOptions = {}
): React.FC<P> {
  return function WithErrorHandling(props: P) {
    try {
      return <Component {...props}></Component>;
    } catch (error) {
      handleApiError(error, options);
      return <div>Something went wrong. Please try again.</div>;
    }
  };
}