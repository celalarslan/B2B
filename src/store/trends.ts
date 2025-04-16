import { create } from 'zustand';
import { 
  fetchTrendDashboard, 
  fetchTrendData 
} from '../lib/trends/trendAnalyzer';
import { 
  TrendType, 
  TrendFilters, 
  TrendDashboardData 
} from '../types/trends';

interface TrendsState {
  // State
  dashboardData: TrendDashboardData | null;
  isLoading: boolean;
  error: string | null;
  filters: TrendFilters;
  
  // Actions
  setFilters: (filters: Partial<TrendFilters>) => void;
  fetchDashboard: (organizationId: string) => Promise<void>;
  refreshTrends: () => Promise<void>;
}

export const useTrendsStore = create<TrendsState>((set, get) => ({
  // Initial state
  dashboardData: null,
  isLoading: false,
  error: null,
  filters: {
    trendType: 'daily',
    limit: 90
  },
  
  // Set filters
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters }
    }));
    
    // Refresh data if we have dashboard data
    const state = get();
    if (state.dashboardData && state.dashboardData.trends.length > 0) {
      const organizationId = state.dashboardData.trends[0].organization_id;
      get().fetchDashboard(organizationId);
    }
  },
  
  // Fetch dashboard data
  fetchDashboard: async (organizationId) => {
    set({ isLoading: true, error: null });
    
    try {
      const dashboardData = await fetchTrendDashboard(
        organizationId,
        get().filters
      );
      
      set({ dashboardData, isLoading: false });
    } catch (error) {
      console.error('Error fetching trend dashboard:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch trend data',
        isLoading: false 
      });
    }
  },
  
  // Refresh trends data
  refreshTrends: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const state = get();
      
      if (!state.dashboardData || state.dashboardData.trends.length === 0) {
        set({ 
          error: 'No data to refresh',
          isLoading: false 
        });
        return;
      }
      
      const organizationId = state.dashboardData.trends[0].organization_id;
      
      const dashboardData = await fetchTrendDashboard(
        organizationId,
        state.filters
      );
      
      set({ dashboardData, isLoading: false });
    } catch (error) {
      console.error('Error refreshing trend data:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh trend data',
        isLoading: false 
      });
    }
  }
}));