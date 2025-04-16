import React, { useEffect } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { securityHeaders } from '../lib/middleware/securityHeadersMiddleware';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Add security headers to the document
  useEffect(() => {
    // Add CSP meta tag if it doesn't exist
    if (!document.head.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = securityHeaders['Content-Security-Policy'];
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gray-50">
        <Helmet>
          {/* Security Headers */}
          <meta httpEquiv="X-Frame-Options" content={securityHeaders['X-Frame-Options']} />
          <meta httpEquiv="X-Content-Type-Options" content={securityHeaders['X-Content-Type-Options']} />
          <meta httpEquiv="X-XSS-Protection" content={securityHeaders['X-XSS-Protection']} />
          <meta httpEquiv="Strict-Transport-Security" content={securityHeaders['Strict-Transport-Security']} />
          <meta httpEquiv="Referrer-Policy" content={securityHeaders['Referrer-Policy']} />
          <meta httpEquiv="Permissions-Policy" content={securityHeaders['Permissions-Policy']} />
          <meta httpEquiv="Content-Security-Policy" content={securityHeaders['Content-Security-Policy']} />
        </Helmet>
        {children}
      </div>
    </HelmetProvider>
  );
};

export default Layout;