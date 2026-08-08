'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import DayRowTable from './DayRowTable';
import WorkoutHierarchyView from './WorkoutHierarchyView';
import SaveToWorkoutsDoneModal from '../modals/SaveToWorkoutsDoneModal';
import RelocatePlannedDayModal from '../modals/RelocatePlannedDayModal';
import {
  patchWorkoutSessionStatus,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';
import { patchMoveframeMarkedDone, postExportToDone } from '@/utils/exportToDoneClient';

function sameCalendarDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function flattenPlanDays(weeks: any[]): any[] {
  const days: any[] = [];
  for (const week of weeks) {
    for (const day of week.days ?? []) {
      days.push({
        ...day,
        weekNumber: week.weekNumber,
        weekId: week.id,
        period: day.period,
      });
    }
  }
  return days.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

async function reloadPlannedDays(): Promise<any[]> {
  const token = localStorage.getItem('token');
  if (!token) return [];
  const weeks = mergeWeeksByWeekNumber(await fetchPlanWeeks(token, 'YEARLY_PLAN'));
  return flattenPlanDays(weeks);
}

type Props = {
  doneDay: any;
  iconType?: 'emoji' | 'icon';
  onClose: () => void;
  onRefreshDone?: () => Promise<void> | void;
  showMessage?: (type: 'success' | 'error' | 'warning', text: string) => void;
};

export default function ShowPlannedDayPanel({
  doneDay,
  iconType,
  onClose,
  onRefreshDone,
  showMessage,
}: Props) {
  const [plannedDays, setPlannedDays] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [fullyExpandedWorkouts, setFullyExpandedWorkouts] = useState<Set<string>>(new Set());
  const [saveModal, setSaveModal] = useState<{
    mode: 'workout' | 'day';
    day: any;
    workouts: any[];
  } | null>(null);
  const [relocateOpen, setRelocateOpen] = useState(false);

  const focusDay = useCallback((days: any[], dayIdOrDate?: string | Date | null) => {
    if (!days.length) {
      setIndex(0);
      return;
    }
    let matchIdx = -1;
    if (typeof dayIdOrDate === 'string' && dayIdOrDate.length > 8) {
      matchIdx = days.findIndex((d) => d.id === dayIdOrDate);
    }
    if (matchIdx < 0 && dayIdOrDate) {
      matchIdx = days.findIndex((d) => sameCalendarDay(d.date, dayIdOrDate));
    }
    if (matchIdx < 0 && doneDay?.date) {
      matchIdx = days.findIndex((d) => sameCalendarDay(d.date, doneDay.date));
    }
    const idx = matchIdx >= 0 ? matchIdx : 0;
    setIndex(idx);
    const day = days[idx];
    if (day?.workouts?.length) {
      setExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
      setFullyExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
    }
  }, [doneDay?.date]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const days = await reloadPlannedDays();
        if (cancelled) return;
        setPlannedDays(days);
        focusDay(days, doneDay?.date);
      } catch {
        if (!cancelled) setPlannedDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doneDay?.date, doneDay?.id, focusDay]);

  const current = plannedDays[index] ?? null;
  const datesDiffer = Boolean(
    current?.date &&
      doneDay?.date &&
      !sameCalendarDay(current.date, doneDay.date),
  );

  const fakeWeek = useMemo(
    () =>
      current
        ? {
            id: current.weekId,
            weekNumber: current.weekNumber,
            days: [current],
            period: current.period,
          }
        : null,
    [current],
  );

  const browseDay = (delta: number) => {
    setIndex((i) => {
      const next = Math.min(plannedDays.length - 1, Math.max(0, i + delta));
      const day = plannedDays[next];
      if (day?.workouts?.length) {
        setExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
        setFullyExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
      }
      return next;
    });
  };

  const handleChangePlannedDay = () => {
    if (!current) return;
    if (datesDiffer) {
      setRelocateOpen(true);
      return;
    }
    // Same date as Done: cycle to next/prev so user can pick another day
    if (index < plannedDays.length - 1) browseDay(1);
    else if (index > 0) browseDay(-1);
  };

  const openSave = useCallback(
    (mode: 'workout' | 'day', day: any, workouts: any[]) => {
      const exportable = workouts.filter((w) => w?.moveframes?.length > 0);
      if (!exportable.length) {
        showMessage?.('error', 'No planned workouts with moveframes to mark done');
        return;
      }
      if (
        day?.date &&
        doneDay?.date &&
        !sameCalendarDay(day.date, doneDay.date)
      ) {
        setRelocateOpen(true);
        return;
      }
      setSaveModal({ mode, day, workouts: exportable });
    },
    [doneDay?.date, showMessage],
  );

  const handleDayDone = useCallback(
    (day: any) => openSave('day', day, day.workouts ?? []),
    [openSave],
  );

  const handleWorkoutDone = useCallback(
    (workout: any, day: any) => openSave('workout', day, [workout]),
    [openSave],
  );

  const handleMoveframeDone = useCallback(
    async (moveframe: any) => {
      if (!moveframe?.id || moveframe.markedDoneAt) return;
      try {
        await patchMoveframeMarkedDone(moveframe.id, true);
        setPlannedDays((prev) =>
          prev.map((d) => ({
            ...d,
            workouts: (d.workouts ?? []).map((w: any) => ({
              ...w,
              moveframes: (w.moveframes ?? []).map((mf: any) =>
                mf.id === moveframe.id
                  ? { ...mf, markedDoneAt: new Date().toISOString() }
                  : mf,
              ),
            })),
          })),
        );
      } catch (err) {
        showMessage?.(
          'error',
          err instanceof Error ? err.message : 'Failed to mark moveframe done',
        );
      }
    },
    [showMessage],
  );

  const handleStatusChange = useCallback(
    async (workoutId: string, status: YearlyWorkoutStatus) => {
      try {
        await patchWorkoutSessionStatus(workoutId, status);
        setPlannedDays((prev) =>
          prev.map((d) => ({
            ...d,
            workouts: (d.workouts ?? []).map((w: any) =>
              w.id === workoutId ? { ...w, status } : w,
            ),
          })),
        );
      } catch (err) {
        showMessage?.(
          'error',
          err instanceof Error ? err.message : 'Failed to update color',
        );
      }
    },
    [showMessage],
  );

  if (loading) {
    return (
      <div className="mt-3 rounded-lg border-2 border-red-400 bg-red-50 p-4">
        <p className="text-sm text-gray-600">Loading planned day…</p>
      </div>
    );
  }

  if (!current || !fakeWeek) {
    return (
      <div className="mt-3 rounded-lg border-2 border-red-400 bg-red-50 p-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">No Yearly Plan day found.</p>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border-2 border-red-500 bg-white overflow-hidden shadow-md">
      <div className="flex items-center justify-between gap-2 bg-red-50 px-3 py-2 border-b border-red-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden>
            🏃‍♂️
          </span>
          <span className="font-bold italic text-red-600 text-sm">Workout planned</span>
          <span className="text-xs text-gray-500 truncate">
            {datesDiffer
              ? 'Different date — use ↔ to move/exchange onto Done day'
              : 'Matching Done day · use ↔ or arrows to browse'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => browseDay(-1)}
            disabled={index <= 0}
            className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-white"
            title="Previous planned day"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[11px] text-gray-600 tabular-nums px-1">
            {index + 1} / {plannedDays.length}
          </span>
          <button
            type="button"
            onClick={() => browseDay(1)}
            disabled={index >= plannedDays.length - 1}
            className="p-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-white"
            title="Next planned day"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 p-1 rounded hover:bg-red-100 text-gray-600"
            title="Hide planned"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-2 bg-amber-50/40">
        <table className="border-collapse text-sm min-w-[900px] w-full">
          <tbody>
            <DayRowTable
              day={current}
              currentWeek={fakeWeek}
              isExpanded={expanded}
              activeSection="B"
              iconType={iconType}
              onToggleDay={() => setExpanded((v) => !v)}
              onChangePlannedDay={handleChangePlannedDay}
              onCycleWorkoutExpansion={(workout) => {
                setExpandedWorkouts((prev) => {
                  const next = new Set(prev);
                  if (next.has(workout.id)) next.delete(workout.id);
                  else next.add(workout.id);
                  return next;
                });
                setFullyExpandedWorkouts((prev) => {
                  const next = new Set(prev);
                  next.add(workout.id);
                  return next;
                });
              }}
              onWorkoutStatusChange={(workoutId, status) => {
                void handleStatusChange(workoutId, status);
              }}
              onExportDayToDone={handleDayDone}
              onShowDayInfo={() => undefined}
              onShowDayOverview={() => undefined}
            />
          </tbody>
        </table>

        {expanded && (
          <div className="mt-2 ml-2">
            {(current.workouts?.length ?? 0) > 0 ? (
              <WorkoutHierarchyView
                day={current}
                activeSection="B"
                iconType={iconType}
                expandedWorkouts={expandedWorkouts}
                fullyExpandedWorkouts={fullyExpandedWorkouts}
                expandState={2}
                onToggleWorkout={(id) => {
                  setExpandedWorkouts((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onMarkWorkoutDone={handleWorkoutDone}
                onMarkMoveframeDone={handleMoveframeDone}
              />
            ) : (
              <p className="text-xs text-gray-500 py-3">No workouts planned on this day.</p>
            )}
          </div>
        )}
      </div>

      {relocateOpen && current && (
        <RelocatePlannedDayModal
          isOpen
          plannedDayDate={current.date}
          doneDayDate={doneDay.date}
          onClose={() => setRelocateOpen(false)}
          onConfirm={async (mode) => {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not signed in');
            const response = await fetch('/api/workouts/days/relocate-planned', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sourcePlannedDayId: current.id,
                targetDoneDayId: doneDay.id,
                mode,
              }),
            });
            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error || 'Failed to relocate planned day');
            }
            const result = await response.json();
            showMessage?.(
              'success',
              mode === 'exchange'
                ? 'Planned days exchanged. Original date saved under Match Done.'
                : 'Planned workouts moved. Original date saved under Match Done.',
            );
            const days = await reloadPlannedDays();
            setPlannedDays(days);
            focusDay(days, result.targetYearlyDayId || doneDay.date);
            await onRefreshDone?.();
          }}
        />
      )}

      {saveModal && (
        <SaveToWorkoutsDoneModal
          isOpen
          mode={saveModal.mode}
          sourceDay={saveModal.day}
          preferredTargetDate={doneDay?.date}
          sourceWorkouts={saveModal.workouts}
          title={
            saveModal.mode === 'day'
              ? 'Mark planned day → Workouts Done'
              : 'Mark planned workout → Workouts Done'
          }
          onClose={() => setSaveModal(null)}
          onConfirm={async ({ targetDayIds, statusByWorkoutId }) => {
            try {
              const result = await postExportToDone({
                mode: saveModal.mode,
                sourceDayId: saveModal.mode === 'day' ? saveModal.day.id : undefined,
                sourceWorkoutId:
                  saveModal.mode === 'workout' ? saveModal.workouts[0]?.id : undefined,
                targetDayIds,
                statusByWorkoutId,
              });
              showMessage?.(
                'success',
                `Saved ${result.exportedCount} workout(s) to Workouts Done.`,
              );
              setSaveModal(null);
              setPlannedDays((prev) =>
                prev.map((d) => {
                  if (saveModal.mode === 'day' && d.id === saveModal.day.id) {
                    return {
                      ...d,
                      exportedToDoneAt: new Date().toISOString(),
                      workouts: (d.workouts ?? []).map((w: any) => ({
                        ...w,
                        exportedToDoneAt: new Date().toISOString(),
                        status: statusByWorkoutId?.[w.id] ?? w.status,
                      })),
                    };
                  }
                  if (saveModal.mode === 'workout') {
                    const wid = saveModal.workouts[0]?.id;
                    return {
                      ...d,
                      workouts: (d.workouts ?? []).map((w: any) =>
                        w.id === wid
                          ? {
                              ...w,
                              exportedToDoneAt: new Date().toISOString(),
                              status: statusByWorkoutId?.[w.id] ?? w.status,
                            }
                          : w,
                      ),
                    };
                  }
                  return d;
                }),
              );
              await onRefreshDone?.();
            } catch (err) {
              showMessage?.(
                'error',
                err instanceof Error ? err.message : 'Failed to save to Workouts Done',
              );
              throw err;
            }
          }}
        />
      )}
    </div>
  );
}
