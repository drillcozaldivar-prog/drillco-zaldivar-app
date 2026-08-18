'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { Activity, ArrowLeft, Ruler, RefreshCw, X, Calendar, Download, Edit3 } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type PerforadoraOpcion = 'D14' | 'D15' | 'D16' | 'D10' | 'D11';

// Definición de Umbrales Técnicos DRILLCO
interface UmbralDef {
  label: string;
  initialInches: number;
  initialMm: number;
  discardInches: number;
  discardMm: number;
}

const UMBRALES: Record<string, UmbralDef> = {
  'D14_D15_D16': {
    label: 'D14, D15, D16 (Componentes)',
    initialInches: 8.625, // 8 5/8"
    initialMm: 219.08,
    discardInches: 7.625, // 7 5/8"
    discardMm: 193.68,
  },
  'D10_D11_BARRAS': {
    label: 'D10, D11 (Barras 1-8)',
    initialInches: 4.5, // 4 1/2"
    initialMm: 114.3,
    discardInches: 4.25, // 4 1/4"
    discardMm: 107.95,
  },
  'D10_D11_MARTILLO': {
    label: 'D10, D11 (Martillo)',
    initialInches: 6.5, // 6 1/2"
    initialMm: 165.1,
    discardInches: 5.125, // 5 1/8"
    discardMm: 130.18,
  },
};

interface PerforadoraHealth {
  perforadora: PerforadoraOpcion;
  hasData: boolean;
  minHealthPercent: number; // 0 - 100%
  status: 'GREEN' | 'YELLOW' | 'RED' | 'NODATA';
  executiveStatusText: string;
  minMm: number;
  minInches: number;
  lastDate: string;
  rawMeasurementRecord?: any;
  rawChangeRecord?: any;
}

export default function DiametersPage() {
  const perfList: PerforadoraOpcion[] = ['D14', 'D15', 'D16', 'D10', 'D11'];

  const [healthMap, setHealthMap] = useState<Record<PerforadoraOpcion, PerforadoraHealth>>({
    D14: { perforadora: 'D14', hasData: false, minHealthPercent: 0, status: 'NODATA', executiveStatusText: 'SIN DATOS', minMm: 0, minInches: 0, lastDate: '' },
    D15: { perforadora: 'D15', hasData: false, minHealthPercent: 0, status: 'NODATA', executiveStatusText: 'SIN DATOS', minMm: 0, minInches: 0, lastDate: '' },
    D16: { perforadora: 'D16', hasData: false, minHealthPercent: 0, status: 'NODATA', executiveStatusText: 'SIN DATOS', minMm: 0, minInches: 0, lastDate: '' },
    D10: { perforadora: 'D10', hasData: false, minHealthPercent: 0, status: 'NODATA', executiveStatusText: 'SIN DATOS', minMm: 0, minInches: 0, lastDate: '' },
    D11: { perforadora: 'D11', hasData: false, minHealthPercent: 0, status: 'NODATA', executiveStatusText: 'SIN DATOS', minMm: 0, minInches: 0, lastDate: '' },
  });

  const [loading, setLoading] = useState(true);
  const [selectedPerfModal, setSelectedPerfModal] = useState<PerforadoraHealth | null>(null);

  // Estados editables de metros en el modal "CHEQUEO PERFORADORA"
  const [editableMetros, setEditableMetros] = useState<Record<string, string>>({
    patera: 'N/A',
    seguidora: 'N/A',
    adaptador: 'N/A',
    martillo: 'N/A',
  });

  useEffect(() => {
    loadHealthData();
  }, []);

  const formatDateDDMMYYYY = (dateStr?: string): string => {
    if (!dateStr) return '18/08/2026';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  const parseValToMm = (itemVal: any): number => {
    if (!itemVal) return 0;
    const raw = typeof itemVal === 'string' ? itemVal : itemVal.raw || '';
    if (!raw) return 0;

    const cleanStr = raw.trim().replace(',', '.');
    let numVal = NaN;

    if (cleanStr.includes('/')) {
      const parts = cleanStr.split(' ');
      if (parts.length === 2) {
        numVal = parseFloat(parts[0]) + parseFloat(parts[1].split('/')[0]) / parseFloat(parts[1].split('/')[1]);
      } else if (parts.length === 1) {
        numVal = parseFloat(parts[0].split('/')[0]) / parseFloat(parts[0].split('/')[1]);
      }
    } else {
      numVal = parseFloat(cleanStr);
    }

    if (isNaN(numVal) || numVal <= 0) return 0;
    if (numVal >= 2.0 && numVal <= 15.0) return numVal * 25.4;
    return numVal;
  };

  const renderValMmCell = (v: any) => {
    const mm = parseValToMm(v);
    if (mm <= 0) return <span className="text-slate-400 font-bold">-</span>;
    return <span className="font-extrabold text-slate-900">{mm.toFixed(1)} mm</span>;
  };

  const calcLifePercent = (currentMm: number, initialMm: number, discardMm: number): number => {
    if (currentMm <= 0) return 100;
    if (currentMm <= discardMm) return 0;
    if (currentMm >= initialMm) return 100;
    const pct = ((currentMm - discardMm) / (initialMm - discardMm)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  };

  const loadHealthData = async () => {
    setLoading(true);
    const updatedHealth: Record<PerforadoraOpcion, PerforadoraHealth> = { ...healthMap };

    try {
      const { data: cloudMeas } = await supabase
        .from('steel_measurements')
        .select('*')
        .order('updated_at', { ascending: false });

      const { data: cloudChanges } = await supabase
        .from('steel_changes')
        .select('*')
        .order('updated_at', { ascending: false });

      let measRecords: any[] = cloudMeas || [];
      let changeRecords: any[] = cloudChanges || [];

      if (!cloudMeas) {
        const savedM = await db.appState.get('steelMeasurements_records');
        if (savedM?.value) measRecords = savedM.value;
      }
      if (!cloudChanges) {
        const savedC = await db.appState.get('steelChanges_records_v2');
        if (savedC?.value) changeRecords = savedC.value;
      }

      perfList.forEach((perf) => {
        const perfMeas = measRecords.find((r) => r.perforadora === perf);
        const perfChange = changeRecords.find((r) => r.perforadora === perf);

        if (!perfMeas) {
          updatedHealth[perf] = {
            perforadora: perf,
            hasData: false,
            minHealthPercent: 0,
            status: 'NODATA',
            executiveStatusText: 'SIN DATOS',
            minMm: 0,
            minInches: 0,
            lastDate: '',
            rawChangeRecord: perfChange,
          };
          return;
        }

        const dataObj = perfMeas.measurements_data || perfMeas.measurementsData || {};
        let minLifePct = 100;
        let lowestMm = 999;

        if (perf === 'D14' || perf === 'D15' || perf === 'D16') {
          const umb = UMBRALES['D14_D15_D16'];
          const valList = [
            dataObj.adaptadorInferior,
            dataObj.barraPatera?.superior,
            dataObj.barraPatera?.medio,
            dataObj.barraPatera?.inferior,
            dataObj.barraSeguidora?.superior || dataObj.barraSeguidora1?.superior,
            dataObj.barraSeguidora?.medio || dataObj.barraSeguidora1?.medio,
            dataObj.barraSeguidora?.inferior || dataObj.barraSeguidora1?.inferior,
          ];

          valList.forEach((v) => {
            const mm = parseValToMm(v);
            if (mm > 0) {
              if (mm < lowestMm) lowestMm = mm;
              const pct = calcLifePercent(mm, umb.initialMm, umb.discardMm);
              if (pct < minLifePct) minLifePct = pct;
            }
          });
        } else {
          const umbMart = UMBRALES['D10_D11_MARTILLO'];
          const umbBarr = UMBRALES['D10_D11_BARRAS'];

          const martMm = parseValToMm(dataObj.martillo);
          if (martMm > 0) {
            if (martMm < lowestMm) lowestMm = martMm;
            const pct = calcLifePercent(martMm, umbMart.initialMm, umbMart.discardMm);
            if (pct < minLifePct) minLifePct = pct;
          }

          const barras: any[] = dataObj.barras8 || [];
          barras.forEach((b) => {
            const bMm = parseValToMm(b);
            if (bMm > 0) {
              if (bMm < lowestMm) lowestMm = bMm;
              const pct = calcLifePercent(bMm, umbBarr.initialMm, umbBarr.discardMm);
              if (pct < minLifePct) minLifePct = pct;
            }
          });
        }

        if (lowestMm === 999) lowestMm = 0;

        let st: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
        let execText = 'Operativo';

        if (minLifePct < 33) {
          st = 'RED';
          execText = 'Alerta - Bajo Diámetro / Reemplazo Requerido';
        } else if (minLifePct <= 66) {
          st = 'YELLOW';
          execText = 'Precaución - Desgaste Moderado';
        }

        updatedHealth[perf] = {
          perforadora: perf,
          hasData: true,
          minHealthPercent: minLifePct,
          status: st,
          executiveStatusText: execText,
          minMm: parseFloat(lowestMm.toFixed(1)),
          minInches: parseFloat((lowestMm / 25.4).toFixed(3)),
          lastDate: perfMeas.fecha || '',
          rawMeasurementRecord: perfMeas,
          rawChangeRecord: perfChange,
        };
      });

      setHealthMap(updatedHealth);
    } catch (e) {
      console.warn('Error cargando estados de diámetro:', e);
    } finally {
      setLoading(false);
    }
  };

  // Generación de PDF Oficial 1 Hoja: "CHEQUEO PERFORADORA"
  const generateCheckPDF = (info: PerforadoraHealth) => {
    const doc = new jsPDF();

    // Fondo Blanco y Encabezado Corporativo DRILLCO
    doc.setFillColor(158, 27, 44); // #9E1B2C
    doc.rect(0, 0, 210, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CHEQUEO PERFORADORA', 14, 15);

    doc.setFontSize(10);
    doc.text(`DRILLCO® - Faena Zaldívar`, 150, 15);

    // Caja Metadata Superior
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 28, 182, 18, 3, 3, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text('MEDICION DE BARRAS Y ADAPTADOR DE TRICONO - ROTARY DRILLING TOOLS', 18, 36);
    doc.text(`Fecha: ${formatDateDDMMYYYY(info.lastDate)}`, 130, 36);
    doc.text(`Perforadora: ${info.perforadora}`, 168, 36);

    // Caja Estado Ejecutivo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (info.status === 'GREEN') doc.setTextColor(16, 185, 129);
    else if (info.status === 'YELLOW') doc.setTextColor(217, 119, 6);
    else if (info.status === 'RED') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(100, 116, 139);

    doc.roundedRect(14, 50, 182, 14, 3, 3, 'S');
    doc.text(`Estado Ejecutivo: ${info.executiveStatusText} (${info.minHealthPercent}% Remanente)`, 18, 59);

    // Tabla 1: Diámetros
    const dataObj = info.rawMeasurementRecord?.measurements_data || info.rawMeasurementRecord?.measurementsData || {};
    const isD14Type = info.perforadora === 'D14' || info.perforadora === 'D15' || info.perforadora === 'D16';

    const diamTableHead = isD14Type
      ? [['Medidas', 'Barra Patera', 'Barra Seguidora', 'Adaptador Inferior']]
      : [['Medidas', 'Martillo', 'Barras (1-4)', 'Barras (5-8)']];

    const parseMmStr = (v: any) => {
      const mm = parseValToMm(v);
      return mm > 0 ? `${mm.toFixed(1)} mm` : '-';
    };

    const diamTableBody = isD14Type
      ? [
          ['Pin / Superior', parseMmStr(dataObj.barraPatera?.superior), parseMmStr(dataObj.barraSeguidora?.superior || dataObj.barraSeguidora1?.superior), '-'],
          ['Centro / Medio', parseMmStr(dataObj.barraPatera?.medio), parseMmStr(dataObj.barraSeguidora?.medio || dataObj.barraSeguidora1?.medio), parseMmStr(dataObj.adaptadorInferior)],
          ['Box / Inferior', parseMmStr(dataObj.barraPatera?.inferior), parseMmStr(dataObj.barraSeguidora?.inferior || dataObj.barraSeguidora1?.inferior), '-'],
        ]
      : [
          ['Medición', parseMmStr(dataObj.martillo), 'Ver detalle 1-4', 'Ver detalle 5-8'],
        ];

    autoTable(doc, {
      startY: 68,
      head: diamTableHead,
      body: diamTableBody,
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, halign: 'center' },
    });

    // Tabla 2: Fechas de Cambio y Porcentaje Remanente
    const lastChangeFecha = formatDateDDMMYYYY(info.rawChangeRecord?.fecha);
    const changeTableHead = [['Aceros', 'Metros Perforados', 'Fecha Instalación', 'Porcentaje Remanente']];

    const changeTableBody = isD14Type
      ? [
          ['Barra Patera', editableMetros.patera || 'N/A', lastChangeFecha, `${calcLifePercent(parseValToMm(dataObj.barraPatera?.medio), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%`],
          ['Barra Seguidora', editableMetros.seguidora || 'N/A', lastChangeFecha, `${calcLifePercent(parseValToMm(dataObj.barraSeguidora?.medio || dataObj.barraSeguidora1?.medio), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%`],
          ['Adaptador Inferior', editableMetros.adaptador || 'N/A', lastChangeFecha, `${calcLifePercent(parseValToMm(dataObj.adaptadorInferior), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%`],
        ]
      : [
          ['Martillo PUMA', editableMetros.martillo || 'N/A', lastChangeFecha, `${calcLifePercent(parseValToMm(dataObj.martillo), UMBRALES['D10_D11_MARTILLO'].initialMm, UMBRALES['D10_D11_MARTILLO'].discardMm)}%`],
          ['Barras 1 a 8', editableMetros.patera || 'N/A', lastChangeFecha, `${info.minHealthPercent}%`],
        ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: changeTableHead,
      body: changeTableBody,
      theme: 'grid',
      headStyles: { fillColor: [158, 27, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, halign: 'center' },
    });

    // Pie de página oficial
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DRILLCO Headquarters Chile - Informe Ejecutivo de Chequeo Perforadora - www.drillco.com', 14, 285);

    doc.save(`Chequeo_Perforadora_${info.perforadora}_${info.lastDate || '2026'}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botón Volver y Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">CONTROL DE DIÁMETROS</h1>
            <p className="text-xs text-slate-500">Estado de desgaste y vida útil por perforadora</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadHealthData}
            title="Refrescar datos de la Nube"
            className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#9E1B2C]' : ''}`} />
          </button>

          {/* Botón Requerido: Medición de aceros */}
          <Link
            href="/steel-measurement"
            className="bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold px-5 py-2.5 rounded-xl flex items-center space-x-2 text-xs shadow-md transition-all cursor-pointer"
          >
            <Ruler className="w-4 h-4" />
            <span>Medición de aceros</span>
          </Link>
        </div>
      </div>

      {/* TARJETAS SUPERIORES: ESTADO (VIDA ÚTIL) Y UMBRALES DE DESCARTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: ESTADO (VIDA ÚTIL) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            ESTADO (VIDA ÚTIL)
          </h2>
          <div className="space-y-2 text-xs font-bold">
            <div className="flex items-center space-x-2 text-emerald-700">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>VERDE: &gt; 66% (Operativo / OK)</span>
            </div>
            <div className="flex items-center space-x-2 text-amber-700">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 inline-block"></span>
              <span>AMARILLO: 33% - 66% (Precaución - Desgaste Moderado)</span>
            </div>
            <div className="flex items-center space-x-2 text-red-700">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 inline-block"></span>
              <span>ROJO: &lt; 33% (Alerta - Bajo Diámetro / Reemplazo)</span>
            </div>
          </div>
        </div>

        {/* Card 2: UMBRALES DESCARTE */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            UMBRALES DESCARTE
          </h2>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
            <p>
              <strong className="text-slate-800">D14, D15, D16:</strong> 8 5/8&quot; (219.1mm) → 7 5/8&quot; (193.7mm)
            </p>
            <p>
              <strong className="text-slate-800">D10, D11 (Barras 1-8):</strong> 4 1/2&quot; (114.3mm) → 4 1/4&quot; (108.0mm)
            </p>
            <p>
              <strong className="text-slate-800">D10, D11 (Martillo):</strong> 6 1/2&quot; (165.1mm) → 5 1/8&quot; (130.2mm)
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: ESTADO POR PERFORADORA */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
          <Activity className="w-5 h-5 text-[#9E1B2C]" />
          <h2 className="text-base font-extrabold text-slate-900 uppercase">ESTADO POR PERFORADORA</h2>
        </div>

        <div className="h-1 bg-amber-400 w-full rounded-full -mt-3"></div>

        {/* Grid de las 5 Perforadoras */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pt-2">
          {perfList.map((perfKey) => {
            const info = healthMap[perfKey];

            let cardBg = 'bg-slate-50 border-slate-200 text-slate-400';
            let titleColor = 'text-slate-700';
            let badgeBg = 'bg-slate-200 text-slate-600';
            let barBg = 'bg-slate-400';

            if (info.status === 'GREEN') {
              cardBg = 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500';
              titleColor = 'text-emerald-900';
              badgeBg = 'bg-emerald-100 text-emerald-800';
              barBg = 'bg-emerald-600';
            } else if (info.status === 'YELLOW') {
              cardBg = 'bg-amber-50/80 border-amber-300 hover:border-amber-500';
              titleColor = 'text-amber-900';
              badgeBg = 'bg-amber-100 text-amber-900';
              barBg = 'bg-amber-500';
            } else if (info.status === 'RED') {
              cardBg = 'bg-red-50/80 border-red-300 hover:border-red-500';
              titleColor = 'text-red-950';
              badgeBg = 'bg-red-100 text-red-800';
              barBg = 'bg-red-600';
            }

            return (
              <button
                key={perfKey}
                onClick={() => setSelectedPerfModal(info)}
                className={`rounded-3xl border-2 p-6 flex flex-col items-center justify-between text-center transition-all shadow-sm hover:shadow-md cursor-pointer min-h-[190px] ${cardBg}`}
              >
                <span className={`text-3xl font-black ${titleColor}`}>{perfKey}</span>

                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${badgeBg} truncate max-w-full`}>
                  {info.status === 'GREEN' ? 'OPERATIVO' : info.status === 'YELLOW' ? 'PRECAUCIÓN' : info.status === 'RED' ? 'ALERTA / CRÍTICO' : 'SIN DATOS'}
                </span>

                {info.hasData ? (
                  <div className="w-full space-y-2 pt-2">
                    <div className="text-center font-mono">
                      <span className="text-lg font-black text-slate-900">{info.minMm} <span className="text-xs font-normal text-slate-500">mm</span></span>
                      <span className="block text-[10px] text-slate-500 font-bold">{info.minInches}&quot; pulg</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barBg}`}
                        style={{ width: `${info.minHealthPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 block text-right font-mono">
                      {info.minHealthPercent}%
                    </span>
                  </div>
                ) : (
                  <div className="py-4 text-xs font-semibold text-slate-400">
                    -
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* VENTANA MODAL REQUERIDA: CHEQUEO PERFORADORA (Formato Hoja Completa) */}
      {selectedPerfModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-fade-in my-auto max-h-[96vh] overflow-y-auto">
            {/* Header del Chequeo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-extrabold text-[#9E1B2C] uppercase">CHEQUEO PERFORADORA</span>
                  <span className="bg-slate-100 text-slate-800 text-xs font-black px-2.5 py-0.5 rounded-lg border border-slate-300">
                    {selectedPerfModal.perforadora}
                  </span>
                </div>
                <p className="text-xs text-slate-500 pt-0.5">MEDICION DE BARRAS Y ADAPTADOR DE TRICONO - ROTARY DRILLING TOOLS</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => generateCheckPDF(selectedPerfModal)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl flex items-center space-x-2 text-xs shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar PDF</span>
                </button>
                <button
                  onClick={() => setSelectedPerfModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Fecha y Estado Ejecutivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Fecha Control:</span>
                <span className="text-xs font-mono font-black text-slate-900">{formatDateDDMMYYYY(selectedPerfModal.lastDate)}</span>
              </div>

              <div className={`p-4 rounded-2xl border flex items-center justify-between font-bold text-xs ${
                selectedPerfModal.status === 'GREEN'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : selectedPerfModal.status === 'YELLOW'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <span>Estado Ejecutivo:</span>
                <span className="font-extrabold uppercase">{selectedPerfModal.executiveStatusText}</span>
              </div>
            </div>

            {/* ESQUEMA VECTORIAL DE COMPONENTES CON PORCENTAJE */}
            <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                Esquema de Salud Visual de Aceros
              </h4>

              {selectedPerfModal.perforadora === 'D14' || selectedPerfModal.perforadora === 'D15' || selectedPerfModal.perforadora === 'D16' ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  {/* BARRA 1 (PATERA) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col items-center">
                    <span className="text-xs font-black uppercase text-slate-800">BARRA 1 (PATERA)</span>
                    <div className="w-12 h-36 bg-slate-700 rounded-lg flex flex-col justify-between p-1 relative border-2 border-slate-800 shadow-inner">
                      <div className="w-full h-3 bg-amber-400 rounded-sm"></div>
                      <div className="w-full h-3 bg-amber-400 rounded-sm"></div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-mono">
                      {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraPatera?.medio), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%
                    </span>
                  </div>

                  {/* BARRA 2 (SEGUIDORA) */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col items-center">
                    <span className="text-xs font-black uppercase text-slate-800">BARRA SEGUIDORA</span>
                    <div className="w-12 h-36 bg-slate-700 rounded-lg flex flex-col justify-between p-1 relative border-2 border-slate-800 shadow-inner">
                      <div className="w-full h-3 bg-amber-400 rounded-sm"></div>
                      <div className="w-full h-3 bg-amber-400 rounded-sm"></div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-mono">
                      {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora?.medio || selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora1?.medio), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%
                    </span>
                  </div>

                  {/* ADAPTADOR INFERIOR */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col items-center">
                    <span className="text-xs font-black uppercase text-slate-800">ADAPTADOR INFERIOR</span>
                    <div className="w-12 h-24 bg-slate-800 rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-inner">
                      <div className="w-8 h-4 bg-amber-400 rounded-xs"></div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-mono">
                      {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.adaptadorInferior), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%
                    </span>
                  </div>
                </div>
              ) : (
                /* ESQUEMA MARTILLO PUMA + BARRAS (D10 / D11) */
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col items-center">
                    <span className="text-xs font-black uppercase text-slate-800">MARTILLO PUMA</span>
                    <div className="w-10 h-32 bg-amber-100 border-2 border-amber-500 rounded-lg flex flex-col justify-between p-1">
                      <div className="w-full h-4 bg-[#9E1B2C] rounded-sm"></div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-mono">
                      {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.martillo), UMBRALES['D10_D11_MARTILLO'].initialMm, UMBRALES['D10_D11_MARTILLO'].discardMm)}%
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col items-center">
                    <span className="text-xs font-black uppercase text-slate-800">BARRAS 1 A 8</span>
                    <div className="w-12 h-32 bg-slate-700 rounded-lg flex items-center justify-center">
                      <span className="text-white font-black text-xs font-mono">8 BARRAS</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 font-mono">
                      {selectedPerfModal.minHealthPercent}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TABLA 1: DIÁMETROS (Pin, Centro, Box) - FUENTE NEGRA DE ALTO CONTRASTE */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Diámetro Registrado (mm):</h4>
              <div className="overflow-x-auto border border-slate-300 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-xs text-center font-mono">
                  <thead className="bg-slate-200 text-slate-900 font-black">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-left font-sans">Medidas</th>
                      {selectedPerfModal.perforadora === 'D14' || selectedPerfModal.perforadora === 'D15' || selectedPerfModal.perforadora === 'D16' ? (
                        <>
                          <th className="py-2.5 px-3 border-r border-slate-300">Barra Patera</th>
                          <th className="py-2.5 px-3 border-r border-slate-300">Barra Seguidora</th>
                          <th className="py-2.5 px-3">Adaptador Inferior</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3 border-r border-slate-300">Martillo PUMA</th>
                          <th className="py-2.5 px-3 border-r border-slate-300">Barras (1-4)</th>
                          <th className="py-2.5 px-3">Barras (5-8)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPerfModal.perforadora === 'D14' || selectedPerfModal.perforadora === 'D15' || selectedPerfModal.perforadora === 'D16' ? (
                      <>
                        <tr className="border-t border-slate-300">
                          <td className="py-2.5 px-3 border-r border-slate-300 font-sans font-extrabold text-left text-slate-900">Pin / Superior</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraPatera?.superior)}</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora?.superior || selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora1?.superior)}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-bold">-</td>
                        </tr>
                        <tr className="border-t border-slate-300 bg-slate-50">
                          <td className="py-2.5 px-3 border-r border-slate-300 font-sans font-extrabold text-left text-slate-900">Centro / Medio</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraPatera?.medio)}</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora?.medio || selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora1?.medio)}</td>
                          <td className="py-2.5 px-3">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.adaptadorInferior)}</td>
                        </tr>
                        <tr className="border-t border-slate-300">
                          <td className="py-2.5 px-3 border-r border-slate-300 font-sans font-extrabold text-left text-slate-900">Box / Inferior</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraPatera?.inferior)}</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora?.inferior || selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora1?.inferior)}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-bold">-</td>
                        </tr>
                      </>
                    ) : (
                      <tr className="border-t border-slate-300">
                        <td className="py-2.5 px-3 border-r border-slate-300 font-sans font-extrabold text-left text-slate-900">Medición</td>
                        <td className="py-2.5 px-3 border-r border-slate-300">{renderValMmCell(selectedPerfModal.rawMeasurementRecord?.measurements_data?.martillo)}</td>
                        <td className="py-2.5 px-3 border-r border-slate-300 font-extrabold text-slate-900">Ver 1 a 4</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">Ver 5 a 8</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA 2: FECHAS DE CAMBIO (Con Metros Editables y Porcentaje Remanente) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Fechas de Cambio e Instalación en Faena:</h4>
                <span className="text-[10px] text-slate-500 font-bold flex items-center space-x-1">
                  <Edit3 className="w-3 h-3 text-[#9E1B2C]" />
                  <span>Metros editables</span>
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-xs text-center">
                  <thead className="bg-[#9E1B2C] text-white font-black uppercase">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-red-800 text-left">Aceros</th>
                      <th className="py-2.5 px-3 border-r border-red-800">Metros Perforados</th>
                      <th className="py-2.5 px-3 border-r border-red-800">Fecha Instalación</th>
                      <th className="py-2.5 px-3">Porcentaje Remanente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPerfModal.perforadora === 'D14' || selectedPerfModal.perforadora === 'D15' || selectedPerfModal.perforadora === 'D16' ? (
                      <>
                        {/* PATERA */}
                        <tr className="border-t border-slate-300">
                          <td className="py-2.5 px-3 font-extrabold text-left text-slate-900 border-r border-slate-300">Barra Patera</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <input
                              type="text"
                              value={editableMetros.patera}
                              onChange={(e) => setEditableMetros({ ...editableMetros, patera: e.target.value })}
                              className="w-20 text-center bg-slate-100 border border-slate-400 rounded-lg py-1 text-xs font-mono font-black text-slate-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-slate-900">
                            {formatDateDDMMYYYY(selectedPerfModal.rawChangeRecord?.fecha)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-700 text-sm">
                            {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraPatera?.medio), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%
                          </td>
                        </tr>

                        {/* SEGUIDORA */}
                        <tr className="border-t border-slate-300 bg-slate-50">
                          <td className="py-2.5 px-3 font-extrabold text-left text-slate-900 border-r border-slate-300">Barra Seguidora</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <input
                              type="text"
                              value={editableMetros.seguidora}
                              onChange={(e) => setEditableMetros({ ...editableMetros, seguidora: e.target.value })}
                              className="w-20 text-center bg-white border border-slate-400 rounded-lg py-1 text-xs font-mono font-black text-slate-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-slate-900">
                            {formatDateDDMMYYYY(selectedPerfModal.rawChangeRecord?.fecha)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-700 text-sm">
                            {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora?.medio || selectedPerfModal.rawMeasurementRecord?.measurements_data?.barraSeguidora1?.medio), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%
                          </td>
                        </tr>

                        {/* ADAPTADOR */}
                        <tr className="border-t border-slate-300">
                          <td className="py-2.5 px-3 font-extrabold text-left text-slate-900 border-r border-slate-300">Adaptador Inferior</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <input
                              type="text"
                              value={editableMetros.adaptador}
                              onChange={(e) => setEditableMetros({ ...editableMetros, adaptador: e.target.value })}
                              className="w-20 text-center bg-slate-100 border border-slate-400 rounded-lg py-1 text-xs font-mono font-black text-slate-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-slate-900">
                            {formatDateDDMMYYYY(selectedPerfModal.rawChangeRecord?.fecha)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-700 text-sm">
                            {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.adaptadorInferior), UMBRALES['D14_D15_D16'].initialMm, UMBRALES['D14_D15_D16'].discardMm)}%
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        {/* MARTILLO */}
                        <tr className="border-t border-slate-300">
                          <td className="py-2.5 px-3 font-extrabold text-left text-slate-900 border-r border-slate-300">Martillo PUMA</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <input
                              type="text"
                              value={editableMetros.martillo}
                              onChange={(e) => setEditableMetros({ ...editableMetros, martillo: e.target.value })}
                              className="w-20 text-center bg-slate-100 border border-slate-400 rounded-lg py-1 text-xs font-mono font-black text-slate-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-slate-900">
                            {formatDateDDMMYYYY(selectedPerfModal.rawChangeRecord?.fecha)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-700 text-sm">
                            {calcLifePercent(parseValToMm(selectedPerfModal.rawMeasurementRecord?.measurements_data?.martillo), UMBRALES['D10_D11_MARTILLO'].initialMm, UMBRALES['D10_D11_MARTILLO'].discardMm)}%
                          </td>
                        </tr>

                        {/* BARRAS */}
                        <tr className="border-t border-slate-300 bg-slate-50">
                          <td className="py-2.5 px-3 font-extrabold text-left text-slate-900 border-r border-slate-300">Barras 1 a 8</td>
                          <td className="py-2.5 px-3 border-r border-slate-300">
                            <input
                              type="text"
                              value={editableMetros.patera}
                              onChange={(e) => setEditableMetros({ ...editableMetros, patera: e.target.value })}
                              className="w-20 text-center bg-white border border-slate-400 rounded-lg py-1 text-xs font-mono font-black text-slate-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-slate-900">
                            {formatDateDDMMYYYY(selectedPerfModal.rawChangeRecord?.fecha)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-700 text-sm">
                            {selectedPerfModal.minHealthPercent}%
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
