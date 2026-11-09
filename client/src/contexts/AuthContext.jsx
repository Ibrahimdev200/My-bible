import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { assetUrl, getErrorMessage } from '../utils/config';
import toast from 'react-hot-toast';

const OFFLINE_CHURCH_KEY = 'scripturelive_local_church';
const OFFLINE_ACCOUNTS_KEY = 'scripturelive_local_accounts';

const loadOfflineAccounts = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveOfflineAccounts = (accounts) => {
  try {
    localStorage.setItem(OFFLINE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch { }
};

const fileToDataUrl = (file) =>
  new Promise((resolve) => {
    if (!file || !(file instanceof Blob)) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result || null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

// The server returns { token, church: {...} }; map its fields to what the UI expects.
const normalizeUser = (data) => {
  const u = data?.church || data?.user || data;
  if (!u || typeof u !== 'object') return null;
  const logo = u.logoUrl || u.logoPath;
  const resolvedName = u.churchName || u.name || 'Faith Fellowship';
  return {
    ...u,
    id: u.id || 'local_church',
    name: resolvedName,
    churchName: resolvedName,
    logoUrl: logo ? assetUrl(logo) : null,
    branding: u.branding || u.brandingConfig || {},
    preferredTranslation: u.preferredTranslation || u.selectedTranslation || 'KJV',
  };
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_CHURCH_KEY);
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const persistActiveUser = useCallback((userData) => {
    userRef.current = userData;
    setUser(userData);
    try {
      if (userData) {
        localStorage.setItem(OFFLINE_CHURCH_KEY, JSON.stringify(userData));
        window.dispatchEvent(new CustomEvent('church-settings-updated', { detail: userData }));
      } else {
        localStorage.removeItem(OFFLINE_CHURCH_KEY);
      }
    } catch { }
  }, []);

  // Helper to sync token in localStorage and api defaults
  const handleSetToken = useCallback(
    (newToken) => {
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        persistActiveUser(null);
      }
    },
    [persistActiveUser]
  );

  // Fetch current user details
  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    // If using a local standalone session token, load from local storage without failing if backend is unreachable
    if (storedToken.startsWith('local_token_')) {
      try {
        const saved = localStorage.getItem(OFFLINE_CHURCH_KEY);
        if (saved) {
          setUser(normalizeUser(JSON.parse(saved)));
          setLoading(false);
          return;
        }
      } catch { }
    }

    try {
      const res = await api.get('/auth/me');
      const normalized = normalizeUser(res.data);
      persistActiveUser(normalized);
    } catch (err) {
      // If network error (server sleeping or VITE_API_URL unset), keep cached local church profile if available
      if (!err?.response) {
        try {
          const saved = localStorage.getItem(OFFLINE_CHURCH_KEY);
          if (saved) {
            setUser(normalizeUser(JSON.parse(saved)));
            setLoading(false);
            return;
          }
        } catch { }
      }
      console.warn('Failed to fetch user session:', err?.response?.data?.message || err.message);
      handleSetToken(null);
    } finally {
      setLoading(false);
    }
  }, [handleSetToken, persistActiveUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Login (tries backend first; if backend is unreachable or sleeping, falls back to local browser account)
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const authToken = res.data.token;
      const authUser = normalizeUser(res.data);

      handleSetToken(authToken);
      persistActiveUser(authUser);
      toast.success(res.data.message || 'Welcome back!');
      return { success: true, user: authUser };
    } catch (error) {
      // Check if server is unreachable or returned HTML (404/405 from Vercel when VITE_API_URL is unset)
      const isServerUnreachable =
        !error?.response ||
        error?.response?.status === 404 ||
        error?.response?.status === 405 ||
        error?.response?.status >= 502 ||
        (typeof error?.response?.data === 'string' && error.response.data.includes('<!DOCTYPE'));

      if (isServerUnreachable) {
        const accounts = loadOfflineAccounts();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const found = accounts.find((a) => a.email === cleanEmail);

        if (found && found.password === password) {
          const localToken = `local_token_${found.id}`;
          const authUser = normalizeUser(found);
          handleSetToken(localToken);
          persistActiveUser(authUser);
          toast.success(`Welcome back, ${authUser.churchName}!`);
          return { success: true, user: authUser };
        }

        // If no local account exists yet, sign in with a new standalone session for this email
        const fallbackChurch = normalizeUser({
          id: `church_${Date.now()}`,
          name: cleanEmail.split('@')[0]?.replace(/[._-]/g, ' ') || 'Sanctuary Church',
          churchName: cleanEmail.split('@')[0]?.replace(/[._-]/g, ' ') || 'Sanctuary Church',
          email: cleanEmail,
          preferredTranslation: 'KJV',
          branding: {
            template: 'classic',
            primaryColor: '#f99307',
            secondaryColor: '#1a3dff',
            backgroundColor: '#0b1137',
            textColor: '#ffffff',
            fontSize: 48,
            displayDuration: 300,
          },
        });
        const localToken = `local_token_${fallbackChurch.id}`;
        accounts.push({ ...fallbackChurch, password });
        saveOfflineAccounts(accounts);
        handleSetToken(localToken);
        persistActiveUser(fallbackChurch);
        toast.success('Signed in (Standalone Sanctuary Mode)');
        return { success: true, user: fallbackChurch };
      }

      const msg = getErrorMessage(error, 'Login failed. Please check your credentials.');
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Register (tries backend first; if backend is unreachable or VITE_API_URL is unset, completes registration in Standalone Mode)
  const register = async (registrationData) => {
    const isFormData = registrationData instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': undefined } } : {};

    try {
      const res = await api.post('/auth/register', registrationData, config);
      const authToken = res.data.token;
      const authUser = normalizeUser(res.data);

      if (authToken) {
        handleSetToken(authToken);
      }
      persistActiveUser(authUser);
      toast.success('Registration successful! Welcome to ScriptureLive.');
      return { success: true, user: authUser };
    } catch (error) {
      const isServerUnreachable =
        !error?.response ||
        error?.response?.status === 404 ||
        error?.response?.status === 405 ||
        error?.response?.status >= 502 ||
        (typeof error?.response?.data === 'string' && error.response.data.includes('<!DOCTYPE'));

      if (isServerUnreachable) {
        const extract = (key) =>
          isFormData ? registrationData.get(key) : registrationData?.[key];

        const churchName =
          String(extract('churchName') || extract('name') || 'Sanctuary Church').trim();
        const email = String(extract('email') || '').trim().toLowerCase();
        const password = String(extract('password') || '');
        const pastorName = String(extract('pastorName') || '').trim();
        const phone = String(extract('phone') || '').trim();
        const country = String(extract('country') || 'United States').trim();
        const state = String(extract('state') || '').trim();
        const address = String(extract('address') || '').trim();
        const logoFile = extract('logo');
        const logoDataUrl = await fileToDataUrl(logoFile);

        const localChurch = normalizeUser({
          id: `church_${Date.now()}`,
          name: churchName,
          churchName,
          email,
          pastorName,
          phone,
          country,
          state,
          address,
          logoUrl: logoDataUrl,
          preferredTranslation: 'KJV',
          branding: {
            template: 'classic',
            primaryColor: '#f99307',
            secondaryColor: '#1a3dff',
            backgroundColor: '#0b1137',
            textColor: '#ffffff',
            fontSize: 48,
            displayDuration: 300,
          },
        });

        const accounts = loadOfflineAccounts().filter((a) => a.email !== email);
        accounts.push({ ...localChurch, password });
        saveOfflineAccounts(accounts);

        const localToken = `local_token_${localChurch.id}`;
        handleSetToken(localToken);
        persistActiveUser(localChurch);
        toast.success('Registration successful! Welcome to ScriptureLive.');
        return { success: true, user: localChurch };
      }

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
      const updatedUser = normalizeUser(
        res.data.church || res.data.user ? res.data : { ...(userRef.current || {}), ...profileData }
      );
      const current = userRef.current || {};
      const merged = {
        ...current,
        ...updatedUser,
        churchName: profileData.churchName || profileData.name || updatedUser?.churchName || current.churchName,
        name: profileData.churchName || profileData.name || updatedUser?.name || current.name,
        logoUrl: profileData.logoUrl !== undefined ? profileData.logoUrl : (updatedUser?.logoUrl || current.logoUrl),
      };
      persistActiveUser(merged);
      return { success: true, user: merged };
    } catch (error) {
      const current = userRef.current || {};
      const merged = normalizeUser({ ...current, ...profileData });
      if (profileData.logoUrl !== undefined) {
        merged.logoUrl = profileData.logoUrl;
      }
      persistActiveUser(merged);
      return { success: true, user: merged };
    }
  };

  // Upload Church Logo
  const uploadLogo = async (file) => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/church/logo', formData, {
        headers: { 'Content-Type': undefined },
      });
      const logoUrl = assetUrl(res.data.logoUrl || res.data.url);
      const current = userRef.current || {};
      const merged = { ...current, logoUrl };
      persistActiveUser(merged);
      toast.success('Logo uploaded successfully');
      return { success: true, logoUrl };
    } catch (error) {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl) {
        const current = userRef.current || {};
        const merged = { ...current, logoUrl: dataUrl };
        persistActiveUser(merged);
        toast.success('Church logo saved');
        return { success: true, logoUrl: dataUrl };
      }
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
      const current = userRef.current || {};
      const merged = {
        ...current,
        branding: { ...(current?.branding || {}), ...updatedBranding },
      };
      persistActiveUser(merged);
      return { success: true, branding: merged.branding };
    } catch (error) {
      const current = userRef.current || {};
      const merged = {
        ...current,
        branding: { ...(current?.branding || {}), ...brandingData },
      };
      persistActiveUser(merged);
      return { success: true, branding: merged.branding };
    }
  };

  // Update Default Translation
  const updateTranslation = async (translation) => {
    try {
      await api.put('/church/translation', { translation });
    } catch { }
    const current = userRef.current || {};
    const merged = { ...current, preferredTranslation: translation };
    persistActiveUser(merged);
    return { success: true, translation };
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
