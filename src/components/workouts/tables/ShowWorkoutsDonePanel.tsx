'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import DayRowTable from './DayRowTable';
import WorkoutHierarchyView from './WorkoutHierarchyView';
import RelocatePlannedDayModal from '../modals/RelocatePlannedDayModal';
import { doneButtonClassName } from '@/utils/exportToDoneClient';

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

async function reloadDoneDays(): Promise<any[]> {
  const token = localStorage.getItem('token');
  if (!token) return [];
  const weeks = mergeWeeksByWeekNumber(await fetchPlanWeeks(token, 'WORKOUTS_DONE'));
  return flattenPlanDays(weeks);
}

type Props = {
  /** Yearly Plan day currently selected (anchor). */
  plannedDay: any;
  iconType?: 'emoji' | 'icon';
  onClose: () => void;
  onRefreshPlan?: () => Promise<void> | void;
  showMessage?: (type: 'success' | 'error' | 'warning', text: string) => void;
};

/**
 * Yearly Plan → Show workouts DONE
 * Browse Workouts Done days and apply / match them to the current planned day.
 *
 * CASE 1 same date: copy Done → Yearly Plan day
 * CASE 2 different dates: relocate planned (move/exchange) then copy Done onto Done date in Yearly Plan
 */
export default function ShowWorkoutsDonePanel({
  plannedDay,
  iconType,
  onClose,
  onRefreshPlan,
  showMessage,
}: Props) {
  const [doneDays, setDoneDays] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [fullyExpandedWorkouts, setFullyExpandedWorkouts] = useState<Set<string>>(new Set());
  const [relocateOpen, setRelocateOpen] = useState(false);
  const [pendingApply, setPendingApply] = useState<{
    mode: 'day' | 'workout';
    workoutId?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const focusDay = useCallback(
    (days: any[], dayIdOrDate?: string | Date | null) => {
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
      if (matchIdx < 0 && plannedDay?.date) {
        matchIdx = days.findIndex((d) => sameCalendarDay(d.date, plannedDay.date));
      }
      const idx = matchIdx >= 0 ? matchIdx : 0;
      setIndex(idx);
      const day = days[idx];
      if (day?.workouts?.length) {
        setExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
        setFullyExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
      }
    },
    [plannedDay?.date],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const days = await reloadDoneDays();
        if (cancelled) return;
        setDoneDays(days);
        focusDay(days, plannedDay?.date);
      } catch {
        if (!cancelled) setDoneDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plannedDay?.date, plannedDay?.id, focusDay]);

  const current = doneDays[index] ?? null;
  const datesDiffer = Boolean(
    current?.date && plannedDay?.date && !sameCalendarDay(current.date, plannedDay.date),
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
      const next = Math.min(doneDays.length - 1, Math.max(0, i + delta));
      const day = doneDays[next];
      if (day?.workouts?.length) {
        setExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
        setFullyExpandedWorkouts(new Set(day.workouts.map((w: any) => w.id)));
      }
      return next;
    });
  };

  const runApply = useCallback(
    async (opts: {
      relocateMode?: 'move' | 'exchange';
      workoutId?: string;
    }) => {
      if (!plannedDay?.id || !current?.id) return;
      setBusy(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not signed in');
        const response = await fetch('/api/workouts/days/apply-done-to-planned', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plannedDayId: plannedDay.id,
            doneDayId: current.id,
            mode: opts.relocateMode,
            sourceWorkoutId: opts.workoutId,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to apply Done workouts');
        }
        showMessage?.(
          'success',
          data.case === 2
            ? `Planned day relocated (${opts.relocateMode}), then ${data.appliedWorkouts} Done workout(s) applied.`
            : `Copied ${data.appliedWorkouts} Done workout(s) into Yearly Plan (same date).`,
        );
        setRelocateOpen(false);
        setPendingApply(null);
        await onRefreshPlan?.();
      } catch (err) {
        showMessage?.(
          'error',
          err instanceof Error ? err.message : 'Failed to apply Done workouts',
        );
      } finally {
        setBusy(false);
      }
    },
    [plannedDay?.id, current?.id, showMessage, onRefreshPlan],
  );

  const requestApply = useCallback(
    (kind: 'day' | 'workout', workoutId?: string) => {
      if (!current) return;
      const workouts =
        kind === 'workout'
          ? (current.workouts ?? []).filter((w: any) => w.id === workoutId)
          : (current.workouts ?? []).filter((w: any) => (w.moveframes?.length ?? 0) > 0);
      if (!workouts.length) {
        showMessage?.('error', 'No Done workouts with moveframes to apply');
        return;
      }
      if (datesDiffer) {
        setPendingApply({ mode: kind, workoutId });
        setRelocateOpen(true);
        return;
      }
      void runApply({ workoutId: kind === 'workout' ? workoutId : undefined });
    },
    [current, datesDiffer, runApply, showMessage],
  );

  if (loading) {
    return (
      <div className="mt-2 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
        Loading Workouts Done…
      </div>
    );
  }

  if (!current || !fakeWeek) {
    return (
      <div className="mt-2 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between">
        <span>No Workouts Done days found.</span>
        <button type="button" onClick={onClose} className="p-1 hover:bg-red-100 rounded">
          <X size={16} />
        </button>
      </div>
    );
  }

  const plannedLabel = plannedDay?.date
    ? new Date(plannedDay.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  const doneLabel = new Date(current.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="mt-2 rounded-lg border-2 border-red-600 bg-white shadow-md overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-red-600 text-white px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm tracking-wide">WORKOUTS DONE</span>
          <span className="text-xs text-red-100 truncate">
            Match to planned {plannedLabel}
            {datesDiffer ? (
              <span className="ml-1 font-semibold text-amber-200">
                · dates differ → relocate required
              </span>
            ) : (
              <span className="ml-1 text-red-100">· same date → copy</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => browseDay(-1)}
            disabled={index <= 0 || busy}
            className="p-1 rounded border border-white/40 disabled:opacity-40 hover:bg-red-500"
            title="Previous Done day"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[11px] tabular-nums px-1">
            {index + 1} / {doneDays.length}
          </span>
          <button
            type="button"
            onClick={() => browseDay(1)}
            disabled={index >= doneDays.length - 1 || busy}
            className="p-1 rounded border border-white/40 disabled:opacity-40 hover:bg-red-500"
            title="Next Done day"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 p-1 rounded hover:bg-red-500"
            title="Hide workouts DONE"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-2 bg-red-50/30">
        <table className="border-collapse text-sm min-w-[900px] w-full">
          <tbody>
            <DayRowTable
              day={current}
              currentWeek={fakeWeek}
              isExpanded={expanded}
              activeSection="C"
              iconType={iconType}
              onToggleDay={() => setExpanded((v) => !v)}
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
              onExportDayToDone={() => requestApply('day')}
              onShowDayInfo={() => undefined}
              onShowDayOverview={() => undefined}
            />
          </tbody>
        </table>

        {/* Explicit day Done apply (DayRowTable Done is Section B-only) */}
        <div className="mt-2 flex items-center gap-2 px-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => requestApply('day')}
            className={doneButtonClassName(false)}
            title={
              datesDiffer
                ? 'Different dates: will relocate Yearly Plan then apply Done'
                : 'Copy Done workouts into this Yearly Plan day (same date)'
            }
          >
            {busy ? 'Applying…' : 'Done'}
          </button>
          <span className="text-[11px] text-gray-600">
            Apply selected Done day ({doneLabel}) to planned ({plannedLabel})
          </span>
        </div>

        {expanded && (
          <div className="mt-2 ml-2">
            {(current.workouts?.length ?? 0) > 0 ? (
              <WorkoutHierarchyView
                day={current}
                activeSection="C"
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
                onMarkWorkoutDone={(workout) => requestApply('workout', workout.id)}
                onExportWorkoutToDone={(workout) => requestApply('workout', workout.id)}
              />
            ) : (
              <p className="text-xs text-gray-500 px-2 py-1">No workouts on this Done day.</p>
            )}
          </div>
        )}
      </div>

      {relocateOpen && current && (
        <RelocatePlannedDayModal
          isOpen
          plannedDayDate={plannedDay.date}
          doneDayDate={current.date}
          onClose={() => {
            setRelocateOpen(false);
            setPendingApply(null);
          }}
          onConfirm={async (relocateMode) => {
            await runApply({
              relocateMode,
              workoutId: pendingApply?.mode === 'workout' ? pendingApply.workoutId : undefined,
            });
          }}
        />
      )}
    </div>
  );
}
