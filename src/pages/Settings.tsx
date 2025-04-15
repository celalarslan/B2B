import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { useConfigStore } from '../store/config';
import { BusinessSector, SupportedLanguage } from '../types';

const Settings = () => {
  const { t } = useTranslation();
  const { config, setConfig, setSector } = useConfigStore();
  const [businessName, setBusinessName] = useState(config.name || '');
  const [selectedSector, setSelectedSector] = useState<BusinessSector>(config.sector || 'restaurant');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(config.language || 'en');

  const sectors: { value: BusinessSector; label: string }[] = [
    { value: 'restaurant', label: t('sectors.restaurant') },
    { value: 'clinic', label: t('sectors.clinic') },
    { value: 'hotel', label: t('sectors.hotel') },
    { value: 'mechanic', label: t('sectors.mechanic') },
    { value: 'carRental', label: t('sectors.carRental') },
    { value: 'foodDelivery', label: t('sectors.foodDelivery') },
    { value: 'retail', label: t('sectors.retail') },
    { value: 'salon', label: t('sectors.salon') },
    { value: 'gym', label: t('sectors.gym') },
    { value: 'spa', label: t('sectors.spa') },
    { value: 'dentist', label: t('sectors.dentist') },
    { value: 'realEstate', label: t('sectors.realEstate') },
    { value: 'other', label: t('sectors.other') }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
    { value: 'ar', label: 'العربية' },
    { value: 'fr', label: 'Français' }
  ];

  const handleSave = async () => {
    try {
      await setConfig({
        name: businessName,
        sector: selectedSector,
        language: selectedLanguage
      });
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Business Settings</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-[#9d00ff] focus:border-[#9d00ff]"
            placeholder="Enter your business name"
          />
        </div>

        {/* Sector Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Sector
          </label>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value as BusinessSector)}
            className="w-full px-4 py-2 border rounded-md focus:ring-[#9d00ff] focus:border-[#9d00ff]"
          >
            {sectors.map((sector) => (
              <option key={sector.value} value={sector.value}>
                {sector.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500">
            Select your business sector to get AI responses tailored to your industry
          </p>
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
            className="w-full px-4 py-2 border rounded-md focus:ring-[#9d00ff] focus:border-[#9d00ff]"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2 bg-[#9d00ff] text-white rounded-md hover:bg-[#8400d6] transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;