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
      // 1. Intentar consultar en Supabase si hay conexión
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

    // 2. Fallback a IndexedDB local
    try {
      const saved = await db.appState.get('registered_users_list');
      if (saved?.value && Array.isArray(saved.value) && saved.value.length > 0) {
        return saved.value;
      }
    } catch {
      // Ignorar error IndexedDB
    }

    // 3. Inicializar cuentas administradores por defecto si no existen
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

    if (!foundUser) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const roles: RoleCode[] = foundUser.role === 'admin' ? ['admin', 'supervisor', 'operator'] : ['operator'];

    const userProfile: UserProfile = {
      id: foundUser.id,
      organizationId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      firstName: foundUser.fullName.split(' ')[0] || foundUser.username,
      lastName: foundUser.fullName.split(' ').slice(1).join(' ') || '',
      email: `${foundUser.username}@drillco.com`,
      roles,
      siteIds: ['b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'],
    };

    // Guardar sesión en IndexedDB local (Soporte Offline Garantizado)
    try {
      await db.cachedUserProfile.put({ userId: foundUser.id, profile: userProfile });
      await db.appState.put({ key: 'currentUserId', value: foundUser.id });
      await db.appState.put({ key: 'currentUsername', value: foundUser.username });
    } catch (e) {
      console.error('[AuthService] Error en IndexedDB:', e);
    }

    return userProfile;
  }

  // Obtener usuario actualmente autenticado (Modo Offline siempre permitido)
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const currentUserIdState = await db.appState.get('currentUserId');
      if (!currentUserIdState?.value) return null;

      const cached = await db.cachedUserProfile.get(currentUserIdState.value);
      if (!cached) return null;

      // Verificación silenciosa en segundo plano solo si está Online
      if (typeof window !== 'undefined' && navigator.onLine) {
        this.verifyAccountOnline(currentUserIdState.value).catch(() => {});
      }

      return cached.profile;
    } catch (e) {
      console.error('[AuthService] Error recuperando usuario:', e);
    }

    return null;
  }

  // Verificación silenciosa en la nube cuando se conecta a internet
  static async verifyAccountOnline(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id')
        .eq('id', userId)
        .limit(1);

      if (!error && data && data.length === 0) {
        // Si el usuario fue eliminado en Supabase por un administrador, revocar la sesión local al estar online
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

    // 1. Guardar localmente en IndexedDB
    const updatedUsers = [...users, newUser];
    await db.appState.put({ key: 'registered_users_list', value: updatedUsers });

    // 2. Guardar en Supabase Nube
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
    } catch (e) {
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
