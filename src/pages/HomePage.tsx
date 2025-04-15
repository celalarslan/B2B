import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ForwardingForm from '../components/ForwardingForm';
import UserAssistant from '../components/UserAssistant';
import { Phone } from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white transition-colors duration-300">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4">
            <Phone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('app.title')}</h1>
          <p className="text-gray-400">{t('app.description')}</p>
        </div>
        
        <ForwardingForm />
      </main>
      
      <Footer />
      
      {/* User-facing AI Assistant */}
      <UserAssistant 
        position="bottom-right"
        initialMessage={t('assistant.welcomeMessage', "👋 Hello! I'm your AI assistant. How can I help you understand our call forwarding service today?")}
        theme="purple"
      />
    </div>
  );
};

export default HomePage;