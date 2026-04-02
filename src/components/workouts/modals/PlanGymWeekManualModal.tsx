'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Image from 'next/image';
import { X, ChevronUp, ChevronDown, ChevronsDown, Trash2, Settings, ChevronLeft, GripVertical } from 'lucide-react';
import {
  GOAL_OPTIONS,
  type GoalId,
  type TrainingLevel,
  clampWeeklyPlanDayCount,
  getPlanGymWeekTrainingLevelImageSrc,
  getPlanGymWeekTrainingLevelLabel
} from './PlanGymWeekModal';
import { buildHelpedRoutines, type BuildHelpedRoutinesParams } from '@/utils/planGymWeekLogic';
import {
  getSeriesDistribution,
  trainingLevelToCategory,
} from '@/utils/seriesDistribution';
import {
  computePyramidalRepsSeries,
  formatPercentLoad1MR,
  type PyramidalMode
} from '@/utils/pyramidalReps';

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

const PAUSE_OPTIONS = ['0', '15"', '30"', "45\"", "1'", "1'15\"", "1'30\"", "1'45\"", "2'", "2'30\"", "3'", "4'", "5'"];

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

// ─── interfaces ──────────────────────────────────────────────────────────────

export interface ManualDaySector {
  sectorId:          string;
  sectorLabel:       string;
  image:             string;
  exercises:         number;
  series:            number;
  reps:              number;
  pause:             string;
  macroExercise:     string;
  macroEndOfSector:  string;
  pyramidal:         PyramidalMode;
  seriesReps:        number[];
  seriesWeights:     string[];
 
  seriesRepsRaw?:    string[];
  typeByPercent?:    boolean;
  seriesPcts?:       number[];
  /** Per-series pause; empty string = use sector `pause` */
  seriesRowPauses?:  string[];
  /** Per-series notes / alert (e.g. RPE, cues) */
  seriesRowAlerts?:  string[];
}

export interface ManualDayPlan {
  routineName: string;
  sectors:     ManualDaySector[];
}

export interface PlanGymWeekManualResult {
  daysCount: number;
  days:      ManualDayPlan[];
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
}): number {
  const d = Math.min(6, Math.max(1, params.daysCount || 1));
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

export type WorkoutPlanForLast = {
  weeks?: Array<{
    weekNumber?: number;
    days?: Array<{
      date?: string;
      workouts?: Array<{
        moveframes?: Array<{
          movelaps?: Array<{
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
  return {
    ...sec,
    exercises: Math.max(0, Math.min(20, sec.exercises ?? 0)),
    series, reps, pyramidal, seriesReps, seriesRepsRaw, seriesWeights, typeByPercent, seriesPcts,
    seriesRowPauses, seriesRowAlerts,
  };
}

function ensureManualDayPlan(day: ManualDayPlan): ManualDayPlan {
  return { ...day, sectors: day.sectors.map(ensureManualSectorShape) };
}

// ─── sector scalar updates ───────────────────────────────────────────────────

type SectorScalarField =
  | 'exercises' | 'series' | 'reps' | 'pause'
  | 'macroExercise' | 'macroEndOfSector' | 'pyramidal';

function applySectorScalarUpdate(
  sec: ManualDaySector, field: SectorScalarField, value: number | string
): ManualDaySector {
  const str = String(value).trim();
  if (field === 'exercises') {
    if (str === '') return { ...sec, exercises: 0 };
    const n = parseInt(str, 10);
    return { ...sec, exercises: Number.isNaN(n) ? 0 : Math.max(0, Math.min(20, n)) };
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
    const series = Math.min(20, parsed);
    const seriesReps = computeSeriesRepsBulk(sec.reps, series, sec.pyramidal);
    const seriesPcts = seriesReps.map(repsToPercent);
    return {
      ...sec,
      series,
      seriesReps,
      seriesPcts,
      seriesWeights: resizeSeriesWeights(sec.seriesWeights, series),
      seriesRepsRaw: resizeSeriesRepsRaw(sec.seriesRepsRaw, series),
      seriesRowPauses: resizeSeriesRowStrings(sec.seriesRowPauses, series),
      seriesRowAlerts: resizeSeriesRowStrings(sec.seriesRowAlerts, series),
    };
  }
  if (field === 'reps') {
    if (str === '') {
      const seriesReps = computeSeriesRepsBulk(0, sec.series, sec.pyramidal);
      return {
        ...sec,
        reps: 0,
        seriesReps,
        seriesPcts: seriesReps.map(repsToPercent),
        seriesWeights: resizeSeriesWeights(sec.seriesWeights, sec.series),
      };
    }
    const reps = Math.max(0, Math.min(99, parseInt(str, 10) || 0));
    const seriesReps = computeSeriesRepsBulk(reps, sec.series, sec.pyramidal);
    const seriesPcts = seriesReps.map(repsToPercent);
    return { ...sec, reps, seriesReps, seriesPcts, seriesWeights: resizeSeriesWeights(sec.seriesWeights, sec.series) };
  }
  if (field === 'pyramidal') {
    const pyramidal  = String(value) as PyramidalMode;
    const base       = sec.reps > 0 ? sec.reps : 0;
    const seriesReps = computeSeriesRepsBulk(base, sec.series, pyramidal);
    const seriesPcts = seriesReps.map(repsToPercent);
    return { ...sec, pyramidal, seriesReps, seriesPcts, seriesWeights: resizeSeriesWeights(sec.seriesWeights, sec.series) };
  }
  if (field === 'pause' || field === 'macroExercise' || field === 'macroEndOfSector') {
    return { ...sec, [field]: String(value) };
  }
  return sec;
}

// ─── last planned moveframe by sector (within a plan week, any day) ───────────

function sectorMatches(lap: string | null | undefined, label: string, id: string): boolean {
  if (!lap) return false;
  const l = String(lap).trim().toLowerCase();
  return l === label.toLowerCase() || l === id.toLowerCase()
    || (id === 'abs'  && l === 'abdominals')
    || (id === 'hams' && (l === 'hamstrings' || l === 'hams'));
}

type PlanWeekShape = NonNullable<NonNullable<Exclude<WorkoutPlanForLast, null>['weeks']>[number]>;

function weekHasPlannedMoveframes(week: PlanWeekShape): boolean {
  for (const day of week.days ?? []) {
    for (const workout of day.workouts ?? []) {
      for (const moveframe of workout.moveframes ?? []) {
        if ((moveframe.movelaps ?? []).length > 0) return true;
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
function orderPlanWeeksNewestFirst(plan: WorkoutPlanForLast): PlanWeekShape[] {
  if (!plan?.weeks?.length) return [];
  const weeks = plan.weeks;
  return [...weeks]
    .filter(weekHasPlannedMoveframes)
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
 * Within one plan week, the moveframe for this sector on the **latest** day that includes it
 * (sectors can be planned on different days in the same week).
 */
function findNewestSectorMoveframeInWeek(
  week: PlanWeekShape,
  sectorLabel: string,
  sectorId: string
): { date: string; sectorMovelaps: any[] } | null {
  const entries: { date: string; sectorMovelaps: any[] }[] = [];
  for (const day of week.days ?? []) {
    const dayDate = day.date ? String(day.date).slice(0, 10) : '';
    for (const workout of day.workouts ?? []) {
      for (const moveframe of workout.moveframes ?? []) {
        const movelaps = moveframe.movelaps ?? [];
        const sectorMovelaps = movelaps.filter((lap: any) =>
          sectorMatches(lap.muscularSector ?? lap.sector, sectorLabel, sectorId)
        );
        if (sectorMovelaps.length > 0) entries.push({ date: dayDate, sectorMovelaps });
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
  plan: WorkoutPlanForLast, sectorLabel: string, sectorId: string
): LastWorkoutSummary | null {
  if (!plan?.weeks?.length) return null;
  let best: { date: string; sectorMovelaps: any[]; weekNumber?: number } | null = null;
  for (const week of plan.weeks) {
    const hit = findNewestSectorMoveframeInWeek(week, sectorLabel, sectorId);
    if (!hit) continue;
    if (!best || compareDayDateDesc(hit.date, best.date) < 0) {
      best = {
        date: hit.date,
        sectorMovelaps: hit.sectorMovelaps,
        weekNumber: typeof week.weekNumber === 'number' ? week.weekNumber : undefined,
      };
    }
  }
  if (best) {
    const planWeekLabel = typeof best.weekNumber === 'number' ? `Week ${best.weekNumber}` : undefined;
    return summarizePlannedSectorLaps(best.date, best.sectorMovelaps, planWeekLabel);
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
    <svg width={150} height={150} viewBox="0 0 150 150">
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
function SectorRow({ sec, pct, series, color, isConstant, orderNum, stepPct, onChange, delta = 0 }: SectorRowProps) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 shadow-sm transition-colors ${
      delta > 0 ? 'bg-red-50/90 border-red-200' : delta < 0 ? 'bg-emerald-50/90 border-emerald-200' : ''
    }`}>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-sm font-bold text-gray-900 shadow-sm ${
        isConstant ? 'bg-yellow-300' : 'bg-yellow-400'
      }`}>
        {orderNum}
      </div>
      <div className={`flex min-h-9 min-w-0 max-w-[8.5rem] flex-shrink-0 items-center rounded-md px-2.5 py-1.5 text-sm font-bold text-gray-900 shadow-sm ${
        isConstant ? 'bg-yellow-300' : 'bg-yellow-400'
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

  const initPcts = (secs: ManualDaySector[], cIdx: number) => {
    const n = secs.length;
    if (n === 0) return [];
    if (cIdx >= 0) {
      const cPct = 20;
      const others = n - 1;
      if (others <= 0) return secs.map((_, i) => (i === cIdx ? 100 : 0));
      const rest = (100 - cPct) / others;
      return secs.map((_, i) => (i === cIdx ? cPct : rest));
    }
    return secs.map(() => 100 / n);
  };

  const [totalSeries, setTotalSeries] = useState(() =>
    computeDistDialogInitialTotal(
      days[initialDayIdx]?.sectors ?? [],
      initialDayIdx,
      getSuggestedTotalSeriesForDay
    )
  );
  const [pcts, setPcts] = useState<number[]>(() => {
    const secs = days[initialDayIdx]?.sectors ?? [];
    const ids  = getConstantSectorIdsForDay
      ? getConstantSectorIdsForDay(initialDayIdx)
      : constantSectorIds;
    const cIdx = secs.findIndex(
      (s) => ids.has(s.sectorId) || ids.has(s.sectorLabel)
    );
    return initPcts(secs, cIdx);
  });
  const [prevPcts, setPrevPcts] = useState<number[]>(() => {
    const secs = days[initialDayIdx]?.sectors ?? [];
    const ids  = getConstantSectorIdsForDay
      ? getConstantSectorIdsForDay(initialDayIdx)
      : constantSectorIds;
    const cIdx = secs.findIndex(
      (s) => ids.has(s.sectorId) || ids.has(s.sectorLabel)
    );
    return initPcts(secs, cIdx);
  });

  useEffect(() => {
    const secs = days[dayIdx]?.sectors ?? [];
    const ids  = getConstantSectorIdsForDay
      ? getConstantSectorIdsForDay(dayIdx)
      : constantSectorIds;
    const cIdx = secs.findIndex(
      (s) => ids.has(s.sectorId) || ids.has(s.sectorLabel)
    );
    const init = initPcts(secs, cIdx);
    setTotalSeries(computeDistDialogInitialTotal(secs, dayIdx, getSuggestedTotalSeriesForDay));
    setPcts(init);
    setPrevPcts(init);
  }, [dayIdx, days, getConstantSectorIdsForDay, constantSectorIds, getSuggestedTotalSeriesForDay]);

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

          <div className="flex justify-center rounded-xl bg-white py-2 shadow-sm ring-1 ring-gray-200/80">
            <PieChart slices={pieSectors} />
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
  workoutPlan?:       WorkoutPlanForLast;
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
  workoutPlan,
  headerImage,
  rescanParams = null,
  trainingLevel = null,
  trainingLevelImages,
  onBack,
}: PlanGymWeekManualModalProps) {
  const [daysCount,              setDaysCount]              = useState(() => clampWeeklyPlanDayCount(initialDaysCount));
  const [activeDayIndex,         setActiveDayIndex]         = useState(0);
  const [days,                   setDays]                   = useState<ManualDayPlan[]>(() =>
    padManualDaysToMaxSlots(buildInitialDays(clampWeeklyPlanDayCount(initialDaysCount)))
  );
  const [editingRoutineName,     setEditingRoutineName]     = useState<string | null>(null);
  const [draftRoutineName,       setDraftRoutineName]       = useState('');
  const [viewMode,               setViewMode]               = useState<'edit' | 'fullOverview'>('edit');
  const [constantSectorsAtBeginning, setConstantSectorsAtBeginning] = useState(true);
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
  const [manualDistConstantByDay, setManualDistConstantByDay] = useState<(string | null)[]>(() =>
    Array.from({ length: 6 }, () => null)
  );

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
      setConstantSectorsAtBeginning(true);
      setLoadFromSourceIndex(0);
      setShowSeriesDist(false);
      setShowAutoWarn(false);
      setSelectedSectorFrameIndex(null);
    }
  }, [isOpen, initialDaysCount, initialPlan]);

  useEffect(() => {
    setSelectedSectorFrameIndex(null);
  }, [activeDayIndex]);

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
    (dIdx: number) =>
      suggestedRoutineTotalSeriesForDistMask({
        trainingLevel,
        daysCount,
        goalId: goals[dIdx],
      }),
    [trainingLevel, daysCount, goals]
  );

  const setStableDays = (updater: (prev: ManualDayPlan[]) => ManualDayPlan[]) => setDays(updater);

  const effectiveActiveDayIndex = Math.min(activeDayIndex, Math.max(0, stableDays.length - 1));
  const activeDay = stableDays[effectiveActiveDayIndex] ?? ensureManualDayPlan(emptyManualDayPlanAtIndex(0));
  const canAddSector = (sectorId: string) => !activeDay.sectors.some((s) => s.sectorId === sectorId);

  // ── stats (for active day) ──
  const totalSeries = activeDay.sectors.reduce((s, sec) => s + sec.series, 0);
  const avgSeriesPerArea = activeDay.sectors.length > 0
    ? Math.round((totalSeries / activeDay.sectors.length) * 10) / 10 : 0;
  const allReps = activeDay.sectors.flatMap((sec) => sec.seriesReps ?? []);
  const avgReps = allReps.length > 0
    ? Math.round((allReps.reduce((s, r) => s + r, 0) / allReps.length) * 10) / 10 : 0;
  const breakAvg = avgPauseStr(activeDay.sectors.map((s) => s.pause));

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
      const newSector = {
        sectorId:         group.id,
        sectorLabel:      group.label,
        image:            group.image,
        exercises:        0,
        series:             0,
        reps:               0,
        pause:              '',
        macroExercise:      '',
        macroEndOfSector:   '',
        pyramidal:        'flat' as const,
        seriesReps:       [] as number[],
        seriesRepsRaw:    [] as string[],
        seriesWeights:    [] as string[],
        typeByPercent:    false,
        seriesPcts:       [] as number[],
        seriesRowPauses:  [] as string[],
        seriesRowAlerts:  [] as string[],
      };
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
      sectors[sectorIndex] = applySectorScalarUpdate(sectors[sectorIndex], field, value);
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── series reps / weights (Reps mode) ──
  const updateSeriesRepAt = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const n = sec.series;

      // Always update the raw display string (even when empty → blank the cell)
      const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, n);
      seriesRepsRaw[rowIdx] = raw;
      sec.seriesRepsRaw = seriesRepsRaw;

      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        const v = Math.max(1, Math.min(99, parsed));
        if (sec.pyramidal === 'flat') {
          sec.reps = v;
          sec.seriesReps  = Array.from({ length: n }, () => v);
          // Propagate raw to all rows in flat mode
          sec.seriesRepsRaw = Array.from({ length: n }, () => raw);
          sec.seriesPcts  = Array.from({ length: n }, () => repsToPercent(v));
        } else if (rowIdx === 0) {
          sec.reps = v;
          sec.seriesReps  = computePyramidalRepsSeries(v, n, sec.pyramidal);
          // Set raw for row 0, derive raw for others from computed reps
          sec.seriesRepsRaw = sec.seriesReps.map((r, i) => i === 0 ? raw : String(r));
          sec.seriesPcts  = sec.seriesReps.map(repsToPercent);
        } else {
          const seriesReps = [...(sec.seriesReps ?? [])];
          seriesReps[rowIdx] = v;
          sec.seriesReps  = seriesReps;
          const seriesPcts = [...(sec.seriesPcts ?? sec.seriesReps.map(repsToPercent))];
          seriesPcts[rowIdx] = repsToPercent(v);
          sec.seriesPcts  = seriesPcts;
        }
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── series reps (% mode): user edits reps in % mode (validation: red if > calc) ──
  const updateSeriesRepAtPctMode = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      // Always update raw (blank allowed)
      const seriesRepsRaw = resizeSeriesRepsRaw(sec.seriesRepsRaw, sec.series);
      seriesRepsRaw[rowIdx] = raw;
      sec.seriesRepsRaw = seriesRepsRaw;
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        const v = Math.max(1, Math.min(99, parsed));
        const seriesReps = [...(sec.seriesReps ?? [])];
        seriesReps[rowIdx] = v;
        sec.seriesReps = seriesReps;
      }
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  // ── series pct (% mode): user edits % → auto-calc reps ──
  const updateSeriesPctAt = (dayIdx: number, secIdx: number, rowIdx: number, raw: string) => {
    const pct = parseFloat(raw);
    if (Number.isNaN(pct)) return;
    const clampedPct = Math.max(0, Math.min(100, pct));
    const calcReps   = percentToReps(clampedPct);
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      const seriesPcts = [...(sec.seriesPcts ?? sec.seriesReps.map(repsToPercent))];
      seriesPcts[rowIdx] = clampedPct;
      const seriesReps = [...(sec.seriesReps ?? [])];
      seriesReps[rowIdx] = calcReps;
      sec.seriesPcts = seriesPcts;
      sec.seriesReps = seriesReps;
      if (rowIdx === 0) sec.reps = calcReps;
      sectors[secIdx] = sec;
      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const setTypeByPercent = (dayIdx: number, secIdx: number, pct: boolean) => {
    setStableDays((prev) => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const sec = { ...sectors[secIdx] };
      if (pct && !sec.typeByPercent) {
        sec.seriesPcts = (sec.seriesReps ?? []).map(repsToPercent);
      }
      sec.typeByPercent = pct;
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
      const seriesReps    = [...sec.seriesReps];
      const seriesWeights = [...sec.seriesWeights];
      const seriesPcts    = [...(sec.seriesPcts ?? seriesReps.map(repsToPercent))];
      const seriesRowPauses = resizeSeriesRowStrings(sec.seriesRowPauses, sec.series);
      const seriesRowAlerts = resizeSeriesRowStrings(sec.seriesRowAlerts, sec.series);
      const r  = seriesReps[fromRow];
      const w  = seriesWeights[fromRow];
      const p  = seriesPcts[fromRow];
      const pp = seriesRowPauses[fromRow];
      const aa = seriesRowAlerts[fromRow];
      for (let i = fromRow + 1; i < sec.series; i++) {
        seriesReps[i] = r;
        seriesWeights[i] = w;
        seriesPcts[i] = p;
        seriesRowPauses[i] = pp;
        seriesRowAlerts[i] = aa;
      }
      sec.seriesReps = seriesReps;
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

  const handleCreate = () => { onCreateRoutines({ daysCount, days: stableDays }); onClose(); };
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
    setDays(padManualDaysToMaxSlots(plan.days.map(ensureManualDayPlan)));
    setActiveDayIndex((i) => Math.min(i, Math.max(0, plan.days.length - 1)));
    setEditingRoutineName(null);
  }, [rescanParams, daysCount, constantSectorsAtBeginning]);

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
          const updated = applySectorScalarUpdate(sec, 'series', String(capped));
          return ensureManualSectorShape(updated);
        }),
      };
    }));
  }, []);

  const applyManualAutoProcess = useCallback(() => {
    setShowAutoWarn(false);
    const levelCat = trainingLevelToCategory(trainingLevel);
    setStableDays((prev) => prev.map((day, di) => {
      if (di !== activeDayIndex) return day;
      return {
        ...day,
        sectors: day.sectors.map((sec) => {
          if (sec.series <= 0) return ensureManualSectorShape(sec);
          const dist = getSeriesDistribution(sec.series, levelCat);
          const exCount = dist.length;
          let s = applySectorScalarUpdate(sec, 'exercises', String(exCount));
          if (!String(s.pause ?? '').trim()) s = { ...s, pause: "1'30\"" };
          if (!String(s.macroExercise ?? '').trim()) s = { ...s, macroExercise: "2'" };
          if (!String(s.macroEndOfSector ?? '').trim()) s = { ...s, macroEndOfSector: "3'" };
          return ensureManualSectorShape(s);
        }),
      };
    }));
  }, [activeDayIndex, trainingLevel]);

  const trainingLevelPhotoSrc = trainingLevel != null
    ? getPlanGymWeekTrainingLevelImageSrc(trainingLevel, trainingLevelImages) : headerImage ?? null;
  const trainingLevelDetail = trainingLevel != null ? getPlanGymWeekTrainingLevelLabel(trainingLevel) : null;

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
            {initialPlan?.days?.length ? (
              <p className="mt-0.5 text-xs text-amber-700">
                Suggested routines and muscular areas from your choices. You can freely change them manually (add, remove, reorder, edit parameters), then Create routines and movelaps.
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
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

          {/* Primary action buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" onClick={handleCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
              Create routines and movelaps
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
                            <span className="font-medium text-gray-900 min-w-[100px] shrink-0">{sec.sectorLabel}</span>
                            <span className="min-w-0 flex-1 text-gray-600">
                              {sec.exercises} ex · {sec.series} series · reps {sec.seriesReps?.join('/') ?? sec.reps} ·
                              Pyramidal {sec.pyramidal ?? 'flat'} · Pause {sec.pause}
                            </span>
                            <span className="text-gray-500 text-xs shrink-0">
                              Macro ex {sec.macroExercise} · Macro end sector {sec.macroEndOfSector}
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
          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {stableDays.map((day, idx) => {
              const goalLabel = getGoalLabel(goals[idx]);
                  const defaultName = `Day ${idx + 1}`;
                  const hasCustomName = (day.routineName || '').trim() !== '' && day.routineName !== defaultName;
              return (
                    <button key={idx} type="button" onClick={() => setActiveDayIndex(idx)}
                      className={`px-3 py-2 rounded-t-lg font-medium text-sm text-left max-w-[200px] ${activeDayIndex === idx ? 'bg-amber-100 border border-b-0 border-amber-200 text-amber-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      title={`Day ${idx + 1}${hasCustomName ? `: ${day.routineName}` : ''}${goalLabel ? ` — ${goalLabel}` : ''}`}
                >
                  <span className="font-semibold">Day {idx + 1}</span>
                      {hasCustomName ? <span className="block text-xs font-normal opacity-90 truncate">{day.routineName}</span> : null}
                      {goalLabel  ? <span className="block text-[10px] text-gray-500 truncate mt-0.5">Goal: {goalLabel}</span> : null}
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
                    <span>Total series <strong className="text-gray-900">{totalSeries}</strong></span>
                    <span>Average for area <strong className="text-gray-900">{avgSeriesPerArea}</strong></span>
                    <span>Average repetitions <strong className="text-gray-900">{avgReps}</strong></span>
                    <span>Break average <strong className="text-gray-900">{breakAvg}</strong></span>
                  </div>
                )}

                {/* ── Sector chips + distribution / auto-process (same flow as fast plan) ── */}
                {activeDay.sectors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Sector – Muscular areas for this day ({activeDay.sectors.length} selected)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeDay.sectors.map((sec, chipIdx) => (
                        <span
                          key={`${sec.sectorId}-${chipIdx}`}
                          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-gray-800"
                          style={{ borderLeftColor: getSectorColor(sec.sectorId, chipIdx), borderLeftWidth: 3 }}
                        >
                          <span className="relative inline-block h-7 w-7 flex-shrink-0">
                            <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                          </span>
                          <span className="min-w-0 flex flex-col leading-tight">
                            <span className="font-medium text-gray-900">{sec.sectorLabel}</span>
                            <span className="font-bold text-amber-800">
                              {sec.series > 0 ? `${sec.series} series` : 'series'}
                            </span>
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAutoWarn(true)}
                        title="Recalculate exercise counts and defaults for this day from the distribution table and training level"
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
                  const lastWorkout = workoutPlan ? getLastWorkoutBySector(workoutPlan, sec.sectorLabel, sec.sectorId) : null;
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
                              <span className="text-sm font-bold text-gray-900">{sec.sectorLabel}</span>
                            </div>
                            <div className="min-w-0 flex-1 overflow-x-auto text-xs text-gray-800 [scrollbar-width:thin]">
                              {lastWorkout ? (
                                <span className="inline-flex min-w-max items-center gap-x-1 whitespace-nowrap tabular-nums">
                                  <span className="font-semibold text-teal-900">
                                    Last planned
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

                          {/* Sector controls */}
                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Exercises
                              <input type="number" min={0} max={20} value={sec.exercises === 0 ? '' : sec.exercises}
                                onChange={(e) => updateSector(activeDayIndex, secIdx, 'exercises', e.target.value)}
                                className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm" />
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Series
                              <input type="number" min={0} max={20} value={sec.series === 0 ? '' : sec.series}
                                onChange={(e) => updateSector(activeDayIndex, secIdx, 'series', e.target.value)}
                                className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm" />
                      </label>
                            <label className="text-xs text-gray-600 flex items-center gap-1" title="Reps for series 1 (start of pyramid)">
                              Reps
                              <input type="number" min={0} max={99} value={sec.reps === 0 ? '' : sec.reps}
                                onChange={(e) => updateSector(activeDayIndex, secIdx, 'reps', e.target.value)}
                                className="w-14 px-1 py-0.5 border border-gray-300 rounded text-sm" />
                            </label>
                            <label className="text-xs text-gray-600 flex items-center gap-1">
                              Pyramidal
                              <select value={sec.pyramidal}
                                onChange={(e) => updateSector(activeDayIndex, secIdx, 'pyramidal', e.target.value)}
                                className="border border-gray-300 rounded text-sm py-0.5 min-w-[7rem]">
                                {PYRAMIDAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1">
                        Pause
                              <select value={sec.pause}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'pause', e.target.value)}
                                className="border border-gray-300 rounded text-sm py-0.5 min-w-[4.5rem]">
                                <option value="">—</option>
                                {PAUSE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-gray-600 flex items-center gap-1" title="Pause after the last serie of an exercise">
                        Macro exercises
                              <select value={sec.macroExercise}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'macroExercise', e.target.value)}
                                className="border border-gray-300 rounded text-sm py-0.5 min-w-[4.5rem]">
                                <option value="">—</option>
                                {PAUSE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                            <label className="text-xs text-gray-600 flex items-center gap-1" title="Pause after the last serie of the last exercise of this sector">
                        Macro end sector
                              <select value={sec.macroEndOfSector}
                          onChange={(e) => updateSector(activeDayIndex, secIdx, 'macroEndOfSector', e.target.value)}
                                className="border border-gray-300 rounded text-sm py-0.5 min-w-[4.5rem]">
                                <option value="">—</option>
                                {PAUSE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                    </div>

                          {/* ── REPS & WEIGHTS table ── */}
                          <div
                            className="w-full overflow-hidden rounded-lg border border-blue-200 bg-blue-50/40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="grid w-full grid-cols-1 items-center gap-2 border-b border-blue-200 bg-blue-100/80 px-2 py-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
                              <div className="flex min-w-0 flex-wrap items-center gap-2 justify-self-start sm:justify-self-stretch">
                                <span className="text-[13px] leading-none" aria-hidden>💪</span>
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-800">
                                  REPS &amp; WEIGHTS
                                </span>
                                <span className="inline-flex items-center rounded-full bg-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-900 tabular-nums">
                                  {sec.series} series
                                </span>
                                <label
                                  htmlFor={`pct-mode-${sec.sectorId}-${secIdx}`}
                                  className="flex cursor-pointer select-none flex-wrap items-center justify-center gap-1.5 justify-self-center"
                                >
                                  <input
                                    id={`pct-mode-${sec.sectorId}-${secIdx}`}
                                    type="checkbox"
                                    checked={isPctMode}
                                    onChange={(e) => setTypeByPercent(activeDayIndex, secIdx, e.target.checked)}
                                    className="h-3.5 w-3.5 shrink-0 rounded border-gray-400"
                                  />
                                  <span className="text-[11px] font-semibold text-red-600 whitespace-nowrap">
                                    Type by %1MR
                                  </span>
                                </label>
                              </div>
                              
                              <div className="flex justify-self-end sm:justify-self-stretch sm:justify-end ml-20">
                                <span className="text-xs font-bold uppercase tracking-wide text-blue-900 whitespace-nowrap">
                                  REST &amp; ALERTS
                                </span>
                              </div>
                            </div>

                            <div className="overflow-x-auto max-h-[260px] overflow-y-auto bg-white">
                              <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 z-[1] bg-gray-100">
                                  <tr>
                                    <th className="border border-gray-300 px-2 py-1.5 text-center w-10 bg-gray-100">#</th>
                                    <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">Reps</th>
                                    <th className="border border-gray-300 px-1 py-1.5 text-center whitespace-nowrap bg-gray-100">
                                      % on 1 MR
                                    </th>
                                    <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">Weights</th>
                                    <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">Pause</th>
                                    <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">Alert</th>
                                    <th className="border border-gray-300 px-1 py-1.5 w-16 bg-gray-100" aria-label="Row actions" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from({ length: sec.series }, (_, rowIdx) => {
                                    // raw string — '' means blank/not-yet-entered
                                    const rawReps  = sec.seriesRepsRaw?.[rowIdx] ?? '';
                                    const hasReps  = rawReps !== '';
                                    const currentReps = sec.seriesReps?.[rowIdx] ?? (sec.reps > 0 ? sec.reps : 0);

                                    const calcReps = isPctMode
                                      ? percentToReps(sec.seriesPcts?.[rowIdx] ?? repsToPercent(currentReps))
                                      : null;
                                    const repsAboveCalc = isPctMode && hasReps && calcReps !== null && currentReps > calcReps;

                                    return (
                                      <tr key={rowIdx} className="hover:bg-blue-50/50">
                                        <td className="border border-gray-300 px-2 py-1 text-center font-semibold bg-gray-50">{rowIdx + 1}</td>

                                        {/* Reps cell — blank until user types */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          <input
                                            type="text" inputMode="numeric"
                                            value={rawReps}
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
                                            title={repsAboveCalc ? `⚠️ Reps (${currentReps}) > calculated (${calcReps}). Will be highlighted.` : undefined}
                                          />

                                        </td>

                                        {/* % on 1MR cell — blank until reps are entered */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          {isPctMode ? (
                                            <input
                                              type="number" min={0} max={100} step={2.5}
                                              value={sec.seriesPcts?.[rowIdx] ?? repsToPercent(currentReps)}
                                              onChange={(e) => updateSeriesPctAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                              className="w-full min-w-[2.5rem] px-1 py-0.5 border border-blue-400 bg-blue-50 rounded text-center text-blue-800 font-semibold"
                                            />
                                          ) : hasReps ? (
                                            <span className="block text-center text-[11px] font-medium text-gray-700 tabular-nums">
                                              {formatPercentLoad1MR(String(currentReps))}
                                            </span>
                                          ) : (
                                            <span className="block text-center text-[11px] text-gray-300">—</span>
                                          )}
                                        </td>

                                        {/* Weights — blank by default */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          <input
                                            type="number" min={0} max={9999}
                                            value={sec.seriesWeights?.[rowIdx] ?? ''}
                                            onChange={(e) => updateSeriesWeightAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                            placeholder="—"
                                            className="w-full min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded text-center placeholder:text-gray-300"
                                          />
                                        </td>

                                        <td className="border border-gray-300 px-1 py-1">
                                          <select
                                            value={sec.seriesRowPauses?.[rowIdx] ?? ''}
                                            onChange={(e) => updateSeriesRowPauseAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                            title="Leave on Sector default to use the sector pause above"
                                            className="w-full min-w-[4.5rem] max-w-[6rem] border border-gray-300 rounded py-0.5 text-[11px] bg-white">
                                            {PAUSE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                          </select>
                                        </td>

                                        {/* Alert note */}
                                        <td className="border border-gray-300 px-1 py-1">
                                          <input
                                            type="text"
                                            value={sec.seriesRowAlerts?.[rowIdx] ?? ''}
                                            onChange={(e) => updateSeriesRowAlertAt(activeDayIndex, secIdx, rowIdx, e.target.value)}
                                            placeholder="—"
                                            className="w-full min-w-[4rem] px-1 py-0.5 border border-gray-300 rounded text-[11px] placeholder:text-gray-300"
                                            maxLength={120}
                                          />
                                        </td>

                                        {/* Copy down */}
                                        <td className="border border-gray-300 px-1 py-1 text-center">
                                          {sec.series > 1 && rowIdx > 0 && rowIdx < sec.series - 1 ? (
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
                            <p className="text-[10px] text-blue-600 px-2 py-1.5 flex items-center gap-1.5 bg-blue-50/80">
                              <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm bg-blue-600 text-[9px] font-bold text-white">i</span>
                              <span>Scroll to view all {sec.series} series. Per-row pause can override the sector default; alerts are notes (e.g. RPE).</span>
                            </p>
                          </div>

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

      {showAutoWarn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-amber-500 px-5 py-4 flex items-start gap-3">
              <span className="text-white text-2xl leading-none mt-0.5" aria-hidden>⚠️</span>
              <div>
                <h3 className="font-bold text-white text-base">Automatic processing procedure</h3>
                <p className="text-amber-100 text-xs mt-1">This action overwrites calculated fields for the current day</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-800 leading-relaxed">
                For each muscular area that has a series total set, this sets the{' '}
                <strong>number of exercises</strong> from the distribution table (by training level), and fills empty{' '}
                <strong>pause</strong> / <strong>macro</strong> fields with standard defaults.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Series totals and reps / pyramidal / %1MR rows are not removed; adjust those in the form or use{' '}
                <strong>New settings</strong> to change how many series each area gets.
              </p>
              <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Confirm only if you are OK replacing exercise counts and any blank pause / macro values on this day.
              </p>
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
                Confirm — Apply
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
