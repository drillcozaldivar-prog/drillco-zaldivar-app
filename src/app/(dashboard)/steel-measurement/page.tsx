'use client';

import React, { useState } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { Activity, Save, ArrowLeft, Check, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type PerforadoraOpcion = 'D14' | 'D15' | 'D16' | 'D10' | 'D11';

interface MeasurementValue {
  raw: string;
  detectedUnit: 'mm' | 'pulg' | 'desconocido';
  convertedStr: string;
}

export default function SteelMeasurementPage() {
  const router = useRouter();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [perforadora, setPerforadora] = useState<PerforadoraOpcion>('D14');
  const [comentarios, setComentarios] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados de Mediciones para D14, D15, D16 (1 Adaptador Inferior, 1 Barra Patera, 1 Barra Seguidora)
  const [adaptadorInferior, setAdaptadorInferior] = useState('');
  const [patera, setPatera] = useState({ superior: '', medio: '', inferior: '' });
  const [seguidora, setSeguidora] = useState({ superior: '', medio: '', inferior: '' });

  // Estados de Mediciones para D10, D11 (1 Martillo, 8 Barras)
  const [martillo, setMartillo] = useState('');
  const [barras8, setBarras8] = useState<string[]>(Array(8).fill(''));

  // Función de Detección Automática mm vs Pulgadas
  const detectUnitAndConvert = (val: string): MeasurementValue => {
    if (!val || !val.trim()) {
      return { raw: val, detectedUnit: 'desconocido', convertedStr: '' };
    }

    const cleanStr = val.trim().replace(',', '.');

    // Parsear fracciones comunes como "8 5/8", "6 1/2", "4 1/2", "7 5/8", "3 1/2"
    let numVal = NaN;
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split(' ');
      if (parts.length === 2) {
        const whole = parseFloat(parts[0]);
        const frac = parts[1].split('/');
        if (frac.length === 2) {
          numVal = whole + parseFloat(frac[0]) / parseFloat(frac[1]);
        }
      } else if (parts.length === 1) {
        const frac = parts[0].split('/');
        if (frac.length === 2) {
          numVal = parseFloat(frac[0]) / parseFloat(frac[1]);
        }
      }
    } else {
      numVal = parseFloat(cleanStr);
    }

    if (isNaN(numVal)) {
      return { raw: val, detectedUnit: 'desconocido', convertedStr: '' };
    }

    // Si el valor está en mm (rango 50 - 350 mm)
    if (numVal >= 50 && numVal <= 350) {
      const inches = (numVal / 25.4).toFixed(3);
      return {
        raw: val,
        detectedUnit: 'mm',
        convertedStr: `${numVal} mm (${inches} pulg)`,
      };
    }

    // Si el valor está en pulgadas (rango 2.0 - 15.0 pulg)
    if (numVal >= 2.0 && numVal <= 15.0) {
      const mm = (numVal * 25.4).toFixed(1);
      return {
        raw: val,
        detectedUnit: 'pulg',
        convertedStr: `${numVal}" pulg (${mm} mm)`,
      };
    }

    return { raw: val, detectedUnit: 'desconocido', convertedStr: `${val}` };
  };

  const isD14D15D16 = perforadora === 'D14' || perforadora === 'D15' || perforadora === 'D16';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const nowIso = new Date().toISOString();
    const uniqueId = `meas-${perforadora}-${Date.now()}`;

    const measurementsData = isD14D15D16
      ? {
          tipoEsquema: 'D14_D15_D16',
          adaptadorInferior: detectUnitAndConvert(adaptadorInferior),
          barraPatera: {
            superior: detectUnitAndConvert(patera.superior),
            medio: detectUnitAndConvert(patera.medio),
            inferior: detectUnitAndConvert(patera.inferior),
          },
          barraSeguidora: {
            superior: detectUnitAndConvert(seguidora.superior),
            medio: detectUnitAndConvert(seguidora.medio),
            inferior: detectUnitAndConvert(seguidora.inferior),
          },
        }
      : {
          tipoEsquema: 'D10_D11',
          martillo: detectUnitAndConvert(martillo),
          barras8: barras8.map((b) => detectUnitAndConvert(b)),
        };

    const newRecord = {
      id: uniqueId,
      fecha,
      perforadora,
      measurementsData,
      comentarios: comentarios.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Guardar en IndexedDB
    try {
      const saved = await db.appState.get('steelMeasurements_records');
      let localRecords: any[] = saved?.value || [];
      localRecords.unshift(newRecord);
      await db.appState.put({ key: 'steelMeasurements_records', value: localRecords });
    } catch (err) {
      console.warn('Error en IndexedDB:', err);
    }

    // 2. Guardar en Supabase y mantener MÁXIMO 3 MEDICIONES por perforadora (Rotación FIFO)
    try {
      const { error: insertErr } = await supabase.from('steel_measurements').insert([
        {
          id: uniqueId,
          fecha,
          perforadora,
          measurements_data: measurementsData,
          comentarios: comentarios.trim(),
          updated_at: nowIso,
        },
      ]);

      if (insertErr) {
        console.error('[Supabase Measurement Error]:', insertErr.message);
        setFeedback(`Guardado localmente. Supabase: ${insertErr.message}`);
      } else {
        setFeedback(`¡Medición de aceros guardada correctamente para Perforadora ${perforadora}!`);

        // Rotación FIFO: Mantener máximo 3 mediciones para ESTA perforadora
        const { data: perfSnapshots } = await supabase
          .from('steel_measurements')
          .select('id')
          .eq('perforadora', perforadora)
          .order('updated_at', { ascending: false });

        if (perfSnapshots && perfSnapshots.length > 3) {
          const idsToDelete = perfSnapshots.slice(3).map((r) => r.id);
          await supabase.from('steel_measurements').delete().in('id', idsToDelete);
          console.log(`[Supabase Cleanup] Mantenidas las 3 mediciones más recientes para perforadora ${perforadora}.`);
        }
      }
    } catch {
      setFeedback('Guardado localmente en IndexedDB (Modo Offline)');
    }

    setTimeout(() => setFeedback(null), 4000);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Botón Volver y Título */}
      <div className="flex items-center space-x-3">
        <Link href="/diameters" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Control de Diámetros</h1>
          <p className="text-xs text-slate-500">Módulo técnico de registro de mediciones de aceros</p>
        </div>
      </div>

      {/* Mensaje de Feedback */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Respaldo Automático</span>
        </div>
      )}

      {/* Tarjeta 1: MEDICIÓN DE ACEROS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-2">
        <div className="flex items-center space-x-3 text-slate-900">
          <Activity className="w-6 h-6 text-[#9E1B2C]" />
          <h2 className="text-xl font-extrabold tracking-wide uppercase">MEDICIÓN DE ACEROS</h2>
        </div>
        <div className="h-1 bg-amber-400 w-full rounded-full"></div>
        <p className="text-xs text-slate-500 pt-1">Registre las mediciones de los aceros</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tarjeta 2: INFORMACIÓN GENERAL */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <FileText className="w-5 h-5 text-[#9E1B2C]" />
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">INFORMACIÓN GENERAL</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FECHA */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">FECHA</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm"
              />
            </div>

            {/* PERFORADORA (Desplegable D14, D15, D16, D10, D11) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">PERFORADORA</label>
              <select
                value={perforadora}
                onChange={(e) => setPerforadora(e.target.value as PerforadoraOpcion)}
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
        </div>

        {/* ========================================================================= */}
        {/* ESQUEMA A: PERFORADORAS D14, D15 y D16 (1 Adaptador, 1 Patera, 1 Seguidora) */}
        {/* ========================================================================= */}
        {isD14D15D16 ? (
          <div className="space-y-6">
            {/* 1. ADAPTADOR INFERIOR (1 medición: MEDIO) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                <h3 className="text-sm font-extrabold uppercase text-slate-900">ADAPTADOR INFERIOR</h3>
              </div>
              <div className="h-0.5 bg-amber-400 w-full rounded-full"></div>

              <div className="max-w-xs space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">MEDIO (MM / PULG)</label>
                <input
                  type="text"
                  placeholder="Ej. 8 5/8"
                  value={adaptadorInferior}
                  onChange={(e) => setAdaptadorInferior(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
                {detectUnitAndConvert(adaptadorInferior).convertedStr && (
                  <p className="text-[10px] font-bold text-emerald-700 font-mono pt-0.5">
                    ✓ Detectado: {detectUnitAndConvert(adaptadorInferior).convertedStr}
                  </p>
                )}
              </div>
            </div>

            {/* 2. BARRA PATERA (3 mediciones: SUPERIOR, MEDIO, INFERIOR) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">2</span>
                <h3 className="text-sm font-extrabold uppercase text-slate-900">BARRA PATERA</h3>
              </div>
              <div className="h-0.5 bg-amber-400 w-full rounded-full"></div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">SUPERIOR</label>
                  <input
                    type="text"
                    placeholder="Ej. 8 5/8"
                    value={patera.superior}
                    onChange={(e) => setPatera({ ...patera, superior: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                  {detectUnitAndConvert(patera.superior).convertedStr && (
                    <p className="text-[10px] font-bold text-emerald-700 font-mono">
                      ✓ {detectUnitAndConvert(patera.superior).convertedStr}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">MEDIO</label>
                  <input
                    type="text"
                    placeholder="Ej. 8 5/8"
                    value={patera.medio}
                    onChange={(e) => setPatera({ ...patera, medio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                  {detectUnitAndConvert(patera.medio).convertedStr && (
                    <p className="text-[10px] font-bold text-emerald-700 font-mono">
                      ✓ {detectUnitAndConvert(patera.medio).convertedStr}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-red-600 uppercase">INFERIOR</label>
                  <input
                    type="text"
                    placeholder="Ej. 8 5/8"
                    value={patera.inferior}
                    onChange={(e) => setPatera({ ...patera, inferior: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                  {detectUnitAndConvert(patera.inferior).convertedStr && (
                    <p className="text-[10px] font-bold text-emerald-700 font-mono">
                      ✓ {detectUnitAndConvert(patera.inferior).convertedStr}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. BARRA SEGUIDORA (3 mediciones: SUPERIOR, MEDIO, INFERIOR) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">3</span>
                <h3 className="text-sm font-extrabold uppercase text-slate-900">BARRA SEGUIDORA</h3>
              </div>
              <div className="h-0.5 bg-amber-400 w-full rounded-full"></div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">SUPERIOR</label>
                  <input
                    type="text"
                    placeholder="Ej. 8 5/8"
                    value={seguidora.superior}
                    onChange={(e) => setSeguidora({ ...seguidora, superior: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                  {detectUnitAndConvert(seguidora.superior).convertedStr && (
                    <p className="text-[10px] font-bold text-emerald-700 font-mono">
                      ✓ {detectUnitAndConvert(seguidora.superior).convertedStr}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">MEDIO</label>
                  <input
                    type="text"
                    placeholder="Ej. 8 5/8"
                    value={seguidora.medio}
                    onChange={(e) => setSeguidora({ ...seguidora, medio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                  {detectUnitAndConvert(seguidora.medio).convertedStr && (
                    <p className="text-[10px] font-bold text-emerald-700 font-mono">
                      ✓ {detectUnitAndConvert(seguidora.medio).convertedStr}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">INFERIOR</label>
                  <input
                    type="text"
                    placeholder="Ej. 8 5/8"
                    value={seguidora.inferior}
                    onChange={(e) => setSeguidora({ ...seguidora, inferior: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                  {detectUnitAndConvert(seguidora.inferior).convertedStr && (
                    <p className="text-[10px] font-bold text-emerald-700 font-mono">
                      ✓ {detectUnitAndConvert(seguidora.inferior).convertedStr}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ESQUEMA B: PERFORADORAS D10 y D11 (Martillo 1 med + 8 Barras 1 med c/u) */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* 1. MARTILLO (1 medición) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                <h3 className="text-sm font-extrabold uppercase text-slate-900">MARTILLO</h3>
              </div>
              <div className="h-0.5 bg-amber-400 w-full rounded-full"></div>

              <div className="max-w-xs space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">MEDICIÓN MARTILLO (MM / PULG)</label>
                <input
                  type="text"
                  placeholder="Ej. 6 1/2 o 165"
                  value={martillo}
                  onChange={(e) => setMartillo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
                {detectUnitAndConvert(martillo).convertedStr && (
                  <p className="text-[10px] font-bold text-emerald-700 font-mono pt-0.5">
                    ✓ Detectado: {detectUnitAndConvert(martillo).convertedStr}
                  </p>
                )}
              </div>
            </div>

            {/* 2 a 9. BARRAS 1 A 8 (1 medición por barra) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">2-9</span>
                <h3 className="text-sm font-extrabold uppercase text-slate-900">MEDICIÓN DE BARRAS (BARRAS 1 A 8)</h3>
              </div>
              <div className="h-0.5 bg-amber-400 w-full rounded-full"></div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {barras8.map((bVal, idx) => (
                  <div key={idx} className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <label className="block text-[11px] font-black uppercase text-slate-700">
                      BARRA {idx + 1}
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 4 1/2 o 114"
                      value={bVal}
                      onChange={(e) => {
                        const updated = [...barras8];
                        updated[idx] = e.target.value;
                        setBarras8(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                    />
                    {detectUnitAndConvert(bVal).convertedStr && (
                      <p className="text-[9px] font-bold text-emerald-700 font-mono">
                        ✓ {detectUnitAndConvert(bVal).convertedStr}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tarjeta 3: COMENTARIOS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <FileText className="w-5 h-5 text-[#9E1B2C]" />
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">COMENTARIOS</h3>
          </div>

          <textarea
            rows={3}
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Motivo del registro, observaciones, etc."
            className="w-full bg-white border border-slate-300 rounded-2xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none shadow-sm resize-none"
          />
        </div>

        {/* Botones Inferiores: ← VOLVER | 💾 GUARDAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto bg-white hover:bg-slate-100 border-2 border-slate-400 text-slate-700 font-extrabold px-8 py-3.5 rounded-2xl text-sm transition-all shadow-sm cursor-pointer text-center"
          >
            ← VOLVER
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto bg-[#F6C78D] hover:bg-[#F3B770] text-[#801423] font-black px-10 py-3.5 rounded-2xl flex items-center justify-center space-x-2 text-sm shadow-md transition-all cursor-pointer"
          >
            <Save className="w-5 h-5 text-[#801423]" />
            <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
