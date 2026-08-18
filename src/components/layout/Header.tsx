'use client';

import React from 'react';
import { ConnectionBadge } from './ConnectionBadge';
import { useAuth } from '@/features/auth/useAuth';
import { DrillcoLogo } from '@/components/ui/DrillcoLogo';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <DrillcoLogo size="sm" />
        <span className="hidden sm:inline-block text-slate-300">|</span>
        <span className="hidden sm:inline-block text-xs font-semibold text-slate-500">
          Control y Gestión de Perforación
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <ConnectionBadge />

        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-[#9E1B2C] font-black uppercase font-mono tracking-wider">
                {user.roles.join(', ')}
              </p>
            </div>

            <button
              onClick={logout}
              className="text-slate-400 hover:text-[#9E1B2C] p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
