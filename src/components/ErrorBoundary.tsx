import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  routeId?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Higher-order component to inject navigate
export function withErrorBoundary(
  Component: React.ComponentType<any>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  return function WithErrorBoundary(props: any) {
    const navigate = useNavigate();
    
    const handleReset = () => {
      if (options.onReset) {
        options.onReset();
      } else {
        navigate(0); // Refresh the current route
      }
    };
    
    return (
      <ErrorBoundaryClass
        {...options}
        onReset={handleReset}
      >
        <Component {...props} />
      </ErrorBoundaryClass>
    );
  };
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    try {
      // Get current user and business context
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log error to Supabase
      await supabase.from('error_logs').insert({
        error_message: error.message,
        stack_trace: error.stack,
        component_name: this.props.routeId || errorInfo.componentStack
          .split('\n')[1]
          .trim()
          .replace(/^in /, ''),
        user_id: user?.id,
        metadata: {
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          routeId: this.props.routeId
        }
      });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h2 className="mt-4 text-center text-2xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            
            <p className="mt-2 text-center text-gray-600">
              We've encountered an unexpected error. Our team has been notified and is working to fix it.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <p className="text-sm font-mono text-gray-700 break-all">
                  {this.state.error?.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer">Component Stack</summary>
                    <pre className="mt-2 text-xs overflow-auto p-2 bg-gray-100 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-md hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryClass;