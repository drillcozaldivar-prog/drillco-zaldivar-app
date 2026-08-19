'use client';

import { useState, useEffect } from 'react';
import { AuthService } from './authService';
import { UserProfile } from '@/types/domain';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthService.getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
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
