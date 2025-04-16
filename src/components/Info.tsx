import React from 'react';
import { Info as InfoIcon } from 'lucide-react';

interface InfoProps {
  children: React.ReactNode;
  title?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}

const Info: React.FC<InfoProps> = ({ 
  children, 
  title, 
  type = 'info' 
}) => {
  const getStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          title: 'text-yellow-800',
          icon: 'text-yellow-400'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          title: 'text-green-800',
          icon: 'text-green-400'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          title: 'text-red-800',
          icon: 'text-red-400'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          title: 'text-blue-800',
          icon: 'text-blue-400'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} ${styles.border} border p-4 rounded-md`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <InfoIcon className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
        </div>
        <div className="ml-3">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
          )}
          <div className={`text-sm ${styles.text} ${title ? 'mt-2' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;