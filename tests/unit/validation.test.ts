import { describe, it, expect } from 'vitest';
import { loginSchema, measurementSchema } from '../../src/lib/validation/schemas';

describe('Zod Validation Schemas', () => {
  it('debe validar un correo y contraseña válidos', () => {
    const res = loginSchema.safeParse({ email: 'operador@zaldivar.cl', password: '123456' });
    expect(res.success).toBe(true);
  });

  it('debe rechazar un correo inválido', () => {
    const res = loginSchema.safeParse({ email: 'correo-invalido', password: '123' });
    expect(res.success).toBe(false);
  });

  it('debe validar una medición técnica correctamente', () => {
    const res = measurementSchema.safeParse({
      measurementType: 'wob',
      value: 45.5,
      unit: 'k-lbs',
      sequence: 1,
    });
    expect(res.success).toBe(true);
  });
});
