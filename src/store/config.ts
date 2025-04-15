import { create } from 'zustand';
import { BusinessConfig, BusinessSector, SupportedLanguage } from '../types';

interface ConfigStore {
  config: Partial<BusinessConfig>;
  setConfig: (config: Partial<BusinessConfig>) => void;
  setSector: (sector: BusinessSector) => void;
  setPhoneNumbers: (phone: string, forwarding: string) => void;
  setLanguage: (language: SupportedLanguage) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: {},
  setConfig: (newConfig) => set((state) => ({ 
    config: { ...state.config, ...newConfig } 
  })),
  setSector: (sector) => set((state) => ({ 
    config: { ...state.config, sector } 
  })),
  setPhoneNumbers: (phoneNumber, forwardingNumber) => set((state) => ({ 
    config: { ...state.config, phoneNumber, forwardingNumber } 
  })),
  setLanguage: (language) => set((state) => ({ 
    config: { ...state.config, language } 
  })),
}));