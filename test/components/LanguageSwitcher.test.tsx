import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';

// Mock the useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Reset document properties
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  test('renders correctly with default language', () => {
    render(<LanguageSwitcher />);
    
    // Check that the button is rendered with the current language
    const button = screen.getByRole('button', { name: /change language/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('EN');
  });

  test('shows dropdown menu when clicked', () => {
    render(<LanguageSwitcher />);
    
    // Click the language button
    const button = screen.getByRole('button', { name: /change language/i });
    fireEvent.click(button);
    
    // Check that all language options are displayed
    expect(screen.getByText('language.en')).toBeInTheDocument();
    expect(screen.getByText('language.tr')).toBeInTheDocument();
    expect(screen.getByText('language.fr')).toBeInTheDocument();
    expect(screen.getByText('language.ar')).toBeInTheDocument();
  });

  test('changes language when an option is selected', () => {
    const { i18n } = require('react-i18next').useTranslation();
    
    render(<LanguageSwitcher />);
    
    // Open the dropdown
    const button = screen.getByRole('button', { name: /change language/i });
    fireEvent.click(button);
    
    // Select Turkish language
    const turkishOption = screen.getByText('language.tr');
    fireEvent.click(turkishOption);
    
    // Check that i18n.changeLanguage was called with 'tr'
    expect(i18n.changeLanguage).toHaveBeenCalledWith('tr');
    
    // Check that localStorage was updated
    expect(localStorage.getItem('i18nextLng')).toBe('tr');
  });

  test('sets RTL direction for Arabic language', () => {
    const { i18n } = require('react-i18next').useTranslation();
    i18n.changeLanguage.mockImplementation((lang) => {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    });
    
    render(<LanguageSwitcher />);
    
    // Open the dropdown
    const button = screen.getByRole('button', { name: /change language/i });
    fireEvent.click(button);
    
    // Select Arabic language
    const arabicOption = screen.getByText('language.ar');
    fireEvent.click(arabicOption);
    
    // Check that document direction was set to RTL
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  test('highlights the currently selected language', () => {
    const { i18n } = require('react-i18next').useTranslation();
    i18n.language = 'fr'; // Set current language to French
    
    render(<LanguageSwitcher />);
    
    // Open the dropdown
    const button = screen.getByRole('button', { name: /change language/i });
    fireEvent.click(button);
    
    // Find all language options
    const options = screen.getAllByRole('button');
    
    // Find the French option (should be highlighted)
    const frenchOption = options.find(option => option.textContent?.includes('language.fr'));
    
    // Check that it has the highlighted class
    expect(frenchOption).toHaveClass('bg-gray-800');
  });
});