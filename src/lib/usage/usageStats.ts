import { supabase } from '../supabase';
import { cacheManager } from '../performance/cacheManager';
import { measureApiCall } from '../performance/performanceMonitor';
import { 
  UsageFilters, 
  UsageStatistics,
  UsageSummaryMetric,
  DailyActiveUsers,
  MonthlyActiveUsers,
  NewUsersByDay,
  FeatureUsage,
  LanguageUsage,
  SectorUsage,
  DeviceUsage,
  HourlyUsage,
  SessionMetrics
} from '../../types/usage';

// Cache TTL values
const USAGE_STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches usage statistics with caching
 */
export async function fetchUsageStatistics(
  filters: UsageFilters
): Promise<UsageStatistics> {
  const cacheKey = `usage_stats_${filters.organizationId}_${filters.timeRange}`;
  
  return cacheManager.getOrCompute(
    cacheKey,
    async () => {
      try {
        // Use the optimized edge function for better performance
        const response = await measureApiCall(
          () => supabase.functions.invoke('get-cached-usage-stats', {
            body: {
              organizationId: filters.organizationId,
              timeRange: filters.timeRange
            }
          }),
          'fetchUsageStatistics',
          'UsageStats',
          filters.organizationId,
          { timeRange: filters.timeRange }
        );

        if (response.error) throw new Error(response.error.message);
        return response.data;
      } catch (error) {
        console.error('Error fetching usage statistics:', error);
        
        // Fallback to direct database query if edge function fails
        return await fetchUsageStatisticsFallback(filters);
      }
    },
    USAGE_STATS_CACHE_TTL
  );
}

/**
 * Fallback method to fetch usage statistics directly from database
 */
async function fetchUsageStatisticsFallback(
  filters: UsageFilters
): Promise<UsageStatistics> {
  try {
    // Get summary metrics
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_usage_summary',
      {
        p_organization_id: filters.organizationId,
        p_days: getTimeRangeDays(filters.timeRange)
      }
    );
    
    if (summaryError) throw summaryError;
    
    // Get usage statistics
    const { data: statsData, error: statsError } = await supabase.rpc(
      'get_usage_stats_cached',
      {
        p_organization_id: filters.organizationId,
        p_time_range: filters.timeRange
      }
    );
    
    if (statsError) throw statsError;
    
    // Process data
    return {
      summary: summaryData,
      dailyActiveUsers: extractMetricData(statsData, 'daily_active_users'),
      monthlyActiveUsers: extractMetricData(statsData, 'monthly_active_users'),
      newUsersByDay: extractMetricData(statsData, 'new_users'),
      featureUsage: extractFeatureUsage(statsData),
      languageUsage: extractDimensionUsage(statsData, 'language_usage'),
      sectorUsage: extractDimensionUsage(statsData, 'sector_usage'),
      deviceUsage: extractDimensionUsage(statsData, 'device_usage'),
      hourlyUsage: extractHourlyUsage(statsData),
      sessionMetrics: extractSessionMetrics(statsData)
    };
  } catch (error) {
    console.error('Error in fallback usage statistics fetch:', error);
    throw error;
  }
}

/**
 * Exports usage data to CSV
 */
export async function exportUsageData(
  filters: UsageFilters,
  dataType: 'dau' | 'mau' | 'features' | 'sectors' | 'languages'
): Promise<void> {
  try {
    // Fetch data
    const stats = await fetchUsageStatistics(filters);
    
    // Determine which data to export
    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];
    
    switch (dataType) {
      case 'dau':
        data = stats.dailyActiveUsers;
        filename = 'daily_active_users';
        headers = ['Date', 'Active Users'];
        break;
      case 'mau':
        data = stats.monthlyActiveUsers;
        filename = 'monthly_active_users';
        headers = ['Month', 'Active Users'];
        break;
      case 'features':
        data = stats.featureUsage;
        filename = 'feature_usage';
        headers = ['Feature', 'Usage Count', 'Unique Users'];
        break;
      case 'sectors':
        data = stats.sectorUsage;
        filename = 'sector_usage';
        headers = ['Sector', 'Usage Count', 'Unique Users'];
        break;
      case 'languages':
        data = stats.languageUsage;
        filename = 'language_usage';
        headers = ['Language', 'Usage Count', 'Unique Users'];
        break;
    }
    
    // Generate CSV
    const csvContent = generateCsv(data, headers, dataType);
    
    // Download file
    downloadCsv(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error) {
    console.error('Error exporting usage data:', error);
    throw error;
  }
}

/**
 * Generates CSV content from data
 */
function generateCsv(
  data: any[],
  headers: string[],
  dataType: string
): string {
  // Create header row
  let csv = headers.join(',') + '\n';
  
  // Add data rows
  for (const item of data) {
    let row = '';
    
    switch (dataType) {
      case 'dau':
      case 'mau':
        row = `"${item.date}",${item.value}`;
        break;
      case 'features':
      case 'sectors':
      case 'languages':
        row = `"${item.name}",${item.count},${item.users}`;
        break;
    }
    
    csv += row + '\n';
  }
  
  return csv;
}

/**
 * Downloads CSV file
 */
function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Extracts metric data by type
 */
function extractMetricData(data: any[], metricType: string): any[] {
  return data
    .filter(item => item.metric_type === metricType)
    .map(item => ({
      date: item.date_dimension,
      value: item.metric_value,
      secondaryValue: item.secondary_value
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Extracts feature usage data
 */
function extractFeatureUsage(data: any[]): FeatureUsage[] {
  return data
    .filter(item => item.metric_type === 'feature_usage')
    .map(item => ({
      name: item.string_dimension,
      count: item.metric_value,
      users: item.secondary_value
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extracts dimension usage data (language, sector, device)
 */
function extractDimensionUsage(data: any[], metricType: string): any[] {
  return data
    .filter(item => item.metric_type === metricType)
    .map(item => ({
      name: item.string_dimension,
      count: item.metric_value,
      users: item.secondary_value
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extracts hourly usage data
 */
function extractHourlyUsage(data: any[]): HourlyUsage[] {
  return data
    .filter(item => item.metric_type === 'hourly_usage')
    .map(item => ({
      hour: item.hour_dimension,
      count: item.metric_value
    }))
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Extracts session metrics
 */
function extractSessionMetrics(data: any[]): SessionMetrics {
  const sessionData = data.find(
    item => 
      item.metric_type === 'session_metrics' && 
      item.string_dimension === 'avg_session_duration'
  );

  return {
    avgSessionDuration: sessionData ? sessionData.metric_value : 0,
    sessionsPerUser: sessionData ? sessionData.secondary_value : 0
  };
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
    case '12m':
      return 365;
    default:
      return 30;
  }
}