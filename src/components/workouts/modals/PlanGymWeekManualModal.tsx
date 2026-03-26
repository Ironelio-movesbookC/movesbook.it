'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronUp, ChevronDown, ChevronsDown, Trash2 } from 'lucide-react';
import {
  GOAL_OPTIONS,
  type GoalId,
  type TrainingLevel,
  getPlanGymWeekTrainingLevelImageSrc,
  getPlanGymWeekTrainingLevelLabel
} from './PlanGymWeekModal';
import { buildHelpedRoutines, type BuildHelpedRoutinesParams } from '@/utils/planGymWeekLogic';
import {
  computePyramidalRepsSeries,
  formatPercentLoad1MR,
  type PyramidalMode
} from '@/utils/pyramidalReps';

/** Muscular sectors with images (aligned with FastPlannerOfMoveframes) */
const MUSCLE_GROUPS = [
  { id: 'shoulders', label: 'Shoulders', image: '/muscular/shoulders.png' },
  { id: 'biceps', label: 'Biceps', image: '/muscular/Biceps.png' },
  { id: 'triceps', label: 'Triceps', image: '/muscular/Triceps.png' },
  { id: 'forearms', label: 'Forearms', image: '/muscular/Forearms.png' },
  { id: 'chest', label: 'Chest', image: '/muscular/chest.png' },
  { id: 'abs', label: 'Abdominals', image: '/muscular/abs.png' },
  { id: 'trapezius', label: 'Trapezius', image: '/muscular/trapezius.png' },
  { id: 'lats', label: 'Lats', image: '/muscular/Lats.png' },
  { id: 'quadriceps', label: 'Quadriceps', image: '/muscular/quadriceps.png' },
  { id: 'hams', label: 'Hamstrings', image: '/muscular/hams.png' },
  { id: 'calves', label: 'Calves', image: '/muscular/calves.png' },
  { id: 'glutes', label: 'Glutes', image: '/muscular/glutes.png' }
];

const PAUSE_OPTIONS = ['0', '30"', "1'", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'"];

const PYRAMIDAL_OPTIONS: { value: PyramidalMode; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'ascending', label: 'Ascending' },
  { value: 'descending', label: 'Descending' },
  { value: 'mix', label: 'Mix' }
];

export interface ManualDaySector {
  sectorId: string;
  sectorLabel: string;
  image: string;
  exercises: number;
  series: number;
  /** Target reps for series 1; drives pyramid when Pyramidal ≠ Flat */
  reps: number;
  pause: string;
  macroExercise: string;
  macroEndOfSector: string;
  /** Default Flat — same as Add/Edit moveframe body-building planning */
  pyramidal: PyramidalMode;
  /** One entry per series (length === series) */
  seriesReps: number[];
  seriesWeights: string[];
}

export interface ManualDayPlan {
  routineName: string;
  sectors: ManualDaySector[];
}

export interface PlanGymWeekManualResult {
  daysCount: number;
  days: ManualDayPlan[];
}

function resizeSeriesWeights(w: string[] | undefined, len: number): string[] {
  const out = [...(w ?? [])];
  while (out.length < len) out.push('0');
  out.length = len;
  return out;
}

/** Normalize sector after load from saved plan or older JSON (missing pyramidal / series arrays). */
export function ensureManualSectorShape(sec: ManualDaySector): ManualDaySector {
  const series = Math.max(1, Math.min(20, sec.series));
  const reps = Math.max(1, Math.min(99, sec.reps || 12));
  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  let seriesReps = sec.seriesReps;
  if (!Array.isArray(seriesReps) || seriesReps.length !== series) {
    seriesReps = computePyramidalRepsSeries(reps, series, pyramidal);
  }
  let seriesWeights = sec.seriesWeights;
  if (!Array.isArray(seriesWeights) || seriesWeights.length !== series) {
    seriesWeights = Array.from({ length: series }, (_, i) =>
      sec.seriesWeights?.[i] != null ? String(sec.seriesWeights[i]) : '0'
    );
  }
  return {
    ...sec,
    exercises: Math.max(1, Math.min(20, sec.exercises)),
    series,
    reps,
    pyramidal,
    seriesReps,
    seriesWeights
  };
}

function ensureManualDayPlan(day: ManualDayPlan): ManualDayPlan {
  return {
    ...day,
    sectors: day.sectors.map(ensureManualSectorShape)
  };
}

type SectorScalarField =
  | 'exercises'
  | 'series'
  | 'reps'
  | 'pause'
  | 'macroExercise'
  | 'macroEndOfSector'
  | 'pyramidal';

function applySectorScalarUpdate(sec: ManualDaySector, field: SectorScalarField, value: number | string): ManualDaySector {
  if (field === 'exercises') {
    const exercises = Math.max(1, Math.min(20, parseInt(String(value), 10) || 1));
    return { ...sec, exercises };
  }
  if (field === 'series') {
    const series = Math.max(1, Math.min(20, parseInt(String(value), 10) || 1));
    const seriesReps = computePyramidalRepsSeries(sec.reps, series, sec.pyramidal);
    return { ...sec, series, seriesReps, seriesWeights: resizeSeriesWeights(sec.seriesWeights, series) };
  }
  if (field === 'reps') {
    const reps = Math.max(1, Math.min(99, parseInt(String(value), 10) || 1));
    const seriesReps = computePyramidalRepsSeries(reps, sec.series, sec.pyramidal);
    return {
      ...sec,
      reps,
      seriesReps,
      seriesWeights: resizeSeriesWeights(sec.seriesWeights, sec.series)
    };
  }
  if (field === 'pyramidal') {
    const pyramidal = String(value) as PyramidalMode;
    const base = sec.reps > 0 ? sec.reps : 12;
    const seriesReps = computePyramidalRepsSeries(base, sec.series, pyramidal);
    return {
      ...sec,
      pyramidal,
      seriesReps,
      seriesWeights: resizeSeriesWeights(sec.seriesWeights, sec.series)
    };
  }
  if (field === 'pause' || field === 'macroExercise' || field === 'macroEndOfSector') {
    return { ...sec, [field]: String(value) };
  }
  return sec;
}

/** Summary of the last planned workout for a given sector (from workout plan) */
export interface LastWorkoutSummary {
  date: string;
  totalSeries: number;
  aveRepsPerSet: number;
  totalReps: number;
  pause: string;
}

/** Workout plan shape (weeks → days → workouts → moveframes → movelaps) for last-workout lookup */
export type WorkoutPlanForLast = {
  weeks?: Array<{
    days?: Array<{
      date?: string;
      workouts?: Array<{
        moveframes?: Array<{
          movelaps?: Array<{
            muscularSector?: string | null;
            sector?: string | null;
            reps?: number | string | null;
            pause?: string | null;
          }>;
        }>;
      }>;
    }>;
  }>;
} | null;

/** Match sector for last-workout: plan may use "Shoulders" or "Abdominals", we have sectorLabel and sectorId */
function sectorMatches(movelapSector: string | null | undefined, sectorLabel: string, sectorId: string): boolean {
  if (!movelapSector) return false;
  const lap = String(movelapSector).trim().toLowerCase();
  const label = sectorLabel.trim().toLowerCase();
  const id = sectorId.trim().toLowerCase();
  return lap === label || lap === id || (id === 'abs' && lap === 'abdominals') || (id === 'hams' && (lap === 'hamstrings' || lap === 'hams'));
}

/** Get last previous moveframe summary for a sector from the workout plan */
export function getLastWorkoutBySector(
  plan: WorkoutPlanForLast,
  sectorLabel: string,
  sectorId: string
): LastWorkoutSummary | null {
  if (!plan?.weeks?.length) return null;
  const entries: { date: string; moveframe: { movelaps: any[] }; sectorMovelaps: any[] }[] = [];
  for (const week of plan.weeks) {
    for (const day of week.days ?? []) {
      const dayDate = day.date ? String(day.date).slice(0, 10) : '';
      for (const workout of day.workouts ?? []) {
        for (const moveframe of workout.moveframes ?? []) {
          const movelaps = moveframe.movelaps ?? [];
          const sectorMovelaps = movelaps.filter(
            (lap: any) => sectorMatches(lap.muscularSector ?? lap.sector, sectorLabel, sectorId)
          );
          if (sectorMovelaps.length > 0) {
            entries.push({ date: dayDate, moveframe: { movelaps: sectorMovelaps }, sectorMovelaps });
          }
        }
      }
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));
  const latest = entries[0];
  const laps = latest.sectorMovelaps;
  const totalSeries = laps.length;
  let totalReps = 0;
  for (const lap of laps) {
    const r = lap.reps;
    if (typeof r === 'number' && !Number.isNaN(r)) totalReps += r;
    else if (typeof r === 'string') totalReps += parseInt(r, 10) || 0;
  }
  const aveRepsPerSet = totalSeries > 0 ? Math.round((totalReps / totalSeries) * 10) / 10 : 0;
  const pause = laps[0]?.pause ?? '';
  return {
    date: latest.date,
    totalSeries,
    aveRepsPerSet,
    totalReps,
    pause: typeof pause === 'string' ? pause : ''
  };
}

interface PlanGymWeekManualModalProps {
  isOpen: boolean;
  initialDaysCount: number;
  onClose: () => void;
  /** Called when user clicks "Create routines and movelaps". Save flow: plan can be saved to ARCHIVES and/or to some days of the YEARLY PLAN (tag the week and the days where the plan is applied). */
  onCreateRoutines: (result: PlanGymWeekManualResult) => void;
  /** When set (e.g. from helped flow), form is prefilled with this plan; user can edit and then Create */
  initialPlan?: PlanGymWeekManualResult | null;
  /** Goal selected per day (from Plan Gym Week modal); displayed next to routine name */
  goals?: GoalId[];
  /** Optional workout plan to show "Last workout" summary per sector */
  workoutPlan?: WorkoutPlanForLast;
  /** Optional image URL when no training level is set (e.g. AI-generated) */
  headerImage?: string;
  /** When set (helped wizard flow), “Rescan sectors” rebuilds system assignment with A/B/C alternation + new shuffle */
  rescanParams?: PlanGymWeekRescanParams | null;
  /** From Plan Gym Week step 1; shows photo and label in the top panel */
  trainingLevel?: TrainingLevel | null;
  trainingLevelImages?: Partial<Record<TrainingLevel, string>>;
  /** Return to the Plan Gym Week questions (step 2 if user had already advanced) */
  onBack?: () => void;
}

function buildInitialDays(daysCount: number): ManualDayPlan[] {
  return Array.from({ length: daysCount }, (_, i) => ({
    routineName: `Day ${i + 1}`,
    sectors: []
  }));
}

function formatLastWorkoutDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

function getGoalLabel(goalId: GoalId | undefined): string {
  if (!goalId) return '';
  const opt = GOAL_OPTIONS.find((o) => o.value === goalId);
  return opt ? opt.label : goalId;
}

export type PlanGymWeekRescanParams = Omit<BuildHelpedRoutinesParams, 'constantSectorsAtBeginning'>;

/** Move sectors that match wizard “train constantly” to the start or end of each day, preserving relative order within each block. */
function reorderDaysConstantPlacement(
  dayPlans: ManualDayPlan[],
  constantIds: Set<string>,
  atBeginning: boolean
): ManualDayPlan[] {
  if (constantIds.size === 0) return dayPlans;
  return dayPlans.map((day) => {
    const constantSecs = day.sectors.filter((s) => constantIds.has(s.sectorId));
    const otherSecs = day.sectors.filter((s) => !constantIds.has(s.sectorId));
    return {
      ...day,
      sectors: atBeginning ? [...constantSecs, ...otherSecs] : [...otherSecs, ...constantSecs]
    };
  });
}

export default function PlanGymWeekManualModal({
  isOpen,
  initialDaysCount,
  onClose,
  onCreateRoutines,
  initialPlan,
  goals = [],
  workoutPlan,
  headerImage,
  rescanParams = null,
  trainingLevel = null,
  trainingLevelImages,
  onBack
}: PlanGymWeekManualModalProps) {
  const [daysCount, setDaysCount] = useState<number>(Math.min(6, Math.max(1, initialDaysCount)));
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [days, setDays] = useState<ManualDayPlan[]>(() => buildInitialDays(initialDaysCount));
  const [editingRoutineName, setEditingRoutineName] = useState<string | null>(null);
  const [draftRoutineName, setDraftRoutineName] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'fullOverview'>('edit');
  const [constantSectorsAtBeginning, setConstantSectorsAtBeginning] = useState(false);
  /** 0-based source day index (only days before the current day). Default index = max(0, activeDayIndex - 2) → “day before previous”. */
  const [loadFromSourceIndex, setLoadFromSourceIndex] = useState(0);

  const constantSectorIdSet = useMemo(() => {
    const ids = rescanParams?.constantSectors?.filter(Boolean) ?? [];
    return new Set(ids);
  }, [rescanParams]);

  // Reset form when modal opens: use initialPlan if provided (helped flow), else empty by initialDaysCount
  useEffect(() => {
    if (isOpen) {
      if (initialPlan?.days?.length) {
        setDaysCount(initialPlan.daysCount);
        setActiveDayIndex(0);
        setDays(initialPlan.days.map(ensureManualDayPlan));
      } else {
        const initial = Math.min(6, Math.max(1, initialDaysCount));
        setDaysCount(initial);
        setActiveDayIndex(0);
        setDays(buildInitialDays(initial));
      }
      setEditingRoutineName(null);
      setViewMode('edit');
      setConstantSectorsAtBeginning(false);
      setLoadFromSourceIndex(0);
    }
  }, [isOpen, initialDaysCount, initialPlan]);

  useEffect(() => {
    if (activeDayIndex < 1) return;
    const maxSrc = activeDayIndex - 1;
    const defaultIdx = Math.max(0, activeDayIndex - 2);
    setLoadFromSourceIndex(Math.min(defaultIdx, maxSrc));
  }, [activeDayIndex]);

  const handleProceedLoadFromDay = () => {
    if (activeDayIndex < 1) return;
    const srcIdx = loadFromSourceIndex;
    if (srcIdx < 0 || srcIdx >= activeDayIndex) return;
    const sourceDay = stableDays[srcIdx];
    if (!sourceDay) return;
    setDays((prev) => {
      const next = [...prev];
      const cur = next[activeDayIndex];
      if (!cur) return prev;
      next[activeDayIndex] = {
        ...cur,
        routineName: sourceDay.routineName,
        sectors: sourceDay.sectors.map((s) => ensureManualSectorShape({ ...s }))
      };
      return next;
    });
    setEditingRoutineName(null);
  };

  const handleRescanSectors = useCallback(() => {
    if (!rescanParams) return;
    const n = Math.min(6, Math.max(1, daysCount));
    const plan = buildHelpedRoutines({
      ...rescanParams,
      daysCount: n,
      constantSectorsAtBeginning
    });
    setDaysCount(plan.daysCount);
    setDays(plan.days);
    setActiveDayIndex((i) => Math.min(i, Math.max(0, plan.days.length - 1)));
    setEditingRoutineName(null);
  }, [rescanParams, daysCount, constantSectorsAtBeginning]);

  const onToggleConstantPlacement = (checked: boolean) => {
    setConstantSectorsAtBeginning(checked);
    if (constantSectorIdSet.size === 0) return;
    setDays((prev) => reorderDaysConstantPlacement(prev, constantSectorIdSet, checked));
  };

  // When daysCount changes, resize days array (keep or trim)
  const stableDays = useMemo(() => {
    const current = days.length;
    if (current === daysCount) return days;
    if (daysCount > current) {
      return [
        ...days,
        ...Array.from({ length: daysCount - current }, (_, i) => ({
          routineName: `Day ${current + i + 1}`,
          sectors: [] as ManualDaySector[]
        }))
      ];
    }
    return days.slice(0, daysCount);
  }, [daysCount, days]);

  // When daysCount increases, append empty days; when it decreases, trim
  useEffect(() => {
    setDays((prev) => {
      if (prev.length === daysCount) return prev;
      if (daysCount > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: daysCount - prev.length }, (_, i) => ({
            routineName: `Day ${prev.length + i + 1}`,
            sectors: [] as ManualDaySector[]
          }))
        ];
      }
      return prev.slice(0, daysCount);
    });
  }, [daysCount]);

  useEffect(() => {
    if (activeDayIndex >= daysCount) setActiveDayIndex(Math.max(0, daysCount - 1));
  }, [daysCount, activeDayIndex]);

  const setStableDays = (updater: (prev: ManualDayPlan[]) => ManualDayPlan[]) => {
    setDays(updater);
  };

  if (!isOpen) return null;

  const activeDay = stableDays[activeDayIndex];
  const canAddSector = (sectorId: string) =>
    !activeDay.sectors.some((s) => s.sectorId === sectorId);

  const addSector = (sectorId: string) => {
    const group = MUSCLE_GROUPS.find((g) => g.id === sectorId);
    if (!group || !canAddSector(sectorId)) return;
    setStableDays((prev) => {
      const next = [...prev];
      const day = { ...next[activeDayIndex], sectors: [...next[activeDayIndex].sectors] };
      const series = 4;
      const reps = 12;
      day.sectors.push({
        sectorId: group.id,
        sectorLabel: group.label,
        image: group.image,
        exercises: 3,
        series,
        reps,
        pause: "1'30\"",
        macroExercise: "1'",
        macroEndOfSector: "2'",
        pyramidal: 'flat',
        seriesReps: computePyramidalRepsSeries(reps, series, 'flat'),
        seriesWeights: Array.from({ length: series }, () => '0')
      });
      next[activeDayIndex] = day;
      return next;
    });
  };

  const removeSector = (dayIdx: number, sectorIndex: number) => {
    setStableDays((prev) => {
      const next = [...prev];
      const day = { ...next[dayIdx], sectors: next[dayIdx].sectors.filter((_, i) => i !== sectorIndex) };
      next[dayIdx] = day;
      return next;
    });
  };

  const moveSector = (dayIdx: number, index: number, direction: 'up' | 'down') => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= sectors.length) return prev;
      [sectors[index], sectors[target]] = [sectors[target], sectors[index]];
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const updateSector = (dayIdx: number, sectorIndex: number, field: SectorScalarField, value: number | string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      sectors[sectorIndex] = applySectorScalarUpdate(sectors[sectorIndex], field, value);
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const updateSeriesRepAt = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const v = Math.max(1, Math.min(99, parsed));
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const n = sec.series;
      if (sec.pyramidal === 'flat') {
        sec.reps = v;
        sec.seriesReps = Array.from({ length: n }, () => v);
      } else if (rowIdx === 0) {
        sec.reps = v;
        sec.seriesReps = computePyramidalRepsSeries(v, n, sec.pyramidal);
      } else {
        const seriesReps = [...sec.seriesReps];
        seriesReps[rowIdx] = v;
        sec.seriesReps = seriesReps;
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const updateSeriesWeightAt = (dayIdx: number, secIdx: number, rowIdx: number, w: string) => {
    const digits = w.replace(/\D/g, '').slice(0, 4);
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const seriesWeights = [...sec.seriesWeights];
      seriesWeights[rowIdx] = digits;
      sec.seriesWeights = seriesWeights;
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const copySeriesRowsDown = (dayIdx: number, secIdx: number, fromRow: number) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const seriesReps = [...sec.seriesReps];
      const seriesWeights = [...sec.seriesWeights];
      const r = seriesReps[fromRow];
      const w = seriesWeights[fromRow];
      for (let i = fromRow + 1; i < sec.series; i++) {
        seriesReps[i] = r;
        seriesWeights[i] = w;
      }
      sec.seriesReps = seriesReps;
      sec.seriesWeights = seriesWeights;
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const saveRoutineName = () => {
    if (editingRoutineName !== null) {
      setStableDays((prev) => {
        const next = [...prev];
        next[activeDayIndex] = { ...next[activeDayIndex], routineName: draftRoutineName || next[activeDayIndex].routineName };
        return next;
      });
      setEditingRoutineName(null);
    }
  };

  const cancelRoutineNameEdit = () => {
    setEditingRoutineName(null);
    setDraftRoutineName(activeDay.routineName);
  };

  const startEditRoutineName = () => {
    setDraftRoutineName(activeDay.routineName);
    setEditingRoutineName('active');
  };

  const handleCreate = () => {
    onCreateRoutines({ daysCount, days: stableDays });
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Reset all days and sectors and close? This cannot be undone.')) {
      setDays(buildInitialDays(daysCount));
      setEditingRoutineName(null);
      onClose();
    }
  };

  const trainingLevelPhotoSrc =
    trainingLevel != null ? getPlanGymWeekTrainingLevelImageSrc(trainingLevel, trainingLevelImages) : headerImage ?? null;
  const trainingLevelDetail =
    trainingLevel != null ? getPlanGymWeekTrainingLevelLabel(trainingLevel) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Plan gym week – Manual sector selection</h2>
            {initialPlan?.days?.length ? (
              <p className="text-xs text-amber-700 mt-0.5">
                Suggested routines and muscular areas from your choices. You can freely change them manually (add, remove, reorder, edit parameters), then Create routines and movelaps.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top: training level photo + detail + days + rescan + back + constant-muscle checkbox */}
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50 flex flex-wrap items-start gap-4">
            <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 bg-amber-100 border border-amber-200 rounded-lg overflow-hidden relative">
              {trainingLevelPhotoSrc ? (
                <Image
                  src={trainingLevelPhotoSrc}
                  alt={trainingLevelDetail ? `Training level ${trainingLevelDetail}` : 'Training level'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-700 text-xs text-center px-1">
                  Image placeholder
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[min(100%,220px)] flex flex-col gap-2">
              {trainingLevelDetail ? (
                <div className="text-base">
                  <span className="text-sky-600 font-semibold">Training level</span>{' '}
                  <span className="text-gray-900 font-semibold">{trainingLevelDetail}</span>
                </div>
              ) : null}
              <div className="font-semibold text-gray-900">Select the number of days of workout in gym</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={daysCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 1 && v <= 6) setDaysCount(v);
                    }}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setDaysCount((c) => (c < 6 ? c + 1 : c))}
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100"
                    aria-label="Increase days"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysCount((c) => (c > 1 ? c - 1 : c))}
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100"
                    aria-label="Decrease days"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysCount(initialDaysCount)}
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-500"
                    title="Reset to initial value"
                    aria-label="Reset days"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {rescanParams ? (
                    <button
                      type="button"
                      onClick={handleRescanSectors}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                      title="Rebuild suggested sectors using the same wizard rules (A/B/C alternation) with a new random order"
                    >
                      Rescan sectors
                    </button>
                  ) : null}
                </div>
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                  >
                    Back
                  </button>
                ) : null}
              </div>
              {rescanParams && constantSectorIdSet.size > 0 ? (
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={constantSectorsAtBeginning}
                    onChange={(e) => onToggleConstantPlacement(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Put at the beginning of the routine</span>
                </label>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Create routines and movelaps
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Reset all & close
            </button>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'fullOverview' ? 'edit' : 'fullOverview')}
              className={`px-4 py-2 rounded-lg font-medium border-2 ${
                viewMode === 'fullOverview'
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {viewMode === 'fullOverview' ? 'Back to edit' : 'Full overview of workout'}
            </button>
          </div>

          {viewMode === 'fullOverview' ? (
            /* Whole routine in one view – full overview */
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
              <div className="px-4 py-2 bg-gray-200 border-b border-gray-300 font-semibold text-gray-900">
                Full overview of workout – all days and sectors
              </div>
              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
                {stableDays.map((day, dayIdx) => (
                  <div key={dayIdx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-bold text-amber-900">Day {dayIdx + 1}</span>
                      <span className="text-gray-800 font-medium">{day.routineName || 'Unnamed'}</span>
                      {getGoalLabel(goals[dayIdx]) ? (
                        <span className="text-sm text-gray-600">Goal: {getGoalLabel(goals[dayIdx])}</span>
                      ) : null}
                    </div>
                    <div className="p-3 space-y-2">
                      {day.sectors.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No muscular areas in this day.</p>
                      ) : (
                        day.sectors.map((sec, secIdx) => (
                          <div
                            key={`${sec.sectorId}-${secIdx}`}
                            className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded border border-gray-100 text-sm"
                          >
                            <span className="text-gray-500 font-medium w-6">#{secIdx + 1}</span>
                            <div className="relative w-10 h-10 flex-shrink-0">
                              <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                            </div>
                            <span className="font-medium text-gray-900 min-w-[100px]">{sec.sectorLabel}</span>
                            <span className="text-gray-600">
                              {sec.exercises} ex · {sec.series} series · reps {sec.seriesReps?.join('/') ?? sec.reps} · Pyramidal{' '}
                              {sec.pyramidal ?? 'flat'} · Pause {sec.pause}
                            </span>
                            <span className="text-gray-500 text-xs">
                              Macro ex {sec.macroExercise} · Macro end sector {sec.macroEndOfSector}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <>
          {/* Day tabs: list of days at the top with each routine name and goal */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {stableDays.map((day, idx) => {
              const goalLabel = getGoalLabel(goals[idx]);
              const defaultName = `Day ${idx + 1}`;
              const hasCustomName = (day.routineName || '').trim() !== '' && day.routineName !== defaultName;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`px-3 py-2 rounded-t-lg font-medium text-sm text-left max-w-[200px] ${
                    activeDayIndex === idx ? 'bg-amber-100 border border-b-0 border-amber-200 text-amber-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={`Day ${idx + 1}${hasCustomName ? `: ${day.routineName}` : ''}${goalLabel ? ` — ${goalLabel}` : ''}`}
                >
                  <span className="font-semibold">Day {idx + 1}</span>
                  {hasCustomName ? (
                    <span className="block text-xs font-normal opacity-90 truncate" title={day.routineName}>
                      {day.routineName}
                    </span>
                  ) : null}
                  {goalLabel ? (
                    <span className="block text-[10px] text-gray-500 truncate mt-0.5" title={goalLabel}>
                      Goal: {goalLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Per-day: routine name + goal + sector list */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Routine name</span>
              {editingRoutineName !== null ? (
                <>
                  <input
                    type="text"
                    value={draftRoutineName}
                    onChange={(e) => setDraftRoutineName(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-48"
                    placeholder="Routine name"
                  />
                  <button type="button" onClick={saveRoutineName} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                    Save
                  </button>
                  <button type="button" onClick={cancelRoutineNameEdit} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-900">{activeDay.routineName}</span>
                  <button type="button" onClick={startEditRoutineName} className="text-sm text-amber-600 hover:underline">
                    Edit
                  </button>
                </>
              )}
            </div>
            {getGoalLabel(goals[activeDayIndex]) ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Goal</span>
                <span className="text-sm text-gray-800">{getGoalLabel(goals[activeDayIndex])}</span>
              </div>
            ) : null}

            <div className="text-sm font-medium text-gray-700">
              Select the muscular area you want to train in this day ({activeDayIndex + 1}/{daysCount})
            </div>

            {activeDayIndex >= 1 ? (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="load-from-day-select" className="text-xs font-semibold text-gray-700">
                    Load from
                  </label>
                  <select
                    id="load-from-day-select"
                    value={loadFromSourceIndex}
                    onChange={(e) => setLoadFromSourceIndex(parseInt(e.target.value, 10))}
                    className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-900 min-w-[7rem]"
                    aria-label="Copy routine from which day"
                  >
                    {Array.from({ length: activeDayIndex }, (_, i) => (
                      <option key={i} value={i}>
                        Day {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleProceedLoadFromDay}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Proceed
                </button>
              </div>
            ) : null}

            {/* List of selected sectors for this day – each shows last previous workout for same sector */}
            <div className="space-y-2">
              {activeDay.sectors.length === 0 ? (
                <p className="text-sm text-gray-500">No muscular areas added yet. Use the grid below to add sectors.</p>
              ) : (
                activeDay.sectors.map((sec, secIdx) => {
                  const lastWorkout = workoutPlan ? getLastWorkoutBySector(workoutPlan, sec.sectorLabel, sec.sectorId) : null;
                  return (
                  <div
                    key={`${sec.sectorId}-${secIdx}`}
                    className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg w-full"
                  >
                    <div className="flex flex-wrap items-start gap-3 w-full">
                      <span className="text-sm font-medium text-gray-500 w-6 pt-1">#{secIdx + 1}</span>
                      <div className="flex items-center gap-2 w-28 flex-shrink-0">
                        <div className="relative w-12 h-12">
                          <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{sec.sectorLabel}</span>
                      </div>
                      <div className="flex flex-col text-xs bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 flex-shrink-0 min-w-[140px]">
                        {lastWorkout ? (
                          <>
                            <span className="font-semibold text-amber-900">Last workout {formatLastWorkoutDate(lastWorkout.date)}</span>
                            <span className="text-gray-700">{lastWorkout.totalSeries} series</span>
                            <span className="text-gray-700">AveRep/set {lastWorkout.aveRepsPerSet}</span>
                            <span className="text-gray-700">Total Reps {lastWorkout.totalReps}</span>
                            {lastWorkout.pause ? <span className="text-gray-700">Pause {lastWorkout.pause}</span> : null}
                          </>
                        ) : (
                          <span className="text-gray-500 italic">No previous workout for this sector</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSector(activeDayIndex, secIdx, 'up')}
                          disabled={secIdx === 0}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSector(activeDayIndex, secIdx, 'down')}
                          disabled={secIdx === activeDay.sectors.length - 1}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSector(activeDayIndex, secIdx)}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Exercises
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={sec.exercises}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'exercises', parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm"
                        />
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Series
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={sec.series}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'series', parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm"
                        />
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1" title="Reps for series 1 (start of pyramid)">
                        Reps
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={sec.reps}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'reps', parseInt(e.target.value, 10) || 1)}
                          className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm"
                        />
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Pyramidal
                        <select
                          value={sec.pyramidal}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'pyramidal', e.target.value)}
                          className="border border-gray-300 rounded text-sm py-0.5 min-w-[7rem]"
                          aria-label="Pyramidal load pattern"
                        >
                          {PYRAMIDAL_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Pause
                        <select
                          value={sec.pause}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'pause', e.target.value)}
                          className="border border-gray-300 rounded text-sm py-0.5"
                        >
                          {PAUSE_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1" title="Pause after the last serie of an exercise">
                        Macro exercises
                        <select
                          value={sec.macroExercise}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'macroExercise', e.target.value)}
                          className="border border-gray-300 rounded text-sm py-0.5"
                        >
                          {PAUSE_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1" title="Pause after the last serie of the last exercise of this sector (priority over Macro exercise)">
                        Macro end sector
                        <select
                          value={sec.macroEndOfSector}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'macroEndOfSector', e.target.value)}
                          className="border border-gray-300 rounded text-sm py-0.5"
                        >
                          {PAUSE_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="w-full rounded-lg border border-blue-200 bg-blue-50/40 overflow-hidden">
                      <div className="px-2 py-1.5 text-xs font-bold text-gray-800 bg-blue-100/80 border-b border-blue-200">
                        REPS &amp; WEIGHTS PLANNING · {sec.series} series
                      </div>
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto bg-white">
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-gray-100 sticky top-0 z-[1]">
                            <tr>
                              <th className="border border-gray-300 px-2 py-1.5 text-center w-10">#</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center">Reps</th>
                              <th className="border border-gray-300 px-1 py-1.5 text-center whitespace-nowrap">% on 1 MR</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center">Weights</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center">Pause</th>
                              <th className="border border-gray-300 px-1 py-1.5 w-16" />
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: sec.series }, (_, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-blue-50/50">
                                <td className="border border-gray-300 px-2 py-1 text-center font-semibold bg-gray-50">{rowIdx + 1}</td>
                                <td className="border border-gray-300 px-1 py-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={sec.seriesReps[rowIdx] ?? ''}
                                    onChange={(e) => updateSeriesRepAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                    className="w-full min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded text-center"
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1 text-center text-[11px] font-medium text-gray-700 bg-gray-50 tabular-nums">
                                  {formatPercentLoad1MR(String(sec.seriesReps[rowIdx] ?? ''))}
                                </td>
                                <td className="border border-gray-300 px-1 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={9999}
                                    value={sec.seriesWeights[rowIdx] ?? ''}
                                    onChange={(e) => updateSeriesWeightAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                    className="w-full min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded text-center"
                                  />
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center text-gray-700">{sec.pause}</td>
                                <td className="border border-gray-300 px-1 py-1 text-center">
                                  {sec.series > 1 && rowIdx > 0 && rowIdx < sec.series - 1 ? (
                                    <button
                                      type="button"
                                      onClick={() => copySeriesRowsDown(activeDayIndex, secIdx, rowIdx)}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 text-white rounded text-[10px] font-semibold hover:bg-blue-600 whitespace-nowrap"
                                      title="Copy this row to all rows below"
                                    >
                                      <ChevronsDown className="w-3 h-3" />
                                      Copy
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-blue-600 px-2 py-1 flex items-center gap-1 bg-blue-50/80">
                        <span>ℹ️</span>
                        <span>
                          Scroll to view all {sec.series} series. Each can have unique reps, weights, and pause values.
                        </span>
                      </p>
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* Grid of muscular areas to add */}
            <div className="pt-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Add a muscular area (click to add to this day)</div>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((group) => {
                  const added = !canAddSector(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => addSector(group.id)}
                      disabled={added}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                        added
                          ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                          : 'border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50'
                      }`}
                      title={added ? `Already added: ${group.label}` : `Add ${group.label}`}
                    >
                      <div className="relative w-12 h-12 mb-1">
                        <Image src={group.image} alt={group.label} fill className="object-contain" unoptimized />
                      </div>
                      <span className="text-xs font-medium text-gray-800">{group.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
