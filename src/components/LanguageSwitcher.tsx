import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Save language preference to localStorage
    localStorage.setItem('i18nextLng', lng);
    // Set document direction for RTL languages
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center space-x-1 px-3 py-2 rounded-md text-white hover:bg-gray-800 transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-5 h-5" />
        <span className="text-sm">{i18n.language.toUpperCase()}</span>
      </button>
      
      <div className="absolute right-0 mt-2 w-40 bg-black rounded-md shadow-lg overflow-hidden z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
        <div className="py-1">
          <button
            onClick={() => changeLanguage('en')}
            className={`w-full text-left px-4 py-2 text-sm ${i18n.language === 'en' ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
          >
            {t('language.en')}
          </button>
          <button
            onClick={() => changeLanguage('tr')}
            className={`w-full text-left px-4 py-2 text-sm ${i18n.language === 'tr' ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
          >
            {t('language.tr')}
          </button>
          <button
            onClick={() => changeLanguage('fr')}
            className={`w-full text-left px-4 py-2 text-sm ${i18n.language === 'fr' ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
          >
            {t('language.fr')}
          </button>
          <button
            onClick={() => changeLanguage('ar')}
            className={`w-full text-left px-4 py-2 text-sm ${i18n.language === 'ar' ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
          >
            {t('language.ar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;