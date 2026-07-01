'use client';

import React from 'react';
import { X, Download } from 'lucide-react';

interface ImportWorkoutStubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  title: string;
}

export default function ImportWorkoutStubModal({
  isOpen,
  onClose,
  onBack,
  title,
}: ImportWorkoutStubModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <h2 className="text-lg font-bold">Import a Workout</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-blue-600 underline">
              ← Import mode
            </button>
            <p className="text-sm text-gray-700">
              Import from <strong>{title}</strong> for a single workout slot is coming soon. Use{' '}
              <strong>Favourites</strong>, <strong>Current Yearly Plan</strong>, or{' '}
              <strong>General Archive</strong> in the meantime.
            </p>
          </div>
          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
