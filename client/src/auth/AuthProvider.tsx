import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStorage } from '../api/client';
import type { AuthResponse, User } from '../api/types';
import { AuthContext } from './AuthContext';
import type { AuthContextValue } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStorage.get() !== null);

  // Ao abrir o app, se já houver token salvo, descobre quem é o usuário
  useEffect(() => {
    let cancelled = false;

    if (tokenStorage.get()) {
      api<{ user: User }>('/auth/me')
        .then((data) => {
          if (!cancelled) setUser(data.user);
        })
        .catch(() => tokenStorage.clear())
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStorage.set(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    tokenStorage.set(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}