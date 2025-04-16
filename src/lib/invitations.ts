import { supabase } from './supabase';
import { secureDataAccess } from './security';
import { generateCsrfToken } from './security';
import { withRateLimit } from './rateLimiter';

export interface Invitation {
  organizationId: string;
  organizationName: string;
  role: 'admin' | 'member' | 'viewer';
}

/**
 * Checks if there's a valid invitation for the given email
 * @param email Email address to check
 * @returns Promise resolving to invitation details or null
 */
export async function checkInvitation(email: string): Promise<Invitation | null> {
  try {
    // Generate CSRF token
    const csrfToken = generateCsrfToken();
    
    const { data, error } = await supabase
      .rpc('check_valid_invitation', { 
        p_email: email 
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return {
      organizationId: data[0].organization_id,
      organizationName: data[0].organization_name,
      role: data[0].role
    };
  } catch (error) {
    console.error('Error checking invitation:', error);
    return null;
  }
}

/**
 * Accepts an invitation for the given email and organization
 * @param email Email address
 * @param organizationId Organization ID
 * @returns Promise resolving to boolean indicating success
 */
export const acceptInvitation = withRateLimit(
  async (email: string, organizationId: string): Promise<boolean> => {
    try {
      // Generate CSRF token
      const csrfToken = generateCsrfToken();
      
      const { data, error } = await supabase
        .rpc('accept_invitation', {
          p_email: email,
          p_organization_id: organizationId
        }, {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  },
  'auth',
  (email) => email
);

/**
 * Requests a new invitation for an expired one
 * @param email Email address
 * @param organizationId Organization ID
 * @returns Promise resolving to boolean indicating success
 */
export const requestNewInvitation = withRateLimit(
  async (email: string, organizationId: string): Promise<boolean> => {
    try {
      // Generate CSRF token
      const csrfToken = generateCsrfToken();
      
      const { error } = await supabase
        .from('organization_invites')
        .update({ 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        })
        .eq('email', email)
        .eq('organization_id', organizationId)
        .eq('status', 'expired')
        .select()
        .headers({
          'X-CSRF-Token': csrfToken
        });

      return !error;
    } catch (error) {
      console.error('Error requesting new invitation:', error);
      return false;
    }
  },
  'auth',
  (email) => email
);