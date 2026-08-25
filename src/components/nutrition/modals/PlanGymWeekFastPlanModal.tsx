'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { X, Settings, RefreshCw, CheckCircle, Clock, ChevronUp, ChevronDown, GripVertical, ChevronLeft, AlertTriangle } from 'lucide-react';
import type { PlanGymWeekManualResult, ManualDaySector, ManualDayPlan, PlanGymWeekYearlyPeriodSettings } from './PlanGymWeekManualModal';
import {
  ensureManualSectorShape,
  getSectorColor,
  SeriesDistDialog,
  defaultPlanGymWeekYearlyPeriodSettings,
  distributeSeriesFromPcts,
  type SeriesDistDialogProps,
} from './PlanGymWeekManualModal';
import {
  buildAllDistSessionsFromDays,
  type SeriesDistDaySession,
} from '../../workouts/modals/PlanGymWeekManualModal';
import { getGoalLabel, type GoalId, type TrainingLevel } from './PlanGymWeekModal';
import {
  getSeriesDistribution,
  trainingLevelToCategory,
  exerciseCountForArea,
  type SeriesLevelCategory,
} from '@/utils/seriesDistribution';
import {
  actualFastPlanSectorSeries,
  computeFastPlanDayRealStats,
} from '@/utils/fastPlanDayStats';
import { GYM_WEEK_MUSCLE_GROUPS, type GymWeekMuscleGroup } from '@/constants/gymWeekMuscleGroups';
import { GYM_WEEK_CATALOG_EXERCISES, pickRandomCatalogExerciseNamesForMuscleGroup } from '@/data/gymWeekExerciseCatalog';
import { useFreeMoveExercises } from '@/hooks/useFreeMoveExercises';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  computePlanGymWeekScalarDefaults,
  readGoalParamsFromNutritionSettings,
} from '@/utils/nutrition-planGymWeekGoalScalars';
import {
  PLAN_YEAR_TOTAL_PERIODS_MAX,
  PLAN_YEAR_TOTAL_PERIODS_MIN,
  clampPlanYearPeriodPair,
} from '@/utils/nutrition-planPeriodInterpolation';
import { UI_ARROW, UI_EM_DASH } from '@/utils/fixUtf8Mojibake';

// ─── Storage ──────────────────────────────────────────────────────────────────
const GYM_PLAN_STORAGE_KEY = 'gym_weekly_plan_saved_v1';
export function savePlanToStorage(plan: PlanGymWeekManualResult) {
  try { localStorage.setItem(GYM_PLAN_STORAGE_KEY, JSON.stringify({ plan, savedAt: new Date().toISOString() })); } catch {}
}
export function loadPlanFromStorage(): { plan: PlanGymWeekManualResult; savedAt: string } | null {
  try { const r = localStorage.getItem(GYM_PLAN_STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlanExercise {
  id:           string;
  name:         string;
  speed:        string;
  ripsTime:     string;
  weight:       string;
  breakTime:    string;
  mode:         string;
  userEdited?:  boolean;
  /** After shuffle: per-row series from distribution, moves with the exercise row */
  distributedSeries?: number;
}

export interface PlanSector {
  sectorId:            string;
  sectorLabel:         string;
  image:               string;
  reps:                number;
  pause:               string;
  pyramidal:           string;
  seriesReps:          number[];
  totalSeries:         number;
  defaultTotalSeries:  number;
  keepSeriesFixed:     boolean;
  defaultExerciseCount:number;
  macroExercise:       string;
  macroEndOfSector:    string;
  exercises:           PlanExercise[];
}

export interface PlanDay {
  routineName: string;
  sectors:     PlanSector[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SPEED_OPTIONS = ['Normal', 'Fast', 'Slow', 'Explosive', 'Controlled'];
const MODE_OPTIONS  = ['Stopped', 'In motion', 'Strict', 'Superset'];

/** Parse a pause string like "1'30\"" to seconds */
function pauseToSec(p: string): number {
  const m = p?.match(/(\d+)[''''](\d+)/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  const s = parseFloat(p);
  return isNaN(s) ? 90 : s;
}

function initPlanDay(day: ManualDayPlan, levelCat: SeriesLevelCategory = 'mid'): PlanDay {
  return {
    routineName: day.routineName,
    sectors: day.sectors.map((rawSec) => {
      const sec   = ensureManualSectorShape(rawSec);
      const tableDist = getSeriesDistribution(sec.series, levelCat);
      const count = tableDist.length;
      const exercises: PlanExercise[] = Array.from({ length: count }, (_, i) => ({
        id:         `${sec.sectorId}-${i}-${Date.now()}`,
        name:       '',
        speed:      'Normal',
        ripsTime:   String(sec.seriesReps?.[0] ?? sec.reps ?? 12),
        weight:     '',
        breakTime:  sec.pause || "1'30\"",
        mode:       'Stopped',
        userEdited: false,
        distributedSeries: tableDist[i] ?? 1,
      }));
      return {
        sectorId:             sec.sectorId,
        sectorLabel:          sec.sectorLabel,
        image:                sec.image,
        reps:                 sec.reps,
        pause:                sec.pause,
        pyramidal:            sec.pyramidal,
        seriesReps:           sec.seriesReps,
        totalSeries:          sec.series,
        defaultTotalSeries:   sec.series,
        keepSeriesFixed:      false,
        defaultExerciseCount: count,
        macroExercise:        sec.macroExercise || "2'",
        macroEndOfSector:     sec.macroEndOfSector || "3'",
        exercises,
      };
    }),
  };
}


function computeExerciseDist(totalSeries: number, levelCat: SeriesLevelCategory): number[] {
  return getSeriesDistribution(totalSeries, levelCat);
}

function computeExerciseDistForFixedCount(totalSeries: number, exerciseCount: number): number[] {
  const n = Math.max(1, Math.round(totalSeries));
  const ex = Math.max(1, exerciseCount);
  const base = Math.floor(n / ex);
  const rem = n % ex;
  return Array.from({ length: ex }, (_, i) => base + (i < rem ? 1 : 0));
}

function resizeExercisesToTableDist(
  sector: PlanSector,
  totalSeries: number,
  levelCat: SeriesLevelCategory,
  fillDefaults?: { reps: number; pause: string },
): PlanSector {
  const dArr = getSeriesDistribution(totalSeries, levelCat);
  const newCount = dArr.length;
  let exercises = [...sector.exercises];
  if (newCount > exercises.length) {
    const add = Array.from({ length: newCount - exercises.length }, (_, i) => ({
      id: `${sector.sectorId}-auto-${exercises.length + i}-${Date.now()}`,
      name: '',
      speed: 'Normal',
      ripsTime: String(fillDefaults?.reps ?? sector.reps ?? 12),
      weight: '',
      breakTime: (fillDefaults?.pause ?? sector.pause) || "1'30\"",
      mode: 'Stopped' as const,
      userEdited: false,
    }));
    exercises = [...exercises, ...add];
  } else if (newCount < exercises.length) {
    exercises = exercises.slice(0, newCount);
  }
  exercises = exercises.map((ex, i) => ({
    ...ex,
    distributedSeries: dArr[i] ?? 1,
  }));
  return {
    ...sector,
    totalSeries,
    defaultTotalSeries: totalSeries,
    defaultExerciseCount: newCount,
    exercises,
  };
}

function defaultTotalSeriesForAddedSector(sectors: PlanSector[]): number {
  if (sectors.length === 0) return 12;
  const sum = sectors.reduce((s, sec) => s + sec.totalSeries, 0);
  return Math.max(1, Math.min(40, Math.round(sum / sectors.length)));
}

function clearExerciseDistributedSeries(exercises: PlanExercise[]): PlanExercise[] {
  return exercises.map(({ distributedSeries: _d, ...rest }) => rest);
}

function normalizeCatalogExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

function exerciseNamesOnDay(day: PlanDay): Set<string> {
  const names = new Set<string>();
  for (const sector of day.sectors) {
    for (const ex of sector.exercises) {
      const key = normalizeCatalogExerciseName(ex.name);
      if (key) names.add(key);
    }
  }
  return names;
}

/** Convert PlanDay[] back to ManualDayPlan[] so SeriesDistDialog can consume it */
function planDaysToManual(days: PlanDay[]): ManualDayPlan[] {
  return days.map(d => ({
    routineName: d.routineName,
    sectors: d.sectors.map(s => ({
      sectorId:         s.sectorId,
      sectorLabel:      s.sectorLabel,
      image:            s.image,
      exercises:        s.exercises.length,
      series:           s.totalSeries,
      reps:             s.reps,
      pause:            s.pause,
      macroExercise:    s.macroExercise,
      macroEndOfSector: s.macroEndOfSector,
      pyramidal:        s.pyramidal as any,
      seriesReps:       s.seriesReps,
      seriesWeights:    s.exercises.map(e => e.weight),
    } as ManualDaySector)),
  }));
}

type SectorSortableBag = {
  setSortableRef: (el: HTMLElement | null) => void;
  style:          React.CSSProperties;
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
};

function sectorSortableId(dayIdx: number, secIdx: number): string {
  return `fast-plan-day-${dayIdx}-sec-${secIdx}`;
}

function SortableSectorShell({
  id,
  children,
}: {
  id: string;
  children: (bag: SectorSortableBag) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative',
  };
  const bag: SectorSortableBag = {
    setSortableRef: setNodeRef,
    style,
    dragHandleProps: { ...attributes, ...listeners },
  };
  return <div style={style}>{children(bag)}</div>;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PlanGymWeekFastPlanModalProps {
  isOpen:          boolean;
  plan:            PlanGymWeekManualResult;
  goals?:          GoalId[];
  trainingLevel?:  TrainingLevel | null;
  /** Return to manual editor with current layout converted to manual sectors (optional). */
  onBack?:         (plan: PlanGymWeekManualResult) => void;
  onClose:         () => void;
  onSave?:         (plan: PlanGymWeekManualResult) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PlanGymWeekFastPlanModal({
  isOpen, plan, goals = [], trainingLevel: trainingLevelProp, onBack, onClose, onSave,
}: PlanGymWeekFastPlanModalProps) {

  const trainingLevel =
    trainingLevelProp ?? plan.trainingLevel ?? null;
  const levelCat = trainingLevelToCategory(trainingLevel);

  const [activeDayIdx,      setActiveDayIdx]      = useState(0);
  const [planDays,          setPlanDays]           = useState<PlanDay[]>(() => plan.days.map(d => initPlanDay(d, levelCat)));
  const [filterSector,      setFilterSector]       = useState<string | null>(null);
  const [showSeriesDist,    setShowSeriesDist]      = useState(false);
  /** Baseline routine total + % per day (unchanged when sectors are added). */
  const [seriesDistSessionByDay, setSeriesDistSessionByDay] = useState<
    Record<number, SeriesDistDaySession>
  >({});
  const [saved,             setSaved]              = useState(false);
  const [fullPage,          setFullPage]           = useState(false);
  const [showAutoWarn,      setShowAutoWarn]      = useState(false);
  const [openShuffleMenuFor, setOpenShuffleMenuFor] = useState<string | null>(null);
  const [exercisesVisible, setExercisesVisible] = useState(true);
  const [exerciseListVisible, setExerciseListVisible] = useState(false);
  const [planSeriesVisible, setPlanSeriesVisible] = useState(true);
  const planSeriesTableLocked = planSeriesVisible && !exerciseListVisible;
  /** Short-lived feedback when filtering / adding muscles (strip looks “dead” otherwise) */
  const [fastPlanToolbarNotice, setFastPlanToolbarNotice] = useState<string | null>(null);
  /** Select-exercises mode: catalog filter (muscle id or all areas). */
  const [fastPlanCatalogFilterId, setFastPlanCatalogFilterId] = useState<string | 'all'>('all');
  const [fastPlanCatalogSearch, setFastPlanCatalogSearch] = useState('');
  /** Row targeted when tapping a catalog exercise (secIdx / exIdx in active day). */
  const [fastPlanExercisePick, setFastPlanExercisePick] = useState<{ secIdx: number; exIdx: number } | null>(null);
  const [yearlyPeriodSettings, setYearlyPeriodSettings] = useState<PlanGymWeekYearlyPeriodSettings>(() =>
    plan.yearlyPeriodSettings
      ? {
          ...defaultPlanGymWeekYearlyPeriodSettings(),
          ...plan.yearlyPeriodSettings,
          ...clampPlanYearPeriodPair(
            plan.yearlyPeriodSettings.totalPeriods,
            plan.yearlyPeriodSettings.currentPeriod,
          ),
        }
      : defaultPlanGymWeekYearlyPeriodSettings()
  );
  const prevExerciseListVisibleRef = useRef(false);

  const { exercises: freeMoveExerciseList } = useFreeMoveExercises();

  useEffect(() => {
    if (isOpen) {
      setFullPage(false);
      setExercisesVisible(true);
      setExerciseListVisible(false);
      setPlanSeriesVisible(true);
      setFastPlanToolbarNotice(null);
      setFastPlanCatalogFilterId('all');
      setFastPlanCatalogSearch('');
      setFastPlanExercisePick(null);
      prevExerciseListVisibleRef.current = false;
      setYearlyPeriodSettings(
        plan.yearlyPeriodSettings
          ? {
              ...defaultPlanGymWeekYearlyPeriodSettings(),
              ...plan.yearlyPeriodSettings,
              ...clampPlanYearPeriodPair(
                plan.yearlyPeriodSettings.totalPeriods,
                plan.yearlyPeriodSettings.currentPeriod,
              ),
            }
          : defaultPlanGymWeekYearlyPeriodSettings()
      );
      setPlanDays(plan.days.map((d) => initPlanDay(d, trainingLevelToCategory(trainingLevel))));
      setActiveDayIdx(0);
      const emptyManual = Array.from({ length: plan.daysCount }, () => null as string | null);
      setSeriesDistSessionByDay(
        buildAllDistSessionsFromDays(plan.days, new Set<string>(), emptyManual, () => 40),
      );
    }
  }, [isOpen, plan, trainingLevel]);

  useEffect(() => {
    if (!isOpen) setOpenShuffleMenuFor(null);
  }, [isOpen]);

  useEffect(() => {
    setFastPlanToolbarNotice(null);
    setFastPlanExercisePick(null);
  }, [activeDayIdx]);

  useEffect(() => {
    const prev = prevExerciseListVisibleRef.current;
    prevExerciseListVisibleRef.current = exerciseListVisible;
    if (prev && !exerciseListVisible && planSeriesVisible) {
      setPlanDays(prevDays =>
        prevDays.map(d => ({
          ...d,
          sectors: d.sectors.map(s =>
            resizeExercisesToTableDist(s, s.totalSeries, levelCat),
          ),
        })),
      );
    }
    if (!exerciseListVisible) {
      setFastPlanCatalogFilterId('all');
      setFastPlanCatalogSearch('');
      setFastPlanExercisePick(null);
    }
  }, [exerciseListVisible, planSeriesVisible, levelCat]);

  useEffect(() => {
    if (!fastPlanToolbarNotice) return;
    const id = window.setTimeout(() => setFastPlanToolbarNotice(null), 7000);
    return () => window.clearTimeout(id);
  }, [fastPlanToolbarNotice]);

  const clampedPeriod = useMemo(
    () => clampPlanYearPeriodPair(yearlyPeriodSettings.totalPeriods, yearlyPeriodSettings.currentPeriod),
    [yearlyPeriodSettings.totalPeriods, yearlyPeriodSettings.currentPeriod],
  );

  const scalarsForDay = useCallback(
    (dayIdx: number) => {
      const goalId = goals[dayIdx] ?? goals[0];
      return computePlanGymWeekScalarDefaults({
        goalSettings: readGoalParamsFromNutritionSettings(goalId),
        trainingLevel,
        currentPeriod: clampedPeriod.currentPeriod,
        totalPeriods: clampedPeriod.totalPeriods,
      });
    },
    [goals, trainingLevel, clampedPeriod],
  );

  const syncSectorScalarsFromPeriod = useCallback(() => {
    setPlanDays((prev) =>
      prev.map((d, di) => {
        const scalars = scalarsForDay(di);
        return {
          ...d,
          sectors: d.sectors.map((s) => ({
            ...s,
            reps: scalars.defaultReps,
            pause: scalars.defaultPauseLabel,
            macroExercise: scalars.defaultMacroExerciseLabel,
            macroEndOfSector: scalars.defaultMacroEndSectorLabel,
          })),
        };
      }),
    );
  }, [scalarsForDay]);

  useEffect(() => {
    if (!isOpen) return;
    syncSectorScalarsFromPeriod();
  }, [isOpen, clampedPeriod.totalPeriods, clampedPeriod.currentPeriod, syncSectorScalarsFromPeriod]);

  // ── Updaters ───────────────────────────────────────────────────────────────
  const updateExercise = useCallback((secIdx: number, exIdx: number, field: keyof PlanExercise, value: string) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        if (si !== secIdx) return s;
        const exercises = s.exercises.map((ex, ei) =>
          ei === exIdx ? { ...ex, [field]: value, userEdited: true } : ex
        );
        return { ...s, exercises };
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx]);

  const updateExerciseDistributedSeries = useCallback((secIdx: number, exIdx: number, raw: number) => {
    const n = Math.max(1, Math.min(40, Number.isFinite(raw) ? Math.floor(raw) : 1));
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        if (si !== secIdx) return s;
        const exercises = s.exercises.map((ex, ei) =>
          ei === exIdx ? { ...ex, distributedSeries: n, userEdited: true } : ex
        );
        const updated = { ...s, exercises };
        const totalSeries = actualFastPlanSectorSeries(updated, levelCat);
        return { ...updated, totalSeries, defaultTotalSeries: totalSeries };
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat]);

  const setSectorTotalSeries = useCallback((secIdx: number, val: number) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        if (si !== secIdx) return s;
        if (exerciseListVisible) {
          if (s.keepSeriesFixed) {
            return { ...s, totalSeries: val, defaultTotalSeries: val };
          }
          const dArr = computeExerciseDistForFixedCount(val, s.exercises.length);
          return {
            ...s,
            totalSeries: val,
            defaultTotalSeries: val,
            exercises: s.exercises.map((ex, i) => ({
              ...ex,
              distributedSeries: dArr[i] ?? 1,
            })),
          };
        }
        return resizeExercisesToTableDist(s, val, levelCat);
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat, exerciseListVisible]);

  const changeExerciseCount = useCallback((secIdx: number, delta: number) => {
    if (planSeriesTableLocked) return;
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        if (si !== secIdx) return s;
        const max    = exerciseListVisible ? 20 : s.defaultExerciseCount * 2;
        const newLen = Math.max(1, Math.min(max, s.exercises.length + delta));
        if (newLen === s.exercises.length) return s;
        let exercises: PlanExercise[];
        if (newLen > s.exercises.length) {
          const add = Array.from({ length: newLen - s.exercises.length }, (_, i) => ({
            id: `${s.sectorId}-new-${s.exercises.length + i}-${Date.now()}`,
            name: '', speed: 'Normal',
            ripsTime: String(s.reps ?? 12),
            weight: '', breakTime: s.pause || "1'30\"",
            mode: 'Stopped', userEdited: false,
          }));
          exercises = [...s.exercises, ...add];
        } else {
          exercises = s.exercises.slice(0, newLen);
        }
        return { ...s, exercises: clearExerciseDistributedSeries(exercises) };
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, exerciseListVisible, planSeriesTableLocked]);

  const toggleKeepFixed = useCallback((secIdx: number) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) =>
        si === secIdx ? { ...s, keepSeriesFixed: !s.keepSeriesFixed } : s
      );
      return { ...d, sectors };
    }));
  }, [activeDayIdx]);

  /** Random mode: fill every row with a random catalog exercise for this muscle, then shuffle series split across rows. */
  const shuffleSector = useCallback((secIdx: number) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        if (si !== secIdx) return s;
        const randomNames = pickRandomCatalogExerciseNamesForMuscleGroup(s.sectorId, s.exercises.length);
        const dArr = computeExerciseDist(s.totalSeries, levelCat);
        const pairs = s.exercises.map((ex, i) => {
          const { distributedSeries: _omit, ...rest } = ex;
          return {
            ex: {
              ...rest,
              name: randomNames[i] ?? rest.name,
              userEdited: true,
            },
            series: dArr[i] ?? 1,
          };
        });
        for (let i = pairs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
        }
        const exercises = pairs.map(({ ex, series }) => ({
          ...ex,
          distributedSeries: series,
        }));
        return { ...s, exercises };
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat]);

  const removeExerciseAt = useCallback((secIdx: number, exIdx: number) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        if (si !== secIdx) return s;
        if (s.exercises.length <= 1) return s;
        return (() => {
          const exercises = clearExerciseDistributedSeries(s.exercises.filter((_, ei) => ei !== exIdx));
          const updated = { ...s, exercises };
          const totalSeries = actualFastPlanSectorSeries(updated, levelCat);
          return { ...updated, totalSeries, defaultTotalSeries: totalSeries };
        })();
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat]);

  const requestRemoveExerciseAt = useCallback((secIdx: number, exIdx: number) => {
    const sec = planDays[activeDayIdx]?.sectors[secIdx];
    if (!sec || sec.exercises.length <= 1) return;
    const ex = sec.exercises[exIdx];
    const label = ex?.name?.trim() || `${sec.sectorLabel} Exercise ${exIdx + 1}`;
    if (
      !window.confirm(
        `Remove "${label}" from ${sec.sectorLabel}?\n\nThis exercise row will be deleted from the routine.`,
      )
    ) {
      return;
    }
    removeExerciseAt(secIdx, exIdx);
  }, [activeDayIdx, planDays, removeExerciseAt]);

  const removeSectorAt = useCallback((secIdx: number) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      if (d.sectors.length <= 1) return d;
      return { ...d, sectors: d.sectors.filter((_, si) => si !== secIdx) };
    }));
  }, [activeDayIdx]);

  const requestRemoveSectorAt = useCallback((secIdx: number) => {
    const day = planDays[activeDayIdx];
    if (!day) return;
    if (day.sectors.length <= 1) {
      window.alert('At least one muscular area must remain on this day.');
      return;
    }
    const sec = day.sectors[secIdx];
    if (!sec) return;
    if (
      !window.confirm(
        `Remove the "${sec.sectorLabel}" area from this routine?\n\nAll exercises in this sector will be deleted.`,
      )
    ) {
      return;
    }
    removeSectorAt(secIdx);
  }, [activeDayIdx, planDays, removeSectorAt]);

  const reorderSectorsAt = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = [...d.sectors];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= sectors.length ||
        toIndex >= sectors.length
      ) {
        return d;
      }
      const [removed] = sectors.splice(fromIndex, 1);
      sectors.splice(toIndex, 0, removed);
      return { ...d, sectors };
    }));
  }, [activeDayIdx]);

  const sectorDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleSectorDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const day = planDays[activeDayIdx];
      if (!day) return;
      const ids = day.sectors.map((_, i) => sectorSortableId(activeDayIdx, i));
      const fromIndex = ids.indexOf(String(active.id));
      const toIndex = ids.indexOf(String(over.id));
      if (fromIndex < 0 || toIndex < 0) return;
      reorderSectorsAt(fromIndex, toIndex);
    },
    [activeDayIdx, planDays, reorderSectorsAt],
  );

  const updateMacro = useCallback((secIdx: number, field: 'macroExercise' | 'macroEndOfSector', val: string) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map((s, si) => si === secIdx ? { ...s, [field]: val } : s);
      return { ...d, sectors };
    }));
  }, [activeDayIdx]);

  // ── Add sector (clicking a non-current-day sector in the muscle selector) ──
  const handleAddSector = useCallback((template: PlanSector) => {
    const isSelect = exerciseListVisible;
    const count = isSelect ? 1 : getSeriesDistribution(template.totalSeries, levelCat).length;
    const dArr    = computeExerciseDist(template.totalSeries, levelCat);
    const newSector: PlanSector = {
      ...template,
      keepSeriesFixed:      false,
      defaultExerciseCount: count,
      exercises: Array.from({ length: count }, (_, i) => ({
        id:         `${template.sectorId}-added-${i}-${Date.now()}`,
        name:       '',
        speed:      'Normal',
        ripsTime:   String(template.reps ?? 12),
        weight:     '',
        breakTime:  template.pause || "1'30\"",
        mode:       'Stopped',
        userEdited: false,
        ...(isSelect ? { distributedSeries: dArr[i] ?? 1 } : {}),
      })),
    };
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      return { ...d, sectors: [...d.sectors, newSector] };
    }));
  }, [activeDayIdx, levelCat, exerciseListVisible]);

  const templateFromMuscleGroup = useCallback((mg: GymWeekMuscleGroup, totalSeries: number): PlanSector => {
    const reps        = 12;
    const pause       = "1'30\"";
    const count       = getSeriesDistribution(totalSeries, levelCat).length;
    return {
      sectorId:             mg.id,
      sectorLabel:          mg.label,
      image:                mg.image,
      reps,
      pause,
      pyramidal:            'flat',
      seriesReps:           Array.from({ length: totalSeries }, () => reps),
      totalSeries,
      defaultTotalSeries:   totalSeries,
      keepSeriesFixed:      false,
      defaultExerciseCount: count,
      macroExercise:        "2'",
      macroEndOfSector:     "3'",
      exercises:            [],
    };
  }, [levelCat]);

  // ── Automatic processing procedure ────────────────────────────────────────
  const handleAutoProcess = () => {
    // Always show the warning — button fills values every time regardless of manual edits
    setShowAutoWarn(true);
  };

  const applyCalculatedWorkoutParamsToDay = useCallback(() => {
    const scalars = scalarsForDay(activeDayIdx);
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map(s => {
        const maskTotal = s.totalSeries;
        const tableLen  = exerciseCountForArea(maskTotal, levelCat);
        let exercises   = s.exercises;

        if (planSeriesVisible || !s.keepSeriesFixed) {
          const resized = resizeExercisesToTableDist(
            { ...s, exercises },
            maskTotal,
            levelCat,
            { reps: scalars.defaultReps, pause: scalars.defaultPauseLabel },
          );
          exercises = resized.exercises;
        } else {
          exercises = clearExerciseDistributedSeries(exercises);
        }

        exercises = exercises.map(ex => ({
          ...ex,
          speed:      'Normal',
          ripsTime:   String(scalars.defaultReps),
          breakTime:  scalars.defaultPauseLabel,
          mode:       'Stopped',
          userEdited: false,
        }));

        return {
          ...s,
          reps: scalars.defaultReps,
          pause: scalars.defaultPauseLabel,
          macroExercise: scalars.defaultMacroExerciseLabel,
          macroEndOfSector: scalars.defaultMacroEndSectorLabel,
          totalSeries: maskTotal,
          exercises,
          ...(planSeriesVisible || !s.keepSeriesFixed
            ? { defaultExerciseCount: tableLen, defaultTotalSeries: maskTotal }
            : {}),
        };
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat, scalarsForDay, planSeriesVisible]);

  const applyAutoProcess = () => {
    setShowAutoWarn(false);
    applyCalculatedWorkoutParamsToDay();
  };

  const applySeriesCountsToDay = useCallback((
    dayIdx: number,
    newSeriesCounts: number[],
  ) => {
    setPlanDays(prev => prev.map((d, di) => {
      if (di !== dayIdx) return d;
      const sectors = d.sectors.map((s, si) => {
        const newTotal = newSeriesCounts[si] ?? s.totalSeries;
        if (s.keepSeriesFixed && !planSeriesVisible) return s;
        if (exerciseListVisible) {
          const dArr = computeExerciseDistForFixedCount(newTotal, s.exercises.length);
          return {
            ...s,
            totalSeries: newTotal,
            defaultTotalSeries: newTotal,
            defaultExerciseCount: s.exercises.length,
            exercises: s.exercises.map((ex, i) => ({
              ...ex,
              distributedSeries: dArr[i] ?? 1,
            })),
          };
        }
        return resizeExercisesToTableDist(s, newTotal, levelCat);
      });
      return { ...d, sectors };
    }));
  }, [exerciseListVisible, planSeriesVisible, levelCat]);

  const handleSeriesDistSave = useCallback<SeriesDistDialogProps['onSave']>((dayIdx, newSeriesCounts) => {
    const sum = newSeriesCounts.reduce((a, b) => a + b, 0);
    const pcts = sum > 0
      ? newSeriesCounts.map((c) => (c / sum) * 100)
      : newSeriesCounts.map(() => 100 / Math.max(1, newSeriesCounts.length));
    setSeriesDistSessionByDay((prev) => ({
      ...prev,
      [dayIdx]: { totalSeries: sum, pcts },
    }));
    applySeriesCountsToDay(dayIdx, newSeriesCounts);
  }, [applySeriesCountsToDay]);

  const recalcOnOriginalTotal = useCallback(() => {
    const session = seriesDistSessionByDay[activeDayIdx];
    const day = planDays[activeDayIdx];
    if (!session || !day?.sectors.length) return;
    const n = day.sectors.length;
    const total = session.totalSeries;
    const pcts = Array.from({ length: n }, () => 100 / n);
    const newCounts = distributeSeriesFromPcts(pcts, total);
    setSeriesDistSessionByDay((prev) => ({
      ...prev,
      [activeDayIdx]: { totalSeries: total, pcts },
    }));
    applySeriesCountsToDay(activeDayIdx, newCounts);
  }, [activeDayIdx, applySeriesCountsToDay, planDays, seriesDistSessionByDay]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const result: PlanGymWeekManualResult = {
      daysCount: plan.daysCount,
      days:      planDaysToManual(planDays),
      trainingLevel,
      yearlyPeriodSettings: { ...yearlyPeriodSettings },
    };
    savePlanToStorage(result);
    onSave?.(result);
    setSaved(true);
  };

  const handleBackToManual = useCallback(() => {
    if (!onBack) return;
    onBack({
      daysCount: plan.daysCount,
      days: planDaysToManual(planDays),
      trainingLevel,
      yearlyPeriodSettings: { ...yearlyPeriodSettings },
    });
  }, [onBack, plan.daysCount, yearlyPeriodSettings, planDays, trainingLevel]);

  const manualDaysForSeriesDist = useMemo(() => planDaysToManual(planDays), [planDays]);

  const fastPlanCatalogFiltered = useMemo(() => {
    let list = [...GYM_WEEK_CATALOG_EXERCISES];
    if (fastPlanCatalogFilterId !== 'all') {
      list = list.filter(e => e.groupId === fastPlanCatalogFilterId);
    }
    const q = fastPlanCatalogSearch.trim().toLowerCase();
    if (q) list = list.filter(e => e.name.toLowerCase().includes(q));
    return list;
  }, [fastPlanCatalogFilterId, fastPlanCatalogSearch]);

  const catalogExerciseDayUsage = useMemo(() => {
    const sameDay = new Set<string>();
    const otherDays = new Set<string>();
    planDays.forEach((day, di) => {
      const names = exerciseNamesOnDay(day);
      const target = di === activeDayIdx ? sameDay : otherDays;
      names.forEach((n) => target.add(n));
    });
    return { sameDay, otherDays };
  }, [planDays, activeDayIdx]);

  if (!isOpen) return null;

  const activeDay      = planDays[activeDayIdx];
  const activeSectorIds = new Set(activeDay.sectors.map(s => s.sectorId));
  const visibleSectors = filterSector
    ? activeDay.sectors.filter(s => s.sectorId === filterSector)
    : activeDay.sectors;

  const dayRealStats = computeFastPlanDayRealStats(activeDay, levelCat);
  const {
    totalSeries,
    totalExercises,
    avgSeriesPerArea,
    avgReps,
    breakAvgStr,
    totalWeights,
    totalTimePlannedStr,
  } = dayRealStats;
  const originalRoutineTotal = seriesDistSessionByDay[activeDayIdx]?.totalSeries;
  const activeGoalLabel = getGoalLabel(goals[activeDayIdx]);

  const onMuscleStripAll = () => {
    setFilterSector(null);
    if (exerciseListVisible) setFastPlanCatalogFilterId('all');
    setFastPlanToolbarNotice('Showing all muscular areas.');
  };

  const onMuscleStripPick = (mg: GymWeekMuscleGroup) => {
    const sectors = planDays[activeDayIdx]?.sectors ?? [];
    const inCurrentDay = sectors.some(s => s.sectorId === mg.id);
    const isFilter = filterSector === mg.id && inCurrentDay;
    if (inCurrentDay) {
      setFilterSector(isFilter ? null : mg.id);
      if (exerciseListVisible) {
        setFastPlanCatalogFilterId(isFilter ? 'all' : mg.id);
      }
      setFastPlanToolbarNotice(
        isFilter
          ? 'Showing all muscular areas.'
          : `Showing ${mg.label} only — tap ${mg.label} again or ALL to show every area.`,
      );
    } else {
      const defaultSeries = defaultTotalSeriesForAddedSector(sectors);
      handleAddSector(templateFromMuscleGroup(mg, defaultSeries));
      if (exerciseListVisible) {
        setFastPlanCatalogFilterId(mg.id);
      }
      setFastPlanToolbarNotice(`${mg.label} added — scroll down to fill exercise names or totals for this area.`);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-green-600 px-6 py-6 flex flex-col items-center gap-3">
            <CheckCircle className="w-14 h-14 text-white" />
            <h2 className="text-xl font-bold text-white text-center">GYM WEEKLY PLAN CREATED!</h2>
            <p className="text-green-100 text-sm text-center">
              {plan.daysCount} day{plan.daysCount !== 1 ? 's' : ''} · {totalSeries} total series
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
              <p className="font-bold text-amber-900">Next steps</p>
              <p>📅 Open your <strong>Yearly Plan</strong>, select the target week, and apply each routine to the desired days.</p>
              <p>💾 Your plan is saved locally as a <strong>template</strong> — reopen it anytime from the Plan Gym Week menu.</p>
            </div>
            <button type="button" onClick={onClose}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold">
              Go to workout schedule
            </button>
          </div>
        </div>
      </div>
    );
  }

  const routineNameEl = (
    <div className="flex-shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-1.5 bg-white border-b border-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Routine name</span>
        <input
          type="text"
          value={activeDay.routineName || ''}
          onChange={e => setPlanDays(prev => prev.map((d, di) =>
            di === activeDayIdx ? { ...d, routineName: e.target.value } : d
          ))}
          placeholder="Unnamed"
          className="border border-gray-300 rounded px-2 py-0.5 text-sm font-medium text-gray-900 bg-white outline-none focus:border-blue-400 w-48 max-w-full"
        />
      </div>
      <div className="flex flex-wrap items-end gap-3 text-xs">
        <label className="flex flex-col gap-0.5 text-gray-700">
          <span className="font-medium">Total periods</span>
          <select
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
            value={yearlyPeriodSettings.totalPeriods}
            onChange={(e) => {
              const tp = parseInt(e.target.value, 10);
              setYearlyPeriodSettings((prev) => ({
                ...prev,
                ...clampPlanYearPeriodPair(tp, prev.currentPeriod),
              }));
            }}
          >
            {Array.from(
              { length: PLAN_YEAR_TOTAL_PERIODS_MAX - PLAN_YEAR_TOTAL_PERIODS_MIN + 1 },
              (_, i) => PLAN_YEAR_TOTAL_PERIODS_MIN + i,
            ).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-gray-700">
          <span className="font-medium">Current period</span>
          <select
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
            value={yearlyPeriodSettings.currentPeriod}
            onChange={(e) => {
              const cp = parseInt(e.target.value, 10);
              setYearlyPeriodSettings((prev) => ({
                ...prev,
                ...clampPlanYearPeriodPair(prev.totalPeriods, cp),
              }));
            }}
          >
            {Array.from({ length: yearlyPeriodSettings.totalPeriods }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <p className="max-w-xs text-[10px] leading-snug text-gray-500 pb-0.5">
          Period {clampedPeriod.currentPeriod} of {clampedPeriod.totalPeriods} {UI_EM_DASH} series, reps and pauses interpolate from your workout parameters (From {UI_ARROW} To).
        </p>
      </div>
    </div>
  );

  /** Second line only when routine name differs from "Day N" (avoids duplicate "Day 1" / "Day 1") */
  const renderDayTabsRow = (trailing: 'none' | 'back-to-compact') => (
    <div className="flex-shrink-0 flex items-end gap-0.5 px-2 pt-2 bg-white border-b border-gray-200">
      {planDays.map((day, i) => {
        const goalLabel   = getGoalLabel(goals[i]);
        const dayLine     = `Day ${i + 1}`;
        const rn          = (day.routineName || '').trim();
        const showRoutine = rn.length > 0 && rn.toLowerCase() !== dayLine.toLowerCase();
        return (
          <button key={i} type="button" onClick={() => { setActiveDayIdx(i); setFilterSector(null); setFastPlanCatalogFilterId('all'); setFastPlanExercisePick(null); }}
            className={`flex-shrink-0 min-w-[130px] px-4 py-2.5 rounded-t-lg text-left border-2 transition-colors ${
              i === activeDayIdx
                ? 'bg-amber-100 border-amber-400 border-b-white -mb-px text-amber-900'
                : 'bg-gray-100 border-transparent text-gray-700 hover:bg-gray-200'
            }`}>
            <span className="block text-xs font-bold">{dayLine}</span>
            {showRoutine ? (
              <span className="block max-w-[120px] truncate text-xs text-gray-700">{rn}</span>
            ) : null}
            {goalLabel ? <span className="block max-w-[120px] truncate text-[10px] text-gray-500">Goal: {goalLabel}</span> : null}
          </button>
        );
      })}
      {trailing === 'back-to-compact' ? (
        <button type="button" onClick={() => setFullPage(false)}
          className="mb-1.5 ml-auto flex-shrink-0 self-end rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          title="Back to compact view">
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );

  const renderSectorBlock = (sec: PlanSector, secIdx: number, sortable: SectorSortableBag | null) => {
    const seriesDist = computeExerciseDist(sec.totalSeries, levelCat);
    const maxEx      = exerciseListVisible ? 20 : sec.defaultExerciseCount;
    const secColor   = getSectorColor(sec.sectorId, secIdx);

    return (
      <div ref={sortable?.setSortableRef} style={sortable?.style}>
        <div
          className="flex flex-wrap items-center gap-2 border-b border-t border-cyan-200/90 bg-cyan-50 px-3 py-2.5"
          style={{ borderLeftWidth: 3, borderLeftColor: secColor }}
        >
          <button
            type="button"
            onClick={() => requestRemoveSectorAt(secIdx)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 hover:bg-red-50"
            title="Remove this muscular area"
          >
            <X className="h-4 w-4" />
          </button>
          {sortable ? (
            <button
              type="button"
              {...sortable.dragHandleProps}
              className="touch-manipulation flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 active:cursor-grabbing"
              aria-label="Drag to reorder area"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}

          <div className="relative h-9 w-9 flex-shrink-0">
            <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
          </div>
          <span className="min-w-[90px] text-sm font-bold text-gray-900">{sec.sectorLabel}</span>

          <div
            className="flex flex-col overflow-hidden rounded border border-sky-400"
            title={
              exerciseListVisible
                ? 'Add or remove exercise rows (up to 20 per area). Series per row is edited in the Series column.'
                : 'Exercise count comes from the distribution table (training level × total series). Use Select exercises mode to add rows manually.'
            }
          >
            <button
              type="button"
              onClick={() => changeExerciseCount(secIdx, 1)}
              disabled={planSeriesTableLocked || sec.exercises.length >= maxEx}
              className="flex items-center justify-center bg-sky-400 px-2 py-1 text-white hover:bg-sky-500 disabled:opacity-40"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => changeExerciseCount(secIdx, -1)}
              disabled={planSeriesTableLocked || sec.exercises.length <= 1}
              className="flex items-center justify-center border-t border-sky-300 bg-sky-400 px-2 py-1 text-white hover:bg-sky-500 disabled:opacity-40"
            >
              <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenShuffleMenuFor(prev => (prev === sec.sectorId ? null : sec.sectorId))}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-400 bg-white text-gray-600 hover:bg-gray-50"
              title="Random mode: pick random catalog exercises for this area and shuffle how series are split across rows"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {openShuffleMenuFor === sec.sectorId ? (
              <div className="absolute left-0 top-9 z-30 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    shuffleSector(secIdx);
                    setOpenShuffleMenuFor(null);
                  }}
                  className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-gray-800 hover:bg-gray-100"
                  title="Assign random exercises from this muscle’s catalog to every row, then randomize series order across rows"
                >
                  Random mode
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded px-2 py-1.5 text-left text-xs text-gray-400"
                  title="Preferences mode will be available soon"
                >
                  Apply preferences (coming soon)
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="whitespace-nowrap font-medium text-gray-700">Series\area</span>
            <select
              value={sec.totalSeries}
              onChange={e => setSectorTotalSeries(secIdx, Number(e.target.value))}
              title={`Distribution: ${computeExerciseDist(sec.totalSeries, levelCat).join('+')} (${levelCat} level)`}
              className="w-14 rounded border border-gray-400 bg-white px-1 py-0.5 text-xs font-semibold"
            >
              {Array.from({ length: 40 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {exerciseListVisible ? (
          <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-gray-700">
            <input
              type="checkbox"
              checked={sec.keepSeriesFixed}
              onChange={() => toggleKeepFixed(secIdx)}
              className="h-3 w-3 rounded accent-blue-600"
            />
            Keep fix this value
          </label>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-800">
            <span className="whitespace-nowrap">
              Macropause at end of each exercise:{' '}
              <input
                type="text"
                value={sec.macroExercise}
                onChange={e => updateMacro(secIdx, 'macroExercise', e.target.value)}
                className="w-10 border-b border-cyan-600/40 bg-transparent text-center font-bold outline-none focus:border-sky-500"
              />
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              Macropause at end of the sector:{' '}
              <input
                type="text"
                value={sec.macroEndOfSector}
                onChange={e => updateMacro(secIdx, 'macroEndOfSector', e.target.value)}
                className="w-10 border-b border-cyan-600/40 bg-transparent text-center font-bold outline-none focus:border-sky-500"
              />
            </span>
          </div>
        </div>

        {exercisesVisible ? sec.exercises.map((ex, exIdx) => {
          const seriesCount = ex.distributedSeries ?? seriesDist[exIdx] ?? 1;
          const rowPicked =
            exerciseListVisible &&
            fastPlanExercisePick?.secIdx === secIdx &&
            fastPlanExercisePick?.exIdx === exIdx;
          return (
            <div
              key={ex.id}
              className={`grid grid-cols-[44px_minmax(140px,1fr)_96px_72px_80px_84px_84px_96px_64px] border-b border-gray-200 text-xs ${
                exIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }${rowPicked ? ' ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (exerciseListVisible) setFastPlanExercisePick({ secIdx, exIdx });
                }}
                className={`flex items-center justify-center border-r border-gray-200 px-2 py-2 font-medium tabular-nums ${
                  exerciseListVisible
                    ? 'cursor-pointer text-blue-700 hover:bg-blue-50/80'
                    : 'cursor-default text-gray-500'
                }`}
              >
                {exIdx + 1}
              </button>
              <div className="flex items-center border-r border-gray-200 px-2 py-2">
                <input
                  type="text"
                  value={ex.name}
                  onChange={e => updateExercise(secIdx, exIdx, 'name', e.target.value)}
                  onFocus={() => {
                    if (exerciseListVisible) setFastPlanExercisePick({ secIdx, exIdx });
                  }}
                  placeholder={`${sec.sectorLabel} Exercise ${exIdx + 1}`}
                  className="w-full bg-transparent text-gray-600 outline-none placeholder:italic placeholder:text-gray-400"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <select
                  value={ex.speed}
                  onChange={e => updateExercise(secIdx, exIdx, 'speed', e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-center text-xs text-gray-800 outline-none"
                >
                  {SPEED_OPTIONS.map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2 font-semibold tabular-nums text-gray-900`}>
                {exerciseListVisible ? (
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={seriesCount}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) updateExerciseDistributedSeries(secIdx, exIdx, v);
                    }}
                    className="w-full min-w-0 bg-transparent text-center text-xs font-semibold tabular-nums text-gray-900 outline-none"
                  />
                ) : (
                  <span>{seriesCount}</span>
                )}
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <input
                  type="text"
                  value={ex.ripsTime}
                  onChange={e => updateExercise(secIdx, exIdx, 'ripsTime', e.target.value)}
                  className="w-full bg-transparent text-center text-gray-800 outline-none"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <input
                  type="text"
                  value={ex.weight}
                  onChange={e => updateExercise(secIdx, exIdx, 'weight', e.target.value)}
                  placeholder="—"
                  className="w-full bg-transparent text-center text-gray-500 outline-none placeholder:text-gray-400"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <input
                  type="text"
                  value={ex.breakTime}
                  onChange={e => updateExercise(secIdx, exIdx, 'breakTime', e.target.value)}
                  className="w-full bg-transparent text-center text-gray-800 outline-none"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <select
                  value={ex.mode}
                  onChange={e => updateExercise(secIdx, exIdx, 'mode', e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-center text-xs text-gray-800 outline-none"
                >
                  {MODE_OPTIONS.map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-1 py-2">
                <button
                  type="button"
                  onClick={() => requestRemoveExerciseAt(secIdx, exIdx)}
                  disabled={sec.exercises.length <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-35"
                  title="Remove exercise"
                >
                  <X className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-300 bg-orange-50 hover:bg-orange-100"
                  title="Time options (coming soon)"
                >
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                </button>
              </div>
            </div>
          );
        }) : null}
      </div>
    );
  };

  const fixedPlanTopBar = (
    <div className="flex-shrink-0 border-b border-gray-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-4">
        {onBack ? (
          <button
            type="button"
            onClick={handleBackToManual}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-gray-900 sm:text-base">Plan gym week</h2>
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 sm:text-xs">
            Creation of fast plan for not aerobic sports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 sm:px-4 sm:py-2 sm:text-sm"
          >
            Create routines and movelaps
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 sm:px-4 sm:py-2 sm:text-sm"
          >
            Reset all &amp; close
          </button>
          {!fullPage ? (
            <button
              type="button"
              onClick={() => setFullPage(true)}
              className="text-xs font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
            >
              Show full page
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="px-4 pt-2 text-xs font-semibold text-red-600">Current day selected</p>

      <div className="mx-3 my-2 flex flex-wrap overflow-hidden rounded border border-gray-400 bg-gray-200/90 text-xs sm:text-sm">
        <div className="flex min-w-[7.5rem] flex-1 flex-col justify-center border-r border-gray-300 bg-white px-3 py-2">
          <span className="text-[10px] font-medium text-gray-600 sm:text-xs">Total exercises</span>
          <strong className="text-sm tabular-nums text-gray-900">{totalExercises}</strong>
        </div>
        <div className="flex min-w-[10rem] flex-1 flex-col justify-center border-r border-gray-300 bg-sky-100 px-3 py-2">
          <span className="text-[10px] font-medium text-gray-600 sm:text-xs">Total series</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <strong className="text-sm tabular-nums font-bold text-sky-950">{totalSeries}</strong>
            {originalRoutineTotal != null && activeDay.sectors.length > 0 ? (
              <>
                <span className="text-[10px] font-bold text-red-600 sm:text-xs">
                  Total original {originalRoutineTotal}
                </span>
                {originalRoutineTotal !== totalSeries ? (
                  <button
                    type="button"
                    onClick={recalcOnOriginalTotal}
                    className="rounded border border-red-500 px-1.5 py-0.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
                  >
                    Recalc on original
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {[
          { label: 'Average for area', value: avgSeriesPerArea, cls: 'bg-white' },
          { label: 'Average repetitions', value: avgReps, cls: 'bg-white' },
          { label: 'Break average', value: breakAvgStr, cls: 'bg-white text-blue-700 font-semibold' },
          { label: 'Total weights', value: totalWeights > 0 ? totalWeights.toFixed(1) : '0000.0', cls: 'bg-white' },
          { label: 'Total time planned', value: totalTimePlannedStr, cls: 'bg-white' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`flex min-w-[7.5rem] flex-1 flex-col justify-center border-r border-gray-300 px-3 py-2 last:border-r-0 ${stat.cls}`}
          >
            <span className="text-[10px] font-medium text-gray-600 sm:text-xs">{stat.label}</span>
            <strong className="text-sm tabular-nums text-gray-900">{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="px-3 pb-3">
        <p className="mb-1.5 text-xs text-gray-700">
          Sector – Muscular areas for this day ({activeDay.sectors.length} selected)
        </p>
        <div className="flex flex-wrap gap-2">
          {activeDay.sectors.map((s, si) => (
            <div
              key={s.sectorId}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs shadow-sm"
              style={{ borderLeftColor: getSectorColor(s.sectorId, si), borderLeftWidth: 4 }}
            >
              <div className="relative h-8 w-8 flex-shrink-0">
                <Image src={s.image} alt={s.sectorLabel} fill className="object-contain" unoptimized />
              </div>
              <div className="min-w-0 flex flex-col leading-tight">
                <span className="font-semibold text-gray-900">{s.sectorLabel}</span>
                <span className="font-bold text-amber-800">{actualFastPlanSectorSeries(s, levelCat)} series</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const scrollablePlanMain = (
    <>
      {renderDayTabsRow('none')}

      <div className="border-b border-gray-200 bg-white px-3 py-2">
        {activeGoalLabel ? (
          <p className="text-xs text-gray-800">
            Goal <strong className="text-gray-900">{activeGoalLabel}</strong>
          </p>
        ) : null}
        {routineNameEl}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
        <button
          type="button"
          onClick={applyCalculatedWorkoutParamsToDay}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Select workout parameters for this day
        </button>
        <button type="button" onClick={() => setShowSeriesDist(true)}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900">
          Distribution settings
        </button>
        <button type="button" onClick={handleAutoProcess}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
          <Settings className="h-4 w-4" />
          Automatic processing procedure
        </button>
        <button type="button"
          className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500">
          <span className="text-base leading-none">≡</span> Preferences
        </button>
      </div>

      <div className="mx-3 mt-3 min-w-[52rem]">
        <div className="grid grid-cols-[44px_minmax(140px,1fr)_96px_72px_80px_84px_84px_96px_64px] rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 text-xs font-semibold text-gray-700">
          <div className="border-r border-gray-300 px-2 py-2 text-center">#</div>
          <div className="flex items-center gap-1.5 border-r border-gray-300 px-2 py-2">
            <span>Exercise</span>
            <RefreshCw className="h-3 w-3 text-gray-400" />
          </div>
          <div className={`border-r border-gray-300 px-2 py-2 text-center`}>Speed</div>
          <div className={`border-r border-gray-300 px-2 py-2 text-center`}>Series</div>
          <div className={`border-r border-gray-300 px-2 py-2 text-center`}>Rip/Time</div>
          <div className={`border-r border-gray-300 px-2 py-2 text-center`}>Weight</div>
          <div className={`border-r border-gray-300 px-2 py-2 text-center`}>Break</div>
          <div className={`border-r border-gray-300 px-2 py-2 text-center`}>Mode</div>
          <div className="px-2 py-2 text-center">Options</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border border-gray-300 border-t-0 bg-white px-3 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setExercisesVisible((v) => !v)}
            className={`rounded-md border px-2 py-1 font-medium transition-colors ${
              exercisesVisible
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {exercisesVisible ? 'Hide exercises' : 'Show exercises'}
          </button>
          <button
            type="button"
            onClick={() => {
              setExerciseListVisible((v) => {
                if (!v) setFastPlanCatalogFilterId('all');
                return !v;
              });
            }}
            className={`rounded-md border px-2 py-1 font-medium transition-colors ${
              exerciseListVisible
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {exerciseListVisible ? 'Hide list exercises' : 'Select exercises'}
          </button>
          <button
            type="button"
            onClick={() => setPlanSeriesVisible((v) => !v)}
            className={`rounded-md border px-2 py-1 font-medium transition-colors ${
              planSeriesVisible
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {planSeriesVisible ? 'Hide plan series/exercises' : 'Plan series/exercise'}
          </button>
        </div>
        {exerciseListVisible ? (
          <p className="border border-t-0 border-gray-300 bg-violet-50/90 px-3 py-2 text-[11px] leading-snug text-gray-700">
            Use the catalog below: tap a muscle to filter cards, focus a table row (# or Exercise), then tap a card or pick from your library. You can still type names and edit series per row.
          </p>
        ) : null}
        {planSeriesVisible ? (
          <p className="rounded-b-lg border border-t-0 border-gray-300 bg-gray-50/90 px-3 py-2 text-[11px] leading-snug text-gray-700">
            Series column shows how sets are split across exercises (from your training level). Adjust totals with Series distribution settings or each sector&apos;s Series/area.
          </p>
        ) : null}
      </div>

      {planSeriesVisible ? (
      <div className="mx-3 rounded-xl border border-[#050a14] bg-[#0a1628] px-3 py-3 shadow-inner">
        <div className="flex items-stretch gap-2 sm:gap-3">
          <button type="button" onClick={onMuscleStripAll}
            title="Show all sectors"
            className="flex flex-shrink-0 flex-col items-center justify-center gap-1 self-center">
            <div className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-[#fefdf8] transition-colors ${
              !filterSector ? 'border-sky-500 ring-2 ring-sky-300/60' : 'border-gray-300 hover:border-gray-400'
            }`}>
              <RefreshCw className={`absolute h-10 w-10 ${!filterSector ? 'text-sky-300/55' : 'text-gray-300/50'}`} strokeWidth={1.25} />
              <span className="relative z-[1] text-[10px] font-bold tracking-tight text-gray-900">ALL</span>
            </div>
          </button>
          <div className="min-w-0 flex-1 rounded-lg border border-[#e8e4d4] bg-[#fdfcf0] px-2 py-2 shadow-sm">
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {GYM_WEEK_MUSCLE_GROUPS.map((mg) => {
                const inCurrentDay = activeSectorIds.has(mg.id);
                const isFilter     = filterSector === mg.id && inCurrentDay;
                return (
                  <button key={mg.id} type="button"
                    title={inCurrentDay ? `Filter: ${mg.label}` : `Add ${mg.label} to this day`}
                    onClick={() => onMuscleStripPick(mg)}
                    className={`flex w-[72px] flex-shrink-0 flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 transition-colors ${
                      isFilter
                        ? 'border-2 border-blue-500 bg-white shadow-md'
                        : inCurrentDay
                          ? 'border border-gray-200 bg-white shadow-sm hover:border-gray-300'
                          : 'border border-dashed border-gray-400 bg-gray-300 hover:border-gray-500 hover:bg-gray-200'
                    }`}>
                    <div className="relative h-14 w-14">
                      <Image src={mg.image} alt={mg.label} fill className="object-contain" unoptimized />
                    </div>
                    <span className={`text-center text-[9px] font-medium leading-tight ${inCurrentDay ? 'text-gray-900' : 'text-gray-700'}`}>{mg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {fastPlanToolbarNotice ? (
        <p className="mx-3 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {fastPlanToolbarNotice}
        </p>
      ) : null}

      {exerciseListVisible ? (
        <div className="mx-3 mt-2 rounded-lg border border-yellow-200 bg-yellow-50/95 px-2 py-2 text-black shadow-inner">
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[140px] max-w-md flex-1 flex-col gap-0.5 text-[10px] font-semibold text-gray-800">
              Search catalog
              <input
                type="search"
                value={fastPlanCatalogSearch}
                onChange={e => setFastPlanCatalogSearch(e.target.value)}
                placeholder="Filter by name…"
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
              />
            </label>
            <label className="flex min-w-[180px] flex-col gap-0.5 text-[10px] font-semibold text-gray-800">
              Your library
              <select
                className="rounded border border-gray-300 bg-white px-1 py-1 text-xs text-gray-900"
                defaultValue=""
                onChange={e => {
                  const v = e.target.value;
                  if (!v) return;
                  if (!fastPlanExercisePick) {
                    setFastPlanToolbarNotice('Tap a table row first (# or Exercise cell), then pick an exercise.');
                    e.target.selectedIndex = 0;
                    return;
                  }
                  updateExercise(fastPlanExercisePick.secIdx, fastPlanExercisePick.exIdx, 'name', v);
                  e.target.selectedIndex = 0;
                }}
              >
                <option value="">Free moves…</option>
                {freeMoveExerciseList.map(fe => (
                  <option key={fe.id} value={fe.name}>
                    {fe.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="w-full text-[10px] leading-snug text-gray-700 sm:w-auto sm:flex-1">
              {fastPlanExercisePick
                ? `Applying to row ${fastPlanExercisePick.exIdx + 1} of ${activeDay.sectors[fastPlanExercisePick.secIdx]?.sectorLabel ?? '—'}.`
                : 'Focus a row (# or Exercise) below, then tap a card or choose from your library.'}
            </p>
          </div>
          <div
            className="overflow-x-auto pb-1"
            onWheel={e => {
              if (e.shiftKey) return;
              const el = e.currentTarget;
              if (el.scrollWidth <= el.clientWidth) return;
              e.preventDefault();
              el.scrollLeft += e.deltaY;
            }}
          >
            <div className="flex w-max gap-2">
              {fastPlanCatalogFiltered.map(ex => {
                const nameKey = normalizeCatalogExerciseName(ex.name);
                const onSameDay = catalogExerciseDayUsage.sameDay.has(nameKey);
                const onOtherDay = !onSameDay && catalogExerciseDayUsage.otherDays.has(nameKey);
                return (
                <button
                  key={ex.id}
                  type="button"
                  title={ex.name}
                  onClick={() => {
                    if (!fastPlanExercisePick) {
                      setFastPlanToolbarNotice('Tap a table row first (# or Exercise cell), then pick an exercise.');
                      return;
                    }
                    updateExercise(fastPlanExercisePick.secIdx, fastPlanExercisePick.exIdx, 'name', ex.name);
                  }}
                  className="flex w-28 flex-shrink-0 flex-col items-stretch rounded-lg border-2 border-gray-300 bg-white p-1 text-left hover:border-blue-500 hover:shadow-md"
                >
                  <div className="relative mb-1 aspect-square w-full overflow-hidden rounded bg-gray-100">
                    {(onSameDay || onOtherDay) ? (
                      <span
                        className={`absolute right-0.5 top-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${
                          onSameDay ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        title={onSameDay ? 'Already selected on this day' : 'Selected on another day'}
                        aria-hidden
                      />
                    ) : null}
                    <Image src={ex.image} alt="" fill className="object-contain" sizes="112px" unoptimized />
                  </div>
                  <span className="line-clamp-3 text-center text-[10px] font-medium text-gray-900">{ex.name}</span>
                </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-3 mb-4 overflow-hidden rounded-b-lg border border-gray-300 border-t-0">
        {(() => {
          const renderSectorArea = (sec: PlanSector, secIdx: number, sortable: SectorSortableBag | null) => {
          const seriesDist = computeExerciseDist(sec.totalSeries, levelCat);
          const maxEx      = sec.defaultExerciseCount * 2;
          const secColor   = getSectorColor(sec.sectorId, secIdx);

          return (
            <React.Fragment key={sectorSortableId(activeDayIdx, secIdx)}>
              <div
                className="flex flex-wrap items-center gap-2 border-b border-t border-cyan-200/90 bg-cyan-50 px-3 py-2.5"
                style={{ borderLeftWidth: 3, borderLeftColor: secColor }}
              >
                <button
                  type="button"
                  onClick={() => requestRemoveSectorAt(secIdx)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  title="Remove this muscular area"
                >
                  <X className="h-4 w-4" />
                </button>
                {sortable ? (
                  <button
                    type="button"
                    {...sortable.dragHandleProps}
                    className="touch-manipulation flex h-8 w-8 flex-shrink-0 cursor-grab items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 active:cursor-grabbing"
                    aria-label="Drag to reorder area"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                ) : null}
                <div className="relative h-9 w-9 flex-shrink-0">
                  <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                </div>
                <span className="min-w-[90px] text-sm font-bold text-gray-900">{sec.sectorLabel}</span>

                <div
                  className="flex flex-col overflow-hidden rounded border border-sky-400"
                  title="Exercise count comes from the distribution table (training level × total series). Use Select exercises mode to add rows manually.">
                  <button type="button"
                    onClick={() => changeExerciseCount(secIdx, 1)}
                    disabled={planSeriesTableLocked || sec.exercises.length >= maxEx}
                    className="flex items-center justify-center bg-sky-400 px-2 py-1 text-white hover:bg-sky-500 disabled:opacity-40">
                    <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <button type="button"
                    onClick={() => changeExerciseCount(secIdx, -1)}
                    disabled={sec.exercises.length <= 1}
                    className="flex items-center justify-center border-t border-sky-300 bg-sky-400 px-2 py-1 text-white hover:bg-sky-500 disabled:opacity-40">
                    <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="relative">
                  <button type="button"
                    onClick={() => setOpenShuffleMenuFor(prev => (prev === sec.sectorId ? null : sec.sectorId))}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-400 bg-white text-gray-600 hover:bg-gray-50"
                    title="Exercise actions: random mode or preferences">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {openShuffleMenuFor === sec.sectorId ? (
                    <div className="absolute left-0 top-9 z-30 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          shuffleSector(secIdx);
                          setOpenShuffleMenuFor(null);
                        }}
                        className="w-full rounded px-2 py-1.5 text-left text-xs font-medium text-gray-800 hover:bg-gray-100"
                      >
                        Random mode
                      </button>
                      <button
                        type="button"
                        disabled
                        className="w-full cursor-not-allowed rounded px-2 py-1.5 text-left text-xs text-gray-400"
                        title="Preferences mode will be available soon"
                      >
                        Apply preferences (coming soon)
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="whitespace-nowrap font-medium text-gray-700">Series\area</span>
                  <select value={sec.totalSeries}
                    onChange={e => setSectorTotalSeries(secIdx, Number(e.target.value))}
                    title={`Distribution: ${computeExerciseDist(sec.totalSeries, levelCat).join('+')} (${levelCat} level)`}
                    className="w-14 rounded border border-gray-400 bg-white px-1 py-0.5 text-xs font-semibold">
                    {Array.from({ length: 40 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                </div>

                {exerciseListVisible ? (
                <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-gray-700">
                  <input type="checkbox" checked={sec.keepSeriesFixed}
                    onChange={() => toggleKeepFixed(secIdx)}
                    className="h-3 w-3 rounded accent-blue-600" />
                  Keep fix this value
                </label>
                ) : null}

                <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-gray-800">
                  <span className="whitespace-nowrap">
                    Macropause at end of each exercise:{' '}
                    <input type="text" value={sec.macroExercise}
                      onChange={e => updateMacro(secIdx, 'macroExercise', e.target.value)}
                      className="w-10 border-b border-cyan-600/40 bg-transparent text-center font-bold outline-none focus:border-sky-500" />
                  </span>
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    Macropause at end of the sector:{' '}
                    <input type="text" value={sec.macroEndOfSector}
                      onChange={e => updateMacro(secIdx, 'macroEndOfSector', e.target.value)}
                      className="w-10 border-b border-cyan-600/40 bg-transparent text-center font-bold outline-none focus:border-sky-500" />
                  </span>
                </div>
              </div>

        {exercisesVisible ? sec.exercises.map((ex, exIdx) => {
          const seriesCount = ex.distributedSeries ?? seriesDist[exIdx] ?? 1;
          const rowPicked =
            exerciseListVisible &&
            fastPlanExercisePick?.secIdx === secIdx &&
            fastPlanExercisePick?.exIdx === exIdx;
          return (
            <div
              key={ex.id}
              className={`grid grid-cols-[44px_minmax(140px,1fr)_96px_72px_80px_84px_84px_96px_64px] border-b border-gray-200 text-xs ${
                exIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              }${rowPicked ? ' ring-2 ring-inset ring-blue-400' : ''}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (exerciseListVisible) setFastPlanExercisePick({ secIdx, exIdx });
                }}
                className={`flex items-center justify-center border-r border-gray-200 px-2 py-2 font-medium tabular-nums ${
                  exerciseListVisible
                    ? 'cursor-pointer text-blue-700 hover:bg-blue-50/80'
                    : 'cursor-default text-gray-500'
                }`}
              >
                {exIdx + 1}
              </button>
              <div className="flex items-center border-r border-gray-200 px-2 py-2">
                <input
                  type="text"
                  value={ex.name}
                  onChange={e => updateExercise(secIdx, exIdx, 'name', e.target.value)}
                  onFocus={() => {
                    if (exerciseListVisible) setFastPlanExercisePick({ secIdx, exIdx });
                  }}
                  placeholder={`${sec.sectorLabel} Exercise ${exIdx + 1}`}
                  className="w-full bg-transparent text-gray-600 outline-none placeholder:italic placeholder:text-gray-400"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <select
                  value={ex.speed}
                  onChange={e => updateExercise(secIdx, exIdx, 'speed', e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-center text-xs text-gray-800 outline-none"
                >
                  {SPEED_OPTIONS.map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2 font-semibold tabular-nums text-gray-900`}>
                {exerciseListVisible ? (
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={seriesCount}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) updateExerciseDistributedSeries(secIdx, exIdx, v);
                    }}
                    className="w-full min-w-0 bg-transparent text-center text-xs font-semibold tabular-nums text-gray-900 outline-none"
                  />
                ) : (
                  <span>{seriesCount}</span>
                )}
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <input
                  type="text"
                  value={ex.ripsTime}
                  onChange={e => updateExercise(secIdx, exIdx, 'ripsTime', e.target.value)}
                  className="w-full bg-transparent text-center text-gray-800 outline-none"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <input
                  type="text"
                  value={ex.weight}
                  onChange={e => updateExercise(secIdx, exIdx, 'weight', e.target.value)}
                  placeholder="—"
                  className="w-full bg-transparent text-center text-gray-500 outline-none placeholder:text-gray-400"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <input
                  type="text"
                  value={ex.breakTime}
                  onChange={e => updateExercise(secIdx, exIdx, 'breakTime', e.target.value)}
                  className="w-full bg-transparent text-center text-gray-800 outline-none"
                />
              </div>
              <div className={`flex items-center justify-center border-r border-gray-200 px-1 py-2`}>
                <select
                  value={ex.mode}
                  onChange={e => updateExercise(secIdx, exIdx, 'mode', e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-center text-xs text-gray-800 outline-none"
                >
                  {MODE_OPTIONS.map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-1 py-2">
                <button
                  type="button"
                  onClick={() => requestRemoveExerciseAt(secIdx, exIdx)}
                  disabled={sec.exercises.length <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-35"
                  title="Remove exercise"
                >
                  <X className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-orange-300 bg-orange-50 hover:bg-orange-100"
                  title="Time options (coming soon)"
                >
                  <Clock className="h-3.5 w-3.5 text-orange-500" />
                </button>
              </div>
            </div>
          );
        }) : null}
            </React.Fragment>
          );
          };
          if (filterSector) {
            return visibleSectors.map((sec) => {
              const secIdx = activeDay.sectors.findIndex((s) => s.sectorId === sec.sectorId);
              return renderSectorArea(sec, secIdx, null);
            });
          }
          const sectorSortIds = activeDay.sectors.map((_, i) => sectorSortableId(activeDayIdx, i));
          return (
            <DndContext
              sensors={sectorDragSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectorDragEnd}
            >
              <SortableContext items={sectorSortIds} strategy={verticalListSortingStrategy}>
                {activeDay.sectors.map((sec, secIdx) => (
                  <SortableSectorShell key={sectorSortIds[secIdx]} id={sectorSortIds[secIdx]}>
                    {(sortable) => renderSectorArea(sec, secIdx, sortable)}
                  </SortableSectorShell>
                ))}
              </SortableContext>
            </DndContext>
          );
        })()}
      </div>

      <p className="mx-3 mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-snug text-sky-900">
        Scroll to view all repetitions. Each can have unique speed, time, and pause values.
        To add specific exercises, use Add NutritionFood for each day in your workout plan.
      </p>
    </>
  );

  const planFooterBar = (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t-2 border-gray-300 bg-gray-100 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={handleBackToManual}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back to manual editor
          </button>
        ) : null}
        <button type="button" onClick={handleSave}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
          Save nutritionFood and its nutrition_components
        </button>
        <button type="button"
          className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-amber-500">
          <span>≡</span> Preferences
        </button>
        <button type="button" onClick={onClose}
          className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Cancel
        </button>
      </div>
    </div>
  );

  // ── Main form ─────────────────────────────────────────────────────────────
  const fastPlanShell = (
    <>
      {fixedPlanTopBar}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white">
        {scrollablePlanMain}
      </div>
      {planFooterBar}
    </>
  );

  return (
    <>
      {!fullPage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-2xl">
            {fastPlanShell}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {fastPlanShell}
        </div>
      )}

      {/* ── Auto-process warning dialog ── */}
      {showAutoWarn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-white mt-0.5" aria-hidden />
              <div>
                <h3 className="font-bold text-white text-base">Automatic processing procedure</h3>
                <p className="text-amber-100 text-xs mt-1">This action will overwrite all current values</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-800 leading-relaxed">
                You must be careful not to accidentally press this button after you have modified the exercise data.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Pressing <strong>Confirm</strong> will fill the following columns with calculated values for every exercise on this day:
              </p>
              <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5 pl-1">
                <li>Speed {UI_ARROW} Normal</li>
                <li>Series {UI_ARROW} calculated by distribution table</li>
                <li>Rip/Time {UI_ARROW} from sector reps setting</li>
                <li>Break {UI_ARROW} from sector pause setting</li>
                <li>Mode {UI_ARROW} Stopped (default)</li>
              </ul>
              <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Any values you manually edited will be overwritten.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-4">
              <button type="button" onClick={() => setShowAutoWarn(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={applyAutoProcess}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">
                Confirm {UI_EM_DASH} Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Series distribution dialog ── */}
      {showSeriesDist && (
        <SeriesDistDialog
          days={planDaysToManual(planDays)}
          initialDayIdx={activeDayIdx}
          constantSectorIds={new Set<string>()}
          onSave={handleSeriesDistSave}
          onClose={() => setShowSeriesDist(false)}
        />
      )}
    </>
  );
}
