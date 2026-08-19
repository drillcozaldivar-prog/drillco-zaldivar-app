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

// Cuentas Administrador Principales Iniciales
const INITIAL_USERS: RegisteredUser[] = [
  {
    id: 'usr-admin-1',
    username: 'admin1',
    password: 'drillco2026',
    fullName: 'Administrador 1',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-admin-2',
    username: 'admin2',
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
          const mapped: RegisteredUser[] = data.map((d: any) => ({
            id: d.id,
            username: d.username,
            password: d.password,
            fullName: d.full_name,
            role: d.role as 'admin' | 'operator',
            createdAt: d.created_at,
          }));
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
        return saved.value;
      }
    } catch {
      // Ignorar error IndexedDB
    }

    await db.appState.put({ key: 'registered_users_list', value: INITIAL_USERS });
    return INITIAL_USERS;
  }

  // Iniciar sesión con validación offline & online
  static async login(usernameInput: string, passwordInput: string): Promise<UserProfile> {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    const users = await this.getUsers();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );

    // Permitir ingreso de admin1 y admin2 incluso si la lista aún se está sincronizando
    const isAdminAccount = cleanUser === 'admin1' && cleanPass === 'drillco2026' || cleanUser === 'admin2' && cleanPass === 'drillco1387';

    if (!foundUser && !isAdminAccount) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const effectiveRole = isAdminAccount ? 'admin' : foundUser?.role || (cleanUser.includes('admin') ? 'admin' : 'operator');
    const roles: RoleCode[] = effectiveRole === 'admin' ? ['admin', 'supervisor', 'operator'] : ['operator'];
    const userId = foundUser?.id || `usr-${cleanUser}`;
    const fullName = foundUser?.fullName || (cleanUser === 'admin1' ? 'Administrador 1' : cleanUser === 'admin2' ? 'Administrador 2' : cleanUser);

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

  // Obtener usuario actualmente autenticado (Garantizando roles de Admin)
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      const currentUsernameState = await db.appState.get('currentUsername');

      if (!currentUserIdState?.value) return null;

      const cached = await db.cachedUserProfile.get(currentUserIdState.value);
      if (!cached || !cached.profile) return null;

      let profile: UserProfile = cached.profile;
      const username = (currentUsernameState?.value || profile.email?.split('@')[0] || '').toLowerCase();

      // Garantizar que cuentas admin (admin1, admin2 o rol admin) siempre posean 'admin' en sus roles
      const isSystemAdmin = username === 'admin1' || username === 'admin2' || username.includes('admin');
      if (isSystemAdmin || profile.roles?.some((r: string) => String(r).toLowerCase() === 'admin')) {
        if (!profile.roles.includes('admin')) {
          profile.roles = ['admin', 'supervisor', 'operator'];
          await db.cachedUserProfile.put({ userId: currentUserIdState.value, profile });
        }
      }

      if (typeof window !== 'undefined' && navigator.onLine) {
        this.verifyAccountOnline(currentUserIdState.value).catch(() => {});
      }

      return profile;
    } catch (e) {
      console.error('[AuthService] Error recuperando usuario:', e);
    }

    return null;
  }

  // Verificación silenciosa en la nube cuando se conecta a internet
  static async verifyAccountOnline(userId: string): Promise<boolean> {
    // Proteger cuentas del sistema admin1 y admin2
    if (userId === 'usr-admin-1' || userId === 'usr-admin-2' || userId.includes('admin')) {
      return true;
    }

    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id')
        .eq('id', userId)
        .limit(1);

      if (!error && data && data.length === 0) {
        console.warn('[AuthService] La cuenta ha sido revocada en la nube.');
        await this.logout();
        return false;
      }
    } catch {
      // Si ocurre error de red o timeout, MANTIENE LA SESIÓN ACTIVA (Regla de Modo Offline)
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
