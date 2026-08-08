'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import {
  DEFAULT_DONE_COLOR_STATUS,
  workoutSymbolForSlot,
  YEARLY_WORKOUT_MANUAL_STATUSES,
  yearlyWorkoutStatusStyle,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';

export type WorkoutDoneColorTarget = {
  id: string;
  sessionNumber: number;
  name?: string | null;
};

type Props = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  workouts: WorkoutDoneColorTarget[];
  onClose: () => void;
  onConfirm: (statusByWorkoutId: Record<string, YearlyWorkoutStatus>) => Promise<void>;
};

export default function WorkoutDoneColorPickerModal({
  isOpen,
  title,
  subtitle,
  workouts,
  onClose,
  onConfirm,
}: Props) {
  const [statusMap, setStatusMap] = useState<Record<string, YearlyWorkoutStatus>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, YearlyWorkoutStatus> = {};
    for (const w of workouts) {
      initial[w.id] = DEFAULT_DONE_COLOR_STATUS;
    }
    setStatusMap(initial);
  }, [isOpen, workouts]);

  if (!isOpen || !workouts.length) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(statusMap);
      onClose();
    } finally {
      setSaving(false);
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
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} />
              <h2 className="text-lg font-bold">{title}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            <p className="text-sm text-gray-800 font-medium">
              Double-click colors only (greens / blues). Yellow / orange / red stay automatic:
            </p>

            {workouts.map((workout) => {
              const slot = Math.min(3, Math.max(1, workout.sessionNumber)) as 1 | 2 | 3;
              const symbol = workoutSymbolForSlot(slot);
              const selected = statusMap[workout.id] ?? DEFAULT_DONE_COLOR_STATUS;
              const shapeClass =
                slot === 1 ? 'rounded-full' : slot === 2 ? 'rounded-[3px]' : 'rounded-[2px]';

              return (
                <div
                  key={workout.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    Workout {slot}
                    {workout.name ? ` — ${workout.name}` : ''}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {YEARLY_WORKOUT_MANUAL_STATUSES.map((option) => {
                      const optStyle = yearlyWorkoutStatusStyle(option);
                      const isSelected = option === selected;
                      return (
                        <button
                          key={option}
                          type="button"
                          title={optStyle.label}
                          onClick={() =>
                            setStatusMap((prev) => ({ ...prev, [workout.id]: option }))
                          }
                          className={`flex h-7 w-7 items-center justify-center border text-[11px] font-bold ${shapeClass} ${
                            isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:brightness-95'
                          }`}
                          style={{
                            backgroundColor: optStyle.bg,
                            color: optStyle.fg,
                            borderColor: optStyle.border,
                          }}
                        >
                          {symbol}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t bg-gray-50 px-5 py-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-800 text-green-400 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save colors'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
