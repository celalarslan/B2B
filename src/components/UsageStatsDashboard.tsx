import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter, 
  Smartphone, 
  Globe, 
  Building, 
  AlertCircle,
  Zap,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchUsageStatistics, exportUsageData } from '../lib/usage/usageStats';
import { UsageFilters, UsageStatistics } from '../types/usage';
import { useRenderPerformance, measureApiCall } from '../lib/performance/performanceMonitor';
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy load heavy chart components
const LineChart = lazy(() => import('recharts/es6/chart/LineChart'));
const BarChart = lazy(() => import('recharts/es6/chart/BarChart'));
const PieChart = lazy(() => import('recharts/es6/chart/PieChart'));
const Line = lazy(() => import('recharts/es6/cartesian/Line'));
const Bar = lazy(() => import('recharts/es6/cartesian/Bar'));
const Pie = lazy(() => import('recharts/es6/polar/Pie'));
const Cell = lazy(() => import('recharts/es6/component/Cell'));
const XAxis = lazy(() => import('recharts/es6/cartesian/XAxis'));
const YAxis = lazy(() => import('recharts/es6/cartesian/YAxis'));
const CartesianGrid = lazy(() => import('recharts/es6/cartesian/CartesianGrid'));
const Tooltip = lazy(() => import('recharts/es6/component/Tooltip'));
const Legend = lazy(() => import('recharts/es6/component/Legend'));
const ResponsiveContainer = lazy(() => import('recharts/es6/component/ResponsiveContainer'));

// Loading fallback component
const ChartLoading = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface UsageStatsDashboardProps {
  organizationId: string;
}

export function UsageStatsDashboard({ organizationId }: UsageStatsDashboardProps) {
  // Track component render performance
  useRenderPerformance('UsageStatsDashboard', organizationId);
  
  const [filters, setFilters] = useState<UsageFilters>({
    timeRange: '30d',
    organizationId
  });
  
  const [data, setData] = useState<UsageStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCharts, setVisibleCharts] = useState({
    dailyUsers: true,
    monthlyUsers: true,
    newUsers: true,
    features: true,
    languages: true,
    sectors: true,
    devices: true,
    hours: true
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const stats = await measureApiCall(
          () => fetchUsageStatistics(filters),
          'fetchUsageStatistics',
          'UsageStatsDashboard',
          organizationId,
          { timeRange: filters.timeRange }
        );
        
        setData(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filters, organizationId]);

  const handleFilterChange = (newFilters: Partial<UsageFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExport = async (dataType: 'dau' | 'mau' | 'features' | 'sectors' | 'languages') => {
    try {
      await measureApiCall(
        () => exportUsageData(filters, dataType),
        'exportUsageData',
        'UsageStatsDashboard',
        organizationId,
        { dataType, timeRange: filters.timeRange }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  const formatSessionDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getChangeColor = (change: number | null): string => {
    if (change === null) return 'text-gray-500';
    return change > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = (change: number | null, isPositiveGood: boolean = true) => {
    if (change === null) return null;
    const isPositive = change > 0;
    const isGood = isPositiveGood ? isPositive : !isPositive;
    
    return isPositive ? (
      <TrendingUp className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
    ) : (
      <TrendingDown className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />
    );
  };

  // Memoize feature usage data to prevent unnecessary re-renders
  const featureUsage = useMemo(() => {
    if (!data?.featureUsage) return [];
    return data.featureUsage.slice(0, 10);
  }, [data?.featureUsage]);

  // Memoize language usage data to prevent unnecessary re-renders
  const languageUsage = useMemo(() => {
    if (!data?.languageUsage) return [];
    return data.languageUsage;
  }, [data?.languageUsage]);

  // Memoize sector usage data to prevent unnecessary re-renders
  const sectorUsage = useMemo(() => {
    if (!data?.sectorUsage) return [];
    return data.sectorUsage;
  }, [data?.sectorUsage]);

  // Memoize device usage data to prevent unnecessary re-renders
  const deviceUsage = useMemo(() => {
    if (!data?.deviceUsage) return [];
    return data.deviceUsage;
  }, [data?.deviceUsage]);

  // Create a virtualizer for hourly usage data
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const hourlyUsage = useMemo(() => {
    if (!data?.hourlyUsage) return [];
    return Array.from({ length: 24 }).map((_, hour) => {
      const hourData = data.hourlyUsage.find(h => h.hour === hour);
      const count = hourData?.count || 0;
      const maxCount = Math.max(...data.hourlyUsage.map(h => h.count));
      const intensity = maxCount > 0 ? count / maxCount : 0;
      
      // Calculate color based on intensity (from light to dark purple)
      const r = Math.round(157 + (0 - 157) * intensity);
      const g = Math.round(0 + (0 - 0) * intensity);
      const b = Math.round(255 + (128 - 255) * intensity);
      const backgroundColor = `rgb(${r}, ${g}, ${b})`;
      
      return { hour, count, backgroundColor };
    });
  }, [data?.hourlyUsage]);

  const rowVirtualizer = useVirtualizer({
    count: 24,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  if (isLoading && !data) {
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

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usage Statistics</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select
              value={filters.timeRange}
              onChange={(e) => handleFilterChange({ timeRange: e.target.value as UsageFilters['timeRange'] })}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
              <option value="custom">Custom range</option>
            </select>
            
            <button className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
          
          <button 
            onClick={() => handleExport('dau')}
            className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Events */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <h3 className="text-2xl font-bold">
                {data.summary.find(s => s.metric_name === 'total_events')?.metric_value.toLocaleString() || 0}
              </h3>
            </div>
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.summary.find(s => s.metric_name === 'total_events')?.change_percentage || null)}
            <span className={getChangeColor(data.summary.find(s => s.metric_name === 'total_events')?.change_percentage || null)}>
              {data.summary.find(s => s.metric_name === 'total_events')?.change_percentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Unique Users */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique Users</p>
              <h3 className="text-2xl font-bold">
                {data.summary.find(s => s.metric_name === 'unique_users')?.metric_value.toLocaleString() || 0}
              </h3>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.summary.find(s => s.metric_name === 'unique_users')?.change_percentage || null)}
            <span className={getChangeColor(data.summary.find(s => s.metric_name === 'unique_users')?.change_percentage || null)}>
              {data.summary.find(s => s.metric_name === 'unique_users')?.change_percentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Active Days */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Days</p>
              <h3 className="text-2xl font-bold">
                {data.summary.find(s => s.metric_name === 'active_days')?.metric_value || 0}
              </h3>
            </div>
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.summary.find(s => s.metric_name === 'active_days')?.change_percentage || null)}
            <span className={getChangeColor(data.summary.find(s => s.metric_name === 'active_days')?.change_percentage || null)}>
              {data.summary.find(s => s.metric_name === 'active_days')?.change_percentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Avg Session Duration */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Session Duration</p>
              <h3 className="text-2xl font-bold">
                {formatSessionDuration(data.sessionMetrics.avgSessionDuration)}
              </h3>
            </div>
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">
              {data.sessionMetrics.sessionsPerUser.toFixed(1)} sessions per user
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users */}
        {visibleCharts.dailyUsers && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Daily Active Users</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExport('dau')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, dailyUsers: false }))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
                      formatter={(value) => [value, 'Users']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name="Active Users" 
                      stroke="#9d00ff" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.dailyUsers && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, dailyUsers: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Daily Active Users</span>
            </button>
          </div>
        )}

        {/* Monthly Active Users */}
        {visibleCharts.monthlyUsers && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Monthly Active Users</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExport('mau')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, monthlyUsers: false }))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyActiveUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM yyyy')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMMM yyyy')}
                      formatter={(value) => [value, 'Users']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      name="Active Users" 
                      stroke="#00C49F" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.monthlyUsers && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, monthlyUsers: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Monthly Active Users</span>
            </button>
          </div>
        )}

        {/* New Users */}
        {visibleCharts.newUsers && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Users</h3>
              <button 
                onClick={() => setVisibleCharts(prev => ({ ...prev, newUsers: false }))}
                className="text-gray-400 hover:text-gray-500"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.newUsersByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
                      formatter={(value) => [value, 'New Users']}
                    />
                    <Bar 
                      dataKey="count" 
                      name="New Users" 
                      fill="#FFBB28" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.newUsers && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, newUsers: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show New Users</span>
            </button>
          </div>
        )}

        {/* Feature Usage */}
        {visibleCharts.features && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Top Features</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExport('features')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, features: false }))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={featureUsage} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tickFormatter={(value) => value.replace(/_/g, ' ')}
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'count' ? 'Events' : 'Users']}
                      labelFormatter={(value) => value.replace(/_/g, ' ')}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      name="Events" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      dataKey="users" 
                      name="Unique Users" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.features && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, features: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Top Features</span>
            </button>
          </div>
        )}

        {/* Usage by Language */}
        {visibleCharts.languages && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Usage by Language</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExport('languages')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, languages: false }))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageUsage}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {languageUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} events`} />
                    <Legend />
                  </PieChart>
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
              <span>Show Usage by Language</span>
            </button>
          </div>
        )}

        {/* Usage by Sector */}
        {visibleCharts.sectors && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Usage by Sector</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleExport('sectors')}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setVisibleCharts(prev => ({ ...prev, sectors: false }))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorUsage}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {sectorUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} events`} />
                    <Legend />
                  </PieChart>
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
              <span>Show Usage by Sector</span>
            </button>
          </div>
        )}

        {/* Usage by Device */}
        {visibleCharts.devices && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Usage by Device</h3>
              <button 
                onClick={() => setVisibleCharts(prev => ({ ...prev, devices: false }))}
                className="text-gray-400 hover:text-gray-500"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
            <Suspense fallback={<ChartLoading />}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Events' : 'Users']} />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      name="Events" 
                      fill="#FF8042" 
                    />
                    <Bar 
                      dataKey="users" 
                      name="Unique Users" 
                      fill="#0088FE" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Suspense>
          </div>
        )}
        {!visibleCharts.devices && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, devices: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Usage by Device</span>
            </button>
          </div>
        )}

        {/* Usage Heatmap by Hour */}
        {visibleCharts.hours && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Usage by Hour of Day</h3>
              <button 
                onClick={() => setVisibleCharts(prev => ({ ...prev, hours: false }))}
                className="text-gray-400 hover:text-gray-500"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[300px] overflow-auto" ref={parentRef}>
              <div
                className="grid grid-cols-24 gap-1 relative"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const hour = virtualRow.index;
                  const hourData = hourlyUsage[hour];
                  
                  return (
                    <div
                      key={hour}
                      className="flex flex-col items-center justify-center text-xs absolute left-0 right-0"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div 
                        className="w-full flex-1 flex items-center justify-center text-white font-medium"
                        style={{ 
                          backgroundColor: hourData.backgroundColor,
                          minHeight: '20px'
                        }}
                      >
                        {hourData.count > 0 ? hourData.count : ''}
                      </div>
                      <div className="mt-1">{hour}:00</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {!visibleCharts.hours && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <button 
              onClick={() => setVisibleCharts(prev => ({ ...prev, hours: true }))}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className="w-5 h-5 mr-2" />
              <span>Show Usage by Hour of Day</span>
            </button>
          </div>
        )}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Session Metrics</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Average Session Duration</p>
              <p className="text-2xl font-semibold">{formatSessionDuration(data.sessionMetrics.avgSessionDuration)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sessions Per User</p>
              <p className="text-2xl font-semibold">{data.sessionMetrics.sessionsPerUser.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Device Breakdown</h3>
            <Smartphone className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-2">
            {deviceUsage.map(device => (
              <div key={device.name} className="flex items-center justify-between">
                <span className="text-sm">{device.name}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (device.count / deviceUsage.reduce((sum, d) => sum + d.count, 0)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{((device.count / deviceUsage.reduce((sum, d) => sum + d.count, 0)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Language & Sector</h3>
            <div className="flex space-x-2">
              <Globe className="w-5 h-5 text-gray-400" />
              <Building className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Top Languages</p>
              <div className="space-y-1">
                {languageUsage.slice(0, 3).map(lang => (
                  <div key={lang.name} className="flex items-center justify-between">
                    <span className="text-sm">{lang.name}</span>
                    <span className="text-sm text-gray-600">{lang.count} events</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Top Sectors</p>
              <div className="space-y-1">
                {sectorUsage.slice(0, 3).map(sector => (
                  <div key={sector.name} className="flex items-center justify-between">
                    <span className="text-sm">{sector.name}</span>
                    <span className="text-sm text-gray-600">{sector.count} events</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

