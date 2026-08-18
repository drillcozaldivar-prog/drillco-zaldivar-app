'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { ClipboardCheck, Save, ArrowLeft, Check, History, Download, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type PerforadoraOpcion = 'D14' | 'D15' | 'D16' | 'D10' | 'D11';
export type TipoPerforacion = 'Rotary' | 'DTH';
export type EstadoItem = 'Bueno' | 'Regular' | 'Malo' | 'NA';

export interface InspectionItemState {
  name: string;
  status: EstadoItem;
  obs: string;
}

export interface EquipmentChecklistRecord {
  id: string;
  fecha: string;
  tipo: TipoPerforacion;
  perforadora: PerforadoraOpcion;
  horometro: string;
  operador: string;
  acerosEnEquipo: string;
  obsAceros: string;
  items: InspectionItemState[];
  createdAt: string;
  updatedAt: string;
}

// Lista Oficial Completa de 29 Ítems de Inspección (Extraída de la plantilla oficial)
const CHECKLIST_ITEMS_LIST = [
  'Manómetro Presión Rotación',
  'Manómetro Presión Pull Down',
  'Manómetro Presión Aire',
  'Sistema Modular',
  'Indicador RPM',
  'Carrusel',
  'Tazones',
  'Rod Support',
  'Rod Catcher',
  'Cilindros Estabilizadores',
  'Manillas de Control',
  'Llave Corte',
  'Llave Caimán',
  'Mordazas',
  'Estrella',
  'Alineación y ajuste de Cabezal',
  'Topes Mecánicos Superiores',
  'Piola huinche',
  'Contrapeso huinche',
  'Gancho huinche',
  'Sistema seguridad barra en pozo',
  'Olla Corta Tricono 10 5/8',
  'Olla Corta Tricono 12 1/4',
  'Gorro porta Tricono',
  'Pandeo de Barras (Fugas)',
  'Deck Hold',
  'Fusibles de Seguridad',
  'Sello Wiper',
  'Barandas seguridad',
];

export default function ChecklistPage() {
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');

  // Form Header State
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<TipoPerforacion>('Rotary');
  const [perforadora, setPerforadora] = useState<PerforadoraOpcion>('D14');
  const [horometro, setHorometro] = useState('');
  const [operador, setOperador] = useState('');
  const [acerosEnEquipo, setAcerosEnEquipo] = useState('2');
  const [obsAceros, setObsAceros] = useState('');

  // Items State (Default all 'Bueno')
  const [itemsState, setItemsState] = useState<InspectionItemState[]>(
    CHECKLIST_ITEMS_LIST.map((name) => ({ name, status: 'Bueno', obs: '' }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // History State
  const [historyRecords, setHistoryRecords] = useState<EquipmentChecklistRecord[]>([]);
  const [historyFilterPerf, setHistoryFilterPerf] = useState<string>('TODAS');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

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

  const handleItemStatusChange = (index: number, status: EstadoItem) => {
    const updated = [...itemsState];
    updated[index].status = status;
    setItemsState(updated);
  };

  const handleItemObsChange = (index: number, obs: string) => {
    const updated = [...itemsState];
    updated[index].obs = obs;
    setItemsState(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operador.trim()) {
      alert('Por favor ingrese el nombre del Operador.');
      return;
    }
    if (!horometro.trim()) {
      alert('Por favor ingrese el Horómetro.');
      return;
    }

    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const uniqueId = `chk-${Date.now()}`;

    const newRecord: EquipmentChecklistRecord = {
      id: uniqueId,
      fecha,
      tipo,
      perforadora,
      horometro: horometro.trim(),
      operador: operador.trim(),
      acerosEnEquipo,
      obsAceros: obsAceros.trim(),
      items: itemsState,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Guardar en IndexedDB
    try {
      const saved = await db.appState.get('equipmentChecklists_records');
      let localRecords: EquipmentChecklistRecord[] = saved?.value || [];
      localRecords.unshift(newRecord);
      await db.appState.put({ key: 'equipmentChecklists_records', value: localRecords });
    } catch (err) {
      console.warn('Error en IndexedDB:', err);
    }

    // 2. Guardar en Supabase
    try {
      const { error } = await supabase.from('equipment_checklists').insert([
        {
          id: uniqueId,
          fecha,
          tipo,
          perforadora,
          horometro: parseFloat(horometro.trim()) || 0,
          operador: operador.trim(),
          aceros_en_equipo: parseInt(acerosEnEquipo) || 1,
          obs_aceros: obsAceros.trim(),
          items_data: itemsState,
          updated_at: nowIso,
        },
      ]);

      if (error) {
        console.error('[Supabase Checklist Error]:', error.message);
        setFeedback(`Guardado localmente. Supabase: ${error.message}`);
      } else {
        setFeedback('¡Checklist de equipo registrado y respaldado en la nube!');
      }
    } catch {
      setFeedback('Guardado localmente en IndexedDB (Modo Offline)');
    }

    // Actualizar historial local
    setHistoryRecords((prev) => [newRecord, ...prev]);

    // Resetear formulario manteniendo fecha y operador
    setHorometro('');
    setObsAceros('');
    setItemsState(CHECKLIST_ITEMS_LIST.map((name) => ({ name, status: 'Bueno', obs: '' })));

    setTimeout(() => setFeedback(null), 4000);
    setIsSaving(false);
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('equipment_checklists')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const mapped: EquipmentChecklistRecord[] = data.map((d: any) => ({
          id: d.id,
          fecha: d.fecha,
          tipo: d.tipo as TipoPerforacion,
          perforadora: d.perforadora as PerforadoraOpcion,
          horometro: String(d.horometro),
          operador: d.operador,
          acerosEnEquipo: String(d.aceros_en_equipo || '1'),
          obsAceros: d.obs_aceros || '',
          items: d.items_data || [],
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        setHistoryRecords(mapped);
        await db.appState.put({ key: 'equipmentChecklists_records', value: mapped });
      } else {
        const saved = await db.appState.get('equipmentChecklists_records');
        if (saved?.value) setHistoryRecords(saved.value);
      }
    } catch {
      const saved = await db.appState.get('equipmentChecklists_records');
      if (saved?.value) setHistoryRecords(saved.value);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Generador de PDF de Checklist de 2 Páginas matching oficial
  const generateChecklistPDF = (record: EquipmentChecklistRecord) => {
    const doc = new jsPDF();

    // Encabezado DRILLCO
    doc.setFillColor(158, 27, 44); // #9E1B2C
    doc.rect(0, 0, 210, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CHECKLIST DE EQUIPOS', 14, 15);

    doc.setFontSize(10);
    doc.text('DRILLCO® - Faena Zaldívar', 150, 15);

    // Tabla Metadatos
    autoTable(doc, {
      startY: 28,
      head: [['Fecha', 'Tipo', 'Operador', 'Perforadora', 'Horómetro', 'Aceros en Equipo']],
      body: [
        [
          formatDateDDMMYYYY(record.fecha),
          record.tipo,
          record.operador,
          record.perforadora,
          record.horometro,
          record.acerosEnEquipo,
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, halign: 'center' },
    });

    // Observaciones de Aceros
    let currentY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Observaciones de Aceros: ${record.obsAceros || 'Sin observaciones'}`, 14, currentY);

    // Tabla de Inspección
    const tableBody = record.items.map((item) => [item.name, item.status, item.obs || '']);

    autoTable(doc, {
      startY: currentY + 6,
      head: [['Ítem Inspeccionado', 'Estado', 'Observación']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 30 },
        2: { cellWidth: 82 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const val = data.cell.raw;
          if (val === 'Bueno') data.cell.styles.textColor = [16, 185, 129];
          else if (val === 'Regular') data.cell.styles.textColor = [217, 119, 6];
          else if (val === 'Malo') data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [100, 116, 139];
        }
      },
    });

    // Pie de página oficial
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `DRILLCO Headquarters Chile - Inspección Diaria de Perforadoras - Página ${i} de ${pageCount}`,
        14,
        285
      );
    }

    doc.save(`Checklist_Perforadora_${record.perforadora}_${record.fecha}.pdf`);
  };

  const filteredHistory = historyRecords.filter((r) =>
    historyFilterPerf === 'TODAS' ? true : r.perforadora === historyFilterPerf
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botón Volver y Título */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Módulos de Gestión Técnica</h1>
          <p className="text-xs text-slate-500">Inspección Diaria y Mantenimiento de Perforadoras</p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Respaldo Automático</span>
        </div>
      )}

      {/* Tarjeta Encabezado Principal */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-slate-900">
            <ClipboardCheck className="w-7 h-7 text-[#9E1B2C]" />
            <div>
              <h2 className="text-xl font-extrabold tracking-wide uppercase">Checklist de Equipos</h2>
              <p className="text-xs text-slate-500">Inspección Diaria de Perforadoras</p>
            </div>
          </div>

          {/* Pestañas de Navegación (Nuevo Checklist vs Historial y Reportes) */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'NEW'
                  ? 'bg-[#9E1B2C] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Nuevo Checklist</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-[#9E1B2C] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial y Reportes</span>
            </button>
          </div>
        </div>

        <div className="h-1 bg-amber-400 w-full rounded-full"></div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: NUEVO CHECKLIST */}
      {/* ========================================================================= */}
      {activeTab === 'NEW' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selector de Tipo (ROTARY / DTH) */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('Rotary')}
                className={`py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
                  tipo === 'Rotary'
                    ? 'bg-[#9E1B2C] text-white shadow-lg shadow-red-900/20'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                ROTARY
              </button>

              <button
                type="button"
                onClick={() => setTipo('DTH')}
                className={`py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
                  tipo === 'DTH'
                    ? 'bg-[#9E1B2C] text-white shadow-lg shadow-red-900/20'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                DTH
              </button>
            </div>
          </div>

          {/* Información General del Formulario */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <FileText className="w-5 h-5 text-[#9E1B2C]" />
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">INFORMACIÓN GENERAL</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Fecha</label>
                <input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>

              {/* Perforadora */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Perforadora</label>
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

              {/* Horómetro * */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Horómetro *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="0.0"
                  value={horometro}
                  onChange={(e) => setHorometro(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 font-bold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>

              {/* Operador * */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Operador *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre de Operador"
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>

              {/* Aceros en Equipo */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Aceros en Equipo</label>
                <select
                  value={acerosEnEquipo}
                  onChange={(e) => setAcerosEnEquipo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none cursor-pointer"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Obs. Aceros */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Obs. Aceros</label>
                <input
                  type="text"
                  placeholder="Observaciones de aceros..."
                  value={obsAceros}
                  onChange={(e) => setObsAceros(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* LISTA COMPLETA DE 29 ÍTEMS DE INSPECCIÓN */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 px-2">
              Ítems de Inspección Diaria (29 Componentes):
            </h3>

            <div className="space-y-4">
              {itemsState.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-900">{item.name}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                  </div>

                  {/* Botones de Estado: Bueno, Regular, Malo, NA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(idx, 'Bueno')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                        item.status === 'Bueno'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50'
                      }`}
                    >
                      Bueno
                    </button>

                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(idx, 'Regular')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                        item.status === 'Regular'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-amber-50'
                      }`}
                    >
                      Regular
                    </button>

                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(idx, 'Malo')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                        item.status === 'Malo'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-red-50'
                      }`}
                    >
                      Malo
                    </button>

                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(idx, 'NA')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                        item.status === 'NA'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      NA
                    </button>
                  </div>

                  {/* Input de Observaciones del Ítem */}
                  <input
                    type="text"
                    value={item.obs}
                    onChange={(e) => handleItemObsChange(idx, e.target.value)}
                    placeholder="Observaciones..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-red-900/20 transition-all text-sm cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'Guardando Checklist...' : 'Guardar Checklist de Equipo'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: HISTORIAL Y REPORTES */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 uppercase">Últimos Checklists Registrados</h3>
              <p className="text-xs text-slate-500">Listado histórico de inspecciones de perforadoras</p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={historyFilterPerf}
                onChange={(e) => setHistoryFilterPerf(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              >
                <option value="TODAS">Todas las Perforadoras</option>
                <option value="D14">D14</option>
                <option value="D15">D15</option>
                <option value="D16">D16</option>
                <option value="D10">D10</option>
                <option value="D11">D11</option>
              </select>

              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all"
                title="Refrescar Historial"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin text-[#9E1B2C]' : ''}`} />
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              No se han encontrado registros de checklist guardados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-800 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">Perforadora</th>
                    <th className="py-3 px-3">Operador</th>
                    <th className="py-3 px-3">Horómetro</th>
                    <th className="py-3 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-600">{formatDateDDMMYYYY(rec.fecha)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{rec.tipo}</td>
                      <td className="py-3 px-3 font-extrabold text-[#9E1B2C]">{rec.perforadora}</td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">{rec.operador}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{rec.horometro}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => generateChecklistPDF(rec)}
                          className="bg-[#1E293B] hover:bg-slate-900 text-white font-extrabold px-3 py-1.5 rounded-lg flex items-center space-x-1 text-[11px] mx-auto shadow-sm transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
