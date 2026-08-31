'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import { X, ChevronUp, ChevronDown, ChevronsDown, Trash2, Settings, ChevronLeft, GripVertical, AlertTriangle } from 'lucide-react';
import {
  GOAL_OPTIONS,
  type GoalId,
  type TrainingLevel,
  clampWeeklyPlanDayCount,
  getPlanGymWeekTrainingLevelImageSrc,
  getPlanGymWeekTrainingLevelLabel
} from './PlanGymWeekModal';
import {
  buildHelpedRoutines,
  PLAN_GYM_WEEK_WIZARD_DEFAULT_SERIES_PER_SECTOR,
  PLAN_GYM_WEEK_WIZARD_DEFAULT_REPS,
  PLAN_GYM_WEEK_WIZARD_DEFAULT_PAUSE_LABEL,
  PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_EX_LABEL,
  PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_END_LABEL,
  type BuildHelpedRoutinesParams,
} from '@/utils/planGymWeekLogic';
import {
  getSeriesDistribution,
  trainingLevelToCategory,
} from '@/utils/seriesDistribution';
import {
  computePyramidalRepsSeries,
  type PyramidalMode
} from '@/utils/pyramidalReps';
import { UI_EM_DASH } from '@/utils/fixUtf8Mojibake';
import {
  percentOf1RmFromReps,
  repsFromPercentOf1Rm,
  formatPercentLoad1MRFromReps,
  isLoadPctValidForReps,
  getPct1RmFormulaLabel,
  nextPct1RmFormulaIndex,
  PCT_1RM_FORMULA_COUNT,
} from '../../../utils/percent1RmFormulas';
import { InfoRepsHelpButton } from '@/components/workouts/InfoRepsHelpButton';
import { InfoRepsModal } from '@/components/workouts/InfoRepsModal';
import {
  AUTO_PROCESS_INFO_DEFAULT_EN,
  fetchAutoProcessInfoText,
  parseAutoProcessInfoSections,
} from '../../../constants/autoProcessInfoLongText';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  FAST_PLANNER_REST_PAUSE_OPTIONS,
} from '@/constants/nutrition-food.constants';
import {
  readGoalParamsFromNutritionSettings,
  isGoalParamsSavedInNutritionSettings,
  interpolateByPeriod,
  computePlanGymWeekScalarDefaults,
  totalSeriesVolumeForPlan,
  volumeSeriesAtPeriod,
  readVolumeDeltaPctFromNutritionSettings,
  levelIndex,
} from '../../../utils/planGymWeekGoalScalars';
import {
  interpolatedPauseForPeriod,
  interpolatePeriodIntRounded,
  PLAN_YEAR_TOTAL_PERIODS_MAX,
  PLAN_YEAR_TOTAL_PERIODS_MIN,
  clampPlanYearPeriodPair,
} from '@/utils/planPeriodInterpolation';

// ─── constants ───────────────────────────────────────────────────────────────

const MUSCLE_GROUPS = [
  { id: 'shoulders',   label: 'Shoulders',   image: '/muscular/shoulders.png' },
  { id: 'biceps',      label: 'Biceps',      image: '/muscular/Biceps.png' },
  { id: 'triceps',     label: 'Triceps',     image: '/muscular/Triceps.png' },
  { id: 'forearms',    label: 'Forearms',    image: '/muscular/Forearms.png' },
  { id: 'chest',       label: 'Chest',       image: '/muscular/chest.png' },
  { id: 'abs',         label: 'Abdominals',  image: '/muscular/abs.png' },
  { id: 'trapezius',   label: 'Trapezius',   image: '/muscular/trapezius.png' },
  { id: 'lats',        label: 'Lats',        image: '/muscular/Lats.png' },
  { id: 'quadriceps',  label: 'Quadriceps',  image: '/muscular/quadriceps.png' },
  { id: 'hams',        label: 'Hamstrings',  image: '/muscular/hams.png' },
  { id: 'calves',      label: 'Calves',      image: '/muscular/calves.png' },
  { id: 'glutes',      label: 'Glutes',      image: '/muscular/glutes.png' },
];

/** Wizard Q4 stores `g.sector` labels (e.g. "Calves"); manual sectors use `sectorId` (e.g. "calves"). */
export function wizardConstantLabelsToSectorIds(raw: string[] | undefined | null): Set<string> {
  const out = new Set<string>();
  for (const c of raw ?? []) {
    const s = String(c).trim();
    if (!s) continue;
    const g = MUSCLE_GROUPS.find(
      (m) => m.id === s || m.label.toLowerCase() === s.toLowerCase()
    );
    out.add(g ? g.id : s.toLowerCase());
  }
  return out;
}

const SECTOR_REORDER_DRAG_MIME = 'application/x-movesbook-sector-reorder';

const PAUSE_OPTIONS = FAST_PLANNER_REST_PAUSE_OPTIONS;

/** Select value meaning row pause follows header + exercise-block calculation. */
const SERIES_ROW_PAUSE_INHERIT = '__inherit__';

const PYRAMIDAL_OPTIONS: { value: PyramidalMode; label: string }[] = [
  { value: 'flat',       label: 'Flat (default)' },
  { value: 'ascending',  label: 'Ascendent' },
  { value: 'descending', label: 'Descendent' },
  { value: 'mix',        label: 'Mixed' },
];

function repsToPercent(reps: number): number {
  return Math.max(0, parseFloat((100 - reps * 2.5).toFixed(1)));
}

function percentToReps(pct: number): number {
  return Math.max(1, Math.round((100 - pct) / 2.5));
}

function parsePauseToSec(p: string): number {
  if (!p || p === '0') return 0;
  const minMatch = p.match(/(\d+)'/);
  const secMatch = p.match(/(\d+)"/);
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
  return mins * 60 + secs;
}

function secToPauseStr(s: number): string {
  if (s <= 0) return '0';
  if (s < 60) return `${s}"`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (sec === 0) return `${m}'`;
  return `${m}'${String(sec).padStart(2, '0')}"`;
}

function avgPauseStr(pauses: string[]): string {
  if (!pauses.length) return "0'00\"";
  const avg = pauses.reduce((s, p) => s + parsePauseToSec(p), 0) / pauses.length;
  const m = Math.floor(avg / 60);
  const s = Math.round(avg % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** Reps for day-level stats: table raw first; else per-row seriesReps (not sector header `reps`). */
function rowRepsForDayStats(sec: ManualDaySector, rowIdx: number): number {
  return displayedSeriesRepAt(sec, rowIdx).reps;
}

/** Same value shown in the Reps column (raw string + parsed number). */
function displayedSeriesRepAt(sec: ManualDaySector, rowIdx: number): { reps: number; raw: string } {
  const rawStored = sec.seriesRepsRaw?.[rowIdx] ?? '';
  if (rawStored.trim() !== '') {
    const p = parseInt(rawStored.trim(), 10);
    if (!Number.isNaN(p) && p > 0) {
      return { reps: Math.max(1, Math.min(99, p)), raw: rawStored.trim() };
    }
  }
  const r = sec.seriesReps?.[rowIdx];
  if (typeof r === 'number' && !Number.isNaN(r) && r > 0) {
    return { reps: r, raw: String(r) };
  }
  return { reps: 0, raw: '' };
}

/** Pause for day-level stats: explicit row value, else computed default for that row. */
function rowPauseStrForDayStats(
  sec: ManualDaySector,
  rowIdx: number,
  trainingLevel: TrainingLevel | null | undefined,
): string {
  const v = sec.seriesRowPauses?.[rowIdx];
  if (v != null && String(v).trim() !== '') return String(v).trim();
  const d = computedPauseForSeriesRowIndex(sec, rowIdx, trainingLevel);
  return d !== '' ? d : '0';
}

function avgHeaderPauseFromSectors(
  sectors: ManualDaySector[],
  key: 'pause' | 'macroExercise' | 'macroEndOfSector',
): string {
  const vals = sectors
    .map((s) => String(s[key] ?? '').trim())
    .filter((v) => v !== '' && v !== '-');
  if (!vals.length) return '';
  return avgPauseStr(vals);
}

/** Day-level averages (stats bar) used when inserting a new muscular area. */
function dayStatsForNewSectorDefaults(
  day: ManualDayPlan,
  trainingLevel: TrainingLevel | null | undefined,
) {
  const sectors = day.sectors.filter((s) => (s.series ?? 0) > 0);
  if (!sectors.length) return null;

  const sumSeries = sectors.reduce((s, sec) => s + sec.series, 0);
  const avgSeries = Math.max(1, Math.min(20, Math.round(sumSeries / sectors.length)));

  const allReps: number[] = [];
  const allPauses: string[] = [];
  for (const sec of sectors) {
    const n = Math.max(0, Math.min(20, sec.series));
    for (let i = 0; i < n; i++) {
      allReps.push(rowRepsForDayStats(sec, i));
      allPauses.push(rowPauseStrForDayStats(sec, i, trainingLevel));
    }
  }
  const repsForAvg = allReps.filter((r) => r > 0);
  const avgReps = repsForAvg.length
    ? Math.max(1, Math.min(99, Math.round(repsForAvg.reduce((a, b) => a + b, 0) / repsForAvg.length)))
    : PLAN_GYM_WEEK_WIZARD_DEFAULT_REPS;

  const rowPauses = allPauses.filter((p) => p && p !== '0');
  const breakAvg = rowPauses.length ? avgPauseStr(rowPauses) : PLAN_GYM_WEEK_WIZARD_DEFAULT_PAUSE_LABEL;

  return {
    avgSeries,
    avgReps,
    pause: avgHeaderPauseFromSectors(sectors, 'pause') || breakAvg,
    macroExercise:
      avgHeaderPauseFromSectors(sectors, 'macroExercise') || PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_EX_LABEL,
    macroEndOfSector:
      avgHeaderPauseFromSectors(sectors, 'macroEndOfSector') || PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_END_LABEL,
  };
}

type CalculatedSectorScalars = {
  reps: number;
  pauseSeries: string;
  pauseExercises: string;
  pauseAreas: string;
};

function buildNewSectorFromDayAverages(
  group: { id: string; label: string; image: string },
  day: ManualDayPlan,
  trainingLevel: TrainingLevel | null | undefined,
  calculatedScalars?: CalculatedSectorScalars | null,
): ManualDaySector {
  const stats = dayStatsForNewSectorDefaults(day, trainingLevel);
  const series = stats?.avgSeries ?? PLAN_GYM_WEEK_WIZARD_DEFAULT_SERIES_PER_SECTOR;
  const reps = calculatedScalars?.reps ?? stats?.avgReps ?? PLAN_GYM_WEEK_WIZARD_DEFAULT_REPS;
  const pause = calculatedScalars?.pauseSeries ?? stats?.pause ?? PLAN_GYM_WEEK_WIZARD_DEFAULT_PAUSE_LABEL;
  const macroExercise =
    calculatedScalars?.pauseExercises ?? stats?.macroExercise ?? PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_EX_LABEL;
  const macroEndOfSector =
    calculatedScalars?.pauseAreas ?? stats?.macroEndOfSector ?? PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_END_LABEL;

  let sec: ManualDaySector = {
    sectorId: group.id,
    sectorLabel: group.label,
    image: group.image,
    exercises: 0,
    series: 0,
    reps,
    pause,
    macroExercise,
    macroEndOfSector,
    pyramidal: 'flat',
    seriesReps: [],
    seriesRepsRaw: [],
    seriesWeights: [],
    typeByPercent: false,
    seriesPcts: [],
    seriesRowPauses: [],
    seriesRowAlerts: [],
  };
  sec = applySectorScalarUpdate(sec, 'series', String(series), trainingLevel);
  sec = applySectorScalarUpdate(sec, 'reps', String(reps), trainingLevel);
  sec = syncSectorPausesFromHeader(sec, trainingLevel);
  sec = syncSectorExercisesFromLevelTable(sec, trainingLevel);
  return ensureManualSectorShape(sec);
}

// ─── interfaces ──────────────────────────────────────────────────────────────

export interface ManualDaySector {
  sectorId:          string;
  sectorLabel:       string;
  image:             string;
  /** Exercise count from `getSeriesDistribution` / level table — always derived from `series` + training level. */
  exercises:         number;
  /** Count of series in this area — set only via Series distribution settings (or full-day auto / rescan), not edited per sector. */
  series:            number;
  reps:              number;
  /** Pause between series (sets); drives per-set row pauses when applied. */
  pause:             string;
  /** Pause between exercises in this sector; calculated / applied from workout parameters (read-only in manual UI). */
  macroExercise:     string;
  /** Pause between muscular areas (after this sector); calculated / applied from workout parameters (read-only in manual UI). */
  macroEndOfSector:  string;
  pyramidal:         PyramidalMode;
  seriesReps:        number[];
  seriesWeights:     string[];
 
  seriesRepsRaw?:    string[];
  /** Index into %1RM formula table (Tools); defaults to 0. */
  pctFormulaIndex?:  number;
  typeByPercent?:    boolean;
  seriesPcts?:       number[];
  /** Per-series pause; empty = follow calculated default (between-series / macro exercise / macro end by row). */
  seriesRowPauses?:  string[];
  /** Per-series notes / alert (e.g. RPE, cues) */
  seriesRowAlerts?:  string[];
}

function sectorPctFromReps(sec: ManualDaySector, reps: number): number {
  const fi = sec.pctFormulaIndex ?? 0;
  return percentOf1RmFromReps(reps, fi);
}

function sectorRepsFromPct(sec: ManualDaySector, pct: number): number {
  const fi = sec.pctFormulaIndex ?? 0;
  return repsFromPercentOf1Rm(pct, fi);
}

/** Recompute every row's % from current Reps values using the given formula index. */
function recalcSectorSeriesPctsFromReps(
  sec: ManualDaySector,
  formulaIndex: number,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  const fi = ((formulaIndex % PCT_1RM_FORMULA_COUNT) + PCT_1RM_FORMULA_COUNT) % PCT_1RM_FORMULA_COUNT;
  const base = { ...sec, pctFormulaIndex: fi };
  const seriesPcts = Array.from({ length: n }, (_, i) => {
    const { reps } = displayedSeriesRepAt(sec, i);
    return reps > 0 ? sectorPctFromReps(base, reps) : 0;
  });
  return { ...base, seriesPcts };
}

export interface ManualDayPlan {
  routineName: string;
  sectors:     ManualDaySector[];
}

export type YearlyPeriodScalarsSource = 'calculated' | 'manual';

/** Declares how many macro periods the yearly plan has and which period this week belongs to; drives From→To interpolation. */
export interface PlanGymWeekYearlyPeriodSettings {
  totalPeriods: number;
  currentPeriod: number;
  /** Whether sector pause/reps (and series when using manual ranges) come from workout parameters or from typed first→last ranges. */
  periodScalarsSource: YearlyPeriodScalarsSource;
  sectorPauseFrom: string;
  sectorPauseTo: string;
  macroExercisePauseFrom: string;
  macroExercisePauseTo: string;
  macroEndSectorPauseFrom: string;
  macroEndSectorPauseTo: string;
  /** Empty = skip applying series interpolation */
  seriesProgressionFrom: string;
  seriesProgressionTo: string;
  repsProgressionFrom: string;
  repsProgressionTo: string;
  /** Empty = skip — maps to Circuit planner Continuous Time “Minutes of work” (1–9 min per serie), not Macro/Rip digits */
  minutesOfWorkProgressionFrom: string;
  minutesOfWorkProgressionTo: string;
}

export function defaultPlanGymWeekYearlyPeriodSettings(): PlanGymWeekYearlyPeriodSettings {
  const { totalPeriods, currentPeriod } = clampPlanYearPeriodPair(6, 1);
  return {
    totalPeriods,
    currentPeriod,
    periodScalarsSource: 'calculated',
    sectorPauseFrom: "1'",
    sectorPauseTo: "2'",
    macroExercisePauseFrom: "2'",
    macroExercisePauseTo: "3'",
    macroEndSectorPauseFrom: "3'",
    macroEndSectorPauseTo: "4'",
    seriesProgressionFrom: '',
    seriesProgressionTo: '',
    repsProgressionFrom: '',
    repsProgressionTo: '',
    minutesOfWorkProgressionFrom: '',
    minutesOfWorkProgressionTo: '',
  };
}

/** All manual first→last cells required before applying when `periodScalarsSource === 'manual'`. */
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

export interface PlanGymWeekManualResult {
  daysCount: number;
  days:      ManualDayPlan[];
  yearlyPeriodSettings?: PlanGymWeekYearlyPeriodSettings;
  /** Athlete training level from the wizard — preserved when navigating manual ↔ fast plan. */
  trainingLevel?: TrainingLevel | null;
}

/**
 * Manual pick for constant (if that muscle is on the day) wins; else first wizard constant present on the day.
 */
export function constantSectorIdsForDistributionDay(
  day: ManualDayPlan | undefined,
  wizardConstantIds: Set<string>,
  manualSectorId: string | null
): Set<string> {
  const secs = day?.sectors ?? [];
  const out = new Set<string>();
  if (manualSectorId && secs.some((s) => s.sectorId === manualSectorId)) {
    out.add(manualSectorId);
    return out;
  }
  for (const sec of secs) {
    if (wizardConstantIds.has(sec.sectorId) || wizardConstantIds.has(sec.sectorLabel)) {
      out.add(sec.sectorId);
      break;
    }
  }
  return out;
}

/** Default total series for the distribution mask from training level, workouts/week, and goal. */
export function suggestedRoutineTotalSeriesForDistMask(params: {
  trainingLevel: TrainingLevel | null | undefined;
  daysCount: number;
  goalId: GoalId | undefined;
  currentPeriod?: number;
  totalPeriods?: number;
}): number {
  const d = Math.min(6, Math.max(1, params.daysCount || 1));
  const fromSettings = readGoalParamsFromNutritionSettings(params.goalId);
  const curPeriod = Math.max(1, Math.floor(params.currentPeriod ?? 1));
  const totalPeriods = Math.max(curPeriod, Math.floor(params.totalPeriods ?? 1));
  const adjusted = totalSeriesVolumeForPlan({
    goalSettings: fromSettings,
    trainingLevel: params.trainingLevel,
    daysCount: d,
    currentPeriod: curPeriod,
    totalPeriods,
  });
  if (adjusted > 0) {
    return adjusted;
  }
  const level = params.trainingLevel;
  let base = 36;
  if (level === 'beginner') base = 30;
  else if (level === 'intermediate') base = 34;
  else if (level === 'advanced') base = 38;
  else if (level === 'elite') base = 40;
  else if (level === 'professional') base = 44;
  if (d <= 2) base = Math.round(base * 1.1);
  else if (d >= 5) base = Math.round(base * 0.92);
  const g = params.goalId;
  if (g === 'max_strength') base = Math.round(base * 0.88);
  else if (g === 'hypertrophy' || g === 'endurance') base = Math.round(base * 1.06);
  else if (g === 'fat_loss') base = Math.round(base * 1.02);
  return Math.max(16, Math.min(100, base));
}

export interface LastWorkoutSummary {
  date:          string;
  totalSeries:   number;
  aveRepsPerSet: number;
  totalReps:     number;
  pause:         string;
  /** Average pause per set across laps (for overview line). */
  avePausePerSet: string;
  /** Plan week the stats came from (when `weekNumber` exists on the plan). */
  planWeekLabel?: string;
}

export type NutritionPlanForLast = {
  weeks?: Array<{
    weekNumber?: number;
    days?: Array<{
      date?: string;
      workouts?: Array<{
        nutritionFoods?: Array<{
          nutritionComponents?: Array<{
            muscularSector?: string | null;
            sector?:         string | null;
            reps?:           number | string | null;
            pause?:          string | null;
          }>;
        }>;
      }>;
      meals?: Array<{
        nutritionFoods?: Array<{
          nutritionComponents?: Array<{
            muscularSector?: string | null;
            sector?:         string | null;
            reps?:           number | string | null;
            pause?:          string | null;
          }>;
        }>;
      }>;
    }>;
  }>;
} | null;

export type PlanGymWeekRescanParams = Omit<BuildHelpedRoutinesParams, 'constantSectorsAtBeginning'>;

// ─── sector normalization ────────────────────────────────────────────────────

function resizeSeriesWeights(w: string[] | undefined, len: number): string[] {
  const out = [...(w ?? [])];
  while (out.length < len) out.push('');
  out.length = len;
  return out;
}

function resizeSeriesRepsRaw(raw: string[] | undefined, len: number): string[] {
  const out = [...(raw ?? [])];
  while (out.length < len) out.push('');
  out.length = len;
  return out;
}

function resizeSeriesRowStrings(arr: string[] | undefined, len: number): string[] {
  const out = [...(arr ?? [])];
  while (out.length < len) out.push('');
  out.length = len;
  return out;
}

/** Per-row series reps when reps>0; otherwise zeros so table cells stay blank until user enters raw reps */
function computeSeriesRepsBulk(reps: number, series: number, pyramidal: PyramidalMode): number[] {
  if (series <= 0) return [];
  if (reps <= 0) return Array.from({ length: series }, () => 0);
  return computePyramidalRepsSeries(reps, series, pyramidal);
}

/** Recompute every series row from header reps + pyramidal mode; sync display raw strings. */
function syncSectorRepsFromHeader(
  sec: ManualDaySector,
  reps: number,
  rawTop?: string,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  const seriesReps = computeSeriesRepsBulk(reps, n, pyramidal);
  const fi = sec.pctFormulaIndex ?? 0;
  const seriesPcts = sec.typeByPercent
    ? seriesReps.map((r) => percentOf1RmFromReps(r, fi))
    : seriesReps.map(repsToPercent);
  const topRaw = rawTop != null ? rawTop.trim() : '';
  const seriesRepsRaw = seriesReps.map((r, i) => {
    if (i === 0 && topRaw !== '' && reps > 0) return topRaw;
    return r > 0 ? String(r) : '';
  });
  return {
    ...sec,
    reps,
    seriesReps,
    seriesPcts,
    seriesRepsRaw,
    seriesWeights: resizeSeriesWeights(sec.seriesWeights, n),
  };
}

/** Apply header Pause to every series row (explicit values when header is set). */
function syncSectorPausesFromHeader(
  sec: ManualDaySector,
  trainingLevel?: TrainingLevel | null,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0) return sec;
  const pauseVal = String(sec.pause ?? '').trim();
  if (pauseVal !== '') {
    return { ...sec, seriesRowPauses: Array.from({ length: n }, () => pauseVal) };
  }
  if (trainingLevel != null) {
    return { ...sec, seriesRowPauses: materializeSeriesRowPausesForHeaders(sec, trainingLevel) };
  }
  return { ...sec, seriesRowPauses: Array.from({ length: n }, () => '0"') };
}

function patchSingleSeriesRepRow(
  sec: ManualDaySector,
  rowIdx: number,
  raw: string,
  repsValue: number,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, n);
  seriesRepsRaw[rowIdx] = raw;
  const seriesReps = [...(sec.seriesReps ?? [])];
  while (seriesReps.length < n) seriesReps.push(0);
  seriesReps.length = n;
  seriesReps[rowIdx] = repsValue;
  const seriesPcts = [...(sec.seriesPcts ?? [])];
  while (seriesPcts.length < n) seriesPcts.push(0);
  seriesPcts.length = n;
  seriesPcts[rowIdx] = sec.typeByPercent
    ? sectorPctFromReps(sec, repsValue)
    : repsToPercent(repsValue);
  return { ...sec, seriesReps, seriesRepsRaw, seriesPcts };
}

/** % mode row 2+: manual reps edit — do not recalc that row's % or any other row. */
function patchSeriesRepRowPctModeManual(
  sec: ManualDaySector,
  rowIdx: number,
  raw: string,
  repsValue: number,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, n);
  seriesRepsRaw[rowIdx] = raw;
  const seriesReps = [...(sec.seriesReps ?? [])];
  while (seriesReps.length < n) seriesReps.push(0);
  seriesReps.length = n;
  seriesReps[rowIdx] = repsValue;
  return { ...sec, seriesReps, seriesRepsRaw };
}

/**
 * % mode: row-1 % (or reps) is the pyramid anchor — recalc every row's reps + % from pyramidal mode.
 * Updates header `reps` to the row-1 base reps derived from row-1 %.
 */
function syncSectorPyramidalFromFirstRowPct(
  sec: ManualDaySector,
  row0Pct?: number,
  row0RepsRaw?: string,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0) return sec;

  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  const fi = sec.pctFormulaIndex ?? 0;

  const pct0 =
    row0Pct != null && !Number.isNaN(row0Pct)
      ? Math.max(0, Math.min(100, row0Pct))
      : sec.seriesPcts?.[0] != null && !Number.isNaN(sec.seriesPcts[0])
        ? sec.seriesPcts[0]
        : sectorPctFromReps(sec, sec.seriesReps?.[0] ?? sec.reps ?? 12);

  const baseReps = sectorRepsFromPct(sec, pct0);
  const seriesReps = computePyramidalRepsSeries(baseReps, n, pyramidal);
  if (seriesReps.length > 0) seriesReps[0] = baseReps;

  const seriesPcts = seriesReps.map((r) => percentOf1RmFromReps(r, fi));
  seriesPcts[0] = pct0;

  const seriesRepsRaw = seriesReps.map((r, i) => {
    if (i === 0 && row0RepsRaw != null && row0RepsRaw.trim() !== '') return row0RepsRaw.trim();
    return r > 0 ? String(r) : '';
  });

  return {
    ...sec,
    reps: baseReps,
    seriesReps,
    seriesPcts,
    seriesRepsRaw,
  };
}

/** % mode: row-1 reps typed — update row-1 % then cascade all rows per pyramidal. */
function syncSectorPyramidalFromFirstRowReps(
  sec: ManualDaySector,
  baseReps: number,
  row0RepsRaw: string,
): ManualDaySector {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0) return sec;

  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  const fi = sec.pctFormulaIndex ?? 0;
  const v = Math.max(1, Math.min(99, baseReps));
  const pct0 = percentOf1RmFromReps(v, fi);

  const seriesReps = computePyramidalRepsSeries(v, n, pyramidal);
  if (seriesReps.length > 0) seriesReps[0] = v;

  const seriesPcts = seriesReps.map((r) => percentOf1RmFromReps(r, fi));
  seriesPcts[0] = pct0;

  const seriesRepsRaw = seriesReps.map((r, i) =>
    i === 0 ? row0RepsRaw.trim() : r > 0 ? String(r) : '',
  );

  return {
    ...sec,
    reps: v,
    seriesReps,
    seriesPcts,
    seriesRepsRaw,
  };
}

export function ensureManualSectorShape(sec: ManualDaySector): ManualDaySector {
  const series = Math.max(0, Math.min(20, sec.series ?? 0));
  const reps   = Math.max(0, Math.min(99, sec.reps ?? 0));
  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  let seriesReps = sec.seriesReps;
  if (!Array.isArray(seriesReps) || seriesReps.length !== series) {
    seriesReps = computeSeriesRepsBulk(reps, series, pyramidal);
  }
  let seriesWeights = sec.seriesWeights;
  if (!Array.isArray(seriesWeights) || seriesWeights.length !== series) {
    seriesWeights = Array.from({ length: series }, (_, i) =>
      sec.seriesWeights?.[i] != null ? String(sec.seriesWeights[i]) : ''
    );
  }
  const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, series);
  const typeByPercent = sec.typeByPercent ?? false;
  let seriesPcts = sec.seriesPcts;
  if (!Array.isArray(seriesPcts) || seriesPcts.length !== series) {
    seriesPcts = seriesReps.map(repsToPercent);
  }
  let seriesRowPauses = sec.seriesRowPauses;
  if (!Array.isArray(seriesRowPauses) || seriesRowPauses.length !== series) {
    seriesRowPauses = resizeSeriesRowStrings(sec.seriesRowPauses, series);
  }
  let seriesRowAlerts = sec.seriesRowAlerts;
  if (!Array.isArray(seriesRowAlerts) || seriesRowAlerts.length !== series) {
    seriesRowAlerts = resizeSeriesRowStrings(sec.seriesRowAlerts, series);
  }
  let exercises = Math.max(0, Math.min(20, sec.exercises ?? 0));
  if (series > 0 && exercises <= 0) {
    exercises = 1;
  } else if (series <= 0) {
    exercises = 0;
  }
  return {
    ...sec,
    exercises,
    series, reps, pyramidal, seriesReps, seriesRepsRaw, seriesWeights, typeByPercent, seriesPcts,
    seriesRowPauses, seriesRowAlerts,
  };
}

/** Exercise count from the series distribution table (training level × total series). */
function sectorExercisesCount(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined,
): number {
  if (sec.series <= 0) return 0;
  return exercisesFromLevelTable(sec.series, trainingLevel);
}

/** Exercises count per muscular area from `DIST_TABLE` in seriesDistribution.ts (level low/mid/high from athlete training level). */
function exercisesFromLevelTable(
  series: number,
  trainingLevel: TrainingLevel | null | undefined
): number {
  if (series <= 0) return 0;
  const dist = getSeriesDistribution(series, trainingLevelToCategory(trainingLevel));
  return Math.min(20, dist.length);
}

function syncSectorExercisesFromLevelTable(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined
): ManualDaySector {
  if (sec.series <= 0) return { ...sec, exercises: 0 };
  const ex = exercisesFromLevelTable(sec.series, trainingLevel);
  return { ...sec, exercises: ex };
}

/**
 * Per-table-row pause from sector headers + `getSeriesDistribution` exercise blocks:
 * within an exercise → `pause` (between series); last set of a non-final exercise → `macroExercise`;
 * last set of the final exercise in the area → `macroEndOfSector`.
 */
function computedPauseForSeriesRowIndex(
  sec: ManualDaySector,
  rowIdx: number,
  trainingLevel: TrainingLevel | null | undefined,
): string {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0 || rowIdx < 0 || rowIdx >= n) return '';
  const dist = getSeriesDistribution(n, trainingLevelToCategory(trainingLevel));
  const sum = dist.reduce((a, b) => a + b, 0);
  if (sum !== n) {
    return String(sec.pause ?? '').trim();
  }
  let start = 0;
  for (let ex = 0; ex < dist.length; ex++) {
    const len = dist[ex];
    const endRow = start + len - 1;
    if (rowIdx >= start && rowIdx <= endRow) {
      if (rowIdx < endRow) {
        return String(sec.pause ?? '').trim();
      }
      if (ex < dist.length - 1) {
        return String(sec.macroExercise ?? '').trim();
      }
      return String(sec.macroEndOfSector ?? '').trim();
    }
    start += len;
  }
  return String(sec.pause ?? '').trim();
}

function materializeSeriesRowPausesForHeaders(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined,
): string[] {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const v = computedPauseForSeriesRowIndex(sec, i, trainingLevel);
    return v !== '' ? v : '0"';
  });
}

function ensureManualDayPlan(day: ManualDayPlan): ManualDayPlan {
  return { ...day, sectors: day.sectors.map(ensureManualSectorShape) };
}

// ─── sector scalar updates ───────────────────────────────────────────────────

type SectorScalarField =
  | 'exercises' | 'series' | 'reps' | 'pause'
  | 'macroExercise' | 'macroEndOfSector' | 'pyramidal';

function applySectorScalarUpdate(
  sec: ManualDaySector,
  field: SectorScalarField,
  value: number | string,
  trainingLevel?: TrainingLevel | null,
): ManualDaySector {
  const str = String(value).trim();
  if (field === 'exercises') {
    if (str === '') return { ...sec, exercises: 0 };
    const n = parseInt(str, 10);
    if (Number.isNaN(n)) return sec;
    const series = Math.max(0, Math.min(20, sec.series ?? 0));
    if (series <= 0) return { ...sec, exercises: 0 };
    const exercises = Math.max(1, Math.min(series, Math.min(20, n)));
    return { ...sec, exercises };
  }
  if (field === 'series') {
    if (str === '' || str === '-') {
      return {
        ...sec,
        series: 0,
        seriesReps: [],
        seriesPcts: [],
        seriesWeights: [],
        seriesRepsRaw: [],
        seriesRowPauses: [],
        seriesRowAlerts: [],
      };
    }
    const parsed = parseInt(str, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return {
        ...sec,
        series: 0,
        seriesReps: [],
        seriesPcts: [],
        seriesWeights: [],
        seriesRepsRaw: [],
        seriesRowPauses: [],
        seriesRowAlerts: [],
      };
    }
    const oldSeries = Math.max(0, Math.min(20, sec.series ?? 0));
    const series = Math.max(1, Math.min(20, parsed));
    const exercisesOut =
      series > 0 ? exercisesFromLevelTable(series, trainingLevel) : 0;
    let merged: ManualDaySector = {
      ...sec,
      series,
      exercises: exercisesOut,
      seriesWeights: resizeSeriesWeights(sec.seriesWeights, series),
      seriesRowAlerts: resizeSeriesRowStrings(sec.seriesRowAlerts, series),
    };
    merged = syncSectorRepsFromHeader(
      merged,
      sec.reps > 0 ? sec.reps : 0,
      sec.reps > 0 ? String(sec.reps) : undefined,
    );
    if (merged.typeByPercent) {
      merged = syncSectorPyramidalFromFirstRowPct(merged);
    }
    merged = syncSectorPausesFromHeader(merged, trainingLevel);
    if (trainingLevel == null) {
      const sectorPause = String(sec.pause ?? '').trim();
      if (series > oldSeries && sectorPause && merged.seriesRowPauses) {
        const seriesRowPauses = [...merged.seriesRowPauses];
        for (let i = oldSeries; i < series; i++) {
          if (!seriesRowPauses[i]?.trim()) seriesRowPauses[i] = sectorPause;
        }
        merged = { ...merged, seriesRowPauses };
      }
    }
    return merged;
  }
  if (field === 'reps') {
    if (str === '') {
      if (sec.typeByPercent) return { ...sec, reps: 0 };
      return syncSectorRepsFromHeader(sec, 0);
    }
    const reps = Math.max(0, Math.min(99, parseInt(str, 10) || 0));
    /** % mode: header Reps is reference only — only row-1 % cascades to other series. */
    if (sec.typeByPercent) return { ...sec, reps };
    return syncSectorRepsFromHeader(sec, reps, str);
  }
  if (field === 'pyramidal') {
    const pyramidal = String(value) as PyramidalMode;
    if (sec.typeByPercent) {
      return syncSectorPyramidalFromFirstRowPct({ ...sec, pyramidal });
    }
    const base = sec.reps > 0 ? sec.reps : 0;
    return syncSectorRepsFromHeader(
      { ...sec, pyramidal },
      base,
      base > 0 ? String(base) : undefined,
    );
  }
  if (field === 'pause') {
    const nextSec: ManualDaySector = { ...sec, pause: str };
    return syncSectorPausesFromHeader(nextSec, trainingLevel);
  }
  if (field === 'macroExercise' || field === 'macroEndOfSector') {
    const nextSec: ManualDaySector = { ...sec, [field]: str } as ManualDaySector;
    if (trainingLevel != null && sec.series > 0) {
      return syncSectorPausesFromHeader(nextSec, trainingLevel);
    }
    return nextSec;
  }
  return sec;
}

// ─── workout parameters → sector scalars (reps + pauses) by level & yearly period ───

// ─── workout parameters → sector scalars (reps + pauses) by level & yearly period ───

function applyComputedScalarsToManualSector(
  sec: ManualDaySector,
  scalars: ReturnType<typeof computePlanGymWeekScalarDefaults>,
  trainingLevel: TrainingLevel | null | undefined,
): ManualDaySector {
  const defaultReps = scalars.defaultReps;
  let s: ManualDaySector = {
    ...sec,
    pause: scalars.defaultPauseLabel,
    macroExercise: scalars.defaultMacroExerciseLabel,
    macroEndOfSector: scalars.defaultMacroEndSectorLabel,
  };
  s = applySectorScalarUpdate(s, 'reps', String(defaultReps));
  s = syncSectorExercisesFromLevelTable(s, trainingLevel);
  s = ensureManualSectorShape(s);
  const n = Math.max(0, Math.min(20, s.series ?? 0));
  if (n <= 0) {
    return {
      ...s,
      seriesReps: [],
      seriesRepsRaw: [],
      seriesWeights: [],
      seriesPcts: [],
      seriesRowPauses: [],
      seriesRowAlerts: [],
    };
  }
  const rebuiltSeriesReps = computeSeriesRepsBulk(s.reps, n, s.pyramidal);
  const rebuiltSeriesRepsRaw = rebuiltSeriesReps.map((r) => (r > 0 ? String(r) : ''));
  return {
    ...s,
    seriesReps: rebuiltSeriesReps,
    seriesRepsRaw: rebuiltSeriesRepsRaw,
    seriesWeights: Array.from({ length: n }, () => ''),
    seriesPcts: rebuiltSeriesReps.map((r) => percentOf1RmFromReps(r, s.pctFormulaIndex ?? 0)),
    seriesRowPauses: materializeSeriesRowPausesForHeaders(s, trainingLevel),
    seriesRowAlerts: Array.from({ length: n }, () => ''),
  };
}

/** Derive distribution % from each sector’s current series counts (or equal / constant-sector defaults when unset). */
function initialDistributionPctsForSectors(
  secs: ManualDaySector[],
  constantIds: Set<string>,
): number[] {
  const n = secs.length;
  if (n === 0) return [];
  const cIdx = secs.findIndex(
    (s) => constantIds.has(s.sectorId) || constantIds.has(s.sectorLabel)
  );
  const weights = secs.map((s) => Math.max(0, Math.round(Number(s.series) || 0)));
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW > 0) {
    return weights.map((w) => (100 * w) / sumW);
  }
  if (cIdx >= 0) {
    const cPct = 20;
    const others = n - 1;
    if (others <= 0) return secs.map((_, i) => (i === cIdx ? 100 : 0));
    const rest = (100 - cPct) / others;
    return secs.map((_, i) => (i === cIdx ? cPct : rest));
  }
  return secs.map(() => 100 / n);
}

function applySeriesCountsToDay(
  day: ManualDayPlan,
  seriesCounts: number[],
  trainingLevel: TrainingLevel | null | undefined,
): ManualDayPlan {
  return {
    ...day,
    sectors: day.sectors.map((sec, si) => {
      const raw = seriesCounts[si];
      if (raw === undefined || Number.isNaN(raw)) return ensureManualSectorShape(sec);
      const capped = Math.min(20, Math.max(0, Math.round(raw)));
      return ensureManualSectorShape(
        syncSectorExercisesFromLevelTable(
          applySectorScalarUpdate(sec, 'series', String(capped), trainingLevel),
          trainingLevel
        )
      );
    }),
  };
}

/** One day: target total series from workout params → split across sectors → reps + three pauses. */
function applyWorkoutParamDefaultsToOneDay(
  day: ManualDayPlan,
  dayIdx: number,
  goals: GoalId[],
  trainingLevel: TrainingLevel | null | undefined,
  yearly: PlanGymWeekYearlyPeriodSettings,
  workoutsPerWeek: number,
  wizardConstantSectorIds: Set<string>,
  manualDistConstantByDay: (string | null)[],
): ManualDayPlan {
  if (!day.sectors.length) return day;
  const goalId = goals[dayIdx] ?? goals[0];
  const goalSettings = readGoalParamsFromNutritionSettings(goalId);
  const curPeriod = Math.max(1, Math.floor(yearly.currentPeriod || 1));
  const totalPeriods = Math.max(curPeriod, Math.floor(yearly.totalPeriods || 1));
  const scalars = computePlanGymWeekScalarDefaults({
    goalSettings,
    trainingLevel,
    currentPeriod: curPeriod,
    totalPeriods,
  });
  const constIds = constantSectorIdsForDistributionDay(
    day,
    wizardConstantSectorIds,
    manualDistConstantByDay[dayIdx] ?? null
  );
  const targetTotal = suggestedRoutineTotalSeriesForDistMask({
    trainingLevel,
    daysCount: workoutsPerWeek,
    goalId,
    currentPeriod: curPeriod,
    totalPeriods,
  });
  const pcts = initialDistributionPctsForSectors(day.sectors, constIds);
  const seriesCounts = distributeSeriesFromPcts(pcts, targetTotal);
  const withSeries = applySeriesCountsToDay(day, seriesCounts, trainingLevel);
  return ensureManualDayPlan({
    ...withSeries,
    sectors: withSeries.sectors.map((sec) =>
      applyComputedScalarsToManualSector(sec, scalars, trainingLevel),
    ),
  });
}

/**
 * For each day with sectors: split **total series** (goal volume + period + session %) across areas,
 * then set default **reps** and **pauses** (exercises / series / areas) from workout parameters.
 */
function applyWorkoutParamDefaultsToManualDays(
  days: ManualDayPlan[],
  goals: GoalId[],
  trainingLevel: TrainingLevel | null | undefined,
  yearly: PlanGymWeekYearlyPeriodSettings,
  workoutsPerWeek: number,
  wizardConstantSectorIds: Set<string>,
  manualDistConstantByDay: (string | null)[],
): ManualDayPlan[] {
  return days.map((day, di) =>
    applyWorkoutParamDefaultsToOneDay(
      day,
      di,
      goals,
      trainingLevel,
      yearly,
      workoutsPerWeek,
      wizardConstantSectorIds,
      manualDistConstantByDay
    )
  );
}

// ─── last planned nutritionFood by sector (within a plan week, any day) ───────────

function sectorMatches(lap: string | null | undefined, label: string, id: string): boolean {
  if (!lap) return false;
  const l = String(lap).trim().toLowerCase();
  return l === label.toLowerCase() || l === id.toLowerCase()
    || (id === 'abs'  && l === 'abdominals')
    || (id === 'hams' && (l === 'hamstrings' || l === 'hams'));
}

type PlanWeekShape = NonNullable<NonNullable<Exclude<NutritionPlanForLast, null>['weeks']>[number]>;

function weekHasPlannedNutritionFoods(week: PlanWeekShape): boolean {
  for (const day of week.days ?? []) {
    for (const workout of day.meals ?? []) {
      for (const nutritionFood of workout.nutritionFoods ?? []) {
        if ((nutritionFood.nutritionComponents ?? []).length > 0) return true;
      }
    }
  }
  return false;
}

/** Latest calendar day inside the week (for ordering weeks without weekNumber). */
function weekLatestDayMs(week: PlanWeekShape): number {
  let maxMs = 0;
  for (const day of week.days ?? []) {
    if (!day.date) continue;
    const t = Date.parse(String(day.date));
    if (!Number.isNaN(t) && t > maxMs) maxMs = t;
  }
  return maxMs;
}

/**
 * Newest plan weeks first: higher `weekNumber` wins; tie-break by latest day date in the week.
 */
function orderPlanWeeksNewestFirst(plan: NutritionPlanForLast): PlanWeekShape[] {
  if (!plan?.weeks?.length) return [];
  const weeks = plan.weeks;
  return [...weeks]
    .filter(weekHasPlannedNutritionFoods)
    .sort((a, b) => {
      const wnA = typeof a.weekNumber === 'number' ? a.weekNumber : -Infinity;
      const wnB = typeof b.weekNumber === 'number' ? b.weekNumber : -Infinity;
      if (wnB !== wnA) return wnB - wnA;
      return weekLatestDayMs(b) - weekLatestDayMs(a);
    });
}

/** ISO date string compare: later date first; empty dates sort last. */
function compareDayDateDesc(a: string, b: string): number {
  if (a === b) return 0;
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? 1 : -1;
}

/**
 * Within one plan week, the nutritionFood for this sector on the **latest** day that includes it
 * (sectors can be planned on different days in the same week).
 */
function findNewestSectorNutritionFoodInWeek(
  week: PlanWeekShape,
  sectorLabel: string,
  sectorId: string
): { date: string; sectorNutritionComponents: any[] } | null {
  const entries: { date: string; sectorNutritionComponents: any[] }[] = [];
  for (const day of week.days ?? []) {
    const dayDate = day.date ? String(day.date).slice(0, 10) : '';
    for (const workout of day.meals ?? []) {
      for (const nutritionFood of workout.nutritionFoods ?? []) {
        const nutritionComponents = nutritionFood.nutritionComponents ?? [];
        const sectorNutritionComponents = nutritionComponents.filter((lap: any) =>
          sectorMatches(lap.muscularSector ?? lap.sector, sectorLabel, sectorId)
        );
        if (sectorNutritionComponents.length > 0) entries.push({ date: dayDate, sectorNutritionComponents });
      }
    }
  }
  if (!entries.length) return null;
  entries.sort((x, y) => compareDayDateDesc(x.date, y.date));
  return entries[0];
}

function summarizePlannedSectorLaps(
  date: string,
  laps: any[],
  planWeekLabel?: string
): LastWorkoutSummary {
  const totalSeries = laps.length;
  let totalReps = 0;
  for (const lap of laps) {
    const r = lap.reps;
    if (typeof r === 'number' && !Number.isNaN(r)) totalReps += r;
    else if (typeof r === 'string') totalReps += parseInt(r, 10) || 0;
  }
  const pauseStrs = laps
    .map((lap: { pause?: unknown }) => (typeof lap.pause === 'string' ? lap.pause.trim() : ''))
    .filter(Boolean);
  let avePausePerSet = "0'00\"";
  if (pauseStrs.length > 0) {
    const avgSec = pauseStrs.reduce((s, p) => s + parsePauseToSec(p), 0) / pauseStrs.length;
    const m = Math.floor(avgSec / 60);
    const r = Math.round(avgSec - m * 60);
    avePausePerSet = r === 0 ? `${m}'` : `${m}'${String(r).padStart(2, '0')}"`;
  }
  return {
    date,
    totalSeries,
    aveRepsPerSet: totalSeries > 0 ? Math.round((totalReps / totalSeries) * 10) / 10 : 0,
    totalReps,
    pause:         typeof laps[0]?.pause === 'string' ? laps[0].pause : '',
    avePausePerSet,
    planWeekLabel,
  };
}

/**
 * Planned work for this sector from the latest previous planned workout that contains it.
 * Lookup is global across all plan weeks/days by calendar date, so each sector can resolve to
 * a different source day/week.
 */
export function getLastWorkoutBySector(
  plan: NutritionPlanForLast, sectorLabel: string, sectorId: string
): LastWorkoutSummary | null {
  if (!plan?.weeks?.length) return null;
  let best: { date: string; sectorNutritionComponents: any[]; weekNumber?: number } | null = null;
  for (const week of plan.weeks) {
    const hit = findNewestSectorNutritionFoodInWeek(week, sectorLabel, sectorId);
    if (!hit) continue;
    if (!best || compareDayDateDesc(hit.date, best.date) < 0) {
      best = {
        date: hit.date,
        sectorNutritionComponents: hit.sectorNutritionComponents,
        weekNumber: typeof week.weekNumber === 'number' ? week.weekNumber : undefined,
      };
    }
  }
  if (best) {
    const planWeekLabel = typeof best.weekNumber === 'number' ? `Week ${best.weekNumber}` : undefined;
    return summarizePlannedSectorLaps(best.date, best.sectorNutritionComponents, planWeekLabel);
  }
  return null;
}

// ─── misc helpers ────────────────────────────────────────────────────────────

function buildInitialDays(daysCount: number): ManualDayPlan[] {
  return Array.from({ length: daysCount }, (_, i) => ({
    routineName: `Day ${i + 1}`,
    sectors: [],
  }));
}

/** Matches max selectable gym days in the weekly planner UI. */
const MANUAL_PLAN_MAX_DAY_SLOTS = 6;

function emptyManualDayPlanAtIndex(index: number): ManualDayPlan {
  return { routineName: `Day ${index + 1}`, sectors: [] };
}

/**
 * Always keep 6 day slots in state. Lowering “number of days” only hides trailing days in the UI;
 * their sectors and names stay in `days[i]` and reappear when the user increases the count again.
 */
function padManualDaysToMaxSlots(raw: ManualDayPlan[]): ManualDayPlan[] {
  const base = raw.slice(0, MANUAL_PLAN_MAX_DAY_SLOTS).map((d) => ensureManualDayPlan(d));
  while (base.length < MANUAL_PLAN_MAX_DAY_SLOTS) {
    base.push(ensureManualDayPlan(emptyManualDayPlanAtIndex(base.length)));
  }
  return base;
}

function formatLastWorkoutDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function getGoalLabel(goalId: GoalId | undefined): string {
  if (!goalId) return '';
  return GOAL_OPTIONS.find((o) => o.value === goalId)?.label ?? goalId;
}

function reorderDaysConstantPlacement(
  dayPlans: ManualDayPlan[], constantIds: Set<string>, atBeginning: boolean
): ManualDayPlan[] {
  if (!constantIds.size) return dayPlans;
  return dayPlans.map((day) => {
    const con = day.sectors.filter((s) => constantIds.has(s.sectorId));
    const oth = day.sectors.filter((s) => !constantIds.has(s.sectorId));
    return { ...day, sectors: atBeginning ? [...con, ...oth] : [...oth, ...con] };
  });
}

// ─── Series Distribution Dialog ──────────────────────────────────────────────

export const DAY_NAMES_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const SECTOR_COLOR_MAP: Record<string, string> = {
  shoulders:  '#3b82f6',
  biceps:     '#8b5cf6',
  triceps:    '#6366f1',
  forearms:   '#a78bfa',
  chest:      '#06b6d4',
  abs:        '#374151',
  trapezius:  '#ef4444',
  lats:       '#0ea5e9',
  quadriceps: '#14b8a6',
  hams:       '#f59e0b',
  calves:     '#dc2626',
  glutes:     '#f97316',
};
export const FALLBACK_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#f97316'];
export function getSectorColor(sectorId: string, idx: number): string {
  return SECTOR_COLOR_MAP[sectorId] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// SVG pie chart
function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
export interface PieSlice { pct: number; color: string; }
export function PieChart({ slices }: { slices: PieSlice[] }) {
  const cx = 75, cy = 75, r = 68;
  let start = 0;
  const paths: React.ReactNode[] = [];
  slices.forEach((slice, i) => {
    if (slice.pct <= 0) return;
    const angle = (slice.pct / 100) * 360;
    const end   = start + angle;
    const s = polarXY(cx, cy, r, start);
    const e = polarXY(cx, cy, r, end);
    const large = angle > 180 ? 1 : 0;
    const d = `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y} Z`;
    // label
    const midDeg = start + angle / 2;
    const lxy = polarXY(cx, cy, r * 0.62, midDeg);
    paths.push(
      <g key={i}>
        <path d={d} fill={slice.color} stroke="white" strokeWidth={1.5} />
        {slice.pct >= 6 && (
          <text x={lxy.x} y={lxy.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="white" fontWeight="700">
            {Math.round(slice.pct)}%
          </text>
        )}
      </g>
    );
    start = end;
  });
  return (
    <svg width={190} height={190} viewBox="0 0 150 150" className="block">
      {paths}
      {slices.every(s => s.pct === 0) && (
        <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" />
      )}
    </svg>
  );
}

export function distributeSeriesFromPcts(pcts: number[], totalSeries: number): number[] {
  if (pcts.length === 0) return [];
  const raw    = pcts.map(p => totalSeries * p / 100);
  const floors = raw.map(Math.floor);
  const floorSum = floors.reduce((a, b) => a + b, 0);
  const need   = Math.round(totalSeries - floorSum);

  const order  = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < need && k < order.length; k++) {
    floors[order[k].i]++;
  }
  return floors.map(v => Math.max(0, v));
}

export function redistributePcts(
  prev:          number[],
  changedIdx:    number,
  newPct:        number,
  constantIdx:   number | null,
  clampMin = 0,
  clampMax = 100
): number[] {
  if (prev.length === 0) return [];

  const isConstantChanged = changedIdx === constantIdx;
  const next = [...prev];
  const clamped = Math.max(clampMin, Math.min(clampMax, newPct));
  next[changedIdx] = clamped;

  let adjustable = next
    .map((_, i) => i)
    .filter(i => i !== changedIdx && (isConstantChanged ? true : i !== constantIdx));

  let remainingDelta = clamped - prev[changedIdx];

  while (Math.abs(remainingDelta) > 0.001 && adjustable.length > 0) {
    const share = -remainingDelta / adjustable.length;
    const nextAdjustable: number[] = [];
    let floored = 0;

    for (const ai of adjustable) {
      const proposed = next[ai] + share;
      if (proposed < 0) {
        floored += -proposed;
        next[ai] = 0;
      } else {
        next[ai] = proposed;
        nextAdjustable.push(ai);
      }
    }

    adjustable     = nextAdjustable;
    remainingDelta = floored * Math.sign(remainingDelta);
  }

  if (Math.abs(remainingDelta) > 0.001) {
    next[changedIdx] = clamped - remainingDelta;
  }

  return next;
}

interface SectorRowProps {
  sec:        ManualDaySector;
  pct:        number;
  series:     number;
  color:      string;
  isConstant: boolean;
  orderNum:   number;
  stepPct:    number;
  onChange:   (pct: number) => void;
  delta?:     number;
}
function formatDistPct(p: number): string {
  const r = Math.round(p * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function SectorScalarStepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const canUp = !disabled && value < max;
  const canDown = !disabled && value > min;
  return (
    <div
      className={`flex items-center overflow-hidden rounded border border-gray-400 bg-white ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <input
        type="number"
        min={min}
        max={max}
        value={value > 0 ? value : ''}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return;
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          onChange(Math.max(min, Math.min(max, n)));
        }}
        className="w-10 border-0 bg-transparent py-0.5 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-0"
      />
      <div className="flex flex-col divide-y divide-gray-300 border-l border-gray-300">
        <button
          type="button"
          disabled={!canUp}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="px-1.5 py-0.5 text-[9px] leading-none hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▲
        </button>
        <button
          type="button"
          disabled={!canDown}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-1.5 py-0.5 text-[9px] leading-none hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function SectorRow({ sec, pct, series, color, isConstant, orderNum, stepPct, onChange, delta = 0 }: SectorRowProps) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 shadow-sm transition-colors ${
      delta > 0 ? 'bg-red-50/90 border-red-200' : delta < 0 ? 'bg-emerald-50/90 border-emerald-200' : ''
    }`}>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-sm font-bold shadow-sm ${
        isConstant ? 'bg-red-600 text-white' : 'bg-yellow-400 text-gray-900'
      }`}>
        {orderNum}
      </div>
      <div className={`flex min-h-9 min-w-0 max-w-[8.5rem] flex-shrink-0 items-center rounded-md px-2.5 py-1.5 text-sm font-bold shadow-sm ${
        isConstant ? 'bg-red-600 text-white' : 'bg-yellow-400 text-gray-900'
      }`}>
        <span className="truncate">{sec.sectorLabel}</span>
      </div>
      <div className="min-w-1 flex-1 shrink" aria-hidden />
      <div className={`flex flex-shrink-0 items-center overflow-hidden rounded border bg-white ${
        delta > 0 ? 'border-red-400' : delta < 0 ? 'border-emerald-500' : 'border-gray-400'
      }`}>
        <span className={`min-w-[2.75rem] px-1 py-1 text-center text-xs font-bold tabular-nums ${
          delta > 0 ? 'text-red-700' : delta < 0 ? 'text-emerald-800' : 'text-gray-800'
        }`}>
          {formatDistPct(pct)}
        </span>
        <div className="flex flex-col divide-y divide-gray-300 border-l border-gray-300">
          <button type="button" onClick={() => onChange(pct + stepPct)}
            className="px-1.5 py-0.5 text-[9px] leading-none hover:bg-gray-100">▲</button>
          <button type="button" onClick={() => onChange(pct - stepPct)}
            className="px-1.5 py-0.5 text-[9px] leading-none hover:bg-gray-100">▼</button>
        </div>
      </div>
      <div className={`flex h-8 min-w-[2.25rem] flex-shrink-0 items-center justify-center rounded border px-2 text-sm font-bold tabular-nums ${
        delta > 0 ? 'border-red-300 bg-red-50 text-red-800' : delta < 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-gray-300 bg-gray-50 text-gray-900'
      }`}>
        {series}
      </div>
      <div className="h-7 w-7 flex-shrink-0 rounded border-2 border-white shadow-sm ring-1 ring-gray-300" style={{ backgroundColor: color }} title={sec.sectorLabel} />
      {delta !== 0 ? (
        <span className={`flex-shrink-0 text-lg font-bold leading-none ${delta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {delta > 0 ? '→' : '↓'}
        </span>
      ) : (
        <span className="w-4 flex-shrink-0" aria-hidden />
      )}
    </div>
  );
}

const EMPTY_DIST_CONSTANT_SECTOR_IDS = new Set<string>();

export interface SeriesDistDialogProps {
  days:              ManualDayPlan[];
  initialDayIdx:     number;
  constantSectorIds?: Set<string>;
  getConstantSectorIdsForDay?: (dayIndex: number) => Set<string>;
  getSuggestedTotalSeriesForDay?: (dayIndex: number) => number;
  /** Per-day manual pick for constant sector; shown in this dialog when `onManualDistConstantChange` is set. */
  manualDistConstantByDay?: (string | null)[];
  onManualDistConstantChange?: (dayIdx: number, sectorId: string | null) => void;
  onSave:            (dayIdx: number, newSeriesCounts: number[]) => void;
  onClose:           () => void;
}

function computeDistDialogInitialTotal(
  secs: ManualDaySector[],
  dayIdx: number,
  getSuggested?: (d: number) => number
): number {
  const sum = secs.reduce((s, sec) => s + Math.max(0, sec.series), 0);
  const sug = Math.max(16, Math.min(120, getSuggested?.(dayIdx) ?? 40));
  /** Wizard still uses a fixed series count per sector; until the user changes it, honor goal + period + session %. */
  const stillWizardDefaultSeries =
    secs.length > 0 &&
    secs.every(
      (sec) => Math.max(0, Math.round(Number(sec.series) || 0)) === PLAN_GYM_WEEK_WIZARD_DEFAULT_SERIES_PER_SECTOR
    );
  if (stillWizardDefaultSeries) return sug;
  if (sum < 12) return sug;
  return Math.max(1, Math.min(200, sum));
}

export function SeriesDistDialog({
  days,
  initialDayIdx,
  constantSectorIds = EMPTY_DIST_CONSTANT_SECTOR_IDS,
  getConstantSectorIdsForDay,
  getSuggestedTotalSeriesForDay,
  manualDistConstantByDay,
  onManualDistConstantChange,
  onSave,
  onClose,
}: SeriesDistDialogProps) {
  const [dayIdx, setDayIdx] = useState(initialDayIdx);

  const constantIdSetForDay = useMemo(() => {
    return getConstantSectorIdsForDay
      ? getConstantSectorIdsForDay(dayIdx)
      : constantSectorIds;
  }, [dayIdx, getConstantSectorIdsForDay, constantSectorIds]);

  const sectors     = days[dayIdx]?.sectors ?? [];
  const constantIdx = sectors.findIndex(
    (s) => constantIdSetForDay.has(s.sectorId) || constantIdSetForDay.has(s.sectorLabel)
  );

  const pctsForDay = useCallback(
    (dIdx: number) => {
      const secs = days[dIdx]?.sectors ?? [];
      const ids = getConstantSectorIdsForDay
        ? getConstantSectorIdsForDay(dIdx)
        : constantSectorIds;
      return initialDistributionPctsForSectors(secs, ids);
    },
    [days, getConstantSectorIdsForDay, constantSectorIds],
  );

  const [totalSeries, setTotalSeries] = useState(() =>
    computeDistDialogInitialTotal(
      days[initialDayIdx]?.sectors ?? [],
      initialDayIdx,
      getSuggestedTotalSeriesForDay
    )
  );
  const [pcts, setPcts] = useState<number[]>(() => pctsForDay(initialDayIdx));
  const [prevPcts, setPrevPcts] = useState<number[]>(() => pctsForDay(initialDayIdx));

  useEffect(() => {
    const secs = days[dayIdx]?.sectors ?? [];
    const init = pctsForDay(dayIdx);
    setTotalSeries(computeDistDialogInitialTotal(secs, dayIdx, getSuggestedTotalSeriesForDay));
    setPcts(init);
    setPrevPcts(init);
  }, [dayIdx, days, getConstantSectorIdsForDay, constantSectorIds, getSuggestedTotalSeriesForDay, pctsForDay]);

  const changePct = (idx: number, newPct: number) => {
    const isConst = idx === constantIdx;
    setPcts((prev) => {
      setPrevPcts(prev);
      const cIdxForRedist = constantIdx >= 0 ? constantIdx : null;
      return redistributePcts(prev, idx, newPct, cIdxForRedist,
        isConst ? 10 : 0,
        isConst ? 40 : 100
      );
    });
  };

  const DELTA_THRESHOLD = 0.05;
  const deltas = pcts.map((p, i) => {
    const d = p - (prevPcts[i] ?? p);
    if (d > DELTA_THRESHOLD)  return  1;
    if (d < -DELTA_THRESHOLD) return -1;
    return 0;
  });

  const seriesCounts = useMemo(
    () => (pcts.length === 0 ? [] : distributeSeriesFromPcts(pcts, totalSeries)),
    [pcts, totalSeries]
  );
  const pieSectors   = sectors.map((sec, i) => ({ pct: pcts[i] ?? 0, color: getSectorColor(sec.sectorId, i) }));

  // non-constant sector order (1-based)
  let orderCounter = 0;

  const handleProceed = () => {
    onSave(dayIdx, seriesCounts);
    if (dayIdx < days.length - 1) setDayIdx(d => d + 1);
    else onClose();
  };

  const pctRuler = (
    <div className="flex items-center gap-0 border-y border-gray-300 bg-white px-0.5 py-1 text-[8px] font-bold tabular-nums text-gray-500 select-none">
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
        <span key={n} className="flex-1 text-center last:flex-none last:w-[1.25rem]">
          {n}
        </span>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-stone-100 shadow-2xl ring-1 ring-black/10">

        <div className="flex-shrink-0 bg-rose-900 px-4 py-3">
          <p className="text-center text-sm font-bold leading-snug text-white">
            Set the distribution of the series internal to each routine of workout
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">

          <div className="sticky top-0 z-10 -mx-4 border-b border-gray-200/80 bg-stone-100 px-4 pb-3 shadow-sm">
            <div className="flex justify-center rounded-xl bg-white py-1 shadow-sm ring-1 ring-gray-200/80">
              <PieChart slices={pieSectors} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1">
              {days.map((_, i) => (
                <div key={i} className="flex w-11 flex-col items-center">
                  <span className="text-[10px] font-bold text-gray-600">{DAY_NAMES_SHORT[i] ?? `D${i + 1}`}</span>
                  <span className="text-lg leading-none" aria-hidden>📅</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {days.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDayIdx(i)}
                  className={`h-9 w-11 rounded-lg border-2 text-sm font-bold transition ${
                    i === dayIdx
                      ? 'border-rose-700 bg-yellow-400 text-gray-900 shadow-md'
                      : 'border-transparent bg-yellow-300 text-gray-900 hover:bg-yellow-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 shadow-sm">
            <span className="flex-1 text-xs font-medium leading-snug text-gray-800">
              Total series of the routine of the workout selected
            </span>
            <div className="flex flex-shrink-0 items-center overflow-hidden rounded-md border-2 border-gray-400 bg-white">
              <input
                type="number"
                min={1}
                max={200}
                value={totalSeries}
                onChange={(e) => setTotalSeries(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-12 border-0 bg-transparent py-1 text-center text-sm font-bold focus:outline-none focus:ring-0"
              />
              <div className="flex flex-col divide-y divide-gray-300 border-l border-gray-300">
                <button
                  type="button"
                  onClick={() => setTotalSeries((p) => Math.min(200, p + 1))}
                  className="px-1.5 py-0.5 text-[9px] leading-none hover:bg-gray-100"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => setTotalSeries((p) => Math.max(1, p - 1))}
                  className="px-1.5 py-0.5 text-[9px] leading-none hover:bg-gray-100"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          {sectors.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No sectors added to this day yet.</p>
          ) : (
            <div className="space-y-3">
              {constantIdx >= 0 ? (
                <div className="overflow-hidden rounded-xl border border-cyan-600/35 bg-white shadow-md ring-1 ring-cyan-700/10">
                  <div className="bg-cyan-500 px-3 py-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-white">
                      Constant trained area
                    </span>
                  </div>
                  <div className="space-y-2 border-t border-cyan-100 bg-cyan-50/40 p-2.5">
                    {onManualDistConstantChange ? (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <label htmlFor="series-dist-constant-sector" className="text-[10px] font-bold text-cyan-900 sm:whitespace-nowrap">
                          Which muscle is constant?
                        </label>
                        <select
                          id="series-dist-constant-sector"
                          value={manualDistConstantByDay?.[dayIdx] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            onManualDistConstantChange(dayIdx, v === '' ? null : v);
                          }}
                          className="w-full rounded-md border border-cyan-700/25 bg-white px-2 py-1 text-xs font-semibold text-gray-900 sm:max-w-[14rem]"
                        >
                          <option value="">Auto</option>
                          {sectors.map((s) => (
                            <option key={s.sectorId} value={s.sectorId}>
                              {s.sectorLabel}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <SectorRow
                      sec={sectors[constantIdx]}
                      pct={pcts[constantIdx] ?? 20}
                      series={seriesCounts[constantIdx] ?? 0}
                      color={getSectorColor(sectors[constantIdx].sectorId, constantIdx)}
                      isConstant
                      orderNum={sectors.length}
                      stepPct={1}
                      onChange={(p) => changePct(constantIdx, p)}
                      delta={deltas[constantIdx] ?? 0}
                    />
                  </div>
                </div>
              ) : sectors.length > 0 && onManualDistConstantChange ? (
                <div className="overflow-hidden rounded-xl border border-cyan-600/35 bg-white p-2.5 shadow-md ring-1 ring-cyan-700/10">
                  <label htmlFor="series-dist-constant-sector-only" className="text-xs font-bold text-cyan-900">
                    Constant trained area — choose muscle
                  </label>
                  <select
                    id="series-dist-constant-sector-only"
                    value={manualDistConstantByDay?.[dayIdx] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      onManualDistConstantChange(dayIdx, v === '' ? null : v);
                    }}
                    className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900"
                  >
                    <option value="">Auto (equal split until a constant is set)</option>
                    {sectors.map((s) => (
                      <option key={s.sectorId} value={s.sectorId}>
                        {s.sectorLabel}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-cyan-600/35 bg-white shadow-md ring-1 ring-cyan-700/10">
                <div className="bg-cyan-500 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-white">
                    Sectors of this workout
                  </span>
                </div>
                {pctRuler}
                <div className="space-y-1.5 bg-stone-50/80 p-2.5">
                  {sectors.map((sec, i) => {
                    if (i === constantIdx) return null;
                    orderCounter++;
                    return (
                      <SectorRow
                        key={sec.sectorId}
                        sec={sec}
                        pct={pcts[i] ?? 0}
                        series={seriesCounts[i] ?? 0}
                        color={getSectorColor(sec.sectorId, i)}
                        isConstant={false}
                        orderNum={orderCounter}
                        stepPct={1}
                        onChange={(p) => changePct(i, p)}
                        delta={deltas[i] ?? 0}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-center gap-3 border-t border-gray-300 bg-stone-200/90 px-4 py-3">
          <button
            type="button"
            onClick={handleProceed}
            className="rounded-xl bg-zinc-700 px-10 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-600"
          >
            Proceed
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-700 px-10 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-600"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PlanGymWeekManualModalProps {
  isOpen:             boolean;
  initialDaysCount:   number;
  onClose:            () => void;
  onCreateRoutines:   (result: PlanGymWeekManualResult) => void;
  initialPlan?:       PlanGymWeekManualResult | null;
  goals?:             GoalId[];
  nutritionPlan?:       NutritionPlanForLast;
  headerImage?:       string;
  rescanParams?:      PlanGymWeekRescanParams | null;
  trainingLevel?:     TrainingLevel | null;
  trainingLevelImages?: Partial<Record<TrainingLevel, string>>;
  onBack?:            () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PlanGymWeekManualModal({
  isOpen,
  initialDaysCount,
  onClose,
  onCreateRoutines,
  initialPlan,
  goals = [],
  nutritionPlan,
  headerImage,
  rescanParams = null,
  trainingLevel: trainingLevelProp = null,
  trainingLevelImages,
  onBack,
}: PlanGymWeekManualModalProps) {
  /** Wizard prop, then plan snapshot, then rescan params — survives manual ↔ fast-plan navigation. */
  const trainingLevel =
    trainingLevelProp ?? initialPlan?.trainingLevel ?? rescanParams?.trainingLevel ?? null;

  const [daysCount,              setDaysCount]              = useState(() => clampWeeklyPlanDayCount(initialDaysCount));
  const [activeDayIndex,         setActiveDayIndex]         = useState(0);
  const [days,                   setDays]                   = useState<ManualDayPlan[]>(() =>
    padManualDaysToMaxSlots(buildInitialDays(clampWeeklyPlanDayCount(initialDaysCount)))
  );
  const [editingRoutineName,     setEditingRoutineName]     = useState<string | null>(null);
  const [draftRoutineName,       setDraftRoutineName]       = useState('');
  const [viewMode,               setViewMode]               = useState<'edit' | 'fullOverview'>('edit');
  const [constantSectorsAtBeginning, setConstantSectorsAtBeginning] = useState(false);
  const [loadFromSourceIndex,    setLoadFromSourceIndex]    = useState(0);
  /** Selected exercise frame on the active day: next sector from the grid is inserted after this index. */
  const [selectedSectorFrameIndex, setSelectedSectorFrameIndex] = useState<number | null>(null);
  /** Drop-target highlight when dragging a muscle from the grid onto a sector frame */
  const [sectorDropHighlight, setSectorDropHighlight] = useState<{
    dayIdx: number;
    secIdx: number;
  } | null>(null);
  const [showSeriesDist,         setShowSeriesDist]         = useState(false);
  const [showAutoWarn,           setShowAutoWarn]           = useState(false);
  /** Per-sector visibility of Reps & Weights / Rest & Alerts (key: `${dayIdx}-${secIdx}`). */
  const [pyramidalFormsOpenBySector, setPyramidalFormsOpenBySector] = useState<Record<string, boolean>>({});
  const [manualDistConstantByDay, setManualDistConstantByDay] = useState<(string | null)[]>(() =>
    Array.from({ length: 6 }, () => null)
  );

  const [yearlyPeriodSettings, setYearlyPeriodSettings] = useState<PlanGymWeekYearlyPeriodSettings>(() =>
    defaultPlanGymWeekYearlyPeriodSettings()
  );
  /** Pause / macro / series / reps yearly From→To — hidden until user opens manual entry. */
  const [manualPeriodStartEndOpen, setManualPeriodStartEndOpen] = useState(false);
  const [infoRepsModalOpen, setInfoRepsModalOpen] = useState(false);
  const [autoProcessInfoRaw, setAutoProcessInfoRaw] = useState(AUTO_PROCESS_INFO_DEFAULT_EN);

  const { currentLanguage: language } = useLanguage();

  const wizardConstantSectorIds = useMemo(
    () => wizardConstantLabelsToSectorIds(rescanParams?.constantSectors),
    [rescanParams?.constantSectors]
  );

  const mergedConstantSectorIds = useMemo(() => {
    const m = new Set(wizardConstantSectorIds);
    for (const id of manualDistConstantByDay) {
      if (id) m.add(id);
    }
    return m;
  }, [wizardConstantSectorIds, manualDistConstantByDay]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      if (initialPlan?.days?.length) {
        const n = clampWeeklyPlanDayCount(initialPlan.daysCount);
        setDaysCount(n);
        setActiveDayIndex(0);
        const mergedYp = initialPlan.yearlyPeriodSettings
          ? {
              ...defaultPlanGymWeekYearlyPeriodSettings(),
              ...initialPlan.yearlyPeriodSettings,
              ...clampPlanYearPeriodPair(
                initialPlan.yearlyPeriodSettings.totalPeriods,
                initialPlan.yearlyPeriodSettings.currentPeriod,
              ),
            }
          : defaultPlanGymWeekYearlyPeriodSettings();
        setYearlyPeriodSettings(mergedYp);
        setDays(padManualDaysToMaxSlots(initialPlan.days.map(ensureManualDayPlan)));
        setManualDistConstantByDay(Array.from({ length: MANUAL_PLAN_MAX_DAY_SLOTS }, () => null));
      } else {
        const n = clampWeeklyPlanDayCount(initialDaysCount);
        setDaysCount(n);
        setActiveDayIndex(0);
        setDays(padManualDaysToMaxSlots(buildInitialDays(n)));
        setManualDistConstantByDay(Array.from({ length: MANUAL_PLAN_MAX_DAY_SLOTS }, () => null));
      }
      setEditingRoutineName(null);
      setViewMode('edit');
      setConstantSectorsAtBeginning(false);
      setLoadFromSourceIndex(0);
      setShowSeriesDist(false);
      setShowAutoWarn(false);
      setPyramidalFormsOpenBySector({});
      setSelectedSectorFrameIndex(null);
      setInfoRepsModalOpen(false);
      setManualPeriodStartEndOpen(false);
    }
  }, [isOpen, initialDaysCount, initialPlan, goals, trainingLevel, wizardConstantSectorIds]);

  const totalSectorCount = useMemo(
    () => days.reduce((n, d) => n + d.sectors.length, 0),
    [days],
  );

  const goalsForPlan = useMemo(
    () => (goals.length ? goals : (['hypertrophy'] as GoalId[])),
    [goals],
  );

  const applyCalculatedWorkoutParamsToDays = useCallback(() => {
    setDays((prev) => {
      if (!prev.some((d) => d.sectors.length > 0)) return prev;
      return applyWorkoutParamDefaultsToManualDays(
        prev,
        goalsForPlan,
        trainingLevel,
        yearlyPeriodSettings,
        daysCount,
        wizardConstantSectorIds,
        manualDistConstantByDay,
      );
    });
  }, [
    goalsForPlan,
    trainingLevel,
    yearlyPeriodSettings,
    daysCount,
    wizardConstantSectorIds,
    manualDistConstantByDay,
  ]);

  /** Push reps, pauses, and distributed series from Workouts parameters into every sector. */
  useEffect(() => {
    if (!isOpen) return;
    if ((yearlyPeriodSettings.periodScalarsSource ?? 'calculated') !== 'calculated') return;
    if (totalSectorCount <= 0) return;
    applyCalculatedWorkoutParamsToDays();
  }, [
    isOpen,
    totalSectorCount,
    yearlyPeriodSettings.periodScalarsSource,
    yearlyPeriodSettings.totalPeriods,
    yearlyPeriodSettings.currentPeriod,
    trainingLevel,
    daysCount,
    goalsForPlan,
    applyCalculatedWorkoutParamsToDays,
  ]);

  useEffect(() => {
    setSelectedSectorFrameIndex(null);
  }, [activeDayIndex]);

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

  useEffect(() => {
    const clearDrop = () => setSectorDropHighlight(null);
    window.addEventListener('dragend', clearDrop);
    return () => window.removeEventListener('dragend', clearDrop);
  }, []);

  useEffect(() => {
    if (activeDayIndex < 1) return;
    const maxSrc = activeDayIndex - 1;
    const defaultIdx = Math.max(0, activeDayIndex - 2);
    setLoadFromSourceIndex(Math.min(defaultIdx, maxSrc));
  }, [activeDayIndex]);

  /** Visible slice only; full `days` keeps up to 6 slots so lowering day count does not delete data. */
  const stableDays = useMemo(() => days.slice(0, daysCount), [days, daysCount]);

  useEffect(() => {
    if (activeDayIndex >= daysCount) setActiveDayIndex(Math.max(0, daysCount - 1));
  }, [daysCount, activeDayIndex]);

  const getConstantSectorIdsForDay = useCallback(
    (dIdx: number) =>
      constantSectorIdsForDistributionDay(
        days[dIdx],
        wizardConstantSectorIds,
        manualDistConstantByDay[dIdx] ?? null
      ),
    [days, wizardConstantSectorIds, manualDistConstantByDay]
  );

  const getSuggestedTotalSeriesForDay = useCallback(
    (dIdx: number) => {
      const cur = Math.max(1, Math.floor(yearlyPeriodSettings.currentPeriod || 1));
      const tot = Math.max(cur, Math.floor(yearlyPeriodSettings.totalPeriods || 1));
      return suggestedRoutineTotalSeriesForDistMask({
        trainingLevel,
        daysCount,
        goalId: goals[dIdx],
        currentPeriod: cur,
        totalPeriods: tot,
      });
    },
    [trainingLevel, daysCount, goals, yearlyPeriodSettings.currentPeriod, yearlyPeriodSettings.totalPeriods],
  );

  const setStableDays = (updater: (prev: ManualDayPlan[]) => ManualDayPlan[]) => setDays(updater);

  const effectiveActiveDayIndex = Math.min(activeDayIndex, Math.max(0, stableDays.length - 1));
  const activeDay = stableDays[effectiveActiveDayIndex] ?? ensureManualDayPlan(emptyManualDayPlanAtIndex(0));
  const canAddSector = (sectorId: string) => !activeDay.sectors.some((s) => s.sectorId === sectorId);

  /** Reps + pause references from Workouts parameters (level + yearly period) for the active day’s goal. */
  const workoutParamsReferenceScalars = useMemo(() => {
    const goalId = goals[effectiveActiveDayIndex] ?? goals[0];
    const goalSettings = readGoalParamsFromNutritionSettings(goalId);
    const cur = Math.max(1, Math.floor(yearlyPeriodSettings.currentPeriod || 1));
    const tot = Math.max(cur, Math.floor(yearlyPeriodSettings.totalPeriods || 1));
    const scalars = computePlanGymWeekScalarDefaults({
      goalSettings,
      trainingLevel,
      currentPeriod: cur,
      totalPeriods: tot,
    });
    return {
      hasGoalParams: isGoalParamsSavedInNutritionSettings(goalId),
      reps: scalars.defaultReps,
      pauseSeries: scalars.defaultPauseLabel,
      pauseExercises: scalars.defaultMacroExerciseLabel,
      pauseAreas: scalars.defaultMacroEndSectorLabel,
    };
  }, [
    effectiveActiveDayIndex,
    goals,
    trainingLevel,
    yearlyPeriodSettings.currentPeriod,
    yearlyPeriodSettings.totalPeriods,
  ]);

  // ── stats (for active day) ──
  const sumSeriesInAreas = activeDay.sectors.reduce((s, sec) => s + sec.series, 0);
  const yearlyScalarSource = yearlyPeriodSettings.periodScalarsSource ?? 'calculated';
  const calculatedRoutineTotalSeries = getSuggestedTotalSeriesForDay(effectiveActiveDayIndex);
  const showCalculatedTotalInStats =
    yearlyScalarSource === 'calculated' && calculatedRoutineTotalSeries > 0;
  /** Routine total from Workouts parameters (level + period + session %); else sum of sector series. */
  const totalSeriesForStatsBar = showCalculatedTotalInStats
    ? calculatedRoutineTotalSeries
    : sumSeriesInAreas;
  const totalExercises = activeDay.sectors.reduce(
    (s, sec) => s + sectorExercisesCount(sec, trainingLevel),
    0,
  );
  const avgSeriesPerArea = activeDay.sectors.length > 0
    ? Math.round((sumSeriesInAreas / activeDay.sectors.length) * 10) / 10
    : 0;
  const allReps: number[] = [];
  const allPauses: string[] = [];
  for (const sec of activeDay.sectors) {
    const n = Math.max(0, Math.min(20, sec.series));
    for (let i = 0; i < n; i++) {
      allReps.push(rowRepsForDayStats(sec, i));
      allPauses.push(rowPauseStrForDayStats(sec, i, trainingLevel));
    }
  }
  const repsForAvg = allReps.filter((r) => r > 0);
  const avgReps = repsForAvg.length > 0
    ? Math.round((repsForAvg.reduce((s, r) => s + r, 0) / repsForAvg.length) * 10) / 10
    : 0;
  /** Average pause from each series row in the table (not sector header Pause dropdowns). */
  const breakAvg = avgPauseStr(allPauses);

  // ── sector CRUD ──
  const addSector = (sectorId: string) => {
    const group = MUSCLE_GROUPS.find((g) => g.id === sectorId);
    if (!group || !canAddSector(sectorId)) return;
    const dayNow = stableDays[effectiveActiveDayIndex];
    if (!dayNow) return;
    let insertAt = dayNow.sectors.length;
    if (
      selectedSectorFrameIndex != null &&
      selectedSectorFrameIndex >= 0 &&
      selectedSectorFrameIndex < dayNow.sectors.length
    ) {
      insertAt = selectedSectorFrameIndex + 1;
    }
    setStableDays((prev) => {
      const next = [...prev];
      const day = {
        ...next[effectiveActiveDayIndex],
        sectors: [...next[effectiveActiveDayIndex].sectors]
      };
      if (day.sectors.some((s) => s.sectorId === sectorId)) return prev;
      const calcScalars =
        yearlyScalarSource === 'calculated'
          ? {
              reps: workoutParamsReferenceScalars.reps,
              pauseSeries: workoutParamsReferenceScalars.pauseSeries,
              pauseExercises: workoutParamsReferenceScalars.pauseExercises,
              pauseAreas: workoutParamsReferenceScalars.pauseAreas,
            }
          : null;
      const newSector = buildNewSectorFromDayAverages(group, day, trainingLevel, calcScalars);
      const sectors = [...day.sectors];
      sectors.splice(insertAt, 0, newSector);
      day.sectors = sectors;
      next[effectiveActiveDayIndex] = day;
      return next;
    });
    setSelectedSectorFrameIndex(insertAt);
  };

  const removeSector = (dayIdx: number, sectorIndex: number) => {
    const removedId = stableDays[dayIdx]?.sectors[sectorIndex]?.sectorId;
    if (dayIdx === activeDayIndex) {
      setSelectedSectorFrameIndex((prev) => {
        if (prev === null) return null;
        if (sectorIndex === prev) return null;
        if (sectorIndex < prev) return prev - 1;
        return prev;
      });
    }
    setStableDays((prev) => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], sectors: next[dayIdx].sectors.filter((_, i) => i !== sectorIndex) };
      return next;
    });
    if (removedId) {
      setManualDistConstantByDay((m) => {
        if (m[dayIdx] !== removedId) return m;
        const copy = [...m];
        copy[dayIdx] = null;
        return copy;
      });
    }
  };

  const moveSector = (dayIdx: number, index: number, direction: 'up' | 'down') => {
    const len = stableDays[dayIdx]?.sectors.length ?? 0;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= len) return;
    if (dayIdx === activeDayIndex) {
      setSelectedSectorFrameIndex((prev) => {
        if (prev === null) return prev;
        if (prev === index) return target;
        if (prev === target) return index;
        return prev;
      });
    }
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      if (target < 0 || target >= sectors.length) return prev;
      [sectors[index], sectors[target]] = [sectors[target], sectors[index]];
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  /** Move a sector row to a new index (drop target = insert before `toIndex`). Keeps chevron reorder semantics. */
  const reorderSectorFrameTo = (dayIdx: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    flushSync(() => {
      setStableDays((prev) => {
        const day = prev[dayIdx];
        if (!day || fromIndex < 0 || fromIndex >= day.sectors.length || toIndex < 0 || toIndex > day.sectors.length) {
          return prev;
        }
        const sectors = [...day.sectors];
        const [removed] = sectors.splice(fromIndex, 1);
        const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
        sectors.splice(insertAt, 0, removed);
        const next = [...prev];
        next[dayIdx] = { ...day, sectors };
        return next;
      });
    });
    setSelectedSectorFrameIndex((prev) => {
      if (prev === null || dayIdx !== activeDayIndex) return prev;
      if (prev === fromIndex) {
        return fromIndex < toIndex ? toIndex - 1 : toIndex;
      }
      if (fromIndex < toIndex) {
        if (prev > fromIndex && prev <= toIndex) return prev - 1;
      } else if (fromIndex > toIndex) {
        if (prev >= toIndex && prev < fromIndex) return prev + 1;
      }
      return prev;
    });
  };

  /** Drag a muscle from the grid onto a frame: replace identity only; keep exercises/series/reps/macros/table. */
  const substituteSectorIdentity = (dayIdx: number, sectorIndex: number, newSectorId: string) => {
    const group = MUSCLE_GROUPS.find((g) => g.id === newSectorId);
    if (!group) return;

    let patch: { newIdx: number; oldSectorId: string } | null = null;

    flushSync(() => {
      setStableDays((prev) => {
        const day = prev[dayIdx];
        if (!day || sectorIndex < 0 || sectorIndex >= day.sectors.length) return prev;
        const cur = day.sectors[sectorIndex];
        if (cur.sectorId === newSectorId) return prev;
        const oldSectorId = cur.sectorId;
        const merged = ensureManualSectorShape({
          ...cur,
          sectorId: group.id,
          sectorLabel: group.label,
          image: group.image,
        });
        const mapped = day.sectors.map((s, i) => (i === sectorIndex ? merged : s));
        const deduped = mapped.filter((s, i) => i === sectorIndex || s.sectorId !== group.id);
        const newIdx = deduped.findIndex((s) => s.sectorId === group.id);
        if (newIdx < 0) return prev;
        patch = { newIdx, oldSectorId };
        const next = [...prev];
        next[dayIdx] = { ...day, sectors: deduped.map(ensureManualSectorShape) };
        return next;
      });
    });

    if (!patch) return;
    const { newIdx, oldSectorId } = patch;
    if (dayIdx === activeDayIndex) {
      setSelectedSectorFrameIndex(newIdx);
    }
    setManualDistConstantByDay((m) => {
      if (m[dayIdx] !== oldSectorId) return m;
      const copy = [...m];
      copy[dayIdx] = group.id;
      return copy;
    });
  };

  const updateSector = (dayIdx: number, sectorIndex: number, field: SectorScalarField, value: number | string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const cur = sectors[sectorIndex];
      let patched: ManualDaySector;
      /** Header Pause: overwrite every row; per-row overrides until header Pause changes again. */
      if (field === 'pause') {
        const pauseVal = String(value).trim();
        patched = syncSectorPausesFromHeader({ ...cur, pause: pauseVal }, trainingLevel);
        patched = syncSectorExercisesFromLevelTable(patched, trainingLevel);
      } else if (field === 'exercises' || field === 'series') {
        patched = applySectorScalarUpdate(cur, field, value, trainingLevel);
      } else if (field === 'reps' || field === 'pyramidal') {
        patched = applySectorScalarUpdate(cur, field, value, trainingLevel);
        patched = syncSectorExercisesFromLevelTable(patched, trainingLevel);
      } else {
        patched = applySectorScalarUpdate(cur, field, value, trainingLevel);
        patched = syncSectorExercisesFromLevelTable(patched, trainingLevel);
      }
      sectors[sectorIndex] = ensureManualSectorShape(patched);
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── series reps: manual per-row edits only (header Reps / Pyramidal bulk-sync all rows) ──
  const updateSeriesRepAt = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, sec.series);
      seriesRepsRaw[rowIdx] = raw;
      sec.seriesRepsRaw = seriesRepsRaw;
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        const v = Math.max(1, Math.min(99, parsed));
        Object.assign(sec, patchSingleSeriesRepRow(sec, rowIdx, raw, v));
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── series reps (% mode): manual edit only — never recalc %; red when typed > calc from % ──
  const updateSeriesRepAtPctMode = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const parsed = parseInt(raw, 10);
      const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, sec.series);
      seriesRepsRaw[rowIdx] = raw;
      sec.seriesRepsRaw = seriesRepsRaw;
      if (!Number.isNaN(parsed)) {
        const v = Math.max(1, Math.min(99, parsed));
        Object.assign(sec, patchSeriesRepRowPctModeManual(sec, rowIdx, raw, v));
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── series pct (% mode): row 1 cascades; rows 2+ update that row's reps only ──
  const updateSeriesPctAt = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    const pct = parseFloat(raw);
    if (Number.isNaN(pct)) return;
    const clampedPct = Math.max(0, Math.min(100, pct));
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const n = sec.series;
      if (rowIdx === 0) {
        Object.assign(sec, syncSectorPyramidalFromFirstRowPct(sec, clampedPct));
      } else {
        const seriesPcts = [...(sec.seriesPcts ?? (sec.seriesReps ?? []).map((r) => sectorPctFromReps(sec, r)))];
        while (seriesPcts.length < n) {
          seriesPcts.push(sectorPctFromReps(sec, sec.seriesReps?.[seriesPcts.length] ?? 1));
        }
        seriesPcts[rowIdx] = clampedPct;
        sec.seriesPcts = seriesPcts;
        const calcReps = sectorRepsFromPct(sec, clampedPct);
        const seriesReps = [...(sec.seriesReps ?? [])];
        while (seriesReps.length < n) seriesReps.push(1);
        seriesReps[rowIdx] = calcReps;
        sec.seriesReps = seriesReps;
        const srRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, n);
        srRaw[rowIdx] = calcReps > 0 ? String(calcReps) : '';
        sec.seriesRepsRaw = srRaw;
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const setTypeByPercent = (dayIdx: number, secIdx: number, pct: boolean) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      let sec = { ...sectors[secIdx] };
      if (pct && !sec.typeByPercent) {
        sec.typeByPercent = true;
        sec = recalcSectorSeriesPctsFromReps(sec, sec.pctFormulaIndex ?? 0);
        sec = syncSectorPyramidalFromFirstRowPct(sec);
      } else {
        sec.typeByPercent = pct;
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const sectorPyramidalFormKey = (dayIdx: number, secIdx: number) => `${dayIdx}-${secIdx}`;

  const isPyramidalFormOpen = useCallback(
    (dayIdx: number, secIdx: number) =>
      pyramidalFormsOpenBySector[sectorPyramidalFormKey(dayIdx, secIdx)] ?? false,
    [pyramidalFormsOpenBySector],
  );

  const toggleSectorPyramidalForm = (dayIdx: number, secIdx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const k = sectorPyramidalFormKey(dayIdx, secIdx);
    setPyramidalFormsOpenBySector((prev) => ({ ...prev, [k]: !(prev[k] ?? false) }));
  };

  const toggleAllPyramidalFormsOnActiveDay = useCallback(() => {
    const day = stableDays[activeDayIndex];
    if (!day?.sectors.length) return;
    const anyOpen = day.sectors.some((_, i) =>
      pyramidalFormsOpenBySector[sectorPyramidalFormKey(activeDayIndex, i)] ?? false,
    );
    const next = !anyOpen;
    setPyramidalFormsOpenBySector((prev) => {
      const updated = { ...prev };
      day.sectors.forEach((_, i) => {
        updated[sectorPyramidalFormKey(activeDayIndex, i)] = next;
      });
      return updated;
    });
  }, [activeDayIndex, pyramidalFormsOpenBySector, stableDays]);

  const activeDayAnyPyramidalFormOpen = useMemo(() => {
    const day = stableDays[activeDayIndex];
    if (!day?.sectors.length) return false;
    return day.sectors.some((_, i) =>
      pyramidalFormsOpenBySector[sectorPyramidalFormKey(activeDayIndex, i)] ?? false,
    );
  }, [activeDayIndex, pyramidalFormsOpenBySector, stableDays]);

  const activeDayPctFormulaIndex = useMemo(() => {
    const sec = stableDays[activeDayIndex]?.sectors[0];
    return sec?.pctFormulaIndex ?? 0;
  }, [stableDays, activeDayIndex]);

  const cycleAllSectorsPctFormulaOnActiveDay = useCallback(() => {
    setStableDays((prev) =>
      prev.map((day, di) => {
        if (di !== activeDayIndex) return day;
        const firstFi = day.sectors[0]?.pctFormulaIndex ?? 0;
        const nextFi = nextPct1RmFormulaIndex(firstFi);
        return {
          ...day,
          sectors: day.sectors.map((sec) => recalcSectorSeriesPctsFromReps(sec, nextFi)),
        };
      }),
    );
  }, [activeDayIndex]);

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

  const updateSeriesRowPauseAt = (dayIdx: number, secIdx: number, rowIdx: number, v: string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const arr = resizeSeriesRowStrings(sec.seriesRowPauses, sec.series);
      arr[rowIdx] = v;
      sec.seriesRowPauses = arr;
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const updateSeriesRowAlertAt = (dayIdx: number, secIdx: number, rowIdx: number, v: string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const arr = resizeSeriesRowStrings(sec.seriesRowAlerts, sec.series);
      arr[rowIdx] = v.slice(0, 120);
      sec.seriesRowAlerts = arr;
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
      const nSeries = sec.series;
      const seriesReps = [...(sec.seriesReps ?? [])];
      while (seriesReps.length < nSeries) seriesReps.push(0);
      seriesReps.length = nSeries;
      const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, nSeries);
      const seriesWeights = [...(sec.seriesWeights ?? [])];
      while (seriesWeights.length < nSeries) seriesWeights.push('');
      seriesWeights.length = nSeries;
      const seriesPcts = [...(sec.seriesPcts ?? seriesReps.map(repsToPercent))];
      while (seriesPcts.length < nSeries) seriesPcts.push(0);
      seriesPcts.length = nSeries;
      const seriesRowPauses = resizeSeriesRowStrings(sec.seriesRowPauses, nSeries);
      const seriesRowAlerts = resizeSeriesRowStrings(sec.seriesRowAlerts, nSeries);
      const { reps: r, raw: rw } = displayedSeriesRepAt(sec, fromRow);
      const repRaw = rw !== '' ? rw : r > 0 ? String(r) : '';
      const w = seriesWeights[fromRow] ?? '';
      const p = seriesPcts[fromRow];
      const pp = seriesRowPauses[fromRow] ?? '';
      const aa = seriesRowAlerts[fromRow] ?? '';
      for (let i = fromRow + 1; i < nSeries; i++) {
        if (r > 0) {
          seriesReps[i] = r;
          seriesRepsRaw[i] = repRaw;
          seriesPcts[i] = sec.typeByPercent ? sectorPctFromReps(sec, r) : repsToPercent(r);
        }
        seriesWeights[i] = w;
        seriesRowPauses[i] = pp;
        seriesRowAlerts[i] = aa;
      }
      sec.seriesReps = seriesReps;
      sec.seriesRepsRaw = seriesRepsRaw;
      sec.seriesWeights = seriesWeights;
      sec.seriesPcts = seriesPcts;
      sec.seriesRowPauses = seriesRowPauses;
      sec.seriesRowAlerts = seriesRowAlerts;
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── routine name ──
  const saveRoutineName = () => {
    if (editingRoutineName !== null) {
      setStableDays((prev) => {
        const next = [...prev];
        next[effectiveActiveDayIndex] = {
          ...next[effectiveActiveDayIndex],
          routineName: draftRoutineName || next[effectiveActiveDayIndex].routineName
        };
        return next;
      });
      setEditingRoutineName(null);
    }
  };
  const cancelRoutineNameEdit = () => { setEditingRoutineName(null); setDraftRoutineName(activeDay.routineName); };
  const startEditRoutineName  = () => { setDraftRoutineName(activeDay.routineName); setEditingRoutineName('active'); };

  const handleCreate = () => {
    onCreateRoutines({
      daysCount,
      days: stableDays,
      yearlyPeriodSettings: { ...yearlyPeriodSettings },
      trainingLevel,
    });
  };

  const applyYearlyScalarsToAllDays = useCallback(() => {
    const s = yearlyPeriodSettings;
    const src: YearlyPeriodScalarsSource = s.periodScalarsSource ?? 'calculated';
    const tp = Math.min(
      PLAN_YEAR_TOTAL_PERIODS_MAX,
      Math.max(PLAN_YEAR_TOTAL_PERIODS_MIN, Math.floor(s.totalPeriods))
    );
    const cp = Math.min(tp, Math.max(1, Math.floor(s.currentPeriod)));

    if (src === 'manual') {
      if (!manualYearlyPeriodRangesComplete(s)) {
        window.alert(
          'You selected to use your own first → last period values. Before applying, fill every field in that section: ' +
            'all six pause times (first and last period for between-series, between-exercises, and between-areas), ' +
            'both series numbers, and both reps numbers.',
        );
        return;
      }

      const pausePair = (from: string, to: string): string | null => {
        const a = String(from ?? '').trim();
        const b = String(to ?? '').trim();
        if (!a || !b) return null;
        return interpolatedPauseForPeriod(a, b, cp, tp, PAUSE_OPTIONS);
      };

      const sectorPause = pausePair(s.sectorPauseFrom, s.sectorPauseTo);
      const macroEx = pausePair(s.macroExercisePauseFrom, s.macroExercisePauseTo);
      const macroEnd = pausePair(s.macroEndSectorPauseFrom, s.macroEndSectorPauseTo);

      const rf = String(s.repsProgressionFrom ?? '').trim();
      const rt = String(s.repsProgressionTo ?? '').trim();
      const repsFromN = parseInt(rf, 10);
      const repsToN = parseInt(rt, 10);

      const sf = String(s.seriesProgressionFrom ?? '').trim();
      const st = String(s.seriesProgressionTo ?? '').trim();
      const seriesFromN = parseInt(sf, 10);
      const seriesToN = parseInt(st, 10);

      setDays((prev) =>
        prev.map((day) => ({
          ...day,
          sectors: day.sectors.map((sec0) => {
            let sec = { ...sec0 };
            if (sectorPause) sec = applySectorScalarUpdate(sec, 'pause', sectorPause, trainingLevel);
            if (macroEx) sec = applySectorScalarUpdate(sec, 'macroExercise', macroEx, trainingLevel);
            if (macroEnd) sec = applySectorScalarUpdate(sec, 'macroEndOfSector', macroEnd, trainingLevel);
            if (!Number.isNaN(seriesFromN) && !Number.isNaN(seriesToN)) {
              const v = interpolatePeriodIntRounded(seriesFromN, seriesToN, cp, tp);
              const clamped = Math.min(20, Math.max(1, v));
              sec = applySectorScalarUpdate(sec, 'series', String(clamped), trainingLevel);
            }
            if (!Number.isNaN(repsFromN) && !Number.isNaN(repsToN)) {
              const v = interpolatePeriodIntRounded(repsFromN, repsToN, cp, tp);
              const clamped = Math.min(99, Math.max(0, v));
              sec = applySectorScalarUpdate(sec, 'reps', String(clamped), trainingLevel);
            }
            return ensureManualSectorShape(syncSectorExercisesFromLevelTable(sec, trainingLevel));
          }),
        }))
      );
      return;
    }

    applyCalculatedWorkoutParamsToDays();
  }, [yearlyPeriodSettings, trainingLevel, applyCalculatedWorkoutParamsToDays]);
  const handleReset  = () => {
    if (window.confirm('Reset all days and sectors and close? This cannot be undone.')) {
      setDays(padManualDaysToMaxSlots(buildInitialDays(MANUAL_PLAN_MAX_DAY_SLOTS)));
      setEditingRoutineName(null);
      onClose();
    }
  };

  const handleProceedLoadFromDay = () => {
    if (activeDayIndex < 1) return;
    const srcIdx = loadFromSourceIndex;
    if (srcIdx < 0 || srcIdx >= activeDayIndex) return;
    const sourceDay = stableDays[srcIdx];
    if (!sourceDay) return;
    setDays((prev) => {
      const next = [...prev];
      const cur = next[effectiveActiveDayIndex];
      if (!cur) return prev;
      next[effectiveActiveDayIndex] = {
        ...cur,
        routineName: sourceDay.routineName,
        sectors: sourceDay.sectors.map((s) => ensureManualSectorShape({ ...s })),
      };
      return next;
    });
    setEditingRoutineName(null);
  };

  const handleRescanSectors = useCallback(() => {
    if (!rescanParams) return;
    const n = clampWeeklyPlanDayCount(daysCount);
    const plan = buildHelpedRoutines({ ...rescanParams, daysCount: n, constantSectorsAtBeginning });
    setDaysCount(clampWeeklyPlanDayCount(plan.daysCount));
    const padded = padManualDaysToMaxSlots(plan.days.map(ensureManualDayPlan));
    const g = goals.length ? goals : (['hypertrophy'] as GoalId[]);
    const nPlan = clampWeeklyPlanDayCount(plan.daysCount);
    setDays(
      applyWorkoutParamDefaultsToManualDays(
        padded,
        g,
        trainingLevel,
        yearlyPeriodSettings,
        nPlan,
        wizardConstantSectorIds,
        manualDistConstantByDay
      )
    );
    setActiveDayIndex((i) => Math.min(i, Math.max(0, plan.days.length - 1)));
    setEditingRoutineName(null);
  }, [
    rescanParams,
    daysCount,
    constantSectorsAtBeginning,
    trainingLevel,
    goals,
    yearlyPeriodSettings,
    wizardConstantSectorIds,
    manualDistConstantByDay,
  ]);

  const onToggleConstantPlacement = (checked: boolean) => {
    setConstantSectorsAtBeginning(checked);
    if (mergedConstantSectorIds.size === 0) return;
    setDays((prev) => reorderDaysConstantPlacement(prev, mergedConstantSectorIds, checked));
  };

  const handleSeriesDistSave: SeriesDistDialogProps['onSave'] = useCallback((dayIdx, newSeriesCounts) => {
    setStableDays((prev) => prev.map((day, di) => {
      if (di !== dayIdx) return day;
      return {
        ...day,
        sectors: day.sectors.map((sec, si) => {
          const n = newSeriesCounts[si];
          if (n === undefined || Number.isNaN(n)) return ensureManualSectorShape(sec);
          const capped = Math.min(20, Math.max(0, Math.round(n)));
          const updated = syncSectorExercisesFromLevelTable(
            applySectorScalarUpdate(sec, 'series', String(capped), trainingLevel),
            trainingLevel
          );
          return ensureManualSectorShape(updated);
        }),
      };
    }));
  }, [trainingLevel]);

  const applyManualAutoProcess = useCallback(() => {
    setShowAutoWarn(false);
    const onlySecIdx = selectedSectorFrameIndex;
    const curPeriod = Math.max(1, Math.floor(yearlyPeriodSettings.currentPeriod || 1));
    const totalPeriods = Math.max(curPeriod, Math.floor(yearlyPeriodSettings.totalPeriods || 1));
    const goalSettings = readGoalParamsFromNutritionSettings(goals[activeDayIndex]);
    const scalars = computePlanGymWeekScalarDefaults({
      goalSettings,
      trainingLevel,
      currentPeriod: curPeriod,
      totalPeriods,
    });
    setStableDays((prev) =>
      prev.map((day, di) => {
        if (di !== activeDayIndex) return day;
        if (onlySecIdx == null) {
          return applyWorkoutParamDefaultsToOneDay(
            day,
            activeDayIndex,
            goals,
            trainingLevel,
            yearlyPeriodSettings,
            daysCount,
            wizardConstantSectorIds,
            manualDistConstantByDay
          );
        }
        return {
          ...day,
          sectors: day.sectors.map((sec, si) => {
            if (si !== onlySecIdx) return sec;
            return applyComputedScalarsToManualSector(sec, scalars, trainingLevel);
          }),
        };
      })
    );
  }, [
    activeDayIndex,
    selectedSectorFrameIndex,
    goals,
    trainingLevel,
    yearlyPeriodSettings,
    daysCount,
    wizardConstantSectorIds,
    manualDistConstantByDay,
  ]);

  const trainingLevelPhotoSrc = trainingLevel != null
    ? getPlanGymWeekTrainingLevelImageSrc(trainingLevel, trainingLevelImages) : headerImage ?? null;
  const trainingLevelDetail = trainingLevel != null ? getPlanGymWeekTrainingLevelLabel(trainingLevel) : null;

  const yearlyPeriodPreview = useMemo(() => {
    const s = yearlyPeriodSettings;
    const tp = Math.min(
      PLAN_YEAR_TOTAL_PERIODS_MAX,
      Math.max(PLAN_YEAR_TOTAL_PERIODS_MIN, Math.floor(s.totalPeriods))
    );
    const cp = Math.min(tp, Math.max(1, Math.floor(s.currentPeriod)));
    return { tp, cp };
  }, [yearlyPeriodSettings]);

  /** Interpolated reps + pauses + routine series total from `wp_goalParams` (level, period, sessions %). */
  const workoutParamsPeriodPreview = useMemo(() => {
    const tp = Math.min(
      PLAN_YEAR_TOTAL_PERIODS_MAX,
      Math.max(PLAN_YEAR_TOTAL_PERIODS_MIN, Math.floor(yearlyPeriodSettings.totalPeriods))
    );
    const cp = Math.min(tp, Math.max(1, Math.floor(yearlyPeriodSettings.currentPeriod)));
    const di = effectiveActiveDayIndex;
    const goalId = goals[di] ?? goals[0];
    const goalSettings = readGoalParamsFromNutritionSettings(goalId);
    const scalars = computePlanGymWeekScalarDefaults({
      goalSettings,
      trainingLevel,
      currentPeriod: cp,
      totalPeriods: tp,
    });
    const totalSeries = suggestedRoutineTotalSeriesForDistMask({
      trainingLevel,
      daysCount,
      goalId,
      currentPeriod: cp,
      totalPeriods: tp,
    });
    const baseVolume = volumeSeriesAtPeriod(goalSettings, trainingLevel, cp, tp);
    const sessionDeltaPct = readVolumeDeltaPctFromNutritionSettings(trainingLevel, daysCount);
    return {
      hasGoalParams: isGoalParamsSavedInNutritionSettings(goalId),
      pauseSeriesLabel: scalars.defaultPauseLabel,
      pauseExercisesLabel: scalars.defaultMacroExerciseLabel,
      pauseAreasLabel: scalars.defaultMacroEndSectorLabel,
      totalSeries,
      baseVolume,
      sessionDeltaPct,
      reps: scalars.defaultReps,
    };
  }, [
    effectiveActiveDayIndex,
    goals,
    trainingLevel,
    daysCount,
    yearlyPeriodSettings.currentPeriod,
    yearlyPeriodSettings.totalPeriods,
  ]);

  const yearlyManualRangesActive = yearlyScalarSource === 'manual';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-screen-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">

        {/* Modal header — Back stays here (not in the training-level image area below) */}
        <div className="sticky top-0 flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
              aria-label="Back to question menu"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900">Plan gym week – Manual sector selection</h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={cycleAllSectorsPctFormulaOnActiveDay}
              className="rounded-lg border border-violet-500 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100 whitespace-nowrap"
              title={`Cycle %1RM formula for all sectors on this day. Current: ${getPct1RmFormulaLabel(activeDayPctFormulaIndex)}. Next: ${getPct1RmFormulaLabel(nextPct1RmFormulaIndex(activeDayPctFormulaIndex))}`}
            >
              Recalc % 1RM ({getPct1RmFormulaLabel(activeDayPctFormulaIndex).charAt(0)})
            </button>
            <button
              type="button"
              onClick={toggleAllPyramidalFormsOnActiveDay}
              className="rounded-lg border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 whitespace-nowrap"
              title="Show or hide Reps & Weights / Rest & Alerts forms for every sector on this day"
            >
              {activeDayAnyPyramidalFormOpen ? 'Hide Pyramidals' : 'Show Pyramidals'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Training level + days count */}
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50 flex flex-wrap items-start gap-4">
            <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 bg-amber-100 border border-amber-200 rounded-lg overflow-hidden relative">
              {trainingLevelPhotoSrc ? (
                <Image src={trainingLevelPhotoSrc} alt={trainingLevelDetail ?? 'Training level'} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-700 text-xs text-center px-1">Image placeholder</div>
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
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    step={1}
                    value={daysCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setDaysCount((prev) =>
                        Number.isNaN(v) ? prev : clampWeeklyPlanDayCount(v)
                      );
                    }}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDaysCount((c) => Math.min(6, clampWeeklyPlanDayCount(c) + 1))
                    }
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100"
                    aria-label="Increase days"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDaysCount((c) => Math.max(1, clampWeeklyPlanDayCount(c) - 1))
                    }
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100"
                    aria-label="Decrease days"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysCount(clampWeeklyPlanDayCount(initialDaysCount))}
                    className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-500"
                    title="Reset to initial number of days"
                    aria-label="Reset days"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRescanSectors}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                      title={rescanParams ? 'Rebuild suggested sectors' : 'No source data available for rescan'}
                    >
                      Suggest other pairings
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={constantSectorsAtBeginning}
                      onChange={(e) => onToggleConstantPlacement(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Put constant sectors at the top</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Yearly plan period: total periods + current week slot; From/To drives interpolated pauses (and optional series/reps). */}
          <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 space-y-3">
            <div className="font-semibold text-sky-950">Yearly plan vs this week</div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm text-gray-800">
                <span className="font-medium">Total periods (yearly)</span>
                <select
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  value={yearlyPeriodSettings.totalPeriods}
                  onChange={(e) => {
                    const tp = parseInt(e.target.value, 10);
                    setYearlyPeriodSettings((prev) => ({
                      ...prev,
                      totalPeriods: tp,
                      currentPeriod: Math.min(tp, Math.max(1, prev.currentPeriod)),
                    }));
                  }}
                >
                  {Array.from(
                    { length: PLAN_YEAR_TOTAL_PERIODS_MAX - PLAN_YEAR_TOTAL_PERIODS_MIN + 1 },
                    (_, i) => PLAN_YEAR_TOTAL_PERIODS_MIN + i
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-800">
                <span className="font-medium">Current period (this week)</span>
                <select
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  value={yearlyPeriodSettings.currentPeriod}
                  onChange={(e) =>
                    setYearlyPeriodSettings((prev) => ({
                      ...prev,
                      currentPeriod: parseInt(e.target.value, 10),
                    }))
                  }
                >
                  {Array.from({ length: yearlyPeriodSettings.totalPeriods }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              aria-expanded={manualPeriodStartEndOpen}
              onClick={() => setManualPeriodStartEndOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-left text-sm font-medium text-sky-950 hover:bg-sky-50/80"
            >
              <span>Select manually start-end values in the periods</span>
              {manualPeriodStartEndOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />
              )}
            </button>

            {manualPeriodStartEndOpen ? (
              <div className="space-y-3 rounded-lg border border-sky-200 bg-white/70 p-3">
                <fieldset className="space-y-2 rounded border border-sky-200 bg-sky-50/40 p-2">
                  <legend className="px-1 text-xs font-semibold text-gray-900">
                    Apply to all sectors — data source
                  </legend>
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-800">
                    <input
                      type="radio"
                      name="yearly-period-scalars-source"
                      className="mt-0.5 shrink-0"
                      checked={yearlyScalarSource === 'calculated'}
                      onChange={() =>
                        setYearlyPeriodSettings((p) => ({ ...p, periodScalarsSource: 'calculated' }))
                      }
                    />
                    <span>
                      <span className="font-semibold">Workout parameters (calculated)</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-gray-600">
                        The apply button uses your saved goal tables, training level, and the current period slot
                        above — not the typed ranges in this section.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-gray-800">
                    <input
                      type="radio"
                      name="yearly-period-scalars-source"
                      className="mt-0.5 shrink-0"
                      checked={yearlyScalarSource === 'manual'}
                      onChange={() =>
                        setYearlyPeriodSettings((p) => ({ ...p, periodScalarsSource: 'manual' }))
                      }
                    />
                    <span>
                      <span className="font-semibold">My typed first → last period ranges</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-gray-600">
                        The apply button interpolates from every field below. All pause times, series, and reps cells
                        must be filled or you will get a reminder instead of applying.
                      </span>
                    </span>
                  </label>
                </fieldset>

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
                            setYearlyPeriodSettings((p) => ({
                              ...p,
                              seriesProgressionFrom: e.target.value,
                            }))
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
                            setYearlyPeriodSettings((p) => ({
                              ...p,
                              seriesProgressionTo: e.target.value,
                            }))
                          }
                        />
                        <span className="text-center text-[11px] font-semibold text-sky-900">last period</span>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">Series From → To</span>
                    <p className="max-w-md text-[10px] leading-snug text-gray-500">
                      {yearlyManualRangesActive ? (
                        <>
                          When you apply with <strong>My typed ranges</strong> selected, interpolated series are
                          written to <strong>each sector</strong> (then use Series distribution settings if you want to
                          rebalance totals).
                        </>
                      ) : (
                        <>
                          Preview only while <strong>Workout parameters</strong> is selected for apply. Switch to
                          typed ranges and fill all cells to drive series from this row.
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
                            setYearlyPeriodSettings((p) => ({
                              ...p,
                              repsProgressionFrom: e.target.value,
                            }))
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
                            setYearlyPeriodSettings((p) => ({
                              ...p,
                              repsProgressionTo: e.target.value,
                            }))
                          }
                        />
                        <span className="text-center text-[11px] font-semibold text-sky-900">last period</span>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">Reps From → To</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded border border-sky-200 bg-white px-3 py-2 text-xs text-gray-800 space-y-2">
              <div className="font-semibold text-sky-900">
                Preview for period {yearlyPeriodPreview.cp} of {yearlyPeriodPreview.tp}
              </div>
              <div
                className="rounded border-2 border-rose-400 bg-rose-50/70 px-2.5 py-2 space-y-1.5 shadow-sm"
                title="From Workouts parameters settings: training level, first→last period tables, and session volume %."
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-rose-900">
                  From workout parameters (calculated)
                </div>
                <div className="text-[11px] leading-snug">
                  Between series · Between exercises · Between areas:{' '}
                  <span className="font-mono tabular-nums text-gray-900">
                    {workoutParamsPeriodPreview.pauseSeriesLabel} ·{' '}
                    {workoutParamsPeriodPreview.pauseExercisesLabel} ·{' '}
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

            <button
              type="button"
              onClick={applyYearlyScalarsToAllDays}
              className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              title={
                yearlyManualRangesActive
                  ? 'Requires every pause, series, and reps cell in the expanded section.'
                  : 'Uses workout parameters for the current period, not the typed cells.'
              }
            >
              {yearlyManualRangesActive
                ? 'Apply my typed ranges to all sectors (all days)'
                : 'Apply calculated workout parameters to all sectors (all days)'}
            </button>
          </div>

          {/* Primary action buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" onClick={handleCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
              Create routines and nutrition_components
            </button>
            <button type="button" onClick={handleReset} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium">
              Reset all &amp; close
            </button>
            <button type="button" onClick={() => setViewMode(viewMode === 'fullOverview' ? 'edit' : 'fullOverview')}
              className={`px-4 py-2 rounded-lg font-medium border-2 ${viewMode === 'fullOverview' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
              {viewMode === 'fullOverview' ? 'Back to edit' : 'Full overview of workout'}
            </button>
          </div>

          {viewMode === 'fullOverview' ? (
            /* ── Full overview ── */
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
                      {getGoalLabel(goals[dayIdx]) ? <span className="text-sm text-gray-600">Goal: {getGoalLabel(goals[dayIdx])}</span> : null}
                      {day.sectors.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDayIndex(dayIdx);
                            setShowSeriesDist(true);
                          }}
                          className="ml-auto shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-900"
                        >
                          New settings
                        </button>
                      ) : null}
                    </div>
                    <div className="p-3 space-y-2">
                      {day.sectors.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No muscular areas in this day.</p>
                      ) : day.sectors.map((sec, secIdx) => {
                        const overviewDropTarget =
                          sectorDropHighlight?.dayIdx === dayIdx && sectorDropHighlight?.secIdx === secIdx;
                        const constantIdsForDay = getConstantSectorIdsForDay(dayIdx);
                        const isConstantSector =
                          constantIdsForDay.has(sec.sectorId) || constantIdsForDay.has(sec.sectorLabel);
                        return (
                          <div
                            key={`${sec.sectorId}-${secIdx}`}
                            onDragOver={(e) => {
                              const types = Array.from(e.dataTransfer.types);
                              const isReorder = types.includes(SECTOR_REORDER_DRAG_MIME);
                              const isMuscle = types.includes('text/plain');
                              if (!isReorder && !isMuscle) return;
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = isReorder ? 'move' : 'copy';
                              setSectorDropHighlight({ dayIdx, secIdx });
                            }}
                            onDragLeave={(e) => {
                              const rel = e.relatedTarget as Node | null;
                              if (rel && e.currentTarget.contains(rel)) return;
                              setSectorDropHighlight((h) =>
                                h?.dayIdx === dayIdx && h?.secIdx === secIdx ? null : h
                              );
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSectorDropHighlight(null);
                              const reorderRaw = e.dataTransfer.getData(SECTOR_REORDER_DRAG_MIME);
                              if (reorderRaw) {
                                try {
                                  const parsed = JSON.parse(reorderRaw) as { dayIdx?: number; from?: number };
                                  const d = parsed.dayIdx;
                                  const from = parsed.from;
                                  if (
                                    typeof d === 'number' &&
                                    typeof from === 'number' &&
                                    d === dayIdx &&
                                    from >= 0 &&
                                    from !== secIdx
                                  ) {
                                    reorderSectorFrameTo(d, from, secIdx);
                                  }
                                } catch {
                                  /* ignore */
                                }
                                return;
                              }
                              const id = (e.dataTransfer.getData('text/plain') || '').trim();
                              if (id && MUSCLE_GROUPS.some((g) => g.id === id)) {
                                substituteSectorIdentity(dayIdx, secIdx, id);
                              }
                            }}
                            className={`flex flex-wrap items-center gap-3 py-2 px-3 text-sm ${
                              overviewDropTarget
                                ? 'rounded border-2 border-sky-500 bg-sky-50 ring-2 ring-sky-400/60'
                                : 'rounded border border-gray-100 bg-gray-50'
                            }`}
                          >
                            <span className="text-gray-500 font-medium w-6 shrink-0">#{secIdx + 1}</span>
                            <div className="relative h-10 w-10 shrink-0">
                              <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                            </div>
                            <span
                              className={`min-w-[100px] shrink-0 font-medium ${isConstantSector ? 'font-bold text-red-600' : 'text-gray-900'}`}
                            >
                              {sec.sectorLabel}
                            </span>
                            <span className="min-w-0 flex-1 text-gray-600">
                              {sectorExercisesCount(sec, trainingLevel)} ex · {sec.series} series · reps{' '}
                              {sec.seriesReps?.join('/') ?? sec.reps} ·
                              Pyramidal {sec.pyramidal ?? 'flat'} · Pause (series) {sec.pause || '—'}
                            </span>
                            <span className="text-gray-500 text-xs shrink-0">
                              Pause (ex.) {sec.macroExercise || '—'} · Macro end sector {sec.macroEndOfSector}
                            </span>
                            <div className="ml-auto flex shrink-0 items-center gap-0.5 border-l border-gray-200 pl-2">
                              <span
                                draggable
                                onDragStart={(ev) => {
                                  ev.stopPropagation();
                                  ev.dataTransfer.setData(
                                    SECTOR_REORDER_DRAG_MIME,
                                    JSON.stringify({ dayIdx, from: secIdx })
                                  );
                                  ev.dataTransfer.effectAllowed = 'move';
                                }}
                                className="cursor-grab rounded p-1 text-gray-600 hover:bg-gray-200 active:cursor-grabbing"
                                title="Drag to reorder this sector (whole frame)"
                                aria-label="Drag to reorder this sector"
                                role="presentation"
                              >
                                <GripVertical className="h-5 w-5" aria-hidden />
                              </span>
                              <button
                                type="button"
                                onClick={() => moveSector(dayIdx, secIdx, 'up')}
                                disabled={secIdx === 0}
                                className="rounded p-1 hover:bg-gray-200 disabled:opacity-40"
                                aria-label="Move sector up"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSector(dayIdx, secIdx, 'down')}
                                disabled={secIdx === day.sectors.length - 1}
                                className="rounded p-1 hover:bg-gray-200 disabled:opacity-40"
                                aria-label="Move sector down"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const label = (sec.sectorLabel || 'this sector').trim() || 'this sector';
                                  if (
                                    typeof window !== 'undefined' &&
                                    !window.confirm(
                                      `Remove "${label}" from day ${dayIdx + 1}? This cannot be undone.`
                                    )
                                  ) {
                                    return;
                                  }
                                  removeSector(dayIdx, secIdx);
                                }}
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                aria-label="Remove sector"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
          <>
              {/* Day tabs */}
          <div className="flex flex-wrap gap-1 border-b-4 border-gray-800">
            {stableDays.map((day, idx) => {
              const goalLabel = getGoalLabel(goals[idx]);
                  const defaultName = `Day ${idx + 1}`;
                  const hasCustomName = (day.routineName || '').trim() !== '' && day.routineName !== defaultName;
              return (
                    <button key={idx} type="button" onClick={() => setActiveDayIndex(idx)}
                      className={`px-3 py-2 rounded-t-lg font-medium text-sm text-left max-w-[200px] ${
                        activeDayIndex === idx
                          ? 'border border-b-0 border-amber-600 bg-amber-400 text-amber-950 shadow-sm'
                          : 'border border-transparent bg-gray-300 text-gray-900 hover:bg-gray-400'
                      }`}
                      title={`Day ${idx + 1}${hasCustomName ? `: ${day.routineName}` : ''}${goalLabel ? ` — ${goalLabel}` : ''}`}
                >
                  <span className="font-semibold">Day {idx + 1}</span>
                      {hasCustomName ? <span className="block text-xs font-normal opacity-90 truncate">{day.routineName}</span> : null}
                      {goalLabel  ? <span className="block text-[10px] text-gray-800 truncate mt-0.5">Goal: {goalLabel}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
                {/* Routine name */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Routine name</span>
              {editingRoutineName !== null ? (
                <>
                      <input type="text" value={draftRoutineName}
                    onChange={(e) => setDraftRoutineName(e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-48" placeholder="Routine name" />
                      <button type="button" onClick={saveRoutineName} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Save</button>
                      <button type="button" onClick={cancelRoutineNameEdit} className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-gray-900">{activeDay.routineName}</span>
                      <button type="button" onClick={startEditRoutineName} className="text-sm text-amber-600 hover:underline">Edit</button>
                </>
              )}
            </div>
            {getGoalLabel(goals[activeDayIndex]) ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-gray-700">Goal</span>
                <span className="text-sm font-bold text-gray-900">{getGoalLabel(goals[activeDayIndex])}</span>
              </div>
            ) : null}

            {/* Muscular area picker — always at top of day editor (single row) */}
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-3">
              <div className="mb-1 text-sm font-semibold text-gray-800">Add a muscular area (click to add to this day)</div>
              <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 bg-white px-2 py-2 shadow-inner [scrollbar-gutter:stable]">
                <div className="flex w-max flex-nowrap items-stretch justify-start gap-1.5 sm:gap-2">
                  {MUSCLE_GROUPS.map((group) => {
                    const added = !canAddSector(group.id);
                    return (
                      <div
                        key={group.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', group.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => {
                          if (!added) addSector(group.id);
                        }}
                        onKeyDown={(e) => {
                          if (added) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            addSector(group.id);
                          }
                        }}
                        className={`flex w-[4.75rem] shrink-0 cursor-grab flex-col items-center justify-center rounded-lg border-2 p-1.5 transition-all active:cursor-grabbing sm:w-[5.25rem] ${
                          added
                            ? 'border-gray-200 bg-gray-100 opacity-75 hover:border-amber-300'
                            : 'border-gray-300 bg-white hover:border-amber-400 hover:bg-amber-50'
                        }`}
                        title={
                          added
                            ? `${group.label} — already on this day (drag onto a frame to replace that sector)`
                            : `Add ${group.label} — or drag onto a frame to substitute`
                        }
                      >
                        <div className="relative mb-0.5 h-10 w-10 sm:h-11 sm:w-11 pointer-events-none">
                          <Image src={group.image} alt={group.label} fill className="object-contain" unoptimized />
                        </div>
                        <span className="pointer-events-none text-center text-[10px] font-medium leading-tight text-gray-800 sm:text-xs">
                          {group.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-sm font-medium text-gray-700">
              Select the muscular area you want to train in this day ({activeDayIndex + 1}/{daysCount})
            </div>

                {/* ── Stats bar ── */}
                {activeDay.sectors.length > 0 && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-gray-100 border border-gray-200 px-4 py-2 text-sm">
                    <span title="Sum of exercises across all muscular areas on this day">
                      Total exercises <strong className="text-gray-900">{totalExercises}</strong>
                    </span>
                    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-gray-800">Total series</span>
                      <strong
                        className="tabular-nums rounded-md bg-emerald-50 px-2 py-0.5 text-gray-900 ring-2 ring-emerald-500/70"
                        title={
                          showCalculatedTotalInStats
                            ? 'Routine total from Workouts parameters (training level, period, session volume %).'
                            : 'Sum of series in each muscular area on this day.'
                        }
                      >
                        {totalSeriesForStatsBar}
                      </strong>
                      {showCalculatedTotalInStats && sumSeriesInAreas !== totalSeriesForStatsBar ? (
                        <span className="text-xs text-gray-600">
                          (sum in areas: {sumSeriesInAreas})
                        </span>
                      ) : null}
                    </span>
                    <span>Average for area <strong className="text-gray-900">{avgSeriesPerArea}</strong></span>
                    <span title="Average of Reps values in all series rows (not the header Reps field)">
                      Average repetitions <strong className="text-gray-900">{avgReps}</strong>
                    </span>
                    <span title="Average of Pause values in all series rows (not the header Pause dropdown)">
                      Break average <strong className="text-gray-900">{breakAvg}</strong>
                    </span>
                  </div>
                )}

                {/* ── Sector chips + distribution / auto-process (same flow as fast plan) ── */}
                {activeDay.sectors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Sector – Muscular areas for this day ({activeDay.sectors.length} selected)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeDay.sectors.map((sec, chipIdx) => {
                        const constantIdsForDay = getConstantSectorIdsForDay(activeDayIndex);
                        const isConstantSector =
                          constantIdsForDay.has(sec.sectorId) || constantIdsForDay.has(sec.sectorLabel);
                        return (
                        <span
                          key={`${sec.sectorId}-${chipIdx}`}
                          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-gray-800"
                          style={{ borderLeftColor: getSectorColor(sec.sectorId, chipIdx), borderLeftWidth: 3 }}
                        >
                          <span className="relative inline-block h-7 w-7 flex-shrink-0">
                            <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                          </span>
                          <span className="min-w-0 flex flex-col leading-tight">
                            <span className={`font-medium ${isConstantSector ? 'font-bold text-red-600' : 'text-gray-900'}`}>
                              {sec.sectorLabel}
                            </span>
                            <span className="font-bold text-amber-800">
                              {sec.series > 0 ? `${sec.series} series` : 'series'}
                            </span>
                          </span>
                        </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAutoWarn(true)}
                        title={
                          selectedSectorFrameIndex != null
                            ? 'Recalculate Exercises, Series, Reps and Macros for the selected sector (yellow frame) only'
                            : 'Recalculate Exercises, Series, Reps and Macros for every sector on this day'
                        }
                        className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                      >
                        <Settings className="h-4 w-4 shrink-0" aria-hidden />
                        Automatic processing procedure
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSeriesDist(true)}
                        title="Open the mask to set total series per workout and share of series per muscular area"
                        className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
                      >
                        New settings
                      </button>
                    </div>
                  </div>
                )}

                {/* Load from previous day */}
                {activeDayIndex >= 1 ? (
                  <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <label htmlFor="load-from-day-select" className="text-xs font-semibold text-gray-700">Load from</label>
                      <select id="load-from-day-select" value={loadFromSourceIndex}
                        onChange={(e) => setLoadFromSourceIndex(parseInt(e.target.value, 10))}
                        className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-900 min-w-[7rem]">
                        {Array.from({ length: activeDayIndex }, (_, i) => (
                          <option key={i} value={i}>Day {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={handleProceedLoadFromDay}
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                      Proceed
                    </button>
                  </div>
                ) : null}

                {/* ── Sector list ── */}
            <div className="space-y-2">
              {activeDay.sectors.length === 0 ? (
                <p className="text-sm text-gray-500">No muscular areas added yet. Use the grid below to add sectors.</p>
              ) : (
                activeDay.sectors.map((sec, secIdx) => {
                  const lastWorkout = nutritionPlan ? getLastWorkoutBySector(nutritionPlan, sec.sectorLabel, sec.sectorId) : null;
                  const constantIdsForDay = getConstantSectorIdsForDay(activeDayIndex);
                  const isConstantSector =
                    constantIdsForDay.has(sec.sectorId) || constantIdsForDay.has(sec.sectorLabel);
                      const isPctMode   = sec.typeByPercent ?? false;
                  const frameSelected = selectedSectorFrameIndex === secIdx;
                  const dropTarget =
                    sectorDropHighlight?.dayIdx === activeDayIndex &&
                    sectorDropHighlight?.secIdx === secIdx;
                  return (
                        <div
                          key={`${sec.sectorId}-${secIdx}`}
                          role="group"
                          onClick={() =>
                            setSelectedSectorFrameIndex((prev) => (prev === secIdx ? null : secIdx))
                          }
                          onDragOver={(e) => {
                            const types = Array.from(e.dataTransfer.types);
                            const isReorder = types.includes(SECTOR_REORDER_DRAG_MIME);
                            const isMuscle = types.includes('text/plain');
                            if (!isReorder && !isMuscle) return;
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = isReorder ? 'move' : 'copy';
                            setSectorDropHighlight({ dayIdx: activeDayIndex, secIdx });
                          }}
                          onDragLeave={(e) => {
                            const rel = e.relatedTarget as Node | null;
                            if (rel && e.currentTarget.contains(rel)) return;
                            setSectorDropHighlight((h) =>
                              h?.dayIdx === activeDayIndex && h?.secIdx === secIdx ? null : h
                            );
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSectorDropHighlight(null);
                            const reorderRaw = e.dataTransfer.getData(SECTOR_REORDER_DRAG_MIME);
                            if (reorderRaw) {
                              try {
                                const parsed = JSON.parse(reorderRaw) as { dayIdx?: number; from?: number };
                                const d = parsed.dayIdx;
                                const from = parsed.from;
                                if (
                                  typeof d === 'number' &&
                                  typeof from === 'number' &&
                                  d === activeDayIndex &&
                                  from >= 0 &&
                                  from !== secIdx
                                ) {
                                  reorderSectorFrameTo(d, from, secIdx);
                                }
                              } catch {
                                /* ignore */
                              }
                              return;
                            }
                            const id = (e.dataTransfer.getData('text/plain') || '').trim();
                            if (id && MUSCLE_GROUPS.some((g) => g.id === id)) {
                              substituteSectorIdentity(activeDayIndex, secIdx, id);
                            }
                          }}
                          className={`flex w-full cursor-pointer flex-col gap-2 rounded-lg border p-3 transition-shadow ${
                            dropTarget
                              ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-400/80 ring-offset-2'
                              : frameSelected
                                ? 'border-amber-400 bg-[rgb(255,252,205)] ring-2 ring-amber-400/90 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          aria-label={`${sec.sectorLabel} frame ${secIdx + 1}. Click to choose insert position, drop a muscle to replace, or drop a reordered frame here.`}
                        >

                          {/* Sector header — one row, mint background (RGB 209,240,236) */}
                          <div
                            className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-teal-200/90 px-2 py-1.5 sm:flex-nowrap"
                            style={{ backgroundColor: 'rgb(209, 240, 236)' }}
                          >
                            <span className="shrink-0 text-sm font-semibold text-gray-600">#{secIdx + 1}</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <div className="relative h-9 w-9 sm:h-10 sm:w-10">
                                <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                              </div>
                              <span
                                className={`text-sm font-bold ${isConstantSector ? 'text-red-600' : 'text-gray-900'}`}
                              >
                                {sec.sectorLabel}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 overflow-x-auto text-xs text-gray-800 [scrollbar-width:thin]">
                              {lastWorkout ? (
                                <span className="inline-flex min-w-max items-center gap-x-1 whitespace-nowrap tabular-nums">
                                  <span className="font-semibold text-teal-900">
                                    Last planned{' '}
                                    {[
                                      lastWorkout.planWeekLabel,
                                      lastWorkout.date?.trim()
                                        ? formatLastWorkoutDate(lastWorkout.date)
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                  <span className="text-teal-700/80" aria-hidden>
                                    |
                                  </span>
                                  <span>{lastWorkout.totalSeries} series</span>
                                  <span className="text-teal-700/80" aria-hidden>
                                    |
                                  </span>
                                  <span>Rip/set {lastWorkout.aveRepsPerSet}</span>
                                  <span className="text-teal-700/80" aria-hidden>
                                    |
                                  </span>
                                  <span>Total Reps {lastWorkout.totalReps}</span>
                                  <span className="text-teal-700/80" aria-hidden>
                                    |
                                  </span>
                                  <span>Pause {lastWorkout.pause?.trim() ? lastWorkout.pause : '—'}</span>
                                  <span className="text-teal-700/80" aria-hidden>
                                    |
                                  </span>
                                  <span>AvePause/set {lastWorkout.avePausePerSet}</span>
                                </span>
                              ) : (
                                <span className="text-gray-600 italic">
                                  No planned data for this sector in your saved plan
                                </span>
                              )}
                            </div>
                            <div className="ml-auto flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <span
                                draggable
                                onDragStart={(ev) => {
                                  ev.stopPropagation();
                                  ev.dataTransfer.setData(
                                    SECTOR_REORDER_DRAG_MIME,
                                    JSON.stringify({ dayIdx: activeDayIndex, from: secIdx })
                                  );
                                  ev.dataTransfer.effectAllowed = 'move';
                                }}
                                className="cursor-grab rounded p-1 text-gray-600 hover:bg-white/80 active:cursor-grabbing"
                                title="Drag frame to another position"
                                aria-label="Drag to reorder this exercise frame"
                                role="presentation"
                              >
                                <GripVertical className="h-5 w-5" aria-hidden />
                              </span>
                              <button type="button" onClick={() => moveSector(activeDayIndex, secIdx, 'up')}
                                disabled={secIdx === 0}
                                className="rounded p-1 hover:bg-white/60 disabled:opacity-40" aria-label="Move up">
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => moveSector(activeDayIndex, secIdx, 'down')}
                                disabled={secIdx === activeDay.sectors.length - 1}
                                className="rounded p-1 hover:bg-white/60 disabled:opacity-40" aria-label="Move down">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const label = (sec.sectorLabel || 'this sector').trim() || 'this sector';
                                  if (
                                    typeof window !== 'undefined' &&
                                    !window.confirm(
                                      `Remove "${label}" from this day? This cannot be undone.`
                                    )
                                  ) {
                                    return;
                                  }
                                  removeSector(activeDayIndex, secIdx);
                                }}
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                                aria-label="Remove sector"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Sector controls — macros grouped on the right */}
                    <div
                      className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <label
                        className="flex items-center gap-1 text-xs text-gray-600"
                        title="From the series distribution table (training level × total series planned)."
                      >
                        Number of exercises
                        <span
                          className="inline-flex min-w-[2.5rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-2 py-0.5 text-sm font-semibold tabular-nums text-gray-900"
                          aria-label={`Number of exercises: ${sectorExercisesCount(sec, trainingLevel)}`}
                        >
                          {sectorExercisesCount(sec, trainingLevel)}
                        </span>
                      </label>
                      <label
                        className="flex items-center gap-1 text-xs text-gray-600"
                        title="Number of series in this area."
                      >
                        series
                        <SectorScalarStepper
                          value={sec.series > 0 ? sec.series : 0}
                          min={1}
                          max={20}
                          disabled={false}
                          onChange={(v) => updateSector(activeDayIndex, secIdx, 'series', v)}
                        />
                      </label>
                            <label
                              className="text-xs text-gray-600 flex items-center gap-1"
                              title="Reference default reps for every series in this sector (from Workouts parameters: goal, training level, yearly period). Edit per row in the table to override."
                            >
                              Reps
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={sec.reps > 0 ? sec.reps : ''}
                                placeholder={
                                  workoutParamsReferenceScalars.hasGoalParams
                                    ? String(workoutParamsReferenceScalars.reps)
                                    : '12'
                                }
                                onChange={(e) =>
                                  updateSector(activeDayIndex, secIdx, 'reps', e.target.value)
                                }
                                className={`w-14 rounded border px-1 py-0.5 text-center text-sm tabular-nums ${
                                  workoutParamsReferenceScalars.hasGoalParams &&
                                  sec.reps > 0 &&
                                  sec.reps === workoutParamsReferenceScalars.reps
                                    ? 'border-emerald-500 bg-emerald-50 font-semibold text-gray-900 ring-2 ring-emerald-500/60'
                                    : 'border-gray-300'
                                }`}
                              />
                            </label>
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => toggleSectorPyramidalForm(activeDayIndex, secIdx, e)}
                                className={`rounded border px-1.5 py-0.5 text-xs font-bold transition-colors ${
                                  isPyramidalFormOpen(activeDayIndex, secIdx)
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-gray-400 bg-white text-gray-800 hover:bg-gray-50'
                                }`}
                                title="Show or hide Reps & Weights / Rest & Alerts form for this sector"
                              >
                                Pyramidal
                              </button>
                              <select
                                value={sec.pyramidal}
                                onChange={(e) =>
                                  updateSector(activeDayIndex, secIdx, 'pyramidal', e.target.value)
                                }
                                className="min-w-[7rem] rounded border border-gray-300 py-0.5 text-sm"
                              >
                                {PYRAMIDAL_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <InfoRepsHelpButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInfoRepsModalOpen(true);
                                }}
                              />
                            </div>
                      <label
                        className="text-xs text-gray-600 flex items-center gap-1"
                        title="Pause between series (sets). Changing this sets every series row’s Pause to the same value; pick Calc (…) on a row to follow the sector headers and exercise split again."
                      >
                        Pause
                        {(() => {
                          const raw = String(sec.pause ?? '').trim();
                          const extra =
                            raw !== '' && !PAUSE_OPTIONS.includes(raw) ? raw : null;
                          return (
                            <select
                              value={raw}
                              onChange={(e) =>
                                updateSector(activeDayIndex, secIdx, 'pause', e.target.value)
                              }
                              className={`min-w-[4.5rem] max-w-[6.5rem] rounded border border-gray-300 bg-white px-1 py-0.5 text-center text-sm tabular-nums ${
                                workoutParamsReferenceScalars.hasGoalParams &&
                                raw === String(workoutParamsReferenceScalars.pauseSeries ?? '').trim()
                                  ? 'border-emerald-500 bg-emerald-50 font-semibold text-gray-900 ring-2 ring-emerald-500/60'
                                  : 'text-gray-800'
                              }`}
                            >
                              <option value="">—</option>
                              {extra != null ? (
                                <option value={extra}>{extra}</option>
                              ) : null}
                              {PAUSE_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </label>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center gap-2 shrink-0">
                      <label
                        className="text-xs text-gray-600 flex items-center gap-1"
                        title="Pause between exercises in this sector. Used with Pause (series) and Macro end sector to compute each row’s Calc (…) default; changing it refreshes row pauses from those headers when rows follow Calc."
                      >
                        Macro exercises
                        {(() => {
                          const raw = String(sec.macroExercise ?? '').trim();
                          const extra =
                            raw !== '' && !PAUSE_OPTIONS.includes(raw) ? raw : null;
                          return (
                            <select
                              value={raw}
                              onChange={(e) =>
                                updateSector(
                                  activeDayIndex,
                                  secIdx,
                                  'macroExercise',
                                  e.target.value,
                                )
                              }
                              className={`min-w-[4.5rem] max-w-[6.5rem] rounded border border-gray-300 bg-white px-1 py-0.5 text-center text-sm tabular-nums ${
                                workoutParamsReferenceScalars.hasGoalParams &&
                                raw === String(workoutParamsReferenceScalars.pauseExercises ?? '').trim()
                                  ? 'border-emerald-500 bg-emerald-50 font-semibold text-gray-900 ring-2 ring-emerald-500/60'
                                  : 'text-gray-800'
                              }`}
                            >
                              <option value="">—</option>
                              {extra != null ? (
                                <option value={extra}>{extra}</option>
                              ) : null}
                              {PAUSE_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </label>
                      <label
                        className="text-xs text-gray-600 flex items-center gap-1"
                        title="Pause after this sector (before the next area). Used with the other header pauses to compute each row’s Calc (…) default; changing it refreshes row pauses from those headers when rows follow Calc."
                      >
                        Macro end sector
                        {(() => {
                          const raw = String(sec.macroEndOfSector ?? '').trim();
                          const extra =
                            raw !== '' && !PAUSE_OPTIONS.includes(raw) ? raw : null;
                          return (
                            <select
                              value={raw}
                              onChange={(e) =>
                                updateSector(
                                  activeDayIndex,
                                  secIdx,
                                  'macroEndOfSector',
                                  e.target.value,
                                )
                              }
                              className={`min-w-[4.5rem] max-w-[6.5rem] rounded border border-gray-300 bg-white px-1 py-0.5 text-center text-sm tabular-nums ${
                                workoutParamsReferenceScalars.hasGoalParams &&
                                raw === String(workoutParamsReferenceScalars.pauseAreas ?? '').trim()
                                  ? 'border-emerald-500 bg-emerald-50 font-semibold text-gray-900 ring-2 ring-emerald-500/60'
                                  : 'text-gray-800'
                              }`}
                            >
                              <option value="">—</option>
                              {extra != null ? (
                                <option value={extra}>{extra}</option>
                              ) : null}
                              {PAUSE_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </label>
                      </div>
                    </div>

                          {/* ── REPS & WEIGHTS table (compact; toggled via Pyramidal) ── */}
                          {isPyramidalFormOpen(activeDayIndex, secIdx) ? (
                          <div
                            className="w-full max-w-[min(100%,52rem)] overflow-hidden rounded-lg border border-blue-200 bg-blue-50/40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]">
                              <div className="min-w-[44rem]">
                                <div className="flex flex-nowrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-100/80 px-3 py-2">
                                  <div className="flex min-w-0 flex-nowrap items-center gap-2">
                                    <span className="text-[13px] leading-none shrink-0" aria-hidden>💪</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-800 whitespace-nowrap">
                                      REPS &amp; WEIGHTS
                                    </span>
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-200/80 px-1.5 py-0.5 text-[9px] font-bold text-blue-900 tabular-nums">
                                      {sec.series} series
                                    </span>
                                    <label
                                      htmlFor={`pct-mode-${sec.sectorId}-${secIdx}`}
                                      className="flex shrink-0 cursor-pointer select-none items-center gap-1"
                                    >
                                      <input
                                        id={`pct-mode-${sec.sectorId}-${secIdx}`}
                                        type="checkbox"
                                        checked={isPctMode}
                                        onChange={(e) => setTypeByPercent(activeDayIndex, secIdx, e.target.checked)}
                                        className="h-3 w-3 shrink-0 rounded border-gray-400"
                                      />
                                      <span className="text-[10px] font-semibold text-red-600 whitespace-nowrap">
                                        Type by %1MR
                                      </span>
                                    </label>
                                  </div>
                                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-blue-900 whitespace-nowrap">
                                    REST &amp; ALERTS
                                  </span>
                                </div>

                                <div className="max-h-[240px] overflow-y-auto bg-white">
                                  <table className="w-full min-w-[44rem] text-[11px] border-collapse">
                                    <colgroup>
                                      <col className="w-8" />
                                      <col className="w-14" />
                                      <col className="w-[6.5rem]" />
                                      <col className="w-14" />
                                      <col className="w-[6.5rem]" />
                                      <col className="w-32" />
                                      <col className="w-[4.5rem]" />
                                    </colgroup>
                                    <thead className="sticky top-0 z-[1] bg-gray-100">
                                      <tr>
                                        <th className="border border-gray-300 px-1 py-1 text-center bg-gray-100">#</th>
                                        <th className="border border-gray-300 px-1 py-1 text-center bg-gray-100">Reps</th>
                                        <th className="border border-gray-300 px-1 py-1 text-center whitespace-nowrap bg-gray-100">
                                          % on 1 MR
                                        </th>
                                        <th
                                          className="border border-gray-300 px-1 py-1 text-center bg-gray-200 text-[10px] text-gray-500"
                                          title="Weights are entered per exercise after exercises are assigned to this sector"
                                        >
                                          Wt
                                        </th>
                                        <th className="border border-gray-300 px-1 py-1 text-center bg-gray-100">Pause</th>
                                        <th className="border border-gray-300 px-1 py-1 text-center bg-gray-100">Alert</th>
                                        <th className="border border-gray-300 px-0.5 py-1 bg-gray-100" aria-label="Row actions" />
                                      </tr>
                                    </thead>
                                <tbody>
                                  {Array.from({ length: sec.series }, (_, rowIdx) => {
                                    // Prefer raw; if empty, show sector-derived reps so workout-parameter defaults appear in the grid.
                                    const { reps: currentReps, raw: repsCellValue } = displayedSeriesRepAt(sec, rowIdx);
                                    const hasReps = repsCellValue !== '';

                                    const pctRow = sec.seriesPcts?.[rowIdx];
                                    const calcRepsFromPct =
                                      isPctMode && pctRow != null && !Number.isNaN(pctRow)
                                        ? sectorRepsFromPct(sec, pctRow)
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
                                        <td className="border border-gray-300 px-2 py-1 text-center font-semibold bg-gray-50">{rowIdx + 1}</td>

                                        {/* Reps cell — blank until user types */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          <input
                                            type="text" inputMode="numeric"
                                            value={repsCellValue}
                                            placeholder="—"
                                            onChange={(e) => isPctMode
                                              ? updateSeriesRepAtPctMode(activeDayIndex, secIdx, rowIdx, e.target.value)
                                              : updateSeriesRepAt(activeDayIndex, secIdx, rowIdx, e.target.value)
                                            }
                                            className={`w-full min-w-[2.5rem] px-1 py-0.5 border rounded text-center transition-colors placeholder:text-gray-300 ${
                                              repsAboveCalc
                                                ? 'border-red-400 bg-red-50 text-red-700 font-bold'
                                                : 'border-gray-300'
                                            }`}
                                            title={repsAboveCalc ? `⚠️ Reps (${currentReps}) > calculated (${calcRepsFromPct}). Will be highlighted.` : undefined}
                                          />

                                        </td>

                                        {/* % on 1MR cell — blank until reps are entered */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          {isPctMode ? (
                                            <input
                                              type="number" min={0} max={100} step={2.5}
                                              value={sec.seriesPcts?.[rowIdx] ?? (isPctMode ? sectorPctFromReps(sec, currentReps) : repsToPercent(currentReps))}
                                              onChange={(e) => updateSeriesPctAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                              className="w-full min-w-[2.5rem] px-1 py-0.5 border border-blue-400 bg-blue-50 rounded text-center text-blue-800 font-semibold"
                                            />
                                          ) : hasReps ? (
                                            <span
                                              className={`block text-center text-[11px] font-medium tabular-nums ${
                                                isLoadPctValidForReps(currentReps, sec.pctFormulaIndex ?? 0)
                                                  ? 'text-gray-700'
                                                  : 'text-red-600 font-bold'
                                              }`}
                                              title={
                                                isLoadPctValidForReps(currentReps, sec.pctFormulaIndex ?? 0)
                                                  ? getPct1RmFormulaLabel(sec.pctFormulaIndex ?? 0)
                                                  : 'Load % may be invalid for this rep count with the current formula (click Info Reps for details).'
                                              }
                                            >
                                              {formatPercentLoad1MRFromReps(currentReps, sec.pctFormulaIndex ?? 0)}
                                            </span>
                                          ) : (
                                            <span className="block text-center text-[11px] text-gray-300">—</span>
                                          )}
                                        </td>

                                        {/* Weights — disabled until exercises are assigned to this sector */}
                                        <td className="border border-gray-300 px-1 py-1 bg-gray-100/80">
                                          <input
                                            type="number"
                                            min={0}
                                            max={9999}
                                            value=""
                                            readOnly
                                            disabled
                                            placeholder="—"
                                            title="Weights are entered per exercise after you assign exercises to this sector"
                                            aria-label="Weights (available after exercise selection)"
                                            className="w-full min-w-[2.5rem] cursor-not-allowed rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-center text-gray-400 placeholder:text-gray-300"
                                          />
                                        </td>

                                        <td className="border border-gray-300 px-0.5 py-0.5">
                                          {(() => {
                                            const rawRowPause = sec.seriesRowPauses?.[rowIdx] ?? '';
                                            const pauseComputed =
                                              computedPauseForSeriesRowIndex(sec, rowIdx, trainingLevel) || '0"';
                                            const pauseSelectValue =
                                              rawRowPause.trim() === '' ? SERIES_ROW_PAUSE_INHERIT : rawRowPause;
                                            const extraPause =
                                              pauseSelectValue !== SERIES_ROW_PAUSE_INHERIT &&
                                              rawRowPause.trim() !== '' &&
                                              !PAUSE_OPTIONS.includes(rawRowPause.trim())
                                                ? rawRowPause.trim()
                                                : null;
                                            return (
                                              <select
                                                value={pauseSelectValue}
                                                onChange={(e) =>
                                                  updateSeriesRowPauseAt(
                                                    activeDayIndex,
                                                    secIdx,
                                                    rowIdx,
                                                    e.target.value === SERIES_ROW_PAUSE_INHERIT ? '' : e.target.value,
                                                  )
                                                }
                                                title={
                                                  'Default by row: within an exercise → Pause (series); last set of a non-final exercise → Macro exercises; last set of the area → Macro end sector. Pick a value to override.'
                                                }
                                                className="w-full min-w-[5.5rem] border border-gray-300 bg-white py-0.5 text-[9px]"
                                              >
                                                <option value={SERIES_ROW_PAUSE_INHERIT}>
                                                  Calc ({pauseComputed})
                                                </option>
                                                {extraPause != null ? (
                                                  <option value={extraPause}>{extraPause}</option>
                                                ) : null}
                                                {PAUSE_OPTIONS.map((p) => (
                                                  <option key={p} value={p}>
                                                    {p}
                                                  </option>
                                                ))}
                                              </select>
                                            );
                                          })()}
                                        </td>

                                        {/* Alert note */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          <input
                                            type="text"
                                            value={sec.seriesRowAlerts?.[rowIdx] ?? ''}
                                            onChange={(e) => updateSeriesRowAlertAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                            placeholder="—"
                                            className="w-full min-w-[7rem] px-1 py-0.5 border border-gray-300 rounded text-[11px] placeholder:text-gray-300"
                                            maxLength={120}
                                          />
                                        </td>

                                        {/* Copy down */}
                                        <td className="border border-gray-300 px-1 py-1 text-center">
                                          {sec.series > 1 && rowIdx < sec.series - 1 ? (
                                            <button type="button"
                                              onClick={() => copySeriesRowsDown(activeDayIndex, secIdx, rowIdx)}
                                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500 text-white rounded text-[10px] font-semibold hover:bg-blue-600 whitespace-nowrap"
                                              title="Copy this row to all rows below">
                                              <ChevronsDown className="w-3 h-3" /> Copy
                      </button>
                                          ) : null}
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
                                    Scroll for all {sec.series} series. Use header <strong>Recalc % 1RM</strong> for formulas A/B/C.
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                          ) : null}

                  </div>
                  );
                })
              )}
            </div>
          </div>
          </>
          )}
        </div>
      </div>

    </div>

      <InfoRepsModal
        open={infoRepsModalOpen}
        onClose={() => setInfoRepsModalOpen(false)}
        uiLanguage={language}
      />

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
              <button
                type="button"
                onClick={() => setShowAutoWarn(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyManualAutoProcess}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold"
              >
                Confirm {UI_EM_DASH} Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {showSeriesDist && (
        <SeriesDistDialog
          days={stableDays.map(ensureManualDayPlan)}
          initialDayIdx={activeDayIndex}
          getConstantSectorIdsForDay={getConstantSectorIdsForDay}
          getSuggestedTotalSeriesForDay={getSuggestedTotalSeriesForDay}
          manualDistConstantByDay={manualDistConstantByDay}
          onManualDistConstantChange={(dIdx, id) => {
            setManualDistConstantByDay((prev) => {
              const next = [...prev];
              while (next.length <= dIdx) next.push(null);
              next[dIdx] = id;
              return next;
            });
          }}
          onSave={handleSeriesDistSave}
          onClose={() => setShowSeriesDist(false)}
        />
      )}
    </>
  );
}
