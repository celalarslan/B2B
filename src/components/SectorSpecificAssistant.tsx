import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SectorSpecificContent } from '../types/profile';
import { Lightbulb, Tag, Calendar, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface SectorSpecificAssistantProps {
  sector: string;
  onPromptSelect?: (prompt: string) => void;
}

const SectorSpecificAssistant: React.FC<SectorSpecificAssistantProps> = ({
  sector,
  onPromptSelect
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState<SectorSpecificContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSections, setOpenSections] = useState({
    templates: true,
    faqs: false,
    promotions: false
  });

  useEffect(() => {
    const fetchSectorContent = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would fetch from a database
        // For this demo, we'll use mock data based on the sector
        
        let mockContent: SectorSpecificContent;
        
        switch (sector) {
          case 'restaurant':
            mockContent = {
              sector: 'restaurant',
              templates: {
                greeting: "Hello, thank you for calling [Restaurant Name]. I'm your AI assistant. How may I help you today?",
                introduction: "Welcome to [Restaurant Name]. We offer a variety of [cuisine type] dishes prepared by our expert chefs.",
                productOffer: "Would you like to hear about our daily specials? Today we're featuring [special dish] for just [price].",
                closing: "Thank you for calling [Restaurant Name]. We look forward to serving you soon!"
              },
              faqs: [
                {
                  question: "What are your opening hours?",
                  answer: "We're open Monday to Friday from 11 AM to 10 PM, and on weekends from 10 AM to 11 PM."
                },
                {
                  question: "Do you take reservations?",
                  answer: "Yes, we accept reservations. You can book a table through our website or by calling us directly."
                },
                {
                  question: "Do you offer vegetarian options?",
                  answer: "Yes, we have a variety of vegetarian and vegan options on our menu. Please let us know about any dietary restrictions."
                }
              ],
              promotions: [
                {
                  title: "Happy Hour Special",
                  description: "Enjoy 50% off all appetizers and drinks from 4 PM to 6 PM, Monday to Thursday.",
                  validUntil: "2025-12-31"
                },
                {
                  title: "Family Meal Deal",
                  description: "Order any 2 main courses and get a free dessert and 2 kids meals.",
                  discountPercentage: 15
                }
              ]
            };
            break;
            
          case 'healthcare':
            mockContent = {
              sector: 'healthcare',
              templates: {
                greeting: "Hello, thank you for calling [Clinic Name]. I'm your AI assistant. How may I assist you today?",
                introduction: "Welcome to [Clinic Name]. We provide comprehensive healthcare services with a focus on patient well-being.",
                productOffer: "We're currently offering a special health check-up package that includes [services] for just [price].",
                closing: "Thank you for calling [Clinic Name]. Your health is our priority!"
              },
              faqs: [
                {
                  question: "What insurance plans do you accept?",
                  answer: "We accept most major insurance plans including [list of plans]. Please contact our billing department for specific questions."
                },
                {
                  question: "How do I schedule an appointment?",
                  answer: "You can schedule an appointment through our website, patient portal, or by calling our office directly."
                },
                {
                  question: "What should I bring to my first appointment?",
                  answer: "Please bring your ID, insurance card, list of current medications, and any relevant medical records or test results."
                }
              ],
              promotions: [
                {
                  title: "Annual Wellness Package",
                  description: "Complete health assessment including physical exam, blood work, and specialist consultations at a discounted rate.",
                  discountPercentage: 20
                },
                {
                  title: "Vaccination Drive",
                  description: "Get your seasonal vaccinations at a special rate this month.",
                  validUntil: "2025-06-30"
                }
              ]
            };
            break;
            
          case 'retail':
            mockContent = {
              sector: 'retail',
              templates: {
                greeting: "Hello, thank you for calling [Store Name]. I'm your AI assistant. How can I help you today?",
                introduction: "Welcome to [Store Name]. We offer a wide range of [product categories] for all your needs.",
                productOffer: "We have a special promotion on [product category]. Would you like to hear more about our current offers?",
                closing: "Thank you for calling [Store Name]. We hope to see you soon!"
              },
              faqs: [
                {
                  question: "What are your store hours?",
                  answer: "Our store is open Monday to Saturday from 9 AM to 9 PM, and on Sundays from 10 AM to 6 PM."
                },
                {
                  question: "Do you offer delivery?",
                  answer: "Yes, we offer delivery for orders over $50. Delivery is free for orders over $100."
                },
                {
                  question: "What is your return policy?",
                  answer: "We accept returns within 30 days of purchase with a receipt. Items must be in original condition with tags attached."
                }
              ],
              promotions: [
                {
                  title: "Summer Sale",
                  description: "Up to 50% off on all summer items. Limited time offer!",
                  validUntil: "2025-08-31",
                  discountPercentage: 50
                },
                {
                  title: "Loyalty Program",
                  description: "Join our loyalty program and get 10% off on every purchase plus exclusive member-only offers.",
                  discountPercentage: 10
                }
              ]
            };
            break;
            
          default:
            mockContent = {
              sector: 'general',
              templates: {
                greeting: "Hello, thank you for calling [Business Name]. I'm your AI assistant. How may I help you today?",
                introduction: "Welcome to [Business Name]. We specialize in providing quality [services/products] to meet your needs.",
                productOffer: "We're currently offering special deals on our [product/service]. Would you like to hear more?",
                closing: "Thank you for calling [Business Name]. We look forward to serving you!"
              },
              faqs: [
                {
                  question: "What are your business hours?",
                  answer: "Our business hours are Monday to Friday from 9 AM to 5 PM. We're closed on weekends and public holidays."
                },
                {
                  question: "How can I contact customer support?",
                  answer: "You can reach our customer support team by phone, email, or through the contact form on our website."
                },
                {
                  question: "Do you offer any guarantees?",
                  answer: "Yes, we offer a satisfaction guarantee on all our products and services. Please check our website for details."
                }
              ],
              promotions: [
                {
                  title: "New Customer Discount",
                  description: "First-time customers receive 15% off their first purchase or service.",
                  discountPercentage: 15
                },
                {
                  title: "Referral Program",
                  description: "Refer a friend and both of you get $25 off your next purchase.",
                  validUntil: "2025-12-31"
                }
              ]
            };
        }
        
        setContent(mockContent);
      } catch (error) {
        console.error('Error fetching sector content:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSectorContent();
  }, [sector]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePromptClick = (prompt: string) => {
    if (onPromptSelect) {
      onPromptSelect(prompt);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-gray-500">No sector-specific content available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Sector-Specific Assistant</h2>
        <div className="flex items-center text-sm text-gray-500">
          <Tag className="w-4 h-4 mr-1" />
          <span>{t(`sectors.${sector.toLowerCase()}`)}</span>
        </div>
      </div>
      
      {/* Templates Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('templates')}
        >
          <h3 className="text-lg font-medium">Response Templates</h3>
          {openSections.templates ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
        
        {openSections.templates && (
          <div className="mt-3 space-y-3">
            <div 
              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => handlePromptClick(content.templates.greeting)}
            >
              <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Lightbulb className="w-4 h-4 mr-1 text-yellow-500" />
                Greeting
              </div>
              <p className="text-sm text-gray-600">{content.templates.greeting}</p>
            </div>
            
            <div 
              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => handlePromptClick(content.templates.introduction)}
            >
              <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Lightbulb className="w-4 h-4 mr-1 text-yellow-500" />
                Introduction
              </div>
              <p className="text-sm text-gray-600">{content.templates.introduction}</p>
            </div>
            
            <div 
              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => handlePromptClick(content.templates.productOffer)}
            >
              <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Lightbulb className="w-4 h-4 mr-1 text-yellow-500" />
                Product Offer
              </div>
              <p className="text-sm text-gray-600">{content.templates.productOffer}</p>
            </div>
            
            <div 
              className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => handlePromptClick(content.templates.closing)}
            >
              <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Lightbulb className="w-4 h-4 mr-1 text-yellow-500" />
                Closing
              </div>
              <p className="text-sm text-gray-600">{content.templates.closing}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* FAQs Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('faqs')}
        >
          <h3 className="text-lg font-medium">Frequently Asked Questions</h3>
          {openSections.faqs ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
        
        {openSections.faqs && (
          <div className="mt-3 space-y-3">
            {content.faqs.map((faq, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => handlePromptClick(`Q: ${faq.question}\nA: ${faq.answer}`)}
              >
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Q: {faq.question}
                </div>
                <p className="text-sm text-gray-600">
                  A: {faq.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Promotions Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('promotions')}
        >
          <h3 className="text-lg font-medium">Current Promotions</h3>
          {openSections.promotions ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
        
        {openSections.promotions && (
          <div className="mt-3 space-y-3">
            {content.promotions.map((promo, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => handlePromptClick(`Promotion: ${promo.title}\n${promo.description}${promo.discountPercentage ? `\nDiscount: ${promo.discountPercentage}%` : ''}${promo.validUntil ? `\nValid until: ${promo.validUntil}` : ''}`)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 mr-1 text-blue-500" />
                    {promo.title}
                  </div>
                  {promo.discountPercentage && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {promo.discountPercentage}% OFF
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{promo.description}</p>
                {promo.validUntil && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valid until: {new Date(promo.validUntil).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Documentation Link */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <a 
          href="#" 
          className="inline-flex items-center text-sm text-primary hover:text-primary/80"
        >
          <FileText className="w-4 h-4 mr-1" />
          View complete sector documentation
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};

export default SectorSpecificAssistant;