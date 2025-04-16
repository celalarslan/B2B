import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getCurrentUser, getUserBusiness } from '../lib/supabase';
import type { Database } from '../types/database';
import create from 'zustand';

interface AuthStore {
  user: any;
  organization: any;
  isInitialized: boolean;
  setUser: (user: any) => void;
  setOrganization: (org: any) => void;
  setInitialized: (initialized: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  organization: null,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  clear: () => set({ user: null, organization: null, isInitialized: false })
}));

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, organization, isInitialized, setUser, setOrganization, setInitialized, clear } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (mounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        // Fetch organization details
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (orgError && orgError.code !== 'PGRST116') throw orgError;

        if (mounted) {
          setUser(session.user);
          if (org) {
            setOrganization(org);
          }
          setInitialized(true);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError(err.message);
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        clear();
        return;
      }

      if (session?.user) {
        try {
          setUser(session.user);
          
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (orgError && orgError.code !== 'PGRST116') throw orgError;
            
          if (org) {
            setOrganization(org);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clear();
    navigate('/');
  };

  return { 
    user,
    organization,
    isInitialized,
    loading,
    error,
    signOut 
  };
}

function useBusiness() {
  const [business, setBusiness] = useState<Database['public']['Tables']['businesses']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserBusiness().then((data) => {
      setBusiness(data);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  return { business, loading, error };
}

function useCustomers(businessId: string | undefined) {
  const [customers, setCustomers] = useState<Database['public']['Tables']['customers']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
        } else if (data) {
          setCustomers(data);
        }
        setLoading(false);
      });
  }, [businessId]);

  return { customers, loading, error };
}

function useConversations(businessId: string | undefined) {
  const [conversations, setConversations] = useState<Database['public']['Tables']['conversations']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    supabase
      .from('conversations')
      .select(`
        *,
        customers (
          name,
          phone_number
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message);
        } else if (data) {
          setConversations(data);
        }
        setLoading(false);
      });

    // Subscribe to new conversations
    const subscription = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `business_id=eq.${businessId}`
      }, (payload) => {
        setConversations(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [businessId]);

  return { conversations, loading, error };
}