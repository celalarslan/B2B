import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  Filter,
  Download,
  ChevronUp,
  ChevronDown,
  Clock,
  Users,
  CheckSquare,
  Smile,
  AlertTriangle,
  Zap,
  Globe,
  Building
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { useTrendsStore } from '../store/trends';
import { 
  TrendType, 
  TrendDirection, 
  TrendDataPoint, 
  TrendAnomaly, 
  TrendForecast,
  SectorTrend,
  LanguageTrend
} from '../types/trends';
import { useRenderPerformance, measureApiCall } from '../lib/performance/performanceMonitor';

// Lazy load heavy chart components
const LineChart = lazy(() => import('recharts/es6/chart/LineChart'));
const BarChart = lazy(() => import('recharts/es6/chart/BarChart'));
const AreaChart = lazy(() => import('recharts/es6/chart/AreaChart'));
const Line = lazy(() => import('recharts/es6/cartesian/Line'));
const Area = lazy(() => import('recharts/es6/cartesian/Area'));
const Bar = lazy(() => import('recharts/es6/cartesian/Bar'));
const XAxis = lazy(() => import('recharts/es6/cartesian/XAxis'));
const YAxis = lazy(() => import('recharts/es6/cartesian/YAxis'));
const CartesianGrid = lazy(() => import('recharts/es6/cartesian/CartesianGrid'));
const Tooltip = lazy(() => import('recharts/es6/component/Tooltip'));
const Legend = lazy(() => import('recharts/es6/component/Legend'));
const ResponsiveContainer = lazy(() => import('recharts/es6/component/ResponsiveContainer'));
const ReferenceLine = lazy(() => import('recharts/es6/cartesian/ReferenceLine'));

// Loading fallback component
const ChartLoading = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

interface TrendDashboardProps {
  organizationId: string;
}

export function TrendDashboard({ organizationId }: TrendDashboardProps) {
  // Track component render performance
  useRenderPerformance('TrendDashboard', organizationId);
  
  const { 
    filters, 
    dashboardData, 
    isLoading, 
    error, 
    setFilters, 
    fetchDashboard, 
    refreshTrends 
  } = useTrendsStore();

  const [selectedTrendType, setSelectedTrendType] = useState<TrendType>('daily');
  const [visibleCharts, setVisibleCharts] = useState({
    mainTrend: true,
    forecast: true,
    sectors: true,
    languages: true,
    retention: true
  });

  // Fetch data on mount or when organizationId changes
  useEffect(() => {
    const loadData = async () => {
      await measureApiCall(
        () => fetchDashboard(organizationId),
        'fetchDashboard',
        'TrendDashboard',
        organizationId,
        { selectedTrendType }
      );
    };
    
    loadData();
  }, [organizationId, fetchDashboard]);

  const handleTrendTypeChange = (trendType: TrendType) => {
    setSelectedTrendType(trendType);
    setFilters({ trendType });
  };

  const handleRefresh = async () => {
    await measureApiCall(
      () => refreshTrends(),
      'refreshTrends',
      'TrendDashboard',
      organizationId,
      { selectedTrendType }
    );
  };

  const getTrendIcon = (direction?: TrendDirection, size: number = 4) => {
    if (!direction || direction === 'no_change') {
      return <Minus className={`w-${size} h-${size} text-gray-500`} />;
    }
    
    return direction === 'up' ? (
      <TrendingUp className={`w-${size} h-${size} text-green-500`} />
    ) : (
      <TrendingDown className={`w-${size} h-${size} text-red-500`} />
    );
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value?: number): string => {
    if (value === undefined || value === null) return '0%';
    return `${value.toFixed(1)}%`;
  };

  const formatSentiment = (value?: number): string => {
    if (value === undefined || value === null) return 'Neutral';
    if (value > 0.3) return 'Positive';
    if (value < -0.3) return 'Negative';
    return 'Neutral';
  };

  const getSentimentColor = (value?: number): string => {
    if (value === undefined || value === null) return 'text-gray-500';
    if (value > 0.3) return 'text-green-500';
    if (value < -0.3) return 'text-red-500';
    return 'text-yellow-500';
  };

  // Memoize trend data to prevent unnecessary re-renders
  const trendData = useMemo(() => {
    if (!dashboardData?.trends) return [];
    
    return dashboardData.trends
      .sort((a, b) => new Date(a.dimension).getTime() - new Date(b.dimension).getTime())
      .map(trend => ({
        ...trend,
        date: format(parseISO(trend.dimension), 'MMM dd'),
        formattedDate: format(parseISO(trend.dimension), 'MMMM d, yyyy')
      }));
  }, [dashboardData?.trends]);

  // Memoize forecast data to prevent unnecessary re-renders
  const forecastData = useMemo(() => {
    if (!dashboardData?.trends || !dashboardData?.forecast) return [];
    
    return [
      ...trendData.slice(-7), // Last 7 days of actual data
      ...dashboardData.forecast.map(f => ({
        dimension: f.forecastDate,
        date: format(parseISO(f.forecastDate), 'MMM dd'),
        formattedDate: format(parseISO(f.forecastDate), 'MMMM d, yyyy'),
        conversationCount: null,
        forecast: f.predictedConversations,
        forecastLow: f.predictionIntervalLow,
        forecastHigh: f.predictionIntervalHigh
      }))
    ];
  }, [dashboardData?.trends, dashboardData?.forecast, trendData]);

  // Memoize sector data to prevent unnecessary re-renders
  const sectorData = useMemo(() => {
    if (!dashboardData?.sectorTrends) return [];
    
    return dashboardData.sectorTrends.slice(0, 5).map(sector => {
      const latestPeriod = sector.periods[sector.periods.length - 1];
      return {
        sector: sector.sector,
        conversationCount: latestPeriod?.conversationCount || 0,
        growth: sector.overallGrowth,
        trend: sector.overallTrend
      };
    });
  }, [dashboardData?.sectorTrends]);

  // Memoize language data to prevent unnecessary re-renders
  const languageData = useMemo(() => {
    if (!dashboardData?.languageTrends) return [];
    
    return dashboardData.languageTrends.slice(0, 5).map(language => {
      const latestPeriod = language.periods[language.periods.length - 1];
      return {
        language: language.language,
        conversationCount: latestPeriod?.conversationCount || 0,
        growth: language.overallGrowth,
        trend: language.overallTrend
      };
    });
  }, [dashboardData?.languageTrends]);

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="ml-2 text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { summary } = dashboardData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trend Analysis</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select
              value={selectedTrendType}
              onChange={(e) => handleTrendTypeChange(e.target.value as TrendType)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            
            <button className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Conversation Count */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversations</p>
              <h3 className="text-2xl font-bold">
                {summary.currentPeriod.conversationCount.toLocaleString()}
              </h3>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getTrendIcon(summary.changes.conversationCount.direction)}
            <span className={`ml-1 ${summary.changes.conversationCount.direction === 'up' ? 'text-green-500' : summary.changes.conversationCount.direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {summary.changes.conversationCount.percentage.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Customer Count */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique Customers</p>
              <h3 className="text-2xl font-bold">
                {summary.currentPeriod.customerCount.toLocaleString()}
              </h3>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getTrendIcon(summary.changes.customerCount.direction)}
            <span className={`ml-1 ${summary.changes.customerCount.direction === 'up' ? 'text-green-500' : summary.changes.customerCount.direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {summary.changes.customerCount.percentage.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Duration</p>
              <h3 className="text-2xl font-bold">
                {formatDuration(summary.currentPeriod.avgDurationSeconds)}
              </h3>
            </div>
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getTrendIcon(summary.changes.avgDurationSeconds?.direction)}
            <span className={`ml-1 ${summary.changes.avgDurationSeconds?.direction === 'up' ? 'text-green-500' : summary.changes.avgDurationSeconds?.direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {summary.changes.avgDurationSeconds?.percentage.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <h3 className="text-2xl font-bold">
                {formatPercentage(summary.currentPeriod.completionRate)}
              </h3>
            </div>
            <CheckSquare className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getTrendIcon(summary.changes.completionRate?.direction)}
            <span className={`ml-1 ${summary.changes.completionRate?.direction === 'up' ? 'text-green-500' : summary.changes.completionRate?.direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {summary.changes.completionRate?.percentage.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Avg Sentiment */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sentiment</p>
              <h3 className={`text-2xl font-bold ${getSentimentColor(summary.currentPeriod.avgSentiment)}`}>
                {formatSentiment(summary.currentPeriod.avgSentiment)}
              </h3>
            </div>
            <Smile className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getTrendIcon(summary.changes.avgSentiment?.direction)}
            <span className={`ml-1 ${summary.changes.avgSentiment?.direction === 'up' ? 'text-green-500' : summary.changes.avgSentiment?.direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
              {summary.changes.avgSentiment?.percentage.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      {visibleCharts.mainTrend && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversation Volume Trend</h2>
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, mainTrend: false }))}
              className="text-gray-400 hover:text-gray-500"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          <Suspense fallback={<ChartLoading />}>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.formattedDate;
                      }
                      return value;
                    }}
                    formatter={(value, name) => {
                      if (name === 'conversationCount') return [value, 'Conversations'];
                      if (name === 'ma7') return [value, '7-day Avg'];
                      if (name === 'ma30') return [value, '30-day Avg'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="conversationCount" 
                    name="Conversations" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.2}
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trendSummary.ma7_conversation_count" 
                    name="7-day Avg" 
                    stroke="#82ca9d" 
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trendSummary.ma30_conversation_count" 
                    name="30-day Avg" 
                    stroke="#ff7300" 
                    dot={false}
                  />
                  {/* Mark anomalies */}
                  {trendData.filter(d => d.isAnomaly).map((anomaly, index) => (
                    <ReferenceLine 
                      key={index}
                      x={anomaly.date} 
                      stroke="red" 
                      strokeDasharray="3 3"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Suspense>
        </div>
      )}
      {!visibleCharts.mainTrend && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <button 
            onClick={() => setVisibleCharts(prev => ({ ...prev, mainTrend: true }))}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronDown className="w-5 h-5 mr-2" />
            <span>Show Conversation Volume Trend</span>
          </button>
        </div>
      )}

      {/* Forecast Chart */}
      {visibleCharts.forecast && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">7-Day Forecast</h2>
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, forecast: false }))}
              className="text-gray-400 hover:text-gray-500"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          <Suspense fallback={<ChartLoading />}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => value}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.formattedDate;
                      }
                      return value;
                    }}
                    formatter={(value, name) => {
                      if (name === 'conversationCount') return [value, 'Actual'];
                      if (name === 'forecast') return [value?.toFixed(0), 'Forecast'];
                      if (name === 'forecastLow') return [value?.toFixed(0), 'Lower Bound'];
                      if (name === 'forecastHigh') return [value?.toFixed(0), 'Upper Bound'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="conversationCount" 
                    name="Actual" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke="#ff7300"
                    fill="#ff7300"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastLow"
                    name="Lower Bound"
                    stroke="#ff7300"
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastHigh"
                    name="Upper Bound"
                    stroke="#ff7300"
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <ReferenceLine x={trendData[trendData.length - 1]?.date} stroke="#666" strokeDasharray="3 3" label="Today" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Suspense>
        </div>
      )}
      {!visibleCharts.forecast && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <button 
            onClick={() => setVisibleCharts(prev => ({ ...prev, forecast: true }))}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronDown className="w-5 h-5 mr-2" />
            <span>Show 7-Day Forecast</span>
          </button>
        </div>
      )}

      {/* Sector and Language Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Trends */}
        {visibleCharts.sectors && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Sector Trends</h2>
              <button 
                onClick={() => setVisibleCharts(prev => ({ ...prev, sectors: false }))}
                className="text-gray-400 hover:text-gray-500"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectorData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="sector" 
                      type="category" 
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'conversationCount') return [value, 'Conversations'];
                        if (name === 'growth') return [`${value.toFixed(1)}%`, 'Growth'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="conversationCount" 
                      name="Conversations" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      dataKey="growth" 
                      name="Growth %" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.sectors && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, sectors: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Sector Trends</span>
            </button>
          </div>
        )}

        {/* Language Trends */}
        {visibleCharts.languages && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Language Trends</h2>
              <button 
                onClick={() => setVisibleCharts(prev => ({ ...prev, languages: false }))}
                className="text-gray-400 hover:text-gray-500"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={languageData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="language" 
                      type="category" 
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'conversationCount') return [value, 'Conversations'];
                        if (name === 'growth') return [`${value.toFixed(1)}%`, 'Growth'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="conversationCount" 
                      name="Conversations" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      dataKey="growth" 
                      name="Growth %" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.languages && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, languages: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Language Trends</span>
            </button>
          </div>
        )}
      </div>

      {/* Anomalies */}
      {dashboardData.anomalies.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Detected Anomalies</h2>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deviation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Z-Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.anomalies.map((anomaly, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(parseISO(anomaly.dimension), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {anomaly.metricName.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {anomaly.actualValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {anomaly.expectedValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={anomaly.deviationPercentage > 0 ? 'text-green-500' : 'text-red-500'}>
                        {anomaly.deviationPercentage > 0 ? '+' : ''}{anomaly.deviationPercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {anomaly.zScore.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retention Curve */}
      {visibleCharts.retention && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Customer Retention Trend</h2>
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, retention: false }))}
              className="text-gray-400 hover:text-gray-500"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          <Suspense fallback={<ChartLoading />}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { day: 1, retention: 100 },
                    { day: 7, retention: 65 },
                    { day: 14, retention: 48 },
                    { day: 30, retention: 35 },
                    { day: 60, retention: 28 },
                    { day: 90, retention: 22 }
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    label={{ value: 'Days', position: 'insideBottomRight', offset: -10 }}
                  />
                  <YAxis 
                    label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip formatter={(value) => [`${value}%`, 'Retention']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="retention" 
                    name="Retention %" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Suspense>
        </div>
      )}
      {!visibleCharts.retention && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <button 
            onClick={() => setVisibleCharts(prev => ({ ...prev, retention: true }))}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronDown className="w-5 h-5 mr-2" />
            <span>Show Customer Retention Trend</span>
          </button>
        </div>
      )}
    </div>
  );
}

