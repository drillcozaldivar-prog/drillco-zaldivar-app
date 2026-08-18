'use client';

import React, { useEffect, useState } from 'react';
import { ConnectionProber, NetworkState } from '@/lib/sync/connectionProber';
import { OutboxRepository } from '@/lib/indexeddb/repositories/outboxRepository';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { SyncEngine } from '@/lib/sync/syncEngine';

export function ConnectionBadge() {
  const [networkState, setNetworkState] = useState<NetworkState>('ONLINE');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = ConnectionProber.subscribe((state) => {
      setNetworkState(state);
      updateCount();
    });

    const interval = setInterval(updateCount, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updateCount = async () => {
    try {
      const count = await OutboxRepository.getPendingCount();
      setPendingCount(count);
    } catch {
      // Ignorar errores al leer IndexedDB
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await SyncEngine.triggerSync();
    await updateCount();
    setIsSyncing(false);
  };

  return (
    <div className="flex items-center space-x-3 bg-mining-surface/90 border border-mining-border px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
      <div className="flex items-center space-x-1.5">
        {networkState === 'ONLINE' ? (
          <>
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">Conectado</span>
          </>
        ) : networkState === 'OFFLINE' ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400">Sin Conexión</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400">Conexión Limitada</span>
          </>
        )}
      </div>

      <span className="text-slate-400">•</span>

      <span className="text-slate-200">
        {pendingCount > 0 ? (
          <span className="text-mining-primary font-bold">{pendingCount} pendientes</span>
        ) : (
          'Todo sincronizado'
        )}
      </span>

      {pendingCount > 0 && networkState === 'ONLINE' && (
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="ml-1 text-slate-300 hover:text-white p-1 rounded-full hover:bg-mining-border transition-colors"
          title="Sincronizar ahora"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-mining-primary' : ''}`} />
        </button>
      )}
    </div>
  );
}
