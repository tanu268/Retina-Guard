import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode,
} from 'react';
import type { AuthUser, Role } from '../types';
import { authService } from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsRole: (role: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  // Revalidate the stored session on mount. If the device is offline we keep the
  // cached user rather than signing the technician out mid-shift — the access
  // token is still bounded server-side by OFFLINE_GRACE_HOURS.
  useEffect(() => {
    let cancelled = false;
    if (!authService.isAuthenticated()) { setIsLoading(false); return; }

    authService.me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        localStorage.setItem('rg_user', JSON.stringify(u));
      })
      .catch(() => { /* offline — retain the cached user */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('rg:session-expired', handler);
    return () => window.removeEventListener('rg:session-expired', handler);
  }, []);

  const loginAsRole = useCallback(async (role: string) => {
    const res = await authService.loginAsRole(role);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    loginAsRole,
    logout,
    hasRole,
  }), [user, isLoading, loginAsRole, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
