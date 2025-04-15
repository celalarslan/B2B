import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Something went wrong
        </h2>
        
        <p className="text-gray-400 text-center mb-4">
          We've encountered an unexpected error. Please try again.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-900 p-4 rounded-md mb-4 overflow-auto">
            <p className="text-red-400 text-sm font-mono">{error.message}</p>
          </div>
        )}
        
        <button
          onClick={resetErrorBoundary}
          className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ErrorFallback;