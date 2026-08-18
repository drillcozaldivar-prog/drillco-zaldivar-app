// Tipos de Dominio para la Aplicación de Control de Perforación Minera

export type ProcedureStatus =
  | 'draft'
  | 'in_progress'
  | 'pending_sync'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'closed'
  | 'cancelled'
  | 'conflict';

export type LocalSyncStatus =
  | 'local_draft'
  | 'pending_sync'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'sync_error';

export type RoleCode = 'operator' | 'supervisor' | 'admin' | 'auditor';

export type OperationType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE_LOGICAL'
  | 'UPLOAD_ATTACHMENT'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'CLOSE'
  | 'CANCEL';

export type OutboxStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'retry'
  | 'failed'
  | 'blocked'
  | 'conflict';

export type MeasurementType =
  | 'pressure'
  | 'flow_rate'
  | 'temperature'
  | 'rpm'
  | 'wob'
  | 'rop'
  | 'depth'
  | 'drilled_meters'
  | 'horometer'
  | 'pulldown_pressure'
  | 'flushing_pressure';

export interface LocalProcedure {
  localId: string;
  serverId?: string;
  organizationId: string;
  siteId: string;
  areaId: string;
  procedureTypeId: string;
  templateVersionId: string;
  drillRigId: string;
  drillHoleId?: string;
  shiftId: string;
  operatorId: string;
  status: ProcedureStatus;
  startedAt: string;
  completedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  closedAt?: string;
  createdOffline: boolean;
  deviceId: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  notes?: string;
  version: number; // Concurrencia optimista
  
  // Metadatos de sincronización IndexedDB
  syncStatus: LocalSyncStatus;
  syncAttempts: number;
  lastSyncAttempt?: string;
  lastSyncError?: string;
  createdAtLocal: string;
  updatedAtLocal: string;
  userId: string;
}

export interface LocalMeasurement {
  localId: string;
  procedureLocalId: string;
  measurementType: MeasurementType;
  value: number;
  unit: string;
  sequence: number;
  measuredAt: string;
  notes?: string;
  syncStatus: LocalSyncStatus;
}

export interface LocalAttachment {
  localId: string;
  procedureLocalId: string;
  serverId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
  attachmentType: 'photo' | 'signature' | 'document';
  blob?: Blob; // Contenido en IndexedDB
  storagePath?: string;
  syncStatus: LocalSyncStatus;
  uploadProgress: number;
  createdAt: string;
}

export interface OutboxOperation {
  operationId: string;
  entityType: 'procedure' | 'measurement' | 'attachment' | 'approval';
  entityLocalId: string;
  entityServerId?: string;
  operationType: OperationType;
  payload: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  nextRetryAt?: string;
  status: OutboxStatus;
  priority: number;
  dependencyIds?: string[];
  userId: string;
  deviceId: string;
  localVersion: number;
  expectedServerVersion: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface UserProfile {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: RoleCode[];
  siteIds: string[];
}

export interface ConflictItem {
  id: string;
  entityLocalId: string;
  procedureId: string;
  operationId: string;
  conflictType: string;
  localPayload: Record<string, any>;
  serverPayload: Record<string, any>;
  status: 'pending' | 'resolved';
  createdAt: string;
}
