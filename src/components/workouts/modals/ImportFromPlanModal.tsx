'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Calendar, CheckSquare } from 'lucide-react';

const MAX_IMPORT_WEEKS = 4;

interface Workout {
  id: string;
  name: string;
  code: string;
  sessionNumber?: number;
  date: Date;
  weekId: string;
  weekNumber: number;
  sports: string[];
  moveframeCount: number;
}

interface PlanWeekRow {
  id: string;
  weekNumber: number;
  startDateLabel: string;
  periodName: string;
  workoutCount: number;
}

interface ImportFromPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (workoutIds: string[], targetDate?: string) => void | Promise<void>;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWeekStart(date: Date | string | undefined | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB');
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export default function ImportFromPlanModal({
  isOpen,
  onClose,
  onConfirm,
}: ImportFromPlanModalProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weeks, setWeeks] = useState<PlanWeekRow[]>([]);
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  /** Step 1 — date that defines from which week import options start */
  const [filterDate, setFilterDate] = useState<string>('');
  /** Step 2 — keep original dates (default) or upload all to one Done date */
  const [keepOriginalDate, setKeepOriginalDate] = useState(true);
  const [targetDate, setTargetDate] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWorkouts(new Set());
    setSelectedWeekIds(new Set());
    setFilterDate('');
    setKeepOriginalDate(true);
    setTargetDate('');
    setLoadError(null);
    void loadWorkouts();
  }, [isOpen]);

  const loadWorkouts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadError('Please sign in first');
        setWorkouts([]);
        setWeeks([]);
        return;
      }

      const response = await fetch('/api/workouts/plan?type=YEARLY_PLAN', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setLoadError('Failed to load Yearly Plan');
        setWorkouts([]);
        setWeeks([]);
        return;
      }

      const data = await response.json();
      const planWeeks = data.plan?.weeks ?? data.weeks ?? [];
      const workoutsList: Workout[] = [];
      const weekRows: PlanWeekRow[] = [];

      planWeeks.forEach((week: any) => {
        const days = week.days ?? [];
        const sortedDays = [...days].sort(
          (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        let weekWorkoutCount = 0;
        let periodName = '';

        sortedDays.forEach((day: any) => {
          if (!periodName && (day.period?.name || day.periodName)) {
            periodName = day.period?.name || day.periodName;
          }
          (day.workouts ?? []).forEach((workout: any) => {
            const mfCount = workout.moveframes?.length ?? 0;
            if (mfCount <= 0) return;
            weekWorkoutCount += 1;
            workoutsList.push({
              id: workout.id,
              name: workout.name || `Workout ${workout.sessionNumber ?? ''}`,
              code: workout.code || '',
              sessionNumber: workout.sessionNumber,
              date: new Date(day.date),
              weekId: week.id,
              weekNumber: week.weekNumber,
              sports:
                workout.sports?.map((s: any) => s.sport || s).filter(Boolean) ||
                [],
              moveframeCount: mfCount,
            });
          });
        });

        weekRows.push({
          id: week.id,
          weekNumber: week.weekNumber,
          startDateLabel: formatWeekStart(sortedDays[0]?.date),
          periodName: periodName || week.period?.name || '',
          workoutCount: weekWorkoutCount,
        });
      });

      workoutsList.sort((a, b) => a.date.getTime() - b.date.getTime());
      weekRows.sort((a, b) => a.weekNumber - b.weekNumber);
      setWorkouts(workoutsList);
      setWeeks(weekRows);
    } catch (error) {
      console.error('Error loading workouts:', error);
      setLoadError('Failed to load Yearly Plan');
      setWorkouts([]);
      setWeeks([]);
    } finally {
      setIsLoading(false);
    }
  };

  /** Weeks available in Step 3: from the week that contains Step 1 date onward. */
  const selectableWeeks = useMemo(() => {
    if (!filterDate) return weeks;
    const filterTs = startOfLocalDay(new Date(filterDate + 'T12:00:00'));
    const weekIdOnDate = workouts.find(
      (w) => startOfLocalDay(w.date) === filterTs,
    )?.weekId;

    if (weekIdOnDate) {
      const startWeek = weeks.find((w) => w.id === weekIdOnDate);
      if (startWeek) {
        return weeks.filter((w) => w.weekNumber >= startWeek.weekNumber);
      }
    }

    // Fallback: week whose first day is on/after the filter date
    const withStart = weeks
      .map((w) => {
        const dayWorkouts = workouts.filter((x) => x.weekId === w.id);
        const minTs = dayWorkouts.length
          ? Math.min(...dayWorkouts.map((x) => startOfLocalDay(x.date)))
          : null;
        return { w, minTs };
      })
      .filter((x) => x.minTs != null && x.minTs! >= filterTs)
      .sort((a, b) => a.minTs! - b.minTs!);

    if (withStart.length) {
      const firstNum = withStart[0].w.weekNumber;
      return weeks.filter((w) => w.weekNumber >= firstNum);
    }

    return weeks;
  }, [weeks, workouts, filterDate]);

  // When Step 1 date or week list changes, reset / auto-pick first week that has content
  useEffect(() => {
    if (!isOpen) return;
    if (!selectableWeeks.length) {
      setSelectedWeekIds(new Set());
      setSelectedWorkouts(new Set());
      return;
    }
    const preferred =
      selectableWeeks.find((w) => w.workoutCount > 0)?.id ?? selectableWeeks[0].id;
    setSelectedWeekIds(new Set([preferred]));
    setSelectedWorkouts(new Set());
  }, [isOpen, filterDate, selectableWeeks]);

  const filtered = useMemo(() => {
    if (selectedWeekIds.size === 0) return [];
    return workouts.filter((w) => selectedWeekIds.has(w.weekId));
  }, [workouts, selectedWeekIds]);

  const toggleWeek = (weekId: string) => {
    setSelectedWeekIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        if (next.size === 1) return prev; // keep at least one week
        next.delete(weekId);
      } else {
        if (next.size >= MAX_IMPORT_WEEKS) {
          alert(`You can select at most ${MAX_IMPORT_WEEKS} weeks at a time.`);
          return prev;
        }
        next.add(weekId);
      }
      return next;
    });
    setSelectedWorkouts(new Set());
  };

  const selectAllWeeks = () => {
    const capped = selectableWeeks.slice(0, MAX_IMPORT_WEEKS).map((w) => w.id);
    setSelectedWeekIds(new Set(capped));
    setSelectedWorkouts(new Set());
  };

  const deselectAllWeeks = () => {
    if (!selectableWeeks.length) {
      setSelectedWeekIds(new Set());
      return;
    }
    // Keep first week so the list isn't empty
    setSelectedWeekIds(new Set([selectableWeeks[0].id]));
    setSelectedWorkouts(new Set());
  };

  const handleToggleWorkout = (workoutId: string) => {
    setSelectedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });
  };

  const handleSelectAllWorkouts = () => {
    if (selectedWorkouts.size === filtered.length && filtered.length > 0) {
      setSelectedWorkouts(new Set());
    } else {
      setSelectedWorkouts(new Set(filtered.map((w) => w.id)));
    }
  };

  const handleConfirm = async () => {
    if (selectedWeekIds.size === 0) {
      alert('Please select at least one week (Step 3)');
      return;
    }
    if (selectedWeekIds.size > MAX_IMPORT_WEEKS) {
      alert(`Maximum ${MAX_IMPORT_WEEKS} weeks at a time`);
      return;
    }
    if (selectedWorkouts.size === 0) {
      alert('Please select at least one workout to import');
      return;
    }
    if (!keepOriginalDate && !targetDate) {
      alert('Please select the upload date for Workouts Done');
      return;
    }

    setIsImporting(true);
    try {
      await onConfirm(
        Array.from(selectedWorkouts),
        keepOriginalDate ? undefined : targetDate,
      );
      onClose();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import workouts');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const canImport =
    selectedWorkouts.size > 0 &&
    selectedWeekIds.size > 0 &&
    selectedWeekIds.size <= MAX_IMPORT_WEEKS &&
    !isImporting &&
    (keepOriginalDate || Boolean(targetDate));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6" />
              <h2 className="text-xl font-bold">Import from Yearly Plan</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              disabled={isImporting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                Select workouts from your Yearly Plan to import into the Workouts Done
                section.
              </p>
            </div>

            {/* Step 1 */}
            <div className="border border-purple-200 rounded-lg p-4 space-y-2 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  Step 1
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Source date (Yearly Plan)
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                >
                  Clear Filter
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-indigo-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  Step 2
                </span>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={keepOriginalDate}
                  onChange={() => setKeepOriginalDate(true)}
                  className="w-4 h-4 mt-0.5"
                />
                <span>
                  <span className="text-sm font-medium text-gray-900">
                    Keep the original dates
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!keepOriginalDate}
                  onChange={() => setKeepOriginalDate(false)}
                  className="w-4 h-4 mt-0.5"
                />
                <span className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Upload to a specific date
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5 mb-2">
                  </span>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    disabled={keepOriginalDate}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100 w-full max-w-xs"
                  />
                </span>
              </label>
            </div>

            {/* Step 3 — weeks */}
            <div className="border border-emerald-200 rounded-lg p-4 space-y-3 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Step 3
                </span>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Select Target Weeks ({selectedWeekIds.size} selected)
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllWeeks}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllWeeks}
                    className="text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg max-h-56 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">Loading weeks…</div>
                ) : selectableWeeks.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    No weeks available{filterDate ? ' from this date' : ''}
                  </div>
                ) : (
                  selectableWeeks.map((week) => {
                    const isSelected = selectedWeekIds.has(week.id);
                    const atLimit =
                      !isSelected && selectedWeekIds.size >= MAX_IMPORT_WEEKS;
                    return (
                      <label
                        key={week.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 ${
                          atLimit
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : isSelected
                              ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                              : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={atLimit}
                          onChange={() => toggleWeek(week.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">
                            Week {week.weekNumber}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {week.startDateLabel}
                            {week.periodName ? ` • ${week.periodName}` : ''}
                            {week.workoutCount > 0
                              ? ` • ${week.workoutCount} workout(s)`
                              : ' • empty'}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Workouts in selected weeks */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-medium text-gray-700">
                {filtered.length} workout(s) in selected week(s)
              </span>
              <button
                type="button"
                onClick={handleSelectAllWorkouts}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-sm font-medium disabled:opacity-50"
              >
                <CheckSquare className="w-4 h-4" />
                {selectedWorkouts.size === filtered.length && filtered.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading workouts…</div>
              ) : loadError ? (
                <div className="text-center py-8 text-red-600 text-sm">{loadError}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No workouts found in the selected week(s)
                </div>
              ) : (
                filtered.map((workout) => (
                  <label
                    key={workout.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedWorkouts.has(workout.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkouts.has(workout.id)}
                      onChange={() => handleToggleWorkout(workout.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{workout.name}</span>
                        {workout.code ? (
                          <span className="text-xs text-gray-500">({workout.code})</span>
                        ) : null}
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          W{workout.weekNumber}
                          {workout.sessionNumber != null ? ` · WO ${workout.sessionNumber}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {workout.date.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {workout.moveframeCount} moveframe(s)
                        </span>
                        {workout.sports.length > 0 && (
                          <span className="text-xs text-indigo-600">
                            {workout.sports.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {selectedWorkouts.size > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  {selectedWorkouts.size} workout(s) · {selectedWeekIds.size} week(s) ·{' '}
                  {keepOriginalDate
                    ? 'keep original dates'
                    : `upload to ${targetDate || '…'}`}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!canImport}
              className={`px-4 py-2 rounded-lg font-medium ${
                !canImport
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isImporting
                ? 'Importing…'
                : `Import ${selectedWorkouts.size} Workout(s)`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
