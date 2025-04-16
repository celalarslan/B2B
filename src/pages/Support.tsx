import React from 'react';
import SupportChat from '../components/SupportChat';
import { HelpCircle, MessageSquare, Mail, Phone } from 'lucide-react';

const Support: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-2">Customer Support</h1>
      <p className="text-center text-gray-600 mb-8">
        Get help with your B2B AI Call Assistant. Our team is ready to assist you.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Support Chat */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="text-primary mr-2" />
              <h2 className="text-xl font-semibold">AI Support Assistant</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Chat with our AI assistant to get immediate help or submit a support request. 
              The assistant will collect your information and send it to our support team.
            </p>
            
            <SupportChat />
          </div>
        </div>
        
        {/* Support Information */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <HelpCircle className="text-primary mr-2" />
              <h2 className="text-xl font-semibold">Help Resources</h2>
            </div>
            <ul className="space-y-3">
              <li>
                <a href="/help" className="text-primary hover:underline flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <span className="text-primary text-sm">1</span>
                  </span>
                  Help Center
                </a>
              </li>
              <li>
                <a href="/help#faq" className="text-primary hover:underline flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <span className="text-primary text-sm">2</span>
                  </span>
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="/help#tutorials" className="text-primary hover:underline flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <span className="text-primary text-sm">3</span>
                  </span>
                  Video Tutorials
                </a>
              </li>
              <li>
                <a href="/help#setup" className="text-primary hover:underline flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <span className="text-primary text-sm">4</span>
                  </span>
                  Setup Guide
                </a>
              </li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Mail className="text-primary mr-2" />
              <h2 className="text-xl font-semibold">Contact Us</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700">Email Support</h3>
                <a href="mailto:support@b2bcallassistant.com" className="text-primary hover:underline">
                  support@b2bcallassistant.com
                </a>
                <p className="text-sm text-gray-500 mt-1">Response time: Within 24 hours</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700">Phone Support</h3>
                <a href="tel:+18005550100" className="text-primary hover:underline">
                  +1 (800) 555-0100
                </a>
                <p className="text-sm text-gray-500 mt-1">Available: Mon-Fri, 9AM-6PM ET</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
              <Phone className="text-primary mr-2" />
              <h2 className="text-xl font-semibold">Schedule a Call</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Need more personalized help? Schedule a call with one of our support specialists.
            </p>
            <a 
              href="#schedule-call" 
              className="block w-full py-2 px-4 bg-primary text-white text-center rounded-lg hover:bg-primary/90 transition-colors"
            >
              Book a Support Call
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;