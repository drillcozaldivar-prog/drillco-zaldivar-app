'use client';

import React from 'react';
import { AlertOctagon, CheckCircle2, Server, Smartphone, X } from 'lucide-react';

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  localData: Record<string, any>;
  serverData: Record<string, any>;
  onResolve: (strategy: 'KEEP_SERVER' | 'OVERWRITE_LOCAL' | 'CREATE_REVISION') => void;
}

export function ConflictResolverModal({
  isOpen,
  onClose,
  localData,
  serverData,
  onResolve,
}: ConflictResolverModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-mining-surface border border-mining-border rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-mining-border pb-4">
          <div className="flex items-center space-x-3 text-red-400">
            <AlertOctagon className="w-7 h-7" />
            <div>
              <h2 className="text-xl font-black text-white">Conflicto de Concurrencia Detallado</h2>
              <p className="text-xs text-slate-400">
                El registro fue modificado en el servidor por otro usuario antes de su sincronización.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Comparación lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Versión Dispositivo Local */}
          <div className="bg-mining-dark border border-amber-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-amber-400 font-bold border-b border-mining-border pb-2">
              <Smartphone className="w-5 h-5" />
              <span>Versión en este Dispositivo (Local)</span>
            </div>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 p-3 rounded-lg">
              {JSON.stringify(localData, null, 2)}
            </pre>
          </div>

          {/* Versión en Servidor Supabase */}
          <div className="bg-mining-dark border border-blue-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-blue-400 font-bold border-b border-mining-border pb-2">
              <Server className="w-5 h-5" />
              <span>Versión Oficial en Servidor (Supabase)</span>
            </div>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 p-3 rounded-lg">
              {JSON.stringify(serverData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Estrategias de Resolución */}
        <div className="bg-mining-card/50 p-4 rounded-xl space-y-3 border border-mining-border">
          <p className="text-xs font-bold uppercase text-slate-300">Seleccione Estrategia de Resolución:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onResolve('KEEP_SERVER')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center space-y-1 transition-colors"
            >
              <span>Conservar Servidor</span>
              <span className="text-[10px] font-normal text-blue-200">Descarta cambios locales conflicto</span>
            </button>

            <button
              onClick={() => onResolve('OVERWRITE_LOCAL')}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center space-y-1 transition-colors"
            >
              <span>Sobrescribir con Local</span>
              <span className="text-[10px] font-normal text-amber-200">Requiere permiso de Supervisor</span>
            </button>

            <button
              onClick={() => onResolve('CREATE_REVISION')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3 rounded-xl text-xs flex flex-col items-center justify-center space-y-1 transition-colors"
            >
              <span>Crear Enmienda / Revisión</span>
              <span className="text-[10px] font-normal text-emerald-200">Genera nuevo registro versión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
