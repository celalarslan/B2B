import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useSupabase';
import { trackPageView } from '../lib/usage/usageTracker';

interface UsageEventLoggerProps {
  organizationId: string;
}

export function UsageEventLogger({ organizationId }: UsageEventLoggerProps) {
  const { user, organization } = useAuth();
  const location = useLocation();

  // Skip tracking on authentication pages
  const isAuthPage = location.pathname.match(/\/(login|signup|reset-password|forgot-password)/);
  
  // Enhanced validation for organization ID
  const isValidOrgId = Boolean(
    organizationId &&
    !organizationId.startsWith('0000') &&
    organizationId !== '00000000-0000-0000-0000-000000000000'
  );

  // Only track events if we have both user and valid organization with matching IDs
  // and we're not on an auth page
  const shouldTrackEvents = Boolean(
    !isAuthPage &&
    user && 
    organization && 
    organization.id === organizationId &&
    isValidOrgId
  );

  // Track page views when location changes
  useEffect(() => {
    if (shouldTrackEvents) {
      const pageName = location.pathname.split('/').pop() || 'home';
      trackPageView(pageName, organizationId);
    }
  }, [location, shouldTrackEvents, organizationId]);

  // Set up error tracking
  useEffect(() => {
    if (!shouldTrackEvents) return;

    const originalOnError = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      if (originalOnError) {
        originalOnError.call(window, message, source, lineno, colno, error);
      }
      
      if (error) {
        import('../lib/usage/usageTracker').then(({ trackError }) => {
          trackError(error, organizationId, {
            component: 'global',
            context: { source, lineno, colno }
          });
        });
      }
      
      return false;
    };
    
    return () => {
      window.onerror = originalOnError;
    };
  }, [shouldTrackEvents, organizationId]);

  return null;
}