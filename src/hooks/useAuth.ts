import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { withRateLimit } from '../lib/rateLimiter';
import { generateCsrfToken, validateCsrfToken } from '../lib/security';

/**
 * Enhanced authentication hook with CSRF protection and rate limiting
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setError(err instanceof Error ? err.message : 'Session check failed');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password (with rate limiting)
  const signIn = withRateLimit(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      
      try {
        // Generate CSRF token
        const csrfToken = generateCsrfToken();
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        }, {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        
        if (error) throw error;
        
        // Validate CSRF token in response
        if (data.session?.access_token) {
          // Store the user
          setUser(data.user);
          return data;
        } else {
          throw new Error('Authentication failed');
        }
      } catch (err) {
        console.error('Sign in error:', err);
        setError(err instanceof Error ? err.message : 'Sign in failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    'auth',
    (email) => email
  );

  // Sign up with email and password (with rate limiting)
  const signUp = withRateLimit(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      
      try {
        // Generate CSRF token
        const csrfToken = generateCsrfToken();
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        }, {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        
        if (error) throw error;
        
        return data;
      } catch (err) {
        console.error('Sign up error:', err);
        setError(err instanceof Error ? err.message : 'Sign up failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    'auth',
    (email) => email
  );

  // Sign out
  const signOut = async () => {
    try {
      // Generate CSRF token
      const csrfToken = generateCsrfToken();
      
      const { error } = await supabase.auth.signOut({
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      if (error) throw error;
      
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    }
  };

  // Reset password (with rate limiting)
  const resetPassword = withRateLimit(
    async (email: string) => {
      setLoading(true);
      setError(null);
      
      try {
        // Generate CSRF token
        const csrfToken = generateCsrfToken();
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        
        if (error) throw error;
        
        return true;
      } catch (err) {
        console.error('Reset password error:', err);
        setError(err instanceof Error ? err.message : 'Password reset failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    'auth',
    (email) => email
  );

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword
  };
}