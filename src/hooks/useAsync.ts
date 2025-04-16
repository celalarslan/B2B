import { useState, useCallback, useEffect } from 'react';
import { handleApiError } from '../lib/errorHandler';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  errorOptions?: {
    context?: string;
    metadata?: Record<string, any>;
    showToast?: boolean;
    logToServer?: boolean;
  };
  immediate?: boolean;
  dependencies?: any[];
}

interface UseAsyncReturn<T, P extends any[]> {
  execute: (...params: P) => Promise<T | undefined>;
  data: T | null;
  error: unknown;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/**
 * Custom hook for handling async operations with loading state and error handling
 * @param asyncFunction The async function to execute
 * @param options Configuration options
 * @returns Object with execution function, data, loading state, and error state
 */
export function useAsync<T, P extends any[] = any[]>(
  asyncFunction: (...params: P) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, P> {
  const {
    onSuccess,
    onError,
    errorOptions = {},
    immediate = false,
    dependencies = []
  } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [params, setParams] = useState<P | null>(null);
  
  const execute = useCallback(
    async (...executeParams: P): Promise<T | undefined> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      try {
        const result = await asyncFunction(...executeParams);
        setData(result);
        setIsSuccess(true);
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (err) {
        setError(err);
        setIsError(true);
        
        // Use the provided error handler
        await handleApiError(err, errorOptions);
        
        if (onError) {
          onError(err);
        }
        
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction, onSuccess, onError, errorOptions]
  );
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
  }, []);
  
  useEffect(() => {
    if (immediate && params) {
      execute(...params);
    }
  }, [immediate, execute, ...dependencies, ...(params || [])]);
  
  return {
    execute,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    reset
  };
}