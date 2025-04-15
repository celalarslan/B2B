import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Phone, XCircle } from 'lucide-react';
import { ForwardingCode } from '../types/operators';
import { motion } from 'framer-motion';

interface ForwardingCodeDisplayProps {
  forwardingCode: ForwardingCode;
  cancelCode?: string;
}

export const ForwardingCodeDisplay: React.FC<ForwardingCodeDisplayProps> = ({
  forwardingCode,
  cancelCode
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(forwardingCode.code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Error copying to clipboard:', err);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 rounded-lg p-6 shadow-lg transition-colors duration-300"
    >
      <h2 className="text-xl font-bold text-white mb-2">{t('result.title')}</h2>
      <p className="text-gray-400 mb-4">{t('result.description')}</p>
      
      <div className="bg-black rounded-lg p-4 mb-6 relative transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Phone className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-xl font-mono text-white">{forwardingCode.code}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="p-2 rounded-md hover:bg-gray-800 transition-colors"
            aria-label={t('result.copyButton')}
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
        {copied && (
          <span className="absolute bottom-1 right-1 text-xs text-green-500">
            {t('result.copied')}
          </span>
        )}
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">{t('result.instructions')}</h3>
        <ol className="list-decimal list-inside text-gray-300 space-y-2">
          <li>{t('result.step1')}</li>
          <li>{t('result.step2')}</li>
          <li>{t('result.step3')}</li>
        </ol>
      </div>
      
      {cancelCode && (
        <div className="border-t border-gray-800 pt-4 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-white mb-2">{t('result.cancelTitle')}</h3>
          <div className="bg-black rounded-lg p-3 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="font-mono text-white">{cancelCode}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ForwardingCodeDisplay;