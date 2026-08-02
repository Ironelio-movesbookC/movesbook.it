'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle2, Copy } from 'lucide-react';
import { fetchPlanWeeks, getDayWorkoutCount } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import {
  DEFAULT_DONE_COLOR_STATUS,
  isManualDoneStatus,
  isYearlyWorkoutStatus,
  workoutSymbolForSlot,
  YEARLY_WORKOUT_MANUAL_STATUSES,
  yearlyWorkoutStatusStyle,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';

export type SaveToDoneWorkoutTarget = {
  id: string;
  sessionNumber: number;
  name?: string | null;
  status?: string | null;
  moveframes?: unknown[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'workout' | 'day';
  /** Yearly Plan source day (defaults week/day matching). */
  sourceDay: {
    id: string;
    date?: string | Date;
    dayOfWeek?: number;
    weekNumber?: number;
  };
  /**
   * When saving from Workouts Done → Show planned, prefer this Done calendar day
   * as the default target (same date in Workouts Done).
   */
  preferredTargetDate?: string | Date | null;
  /**
   * Yearly Plan Done button: ALWAYS lock to the same calendar date in Workouts Done.
   * Hides week/day pickers. For a different Done date, use Show workouts DONE.
   */
  lockToSameDate?: boolean;
  sourceWorkouts: SaveToDoneWorkoutTarget[];
  title?: string;
  onConfirm: (args: {
    targetDayIds: string[];
    statusByWorkoutId?: Record<string, YearlyWorkoutStatus>;
  }) => Promise<void>;
};

function sameCalendarDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function weekLabel(week: any): string {
  const firstDay = week.days?.[0];
  const dateDisplay = firstDay
    ? new Date(firstDay.date).toLocaleDateString('en-GB')
    : '';
  return dateDisplay ? `Week ${week.weekNumber} (${dateDisplay})` : `Week ${week.weekNumber}`;
}

function dayLabel(day: any): string {
  return `${new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })} (${getDayWorkoutCount(day)} workout(s))`;
}

export default function SaveToWorkoutsDoneModal({
  isOpen,
  onClose,
  mode,
  sourceDay,
  preferredTargetDate,
  lockToSameDate = false,
  sourceWorkouts,
  title = 'Save to Workouts Done',
  onConfirm,
}: Props) {
  const [doneWeeks, setDoneWeeks] = useState<any[]>([]);
  const [selectedWeekIds, setSelectedWeekIds] = useState<string[]>([]);
  const [selectedDayIdByWeek, setSelectedDayIdByWeek] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'targets' | 'colors'>('targets');
  const [statusMap, setStatusMap] = useState<Record<string, YearlyWorkoutStatus>>({});

  const plannedWorkouts = useMemo(
    () => sourceWorkouts.filter((w) => (w.moveframes?.length ?? 0) > 0),
    [sourceWorkouts],
  );

  const mfCount = plannedWorkouts.reduce(
    (sum, w) => sum + (w.moveframes?.length ?? 0),
    0,
  );

  useEffect(() => {
    if (!isOpen) return;
    setStep('targets');
    setIsSaving(false);
    void (async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setDoneWeeks([]);
          return;
        }
        const weeks = mergeWeeksByWeekNumber(await fetchPlanWeeks(token, 'WORKOUTS_DONE'));
        setDoneWeeks(weeks);

        const matchDate = preferredTargetDate || sourceDay.date;
        let defaultWeek: any =
          weeks.find((w: any) =>
            (w.days ?? []).some(
              (d: any) => matchDate && sameCalendarDay(d.date, matchDate),
            ),
          ) ??
          weeks.find((w: any) => w.weekNumber === sourceDay.weekNumber) ??
          weeks[0];

        if (!defaultWeek) {
          setSelectedWeekIds([]);
          setSelectedDayIdByWeek({});
          return;
        }

        const defaultDay =
          (defaultWeek.days ?? []).find(
            (d: any) => matchDate && sameCalendarDay(d.date, matchDate),
          ) ??
          (defaultWeek.days ?? []).find(
            (d: any) => d.dayOfWeek === sourceDay.dayOfWeek,
          ) ??
          (defaultWeek.days ?? [])[0];

        setSelectedWeekIds([defaultWeek.id]);
        setSelectedDayIdByWeek(defaultDay ? { [defaultWeek.id]: defaultDay.id } : {});
      } catch {
        setDoneWeeks([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    isOpen,
    preferredTargetDate,
    sourceDay.date,
    sourceDay.dayOfWeek,
    sourceDay.weekNumber,
    sourceWorkouts,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, YearlyWorkoutStatus> = {};
    for (const w of plannedWorkouts) {
      const stored = w.status;
      initial[w.id] =
        isYearlyWorkoutStatus(stored) && isManualDoneStatus(stored)
          ? stored
          : DEFAULT_DONE_COLOR_STATUS;
    }
    setStatusMap(initial);
  }, [isOpen, plannedWorkouts]);

  const sortedSelectedWeeks = useMemo(() => {
    return selectedWeekIds
      .map((id) => doneWeeks.find((w) => w.id === id))
      .filter(Boolean)
      .sort((a: any, b: any) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  }, [selectedWeekIds, doneWeeks]);

  const primaryWeekId = sortedSelectedWeeks[0]?.id ?? '';
  const primaryWeek = doneWeeks.find((w) => w.id === primaryWeekId);
  const primaryDays = useMemo(() => {
    if (!primaryWeek?.days?.length) return [];
    return [...primaryWeek.days].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [primaryWeek]);

  const toggleWeek = (weekId: string) => {
    setSelectedWeekIds((prev) => {
      if (prev.includes(weekId)) {
        if (prev.length === 1) return prev;
        const next = prev.filter((id) => id !== weekId);
        setSelectedDayIdByWeek((map) => {
          const copy = { ...map };
          delete copy[weekId];
          return copy;
        });
        return next;
      }
      const week = doneWeeks.find((w) => w.id === weekId);
      const matchDay =
        (week?.days ?? []).find(
          (d: any) => sourceDay.date && sameCalendarDay(d.date, sourceDay.date!),
        ) ??
        (week?.days ?? []).find((d: any) => d.dayOfWeek === sourceDay.dayOfWeek) ??
        (week?.days ?? [])[0];
      if (matchDay) {
        setSelectedDayIdByWeek((map) => ({ ...map, [weekId]: matchDay.id }));
      }
      return [...prev, weekId];
    });
  };

  /** Keep the same weekday across all selected weeks when primary day changes. */
  const setPrimaryTargetDay = (dayId: string) => {
    const day = primaryDays.find((d: any) => d.id === dayId);
    if (!day) return;
    const dow = day.dayOfWeek;
    setSelectedDayIdByWeek((prev) => {
      const next: Record<string, string> = { ...prev, [primaryWeekId]: dayId };
      for (const week of sortedSelectedWeeks) {
        if (week.id === primaryWeekId) continue;
        const match =
          (week.days ?? []).find((d: any) => d.dayOfWeek === dow) ?? (week.days ?? [])[0];
        if (match) next[week.id] = match.id;
      }
      return next;
    });
  };

  const targetDayIds = useMemo(() => {
    return selectedWeekIds
      .map((weekId) => selectedDayIdByWeek[weekId])
      .filter(Boolean);
  }, [selectedWeekIds, selectedDayIdByWeek]);

  const canContinue =
    targetDayIds.length > 0 &&
    targetDayIds.length === selectedWeekIds.length &&
    plannedWorkouts.length > 0;

  const runSave = async (withColors: boolean) => {
    setIsSaving(true);
    try {
      await onConfirm({
        targetDayIds,
        statusByWorkoutId: withColors ? statusMap : undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (!canContinue) return;
    // Color assignment only when saving into a single week.
    if (selectedWeekIds.length === 1) {
      setStep('colors');
      return;
    }
    await runSave(false);
  };

  if (!isOpen) return null;

  const copyingLabel =
    mode === 'day'
      ? `Day with ${plannedWorkouts.length} workout(s)`
      : plannedWorkouts[0]?.name ||
        `Workout ${plannedWorkouts[0]?.sessionNumber ?? 1}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-green-500 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step === 'colors' ? <CheckCircle2 size={20} /> : <Copy size={20} />}
              <h2 className="text-lg font-bold">
                {step === 'colors' ? 'Assignment colors' : title}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X size={20} />
            </button>
          </div>

          {step === 'targets' ? (
            <div className="p-6 space-y-4">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Copying:</strong> {copyingLabel}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {mfCount} moveframe(s) will be copied
                </p>
              </div>

              {lockToSameDate && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1">Same date only (Yearly Plan → Done)</p>
                  <p>
                    Done always uses the Workouts Done day with the{' '}
                    <strong>same calendar date</strong> as this planned day
                    {sourceDay.date
                      ? ` (${new Date(sourceDay.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })})`
                      : ''}
                    .
                  </p>
                  <p className="mt-1">
                    To save onto a <strong>different</strong> Done date: use{' '}
                    <strong>Show workouts DONE</strong>, open that Done day, then{' '}
                    <strong>Show planned</strong>.
                  </p>
                </div>
              )}

              {isLoading ? (
                <p className="text-sm text-gray-500">Loading Workouts Done weeks…</p>
              ) : lockToSameDate ? (
                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-800">
                  {selectedWeekIds.length && selectedDayIdByWeek[selectedWeekIds[0]] ? (
                    <>
                      <p className="font-medium text-gray-900">Target in Workouts Done</p>
                      <p className="mt-1">
                        {(() => {
                          const w = doneWeeks.find((x) => x.id === selectedWeekIds[0]);
                          const d = (w?.days ?? []).find(
                            (x: any) => x.id === selectedDayIdByWeek[selectedWeekIds[0]],
                          );
                          return d
                            ? dayLabel(d)
                            : 'Matching Done day for this date';
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">{weekLabel(
                        doneWeeks.find((x) => x.id === selectedWeekIds[0]) ?? {
                          weekNumber: sourceDay.weekNumber,
                        },
                      )}</p>
                    </>
                  ) : (
                    <p className="text-red-700">
                      No Workouts Done day found for this date. Create or open the Done week that
                      includes this calendar day, then try again.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Target Week(s) — you can choose more than one:
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded divide-y">
                      {doneWeeks.map((week) => {
                        const checked = selectedWeekIds.includes(week.id);
                        return (
                          <label
                            key={week.id}
                            className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                              checked ? 'bg-green-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleWeek(week.id)}
                            />
                            <span>{weekLabel(week)}</span>
                          </label>
                        );
                      })}
                      {doneWeeks.length === 0 && (
                        <p className="px-3 py-2 text-sm text-gray-500">
                          No Workouts Done weeks found. Create a yearly plan first.
                        </p>
                      )}
                    </div>
                  </div>

                  {primaryWeekId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Target Day
                        {selectedWeekIds.length > 1
                          ? ' (same weekday applied to each selected week):'
                          : ':'}
                      </label>
                      <select
                        value={selectedDayIdByWeek[primaryWeekId] ?? ''}
                        onChange={(e) => setPrimaryTargetDay(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Choose a day...</option>
                        {primaryDays.map((day: any) => (
                          <option key={day.id} value={day.id}>
                            {dayLabel(day)}
                          </option>
                        ))}
                      </select>
                      {selectedWeekIds.length > 1 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Saving into {selectedWeekIds.length} weeks of Workouts Done.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                Assign a Done color (greens / blues) for each Yearly Plan symbol. Yellow / orange / red
                are automatic and are not listed here.
              </p>
              {plannedWorkouts.map((workout) => {
                const slot = Math.min(3, Math.max(1, workout.sessionNumber || 1)) as 1 | 2 | 3;
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
          )}

          <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
            {step === 'colors' && (
              <button
                type="button"
                onClick={() => setStep('targets')}
                disabled={isSaving}
                className="mr-auto px-4 py-2 text-sm border border-gray-300 rounded"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            {step === 'targets' ? (
              <button
                type="button"
                onClick={() => void handlePrimaryAction()}
                disabled={!canContinue || isSaving || isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {selectedWeekIds.length === 1
                  ? 'Next — assign colors'
                  : `Save to ${selectedWeekIds.length} week(s)`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void runSave(true)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save to Workouts Done'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
