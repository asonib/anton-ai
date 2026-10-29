import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, Credentials } from '../api/authApi';
import { UNAUTHORIZED_EVENT } from '../api/httpClient';
import type { User } from '../api/types';
import { storage } from '../utils/storage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (c: Credentials) => Promise<void>;
  register: (c: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [user, setUser] = useState<User | null>(() => storage.getUser());

  const applySession = useCallback((nextToken: string, nextUser: User) => {
    storage.setSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    storage.clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (c: Credentials) => {
    const res = await authApi.login(c);
    applySession(res.token, res.user);
  }, [applySession]);

  const register = useCallback(async (c: Credentials) => {
    const res = await authApi.register(c);
    applySession(res.token, res.user);
  }, [applySession]);

  // Interceptor broadcasts this when the token is rejected (expired / invalid).
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  // Validate a persisted token once on load.
  useEffect(() => {
    if (!token) return;
    authApi.me().then(setUser).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated: Boolean(token), login, register, logout }),
    [user, token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
