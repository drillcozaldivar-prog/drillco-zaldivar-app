import { db } from '../db';
import { OutboxOperation, OutboxStatus } from '@/types/domain';

export class OutboxRepository {
  // Agregar una nueva operación a la cola Outbox
  static async addOperation(
    op: Omit<OutboxOperation, 'operationId' | 'createdAt' | 'updatedAt' | 'attempts' | 'status'>
  ): Promise<OutboxOperation> {
    const now = new Date().toISOString();
    const newOperation: OutboxOperation = {
      ...op,
      operationId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      status: 'pending',
    };

    await db.outbox.add(newOperation);
    return newOperation;
  }

  // Obtener operaciones pendientes ordenadas por prioridad y fecha
  static async getPendingOperations(limit: number = 20): Promise<OutboxOperation[]> {
    return await db.outbox
      .where('status')
      .equals('pending')
      .or('status')
      .equals('retry')
      .sortBy('createdAt')
      .then((ops) => ops.slice(0, limit));
  }

  // Actualizar estado de una operación outbox
  static async updateStatus(
    operationId: string,
    status: OutboxStatus,
    error?: { code?: string; message?: string },
    nextRetryAt?: string
  ): Promise<void> {
    const op = await db.outbox.get(operationId);
    if (!op) return;

    const updates: Partial<OutboxOperation> = {
      status,
      updatedAt: new Date().toISOString(),
      attempts: op.attempts + 1,
    };

    if (error) {
      updates.errorCode = error.code;
      updates.errorMessage = error.message;
    }

    if (nextRetryAt) {
      updates.nextRetryAt = nextRetryAt;
    }

    await db.outbox.update(operationId, updates);
  }

  // Eliminar operación completada
  static async removeOperation(operationId: string): Promise<void> {
    await db.outbox.delete(operationId);
  }

  // Obtener conteo de operaciones pendientes
  static async getPendingCount(): Promise<number> {
    return await db.outbox.where('status').equals('pending').or('status').equals('retry').count();
  }
}
