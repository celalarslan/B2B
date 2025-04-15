import { supabase } from '../supabase';
import { isValidOrganizationId } from '../utils/validation';

// Performance metrics tracking
interface PerformanceMetric {
  componentName: string;
  operationName: string;
  durationMs: number;
  eventType: 'render' | 'api' | 'computation' | 'interaction';
  metadata?: Record<string, any>;
}

// Cache for component render times to avoid excessive logging
const renderTimeCache = new Map<string, number>();
const API_CALL_THRESHOLD_MS = 500; // Log API calls taking longer than 500ms
const RENDER_THRESHOLD_MS = 200; // Log renders taking longer than 200ms

/**
 * Logs a performance metric to the database
 */
export async function logPerformanceMetric(
  metric: PerformanceMetric,
  organizationId: string
): Promise<void> {
  // Skip logging if no valid organization ID
  if (!isValidOrganizationId(organizationId)) {
    console.warn('Invalid organization ID for performance logging');
    return;
  }

  try {
    await supabase.rpc('log_component_performance_metric', {
      p_component_name: metric.componentName,
      p_duration_ms: metric.durationMs,
      p_event_type: metric.eventType,
      p_metadata: metric.metadata || {},
      p_operation_name: metric.operationName,
      p_organization_id: organizationId
    });
  } catch (error) {
    // Don't let performance logging errors affect the application
    console.error('Failed to log performance metric:', error);
  }
}

/**
 * Measures the execution time of an async function and logs it
 */
export async function measureApiCall<T>(
  fn: () => Promise<T>,
  operationName: string,
  componentName: string,
  organizationId: string,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Only log if the operation took longer than the threshold
    if (duration > API_CALL_THRESHOLD_MS) {
      await logPerformanceMetric({
        componentName,
        operationName,
        durationMs: duration,
        eventType: 'api',
        metadata
      }, organizationId);
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Always log failed operations
    await logPerformanceMetric({
      componentName,
      operationName: `${operationName}_failed`,
      durationMs: duration,
      eventType: 'api',
      metadata: {
        ...metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }, organizationId);
    
    throw error;
  }
}

/**
 * React hook to measure component render time
 */
export function useRenderPerformance(
  componentName: string,
  organizationId: string
): void {
  if (process.env.NODE_ENV === 'production') {
    // In production, use a more efficient approach with React Profiler
    return;
  }
  
  // Skip if no valid organization ID
  if (!isValidOrganizationId(organizationId)) {
    return;
  }
  
  const startTime = performance.now();
  const cacheKey = `${componentName}_${organizationId}`;
  
  // Store start time in cache
  renderTimeCache.set(cacheKey, startTime);
  
  // Use React's useEffect cleanup to measure render time
  React.useEffect(() => {
    const endTime = performance.now();
    const startTime = renderTimeCache.get(cacheKey);
    
    if (startTime) {
      const duration = Math.round(endTime - startTime);
      
      // Only log if render took longer than threshold
      if (duration > RENDER_THRESHOLD_MS) {
        logPerformanceMetric({
          componentName,
          operationName: 'render',
          durationMs: duration,
          eventType: 'render'
        }, organizationId).catch(console.error);
      }
    }
    
    // Cleanup function
    return () => {
      renderTimeCache.delete(cacheKey);
    };
  }, [componentName, organizationId, cacheKey]);
}

/**
 * Measures a synchronous operation and logs it if it exceeds threshold
 */
export function measureSyncOperation<T>(
  fn: () => T,
  operationName: string,
  componentName: string,
  organizationId: string,
  metadata?: Record<string, any>
): T {
  const startTime = performance.now();
  try {
    const result = fn();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Only log if operation took longer than 50ms
    if (duration > 50) {
      logPerformanceMetric({
        componentName,
        operationName,
        durationMs: duration,
        eventType: 'computation',
        metadata
      }, organizationId).catch(console.error);
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Always log failed operations
    logPerformanceMetric({
      componentName,
      operationName: `${operationName}_failed`,
      durationMs: duration,
      eventType: 'computation',
      metadata: {
        ...metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }, organizationId).catch(console.error);
    
    throw error;
  }
}

// React import for the hook
import React from 'react';