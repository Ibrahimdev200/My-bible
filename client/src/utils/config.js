// Base URL of the backend server.
// - Local dev: leave VITE_API_URL unset; Vite proxies /api, /socket.io and /uploads to localhost:5000.
// - Production (Vercel): set VITE_API_URL to your backend URL, e.g. https://scripturelive-api.onrender.com
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Turn a server-relative path like "/uploads/logos/x.png" into a full URL.
export const assetUrl = (path) => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Pull a readable message out of an axios error (server sends { error } or { errors: [{ msg }] }).
export const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (Array.isArray(data?.errors) && data.errors[0]?.msg) return data.errors[0].msg;
  if (!error?.response) {
    return 'Cannot reach the ScriptureLive server. Check your internet connection or the backend URL (VITE_API_URL).';
  }
  return fallback;
};

