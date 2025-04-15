import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Mail, Phone, MessageSquare } from 'lucide-react';

const HelpCenter = () => {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'general': true,
    'setup': false,
    'forwarding': false,
    'voice': false,
    'reports': false
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Help Center</h1>
      
      {/* Search Bar */}
      <div className="relative mb-10">
        <input
          type="text"
          placeholder="Search for help..."
          className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
      </div>

      {/* Help Categories */}
      <div className="space-y-6">
        {/* General Information */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleCategory('general')}
          >
            <h2 className="text-xl font-semibold">General Information</h2>
            {openCategories.general ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {openCategories.general && (
            <div className="p-4 space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">What is the B2B AI Call Assistant?</h3>
                <p className="text-gray-700">
                  The B2B AI Call Assistant is an AI-powered virtual receptionist that handles incoming calls for your business. It uses advanced voice recognition and natural language processing to understand callers, provide information, schedule appointments, and transfer calls when necessary.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">What languages does the assistant support?</h3>
                <p className="text-gray-700">
                  Currently, our assistant supports English, Turkish, Arabic, and French. You can select your primary language in the settings, and even configure multiple languages if your business serves diverse customers.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How much does the service cost?</h3>
                <p className="text-gray-700">
                  We offer several pricing tiers based on your business needs. Our plans start at $25/month for the Starter plan, which includes 500 minutes of call handling. You can view detailed pricing on our Pricing page or in your account settings under Subscription.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">Is my data secure?</h3>
                <p className="text-gray-700">
                  Yes, we take security seriously. All calls are encrypted end-to-end, and your data is stored securely in compliance with GDPR and other privacy regulations. You can review our security practices in our Privacy Policy.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-2">Can I try the service before committing?</h3>
                <p className="text-gray-700">
                  Yes! We offer a 14-day free trial with full access to all features. No credit card is required to start your trial. You can sign up on our website and begin using the service immediately.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Setup Issues */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleCategory('setup')}
          >
            <h2 className="text-xl font-semibold">Setup Issues</h2>
            {openCategories.setup ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {openCategories.setup && (
            <div className="p-4 space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How do I create an account?</h3>
                <p className="text-gray-700">
                  Visit our website and click "Sign Up" in the top right corner. Fill out the registration form with your business details, verify your email address, and complete your business profile. Once done, you'll have access to your dashboard.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">I can't log in to my account. What should I do?</h3>
                <p className="text-gray-700">
                  First, ensure you're using the correct email address and password. If you've forgotten your password, click "Forgot Password" on the login page to reset it. If you still can't access your account, contact our support team for assistance.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How do I set up my business profile?</h3>
                <p className="text-gray-700">
                  After logging in, go to "Settings" {'>'} "Business Profile". Fill in all required fields including your business name, sector, operating hours, and contact information. This information helps the AI assistant provide accurate information to your callers.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-2">How do I add team members to my account?</h3>
                <p className="text-gray-700">
                  Go to "Settings" {'>'} "Team Management" and click "Add Team Member". Enter their email address and select their role (Admin, Manager, or Viewer). They'll receive an invitation email with instructions to join your account.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Call Forwarding Troubleshooting */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleCategory('forwarding')}
          >
            <h2 className="text-xl font-semibold">Call Forwarding Troubleshooting</h2>
            {openCategories.forwarding ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {openCategories.forwarding && (
            <div className="p-4 space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How do I set up call forwarding?</h3>
                <p className="text-gray-700">
                  Go to "Settings" {'>'} "Call Forwarding" in your dashboard. You'll see your unique forwarding number and activation code. On your business phone, dial the activation code (usually *21* followed by the forwarding number and #). You should receive a confirmation message.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">Call forwarding isn't working. What should I check?</h3>
                <p className="text-gray-700">
                  First, verify you entered the correct forwarding code. Then, check if your phone carrier supports call forwarding. Some carriers require activation of this feature. Also, ensure your subscription is active and that you have sufficient call minutes remaining.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How do I temporarily disable call forwarding?</h3>
                <p className="text-gray-700">
                  To temporarily disable call forwarding, dial #21# on your business phone. You should receive a confirmation message. To re-enable it, use the original forwarding code (*21* followed by your forwarding number and #).
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">Can I forward calls to multiple numbers?</h3>
                <p className="text-gray-700">
                  Yes, with our Professional and Enterprise plans. Go to "Settings" {'>'} "Call Routing" to set up rules for forwarding calls to different team members based on criteria like time of day, caller information, or inquiry type.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-2">My carrier doesn't support standard call forwarding codes. What can I do?</h3>
                <p className="text-gray-700">
                  Contact your phone carrier directly to ask about their specific call forwarding procedure. Once you have this information, contact our support team, and we'll help you set up a custom forwarding solution for your carrier.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Voice Assistant Issues */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleCategory('voice')}
          >
            <h2 className="text-xl font-semibold">Voice Assistant Issues</h2>
            {openCategories.voice ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {openCategories.voice && (
            <div className="p-4 space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">The AI assistant isn't understanding callers correctly. How can I improve this?</h3>
                <p className="text-gray-700">
                  Go to "Settings" {'>'} "Voice Training" and review recent conversations with misunderstandings. Provide corrections for misinterpreted phrases. Also, ensure you've selected the correct language and dialect settings. For industry-specific terminology, add these terms in "Settings" {'>'} "Custom Vocabulary".
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How do I customize what the assistant says to callers?</h3>
                <p className="text-gray-700">
                  Navigate to "Settings" {'>'} "Response Templates". Here you can customize the greeting, common responses, and closing messages. You can also set up responses for specific questions about your business, such as operating hours, location, and services.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">Can I change the voice of the assistant?</h3>
                <p className="text-gray-700">
                  Yes! Go to "Settings" {'>'} "Voice Settings" and select from our range of voice options for each supported language. You can preview each voice before selecting. Premium voices are available on Professional and Enterprise plans.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">The assistant is pronouncing certain words incorrectly. How can I fix this?</h3>
                <p className="text-gray-700">
                  Go to "Settings" {'>'} "Custom Pronunciation". Here you can add specific words (like unique business names or technical terms) and specify how they should be pronounced using phonetic spelling or by recording the correct pronunciation.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-2">How do I train the assistant to handle industry-specific questions?</h3>
                <p className="text-gray-700">
                  Use the "Knowledge Base" feature under "Settings". Add FAQs specific to your business and industry. You can also upload documents like menus, service lists, or product catalogs to help the assistant provide accurate information to callers.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Reports & Logs */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button 
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleCategory('reports')}
          >
            <h2 className="text-xl font-semibold">Reports & Logs</h2>
            {openCategories.reports ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {openCategories.reports && (
            <div className="p-4 space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How do I access call recordings?</h3>
                <p className="text-gray-700">
                  Go to "Reports" {'>'} "Call History" and find the call you want to review. Click on it to open the detailed view, then click the play button next to "Recording". You can listen to the call, download the audio file, or view the transcript.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">How can I export call data for my records?</h3>
                <p className="text-gray-700">
                  From the "Reports" page, click "Export" in the top-right corner. Select the date range and the data you want to include (call metadata, transcripts, analytics). Choose your preferred format (CSV, PDF, or JSON) and click "Generate Export". Once processed, you can download the file.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">What metrics are available in the dashboard?</h3>
                <p className="text-gray-700">
                  The dashboard shows key metrics including total calls handled, average call duration, call success rate, common topics, customer sentiment, peak call times, and AI performance statistics. For deeper analysis, use the "Analytics" section.
                </p>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="font-medium text-lg mb-2">Can I schedule regular reports to be sent to my email?</h3>
                <p className="text-gray-700">
                  Yes! Go to "Reports" {'>'} "Scheduled Reports" and click "Create New Schedule". Configure the report type, frequency (daily, weekly, monthly), format, and recipients. Reports will be automatically generated and emailed according to your schedule.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-lg mb-2">How long are call recordings and logs kept?</h3>
                <p className="text-gray-700">
                  By default, call recordings are retained for 90 days, transcripts for 12 months, and call metadata for 24 months. Enterprise customers can configure custom retention policies. You can adjust your retention settings in "Settings" {'>'} "Privacy & Compliance".
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Still Need Help CTA */}
      <div className="mt-12 bg-gray-50 p-6 rounded-lg text-center">
        <h2 className="text-xl font-semibold mb-4">Still need help?</h2>
        <p className="text-gray-700 mb-6">Our support team is ready to assist you with any questions or issues.</p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a 
            href="mailto:support@b2bcallassistant.com" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Mail size={18} />
            <span>Email Support</span>
          </a>
          
          <a 
            href="tel:+18005550100" 
            className="flex items-center justify-center gap-2 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Phone size={18} />
            <span>Call Support</span>
          </a>
          
          <a 
            href="#" 
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MessageSquare size={18} />
            <span>Live Chat</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;