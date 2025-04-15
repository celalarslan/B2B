import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForwardingStore } from '../store/forwardingStore';
import CountrySelector from './CountrySelector';
import OperatorSelector from './OperatorSelector';
import PhoneNumberInput from './PhoneNumberInput';
import ForwardingCodeDisplay from './ForwardingCodeDisplay';
import { Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const ForwardingForm: React.FC = () => {
  const { t } = useTranslation();
  const {
    countries,
    selectedCountry,
    selectedOperator,
    phoneNumber,
    forwardingCode,
    isLoading,
    error,
    fetchCountries,
    setSelectedCountry,
    setSelectedOperator,
    setPhoneNumber,
    generateCode,
    resetForm
  } = useForwardingStore();

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateCode();
  };

  return (
    <div className="max-w-md mx-auto">
      {isLoading && !countries.length ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-900 text-red-100 p-4 rounded-lg mb-6 transition-colors duration-300">
              <p>{error}</p>
            </div>
          )}

          {!forwardingCode ? (
            <motion.form 
              onSubmit={handleSubmit}
              className="bg-gray-900 rounded-lg p-6 shadow-lg transition-colors duration-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('form.country')}
                  </label>
                  <CountrySelector
                    countries={countries}
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('form.operator')}
                  </label>
                  <OperatorSelector
                    operators={selectedCountry?.operators || []}
                    selectedOperator={selectedOperator}
                    onSelect={setSelectedOperator}
                    disabled={!selectedCountry}
                  />
                </div>

                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  disabled={!selectedOperator}
                />

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={!selectedOperator || !phoneNumber}
                  >
                    {t('form.generate')}
                  </button>
                  
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.form>
          ) : (
            <ForwardingCodeDisplay 
              forwardingCode={forwardingCode} 
              cancelCode={selectedOperator?.cancel_code}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ForwardingForm;