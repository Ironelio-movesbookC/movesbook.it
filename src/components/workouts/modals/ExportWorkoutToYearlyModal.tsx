'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, CheckSquare, Square } from 'lucide-react';
import { fetchPlanWeeks, getDayWorkoutCount } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';

interface ExportWorkoutToYearlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWorkout: any;
  onConfirm: (targetDayIds: string[]) => Promise<void>;
}

export default function ExportWorkoutToYearlyModal({
  isOpen,
  onClose,
  sourceWorkout,
  onConfirm,
}: ExportWorkoutToYearlyModalProps) {
  const [yearlyWeeks, setYearlyWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedDayIds, setSelectedDayIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWeekId('');
    setSelectedDayIds(new Set());
    setConfirmOverwrite(false);
    void (async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setYearlyWeeks([]);
          return;
        }
        const weeks = await fetchPlanWeeks(token, 'YEARLY_PLAN');
        setYearlyWeeks(mergeWeeksByWeekNumber(weeks));
      } catch {
        setYearlyWeeks([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen, sourceWorkout?.id]);

  const selectedWeek = useMemo(
    () => yearlyWeeks.find((w) => w.id === selectedWeekId),
    [yearlyWeeks, selectedWeekId]
  );

  const weekDays = useMemo(() => {
    if (!selectedWeek?.days?.length) return [];
    return [...selectedWeek.days].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [selectedWeek]);

  const selectedDays = weekDays.filter((d: any) => selectedDayIds.has(d.id));
  const anySelectedHasContent = selectedDays.some((d: any) => getDayWorkoutCount(d) > 0);
  const anySelectedFull = selectedDays.some((d: any) => getDayWorkoutCount(d) >= 3);

  const toggleDay = (dayId: string) => {
    setSelectedDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else if (next.size < 7) next.add(dayId);
      return next;
    });
    setConfirmOverwrite(false);
  };

  const handleExport = async () => {
    if (!selectedDayIds.size) return;
    if (anySelectedFull) {
      alert('One or more selected days already have 3 workouts (maximum). Deselect full days or clear them first.');
      return;
    }
    if (anySelectedHasContent && !confirmOverwrite) return;

    setIsExporting(true);
    try {
      await onConfirm(Array.from(selectedDayIds));
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !sourceWorkout) return null;

  const mfCount = sourceWorkout.moveframes?.length ?? 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Calendar size={20} />
              <h2 className="text-lg font-bold">Export Workout to Yearly Plan (Update)</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isExporting}>
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800">
                <strong>Workout:</strong>{' '}
                {sourceWorkout.name || `Workout #${sourceWorkout.sessionNumber}`}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {mfCount} moveframe(s) — pick one Yearly Plan week and up to 7 days.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Target week (one only)</label>
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : (
                <select
                  value={selectedWeekId}
                  onChange={(e) => {
                    setSelectedWeekId(e.target.value);
                    setSelectedDayIds(new Set());
                    setConfirmOverwrite(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Choose Yearly Plan week…</option>
                  {yearlyWeeks.map((week, idx) => (
                    <option key={week.id} value={week.id}>
                      Week {week.weekNumber ?? idx + 1}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedWeekId && weekDays.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Target days ({selectedDayIds.size}/7 selected)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {weekDays.map((day: any) => {
                    const count = getDayWorkoutCount(day);
                    const full = count >= 3;
                    const isSelected = selectedDayIds.has(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        disabled={full}
                        onClick={() => toggleDay(day.id)}
                        className={`px-3 py-2 text-sm rounded border text-left flex items-start gap-2 ${
                          full
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900'
                              : 'bg-white border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                        )}
                        <span>
                          {day.date
                            ? new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })
                            : `Day ${day.dayOfWeek}`}
                          <span
                            className={`block text-xs ${
                              count === 0 ? 'text-green-700' : 'text-amber-700'
                            }`}
                          >
                            {count === 0 ? 'Empty' : `${count}/3 workouts`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {anySelectedHasContent && !anySelectedFull && (
              <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-amber-900">
                  Some selected days already have workouts. The export will add this workout alongside existing ones
                  (days with space only).
                </span>
              </label>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg" disabled={isExporting}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={
                isExporting ||
                selectedDayIds.size === 0 ||
                anySelectedFull ||
                (anySelectedHasContent && !confirmOverwrite)
              }
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {isExporting ? 'Exporting…' : `Export to ${selectedDayIds.size} day(s)`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
