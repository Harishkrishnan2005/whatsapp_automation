import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/accessControl.js';

const ProtectedRoute = ({ children, requiredRole, allowedRoles, staffRoles, allowedBusinessTypes, requiredFeature }) => {
  const { user, loginType } = useAuth();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/" />;
  }

  // Check if user role matches required role
  const acceptedRoles = allowedRoles || (requiredRole ? [requiredRole] : []);
  if (acceptedRoles.length > 0 && !acceptedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on their actual role
    if (user.role === 'super_admin') {
      return <Navigate to="/superadmin/dashboard" />;
    } else if (user.role === 'admin') {
      return <Navigate to="/dashboard" />;
    } else if (user.role === 'staff') {
      return <Navigate to="/staff/dashboard" />;
    }
    return <Navigate to="/" />;
  }

  if (Array.isArray(staffRoles) && staffRoles.length > 0 && user.role === 'staff' && !staffRoles.includes(user.staffRole)) {
    return <Navigate to="/staff/dashboard" />;
  }

  if (requiredFeature && !canAccess(user, requiredFeature)) {
    return <Navigate to={user.role === 'staff' ? '/staff/dashboard' : '/admin/pricing'} state={{ featureLocked: requiredFeature }} />;
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
