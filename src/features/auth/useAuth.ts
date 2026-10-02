'use client';

import { useState, useEffect } from 'react';
import { AuthService } from './authService';
import { UserProfile } from '@/types/domain';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnlineAccountStatus = async () => {
      if (typeof window !== 'undefined' && navigator.onLine) {
        const isValid = await AuthService.verifyAccountOnline();
        if (!isValid) {
          setUser(null);
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login?reason=account_revoked';
          }
        }
      }
    };

    AuthService.getCurrentUser()
      .then((u) => {
        setUser(u);
        if (u) {
          checkOnlineAccountStatus();
        }
      })
      .finally(() => setLoading(false));

    // Revisión periódica activa en segundo plano (cada 15 segundos) al estar Online
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.onLine) {
        checkOnlineAccountStatus();
      }
    }, 15000);

    const handleOnline = () => {
      checkOnlineAccountStatus();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await AuthService.login(email, pass);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !user.roles || !Array.isArray(user.roles)) return false;
    return user.roles.some((r) => String(r).toLowerCase() === roleName.toLowerCase());
  };

  return {
    user,
    loading,
    login,
    logout,
    isOperator: hasRole('operator'),
    isSupervisor: hasRole('supervisor'),
    isAdmin: hasRole('admin'),
    isAuditor: hasRole('auditor'),
  };
}
