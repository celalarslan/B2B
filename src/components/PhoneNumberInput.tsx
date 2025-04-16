import React from 'react';
import { useTranslation } from 'react-i18next';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  className = '',
  disabled = false
}) => {
  const { t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers, plus sign, and spaces
    const sanitizedValue = e.target.value.replace(/[^\d\s+]/g, '');
    onChange(sanitizedValue);
  };

  return (
    <div className={className}>
      <label htmlFor="phone-number" className="block text-sm font-medium text-gray-300 mb-1">
        {t('form.phoneNumber')}
      </label>
      <input
        id="phone-number"
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={t('form.phoneNumberPlaceholder')}
        className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-500 transition-colors"
        disabled={disabled}
      />
    </div>
  );
};

export default PhoneNumberInput;