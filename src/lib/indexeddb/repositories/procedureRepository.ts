import { db } from '../db';
import { LocalProcedure, LocalMeasurement, LocalAttachment } from '@/types/domain';
import { ProcedureFormData } from '@/lib/validation/schemas';

export class ProcedureRepository {
  // Crear nuevo procedimiento en IndexedDB
  static async createProcedure(
    formData: ProcedureFormData,
    userId: string,
    deviceId: string
  ): Promise<LocalProcedure> {
    const localId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newProcedure: LocalProcedure = {
      localId,
      organizationId: formData.organizationId,
      siteId: formData.siteId,
      areaId: formData.areaId,
      procedureTypeId: formData.procedureTypeId,
      templateVersionId: formData.templateVersionId,
      drillRigId: formData.drillRigId,
      drillHoleId: formData.drillHoleId,
      shiftId: formData.shiftId,
      operatorId: formData.operatorId,
      status: 'draft',
      startedAt: formData.startedAt || now,
      createdOffline: true,
      deviceId,
      latitude: formData.latitude,
      longitude: formData.longitude,
      notes: formData.notes,
      version: 1,
      syncStatus: 'local_draft',
      syncAttempts: 0,
      createdAtLocal: now,
      updatedAtLocal: now,
      userId,
    };

    await db.localProcedures.add(newProcedure);

    // Guardar mediciones iniciales si existen
    if (formData.measurements && formData.measurements.length > 0) {
      const measurementsToSave: LocalMeasurement[] = formData.measurements.map((m) => ({
        localId: crypto.randomUUID(),
        procedureLocalId: localId,
        measurementType: m.measurementType as any,
        value: m.value,
        unit: m.unit,
        sequence: m.sequence || 1,
        measuredAt: now,
        notes: m.notes,
        syncStatus: 'local_draft',
      }));

      await db.localMeasurements.bulkAdd(measurementsToSave);
    }

    return newProcedure;
  }

  // Obtener procedimiento por su localId
  static async getByLocalId(localId: string): Promise<LocalProcedure | undefined> {
    return await db.localProcedures.get(localId);
  }

  // Obtener todos los procedimientos guardados en la BD local
  static async getAllLocal(): Promise<LocalProcedure[]> {
    return await db.localProcedures.orderBy('updatedAtLocal').reverse().toArray();
  }

  // Actualizar estado de sincronización local
  static async updateSyncStatus(
    localId: string,
    syncStatus: LocalProcedure['syncStatus'],
    serverId?: string,
    error?: string
  ): Promise<void> {
    const updates: Partial<LocalProcedure> = {
      syncStatus,
      updatedAtLocal: new Date().toISOString(),
    };

    if (serverId) {
      updates.serverId = serverId;
    }

    if (error) {
      updates.lastSyncError = error;
      updates.syncAttempts = (await this.getByLocalId(localId))?.syncAttempts! + 1 || 1;
    }

    await db.localProcedures.update(localId, updates);
  }

  // Guardar mediciones asociadas a un procedimiento
  static async addMeasurement(measurement: Omit<LocalMeasurement, 'localId' | 'syncStatus'>): Promise<LocalMeasurement> {
    const newMeasurement: LocalMeasurement = {
      ...measurement,
      localId: crypto.randomUUID(),
      syncStatus: 'local_draft',
    };
    await db.localMeasurements.add(newMeasurement);
    return newMeasurement;
  }

  // Obtener mediciones asociadas
  static async getMeasurementsForProcedure(procedureLocalId: string): Promise<LocalMeasurement[]> {
    return await db.localMeasurements.where('procedureLocalId').equals(procedureLocalId).toArray();
  }
}
