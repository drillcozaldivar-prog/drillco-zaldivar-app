'use client';

import React, { useEffect, useState } from 'react';
import { OutboxRepository } from '@/lib/indexeddb/repositories/outboxRepository';
import { OutboxOperation } from '@/types/domain';
import { SyncEngine } from '@/lib/sync/syncEngine';
import { ConflictResolverModal } from '@/components/sync/ConflictResolverModal';
import { RefreshCw, CheckCircle2, AlertOctagon, Layers, PlayCircle } from 'lucide-react';

export default function SyncCenterPage() {
  const [operations, setOperations] = useState<OutboxOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<OutboxOperation | null>(null);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const pending = await OutboxRepository.getPendingOperations(50);
      setOperations(pending);
    } catch {
      // Ignorar errores en lectura IndexedDB
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await SyncEngine.triggerSync();
    await loadQueue();
    setIsSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Centro de Sincronización Outbox</h1>
          <p className="text-sm text-slate-400">Inspección de cola de operaciones locales e idempotencia</p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="bg-mining-primary hover:bg-mining-hover text-mining-dark font-black px-5 py-2.5 rounded-xl flex items-center space-x-2 text-sm shadow-md transition-colors"
        >
          <PlayCircle className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>PROCESAR COLA AHORA</span>
        </button>
      </div>

      {/* Resumen de la Cola Outbox */}
      <div className="bg-mining-surface border border-mining-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-lg">
          <Layers className="w-5 h-5 text-mining-primary" />
          <span>Operaciones Pendientes en Dispositivo ({operations.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-mining-dark text-slate-400 border-b border-mining-border">
              <tr>
                <th className="py-3 px-4">Operation ID</th>
                <th className="py-3 px-4">Entidad</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Intentos</th>
                <th className="py-3 px-4">Estado Outbox</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                    La cola Outbox está vacía. Todos los registros locales están sincronizados con Supabase.
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
                  <tr key={op.operationId} className="border-b border-mining-border/50 hover:bg-mining-dark/40">
                    <td className="py-3 px-4 font-mono text-xs text-mining-primary font-bold">
                      {op.operationId}
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-xs">{op.entityType}</td>
                    <td className="py-3 px-4">
                      <span className="bg-mining-card text-white px-2 py-0.5 rounded text-xs font-mono font-bold">
                        {op.operationType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{op.attempts}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          op.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : op.status === 'conflict'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {op.status === 'conflict' && (
                        <button
                          onClick={() => setSelectedConflict(op)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                        >
                          Resolver Conflicto
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConflictResolverModal
        isOpen={!!selectedConflict}
        onClose={() => setSelectedConflict(null)}
        localData={selectedConflict?.payload || {}}
        serverData={{ version: 2, status: 'submitted', note: 'Modificado por supervisor en servidor' }}
        onResolve={(strategy) => {
          console.log('Estrategia seleccionada:', strategy);
          setSelectedConflict(null);
        }}
      />
    </div>
  );
}
