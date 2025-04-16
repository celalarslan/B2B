export interface UserProfile {
  id?: string;
  userId?: string;
  fullName: string;
  profilePhotoUrl?: string;
  languagePreference?: 'EN' | 'TR' | 'AR' | 'FR';
  jobTitle?: string;
  phoneNumber?: string;
  company?: string;
  industry?: string;
  customVoiceId?: string;
  customVoiceUrl?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoiceSettings {
  voiceId: string;
  name: string;
  language: string;
  preview?: string;
  isCustom?: boolean;
  stability?: number;
  similarity?: number;
  style?: number;
  useCustomVoice?: boolean;
}

export interface VoiceRecording {
  id?: string;
  userId?: string;
  audioUrl: string;
  duration: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  createdAt?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  lastContact?: string;
  preferredLanguage?: string;
}

export interface ProductRecommendation {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
  tags?: string[];
  relatedProducts?: string[];
}

export interface SectorSpecificContent {
  sector: string;
  templates: {
    greeting: string;
    introduction: string;
    productOffer: string;
    closing: string;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  promotions: Array<{
    title: string;
    description: string;
    validUntil?: string;
    discountPercentage?: number;
  }>;
}