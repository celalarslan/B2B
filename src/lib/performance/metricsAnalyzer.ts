import { supabase } from '../supabase';
import { cacheManager } from './cacheManager';
import { measureApiCall } from './performanceMonitor';
import { 
  PerformanceFilters, 
  PerformanceDashboardData,
  PerformanceMetricStat,
  PerformanceTimeSeries,
  SectorPerformance,
  LanguagePerformance,
  LongestConversation
} from '../../types/performance';

// Cache TTL values
const PERFORMANCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches performance dashboard data with caching
 */
export async function fetchPerformanceDashboard(
  filters: PerformanceFilters
): Promise<PerformanceDashboardData> {
  const cacheKey = `performance_dashboard_${filters.organizationId}_${filters.timeRange}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      try {
        // Fetch all required data in parallel
        const [stats, timeSeries, sectors, languages, longestConversations] = await Promise.all([
          fetchPerformanceStats(filters),
          fetchPerformanceTimeSeries(filters),
          fetchSectorPerformance(filters),
          fetchLanguagePerformance(filters),
          fetchLongestConversations(filters)
        ]);
        
        return {
          stats,
          timeSeries,
          sectors,
          languages,
          longestConversations
        };
      } catch (error) {
        console.error('Error fetching performance dashboard:', error);
        throw error;
      }
    },
    PERFORMANCE_CACHE_TTL
  );
}

/**
 * Fetches performance stats
 */
async function fetchPerformanceStats(
  filters: PerformanceFilters
): Promise<PerformanceMetricStat[]> {
  const { data, error } = await measureApiCall(
    () => supabase.rpc('get_performance_stats', {
      p_organization_id: filters.organizationId,
      p_days: getTimeRangeDays(filters.timeRange)
    }),
    'fetchPerformanceStats',
    'MetricsAnalyzer',
    filters.organizationId,
    { timeRange: filters.timeRange }
  );
  
  if (error) throw error;
  return data;
}

/**
 * Fetches performance time series data
 */
async function fetchPerformanceTimeSeries(
  filters: PerformanceFilters
): Promise<PerformanceTimeSeries[]> {
  const { data, error } = await measureApiCall(
    () => supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .eq('metric_type', 'daily')
      .order('dimension', { ascending: true })
      .limit(getTimeRangeDays(filters.timeRange)),
    'fetchPerformanceTimeSeries',
    'MetricsAnalyzer',
    filters.organizationId,
    { timeRange: filters.timeRange }
  );
  
  if (error) throw error;
  
  // Transform data for frontend
  return data.map(item => ({
    date: item.dimension,
    avgResponseTime: item.avg_ai_response_time,
    p95ResponseTime: item.p95_ai_response_time,
    successRate: item.success_rate,
    avgDuration: item.avg_duration,
    avgUserDelay: item.avg_user_delay,
    avgSttLatency: item.avg_stt_latency,
    avgTtsLatency: item.avg_tts_latency
  }));
}

/**
 * Fetches sector performance data
 */
async function fetchSectorPerformance(
  filters: PerformanceFilters
): Promise<SectorPerformance[]> {
  const { data, error } = await measureApiCall(
    () => supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .eq('metric_type', 'sector')
      .order('avg_ai_response_time', { ascending: false }),
    'fetchSectorPerformance',
    'MetricsAnalyzer',
    filters.organizationId,
    { timeRange: filters.timeRange }
  );
  
  if (error) throw error;
  
  // Transform data for frontend
  return data.map(item => ({
    sector: item.sector_code || 'Unknown',
    avgResponseTime: item.avg_ai_response_time,
    successRate: item.success_rate,
    totalInteractions: item.total_interactions
  }));
}

/**
 * Fetches language performance data
 */
async function fetchLanguagePerformance(
  filters: PerformanceFilters
): Promise<LanguagePerformance[]> {
  const { data, error } = await measureApiCall(
    () => supabase
      .from('performance_insights')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .eq('metric_type', 'language')
      .order('total_interactions', { ascending: false }),
    'fetchLanguagePerformance',
    'MetricsAnalyzer',
    filters.organizationId,
    { timeRange: filters.timeRange }
  );
  
  if (error) throw error;
  
  // Transform data for frontend
  return data.map(item => ({
    language: item.language || 'Unknown',
    avgResponseTime: item.avg_ai_response_time,
    successRate: item.success_rate,
    totalInteractions: item.total_interactions
  }));
}

/**
 * Fetches longest conversations
 */
async function fetchLongestConversations(
  filters: PerformanceFilters
): Promise<LongestConversation[]> {
  const { data, error } = await measureApiCall(
    () => supabase
      .from('performance_metrics')
      .select(`
        id,
        conversation_id,
        total_duration_ms,
        success,
        timestamp,
        customers (
          id,
          name
        )
      `)
      .eq('organization_id', filters.organizationId)
      .order('total_duration_ms', { ascending: false })
      .limit(5),
    'fetchLongestConversations',
    'MetricsAnalyzer',
    filters.organizationId,
    { timeRange: filters.timeRange }
  );
  
  if (error) throw error;
  
  // Transform data for frontend
  return data.map(item => ({
    id: item.id,
    conversationId: item.conversation_id,
    customerId: item.customers?.id || 'Unknown',
    customerName: item.customers?.name || 'Unknown Customer',
    durationMs: item.total_duration_ms,
    success: item.success,
    timestamp: item.timestamp
  }));
}

/**
 * Converts time range to days
 */
function getTimeRangeDays(timeRange: string): number {
  switch (timeRange) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 30;
  }
}