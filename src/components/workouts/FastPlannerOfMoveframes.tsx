'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import CircuitPreferencesModal from './CircuitPreferencesModal';
import { GOAL_OPTIONS, type GoalId } from './modals/PlanGymWeekModal';
import {
  exerciseCountFromDist,
  getSeriesDistribution,
  suggestedSeriesForExerciseSlot,
  type SeriesLevelCategory,
} from '@/utils/seriesDistribution';
import { computePyramidalRepsSeries, type PyramidalMode } from '@/utils/pyramidalReps';

function parseStoredMoveframeGoal(v: unknown): GoalId {
  if (typeof v === 'string' && GOAL_OPTIONS.some((o) => o.value === v)) return v as GoalId;
  return 'hypertrophy';
}

interface FastPlannerRow {
  id: number;
  exercise: string;
  speed: string;
  series: string;
  ripTime: string;
  weight: string;
  break: string;
  mode: string;
  /** Load scheme when adding from Plan series/exercise: flat | ascending | descending | mix */
  pyramidal?: string;
}

interface FastPlannerProps {
  sport: string;
  sectionId: string;
  workout: any;
  day: any;
  mode: 'add' | 'edit';
  existingMoveframe?: any;
  /** Optional default when adding a moveframe (e.g. day goal from weekly plan). */
  initialGoal?: GoalId;
  onSave: (moveframeData: any) => void;
  onCancel: () => void;
  fullView?: boolean;
}

export const FAST_PLANNER_DEFAULT_END_MACRO = "5'";

export type FastPlannerHandle = {
  saveMoveframe: () => void;
  saveMoveframeAndMovelaps: () => void;
  openPreferences: () => void;
  /** Anaerobic only: end-of-moveframe macro (minutes); default **5'** when selection empty. */
  applyEndMacro?: (selectedMacro?: string) => void;
  getEndMacro?: () => string;
};

const parseFastPlannerDataFromNotes = (notes: unknown): any | null => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[FAST_PLANNER_DATA\]([\s\S]*?)\[\/FAST_PLANNER_DATA\]/);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const upsertFastPlannerDataInNotes = (notes: unknown, data: any): string => {
  const base = typeof notes === 'string' ? notes : '';
  const stripped = base.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '').trim();
  const tag = `[FAST_PLANNER_DATA]${JSON.stringify(data)}[/FAST_PLANNER_DATA]`;
  return stripped ? `${stripped}\n\n${tag}` : tag;
};

/** Target total series dropdown: 1–30 (exe count from distribution table; 21–30 extend base row 20). */
const PLAN_TARGET_TOTAL_SERIES_OPTIONS: number[] = Array.from({ length: 30 }, (_, i) => i + 1);

type PlanTargetLevelBand = 'lev12' | 'lev34' | 'lev5';

const PLAN_TARGET_LEVEL_OPTIONS: { id: PlanTargetLevelBand; label: string }[] = [
  { id: 'lev12', label: 'Lev 1–2' },
  { id: 'lev34', label: 'Lev 3–4' },
  { id: 'lev5', label: 'Lev 5' }
];

/**
 * Official table: total series planned → [Lev 1–2, Lev 3–4, Lev 5] suggested exercise counts.
 * Rows 8 and 11 are not listed; lookup uses the highest defined row at or below target (e.g. 8→7, 11→10). Above 20 uses row 20.
 */
const SERIES_TO_EXE_BY_LEVEL: Record<number, readonly [number, number, number]> = {
  1: [1, 1, 1],
  2: [1, 1, 1],
  3: [1, 1, 1],
  4: [2, 1, 1],
  5: [2, 2, 1],
  6: [3, 2, 2],
  7: [3, 2, 2],
  9: [3, 3, 2],
  10: [4, 3, 2],
  12: [4, 3, 3],
  13: [5, 4, 3],
  14: [5, 4, 3],
  15: [5, 4, 3],
  16: [5, 4, 3],
  17: [5, 4, 3],
  18: [6, 5, 3],
  19: [6, 5, 4],
  20: [6, 5, 4]
};

const SERIES_PLANNING_TABLE_KEYS: number[] = Object.keys(SERIES_TO_EXE_BY_LEVEL)
  .map(Number)
  .sort((a, b) => a - b);

function planTargetLevelToCategory(level: PlanTargetLevelBand): SeriesLevelCategory {
  if (level === 'lev12') return 'low';
  if (level === 'lev34') return 'mid';
  return 'high';
}

function suggestedExeFromSeriesAndLevel(totalSeries: number, level: PlanTargetLevelBand): number {
  const category = planTargetLevelToCategory(level);
  const dist = getSeriesDistribution(totalSeries, category);
  return exerciseCountFromDist(dist);
}

function computeSuggestedPlanSeries(
  targetTotalSeries: string,
  level: PlanTargetLevelBand,
  exerciseIndex: number,
  plannedSoFar: number,
): string {
  const t = parseInt(targetTotalSeries, 10);
  const target = Number.isNaN(t) || t < 1 ? 1 : t;
  const category = planTargetLevelToCategory(level);
  return String(
    suggestedSeriesForExerciseSlot(target, category, exerciseIndex, plannedSoFar),
  );
}

const PLAN_SERIES_DROPDOWN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] as const;

function parsePauseToSecondsOrNull(p: string): number | null {
  if (!p || p === '0') return 0;
  const s = p.trim();
  const minOnly = s.match(/^(\d+)'$/);
  if (minOnly) return parseInt(minOnly[1], 10) * 60;
  const minSec = s.match(/^(\d+)'(\d+)"$/);
  if (minSec) return parseInt(minSec[1], 10) * 60 + parseInt(minSec[2], 10);
  const secQ = s.match(/^(\d+)"$/);
  if (secQ) return parseInt(secQ[1], 10);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function formatAvgPauseFromSeconds(sec: number): string {
  if (sec < 60) return `Average ${Math.round(sec)}"`;
  const m = Math.floor(sec / 60);
  const r = Math.round(sec - m * 60);
  if (r === 0) return `Average ${m}'`;
  return `Average ${m}'${r}"`;
}

// Muscle groups for the body diagram - all available muscles from /public/muscular/
const MUSCLE_GROUPS = [
  { id: 'shoulders', label: 'Shoulders', sector: 'Shoulders', image: '/muscular/shoulders.png' },
  { id: 'biceps', label: 'Biceps', sector: 'Anterior arms', image: '/muscular/Biceps.png' },
  { id: 'triceps', label: 'Triceps', sector: 'Rear arms', image: '/muscular/Triceps.png' },
  { id: 'forearms', label: 'Forearms', sector: 'Forearms', image: '/muscular/Forearms.png' },
  { id: 'chest', label: 'Chest', sector: 'Chest', image: '/muscular/chest.png' },
  { id: 'abs', label: 'Abdominals', sector: 'Abdominals', image: '/muscular/abs.png' },
  { id: 'trapezius', label: 'Trapezius', sector: 'Trapezius', image: '/muscular/trapezius.png' },
  { id: 'lats', label: 'Lats', sector: 'Lats', image: '/muscular/Lats.png' },
  { id: 'quadriceps', label: 'Quadriceps', sector: 'Front thighs', image: '/muscular/quadriceps.png' },
  { id: 'hams', label: 'Hamstrings', sector: 'Hind thighs', image: '/muscular/hams.png' },
  { id: 'calves', label: 'Calves', sector: 'Calves', image: '/muscular/calves.png' },
  { id: 'glutes', label: 'Glutes', sector: 'Glutes', image: '/muscular/glutes.png' }
];

const FastPlannerOfMoveframes = React.forwardRef<FastPlannerHandle, FastPlannerProps>(function FastPlannerOfMoveframes({
  sport,
  sectionId,
  workout,
  day,
  mode,
  existingMoveframe,
  initialGoal,
  onSave,
  onCancel,
  fullView
}: FastPlannerProps, ref) {
  // Training goal for this moveframe (same taxonomy as Plan Gym Week)
  const [moveframeGoal, setMoveframeGoal] = useState<GoalId>(() => parseStoredMoveframeGoal(initialGoal));

  // State for sector selection mode
  const [sectorMode, setSectorMode] = useState<'exercises' | 'series'>('exercises');

  // State for exercise search
  const [exerciseSearch, setExerciseSearch] = useState('');

  // State for showing exercise selector popup
  const [showExercisePopup, setShowExercisePopup] = useState(false);

  // State for execution toolbar values (quick selection bar)
  const [execSpeed, setExecSpeed] = useState('');
  const [execSeries, setExecSeries] = useState('');
  const [execRipTime, setExecRipTime] = useState('');
  const [execWeight, setExecWeight] = useState('');
  const [execBreak, setExecBreak] = useState('');
  const [execMode, setExecMode] = useState('');

  // State for selected cell (for keyboard-like input)
  const [selectedCell, setSelectedCell] = useState<{ rowId: number; field: string } | null>(null);
  // Ref to remember last selected row for toolbar quick-fill (so value goes to correct row even when focus moves to toolbar)
  const lastSelectedRowIdRef = React.useRef<number | null>(null);
  const exerciseListScrollRef = React.useRef<HTMLDivElement>(null);
  const sectorListScrollRef = React.useRef<HTMLDivElement>(null);
  const exerciseTableScrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  const registerRowRef = useCallback((rowId: number, el: HTMLTableRowElement | null) => {
    if (el) rowRefs.current.set(rowId, el);
    else rowRefs.current.delete(rowId);
  }, []);

  // State for exercise rows
  const [rows, setRows] = useState<FastPlannerRow[]>([
    { id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' },
    { id: 2, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' },
    { id: 3, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' },
    { id: 4, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }
  ]);

  // Selected muscle group for filtering exercises
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const ZOOM = 0.55;
  /** Sector strip: compact cards — ~6 visible before scroll */
  const SECTOR_ZOOM = 0.68;
  const SECTOR_CARD_WIDTH_PX = 108;
  const [showSubExercises, setShowSubExercises] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedCell?.rowId) return;
    const rowEl = rowRefs.current.get(selectedCell.rowId);
    const scrollEl = exerciseTableScrollRef.current;
    if (!rowEl || !scrollEl) return;
    const row = rows.find((r) => r.id === selectedCell.rowId);
    const isBlankExerciseRow = !row?.exercise?.trim();
    const frame = requestAnimationFrame(() => {
      const rowRect = rowEl.getBoundingClientRect();
      const containerRect = scrollEl.getBoundingClientRect();
      const needsScroll =
        isBlankExerciseRow ||
        rowRect.bottom > containerRect.bottom - 8 ||
        rowRect.top < containerRect.top + 8;
      if (needsScroll) {
        rowEl.scrollIntoView({
          block: isBlankExerciseRow ? 'nearest' : 'nearest',
          behavior: 'smooth',
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedCell?.rowId, selectedCell?.field, rows]);

  // State for which exercise toolbar button is active (speed, series, etc.)
  const [activeExerciseButton, setActiveExerciseButton] = useState<'speed' | 'series' | 'riptime' | 'weight' | 'break' | 'mode' | null>(null);

  // State for Rip\Time input mode
  const [ripTimeMode, setRipTimeMode] = useState<'reps' | 'time'>('reps');
  const [ripTimeValue, setRipTimeValue] = useState<string>('');

  // State for Weight input
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // State for Break input
  const [breakMode, setBreakMode] = useState<'rest' | 'cardio'>('rest');
  const [cardioValue, setCardioValue] = useState<string>('120');
  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [showSeriesPlanModal, setShowSeriesPlanModal] = useState<boolean>(false);
  const [planSectorId, setPlanSectorId] = useState<string | null>(null);
  const [planSeries, setPlanSeries] = useState<string>('3');
  const [planReps, setPlanReps] = useState<string>('12');
  const [planPause, setPlanPause] = useState<string>("1'30\"");
  const [planPyramidal, setPlanPyramidal] = useState<string>('flat');
  const [planCandidate, setPlanCandidate] = useState<any>(null);
  const [planExerciseSearch, setPlanExerciseSearch] = useState<string>('');
  /** Target totals for the whole muscle area (planning support table). */
  const [planTargetTotalSeries, setPlanTargetTotalSeries] = useState<string>('12');
  const [planTargetLevel, setPlanTargetLevel] = useState<PlanTargetLevelBand>('lev34');
  const [planTargetReps, setPlanTargetReps] = useState<string>('15');
  const [planTargetPause, setPlanTargetPause] = useState<string>("2'");
  const [planExerciseDetailTab, setPlanExerciseDetailTab] = useState<'execution' | 'points' | 'video' | 'other'>('execution');
  const [userDescription, setUserDescription] = useState<string>('');
  /** Rest after the last set of the planned moveframe (Macro / macroFinal on final movelap). */
  const [endMacro, setEndMacro] = useState(FAST_PLANNER_DEFAULT_END_MACRO);
  const loadedMoveframeIdRef = React.useRef<string | null>(null);
  const planListRef = React.useRef<HTMLDivElement | null>(null);

  // Speed options for body building and similar sports
  const SPEED_OPTIONS = ['Very slow', 'Slow', 'Normal', 'Quick', 'Fast', 'Very fast', 'Explosive', 'Negative'];

  // Break/Pause options
  const BREAK_OPTIONS = ['0', '0"', '5"', '10"', '15"', '20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"];

  const PLAN_PYRAMIDAL_OPTIONS = [
    { value: 'flat', label: 'Flat' },
    { value: 'ascending', label: 'Ascending' },
    { value: 'descending', label: 'Descending' },
    { value: 'mix', label: 'Mix' }
  ] as const;

  const planPyramidalLabel = (v: string | undefined): string => {
    const mode = parsePyramidalMode(v);
    const opt = PLAN_PYRAMIDAL_OPTIONS.find((o) => o.value === mode);
    return opt?.label ?? 'Flat';
  };

  type PyramidalUiValue = (typeof PLAN_PYRAMIDAL_OPTIONS)[number]['value'];

  const parsePyramidalMode = (pyramidal: string | undefined): PyramidalUiValue | 'flat' => {
    const v = (pyramidal || 'flat').trim();
    return PLAN_PYRAMIDAL_OPTIONS.some((o) => o.value === v) ? (v as PyramidalUiValue) : 'flat';
  };

  const parseBaseRepsFromRipTime = (ripTime: string): number | null => {
    const raw = (ripTime || '').trim();
    if (!raw) return null;
    const first = raw.split(/\s*\/\s*/)[0]?.trim() ?? raw;
    const n = parseInt(first, 10);
    return Number.isNaN(n) ? null : n;
  };

  const formatRipTimeSeries = (reps: number[]): string => reps.map((r) => String(r)).join(' / ');

  const clampSeriesCount = (row: FastPlannerRow): number => {
    const n = parseInt(String(row.series || '').trim(), 10);
    if (!Number.isFinite(n) || n < 1) return 0;
    return Math.min(40, n);
  };

  /** Apply Plan Gym Week pyramidal formula from series-1 reps (same as computePyramidalRepsSeries). */
  const applyPyramidalToRow = (row: FastPlannerRow): FastPlannerRow => {
    const mode = parsePyramidalMode(row.pyramidal) as PyramidalMode;
    const count = clampSeriesCount(row);
    if (mode === 'flat' || count <= 0) {
      const parts = (row.ripTime || '').split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
      return { ...row, ripTime: parts[0] ?? row.ripTime ?? '' };
    }
    const base = parseBaseRepsFromRipTime(row.ripTime) ?? 12;
    const series = computePyramidalRepsSeries(base, count, mode);
    return { ...row, ripTime: formatRipTimeSeries(series) };
  };

  const resolveFastPlannerRowSeriesReps = (row: FastPlannerRow): string[] => {
    const mode = parsePyramidalMode(row.pyramidal);
    const count = clampSeriesCount(row);
    if (mode === 'flat' || count <= 0) return [];
    const raw = (row.ripTime || '').trim();
    const parts = raw.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= count) return parts.slice(0, count);
    const fill = parts[parts.length - 1] ?? '';
    return Array.from({ length: count }, (_, i) => parts[i] ?? fill);
  };

  /** Resize per-set rip/time slots when series count changes — does not recalculate pyramidal values. */
  const resizeRipTimeForSeriesCount = (row: FastPlannerRow): FastPlannerRow => {
    const mode = parsePyramidalMode(row.pyramidal);
    const count = clampSeriesCount(row);
    if (count <= 0) return { ...row, ripTime: '' };
    if (mode === 'flat') {
      const parts = (row.ripTime || '').split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
      return { ...row, ripTime: parts[0] ?? row.ripTime ?? '' };
    }
    const parts = resolveFastPlannerRowSeriesReps(row);
    while (parts.length < count) parts.push(parts[parts.length - 1] ?? '');
    return { ...row, ripTime: parts.slice(0, count).join(' / ') };
  };

  const updatePlannerSeriesRep = (rowId: number, seriesIndex: number, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const mode = parsePyramidalMode(r.pyramidal);
        const count = clampSeriesCount(r);
        if (mode === 'flat' || count <= 0) return { ...r, ripTime: value };

        const reps = resolveFastPlannerRowSeriesReps(r);
        const next = [...reps];
        while (next.length < count) next.push(next[next.length - 1] ?? '');
        if (seriesIndex >= 0 && seriesIndex < count) next[seriesIndex] = value;
        return { ...r, ripTime: next.join(' / ') };
      }),
    );
  };

  // Mode options - Breaking modality among series
  const MODE_OPTIONS = [
    { id: 'stopped', label: 'Stopped', icon: '/icons/stopped.png' },
    { id: 'superset', label: 'Superset', icon: '/icons/superset.png' },
    { id: 'movement', label: 'Movement Customized', icon: '/icons/movement.png' }
  ];

  // Helper function to format time input (MM'SS" format)
  const formatRipTime = (value: string, finalize = false): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    // While typing → don't force zeros
    if (!finalize) return digits;

    // On blur → format
    const padded = digits.length < 4 ? digits.padStart(4, '0') : digits;
    const seconds = padded.slice(-2);
    const minutes = padded.slice(0, -2);

    return `${minutes}'${seconds}"`;
  };

  const EXERCISE_IMAGES_BY_GROUP: Record<string, string[]> = {
    shoulders: [
      '/Exercises/shoulder/shoulder exercise 01.png',
      '/Exercises/shoulder/shoulder exercise 02.png',
      '/Exercises/shoulder/shoulder exercise 03.png',
      '/Exercises/shoulder/shoulder exercise 04.png',
      '/Exercises/shoulder/shoulder exercise 05.png',
      '/Exercises/shoulder/shoulder exercise 06.png',
      '/Exercises/shoulder/shoulder exercise 07.png',
      '/Exercises/shoulder/shoulder exercise 08.png',
      '/Exercises/shoulder/shoulder exercise 09.png',
      '/Exercises/shoulder/shoulder exercise 10.png',
      '/Exercises/shoulder/shoulder exercise 11.png',
      '/Exercises/shoulder/shoulder exercise 12.png'
    ],
    biceps: [
      '/Exercises/biceps/biceps exercise 01.png',
      '/Exercises/biceps/biceps exercise 02.png',
      '/Exercises/biceps/biceps exercise 03.png',
      '/Exercises/biceps/biceps exercise 04.png',
      '/Exercises/biceps/biceps exercise 05.png',
      '/Exercises/biceps/biceps exercise 06.png',
      '/Exercises/biceps/biceps exercise 07.png',
      '/Exercises/biceps/biceps exercise 08.png',
      '/Exercises/biceps/biceps exercise 09.png',
      '/Exercises/biceps/biceps exercise 10.png',
      '/Exercises/biceps/biceps exercise 11.png',
      '/Exercises/biceps/biceps exercise 12.png'
    ],
    triceps: [
      '/Exercises/triceps/triceps exercise 01.png',
      '/Exercises/triceps/triceps exercise 02.png',
      '/Exercises/triceps/triceps exercise 03.png',
      '/Exercises/triceps/triceps exercise 04.png',
      '/Exercises/triceps/triceps exercise 05.png',
      '/Exercises/triceps/triceps exercise 06.png',
      '/Exercises/triceps/triceps exercise 07.png',
      '/Exercises/triceps/triceps exercise 08.png',
      '/Exercises/triceps/triceps exercise 09.png',
      '/Exercises/triceps/triceps exercise 10.png',
      '/Exercises/triceps/triceps exercise 11.png',
      '/Exercises/triceps/triceps exercise 12.png'
    ],
    forearms: [
      '/Exercises/forearms/forearms exercise 01.png',
      '/Exercises/forearms/forearms exercise 02.png',
      '/Exercises/forearms/forearms exercise 03.png',
      '/Exercises/forearms/forearms exercise 04.png',
      '/Exercises/forearms/forearms exercise 05.png',
      '/Exercises/forearms/forearms exercise 06.png',
      '/Exercises/forearms/forearms exercise 07.png',
      '/Exercises/forearms/forearms exercise 08.png',
      '/Exercises/forearms/forearms exercise 09.png',
      '/Exercises/forearms/forearms exercise 10.png',
      '/Exercises/forearms/forearms exercise 11.png',
      '/Exercises/forearms/forearms exercise 12.png'
    ],
    chest: [
      '/Exercises/chest/chest exercise 01.png',
      '/Exercises/chest/chest exercise 02.png',
      '/Exercises/chest/chest exercise 03.png',
      '/Exercises/chest/chest exercise 04.png',
      '/Exercises/chest/chest exercise 05.png',
      '/Exercises/chest/chest exercise 06.png',
      '/Exercises/chest/chest exercise 07.png',
      '/Exercises/chest/chest exercise 08.png',
      '/Exercises/chest/chest exercise 09.png',
      '/Exercises/chest/chest exercise 10.png',
      '/Exercises/chest/chest exercise 11.png',
      '/Exercises/chest/chest exercise 12.png'
    ],
    abs: [
      '/Exercises/abdominals/abdominals exercise 01.png',
      '/Exercises/abdominals/abdominals exercise 02.png',
      '/Exercises/abdominals/abdominals exercise 03.png',
      '/Exercises/abdominals/abdominals exercise 04.png',
      '/Exercises/abdominals/abdominals exercise 05.png',
      '/Exercises/abdominals/abdominals exercise 06.png',
      '/Exercises/abdominals/abdominals exercise 07.png',
      '/Exercises/abdominals/abdominals exercise 08.png',
      '/Exercises/abdominals/abdominals exercise 9.png',
      '/Exercises/abdominals/abdominals exercise 10.png',
      '/Exercises/abdominals/abdominals exercise 11.png',
      '/Exercises/abdominals/abdominals exercise 12.png'
    ],
    trapezius: [
      '/Exercises/trapezius/trapezius exercise 01.png',
      '/Exercises/trapezius/trapezius exercise 02.png',
      '/Exercises/trapezius/trapezius exercise 03.png',
      '/Exercises/trapezius/trapezius exercise 04.png',
      '/Exercises/trapezius/trapezius exercise 05.png',
      '/Exercises/trapezius/trapezius exercise 06.png',
      '/Exercises/trapezius/trapezius exercise 07.png',
      '/Exercises/trapezius/trapezius exercise 08.png',
      '/Exercises/trapezius/trapezius exercise 09.png',
      '/Exercises/trapezius/trapezius exercise 10.png',
      '/Exercises/trapezius/trapezius exercise 11.png',
      '/Exercises/trapezius/trapezius exercise 12.png'
    ],
    lats: [
      '/Exercises/lats/lats exercise 01.png',
      '/Exercises/lats/lats exercise 02.png',
      '/Exercises/lats/lats exercise 03.png',
      '/Exercises/lats/lats exercise 04.png',
      '/Exercises/lats/lats exercise 05.png',
      '/Exercises/lats/lats exercise 06.png',
      '/Exercises/lats/lats exercise 07.png',
      '/Exercises/lats/lats exercise 08.png',
      '/Exercises/lats/lats exercise 09.png',
      '/Exercises/lats/lats exercise 10.png',
      '/Exercises/lats/lats exercise 11.png',
      '/Exercises/lats/lats exercise 12.png'
    ],
    quadriceps: [
      '/Exercises/quadriceps/quadriceps exercise 01.png',
      '/Exercises/quadriceps/quadriceps exercise 02.png',
      '/Exercises/quadriceps/quadriceps exercise 03.png',
      '/Exercises/quadriceps/quadriceps exercise 04.png',
      '/Exercises/quadriceps/quadriceps exercise 05.png',
      '/Exercises/quadriceps/quadriceps exercise 06.png',
      '/Exercises/quadriceps/quadriceps exercise 07.png',
      '/Exercises/quadriceps/quadriceps exercise 08.png',
      '/Exercises/quadriceps/quadriceps exercise 09.png',
      '/Exercises/quadriceps/quadriceps exercise 10.png',
      '/Exercises/quadriceps/quadriceps exercise 11.png',
      '/Exercises/quadriceps/quadriceps exercise 12.png'
    ],
    hams: [
      '/Exercises/hamstrings/hamstrings exercise 01.png',
      '/Exercises/hamstrings/hamstrings exercise 02.png',
      '/Exercises/hamstrings/hamstrings exercise 03.png',
      '/Exercises/hamstrings/hamstrings exercise 04.png',
      '/Exercises/hamstrings/hamstrings exercise 05.png',
      '/Exercises/hamstrings/hamstrings exercise 06.png',
      '/Exercises/hamstrings/hamstrings exercise 07.png',
      '/Exercises/hamstrings/hamstrings exercise 08.png',
      '/Exercises/hamstrings/hamstrings exercise 09.png',
      '/Exercises/hamstrings/hamstrings exercise 10.png',
      '/Exercises/hamstrings/hamstrings exercise 11.png',
      '/Exercises/hamstrings/hamstrings exercise 12.png'
    ],
    calves: [
      '/Exercises/calves/calves exercise 01.png',
      '/Exercises/calves/calves exercise 02.png',
      '/Exercises/calves/calves exercise 03.png',
      '/Exercises/calves/calves exercise 04.png',
      '/Exercises/calves/calves exercise 05.png',
      '/Exercises/calves/calves exercise 06.png',
      '/Exercises/calves/calves exercise 07.png',
      '/Exercises/calves/calves exercise 08.png',
      '/Exercises/calves/calves exercise 09.png',
      '/Exercises/calves/calves exercise10.png',
      '/Exercises/calves/calves exercise 11.png',
      '/Exercises/calves/calves exercise 12.png'
    ],
    glutes: [
      '/Exercises/glutes/glutes exercise 01.png',
      '/Exercises/glutes/glutes exercise 02.png',
      '/Exercises/glutes/glutes exercise 03.png',
      '/Exercises/glutes/glutes exercise 04.png',
      '/Exercises/glutes/glutes exercise 05.png',
      '/Exercises/glutes/glutes exercise 06.png',
      '/Exercises/glutes/glutes exercise 07.png',
      '/Exercises/glutes/glutes exercise 08.png',
      '/Exercises/glutes/glutes exercise 09.png',
      '/Exercises/glutes/glutes exercise 10.png',
      '/Exercises/glutes/glutes exercise 11.png',
      '/Exercises/glutes/glutes exercise 12.png'
    ]
  };
  const getExerciseImage = (groupId: string, index: number): string => {
    const images = EXERCISE_IMAGES_BY_GROUP[groupId];
    if (!images || images.length === 0) return '/Exercises/abdominals/abdominals exercise 01.png';
    return images[index % images.length];
  };
  const formatExerciseIndex = (index: number) => `${index + 1}`.padStart(2, '0');
  const mockExercises = MUSCLE_GROUPS.flatMap(group =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `${group.id}-${i}`,
      name: `${group.label} Exercise ${formatExerciseIndex(i)}`,
      sector: group.sector,
      image: getExerciseImage(group.id, i)
    }))
  ).concat(
    Array.from({ length: 20 }, (_, i) => ({
      id: `general-${i}`,
      name: `General Exercise ${formatExerciseIndex(i)}`,
      sector: 'General',
      image: '/Exercises/abdominals/abdominals exercise 01.png'
    }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getSectorForExercise = React.useCallback((exerciseName: string): string | null => {
    const ex = mockExercises.find(e => e.name === exerciseName);
    return ex?.sector || null;
  }, [mockExercises]);

  const planTargetExeCount = React.useMemo(() => {
    const t = parseInt(planTargetTotalSeries, 10);
    const total = Number.isNaN(t) || t < 1 ? 1 : t;
    return suggestedExeFromSeriesAndLevel(total, planTargetLevel);
  }, [planTargetTotalSeries, planTargetLevel]);

  /** All planner rows whose exercise maps to this muscle sector (any row order in the table). */
  const planSectorPlanningStats = React.useMemo(() => {
    if (!planSectorId) {
      return {
        seriesSum: 0,
        exerciseCount: 0,
        avgReps: null as number | null,
        avgPauseSec: null as number | null,
        lastRow: null as FastPlannerRow | null
      };
    }
    const sectorLabel = MUSCLE_GROUPS.find(g => g.id === planSectorId)?.sector ?? null;
    if (!sectorLabel) {
      return {
        seriesSum: 0,
        exerciseCount: 0,
        avgReps: null as number | null,
        avgPauseSec: null as number | null,
        lastRow: null as FastPlannerRow | null
      };
    }
    const sectorRows = rows.filter(r => {
      const name = r.exercise?.trim();
      if (!name) return false;
      return getSectorForExercise(name) === sectorLabel;
    });
    const seriesSum = sectorRows.reduce((s, r) => s + (parseInt(String(r.series), 10) || 0), 0);
    const exerciseCount = sectorRows.length;
    const repsVals = sectorRows.map(r => parseInt(String(r.ripTime), 10)).filter(n => !Number.isNaN(n) && n > 0);
    const avgReps = repsVals.length ? Math.round(repsVals.reduce((a, b) => a + b, 0) / repsVals.length) : null;
    const pauseSecs = sectorRows
      .map(r => parsePauseToSecondsOrNull(String(r.break || '')))
      .filter((x): x is number => x !== null);
    const avgPauseSec = pauseSecs.length ? pauseSecs.reduce((a, b) => a + b, 0) / pauseSecs.length : null;
    const lastRow = sectorRows.length ? sectorRows[sectorRows.length - 1] : null;
    return { seriesSum, exerciseCount, avgReps, avgPauseSec, lastRow };
  }, [rows, planSectorId, getSectorForExercise]);

  const suggestedPlanSeries = React.useMemo(() => {
    if (!showSeriesPlanModal || !planSectorId) return null;
    const t = parseInt(planTargetTotalSeries, 10);
    const target = Number.isNaN(t) || t < 1 ? 1 : t;
    const category = planTargetLevelToCategory(planTargetLevel);
    return suggestedSeriesForExerciseSlot(
      target,
      category,
      planSectorPlanningStats.exerciseCount,
      planSectorPlanningStats.seriesSum,
    );
  }, [
    showSeriesPlanModal,
    planSectorId,
    planTargetTotalSeries,
    planTargetLevel,
    planSectorPlanningStats.exerciseCount,
    planSectorPlanningStats.seriesSum,
  ]);

  React.useEffect(() => {
    if (suggestedPlanSeries == null) return;
    setPlanSeries(String(suggestedPlanSeries));
  }, [suggestedPlanSeries]);

  const planSeriesDropdownOptions = React.useMemo(() => {
    const selected = parseInt(planSeries, 10);
    if (Number.isFinite(selected) && !(PLAN_SERIES_DROPDOWN_OPTIONS as readonly number[]).includes(selected)) {
      return [...PLAN_SERIES_DROPDOWN_OPTIONS, selected].sort((a, b) => a - b);
    }
    return [...PLAN_SERIES_DROPDOWN_OPTIONS];
  }, [planSeries]);

  const buildMovelapsFromRows = (filledRows: FastPlannerRow[]) => {
    const out: any[] = [];
    const macroTrimmed = endMacro.trim();
    const lastRowIndex = filledRows.length - 1;

    filledRows.forEach((row, rowIndex) => {
      const sector = row.exercise ? getSectorForExercise(row.exercise) : null;
      const seriesCount = clampSeriesCount(row) || 1;
      const pauseVal = row.break && String(row.break).trim() !== '' ? String(row.break).trim() : null;
      const seriesReps = resolveFastPlannerRowSeriesReps(row);
      const defaultReps = ripTimeMode === 'reps' ? parseInt(row.ripTime || '', 10) || null : null;
      const defaultTime = ripTimeMode === 'time' ? row.ripTime || null : null;

      for (let s = 0; s < seriesCount; s++) {
        const isLastOverall = rowIndex === lastRowIndex && s === seriesCount - 1;
        const repsValue =
          ripTimeMode === 'reps'
            ? seriesReps.length > 0
              ? parseInt(seriesReps[s] ?? seriesReps[seriesReps.length - 1] ?? '', 10) || defaultReps
              : defaultReps
            : null;
        const timeValue =
          ripTimeMode === 'time'
            ? seriesReps.length > 0
              ? seriesReps[s] ?? seriesReps[seriesReps.length - 1] ?? defaultTime
              : defaultTime
            : null;

        out.push({
          repetitionNumber: out.length + 1,
          distance: null,
          speed: row.speed || null,
          style: null,
          pace: null,
          time: timeValue,
          reps: repsValue,
          weight:
            row.weight && row.weight.trim() !== '' && row.weight.trim().toLowerCase() !== 'nc'
              ? row.weight
              : null,
          tools: null,
          r1: null,
          r2: null,
          muscularSector: sector,
          exercise: row.exercise || null,
          restType: null,
          pause: pauseVal,
          macroFinal: isLastOverall && macroTrimmed ? macroTrimmed : null,
          alarm: null,
          sound: null,
          notes: row.mode || null,
          status: 'PENDING',
          isSkipped: false,
          isDisabled: false,
        });
      }
    });

    return out;
  };

  /** Build distances-only line (e.g. 10\\A1+8\\B2+12\\A2) for moveframe description row 1 */
  const buildFastPlannerDistancesOnly = (filledRows: FastPlannerRow[]) => {
    const parts = filledRows
      .map(r => {
        const series = (r.series || '').trim();
        const speed = (r.speed || '').trim();
        if (!series && !speed) return '';
        return `${series || '0'}\\${speed || '-'}`;
      })
      .filter(Boolean);
    return parts.join('+');
  };

  const buildFastPlannerDescription = (filledRows: FastPlannerRow[]) => {
    const distancesOnly = buildFastPlannerDistancesOnly(filledRows);
    const userDesc = (userDescription || '').trim();
    if (!distancesOnly && !userDesc) return `Fast planner - ${filledRows.length} exercises`;
    if (!userDesc) return distancesOnly;
    return distancesOnly ? `${distancesOnly}\n${userDesc}` : userDesc;
  };

  /** Parse pause string (e.g. "1'30\"", "2'", "45\"") to total seconds */
  const parsePauseToSeconds = React.useCallback((s: string): number => {
    if (!s || typeof s !== 'string') return 0;
    const trimmed = s.trim();
    let seconds = 0;
    const minMatch = trimmed.match(/(\d+)\s*'/);
    if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
    const secMatch = trimmed.match(/(\d+)\s*"?\s*"?$/);
    if (secMatch) seconds += parseInt(secMatch[1], 10);
    else if (!minMatch && /^\d+$/.test(trimmed)) seconds += parseInt(trimmed, 10);
    return seconds;
  }, []);

  /** Format seconds to M'SS" */
  const formatPauseFromSeconds = React.useCallback((totalSeconds: number): string => {
    if (totalSeconds <= 0) return "0'00\"";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}'${String(s).padStart(2, '0')}"`;
  }, []);

  /** Per muscle card: total series and exercise count (for strip totals). */
  const muscleGroupAggregates = useMemo(() => {
    const byId: Record<string, { series: number; exercises: number }> = {};
    for (const g of MUSCLE_GROUPS) {
      byId[g.id] = { series: 0, exercises: 0 };
    }
    for (const r of rows) {
      const ex = r.exercise?.trim();
      if (!ex) continue;
      const sectorLabel = getSectorForExercise(ex);
      const group = MUSCLE_GROUPS.find((m) => m.sector === sectorLabel);
      if (!group) continue;
      byId[group.id].exercises += 1;
      byId[group.id].series += parseInt(String(r.series || '0'), 10) || 0;
    }
    return byId;
  }, [rows, getSectorForExercise]);

  const sectorSeriesSummaryChips = useMemo(
    () =>
      MUSCLE_GROUPS
        .map((group) => ({
          id: group.id,
          label: group.label,
          series: muscleGroupAggregates[group.id]?.series ?? 0,
          exercises: muscleGroupAggregates[group.id]?.exercises ?? 0,
        }))
        .filter((item) => item.series > 0 || item.exercises > 0),
    [muscleGroupAggregates]
  );

  const moveframeSummaryStats = useMemo(() => {
    const sectorCount = sectorSeriesSummaryChips.length;
    const totalSeries = sectorSeriesSummaryChips.reduce((sum, chip) => sum + chip.series, 0);
    const totalExercises = sectorSeriesSummaryChips.reduce((sum, chip) => sum + chip.exercises, 0);
    const avgSeriesPerSector =
      sectorCount > 0 ? Math.round((totalSeries / sectorCount) * 10) / 10 : 0;
    return { sectorCount, totalSeries, totalExercises, avgSeriesPerSector };
  }, [sectorSeriesSummaryChips]);

  const selectSectorFromSummaryChip = useCallback((chipId: string) => {
    setSelectedMuscleGroup(chipId);
    setShowSubExercises(true);
    setActiveExerciseButton(null);
  }, []);

  useEffect(() => {
    if (mode !== 'edit') return;
    if (!existingMoveframe?.id) return;
    if (loadedMoveframeIdRef.current === existingMoveframe.id) return;

    loadedMoveframeIdRef.current = existingMoveframe.id;

    const notesStr = typeof existingMoveframe.notes === 'string' ? existingMoveframe.notes : '';
    const userPart = notesStr.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '').trim();
    setUserDescription(userPart);

    const parsed =
      parseFastPlannerDataFromNotes(existingMoveframe.notes) ||
      (existingMoveframe.fastPlannerData && typeof existingMoveframe.fastPlannerData === 'object'
        ? existingMoveframe.fastPlannerData
        : null);
    if (parsed) {
      setMoveframeGoal(parseStoredMoveframeGoal(parsed.goal));
      if (parsed.sectorMode === 'exercises' || parsed.sectorMode === 'series') setSectorMode(parsed.sectorMode);
      if (typeof parsed.execSpeed === 'string') setExecSpeed(parsed.execSpeed);
      if (typeof parsed.execSeries === 'string') setExecSeries(parsed.execSeries);
      if (typeof parsed.execRipTime === 'string') setExecRipTime(parsed.execRipTime);
      if (typeof parsed.execWeight === 'string') setExecWeight(parsed.execWeight);
      if (typeof parsed.execBreak === 'string') setExecBreak(parsed.execBreak);
      if (typeof parsed.execMode === 'string') setExecMode(parsed.execMode);
      if (parsed.ripTimeMode === 'reps' || parsed.ripTimeMode === 'time') setRipTimeMode(parsed.ripTimeMode);
      if (Array.isArray(parsed.rows) && parsed.rows.length > 0) setRows(parsed.rows);
      if (parsed.preferences != null) setPreferences(parsed.preferences);
      if (typeof parsed.endMacro === 'string' && parsed.endMacro.trim()) {
        setEndMacro(parsed.endMacro.trim());
      } else if (
        existingMoveframe?.macroFinal != null &&
        String(existingMoveframe.macroFinal).trim() !== ''
      ) {
        setEndMacro(String(existingMoveframe.macroFinal).trim());
      } else if (Array.isArray(existingMoveframe?.movelaps) && existingMoveframe.movelaps.length > 0) {
        const lastLap = existingMoveframe.movelaps[existingMoveframe.movelaps.length - 1];
        if (lastLap?.macroFinal != null && String(lastLap.macroFinal).trim() !== '') {
          setEndMacro(String(lastLap.macroFinal).trim());
        }
      }
      setSelectedCell(null);
      lastSelectedRowIdRef.current = null;
      setShowSubExercises(false);
      setShowExercisePopup(false);
      return;
    }

    if (Array.isArray(existingMoveframe.movelaps) && existingMoveframe.movelaps.length > 0) {
      const byExercise = new Map<string, any[]>();
      for (const ml of existingMoveframe.movelaps) {
        const key = typeof ml.exercise === 'string' && ml.exercise.trim() !== '' ? ml.exercise : 'Exercise';
        if (!byExercise.has(key)) byExercise.set(key, []);
        byExercise.get(key)!.push(ml);
      }

      const rebuilt: FastPlannerRow[] = Array.from(byExercise.entries()).map(([exercise, laps], idx) => {
        const first = laps[0] || {};
        return {
          id: idx + 1,
          exercise,
          speed: typeof first.speed === 'string' ? first.speed : '',
          series: String(laps.length),
          ripTime: first.reps != null ? String(first.reps) : '',
          weight: typeof first.weight === 'string' ? first.weight : '',
          break: typeof first.pause === 'string' ? first.pause : '',
          mode: typeof first.notes === 'string' ? first.notes : ''
        };
      });

      setRows(rebuilt.length > 0 ? rebuilt : [{ id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }]);
      setMoveframeGoal('hypertrophy');
      setSelectedCell(null);
      lastSelectedRowIdRef.current = null;
      setShowSubExercises(false);
      setShowExercisePopup(false);
    }
  }, [mode, existingMoveframe?.id, existingMoveframe?.movelaps, existingMoveframe?.notes, existingMoveframe?.fastPlannerData, existingMoveframe?.macroFinal]);

  // Mock frequently used exercises (for blue indicator)
  const frequentlyUsedExercises = ['shoulders-0', 'chest-0', 'biceps-1', 'quadriceps-0'];

  // Function to get indicator color for an exercise
  const getExerciseIndicatorColor = (exerciseName: string): 'green' | 'blue' | null => {
    // Check if exercise is already selected in current workout (green has priority)
    const isSelected = rows.some(row => row.exercise === exerciseName);
    if (isSelected) return 'green';

    // Check if exercise is frequently used
    const exercise = mockExercises.find(ex => ex.name === exerciseName);
    if (exercise && frequentlyUsedExercises.includes(exercise.id)) return 'blue';

    return null;
  };

  const getTargetRowId = () => {
    if (selectedCell?.rowId != null) return selectedCell.rowId;
    const firstWithExercise = rows.find(r => r.exercise?.trim());
    if (firstWithExercise) return firstWithExercise.id;
    return rows.length > 0 ? rows[rows.length - 1].id : null;
  };

  // Apply toolbar value to the active exercise's cell for the given field (e.g. Series, Speed)
  // independently of which cell is currently focused (e.g. if Speed is focused, clicking 5 on Series still updates Series)
  const applyValueToRow = (field: string, value: string) => {
    const targetRowId = getTargetRowId();
    if (targetRowId == null) return;
    setRows(prevRows => prevRows.map(row => {
      if (row.id === targetRowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const setExecutionValueForField = (field: string, value: string) => {
    if (field === 'speed') {
      setExecSpeed(value);
      return;
    }
    if (field === 'series') {
      setExecSeries(value);
      return;
    }
    if (field === 'ripTime') {
      setExecRipTime(value);
      return;
    }
    if (field === 'weight') {
      setExecWeight(value);
      return;
    }
    if (field === 'break') {
      setExecBreak(value);
      return;
    }
    if (field === 'mode') {
      setExecMode(value);
    }
  };

  const getExecutionValueForField = (field: string): string => {
    if (field === 'speed') return execSpeed;
    if (field === 'series') return execSeries;
    if (field === 'ripTime') return execRipTime;
    if (field === 'weight') return execWeight;
    if (field === 'break') return execBreak;
    if (field === 'mode') return execMode;
    return '';
  };

  const applyExecutionValue = (field: string, value: string) => {
    setExecutionValueForField(field, value);
    applyValueToRow(field, value);
  };

  // Handle quick value selection from execution toolbar (keyboard-like input)
  const handleQuickFill = (field: string, value: string) => {
    const normalizedField = field === 'riptime' ? 'ripTime' : field;
    applyExecutionValue(normalizedField, value);
  };

  // Handle cell click (select cell for quick input)
  const handleCellClick = (rowId: number, field: string) => {
    setSelectedCell({ rowId, field });
    lastSelectedRowIdRef.current = rowId;
    const row = rows.find(r => r.id === rowId);
    const sectorSelected = !!selectedMuscleGroup;
    const exerciseSelected = !!row?.exercise;

    if (field !== 'exercise') {
      const executionValue = getExecutionValueForField(field);
      if (executionValue.trim() !== '') {
        setRows(prevRows =>
          prevRows.map(r => (r.id === rowId ? { ...r, [field]: executionValue } : r))
        );
      }
    }

    if (field === 'exercise') {
      setActiveExerciseButton(null);
      setShowSubExercises(true);
      setShowExercisePopup(false);
    } else if (field === 'speed') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('speed');
    } else if (field === 'series') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('series');
    } else if (field === 'ripTime') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('riptime');
    } else if (field === 'weight') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('weight');
    } else if (field === 'break') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('break');
    } else if (field === 'mode') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('mode');
    }
  };

  // Add new row
  const handleGoNext = () => {
    appendNextRowFromIndex(pickActiveRowIndex(rows));
  };

  // Rescan: choose another exercise of the same sector/type (when row has an exercise)
  const handleRescanExercise = (rowId: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    let sector: string | null = null;
    if (row.exercise && row.exercise.trim() !== '') {
      const current = mockExercises.find(ex => ex.name === row.exercise);
      sector = current?.sector || null;
    } else {
      // Blank exercise: choose from the sector of the previous exercise (previous row)
      const prevRow = findPreviousFilledRow(rows, rowId);
      if (prevRow?.exercise) {
        const prevEx = mockExercises.find(ex => ex.name === prevRow.exercise);
        sector = prevEx?.sector || null;
      }
      if (!sector && selectedMuscleGroup && selectedMuscleGroup !== 'all') {
        const group = MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup);
        sector = group?.sector || null;
      }
    }

    let candidates = mockExercises;
    if (sector) {
      candidates = mockExercises.filter(ex => ex.sector === sector);
    }

    // Exclude current exercise from candidates when row has one
    if (row.exercise && row.exercise.trim() !== '') {
      candidates = candidates.filter(ex => ex.name !== row.exercise);
    }

    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    setRows(prevRows =>
      prevRows.map(r => (r.id === rowId ? { ...r, exercise: pick.name } : r))
    );
  };

  // Reload (blank row): open exercise picker filtered by the sector of the previous filled exercise
  const handleReloadBlankExercise = (rowId: number) => {
    const index = rows.findIndex(r => r.id === rowId);
    if (index < 0) return;
    setSelectedCell({ rowId, field: 'exercise' });
    let prevRow: FastPlannerRow | null = null;
    for (let i = index - 1; i >= 0; i--) {
      const r = rows[i];
      if (typeof r?.exercise === 'string' && r.exercise.trim() !== '') {
        prevRow = r;
        break;
      }
    }
    const sector = prevRow?.exercise ? getSectorForExercise(prevRow.exercise) : null;
    const group = sector ? MUSCLE_GROUPS.find(g => g.sector === sector) : null;
    setSelectedMuscleGroup(group?.id ?? 'all');
    setSectorMode('exercises');
    setShowSubExercises(true);
  };

  const applyRowDefaults = (current: FastPlannerRow, previous: FastPlannerRow | null): FastPlannerRow => {
    const next = { ...current };

    if (!next.series || next.series.trim() === '') {
      next.series = previous?.series || '3';
    }
    if (!next.ripTime || next.ripTime.trim() === '') {
      next.ripTime = previous?.ripTime || '15';
    }
    if (!next.break || next.break.trim() === '') {
      next.break = previous?.break || "1'30\"";
    }

    if (!next.speed || next.speed.trim() === '') {
      next.speed = previous?.speed || 'Normal';
    }
    if (!next.weight || next.weight.trim() === '') {
      next.weight = previous?.weight || '0 kg';
    }
    if (!next.mode || next.mode.trim() === '') {
      next.mode = previous?.mode || 'Stopped';
    }
    if (!next.pyramidal || next.pyramidal.trim() === '') {
      next.pyramidal = previous?.pyramidal || 'flat';
    }

    return next;
  };

  const findPreviousFilledRow = (list: FastPlannerRow[], rowId: number): FastPlannerRow | null => {
    const idx = list.findIndex((r) => r.id === rowId);
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      const r = list[i];
      if (typeof r?.exercise === 'string' && r.exercise.trim() !== '') return r;
    }
    return null;
  };

  const pickActiveRowIndex = (list: FastPlannerRow[]): number => {
    const selectedRowId = selectedCell?.rowId;
    if (selectedRowId != null) {
      const idx = list.findIndex(r => r.id === selectedRowId);
      if (idx >= 0) return idx;
    }
    return Math.max(0, list.length - 1);
  };

  // Duplicate/triplicate always append at the bottom (used by Double-click on exercise cell and by Duplicate/Triplicate buttons)
  const appendRowCopiesById = (rowId: number, copies: number) => {
    setRows(prev => {
      if (prev.length === 0) return prev;
      const baseRow = prev.find(r => r.id === rowId);
      if (!baseRow) return prev;
      if (typeof baseRow.exercise !== 'string' || baseRow.exercise.trim() === '') return prev;
      const maxId = Math.max(...prev.map(r => r.id));
      const nextRows = Array.from({ length: copies }, (_, index) => ({
        ...baseRow,
        id: maxId + index + 1
      }));
      return [...prev, ...nextRows];
    });
  };

  const focusNewRowExercise = (newRowId: number) => {
    setSelectedCell({ rowId: newRowId, field: 'exercise' });
    setActiveExerciseButton(null);
    setSelectedMuscleGroup('all');
    setShowSubExercises(true);
  };

  const appendNextRowFromIndex = (rowIndex: number) => {
    if (rows.length === 0) {
      setRows([{ id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }]);
      focusNewRowExercise(1);
      return;
    }

    const safeIndex = Math.min(Math.max(rowIndex, 0), rows.length - 1);
    const nextRowId = rows[safeIndex + 1]?.id;
    const newRowId = Math.max(0, ...rows.map(r => r.id)) + 1;
    const focusRowId = nextRowId ?? newRowId;

    setRows(prev => {
      if (prev.length === 0) {
        return [{ id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }];
      }

      const copy = [...prev];
      const safeIndexInner = Math.min(Math.max(rowIndex, 0), copy.length - 1);
      const currentDraft = { ...copy[safeIndexInner] };
      const currentHasExercise = typeof currentDraft.exercise === 'string' && currentDraft.exercise.trim() !== '';
      const previousFilled = findPreviousFilledRow(copy, currentDraft.id);
      const current = currentHasExercise ? applyRowDefaults(currentDraft, previousFilled) : currentDraft;
      if (currentHasExercise) copy[safeIndexInner] = current;

      const template = currentHasExercise ? current : applyRowDefaults({ ...currentDraft }, previousFilled);
      const nextIndex = safeIndexInner + 1;
      if (nextIndex < copy.length) {
        const existingNext = copy[nextIndex];
        const filledNext = applyRowDefaults({ ...existingNext }, template);
        copy[nextIndex] = filledNext;
        return copy;
      }

      const maxId = Math.max(...copy.map(r => r.id));
      const id = Math.max(newRowId, maxId + 1);
      const nextRow: FastPlannerRow = {
        id,
        exercise: '',
        speed: template.speed,
        series: template.series,
        ripTime: template.ripTime,
        weight: template.weight,
        break: template.break,
        mode: template.mode,
        pyramidal: template.pyramidal || 'flat'
      };

      return [...copy, nextRow];
    });

    focusNewRowExercise(focusRowId);
  };

  // Duplicate selected row
  const handleDuplicate = () => {
    if (rows.length === 0) return;
    const baseIndex = pickActiveRowIndex(rows);
    const baseRowId = rows[baseIndex]?.id;
    if (baseRowId == null) return;
    appendRowCopiesById(baseRowId, 1);
  };

  // Triplicate selected row (2 copies)
  const handleTriplicate = () => {
    if (rows.length === 0) return;
    const baseIndex = pickActiveRowIndex(rows);
    const baseRowId = rows[baseIndex]?.id;
    if (baseRowId == null) return;
    appendRowCopiesById(baseRowId, 2);
  };

  // Remove last row
  const handleRemove = () => {
    if (rows.length > 1) {
      setRows(rows.slice(0, -1));
    }
  };

  // Reset current row
  const handleResetRow = () => {
    if (!selectedCell) return;
    setRows(prevRows => prevRows.map(row => {
      if (row.id === selectedCell.rowId) {
        return { ...row, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '', pyramidal: '' };
      }
      return row;
    }));
  };

  // Reset all rows
  const handleResetAll = () => {
    const ok = typeof window !== 'undefined' ? window.confirm('This will reset all rows. Continue?') : true;
    if (!ok) return;
    setRows([
      { id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }
    ]);
    setSelectedCell(null);
    lastSelectedRowIdRef.current = null;
  };

  // Validate: every row with mode Superset must have at least one adjacent row also Superset (no Superset alone)
  const validateSupersetNotAlone = (list: FastPlannerRow[]): { valid: boolean; message?: string } => {
    for (let i = 0; i < list.length; i++) {
      const mode = (list[i].mode || '').trim();
      if (mode !== 'Superset') continue;
      const prevSuperset = i > 0 && (list[i - 1].mode || '').trim() === 'Superset';
      const nextSuperset = i < list.length - 1 && (list[i + 1].mode || '').trim() === 'Superset';
      if (!prevSuperset && !nextSuperset) {
        return {
          valid: false,
          message: 'Every exercise with Break mode "Superset" must be grouped with at least one other Superset exercise. Please add another Superset next to it or change its mode.'
        };
      }
    }
    return { valid: true };
  };

  // Save moveframe
  const handleSaveMoveframe = () => {
    if (!canSaveWithSuperset) {
      alert('Cannot save: every Superset exercise must be grouped with at least one other Superset (adjacent row). Fix the "not ok" Superset rows.');
      return;
    }
    const filledRows = rows
      .map(r => ({ ...r, exercise: (r.exercise || '').trim() }))
      .filter(r => r.exercise !== '');
    const validation = validateSupersetNotAlone(filledRows);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    const payload = {
      sectorMode,
      goal: moveframeGoal,
      execSpeed,
      execSeries,
      execRipTime,
      execWeight,
      execBreak,
      execMode,
      ripTimeMode,
      rows: filledRows,
      preferences,
      endMacro,
    };
    const notes = upsertFastPlannerDataInNotes(userDescription, payload);
    const movelaps = buildMovelapsFromRows(filledRows);
    const description = buildFastPlannerDescription(filledRows);

    const moveframeData = {
      sport,
      sectionId,
      description,
      type: 'BATTERY',
      uploadToWorkout: false,
      notes,
      fastPlannerData: payload,
      movelaps,
      macroFinal: endMacro.trim() || null,
      isFastPlannerBased: true,
      goal: moveframeGoal
    };

    onSave(moveframeData);
  };
  const handleSaveMoveframeAndMovelaps = () => {
    if (!canSaveWithSuperset) {
      alert('Cannot save: every Superset exercise must be grouped with at least one other Superset (adjacent row). Fix the "not ok" Superset rows.');
      return;
    }
    const filledRows = rows
      .map(r => ({ ...r, exercise: (r.exercise || '').trim() }))
      .filter(r => r.exercise !== '');
    const validation = validateSupersetNotAlone(filledRows);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    const payload = {
      sectorMode,
      goal: moveframeGoal,
      execSpeed,
      execSeries,
      execRipTime,
      execWeight,
      execBreak,
      execMode,
      ripTimeMode,
      rows: filledRows,
      preferences,
      endMacro,
    };
    const notes = upsertFastPlannerDataInNotes(userDescription, payload);
    const movelaps = buildMovelapsFromRows(filledRows);
    const description = buildFastPlannerDescription(filledRows);

    const moveframeData = {
      sport,
      sectionId,
      description,
      type: 'BATTERY',
      uploadToWorkout: true,
      notes,
      fastPlannerData: payload,
      movelaps,
      macroFinal: endMacro.trim() || null,
      isFastPlannerBased: true,
      goal: moveframeGoal
    };
    onSave(moveframeData);
  };

  const applyEndMacro = React.useCallback(
    (selectedMacro?: string) => {
      const trimmed = typeof selectedMacro === 'string' ? selectedMacro.trim() : '';
      const value = trimmed || FAST_PLANNER_DEFAULT_END_MACRO;
      const hasExercise = rows.some((r) => (r.exercise || '').trim() !== '');
      if (!hasExercise) {
        if (typeof window !== 'undefined') {
          window.alert('Add at least one exercise before applying Macro.');
        }
        return;
      }
      setEndMacro(value);
    },
    [rows]
  );

  React.useImperativeHandle(ref, () => ({
    saveMoveframe: handleSaveMoveframe,
    saveMoveframeAndMovelaps: handleSaveMoveframeAndMovelaps,
    openPreferences: () => setShowPreferencesModal(true),
    applyEndMacro,
    getEndMacro: () => endMacro,
  }));
  const openSeriesPlan = (sectorId: string) => {
    setPlanSectorId(sectorId);
    setPlanTargetTotalSeries('12');
    setPlanTargetLevel('lev34');
    setPlanTargetReps('15');
    setPlanTargetPause("2'");

    const sectorLabel = MUSCLE_GROUPS.find(g => g.id === sectorId)?.sector ?? null;
    const sectorRows = sectorLabel
      ? rows.filter(r => {
          const name = r.exercise?.trim();
          if (!name) return false;
          return getSectorForExercise(name) === sectorLabel;
        })
      : [];
    const lastRow = sectorRows.length ? sectorRows[sectorRows.length - 1] : null;
    const lastRepsToken = (lastRow?.ripTime || '').split(/\s*\/\s*/)[0]?.trim() ?? '';
    const seriesSum = sectorRows.reduce((s, r) => s + (parseInt(String(r.series), 10) || 0), 0);
    setPlanSeries(
      computeSuggestedPlanSeries('12', 'lev34', sectorRows.length, seriesSum),
    );
    setPlanReps(/^\d+$/.test(lastRepsToken) ? lastRepsToken : '15');
    setPlanPause(lastRow?.break?.trim() || "2'");
    setPlanPyramidal(parsePyramidalMode(lastRow?.pyramidal));

    setPlanExerciseDetailTab('execution');
    setPlanCandidate(null);
    setPlanExerciseSearch('');
    setShowSeriesPlanModal(true);
  };
  const planCandidates = React.useMemo(() => {
    if (!planSectorId) return [];
    return mockExercises.filter(ex => {
      if (!ex.id.startsWith(planSectorId)) return false;
      if (planExerciseSearch && !ex.name.toLowerCase().includes(planExerciseSearch.toLowerCase())) return false;
      return true;
    });
  }, [mockExercises, planExerciseSearch, planSectorId]);

  /** Exercise names already present in the current moveframe planner rows. */
  const planWorkoutSelectedExerciseNames = React.useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => {
      const name = r.exercise?.trim();
      if (name) names.add(name);
    });
    return names;
  }, [rows]);
  const pickPlanCandidateByOffset = React.useCallback((offset: number) => {
    if (planCandidates.length === 0) return;
    const currentIndex = planCandidate ? planCandidates.findIndex(c => c.id === planCandidate.id) : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + planCandidates.length) % planCandidates.length;
    setPlanCandidate(planCandidates[nextIndex]);
  }, [planCandidates, planCandidate]);
  const proceedScanExercise = () => {
    if (planCandidates.length === 0) return;
    if (planCandidates.length === 1) {
      setPlanCandidate(planCandidates[0]);
      return;
    }
    const currentId = planCandidate?.id;
    let pick = planCandidates[Math.floor(Math.random() * planCandidates.length)];
    if (currentId && planCandidates.length > 1) {
      while (pick.id === currentId) {
        pick = planCandidates[Math.floor(Math.random() * planCandidates.length)];
      }
    }
    setPlanCandidate(pick);
  };
  const addPlannedExercise = () => {
    if (!planCandidate) return;
    let targetIndex = rows.findIndex(r => !r.exercise || r.exercise.trim() === '');
    let newRows = [...rows];
    if (targetIndex === -1) {
      const newId = Math.max(...newRows.map(r => r.id)) + 1;
      newRows = [...newRows, { id: newId, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }];
      targetIndex = newRows.length - 1;
    }
    const targetId = newRows[targetIndex].id;
    newRows = newRows.map((r) =>
      r.id === targetId
        ? applyPyramidalToRow({
            ...r,
            exercise: planCandidate.name,
            series: planSeries,
            ripTime: planReps,
            break: planPause,
            speed: r.speed || 'Normal',
            weight: r.weight || 'nc',
            mode: r.mode || 'Stopped',
            pyramidal: planPyramidal,
          })
        : r,
    );
    setRows(newRows);
    setPlanCandidate(null);
  };
  const endSeriesPlan = () => {
    setShowSeriesPlanModal(false);
  };
  React.useEffect(() => {
    if (!planCandidate || !planListRef.current) return;
    const card = planListRef.current.querySelector(`[data-exercise-id="${planCandidate.id}"]`) as HTMLElement | null;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [planCandidate]);

  // Keyboard Left/Right to change exercise in series plan modal
  React.useEffect(() => {
    if (!showSeriesPlanModal || planCandidates.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        pickPlanCandidateByOffset(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        pickPlanCandidateByOffset(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSeriesPlanModal, planCandidates.length, pickPlanCandidateByOffset]);

  // Drag & reorder rows
  const [draggingRowId, setDraggingRowId] = useState<number | null>(null);
  const handleRowDragStart = (rowId: number, e: React.DragEvent) => {
    setDraggingRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleRowDrop = (targetIndex: number) => {
    if (draggingRowId == null) return;
    const fromIndex = rows.findIndex(r => r.id === draggingRowId);
    if (fromIndex < 0 || fromIndex === targetIndex) {
      setDraggingRowId(null);
      return;
    }
    const updated = [...rows];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setRows(updated);
    setDraggingRowId(null);
  };

  // Delete a specific row
  const handleDeleteRow = (rowId: number) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== rowId) : prev);
  };

  // Complete current row with defaults and move to next exercise
  const handleCompleteAndNext = (rowIndex: number) => {
    appendNextRowFromIndex(rowIndex);
  };

  // ALL button visible only when Sector or Exercise is selected (per requirement)
  const hasSelectedSector = selectedMuscleGroup !== 'all';
  const hasSelectedExercise = rows.some(r => typeof r.exercise === 'string' && r.exercise.trim() !== '');
  const showAllButton = hasSelectedSector || hasSelectedExercise;

  // Superset validation: each Superset must be grouped with at least one other Superset (prev or next row)
  const supersetValidation = useMemo(() => {
    const isSupersetAlone = (index: number): boolean => {
      if (rows[index]?.mode !== 'Superset') return false;
      const prev = index > 0 && rows[index - 1]?.mode === 'Superset';
      const next = index < rows.length - 1 && rows[index + 1]?.mode === 'Superset';
      return !prev && !next;
    };
    const invalid = rows.map((_, i) => isSupersetAlone(i));
    const canSave = !invalid.some(Boolean);
    return { invalid, canSave };
  }, [rows]);
  const canSaveWithSuperset = supersetValidation.canSave;

  const plannerTableColGroup = (
    <colgroup>
      <col className="w-12" />
      <col style={{ minWidth: '220px', width: '24%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '7rem' }} />
      <col style={{ width: '4.5rem' }} />
    </colgroup>
  );

  const plannerTableHead = (
    <thead className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
      <tr>
        <th className="sticky left-0 z-30 w-12 border-b border-r border-gray-300 bg-gray-100 px-2 py-1.5 text-left text-xs font-bold text-gray-700">#</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700" style={{ minWidth: '220px' }}>Exercise</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Speed</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Series</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Pyramidal</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Rip\Time</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Weight</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Break</th>
        <th className="border-b border-r border-gray-300 px-2 py-1.5 text-left text-xs font-bold text-gray-700">Mode</th>
        <th className="border-b border-gray-300 px-1 py-1.5 text-center text-xs font-bold text-gray-700">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!fullView && (
      <div className="flex max-h-[min(46vh,400px)] min-h-0 flex-shrink-0 flex-col overflow-y-auto overscroll-y-contain border-b border-gray-200">
      <div className="flex-shrink-0 z-20 bg-white pb-1 shadow-[0_1px_2px_0_rgba(0,0,0,0.06)]">
        <div className="space-y-1">
          {/* Compact Top Row: Execution | Sector | Name | Intensity | Goal */}
          <div className="flex min-w-0 w-full flex-wrap items-center justify-center gap-1.5 px-1">
            <div className="bg-amber-50 border border-amber-300 rounded px-2.5 py-1.5 text-center shrink-0">
              {selectedCell ? (
                <span className="text-xs text-blue-600 font-medium whitespace-nowrap">
                  Execution ✓ Row {rows.findIndex(r => r.id === selectedCell.rowId) + 1}, {selectedCell.field}
                </span>
              ) : (
                <span className="text-xs text-gray-700 font-bold">Execution</span>
              )}
            </div>
            <button
              onClick={() => {
                setActiveExerciseButton(null);
                setShowSubExercises(false);
                setSelectedMuscleGroup('all');
              }}
              className={`px-3 py-2 text-sm font-bold border-2 rounded-md whitespace-nowrap ${
                activeExerciseButton === null ? 'bg-yellow-50 text-black border-yellow-400' : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Sector
            </button>
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Name exercise"
              className="w-48 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs font-bold text-gray-600 mx-0.5 shrink-0">Intensity:</span>
            {(['speed', 'series', 'riptime', 'weight', 'break', 'mode'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActiveExerciseButton(activeExerciseButton === key ? null : key)}
                className={`px-3 py-2 text-sm font-semibold border-2 rounded-md whitespace-nowrap ${
                  activeExerciseButton === key ? 'bg-yellow-50 text-black border-yellow-400' : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
                }`}
              >
                {key === 'riptime' ? 'Rip\\Time' : key === 'break' ? 'Break' : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
            <div className="ml-0 flex min-w-0 max-w-full flex-[1_1_220px] flex-wrap items-center justify-center gap-1.5 sm:flex-nowrap">
              <label htmlFor="fast-planner-moveframe-goal" className="text-xs font-bold text-gray-800 whitespace-nowrap shrink-0">
                Goal of this moveframe
              </label>
              <select
                id="fast-planner-moveframe-goal"
                value={moveframeGoal}
                onChange={(e) => setMoveframeGoal(e.target.value as GoalId)}
                className="min-w-0 flex-1 rounded-md border-2 border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:min-w-[14rem] sm:max-w-md"
                aria-label="Goal of this moveframe"
              >
                {GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

        {/* Muscle Groups — compact; ~6 areas visible, scroll for more */}
        <div className="mt-1 rounded-lg border border-slate-700 bg-slate-900 p-1.5 min-w-0 max-w-full">
          <div className="flex items-center gap-3 pb-1">
            <label className="flex items-center cursor-pointer whitespace-nowrap text-white">
              <input
                type="radio"
                name="sectorMode"
                value="exercises"
                checked={sectorMode === 'exercises'}
                onChange={() => setSectorMode('exercises')}
                className="mr-1.5"
              />
              <span className="text-xs">Select exercises</span>
            </label>
            <label className="flex items-center cursor-pointer whitespace-nowrap text-white">
              <input
                type="radio"
                name="sectorMode"
                value="series"
                checked={sectorMode === 'series'}
                onChange={() => {
                  setSectorMode('series');
                  setActiveExerciseButton(null);
                  setShowSubExercises(false);
                  setSelectedMuscleGroup('all');
                }}
                className="mr-1.5"
              />
              <span className="text-xs">Plan series\exercise</span>
            </label>
          </div>
          <div className="flex min-w-0 w-full flex-nowrap items-center justify-center gap-1.5 overflow-x-auto pb-1">
            {showAllButton && (
              <div className="flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedMuscleGroup('all');
                    setShowSubExercises(true);
                  }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="mb-2 flex items-center justify-center" style={{ width: `${96 * SECTOR_ZOOM}px`, height: `${96 * SECTOR_ZOOM}px` }}>
                    <Image
                      src="/all.png"
                      alt="All"
                      width={Math.round(96 * SECTOR_ZOOM)}
                      height={Math.round(96 * SECTOR_ZOOM)}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <span className="sr-only">All</span>
                </button>
              </div>
            )}

            {/* Repetitions/Time radios - nearest to ALL button when Rip\Time is active */}
            {activeExerciseButton === 'riptime' && (
              <div className="flex-shrink-0 flex flex-col gap-2 justify-center pl-1 pr-2 py-2 bg-yellow-50 border border-yellow-200 rounded-lg border-l-0">
                <label className="flex items-center cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="ripTimeMode"
                    value="reps"
                    checked={ripTimeMode === 'reps'}
                    onChange={() => {
                      setRipTimeMode('reps');
                      setRipTimeValue('');
                    }}
                    className="w-6 h-6 mr-2"
                  />
                  <span className="text-sm text-black">Repetitions</span>
                </label>
                <label className="flex items-center cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="ripTimeMode"
                    value="time"
                    checked={ripTimeMode === 'time'}
                    onChange={() => {
                      setRipTimeMode('time');
                      setRipTimeValue('');
                    }}
                    className="w-6 h-6 mr-2"
                  />
                  <span className="text-sm text-black">Time</span>
                </label>
              </div>
            )}

            {/* Content area: parameters always centered */}
            <div className="flex min-h-[68px] max-h-[170px] min-w-0 flex-1 items-center justify-center overflow-y-auto overflow-x-auto rounded-lg border border-yellow-200 bg-yellow-50 p-1.5 text-black">
              {activeExerciseButton ? (
                <div className="flex w-full flex-col items-center justify-center space-y-2">
                {activeExerciseButton === 'speed' && (
                  <div className="flex w-full flex-col items-center">
                    <p className="text-xs font-bold text-black mb-1">Select Speed of Execution</p>
                    <div className="flex flex-wrap justify-center gap-1.5 overflow-x-auto pb-0.5">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleQuickFill('speed', speed)}
                          className="flex-shrink-0 px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium whitespace-nowrap"
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'series' && (
                  <div className="flex w-full flex-col items-center">
                    <p className="text-xs font-bold text-black mb-1">Select Number of Series</p>
                    <div className="flex flex-wrap justify-center gap-1.5 overflow-x-auto pb-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleQuickFill('series', num.toString())}
                          className="flex-shrink-0 px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'riptime' && (
                  <div className="min-h-[120px] flex items-center justify-center">
                    <div className="flex gap-4 justify-center items-center flex-wrap">
                      <div className="flex gap-4 items-center">
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="ripTimeMode"
                            value="reps"
                            checked={ripTimeMode === 'reps'}
                            onChange={() => {
                              setRipTimeMode('reps');
                              setRipTimeValue('');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Repetitions</span>
                        </label>
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="ripTimeMode"
                            value="time"
                            checked={ripTimeMode === 'time'}
                            onChange={() => {
                              setRipTimeMode('time');
                              setRipTimeValue('');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Time</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-center">
                        {ripTimeMode === 'reps' && (
                          <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const currentValue = parseInt(ripTimeValue) || 0;
                              if (currentValue > 1) {
                                const newValue = (currentValue - 1).toString();
                                setRipTimeValue(newValue);
                                applyExecutionValue('ripTime', newValue);
                              }
                            }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            value={ripTimeValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRipTimeValue(value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                            applyExecutionValue('ripTime', value);
                            }}
                            placeholder="0"
                            min="1"
                            max="99"
                            className="w-32 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <button
                            onClick={() => {
                              const currentValue = parseInt(ripTimeValue) || 0;
                              if (currentValue < 99) {
                                const newValue = (currentValue + 1).toString();
                                setRipTimeValue(newValue);
                                applyExecutionValue('ripTime', newValue);
                              }
                            }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                          >
                            +
                          </button>
                          </div>
                        )}

                        {ripTimeMode === 'time' && (
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              value={ripTimeValue}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setRipTimeValue(raw);
                              }}
                              onBlur={() => {
                                if (ripTimeValue && ripTimeValue.length > 0) {
                                  const formatted = formatRipTime(ripTimeValue, true);
                                  setRipTimeValue(formatted);
                                } else {
                                  setRipTimeValue('');
                                }

                                applyExecutionValue('ripTime', ripTimeValue ? formatRipTime(ripTimeValue, true) : '');
                              }}
                              placeholder="MM'SS&quot;"
                              className="w-48 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'weight' && (
                  <div className="min-h-[120px] flex items-center justify-center">
                    <div className="flex gap-10 justify-center items-center">
                      <div className="w-fit flex flex-col gap-2 items-start pl-2">
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="weightUnit"
                            value="kg"
                            checked={weightUnit === 'kg'}
                            onChange={() => setWeightUnit('kg')}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Kg</span>
                        </label>
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="weightUnit"
                            value="lbs"
                            checked={weightUnit === 'lbs'}
                            onChange={() => setWeightUnit('lbs')}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Lbs</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const currentValue = parseFloat(weightValue) || 0;
                          if (currentValue > 0) {
                            const newValue = Math.max(0, currentValue - 0.5).toString();
                            setWeightValue(newValue);
                            applyExecutionValue('weight', `${newValue} ${weightUnit}`);
                          }
                        }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        value={weightValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWeightValue(value);
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          applyExecutionValue('weight', `${value} ${weightUnit}`);
                        }}
                        placeholder="0"
                        min="0"
                        max="9999"
                        step="0.5"
                        className="w-40 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        onClick={() => {
                          const currentValue = parseFloat(weightValue) || 0;
                          if (currentValue < 9999) {
                            const newValue = Math.min(9999, currentValue + 0.5).toString();
                            setWeightValue(newValue);
                            applyExecutionValue('weight', `${newValue} ${weightUnit}`);
                          }
                        }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {activeExerciseButton === 'break' && (
                  <div className="min-h-[120px] flex items-center justify-center">
                    <div className="flex gap-10 justify-center items-center">
                      <div className="w-fit flex flex-col gap-2 items-start pl-2">
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="breakMode"
                            value="rest"
                            checked={breakMode === 'rest'}
                            onChange={() => {
                              setBreakMode('rest');
                              setActiveExerciseButton('break');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Rest time</span>
                        </label>
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="breakMode"
                            value="cardio"
                            checked={breakMode === 'cardio'}
                            onChange={() => {
                              setBreakMode('cardio');
                              setCardioValue('120');
                              setActiveExerciseButton('break');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Cardio</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-center">
                      {breakMode === 'rest' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-3 justify-center">
                            {BREAK_OPTIONS.slice(0, Math.ceil(BREAK_OPTIONS.length / 2)).map((breakTime) => (
                              <button
                                key={breakTime}
                                onClick={() => applyExecutionValue('break', breakTime)}
                                className="flex-shrink-0 px-5 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-sm whitespace-nowrap"
                              >
                                {breakTime}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-3 justify-center">
                            {BREAK_OPTIONS.slice(Math.ceil(BREAK_OPTIONS.length / 2)).map((breakTime) => (
                              <button
                                key={breakTime}
                                onClick={() => applyExecutionValue('break', breakTime)}
                                className="flex-shrink-0 px-5 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-sm whitespace-nowrap"
                              >
                                {breakTime}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {breakMode === 'cardio' && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const currentValue = parseInt(cardioValue) || 120;
                                if (currentValue > 60) {
                                  const newValue = Math.max(60, currentValue - 1).toString();
                                  setCardioValue(newValue);
                                  applyExecutionValue('break', `${newValue} bpm`);
                                }
                              }}
                              className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              value={cardioValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCardioValue(value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                const numValue = parseInt(value);
                                if (numValue >= 60 && numValue <= 200) {
                                  setCardioValue(value);
                                  applyExecutionValue('break', `${value} bpm`);
                                } else {
                                  setCardioValue('120');
                                }
                              }}
                              placeholder="120"
                              min="60"
                              max="200"
                              className="w-28 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <button
                              onClick={() => {
                                const currentValue = parseInt(cardioValue) || 120;
                                if (currentValue < 200) {
                                  const newValue = Math.min(200, currentValue + 1).toString();
                                  setCardioValue(newValue);
                                  applyExecutionValue('break', `${newValue} bpm`);
                                }
                              }}
                              className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-lg text-gray-300 font-medium">bpm (60-200)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {activeExerciseButton === 'mode' && (
                  <div>
                    <p className="text-sm font-bold text-black mb-3 text-center">Select Breaking Modality</p>
                    <div className="flex flex-row gap-3 items-center justify-center flex-wrap">
                      {MODE_OPTIONS.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => applyExecutionValue('mode', mode.label)}
                          className="w-56 px-5 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-bold text-base"
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!showSubExercises ? (
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const el = sectorListScrollRef.current;
                        if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
                      }}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-white shadow-md hover:bg-slate-600"
                      title="Scroll muscle groups left"
                      aria-label="Scroll muscle groups left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <div
                      ref={sectorListScrollRef}
                      className="min-w-0 w-full flex-1 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 [scrollbar-gutter:stable]"
                      title="All available width is used for sector cards; scroll only when needed."
                      onWheel={(e) => {
                        const el = e.currentTarget;
                        if (el.scrollWidth <= el.clientWidth) return;
                        e.preventDefault();
                        el.scrollLeft += e.deltaY;
                      }}
                    >
                      <div className="flex w-max min-w-full justify-start" style={{ gap: '6px' }}>
                        {MUSCLE_GROUPS.map((group) => {
                          const agg = muscleGroupAggregates[group.id];
                          const seriesTotal = agg?.series ?? 0;
                          const exerciseTotal = agg?.exercises ?? 0;
                          return (
                          <button
                            key={group.id}
                            type="button"
                            style={{ width: SECTOR_CARD_WIDTH_PX, minWidth: SECTOR_CARD_WIDTH_PX }}
                            onClick={() => {
                              setSelectedMuscleGroup(group.id);
                              if (sectorMode === 'series') {
                                setShowSubExercises(false);
                                openSeriesPlan(group.id);
                              } else {
                                setShowSubExercises(true);
                              }
                            }}
                            className={`flex flex-shrink-0 flex-col items-center justify-center rounded-lg border-2 px-1 py-1 transition-all ${selectedMuscleGroup === group.id
                              ? 'border-blue-600 bg-white text-black ring-2 ring-inset ring-blue-300/80'
                              : 'border-gray-300 bg-white text-black hover:border-blue-500 hover:shadow-md'
                              }`}
                          >
                            <div
                              className="relative mb-0.5 flex items-center justify-center"
                              style={{ width: `${88 * SECTOR_ZOOM}px`, height: `${88 * SECTOR_ZOOM}px` }}
                            >
                              <Image
                                src={group.image}
                                alt={group.label}
                                width={Math.round(88 * SECTOR_ZOOM)}
                                height={Math.round(88 * SECTOR_ZOOM)}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <span className="font-medium text-black leading-tight text-center" style={{ fontSize: `${Math.max(8, 11 * SECTOR_ZOOM)}px` }}>{group.label}</span>
                            {(seriesTotal > 0 || exerciseTotal > 0) ? (
                              <span className="mt-0.5 text-[9px] font-bold leading-tight text-teal-700 tabular-nums">
                                {seriesTotal} ser.{exerciseTotal > 0 ? ` · ${exerciseTotal} ex.` : ''}
                              </span>
                            ) : (
                              <span className="mt-0.5 text-[9px] text-gray-400">—</span>
                            )}
                          </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = sectorListScrollRef.current;
                        if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
                      }}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-white shadow-md hover:bg-slate-600"
                      title="Scroll muscle groups right"
                      aria-label="Scroll muscle groups right"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const el = exerciseListScrollRef.current;
                        if (el) el.scrollBy({ left: -280, behavior: 'smooth' });
                      }}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center shadow-md"
                      title="Scroll exercises left"
                      aria-label="Scroll exercises left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <div
                      ref={exerciseListScrollRef}
                      className="overflow-x-auto overflow-y-hidden flex-1 min-w-0 scroll-smooth"
                      style={{ scrollbarGutter: 'stable' }}
                      onWheel={(e) => {
                        if (e.shiftKey) {
                          e.preventDefault();
                          const el = exerciseListScrollRef.current;
                          if (el) el.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      <div className="flex gap-2 pb-2">
                        {mockExercises
                          .filter(exercise => {
                            if (selectedMuscleGroup !== 'all' && !exercise.id.startsWith(selectedMuscleGroup)) return false;
                            if (exerciseSearch && !exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())) return false;
                            return true;
                          })
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((exercise) => {
                            const indicatorColor = getExerciseIndicatorColor(exercise.name);
                            return (
                              <div
                                key={exercise.id}
                                className="flex-shrink-0 w-28 bg-white border-2 border-gray-300 rounded-lg p-1 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all relative"
                                onClick={() => {
                                  if (selectedCell) {
                                    setRows(prevRows =>
                                      prevRows.map(row => (row.id === selectedCell.rowId ? { ...row, exercise: exercise.name } : row))
                                    );
                                    setExerciseSearch('');
                                  }
                                }}
                              >
                                {indicatorColor && (
                                  <div className={`absolute top-1 left-1 w-3 h-3 rounded-full border-2 border-white ${indicatorColor === 'green' ? 'bg-green-500' : 'bg-blue-500'
                                    }`} />
                                )}
                                <div className="aspect-square bg-gray-100 rounded mb-1 relative overflow-hidden">
                                  <Image
                                    src={exercise.image}
                                    alt={exercise.name}
                                    fill
                                    className="object-contain"
                                    sizes="112px"
                                    unoptimized
                                  />
                                </div>
                                <p className="text-[10px] text-center text-black font-medium" title={exercise.name}>
                                  {exercise.name}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = exerciseListScrollRef.current;
                        if (el) el.scrollBy({ left: 280, behavior: 'smooth' });
                      }}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center shadow-md"
                      title="Scroll exercises right"
                      aria-label="Scroll exercises right"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* Exercise Table — action bar fixed; only rows scroll */}
      <div className={`relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white ${!fullView ? 'rounded-t-none border-t-0' : ''}`}>
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)]">
          <div className="flex w-full min-w-0 items-center gap-2 px-2 py-1.5">
            <div className={`flex shrink-0 flex-wrap items-center gap-1.5 ${fullView ? 'justify-center' : ''}`}>
              {fullView && (
                <div className="flex min-w-0 max-w-full shrink-0 items-center gap-1.5 border-r border-gray-200 pr-2 mr-1">
                  <label htmlFor="fast-planner-moveframe-goal-full" className="text-[10px] font-bold text-gray-700 whitespace-nowrap">
                    Goal
                  </label>
                  <select
                    id="fast-planner-moveframe-goal-full"
                    value={moveframeGoal}
                    onChange={(e) => setMoveframeGoal(e.target.value as GoalId)}
                    className="max-w-[min(20rem,70vw)] rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Goal of this moveframe"
                  >
                    {GOAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={handleGoNext} className="rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-900">Go next</button>
              <button onClick={handleDuplicate} title="Duplicate selected row (appended at the bottom). Or double-click the exercise cell to duplicate." className="rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-900">Duplicate</button>
              <button onClick={handleTriplicate} title="Add two copies of selected row (appended at the bottom)." className="rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-900">Triplicate</button>
              <button onClick={handleRemove} className="rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-900">Remove</button>
              <button onClick={handleResetRow} className="rounded-md bg-gray-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-900">Reset row</button>
              <button onClick={handleResetAll} className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700">Reset all</button>
            </div>
            {sectorSeriesSummaryChips.length > 0 && (
              <div
                className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth border-x border-gray-200/80 px-1.5"
                title="Sectors selected — totals per muscular area"
              >
                {sectorSeriesSummaryChips.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => selectSectorFromSummaryChip(chip.id)}
                    className={`inline-flex shrink-0 flex-col items-center rounded-md border px-2 py-0.5 text-center leading-tight ${
                      selectedMuscleGroup === chip.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-300'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                    style={{ minWidth: '5.5rem', maxWidth: '7rem' }}
                    title={`${chip.label}: ${chip.series} series, ${chip.exercises} exercises`}
                  >
                    <span className="truncate w-full text-[10px] font-semibold">{chip.label}</span>
                    <span className="text-[10px] font-bold tabular-nums text-teal-700">
                      {chip.series} ser.
                      {chip.exercises > 0 ? ` · ${chip.exercises} ex.` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={handleSaveMoveframe} disabled={!canSaveWithSuperset} className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50" title={!canSaveWithSuperset ? 'Fix Superset: each Superset exercise must be grouped with at least one other Superset' : undefined}>Save moveframe</button>
          </div>
        </div>
        <div
          ref={exerciseTableScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
          style={fullView ? { minHeight: 'min(52vh, 420px)' } : undefined}
        >
          <table className="w-full table-fixed border-collapse">
            {plannerTableColGroup}
            {plannerTableHead}
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  ref={(el) => registerRowRef(row.id, el)}
                  className={`group border-t hover:bg-gray-50 ${
                    selectedCell?.rowId === row.id ? 'bg-blue-50/40' : ''
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleRowDrop(index)}
                >
                  <td className="sticky left-0 z-[5] w-12 border-r border-gray-300 bg-white px-1 py-1 text-sm text-gray-600 shadow-[2px_0_6px_-4px_rgba(0,0,0,0.2)] group-hover:bg-gray-50">
                    <div className="flex items-center gap-1">
                      <button
                        draggable
                        onDragStart={(e) => handleRowDragStart(row.id, e)}
                        className="p-1 rounded hover:bg-gray-100"
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                      >
                        <div className="flex flex-col items-center gap-[2px]">
                          <span className="w-4 h-[2px] bg-gray-600 rounded"></span>
                          <span className="w-4 h-[2px] bg-gray-600 rounded"></span>
                          <span className="w-4 h-[2px] bg-gray-600 rounded"></span>
                        </div>
                      </button>
                      <span>{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-1 py-1 border-r">
                    <div
                      onClick={() => handleCellClick(row.id, 'exercise')}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        appendRowCopiesById(row.id, 1);
                      }}
                      title="Click to select. Double-click to duplicate this exercise (duplicate is appended at the bottom)."
                      className={`relative cursor-pointer border-2 rounded overflow-hidden ${selectedCell?.rowId === row.id && selectedCell?.field === 'exercise'
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                        : 'border-gray-200'
                        }`}
                    >
                      {row.exercise ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRescanExercise(row.id);
                          }}
                          className="absolute top-1 right-1 p-1 bg-white/90 border border-gray-300 rounded hover:border-blue-500 hover:shadow-sm"
                          aria-label="Rescan exercise"
                          title="Rescan exercise"
                        >
                          <Image src="/rescan.png" alt="Rescan" width={16} height={16} className="object-contain" unoptimized />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReloadBlankExercise(row.id);
                          }}
                          className="absolute top-1 right-1 p-1 bg-white/90 border border-gray-300 rounded hover:border-blue-500 hover:shadow-sm"
                          aria-label="Reload – choose from sector of previous exercise"
                          title="Reload – choose from sector of previous exercise"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                        </button>
                      )}
                      {row.exercise ? (
                        <div className="flex items-center gap-3 p-2">
                          <div className="rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ width: `${92 * ZOOM}px`, height: `${92 * ZOOM}px` }}>
                            {(() => {
                              const exercise = mockExercises.find(ex => ex.name === row.exercise);
                              return exercise?.image ? (
                                <Image
                                  src={exercise.image}
                                  alt={row.exercise}
                                  width={Math.round(92 * ZOOM)}
                                  height={Math.round(92 * ZOOM)}
                                  className="object-contain"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-sm text-gray-400">Ex</span>
                              );
                            })()}
                          </div>
                          <span className="text-gray-700 flex-1" style={{ fontSize: `${Math.max(10, 14 * ZOOM)}px` }}>{row.exercise}</span>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-gray-50 flex items-center justify-center">
                          <span className="text-xs text-gray-400">Click to select</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1 border-r">
                    <input
                      type="text"
                      value={row.speed}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, speed: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'speed')}
                      className={`w-full px-2 py-1 text-sm border rounded ${selectedCell?.rowId === row.id && selectedCell?.field === 'speed'
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                        : 'border-gray-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r bg-green-50">
                    <input
                      type="text"
                      value={row.series}
                      onChange={(e) =>
                        setRows((prevRows) =>
                          prevRows.map((r) =>
                            r.id === row.id
                              ? resizeRipTimeForSeriesCount({ ...r, series: e.target.value })
                              : r,
                          ),
                        )
                      }
                      onClick={() => handleCellClick(row.id, 'series')}
                      className={`w-full px-2 py-1 text-sm border rounded bg-green-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'series'
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                        : 'border-green-200'
                        }`}
                    />
                  </td>
                  <td className="px-0.5 py-1 border-r bg-emerald-50/90 align-middle">
                    <div className="flex min-h-[40px] items-center">
                      <select
                        value={row.pyramidal || 'flat'}
                        onChange={(e) =>
                          setRows((prevRows) =>
                            prevRows.map((r) =>
                              r.id === row.id
                                ? applyPyramidalToRow({ ...r, pyramidal: e.target.value })
                                : r
                            )
                          )
                        }
                        onClick={() => handleCellClick(row.id, 'pyramidal')}
                        className={`w-full min-w-0 max-w-full rounded border bg-white px-0.5 py-1 text-[11px] leading-tight ${
                          parsePyramidalMode(row.pyramidal) === 'flat' ? 'text-red-700 font-medium' : 'text-gray-900'
                        } ${selectedCell?.rowId === row.id && selectedCell?.field === 'pyramidal'
                          ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                          : 'border-emerald-200'
                          }`}
                        aria-label="Pyramidal load"
                      >
                        {PLAN_PYRAMIDAL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className={`px-1 py-1 border-r bg-green-50 ${
                    parsePyramidalMode(row.pyramidal) !== 'flat' && clampSeriesCount(row) > 0 ? 'align-top' : 'align-middle'
                  }`}>
                    {ripTimeMode === 'time' ? (
                      <input
                        type="text"
                        value={row.ripTime}
                        onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, ripTime: e.target.value } : r))}
                        onClick={() => handleCellClick(row.id, 'ripTime')}
                        className={`w-full px-2 py-1 text-sm border rounded bg-green-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'ripTime'
                          ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                          : 'border-green-200'
                          }`}
                      />
                    ) : parsePyramidalMode(row.pyramidal) !== 'flat' && clampSeriesCount(row) > 0 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex max-h-24 max-w-[13rem] flex-wrap gap-0.5 overflow-y-auto px-0.5 py-0.5">
                          {resolveFastPlannerRowSeriesReps(row).map((repVal, si) => (
                            <input
                              key={si}
                              type="text"
                              inputMode="numeric"
                              value={repVal}
                              onChange={(e) => updatePlannerSeriesRep(row.id, si, e.target.value)}
                              onClick={() => handleCellClick(row.id, 'ripTime')}
                              title={`Set ${si + 1} reps`}
                              aria-label={`Set ${si + 1} repetitions`}
                              className={`w-9 shrink-0 rounded border px-0.5 py-0.5 text-center text-[11px] ${selectedCell?.rowId === row.id && selectedCell?.field === 'ripTime'
                                ? 'border-blue-500 ring-1 ring-blue-300/70'
                                : 'border-green-300 bg-white'
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] leading-tight text-gray-600">Reps per set</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={row.ripTime}
                        onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, ripTime: e.target.value } : r))}
                        onClick={() => handleCellClick(row.id, 'ripTime')}
                        className={`w-full px-2 py-1 text-sm border rounded bg-green-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'ripTime'
                          ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                          : 'border-green-200'
                          }`}
                      />
                    )}
                  </td>
                  <td className="border-r bg-gray-100/90 px-1 py-1">
                    <input
                      type="text"
                      value={row.weight}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, weight: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'weight')}
                      className={`w-full px-2 py-1 text-sm border rounded ${selectedCell?.rowId === row.id && selectedCell?.field === 'weight'
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                        : 'border-gray-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r bg-yellow-50">
                    <input
                      type="text"
                      value={row.break}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, break: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'break')}
                      className={`w-full px-2 py-1 text-sm border rounded bg-yellow-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'break'
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                        : 'border-yellow-200'
                        }`}
                    />
                  </td>
                  <td className="min-w-0 max-w-[7rem] border-r border-gray-300 bg-yellow-50 px-0.5 py-1">
                    <div
                      onClick={() => handleCellClick(row.id, 'mode')}
                      className={`flex min-h-[40px] min-w-0 max-w-full cursor-pointer items-center justify-center rounded border-2 bg-yellow-50 p-1 ${selectedCell?.rowId === row.id && selectedCell?.field === 'mode'
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-300/70'
                        : 'border-yellow-200'
                        }`}
                    >
                      {row.mode ? (
                        <div className="flex min-w-0 max-w-full items-center gap-1">
                          {(() => {
                            const modeOption = MODE_OPTIONS.find(m => m.label === row.mode);
                            const isSuperset = row.mode === 'Superset';
                            const isAlone = isSuperset && supersetValidation.invalid[rows.findIndex(r => r.id === row.id)];
                            return (
                              <>
                                {modeOption ? (
                                  <>
                                    <Image src={modeOption.icon} alt={row.mode} width={20} height={20} className="h-5 w-5 flex-shrink-0 object-contain" unoptimized />
                                    <span className="truncate text-[11px] font-medium leading-tight">{row.mode}</span>
                                  </>
                                ) : (
                                  <span className="truncate text-[11px] text-gray-700">{row.mode}</span>
                                )}
                                {isSuperset && (
                                  <span className={`flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold leading-none ${isAlone ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                                    {isAlone ? 'no' : 'ok'}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="px-1 text-center text-[10px] text-gray-400">Tap</span>
                      )}
                    </div>
                  </td>
                  <td className="w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem] px-0.5 py-1 text-center align-middle">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="w-8 h-8 bg-white border-2 border-gray-300 rounded hover:border-red-500"
                        title="Delete row"
                        aria-label="Delete row"
                      >
                        <Image src="/delete.png" alt="Delete" width={24} height={24} className="object-contain" unoptimized />
                      </button>
                      <button
                        onClick={() => handleCompleteAndNext(index)}
                        className="w-8 h-8 border-2 border-gray-300 rounded hover:border-orange-500"
                        title="Complete and go to next"
                        aria-label="Complete and go to next"
                      >
                        <Image src="/down.png" alt="Next" width={24} height={24} className="object-contain" unoptimized />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="min-h-3 shrink-0" aria-hidden="true" />
        </div>
        <div className="flex-shrink-0 space-y-1 border-t border-gray-200 bg-white px-2 pb-2 pt-1.5">
          <p className="overflow-x-auto whitespace-nowrap rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] leading-tight text-gray-800 tabular-nums">
            <span className="font-semibold text-gray-900">Summary:</span>
            {' '}
            Sectors <strong>{moveframeSummaryStats.sectorCount}</strong>
            {' · '}
            Total series <strong>{moveframeSummaryStats.totalSeries}</strong>
            {' · '}
            Avg series/sector <strong>{moveframeSummaryStats.avgSeriesPerSector}</strong>
            {' · '}
            Total exercises <strong>{moveframeSummaryStats.totalExercises}</strong>
          </p>
          <div
            className={`rounded-lg bg-green-50 p-1.5 ${
              fullView ? 'border-2 border-green-600' : 'border border-green-300'
            }`}
          >
            <textarea
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={2}
              placeholder="Add descriptions or instructions here..."
              aria-label="Descriptions and instructions"
            />
          </div>
        </div>
      </div>

      {/* Exercise Selection Popup */}
      {showExercisePopup && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[80vh] flex flex-col">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select Exercise</h3>
                <p className="text-sm text-gray-600">
                  {selectedMuscleGroup === 'all'
                    ? 'Showing all exercises'
                    : `Showing ${MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.label || 'All'} exercises`}
                </p>
              </div>
              <button
                onClick={() => setShowExercisePopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Field */}
            <div className="p-4 border-b">
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-4">
                {mockExercises
                  .filter(exercise => {
                    if (selectedMuscleGroup !== 'all' && !exercise.id.startsWith(selectedMuscleGroup)) return false;
                    if (exerciseSearch && !exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((exercise) => {
                    const indicatorColor = getExerciseIndicatorColor(exercise.name);
                    return (
                      <div
                        key={exercise.id}
                        className="bg-white border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all relative"
                        onClick={() => {
                          if (selectedCell) {
                            setRows(prevRows =>
                              prevRows.map(row => (row.id === selectedCell.rowId ? { ...row, exercise: exercise.name } : row))
                            );
                            setShowExercisePopup(false);
                            setExerciseSearch('');
                          }
                        }}
                      >
                        {/* Color indicator circle */}
                        {indicatorColor && (
                          <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white ${indicatorColor === 'green' ? 'bg-green-500' : 'bg-blue-500'
                            }`} />
                        )}

                        <div className="aspect-square bg-gray-100 rounded mb-3 relative overflow-hidden">
                          <Image
                            src={exercise.image}
                            alt={exercise.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 33vw, 33vw"
                            unoptimized
                          />
                        </div>
                        <p className="text-sm text-center text-gray-700 font-medium" title={exercise.name}>
                          {exercise.name}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowExercisePopup(false);
                  setExerciseSearch('');
                }}
                className="px-6 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showSeriesPlanModal && planSectorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div
            className="my-auto flex max-h-[min(100dvh-2rem,920px)] w-[90%] max-w-2xl flex-col overflow-hidden rounded-lg border-2 border-amber-200 bg-amber-50 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="series-plan-modal-title"
          >
            <div className="flex-shrink-0 border-b border-amber-200/60 px-4 pb-3 pt-4 sm:px-5">
              <div id="series-plan-modal-title" className="text-lg font-bold text-gray-900">
                Plan series / exercise
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5">
            {/* Sector: name and picture - prominent white area */}
            <div className="mb-4 p-4 rounded-lg bg-white border-2 border-amber-200 shadow-sm">
              <div className="flex items-center gap-4">
                {(() => {
                  const sector = MUSCLE_GROUPS.find(g => g.id === planSectorId);
                  return sector ? (
                    <>
                      <div className="w-24 h-24 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Image src={sector.image} alt={sector.label} width={88} height={88} className="object-contain" unoptimized />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-0.5">Sector</div>
                        <div className="text-2xl font-bold text-gray-900">{sector.label}</div>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
            {/* Planning support — user targets (reference) vs planned progress */}
            <div className="mb-4 rounded-lg border-2 border-sky-300 bg-sky-50 shadow-sm overflow-hidden">
              <div className="bg-sky-600 px-3 py-2 text-sm font-bold text-white">Planning support — plan total series of area</div>
              <div className="p-3">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-sky-200 bg-white px-3 py-2 text-xs text-sky-900">
                  <span className="font-semibold text-sky-900">Training level</span>
                  {PLAN_TARGET_LEVEL_OPTIONS.map(opt => (
                    <label key={opt.id} className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="planTargetLevel"
                        checked={planTargetLevel === opt.id}
                        onChange={() => setPlanTargetLevel(opt.id)}
                        className="text-sky-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <details className="mb-3 rounded border border-sky-200 bg-white px-2 py-1.5 text-xs text-sky-900">
                  <summary className="cursor-pointer font-semibold text-sky-800">Reference table</summary>
                  <table className="mt-2 w-full border-collapse text-center text-[11px]">
                    <thead>
                      <tr className="bg-sky-50">
                        <th className="border border-sky-200 px-1 py-0.5">Total series</th>
                        <th className="border border-sky-200 px-1 py-0.5">Lev 1–2</th>
                        <th className="border border-sky-200 px-1 py-0.5">Lev 3–4</th>
                        <th className="border border-sky-200 px-1 py-0.5">Lev 5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SERIES_PLANNING_TABLE_KEYS.map(series => {
                        const row = SERIES_TO_EXE_BY_LEVEL[series];
                        return (
                          <tr key={series}>
                            <td className="border border-sky-200 px-1 py-0.5">{series}</td>
                            <td className="border border-sky-200 px-1 py-0.5">{row[0]}</td>
                            <td className="border border-sky-200 px-1 py-0.5">{row[1]}</td>
                            <td className="border border-sky-200 px-1 py-0.5">{row[2]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-1 text-[10px] text-sky-700/90">
                    If your target is not a listed row (e.g. 8 or 11), the app uses the nearest row <strong>at or below</strong> it (8→7, 11→10). Targets <strong>21–30</strong> extend the row for 20 by adding one series at a time across exercises (same rules as Plan Gym Week). Table:{' '}
                    <code className="rounded bg-sky-100 px-0.5">getSeriesDistribution</code>.
                  </p>
                </details>
                <table className="w-full border-collapse text-sm bg-white rounded border border-sky-200">
                  <thead>
                    <tr className="bg-sky-100">
                      <th className="border border-sky-200 px-2 py-1 text-left text-xs font-semibold text-sky-900" />
                      <th className="border border-sky-200 px-2 py-1 text-center text-xs font-semibold text-sky-900">Series</th>
                      <th className="border border-sky-200 px-2 py-1 text-center text-xs font-semibold text-sky-900">Exe</th>
                      <th className="border border-sky-200 px-2 py-1 text-center text-xs font-semibold text-sky-900">Reps</th>
                      <th className="border border-sky-200 px-2 py-1 text-center text-xs font-semibold text-sky-900">Pause</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-sky-200 px-2 py-1.5 text-xs font-semibold text-sky-800 whitespace-nowrap">Target</td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center">
                        <select
                          value={planTargetTotalSeries}
                          onChange={(e) => setPlanTargetTotalSeries(e.target.value)}
                          className="max-w-full rounded border border-sky-300 bg-white px-1 py-1 text-sm"
                          aria-label="Target total series for this muscle area"
                        >
                          {PLAN_TARGET_TOTAL_SERIES_OPTIONS.map(n => (
                            <option key={n} value={String(n)}>{n}</option>
                          ))}
                        </select>
                      </td>
                      <td
                        className="border border-sky-200 bg-sky-50/80 px-2 py-1.5 text-center text-base font-bold text-sky-950"
                        title={`Suggested exercises for ${planTargetTotalSeries} total series, ${PLAN_TARGET_LEVEL_OPTIONS.find(o => o.id === planTargetLevel)?.label ?? planTargetLevel} (from distribution table, not editable)`}
                      >
                        <span role="status">{planTargetExeCount}</span>
                      </td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center">
                        <select
                          value={planTargetReps}
                          onChange={(e) => {
                            setPlanTargetReps(e.target.value);
                            setPlanReps(e.target.value);
                          }}
                          className="max-w-full rounded border border-sky-300 bg-white px-1 py-1 text-sm"
                          aria-label="Target average reps (reference)"
                        >
                          {Array.from({ length: 99 }, (_, i) => i + 1).map(n => (
                            <option key={n} value={String(n)}>{n}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center">
                        <select
                          value={planTargetPause}
                          onChange={(e) => {
                            setPlanTargetPause(e.target.value);
                            setPlanPause(e.target.value);
                          }}
                          className="max-w-full rounded border border-sky-300 bg-white px-1 py-1 text-sm"
                          aria-label="Target average pause (reference)"
                        >
                          {BREAK_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-sky-200 px-2 py-1.5 text-xs font-semibold text-sky-800 whitespace-nowrap">Planned</td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center font-bold text-orange-600">{planSectorPlanningStats.seriesSum}</td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center font-semibold">{planSectorPlanningStats.exerciseCount}</td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center text-xs">
                        {planSectorPlanningStats.avgReps != null ? `Average ${planSectorPlanningStats.avgReps}` : '—'}
                      </td>
                      <td className="border border-sky-200 px-2 py-1.5 text-center text-xs">
                        {planSectorPlanningStats.avgPauseSec != null
                          ? formatAvgPauseFromSeconds(planSectorPlanningStats.avgPauseSec)
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Current moveframe — previous slot summary + next exercise load */}
            <div className="mb-4 rounded-lg border-2 border-violet-300 bg-violet-50 shadow-sm">
              <div className="rounded-t-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">Current moveframe load values</div>
              <div className="overflow-x-auto p-3">
                <table className="w-full border-collapse text-sm bg-white rounded border border-violet-200">
                  <thead>
                    <tr>
                      <th className="border border-violet-200 bg-violet-100 px-2 py-1.5 text-center text-xs font-semibold text-violet-900">#</th>
                      <th className="border border-violet-200 bg-violet-100 px-2 py-1.5 text-center text-xs font-semibold text-violet-900" colSpan={3}>WORK</th>
                      <th className="border border-violet-200 bg-violet-100 px-2 py-1.5 text-center text-xs font-semibold text-violet-900">PAUSE</th>
                    </tr>
                    <tr className="bg-violet-50">
                      <th className="border border-violet-200 px-2 py-1 text-center text-[10px] font-normal text-violet-800">Added / next</th>
                      <th className="border border-violet-200 px-2 py-1 text-center text-xs">Series</th>
                      <th className="border border-violet-200 px-2 py-1 text-center text-xs">Reps</th>
                      <th className="border border-violet-200 px-2 py-1 text-center text-xs">Pyramidal</th>
                      <th className="border border-violet-200 px-2 py-1 text-center text-xs">Pause</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className="border border-violet-200 px-2 py-1.5 text-center text-xs font-semibold text-violet-900"
                        title="Moveframe rows in this plan for this sector (any position in the table)"
                      >
                        {planSectorPlanningStats.exerciseCount}
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center text-sm text-gray-700">
                        {planSectorPlanningStats.lastRow?.series || '—'}
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center text-sm text-gray-700">
                        {planSectorPlanningStats.lastRow?.ripTime || '—'}
                      </td>
                      <td
                        className={`border border-violet-200 px-2 py-1.5 text-center text-sm ${
                          parsePyramidalMode(planSectorPlanningStats.lastRow?.pyramidal) === 'flat'
                            ? 'font-medium text-red-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {planPyramidalLabel(planSectorPlanningStats.lastRow?.pyramidal)}
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center text-sm text-gray-700">
                        {planSectorPlanningStats.lastRow?.break || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td
                        className="border border-violet-200 px-2 py-1.5 text-center font-semibold text-violet-900"
                        title="Index of the next exercise line for this sector"
                      >
                        {planSectorPlanningStats.exerciseCount + 1}
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center">
                        <select
                          value={planSeries}
                          onChange={(e) => setPlanSeries(e.target.value)}
                          className="rounded border border-violet-300 bg-white px-2 py-1 text-sm"
                          title={
                            suggestedPlanSeries != null
                              ? `Table suggests ${suggestedPlanSeries} series for exercise ${planSectorPlanningStats.exerciseCount + 1} (${planTargetTotalSeries} target − ${planSectorPlanningStats.seriesSum} planned)`
                              : undefined
                          }
                        >
                          {planSeriesDropdownOptions.map(n => (
                            <option key={n} value={n.toString()}>{n}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center">
                        <select
                          value={planReps}
                          onChange={(e) => setPlanReps(e.target.value)}
                          className="mx-auto block min-w-[3.5rem] rounded border border-violet-300 bg-white px-2 py-1 text-sm"
                          aria-label="Repetitions 1–99"
                        >
                          {Array.from({ length: 99 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={String(n)}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center">
                        <select
                          value={planPyramidal}
                          onChange={(e) => setPlanPyramidal(e.target.value)}
                          className={`max-w-[11rem] rounded border border-violet-300 bg-white px-2 py-1 text-sm ${
                            planPyramidal === 'flat' ? 'text-red-700 font-medium' : 'text-gray-900'
                          }`}
                          aria-label="Pyramidal load"
                        >
                          {PLAN_PYRAMIDAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-violet-200 px-2 py-1.5 text-center">
                        <select
                          value={planPause}
                          onChange={(e) => setPlanPause(e.target.value)}
                          className="rounded border border-violet-300 bg-white px-2 py-1 text-sm"
                        >
                          {BREAK_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={proceedScanExercise}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-base font-bold text-white shadow-md hover:bg-red-700"
              >
                Proceed scan exercises
              </button>
            </div>
            <div className="mb-2">
              <label htmlFor="plan-exercise-search" className="mb-1 block text-sm font-semibold text-gray-800">
                Search exercise
              </label>
              <input
                id="plan-exercise-search"
                type="text"
                value={planExerciseSearch}
                onChange={(e) => setPlanExerciseSearch(e.target.value)}
                placeholder="Name exercise"
                className="w-full rounded-lg border-2 border-amber-300 bg-white px-4 py-2.5 text-base placeholder-gray-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400"
                aria-label="Search exercises by name"
              />
            </div>
            <div className="mb-0 flex overflow-hidden rounded-t-lg bg-slate-800 shadow-sm" role="tablist" aria-label="Exercise detail">
              {(
                [
                  { id: 'execution' as const, label: 'Execution' },
                  { id: 'points' as const, label: 'Start-end points' },
                  { id: 'video' as const, label: 'Video' },
                  { id: 'other' as const, label: 'Other info' }
                ]
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={planExerciseDetailTab === tab.id}
                  onClick={() => setPlanExerciseDetailTab(tab.id)}
                  className={`min-w-0 flex-1 px-1.5 py-2.5 text-center text-[11px] font-semibold text-white sm:px-2 sm:text-sm ${
                    planExerciseDetailTab === tab.id
                      ? 'bg-slate-900 ring-2 ring-inset ring-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className={`mb-4 rounded-b-lg border border-t-0 border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 ${
                planExerciseDetailTab === 'points'
                  ? 'min-h-[11rem]'
                  : planExerciseDetailTab === 'video'
                    ? 'min-h-[11rem]'
                    : 'min-h-[6.5rem]'
              }`}
              role="tabpanel"
            >
              {planExerciseDetailTab === 'execution' && (
                <div className="min-h-[5.5rem] py-2" aria-label="Execution">
                  {planCandidate ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">How to perform</p>
                      <p className="text-sm leading-relaxed text-gray-800">
                        <span className="font-medium text-gray-900">{planCandidate.name}</span>
                        {' — '}
                        Full step-by-step instructions will appear here when this exercise is linked to your database (setup,
                        range of motion, tempo, breathing).
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
                        <li>Keep stable posture and a controlled lowering phase.</li>
                        <li>Align effort with the planned reps and pauses above.</li>
                      </ul>
                    </div>
                  ) : (
                    <p className="py-3 text-center text-sm text-gray-500">Select an exercise below to see execution notes.</p>
                  )}
                </div>
              )}
              {planExerciseDetailTab === 'points' &&
                (planCandidate ? (
                  <div className="flex flex-wrap items-start justify-center gap-6 py-2">
                    {(
                      [
                        { key: 'a', title: 'Picture A', altSuffix: 'picture A' },
                        { key: 'b', title: 'Picture B', altSuffix: 'picture B' }
                      ] as const
                    ).map(({ key, title, altSuffix }) => (
                      <div key={key} className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</span>
                        <div className="flex h-44 w-44 items-center justify-center rounded-lg border-2 border-amber-200 bg-amber-50/50">
                          <Image
                            src={planCandidate.image}
                            alt={`${planCandidate.name} — ${altSuffix}`}
                            width={168}
                            height={168}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">Select an exercise below to see picture A and picture B.</p>
                ))}
              {planExerciseDetailTab === 'video' && (
                <div className="flex min-h-[9rem] flex-col items-center justify-center gap-3 py-3" aria-label="Video">
                  {planCandidate ? (
                    <>
                      <div className="relative flex h-36 w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-md"
                          aria-hidden
                        >
                          <svg className="ml-1 h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                      <p className="max-w-md text-center text-xs text-gray-500">
                        Placeholder player for <span className="font-medium text-gray-700">{planCandidate.name}</span>. Attach a
                        video URL in your exercise library to enable playback here.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Select an exercise to preview its video.</p>
                  )}
                </div>
              )}
              {planExerciseDetailTab === 'other' && (
                <div className="min-h-[5.5rem] space-y-2 py-2" aria-label="Other info">
                  {planCandidate ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</p>
                      <dl className="grid grid-cols-1 gap-2 text-xs text-gray-700 sm:grid-cols-2">
                        <div>
                          <dt className="font-medium text-gray-900">Muscular sector</dt>
                          <dd className="mt-0.5">{planCandidate.sector ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-900">Safety / cues</dt>
                          <dd className="mt-0.5">Neutral alignment, full comfortable range, stop if sharp pain.</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-gray-900">Equipment & substitutions</dt>
                          <dd className="mt-0.5">Will be filled from your exercise library when available.</dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <p className="py-3 text-center text-sm text-gray-500">Select an exercise for tips and reference info.</p>
                  )}
                </div>
              )}
            </div>
            {/* Exercise area — capped height so modal fits viewport */}
            <div className="relative mb-4 flex h-48 min-h-[11rem] max-h-[32vh] items-center justify-center rounded-lg border-2 border-amber-200 bg-amber-100/60 pt-3 sm:h-64 sm:max-h-[38vh] md:h-72 md:max-h-none">
              <button
                onClick={() => pickPlanCandidateByOffset(-1)}
                className="absolute left-2 z-10 w-12 h-12 flex items-center justify-center rounded-lg bg-orange-400 hover:bg-orange-500 text-white shadow-md transition-colors"
                aria-label="Previous exercise (or press Left arrow)"
                title="Previous exercise (← Left arrow)"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <div ref={planListRef} className="flex gap-4 px-16 pt-1 overflow-x-auto overflow-y-visible w-full h-full items-center scroll-smooth" style={{ scrollbarGutter: 'stable' }}>
                {planCandidates.length > 0 ? (
                  planCandidates.map((candidate) => {
                    const alreadyInWorkout = planWorkoutSelectedExerciseNames.has(candidate.name);
                    return (
                    <button
                      key={candidate.id}
                      data-exercise-id={candidate.id}
                      onClick={() => {
                        setPlanCandidate(candidate);
                        setSectorMode('exercises');
                      }}
                      className={`relative flex-shrink-0 w-40 h-40 border-2 rounded-lg bg-white flex items-center justify-center transition-colors ${
                        planCandidate?.id === candidate.id ? 'border-orange-500 ring-2 ring-orange-300' : 'border-amber-200 hover:border-amber-400'
                      }`}
                      aria-label={`${candidate.name}${alreadyInWorkout ? ' (already in workout)' : ' (not yet in workout)'}`}
                    >
                      <span
                        className={`absolute top-0 right-0 z-10 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                          alreadyInWorkout ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={alreadyInWorkout ? 'Already in current workout' : 'Not yet in current workout'}
                        aria-hidden
                      />
                      <Image src={candidate.image} alt={candidate.name} width={152} height={152} className="object-contain" unoptimized />
                    </button>
                    );
                  })
                ) : (
                  <span className="text-base text-amber-800">No exercise selected</span>
                )}
              </div>
              <button
                onClick={() => pickPlanCandidateByOffset(1)}
                className="absolute right-2 z-10 w-12 h-12 flex items-center justify-center rounded-lg bg-orange-400 hover:bg-orange-500 text-white shadow-md transition-colors"
                aria-label="Next exercise (or press Right arrow)"
                title="Next exercise (→ Right arrow)"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
            </div>
            {(() => {
              const targetSeries = Number(planTargetTotalSeries);
              const plannedSeries = planSectorPlanningStats.seriesSum;
              const seriesPlanMatchesTarget =
                Number.isFinite(targetSeries) &&
                targetSeries > 0 &&
                plannedSeries === targetSeries;
              return seriesPlanMatchesTarget ? (
                <div
                  className="mb-3 rounded-lg border border-amber-300 bg-amber-100 px-4 py-2.5 text-center shadow-sm sm:px-5"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-sm font-semibold text-amber-950">
                    Series of this muscular area has been set correctly
                  </p>
                </div>
              ) : null;
            })()}
            <div className="mb-1 rounded-lg border-2 border-amber-200 bg-amber-100/60 px-4 py-3 text-center sm:px-5 sm:py-4">
              <div className="mb-1 text-sm font-semibold text-amber-800">Name exercise</div>
              <div className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">{planCandidate?.name || 'No exercise selected'}</div>
            </div>
            </div>
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-amber-200/60 bg-amber-50 px-4 py-3 sm:px-5">
              <button type="button" onClick={addPlannedExercise} className="rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 sm:px-6">Add exercise</button>
              <button type="button" onClick={endSeriesPlan} className="rounded-lg bg-black px-4 py-2.5 font-semibold text-white hover:bg-gray-800 sm:px-6">End the plan</button>
            </div>
          </div>
        </div>
      )}
      <CircuitPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSave={(prefs) => setPreferences(prefs)}
      />
    </div>
  );
});

export default FastPlannerOfMoveframes;
