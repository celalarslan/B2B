import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Clock, 
  Calendar, 
  Filter, 
  Download, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  CheckCircle,
  Mic,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { fetchPerformanceDashboard } from '../lib/performance/metricsAnalyzer';
import { PerformanceFilters, PerformanceDashboardData } from '../types/performance';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface PerformanceDashboardProps {
  organizationId: string;
}

export function PerformanceDashboard({ organizationId }: PerformanceDashboardProps) {
  const [filters, setFilters] = useState<PerformanceFilters>({
    timeRange: '30d',
    organizationId
  });
  
  const [data, setData] = useState<PerformanceDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const dashboardData = await fetchPerformanceDashboard(filters);
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load performance data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filters, organizationId]);

  const handleFilterChange = (newFilters: Partial<PerformanceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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

  if (isLoading) {
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
        <h1 className="text-2xl font-bold">Performance Metrics</h1>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select
              value={filters.timeRange}
              onChange={(e) => handleFilterChange({ timeRange: e.target.value as PerformanceFilters['timeRange'] })}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
            
            <button className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
          
          <button className="flex items-center px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* AI Response Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Response Time</p>
              <h3 className="text-2xl font-bold">
                {formatDuration(data.stats.find(s => s.metricName === 'avg_response_time')?.currentValue || 0)}
              </h3>
            </div>
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.stats.find(s => s.metricName === 'avg_response_time')?.changePercentage || null, false)}
            <span className={getChangeColor(data.stats.find(s => s.metricName === 'avg_response_time')?.changePercentage || null)}>
              {data.stats.find(s => s.metricName === 'avg_response_time')?.changePercentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* P95 Response Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">P95 Response Time</p>
              <h3 className="text-2xl font-bold">
                {formatDuration(data.stats.find(s => s.metricName === 'p95_response_time')?.currentValue || 0)}
              </h3>
            </div>
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.stats.find(s => s.metricName === 'p95_response_time')?.changePercentage || null, false)}
            <span className={getChangeColor(data.stats.find(s => s.metricName === 'p95_response_time')?.changePercentage || null)}>
              {data.stats.find(s => s.metricName === 'p95_response_time')?.changePercentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <h3 className="text-2xl font-bold">
                {(data.stats.find(s => s.metricName === 'success_rate')?.currentValue || 0).toFixed(1)}%
              </h3>
            </div>
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.stats.find(s => s.metricName === 'success_rate')?.changePercentage || null)}
            <span className={getChangeColor(data.stats.find(s => s.metricName === 'success_rate')?.changePercentage || null)}>
              {data.stats.find(s => s.metricName === 'success_rate')?.changePercentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>

        {/* Avg Duration */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Conversation Duration</p>
              <h3 className="text-2xl font-bold">
                {formatDuration(data.stats.find(s => s.metricName === 'avg_duration')?.currentValue || 0)}
              </h3>
            </div>
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            {getChangeIcon(data.stats.find(s => s.metricName === 'avg_duration')?.changePercentage || null, false)}
            <span className={getChangeColor(data.stats.find(s => s.metricName === 'avg_duration')?.changePercentage || null)}>
              {data.stats.find(s => s.metricName === 'avg_duration')?.changePercentage?.toFixed(1)}%
            </span>
            <span className="ml-2 text-gray-500">vs previous period</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Response Time Trends</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatDuration(Number(value))} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgResponseTime" 
                  name="Avg Response Time" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="p95ResponseTime" 
                  name="P95 Response Time" 
                  stroke="#82ca9d" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Success Rate Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Success Rate Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="successRate" 
                  name="Success Rate" 
                  stroke="#ff7300" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by Sector */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Performance by Sector</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.sectors}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="sector" type="category" width={100} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'avgResponseTime') return formatDuration(Number(value));
                  if (name === 'successRate') return `${Number(value).toFixed(1)}%`;
                  return value;
                }} />
                <Legend />
                <Bar 
                  dataKey="avgResponseTime" 
                  name="Avg Response Time" 
                  fill="#8884d8" 
                />
                <Bar 
                  dataKey="successRate" 
                  name="Success Rate" 
                  fill="#82ca9d" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by Language */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Performance by Language</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.languages}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalInteractions"
                  nameKey="language"
                  label={({ language, percent }) => `${language}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.languages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => {
                  if (name === 'totalInteractions') return `${value} interactions`;
                  return value;
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Longest Conversations */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Longest Conversations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.longestConversations.map((conversation) => (
                <tr key={conversation.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {conversation.customerName || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {conversation.customerId.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDuration(conversation.durationMs)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(conversation.timestamp), 'PPp')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      conversation.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {conversation.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Speech Processing Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Speech-to-Text Latency</h3>
            <Mic className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Latency</p>
              <p className="text-2xl font-semibold">
                {formatDuration(data.stats.find(s => s.metricName === 'avg_stt_latency')?.currentValue || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Change</p>
              <div className="flex items-center">
                {getChangeIcon(data.stats.find(s => s.metricName === 'avg_stt_latency')?.changePercentage || null, false)}
                <span className={`text-lg font-semibold ${
                  getChangeColor(data.stats.find(s => s.metricName === 'avg_stt_latency')?.changePercentage || null)
                }`}>
                  {data.stats.find(s => s.metricName === 'avg_stt_latency')?.changePercentage?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Text-to-Speech Latency</h3>
            <Volume2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Latency</p>
              <p className="text-2xl font-semibold">
                {formatDuration(data.stats.find(s => s.metricName === 'avg_tts_latency')?.currentValue || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Change</p>
              <div className="flex items-center">
                {getChangeIcon(data.stats.find(s => s.metricName === 'avg_tts_latency')?.changePercentage || null, false)}
                <span className={`text-lg font-semibold ${
                  getChangeColor(data.stats.find(s => s.metricName === 'avg_tts_latency')?.changePercentage || null)
                }`}>
                  {data.stats.find(s => s.metricName === 'avg_tts_latency')?.changePercentage?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}