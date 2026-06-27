'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { X, CheckCircle2, GripVertical } from 'lucide-react';
import type { PlanGymWeekManualResult } from './PlanGymWeekManualModal';
import { getGoalLabel, type GoalId } from './PlanGymWeekModal';
import type { GymWeekSlotAssignment, GymWeekWeekAssignment, GymWeekPlanSourceSection } from '@/types/gymWeekAssignment';
import {
  assignedRoutineDayIndices,
  saveGymWeekAssignment,
} from '@/utils/gymWeekAssignmentStorage';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const WORKOUTS = [1, 2, 3] as const;

type WeekDayDetail = {
  id: string;
  weekNumber: number;
  days?: { dayOfWeek?: number; date?: string }[];
};

function dayDateForWeek(week: WeekDayDetail | undefined, dayOfWeek: number): string | undefined {
  if (!week?.days?.length) return undefined;
  const rec = week.days.find((d) => d.dayOfWeek === dayOfWeek) ?? week.days[dayOfWeek - 1];
  if (!rec?.date) return undefined;
  return new Date(rec.date).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

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
  onDone: () => void;
};

function slotKey(dayOfWeek: number, workoutIndex: number) {
  return `${dayOfWeek}-${workoutIndex}`;
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

  const buildSlotsFromInitial = useCallback((): Map<string, number> => {
    const m = new Map<string, number>();
    for (const s of initialAssignment?.slots ?? []) {
      m.set(slotKey(s.dayOfWeek, s.workoutIndex), s.routineDayIndex);
    }
    return m;
  }, [initialAssignment]);

  const [slotMap, setSlotMap] = useState<Map<string, number>>(buildSlotsFromInitial);

  React.useEffect(() => {
    if (isOpen) {
      setSlotMap(buildSlotsFromInitial());
      setActiveWeekIdx(0);
      setDragRoutineIdx(null);
    }
  }, [isOpen, buildSlotsFromInitial]);

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
    [allowedDaySet]
  );

  const assignedRoutines = useMemo(
    () => assignedRoutineDayIndices({ weekId: '', plan, slots: slotsList, updatedAt: '' }),
    [slotsList, plan]
  );

  const assignRoutine = (dayOfWeek: number, workoutIndex: number, routineDayIndex: number) => {
    setSlotMap((prev) => {
      const next = new Map(prev);
      for (const [k, v] of Array.from(next.entries())) {
        if (v === routineDayIndex) next.delete(k);
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

  const handleSave = () => {
    const now = new Date().toISOString();
    for (const w of targetWeeks) {
      const assignment: GymWeekWeekAssignment = {
        weekId: w.id,
        weekNumber: w.weekNumber,
        plan,
        slots: slotsList,
        updatedAt: now,
        sourceSection,
        templateKey,
      };
      saveGymWeekAssignment(assignment);
    }
    onDone();
    onClose();
  };

  if (!isOpen) return null;

  const activeWeek = targetWeeks[activeWeekIdx];
  const activeWeekDetail = targetWeekDetails?.find((w) => w.id === activeWeek?.id);
  const showDayDates =
    sourceSection === 'B' &&
    targetWeeks.length === 1 &&
    Boolean(activeWeekDetail && dayDateForWeek(activeWeekDetail, 1));

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/55 p-2 sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign routines to days</h2>
            <p className="text-xs text-gray-600">
              Drag each routine card onto a day and workout (WO). Use ✕ on a slot to free the routine
              again.
              {allowedDays.length < 7
                ? ` Only selected weekdays (Mon–Sun) are shown below.`
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
                  className={`min-w-[120px] cursor-grab rounded-lg border-2 px-3 py-2 text-left active:cursor-grabbing ${
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
                    {day.routineName || `Routine ${idx + 1}`}
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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left text-xs font-bold uppercase text-gray-600">
                <th className="border border-gray-200 px-2 py-2">
                  {showDayDates ? 'Dayname & Date' : 'Day'}
                </th>
                <th className="border border-gray-200 px-2 py-2 w-14">WO</th>
                <th className="border border-gray-200 px-2 py-2">Sport 1</th>
                <th className="border border-gray-200 px-2 py-2">Sport 2</th>
                <th className="border border-gray-200 px-2 py-2">Sport 3</th>
              </tr>
            </thead>
            <tbody>
              {visibleDayIndices.map((dayIdx) => {
                const dayOfWeek = dayIdx + 1;
                const dateStr = showDayDates ? dayDateForWeek(activeWeekDetail, dayOfWeek) : undefined;
                return WORKOUTS.map((wo, woIdx) => (
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
                              title="Routine assigned"
                            />
                            <button
                              type="button"
                              onClick={() => clearSlot(dayOfWeek, wo)}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-bold text-gray-600 hover:bg-red-50 hover:text-red-700"
                              title="Remove assignment"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400">▼</span>
                        )}
                      </div>
                    </td>
                    {[1, 2, 3].map((sportCol) => {
                      const routineIdx = slotMap.get(slotKey(dayOfWeek, wo));
                      const routine =
                        routineIdx != null ? plan.days[routineIdx] : null;
                      const isDropTarget = sportCol === 1;
                      return (
                        <td
                          key={sportCol}
                          className={`border border-gray-200 px-2 py-2 ${
                            isDropTarget ? 'bg-slate-50' : 'bg-gray-50/50'
                          }`}
                          onDragOver={(e) => {
                            if (!isDropTarget || dragRoutineIdx == null) return;
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            if (!isDropTarget || dragRoutineIdx == null) return;
                            e.preventDefault();
                            assignRoutine(dayOfWeek, wo, dragRoutineIdx);
                            setDragRoutineIdx(null);
                          }}
                        >
                          {isDropTarget ? (
                            routine ? (
                              <span className="text-xs font-semibold text-green-800">
                                {routine.routineName || `Day ${routineIdx! + 1}`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Drop here</span>
                            )
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-600">
            {slotsList.length} slot(s) assigned · {assignedRoutines.size} / {plan.days.length} routines placed
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Save assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
