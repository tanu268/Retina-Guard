/**
 * Authentication.
 *
 * The demo runs with one-click role entry (no password screen), per the product
 * brief. Credentials are read from Vite env vars with the seeded values as a
 * fallback, so a deployment can override them without editing source. See
 * .env.example.
 */
import { http, clearTokens } from '../lib/http';
import type { AuthResponse, AuthUser, MeResponse, Role } from '../types';

const env = import.meta.env;

const DEMO_CREDENTIALS: Record<string, { username: string; password: string }> = {
  technician: {
    username: env.VITE_DEMO_TECH_USER || 'tanu.tech',
    password: env.VITE_DEMO_TECH_PASS || 'Tech#Rural2026',
  },
  reviewer: {
    username: env.VITE_DEMO_REVIEWER_USER || 'reviewer.doc',
    password: env.VITE_DEMO_REVIEWER_PASS || 'Review#Doc2026',
  },
  admin: {
    username: env.VITE_DEMO_ADMIN_USER || 'admin',
    password: env.VITE_DEMO_ADMIN_PASS || 'AdminRG#2026Secure',
  },
};

function persist(data: AuthResponse) {
  localStorage.setItem('rg_access_token', data.accessToken);
  localStorage.setItem('rg_refresh_token', data.refreshToken);
  localStorage.setItem('rg_user', JSON.stringify(data.user));
}

export const authService = {
  /** Sign in as a role using the seeded demo account. */
  async loginAsRole(role: string): Promise<AuthResponse> {
    const credentials = DEMO_CREDENTIALS[role];
    if (!credentials) throw new Error(`No demo account configured for role "${role}".`);
    const data = await http.publicPost<AuthResponse>('/auth/login', credentials);
    persist(data);
    return data;
  },

  /** Sign in with explicit credentials. */
  async login(username: string, password: string): Promise<AuthResponse> {
    const data = await http.publicPost<AuthResponse>('/auth/login', { username, password });
    persist(data);
    return data;
  },

  /**
   * GET /auth/me returns `{ user }`, not a bare user object.
   *
   * The previous client returned the envelope directly, so AuthContext stored
   * `{user:{...}}` and every `user.role` read was undefined. Login masked it —
   * the bug only appeared on a page refresh, where it silently locked the
   * person out of every role-gated route.
   */
  async me(): Promise<AuthUser> {
    const res = await http.get<MeResponse>('/auth/me');
    return res.user;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('rg_refresh_token');
    try {
      await http.post('/auth/logout', refreshToken ? { refreshToken } : undefined);
    } catch {
      // Signing out must succeed locally even with no connectivity.
    } finally {
      clearTokens();
    }
  },

  getStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem('rg_user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem('rg_access_token'));
  },
};

/** Where each role lands after entering the workspace. */
export const ROLE_HOME: Record<Role, string> = {
  technician: '/app/technician',
  reviewer: '/app/review/queue',
  admin: '/app/admin',
  district: '/app/admin',
};
