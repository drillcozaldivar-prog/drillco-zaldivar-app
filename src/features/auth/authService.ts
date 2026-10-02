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

// Cuentas Administrador Principales Iniciales (ÚNICAS VÁLIDAS: admin1drillco y admin2drillco)
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

          // Remover nombres antiguos de la lista
          mapped = mapped.filter((u) => u.username !== 'admin1' && u.username !== 'admin2');

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

        // Remover cuentas antiguas obsoletas (admin1 y admin2)
        localList = localList.filter((u) => u.username !== 'admin1' && u.username !== 'admin2');
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

  // Iniciar sesión con validación offline & online (Rechaza explícitamente admin1 o admin2 antiguos)
  static async login(usernameInput: string, passwordInput: string): Promise<UserProfile> {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // Rechazar explícitamente nombres antiguos
    if (cleanUser === 'admin1' || cleanUser === 'admin2') {
      throw new Error("El nombre de usuario ha cambiado. Por favor utilice 'admin1drillco' o 'admin2drillco'.");
    }

    const users = await this.getUsers();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    // Permitir ingreso ÚNICAMENTE de admin1drillco y admin2drillco
    const isAdminAccount =
      (cleanUser === 'admin1drillco' && cleanPass === 'drillco2026') ||
      (cleanUser === 'admin2drillco' && cleanPass === 'drillco1387');

    if (!foundUser && !isAdminAccount) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const effectiveRole = isAdminAccount
      ? 'admin'
      : foundUser?.role || (cleanUser.includes('admin') ? 'admin' : 'operator');

    const roles: RoleCode[] = effectiveRole === 'admin' ? ['admin', 'supervisor', 'operator'] : ['operator'];
    const userId = foundUser?.id || `usr-${cleanUser}`;
    const fullName =
      foundUser?.fullName ||
      (cleanUser === 'admin1drillco'
        ? 'Administrador 1'
        : cleanUser === 'admin2drillco'
        ? 'Administrador 2'
        : cleanUser);

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

  // Obtener usuario actualmente autenticado (Expulsa inmediatamente logins de admin1/admin2 antiguos)
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      const currentUsernameState = await db.appState.get('currentUsername');

      if (!currentUserIdState?.value) return null;

      const cached = await db.cachedUserProfile.get(currentUserIdState.value);
      if (!cached || !cached.profile) return null;

      let profile: UserProfile = cached.profile;
      const username = (currentUsernameState?.value || profile.email?.split('@')[0] || '').toLowerCase();

      // SI LA SESIÓN TIENE EL USUARIO ANTIGUO 'admin1' O 'admin2', CERRAR SESIÓN FORZADA E INVALIDAR
      if (username === 'admin1' || username === 'admin2') {
        console.warn(`[AuthService] Sesión obsoleta detectada (${username}). Cerrando sesión de inmediato.`);
        await this.logout();
        return null;
      }

      // Garantizar que cuentas admin principales siempre posean 'admin' en sus roles
      const isSystemAdmin = username === 'admin1drillco' || username === 'admin2drillco' || username.includes('admin');
      if (isSystemAdmin || profile.roles?.some((r: string) => String(r).toLowerCase() === 'admin')) {
        if (!profile.roles.includes('admin')) {
          profile.roles = ['admin', 'supervisor', 'operator'];
          await db.cachedUserProfile.put({ userId: currentUserIdState.value, profile });
        }
      }

      return profile;
    } catch (e) {
      console.error('[AuthService] Error recuperando usuario:', e);
    }

    return null;
  }

  // Verificación activa en la nube cuando hay conexión: si la cuenta no existe o es obsoleta, forzar LOGOUT
  static async verifyAccountOnline(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return true; // En modo OFFLINE se permite operar solo si el usuario no es admin1/admin2 antiguo
    }

    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      const currentUsernameState = await db.appState.get('currentUsername');

      if (!currentUserIdState?.value) return false;

      const currentUsername = (currentUsernameState?.value || '').toLowerCase();

      // Cuentas antiguas 'admin1' y 'admin2' -> FORZAR LOGOUT INMEDIATO
      if (currentUsername === 'admin1' || currentUsername === 'admin2') {
        console.warn(`[AuthService] Cuenta obsoleta "${currentUsername}". Ejecutando logout forzado.`);
        await this.logout();
        return false;
      }

      // Cuentas del sistema protegidas válidas
      if (currentUsername === 'admin1drillco' || currentUsername === 'admin2drillco') {
        return true;
      }

      // Consultar en Supabase Nube si la cuenta sigue existiendo
      const { data, error } = await supabase
        .from('app_users')
        .select('id, username')
        .or(`id.eq.${currentUserIdState.value},username.eq.${currentUsername}`)
        .limit(1);

      if (!error && data && data.length === 0) {
        console.warn(`[AuthService] La cuenta "${currentUsername}" ya no existe en la nube. Ejecutando logout forzado.`);
        await this.logout();
        return false;
      }
    } catch {
      // Si ocurre error de red o timeout, mantiene la sesión activa (Regla de Modo Offline)
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

    if (cleanUsername === 'admin1' || cleanUsername === 'admin2') {
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

  // Cerrar sesión
  static async logout(): Promise<void> {
    try {
      await db.appState.delete('currentUserId');
      await db.appState.delete('currentUsername');
    } catch (e) {
      console.error('[AuthService] Error cerrando sesión:', e);
    }
  }
}
