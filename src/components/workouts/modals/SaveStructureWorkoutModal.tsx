'use client';

import React, { useEffect, useState } from 'react';
import { X, Star } from 'lucide-react';
import type { PlannedWorkout } from '@/lib/weeklyStructureTypes';

interface SaveStructureWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planned: PlannedWorkout[];
  onConfirm: (plannedId: string) => Promise<void>;
}

export default function SaveStructureWorkoutModal({
  isOpen,
  onClose,
  planned,
  onConfirm,
}: SaveStructureWorkoutModalProps) {
  const [selectedId, setSelectedId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(planned[0]?.id ?? '');
  }, [isOpen, planned]);

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6" />
              <h2 className="text-xl font-bold">Save Workout in Favourites</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isSaving}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {planned.length === 0 ? (
              <p className="text-sm text-gray-600">No planned workouts in this structure plan yet.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 mb-2">Select a planned workout to save:</p>
                {planned.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full p-3 border-2 rounded-lg text-left text-sm ${
                      selectedId === row.id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-300 hover:border-amber-300'
                    }`}
                  >
                    <div className="font-semibold">{row.sportKey.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {[row.goalCode, row.distance, row.time].filter(Boolean).join(' · ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !selectedId}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save in Favourites'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
