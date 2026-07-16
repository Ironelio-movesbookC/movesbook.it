'use client';

import React, { useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { formatOriginalPlannedDateLabel } from '@/utils/workoutSessionStatus';

type Props = {
  isOpen: boolean;
  plannedDayDate: Date | string;
  doneDayDate: Date | string;
  onClose: () => void;
  onConfirm: (mode: 'move' | 'exchange') => Promise<void>;
};

export default function RelocatePlannedDayModal({
  isOpen,
  plannedDayDate,
  doneDayDate,
  onClose,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;

  const plannedLabel = formatOriginalPlannedDateLabel(plannedDayDate) ?? String(plannedDayDate);
  const doneLabel = formatOriginalPlannedDateLabel(doneDayDate) ?? String(doneDayDate);

  const run = async (mode: 'move' | 'exchange') => {
    setBusy(true);
    try {
      await onConfirm(mode);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={20} />
              <h2 className="text-lg font-bold">Relocate planned day</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-3 text-sm text-gray-700">
            <p>
              Planned day (<strong>{plannedLabel}</strong>) and Workouts Done day (
              <strong>{doneLabel}</strong>) are different.
            </p>
            <p className="font-semibold text-gray-900">
              When Planned and Done dates differ, Yearly Plan is ALWAYS updated to match the Done
              day — either by moving workouts onto that date (overwrite) or by switching workouts
              between the two dates.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>
                <strong>Move</strong> — move planned workouts onto the Done date (overwrites that
                Yearly Plan day); original planned date is stored under Match Done.
              </li>
              <li>
                <strong>Exchange / Switch</strong> — swap workouts between the two Yearly Plan dates.
              </li>
            </ul>
          </div>

          <div className="border-t bg-gray-50 px-5 py-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 text-sm border border-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('move')}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Move'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('exchange')}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 disabled:opacity-50"
            >
              Exchange
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
