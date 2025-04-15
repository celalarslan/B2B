import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    try {
      // Get current user and business context
      const { data: { user } } = await supabase.auth.getUser();
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      // Log error to Supabase
      await supabase.from('error_logs').insert({
        error_message: error.message,
        stack_trace: error.stack,
        component_name: errorInfo.componentStack
          .split('\n')[1]
          .trim()
          .replace(/^in /, ''),
        user_id: user?.id,
        business_id: business?.id,
        metadata: {
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
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
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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

export default GlobalErrorBoundary;