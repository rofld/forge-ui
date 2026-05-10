// auth-context.tsx — React context for the authenticated user.
// Provides signIn / signOut and hydrates the user on mount via GET /me.
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  login,
  logout,
  getMe,
  setAuthToken,
  clearAuthToken,
  isAuthenticated,
} from './api';
import type { User } from './api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount, if a token is present, hydrate the user via GET /me.
  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Token is stale or invalid — clear it; apiFetch already redirects.
        clearAuthToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { token, user: u } = await login(username, password);
    setAuthToken(token);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Consume the auth context. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
