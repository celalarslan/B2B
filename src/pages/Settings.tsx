import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Mail, Bell } from 'lucide-react';
import { useConfigStore } from '../store/config';
import { BusinessSector, SupportedLanguage } from '../types';
import EmailNotificationSettings from '../components/EmailNotificationSettings';
import { EmailNotificationSettings as EmailSettings } from '../types/chat';
import { toast } from '../components/Toast';

const Settings = () => {
  const { t } = useTranslation();
  const { config, setConfig, setSector } = useConfigStore();
  const [businessName, setBusinessName] = useState(config.name || '');
  const [selectedSector, setSelectedSector] = useState<BusinessSector>(config.sector || 'restaurant');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(config.language || 'en');
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');

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
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings. Please try again.');
    }
  };

  const handleEmailSettingsSave = (settings: EmailSettings) => {
    console.log('Email notification settings saved:', settings);
    // This is handled internally by the EmailNotificationSettings component
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Business Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('general')}
            className={`${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`${
              activeTab === 'notifications'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </button>
        </nav>
      </div>

      {activeTab === 'general' ? (
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
              className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
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
              className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
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
              className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
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
              className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      ) : (
        <EmailNotificationSettings onSave={handleEmailSettingsSave} />
      )}
    </div>
  );
};

export default Settings;