import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logoutUser } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('ferms_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Validate session on mount / reload
  useEffect(() => {
    let mounted = true;
    async function verifySession() {
      const token = sessionStorage.getItem('ferms_token');
      if (token) {
        try {
          const freshUser = await getCurrentUser();
          if (mounted && freshUser) {
            setUser(freshUser);
            sessionStorage.setItem('ferms_user', JSON.stringify(freshUser));
          }
        } catch {
          // Token expired or invalid
          if (mounted) {
            setUser(null);
            sessionStorage.removeItem('ferms_user');
            sessionStorage.removeItem('ferms_token');
            if (typeof globalThis !== 'undefined') {
              delete globalThis.__FERMS_TOKEN__;
            }
          }
        }
      } else {
        if (mounted) {
          setUser(null);
          sessionStorage.removeItem('ferms_user');
        }
      }
      if (mounted) {
        setLoading(false);
      }
    }

    verifySession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback((userData, token) => {
    setUser(userData);
    sessionStorage.setItem('ferms_user', JSON.stringify(userData));
    if (token) {
      sessionStorage.setItem('ferms_token', token);
      if (typeof globalThis !== 'undefined') {
        globalThis.__FERMS_TOKEN__ = token;
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Best-effort backend notification
    } finally {
      setUser(null);
      sessionStorage.removeItem('ferms_user');
      sessionStorage.removeItem('ferms_token');
      if (typeof globalThis !== 'undefined') {
        delete globalThis.__FERMS_TOKEN__;
      }
    }
  }, []);

  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
