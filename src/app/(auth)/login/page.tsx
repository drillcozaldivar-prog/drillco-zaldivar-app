'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useRouter } from 'next/navigation';
import { DrillcoLogo } from '@/components/ui/DrillcoLogo';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  // Cargar usuario guardado previamente si la casilla Recordarme fue activada
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rememberedEmail');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      await login(email, password);
      // Navegación directa garantizada mediante React Router y sustitución de URL
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleEyeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between items-center p-2 sm:p-4">
      {/* Marco de Dispositivo Móvil / Tablet centrado idéntico a la Imagen 5 */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col justify-between my-auto min-h-[780px] relative">
        {/* Encabezado y Formulario Principal */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* Logo Corporativo DRILLCO */}
          <div className="pt-2">
            <DrillcoLogo size="lg" />
          </div>

          {/* Banner de Bienvenida e Ilustración */}
          <div className="relative pt-2">
            <p className="text-xs font-black uppercase text-[#9E1B2C] tracking-wider">BIENVENIDO A</p>
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
              Control y Gestión <br /> de Perforación
            </h1>
            <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
              Plataforma integral para el control y gestión de operaciones de perforación.
            </p>
          </div>

          {/* Formulario de Login (Desacoplado de submit HTML nativo) */}
          <div className="space-y-4 pt-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                {error}
              </div>
            )}

            {/* Campo Usuario */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Usuario</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                  placeholder="Ingresa tu usuario"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1B2C] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                  placeholder="Ingresa tu contraseña"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#9E1B2C] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={handleEyeToggle}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700 p-1 focus:outline-none z-20 cursor-pointer"
                  title="Ver u ocultar contraseña"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Recordarme */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#9E1B2C] focus:ring-[#9E1B2C]"
                />
                <span className="font-semibold text-slate-700">Recordarme</span>
              </label>
            </div>

            {/* Botón de Inicio de Sesión Rojo DRILLCO */}
            <button
              type="button"
              onClick={() => handleLogin()}
              disabled={loading}
              className="w-full bg-[#9E1B2C] hover:bg-[#801423] active:bg-[#6A0F1D] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-red-900/20 transition-all text-sm mt-2 cursor-pointer"
            >
              <span>{loading ? 'Iniciando sesión...' : 'Iniciar sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Olvidaste tu contraseña */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => alert('Por favor contacte al administrador de su faena.')}
                className="text-xs font-semibold text-slate-700 hover:text-[#9E1B2C] flex items-center justify-center space-x-1 mx-auto"
              >
                <span className="w-4 h-4 rounded-full border border-slate-400 text-[10px] flex items-center justify-center">?</span>
                <span>¿Olvidaste tu contraseña?</span>
              </button>
            </div>
          </div>
        </div>

        {/* Banner Inferior Corporativo DRILLCO (Igual a la Imagen 4 y 5) */}
        <div className="bg-[#801423] text-white p-4 relative overflow-hidden flex items-center justify-between border-t border-[#9E1B2C]">
          {/* Fondo Topográfico en Ángulo */}
          <div className="absolute inset-0 opacity-20 topo-pattern transform -skew-x-12"></div>

          <div className="relative z-10 text-[11px] space-y-0.5 max-w-[240px]">
            <p className="font-black tracking-wide text-xs">DRILLCO Headquarters Chile</p>
            <p className="text-slate-200">Américo Vespucio Norte 1387</p>
            <p className="text-slate-200">Quilicura - Santiago - Chile</p>
            <p className="font-bold text-white pt-0.5">www.drillco.com</p>
          </div>

          {/* QR Code SVG Oficial */}
          <div className="relative z-10 bg-white p-1.5 rounded-lg shadow-md flex-shrink-0">
            <svg width="46" height="46" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="white"/>
              <rect x="10" y="10" width="30" height="30" fill="black"/>
              <rect x="16" y="16" width="18" height="18" fill="white"/>
              <rect x="22" y="22" width="6" height="6" fill="black"/>
              
              <rect x="60" y="10" width="30" height="30" fill="black"/>
              <rect x="66" y="16" width="18" height="18" fill="white"/>
              <rect x="72" y="22" width="6" height="6" fill="black"/>
              
              <rect x="10" y="60" width="30" height="30" fill="black"/>
              <rect x="16" y="66" width="18" height="18" fill="white"/>
              <rect x="22" y="72" width="6" height="6" fill="black"/>
              
              <rect x="45" y="15" width="8" height="8" fill="black"/>
              <rect x="45" y="30" width="8" height="8" fill="black"/>
              <rect x="15" y="45" width="8" height="8" fill="black"/>
              <rect x="30" y="45" width="8" height="8" fill="black"/>
              <rect x="45" y="45" width="10" height="10" fill="#9E1B2C"/>
              <rect x="60" y="45" width="8" height="8" fill="black"/>
              <rect x="75" y="45" width="8" height="8" fill="black"/>
              <rect x="45" y="60" width="8" height="8" fill="black"/>
              <rect x="60" y="60" width="15" height="15" fill="black"/>
              <rect x="80" y="60" width="8" height="8" fill="black"/>
              <rect x="45" y="75" width="8" height="8" fill="black"/>
              <rect x="75" y="75" width="12" height="12" fill="black"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
