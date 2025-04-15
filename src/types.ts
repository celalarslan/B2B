export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isTrial?: boolean;
  isCustom?: boolean;
}

export interface BusinessConfig {
  name: string;
  sector: BusinessSector;
  phoneNumber: string;
  forwardingNumber: string;
  language: SupportedLanguage;
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
    };
  };
  menu?: MenuItem[];
  services?: Service[];
  rooms?: Room[];
}

export type BusinessSector = 
  | 'restaurant'
  | 'clinic'
  | 'hotel'
  | 'mechanic'
  | 'carRental'
  | 'foodDelivery'
  | 'retail'
  | 'salon'
  | 'gym'
  | 'spa'
  | 'dentist'
  | 'realEstate'
  | 'other';

export type SupportedLanguage = 'tr' | 'en' | 'ar' | 'fr';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  price: number;
}

interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  timestamp: Date;
  transcript: string;
  audioUrl?: string;
  language: SupportedLanguage;
}

interface AIConfig {
  openaiApiKey: string;
  elevenLabsApiKey: string;
  voiceId: {
    tr: string;
    en: string;
    ar: string;
    fr: string;
  };
  model: 'gpt-3.5-turbo';
}