'use client';

import { useState, useEffect } from 'react';
import { AuthService } from './authService';
import { UserProfile } from '@/types/domain';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkOnlineAccountStatus = async () => {
      if (typeof window !== 'undefined' && navigator.onLine) {
        const isValid = await AuthService.verifyAccountOnline();
        if (!isValid && isMounted) {
          setUser(null);
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.replace('/login');
          }
        }
      }
    };

    // Verificación estricta de credenciales en la apertura de la app
    AuthService.getCurrentUser()
      .then((u) => {
        if (!isMounted) return;
        setUser(u);
        if (u) {
          checkOnlineAccountStatus();
        } else {
          // Si no coincide con ninguna cuenta registrada, forzar salida inmediata
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.replace('/login');
          }
        }
      })
      .catch(async () => {
        if (!isMounted) return;
        setUser(null);
        await AuthService.purgeAllStoredData();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.replace('/login');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

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
      isMounted = false;
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
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
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
