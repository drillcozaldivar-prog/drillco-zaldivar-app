'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Trash2,
  Activity,
  CheckSquare,
  Wrench,
  BookOpen,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  // Módulos Operacionales
  const navItems = [
    { label: 'Panel Técnico', href: '/', icon: LayoutDashboard },
    { label: 'Inventario', href: '/inventory', icon: Package },
    { label: 'Descarte de Aceros', href: '/discard', icon: Trash2 },
    { label: 'Control de Diámetros', href: '/diameters', icon: Activity },
    { label: 'Checklist de Equipos', href: '/checklist', icon: CheckSquare },
    { label: 'Cambio de Aceros', href: '/steel-change', icon: Wrench },
    { label: 'Eventos', href: '/events', icon: BookOpen },
    { label: 'Centro Sincronización', href: '/sync', icon: RefreshCw },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Administración', href: '/admin', icon: Settings });
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)] shadow-sm">
      <div className="p-4 space-y-1">
        <p className="px-4 text-[10px] font-black uppercase text-[#9E1B2C] tracking-widest mb-2">Módulos Operacionales</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                isActive
                  ? 'bg-[#9E1B2C] text-white shadow-md shadow-red-900/10'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200 text-center bg-slate-50/50">
        <p className="text-[11px] font-bold text-slate-700">DRILLCO® PWA v1.2</p>
        <p className="text-[10px] text-slate-500 font-mono">Faena Zaldívar - Chile</p>
      </div>
    </aside>
  );
}
