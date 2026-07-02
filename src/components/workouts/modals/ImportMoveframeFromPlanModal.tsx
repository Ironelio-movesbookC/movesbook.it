'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, CheckSquare, Square, ChevronRight, ChevronDown, Play, GripVertical } from 'lucide-react';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import { sortWorkoutsForDisplay } from '@/lib/workoutDisplayOrder';
import { getSportDisplayName } from '@/constants/moveframe.constants';
import {
  calculateSportSummaries,
  calculateWorkoutSportSummaries,
  formatSportSummaryTotal,
} from '@/utils/workoutHelpers';
import { getSportIcon } from '@/utils/sportIcons';
import {
  moveframeDescription,
  moveframeDuration,
  moveframeRipSets,
} from '@/lib/importMoveframePreview';
import type { ImportMoveframePayload } from './ImportMoveframeModal';

type Phase = 'week' | 'day' | 'workout' | 'confirm';

type MovelapRow = {
  repetitionNumber?: number;
  muscularSector?: string | null;
  exercise?: string | null;
  reps?: number | null;
  pause?: string | null;
  style?: string | null;
  distance?: number | null;
};

interface ImportMoveframeFromPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetDay: { id: string; weekNumber?: number };
  targetWorkout: { id: string; sessionNumber: number };
  activeSection: 'A' | 'B' | 'C' | 'D';
  planTypeOverride: string;
  title: string;
  onConfirm: (payload: ImportMoveframePayload) => Promise<void>;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOT_SYMBOLS = ['○', '□', '△'];
const WORKOUT_HEADER_BG = ['bg-emerald-100', 'bg-sky-100', 'bg-violet-100'];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function YearlySourceIcon() {
  return (
    <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden shrink-0 grid grid-rows-4">
      <div className="bg-blue-500" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid grid-cols-3 border-t border-blue-100">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className={`border-r border-blue-50 ${row === 1 && col === 1 ? 'bg-orange-300' : 'bg-orange-50'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatWeekMeta(week: any): string {
  const date = week?.days?.[0]?.date
    ? new Date(week.days[0].date).toLocaleDateString(undefined, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    : 'N/A';
  const period = week?.period?.name || week?.periodName || week?.days?.[0]?.period?.name || 'No Period';
  return `${date} • ${period}`;
}

function dayForWeek(week: any, dayOfWeek: number) {
  if (!week?.days?.length) return null;
  return week.days.find((d: any) => d.dayOfWeek === dayOfWeek) ?? week.days[dayOfWeek - 1] ?? null;
}

function sortedWorkouts(day: any) {
  if (!day?.workouts?.length) return [];
  return sortWorkoutsForDisplay(day.workouts);
}

function dayHasWorkouts(day: any | null): boolean {
  if (!day?.workouts?.length) return false;
  return day.workouts.some((w: any) => (w.moveframes?.length ?? 0) > 0);
}

function workoutsWithContent(day: any) {
  return sortedWorkouts(day).filter((w: any) => (w.moveframes?.length ?? 0) > 0);
}

function formatDayNameDate(day: any | null, dayOfWeek: number): string {
  if (!day?.date) return DAY_NAMES[dayOfWeek - 1] ?? `Day ${dayOfWeek}`;
  const d = new Date(day.date);
  const dayName = DAY_NAMES[dayOfWeek - 1] ?? `Day ${dayOfWeek}`;
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${dayName} ${dateStr}`;
}

function formatDayDateOnly(day: any | null): string {
  if (!day?.date) return '';
  return new Date(day.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function YearlyPlanPeriodBar({
  period,
}: {
  period: { name?: string; description?: string | null } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white">
      <div
        className="relative w-11 h-6 bg-blue-400 rounded-full shrink-0"
        aria-hidden
        title="Period active"
      >
        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm" />
      </div>
      <span className="text-sm font-bold uppercase tracking-wide">
        {period?.name?.trim() || 'No Period'}
      </span>
      <span className="text-sm text-blue-100 italic ml-auto">
        {period?.description?.trim() || 'Click Edit to add description…'}
      </span>
    </div>
  );
}

function WorkoutSlotIndicators({ workouts }: { workouts: any[] }) {
  return (
    <div className="flex items-center justify-center gap-1 text-sm font-bold">
      {[1, 2, 3].map((slot) => {
        const workout = workouts[slot - 1];
        const hasData = Boolean(workout?.moveframes?.length);
        return (
          <span key={slot} className={hasData ? 'text-gray-900' : 'text-gray-300'}>
            {slot}
          </span>
        );
      })}
      <span className="text-gray-300 text-xs font-normal ml-0.5">{SLOT_SYMBOLS[2]}</span>
    </div>
  );
}

function matchLabel(workout: any): string {
  if (workout.completionRate != null) {
    return `${Math.round(workout.completionRate)}% + ${Math.round(workout.bonusRate || 0)}%`;
  }
  return '85% + 20%';
}

function movelapsForMoveframe(mf: any | null): MovelapRow[] {
  if (!mf?.movelaps?.length) return [];
  return mf.movelaps;
}

function formatMovelapReps(ml: MovelapRow): string {
  if (ml.reps != null) return String(ml.reps);
  if (ml.distance != null) return String(ml.distance);
  return '—';
}

function formatExerciseLabel(ml: MovelapRow, index: number): string {
  const num = String(ml.repetitionNumber ?? index + 1).padStart(2, '0');
  const exercise = (ml.exercise || '').trim();
  const sector = (ml.muscularSector || ml.style || '').trim();
  if (exercise) return `#${num} ${exercise}`;
  if (sector) return `#${num} Exercise — ${sector}`;
  return `#${num} —`;
}

export default function ImportMoveframeFromPlanModal({
  isOpen,
  onClose,
  onBack,
  targetDay,
  targetWorkout,
  planTypeOverride,
  onConfirm,
}: ImportMoveframeFromPlanModalProps) {
  const isYearly = planTypeOverride === 'YEARLY_PLAN';
  const mergeWeeks = planTypeOverride === 'YEARLY_PLAN' || planTypeOverride === 'WORKOUTS_DONE';

  const [phase, setPhase] = useState<Phase>('week');
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [focusedWeekId, setFocusedWeekId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [selectedMoveframeId, setSelectedMoveframeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const raw = await fetchPlanWeeks(token, planTypeOverride);
        setWeeks(mergeWeeks ? mergeWeeksByWeekNumber(raw) : raw);
      } finally {
        setLoading(false);
      }
    })();
    setPhase('week');
    setSelectedWeekId(null);
    setFocusedWeekId(null);
    setSelectedDayId(null);
    setSelectedWorkoutId('');
    setSelectedMoveframeId('');
  }, [isOpen, planTypeOverride, mergeWeeks]);

  const allWeeks = useMemo(
    () => [...weeks].sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0)),
    [weeks]
  );

  const anchorWeekNumber = targetDay.weekNumber ?? null;

  const sourceWeek = useMemo(() => {
    if (anchorWeekNumber == null) return null;
    return allWeeks.find((w) => w.weekNumber === anchorWeekNumber) ?? null;
  }, [allWeeks, anchorWeekNumber]);

  const isSourceWeek = (week: any) => sourceWeek != null && week.id === sourceWeek.id;

  const selectedWeek = useMemo(
    () => allWeeks.find((w) => w.id === selectedWeekId) ?? null,
    [allWeeks, selectedWeekId]
  );

  const selectedDay = useMemo(() => {
    if (!selectedDayId || !selectedWeek?.days) return null;
    return selectedWeek.days.find((d: any) => d.id === selectedDayId) ?? null;
  }, [selectedWeek, selectedDayId]);

  const weekPeriod = useMemo(() => {
    if (!selectedWeek) return null;
    return (
      selectedWeek.period ??
      selectedWeek.days?.find((d: any) => d.period)?.period ??
      selectedWeek.days?.[0]?.period ??
      null
    );
  }, [selectedWeek]);

  const dayWorkoutsWithContent = useMemo(() => {
    if (!selectedDay) return [];
    return workoutsWithContent(selectedDay).filter((w: any) => w.id !== targetWorkout.id);
  }, [selectedDay, targetWorkout.id]);

  const selectedWorkout = useMemo(() => {
    if (!selectedWorkoutId) return null;
    return dayWorkoutsWithContent.find((w: any) => w.id === selectedWorkoutId) ?? null;
  }, [selectedWorkoutId, dayWorkoutsWithContent]);

  const moveframes = useMemo((): any[] => {
    if (!selectedWorkout?.moveframes) return [];
    return [...selectedWorkout.moveframes].sort(
      (a: any, b: any) =>
        (a.sequence ?? 0) - (b.sequence ?? 0) ||
        String(a.letter ?? '').localeCompare(String(b.letter ?? ''))
    );
  }, [selectedWorkout]);

  const selectedMoveframe = useMemo(
    () => moveframes.find((m: any) => m.id === selectedMoveframeId) ?? null,
    [moveframes, selectedMoveframeId]
  );

  const detailMovelaps = useMemo(
    () => movelapsForMoveframe(selectedMoveframe),
    [selectedMoveframe]
  );

  useEffect(() => {
    if (phase !== 'workout' || !selectedDay) return;
    if (selectedWorkoutId && dayWorkoutsWithContent.some((w: any) => w.id === selectedWorkoutId)) {
      return;
    }
    const first = dayWorkoutsWithContent[0];
    if (first?.id) {
      setSelectedWorkoutId(first.id);
    }
  }, [phase, selectedDay, dayWorkoutsWithContent, selectedWorkoutId]);

  const selectWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
    setFocusedWeekId(weekId);
    setSelectedDayId(null);
    setSelectedWorkoutId('');
    setSelectedMoveframeId('');
  };

  const selectDay = (day: any) => {
    if (!day?.id || !dayHasWorkouts(day)) return;
    setSelectedDayId(day.id);
    setSelectedWorkoutId('');
    setSelectedMoveframeId('');
  };

  const selectWorkout = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setSelectedMoveframeId('');
  };

  const handleSlotClick = (workout: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workout?.moveframes?.length) return;
    selectWorkout(workout.id);
  };

  const handleBack = () => {
    if (phase === 'confirm') {
      setPhase('workout');
    } else if (phase === 'workout') {
      setPhase('day');
      setSelectedWorkoutId('');
      setSelectedMoveframeId('');
    } else if (phase === 'day') {
      setPhase('week');
      setSelectedDayId(null);
    } else {
      onBack();
    }
  };

  const handleContinue = () => {
    if (phase === 'week' && selectedWeekId) {
      setPhase('day');
      setSelectedDayId(null);
      setSelectedWorkoutId('');
      setSelectedMoveframeId('');
    } else if (phase === 'day' && selectedDayId) {
      setPhase('workout');
      setSelectedWorkoutId('');
      setSelectedMoveframeId('');
    } else if (phase === 'workout' && selectedMoveframeId) {
      setPhase('confirm');
    }
  };

  const handleImport = async () => {
    if (!selectedMoveframeId) return;
    setIsImporting(true);
    try {
      await onConfirm({
        targetWorkoutId: targetWorkout.id,
        source: { type: 'moveframe', sourceMoveframeId: selectedMoveframeId },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const footerStatus = useMemo(() => {
    if (phase === 'week') {
      return selectedWeekId ? `Week ${selectedWeek?.weekNumber ?? '?'} selected` : 'No week selected';
    }
    if (phase === 'day') {
      if (!selectedDay) return 'No day selected';
      const dow = selectedDay.dayOfWeek ?? 0;
      return formatDayNameDate(selectedDay, dow);
    }
    if (phase === 'confirm' && selectedMoveframe) {
      return `Moveframe ${selectedMoveframe.letter ?? '—'} — confirm import`;
    }
    if (selectedMoveframeId && selectedWorkout) {
      const mf = moveframes.find((m: any) => m.id === selectedMoveframeId);
      return mf
        ? `Moveframe ${mf.letter ?? '—'} — Workout #${selectedWorkout.sessionNumber ?? '?'}`
        : 'No moveframe selected';
    }
    return 'No moveframe selected';
  }, [phase, selectedWeekId, selectedWeek, selectedDay, selectedMoveframeId, selectedMoveframe, selectedWorkout, moveframes]);

  if (!isOpen) return null;

  const continueDisabled =
    phase === 'week'
      ? !selectedWeekId
      : phase === 'day'
        ? !selectedDayId
        : phase === 'workout'
          ? !selectedMoveframeId
          : false;

  if (!isYearly) {
    return (
      <LegacyPlanDropdownModal
        isOpen={isOpen}
        onClose={onClose}
        onBack={onBack}
        targetWorkout={targetWorkout}
        planTypeOverride={planTypeOverride}
        mergeWeeks={mergeWeeks}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-purple-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a Moveframe</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-1.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Back
              </button>
              <div className="flex items-center gap-2 py-2 px-3 bg-white border border-gray-200 rounded-xl">
                <YearlySourceIcon />
                <span className="font-semibold text-gray-900 text-sm">
                  Import from <strong>Current Yearly Plan</strong>
                </span>
              </div>
            </div>

            {loading ? (
              <p className="text-center py-8 text-gray-500 text-sm">Loading plan…</p>
            ) : phase === 'week' ? (
              <>
                <p className="text-sm text-gray-600">
                  Phase I — select a week to browse. Your current week is marked{' '}
                  <span className="font-semibold">Source</span>.
                </p>

                <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                  {allWeeks.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No weeks in this plan.</p>
                  ) : (
                    allWeeks.map((week) => {
                      const sourceMatch = isSourceWeek(week);
                      const isSelected = selectedWeekId === week.id;
                      const isFocused = focusedWeekId === week.id;
                      const selectable = !sourceMatch;

                      return (
                        <label
                          key={week.id}
                          onMouseEnter={() => selectable && setFocusedWeekId(week.id)}
                          onClick={() => selectable && selectWeek(week.id)}
                          className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 ${
                            sourceMatch
                              ? 'bg-gray-100 text-gray-500 cursor-default'
                              : isSelected
                                ? 'bg-yellow-100 cursor-pointer'
                                : isFocused
                                  ? 'bg-yellow-50 cursor-pointer'
                                  : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selectable && selectWeek(week.id)}
                            disabled={sourceMatch}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold ${sourceMatch ? 'text-gray-500' : 'text-gray-900'}`}
                              >
                                Week {week.weekNumber}
                              </span>
                              {sourceMatch && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                  Source
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {formatWeekMeta(week)}
                            </div>
                          </div>
                          {selectable &&
                            (isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 shrink-0" />
                            ))}
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Select a week to browse workouts and moveframes. The source week (where you opened
                  Import MF) cannot be selected.
                </div>
              </>
            ) : phase === 'day' ? (
              <>
                <YearlyPlanPeriodBar period={weekPeriod} />

                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full border-collapse text-xs min-w-[720px]">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-left">Period</th>
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-center w-12">
                          Week
                        </th>
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-center w-10">
                          Day
                        </th>
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-left min-w-[160px]">
                          Dayname &amp; Date
                        </th>
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-center w-16">
                          Match done
                        </th>
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-center w-28">
                          Workouts
                        </th>
                        <th className="border border-blue-500 px-2 py-1.5 font-bold text-left">
                          Sport
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 7 }, (_, idx) => {
                        const dayNum = idx + 1;
                        const day = selectedWeek ? dayForWeek(selectedWeek, dayNum) : null;
                        const period = day?.period ?? weekPeriod;
                        const workouts = sortedWorkouts(day);
                        const hasWorkouts = dayHasWorkouts(day);
                        const summaries = day ? calculateSportSummaries(day, 'emoji') : [];
                        const sport1 = summaries[0];
                        const isSelected = day?.id != null && selectedDayId === day.id;
                        const rowStripe = idx % 2 === 0 ? 'bg-sky-50/40' : 'bg-white';
                        const dayName = DAY_NAMES[dayNum - 1] ?? `Day ${dayNum}`;
                        const dateLabel = formatDayDateOnly(day);

                        return (
                          <tr
                            key={dayNum}
                            onClick={() => day && hasWorkouts && selectDay(day)}
                            className={
                              (hasWorkouts ? 'cursor-pointer ' : '') +
                              (isSelected
                                ? 'bg-yellow-100 ring-2 ring-inset ring-yellow-400'
                                : `${rowStripe} ${hasWorkouts ? 'hover:bg-yellow-50' : 'opacity-70'}`)
                            }
                            title={
                              hasWorkouts
                                ? 'Click to select this day'
                                : 'No workouts with moveframes on this day'
                            }
                          >
                            <td className="border border-gray-300 px-2 py-2 text-blue-800 font-medium">
                              {period?.name ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold text-blue-700">
                              {selectedWeek?.weekNumber ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold text-blue-700">
                              {dayNum}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">
                              <div className="flex items-start gap-1.5">
                                <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="font-bold text-blue-700 leading-tight">{dayName}</div>
                                  {dateLabel ? (
                                    <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                                      {dateLabel}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center">
                              <span
                                className="inline-block w-5 h-5 rounded-full border border-gray-400"
                                style={{
                                  backgroundColor: hasWorkouts ? '#10B981' : '#E5E7EB',
                                }}
                                title={hasWorkouts ? 'Workouts planned' : 'No workouts'}
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center">
                              <WorkoutSlotIndicators workouts={workouts} />
                            </td>
                            <td className="border border-gray-300 px-2 py-2 bg-blue-50/50">
                              {sport1?.sport ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base">{getSportIcon(sport1.sport, 'emoji')}</span>
                                  <span className="font-bold uppercase text-[11px] tracking-wide text-gray-900">
                                    {sport1.sport.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : phase === 'workout' ? (
              <>
                <YearlyPlanPeriodBar period={weekPeriod} />

                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full border-collapse text-xs min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-left">
                          Period
                        </th>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-center w-12">
                          Week
                        </th>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-center w-10">
                          Day
                        </th>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-center w-28">
                          Workouts
                        </th>
                        <th
                          className="border border-gray-400 px-2 py-1.5 font-bold bg-blue-200 text-black text-center"
                          colSpan={3}
                        >
                          Sport 1
                        </th>
                      </tr>
                      <tr>
                        <th className="border border-gray-400 bg-gray-50" colSpan={4} />
                        <th className="border border-gray-400 px-2 py-1 font-bold bg-blue-100 text-left">
                          Sport
                        </th>
                        <th className="border border-gray-400 px-2 py-1 font-bold bg-blue-100 text-center">
                          Duration &amp; Time
                        </th>
                        <th className="border border-gray-400 px-2 py-1 font-bold bg-blue-100 text-left">
                          Main work
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 7 }, (_, idx) => {
                        const dayNum = idx + 1;
                        const day = selectedWeek ? dayForWeek(selectedWeek, dayNum) : null;
                        const period = day?.period ?? weekPeriod;
                        const workouts = sortedWorkouts(day);
                        const summaries = day ? calculateSportSummaries(day, 'emoji') : [];
                        const sport1 = summaries[0];
                        const mainWorkText = sport1?.mainWork ? stripHtml(sport1.mainWork) : '—';
                        const isActiveDay = day?.id === selectedDayId;
                        const dimmed = !isActiveDay;

                        return (
                          <tr
                            key={dayNum}
                            className={isActiveDay ? 'bg-emerald-50/80' : dimmed ? 'opacity-45' : ''}
                          >
                            <td className="border border-gray-300 px-2 py-1.5 text-gray-700">
                              {period?.name ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                              {selectedWeek?.weekNumber ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                              {dayNum}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {[1, 2, 3].map((slot) => {
                                  const workout = workouts[slot - 1];
                                  const hasData = Boolean(workout?.moveframes?.length);
                                  const isSlotSelected =
                                    isActiveDay && selectedWorkoutId === workout?.id;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={!isActiveDay || !hasData}
                                      onClick={(e) => workout && handleSlotClick(workout, e)}
                                      className={
                                        'text-sm font-bold inline-flex items-center gap-0.5 rounded px-1 py-0.5 ' +
                                        (isActiveDay && hasData
                                          ? isSlotSelected
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-900 hover:bg-blue-100'
                                          : 'text-gray-400 cursor-default')
                                      }
                                    >
                                      {slot}
                                      <span className="text-xs">{SLOT_SYMBOLS[slot - 1]}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 bg-blue-50/50">
                              {sport1?.sport ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center bg-blue-50/50">
                              {sport1?.duration ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 bg-blue-50/50 max-w-[180px] truncate">
                              {mainWorkText || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {dayWorkoutsWithContent.length === 0 ? (
                  <p className="text-center py-8 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    No workouts with moveframes on this day.
                  </p>
                ) : selectedWorkout ? (
                  (() => {
                    const wIdx = dayWorkoutsWithContent.findIndex((w: any) => w.id === selectedWorkout.id);
                    const sportSummaries = calculateWorkoutSportSummaries(selectedWorkout, 'emoji');
                    const periodName = selectedDay?.period?.name ?? weekPeriod?.name ?? '—';
                    const dayDow = selectedDay?.dayOfWeek ?? 1;
                    const headerBg = WORKOUT_HEADER_BG[Math.max(0, wIdx) % WORKOUT_HEADER_BG.length];

                    return (
                      <div className="rounded-lg border border-gray-300 overflow-hidden">
                        <div className={`${headerBg} px-3 py-2 flex flex-wrap items-center gap-2`}>
                          <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />
                          <Play className="w-4 h-4 text-gray-600 shrink-0" />
                          <span className="text-sm font-bold text-gray-900">
                            Workout #{selectedWorkout.sessionNumber ?? wIdx + 1}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-xs font-medium text-gray-700 uppercase">{periodName}</span>
                          <span className="text-xs text-gray-600">
                            {DAY_NAMES[dayDow - 1] ?? `Day ${dayDow}`}
                          </span>
                          <div className="ml-auto">
                            <button
                              type="button"
                              onClick={() => {
                                const w = selectedWorkout as any;
                                const info = [w.name, w.code, w.notes].filter(Boolean).join('\n');
                                alert(info || 'No additional workout info.');
                              }}
                              className="px-3 py-1 text-xs font-semibold bg-sky-100 text-sky-800 rounded hover:bg-sky-200"
                            >
                              Workout Info
                            </button>
                          </div>
                        </div>

                        <div className={`${headerBg} px-3 pb-2`}>
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr>
                                <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left w-24">
                                  Match
                                </th>
                                <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left">
                                  Sport
                                </th>
                                <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-center">
                                  Duration &amp; time
                                </th>
                                <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left w-12">
                                  K
                                </th>
                                <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left">
                                  Main work
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sportSummaries.length === 0 ? (
                                <tr>
                                  <td className="border border-gray-300 px-2 py-1 bg-white/40">
                                    {matchLabel(selectedWorkout)}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1 bg-white/40" colSpan={4}>
                                    —
                                  </td>
                                </tr>
                              ) : (
                                sportSummaries.map((s, sIdx) => (
                                  <tr key={sIdx}>
                                    {sIdx === 0 && (
                                      <td
                                        className="border border-gray-300 px-2 py-1 bg-white/40 font-medium"
                                        rowSpan={sportSummaries.length}
                                      >
                                        {matchLabel(selectedWorkout)}
                                      </td>
                                    )}
                                    <td className="border border-gray-300 px-2 py-1 bg-white/40">
                                      {s.sport}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center bg-white/40">
                                      {s.duration || formatSportSummaryTotal(s)}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 bg-white/40">—</td>
                                    <td className="border border-gray-300 px-2 py-1 bg-white/40 max-w-[180px] truncate">
                                      {s.mainWork ? stripHtml(s.mainWork) : '—'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-violet-50 px-3 py-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-violet-900">Moveframes</span>
                            <span className="text-xs bg-violet-200 text-violet-900 px-2 py-0.5 rounded-full font-semibold">
                              {moveframes.length} total
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs min-w-[560px]">
                              <thead>
                                <tr>
                                  <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-8">
                                    ::
                                  </th>
                                  <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-8">
                                    #
                                  </th>
                                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 w-10">
                                    MF
                                  </th>
                                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                                    Section
                                  </th>
                                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                                    Sport
                                  </th>
                                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                                    Description
                                  </th>
                                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                                    Dur
                                  </th>
                                  <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                                    Rip\sets
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {moveframes.map((mf: any, mfIdx: number) => {
                                  const isMfSelected = selectedMoveframeId === mf.id;
                                  const sectionColor = mf.section?.color || '#6366f1';
                                  return (
                                    <tr
                                      key={mf.id ?? mfIdx}
                                      onClick={() => setSelectedMoveframeId(mf.id)}
                                      className={
                                        'cursor-pointer ' +
                                        (isMfSelected
                                          ? 'bg-yellow-100 ring-2 ring-inset ring-red-400'
                                          : 'bg-white/70 hover:bg-violet-50')
                                      }
                                    >
                                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-400">
                                        <GripVertical className="w-3.5 h-3.5 mx-auto" />
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">
                                        {mfIdx + 1}
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1 text-center">
                                        <span
                                          className="inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold text-white"
                                          style={{ backgroundColor: sectionColor }}
                                        >
                                          {mf.letter || mf.code || String.fromCharCode(65 + mfIdx)}
                                        </span>
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1">
                                        {mf.section?.name ? (
                                          <span className="inline-flex items-center gap-1">
                                            <span
                                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                                              style={{ backgroundColor: sectionColor }}
                                            />
                                            {mf.section.name}
                                          </span>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1">
                                        <span className="inline-flex items-center gap-1">
                                          {mf.sport ? (
                                            <span className="text-sm">
                                              {getSportIcon(mf.sport, 'emoji')}
                                            </span>
                                          ) : null}
                                          {mf.sport ? getSportDisplayName(mf.sport) : '—'}
                                        </span>
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1 max-w-[160px] truncate">
                                        {moveframeDescription(mf)}
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1 text-center">
                                        {moveframeDuration(mf)}
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1 text-center text-red-700 font-semibold">
                                        {moveframeRipSets(mf)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-center py-6 text-gray-500 text-sm">
                    Select a workout slot (1, 2, or 3) on the highlighted day.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="bg-violet-50 border border-violet-200 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-violet-200">
                    <span className="text-xs font-bold text-violet-900">Moveframes</span>
                    <span className="text-xs bg-violet-200 text-violet-900 px-2 py-0.5 rounded-full font-semibold">
                      {moveframes.length} total
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                    <table className="w-full border-collapse text-xs min-w-[560px]">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-8">
                            ::
                          </th>
                          <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-8">
                            #
                          </th>
                          <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 w-10">
                            MF
                          </th>
                          <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                            Section
                          </th>
                          <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                            Sport
                          </th>
                          <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                            Description
                          </th>
                          <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                            Dur
                          </th>
                          <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                            Rip\sets
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {moveframes.map((mf: any, mfIdx: number) => {
                          const isMfSelected = selectedMoveframeId === mf.id;
                          const sectionColor = mf.section?.color || '#6366f1';
                          return (
                            <tr
                              key={mf.id ?? mfIdx}
                              onClick={() => setSelectedMoveframeId(mf.id)}
                              className={
                                'cursor-pointer ' +
                                (isMfSelected
                                  ? 'bg-yellow-50 ring-2 ring-inset ring-red-500'
                                  : 'bg-white/70 hover:bg-violet-50')
                              }
                            >
                              <td className="border border-gray-300 px-1 py-1 text-center text-gray-400">
                                <GripVertical className="w-3.5 h-3.5 mx-auto" />
                              </td>
                              <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">
                                {mfIdx + 1}
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center">
                                <span
                                  className="inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold text-white"
                                  style={{ backgroundColor: sectionColor }}
                                >
                                  {mf.letter || mf.code || String.fromCharCode(65 + mfIdx)}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                {mf.section?.name ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                                      style={{ backgroundColor: sectionColor }}
                                    />
                                    {mf.section.name}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <span className="inline-flex items-center gap-1">
                                  {mf.sport ? (
                                    <span className="text-sm">{getSportIcon(mf.sport, 'emoji')}</span>
                                  ) : null}
                                  {mf.sport ? getSportDisplayName(mf.sport) : '—'}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-2 py-1 max-w-[160px] truncate">
                                {moveframeDescription(mf)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center">
                                {moveframeDuration(mf)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center text-red-700 font-semibold">
                                {moveframeRipSets(mf)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 border-b border-gray-200">
                    Detail moveframe selected
                  </div>
                  <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">
                            Workout section
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Sport</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Muscular</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">
                            Exercise
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Reps</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Pause</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedMoveframe ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                              Select a moveframe from the list above
                            </td>
                          </tr>
                        ) : detailMovelaps.length === 0 ? (
                          <tr className="border-t">
                            <td className="px-3 py-2">
                              {selectedMoveframe.section?.name ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="w-3 h-3 rounded-sm"
                                    style={{
                                      backgroundColor:
                                        selectedMoveframe.section?.color || '#3b82f6',
                                    }}
                                  />
                                  {selectedMoveframe.section.name}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {selectedMoveframe.sport
                                ? getSportDisplayName(selectedMoveframe.sport)
                                : '—'}
                            </td>
                            <td className="px-3 py-2" colSpan={4}>
                              {moveframeDescription(selectedMoveframe)} (no movelap rows)
                            </td>
                          </tr>
                        ) : (
                          detailMovelaps.map((ml, index) => {
                            const section = selectedMoveframe.section;
                            const muscular = (ml.muscularSector || ml.style || '').trim();
                            return (
                              <tr key={index} className="border-t hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  {section?.name ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span
                                        className="w-3 h-3 rounded-sm shrink-0"
                                        style={{ backgroundColor: section.color || '#3b82f6' }}
                                      />
                                      {section.name}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {selectedMoveframe.sport
                                    ? getSportDisplayName(selectedMoveframe.sport)
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 max-w-[120px]">
                                  {muscular ? (
                                    <span className="text-[10px] leading-tight text-gray-700 line-clamp-3">
                                      {muscular}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-3 py-2">{formatExerciseLabel(ml, index)}</td>
                                <td className="px-3 py-2">{formatMovelapReps(ml)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{ml.pause || '—'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0 gap-3">
            <p className="text-sm text-gray-500 truncate">{footerStatus}</p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              {phase === 'confirm' ? (
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={isImporting || !selectedMoveframeId}
                  className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isImporting ? 'Importing…' : 'Import'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={continueDisabled}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Fallback dropdown UI for non-yearly plan types */
function LegacyPlanDropdownModal({
  isOpen,
  onClose,
  onBack,
  targetWorkout,
  planTypeOverride,
  mergeWeeks,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetWorkout: { id: string; sessionNumber: number };
  planTypeOverride: string;
  mergeWeeks: boolean;
  onConfirm: (payload: ImportMoveframePayload) => Promise<void>;
}) {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [selectedMoveframeId, setSelectedMoveframeId] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const raw = await fetchPlanWeeks(token, planTypeOverride);
        setWeeks(mergeWeeks ? mergeWeeksByWeekNumber(raw) : raw);
      } finally {
        setLoading(false);
      }
    })();
    setSelectedWeekId('');
    setSelectedDayId('');
    setSelectedWorkoutId('');
    setSelectedMoveframeId('');
  }, [isOpen, planTypeOverride, mergeWeeks]);

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.id === selectedWeekId),
    [weeks, selectedWeekId]
  );

  const weekDays = useMemo(() => {
    if (!selectedWeek?.days?.length) return [];
    return [...selectedWeek.days].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [selectedWeek]);

  const selectedDay = useMemo(
    () => weekDays.find((d: any) => d.id === selectedDayId),
    [weekDays, selectedDayId]
  );

  const workouts = useMemo(() => {
    if (!selectedDay?.workouts?.length) return [];
    return sortWorkoutsForDisplay(selectedDay.workouts).filter(
      (w: any) => (w.moveframes?.length ?? 0) > 0 && w.id !== targetWorkout.id
    );
  }, [selectedDay, targetWorkout.id]);

  const selectedWorkout = useMemo(
    () => workouts.find((w: any) => w.id === selectedWorkoutId),
    [workouts, selectedWorkoutId]
  );

  const moveframes = selectedWorkout?.moveframes ?? [];

  useEffect(() => {
    if (!selectedWorkoutId) {
      setSelectedMoveframeId('');
      return;
    }
    const mfs = (selectedWorkout?.moveframes ?? []) as any[];
    setSelectedMoveframeId(mfs[0]?.id ?? '');
  }, [selectedWorkoutId, selectedWorkout]);

  const handleImport = async () => {
    if (!selectedMoveframeId) return;
    setIsImporting(true);
    try {
      await onConfirm({
        targetWorkoutId: targetWorkout.id,
        source: { type: 'moveframe', sourceMoveframeId: selectedMoveframeId },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-purple-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <h2 className="text-lg font-bold">Import moveframe from plan</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-purple-600 underline">
              ← Import mode
            </button>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading plan…</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Week</label>
                    <select
                      value={selectedWeekId}
                      onChange={(e) => {
                        setSelectedWeekId(e.target.value);
                        setSelectedDayId('');
                        setSelectedWorkoutId('');
                      }}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    >
                      <option value="">Choose…</option>
                      {weeks.map((w, i) => (
                        <option key={w.id} value={w.id}>
                          Week {w.weekNumber ?? i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Day</label>
                    <select
                      value={selectedDayId}
                      onChange={(e) => {
                        setSelectedDayId(e.target.value);
                        setSelectedWorkoutId('');
                      }}
                      disabled={!selectedWeekId}
                      className="w-full px-2 py-1.5 border rounded text-sm disabled:opacity-50"
                    >
                      <option value="">Choose…</option>
                      {weekDays.map((day: any) => (
                        <option key={day.id} value={day.id}>
                          {day.date
                            ? new Date(day.date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })
                            : DAY_SHORT[(day.dayOfWeek ?? 1) - 1]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Workout</label>
                    <select
                      value={selectedWorkoutId}
                      onChange={(e) => setSelectedWorkoutId(e.target.value)}
                      disabled={!selectedDayId}
                      className="w-full px-2 py-1.5 border rounded text-sm disabled:opacity-50"
                    >
                      <option value="">Choose…</option>
                      {workouts.map((w: any) => (
                        <option key={w.id} value={w.id}>
                          WO{w.sessionNumber}: {w.name || 'Untitled'} ({w.moveframes?.length ?? 0}{' '}
                          MF)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedWorkout && moveframes.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-purple-100 px-3 py-2 text-sm font-bold text-purple-900">
                      Select moveframe to import
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 w-8" />
                          <th className="px-2 py-1 text-left">MF</th>
                          <th className="px-2 py-1 text-left">Sport</th>
                          <th className="px-2 py-1 text-left">Description</th>
                          <th className="px-2 py-1 text-left">Dur</th>
                          <th className="px-2 py-1 text-left">Rip/sets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moveframes.map((mf: any) => (
                          <tr
                            key={mf.id}
                            className={`border-t cursor-pointer ${
                              selectedMoveframeId === mf.id ? 'bg-purple-50' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedMoveframeId(mf.id)}
                          >
                            <td className="px-2 py-1 text-center">
                              <input
                                type="radio"
                                checked={selectedMoveframeId === mf.id}
                                onChange={() => setSelectedMoveframeId(mf.id)}
                              />
                            </td>
                            <td className="px-2 py-1 font-bold">{mf.letter}</td>
                            <td className="px-2 py-1">{mf.sport}</td>
                            <td className="px-2 py-1">{moveframeDescription(mf)}</td>
                            <td className="px-2 py-1">{moveframeDuration(mf)}</td>
                            <td className="px-2 py-1">{moveframeRipSets(mf)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={!selectedMoveframeId || isImporting}
              className="px-5 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {isImporting ? 'Importing…' : 'Import moveframe'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
