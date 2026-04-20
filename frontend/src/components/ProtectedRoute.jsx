import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PLAN_CONFIG } from '../config/plans.js';

const ProtectedRoute = ({ children, requiredRole, allowedBusinessTypes, requiredFeature }) => {
  const { user, loginType } = useAuth();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/" />;
  }

  // Check if user role matches required role
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on their actual role
    if (user.role === 'super_admin') {
      return <Navigate to="/superadmin/dashboard" />;
    } else if (user.role === 'admin') {
      return <Navigate to="/dashboard" />;
    } else if (user.role === 'staff') {
      return <Navigate to="/chat" />;
    }
    return <Navigate to="/" />;
  }

  // Check if feature is allowed for user's plan
  if (requiredFeature && user.role === 'admin') {
    const plan = user.plan || 'FREE';
    const config = PLAN_CONFIG[plan];
    if (config && !config[requiredFeature]) {
      return <Navigate to="/pricing" state={{ featureLocked: requiredFeature }} />;
    }
  }

  if (Array.isArray(allowedBusinessTypes) && allowedBusinessTypes.length > 0) {
    const userBusinessType = user?.businessType || 'E_COMMERCE';
    if (!allowedBusinessTypes.includes(userBusinessType)) {
      return <Navigate to="/dashboard" />;
    }
  }

  // Check if login type matches user role (if login type is tracked)
  if (loginType && loginType !== user.role) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
