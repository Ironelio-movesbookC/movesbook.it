'use client';

import { Loader2 } from 'lucide-react';

type ClubCardReaderDeleteConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
};

export default function ClubCardReaderDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  deleting = false,
}: ClubCardReaderDeleteConfirmModalProps) {
  if (!isOpen) return null;

  const btnClass =
    'px-4 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:opacity-60';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-reader-delete-title"
    >
      <div className="w-full max-w-md border border-gray-400 bg-white shadow-2xl">
        <div className="border-b border-gray-300 bg-[#4a8f96] px-4 py-3 text-lg font-semibold text-white">
          <h2 id="card-reader-delete-title">Confirm delete</h2>
        </div>
        <p className="px-4 py-5 text-sm text-gray-800">
          Do you want to delete selected Reader?
        </p>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button type="button" onClick={onClose} disabled={deleting} className={btnClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
