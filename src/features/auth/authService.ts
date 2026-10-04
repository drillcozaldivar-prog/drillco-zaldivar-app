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
  // Purga completa de toda la información almacenada en memoria local y almacenamiento del navegador
  static async purgeAllStoredData(): Promise<void> {
    try {
      await db.cachedUserProfile.clear();
      await db.cachedPermissions.clear();
      await db.appState.clear();
    } catch (e) {
      console.error('[AuthService] Error purgando IndexedDB:', e);
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (e) {
      console.error('[AuthService] Error purgando Web Storage:', e);
    }
  }

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

          // Purgar cualquier usuario obsoleto
          mapped = mapped.filter(
            (u) =>
              u.username.toLowerCase() !== 'admin1' &&
              u.username.toLowerCase() !== 'admin2' &&
              u.username.toLowerCase() !== 'admin'
          );

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

  // Iniciar sesión guardando credenciales activas verificables
  static async login(usernameInput: string, passwordInput: string): Promise<UserProfile> {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (cleanUser === 'admin1' || cleanUser === 'admin2' || cleanUser === 'admin') {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const users = await this.getUsers();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    const isInitialAdmin1 = cleanUser === 'admin1drillco' && cleanPass === 'drillco2026';
    const isInitialAdmin2 = cleanUser === 'admin2drillco' && cleanPass === 'drillco1387';

    if (!foundUser && !isInitialAdmin1 && !isInitialAdmin2) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const effectiveRole = (isInitialAdmin1 || isInitialAdmin2)
      ? 'admin'
      : foundUser?.role || 'operator';

    const roles: RoleCode[] = effectiveRole === 'admin' ? ['admin', 'supervisor', 'operator'] : ['operator'];
    const userId = isInitialAdmin1
      ? 'usr-admin-1'
      : isInitialAdmin2
      ? 'usr-admin-2'
      : foundUser?.id || `usr-${cleanUser}`;

    const fullName = isInitialAdmin1
      ? 'Administrador 1'
      : isInitialAdmin2
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
      await db.appState.put({ key: 'sessionUser', value: cleanUser });
      await db.appState.put({ key: 'sessionPassword', value: cleanPass });

      if (typeof window !== 'undefined') {
        localStorage.setItem('drillco_session_user', cleanUser);
        localStorage.setItem('drillco_session_pass', cleanPass);
      }
    } catch (e) {
      console.error('[AuthService] Error guardando sesión:', e);
    }

    return userProfile;
  }

  // Verificación estricta en CADA APERTURA de la app: si no coincide con una cuenta registrada, purga total y expulsión
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      let sessionUser = '';
      let sessionPass = '';

      // 1. Extraer usuario y contraseña guardados en IndexedDB o LocalStorage
      const storedUser = await db.appState.get('sessionUser');
      const storedPass = await db.appState.get('sessionPassword');

      if (storedUser?.value && storedPass?.value) {
        sessionUser = storedUser.value;
        sessionPass = storedPass.value;
      } else if (typeof window !== 'undefined') {
        sessionUser = localStorage.getItem('drillco_session_user') || '';
        sessionPass = localStorage.getItem('drillco_session_pass') || '';
      }

      // Si NO hay credenciales completas guardadas (sesiones antiguas obsoletas o datos residuales):
      if (!sessionUser || !sessionPass) {
        console.warn('[AuthService] No se encontraron credenciales de sesión activas. Purgando almacenamiento local...');
        await this.purgeAllStoredData();
        return null;
      }

      const cleanUser = sessionUser.trim().toLowerCase();
      const cleanPass = sessionPass.trim();

      // Rechazar de inmediato cualquier sesión antigua admin1/admin2/admin
      if (cleanUser === 'admin1' || cleanUser === 'admin2' || cleanUser === 'admin') {
        console.warn(`[AuthService] Sesión obsoleta detectada ("${cleanUser}"). Purgando información almacenada...`);
        await this.purgeAllStoredData();
        return null;
      }

      // 2. Comprobar contra las cuentas registradas
      const isInitialAdmin1 = cleanUser === 'admin1drillco' && cleanPass === 'drillco2026';
      const isInitialAdmin2 = cleanUser === 'admin2drillco' && cleanPass === 'drillco1387';

      let isValidAccount = isInitialAdmin1 || isInitialAdmin2;

      if (!isValidAccount) {
        const users = await this.getUsers();
        const matched = users.find(
          (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
        );
        if (matched) {
          isValidAccount = true;
        }
      }

      // SI NO COINCIDE CON NINGUNA CUENTA REGISTRADA: PURGA Y CIERRE TOTAL
      if (!isValidAccount) {
        console.warn(`[AuthService] Las credenciales no coinciden con ninguna cuenta registrada. Purgando y forzando logout.`);
        await this.purgeAllStoredData();
        return null;
      }

      // 3. Si coincide, cargar o reconstruir el perfil
      const currentUserIdState = await db.appState.get('currentUserId');
      const userId = currentUserIdState?.value || (isInitialAdmin1 ? 'usr-admin-1' : isInitialAdmin2 ? 'usr-admin-2' : `usr-${cleanUser}`);

      let profile: UserProfile | null = null;
      const cached = await db.cachedUserProfile.get(userId);

      if (cached && cached.profile) {
        profile = cached.profile;
      } else {
        const roles: RoleCode[] = (isInitialAdmin1 || isInitialAdmin2)
          ? ['admin', 'supervisor', 'operator']
          : ['operator'];

        profile = {
          id: userId,
          organizationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          firstName: isInitialAdmin1 ? 'Administrador 1' : isInitialAdmin2 ? 'Administrador 2' : cleanUser,
          lastName: '',
          email: `${cleanUser}@drillco.com`,
          roles,
          siteIds: ['b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
        };
        await db.cachedUserProfile.put({ userId, profile });
      }

      if (isInitialAdmin1 || isInitialAdmin2) {
        profile.roles = ['admin', 'supervisor', 'operator'];
        profile.email = `${cleanUser}@drillco.com`;
      }

      return profile;
    } catch (e) {
      console.error('[AuthService] Error durante la verificación de inicio:', e);
      await this.purgeAllStoredData();
      return null;
    }
  }

  // Verificación activa online: si la cuenta fue eliminada o modificada en Supabase, purgar y expulsar
  static async verifyAccountOnline(): Promise<boolean> {
    try {
      let sessionUser = '';
      let sessionPass = '';

      const storedUser = await db.appState.get('sessionUser');
      const storedPass = await db.appState.get('sessionPassword');

      if (storedUser?.value && storedPass?.value) {
        sessionUser = storedUser.value;
        sessionPass = storedPass.value;
      } else if (typeof window !== 'undefined') {
        sessionUser = localStorage.getItem('drillco_session_user') || '';
        sessionPass = localStorage.getItem('drillco_session_pass') || '';
      }

      if (!sessionUser || !sessionPass) {
        await this.purgeAllStoredData();
        return false;
      }

      const cleanUser = sessionUser.trim().toLowerCase();
      const cleanPass = sessionPass.trim();

      if (cleanUser === 'admin1' || cleanUser === 'admin2' || cleanUser === 'admin') {
        await this.purgeAllStoredData();
        return false;
      }

      // Validar administradores del sistema
      if (cleanUser === 'admin1drillco' && cleanPass === 'drillco2026') return true;
      if (cleanUser === 'admin2drillco' && cleanPass === 'drillco1387') return true;

      // Si hay internet, verificar en tiempo real en Supabase app_users
      if (typeof window !== 'undefined' && navigator.onLine) {
        const { data, error } = await supabase
          .from('app_users')
          .select('id, username, password')
          .eq('username', cleanUser)
          .eq('password', cleanPass)
          .limit(1);

        if (!error && (!data || data.length === 0)) {
          console.warn(`[AuthService] Verificación online fallida para "${cleanUser}". Purgando información local...`);
          await this.purgeAllStoredData();
          return false;
        }
      }
    } catch {
      // Si offline, mantiene sesión si las credenciales coinciden localmente
    }

    return true;
  }

  // Crear Nuevo Usuario
  static async createUser(userData: {
    username: string;
    password: string;
    fullName: string;
    role: 'admin' | 'operator';
  }): Promise<RegisteredUser> {
    const users = await this.getUsers();
    const cleanUsername = userData.username.trim().toLowerCase();

    if (cleanUsername === 'admin1' || cleanUsername === 'admin2' || cleanUsername === 'admin') {
      throw new Error('El nombre de usuario no se encuentra disponible.');
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

  // Eliminar Usuario
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
    await this.purgeAllStoredData();
  }
}
