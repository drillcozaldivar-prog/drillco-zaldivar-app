'use client';

import React from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Trash2,
  Activity,
  CheckSquare,
  Wrench,
  BookOpen,
  FileText
} from 'lucide-react';

export default function DashboardPage() {
  const panelCards = [
    {
      id: 'inventory',
      title: 'Inventario',
      description: 'Gestión de stock de aceros y triconos',
      href: '/inventory',
      icon: ClipboardList,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
    {
      id: 'discard',
      title: 'Descarte de Aceros',
      description: 'Registro de componentes fuera de servicio',
      href: '/discard',
      icon: Trash2,
      bgColor: 'bg-amber-50/70',
      iconColor: 'text-amber-500',
    },
    {
      id: 'diameters',
      title: 'Control de Diámetros',
      description: 'Estado de desgaste de aceros',
      href: '/diameters',
      icon: Activity,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
    {
      id: 'checklist',
      title: 'Checklist de Equipos',
      description: 'Inspección diaria de perforadoras',
      href: '/checklist',
      icon: CheckSquare,
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-500',
    },
    {
      id: 'steel-change',
      title: 'Cambio de Aceros',
      description: 'Registro de recambio de componentes y herramientas',
      href: '/steel-change',
      icon: Wrench,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      id: 'events',
      title: 'Eventos',
      description: 'Bitácora y registro de actividades operacionales por perforadora',
      href: '/events',
      icon: BookOpen,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'statistics',
      title: 'Estadística de Aceros',
      description: 'Próximamente',
      href: '#',
      icon: Activity,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
      isUpcoming: true,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Tarjeta de Encabezado: PANEL TÉCNICO */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-2 relative overflow-hidden">
        <div className="flex items-center space-x-3 text-slate-800">
          <FileText className="w-6 h-6 text-slate-700" />
          <h1 className="text-xl font-extrabold tracking-wide uppercase">PANEL TÉCNICO</h1>
        </div>
        
        {/* Línea de Acento Amarilla / Dorada */}
        <div className="h-1 bg-amber-400 w-full rounded-full"></div>

        <p className="text-sm text-slate-500 pt-1">
          Herramientas de gestión y control
        </p>
      </div>

      {/* Grid de Botones / Módulos de Gestión */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {panelCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.id}
              href={card.href}
              className={`bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all group relative ${
                card.isUpcoming ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {/* Contenedor de Ícono con Fondo Pastel */}
              <div className={`${card.bgColor} p-4 rounded-2xl mb-4 group-hover:scale-105 transition-transform`}>
                <Icon className={`w-8 h-8 ${card.iconColor}`} />
              </div>

              {/* Título de la Tarjeta */}
              <h2 className="text-lg font-bold text-slate-800 group-hover:text-[#9E1B2C] transition-colors">
                {card.title}
              </h2>

              {/* Descripción */}
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {card.description}
              </p>

              {card.isUpcoming && (
                <span className="mt-3 text-[10px] font-bold uppercase text-purple-600 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  Próximamente
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
