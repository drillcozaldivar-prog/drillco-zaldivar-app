'use client';

import React from 'react';
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
  id: string;
  title: string;
}

interface StepWizardProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  children: React.ReactNode;
}

export function StepWizard({ steps, currentStep, onStepChange, children }: StepWizardProps) {
  return (
    <div className="space-y-6">
      {/* Indicador de pasos táctiles */}
      <div className="flex items-center justify-between border-b border-mining-border pb-4 overflow-x-auto">
        {steps.map((s, idx) => {
          const isCurrent = idx === currentStep;
          const isDone = idx < currentStep;

          return (
            <div key={s.id} className="flex items-center space-x-2 min-w-fit px-2">
              <button
                type="button"
                onClick={() => onStepChange(idx)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                  isCurrent
                    ? 'bg-mining-primary text-mining-dark ring-2 ring-mining-primary ring-offset-2 ring-offset-mining-dark'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-mining-card text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle className="w-5 h-5" /> : idx + 1}
              </button>
              <span
                className={`text-sm font-semibold ${
                  isCurrent ? 'text-mining-primary' : isDone ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {s.title}
              </span>
              {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 ml-2" />}
            </div>
          );
        })}
      </div>

      {/* Contenido de la sección activa */}
      <div className="bg-mining-surface border border-mining-border rounded-xl p-6 shadow-xl">
        {children}
      </div>

      {/* Botones de Navegación por Pasos */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => onStepChange(currentStep - 1)}
          className="flex items-center space-x-2 bg-mining-card hover:bg-mining-border disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Anterior</span>
        </button>

        <button
          type="button"
          disabled={currentStep === steps.length - 1}
          onClick={() => onStepChange(currentStep + 1)}
          className="flex items-center space-x-2 bg-mining-primary hover:bg-mining-hover disabled:opacity-40 disabled:cursor-not-allowed text-mining-dark font-bold py-2.5 px-5 rounded-lg transition-colors"
        >
          <span>Siguiente</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
