'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { BookOpen, Save, ArrowLeft, Check, History, Search, Calendar } from 'lucide-react';
import Link from 'next/link';

export type PerforadoraOpcion = 'D14' | 'D15' | 'D16' | 'D10' | 'D11';

export interface EquipmentEventRecord {
  id: string;
  fecha: string;
  perforadora: PerforadoraOpcion;
  faseSector: string;
  tiempoUtilizado: string;
  tareaRealizada: string;
  observaciones: string;
  createdAt: string;
  updatedAt: string;
}

export default function EventsPage() {
  const [formData, setFormData] = useState<{
    fecha: string;
    perforadora: PerforadoraOpcion;
    faseSector: string;
    tiempoUtilizado: string;
    tareaRealizada: string;
    observaciones: string;
  }>({
    fecha: new Date().toISOString().split('T')[0],
    perforadora: 'D14',
    faseSector: '',
    tiempoUtilizado: '',
    tareaRealizada: '',
    observaciones: '',
  });

  const [records, setRecords] = useState<EquipmentEventRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPerforadora, setFilterPerforadora] = useState<string>('TODAS');

  useEffect(() => {
    loadLocalEvents();
    fetchCloudEvents();
  }, []);

  const loadLocalEvents = async () => {
    try {
      const saved = await db.appState.get('equipmentEvents_records');
      if (saved?.value && Array.isArray(saved.value)) {
        setRecords(saved.value);
      }
    } catch (e) {
      console.warn('Error cargando eventos de IndexedDB:', e);
    }
  };

  const fetchCloudEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_events')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const mapped: EquipmentEventRecord[] = data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          perforadora: d.perforadora as PerforadoraOpcion,
          faseSector: d.fase_sector,
          tiempoUtilizado: d.tiempo_utilizado,
          tareaRealizada: d.tarea_realizada,
          observaciones: d.observaciones || '',
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        setRecords(mapped);
        await db.appState.put({ key: 'equipmentEvents_records', value: mapped });
      }
    } catch {
      console.warn('[Supabase] Modo offline en Eventos.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.faseSector.trim() || !formData.tareaRealizada.trim()) {
      alert('Por favor ingrese la Fase/Sector y la Tarea Realizada.');
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const uniqueId = `evt-${Date.now()}`;

    const newRecord: EquipmentEventRecord = {
      id: uniqueId,
      fecha: formData.fecha,
      perforadora: formData.perforadora,
      faseSector: formData.faseSector.trim(),
      tiempoUtilizado: formData.tiempoUtilizado.trim() || 'N/A',
      tareaRealizada: formData.tareaRealizada.trim(),
      observaciones: formData.observaciones.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Actualizar localmente
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);

    try {
      await db.appState.put({ key: 'equipmentEvents_records', value: updatedRecords });
    } catch (err) {
      console.warn('Error en IndexedDB:', err);
    }

    // Respaldar en Supabase
    try {
      const { error } = await supabase.from('equipment_events').insert([
        {
          id: uniqueId,
          fecha: formData.fecha,
          perforadora: formData.perforadora,
          fase_sector: formData.faseSector.trim(),
          tiempo_utilizado: formData.tiempoUtilizado.trim() || 'N/A',
          tarea_realizada: formData.tareaRealizada.trim(),
          observaciones: formData.observaciones.trim(),
          updated_at: nowIso,
        },
      ]);

      if (error) {
        console.error('[Supabase Event Error]:', error.message);
        setFeedback(`Guardado localmente. Supabase: ${error.message}`);
      } else {
        setFeedback(`¡Actividad registrada en la bitácora para Perforadora ${formData.perforadora}!`);
      }
    } catch {
      setFeedback('Guardado localmente en IndexedDB (Modo Offline)');
    }

    // Resetear formulario manteniendo fecha y perforadora
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      perforadora: formData.perforadora,
      faseSector: '',
      tiempoUtilizado: '',
      tareaRealizada: '',
      observaciones: '',
    });

    setTimeout(() => setFeedback(null), 4000);
    setIsSaving(false);
  };

  const formatDateDDMMYYYY = (dateStr?: string): string => {
    if (!dateStr) return '18/08/2026';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };

  const filteredRecords = records.filter((r) => {
    const matchesPerf = filterPerforadora === 'TODAS' || r.perforadora === filterPerforadora;
    const matchesSearch =
      r.faseSector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tareaRealizada.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.observaciones.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPerf && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Botón Volver y Título */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Módulos de Gestión Técnica</h1>
          <p className="text-xs text-slate-500">Bitácora de actividades y registro operacional de perforadoras</p>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Respaldo Automático</span>
        </div>
      )}

      {/* Tarjeta Formulario: REGISTRO DE ACTIVIDADES (EVENTOS) */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-3 text-slate-900">
            <BookOpen className="w-6 h-6 text-[#9E1B2C]" />
            <h2 className="text-xl font-extrabold tracking-wide uppercase">BITÁCORA DE ACTIVIDADES (EVENTOS)</h2>
          </div>

          <div className="h-1 bg-amber-400 w-full rounded-full"></div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Fila 1: FECHA | PERFORADORA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">FECHA</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">PERFORADORA</label>
                <select
                  value={formData.perforadora}
                  onChange={(e) => setFormData({ ...formData, perforadora: e.target.value as PerforadoraOpcion })}
                  className="w-full bg-white border-2 border-amber-400 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none cursor-pointer shadow-sm"
                >
                  <option value="D14">D14</option>
                  <option value="D15">D15</option>
                  <option value="D16">D16</option>
                  <option value="D10">D10</option>
                  <option value="D11">D11</option>
                </select>
              </div>
            </div>

            {/* Fila 2: FASE / SECTOR | TIEMPO UTILIZADO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">FASE / SECTOR</label>
                <input
                  type="text"
                  required
                  value={formData.faseSector}
                  onChange={(e) => setFormData({ ...formData, faseSector: e.target.value })}
                  placeholder="Ej: Fase 7 - Banco 2800"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">TIEMPO UTILIZADO</label>
                <input
                  type="text"
                  value={formData.tiempoUtilizado}
                  onChange={(e) => setFormData({ ...formData, tiempoUtilizado: e.target.value })}
                  placeholder="Ej: 2.5 hrs / 150 min"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm font-mono"
                />
              </div>
            </div>

            {/* Fila 3: TAREA REALIZADA */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-500">TAREA REALIZADA</label>
              <input
                type="text"
                required
                value={formData.tareaRealizada}
                onChange={(e) => setFormData({ ...formData, tareaRealizada: e.target.value })}
                placeholder="Ej: Mantenimiento Preventivo / Cambio de Broca / Perforación Pozos"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm"
              />
            </div>

            {/* RECUADRO: OBSERVACIONES */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase text-slate-500">OBSERVACIONES</label>
              <textarea
                rows={3}
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Detalle de la actividad, novedades u observaciones..."
                className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm resize-none"
              />
            </div>

            {/* Botón Guardar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-red-900/20 transition-all text-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando Actividad...' : 'Registrar Actividad en Bitácora'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* HISTORIAL / REGISTRO DE ACTIVIDADES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#9E1B2C]" />
            <h3 className="text-base font-extrabold text-slate-900">Historial de Bitácora</h3>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
              {filteredRecords.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Filtro Perforadora */}
            <select
              value={filterPerforadora}
              onChange={(e) => setFilterPerforadora(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
            >
              <option value="TODAS">Todas las Perforadoras</option>
              <option value="D14">D14</option>
              <option value="D15">D15</option>
              <option value="D16">D16</option>
              <option value="D10">D10</option>
              <option value="D11">D11</option>
            </select>

            {/* Búsqueda */}
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tarea o sector..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E1B2C]"
              />
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold">
            No se han encontrado actividades registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-800 border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Perforadora</th>
                  <th className="py-2.5 px-3">Fase / Sector</th>
                  <th className="py-2.5 px-3">Tarea Realizada</th>
                  <th className="py-2.5 px-3">Tiempo</th>
                  <th className="py-2.5 px-3">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-600">{formatDateDDMMYYYY(rec.fecha)}</td>
                    <td className="py-2.5 px-3 font-extrabold text-[#9E1B2C]">{rec.perforadora}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{rec.faseSector}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{rec.tareaRealizada}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{rec.tiempoUtilizado}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={rec.observaciones}>
                      {rec.observaciones || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
