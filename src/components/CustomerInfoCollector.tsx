import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, User, Mail, Phone, MapPin, Building, Tag, X } from 'lucide-react';
import { CustomerInfo } from '../types/profile';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

type FormData = z.infer<typeof customerSchema>;

interface CustomerInfoCollectorProps {
  businessId: string;
  customerId?: string;
  onSave?: (customer: CustomerInfo) => void;
  onCancel?: () => void;
}

const CustomerInfoCollector: React.FC<CustomerInfoCollectorProps> = ({
  businessId,
  customerId,
  onSave,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const { 
    control, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<FormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      address: '',
      company: '',
      notes: '',
      preferredLanguage: 'EN',
    }
  });

  // Fetch customer data if editing
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!customerId) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('customers')
          .select('*, customer_tags(tag_id, tags(name))')
          .eq('id', customerId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          reset({
            name: data.name || '',
            email: data.email || '',
            phoneNumber: data.phone_number || '',
            address: data.address || '',
            company: data.company || '',
            notes: data.notes || '',
            preferredLanguage: data.preferred_language || 'EN',
          });
          
          // Extract tags
          if (data.customer_tags) {
            const customerTags = data.customer_tags.map((tag: any) => tag.tags.name);
            setTags(customerTags);
          }
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        toast.error('Failed to load customer data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerData();
  }, [customerId, reset]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('name')
          .eq('category', 'customer');
        
        if (error) throw error;
        
        if (data) {
          setAvailableTags(data.map(tag => tag.name));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };
    
    fetchTags();
  }, []);

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: FormData) => {
    if (!businessId) return;
    
    try {
      setIsLoading(true);
      
      // Prepare customer data
      const customerData = {
        business_id: businessId,
        name: data.name,
        email: data.email,
        phone_number: data.phoneNumber,
        address: data.address,
        company: data.company,
        notes: data.notes,
        preferred_language: data.preferredLanguage,
      };
      
      let customerId;
      
      if (customerId) {
        // Update existing customer
        const { data: updatedCustomer, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customerId)
          .select()
          .single();
        
        if (error) throw error;
        customerId = updatedCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single();
        
        if (error) throw error;
        customerId = newCustomer.id;
      }
      
      // Handle tags
      if (customerId) {
        // First, remove all existing tags
        await supabase
          .from('customer_tags')
          .delete()
          .eq('customer_id', customerId);
        
        // Then add new tags
        for (const tagName of tags) {
          // Check if tag exists
          let tagId;
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('category', 'customer')
            .single();
          
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create new tag
            const { data: newTag, error: tagError } = await supabase
              .from('tags')
              .insert({
                name: tagName,
                category: 'customer',
                organization_id: businessId, // Using business_id as organization_id for simplicity
              })
              .select()
              .single();
            
            if (tagError) throw tagError;
            tagId = newTag.id;
          }
          
          // Add tag to customer
          await supabase
            .from('customer_tags')
            .insert({
              customer_id: customerId,
              tag_id: tagId,
            });
        }
      }
      
      toast.success(`Customer ${customerId ? 'updated' : 'created'} successfully`);
      
      if (onSave) {
        onSave({
          ...data,
          tags
        });
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">
        {customerId ? 'Edit Customer' : 'Add New Customer'}
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.name ? 'border-red-300' : ''
                    }`}
                  />
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="email"
                    className={`pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.email ? 'border-red-300' : ''
                    }`}
                  />
                )}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>
          
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="tel"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                )}
              />
            </div>
          </div>
          
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <Controller
                name="company"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                )}
              />
            </div>
          </div>
          
          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                )}
              />
            </div>
          </div>
          
          {/* Preferred Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Language
            </label>
            <Controller
              name="preferredLanguage"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value="EN">English</option>
                  <option value="TR">Turkish</option>
                  <option value="FR">French</option>
                  <option value="AR">Arabic</option>
                </select>
              )}
            />
          </div>
          
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  list="available-tags"
                  placeholder="Add a tag"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
                <datalist id="available-tags">
                  {availableTags.map(tag => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={addTag}
                disabled={!newTag}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                Add
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/20 hover:bg-primary/30 focus:outline-none"
                    >
                      <X className="h-3 w-3 text-primary" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            )}
          />
        </div>
        
        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Customer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerInfoCollector;