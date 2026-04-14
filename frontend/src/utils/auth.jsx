import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginAPI, registerAPI, getMeAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('hpc_auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await getMeAPI();
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      localStorage.removeItem('hpc_auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await loginAPI(email, password);
      localStorage.setItem('hpc_auth_token', data.access_token);
      await fetchUser();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (username, email, password) => {
    setError(null);
    try {
      await registerAPI(username, email, password);
      // Try logging in with the registered credentials; fall back to demo login
      try {
        const data = await loginAPI(email, password);
        localStorage.setItem('hpc_auth_token', data.access_token);
      } catch (loginErr) {
        // Backend unavailable (static mode) — use demo token so user can explore
        const demoData = await loginAPI('demo@hpcai.dev', 'demo');
        localStorage.setItem('hpc_auth_token', demoData.access_token);
      }
      await fetchUser();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('hpc_auth_token');
    setUser(null);
    setError(null);
  };

  const value = { user, loading, error, login, register, logout, setError };

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
