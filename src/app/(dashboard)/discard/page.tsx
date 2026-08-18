'use client';

import React, { useState, useRef } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { Trash2, Save, ArrowLeft, Check, Search, Calendar, Filter, Camera, Image as ImageIcon, X, Eye } from 'lucide-react';
import Link from 'next/link';

export type TipoAcero = 'Bit' | 'Martillo' | 'Tricono' | 'Barra' | 'Adaptador' | 'Amortiguador';
export type EquipoOpcion = 'D14' | 'D15' | 'D16' | 'D10' | 'D11';
export type DiametroOpcion = '4 1/2"' | '6 1/2"' | '8 5/8"' | '10 5/8"';

export interface SteelDiscardRecord {
  id: string; // ID Único compuesto: `${tipoAcero}-${serie}`
  fecha: string;
  serie: string;
  equipo: EquipoOpcion;
  diametro: DiametroOpcion;
  fechaPostura: string;
  fechaDescarte: string;
  tipoAcero: TipoAcero;
  terreno: string;
  causaDescarte: string;
  mediciones: string;
  fotoUrl?: string; // Foto comprimida en JPEG (Base64 / URL Supabase)
  createdAt: string;
  updatedAt: string;
}

// Función para reducir y comprimir fotografías en el cliente antes de guardar/subir
const compressImage = (file: File, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Exportar como JPEG con calidad optimizada al 70% (~90 KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function DiscardPage() {
  const [formData, setFormData] = useState<{
    fecha: string;
    serie: string;
    equipo: EquipoOpcion;
    diametro: DiametroOpcion;
    fechaPostura: string;
    fechaDescarte: string;
    tipoAcero: TipoAcero;
    terreno: string;
    causaDescarte: string;
    mediciones: string;
    fotoUrl: string;
  }>({
    fecha: new Date().toISOString().split('T')[0],
    serie: '',
    equipo: 'D14',
    diametro: '10 5/8"',
    fechaPostura: new Date().toISOString().split('T')[0],
    fechaDescarte: new Date().toISOString().split('T')[0],
    tipoAcero: 'Bit',
    terreno: 'Medio',
    causaDescarte: '',
    mediciones: '',
    fotoUrl: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Referencias para los inputs de cámara y galería
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Estado para la modal de vista previa de foto completa
  const [fullImageModalUrl, setFullImageModalUrl] = useState<string | null>(null);

  // Estados de Búsqueda bajo demanda en la nube
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchResults, setSearchResults] = useState<SteelDiscardRecord[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Manejador de selección de imagen (Cámara o Galería) con compresión automática
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImage(file, 1024, 0.7);
      setFormData((prev) => ({ ...prev, fotoUrl: compressedDataUrl }));
    } catch (err) {
      console.warn('Error comprimiendo la imagen:', err);
      alert('Ocurrió un error al procesar la fotografía.');
    } finally {
      setIsCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Función de búsqueda en la nube (Supabase + fallback IndexedDB) por Serie, Equipo o Rango de Fechas
  const handleCloudSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!searchQuery.trim() && !startDate && !endDate) {
      alert('Por favor ingrese un término de búsqueda (Serie o Equipo) o seleccione un rango de fechas.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('steel_discards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (startDate) {
        query = query.gte('fecha_descarte', startDate);
      }
      if (endDate) {
        query = query.lte('fecha_descarte', endDate);
      }

      const { data, error } = await query;

      if (!error && data) {
        let results: SteelDiscardRecord[] = data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          serie: d.serie,
          equipo: d.equipo as EquipoOpcion,
          diametro: d.diametro as DiametroOpcion,
          fechaPostura: d.fecha_postura,
          fechaDescarte: d.fecha_descarte,
          tipoAcero: d.tipo_acero as TipoAcero,
          terreno: d.terreno,
          causaDescarte: d.causa_descarte,
          mediciones: typeof d.mediciones === 'string' ? d.mediciones : (d.mediciones?.texto || ''),
          fotoUrl: d.foto_url || d.fotoUrl || '',
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          results = results.filter(
            (r) => r.serie.toLowerCase().includes(q) || r.equipo.toLowerCase().includes(q)
          );
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
      const saved = await db.appState.get('steelDiscards_records_v2');
      if (saved?.value && Array.isArray(saved.value)) {
        let localData: SteelDiscardRecord[] = saved.value;

        if (startDate) localData = localData.filter((r) => r.fechaDescarte >= startDate);
        if (endDate) localData = localData.filter((r) => r.fechaDescarte <= endDate);
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          localData = localData.filter((r) => r.serie.toLowerCase().includes(q) || r.equipo.toLowerCase().includes(q));
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
    if (!formData.serie.trim()) {
      alert('Por favor ingrese la Serie del acero.');
      return;
    }

    setIsSaving(true);

    const compositeId = `${formData.tipoAcero}-${formData.serie.trim()}`.toLowerCase();
    const nowIso = new Date().toISOString();

    const newRecord: SteelDiscardRecord = {
      id: compositeId,
      fecha: formData.fecha,
      serie: formData.serie.trim(),
      equipo: formData.equipo,
      diametro: formData.diametro,
      fechaPostura: formData.fechaPostura,
      fechaDescarte: formData.fechaDescarte,
      tipoAcero: formData.tipoAcero,
      terreno: formData.terreno,
      causaDescarte: formData.causaDescarte.trim(),
      mediciones: formData.mediciones.trim(),
      fotoUrl: formData.fotoUrl,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Guardar en IndexedDB
    try {
      const saved = await db.appState.get('steelDiscards_records_v2');
      let localRecords: SteelDiscardRecord[] = saved?.value || [];
      const existingIdx = localRecords.findIndex((r) => r.id === compositeId);

      if (existingIdx >= 0) {
        localRecords[existingIdx] = { ...newRecord, createdAt: localRecords[existingIdx].createdAt };
        setFeedback(`Registro renovado para ${formData.tipoAcero} Serie: ${formData.serie}`);
      } else {
        localRecords.unshift(newRecord);
        setFeedback(`Descarte registrado correctamente para Serie: ${formData.serie}`);
      }

      await db.appState.put({ key: 'steelDiscards_records_v2', value: localRecords });
    } catch (e) {
      console.warn('Error en IndexedDB:', e);
    }

    // Supabase Cloud Upsert (Guarda datos y foto comprimida)
    try {
      const { error } = await supabase.from('steel_discards').upsert([
        {
          id: compositeId,
          fecha: formData.fecha,
          serie: formData.serie.trim(),
          equipo: formData.equipo,
          diametro: formData.diametro,
          fecha_postura: formData.fechaPostura,
          fecha_descarte: formData.fechaDescarte,
          tipo_acero: formData.tipoAcero,
          terreno: formData.terreno,
          causa_descarte: formData.causaDescarte.trim(),
          mediciones: { texto: formData.mediciones.trim() },
          foto_url: formData.fotoUrl,
          updated_at: nowIso,
        }
      ], { onConflict: 'id' });

      if (error) {
        console.error('[Supabase Discard Error]:', error.message);
      } else {
        console.log('[Supabase Discard] Registro respaldado en la nube.');
      }
    } catch {
      console.warn('[Supabase Offline] Guardado localmente en IndexedDB.');
    }

    if (hasSearched) {
      setSearchResults((prev) => {
        if (!prev) return [newRecord];
        const existingIndex = prev.findIndex((r) => r.id === compositeId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newRecord;
          return updated;
        }
        return [newRecord, ...prev];
      });
    }

    // Resetear formulario
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      serie: '',
      equipo: 'D14',
      diametro: '10 5/8"',
      fechaPostura: new Date().toISOString().split('T')[0],
      fechaDescarte: new Date().toISOString().split('T')[0],
      tipoAcero: 'Bit',
      terreno: 'Medio',
      causaDescarte: '',
      mediciones: '',
      fotoUrl: '',
    });

    setTimeout(() => setFeedback(null), 4000);
    setIsSaving(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSearchResults(null);
    setHasSearched(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Botones de captura de foto invisibles */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleImageSelected}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleImageSelected}
        className="hidden"
      />

      {/* Botón Volver y Título */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Módulos de Gestión Técnica</h1>
          <p className="text-xs text-slate-500">Control de vida útil y descarte de aceros en faena</p>
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

      {/* Tarjeta Principal del Formulario DESCARTE DE ACEROS */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-3 text-slate-900">
            <Trash2 className="w-6 h-6 text-[#9E1B2C]" />
            <h2 className="text-xl font-extrabold tracking-wide uppercase">DESCARTE DE ACEROS</h2>
          </div>

          <div className="h-1 bg-amber-400 w-full rounded-full"></div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Fila 1: FECHA | SERIE */}
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
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">SERIE</label>
                <input
                  type="text"
                  required
                  value={formData.serie}
                  onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                  placeholder="Ej: S12345"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm font-mono"
                />
              </div>
            </div>

            {/* Fila 2: EQUIPO | DIÁMETRO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">EQUIPO</label>
                <select
                  value={formData.equipo}
                  onChange={(e) => setFormData({ ...formData, equipo: e.target.value as EquipoOpcion })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="D14">D14</option>
                  <option value="D15">D15</option>
                  <option value="D16">D16</option>
                  <option value="D10">D10</option>
                  <option value="D11">D11</option>
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

            {/* Fila 3: FECHA DE POSTURA | FECHA DE DESCARTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">FECHA DE POSTURA</label>
                <input
                  type="date"
                  required
                  value={formData.fechaPostura}
                  onChange={(e) => setFormData({ ...formData, fechaPostura: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">FECHA DE DESCARTE</label>
                <input
                  type="date"
                  required
                  value={formData.fechaDescarte}
                  onChange={(e) => setFormData({ ...formData, fechaDescarte: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Fila 4: TIPO ACERO | TERRENO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">TIPO ACERO</label>
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
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">TERRENO</label>
                <select
                  value={formData.terreno}
                  onChange={(e) => setFormData({ ...formData, terreno: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="Blando">Blando</option>
                  <option value="Medio">Medio</option>
                  <option value="Duro">Duro</option>
                  <option value="Muy Duro">Muy Duro / Abrasivo</option>
                </select>
              </div>
            </div>

            {/* CAUSA DE DESCARTE */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">CAUSA DE DESCARTE</label>
              <textarea
                rows={3}
                required
                value={formData.causaDescarte}
                onChange={(e) => setFormData({ ...formData, causaDescarte: e.target.value })}
                placeholder="Escriba la razón del descarte..."
                className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm resize-none"
              />
            </div>

            {/* MEDICIONES */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">MEDICIONES</label>
              <textarea
                rows={3}
                value={formData.mediciones}
                onChange={(e) => setFormData({ ...formData, mediciones: e.target.value })}
                placeholder="Escriba las mediciones técnicas del acero..."
                className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none transition-all shadow-sm resize-none"
              />
            </div>

            {/* ========================================================================= */}
            {/* NUEVO: SECCIÓN CAPTURA FOTOGRÁFICA CON COMPRESIÓN AUTOMÁTICA */}
            {/* ========================================================================= */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                REGISTRO FOTOGRÁFICO DE ACERO (OPCIONAL)
              </label>

              {isCompressing ? (
                <div className="py-6 text-center text-xs font-bold text-amber-700 animate-pulse">
                  Optimizando y reduciendo tamaño de fotografía...
                </div>
              ) : formData.fotoUrl ? (
                <div className="space-y-2">
                  <div className="relative w-full max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.fotoUrl}
                      alt="Vista Previa Acero"
                      className="w-full h-44 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, fotoUrl: '' })}
                      title="Eliminar foto"
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="block text-[10px] text-center font-bold text-emerald-700">
                    ✓ Fotograf&iacute;a optimizada (JPEG compressed ~90 KB)
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-3 px-4 bg-white border border-slate-300 hover:border-[#9E1B2C] text-slate-800 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#9E1B2C]" />
                    <span>Tomar Foto (Cámara)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-3 px-4 bg-white border border-slate-300 hover:border-amber-500 text-slate-800 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-500" />
                    <span>Elegir de Galería</span>
                  </button>
                </div>
              )}
            </div>

            {/* Botón Guardar / Registrar Descarte */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-red-900/20 transition-all text-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando Registro...' : 'Registrar Descarte de Acero'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SECCIÓN CONSULTA / BÚSQUEDA BOGEDA EN LA NUBE (BAJO DEMANDA) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <Filter className="w-5 h-5 text-[#9E1B2C]" />
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Consulta de Descartes en la Nube</h3>
            <p className="text-xs text-slate-500">Busca registros por Serie, Equipo o Rango de Fechas para consultar a Supabase</p>
          </div>
        </div>

        {/* Formulario de Búsqueda */}
        <form onSubmit={handleCloudSearch} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Input Serie o Equipo */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Serie o Equipo</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ej. S12345 o D14"
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
              Realiza una búsqueda por Serie, Equipo o Rango de Fechas en el recuadro superior para consultar registros en la nube de Supabase.
            </p>
          </div>
        )}

        {hasSearched && searchResults && searchResults.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs font-bold bg-amber-50/60 rounded-2xl border border-amber-200">
            No se encontraron descartes registrados que coincidan con la búsqueda.
          </div>
        )}

        {hasSearched && searchResults && searchResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>Resultados Encontrados en la Nube ({searchResults.length}):</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-800 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Fecha Descarte</th>
                    <th className="py-2.5 px-3">Tipo Acero</th>
                    <th className="py-2.5 px-3">Serie</th>
                    <th className="py-2.5 px-3">Equipo</th>
                    <th className="py-2.5 px-3">Diámetro</th>
                    <th className="py-2.5 px-3">Foto</th>
                    <th className="py-2.5 px-3">Causa</th>
                    <th className="py-2.5 px-3">Mediciones</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{rec.fechaDescarte}</td>
                      <td className="py-2.5 px-3 font-extrabold text-[#9E1B2C]">
                        <span className="bg-red-50 text-[#9E1B2C] border border-red-200 px-2 py-0.5 rounded-md">
                          {rec.tipoAcero}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{rec.serie}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{rec.equipo}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{rec.diametro}</td>
                      <td className="py-2.5 px-3 text-center">
                        {rec.fotoUrl ? (
                          <button
                            type="button"
                            onClick={() => setFullImageModalUrl(rec.fotoUrl || null)}
                            className="inline-flex items-center space-x-1 p-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold"
                          >
                            <Eye className="w-3 h-3 text-amber-600" />
                            <span>Ver</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={rec.causaDescarte}>
                        {rec.causaDescarte}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate font-mono" title={rec.mediciones}>
                        {rec.mediciones || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Imagen Pantalla Completa */}
      {fullImageModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black uppercase text-slate-900">Fotografía de Registro de Acero</span>
              <button
                onClick={() => setFullImageModalUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullImageModalUrl}
              alt="Fotografía Acero Completa"
              className="w-full max-h-[75vh] object-contain rounded-2xl border border-slate-200 bg-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}
