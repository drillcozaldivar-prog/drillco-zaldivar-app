'use client';

import React, { useState } from 'react';
import { MeasurementFormData } from '@/lib/validation/schemas';
import { Plus, Trash2, Gauge } from 'lucide-react';

interface MeasurementTableProps {
  measurements: MeasurementFormData[];
  onChange: (measurements: MeasurementFormData[]) => void;
  disabled?: boolean;
}

const MEASUREMENT_TYPES = [
  { value: 'wob', label: 'Peso Sobre la Broca (WOB)', unit: 'k-lbs' },
  { value: 'rop', label: 'Velocidad de Penetración (ROP)', unit: 'm/hr' },
  { value: 'rpm', label: 'Rotación (RPM)', unit: 'RPM' },
  { value: 'pulldown_pressure', label: 'Presión de Avanzo / Pulldown', unit: 'psi' },
  { value: 'flushing_pressure', label: 'Presión de Aire / Barrido', unit: 'psi' },
  { value: 'depth', label: 'Profundidad Medida', unit: 'meters' },
  { value: 'horometer', label: 'Horómetro Actual', unit: 'hours' },
];

export function MeasurementTable({ measurements, onChange, disabled }: MeasurementTableProps) {
  const [type, setType] = useState('wob');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!value || isNaN(Number(value))) return;

    const selectedConfig = MEASUREMENT_TYPES.find((t) => t.value === type);
    const newMeasurement: MeasurementFormData = {
      measurementType: type as any,
      value: Number(value),
      unit: selectedConfig?.unit || '',
      sequence: measurements.length + 1,
      notes: notes || undefined,
    };

    onChange([...measurements, newMeasurement]);
    setValue('');
    setNotes('');
  };

  const handleRemove = (index: number) => {
    const updated = measurements.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="bg-mining-surface border border-mining-border rounded-xl p-4 space-y-4">
      <div className="flex items-center space-x-2 text-mining-primary font-bold text-lg">
        <Gauge className="w-5 h-5" />
        <span>Mediciones Técnicas de Perforación</span>
      </div>

      {!disabled && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-mining-dark/50 p-3 rounded-lg border border-mining-border">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Variable Técnica</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-mining-surface border border-mining-border text-white text-sm rounded-lg p-2.5"
            >
              {MEASUREMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Valor Registrado</label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ej. 45.5"
              className="w-full bg-mining-surface border border-mining-border text-white text-sm rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Observación / Nota</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional..."
              className="w-full bg-mining-surface border border-mining-border text-white text-sm rounded-lg p-2.5"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-mining-primary hover:bg-mining-hover text-mining-dark font-bold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Mediciones Agregadas */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-mining-dark text-slate-400 border-b border-mining-border">
            <tr>
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Variable</th>
              <th className="py-2.5 px-3">Valor</th>
              <th className="py-2.5 px-3">Unidad</th>
              <th className="py-2.5 px-3">Notas</th>
              {!disabled && <th className="py-2.5 px-3 text-right">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {measurements.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500 italic">
                  No hay mediciones registradas en este formulario.
                </td>
              </tr>
            ) : (
              measurements.map((m, idx) => {
                const cfg = MEASUREMENT_TYPES.find((t) => t.value === m.measurementType);
                return (
                  <tr key={idx} className="border-b border-mining-border/50 hover:bg-mining-dark/30">
                    <td className="py-2 px-3">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-white">{cfg?.label || m.measurementType}</td>
                    <td className="py-2 px-3 font-mono text-mining-primary">{m.value}</td>
                    <td className="py-2 px-3">{m.unit}</td>
                    <td className="py-2 px-3 text-xs text-slate-400">{m.notes || '-'}</td>
                    {!disabled && (
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
