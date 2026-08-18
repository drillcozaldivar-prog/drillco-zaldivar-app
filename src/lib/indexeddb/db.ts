import Dexie, { Table } from 'dexie';
import {
  LocalProcedure,
  LocalMeasurement,
  LocalAttachment,
  OutboxOperation,
  UserProfile,
  ConflictItem,
} from '@/types/domain';

export class ZaldivarDrillingDB extends Dexie {
  localProcedures!: Table<LocalProcedure, string>;
  localAnswers!: Table<{ id?: string; procedureLocalId: string; fieldId: string; value: any }, string>;
  localMeasurements!: Table<LocalMeasurement, string>;
  localAttachments!: Table<LocalAttachment, string>;
  outbox!: Table<OutboxOperation, string>;
  syncHistory!: Table<{ id: string; operationId: string; status: string; timestamp: string; details?: string }, string>;
  cachedCatalogs!: Table<{ code: string; name: string; items: any[]; version: number }, string>;
  cachedTemplates!: Table<{ id: string; code: string; version: number; schema: any }, string>;
  cachedUserProfile!: Table<{ userId: string; profile: UserProfile }, string>;
  cachedPermissions!: Table<{ userId: string; permissions: string[] }, string>;
  appState!: Table<{ key: string; value: any }, string>;
  conflicts!: Table<ConflictItem, string>;
  failedOperations!: Table<{ operationId: string; errorCode: string; errorMessage: string }, string>;

  constructor() {
    super('ZaldivarDrillingDB');

    // Esquema de base de datos local versionada
    this.version(1).stores({
      localProcedures: 'localId, serverId, siteId, drillRigId, status, syncStatus, updatedAtLocal',
      localAnswers: 'id, procedureLocalId, fieldId',
      localMeasurements: 'localId, procedureLocalId, measurementType, syncStatus',
      localAttachments: 'localId, procedureLocalId, syncStatus',
      outbox: 'operationId, entityLocalId, operationType, status, priority, createdAt, nextRetryAt',
      syncHistory: 'id, operationId, status, timestamp',
      cachedCatalogs: 'code, version',
      cachedTemplates: 'id, code, version',
      cachedUserProfile: 'userId',
      cachedPermissions: 'userId',
      appState: 'key',
      conflicts: 'id, entityLocalId, status',
      failedOperations: 'operationId, errorCode',
    });
  }
}

// Instancia singleton accesible globalmente en el cliente browser
export const db = new ZaldivarDrillingDB();
