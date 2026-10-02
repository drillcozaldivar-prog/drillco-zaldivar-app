'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { AuthService, RegisteredUser } from '@/features/auth/authService';
import { Settings, Users, HardHat, FileText, Database, Plus, Trash2, Check, ShieldCheck, UserCheck, Lock } from 'lucide-react';

export default function AdminPage() {
  const { isAdmin, user, loading: authLoading } = useAuth();

  const [usersList, setUsersList] = useState<RegisteredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form State para Crear Usuario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'operator' | 'admin'>('operator');

  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const list = await AuthService.getUsers();
      setUsersList(list);
    } catch (e) {
      console.warn('Error cargando usuarios:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor ingrese nombre de usuario y contraseña.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await AuthService.createUser({
        username: username.trim(),
        password: password.trim(),
        fullName: fullName.trim() || username.trim(),
        role,
      });

      setFeedback(`¡Cuenta "${created.username}" creada correctamente con rol ${created.role === 'admin' ? 'Administrador' : 'Usuario Normal'}!`);
      await loadUsers();

      // Resetear formulario
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('operator');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error al crear la cuenta.');
    } finally {
      setIsCreating(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDeleteUser = async (userObj: RegisteredUser) => {
    const un = userObj.username.toLowerCase();
    if (un === 'admin1drillco' || un === 'admin2drillco' || un === 'admin1' || un === 'admin2') {
      alert('Las cuentas principales admin1drillco y admin2drillco forman parte de la configuración del sistema y no se pueden eliminar.');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar la cuenta "${userObj.username}" (${userObj.fullName})?`)) {
      return;
    }

    try {
      await AuthService.deleteUser(userObj.id);
      setFeedback(`Cuenta "${userObj.username}" eliminada correctamente.`);
      await loadUsers();
    } catch {
      setErrorMsg('Error al eliminar la cuenta.');
    } finally {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Verificación robusta de permisos Admin
  const isUserAdmin =
    isAdmin ||
    user?.roles?.some((r) => String(r).toLowerCase() === 'admin') ||
    user?.email?.toLowerCase().includes('admin') ||
    false;

  if (authLoading) {
    return (
      <div className="py-12 text-center text-xs font-semibold text-slate-500">
        Cargando perfil de usuario...
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <Lock className="w-12 h-12 text-[#9E1B2C] mx-auto" />
        <h2 className="text-xl font-extrabold text-slate-900">Acceso Restringido</h2>
        <p className="text-xs text-slate-500">
          La sección de Administración y Gestión de Usuarios requiere credenciales de cuenta Administrador (`admin1drillco` o `admin2drillco`).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Feedback Toast */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">DRILLCO® Auth Sync</span>
        </div>
      )}

      {/* Encabezado del Panel */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center space-x-3 text-slate-900">
          <Settings className="w-7 h-7 text-[#9E1B2C]" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-wide uppercase">PANEL DE ADMINISTRACIÓN</h1>
            <p className="text-xs text-slate-500">Gestión de usuarios, permisos, cuentas y seguridad de faena</p>
          </div>
        </div>
        <div className="h-1 bg-amber-400 w-full rounded-full"></div>
      </div>

      {/* SECCIÓN PRINCIPAL: GESTIÓN DE USUARIOS Y ROLES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3 text-slate-900 border-b border-slate-200 pb-3">
          <Users className="w-6 h-6 text-[#9E1B2C]" />
          <div>
            <h2 className="text-lg font-extrabold uppercase">GESTIÓN DE USUARIOS Y ROLES</h2>
            <p className="text-xs text-slate-500">Crear y administrar cuentas normales (operadores) y administradores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* COLUMNA 1: FORMULARIO CREAR CUENTA */}
          <form onSubmit={handleCreateUser} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Crear Nueva Cuenta de Usuario</span>
            </h3>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Nombre de Usuario */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-500">Nombre de Usuario *</label>
              <input
                type="text"
                required
                placeholder="Ej: operador1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-500">Contraseña / Password *</label>
              <input
                type="text"
                required
                placeholder="Ej: clave2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              />
            </div>

            {/* Nombre Completo */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-500">Nombre Completo del Titular</label>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              />
            </div>

            {/* Rol de la cuenta */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-500">Rol y Tipo de Cuenta</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'operator' | 'admin')}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none cursor-pointer"
              >
                <option value="operator">Usuario Normal (Operador)</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? 'Creando Cuenta...' : 'Crear Cuenta de Usuario'}</span>
            </button>
          </form>

          {/* COLUMNA 2: TABLA DE CUENTAS REGISTRADAS */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
              <span>Cuentas Registradas ({usersList.length}):</span>
              <span className="text-[10px] text-slate-500 font-bold font-mono">Modo Persistente</span>
            </h3>

            {loadingUsers ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">Cargando cuentas...</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-xs text-left text-slate-800">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3">Rol</th>
                      <th className="py-2.5 px-3">Contraseña</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => {
                      const un = u.username.toLowerCase();
                      const isSys = un === 'admin1drillco' || un === 'admin2drillco' || un === 'admin1' || un === 'admin2';

                      return (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div>
                              <span className="font-mono text-slate-900">{u.username}</span>
                              <span className="block text-[10px] text-slate-400 font-normal">{u.fullName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {u.role === 'admin' ? (
                              <span className="bg-red-50 text-[#9E1B2C] border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Admin</span>
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                                <UserCheck className="w-3 h-3 text-slate-500" />
                                <span>Normal</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{u.password}</td>
                          <td className="py-2.5 px-3 text-center">
                            {isSys ? (
                              <span className="text-[10px] font-bold text-slate-400">Sistema</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                title="Eliminar cuenta"
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
