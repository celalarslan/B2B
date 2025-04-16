import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { createRoot } from 'react-dom/client';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, duration);
    
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };
  
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-amber-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`max-w-md w-full shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border ${getBgColor()}`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${getTextColor()}`}>
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onClose(id), 300);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast container component
const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-4 items-end">
      {children}
    </div>
  );
};

// Toast manager
class ToastManager {
  private containerRef: HTMLDivElement | null = null;
  private root: any = null;
  private toasts: ToastProps[] = [];
  private counter = 0;
  
  constructor() {
    // Create container element if it doesn't exist
    if (typeof document !== 'undefined' && !this.containerRef) {
      this.containerRef = document.createElement('div');
      this.containerRef.id = 'toast-container';
      document.body.appendChild(this.containerRef);
      this.root = createRoot(this.containerRef);
      this.render();
    }
  }
  
  private render() {
    if (this.root) {
      this.root.render(
        <ToastContainer>
          {this.toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={this.remove} />
          ))}
        </ToastContainer>
      );
    }
  }
  
  public show = (options: ToastOptions): string => {
    const id = `toast-${this.counter++}`;
    const toast: ToastProps = {
      id,
      ...options,
      onClose: this.remove,
    };
    
    this.toasts = [...this.toasts, toast];
    this.render();
    
    return id;
  };
  
  public remove = (id: string): void => {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.render();
  };
  
  public success = (message: string, duration?: number): string => {
    return this.show({ type: 'success', message, duration });
  };
  
  public error = (message: string, duration?: number): string => {
    return this.show({ type: 'error', message, duration });
  };
  
  public warning = (message: string, duration?: number): string => {
    return this.show({ type: 'warning', message, duration });
  };
  
  public info = (message: string, duration?: number): string => {
    return this.show({ type: 'info', message, duration });
  };
}

export const toast = new ToastManager();