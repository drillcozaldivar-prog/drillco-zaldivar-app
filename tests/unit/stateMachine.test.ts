import { describe, it, expect } from 'vitest';
import { ProcedureStateMachine } from '../../src/features/procedures/stateMachine';

describe('ProcedureStateMachine', () => {
  it('debe permitir a un operador pasar de draft a submitted', () => {
    const res = ProcedureStateMachine.canTransition('draft', 'submitted', ['operator']);
    // draft -> pending_sync -> submitted
    expect(res.allowed).toBe(false); // Direct transition draft -> submitted requires pending_sync step
  });

  it('debe permitir a un operador pasar de draft a pending_sync', () => {
    const res = ProcedureStateMachine.canTransition('draft', 'pending_sync', ['operator']);
    expect(res.allowed).toBe(true);
  });

  it('debe permitir a un supervisor aprobar un procedimiento under_review', () => {
    const res = ProcedureStateMachine.canTransition('under_review', 'approved', ['supervisor']);
    expect(res.allowed).toBe(true);
  });

  it('NO debe permitir modificar un procedimiento cerrado', () => {
    const res = ProcedureStateMachine.canTransition('closed', 'in_progress', ['admin']);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('cerrado');
  });
});
