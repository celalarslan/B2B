import React from 'react';
import { useTranslation } from 'react-i18next';
import { Country } from '../types/operators';
import { ChevronDown } from 'lucide-react';

interface CountrySelectorProps {
  countries: Country[];
  selectedCountry: Country | null;
  onSelect: (country: Country) => void;
  className?: string;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  countries,
  selectedCountry,
  onSelect,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (country: Country) => {
    onSelect(country);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedCountry ? (
          <div className="flex items-center">
            <span className="mr-2 text-xl">{selectedCountry.flag}</span>
            <span>{selectedCountry.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">{t('form.selectCountry')}</span>
        )}
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-800 text-white transition-colors ${
                selectedCountry?.code === country.code ? 'bg-gray-800' : ''
              }`}
              onClick={() => handleSelect(country)}
            >
              <span className="mr-2 text-xl">{country.flag}</span>
              <span>{country.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountrySelector;