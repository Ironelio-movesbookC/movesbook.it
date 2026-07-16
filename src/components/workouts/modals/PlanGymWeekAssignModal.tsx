'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, CheckCircle2, GripVertical } from 'lucide-react';
import type { PlanGymWeekManualResult } from './PlanGymWeekManualModal';
import { getGoalLabel, type GoalId } from './PlanGymWeekModal';
import type { GymWeekSlotAssignment, GymWeekWeekAssignment, GymWeekPlanSourceSection } from '@/types/gymWeekAssignment';
import {
  assignedRoutineDayIndices,
  saveGymWeekAssignment,
} from '@/utils/gymWeekAssignmentStorage';
import { applyGymWeekPlanToWorkouts } from '@/utils/gymWeekPlanApply';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { sortWorkoutsForDisplay } from '@/lib/workoutDisplayOrder';
import {
  calculateWorkoutSportSummaries,
  formatSportSummaryTotal,
  type SportSummary,
} from '@/utils/workoutHelpers';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const WORKOUTS = [1, 2, 3] as const;

type PlanDayRecord = {
  id?: string;
  dayOfWeek?: number;
  date?: string;
  workouts?: Record<string, unknown>[];
};

type WeekDayDetail = {
  id: string;
  weekNumber: number;
  days?: PlanDayRecord[];
};

type WeekMeta = { id: string; weekNumber: number };

type Props = {
  isOpen: boolean;
  plan: PlanGymWeekManualResult;
  goals: GoalId[];
  targetWeeks: WeekMeta[];
  sourceSection?: GymWeekPlanSourceSection;
  templateKey?: 'A' | 'B' | 'C';
  /** Calendar days (1–7) available for assignment; defaults to all weekdays */
  allowedDays?: number[];
  /** Week day records (with dates) from the picker — used for single-week Yearly Plan */
  targetWeekDetails?: WeekDayDetail[];
  /** Existing assignment when editing (first week used as template for slots). */
  initialAssignment?: GymWeekWeekAssignment | null;
  onClose: () => void;
  onDone: () => void | Promise<void>;
};

function slotKey(dayOfWeek: number, workoutIndex: number) {
  return `${dayOfWeek}-${workoutIndex}`;
}

function dayForWeek(week: WeekDayDetail | undefined, dayOfWeek: number): PlanDayRecord | null {
  if (!week?.days?.length) return null;
  return week.days.find((d) => d.dayOfWeek === dayOfWeek) ?? week.days[dayOfWeek - 1] ?? null;
}

function dayDateForWeek(week: WeekDayDetail | undefined, dayOfWeek: number): string | undefined {
  const rec = dayForWeek(week, dayOfWeek);
  if (!rec?.date) return undefined;
  return new Date(rec.date).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function workoutForSlot(day: PlanDayRecord | null, slotIndex: number): Record<string, unknown> | null {
  if (!day?.workouts?.length) return null;
  const sorted = sortWorkoutsForDisplay(day.workouts as Parameters<typeof sortWorkoutsForDisplay>[0]);
  const bySession = sorted.find((w) => w.sessionNumber === slotIndex);
  if (bySession) return bySession as Record<string, unknown>;
  return (sorted[slotIndex - 1] as Record<string, unknown> | undefined) ?? null;
}

function routineCardLabel(idx: number, routineName?: string): string {
  const trimmed = (routineName ?? '').trim();
  if (trimmed) return trimmed;
  return `Routine ${String.fromCharCode(65 + idx)}`;
}

function sportTimeLabel(summary: SportSummary): string {
  if (summary.isSeriesBased) {
    const reps = summary.duration && summary.duration !== '0' ? summary.duration : '';
    return reps ? `${reps} reps` : '';
  }
  if (summary.duration && summary.duration !== '0:00:00' && summary.duration !== '0:00') {
    return summary.duration;
  }
  return '';
}

function SportSummaryCell({ summary }: { summary?: SportSummary }) {
  if (!summary) {
    return <span className="text-xs text-gray-300">—</span>;
  }
  const total = formatSportSummaryTotal(summary);
  const time = sportTimeLabel(summary);
  const totalLine = [total !== '—' ? total : null, time || null].filter(Boolean).join(' · ');
  return (
    <div className="min-w-[72px] text-xs leading-snug">
      <div className="flex items-center gap-1 font-semibold text-gray-900">
        <span className="text-base leading-none" aria-hidden>
          {summary.icon}
        </span>
        <span className="truncate uppercase tracking-tight">
          {summary.sport.replace(/_/g, ' ')}
        </span>
      </div>
      {totalLine ? (
        <div className="mt-0.5 text-[10px] font-medium text-gray-600">{totalLine}</div>
      ) : null}
    </div>
  );
}

export default function PlanGymWeekAssignModal({
  isOpen,
  plan,
  goals,
  targetWeeks,
  sourceSection,
  templateKey,
  allowedDays = [1, 2, 3, 4, 5, 6, 7],
  targetWeekDetails,
  initialAssignment,
  onClose,
  onDone,
}: Props) {
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [dragRoutineIdx, setDragRoutineIdx] = useState<number | null>(null);
  const [weekDetails, setWeekDetails] = useState<WeekDayDetail[]>(targetWeekDetails ?? []);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildSlotsFromInitial = useCallback((): Map<string, number> => {
    const m = new Map<string, number>();
    for (const s of initialAssignment?.slots ?? []) {
      m.set(slotKey(s.dayOfWeek, s.workoutIndex), s.routineDayIndex);
    }
    return m;
  }, [initialAssignment]);

  const [slotMap, setSlotMap] = useState<Map<string, number>>(buildSlotsFromInitial);

  useEffect(() => {
    if (isOpen) {
      setSlotMap(buildSlotsFromInitial());
      setActiveWeekIdx(0);
      setDragRoutineIdx(null);
    }
  }, [isOpen, buildSlotsFromInitial]);

  useEffect(() => {
    if (!isOpen || targetWeeks.length === 0) return;

    const hasMoveframeData = (weeks: WeekDayDetail[]) =>
      weeks.some((w) =>
        w.days?.some((d) =>
          d.workouts?.some((wo) => Array.isArray((wo as { moveframes?: unknown[] }).moveframes)),
        ),
      );

    if (targetWeekDetails?.length && hasMoveframeData(targetWeekDetails)) {
      setWeekDetails(targetWeekDetails);
      return;
    }

    void (async () => {
      setLoadingWeeks(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setWeekDetails(targetWeekDetails ?? []);
          return;
        }
        const planType = sourceSection === 'B' ? 'YEARLY_PLAN' : 'TEMPLATE_WEEKS';
        const section = sourceSection === 'A' ? templateKey : undefined;
        const raw = await fetchPlanWeeks(token, planType, section);
        const enriched = targetWeeks
          .map((tw) => raw.find((w: { id: string }) => w.id === tw.id))
          .filter(Boolean)
          .map((w: { id: string; weekNumber: number; days?: PlanDayRecord[] }) => ({
            id: w.id,
            weekNumber: w.weekNumber,
            days: w.days,
          }));
        setWeekDetails(enriched.length ? enriched : (targetWeekDetails ?? []));
      } catch {
        setWeekDetails(targetWeekDetails ?? []);
      } finally {
        setLoadingWeeks(false);
      }
    })();
  }, [isOpen, targetWeeks, targetWeekDetails, sourceSection, templateKey]);

  const slotsList: GymWeekSlotAssignment[] = useMemo(() => {
    const out: GymWeekSlotAssignment[] = [];
    slotMap.forEach((routineDayIndex, key) => {
      const [d, w] = key.split('-').map(Number);
      out.push({ dayOfWeek: d, workoutIndex: w, routineDayIndex });
    });
    return out;
  }, [slotMap]);

  const allowedDaySet = useMemo(() => new Set(allowedDays), [allowedDays]);

  const visibleDayIndices = useMemo(
    () => DAY_NAMES.map((_, idx) => idx).filter((idx) => allowedDaySet.has(idx + 1)),
    [allowedDaySet],
  );

  const assignedRoutines = useMemo(
    () => assignedRoutineDayIndices({ weekId: '', plan, slots: slotsList, updatedAt: '' }),
    [slotsList, plan],
  );

  const assignRoutine = (dayOfWeek: number, workoutIndex: number, routineDayIndex: number) => {
    setSlotMap((prev) => {
      const next = new Map(prev);
      for (const [k, v] of Array.from(next.entries())) {
        if (v === routineDayIndex) next.delete(k);
      }
      const distinctDays = new Set<number>();
      next.forEach((_routineIdx, key) => {
        distinctDays.add(Number(key.split('-')[0]));
      });
      const targetAlreadyUsed = Array.from(next.entries()).some(
        ([key, routineIdx]) =>
          Number(key.split('-')[0]) === dayOfWeek && routineIdx !== routineDayIndex,
      );
      if (
        !targetAlreadyUsed &&
        !distinctDays.has(dayOfWeek) &&
        distinctDays.size >= plan.days.length
      ) {
        return prev;
      }
      next.set(slotKey(dayOfWeek, workoutIndex), routineDayIndex);
      return next;
    });
  };

  const clearSlot = (dayOfWeek: number, workoutIndex: number) => {
    setSlotMap((prev) => {
      const next = new Map(prev);
      next.delete(slotKey(dayOfWeek, workoutIndex));
      return next;
    });
  };

  const handleSave = async () => {
    if (slotsList.length === 0) {
      setSaveError('Assign at least one routine to a day and workout slot before saving.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    const now = new Date().toISOString();
    const assignments: GymWeekWeekAssignment[] = targetWeeks.map((w) => ({
      weekId: w.id,
      weekNumber: w.weekNumber,
      plan,
      slots: slotsList,
      updatedAt: now,
      sourceSection,
      templateKey,
    }));

    try {
      await applyGymWeekPlanToWorkouts(assignments, goals);
      for (const assignment of assignments) {
        saveGymWeekAssignment(assignment);
      }
      await onDone();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save gym week plan');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeWeek = targetWeeks[activeWeekIdx];
  const activeWeekDetail = weekDetails.find((w) => w.id === activeWeek?.id);
  const showDayDates = Boolean(activeWeekDetail && dayDateForWeek(activeWeekDetail, 1));

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/55 p-2 sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign routines to days</h2>
            <p className="text-xs text-gray-600">
              Drag each routine card onto a day and workout (WO). Use ✕ on a slot to free the routine
              again. Sport columns show activities already planned in each workout slot (icon, total
              distance or series, and time).
              {allowedDays.length < 7
                ? ` Only the weekdays you selected are shown below.`
                : ''}
              {targetWeeks.length > 1
                ? ` Same layout will be saved for ${targetWeeks.length} selected weeks.`
                : activeWeek
                  ? ` Week ${activeWeek.weekNumber}.`
                  : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {targetWeeks.length > 1 && (
          <div className="flex flex-shrink-0 gap-1 border-b border-gray-100 bg-white px-3 py-2">
            {targetWeeks.map((w, i) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWeekIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  i === activeWeekIdx ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Week {w.weekNumber}
              </button>
            ))}
          </div>
        )}

        <div className="flex-shrink-0 border-b border-amber-100 bg-amber-50/80 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {plan.days.map((day, idx) => {
              const assigned = assignedRoutines.has(idx);
              const goalLabel = getGoalLabel(goals[idx]);
              return (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => setDragRoutineIdx(idx)}
                  onDragEnd={() => setDragRoutineIdx(null)}
                  className={`min-w-[128px] cursor-grab rounded-lg border-2 px-3 py-2 text-left active:cursor-grabbing ${
                    dragRoutineIdx === idx
                      ? 'border-amber-500 bg-amber-100'
                      : assigned
                        ? 'border-green-400 bg-white'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500">
                    <GripVertical className="h-3 w-3" />
                    Day {idx + 1}
                  </div>
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {routineCardLabel(idx, day.routineName)}
                  </div>
                  {goalLabel ? (
                    <div className="truncate text-[10px] text-gray-600">Goal: {goalLabel}</div>
                  ) : null}
                  {assigned ? (
                    <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-green-600" aria-label="Assigned" />
                  ) : (
                    <div className="mt-1 h-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loadingWeeks ? (
            <p className="text-sm text-gray-500">Loading workout data for selected days…</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-xs font-bold uppercase text-gray-600">
                  <th className="border border-gray-200 px-2 py-2">
                    {showDayDates ? 'Dayname & Date' : 'Day'}
                  </th>
                  <th className="border border-gray-200 px-2 py-2 w-14 text-center">WO</th>
                  <th className="border border-gray-200 px-2 py-2">Gym workout</th>
                  <th className="border border-gray-200 px-2 py-2">Sport 1</th>
                  <th className="border border-gray-200 px-2 py-2">Sport 2</th>
                  <th className="border border-gray-200 px-2 py-2">Sport 3</th>
                </tr>
              </thead>
              <tbody>
                {visibleDayIndices.map((dayIdx) => {
                  const dayOfWeek = dayIdx + 1;
                  const dateStr = showDayDates ? dayDateForWeek(activeWeekDetail, dayOfWeek) : undefined;
                  const dayRec = dayForWeek(activeWeekDetail, dayOfWeek);
                  return WORKOUTS.map((wo, woIdx) => {
                    const existingWorkout = workoutForSlot(dayRec, wo);
                    const sportSummaries = existingWorkout
                      ? calculateWorkoutSportSummaries(existingWorkout, 'emoji')
                      : [];
                    const routineIdx = slotMap.get(slotKey(dayOfWeek, wo));
                    const routine = routineIdx != null ? plan.days[routineIdx] : null;

                    return (
                      <tr key={`${dayOfWeek}-${wo}`} className="hover:bg-gray-50/80">
                        {woIdx === 0 ? (
                          <td
                            rowSpan={3}
                            className="border border-gray-200 px-2 py-2 align-top font-medium text-gray-800"
                          >
                            <div>{DAY_NAMES[dayIdx]}</div>
                            {showDayDates && dateStr ? (
                              <div className="text-[11px] font-normal text-blue-700">{dateStr}</div>
                            ) : null}
                          </td>
                        ) : null}
                        <td className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700">
                          <div className="flex items-center justify-center gap-1">
                            {wo}
                            {slotMap.has(slotKey(dayOfWeek, wo)) ? (
                              <>
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
                                  title="Gym routine assigned"
                                />
                                <button
                                  type="button"
                                  onClick={() => clearSlot(dayOfWeek, wo)}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-700"
                                  title="Remove gym routine assignment"
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-400">▼</span>
                            )}
                          </div>
                        </td>
                        <td
                          className="border border-gray-200 bg-slate-50 px-2 py-2"
                          onDragOver={(e) => {
                            if (dragRoutineIdx == null) return;
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            if (dragRoutineIdx == null) return;
                            e.preventDefault();
                            assignRoutine(dayOfWeek, wo, dragRoutineIdx);
                            setDragRoutineIdx(null);
                          }}
                        >
                          {routine ? (
                            <span className="text-xs font-semibold text-green-800">
                              {routineCardLabel(routineIdx!, routine.routineName)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Drop here</span>
                          )}
                        </td>
                        {[0, 1, 2].map((sportIdx) => (
                          <td
                            key={sportIdx}
                            className="border border-gray-200 bg-white px-2 py-2 align-top"
                          >
                            <SportSummaryCell summary={sportSummaries[sportIdx]} />
                          </td>
                        ))}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-xs text-gray-600">
              {slotsList.length} slot(s) assigned · {assignedRoutines.size} / {plan.days.length} routines placed
            </p>
            {saveError ? <p className="mt-1 text-xs font-medium text-red-600">{saveError}</p> : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loadingWeeks || saving || slotsList.length === 0}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving routines…' : 'Save assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
