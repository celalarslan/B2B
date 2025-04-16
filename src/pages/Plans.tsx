import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: PlanFeature[];
  callsIncluded: number;
  minutesIncluded: number;
  isPopular?: boolean;
  ctaText: string;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 25,
    description: 'Perfect for small businesses just getting started with AI call handling',
    callsIncluded: 500,
    minutesIncluded: 300,
    features: [
      { text: '500 AI-handled calls per month', included: true },
      { text: '300 minutes of call time', included: true },
      { text: 'Basic call analytics', included: true },
      { text: 'Email support', included: true },
      { text: 'Single language support', included: true },
      { text: 'Custom voice selection', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ],
    ctaText: 'Get Started',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 75,
    description: 'Ideal for growing businesses with moderate call volume',
    callsIncluded: 2000,
    minutesIncluded: 1000,
    isPopular: true,
    features: [
      { text: '2,000 AI-handled calls per month', included: true },
      { text: '1,000 minutes of call time', included: true },
      { text: 'Advanced call analytics', included: true },
      { text: 'Email and chat support', included: true },
      { text: 'Multi-language support (2 languages)', included: true },
      { text: 'Custom voice selection', included: true },
      { text: 'Call recording and transcription', included: true },
      { text: 'Priority support', included: false },
    ],
    ctaText: 'Select Plan',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'For businesses with high call volume and advanced needs',
    callsIncluded: 5000,
    minutesIncluded: 3000,
    features: [
      { text: '5,000 AI-handled calls per month', included: true },
      { text: '3,000 minutes of call time', included: true },
      { text: 'Enterprise-grade analytics', included: true },
      { text: '24/7 priority support', included: true },
      { text: 'Multi-language support (all languages)', included: true },
      { text: 'Custom voice creation', included: true },
      { text: 'Advanced call routing', included: true },
      { text: 'Custom AI training', included: true },
    ],
    ctaText: 'Contact Sales',
  },
];

const Plans = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            Choose the Right Plan for Your Business
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Select a plan that fits your needs. All plans include our core AI call assistant technology.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden relative ${
                plan.isPopular ? 'ring-2 ring-primary lg:scale-105 z-10' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 rounded-bl-lg text-sm font-medium">
                  Most Popular
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600 h-12">{plan.description}</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-5xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="ml-1 text-xl font-medium text-gray-500">/mo</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="ml-3 text-base text-gray-700">
                      <span className="font-medium">{plan.callsIncluded.toLocaleString()}</span> calls per month
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="ml-3 text-base text-gray-700">
                      <span className="font-medium">{plan.minutesIncluded.toLocaleString()}</span> minutes included
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="px-8 pb-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Plan includes:</h4>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <motion.li
                      key={featureIndex}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 + featureIndex * 0.05 }}
                      className="flex items-center"
                    >
                      {feature.included ? (
                        <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        </div>
                      )}
                      <span className={`ml-3 text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                        {feature.text}
                      </span>
                    </motion.li>
                  ))}
                </ul>
                
                <div className="mt-8">
                  <Link
                    to={`/signup?plan=${plan.id}`}
                    className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                      plan.isPopular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      plan.isPopular ? 'focus:ring-primary' : 'focus:ring-gray-500'
                    }`}
                  >
                    {plan.ctaText}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Need a custom solution?</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Our enterprise plans can be tailored to your specific business needs. Contact our sales team for a custom quote.
          </p>
          <div className="mt-6">
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Contact Sales
            </Link>
          </div>
        </div>
        
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Frequently Asked Questions</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900">What happens if I exceed my monthly limit?</h3>
              <p className="mt-2 text-gray-600">
                If you exceed your monthly call or minute limit, you'll be charged our standard overage rates. You can also upgrade your plan at any time.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Can I change plans later?</h3>
              <p className="mt-2 text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Is there a free trial?</h3>
              <p className="mt-2 text-gray-600">
                Yes, we offer a 14-day free trial with access to all features. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">How does billing work?</h3>
              <p className="mt-2 text-gray-600">
                We bill monthly or annually, with discounts available for annual commitments. All plans are automatically renewed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;