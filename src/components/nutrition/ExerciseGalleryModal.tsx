'use client';

import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export default function ExerciseGalleryModal({
  open,
  onClose,
  title,
  pictureA,
  pictureB,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  pictureA: string | null;
  pictureB: string | null;
}) {
  if (!open || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10000001] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-gallery-title"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id="exercise-gallery-title" className="truncate text-lg font-bold text-gray-900">
            {title || 'Exercise'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">Position A</div>
            {pictureA ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs + dynamic paths
              <img
                src={pictureA}
                alt={`${title} — position A`}
                className="max-h-[70vh] w-full rounded-lg border border-gray-200 object-contain"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-sm text-gray-500">
                No image A
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">Position B</div>
            {pictureB ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureB}
                alt={`${title} — position B`}
                className="max-h-[70vh] w-full rounded-lg border border-gray-200 object-contain"
              />
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-sm text-gray-500">
                No image B
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
