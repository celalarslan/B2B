import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };
  
  const colorClasses = {
    primary: 'border-primary',
    white: 'border-white',
    gray: 'border-gray-300',
  };
  
  const borderColorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.primary;
  
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div 
        className={`${sizeClasses[size]} rounded-full border-t-transparent ${borderColorClass} animate-spin`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};

export default LoadingSpinner;