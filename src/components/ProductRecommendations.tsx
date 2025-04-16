import React, { useState, useEffect } from 'react';
import { ShoppingCart, Tag, ChevronRight, Star, Info, ExternalLink } from 'lucide-react';
import { ProductRecommendation } from '../types/profile';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

interface ProductRecommendationsProps {
  sector: string;
  customerId?: string;
  onProductSelect?: (product: ProductRecommendation) => void;
}

const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  sector,
  customerId,
  onProductSelect
}) => {
  const [products, setProducts] = useState<ProductRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would fetch from a products table
        // For this demo, we'll use mock data based on the sector
        
        let mockProducts: ProductRecommendation[] = [];
        
        switch (sector) {
          case 'restaurant':
            mockProducts = [
              {
                id: '1',
                name: 'Online Ordering System',
                description: 'Complete online ordering system with mobile app integration',
                price: 199.99,
                imageUrl: 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Software',
                tags: ['online', 'ordering', 'restaurant']
              },
              {
                id: '2',
                name: 'Reservation Management',
                description: 'Advanced table reservation system with customer notifications',
                price: 149.99,
                imageUrl: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Software',
                tags: ['reservation', 'management']
              },
              {
                id: '3',
                name: 'Menu Design Service',
                description: 'Professional menu design with food photography',
                price: 299.99,
                imageUrl: 'https://images.unsplash.com/photo-1541557435984-1c79685a082e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Services',
                tags: ['design', 'menu']
              },
              {
                id: '4',
                name: 'Restaurant POS System',
                description: 'Complete point of sale system for restaurants',
                price: 999.99,
                imageUrl: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Hardware',
                tags: ['pos', 'hardware']
              },
              {
                id: '5',
                name: 'Staff Training Program',
                description: 'Comprehensive training program for restaurant staff',
                price: 499.99,
                imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Services',
                tags: ['training', 'staff']
              }
            ];
            break;
            
          case 'healthcare':
            mockProducts = [
              {
                id: '1',
                name: 'Patient Management System',
                description: 'Complete patient management and electronic health records system',
                price: 299.99,
                imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Software',
                tags: ['patient', 'management', 'healthcare']
              },
              {
                id: '2',
                name: 'Appointment Scheduling',
                description: 'Online appointment booking system with reminders',
                price: 149.99,
                imageUrl: 'https://images.unsplash.com/photo-1557825835-70d97c4aa567?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Software',
                tags: ['appointment', 'scheduling']
              },
              {
                id: '3',
                name: 'Medical Supplies Subscription',
                description: 'Monthly subscription for essential medical supplies',
                price: 199.99,
                imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Supplies',
                tags: ['supplies', 'subscription']
              }
            ];
            break;
            
          case 'retail':
            mockProducts = [
              {
                id: '1',
                name: 'Inventory Management System',
                description: 'Complete inventory tracking and management solution',
                price: 249.99,
                imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Software',
                tags: ['inventory', 'management', 'retail']
              },
              {
                id: '2',
                name: 'POS System',
                description: 'Modern point of sale system for retail stores',
                price: 799.99,
                imageUrl: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Hardware',
                tags: ['pos', 'hardware']
              },
              {
                id: '3',
                name: 'E-commerce Website',
                description: 'Custom e-commerce website development',
                price: 1499.99,
                imageUrl: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Services',
                tags: ['ecommerce', 'website']
              }
            ];
            break;
            
          default:
            mockProducts = [
              {
                id: '1',
                name: 'Business Management Software',
                description: 'All-in-one business management solution',
                price: 299.99,
                imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Software',
                tags: ['business', 'management']
              },
              {
                id: '2',
                name: 'Marketing Services',
                description: 'Comprehensive marketing services for your business',
                price: 499.99,
                imageUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Services',
                tags: ['marketing', 'services']
              },
              {
                id: '3',
                name: 'Business Consultation',
                description: 'Expert business consultation services',
                price: 999.99,
                imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                category: 'Services',
                tags: ['consultation', 'business']
              }
            ];
        }
        
        setProducts(mockProducts);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(mockProducts.map(p => p.category)));
        setCategories(uniqueCategories);
        
        // Set first category as selected
        if (uniqueCategories.length > 0 && !selectedCategory) {
          setSelectedCategory(uniqueCategories[0]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load product recommendations');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, [sector, selectedCategory]);

  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category === selectedCategory)
    : products;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Recommended Products</h2>
        <div className="flex items-center text-sm text-gray-500">
          <Info className="w-4 h-4 mr-1" />
          <span>Based on your business sector</span>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          
          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {product.imageUrl && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg">{product.name}</h3>
                    <div className="text-lg font-bold text-primary">${product.price.toFixed(2)}</div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                  
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.tags.map(tag => (
                        <span 
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4" />
                      <span className="ml-1 text-xs text-gray-500">(24)</span>
                    </div>
                    
                    <button
                      onClick={() => onProductSelect && onProductSelect(product)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No products found in this category.</p>
            </div>
          )}
          
          {/* View All Link */}
          <div className="mt-6 text-center">
            <a 
              href="#" 
              className="inline-flex items-center text-primary hover:text-primary/80"
            >
              View all products
              <ChevronRight className="w-4 h-4 ml-1" />
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductRecommendations;