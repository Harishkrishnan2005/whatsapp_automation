import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole, allowedBusinessTypes }) => {
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

  if (Array.isArray(allowedBusinessTypes) && allowedBusinessTypes.length > 0) {
    const userBusinessType = user?.businessType || 'E_COMMERCE';
    if (!allowedBusinessTypes.includes(userBusinessType)) {
      return <Navigate to="/dashboard" />;
    }
  }

  // Check if login type matches user role
  if (loginType !== user.role) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
