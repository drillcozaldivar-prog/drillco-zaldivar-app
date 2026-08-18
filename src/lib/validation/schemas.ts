import { z } from 'zod';

// Esquema para validación de datos de inicio de sesión
export const loginSchema = z.object({
  email: z.string().email({ message: 'Ingrese un correo electrónico válido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Esquema para validación de mediciones técnicas
export const measurementSchema = z.object({
  measurementType: z.enum([
    'pressure',
    'flow_rate',
    'temperature',
    'rpm',
    'wob',
    'rop',
    'depth',
    'drilled_meters',
    'horometer',
    'pulldown_pressure',
    'flushing_pressure'
  ]),
  value: z.number({ required_error: 'El valor es obligatorio' }),
  unit: z.string().min(1, { message: 'La unidad es requerida' }),
  sequence: z.number().int().default(1),
  notes: z.string().optional(),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;

// Esquema principal de creación de procedimiento de perforación
export const procedureFormSchema = z.object({
  organizationId: z.string().uuid({ message: 'Organización inválida' }),
  siteId: z.string().uuid({ message: 'Seleccione una faena' }),
  areaId: z.string().uuid({ message: 'Seleccione un área' }),
  procedureTypeId: z.string().uuid({ message: 'Seleccione tipo de procedimiento' }),
  templateVersionId: z.string().uuid({ message: 'Plantilla inválida' }),
  drillRigId: z.string().uuid({ message: 'Seleccione un equipo de perforación' }),
  drillHoleId: z.string().uuid().optional(),
  shiftId: z.string().uuid({ message: 'Seleccione el turno' }),
  operatorId: z.string().uuid({ message: 'Seleccione el operador' }),
  startedAt: z.string({ required_error: 'Seleccione la fecha y hora de inicio' }),
  notes: z.string().max(1000, 'Las notas no pueden superar los 1000 caracteres').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  measurements: z.array(measurementSchema).optional().default([]),
});

export type ProcedureFormData = z.infer<typeof procedureFormSchema>;

// Esquema de validación de payload Outbox
export const outboxOperationSchema = z.object({
  operationId: z.string().uuid(),
  entityType: z.enum(['procedure', 'measurement', 'attachment', 'approval']),
  entityLocalId: z.string().uuid(),
  operationType: z.enum([
    'CREATE',
    'UPDATE',
    'DELETE_LOGICAL',
    'UPLOAD_ATTACHMENT',
    'SUBMIT',
    'APPROVE',
    'REJECT',
    'CLOSE',
    'CANCEL'
  ]),
  payload: z.record(z.any()),
  createdAt: z.string(),
  userId: z.string().uuid(),
  deviceId: z.string(),
  expectedServerVersion: z.number().int().default(1),
});
