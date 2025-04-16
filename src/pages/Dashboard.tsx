import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Phone, 
  BarChart, 
  Settings,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  UserPlus,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { format } from 'date-fns';
import ProductRecommendations from '../components/ProductRecommendations';
import SectorSpecificAssistant from '../components/SectorSpecificAssistant';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, organization, loading } = useAuth();
  const [stats, setStats] = useState({
    totalCalls: 0,
    activeCalls: 0,
    successRate: 0,
    avgDuration: 0
  });
  const [recentCalls, setRecentCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [showProductRecommendations, setShowProductRecommendations] = useState(true);
  const [showSectorAssistant, setShowSectorAssistant] = useState(true);

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Fetch business info
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (businessError && businessError.code !== 'PGRST116') {
          throw businessError;
        }
        
        if (business) {
          setBusinessInfo(business);
        }
        
        // Fetch stats
        const { data: statsData, error: statsError } = await supabase
          .from('conversations')
          .select('id, status, created_at')
          .eq('organization_id', organization?.id)
          .order('created_at', { ascending: false });
        
        if (statsError) throw statsError;
        
        // Calculate stats
        const totalCalls = statsData?.length || 0;
        const completedCalls = statsData?.filter(call => call.status === 'completed')?.length || 0;
        const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
        
        // Fetch recent calls with customer info
        const { data: recentCallsData, error: recentCallsError } = await supabase
          .from('conversations')
          .select(`
            id, 
            customer_id, 
            status, 
            language, 
            created_at, 
            sentiment_score,
            customers (id, name, phone_number)
          `)
          .eq('organization_id', organization?.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentCallsError) throw recentCallsError;
        
        setStats({
          totalCalls,
          activeCalls: 0, // This would come from a real-time source
          successRate,
          avgDuration: 120 // Placeholder value in seconds
        });
        
        setRecentCalls(recentCallsData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, organization, loading, navigate]);

  const handlePromptSelect = (prompt: string) => {
    // In a real implementation, this would send the prompt to the AI assistant
    console.log('Selected prompt:', prompt);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Calls</p>
              <h3 className="text-2xl font-bold">{stats.totalCalls}</h3>
            </div>
            <Phone className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Active Calls</p>
              <h3 className="text-2xl font-bold">{stats.activeCalls}</h3>
            </div>
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Success Rate</p>
              <h3 className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</h3>
            </div>
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Avg. Call Duration</p>
              <h3 className="text-2xl font-bold">
                {Math.floor(stats.avgDuration / 60)}m {stats.avgDuration % 60}s
              </h3>
            </div>
            <Clock className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Calls */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>
          
          {recentCalls.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentCalls.map((call: any) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {call.customers?.name || 'Unknown Customer'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {call.customers?.phone_number || 'No phone number'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          call.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : call.status === 'missed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {call.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {call.created_at ? format(new Date(call.created_at), 'PPp') : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => navigate(`/conversations/${call.id}`)}
                          className="text-primary hover:text-primary/80"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No calls yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your recent calls will appear here once you start receiving them.
              </p>
            </div>
          )}
        </div>
        
        {/* Sector-Specific Assistant */}
        {showSectorAssistant && businessInfo?.sector && (
          <SectorSpecificAssistant 
            sector={businessInfo.sector}
            onPromptSelect={handlePromptSelect}
          />
        )}
      </div>
      
      {/* Product Recommendations */}
      {showProductRecommendations && businessInfo?.sector && (
        <ProductRecommendations 
          sector={businessInfo.sector}
          onProductSelect={(product) => {
            console.log('Selected product:', product);
            // In a real implementation, this would open a product details modal
            // or navigate to a product details page
          }}
        />
      )}
      
      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/dashboard/settings')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Settings className="h-6 w-6 text-primary mr-3" />
            <span>Configure Settings</span>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/customers')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <UserPlus className="h-6 w-6 text-primary mr-3" />
            <span>Manage Customers</span>
          </button>
          
          <button 
            onClick={() => navigate('/dashboard/voice')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Phone className="h-6 w-6 text-primary mr-3" />
            <span>Voice Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;