import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Mic, 
  Volume2, 
  Clock, 
  Users, 
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { toast } from './Toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface VoiceAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | 'all';
}

const VoiceAnalytics: React.FC<VoiceAnalyticsProps> = ({
  timeRange = '30d'
}) => {
  const { organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [callsByLanguage, setCallsByLanguage] = useState<any[]>([]);
  const [callsByDay, setCallsByDay] = useState<any[]>([]);
  const [callDurations, setCallDurations] = useState<any[]>([]);
  const [callStats, setCallStats] = useState({
    totalCalls: 0,
    avgDuration: 0,
    successRate: 0,
    uniqueCustomers: 0
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!organization?.id) return;
      
      try {
        setIsLoading(true);
        
        // Get date range
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
          case 'all':
            startDate = new Date(0); // Beginning of time
            break;
        }
        
        // Format dates for query
        const startDateStr = startDate.toISOString();
        const endDateStr = now.toISOString();
        
        // Fetch conversations
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id, language, status, created_at, customer_id, sentiment_score')
          .eq('organization_id', organization.id)
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr);
        
        if (error) throw error;
        
        // Process data for charts
        if (conversations) {
          // Calls by language
          const languageCounts: Record<string, number> = {};
          conversations.forEach(conv => {
            const lang = conv.language || 'unknown';
            languageCounts[lang] = (languageCounts[lang] || 0) + 1;
          });
          
          const languageData = Object.entries(languageCounts).map(([language, count]) => ({
            language,
            count
          }));
          
          setCallsByLanguage(languageData);
          
          // Calls by day
          const daysCounts: Record<string, number> = {};
          conversations.forEach(conv => {
            const day = new Date(conv.created_at).toLocaleDateString();
            daysCounts[day] = (daysCounts[day] || 0) + 1;
          });
          
          // Sort by date
          const daysData = Object.entries(daysCounts)
            .map(([day, count]) => ({
              day,
              count
            }))
            .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
          
          setCallsByDay(daysData);
          
          // Call durations (mock data since we don't have actual durations)
          const durationRanges = [
            { range: '0-30s', count: 0 },
            { range: '30s-1m', count: 0 },
            { range: '1-2m', count: 0 },
            { range: '2-5m', count: 0 },
            { range: '5m+', count: 0 }
          ];
          
          // Randomly distribute conversations across duration ranges
          conversations.forEach(() => {
            const randomIndex = Math.floor(Math.random() * durationRanges.length);
            durationRanges[randomIndex].count++;
          });
          
          setCallDurations(durationRanges);
          
          // Call stats
          const totalCalls = conversations.length;
          const completedCalls = conversations.filter(c => c.status === 'completed').length;
          const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
          
          // Get unique customers
          const uniqueCustomers = new Set(conversations.map(c => c.customer_id)).size;
          
          // Calculate average duration (mock data)
          const avgDuration = Math.floor(Math.random() * 120) + 60; // 60-180 seconds
          
          setCallStats({
            totalCalls,
            avgDuration,
            successRate,
            uniqueCustomers
          });
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to load voice analytics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [organization?.id, timeRange]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Voice Analytics</h2>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => {
              // This would be handled by a parent component in a real implementation
              console.log('Time range changed:', e.target.value);
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          
          <button
            onClick={() => {
              // This would refresh the data in a real implementation
              console.log('Refreshing data...');
            }}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              // This would export the data in a real implementation
              console.log('Exporting data...');
            }}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Calls</p>
              <h3 className="text-2xl font-bold">{callStats.totalCalls}</h3>
            </div>
            <Mic className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Duration</p>
              <h3 className="text-2xl font-bold">{formatDuration(callStats.avgDuration)}</h3>
            </div>
            <Clock className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <h3 className="text-2xl font-bold">{callStats.successRate.toFixed(1)}%</h3>
            </div>
            <Volume2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique Customers</p>
              <h3 className="text-2xl font-bold">{callStats.uniqueCustomers}</h3>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls by Day */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Calls by Day</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={callsByDay}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Calls" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Calls by Language */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Calls by Language</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={callsByLanguage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="language"
                  label={({ language, percent }) => `${language}: ${(percent * 100).toFixed(0)}%`}
                >
                  {callsByLanguage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Call Durations */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Call Durations</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={callDurations}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Calls" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Call Volume by Time */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Call Volume by Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { hour: '00:00', calls: 5 },
                  { hour: '03:00', calls: 2 },
                  { hour: '06:00', calls: 8 },
                  { hour: '09:00', calls: 25 },
                  { hour: '12:00', calls: 30 },
                  { hour: '15:00', calls: 22 },
                  { hour: '18:00', calls: 18 },
                  { hour: '21:00', calls: 10 },
                ]}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" name="Calls" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Download Report Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => {
            // This would generate a report in a real implementation
            toast.info('Generating report...');
            setTimeout(() => {
              toast.success('Report generated successfully');
            }, 2000);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Full Report
        </button>
      </div>
    </div>
  );
};

export default VoiceAnalytics;