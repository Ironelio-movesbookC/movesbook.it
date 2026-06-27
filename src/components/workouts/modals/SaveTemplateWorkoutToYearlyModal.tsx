'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, ChevronLeft, Calendar } from 'lucide-react';
import { fetchPlanWeeks, getDayWorkoutCount } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  sourceWorkout: any;
  onSaved?: () => void;
};

function workoutLabel(workout: any): string {
  return workout?.name?.trim() || `Workout #${workout?.sessionNumber ?? '?'}`;
}

export default function SaveTemplateWorkoutToYearlyModal({
  isOpen,
  onClose,
  onBack,
  sourceWorkout,
  onSaved,
}: Props) {
  const [yearlyWeeks, setYearlyWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [replaceWorkoutId, setReplaceWorkoutId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWeekId('');
    setSelectedDayId('');
    setReplaceWorkoutId('');
    setError(null);
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

  const selectedDay = weekDays.find((d: any) => d.id === selectedDayId);
  const dayWorkoutCount = selectedDay ? getDayWorkoutCount(selectedDay) : 0;
  const dayIsFull = dayWorkoutCount >= 3;
  const dayWorkouts = useMemo(() => {
    if (!selectedDay?.workouts?.length) return [];
    return [...selectedDay.workouts].sort(
      (a: any, b: any) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)
    );
  }, [selectedDay]);

  const handleSave = async () => {
    if (!sourceWorkout?.id || !selectedDayId) return;
    if (dayIsFull && !replaceWorkoutId) {
      setError('Select which workout on this day will be overwritten.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        sourceWorkoutId: sourceWorkout.id,
        targetDayId: selectedDayId,
      };

      if (dayIsFull) {
        body.replaceWorkoutId = replaceWorkoutId;
      } else {
        body.sessionNumber = dayWorkoutCount + 1;
      }

      const response = await fetch('/api/workouts/sessions/copy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save workout to Yearly Plan');
      }

      alert(
        dayIsFull
          ? 'Workout saved to Yearly Plan (existing workout replaced).'
          : 'Workout saved to Yearly Plan.'
      );
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !sourceWorkout) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1 hover:bg-white/20 rounded-full shrink-0"
                  disabled={isSaving}
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <Calendar className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-bold truncate">Save to Yearly Plan</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full shrink-0"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-900">
              <strong>{workoutLabel(sourceWorkout)}</strong> will be added to a day in your Current
              Yearly Plan.
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Select week *</label>
              {isLoading ? (
                <p className="text-sm text-gray-500">Loading yearly plan…</p>
              ) : (
                <select
                  value={selectedWeekId}
                  onChange={(e) => {
                    setSelectedWeekId(e.target.value);
                    setSelectedDayId('');
                    setReplaceWorkoutId('');
                    setError(null);
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
                <label className="text-sm font-medium text-gray-700 block mb-2">Select day *</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {weekDays.map((day: any) => {
                    const count = getDayWorkoutCount(day);
                    const isSelected = selectedDayId === day.id;
                    return (
                      <label
                        key={day.id}
                        className={
                          'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' +
                          (isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300')
                        }
                      >
                        <input
                          type="radio"
                          name="yearlyDay"
                          value={day.id}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedDayId(day.id);
                            setReplaceWorkoutId('');
                            setError(null);
                          }}
                        />
                        <span className="text-sm">
                          {templateDaySlotLabel(day)}
                          {day.date
                            ? ` — ${new Date(day.date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}`
                            : ''}
                          <span
                            className={
                              'block text-xs ' +
                              (count === 0
                                ? 'text-green-700'
                                : count >= 3
                                  ? 'text-red-700'
                                  : 'text-amber-700')
                            }
                          >
                            {count === 0 ? 'Empty' : `${count}/3 workouts`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDayId && dayIsFull && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  This day already has 3 workouts. Select which workout will be overwritten:
                </p>
                <div className="space-y-2">
                  {dayWorkouts.map((w: any) => (
                    <label
                      key={w.id}
                      className={
                        'flex items-center gap-3 p-3 border rounded-lg cursor-pointer ' +
                        (replaceWorkoutId === w.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300')
                      }
                    >
                      <input
                        type="radio"
                        name="replaceWorkout"
                        value={w.id}
                        checked={replaceWorkoutId === w.id}
                        onChange={() => {
                          setReplaceWorkoutId(w.id);
                          setError(null);
                        }}
                      />
                      <span className="text-sm">
                        <strong>Workout {w.sessionNumber ?? '?'}</strong>
                        {' — '}
                        {workoutLabel(w)}
                        {(w.moveframes?.length ?? 0) > 0 && (
                          <span className="text-gray-500 block text-xs">
                            {w.moveframes.length} moveframe{w.moveframes.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedDayId && !dayIsFull && dayWorkoutCount > 0 && (
              <p className="text-sm text-gray-600 bg-gray-50 border rounded-lg p-3">
                This workout will be added as <strong>Workout {dayWorkoutCount + 1}</strong> on the
                selected day.
              </p>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                isSaving ||
                !selectedDayId ||
                (dayIsFull && !replaceWorkoutId)
              }
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save to Yearly Plan'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
