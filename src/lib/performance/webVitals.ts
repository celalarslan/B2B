import { ReportHandler } from 'web-vitals';
import { supabase } from '../supabase';
import { useAuthStore } from '../../hooks/useSupabase';

/**
 * Logs web vitals metrics to the database
 */
export const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

/**
 * Logs web vitals metrics to the database
 */
export const logWebVitals = async (
  metric: { name: string; value: number; delta: number; id: string },
  organizationId?: string
) => {
  if (!organizationId) {
    // Try to get organization ID from auth store
    const { organization } = useAuthStore.getState();
    organizationId = organization?.id;
  }

  // Skip if no organization ID
  if (!organizationId) return;

  try {
    // Log to Supabase
    await supabase.rpc('log_component_performance_metric', {
      p_component_name: 'web-vitals',
      p_duration_ms: Math.round(metric.value),
      p_event_type: 'web-vital',
      p_metadata: {
        name: metric.name,
        delta: metric.delta,
        id: metric.id
      },
      p_operation_name: metric.name,
      p_organization_id: organizationId
    });
  } catch (error) {
    // Don't let performance logging errors affect the application
    console.error('Failed to log web vitals:', error);
  }
};

/**
 * Initializes web vitals reporting
 */
export const initWebVitals = (organizationId?: string) => {
  reportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(metric);
    }
    
    // Log to database
    logWebVitals(metric, organizationId);
  });
};