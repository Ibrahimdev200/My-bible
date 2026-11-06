import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { assetUrl, getErrorMessage } from '../utils/config';
import toast from 'react-hot-toast';

// The server returns { token, church: {...} }; map its fields to what the UI expects.
const normalizeUser = (data) => {
  const u = data?.church || data?.user || data;
  if (!u || typeof u !== 'object') return null;
  const logo = u.logoUrl || u.logoPath;
  return {
    ...u,
    logoUrl: logo ? assetUrl(logo) : null,
    branding: u.branding || u.brandingConfig || {},
    preferredTranslation: u.preferredTranslation || u.selectedTranslation || 'KJV',
  };
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Helper to sync token in localStorage and api defaults
  const handleSetToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  // Fetch current user details
  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(normalizeUser(res.data));
    } catch (err) {
      console.warn('Failed to fetch user session:', err?.response?.data?.message || err.message);
      handleSetToken(null);
    } finally {
      setLoading(false);
    }
  }, [handleSetToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Login
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const authToken = res.data.token;
      const authUser = normalizeUser(res.data);

      handleSetToken(authToken);
      setUser(authUser);
      toast.success(res.data.message || 'Welcome back!');
      return { success: true, user: authUser };
    } catch (error) {
      const msg = getErrorMessage(error, 'Login failed. Please check your credentials.');
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Register
  const register = async (registrationData) => {
    try {
      // If registrationData is FormData or Object
      const isFormData = registrationData instanceof FormData;
      const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};

      const res = await api.post('/auth/register', registrationData, { headers });
      const authToken = res.data.token;
      const authUser = normalizeUser(res.data);

      if (authToken) {
        handleSetToken(authToken);
      }
      setUser(authUser);
      toast.success('Registration successful! Welcome to ScriptureLive AI.');
      return { success: true, user: authUser };
    } catch (error) {
      const msg = getErrorMessage(error, 'Registration failed. Please check your details.');
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Logout
  const logout = () => {
    handleSetToken(null);
    toast.success('You have been logged out.');
  };

  // Update Church Profile
  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/church/profile', profileData);
      const updatedUser = normalizeUser(res.data.church || res.data.user ? res.data : { ...user, ...profileData });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success('Church profile updated successfully');
      return { success: true, user: updatedUser };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update church profile';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Upload Church Logo
  const uploadLogo = async (file) => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/church/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const logoUrl = assetUrl(res.data.logoUrl || res.data.url);
      setUser(prev => ({ ...prev, logoUrl }));
      toast.success('Logo uploaded successfully');
      return { success: true, logoUrl };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to upload logo';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Update Church Branding
  const updateBranding = async (brandingData) => {
    try {
      const res = await api.put('/church/branding', brandingData);
      const updatedBranding = res.data.branding || res.data;
      setUser(prev => ({ ...prev, branding: { ...(prev?.branding || {}), ...updatedBranding } }));
      toast.success('Branding preferences saved');
      return { success: true, branding: updatedBranding };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update branding settings';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Update Default Translation
  const updateTranslation = async (translation) => {
    try {
      await api.put('/church/translation', { translation });
      setUser(prev => ({ ...prev, preferredTranslation: translation }));
      toast.success(`Translation switched to ${translation}`);
      return { success: true };
    } catch (error) {
      // Optimistic update even if backend route fails
      setUser(prev => ({ ...prev, preferredTranslation: translation }));
      return { success: true };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateProfile,
    uploadLogo,
    updateBranding,
    updateTranslation,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
