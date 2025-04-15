import { supabase } from '../supabase';
import { isValidOrganizationId } from '../utils/validation';
import { EventType } from '../../types/usage';

/**
 * Tracks a generic event
 * @param eventType Type of event to track
 * @param organizationId Organization ID
 * @param options Additional options
 */
async function trackEvent(
  eventType: EventType,
  organizationId: string,
  options: {
    eventData?: Record<string, unknown>;
    deviceType?: string;
    language?: string;
    sector?: string;
    sessionId?: string;
  } = {}
): Promise<void> {
  try {
    // Skip tracking for authentication-related pages
    if (eventType === 'dashboard_view' && options.eventData?.page && 
        String(options.eventData.page).match(/^(login|signup|reset-password|forgot-password)$/)) {
      return;
    }

    // Validate organization ID
    if (!isValidOrganizationId(organizationId)) {
      console.warn(`Invalid organization ID: ${organizationId}. Skipping event tracking.`);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user. Skipping event tracking.');
      return;
    }

    // Additional validation to prevent tracking with placeholder org ID
    if (organizationId === '00000000-0000-0000-0000-000000000000') {
      console.warn('Placeholder organization ID detected. Skipping event tracking.');
      return;
    }

    // Call the log_usage_event function
    await supabase.functions.invoke('log-usage-event', {
      body: {
        event_type: eventType,
        event_data: options.eventData || {},
        device_type: options.deviceType || getBrowserInfo(),
        language: options.language,
        sector: options.sector,
        session_id: options.sessionId || getSessionId()
      }
    });
  } catch (error) {
    // Log error but don't throw to prevent app crashes
    console.error('Error tracking event:', error);
  }
}

/**
 * Tracks a page view
 * @param pageName Name of the page
 * @param organizationId Organization ID
 */
export async function trackPageView(
  pageName: string,
  organizationId: string
): Promise<void> {
  // Skip tracking for authentication pages
  if (pageName.match(/^(login|signup|reset-password|forgot-password)$/)) {
    return;
  }

  // Validate organization ID
  if (!isValidOrganizationId(organizationId)) {
    console.warn(`Invalid organization ID: ${organizationId}. Skipping page view tracking.`);
    return;
  }

  await trackEvent('dashboard_view', organizationId, {
    eventData: {
      page: pageName,
      referrer: document.referrer,
      url: window.location.href
    }
  });
}

/**
 * Tracks feature usage
 * @param feature Feature name
 * @param organizationId Organization ID
 * @param options Additional options
 */
async function trackFeatureUsage(
  feature: string,
  organizationId: string,
  options: {
    eventData?: Record<string, unknown>;
    deviceType?: string;
    language?: string;
    sector?: string;
    sessionId?: string;
  } = {}
): Promise<void> {
  // Validate organization ID
  if (!isValidOrganizationId(organizationId)) {
    console.warn(`Invalid organization ID: ${organizationId}. Skipping feature usage tracking.`);
    return;
  }

  // Map feature to event type
  let eventType: EventType;
  
  switch (feature) {
    case 'ai_chat':
      eventType = 'ai_chat';
      break;
    case 'export':
      eventType = 'export_csv';
      break;
    case 'playback':
      eventType = 'call_playback';
      break;
    case 'search':
      eventType = 'search';
      break;
    case 'feedback':
      eventType = 'feedback_submit';
      break;
    default:
      eventType = 'dashboard_view';
  }
  
  await trackEvent(eventType, organizationId, {
    eventData: {
      feature,
      ...options.eventData
    },
    deviceType: options.deviceType,
    language: options.language,
    sector: options.sector,
    sessionId: options.sessionId
  });
}

/**
 * Tracks an error
 * @param error Error object
 * @param organizationId Organization ID
 * @param options Additional options
 */
export async function trackError(
  error: Error,
  organizationId: string,
  options: {
    component?: string;
    context?: Record<string, unknown>;
  } = {}
): Promise<void> {
  // Validate organization ID
  if (!isValidOrganizationId(organizationId)) {
    console.warn(`Invalid organization ID: ${organizationId}. Skipping error tracking.`);
    return;
  }

  // Skip error tracking for invalid organization IDs
  if (organizationId === '00000000-0000-0000-0000-000000000000') {
    console.warn('Placeholder organization ID detected. Skipping error tracking.');
    return;
  }

  await trackEvent('error', organizationId, {
    eventData: {
      message: error.message,
      stack: error.stack,
      component: options.component || 'unknown',
      context: options.context || {}
    }
  });
}

/**
 * Gets browser and device information
 * @returns Device type string
 */
function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  
  if (/mobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet/i.test(ua) || /ipad/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  return deviceType;
}

/**
 * Gets or creates a session ID
 * @returns Session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('session_id');
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);
  }
  
  return sessionId;
}