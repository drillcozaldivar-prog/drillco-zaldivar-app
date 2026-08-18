'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProcedureRepository } from '@/lib/indexeddb/repositories/procedureRepository';
import { LocalProcedure } from '@/types/domain';
import { ClipboardList, PlusCircle, Search, Filter } from 'lucide-react';

export default function ProceduresListPage() {
  const [procedures, setProcedures] = useState<LocalProcedure[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSync, setFilterSync] = useState('ALL');

  useEffect(() => {
    ProcedureRepository.getAllLocal().then(setProcedures);
  }, []);

  const filteredProcedures = procedures.filter((p) => {
    const matchesSearch = p.localId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterSync === 'ALL' || p.syncStatus === filterSync;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Historial de Procedimientos</h1>
          <p className="text-sm text-slate-400">Registros locales e inspecciones en faena</p>
        </div>

        <Link
          href="/procedures/new"
          className="bg-mining-primary hover:bg-mining-hover text-mining-dark font-black px-4 py-2.5 rounded-xl flex items-center space-x-2 text-sm shadow-md transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span>NUEVO REGISTRO</span>
        </Link>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-mining-surface border border-mining-border p-4 rounded-xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID Local de Procedimiento..."
            className="w-full bg-mining-dark border border-mining-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-mining-primary"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterSync}
            onChange={(e) => setFilterSync(e.target.value)}
            className="bg-mining-dark border border-mining-border text-white text-sm rounded-lg p-2 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="local_draft">Borrador Local</option>
            <option value="pending_sync">Pendiente Sync</option>
            <option value="synced">Sincronizado</option>
            <option value="conflict">En Conflicto</option>
          </select>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-mining-surface border border-mining-border rounded-2xl p-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-mining-dark text-slate-400 border-b border-mining-border">
              <tr>
                <th className="py-3 px-4">Local ID</th>
                <th className="py-3 px-4">Fecha Inicio</th>
                <th className="py-3 px-4">Versión</th>
                <th className="py-3 px-4">Estado Operacional</th>
                <th className="py-3 px-4">Sincronización</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcedures.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                    No se encontraron registros que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProcedures.map((proc) => (
                  <tr key={proc.localId} className="border-b border-mining-border/50 hover:bg-mining-dark/40">
                    <td className="py-3 px-4 font-mono text-xs text-mining-primary font-bold">{proc.localId}</td>
                    <td className="py-3 px-4">{new Date(proc.startedAt).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-xs">v{proc.version}</td>
                    <td className="py-3 px-4">
                      <span className="bg-mining-card text-white px-2.5 py-1 rounded-full text-xs font-semibold uppercase">
                        {proc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          proc.syncStatus === 'synced'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : proc.syncStatus === 'pending_sync'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {proc.syncStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/procedures/${proc.localId}`}
                        className="bg-mining-card hover:bg-mining-border text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors inline-block"
                      >
                        Ver Ficha
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
