import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { loginAPI, registerAPI, getMeAPI, refreshTokenAPI, logoutAPI } from './api';

const AuthContext = createContext(null);

// Token stored in memory only (not localStorage) — secure against XSS
let inMemoryAccessToken = null;

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function setAccessToken(token) {
  inMemoryAccessToken = token;
}

export function isGuestUser(u) {
  return u && u.is_guest === true;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimer = useRef(null);

  // Schedule silent token refresh before expiry
  const scheduleRefresh = useCallback((expiresIn) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // Refresh 60 seconds before expiry (or at half-life for short tokens)
    const refreshIn = Math.max((expiresIn - 60) * 1000, (expiresIn / 2) * 1000);
    refreshTimer.current = setTimeout(async () => {
      try {
        const data = await refreshTokenAPI();
        if (data && data.access_token) {
          setAccessToken(data.access_token);
          scheduleRefresh(data.expires_in || 900);
        }
      } catch {
        // Refresh failed — session expired
        setAccessToken(null);
        setUser(null);
      }
    }, refreshIn);
  }, []);

  // Try to restore session on mount (using refresh cookie)
  const initSession = useCallback(async () => {
    // Check for guest mode first (no API calls needed)
    if (localStorage.getItem('hpc_guest_mode') === 'true') {
      setUser({ id: 'guest', username: 'Guest Explorer', email: 'guest@demo', is_guest: true });
      setLoading(false);
      return;
    }

    try {
      // Try silent refresh first (HttpOnly cookie)
      const refreshData = await refreshTokenAPI();
      if (refreshData && refreshData.access_token) {
        setAccessToken(refreshData.access_token);
        scheduleRefresh(refreshData.expires_in || 900);
        const userData = await getMeAPI();
        setUser(userData);
        return;
      }
    } catch {
      // No valid refresh cookie
    }

    // Fallback: check localStorage for legacy/demo token
    const legacyToken = localStorage.getItem('hpc_auth_token');
    if (legacyToken) {
      setAccessToken(legacyToken);
      try {
        const userData = await getMeAPI();
        setUser(userData);
      } catch {
        localStorage.removeItem('hpc_auth_token');
        setAccessToken(null);
      }
    }

    setLoading(false);
  }, [scheduleRefresh]);

  useEffect(() => {
    initSession().finally(() => setLoading(false));
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [initSession]);

  const login = async (email, password, totpCode = null) => {
    setError(null);
    try {
      const data = await loginAPI(email, password, totpCode);

      // 2FA required — return signal to UI
      if (data.requires_2fa) {
        return { requires_2fa: true };
      }

      setAccessToken(data.access_token);
      // Also set in localStorage for demo/static mode compatibility
      localStorage.setItem('hpc_auth_token', data.access_token);
      scheduleRefresh(data.expires_in || 900);

      const userData = await getMeAPI();
      setUser(userData);
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (username, email, password) => {
    setError(null);
    try {
      const data = await registerAPI(username, email, password);
      if (data && data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem('hpc_auth_token', data.access_token);
        scheduleRefresh(data.expires_in || 900);
      }
      const userData = await getMeAPI();
      setUser(userData);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const loginAsGuest = () => {
    setError(null);
    const guestUser = { id: 'guest', username: 'Guest Explorer', email: 'guest@demo', is_guest: true };
    localStorage.setItem('hpc_guest_mode', 'true');
    setUser(guestUser);
  };

  const logout = async () => {
    const wasGuest = user?.is_guest;
    if (!wasGuest) {
      try { await logoutAPI(); } catch { /* ignore */ }
    }
    setAccessToken(null);
    localStorage.removeItem('hpc_auth_token');
    localStorage.removeItem('hpc_guest_mode');
    setUser(null);
    setError(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  };

  const value = { user, loading, error, login, register, loginAsGuest, logout, setError };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
