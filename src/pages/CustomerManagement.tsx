import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Trash2, 
  Edit, 
  Phone, 
  Mail,
  Tag,
  MoreHorizontal,
  UserPlus,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useSupabase';
import { CustomerInfo } from '../types/profile';
import CustomerInfoCollector from '../components/CustomerInfoCollector';
import { toast } from '../components/Toast';

const CustomerManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchBusinessAndCustomers = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get user's business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (businessError) throw businessError;
        
        if (business) {
          setBusinessId(business.id);
          
          // Get customers for this business
          const { data: customersData, error: customersError } = await supabase
            .from('customers')
            .select(`
              *,
              customer_tags(
                tags(
                  name,
                  color
                )
              )
            `)
            .eq('business_id', business.id)
            .order('created_at', { ascending: false });
          
          if (customersError) throw customersError;
          
          setCustomers(customersData || []);
        }
      } catch (error) {
        console.error('Error fetching business and customers:', error);
        toast.error('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBusinessAndCustomers();
  }, [user]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (customer.name && customer.name.toLowerCase().includes(searchLower)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.phone_number && customer.phone_number.includes(searchQuery)) ||
      (customer.company && customer.company.toLowerCase().includes(searchLower))
    );
  });

  const handleCustomerSave = (customer: CustomerInfo) => {
    setShowAddCustomer(false);
    setEditingCustomerId(null);
    
    // Refresh customer list
    if (businessId) {
      supabase
        .from('customers')
        .select(`
          *,
          customer_tags(
            tags(
              name,
              color
            )
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error refreshing customers:', error);
            return;
          }
          
          if (data) {
            setCustomers(data);
          }
        });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCustomers.length === 0) return;
    
    try {
      setIsDeleting(true);
      
      // Delete selected customers
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', selectedCustomers);
      
      if (error) throw error;
      
      // Update local state
      setCustomers(customers.filter(c => !selectedCustomers.includes(c.id)));
      setSelectedCustomers([]);
      
      toast.success(`${selectedCustomers.length} customer(s) deleted successfully`);
    } catch (error) {
      console.error('Error deleting customers:', error);
      toast.error('Failed to delete customers');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const exportCustomers = () => {
    const customersToExport = selectedCustomers.length > 0
      ? customers.filter(c => selectedCustomers.includes(c.id))
      : filteredCustomers;
    
    // Convert to CSV
    const headers = ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Created At'];
    const csvRows = [headers.join(',')];
    
    customersToExport.forEach(customer => {
      const tags = customer.customer_tags
        ? customer.customer_tags.map((t: any) => t.tags.name).join(';')
        : '';
      
      const row = [
        customer.name || '',
        customer.email || '',
        customer.phone_number || '',
        customer.company || '',
        tags,
        new Date(customer.created_at).toLocaleDateString()
      ].map(value => `"${value.replace(/"/g, '""')}"`);
      
      csvRows.push(row.join(','));
    });
    
    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Management</h1>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-primary focus:border-primary"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
          </div>
          
          <button
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </button>
        </div>
      </div>
      
      {showAddCustomer && businessId && (
        <CustomerInfoCollector
          businessId={businessId}
          onSave={handleCustomerSave}
          onCancel={() => setShowAddCustomer(false)}
        />
      )}
      
      {editingCustomerId && businessId && (
        <CustomerInfoCollector
          businessId={businessId}
          customerId={editingCustomerId}
          onSave={handleCustomerSave}
          onCancel={() => setEditingCustomerId(null)}
        />
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length}
              onChange={selectAllCustomers}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-500">
              {selectedCustomers.length > 0 ? `${selectedCustomers.length} selected` : 'Select all'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedCustomers.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Delete Selected
              </button>
            )}
            
            <button
              onClick={() => {}}
              className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </button>
            
            <button
              onClick={exportCustomers}
              className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name || 'Unnamed Customer'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {customer.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.email && (
                        <div className="flex items-center text-sm text-gray-500 mb-1">
                          <Mail className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <a href={`mailto:${customer.email}`} className="hover:text-primary">
                            {customer.email}
                          </a>
                        </div>
                      )}
                      {customer.phone_number && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <a href={`tel:${customer.phone_number}`} className="hover:text-primary">
                            {customer.phone_number}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.company || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {customer.customer_tags && customer.customer_tags.length > 0 ? (
                          customer.customer_tags.map((tagObj: any, index: number) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tagObj.tags.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingCustomerId(customer.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomers([customer.id]);
                            handleDeleteSelected();
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button className="text-gray-500 hover:text-gray-700">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'No customers match your search criteria.' : 'Get started by adding a new customer.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddCustomer(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Customer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;