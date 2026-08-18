import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/indexeddb/db';
import { UserProfile, RoleCode } from '@/types/domain';

export class AuthService {
  // Iniciar sesión (para entorno local/demo responde en 0ms y guarda en IndexedDB)
  static async login(email: string, password: string): Promise<UserProfile> {
    const demoRoles: RoleCode[] = email.includes('admin')
      ? ['admin', 'supervisor', 'operator']
      : email.includes('supervisor')
      ? ['supervisor', 'operator']
      : ['operator'];

    const demoUserId = email.includes('admin')
      ? '33333333-3333-3333-3333-333333333333'
      : email.includes('supervisor')
      ? '22222222-2222-2222-2222-222222222222'
      : '11111111-1111-1111-1111-111111111111';

    const demoProfile: UserProfile = {
      id: demoUserId,
      organizationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      firstName: email.includes('supervisor') ? 'Carlos' : email.includes('admin') ? 'Admin' : 'Juan',
      lastName: email.includes('supervisor') ? 'Mendoza' : email.includes('admin') ? 'Zaldívar' : 'Pérez',
      email,
      roles: demoRoles,
      siteIds: ['b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
    };

    try {
      await db.cachedUserProfile.put({ userId: demoUserId, profile: demoProfile });
      await db.appState.put({ key: 'currentUserId', value: demoUserId });
    } catch (e) {
      console.error('[AuthService] Error en IndexedDB:', e);
    }

    return demoProfile;
  }

  // Obtener usuario actualmente autenticado (desde IndexedDB local)
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      if (currentUserIdState?.value) {
        const cached = await db.cachedUserProfile.get(currentUserIdState.value);
        return cached ? cached.profile : null;
      }
    } catch (e) {
      console.error('[AuthService] Error recuperando usuario:', e);
    }

    return null;
  }

  // Cerrar sesión
  static async logout(): Promise<void> {
    try {
      await db.appState.delete('currentUserId');
    } catch (e) {
      console.error('[AuthService] Error cerrando sesión:', e);
    }
  }
}
