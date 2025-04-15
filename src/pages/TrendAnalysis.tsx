import React, { useState, useEffect } from 'react';
import { TrendDashboard } from '../components/TrendDashboard';
import { useAuth } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { trackPageView } from '../lib/usage/usageTracker';

export default function TrendAnalysis() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizationId = async () => {
      if (!user) return;
      
      try {
        // Get the user's organization
        const { data, error } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data?.id) {
          setOrganizationId(data.id);
          // Only track page view if we have a valid organization ID
          trackPageView('trend-analysis', data.id);
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizationId();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render dashboard if we have a valid organization ID
  if (!organizationId) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-700">Please set up your organization to view trend analysis.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trend Analysis</h1>
        <p className="mt-2 text-gray-600">
          Identify patterns, growth dynamics, and shifts in user behavior over time.
        </p>
      </div>

      <TrendDashboard organizationId={organizationId} />
    </div>
  );
}