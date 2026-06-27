'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download, CheckSquare, Square, ChevronRight, ChevronDown, Play } from 'lucide-react';
import { isSeriesBasedSport } from '@/constants/moveframe.constants';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import { mergeCoachWeekWithUserWeek } from '@/lib/coachAnnualPlanPayload';
import {
  calculateSportSummaries,
  calculateWorkoutSportSummaries,
  formatSportSummaryTotal,
} from '@/utils/workoutHelpers';
import { getSportIcon } from '@/utils/sportIcons';
import { sortWorkoutsForDisplay } from '@/lib/workoutDisplayOrder';
import type { ImportWorkoutPayload } from './ImportWorkoutModal';

type Phase = 'week' | 'day' | 'workout';

interface ImportWorkoutFromCoachAnnualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetDay: { id: string; weekNumber?: number };
  targetWorkout: { id: string; sessionNumber: number; moveframes?: unknown[] };
  onConfirm: (payload: ImportWorkoutPayload) => Promise<void>;
}

type CoachPlanInfo = {
  entryId: string | null;
  title: string;
  coach: { id: string; name: string; avatarUrl: string | null };
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

function coachWorkoutSlot(workout: any, displayIdx: number): number {
  return workout.sessionNumber ?? displayIdx + 1;
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

function CoachAvatar({ coach }: { coach: CoachPlanInfo['coach'] }) {
  if (coach.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coach.avatarUrl}
        alt=""
        className="w-10 h-10 rounded-full object-cover border-2 border-sky-200 shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-sky-100 to-sky-200 border-2 border-sky-300 flex items-center justify-center shrink-0 overflow-hidden">
      <div className="text-center scale-75">
        <div className="w-8 h-8 mx-auto rounded-full bg-amber-700 relative">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-3 bg-red-500 rounded-t-full" />
        </div>
        <div className="w-6 h-3 mx-auto -mt-1 bg-blue-600 rounded-b-md" />
      </div>
    </div>
  );
}

function periodNameFrom(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: string }).name;
    if (name) return name;
  }
  return '—';
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

export default function ImportWorkoutFromCoachAnnualModal({
  isOpen,
  onClose,
  onBack,
  targetDay,
  targetWorkout,
  onConfirm,
}: ImportWorkoutFromCoachAnnualModalProps) {
  const [phase, setPhase] = useState<Phase>('week');
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [focusedWeekId, setFocusedWeekId] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedCoachSessionNumber, setSelectedCoachSessionNumber] = useState<number | null>(
    null
  );
  const [expandedWorkoutSlots, setExpandedWorkoutSlots] = useState<Set<number>>(new Set());
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [coachWeek, setCoachWeek] = useState<any | null>(null);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [loadingCoachWeek, setLoadingCoachWeek] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<CoachPlanInfo | null>(null);
  const [authorizedWeekNumbers, setAuthorizedWeekNumbers] = useState<number[]>([]);

  const anchorWeekNumber = targetDay.weekNumber ?? null;
  const hasContent = (targetWorkout.moveframes?.length ?? 0) > 0;

  const allWeeks = useMemo(
    () => [...weeks].sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0)),
    [weeks]
  );

  const maxWeekNumber = allWeeks.length
    ? Math.max(...allWeeks.map((w) => w.weekNumber ?? 0))
    : 52;

  const loadCoachPlan = useCallback(async () => {
    setLoadingCoach(true);
    setLoadMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPlanInfo(null);
        setAuthorizedWeekNumbers([]);
        setLoadMessage('Please log in first.');
        return;
      }
      const params = new URLSearchParams({
        anchorWeekNumber: String(anchorWeekNumber ?? 1),
        maxWeekNumber: String(maxWeekNumber),
      });
      const res = await fetch(`/api/workouts/coach-annual-plan?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setPlanInfo(null);
        setAuthorizedWeekNumbers([]);
        setLoadMessage('Failed to load coach annual plan.');
        return;
      }
      const data = await res.json();
      setPlanInfo(data.plan ?? null);
      setAuthorizedWeekNumbers(
        Array.isArray(data.authorizedWeekNumbers) ? data.authorizedWeekNumbers : []
      );
      setLoadMessage(data.message ?? null);
    } catch {
      setPlanInfo(null);
      setAuthorizedWeekNumbers([]);
      setLoadMessage('Failed to load coach annual plan.');
    } finally {
      setLoadingCoach(false);
    }
  }, [anchorWeekNumber, maxWeekNumber]);

  const loadCoachWeek = useCallback(
    async (weekNumber: number) => {
      setLoadingCoachWeek(true);
      setCoachWeek(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const params = new URLSearchParams({
          anchorWeekNumber: String(anchorWeekNumber ?? 1),
          maxWeekNumber: String(maxWeekNumber),
          weekNumber: String(weekNumber),
        });
        const res = await fetch(`/api/workouts/coach-annual-plan?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCoachWeek(data.coachWeek ?? null);
      } finally {
        setLoadingCoachWeek(false);
      }
    },
    [anchorWeekNumber, maxWeekNumber]
  );

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      setLoadingWeeks(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const raw = await fetchPlanWeeks(token, 'YEARLY_PLAN');
        setWeeks(mergeWeeksByWeekNumber(raw));
      } finally {
        setLoadingWeeks(false);
      }
    })();
    setPhase('week');
    setSelectedWeekId(null);
    setFocusedWeekId(null);
    setSelectedDayId(null);
    setSelectedCoachSessionNumber(null);
    setExpandedWorkoutSlots(new Set());
    setConfirmOverwrite(false);
    setCoachWeek(null);
    void loadCoachPlan();
  }, [isOpen, loadCoachPlan]);

  const selectedWeek = useMemo(
    () => allWeeks.find((w) => w.id === selectedWeekId) ?? null,
    [allWeeks, selectedWeekId]
  );

  useEffect(() => {
    if (phase !== 'day' || !selectedWeek?.weekNumber) return;
    void loadCoachWeek(selectedWeek.weekNumber);
  }, [phase, selectedWeek?.weekNumber, loadCoachWeek]);

  const sourceWeek = useMemo(() => {
    if (anchorWeekNumber == null) return null;
    return allWeeks.find((w) => w.weekNumber === anchorWeekNumber) ?? null;
  }, [allWeeks, anchorWeekNumber]);

  const isSourceWeek = (week: any) => sourceWeek != null && week.id === sourceWeek.id;

  const isAuthorizedWeek = (week: any) => authorizedWeekNumbers.includes(week.weekNumber);

  const canSelectWeek = (week: any) => !isSourceWeek(week) && isAuthorizedWeek(week);

  const displayDays = useMemo(
    () => mergeCoachWeekWithUserWeek(coachWeek, selectedWeek),
    [coachWeek, selectedWeek]
  );

  const selectedDay = useMemo(
    () => displayDays.find((d) => d.id === selectedDayId) ?? null,
    [displayDays, selectedDayId]
  );

  const weekPeriod = useMemo((): { name?: string; description?: string } | null => {
    if (!selectedWeek && !coachWeek) return null;
    const p =
      coachWeek?.period ??
      selectedWeek?.period ??
      displayDays.find((d) => d.period)?.period ??
      displayDays[0]?.period ??
      null;
    return p as { name?: string; description?: string } | null;
  }, [coachWeek, selectedWeek, displayDays]);

  const dayWorkoutsWithContent = useMemo(() => {
    if (!selectedDay) return [];
    return workoutsWithContent(selectedDay);
  }, [selectedDay]);

  const selectedWorkout = useMemo(() => {
    if (selectedCoachSessionNumber == null) return null;
    return (
      dayWorkoutsWithContent.find(
        (w: any, idx: number) => coachWorkoutSlot(w, idx) === selectedCoachSessionNumber
      ) ?? null
    );
  }, [selectedCoachSessionNumber, dayWorkoutsWithContent]);

  useEffect(() => {
    if (phase !== 'workout' || !selectedDay) return;
    if (
      selectedCoachSessionNumber != null &&
      dayWorkoutsWithContent.some(
        (w: any, idx: number) => coachWorkoutSlot(w, idx) === selectedCoachSessionNumber
      )
    ) {
      return;
    }
    const first = dayWorkoutsWithContent[0];
    if (first) {
      const slot = coachWorkoutSlot(first, 0);
      setSelectedCoachSessionNumber(slot);
      setExpandedWorkoutSlots(new Set([slot]));
    }
  }, [phase, selectedDay, dayWorkoutsWithContent, selectedCoachSessionNumber]);

  const selectWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
    setFocusedWeekId(weekId);
  };

  const selectDay = (day: any) => {
    if (!day?.id || !dayHasWorkouts(day)) return;
    setSelectedDayId(day.id);
    setSelectedCoachSessionNumber(null);
    setExpandedWorkoutSlots(new Set());
    setConfirmOverwrite(false);
  };

  const selectWorkout = (sessionNum: number) => {
    setSelectedCoachSessionNumber(sessionNum);
    setExpandedWorkoutSlots((prev) => new Set(prev).add(sessionNum));
    setConfirmOverwrite(false);
  };

  const toggleWorkoutExpand = (sessionNum: number) => {
    setExpandedWorkoutSlots((prev) => {
      const next = new Set(prev);
      if (next.has(sessionNum)) next.delete(sessionNum);
      else next.add(sessionNum);
      return next;
    });
  };

  const handleSlotClick = (workout: any, displayIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workout?.moveframes?.length) return;
    selectWorkout(coachWorkoutSlot(workout, displayIdx));
  };

  const handleImport = async (sessionNum?: number) => {
    const coachSessionNumber = sessionNum ?? selectedCoachSessionNumber;
    if (
      coachSessionNumber == null ||
      !planInfo?.entryId ||
      !selectedWeek?.weekNumber ||
      !selectedDay?.dayOfWeek
    ) {
      return;
    }
    if (hasContent && !confirmOverwrite) {
      setSelectedCoachSessionNumber(coachSessionNumber);
      setExpandedWorkoutSlots((prev) => new Set(prev).add(coachSessionNumber));
      return;
    }

    setIsImporting(true);
    try {
      await onConfirm({
        targetDayId: targetDay.id,
        sessionNumber: targetWorkout.sessionNumber,
        overwrite: hasContent,
        source: {
          type: 'coach_annual',
          globalEntryId: planInfo.entryId,
          coachWeekNumber: selectedWeek.weekNumber,
          coachDayOfWeek: selectedDay.dayOfWeek,
          coachSessionNumber,
          anchorWeekNumber: anchorWeekNumber ?? 1,
          maxWeekNumber,
        },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    if (phase === 'workout') {
      setPhase('day');
      setSelectedCoachSessionNumber(null);
      setConfirmOverwrite(false);
    } else if (phase === 'day') {
      setPhase('week');
      setSelectedDayId(null);
      setCoachWeek(null);
    } else {
      onBack();
    }
  };

  const handleContinue = () => {
    if (phase === 'week' && selectedWeekId) {
      setPhase('day');
      setSelectedDayId(null);
    } else if (phase === 'day' && selectedDayId) {
      setPhase('workout');
      setSelectedCoachSessionNumber(null);
      setExpandedWorkoutSlots(new Set());
      setConfirmOverwrite(false);
    }
  };

  const loading = loadingWeeks || loadingCoach;
  const coach = planInfo?.coach ?? { id: '', name: 'Coach', avatarUrl: null };
  const hasPlan = Boolean(planInfo?.entryId);

  const footerStatus = useMemo(() => {
    if (phase === 'week') {
      return selectedWeekId
        ? `Week ${selectedWeek?.weekNumber ?? '?'} selected`
        : 'No weeks selected';
    }
    if (phase === 'day') {
      if (!selectedDay) return 'No day selected';
      return formatDayNameDate(selectedDay, selectedDay.dayOfWeek ?? 1);
    }
    if (selectedWorkout) {
      return `Workout #${selectedCoachSessionNumber ?? '?'} — ${DAY_NAMES[(selectedDay?.dayOfWeek ?? 1) - 1] ?? 'Day'}`;
    }
    return 'No workout selected';
  }, [phase, selectedWeekId, selectedWeek, selectedDay, selectedWorkout, selectedCoachSessionNumber]);

  const continueDisabled =
    phase === 'week' ? !selectedWeekId || !hasPlan : phase === 'day' ? !selectedDayId : false;

  if (!isOpen) return null;

  const modalWidth = phase === 'week' ? 'max-w-2xl' : 'max-w-4xl';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div
          className={`bg-white rounded-lg shadow-xl w-full ${modalWidth} max-h-[92vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a Workout</h2>
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
              <div className="flex items-center justify-center gap-3 py-2 px-4 bg-white border border-gray-200 rounded-xl flex-1 min-w-[200px]">
                <CoachAvatar coach={coach} />
                <span className="font-semibold text-gray-900 text-sm">
                  Import from{' '}
                  <span className="text-blue-700">Your Coach&apos;s Annual Plan</span>
                </span>
              </div>
            </div>

            {phase === 'week' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                  The import can only be done if the coach has authorized this procedure and only
                  for the authorized workouts. Unauthorized workouts will appear grayed out.
                </div>

                {loading ? (
                  <p className="text-center py-8 text-gray-500 text-sm">Loading coach plan…</p>
                ) : !hasPlan ? (
                  <p className="text-center py-8 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    {loadMessage ||
                      'Your coach has not shared an authorized annual plan yet. Ask your coach to share a plan and authorize import weeks.'}
                  </p>
                ) : (
                  <>
                    {planInfo?.title && (
                      <p className="text-sm text-gray-600 text-center">
                        Plan: <span className="font-semibold text-gray-900">{planInfo.title}</span>
                        {coach.name ? (
                          <>
                            {' '}
                            · Coach: <span className="font-semibold">{coach.name}</span>
                          </>
                        ) : null}
                      </p>
                    )}

                    <p className="text-sm text-gray-600">
                      Phase I — select a week to browse. Your current week is marked{' '}
                      <span className="font-semibold">Source</span>. Only coach-authorized weeks
                      can be selected.
                    </p>

                    <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                      {allWeeks.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No weeks in plan.</p>
                      ) : (
                        allWeeks.map((week) => {
                          const sourceMatch = isSourceWeek(week);
                          const authorized = isAuthorizedWeek(week);
                          const selectable = canSelectWeek(week);
                          const isSelected = selectedWeekId === week.id;
                          const isFocused = focusedWeekId === week.id;
                          const disabled = sourceMatch || !authorized;

                          return (
                            <label
                              key={week.id}
                              onMouseEnter={() => selectable && setFocusedWeekId(week.id)}
                              onClick={() => selectable && selectWeek(week.id)}
                              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 ${
                                disabled
                                  ? 'bg-gray-100 cursor-not-allowed opacity-60'
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
                                disabled={disabled}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-semibold ${disabled ? 'text-gray-500' : 'text-gray-900'}`}
                                  >
                                    Week {week.weekNumber}
                                  </span>
                                  {sourceMatch && (
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                      Source
                                    </span>
                                  )}
                                  {!sourceMatch && !authorized && (
                                    <span className="px-2 py-0.5 bg-gray-300 text-gray-600 text-xs font-medium rounded">
                                      Not authorized
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
                )}
              </>
            ) : phase === 'day' ? (
              <>
                <p className="text-sm text-gray-600">
                  Phase II — Week {selectedWeek?.weekNumber ?? '?'}: select a day with workouts.
                </p>

                {weekPeriod && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white">
                    <span className="w-5 h-5 rounded-full bg-white shrink-0" aria-hidden />
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                      {weekPeriod.name}
                    </span>
                    <span className="text-sm text-blue-100 italic">
                      {weekPeriod.description?.trim() || 'Click Edit to add description…'}
                    </span>
                  </div>
                )}

                {loadingCoachWeek ? (
                  <p className="text-center py-8 text-gray-500 text-sm">Loading week days…</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="w-full border-collapse text-xs min-w-[720px]">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="border border-blue-500 px-2 py-1.5 font-bold text-left">
                            Period
                          </th>
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
                        {displayDays.map((day, idx) => {
                          const dayNum = day.dayOfWeek ?? idx + 1;
                          const period = day.period ?? weekPeriod;
                          const workouts = sortedWorkouts(day);
                          const hasWorkouts = dayHasWorkouts(day);
                          const summaries = calculateSportSummaries(day, 'emoji');
                          const sport1 = summaries[0];
                          const isSelected = selectedDayId === day.id;
                          const rowStripe = idx % 2 === 0 ? 'bg-sky-50/40' : 'bg-white';
                          const highlightCell = isSelected ? 'bg-lime-100' : '';

                          return (
                            <tr
                              key={day.id}
                              onClick={() => selectDay(day)}
                              className={
                                (hasWorkouts ? 'cursor-pointer ' : '') +
                                (isSelected
                                  ? 'ring-2 ring-inset ring-red-500'
                                  : `${rowStripe} ${hasWorkouts ? 'hover:bg-yellow-50' : 'opacity-70'}`)
                              }
                              title={
                                hasWorkouts
                                  ? 'Click to select this day'
                                  : 'No workouts with moveframes on this day'
                              }
                            >
                              <td className="border border-gray-300 px-2 py-2 text-blue-800 font-medium">
                                {periodNameFrom(period)}
                              </td>
                              <td
                                className={`border border-gray-300 px-2 py-2 text-center font-semibold ${highlightCell}`}
                              >
                                {selectedWeek?.weekNumber ?? '—'}
                              </td>
                              <td
                                className={`border border-gray-300 px-2 py-2 text-center font-semibold ${highlightCell}`}
                              >
                                {dayNum}
                              </td>
                              <td
                                className={`border border-gray-300 px-2 py-2 ${highlightCell}`}
                              >
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
                                    <span className="text-base">
                                      {getSportIcon(sport1.sport, 'emoji')}
                                    </span>
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
                )}
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
                    <span className="w-5 h-5 rounded-full bg-white shrink-0" aria-hidden />
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
                      {displayDays.map((day, idx) => {
                        const dayNum = day.dayOfWeek ?? idx + 1;
                        const period = day.period ?? weekPeriod;
                        const workouts = sortedWorkouts(day);
                        const summaries = calculateSportSummaries(day, 'emoji');
                        const sport1 = summaries[0];
                        const mainWorkText = sport1?.mainWork ? stripHtml(sport1.mainWork) : '—';
                        const isActiveDay = day.id === selectedDayId;
                        const dimmed = !isActiveDay;
                        const isSelectedRow = isActiveDay;

                        return (
                          <tr
                            key={day.id}
                            className={
                              (isSelectedRow ? 'ring-2 ring-inset ring-red-500 ' : '') +
                              (isActiveDay ? 'bg-emerald-50/80' : dimmed ? 'opacity-45' : '')
                            }
                          >
                            <td className="border border-gray-300 px-2 py-1.5 text-gray-700">
                              {periodNameFrom(period)}
                            </td>
                            <td
                              className={
                                'border border-gray-300 px-2 py-1.5 text-center font-semibold ' +
                                (isSelectedRow ? 'bg-lime-100' : '')
                              }
                            >
                              {selectedWeek?.weekNumber ?? '—'}
                            </td>
                            <td
                              className={
                                'border border-gray-300 px-2 py-1.5 text-center font-semibold ' +
                                (isSelectedRow ? 'bg-lime-100' : '')
                              }
                            >
                              {dayNum}
                            </td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {[0, 1, 2].map((slotIdx) => {
                                  const workout = workouts[slotIdx];
                                  const hasData = Boolean(workout?.moveframes?.length);
                                  const slotNum = coachWorkoutSlot(workout, slotIdx);
                                  const isSlotSelected =
                                    isActiveDay && selectedCoachSessionNumber === slotNum;
                                  return (
                                    <button
                                      key={slotIdx + 1}
                                      type="button"
                                      disabled={!isActiveDay || !hasData}
                                      onClick={(e) =>
                                        workout && handleSlotClick(workout, slotIdx, e)
                                      }
                                      className={
                                        'text-sm font-bold inline-flex items-center gap-0.5 rounded px-1 py-0.5 ' +
                                        (isActiveDay && hasData
                                          ? isSlotSelected
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-900 hover:bg-blue-100'
                                          : 'text-gray-400 cursor-default')
                                      }
                                    >
                                      {slotIdx + 1}
                                      <span className="text-xs">{SLOT_SYMBOLS[slotIdx]}</span>
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
                      const sessionNum = coachWorkoutSlot(workout, wIdx);
                      const isSelected = selectedCoachSessionNumber === sessionNum;
                      const isWorkoutExpanded =
                        expandedWorkoutSlots.has(sessionNum) || isSelected;
                      const sportSummaries = calculateWorkoutSportSummaries(workout, 'emoji');
                      const periodName =
                        periodNameFrom(selectedDay?.period) !== '—'
                          ? periodNameFrom(selectedDay?.period)
                          : weekPeriod?.name ?? '—';
                      const dayDow = selectedDay?.dayOfWeek ?? 1;
                      const headerBg = WORKOUT_HEADER_BG[wIdx % WORKOUT_HEADER_BG.length];
                      const moveframes = [...(workout.moveframes ?? [])].sort(
                        (a: any, b: any) =>
                          (a.sequence ?? 0) - (b.sequence ?? 0) ||
                          String(a.letter ?? '').localeCompare(String(b.letter ?? ''))
                      );

                      return (
                        <div
                          key={sessionNum}
                          className={
                            'rounded-lg border overflow-hidden ' +
                            (isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-200'
                              : 'border-gray-300')
                          }
                        >
                          <div className={`${headerBg} px-3 py-2 flex flex-wrap items-center gap-2`}>
                            <button
                              type="button"
                              onClick={() => toggleWorkoutExpand(sessionNum)}
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
                              onClick={() => selectWorkout(sessionNum)}
                              className="text-sm font-bold text-gray-900 hover:underline"
                            >
                              Workout #{sessionNum}
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
                                  const info = [workout.name, workout.code, workout.notes]
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
                                  selectWorkout(sessionNum);
                                  void handleImport(sessionNum);
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

                {selectedCoachSessionNumber != null && hasContent && (
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
              {(phase === 'week' || phase === 'day') && (
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={continueDisabled}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}
              {phase === 'workout' && (
                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={
                    isImporting ||
                    selectedCoachSessionNumber == null ||
                    (hasContent && !confirmOverwrite)
                  }
                  className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isImporting ? 'Importing…' : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
