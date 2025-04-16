import React from 'react';
import { useTranslation } from 'react-i18next';
import { Operator } from '../types/operators';
import { ChevronDown } from 'lucide-react';

interface OperatorSelectorProps {
  operators: Operator[];
  selectedOperator: Operator | null;
  onSelect: (operator: Operator) => void;
  className?: string;
  disabled?: boolean;
}

const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  operators,
  selectedOperator,
  onSelect,
  className = '',
  disabled = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (operator: Operator) => {
    onSelect(operator);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className={`w-full flex items-center justify-between px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selectedOperator ? (
          <span>{selectedOperator.name}</span>
        ) : (
          <span className="text-gray-400">{t('form.selectOperator')}</span>
        )}
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-gray-900 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {operators.map((operator) => (
            <button
              key={operator.id}
              type="button"
              className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-800 text-white transition-colors ${
                selectedOperator?.id === operator.id ? 'bg-gray-800' : ''
              }`}
              onClick={() => handleSelect(operator)}
            >
              <span>{operator.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperatorSelector;