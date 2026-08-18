'use client';

import React from 'react';
import { Settings, Users, HardHat, FileText, Database } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Panel de Administración</h1>
        <p className="text-sm text-slate-400">Configuración global de faenas, equipos, plantillas y catálogos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-mining-surface border border-mining-border p-6 rounded-2xl space-y-3">
          <div className="bg-mining-primary/10 border border-mining-primary/30 w-12 h-12 rounded-xl flex items-center justify-center text-mining-primary">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Gestión de Usuarios y Roles</h2>
          <p className="text-xs text-slate-400">Asignación de operadores, supervisores y accesos por faena.</p>
        </div>

        <div className="bg-mining-surface border border-mining-border p-6 rounded-2xl space-y-3">
          <div className="bg-mining-primary/10 border border-mining-primary/30 w-12 h-12 rounded-xl flex items-center justify-center text-mining-primary">
            <HardHat className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Equipos de Perforación</h2>
          <p className="text-xs text-slate-400">Administración de flota, modelos (Pit Viper, Sandvik) y horómetros.</p>
        </div>

        <div className="bg-mining-surface border border-mining-border p-6 rounded-2xl space-y-3">
          <div className="bg-mining-primary/10 border border-mining-primary/30 w-12 h-12 rounded-xl flex items-center justify-center text-mining-primary">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Plantillas de Procedimiento</h2>
          <p className="text-xs text-slate-400">Control de versiones inmutables y schemas dinámicos Zod.</p>
        </div>

        <div className="bg-mining-surface border border-mining-border p-6 rounded-2xl space-y-3">
          <div className="bg-mining-primary/10 border border-mining-primary/30 w-12 h-12 rounded-xl flex items-center justify-center text-mining-primary">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Catálogos y Parámetros</h2>
          <p className="text-xs text-slate-400">Motivos de detención, tipos de broca y rangos de tolerancias.</p>
        </div>
      </div>
    </div>
  );
}
