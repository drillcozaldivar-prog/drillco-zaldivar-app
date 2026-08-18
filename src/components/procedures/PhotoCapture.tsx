'use client';

import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react';

interface PhotoCaptureProps {
  onPhotoCaptured: (blob: Blob, filename: string) => void;
  disabled?: boolean;
}

export function PhotoCapture({ onPhotoCaptured, disabled }: PhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Redimensionar e comprimir imagen mediante HTML5 Canvas en terreno
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 960;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              setPreviewUrl(URL.createObjectURL(blob));
              onPhotoCaptured(blob, `photo_${Date.now()}.jpg`);
            }
          },
          'image/jpeg',
          0.8
        );
      };
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-mining-surface border border-mining-border rounded-xl p-4 space-y-3">
      <div className="flex items-center space-x-2 text-mining-primary font-bold">
        <Camera className="w-5 h-5" />
        <span>Captura de Evidencia Fotográfica</span>
      </div>

      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-mining-border bg-black max-w-sm">
          <img src={previewUrl} alt="Vista previa" className="w-full h-48 object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-mining-border hover:border-mining-primary rounded-lg h-36 cursor-pointer bg-mining-dark/40 transition-colors">
          <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-sm font-semibold text-slate-300">Tocar para tomar foto o adjuntar</span>
          <span className="text-xs text-slate-500">JPG, PNG (Compresión automática)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
