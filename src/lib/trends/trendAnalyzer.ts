import { supabase } from '../supabase';
import { cacheManager } from '../performance/cacheManager';
import { measureApiCall } from '../performance/performanceMonitor';
import { 
  TrendType, 
  TrendFilters, 
  TrendDashboardData,
  TrendDataPoint,
  TrendSummary,
  TrendAnomaly,
  TrendForecast,
  SectorTrend,
  LanguageTrend
} from '../../types/trends';

// Cache TTL values
const TRENDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const FORECAST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const ANOMALIES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches trend data with caching
 */
export async function fetchTrendData(
  organizationId: string,
  filters: TrendFilters = { trendType: 'daily' }
): Promise<TrendDataPoint[]> {
  const cacheKey = `trends_${organizationId}_${filters.trendType}_${filters.category || 'all'}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      try {
        // Use the optimized edge function for better performance
        const response = await supabase.functions.invoke('get-cached-trends', {
          body: {
            organizationId,
            trendType: filters.trendType,
            limit: filters.limit || 90,
            category: filters.category
          }
        });

        if (response.error) throw new Error(response.error.message);
        return response.data.trends;
      } catch (error) {
        console.error('Error fetching trend data:', error);
        
        // Fallback to direct database query if edge function fails
        const { data, error: dbError } = await supabase.rpc('get_trend_summary', {
          p_organization_id: organizationId,
          p_trend_type: filters.trendType,
          p_limit: filters.limit || 90,
          p_category: filters.category
        });
        
        if (dbError) throw dbError;
        return data;
      }
    },
    TRENDS_CACHE_TTL
  );
}

/**
 * Fetches trend dashboard data with all components
 */
export async function fetchTrendDashboard(
  organizationId: string,
  filters: TrendFilters = { trendType: 'daily' }
): Promise<TrendDashboardData> {
  const cacheKey = `trend_dashboard_${organizationId}_${filters.trendType}_${filters.category || 'all'}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      try {
        // Use the optimized edge function for better performance
        const response = await measureApiCall(
          () => supabase.functions.invoke('get-cached-trends', {
            body: {
              organizationId,
              trendType: filters.trendType,
              limit: filters.limit || 90,
              category: filters.category
            }
          }),
          'fetchTrendDashboard',
          'TrendAnalyzer',
          organizationId,
          { filters }
        );

        if (response.error) throw new Error(response.error.message);
        return response.data;
      } catch (error) {
        console.error('Error fetching trend dashboard:', error);
        
        // Fallback to individual data fetches if edge function fails
        const [trends, forecast, anomalies, sectorTrends, languageTrends] = await Promise.all([
          fetchTrendData(organizationId, filters),
          fetchTrendForecast(organizationId),
          fetchTrendAnomalies(organizationId),
          fetchSectorTrends(organizationId),
          fetchLanguageTrends(organizationId)
        ]);
        
        return {
          trends,
          summary: calculateTrendSummary(trends),
          forecast,
          anomalies,
          sectorTrends,
          languageTrends
        };
      }
    },
    TRENDS_CACHE_TTL
  );
}

/**
 * Fetches trend forecast data
 */
export async function fetchTrendForecast(
  organizationId: string
): Promise<TrendForecast[]> {
  const cacheKey = `trend_forecast_${organizationId}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      const { data, error } = await supabase.rpc('forecast_trend', {
        p_organization_id: organizationId,
        p_days_ahead: 7,
        p_history_days: 30
      });
      
      if (error) throw error;
      return data;
    },
    FORECAST_CACHE_TTL
  );
}

/**
 * Fetches trend anomalies
 */
export async function fetchTrendAnomalies(
  organizationId: string
): Promise<TrendAnomaly[]> {
  const cacheKey = `trend_anomalies_${organizationId}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      const { data, error } = await supabase.rpc('detect_trend_anomalies', {
        p_organization_id: organizationId,
        p_days: 30,
        p_z_threshold: 2.0
      });
      
      if (error) throw error;
      return data;
    },
    ANOMALIES_CACHE_TTL
  );
}

/**
 * Fetches sector trends
 */
export async function fetchSectorTrends(
  organizationId: string
): Promise<SectorTrend[]> {
  const cacheKey = `sector_trends_${organizationId}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('trend_insights_materialized')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trend_type', 'sector')
        .order('dimension', { ascending: false });
      
      if (error) throw error;
      
      // Group by sector
      const sectorMap = new Map<string, SectorTrend>();
      
      for (const item of data) {
        if (!sectorMap.has(item.category)) {
          sectorMap.set(item.category, {
            sector: item.category,
            periods: [],
            overallTrend: 'no_change',
            overallGrowth: 0
          });
        }
        
        sectorMap.get(item.category)!.periods.push({
          period: item.dimension,
          conversationCount: item.conversation_count,
          customerCount: item.customer_count,
          completionRate: item.completion_rate,
          trend: item.trend_direction,
          changePercentage: item.change_percentage
        });
      }
      
      // Calculate overall trends
      const sectors = Array.from(sectorMap.values());
      
      for (const sector of sectors) {
        if (sector.periods.length >= 2) {
          const first = sector.periods[sector.periods.length - 1];
          const last = sector.periods[0];
          
          if (last.conversationCount > first.conversationCount) {
            sector.overallTrend = 'up';
            sector.overallGrowth = ((last.conversationCount - first.conversationCount) / first.conversationCount) * 100;
          } else if (last.conversationCount < first.conversationCount) {
            sector.overallTrend = 'down';
            sector.overallGrowth = ((first.conversationCount - last.conversationCount) / first.conversationCount) * 100;
          }
        }
      }
      
      return sectors;
    },
    TRENDS_CACHE_TTL
  );
}

/**
 * Fetches language trends
 */
export async function fetchLanguageTrends(
  organizationId: string
): Promise<LanguageTrend[]> {
  const cacheKey = `language_trends_${organizationId}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('trend_insights_materialized')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trend_type', 'language')
        .order('dimension', { ascending: false });
      
      if (error) throw error;
      
      // Group by language
      const languageMap = new Map<string, LanguageTrend>();
      
      for (const item of data) {
        if (!languageMap.has(item.category)) {
          languageMap.set(item.category, {
            language: item.category,
            periods: [],
            overallTrend: 'no_change',
            overallGrowth: 0
          });
        }
        
        languageMap.get(item.category)!.periods.push({
          period: item.dimension,
          conversationCount: item.conversation_count,
          customerCount: item.customer_count,
          completionRate: item.completion_rate,
          trend: item.trend_direction,
          changePercentage: item.change_percentage
        });
      }
      
      // Calculate overall trends
      const languages = Array.from(languageMap.values());
      
      for (const language of languages) {
        if (language.periods.length >= 2) {
          const first = language.periods[language.periods.length - 1];
          const last = language.periods[0];
          
          if (last.conversationCount > first.conversationCount) {
            language.overallTrend = 'up';
            language.overallGrowth = ((last.conversationCount - first.conversationCount) / first.conversationCount) * 100;
          } else if (last.conversationCount < first.conversationCount) {
            language.overallTrend = 'down';
            language.overallGrowth = ((first.conversationCount - last.conversationCount) / first.conversationCount) * 100;
          }
        }
      }
      
      return languages;
    },
    TRENDS_CACHE_TTL
  );
}

/**
 * Calculates trend summary from trend data
 */
function calculateTrendSummary(data: TrendDataPoint[]): TrendSummary {
  if (!data || data.length === 0) {
    return {
      currentPeriod: {
        conversationCount: 0,
        customerCount: 0,
        avgDurationSeconds: 0,
        completionRate: 0,
        avgSentiment: 0
      },
      previousPeriod: {
        conversationCount: 0,
        customerCount: 0,
        avgDurationSeconds: 0,
        completionRate: 0,
        avgSentiment: 0
      },
      changes: {
        conversationCount: { direction: 'no_change', percentage: 0 },
        customerCount: { direction: 'no_change', percentage: 0 },
        avgDurationSeconds: { direction: 'no_change', percentage: 0 },
        completionRate: { direction: 'no_change', percentage: 0 },
        avgSentiment: { direction: 'no_change', percentage: 0 }
      }
    };
  }

  // Sort data by dimension (date) in descending order
  const sortedData = [...data].sort(
    (a, b) => new Date(b.dimension).getTime() - new Date(a.dimension).getTime()
  );

  // Get current and previous periods
  const currentPeriodData = sortedData.slice(0, Math.ceil(sortedData.length / 2));
  const previousPeriodData = sortedData.slice(
    Math.ceil(sortedData.length / 2),
    sortedData.length
  );

  // Calculate averages for current period
  const currentPeriod = {
    conversationCount: average(currentPeriodData.map(d => d.conversation_count)),
    customerCount: average(currentPeriodData.map(d => d.customer_count)),
    avgDurationSeconds: average(currentPeriodData.map(d => d.avg_duration_seconds)),
    completionRate: average(currentPeriodData.map(d => d.completion_rate)),
    avgSentiment: average(currentPeriodData.map(d => d.avg_sentiment))
  };

  // Calculate averages for previous period
  const previousPeriod = {
    conversationCount: average(previousPeriodData.map(d => d.conversation_count)),
    customerCount: average(previousPeriodData.map(d => d.customer_count)),
    avgDurationSeconds: average(previousPeriodData.map(d => d.avg_duration_seconds)),
    completionRate: average(previousPeriodData.map(d => d.completion_rate)),
    avgSentiment: average(previousPeriodData.map(d => d.avg_sentiment))
  };

  // Calculate changes
  const changes = {
    conversationCount: calculateChange(
      currentPeriod.conversationCount,
      previousPeriod.conversationCount
    ),
    customerCount: calculateChange(
      currentPeriod.customerCount,
      previousPeriod.customerCount
    ),
    avgDurationSeconds: calculateChange(
      currentPeriod.avgDurationSeconds,
      previousPeriod.avgDurationSeconds
    ),
    completionRate: calculateChange(
      currentPeriod.completionRate,
      previousPeriod.completionRate
    ),
    avgSentiment: calculateChange(
      currentPeriod.avgSentiment,
      previousPeriod.avgSentiment
    )
  };

  return {
    currentPeriod,
    previousPeriod,
    changes
  };
}

/**
 * Calculates average of values
 */
function average(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + (val || 0), 0);
  return sum / values.length;
}

/**
 * Calculates change between current and previous values
 */
function calculateChange(current: number, previous: number) {
  if (!previous) return { direction: 'no_change' as const, percentage: 0 };
  
  const percentage = ((current - previous) / previous) * 100;
  let direction: 'up' | 'down' | 'no_change' = 'no_change';
  
  if (percentage > 0) direction = 'up';
  else if (percentage < 0) direction = 'down';
  
  return { direction, percentage: Math.abs(percentage) };
}