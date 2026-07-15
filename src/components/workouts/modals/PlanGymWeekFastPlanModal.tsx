'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { X, Settings, RefreshCw, CheckCircle, Clock, ChevronUp, ChevronDown, GripVertical, ChevronLeft, Info, AlertTriangle } from 'lucide-react';
import type {
  PlanGymWeekManualResult,
  ManualDaySector,
  ManualDayPlan,
  PlanGymWeekYearlyPeriodSettings,
  YearlyPeriodScalarsSource,
} from './PlanGymWeekManualModal';
import {
  ensureManualSectorShape,
  getSectorColor,
  SeriesDistDialog,
  defaultPlanGymWeekYearlyPeriodSettings,
  distributeSeriesFromPcts,
  buildAllDistSessionsFromDays,
  suggestedRoutineTotalSeriesForDistMask,
  type SeriesDistDialogProps,
  type SeriesDistDaySession,
} from './PlanGymWeekManualModal';
import { FAST_PLANNER_REST_PAUSE_OPTIONS } from '@/constants/moveframe.constants';
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
  readGoalParamsFromWorkoutSettings,
  isGoalParamsSavedInWorkoutSettings,
  readVolumeDeltaPctFromWorkoutSettings,
  volumeSeriesAtPeriod,
} from '@/utils/planGymWeekGoalScalars';
import {
  PLAN_YEAR_TOTAL_PERIODS_MAX,
  PLAN_YEAR_TOTAL_PERIODS_MIN,
  clampPlanYearPeriodPair,
  interpolatedPauseForPeriod,
  interpolatePeriodIntRounded,
} from '@/utils/planPeriodInterpolation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AUTO_PROCESS_INFO_DEFAULT_EN,
  fetchAutoProcessInfoText,
  parseAutoProcessInfoSections,
} from '@/constants/autoProcessInfoLongText';
import { UI_ARROW, UI_EM_DASH, UI_ELLIPSIS } from '@/utils/fixUtf8Mojibake';
import {
  PYRAMIDAL_MODE_OPTIONS,
  baseRepsForExerciseRows,
  displayedPyramidalRepAt,
  ensureGymWeekPyramidalSector,
  exerciseCountForPyramidalSector,
  pyramidalTableRowsForGymSector,
  recalcPyramidalPctsFromReps,
  setPyramidalMode,
  setPyramidalTypeByPercent,
  updatePyramidalPctAt,
  updatePyramidalRepAt,
} from '@/utils/gymWeekPyramidalSector';
import {
  formatPercentLoad1MRFromReps,
  getPct1RmFormulaLabel,
  isLoadPctValidForReps,
  nextPct1RmFormulaIndex,
  percentOf1RmFromReps,
  repsFromPercentOf1Rm,
} from '@/utils/percent1RmFormulas';
import type { PyramidalMode } from '@/utils/pyramidalReps';
import { InfoRepsHelpButton } from '../InfoRepsHelpButton';
import { InfoRepsModal } from '../InfoRepsModal';

// â”€â”€â”€ Storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GYM_PLAN_STORAGE_KEY = 'gym_weekly_plan_saved_v1';
export function savePlanToStorage(plan: PlanGymWeekManualResult) {
  try { localStorage.setItem(GYM_PLAN_STORAGE_KEY, JSON.stringify({ plan, savedAt: new Date().toISOString() })); } catch {}
}
export function loadPlanFromStorage(): { plan: PlanGymWeekManualResult; savedAt: string } | null {
  try { const r = localStorage.getItem(GYM_PLAN_STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  seriesRepsRaw?:      string[];
  pctFormulaIndex?:    number;
  typeByPercent?:      boolean;
  seriesPcts?:         number[];
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SPEED_OPTIONS = ['Normal', 'Fast', 'Slow', 'Explosive', 'Controlled'];
const MODE_OPTIONS  = ['Stopped', 'In motion', 'Strict', 'Superset'];

/** Parse a pause string like "1'30\"" to seconds */
function pauseToSec(p: string): number {
  const m = p?.match(/(\d+)[''''](\d+)/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  const s = parseFloat(p);
  return isNaN(s) ? 90 : s;
}

function manualYearlyPeriodRangesComplete(s: PlanGymWeekYearlyPeriodSettings): boolean {
  const cells = [
    s.sectorPauseFrom,
    s.sectorPauseTo,
    s.macroExercisePauseFrom,
    s.macroExercisePauseTo,
    s.macroEndSectorPauseFrom,
    s.macroEndSectorPauseTo,
    s.seriesProgressionFrom,
    s.seriesProgressionTo,
    s.repsProgressionFrom,
    s.repsProgressionTo,
  ];
  if (cells.some((x) => String(x ?? '').trim() === '')) return false;
  const sFrom = parseInt(String(s.seriesProgressionFrom).trim(), 10);
  const sTo = parseInt(String(s.seriesProgressionTo).trim(), 10);
  if (Number.isNaN(sFrom) || Number.isNaN(sTo) || sFrom < 1 || sFrom > 20 || sTo < 1 || sTo > 20) return false;
  const rFrom = parseInt(String(s.repsProgressionFrom).trim(), 10);
  const rTo = parseInt(String(s.repsProgressionTo).trim(), 10);
  if (Number.isNaN(rFrom) || Number.isNaN(rTo) || rFrom < 0 || rFrom > 99 || rTo < 0 || rTo > 99) return false;
  return true;
}

function syncPlanSectorPyramidalFields(
  sec: PlanSector,
  trainingLevel: TrainingLevel | null | undefined,
): PlanSector {
  const shaped = ensureGymWeekPyramidalSector(
    sec,
    sec.totalSeries,
    sec.exercises.length,
    trainingLevel,
  );
  const baseReps = baseRepsForExerciseRows(shaped);
  return {
    ...sec,
    reps: shaped.reps,
    pyramidal: shaped.pyramidal,
    seriesReps: shaped.seriesReps,
    seriesRepsRaw: shaped.seriesRepsRaw,
    pctFormulaIndex: shaped.pctFormulaIndex,
    typeByPercent: shaped.typeByPercent,
    seriesPcts: shaped.seriesPcts,
    exercises: sec.exercises.map((ex) =>
      ex.userEdited ? ex : { ...ex, ripsTime: String(baseReps) },
    ),
  };
}

function initPlanDay(
  day: ManualDayPlan,
  levelCat: SeriesLevelCategory = 'mid',
  trainingLevel: TrainingLevel | null = null,
): PlanDay {
  return {
    routineName: day.routineName,
    sectors: day.sectors.map((rawSec) => {
      const sec   = ensureManualSectorShape(rawSec, trainingLevel);
      const tableDist = getSeriesDistribution(sec.series, levelCat);
      const count = tableDist.length;
      const baseReps = sec.seriesReps?.[0] ?? sec.reps ?? 12;
      const exercises: PlanExercise[] = Array.from({ length: count }, (_, i) => ({
        id:         `${sec.sectorId}-${i}-${Date.now()}`,
        name:       '',
        speed:      'Normal',
        ripsTime:   String(baseReps),
        weight:     '',
        breakTime:  sec.pause || "1'30\"",
        mode:       'Stopped',
        userEdited: false,
        distributedSeries: tableDist[i] ?? 1,
      }));
      return syncPlanSectorPyramidalFields({
        sectorId:             sec.sectorId,
        sectorLabel:          sec.sectorLabel,
        image:                sec.image,
        reps:                 sec.reps,
        pause:                sec.pause,
        pyramidal:            sec.pyramidal,
        seriesReps:           sec.seriesReps,
        seriesRepsRaw:        sec.seriesRepsRaw,
        pctFormulaIndex:      sec.pctFormulaIndex,
        typeByPercent:        sec.typeByPercent,
        seriesPcts:           sec.seriesPcts,
        totalSeries:          sec.series,
        defaultTotalSeries:   sec.series,
        keepSeriesFixed:      false,
        defaultExerciseCount: count,
        macroExercise:        sec.macroExercise || "2'",
        macroEndOfSector:     sec.macroEndOfSector || "3'",
        exercises,
      }, trainingLevel);
    }),
  };
}


function computeExerciseDist(totalSeries: number, levelCat: SeriesLevelCategory): number[] {
  return getSeriesDistribution(totalSeries, levelCat);
}

/** Even split when exercise row count is fixed (select-exercises mode). */
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
      pyramidal:        s.pyramidal as PyramidalMode,
      seriesReps:       s.seriesReps,
      seriesRepsRaw:    s.seriesRepsRaw,
      pctFormulaIndex:  s.pctFormulaIndex,
      typeByPercent:    s.typeByPercent,
      seriesPcts:       s.seriesPcts,
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

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function PlanGymWeekFastPlanModal({
  isOpen, plan, goals = [], trainingLevel: trainingLevelProp, onBack, onClose, onSave,
}: PlanGymWeekFastPlanModalProps) {

  const trainingLevel =
    trainingLevelProp ?? plan.trainingLevel ?? null;
  const levelCat = trainingLevelToCategory(trainingLevel);
  const { currentLanguage: language } = useLanguage();

  const [activeDayIdx,      setActiveDayIdx]      = useState(0);
  const [planDays,          setPlanDays]           = useState<PlanDay[]>(() => plan.days.map(d => initPlanDay(d, levelCat, trainingLevel)));
  const [filterSector,      setFilterSector]       = useState<string | null>(null);
  const [showSeriesDist,    setShowSeriesDist]      = useState(false);
  /** Baseline routine total + % per day (unchanged when sectors are added). */
  const [seriesDistSessionByDay, setSeriesDistSessionByDay] = useState<
    Record<number, SeriesDistDaySession>
  >({});
  const [saved,             setSaved]              = useState(false);
  const [fullPage,          setFullPage]           = useState(false);
  const [showAutoWarn,      setShowAutoWarn]      = useState(false);
  const [showWorkoutParamsPicker, setShowWorkoutParamsPicker] = useState(false);
  const [autoProcessInfoRaw, setAutoProcessInfoRaw] = useState(AUTO_PROCESS_INFO_DEFAULT_EN);
  const [openShuffleMenuFor, setOpenShuffleMenuFor] = useState<string | null>(null);
  /** Mirrors legacy UI: naming rows vs distribution-led series display */
  const [exercisesVisible, setExercisesVisible] = useState(true);
  const [exerciseListVisible, setExerciseListVisible] = useState(false);
  const [planSeriesVisible, setPlanSeriesVisible] = useState(true);
  const planSeriesTableLocked = planSeriesVisible && !exerciseListVisible;
  /** Short-lived feedback when filtering / adding muscles (strip looks â€œdeadâ€ otherwise) */
  const [fastPlanToolbarNotice, setFastPlanToolbarNotice] = useState<string | null>(null);
  /** Select-exercises mode: catalog filter (muscle id or all areas). */
  const [fastPlanCatalogFilterId, setFastPlanCatalogFilterId] = useState<string | 'all'>('all');
  const [fastPlanCatalogSearch, setFastPlanCatalogSearch] = useState('');
  /** Row targeted when tapping a catalog exercise (secIdx / exIdx in active day). */
  const [fastPlanExercisePick, setFastPlanExercisePick] = useState<{ secIdx: number; exIdx: number } | null>(null);
  const [pyramidalFormsOpenBySector, setPyramidalFormsOpenBySector] = useState<Record<string, boolean>>({});
  const [infoRepsModalOpen, setInfoRepsModalOpen] = useState(false);
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
      setShowWorkoutParamsPicker(false);
      setPyramidalFormsOpenBySector({});
      setInfoRepsModalOpen(false);
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
      setPlanDays(plan.days.map((d) => initPlanDay(d, trainingLevelToCategory(trainingLevel), trainingLevel)));
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
        goalSettings: readGoalParamsFromWorkoutSettings(goalId),
        trainingLevel,
        currentPeriod: clampedPeriod.currentPeriod,
        totalPeriods: clampedPeriod.totalPeriods,
      });
    },
    [goals, trainingLevel, clampedPeriod],
  );

  // â”€â”€ Updaters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            return syncPlanSectorPyramidalFields({ ...s, totalSeries: val, defaultTotalSeries: val }, trainingLevel);
          }
          const dArr = computeExerciseDistForFixedCount(val, s.exercises.length);
          return syncPlanSectorPyramidalFields({
            ...s,
            totalSeries: val,
            defaultTotalSeries: val,
            exercises: s.exercises.map((ex, i) => ({
              ...ex,
              distributedSeries: dArr[i] ?? 1,
            })),
          }, trainingLevel);
        }
        // Plan series/exercise: always exercise count + split from level × total-series table
        return syncPlanSectorPyramidalFields(resizeExercisesToTableDist(s, val, levelCat), trainingLevel);
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat, exerciseListVisible, planSeriesVisible, planSeriesTableLocked, trainingLevel]);

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
        const synced = planSeriesTableLocked
          ? resizeExercisesToTableDist(s, s.totalSeries, levelCat)
          : s;
        const dArr = computeExerciseDist(synced.totalSeries, levelCat);
        const randomNames = pickRandomCatalogExerciseNamesForMuscleGroup(
          synced.sectorId,
          synced.exercises.length,
        );
        const pairs = synced.exercises.map((ex, i) => {
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
        return { ...synced, exercises };
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat, exerciseListVisible, planSeriesVisible, planSeriesTableLocked]);

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

  const sectorPyramidalFormKey = (dayIdx: number, secIdx: number) => `${dayIdx}-${secIdx}`;

  const isPyramidalFormOpen = useCallback(
    (dayIdx: number, secIdx: number) =>
      pyramidalFormsOpenBySector[sectorPyramidalFormKey(dayIdx, secIdx)] ?? false,
    [pyramidalFormsOpenBySector],
  );

  const activeDayAnyPyramidalFormOpen = useMemo(() => {
    const day = planDays[activeDayIdx];
    if (!day?.sectors.length) return false;
    return day.sectors.some((_, i) =>
      pyramidalFormsOpenBySector[sectorPyramidalFormKey(activeDayIdx, i)] ?? false,
    );
  }, [activeDayIdx, pyramidalFormsOpenBySector, planDays]);

  const activeDayPctFormulaIndex = useMemo(() => {
    return planDays[activeDayIdx]?.sectors[0]?.pctFormulaIndex ?? 0;
  }, [planDays, activeDayIdx]);

  const toggleAllPyramidalFormsOnActiveDay = useCallback(() => {
    const day = planDays[activeDayIdx];
    if (!day?.sectors.length) return;
    const anyOpen = day.sectors.some((_, i) =>
      pyramidalFormsOpenBySector[sectorPyramidalFormKey(activeDayIdx, i)] ?? false,
    );
    const next = !anyOpen;
    setPyramidalFormsOpenBySector((prev) => {
      const updated = { ...prev };
      day.sectors.forEach((_, i) => {
        updated[sectorPyramidalFormKey(activeDayIdx, i)] = next;
      });
      return updated;
    });
  }, [activeDayIdx, pyramidalFormsOpenBySector, planDays]);

  const cycleAllSectorsPctFormulaOnActiveDay = useCallback(() => {
    setPlanDays((prev) =>
      prev.map((day, di) => {
        if (di !== activeDayIdx) return day;
        const firstFi = day.sectors[0]?.pctFormulaIndex ?? 0;
        const nextFi = nextPct1RmFormulaIndex(firstFi);
        return {
          ...day,
          sectors: day.sectors.map((sec) =>
            syncPlanSectorPyramidalFields(
              {
                ...sec,
                ...recalcPyramidalPctsFromReps(
                  sec,
                  sec.totalSeries,
                  sec.exercises.length,
                  trainingLevel,
                  nextFi,
                ),
              },
              trainingLevel,
            ),
          ),
        };
      }),
    );
  }, [activeDayIdx, trainingLevel]);

  const patchSectorPyramidal = useCallback(
    (secIdx: number, updater: (sec: PlanSector) => PlanSector) => {
      setPlanDays((prev) =>
        prev.map((d, di) => {
          if (di !== activeDayIdx) return d;
          const sectors = d.sectors.map((s, si) => {
            if (si !== secIdx) return s;
            return syncPlanSectorPyramidalFields(updater(s), trainingLevel);
          });
          return { ...d, sectors };
        }),
      );
    },
    [activeDayIdx, trainingLevel],
  );

  const updatePyramidalRepAtRow = useCallback(
    (secIdx: number, rowIdx: number, raw: string) => {
      patchSectorPyramidal(secIdx, (sec) => ({
        ...sec,
        ...updatePyramidalRepAt(
          sec,
          sec.totalSeries,
          sec.exercises.length,
          trainingLevel,
          rowIdx,
          raw,
        ),
      }));
    },
    [patchSectorPyramidal, trainingLevel],
  );

  const updatePyramidalPctAtRow = useCallback(
    (secIdx: number, rowIdx: number, raw: string) => {
      patchSectorPyramidal(secIdx, (sec) => ({
        ...sec,
        ...updatePyramidalPctAt(
          sec,
          sec.totalSeries,
          sec.exercises.length,
          trainingLevel,
          rowIdx,
          raw,
        ),
      }));
    },
    [patchSectorPyramidal, trainingLevel],
  );

  const setSectorTypeByPercent = useCallback(
    (secIdx: number, enabled: boolean) => {
      patchSectorPyramidal(secIdx, (sec) => ({
        ...sec,
        ...setPyramidalTypeByPercent(
          sec,
          sec.totalSeries,
          sec.exercises.length,
          trainingLevel,
          enabled,
        ),
      }));
    },
    [patchSectorPyramidal, trainingLevel],
  );

  const setSectorPyramidalMode = useCallback(
    (secIdx: number, mode: PyramidalMode) => {
      patchSectorPyramidal(secIdx, (sec) => ({
        ...sec,
        ...setPyramidalMode(
          sec,
          sec.totalSeries,
          sec.exercises.length,
          trainingLevel,
          mode,
        ),
      }));
    },
    [patchSectorPyramidal, trainingLevel],
  );

  // â”€â”€ Add sector (clicking a non-current-day sector in the muscle selector) â”€â”€
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
  }, [activeDayIdx, levelCat, exerciseListVisible, planSeriesVisible, planSeriesTableLocked]);

  const templateFromMuscleGroup = useCallback((mg: GymWeekMuscleGroup, totalSeries: number): PlanSector => {
    const reps        = 12;
    const pause       = "1'30\"";
    const count       = getSeriesDistribution(totalSeries, levelCat).length;
    const templateRows = pyramidalTableRowsForGymSector(totalSeries, count, trainingLevel);
    return syncPlanSectorPyramidalFields({
      sectorId:             mg.id,
      sectorLabel:          mg.label,
      image:                mg.image,
      reps,
      pause,
      pyramidal:            'flat',
      seriesReps:           Array.from({ length: templateRows }, () => reps),
      seriesRepsRaw:        Array.from({ length: templateRows }, () => String(reps)),
      pctFormulaIndex:      0,
      typeByPercent:        false,
      seriesPcts:           Array.from({ length: templateRows }, () => Math.max(0, 100 - reps * 2.5)),
      totalSeries,
      defaultTotalSeries:   totalSeries,
      keepSeriesFixed:      false,
      defaultExerciseCount: count,
      macroExercise:        "2'",
      macroEndOfSector:     "3'",
      exercises:            [],
    }, trainingLevel);
  }, [levelCat, trainingLevel]);

  // â”€â”€ Automatic processing procedure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAutoProcess = () => {
    // Always show the warning — button fills values every time regardless of manual edits
    setShowAutoWarn(true);
  };

  useEffect(() => {
    if (!showAutoWarn) return;
    let cancelled = false;
    void fetchAutoProcessInfoText(language).then((text) => {
      if (!cancelled) setAutoProcessInfoRaw(text);
    });
    return () => {
      cancelled = true;
    };
  }, [showAutoWarn, language]);

  const autoProcessInfoSections = useMemo(
    () => parseAutoProcessInfoSections(autoProcessInfoRaw),
    [autoProcessInfoRaw],
  );

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

        const merged: PlanSector = {
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
        return syncPlanSectorPyramidalFields(
          {
            ...merged,
            ...setPyramidalMode(
              merged,
              maskTotal,
              exercises.length,
              trainingLevel,
              (merged.pyramidal ?? 'flat') as PyramidalMode,
            ),
          },
          trainingLevel,
        );
      });
      return { ...d, sectors };
    }));
  }, [activeDayIdx, levelCat, scalarsForDay, planSeriesVisible, exerciseListVisible, trainingLevel]);

  const applyManualYearlyScalarsToDay = useCallback((): boolean => {
    const s = yearlyPeriodSettings;
    const tp = Math.min(
      PLAN_YEAR_TOTAL_PERIODS_MAX,
      Math.max(PLAN_YEAR_TOTAL_PERIODS_MIN, Math.floor(s.totalPeriods)),
    );
    const cp = Math.min(tp, Math.max(1, Math.floor(s.currentPeriod)));

    if (!manualYearlyPeriodRangesComplete(s)) {
      window.alert(
        'You selected to use your own first → last period values. Before applying, fill every field in that section: ' +
          'all six pause times (first and last period for between-series, between-exercises, and between-areas), ' +
          'both series numbers, and both reps numbers.',
      );
      return false;
    }

    const pausePair = (from: string, to: string): string | null => {
      const a = String(from ?? '').trim();
      const b = String(to ?? '').trim();
      if (!a || !b) return null;
      return interpolatedPauseForPeriod(a, b, cp, tp, FAST_PLANNER_REST_PAUSE_OPTIONS);
    };

    const sectorPause = pausePair(s.sectorPauseFrom, s.sectorPauseTo);
    const macroEx = pausePair(s.macroExercisePauseFrom, s.macroExercisePauseTo);
    const macroEnd = pausePair(s.macroEndSectorPauseFrom, s.macroEndSectorPauseTo);

    const repsFromN = parseInt(String(s.repsProgressionFrom ?? '').trim(), 10);
    const repsToN = parseInt(String(s.repsProgressionTo ?? '').trim(), 10);
    const repsVal = interpolatePeriodIntRounded(repsFromN, repsToN, cp, tp);

    const seriesFromN = parseInt(String(s.seriesProgressionFrom ?? '').trim(), 10);
    const seriesToN = parseInt(String(s.seriesProgressionTo ?? '').trim(), 10);
    const seriesVal = Math.min(20, Math.max(1, interpolatePeriodIntRounded(seriesFromN, seriesToN, cp, tp)));

    setPlanDays(prev => prev.map((d, di) => {
      if (di !== activeDayIdx) return d;
      const sectors = d.sectors.map(sec0 => {
        const maskTotal = seriesVal;
        const tableLen = exerciseCountForArea(maskTotal, levelCat);
        let exercises = sec0.exercises;

        if (planSeriesVisible || !sec0.keepSeriesFixed) {
          const resized = resizeExercisesToTableDist(
            { ...sec0, exercises, totalSeries: maskTotal },
            maskTotal,
            levelCat,
            { reps: repsVal, pause: sectorPause ?? sec0.pause },
          );
          exercises = resized.exercises;
        } else {
          exercises = clearExerciseDistributedSeries(exercises);
        }

        exercises = exercises.map(ex => ({
          ...ex,
          speed: 'Normal',
          ripsTime: String(repsVal),
          breakTime: sectorPause ?? sec0.pause,
          mode: 'Stopped',
          userEdited: false,
        }));

        const merged: PlanSector = {
          ...sec0,
          reps: repsVal,
          pause: sectorPause ?? sec0.pause,
          macroExercise: macroEx ?? sec0.macroExercise,
          macroEndOfSector: macroEnd ?? sec0.macroEndOfSector,
          totalSeries: maskTotal,
          defaultTotalSeries: maskTotal,
          defaultExerciseCount: tableLen,
          exercises,
        };
        return syncPlanSectorPyramidalFields(
          {
            ...merged,
            ...setPyramidalMode(
              merged,
              maskTotal,
              exercises.length,
              trainingLevel,
              (merged.pyramidal ?? 'flat') as PyramidalMode,
            ),
          },
          trainingLevel,
        );
      });
      return { ...d, sectors };
    }));
    return true;
  }, [activeDayIdx, levelCat, planSeriesVisible, yearlyPeriodSettings, trainingLevel]);

  const applyAutoProcess = () => {
    setShowAutoWarn(false);
    const src: YearlyPeriodScalarsSource = yearlyPeriodSettings.periodScalarsSource ?? 'calculated';
    if (src === 'manual') {
      applyManualYearlyScalarsToDay();
    } else {
      applyCalculatedWorkoutParamsToDay();
    }
  };

  // â”€â”€ Series distribution dialog save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const handleSeriesDistSessionChange = useCallback(
    (dayIdx: number, session: SeriesDistDaySession) => {
      setSeriesDistSessionByDay((prev) => ({ ...prev, [dayIdx]: session }));
    },
    [],
  );

  const handleSeriesDistSave = useCallback<SeriesDistDialogProps['onSave']>((dayIdx, newSeriesCounts, session) => {
    if (session) {
      setSeriesDistSessionByDay((prev) => ({ ...prev, [dayIdx]: session }));
    }
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

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const yearlyScalarSource: YearlyPeriodScalarsSource =
    yearlyPeriodSettings.periodScalarsSource ?? 'calculated';

  const workoutParamsPeriodPreview = useMemo(() => {
    const tp = Math.min(
      PLAN_YEAR_TOTAL_PERIODS_MAX,
      Math.max(PLAN_YEAR_TOTAL_PERIODS_MIN, Math.floor(yearlyPeriodSettings.totalPeriods)),
    );
    const cp = Math.min(tp, Math.max(1, Math.floor(yearlyPeriodSettings.currentPeriod)));
    const goalId = goals[activeDayIdx] ?? goals[0];
    const goalSettings = readGoalParamsFromWorkoutSettings(goalId);
    const scalars = computePlanGymWeekScalarDefaults({
      goalSettings,
      trainingLevel,
      currentPeriod: cp,
      totalPeriods: tp,
    });
    const suggestedTotal = suggestedRoutineTotalSeriesForDistMask({
      trainingLevel,
      daysCount: plan.daysCount,
      goalId,
      currentPeriod: cp,
      totalPeriods: tp,
    });
    const baseVolume = volumeSeriesAtPeriod(goalSettings, trainingLevel, cp, tp);
    const sessionDeltaPct = readVolumeDeltaPctFromWorkoutSettings(trainingLevel, plan.daysCount);
    return {
      hasGoalParams: isGoalParamsSavedInWorkoutSettings(goalId),
      pauseSeriesLabel: scalars.defaultPauseLabel,
      pauseExercisesLabel: scalars.defaultMacroExerciseLabel,
      pauseAreasLabel: scalars.defaultMacroEndSectorLabel,
      totalSeries: suggestedTotal,
      baseVolume,
      sessionDeltaPct,
      reps: scalars.defaultReps,
      cp,
      tp,
    };
  }, [
    activeDayIdx,
    goals,
    plan.daysCount,
    trainingLevel,
    yearlyPeriodSettings.currentPeriod,
    yearlyPeriodSettings.totalPeriods,
  ]);

  const paramSourceLabel =
    yearlyScalarSource === 'manual'
      ? 'My typed first → last period ranges'
      : 'Workout parameters';

  const yearlyManualRangesActive = yearlyScalarSource === 'manual';

  const workoutParamsPickerPanel = showWorkoutParamsPicker ? (
    <div className="border-b border-sky-300 bg-sky-50/80 px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-sky-950">Select workout parameters for this day</h3>
        <button
          type="button"
          onClick={() => setShowWorkoutParamsPicker(false)}
          className="rounded-lg p-1 text-sky-800 hover:bg-sky-100"
          aria-label="Close workout parameters panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <fieldset className="space-y-2 rounded-lg border border-sky-200 bg-white/90 p-3">
        <legend className="px-1 text-xs font-semibold text-gray-900">
          Apply to all sectors — data source
        </legend>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-800">
          <input
            type="radio"
            name="fast-plan-period-scalars-source"
            className="mt-0.5 shrink-0"
            checked={yearlyScalarSource === 'calculated'}
            onChange={() =>
              setYearlyPeriodSettings((p) => ({ ...p, periodScalarsSource: 'calculated' }))
            }
          />
          <span>
            <span className="font-semibold">Workout parameters (calculated)</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-gray-600">
              Uses saved goal tables, training level, and the current period slot above.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-800">
          <input
            type="radio"
            name="fast-plan-period-scalars-source"
            className="mt-0.5 shrink-0"
            checked={yearlyScalarSource === 'manual'}
            onChange={() =>
              setYearlyPeriodSettings((p) => ({ ...p, periodScalarsSource: 'manual' }))
            }
          />
          <span>
            <span className="font-semibold">My typed first → last period ranges</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-gray-600">
              Interpolates from every field below. All pause times, series, and reps cells must be filled
              before you run Automatic processing procedure.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="space-y-3 rounded-lg border border-sky-200 bg-white/70 p-3 text-xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              {
                key: 'sector',
                title: 'Pause (between series)',
                fromK: 'sectorPauseFrom' as const,
                toK: 'sectorPauseTo' as const,
              },
              {
                key: 'macroEx',
                title: 'Pause (between exercises)',
                fromK: 'macroExercisePauseFrom' as const,
                toK: 'macroExercisePauseTo' as const,
              },
              {
                key: 'macroEnd',
                title: 'Pause (between areas)',
                fromK: 'macroEndSectorPauseFrom' as const,
                toK: 'macroEndSectorPauseTo' as const,
              },
            ] as const
          ).map((row) => (
            <div key={row.key} className="rounded border border-sky-100 bg-white p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-900">{row.title}</div>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <input
                    type="text"
                    placeholder={'e.g. 1\'30"'}
                    className="min-w-[4.5rem] rounded border border-gray-300 px-1 py-0.5 font-mono text-sm"
                    aria-label={`${row.title}: start of first period`}
                    value={yearlyPeriodSettings[row.fromK] || ''}
                    onChange={(e) =>
                      setYearlyPeriodSettings((p) => ({ ...p, [row.fromK]: e.target.value }))
                    }
                  />
                  <span className="text-center text-[11px] font-semibold text-sky-900">1th period</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <input
                    type="text"
                    placeholder={'e.g. 2\'00"'}
                    className="min-w-[4.5rem] rounded border border-gray-300 px-1 py-0.5 font-mono text-sm"
                    aria-label={`${row.title}: end of last period`}
                    value={yearlyPeriodSettings[row.toK] || ''}
                    onChange={(e) =>
                      setYearlyPeriodSettings((p) => ({ ...p, [row.toK]: e.target.value }))
                    }
                  />
                  <span className="text-center text-[11px] font-semibold text-sky-900">last period</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2 text-xs text-gray-700">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="—"
                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-sm"
                  aria-label="Series at first period"
                  value={yearlyPeriodSettings.seriesProgressionFrom}
                  onChange={(e) =>
                    setYearlyPeriodSettings((p) => ({ ...p, seriesProgressionFrom: e.target.value }))
                  }
                />
                <span className="text-center text-[11px] font-semibold text-sky-900">1th period</span>
              </div>
              <span className="pt-1.5 text-gray-500" aria-hidden>
                →
              </span>
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="—"
                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-sm"
                  aria-label="Series at last period"
                  value={yearlyPeriodSettings.seriesProgressionTo}
                  onChange={(e) =>
                    setYearlyPeriodSettings((p) => ({ ...p, seriesProgressionTo: e.target.value }))
                  }
                />
                <span className="text-center text-[11px] font-semibold text-sky-900">last period</span>
              </div>
            </div>
            <span className="font-medium text-gray-900">Series From → To</span>
            <p className="max-w-md text-[10px] leading-snug text-gray-500">
              {yearlyManualRangesActive ? (
                <>
                  When you apply with <strong>My typed ranges</strong> selected, interpolated series are written to{' '}
                  <strong>each sector</strong> on this day.
                </>
              ) : (
                <>
                  Preview only while <strong>Workout parameters</strong> is selected. Switch to typed ranges and fill
                  all cells to drive series from this row.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-gray-700">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="—"
                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-sm"
                  aria-label="Reps at first period"
                  value={yearlyPeriodSettings.repsProgressionFrom}
                  onChange={(e) =>
                    setYearlyPeriodSettings((p) => ({ ...p, repsProgressionFrom: e.target.value }))
                  }
                />
                <span className="text-center text-[11px] font-semibold text-sky-900">1th period</span>
              </div>
              <span className="pt-1.5 text-gray-500" aria-hidden>
                →
              </span>
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  min={0}
                  max={99}
                  placeholder="—"
                  className="w-16 rounded border border-gray-300 px-1 py-0.5 text-sm"
                  aria-label="Reps at last period"
                  value={yearlyPeriodSettings.repsProgressionTo}
                  onChange={(e) =>
                    setYearlyPeriodSettings((p) => ({ ...p, repsProgressionTo: e.target.value }))
                  }
                />
                <span className="text-center text-[11px] font-semibold text-sky-900">last period</span>
              </div>
            </div>
            <span className="font-medium text-gray-900">Reps From → To</span>
          </div>
        </div>
      </div>

      <div className="rounded border border-sky-200 bg-white px-3 py-2 text-xs text-gray-800 space-y-2">
        <div className="font-semibold text-sky-900">
          Preview for period {workoutParamsPeriodPreview.cp} of {workoutParamsPeriodPreview.tp}
        </div>
        <div className="rounded border-2 border-rose-400 bg-rose-50/70 px-2.5 py-2 space-y-1.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-rose-900">
            From workout parameters (calculated)
          </div>
          <div className="text-[11px] leading-snug">
            Between series · Between exercises · Between areas:{' '}
            <span className="font-mono tabular-nums text-gray-900">
              {workoutParamsPeriodPreview.pauseSeriesLabel} · {workoutParamsPeriodPreview.pauseExercisesLabel} ·{' '}
              {workoutParamsPeriodPreview.pauseAreasLabel}
            </span>
          </div>
          <div className="text-[11px] leading-snug">
            <span className="font-mono tabular-nums text-gray-900">
              Series {workoutParamsPeriodPreview.totalSeries}
              {workoutParamsPeriodPreview.sessionDeltaPct !== 0 ? (
                <> ({workoutParamsPeriodPreview.baseVolume} + {workoutParamsPeriodPreview.sessionDeltaPct}%)</>
              ) : null}{' '}
              Repetitions {workoutParamsPeriodPreview.reps}
            </span>
            {!workoutParamsPeriodPreview.hasGoalParams ? (
              <span className="ml-1 text-rose-800">(defaults — save Hypertrophy under Workouts parameters)</span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-600">
        Run <strong>Automatic processing procedure</strong> to apply the selected method to this day&apos;s exercises.
      </p>
    </div>
  ) : null;

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
          : `Showing ${mg.label} only ${UI_EM_DASH} tap ${mg.label} again or ALL to show every area.`,
      );
    } else {
      const defaultSeries = defaultTotalSeriesForAddedSector(sectors);
      handleAddSector(templateFromMuscleGroup(mg, defaultSeries));
      if (exerciseListVisible) {
        setFastPlanCatalogFilterId(mg.id);
      }
      setFastPlanToolbarNotice(`${mg.label} added ${UI_EM_DASH} scroll down to fill exercise names or totals for this area.`);
    }
  };

  // â”€â”€ Success screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (saved) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-green-600 px-6 py-6 flex flex-col items-center gap-3">
            <CheckCircle className="w-14 h-14 text-white" />
            <h2 className="text-xl font-bold text-white text-center">GYM WEEKLY PLAN CREATED!</h2>
            <p className="text-green-100 text-sm text-center">
              {plan.daysCount} day{plan.daysCount !== 1 ? 's' : ''} Â· {totalSeries} total series
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1.5">
              <p className="font-bold text-amber-900">Next steps</p>
              <p>Open your <strong>Yearly Plan</strong>, select the target week, and apply each routine to the desired days.</p>
              <p>Your plan is saved locally as a <strong>template</strong> {UI_EM_DASH} reopen it anytime from the Plan Gym Week menu.</p>
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
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Routine name</span>
      <input
        type="text"
        value={activeDay.routineName || ''}
        onChange={e => setPlanDays(prev => prev.map((d, di) =>
          di === activeDayIdx ? { ...d, routineName: e.target.value } : d
        ))}
        placeholder="Unnamed"
        className="border border-gray-300 rounded px-2 py-0.5 text-sm font-medium text-gray-900 bg-white outline-none focus:border-blue-400 w-40 max-w-full"
      />
    </div>
  );

  const periodSelectorsEl = (
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
    const pyramidalRows = pyramidalTableRowsForGymSector(sec.totalSeries, sec.exercises.length, trainingLevel);
    const exerciseCount = exerciseCountForPyramidalSector(sec.totalSeries, sec.exercises.length, trainingLevel);
    const isPctMode = sec.typeByPercent ?? false;
    const pyramidalOpen = isPyramidalFormOpen(activeDayIdx, secIdx);

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
                  title="Assign random exercises from this muscle's catalog to every row, then randomize series order across rows"
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

          <div className="flex flex-wrap items-center gap-2 border-l border-cyan-200/80 pl-2 text-xs">
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
                  if (!v) setFastPlanCatalogFilterId(sec.sectorId);
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

        {pyramidalOpen && pyramidalRows > 0 ? (
          <div
            className="border-b border-blue-200 bg-blue-50/40 px-3 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-full max-w-[min(100%,36rem)] overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 bg-blue-100/80 px-3 py-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[13px] leading-none shrink-0" aria-hidden>💪</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-800 whitespace-nowrap">
                    REPS
                  </span>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-blue-200/80 px-1.5 py-0.5 text-[9px] font-bold text-blue-900 tabular-nums">
                    {exerciseCount > 0
                      ? `${pyramidalRows} × ${exerciseCount} ex. (${sec.totalSeries} total)`
                      : `${sec.totalSeries} series`}
                  </span>
                  <label className="flex shrink-0 cursor-pointer select-none items-center gap-1">
                    <input
                      type="checkbox"
                      checked={isPctMode}
                      onChange={(e) => setSectorTypeByPercent(secIdx, e.target.checked)}
                      className="h-3 w-3 shrink-0 rounded border-gray-400"
                    />
                    <span className="text-[10px] font-semibold text-red-600 whitespace-nowrap">
                      Type by %1MR
                    </span>
                  </label>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <select
                    value={sec.pyramidal}
                    onChange={(e) => setSectorPyramidalMode(secIdx, e.target.value as PyramidalMode)}
                    className="min-w-[7rem] rounded border border-gray-300 bg-white py-0.5 text-[11px]"
                  >
                    {PYRAMIDAL_MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <InfoRepsHelpButton onClick={() => setInfoRepsModalOpen(true)} />
                </div>
              </div>

              <div className="max-h-[220px] overflow-y-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead className="sticky top-0 z-[1] bg-gray-100">
                    <tr>
                      <th className="w-8 border border-gray-300 px-1 py-1 text-center">#</th>
                      <th className="border border-gray-300 px-1 py-1 text-center">Reps</th>
                      <th className="border border-gray-300 px-1 py-1 text-center whitespace-nowrap">% on 1 MR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: pyramidalRows }, (_, rowIdx) => {
                      const { reps: currentReps, raw: repsCellValue } = displayedPyramidalRepAt(sec, rowIdx);
                      const hasReps = repsCellValue !== '';
                      const pctRow = sec.seriesPcts?.[rowIdx];
                      const calcRepsFromPct =
                        isPctMode && pctRow != null && !Number.isNaN(pctRow)
                          ? repsFromPercentOf1Rm(pctRow, sec.pctFormulaIndex ?? 0)
                          : null;
                      const typedRepsParsed = (() => {
                        const t = String(repsCellValue).trim();
                        if (t === '') return null;
                        const p = parseInt(t, 10);
                        return Number.isNaN(p) ? null : p;
                      })();
                      const repsAboveCalc =
                        isPctMode &&
                        typedRepsParsed !== null &&
                        calcRepsFromPct !== null &&
                        typedRepsParsed > calcRepsFromPct;

                      return (
                        <tr key={rowIdx} className="hover:bg-blue-50/50">
                          <td className="border border-gray-300 px-2 py-1 text-center font-semibold bg-gray-50">
                            {rowIdx + 1}
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={repsCellValue}
                              placeholder="—"
                              onChange={(e) => updatePyramidalRepAtRow(secIdx, rowIdx, e.target.value)}
                              className={`w-full min-w-[2.5rem] px-1 py-0.5 border rounded text-center transition-colors placeholder:text-gray-300 ${
                                repsAboveCalc
                                  ? 'border-red-400 bg-red-50 text-red-700 font-bold'
                                  : 'border-gray-300'
                              }`}
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-1">
                            {isPctMode ? (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={2.5}
                                value={sec.seriesPcts?.[rowIdx] ?? (hasReps ? percentOf1RmFromReps(currentReps, sec.pctFormulaIndex ?? 0) : '')}
                                onChange={(e) => updatePyramidalPctAtRow(secIdx, rowIdx, e.target.value)}
                                className="w-full min-w-[2.5rem] px-1 py-0.5 border border-blue-400 bg-blue-50 rounded text-center text-blue-800 font-semibold"
                              />
                            ) : hasReps ? (
                              <span
                                className={`block text-center text-[11px] font-medium tabular-nums ${
                                  isLoadPctValidForReps(currentReps, sec.pctFormulaIndex ?? 0)
                                    ? 'text-gray-700'
                                    : 'text-red-600 font-bold'
                                }`}
                                title={getPct1RmFormulaLabel(sec.pctFormulaIndex ?? 0)}
                              >
                                {formatPercentLoad1MRFromReps(currentReps, sec.pctFormulaIndex ?? 0)}
                              </span>
                            ) : (
                              <span className="block text-center text-[11px] text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="flex items-center gap-1 bg-blue-50/80 px-2 py-1 text-[8px] leading-snug text-blue-600">
                <span className="inline-flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-sm bg-blue-600 text-[7px] font-bold text-white">i</span>
                <span>
                  Scroll for all {pyramidalRows} series per exercise ({sec.totalSeries} total area series). Use header{' '}
                  <strong>Recalc % 1RM</strong> for formulas A/B/C.
                </span>
              </p>
            </div>
          </div>
        ) : null}

        {exerciseListVisible ? (
          <div className="border-b border-yellow-200 bg-yellow-50/95 px-2 py-2 shadow-inner">
            <div className="mb-2 flex flex-wrap items-end gap-2">
              <label className="flex min-w-[140px] max-w-md flex-1 flex-col gap-0.5 text-[10px] font-semibold text-gray-800">
                Search catalog
                <input
                  type="search"
                  value={fastPlanCatalogSearch}
                  onChange={e => setFastPlanCatalogSearch(e.target.value)}
                  placeholder={`Filter by name${UI_ELLIPSIS}`}
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
                  <option value="">{`Free moves${UI_ELLIPSIS}`}</option>
                  {freeMoveExerciseList.map(fe => (
                    <option key={fe.id} value={fe.name}>
                      {fe.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="w-full text-[10px] leading-snug text-gray-700 sm:w-auto sm:flex-1">
                {fastPlanExercisePick?.secIdx === secIdx
                  ? `Applying to row ${fastPlanExercisePick.exIdx + 1} of ${sec.sectorLabel}.`
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
                {GYM_WEEK_CATALOG_EXERCISES.filter(e => e.groupId === sec.sectorId)
                  .filter(e => {
                    const q = fastPlanCatalogSearch.trim().toLowerCase();
                    return !q || e.name.toLowerCase().includes(q);
                  })
                  .map(ex => {
                    const nameKey = normalizeCatalogExerciseName(ex.name);
                    const onSameDay = catalogExerciseDayUsage.sameDay.has(nameKey);
                    const onOtherDay = !onSameDay && catalogExerciseDayUsage.otherDays.has(nameKey);
                    return (
                    <button
                      key={ex.id}
                      type="button"
                      title={ex.name}
                      onClick={() => {
                        if (!fastPlanExercisePick || fastPlanExercisePick.secIdx !== secIdx) {
                          setFastPlanExercisePick({ secIdx, exIdx: 0 });
                          setFastPlanToolbarNotice('Tap a table row first (# or Exercise cell), then pick an exercise.');
                          return;
                        }
                        updateExercise(fastPlanExercisePick.secIdx, fastPlanExercisePick.exIdx, 'name', ex.name);
                      }}
                      className="flex w-28 flex-shrink-0 flex-col items-stretch rounded-lg border-2 border-green-400 bg-white p-1 text-left hover:border-blue-500 hover:shadow-md"
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
                exerciseListVisible
                  ? exIdx % 2 === 0
                    ? 'bg-amber-50/70'
                    : 'bg-yellow-50/50'
                  : exIdx % 2 === 0
                    ? 'bg-white'
                    : 'bg-gray-50/50'
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
                  placeholder={UI_EM_DASH}
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

  const muscleFilterStrip = (
    <div className="mx-3 mb-3 rounded-xl border border-[#050a14] bg-[#0a1628] px-3 py-3 shadow-inner">
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
  );

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
            Back to manual editor
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

      {renderDayTabsRow('none')}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-3 py-2 text-xs">
        {activeGoalLabel ? (
          <span className="text-gray-800">
            Goal <strong className="text-gray-900">{activeGoalLabel}</strong>
          </span>
        ) : null}
        {routineNameEl}
        {periodSelectorsEl}
        <span className="text-[10px] text-gray-500">
          Apply source: <strong className="text-gray-800">{paramSourceLabel}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
        <button
          type="button"
          onClick={() => setShowWorkoutParamsPicker((v) => !v)}
          aria-expanded={showWorkoutParamsPicker}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 ${
            showWorkoutParamsPicker ? 'bg-sky-900 ring-2 ring-sky-400 ring-offset-1' : 'bg-sky-700'
          }`}
        >
          Select workout parameters for this day
        </button>
        <button type="button" onClick={() => setShowSeriesDist(true)}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900">
          Distribution settings
        </button>
        {planSeriesVisible ? (
          <button type="button" onClick={handleAutoProcess}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            <Settings className="h-4 w-4" />
            Automatic processing procedure
          </button>
        ) : null}
        <button type="button"
          className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500">
          <span className="text-base leading-none">≡</span> Preferences
        </button>
        <button
          type="button"
          onClick={cycleAllSectorsPctFormulaOnActiveDay}
          className="rounded-lg border border-violet-500 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 whitespace-nowrap"
          title={`Cycle %1RM formula for all sectors on this day. Current: ${getPct1RmFormulaLabel(activeDayPctFormulaIndex)}. Next: ${getPct1RmFormulaLabel(nextPct1RmFormulaIndex(activeDayPctFormulaIndex))}`}
        >
          Recalc % 1RM ({getPct1RmFormulaLabel(activeDayPctFormulaIndex).charAt(0)})
        </button>
        <button
          type="button"
          onClick={toggleAllPyramidalFormsOnActiveDay}
          className="rounded-lg border border-blue-500 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 whitespace-nowrap"
          title="Show or hide pyramidal reps tables for every sector on this day"
        >
          {activeDayAnyPyramidalFormOpen ? 'Hide Pyramidals' : 'Show Pyramidals'}
        </button>
      </div>

      {workoutParamsPickerPanel}

      {planSeriesVisible ? muscleFilterStrip : null}
    </div>
  );

  const scrollablePlanMain = (
    <>
      {exerciseListVisible ? (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2 text-[11px] leading-snug text-gray-700">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" aria-hidden />
          <span>
            Use the catalog below: tap a muscle to filter cards, focus a table row (# or Exercise), then tap a card or pick from your library. You can still type names and edit series per row.
          </span>
        </div>
      ) : null}
      {planSeriesVisible ? (
        <p className="mx-3 mt-3 rounded-lg border border-gray-300 bg-gray-50/90 px-3 py-2 text-[11px] leading-snug text-gray-700">
          Series column shows how sets are split across exercises (from your training level). Adjust totals with Distribution settings or each sector&apos;s Series/area.
        </p>
      ) : null}

      {fastPlanToolbarNotice ? (
        <p className="mx-3 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {fastPlanToolbarNotice}
        </p>
      ) : null}

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
      </div>

      <div className="mx-3 mb-4 overflow-hidden rounded-b-lg border border-gray-300 border-t-0">
        {(() => {
          if (filterSector) {
            return visibleSectors.map((sec) => {
              const secIdx = activeDay.sectors.findIndex((s) => s.sectorId === sec.sectorId);
              return (
                <React.Fragment key={sec.sectorId}>
                  {renderSectorBlock(sec, secIdx, null)}
                </React.Fragment>
              );
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
                    {(sortable) => renderSectorBlock(sec, secIdx, sortable)}
                  </SortableSectorShell>
                ))}
              </SortableContext>
            </DndContext>
          );
        })()}
      </div>

      <p className="mx-3 mb-4 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-snug text-sky-900">
        Scroll to view all repetitions. Each can have unique speed, time, and pause values.
        To add specific exercises, use Add Moveframe for each day in your workout plan.
      </p>
    </>
  );

  const planFooterBar = (
    <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t-2 border-gray-300 bg-gray-100 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleSave}
          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700">
          Create routines and movelaps
        </button>
        <button type="button" onClick={onClose}
          className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Cancel
        </button>
      </div>
    </div>
  );

  // â”€â”€ Main form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      {/* â”€â”€ Auto-process warning dialog â”€â”€ */}
      {showAutoWarn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-white mt-0.5" aria-hidden />
              <div>
                <h3 className="font-bold text-white text-base">Automatic processing procedure</h3>
                <p className="text-amber-100 text-xs mt-1">This action overwrites calculated fields for the current day</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {autoProcessInfoSections.mainParagraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  className={
                    idx === 0
                      ? 'text-sm text-gray-800 leading-relaxed whitespace-pre-wrap'
                      : 'text-xs text-gray-600 leading-relaxed whitespace-pre-wrap'
                  }
                >
                  {paragraph}
                </p>
              ))}
              {autoProcessInfoSections.warning ? (
                <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-3 py-2 whitespace-pre-wrap">
                  {autoProcessInfoSections.warning}
                </p>
              ) : null}
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

      {/* â”€â”€ Series distribution dialog â”€â”€ */}
      {showSeriesDist && (
        <SeriesDistDialog
          days={planDaysToManual(planDays)}
          initialDayIdx={activeDayIdx}
          constantSectorIds={new Set<string>()}
          sessionByDay={seriesDistSessionByDay}
          onSessionChange={handleSeriesDistSessionChange}
          onSave={handleSeriesDistSave}
          onClose={() => setShowSeriesDist(false)}
        />
      )}

      <InfoRepsModal
        open={infoRepsModalOpen}
        onClose={() => setInfoRepsModalOpen(false)}
        uiLanguage={language}
      />
    </>
  );
}
