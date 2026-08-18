'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProcedureRepository } from '@/lib/indexeddb/repositories/procedureRepository';
import { LocalProcedure, LocalMeasurement } from '@/types/domain';
import { ProcedureStateMachine } from '@/features/procedures/stateMachine';
import { useAuth } from '@/features/auth/useAuth';
import { ClipboardList, ArrowLeft, CheckCircle2, XCircle, Lock, Gauge } from 'lucide-react';

export default function ProcedureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const localId = params.id as string;

  const [procedure, setProcedure] = useState<LocalProcedure | null>(null);
  const [measurements, setMeasurements] = useState<LocalMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcedure();
  }, [localId]);

  const loadProcedure = async () => {
    try {
      const proc = await ProcedureRepository.getByLocalId(localId);
      if (proc) {
        setProcedure(proc);
        const meas = await ProcedureRepository.getMeasurementsForProcedure(localId);
        setMeasurements(meas);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-mining-primary font-bold">Cargando procedimiento...</div>;
  }

  if (!procedure) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">El procedimiento no existe en IndexedDB.</p>
        <button onClick={() => router.push('/procedures')} className="text-mining-primary underline">
          Volver al listado
        </button>
      </div>
    );
  }

  const nextStates = ProcedureStateMachine.getNextValidStates(procedure.status, user?.roles || []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/procedures')}
          className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Procedimientos</span>
        </button>

        <span className="bg-mining-card text-white px-3 py-1 rounded-full text-xs font-bold uppercase font-mono">
          Estado: {procedure.status}
        </span>
      </div>

      <div className="bg-mining-surface border border-mining-border rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="border-b border-mining-border pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-white">Procedimiento de Perforación</h1>
            <p className="text-xs font-mono text-mining-primary mt-1">Local ID: {procedure.localId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Versión del Registro</p>
            <p className="text-lg font-mono font-bold text-white">v{procedure.version}</p>
          </div>
        </div>

        {/* Ficha de Detalles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-mining-dark/50 p-4 rounded-xl border border-mining-border text-sm">
          <div>
            <p className="text-xs text-slate-400">Fecha de Inicio</p>
            <p className="font-semibold text-white">{new Date(procedure.startedAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Estado de Sincronización</p>
            <p className="font-semibold text-mining-primary uppercase">{procedure.syncStatus}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Creado Offline</p>
            <p className="font-semibold text-white">{procedure.createdOffline ? 'Sí (Terreno)' : 'No'}</p>
          </div>
        </div>

        {/* Mediciones Técnicas */}
        <div className="space-y-3">
          <h3 className="text-md font-bold text-white flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-mining-primary" />
            <span>Mediciones Registradas</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-mining-dark text-slate-400 border-b border-mining-border">
                <tr>
                  <th className="py-2.5 px-3">Variable</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {measurements.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-slate-500 italic">
                      Sin mediciones asociadas
                    </td>
                  </tr>
                ) : (
                  measurements.map((m) => (
                    <tr key={m.localId} className="border-b border-mining-border/50">
                      <td className="py-2 px-3 font-semibold text-white">{m.measurementType}</td>
                      <td className="py-2 px-3 font-mono text-mining-primary">{m.value}</td>
                      <td className="py-2 px-3">{m.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acciones de Transición de Estado por Rol */}
        {nextStates.length > 0 && (
          <div className="bg-mining-card/50 p-4 rounded-xl border border-mining-border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-300">Acciones de Supervisor / Cambio de Estado:</p>
            <div className="flex flex-wrap gap-3">
              {nextStates.map((state) => (
                <button
                  key={state}
                  onClick={() => console.log('Transición a:', state)}
                  className="bg-mining-primary hover:bg-mining-hover text-mining-dark font-black px-4 py-2 rounded-lg text-xs uppercase transition-colors"
                >
                  Cambiar a {state}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
