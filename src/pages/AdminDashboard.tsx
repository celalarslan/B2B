import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  BarChart, 
  Shield, 
  Database, 
  Server,
  Bell,
  UserPlus,
  Trash2,
  Edit,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select(`
            id,
            user_id,
            full_name,
            job_title,
            language_preference,
            last_login_at,
            organization_id,
            organizations (
              id,
              legal_name
            )
          `)
          .order('created_at', { ascending: false });
        
        if (usersError) throw usersError;
        
        // Fetch organizations
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select(`
            id,
            legal_name,
            trading_name,
            primary_sector,
            country,
            is_active,
            created_at,
            user_id
          `)
          .order('created_at', { ascending: false });
        
        if (orgsError) throw orgsError;
        
        setUsers(usersData || []);
        setOrganizations(orgsData || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [user]);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrganizations = organizations.filter(org => 
    org.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.trading_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.primary_sector?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Refresh users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          job_title,
          language_preference,
          last_login_at,
          organization_id,
          organizations (
            id,
            legal_name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      
      // Refresh organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          legal_name,
          trading_name,
          primary_sector,
          country,
          is_active,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false });
      
      if (orgsError) throw orgsError;
      
      setUsers(usersData || []);
      setOrganizations(orgsData || []);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-primary focus:border-primary"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Refresh data"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => {/* Export functionality */}}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Export data"
          >
            <Download className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Users</p>
              <h3 className="text-2xl font-bold">{users.length}</h3>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Organizations</p>
              <h3 className="text-2xl font-bold">{organizations.length}</h3>
            </div>
            <Database className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Active Organizations</p>
              <h3 className="text-2xl font-bold">
                {organizations.filter(org => org.is_active).length}
              </h3>
            </div>
            <Server className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">New Today</p>
              <h3 className="text-2xl font-bold">
                {organizations.filter(org => 
                  new Date(org.created_at).toDateString() === new Date().toDateString()
                ).length}
              </h3>
            </div>
            <Bell className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'organizations' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('organizations')}
        >
          Organizations
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'security' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">User Management</h2>
              <button
                className="flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                onClick={() => {/* Add user functionality */}}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.job_title || 'No title'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Member
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.organizations?.legal_name || 'No organization'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login_at ? format(new Date(user.last_login_at), 'PPp') : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            onClick={() => {/* Edit user functionality */}}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {/* Delete user functionality */}}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'organizations' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Organization Management</h2>
              <button
                className="flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                onClick={() => {/* Add organization functionality */}}
              >
                <Database className="w-4 h-4 mr-2" />
                Add Organization
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Database className="h-5 w-5 text-primary" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {org.legal_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {org.trading_name || 'No trading name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {org.primary_sector || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {org.country || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          org.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(org.created_at), 'PP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            onClick={() => {/* Edit organization functionality */}}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {/* Delete organization functionality */}}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">General Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      System Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      defaultValue="B2B Call Assistant"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Language
                    </label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option value="en">English</option>
                      <option value="tr">Turkish</option>
                      <option value="fr">French</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Email Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Server
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="587"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">API Settings</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="sk-••••••••••••••••••••••••••••••••••••••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ElevenLabs API Key
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="••••••••••••••••••••••••••••••••••••••••••••"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
            <div className="space-y-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Password Policy</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="minLength"
                      className="mr-2"
                      defaultChecked
                    />
                    <label htmlFor="minLength" className="text-sm">
                      Minimum length: 12 characters
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="uppercase"
                      className="mr-2"
                      defaultChecked
                    />
                    <label htmlFor="uppercase" className="text-sm">
                      Require uppercase letters
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="numbers"
                      className="mr-2"
                      defaultChecked
                    />
                    <label htmlFor="numbers" className="text-sm">
                      Require numbers
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="special"
                      className="mr-2"
                      defaultChecked
                    />
                    <label htmlFor="special" className="text-sm">
                      Require special characters
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Require 2FA for all admin users</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Adds an extra layer of security for administrative accounts
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input
                      type="checkbox"
                      id="toggle2FA"
                      className="sr-only"
                    />
                    <label
                      htmlFor="toggle2FA"
                      className="block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                    >
                      <span className="block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out"></span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Session Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      defaultValue="60"
                      min="5"
                      max="1440"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      defaultValue="5"
                      min="3"
                      max="10"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Save Security Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;