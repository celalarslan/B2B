import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UserAssistant from '../components/UserAssistant';
import { QrCode, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const DownloadPage: React.FC = () => {
  const { t } = useTranslation();

  // This would be a real QR code in production
  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://example.com/download";

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back to Home</span>
        </Link>
        
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-primary rounded-full mb-4">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t('download.title')}</h1>
            <p className="text-gray-400">{t('download.description')}</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-8 shadow-lg">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">{t('download.scanQR')}</h2>
                <div className="bg-white p-3 rounded-lg inline-block">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-48 h-48"
                  />
                </div>
              </div>
              
              <div className="text-center md:text-left">
                <h2 className="text-xl font-semibold mb-4">{t('download.orDownload')}</h2>
                <a 
                  href="#" 
                  className="inline-flex items-center bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {t('download.downloadButton')}
                </a>
                <p className="mt-4 text-sm text-gray-400">
                  {t('download.androidOnly')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* User-facing AI Assistant */}
      <UserAssistant 
        position="bottom-right"
        initialMessage={t('assistant.downloadHelp', "👋 Hello! I can help you download and set up our app. Do you have any questions about the installation process?")}
        theme="purple"
      />
    </div>
  );
};

export default DownloadPage;