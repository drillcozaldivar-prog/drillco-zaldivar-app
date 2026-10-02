import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/indexeddb/db';
import { UserProfile, RoleCode } from '@/types/domain';

export interface RegisteredUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'operator';
  createdAt: string;
}

// Cuentas Administrador Principales Iniciales (ÚNICAS VÁLIDAS EN TODO EL SISTEMA: admin1drillco y admin2drillco)
const INITIAL_USERS: RegisteredUser[] = [
  {
    id: 'usr-admin-1',
    username: 'admin1drillco',
    password: 'drillco2026',
    fullName: 'Administrador 1',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-admin-2',
    username: 'admin2drillco',
    password: 'drillco1387',
    fullName: 'Administrador 2',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

export class AuthService {
  // Obtener lista completa de usuarios (Supabase + IndexedDB)
  static async getUsers(): Promise<RegisteredUser[]> {
    try {
      if (typeof window !== 'undefined' && navigator.onLine) {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          let mapped: RegisteredUser[] = data.map((d: any) => ({
            id: d.id,
            username: d.username,
            password: d.password,
            fullName: d.full_name,
            role: d.role as 'admin' | 'operator',
            createdAt: d.created_at,
          }));

          // Purgar estrictamente cualquier nombre antiguo (admin1, admin2, admin)
          mapped = mapped.filter(
            (u) =>
              u.username.toLowerCase() !== 'admin1' &&
              u.username.toLowerCase() !== 'admin2' &&
              u.username.toLowerCase() !== 'admin'
          );

          // Garantizar que las cuentas admin1drillco y admin2drillco estén incluidas
          INITIAL_USERS.forEach((adminUser) => {
            if (!mapped.some((u) => u.username.toLowerCase() === adminUser.username.toLowerCase())) {
              mapped.unshift(adminUser);
            }
          });

          await db.appState.put({ key: 'registered_users_list', value: mapped });
          return mapped;
        }
      }
    } catch {
      console.warn('[AuthService] Servidor offline, leyendo usuarios locales.');
    }

    try {
      const saved = await db.appState.get('registered_users_list');
      if (saved?.value && Array.isArray(saved.value) && saved.value.length > 0) {
        let localList: RegisteredUser[] = saved.value;

        // Purgar cuentas obsoletas (admin1, admin2, admin)
        localList = localList.filter(
          (u) =>
            u.username.toLowerCase() !== 'admin1' &&
            u.username.toLowerCase() !== 'admin2' &&
            u.username.toLowerCase() !== 'admin'
        );
        INITIAL_USERS.forEach((adminUser) => {
          if (!localList.some((u) => u.username.toLowerCase() === adminUser.username.toLowerCase())) {
            localList.unshift(adminUser);
          }
        });

        await db.appState.put({ key: 'registered_users_list', value: localList });
        return localList;
      }
    } catch {
      // Ignorar error IndexedDB
    }

    await db.appState.put({ key: 'registered_users_list', value: INITIAL_USERS });
    return INITIAL_USERS;
  }

  // Iniciar sesión (Rechaza explícitamente admin1/admin2/admin)
  static async login(usernameInput: string, passwordInput: string): Promise<UserProfile> {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // Rechazo estricto e inmediato de credenciales o nombres antiguos
    if (cleanUser === 'admin1' || cleanUser === 'admin2' || cleanUser === 'admin') {
      throw new Error("Su cuenta ha sido actualizada. Inicie sesión con 'admin1drillco' o 'admin2drillco'.");
    }

    const users = await this.getUsers();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    // ÚNICAS dos cuentas de sistema válidas
    const isAdminAccount =
      (cleanUser === 'admin1drillco' && cleanPass === 'drillco2026') ||
      (cleanUser === 'admin2drillco' && cleanPass === 'drillco1387');

    if (!foundUser && !isAdminAccount) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const effectiveRole = isAdminAccount
      ? 'admin'
      : foundUser?.role || 'operator';

    const roles: RoleCode[] = effectiveRole === 'admin' ? ['admin', 'supervisor', 'operator'] : ['operator'];
    const userId = cleanUser === 'admin1drillco' ? 'usr-admin-1' : cleanUser === 'admin2drillco' ? 'usr-admin-2' : foundUser?.id || `usr-${cleanUser}`;
    const fullName =
      cleanUser === 'admin1drillco'
        ? 'Administrador 1'
        : cleanUser === 'admin2drillco'
        ? 'Administrador 2'
        : foundUser?.fullName || cleanUser;

    const userProfile: UserProfile = {
      id: userId,
      organizationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      firstName: fullName.split(' ')[0] || cleanUser,
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      email: `${cleanUser}@drillco.com`,
      roles,
      siteIds: ['b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
    };

    try {
      await db.cachedUserProfile.put({ userId, profile: userProfile });
      await db.appState.put({ key: 'currentUserId', value: userId });
      await db.appState.put({ key: 'currentUsername', value: cleanUser });
    } catch (e) {
      console.error('[AuthService] Error en IndexedDB:', e);
    }

    return userProfile;
  }

  // Obtener usuario actualmente autenticado (PURGA E EXPULSA SESIONES ANTIGUAS DE INMEDIATO)
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      const currentUsernameState = await db.appState.get('currentUsername');

      if (!currentUserIdState?.value) return null;

      const cached = await db.cachedUserProfile.get(currentUserIdState.value);
      if (!cached || !cached.profile) return null;

      let profile: UserProfile = cached.profile;
      const username = (currentUsernameState?.value || profile.email?.split('@')[0] || '').toLowerCase();

      // SI EL USUARIO GUARDADO ES 'admin1', 'admin2', 'admin' O NO ES NI admin1drillco NI admin2drillco NI UN USUARIO REGISTRADO:
      const isValidAdmin = username === 'admin1drillco' || username === 'admin2drillco';
      const isObsoleteUser = username === 'admin1' || username === 'admin2' || username === 'admin';

      if (isObsoleteUser || (!isValidAdmin && profile.email?.includes('admin1@') || profile.email?.includes('admin2@'))) {
        console.warn(`[AuthService] DETECTADA SESIÓN OBSOLETA ("${username}"). EXPULSANDO Y PURGANDO AL LOGIN...`);
        await this.logout();
        return null;
      }

      // Si es cuenta admin válida, asegurar permisos admin
      if (isValidAdmin) {
        profile.roles = ['admin', 'supervisor', 'operator'];
        profile.email = `${username}@drillco.com`;
        await db.cachedUserProfile.put({ userId: currentUserIdState.value, profile });
      }

      return profile;
    } catch (e) {
      console.error('[AuthService] Error recuperando usuario:', e);
    }

    return null;
  }

  // Verificación activa en la nube: si no es admin1drillco ni admin2drillco ni existe en app_users -> PURGA
  static async verifyAccountOnline(): Promise<boolean> {
    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      const currentUsernameState = await db.appState.get('currentUsername');

      if (!currentUserIdState?.value) return false;

      const currentUsername = (currentUsernameState?.value || '').toLowerCase();

      // Cuentas antiguas 'admin1', 'admin2', 'admin' -> FORZAR LOGOUT E INVALIDAR DE INMEDIATO
      if (currentUsername === 'admin1' || currentUsername === 'admin2' || currentUsername === 'admin') {
        console.warn(`[AuthService] Verificación online: Cuenta obsoleta "${currentUsername}". Purgando sesión.`);
        await this.logout();
        return false;
      }

      // Cuentas principales autorizadas
      if (currentUsername === 'admin1drillco' || currentUsername === 'admin2drillco') {
        return true;
      }

      if (typeof window !== 'undefined' && navigator.onLine) {
        // Consultar en Supabase Nube si la cuenta existe en app_users
        const { data, error } = await supabase
          .from('app_users')
          .select('id, username')
          .or(`id.eq.${currentUserIdState.value},username.eq.${currentUsername}`)
          .limit(1);

        if (!error && data && data.length === 0) {
          console.warn(`[AuthService] La cuenta "${currentUsername}" fue revocado en la nube. Purgando sesión.`);
          await this.logout();
          return false;
        }
      }
    } catch {
      // Mantiene sesión si offline y usuario es válido
    }

    return true;
  }

  // Crear Nuevo Usuario (Solo para Administrador)
  static async createUser(userData: {
    username: string;
    password: string;
    fullName: string;
    role: 'admin' | 'operator';
  }): Promise<RegisteredUser> {
    const users = await this.getUsers();
    const cleanUsername = userData.username.trim().toLowerCase();

    if (cleanUsername === 'admin1' || cleanUsername === 'admin2' || cleanUsername === 'admin') {
      throw new Error("Los nombres 'admin1' y 'admin2' están obsoletos. Utilice 'admin1drillco' o 'admin2drillco'.");
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      throw new Error(`El nombre de usuario "${cleanUsername}" ya se encuentra registrado.`);
    }

    const newId = `usr-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newUser: RegisteredUser = {
      id: newId,
      username: cleanUsername,
      password: userData.password.trim(),
      fullName: userData.fullName.trim() || cleanUsername,
      role: userData.role,
      createdAt: nowIso,
    };

    const updatedUsers = [...users, newUser];
    await db.appState.put({ key: 'registered_users_list', value: updatedUsers });

    try {
      await supabase.from('app_users').insert([
        {
          id: newId,
          username: cleanUsername,
          password: userData.password.trim(),
          full_name: userData.fullName.trim() || cleanUsername,
          role: userData.role,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ]);
    } catch {
      console.warn('[Supabase] Guardado localmente en IndexedDB.');
    }

    return newUser;
  }

  // Eliminar Usuario (Solo para Administrador)
  static async deleteUser(userId: string): Promise<void> {
    const users = await this.getUsers();
    const updatedUsers = users.filter((u) => u.id !== userId);

    await db.appState.put({ key: 'registered_users_list', value: updatedUsers });

    try {
      await supabase.from('app_users').delete().eq('id', userId);
    } catch {
      // Ignorar error offline
    }
  }

  // Cerrar sesión y purgar caché de usuario local
  static async logout(): Promise<void> {
    try {
      await db.appState.delete('currentUserId');
      await db.appState.delete('currentUsername');
      await db.cachedUserProfile.clear();
    } catch (e) {
      console.error('[AuthService] Error cerrando sesión:', e);
    }
  }
}
