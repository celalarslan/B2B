import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from 'lucide-react';

interface RouteErrorBoundaryProps {
  children?: React.ReactNode;
}

const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({ children }) => {
  const error = useRouteError();
  const navigate = useNavigate();
  
  // If there's no error, render children
  if (!error) {
    return <>{children}</>;
  }
  
  let errorMessage = 'An unexpected error occurred';
  let errorStatus = '';
  
  // Extract error details based on type
  if (isRouteErrorResponse(error)) {
    errorStatus = `${error.status} ${error.statusText}`;
    errorMessage = error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Route error:', error);
  }
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  const handleGoHome = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        
        <h2 className="mt-4 text-center text-2xl font-semibold text-gray-900">
          {errorStatus || 'Error'}
        </h2>
        
        <p className="mt-2 text-center text-gray-600">
          {errorMessage}
        </p>
        
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
          
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-md hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;