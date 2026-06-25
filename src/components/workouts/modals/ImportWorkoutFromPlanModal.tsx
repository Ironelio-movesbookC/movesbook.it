'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Download, CheckSquare, Square, ChevronRight, ChevronDown, Play } from 'lucide-react';
import { isSeriesBasedSport } from '@/constants/moveframe.constants';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import {
  calculateSportSummaries,
  calculateWorkoutSportSummaries,
  formatSportSummaryTotal,
} from '@/utils/workoutHelpers';
import { getSportIcon } from '@/utils/sportIcons';
import { sortWorkoutsForDisplay } from '@/lib/workoutDisplayOrder';
import type { ImportWorkoutPayload } from './ImportWorkoutModal';

type Phase = 'week' | 'day' | 'workout';

interface ImportWorkoutFromPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetDay: { id: string; weekNumber?: number };
  targetWorkout: { id: string; sessionNumber: number; moveframes?: unknown[] };
  activeSection: 'A' | 'B' | 'C' | 'D';
  onConfirm: (payload: ImportWorkoutPayload) => Promise<void>;
  planTypeOverride?: string;
}

const PLAN_TYPE_BY_SECTION: Record<string, string> = {
  A: 'TEMPLATE_WEEKS',
  B: 'YEARLY_PLAN',
  C: 'WORKOUTS_DONE',
  D: 'ARCHIVE',
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOT_SYMBOLS = ['○', '□', '△'];
const WORKOUT_HEADER_BG = ['bg-emerald-100', 'bg-sky-100', 'bg-violet-100'];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function workoutsWithContent(day: any) {
  return sortedWorkouts(day).filter((w: any) => (w.moveframes?.length ?? 0) > 0);
}

function moveframeDescription(mf: any): string {
  const raw = mf.manualMode ? mf.notes || mf.description || '' : mf.description || '';
  return stripHtml(raw) || '—';
}

function moveframeDuration(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) {
      return mf.repetitions ? `${mf.repetitions} series` : '—';
    }
    const count = mf.movelaps?.length ?? 0;
    return count ? `${count} series` : '—';
  }
  let dist = 0;
  for (const lap of mf.movelaps ?? []) {
    dist += parseInt(lap.distance, 10) || 0;
  }
  return dist ? `${dist}m` : '—';
}

function moveframeRipSets(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) return mf.repetitions != null ? String(mf.repetitions) : '—';
    let reps = 0;
    for (const lap of mf.movelaps ?? []) {
      reps += parseInt(lap.reps, 10) || 0;
    }
    if (reps) return String(reps);
    const laps = mf.movelaps?.length ?? 0;
    return laps ? String(laps) : '—';
  }
  const laps = mf.movelaps?.length ?? 0;
  return laps ? String(laps) : '—';
}

function matchLabel(workout: any): string {
  if (workout.completionRate != null) {
    return `${Math.round(workout.completionRate)}% + ${Math.round(workout.bonusRate || 0)}%`;
  }
  return '85% + 20%';
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

export default function ImportWorkoutFromPlanModal({
  isOpen,
  onClose,
  onBack,
  targetDay,
  targetWorkout,
  activeSection,
  onConfirm,
  planTypeOverride,
}: ImportWorkoutFromPlanModalProps) {
  const [phase, setPhase] = useState<Phase>('week');
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [focusedWeekId, setFocusedWeekId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const planType = planTypeOverride ?? PLAN_TYPE_BY_SECTION[activeSection] ?? 'YEARLY_PLAN';
  const mergeWeeks = planType === 'YEARLY_PLAN' || planType === 'WORKOUTS_DONE';
  const hasContent = (targetWorkout.moveframes?.length ?? 0) > 0;
  const isYearlyImport = planType === 'YEARLY_PLAN';

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const raw = await fetchPlanWeeks(token, planType);
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
    setExpandedWorkoutIds(new Set());
    setConfirmOverwrite(false);
  }, [isOpen, planType, mergeWeeks]);

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

  useEffect(() => {
    if (phase !== 'workout' || !selectedDay) return;
    if (selectedWorkoutId && dayWorkoutsWithContent.some((w: any) => w.id === selectedWorkoutId)) {
      return;
    }
    const first = dayWorkoutsWithContent[0];
    if (first?.id) {
      setSelectedWorkoutId(first.id);
      setExpandedWorkoutIds(new Set([first.id]));
    }
  }, [phase, selectedDay, dayWorkoutsWithContent, selectedWorkoutId]);

  const selectWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
    setFocusedWeekId(weekId);
    setSelectedDayId(null);
    setSelectedWorkoutId('');
    setConfirmOverwrite(false);
  };

  const selectDay = (day: any) => {
    if (!day?.id || !dayHasWorkouts(day)) return;
    setSelectedDayId(day.id);
    setSelectedWorkoutId('');
    setExpandedWorkoutIds(new Set());
    setConfirmOverwrite(false);
  };

  const selectWorkout = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setExpandedWorkoutIds((prev) => new Set(prev).add(workoutId));
    setConfirmOverwrite(false);
  };

  const toggleWorkoutExpand = (workoutId: string) => {
    setExpandedWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });
  };

  const handleSlotClick = (workout: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workout?.moveframes?.length) return;
    selectWorkout(workout.id);
  };

  const handleBack = () => {
    if (phase === 'workout') {
      setPhase('day');
      setSelectedWorkoutId('');
      setConfirmOverwrite(false);
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
      setConfirmOverwrite(false);
    } else if (phase === 'day' && selectedDayId) {
      setPhase('workout');
      setSelectedWorkoutId('');
      setExpandedWorkoutIds(new Set());
      setConfirmOverwrite(false);
    }
  };

  const handleImport = async (workoutId?: string) => {
    const id = workoutId ?? selectedWorkoutId;
    if (!id) return;
    if (hasContent && !confirmOverwrite) {
      setSelectedWorkoutId(id);
      setExpandedWorkoutIds((prev) => new Set(prev).add(id));
      return;
    }

    setIsImporting(true);
    try {
      await onConfirm({
        targetDayId: targetDay.id,
        sessionNumber: targetWorkout.sessionNumber,
        overwrite: hasContent,
        source: { type: 'session', sourceWorkoutId: id },
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
    if (selectedWorkout) {
      return `Workout #${selectedWorkout.sessionNumber ?? '?'} — ${DAY_NAMES[(selectedDay?.dayOfWeek ?? 1) - 1] ?? 'Day'}`;
    }
    return 'No workout selected';
  }, [phase, selectedWeekId, selectedWeek, selectedDay, selectedWorkout]);

  if (!isOpen) return null;

  const title = isYearlyImport ? 'Import a Workout' : 'Import from Plan';
  const sourceLabel = isYearlyImport
    ? 'Import from Current Yearly Plan'
    : `Import from Section ${activeSection} Plan`;

  const continueDisabled =
    phase === 'week' ? !selectedWeekId : phase === 'day' ? !selectedDayId : false;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">{title}</h2>
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
              {isYearlyImport && (
                <div className="flex items-center gap-2 py-2 px-3 bg-white border border-gray-200 rounded-xl">
                  <YearlySourceIcon />
                  <span className="font-semibold text-gray-900 text-sm">{sourceLabel}</span>
                </div>
              )}
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
              </>
            ) : phase === 'day' ? (
              <>
                <p className="text-sm text-gray-600">
                  Phase II — Week {selectedWeek?.weekNumber ?? '?'}: select a day with workouts.
                </p>

                {weekPeriod && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                      {weekPeriod.name}
                    </span>
                    <span className="text-sm text-blue-100 italic">
                      {weekPeriod.description?.trim() || 'Click Edit to add description…'}
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full border-collapse text-xs min-w-[720px]">
                    <thead>
                      <tr className="bg-sky-100">
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-left">Period</th>
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-center w-12">
                          Week
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-center w-10">
                          Day
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-left min-w-[160px]">
                          Dayname &amp; Date
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-center w-16">
                          Match done
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-center w-28">
                          Workouts
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 font-bold text-left bg-blue-100">
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

                        return (
                          <tr
                            key={dayNum}
                            onClick={() => day && selectDay(day)}
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
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                              {selectedWeek?.weekNumber ?? '—'}
                            </td>
                            <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                              {dayNum}
                            </td>
                            <td className="border border-gray-300 px-2 py-2">
                              <div className="flex items-center gap-1.5 font-medium text-gray-900">
                                <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{formatDayNameDate(day, dayNum)}</span>
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
                              <div className="flex items-center justify-center gap-1">
                                {[1, 2, 3].map((slot) => {
                                  const workout = workouts[slot - 1];
                                  const hasData = Boolean(workout?.moveframes?.length);
                                  return (
                                    <span
                                      key={slot}
                                      className={
                                        'text-sm font-bold inline-flex items-center gap-0.5 ' +
                                        (hasData ? 'text-gray-900' : 'text-gray-300')
                                      }
                                    >
                                      {slot}
                                      <span className="text-[10px]">{SLOT_SYMBOLS[slot - 1]}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="border border-gray-300 px-2 py-2 bg-blue-50/50">
                              {sport1?.sport ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base">{getSportIcon(sport1.sport, 'emoji')}</span>
                                  <span className="font-bold uppercase text-[11px] tracking-wide">
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
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Phase III — Week {selectedWeek?.weekNumber ?? '?'} ·{' '}
                  {selectedDay
                    ? formatDayNameDate(selectedDay, selectedDay.dayOfWeek ?? 1)
                    : 'selected day'}
                  . Select a workout and press Import.
                </p>

                {weekPeriod && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                      {weekPeriod.name}
                    </span>
                    <span className="text-sm text-blue-100 italic">
                      {weekPeriod.description?.trim() || 'Click Edit to add description…'}
                    </span>
                  </div>
                )}

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
                ) : (
                  <div className="space-y-3">
                    {dayWorkoutsWithContent.map((workout: any, wIdx: number) => {
                      const isSelected = selectedWorkoutId === workout.id;
                      const isWorkoutExpanded = expandedWorkoutIds.has(workout.id) || isSelected;
                      const sportSummaries = calculateWorkoutSportSummaries(workout, 'emoji');
                      const periodName =
                        selectedDay?.period?.name ?? weekPeriod?.name ?? '—';
                      const dayDow = selectedDay?.dayOfWeek ?? 1;
                      const headerBg = WORKOUT_HEADER_BG[wIdx % WORKOUT_HEADER_BG.length];
                      const moveframes = [...(workout.moveframes ?? [])].sort(
                        (a: any, b: any) =>
                          (a.sequence ?? 0) - (b.sequence ?? 0) ||
                          String(a.letter ?? '').localeCompare(String(b.letter ?? ''))
                      );

                      return (
                        <div
                          key={workout.id}
                          className={
                            'rounded-lg border overflow-hidden ' +
                            (isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-200'
                              : 'border-gray-300')
                          }
                        >
                          <div
                            className={`${headerBg} px-3 py-2 flex flex-wrap items-center gap-2`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleWorkoutExpand(workout.id)}
                              className="p-0.5 text-gray-600 hover:text-gray-900"
                              aria-label={isWorkoutExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isWorkoutExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <Play className="w-4 h-4 text-gray-600 shrink-0" />
                            <button
                              type="button"
                              onClick={() => selectWorkout(workout.id)}
                              className="text-sm font-bold text-gray-900 hover:underline"
                            >
                              Workout #{workout.sessionNumber ?? wIdx + 1}
                            </button>
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-xs font-medium text-gray-700 uppercase">
                              {periodName}
                            </span>
                            <span className="text-xs text-gray-600">
                              {DAY_NAMES[dayDow - 1] ?? `Day ${dayDow}`}
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const info = [
                                    workout.name,
                                    workout.code,
                                    workout.notes,
                                  ]
                                    .filter(Boolean)
                                    .join('\n');
                                  alert(info || 'No additional workout info.');
                                }}
                                className="px-3 py-1 text-xs font-semibold bg-sky-100 text-sky-800 rounded hover:bg-sky-200"
                              >
                                Workout Info
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  selectWorkout(workout.id);
                                  void handleImport(workout.id);
                                }}
                                disabled={isImporting}
                                className="px-4 py-1 text-sm font-bold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Import
                              </button>
                            </div>
                          </div>

                          {isWorkoutExpanded && (
                            <>
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
                                          {matchLabel(workout)}
                                        </td>
                                        <td
                                          className="border border-gray-300 px-2 py-1 bg-white/40"
                                          colSpan={4}
                                        >
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
                                              {matchLabel(workout)}
                                            </td>
                                          )}
                                          <td className="border border-gray-300 px-2 py-1 bg-white/40">
                                            {s.sport}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 text-center bg-white/40">
                                            {s.duration || formatSportSummaryTotal(s)}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 bg-white/40">
                                            —
                                          </td>
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
                                  <span className="text-xs font-bold text-violet-900">
                                    Moveframes
                                  </span>
                                  <span className="text-xs bg-violet-200 text-violet-900 px-2 py-0.5 rounded-full font-semibold">
                                    {moveframes.length} total
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-xs min-w-[520px]">
                                    <thead>
                                      <tr>
                                        <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-6">
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
                                      {moveframes.map((mf: any, mfIdx: number) => (
                                        <tr key={mf.id ?? mfIdx} className="bg-white/70">
                                          <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">
                                            {mfIdx + 1}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                                            {mf.letter || mf.code || '—'}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1">
                                            {mf.section?.name ?? '—'}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1">
                                            {mf.sport ?? '—'}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 max-w-[160px] truncate">
                                            {moveframeDescription(mf)}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 text-center">
                                            {moveframeDuration(mf)}
                                          </td>
                                          <td className="border border-gray-300 px-2 py-1 text-center">
                                            {moveframeRipSets(mf)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedWorkoutId && hasContent && (
                  <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmOverwrite}
                      onChange={(e) => setConfirmOverwrite(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-amber-900">
                      Replace existing moveframes and movelaps in Workout #{targetWorkout.sessionNumber}.
                    </span>
                  </label>
                )}
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
              {phase === 'workout' ? (
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={
                    isImporting || !selectedWorkoutId || (hasContent && !confirmOverwrite)
                  }
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
