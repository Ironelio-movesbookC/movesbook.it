import type { GoalId, TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';
import { interpolatePeriodIntRounded } from '@/utils/planPeriodInterpolation';
import {
  fillAnchoredLevelPair,
  roundPauseSeconds,
} from '@/utils/trainingLevelInterpolation';

/** Per-level (Beginner…Professional) first/last period endpoints — same shape as volume serie. */
export type GoalParamsFromSettings = {
  volumeFrom: number[];
  volumeTo: number[];
  repsFrom: number[];
  repsTo: number[];
  displayInPercent?: boolean;
  pctFrom?: number[];
  pctTo?: number[];
  pauseSeriesFrom: number[];
  pauseSeriesTo: number[];
  pauseExercisesFrom: number[];
  pauseExercisesTo: number[];
  pauseAreasFrom: number[];
  pauseAreasTo: number[];
};

/** Legacy persisted shapes (scalar + optional Professional fields). */
type StoredGoalLoadParams = Partial<GoalParamsFromSettings> & {
  repsFrom?: number | number[];
  repsTo?: number | number[];
  pctFrom?: number | number[];
  pctTo?: number | number[];
  pauseSeriesFrom?: number | number[];
  pauseSeriesTo?: number | number[];
  pauseExercisesFrom?: number | number[];
  pauseExercisesTo?: number | number[];
  pauseAreasFrom?: number | number[];
  pauseAreasTo?: number | number[];
  repsFromProfessional?: number;
  repsToProfessional?: number;
  pauseSeriesFromProfessional?: number;
  pauseSeriesToProfessional?: number;
  pauseExercisesFromProfessional?: number;
  pauseExercisesToProfessional?: number;
  pauseAreasFromProfessional?: number;
  pauseAreasToProfessional?: number;
};

type VolumeDeltasByLevel = Record<string, Record<number, number>>;

const TRAINING_LEVEL_LABELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Elite',
  'Professional',
] as const;

const LEVEL_SLOT_COUNT = 6;

/** Default session-volume % deltas (Tab 1 — Changes volumes series). Saved values override these. */
export function buildDefaultVolumeDeltas(): VolumeDeltasByLevel {
  const out: VolumeDeltasByLevel = {};
  for (const level of TRAINING_LEVEL_LABELS) {
    out[level] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  }
  /** Professional + 2 gym days/week → +50% total series volume (Tab 1 defaults). */
  out.Professional = { 1: 50, 2: 50, 3: 20, 4: 15, 5: 0, 6: 0 };
  return out;
}

function mergedVolumeDeltas(): VolumeDeltasByLevel {
  const defaults = buildDefaultVolumeDeltas();
  const saved = loadLS<VolumeDeltasByLevel>(SK_DELTAS, {});
  const out: VolumeDeltasByLevel = { ...defaults };
  for (const level of Object.keys(saved)) {
    out[level] = { ...(defaults[level] ?? {}), ...saved[level] };
  }
  return out;
}

const SK_GOALS = 'wp_goalParams';
const SK_DELTAS = 'wp_volumeDeltas';

const GOAL_ID_TO_SETTINGS_KEY: Partial<Record<GoalId, string>> = {
  max_strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Endurance',
  explosive_power: 'Power',
  fat_loss: 'Fat Loss',
  mobility_flexibility: 'General Fitness',
  injury_prevention: 'General Fitness',
};

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
}

function buildDefaultGoalParams(): GoalParamsFromSettings {
  /** Anchor values at Beginner (0) and Professional (4); middle levels filled on normalize. */
  const repsPair = fillAnchoredLevelPair([12, 0, 0, 0, 15, 15], [20, 0, 0, 0, 30, 30]);
  const pauseSeriesPair = fillAnchoredLevelPair(
    [60, 0, 0, 0, 30, 30],
    [30, 0, 0, 0, 15, 15],
    roundPauseSeconds,
  );
  const pauseExercisesPair = fillAnchoredLevelPair(
    [120, 0, 0, 0, 60, 60],
    [180, 0, 0, 0, 120, 120],
    roundPauseSeconds,
  );
  const pauseAreasPair = fillAnchoredLevelPair(
    [180, 0, 0, 0, 60, 60],
    [240, 0, 0, 0, 120, 120],
    roundPauseSeconds,
  );
  return {
    volumeFrom: [10, 4, 5, 6, 10, 10],
    volumeTo: [50, 5, 6, 8, 50, 50],
    repsFrom: repsPair.from,
    repsTo: repsPair.to,
    displayInPercent: false,
    pctFrom: repsPair.from.map((r) => 100 - r * 2.5),
    pctTo: repsPair.to.map((r) => 100 - r * 2.5),
    pauseSeriesFrom: pauseSeriesPair.from,
    pauseSeriesTo: pauseSeriesPair.to,
    pauseExercisesFrom: pauseExercisesPair.from,
    pauseExercisesTo: pauseExercisesPair.to,
    pauseAreasFrom: pauseAreasPair.from,
    pauseAreasTo: pauseAreasPair.to,
  };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Normalize a per-level from/to pair (6 slots; index 5 mirrors Professional). */
function normalizeLevelPairArrays(
  rawFrom: unknown,
  rawTo: unknown,
  legacyFrom: unknown,
  legacyTo: unknown,
  legacyProfFrom: unknown,
  legacyProfTo: unknown,
  defaultFrom: number[],
  defaultTo: number[],
): { from: number[]; to: number[] } {
  if (Array.isArray(rawFrom) && Array.isArray(rawTo)) {
    const from = Array.from({ length: LEVEL_SLOT_COUNT }, (_, i) =>
      num(rawFrom[i], defaultFrom[i] ?? defaultFrom[0])
    );
    const to = Array.from({ length: LEVEL_SLOT_COUNT }, (_, i) =>
      num(rawTo[i], defaultTo[i] ?? defaultTo[0])
    );
    from[5] = num(rawFrom[5] ?? rawFrom[4], from[4]);
    to[5] = num(rawTo[5] ?? rawTo[4], to[4]);
    return { from, to };
  }

  const singleFrom = num(
    typeof rawFrom === 'number' ? rawFrom : legacyFrom,
    defaultFrom[0]
  );
  const singleTo = num(typeof rawTo === 'number' ? rawTo : legacyTo, defaultTo[0]);
  const profFrom = num(legacyProfFrom, singleFrom);
  const profTo = num(legacyProfTo, singleTo);
  const from = [singleFrom, singleFrom, singleFrom, singleFrom, profFrom, profFrom];
  const to = [singleTo, singleTo, singleTo, singleTo, profTo, profTo];
  return { from, to };
}

function percentToReps(pct: number): number {
  return Math.max(1, Math.round((100 - pct) / 2.5));
}

function repsRangeFromGoalSettings(
  g: GoalParamsFromSettings,
  levelIdx: number
): { from: number; to: number } {
  const idx = Math.min(4, Math.max(0, levelIdx));
  if (g.displayInPercent) {
    const pf = g.pctFrom?.[idx] ?? g.pctFrom?.[0] ?? 70;
    const pt = g.pctTo?.[idx] ?? g.pctTo?.[0] ?? 50;
    return {
      from: percentToReps(pf),
      to: percentToReps(pt),
    };
  }
  return {
    from: g.repsFrom[idx] ?? g.repsFrom[0] ?? 12,
    to: g.repsTo[idx] ?? g.repsTo[0] ?? 20,
  };
}

function normalizeGoalParams(raw: StoredGoalLoadParams | undefined): GoalParamsFromSettings {
  const d = buildDefaultGoalParams();
  const volFrom = Array.from({ length: LEVEL_SLOT_COUNT }, (_, i) =>
    num(raw?.volumeFrom?.[i], d.volumeFrom[i])
  );
  const volTo = Array.from({ length: LEVEL_SLOT_COUNT }, (_, i) =>
    num(raw?.volumeTo?.[i], d.volumeTo[i])
  );
  volFrom[5] = num(raw?.volumeFrom?.[5] ?? raw?.volumeFrom?.[4], volFrom[4]);
  volTo[5] = num(raw?.volumeTo?.[5] ?? raw?.volumeTo?.[4], volTo[4]);

  const reps = normalizeLevelPairArrays(
    raw?.repsFrom,
    raw?.repsTo,
    raw?.repsFrom,
    raw?.repsTo,
    raw?.repsFromProfessional,
    raw?.repsToProfessional,
    d.repsFrom,
    d.repsTo
  );

  const pct = normalizeLevelPairArrays(
    raw?.pctFrom,
    raw?.pctTo,
    raw?.pctFrom,
    raw?.pctTo,
    undefined,
    undefined,
    d.pctFrom ?? [],
    d.pctTo ?? []
  );

  const pauseSeries = normalizeLevelPairArrays(
    raw?.pauseSeriesFrom,
    raw?.pauseSeriesTo,
    raw?.pauseSeriesFrom,
    raw?.pauseSeriesTo,
    raw?.pauseSeriesFromProfessional,
    raw?.pauseSeriesToProfessional,
    d.pauseSeriesFrom,
    d.pauseSeriesTo
  );

  const pauseExercises = normalizeLevelPairArrays(
    raw?.pauseExercisesFrom,
    raw?.pauseExercisesTo,
    raw?.pauseExercisesFrom,
    raw?.pauseExercisesTo,
    raw?.pauseExercisesFromProfessional,
    raw?.pauseExercisesToProfessional,
    d.pauseExercisesFrom,
    d.pauseExercisesTo
  );

  const pauseAreas = normalizeLevelPairArrays(
    raw?.pauseAreasFrom,
    raw?.pauseAreasTo,
    raw?.pauseAreasFrom,
    raw?.pauseAreasTo,
    raw?.pauseAreasFromProfessional,
    raw?.pauseAreasToProfessional,
    d.pauseAreasFrom,
    d.pauseAreasTo
  );

  const repsAnchored = fillAnchoredLevelPair(reps.from, reps.to);
  const pctAnchored = fillAnchoredLevelPair(pct.from, pct.to);
  const pauseSeriesAnchored = fillAnchoredLevelPair(
    pauseSeries.from,
    pauseSeries.to,
    roundPauseSeconds,
  );
  const pauseExercisesAnchored = fillAnchoredLevelPair(
    pauseExercises.from,
    pauseExercises.to,
    roundPauseSeconds,
  );
  const pauseAreasAnchored = fillAnchoredLevelPair(
    pauseAreas.from,
    pauseAreas.to,
    roundPauseSeconds,
  );

  return {
    volumeFrom: volFrom,
    volumeTo: volTo,
    repsFrom: repsAnchored.from,
    repsTo: repsAnchored.to,
    displayInPercent: Boolean(raw?.displayInPercent ?? d.displayInPercent),
    pctFrom: pctAnchored.from,
    pctTo: pctAnchored.to,
    pauseSeriesFrom: pauseSeriesAnchored.from,
    pauseSeriesTo: pauseSeriesAnchored.to,
    pauseExercisesFrom: pauseExercisesAnchored.from,
    pauseExercisesTo: pauseExercisesAnchored.to,
    pauseAreasFrom: pauseAreasAnchored.from,
    pauseAreasTo: pauseAreasAnchored.to,
  };
}

function settingsKeyForGoal(goalId: GoalId | undefined): string {
  return GOAL_ID_TO_SETTINGS_KEY[goalId ?? 'hypertrophy'] ?? 'Hypertrophy';
}

function fmtSec(s: number): string {
  const sec = Math.max(0, Math.round(s));
  if (sec < 60) return `${sec}"`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r === 0 ? `${m}'` : `${m}'${String(r).padStart(2, '0')}"`;
}

function trainingLevelLabel(trainingLevel: TrainingLevel | null | undefined): string {
  if (trainingLevel === 'beginner') return 'Beginner';
  if (trainingLevel === 'intermediate') return 'Intermediate';
  if (trainingLevel === 'advanced') return 'Advanced';
  if (trainingLevel === 'elite') return 'Elite';
  if (trainingLevel === 'professional') return 'Professional';
  return 'Intermediate';
}

export function levelIndex(trainingLevel: TrainingLevel | null | undefined): number {
  if (trainingLevel === 'beginner') return 0;
  if (trainingLevel === 'intermediate') return 1;
  if (trainingLevel === 'advanced') return 2;
  if (trainingLevel === 'elite') return 3;
  if (trainingLevel === 'professional') return 4;
  return 1;
}

export function interpolateByPeriod(
  from: number,
  to: number,
  currentPeriod: number,
  totalPeriods: number
): number {
  const tp = Math.max(1, Math.floor(totalPeriods));
  const cp = Math.min(tp, Math.max(1, Math.floor(currentPeriod)));
  if (tp <= 1) return from;
  const t = (cp - 1) / (tp - 1);
  return from + (to - from) * t;
}

/** True when this goal has an explicit entry saved under Workouts parameters. */
export function isGoalParamsSavedInWorkoutSettings(goalId: GoalId | undefined): boolean {
  const all = loadLS<Record<string, StoredGoalLoadParams>>(SK_GOALS, {});
  return !!all[settingsKeyForGoal(goalId)];
}

/** Merged goal tables (saved values + defaults for missing fields). */
export function readGoalParamsFromWorkoutSettings(goalId: GoalId | undefined): GoalParamsFromSettings {
  const all = loadLS<Record<string, StoredGoalLoadParams>>(SK_GOALS, {});
  const key = settingsKeyForGoal(goalId);
  return normalizeGoalParams(all[key]);
}

export function readVolumeDeltaPctFromWorkoutSettings(
  trainingLevel: TrainingLevel | null | undefined,
  daysPerWeek: number
): number {
  const deltas = mergedVolumeDeltas();
  const level = trainingLevelLabel(trainingLevel);
  const d = Math.min(6, Math.max(1, Math.floor(daysPerWeek || 1)));
  const v = deltas[level]?.[d];
  return Number.isFinite(v) ? Number(v) : 0;
}

/** Nutrition planner uses the same goal-scalar helpers as workouts. */
export const readGoalParamsFromNutritionSettings = readGoalParamsFromWorkoutSettings;
export const readVolumeDeltaPctFromNutritionSettings = readVolumeDeltaPctFromWorkoutSettings;
export const isGoalParamsSavedInNutritionSettings = isGoalParamsSavedInWorkoutSettings;

export type ComputePlanGymWeekScalarDefaultsInput = {
  goalSettings: GoalParamsFromSettings;
  trainingLevel: TrainingLevel | null | undefined;
  currentPeriod: number;
  totalPeriods: number;
};

function pausePairFromGoal(
  goalSettings: GoalParamsFromSettings,
  kind: 'series' | 'exercises' | 'areas',
  levelIdx: number,
  currentPeriod: number,
  totalPeriods: number
): string {
  const idx = Math.min(4, Math.max(0, levelIdx));
  let fromSec: number;
  let toSec: number;

  if (kind === 'series') {
    fromSec = goalSettings.pauseSeriesFrom[idx] ?? goalSettings.pauseSeriesFrom[0];
    toSec = goalSettings.pauseSeriesTo[idx] ?? goalSettings.pauseSeriesTo[0];
  } else if (kind === 'exercises') {
    fromSec = goalSettings.pauseExercisesFrom[idx] ?? goalSettings.pauseExercisesFrom[0];
    toSec = goalSettings.pauseExercisesTo[idx] ?? goalSettings.pauseExercisesTo[0];
  } else {
    fromSec = goalSettings.pauseAreasFrom[idx] ?? goalSettings.pauseAreasFrom[0];
    toSec = goalSettings.pauseAreasTo[idx] ?? goalSettings.pauseAreasTo[0];
  }

  const sec = interpolateByPeriod(fromSec, toSec, currentPeriod, totalPeriods);
  return fmtSec(sec);
}

/** Interpolated volume at period (before session-frequency % adjustment). */
export function volumeSeriesAtPeriod(
  goalSettings: GoalParamsFromSettings,
  trainingLevel: TrainingLevel | null | undefined,
  currentPeriod: number,
  totalPeriods: number
): number {
  const idx = Math.min(4, Math.max(0, levelIndex(trainingLevel)));
  const from = goalSettings.volumeFrom[idx] ?? 0;
  const to = goalSettings.volumeTo[idx] ?? 0;
  return Math.round(interpolateByPeriod(from, to, currentPeriod, totalPeriods));
}

/** Total series after period interpolation + sessions/week volume delta (Tab 1). */
export function totalSeriesVolumeForPlan(params: {
  goalSettings: GoalParamsFromSettings;
  trainingLevel: TrainingLevel | null | undefined;
  daysCount: number;
  currentPeriod: number;
  totalPeriods: number;
}): number {
  const base = volumeSeriesAtPeriod(
    params.goalSettings,
    params.trainingLevel,
    params.currentPeriod,
    params.totalPeriods,
  );
  const deltaPct = readVolumeDeltaPctFromWorkoutSettings(params.trainingLevel, params.daysCount);
  const adjusted = Math.round(base * (1 + deltaPct / 100));
  if (adjusted <= 0) return 0;
  return Math.max(16, Math.min(100, adjusted));
}

export function computePlanGymWeekScalarDefaults(input: ComputePlanGymWeekScalarDefaultsInput) {
  const { goalSettings, trainingLevel, currentPeriod, totalPeriods } = input;
  const cp = Math.max(1, Math.floor(currentPeriod));
  const tp = Math.max(cp, Math.floor(totalPeriods));
  const idx = levelIndex(trainingLevel);

  const { from: defaultRepsFrom, to: defaultRepsTo } = repsRangeFromGoalSettings(goalSettings, idx);
  const defaultReps = interpolatePeriodIntRounded(defaultRepsFrom, defaultRepsTo, cp, tp);

  return {
    defaultReps: Math.min(99, Math.max(1, defaultReps)),
    /** Between-series pause (sector header Pause). */
    defaultPauseLabel: pausePairFromGoal(goalSettings, 'series', idx, cp, tp),
    /** Macropause at end of each exercise. */
    defaultMacroExerciseLabel: pausePairFromGoal(goalSettings, 'exercises', idx, cp, tp),
    /** Macropause at end of the sector. */
    defaultMacroEndSectorLabel: pausePairFromGoal(goalSettings, 'areas', idx, cp, tp),
  };
}
