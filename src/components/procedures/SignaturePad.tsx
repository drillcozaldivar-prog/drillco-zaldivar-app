'use client';

import React, { useRef, useState } from 'react';
import { FileSignature, Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onSaveSignature: (blob: Blob) => void;
  disabled?: boolean;
}

export function SignaturePad({ onSaveSignature, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx?.beginPath();
    ctx?.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx?.lineTo(clientX - rect.left, clientY - rect.top);
    ctx?.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      canvas.toBlob((blob) => {
        if (blob) onSaveSignature(blob);
      }, 'image/png');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="bg-mining-surface border border-mining-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-mining-primary font-bold">
          <FileSignature className="w-5 h-5" />
          <span>Firma Digital Operacional</span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      <div className="border border-mining-border rounded-lg bg-slate-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 cursor-crosshair touch-none"
        />
      </div>
      {hasSignature && (
        <div className="flex items-center text-emerald-400 text-xs font-semibold space-x-1">
          <Check className="w-4 h-4" />
          <span>Firma capturada correctamente</span>
        </div>
      )}
    </div>
  );
}
