import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Github, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-black text-white py-6 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Phone className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">{t('app.title')}</span>
          </div>
          
          <div className="flex space-x-6">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          {t('app.footer')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;