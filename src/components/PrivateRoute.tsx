import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useSupabase';
import LoadingScreen from './LoadingScreen';

interface PrivateRouteProps {
  requiredRole?: 'admin' | 'member' | 'viewer';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRole }) => {
  const { user, organization, loading } = useAuth();
  const location = useLocation();

  // Show loading screen while auth state is being determined
  if (loading) {
    return <LoadingScreen />;
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is required, check if user has the required role
  if (requiredRole && organization) {
    // This is a simplified role check. In a real app, you would check the user's roles
    // in the organization_users table or similar
    const hasRequiredRole = true; // Replace with actual role check
    
    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required role (if any), render the protected route
  return <Outlet />;
};

export default PrivateRoute;