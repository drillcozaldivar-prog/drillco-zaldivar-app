import { OutboxRepository } from '../indexeddb/repositories/outboxRepository';
import { ProcedureRepository } from '../indexeddb/repositories/procedureRepository';
import { ConnectionProber } from './connectionProber';
import { OutboxOperation } from '@/types/domain';

export class SyncEngine {
  private static isSyncing: boolean = false;

  // Iniciar proceso de sincronización por lotes
  static async triggerSync(): Promise<{ processed: number; errors: number }> {
    if (this.isSyncing) {
      return { processed: 0, errors: 0 };
    }

    const networkStatus = await ConnectionProber.checkConnection();
    if (networkStatus !== 'ONLINE') {
      return { processed: 0, errors: 0 };
    }

    this.isSyncing = true;
    let processedCount = 0;
    let errorCount = 0;

    try {
      const pendingOps = await OutboxRepository.getPendingOperations(10);
      if (pendingOps.length === 0) {
        this.isSyncing = false;
        return { processed: 0, errors: 0 };
      }

      // Marcar operaciones como en procesamiento
      for (const op of pendingOps) {
        await OutboxRepository.updateStatus(op.operationId, 'processing');
      }

      // Enviar lote de operaciones al endpoint API /api/sync
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: pendingOps }),
      });

      if (!response.ok) {
        throw new Error(`Error en servidor durante sincronización: ${response.statusText}`);
      }

      const syncResults: Array<{
        operationId: string;
        success: boolean;
        serverId?: string;
        serverVersion?: number;
        errorCode?: string;
        errorMessage?: string;
      }> = await response.json();

      for (const res of syncResults) {
        const localOp = pendingOps.find((op) => op.operationId === res.operationId);
        if (!localOp) continue;

        if (res.success) {
          processedCount++;
          // Marcar operación como completada y actualizar IndexedDB local
          await OutboxRepository.removeOperation(res.operationId);
          await ProcedureRepository.updateSyncStatus(
            localOp.entityLocalId,
            'synced',
            res.serverId
          );
        } else {
          errorCount++;
          if (res.errorCode === 'VERSION_CONFLICT') {
            await OutboxRepository.updateStatus(res.operationId, 'conflict', {
              code: res.errorCode,
              message: res.errorMessage,
            });
            await ProcedureRepository.updateSyncStatus(
              localOp.entityLocalId,
              'conflict',
              undefined,
              res.errorMessage
            );
          } else {
            // Reintento con Backoff Exponencial (2^intentos * 5 segundos)
            const nextRetrySeconds = Math.pow(2, localOp.attempts + 1) * 5;
            const nextRetryAt = new Date(Date.now() + nextRetrySeconds * 1000).toISOString();

            await OutboxRepository.updateStatus(
              res.operationId,
              localOp.attempts >= 5 ? 'failed' : 'retry',
              { code: res.errorCode, message: res.errorMessage },
              nextRetryAt
            );
            await ProcedureRepository.updateSyncStatus(
              localOp.entityLocalId,
              'sync_error',
              undefined,
              res.errorMessage
            );
          }
        }
      }
    } catch (err: any) {
      console.error('[SyncEngine] Error fatal en ciclo de sincronización:', err);
    } finally {
      this.isSyncing = false;
    }

    return { processed: processedCount, errors: errorCount };
  }
}
