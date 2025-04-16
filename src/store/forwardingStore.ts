import { create } from 'zustand';
import { Country, Operator, ForwardingCode } from '../types/operators';
import { fetchCountriesWithOperators, generateForwardingCode } from '../lib/supabase/operatorService';

interface ForwardingState {
  countries: Country[];
  selectedCountry: Country | null;
  selectedOperator: Operator | null;
  phoneNumber: string;
  forwardingCode: ForwardingCode | null;
  isLoading: boolean;
  error: string | null;
  fetchCountries: () => Promise<void>;
  setSelectedCountry: (country: Country) => void;
  setSelectedOperator: (operator: Operator) => void;
  setPhoneNumber: (phoneNumber: string) => void;
  generateCode: () => void;
  resetForm: () => void;
}

export const useForwardingStore = create<ForwardingState>((set, get) => ({
  countries: [],
  selectedCountry: null,
  selectedOperator: null,
  phoneNumber: '',
  forwardingCode: null,
  isLoading: false,
  error: null,

  fetchCountries: async () => {
    try {
      set({ isLoading: true, error: null });
      const countries = await fetchCountriesWithOperators();
      set({ countries, isLoading: false });
    } catch (error) {
      console.error('Error fetching countries:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load countries and operators', 
        isLoading: false 
      });
    }
  },

  setSelectedCountry: (country: Country) => {
    set({ 
      selectedCountry: country,
      selectedOperator: null,
      forwardingCode: null
    });
  },

  setSelectedOperator: (operator: Operator) => {
    set({ 
      selectedOperator: operator,
      forwardingCode: null
    });
  },

  setPhoneNumber: (phoneNumber: string) => {
    set({ 
      phoneNumber,
      forwardingCode: null
    });
  },

  generateCode: () => {
    const { selectedOperator, phoneNumber } = get();
    
    if (!selectedOperator || !phoneNumber) {
      set({ error: 'Please select an operator and enter a phone number' });
      return;
    }
    
    try {
      const code = generateForwardingCode(selectedOperator, phoneNumber);
      
      set({
        forwardingCode: {
          code,
          description: `Call forwarding code for ${selectedOperator.name}`
        }
      });
    } catch (error) {
      console.error('Error generating code:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to generate forwarding code'
      });
    }
  },

  resetForm: () => {
    set({
      selectedCountry: null,
      selectedOperator: null,
      phoneNumber: '',
      forwardingCode: null,
      error: null
    });
  }
}));