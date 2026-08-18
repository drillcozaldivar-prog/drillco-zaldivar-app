'use client';

import React from 'react';
import { ShieldAlert, Eye, Search, Calendar } from 'lucide-react';

const MOCK_AUDIT_LOGS = [
  {
    id: 'aud_01',
    entityType: 'procedure',
    action: 'CREATE',
    user: 'Juan Pérez (Operador)',
    occurredAt: '2026-08-06T20:15:00Z',
    details: 'Creación de borrador local de procedimiento de perforación en PERF-01',
  },
  {
    id: 'aud_02',
    entityType: 'procedure',
    action: 'SUBMIT',
    user: 'Juan Pérez (Operador)',
    occurredAt: '2026-08-06T20:30:00Z',
    details: 'Envío de registro para revisión de supervisor (Outbox Sync completed)',
  },
  {
    id: 'aud_03',
    entityType: 'procedure',
    action: 'APPROVE',
    user: 'Carlos Mendoza (Supervisor)',
    occurredAt: '2026-08-06T21:00:00Z',
    details: 'Aprobación de parámetros de perforación y cierre formal',
  },
];

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Bitácora Inmutable de Auditoría</h1>
        <p className="text-sm text-slate-400">Trazabilidad inalterable registrada por triggers PostgreSQL</p>
      </div>

      <div className="bg-mining-surface border border-mining-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-lg">
          <ShieldAlert className="w-5 h-5 text-mining-primary" />
          <span>Historial de Eventos de Seguridad y Operación</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-mining-dark text-slate-400 border-b border-mining-border">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Acción</th>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Detalle Operacional</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="border-b border-mining-border/50 hover:bg-mining-dark/40">
                  <td className="py-3 px-4 font-mono text-xs text-mining-primary">{log.id}</td>
                  <td className="py-3 px-4">
                    <span className="bg-mining-card text-white px-2 py-0.5 rounded text-xs font-mono font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{log.user}</td>
                  <td className="py-3 px-4">{new Date(log.occurredAt).toLocaleString()}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
