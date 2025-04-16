import { useState, useEffect, useCallback } from 'react';
import { handleApiError } from '../lib/errorHandler';

interface UseFetchOptions<T> {
  initialData?: T;
  dependencies?: any[];
  skip?: boolean;
  errorOptions?: {
    context?: string;
    metadata?: Record<string, any>;
    showToast?: boolean;
    logToServer?: boolean;
  };
}

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for data fetching with loading and error states
 * @param fetchFn The function that fetches data
 * @param options Configuration options
 * @returns Object with data, loading state, error state, and refetch function
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    initialData = null,
    dependencies = [],
    skip = false,
    errorOptions = {}
  } = options;
  
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!skip);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  
  const fetchData = useCallback(async () => {
    if (skip) return;
    
    setIsLoading(true);
    setIsError(false);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setIsError(true);
      setError(err);
      
      // Use the provided error handler
      await handleApiError(err, {
        context: 'fetching data',
        ...errorOptions
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, skip, errorOptions]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);
  
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);
  
  return { data, isLoading, isError, error, refetch };
}