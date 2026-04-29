import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginType, setLoginType] = useState(null); // 'admin' or 'staff'

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const type = localStorage.getItem('loginType');
    if (token && token !== 'undefined' && userData) {
      try {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        setUser(JSON.parse(userData));
        setLoginType(type || JSON.parse(userData).role);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginType');
        delete api.defaults.headers.common.Authorization;
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, type) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    let endpoint = '/auth/login';
    if (type === 'super_admin') {
      endpoint = '/auth/superadmin/login';
    } else if (type === 'admin') {
      endpoint = '/auth/admin/login';
    } else if (type === 'staff') {
      endpoint = '/auth/staff/login';
    }

    const response = await api.post(endpoint, { email: normalizedEmail, password });
    const { accessToken, token, user: userData } = response.data;
    const resolvedToken = accessToken || token;

    if (!resolvedToken) {
      throw new Error('Authentication token missing in login response');
    }

    // Validate role matches login type
    if (type === 'super_admin' && userData.role !== 'super_admin') {
      throw new Error('Invalid credentials for super admin login');
    }
    if (type === 'admin' && userData.role !== 'admin') {
      throw new Error('Invalid credentials for admin login');
    }
    if (type === 'staff' && userData.role !== 'staff') {
      throw new Error('Invalid credentials for staff login');
    }

    localStorage.setItem('token', resolvedToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('loginType', type);
    api.defaults.headers.common.Authorization = `Bearer ${resolvedToken}`;
    setUser(userData);
    setLoginType(type);
  };

  const registerAdmin = async ({ name, email, password, businessName, businessType }) => {
    const response = await api.post('/auth/register-admin', {
      name,
      email,
      password,
      businessName,
      businessType,
    });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginType');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
    setLoginType(null);
  };

  const switchBusiness = async (businessId) => {
    try {
      const response = await api.post('/auth/switch-business', { businessId });
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser(userData);
      
      return true;
    } catch (error) {
      console.error('Failed to switch business:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchBusiness, loading, loginType, registerAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
