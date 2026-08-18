import { ProcedureStatus, RoleCode } from '@/types/domain';

export interface TransitionRule {
  from: ProcedureStatus;
  to: ProcedureStatus;
  allowedRoles: RoleCode[];
  requiresComment?: boolean;
}

export const STATE_TRANSITIONS: TransitionRule[] = [
  { from: 'draft', to: 'in_progress', allowedRoles: ['operator'] },
  { from: 'draft', to: 'pending_sync', allowedRoles: ['operator'] },
  { from: 'in_progress', to: 'pending_sync', allowedRoles: ['operator'] },
  { from: 'pending_sync', to: 'submitted', allowedRoles: ['operator'] },
  { from: 'submitted', to: 'under_review', allowedRoles: ['supervisor', 'admin'] },
  { from: 'under_review', to: 'changes_requested', allowedRoles: ['supervisor', 'admin'], requiresComment: true },
  { from: 'under_review', to: 'approved', allowedRoles: ['supervisor', 'admin'] },
  { from: 'changes_requested', to: 'in_progress', allowedRoles: ['operator'] },
  { from: 'approved', to: 'closed', allowedRoles: ['supervisor', 'admin'] },
  { from: 'draft', to: 'cancelled', allowedRoles: ['operator', 'supervisor', 'admin'], requiresComment: true },
  { from: 'in_progress', to: 'cancelled', allowedRoles: ['operator', 'supervisor', 'admin'], requiresComment: true },
];

export class ProcedureStateMachine {
  // Verificar si una transición de estado es válida para un conjunto de roles
  static canTransition(
    from: ProcedureStatus,
    to: ProcedureStatus,
    userRoles: RoleCode[]
  ): { allowed: boolean; reason?: string } {
    if (from === 'closed') {
      return { allowed: false, reason: 'Un procedimiento cerrado no se puede editar ni modificar' };
    }

    const rule = STATE_TRANSITIONS.find((t) => t.from === from && t.to === to);
    if (!rule) {
      return { allowed: false, reason: `Transición de ${from} a ${to} no está permitida` };
    }

    const hasRole = rule.allowedRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return { allowed: false, reason: `Su rol no posee permisos para esta transición` };
    }

    return { allowed: true };
  }

  // Obtener siguientes estados válidos desde el estado actual
  static getNextValidStates(from: ProcedureStatus, userRoles: RoleCode[]): ProcedureStatus[] {
    if (from === 'closed') return [];

    return STATE_TRANSITIONS
      .filter((t) => t.from === from && t.allowedRoles.some((r) => userRoles.includes(r)))
      .map((t) => t.to);
  }
}
