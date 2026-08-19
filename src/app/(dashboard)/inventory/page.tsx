'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/indexeddb/db';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/useAuth';
import { FileText, Plus, Minus, Download, Check, Save, RefreshCw, Trash2, ShieldAlert, PackagePlus } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type FamiliaContable =
  | 'PT_BITS'
  | 'PT_MART'
  | 'PT_ROTARY'
  | 'PT_REP_TRICONOS'
  | 'PT_BARRAS'
  | 'PR_MATERIALES'
  | 'PT_OTROS';

interface InventoryItem {
  id: string;
  category: FamiliaContable;
  item: string;
  sapNumber: string;
  um: string;
  quantity: number;
  hasSN?: boolean;
  snValue?: string;
}

// Catálogo Oficial ordenado por FAMILIA CONTABLE
const OFFICIAL_CATALOG: InventoryItem[] = [
  // 1. PT_BITS
  { id: '1', category: 'PT_BITS', sapNumber: '0204060000162', item: 'Bit QL-6 Ø6 1/2" Concavo Doble Calibre', um: 'UD', quantity: 4, hasSN: true },
  { id: '2', category: 'PT_BITS', sapNumber: '0204060000224', item: 'Bit QL-6 Ø6 1/2" Cara Plana A1 Welding', um: 'UD', quantity: 6, hasSN: true },

  // 2. PT_MART
  { id: '3', category: 'PT_MART', sapNumber: '0006060090013', item: 'Mart PM6.2EX HDW Retr QL-6 3 1/2" Reg M 3E', um: 'UD', quantity: 2, hasSN: true },
  { id: '4', category: 'PT_MART', sapNumber: '0106060170051', item: 'PM6.2EX Portabit HDW QL-6 3E', um: 'UD', quantity: 1, hasSN: true },
  { id: '5', category: 'PT_MART', sapNumber: '0301060150006', item: 'PM6.2EX QL-6 3 1/2" Reg M 3E Kit economico', um: 'UD', quantity: 3 },

  // 3. PT_ROTARY
  { id: '6', category: 'PT_ROTARY', sapNumber: '302100615RF03', item: 'PR TRICONE Ø 10 5/8 SGV 615 RF REG 6 5/8 V2', um: 'UD', quantity: 16, hasSN: true },
  { id: '7', category: 'PT_ROTARY', sapNumber: '302100645RF02', item: 'PR TRICONE Ø 10 5/8 SGV 645RF REG 6 5/8 V3', um: 'UD', quantity: 5, hasSN: true },
  { id: '8', category: 'PT_ROTARY', sapNumber: '302100715R001', item: 'PR TRICONE Ø 10 5/8 SGV 715R REG 6 5/8 V1', um: 'UD', quantity: 8, hasSN: true },
  { id: '9', category: 'PT_ROTARY', sapNumber: '3040825MB0000', item: 'PR ROD Ø8 5/8 L25ft PIN-BOX BECO 6', um: 'UD', quantity: 4, hasSN: true },
  { id: '10', category: 'PT_ROTARY', sapNumber: '3040830MB0000', item: 'PR ROD Ø8 5/8 L30ft E1 PIN-BOX BECO 6', um: 'UD', quantity: 6, hasSN: true },
  { id: '11', category: 'PT_ROTARY', sapNumber: '305GD1308AB00', item: 'PR DECK BUSHING ID 8 5/8 x L 13 - DR412I', um: 'UD', quantity: 2 },
  { id: '12', category: 'PT_ROTARY', sapNumber: '305GD1508AB00', item: 'PR DECK BUSHING ID 8 5/8 x L 15 - DR412I', um: 'UD', quantity: 2 },
  { id: '13', category: 'PT_ROTARY', sapNumber: '3070870ME001', item: 'PR BIT SUB Ø8 5/8 L70 PIN BECO 6 - BOX 6 5/8 REG', um: 'UD', quantity: 3, hasSN: true },

  // 4. PT_REP_TRICONOS
  { id: '14', category: 'PT_REP_TRICONOS', sapNumber: '302100715RC01', item: 'PR TRICONE Ø 10 5/8 SGV 715RC REG 6 5/8 V1', um: 'UD', quantity: 6, hasSN: true },

  // 5. PT_BARRAS
  { id: '15', category: 'PT_BARRAS', sapNumber: 'R700010605350', item: 'T.SUB DTH114mm 12"Pin31/2APIReg Box3REG', um: 'UD', quantity: 2, hasSN: true },
  { id: '16', category: 'PT_BARRAS', sapNumber: 'R700011462021', item: 'Barras 4 1/2 x 6000mm x 6.35 3 1/2REG SH', um: 'UD', quantity: 26, hasSN: true },

  // 6. PR_MATERIALES
  { id: '17', category: 'PR_MATERIALES', sapNumber: 'I020015000027', item: 'Grasa Lubricante Thredon Copperhead 304', um: 'UD', quantity: 12 },
  { id: '18', category: 'PR_MATERIALES', sapNumber: 'I060005000063', item: 'ARNES SUJECION ANILLO GUIA - WLS - LARGO: 1,3m - 2m GORILA', um: 'UD', quantity: 5 },

  // 7. PT_OTROS
  { id: '19', category: 'PT_OTROS', sapNumber: '0301060070002', item: 'Campana de transporte Ø115 3 1/2" Reg H', um: 'UD', quantity: 2 },
  { id: '20', category: 'PT_OTROS', sapNumber: '0301060070003', item: 'Campana de transporte Ø180 6 5/8" Reg H', um: 'UD', quantity: 2 },
  { id: '21', category: 'PT_OTROS', sapNumber: '0301090080028', item: 'P6-8 Amort HD V2 3 1/2" ATS M x 3 1/2" Reg H', um: 'UD', quantity: 4, hasSN: true },
  { id: '22', category: 'PT_OTROS', sapNumber: 'R700040010365', item: 'AMORTIGUADOR 18.3", PIN BOX 51/2 API', um: 'UD', quantity: 1, hasSN: true }
];

export default function InventoryPage() {
  const { isAdmin, user } = useAuth();

  const isUserAdmin =
    isAdmin ||
    user?.roles?.some((r) => String(r).toLowerCase() === 'admin') ||
    user?.email?.toLowerCase().includes('admin') ||
    false;

  const [selectedDate, setSelectedDate] = useState('2026-08-17');
  const [lastUpdateDate, setLastUpdateDate] = useState('17-08-2026');
  const [items, setItems] = useState<InventoryItem[]>(OFFICIAL_CATALOG);
  const [snModalItem, setSnModalItem] = useState<InventoryItem | null>(null);
  const [snInput, setSnInput] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Estados del Formulario Administrador para Agregar Producto
  const [newCategory, setNewCategory] = useState<FamiliaContable>('PT_BITS');
  const [newItemName, setNewItemName] = useState('');
  const [newSapNumber, setNewSapNumber] = useState('');
  const [newUm, setNewUm] = useState('UD');
  const [newQuantity, setNewQuantity] = useState('0');
  const [newHasSN, setNewHasSN] = useState(true);

  // Estado para Quitar Producto (Dropdown Administrador)
  const [selectedRemoveId, setSelectedRemoveId] = useState('');

  // Cargar primero desde IndexedDB y luego actualizar con la última versión de la nube en Supabase
  useEffect(() => {
    const initInventory = async () => {
      await loadLocalInventory();
      await syncFromCloudLatest();
    };
    initInventory();
  }, []);

  const loadLocalInventory = async () => {
    try {
      const saved = await db.appState.get('familiaInventoryItems_v3');
      if (saved?.value && Array.isArray(saved.value)) {
        setItems(saved.value);
      } else {
        await saveInventoryState(OFFICIAL_CATALOG, false);
      }
    } catch {
      setItems(OFFICIAL_CATALOG);
    }
  };

  // Sincronización Automática al Abrir la Sección: Descarga el último registro guardado en la nube
  const syncFromCloudLatest = async () => {
    setIsCloudSyncing(true);
    try {
      const { data, error } = await supabase
        .from('inventory_snapshots')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const latest = data[0];
        if (latest.items_data && Array.isArray(latest.items_data)) {
          setItems(latest.items_data);
          if (latest.last_update_date) {
            setLastUpdateDate(latest.last_update_date);
          }
          await db.appState.put({ key: 'familiaInventoryItems_v3', value: latest.items_data });
        }
      }
    } catch {
      console.warn('[Supabase Offline] Sin conexión a internet, manteniendo datos locales.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const saveInventoryState = async (newItems: InventoryItem[], showToast = false) => {
    setItems(newItems);
    try {
      await db.appState.put({ key: 'familiaInventoryItems_v3', value: newItems });
      if (showToast) {
        setSaveFeedback('¡Inventario guardado y actualizado con éxito!');
        setTimeout(() => setSaveFeedback(null), 3000);
      }
    } catch {
      // Ignorar error IndexedDB
    }
  };

  // Guardado Manual con Almacenamiento de Máximo 5 Registros (Rotación FIFO)
  const handleManualSave = async () => {
    setIsSaving(true);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    setLastUpdateDate(formattedDate);

    await saveInventoryState(items, false);

    try {
      const uniqueSnapshotId = `inv-${Date.now()}`;
      const { error: insertError } = await supabase.from('inventory_snapshots').insert([
        {
          id: uniqueSnapshotId,
          inventory_date: selectedDate,
          last_update_date: formattedDate,
          items_data: items,
          updated_at: now.toISOString(),
        },
      ]);

      if (insertError) {
        setSaveFeedback(`Guardado localmente. Supabase: ${insertError.message}`);
      } else {
        setSaveFeedback('¡Inventario guardado y respaldado en Supabase (Nube)!');

        const { data: allSnapshots } = await supabase
          .from('inventory_snapshots')
          .select('id')
          .order('updated_at', { ascending: false });

        if (allSnapshots && allSnapshots.length > 5) {
          const idsToDelete = allSnapshots.slice(5).map((row) => row.id);
          await supabase.from('inventory_snapshots').delete().in('id', idsToDelete);
        }
      }
    } catch {
      setSaveFeedback('Guardado localmente en IndexedDB (Modo Offline)');
    }

    setTimeout(() => setSaveFeedback(null), 4000);
    setIsSaving(false);
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveInventoryState(updated, false);
  };

  // Funciones Exclusivas de Administrador: AGREGAR PRODUCTO
  const handleAddProductAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newSapNumber.trim()) {
      alert('Por favor complete la descripción del artículo y el código SAP.');
      return;
    }

    const newItem: InventoryItem = {
      id: `custom-${Date.now()}`,
      category: newCategory,
      item: newItemName.trim(),
      sapNumber: newSapNumber.trim(),
      um: newUm.trim() || 'UD',
      quantity: parseInt(newQuantity) || 0,
      hasSN: newHasSN,
    };

    const updated = [...items, newItem];
    await saveInventoryState(updated, false);

    setSaveFeedback(`¡Producto "${newItem.item}" agregado al catálogo por Administrador!`);
    setTimeout(() => setSaveFeedback(null), 4000);

    // Resetear formulario
    setNewItemName('');
    setNewSapNumber('');
    setNewQuantity('0');
  };

  // Funciones Exclusivas de Administrador: QUITAR PRODUCTO
  const handleRemoveProductAdmin = async (itemId: string) => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    if (!confirm(`¿Está seguro de eliminar el producto "${targetItem.item}" (${targetItem.sapNumber}) del inventario?`)) {
      return;
    }

    const updated = items.filter((i) => i.id !== itemId);
    await saveInventoryState(updated, false);

    setSaveFeedback(`¡Producto "${targetItem.item}" eliminado del catálogo por Administrador!`);
    setTimeout(() => setSaveFeedback(null), 4000);
    setSelectedRemoveId('');
  };

  const handleSNModalOpen = (item: InventoryItem) => {
    setSnModalItem(item);
    setSnInput(item.snValue || '');
  };

  const handleSNSave = () => {
    if (!snModalItem) return;
    const updated = items.map((item) => {
      if (item.id === snModalItem.id) {
        return { ...item, snValue: snInput };
      }
      return item;
    });
    saveInventoryState(updated, false);
    setSnModalItem(null);
  };

  // Generación de Documento PDF Oficial DRILLCO
  const generatePDF = () => {
    const doc = new jsPDF();

    doc.setFillColor(158, 27, 44); // #9E1B2C
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('DRILLCO', 14, 18);

    doc.setFontSize(13);
    doc.text('Inventario de bodega', 140, 18);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Faena: Zaldívar - Chile`, 14, 36);
    doc.text(`Fecha de ultimo Inventario: ${lastUpdateDate}`, 14, 44);

    const tableData: any[] = [];
    items.forEach((it) => {
      tableData.push([it.category, it.item, it.sapNumber, it.um, it.quantity.toString()]);
    });

    autoTable(doc, {
      startY: 50,
      head: [['FAMILIA CONTABLE', 'DESCRIPCION ARTICULO', 'ARTICULO / N° SAP', 'UM', 'Bod. Central']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [245, 158, 11],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { cellWidth: 80 },
        2: { cellWidth: 38 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `DRILLCO Headquarters Chile - Américo Vespucio Norte 1387 - www.drillco.com - Página ${i} de ${pageCount}`,
        14,
        288
      );
    }

    doc.save(`Inventario_Bodega_DRILLCO_${selectedDate}.pdf`);
  };

  const categoriesOrder: FamiliaContable[] = [
    'PT_BITS',
    'PT_MART',
    'PT_ROTARY',
    'PT_REP_TRICONOS',
    'PT_BARRAS',
    'PR_MATERIALES',
    'PT_OTROS',
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Mensaje de Confirmación al Guardar */}
      {saveFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-extrabold px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveFeedback}</span>
          </div>
          <span className="text-[10px] text-emerald-600">Sincronizado Localmente</span>
        </div>
      )}

      {/* Tarjeta de Encabezado: INVENTARIO */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-[#1E293B]">
            <FileText className="w-7 h-7 text-[#9E1B2C]" />
            <h1 className="text-2xl font-extrabold tracking-wide uppercase">INVENTARIO</h1>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={syncFromCloudLatest}
              disabled={isCloudSyncing}
              title="Actualizar desde la Nube"
              className="p-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin text-[#9E1B2C]' : ''}`} />
            </button>

            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="bg-[#9E1B2C] hover:bg-[#801423] text-white font-extrabold px-4 py-2 rounded-xl flex items-center space-x-2 text-sm shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>

            <button
              onClick={generatePDF}
              className="border-2 border-emerald-600 hover:bg-emerald-50 text-emerald-600 font-extrabold px-4 py-2 rounded-xl flex items-center space-x-2 text-sm shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        <div className="h-1 bg-amber-400 w-full rounded-full"></div>

        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
          <span>Fecha de ultimo Inventario: <strong className="text-slate-700">{lastUpdateDate}</strong></span>
          <span className="text-emerald-600 flex items-center space-x-1">
            {isCloudSyncing ? (
              <span className="text-amber-600 animate-pulse">Sincronizando con Supabase...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Actualizado desde la Nube / Offline</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Tabla de Inventario Ordenada por FAMILIA CONTABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-800 border-collapse">
            <thead className="bg-[#EAB308] text-slate-900 font-black uppercase border-b border-amber-500">
              <tr>
                <th className="py-3 px-4 w-44 border-r border-amber-400/50">FAMILIA CONTABLE</th>
                <th className="py-3 px-4">DESCRIPCION ARTICULO</th>
                <th className="py-3 px-4 w-40">ARTICULO</th>
                <th className="py-3 px-3 w-14 text-center">UM</th>
                <th className="py-3 px-4 w-36 text-center">Bod. Central</th>
                <th className="py-3 px-4 w-16 text-center">SN</th>
                {isUserAdmin && <th className="py-3 px-3 w-16 text-center">Quitar</th>}
              </tr>
            </thead>
            <tbody>
              {categoriesOrder.map((catGroup) => {
                const categoryItems = items.filter((it) => it.category === catGroup);
                if (categoryItems.length === 0) return null;

                return categoryItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={categoryItems.length}
                        className="py-3 px-4 font-black uppercase text-[#9E1B2C] bg-slate-100 border-r border-slate-200 align-top text-xs tracking-wider"
                      >
                        {catGroup}
                      </td>
                    )}

                    <td className="py-3 px-4 font-bold text-slate-800">{item.item}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{item.sapNumber}</td>
                    <td className="py-3 px-3 font-semibold text-center text-slate-600">{item.um}</td>

                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const updated = items.map((it) => (it.id === item.id ? { ...it, quantity: val } : it));
                            saveInventoryState(updated, false);
                          }}
                          className="w-12 h-7 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="w-7 h-7 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSNModalOpen(item)}
                        className={`px-2 py-1 rounded-md text-[11px] font-extrabold border transition-colors ${
                          item.snValue
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-600 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        SN
                      </button>
                    </td>

                    {/* Botón Eliminar Fila para Administradores */}
                    {isUserAdmin && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveProductAdmin(item.id)}
                          title="Quitar producto de la lista (Admin)"
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN AL FINAL DE LA VENTANA: GESTIÓN DE CATÁLOGO (SOLO ADMINISTRADOR) */}
      {/* ========================================================================= */}
      {isUserAdmin ? (
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 text-slate-900 border-b border-slate-200 pb-3">
            <PackagePlus className="w-6 h-6 text-[#9E1B2C]" />
            <div>
              <h3 className="text-base font-extrabold uppercase">GESTIÓN DE PRODUCTOS EN CATÁLOGO</h3>
              <p className="text-xs text-slate-500">Añadir nuevos ítems o eliminar productos existentes (Exclusivo Administrador)</p>
            </div>
          </div>

          <div className="h-1 bg-amber-400 w-full rounded-full -mt-3"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* SUB-SECCIÓN 1: AGREGAR NUEVO PRODUCTO */}
            <form onSubmit={handleAddProductAdmin} className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Agregar Producto a la Lista</span>
              </h4>

              {/* Familia Contable */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Familia Contable</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FamiliaContable)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                >
                  <option value="PT_BITS">PT_BITS</option>
                  <option value="PT_MART">PT_MART</option>
                  <option value="PT_ROTARY">PT_ROTARY</option>
                  <option value="PT_REP_TRICONOS">PT_REP_TRICONOS</option>
                  <option value="PT_BARRAS">PT_BARRAS</option>
                  <option value="PR_MATERIALES">PR_MATERIALES</option>
                  <option value="PT_OTROS">PT_OTROS</option>
                </select>
              </div>

              {/* Descripción del Artículo */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Descripción del Artículo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tricono 8 5/8 SGT V2"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>

              {/* Código SAP / Artículo */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black uppercase text-slate-500">Código Artículo / N° SAP *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 3021008580001"
                  value={newSapNumber}
                  onChange={(e) => setNewSapNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* UM */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-500">UM</label>
                  <input
                    type="text"
                    value={newUm}
                    onChange={(e) => setNewUm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 uppercase focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                </div>

                {/* Cantidad Inicial */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-500">Cantidad Inicial</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkbox SN */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chkHasSN"
                  checked={newHasSN}
                  onChange={(e) => setNewHasSN(e.target.checked)}
                  className="w-4 h-4 text-[#9E1B2C] rounded focus:ring-[#9E1B2C]"
                />
                <label htmlFor="chkHasSN" className="text-xs font-bold text-slate-700 cursor-pointer">
                  ¿Requiere registro de N° de Serie (SN)?
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Producto al Catálogo</span>
              </button>
            </form>

            {/* SUB-SECCIÓN 2: QUITAR PRODUCTO EXISTENTE */}
            <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Quitar Producto de la Lista</span>
                </h4>

                <p className="text-xs text-slate-600">
                  Seleccione cualquier ítem registrado en el inventario para eliminarlo permanentemente del catálogo.
                </p>

                <div className="space-y-1">
                  <label className="block text-[11px] font-black uppercase text-slate-500">Seleccionar Producto a Quitar</label>
                  <select
                    value={selectedRemoveId}
                    onChange={(e) => setSelectedRemoveId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
                  >
                    <option value="">-- Seleccionar producto --</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        [{it.category}] {it.item} ({it.sapNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={!selectedRemoveId}
                onClick={() => handleRemoveProductAdmin(selectedRemoveId)}
                className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  selectedRemoveId
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Quitar Producto Seleccionado</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Aviso discreto para cuentas operativas */
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span>La gestión de adición y eliminación de catálogo está reservada para cuentas de Administrador.</span>
          </div>
          <span className="font-bold text-slate-400 uppercase text-[10px]">DRILLCO® Security</span>
        </div>
      )}

      {/* Modal N° Serie (SN) */}
      {snModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2">
              Número de Serie (SN)
            </h3>
            <p className="text-xs text-slate-600 font-bold">{snModalItem.item}</p>
            <p className="text-xs text-slate-400 font-mono">ARTICULO: {snModalItem.sapNumber}</p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ingrese N° Serie o Código de Trazabilidad:
              </label>
              <input
                type="text"
                value={snInput}
                onChange={(e) => setSnInput(e.target.value)}
                placeholder="Ej. SN-2026-88421"
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-[#9E1B2C] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSnModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSNSave}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#9E1B2C] hover:bg-[#801423] text-white shadow-md"
              >
                Guardar SN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
