import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, initSession, setSession } from './api';
import type { Session } from './tokens';

interface AuthState {
  ready: boolean;
  signedIn: boolean;
  login(email: string, password: string): Promise<void>;
  register(input: Record<string, unknown>): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setLocal] = useState<Session | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    initSession(setLocal).then((s) => {
      setLocal(s);
      setReady(true);
    });
  }, []);

  const value: AuthState = {
    ready,
    signedIn: Boolean(session),
    async login(email, password) {
      const res = await api<Session>('/auth/login', { method: 'POST', body: { email, password } });
      await setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    },
    async register(input) {
      const res = await api<Session>('/auth/register', { method: 'POST', body: input });
      await setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    },
    async logout() {
      if (session) await api('/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken } }).catch(() => {});
      await setSession(null);
      qc.clear();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuori da AuthProvider');
  return ctx;
}
