'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepWizard } from '@/components/procedures/StepWizard';
import { MeasurementTable } from '@/components/procedures/MeasurementTable';
import { PhotoCapture } from '@/components/procedures/PhotoCapture';
import { SignaturePad } from '@/components/procedures/SignaturePad';
import { ProcedureRepository } from '@/lib/indexeddb/repositories/procedureRepository';
import { OutboxRepository } from '@/lib/indexeddb/repositories/outboxRepository';
import { MeasurementFormData, ProcedureFormData } from '@/lib/validation/schemas';
import { useAuth } from '@/features/auth/useAuth';
import { Save, Send } from 'lucide-react';

const STEPS = [
  { id: 'general', title: '1. Datos de Operación' },
  { id: 'measurements', title: '2. Parámetros Técnicos' },
  { id: 'evidence', title: '3. Firma y Evidencias' },
];

export default function NewProcedurePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [siteId, setSiteId] = useState('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'); // Faena Zaldívar
  const [areaId, setAreaId] = useState('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'); // Mina Rizo
  const [drillRigId, setDrillRigId] = useState('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55'); // PERF-01
  const [shiftId, setShiftId] = useState('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66'); // Turno Día
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState<MeasurementFormData[]>([]);
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);

  const [saving, setSaving] = useState(false);

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const formData: ProcedureFormData = {
        organizationId: user.organizationId,
        siteId,
        areaId,
        procedureTypeId: 'h1eebc99-9c0b-4ef8-bb6d-6bb9bd380a88',
        templateVersionId: 'j1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
        drillRigId,
        shiftId,
        operatorId: '11111111-1111-1111-1111-111111111111',
        startedAt: new Date().toISOString(),
        notes,
        measurements,
      };

      const localProc = await ProcedureRepository.createProcedure(formData, user.id, 'DEVICE-MOBILE-01');

      // Crear Operación en Cola Outbox
      await OutboxRepository.addOperation({
        entityType: 'procedure',
        entityLocalId: localProc.localId,
        operationType: 'CREATE',
        payload: {
          ...formData,
          status: 'submitted',
        },
        priority: 1,
        userId: user.id,
        deviceId: 'DEVICE-MOBILE-01',
        localVersion: 1,
        expectedServerVersion: 1,
      });

      router.push('/procedures');
    } catch (err) {
      console.error('Error guardando borrador:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Nuevo Procedimiento de Perforación</h1>
          <p className="text-sm text-slate-400">Guardado local garantizado en IndexedDB</p>
        </div>

        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving}
          className="bg-mining-primary hover:bg-mining-hover text-mining-dark font-black px-5 py-2.5 rounded-xl flex items-center space-x-2 text-sm shadow-lg transition-colors"
        >
          <Send className="w-5 h-5" />
          <span>GUARDAR Y ENVIAR</span>
        </button>
      </div>

      <StepWizard steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep}>
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-mining-primary border-b border-mining-border pb-2">
              1. Selección de Equipo y Ubicación
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Faena Minera</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="w-full bg-mining-dark border border-mining-border rounded-xl p-3 text-white text-sm"
                >
                  <option value="b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22">Faena Zaldívar</option>
                  <option value="b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a23">Faena Centinela</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Área Operacional</label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full bg-mining-dark border border-mining-border rounded-xl p-3 text-white text-sm"
                >
                  <option value="c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33">Mina Rizo Patrón</option>
                  <option value="c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a34">Fase 5 Principal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Perforadora Asignada</label>
                <select
                  value={drillRigId}
                  onChange={(e) => setDrillRigId(e.target.value)}
                  className="w-full bg-mining-dark border border-mining-border rounded-xl p-3 text-white text-sm font-semibold"
                >
                  <option value="e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55">PERF-01 (Pit Viper 271)</option>
                  <option value="e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a56">PERF-02 (Sandvik DR412i)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Turno Operacional</label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full bg-mining-dark border border-mining-border rounded-xl p-3 text-white text-sm"
                >
                  <option value="f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66">Turno Día (08:00 - 20:00)</option>
                  <option value="f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a67">Turno Noche (20:00 - 08:00)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Observaciones Generales</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ingrese detalles o estado inicial de la perforadora..."
                className="w-full bg-mining-dark border border-mining-border rounded-xl p-3 text-white text-sm"
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-mining-primary border-b border-mining-border pb-2">
              2. Registro de Parámetros de Perforación
            </h2>
            <MeasurementTable measurements={measurements} onChange={setMeasurements} />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-mining-primary border-b border-mining-border pb-2">
              3. Firmas y Fotografías de Terreno
            </h2>

            <PhotoCapture onPhotoCaptured={(blob, filename) => console.log('Foto capturada:', filename)} />

            <SignaturePad onSaveSignature={(blob) => setSignatureBlob(blob)} />
          </div>
        )}
      </StepWizard>
    </div>
  );
}
