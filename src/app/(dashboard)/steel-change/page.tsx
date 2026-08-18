'use client';

import React, { useState } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { Wrench, Save, ArrowLeft, Check, Search, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';

export type TipoAcero = 'Bit' | 'Martillo' | 'Tricono' | 'Barra' | 'Adaptador' | 'Amortiguador';
export type PerforadoraOpcion = 'D14' | 'D15' | 'D16' | 'D10' | 'D11';
export type DiametroOpcion = '4 1/2"' | '6 1/2"' | '8 5/8"' | '10 5/8"';

export interface SteelChangeRecord {
  id: string;
  fecha: string;
  perforadora: PerforadoraOpcion;
  tipoAcero: TipoAcero;
  serieEntrante: string;
  diametro: DiametroOpcion;
  comentarios: string;
  createdAt: string;
  updatedAt: string;
}

export default function SteelChangePage() {
  const [formData, setFormData] = useState<{
    fecha: string;
    perforadora: PerforadoraOpcion;
    tipoAcero: TipoAcero;
    serieEntrante: string;
    diametro: DiametroOpcion;
    comentarios: string;
  }>({
    fecha: new Date().toISOString().split('T')[0],
    perforadora: 'D14',
    tipoAcero: 'Bit',
    serieEntrante: '',
    diametro: '10 5/8"',
    comentarios: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados de Búsqueda bajo demanda en la nube
  const [searchPerforadora, setSearchPerforadora] = useState<string>('TODAS');
  const [searchSerie, setSearchSerie] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResults, setSearchResults] = useState<SteelChangeRecord[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Consulta Bajo Demanda en Supabase por Perforadora, Serie o Fechas
  const handleCloudSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (searchPerforadora === 'TODAS' && !searchSerie.trim() && !startDate && !endDate) {
      alert('Por favor seleccione una Perforadora, ingrese una Serie o un Rango de Fechas.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('steel_changes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (searchPerforadora !== 'TODAS') {
        query = query.eq('perforadora', searchPerforadora);
      }
      if (startDate) {
        query = query.gte('fecha', startDate);
      }
      if (endDate) {
        query = query.lte('fecha', endDate);
      }

      const { data, error } = await query;

      if (!error && data) {
        let results: SteelChangeRecord[] = data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          perforadora: d.perforadora as PerforadoraOpcion,
          tipoAcero: d.tipo_acero as TipoAcero,
          serieEntrante: d.serie_entrante || d.serie_saliente || '',
          diametro: d.diametro as DiametroOpcion,
          comentarios: d.comentarios || '',
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        if (searchSerie.trim()) {
          const q = searchSerie.trim().toLowerCase();
          results = results.filter((r) => r.serieEntrante.toLowerCase().includes(q));
        }

        setSearchResults(results);
      } else {
        await searchLocalIndexedDB();
      }
    } catch {
      await searchLocalIndexedDB();
    } finally {
      setIsSearching(false);
    }
  };

  const searchLocalIndexedDB = async () => {
    try {
      const saved = await db.appState.get('steelChanges_records_v2');
      if (saved?.value && Array.isArray(saved.value)) {
        let localData: SteelChangeRecord[] = saved.value;

        if (searchPerforadora !== 'TODAS') {
          localData = localData.filter((r) => r.perforadora === searchPerforadora);
        }
        if (startDate) localData = localData.filter((r) => r.fecha >= startDate);
        if (endDate) localData = localData.filter((r) => r.fecha <= endDate);
        if (searchSerie.trim()) {
          const q = searchSerie.trim().toLowerCase();
          localData = localData.filter((r) => r.serieEntrante.toLowerCase().includes(q));
        }

        setSearchResults(localData);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serieEntrante.trim()) {
      alert('Por favor ingrese la Serie Entrante del acero.');
      return;
    }

    setIsSaving(true);

    const recordId = `chg-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newRecord: SteelChangeRecord = {
      id: recordId,
      fecha: formData.fecha,
      perforadora: formData.perforadora,
      tipoAcero: formData.tipoAcero,
      serieEntrante: formData.serieEntrante.trim(),
      diametro: formData.diametro,
      comentarios: formData.comentarios.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Guardar en IndexedDB
    try {
      const saved = await db.appState.get('steelChanges_records_v2');
      let localRecords: SteelChangeRecord[] = saved?.value || [];
      localRecords.unshift(newRecord);
      await db.appState.put({ key: 'steelChanges_records_v2', value: localRecords });
    } catch (e) {
      console.warn('Error en IndexedDB:', e);
    }

    // Supabase Cloud Insert
    try {
      const { error } = await supabase.from('steel_changes').insert([
        {
          id: recordId,
          fecha: formData.fecha,
          perforadora: formData.perforadora,
          tipo_acero: formData.tipoAcero,
          serie_entrante: formData.serieEntrante.trim(),
          diametro: formData.diametro,
          comentarios: formData.comentarios.trim(),
          updated_at: nowIso,
        }
      ]);

      if (error) {
        console.error('[Supabase Change Error]:', error.message);
        setFeedback(`Guardado localmente. Supabase: ${error.message}`);
      } else {
        setFeedback('¡Cambio de acero registrado y respaldado en la nube!');
      }
    } catch {
      setFeedback('Guardado localmente en IndexedDB (Modo Offline)');
    }

    // Si había una búsqueda activa, incluir el registro de inmediato
    if (hasSearched) {
      setSearchResults((prev) => (prev ? [newRecord, ...prev] : [newRecord]));
    }

    // Resetear formulario
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      perforadora: 'D14',
      tipoAcero: 'Bit',
      serieEntrante: '',
      diametro: '10 5/8"',
      comentarios: '',
    });

    setTimeout(() => setFeedback(null), 4000);
    setIsSaving(false);
  };

  const handleClearSearch = () => {
    setSearchPerforadora('TODAS');
    setSearchSerie('');
    setStartDate('');
    setEndDate('');
    setSearchResults(null);
    setHasSearched(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Botón Volver y Título */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Módulos de Gestión Técnica</h1>
          <p className="text-xs text-slate-500">Registro de recambio de aceros de perforación</p>
        </div>
      </div>

      {/* Mensaje de Confirmación */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Respaldo Automático</span>
        </div>
      )}

      {/* Tarjeta Principal: CAMBIO DE ACEROS */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-3 text-slate-900">
            <Wrench className="w-6 h-6 text-[#9E1B2C]" />
            <h2 className="text-xl font-extrabold tracking-wide uppercase">CAMBIO DE ACEROS</h2>
          </div>

          {/* Línea de Acento Amarilla */}
          <div className="h-1 bg-amber-400 w-full rounded-full"></div>

          {/* Formulario Simplificado */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Fila 1: FECHA | PERFORADORA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">FECHA</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">PERFORADORA</label>
                <select
                  value={formData.perforadora}
                  onChange={(e) => setFormData({ ...formData, perforadora: e.target.value as PerforadoraOpcion })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="D14">D14</option>
                  <option value="D15">D15</option>
                  <option value="D16">D16</option>
                  <option value="D10">D10</option>
                  <option value="D11">D11</option>
                </select>
              </div>
            </div>

            {/* Fila 2: TIPO DE ACERO | DIÁMETRO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">TIPO DE ACERO</label>
                <select
                  value={formData.tipoAcero}
                  onChange={(e) => setFormData({ ...formData, tipoAcero: e.target.value as TipoAcero })}
                  className="w-full bg-white border-2 border-amber-400 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="Bit">Bit</option>
                  <option value="Martillo">Martillo</option>
                  <option value="Tricono">Tricono</option>
                  <option value="Barra">Barra</option>
                  <option value="Adaptador">Adaptador</option>
                  <option value="Amortiguador">Amortiguador</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">DIÁMETRO</label>
                <select
                  value={formData.diametro}
                  onChange={(e) => setFormData({ ...formData, diametro: e.target.value as DiametroOpcion })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm cursor-pointer font-mono"
                >
                  <option value='4 1/2"'>4 1/2"</option>
                  <option value='6 1/2"'>6 1/2"</option>
                  <option value='8 5/8"'>8 5/8"</option>
                  <option value='10 5/8"'>10 5/8"</option>
                </select>
              </div>
            </div>

            {/* Fila 3: SERIE ENTRANTE (ÚNICO CAMPO DE SERIE) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">SERIE ENTRANTE</label>
              <input
                type="text"
                required
                value={formData.serieEntrante}
                onChange={(e) => setFormData({ ...formData, serieEntrante: e.target.value })}
                placeholder="Ej: S-90855 (Nuevo/Reparado)"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm font-mono"
              />
            </div>

            {/* RECUADRO: COMENTARIOS */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">COMENTARIOS</label>
              <textarea
                rows={3}
                value={formData.comentarios}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                placeholder="Escriba comentarios u observaciones adicionales sobre el cambio..."
                className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm resize-none"
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
                <span>{isSaving ? 'Guardando Registro...' : 'Registrar Cambio de Acero'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SECCIÓN CONSULTA / HISTORIAL BÚSQUEDA EN LA NUBE (BAJO DEMANDA) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <Filter className="w-5 h-5 text-[#9E1B2C]" />
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Historial de Cambios de Aceros (Consulta Nube)</h3>
            <p className="text-xs text-slate-500">Selecciona la Perforadora, Serie o Rango de Fechas para consultar a Supabase</p>
          </div>
        </div>

        {/* Formulario de Búsqueda */}
        <form onSubmit={handleCloudSearch} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Desplegable Perforadora */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Perforadora</label>
              <select
                value={searchPerforadora}
                onChange={(e) => setSearchPerforadora(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              >
                <option value="TODAS">TODAS</option>
                <option value="D14">D14</option>
                <option value="D15">D15</option>
                <option value="D16">D16</option>
                <option value="D10">D10</option>
                <option value="D11">D11</option>
              </select>
            </div>

            {/* Input Serie */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Serie Entrante</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchSerie}
                  onChange={(e) => setSearchSerie(e.target.value)}
                  placeholder="Ej. S-90855"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>
            </div>

            {/* Fecha Desde */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Fecha Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              />
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Fecha Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            {hasSearched && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Limpiar Consulta
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold px-5 py-2 rounded-xl flex items-center space-x-2 text-xs shadow-md transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Consultando Nube...' : 'Buscar en la Nube'}</span>
            </button>
          </div>
        </form>

        {/* RESULTADOS DE LA BÚSQUEDA */}
        {!hasSearched && (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-1">
            <Calendar className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-slate-600 font-bold">Sin consulta activa</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Selecciona una Perforadora, Serie Entrante o Rango de Fechas en el recuadro superior para consultar en la nube.
            </p>
          </div>
        )}

        {hasSearched && searchResults && searchResults.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs font-bold bg-amber-50/60 rounded-2xl border border-amber-200">
            No se encontraron cambios de aceros registrados que coincidan con la búsqueda.
          </div>
        )}

        {hasSearched && searchResults && searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>Resultados Encontrados ({searchResults.length}):</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-800 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Perforadora</th>
                    <th className="py-2.5 px-3">Tipo Acero</th>
                    <th className="py-2.5 px-3">Serie Entrante</th>
                    <th className="py-2.5 px-3">Diámetro</th>
                    <th className="py-2.5 px-3">Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{rec.fecha}</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">{rec.perforadora}</td>
                      <td className="py-2.5 px-3 font-extrabold text-[#9E1B2C]">
                        <span className="bg-red-50 text-[#9E1B2C] border border-red-200 px-2 py-0.5 rounded-md">
                          {rec.tipoAcero}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{rec.serieEntrante || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{rec.diametro}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate font-mono" title={rec.comentarios}>
                        {rec.comentarios || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
