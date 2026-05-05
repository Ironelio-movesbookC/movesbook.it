import type { GoalId, TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';
import { interpolateBetweenAnchoredLevels } from '@/utils/trainingLevelInterpolation';

/** Row shape under `wp_goalParams` in localStorage (Workouts parameters settings). */
export type WorkoutSettingsGoalParams = {
  volumeFrom: number[];
  volumeTo: number[];
  pauseSeriesFrom: number;
  pauseSeriesTo: number;
  pauseSeriesFromProfessional?: number;
  pauseSeriesToProfessional?: number;
  pauseExercisesFrom: number;
  pauseExercisesTo: number;
  pauseExercisesFromProfessional?: number;
  pauseExercisesToProfessional?: number;
  pauseAreasFrom: number;
  pauseAreasTo: number;
  pauseAreasFromProfessional?: number;
  pauseAreasToProfessional?: number;
  repsFrom: number;
  repsTo: number;
  repsFromProfessional?: number;
  repsToProfessional?: number;
};

export const WORKOUT_GOAL_SETTINGS_KEY = 'wp_goalParams';

const GOAL_TO_SETTINGS_LABEL: Record<GoalId, string> = {
  max_strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Endurance',
  explosive_power: 'Power',
  mobility_flexibility: 'General Fitness',
  injury_prevention: 'General Fitness',
  fat_loss: 'Fat Loss',
};

export function readGoalParamsFromWorkoutSettings(goalId: GoalId | undefined): WorkoutSettingsGoalParams | null {
  if (!goalId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WORKOUT_GOAL_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, WorkoutSettingsGoalParams>;
    const label = GOAL_TO_SETTINGS_LABEL[goalId];
    if (!label) return null;
    const row = parsed?.[label];
    if (!row) return null;
    return row;
  } catch {
    return null;
  }
}

export function levelIndex(trainingLevel: TrainingLevel | null | undefined): number {
  switch (trainingLevel) {
    case 'beginner':
      return 0;
    case 'intermediate':
      return 1;
    case 'advanced':
      return 2;
    case 'elite':
      return 3;
    case 'professional':
      return 4;
    default:
      return 0;
  }
}

/** Yearly-period interpolation: period indices are 1 … totalPeriods (inclusive). */
export function interpolateByPeriod(from: number, to: number, currentPeriod: number, totalPeriods: number): number {
  const cur = Math.max(1, Math.floor(currentPeriod || 1));
  const tot = Math.max(cur, Math.floor(totalPeriods || 1));
  const denom = Math.max(1, tot - 1);
  return from + ((to - from) / denom) * (cur - 1);
}

export function secondsToPauseLabel(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  if (s === 0) return `${m}'`;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/**
 * Default reps + pause labels for Plan Gym Week auto-process:
 * level interpolation (Beginner↔Pro, ÷4 steps) then yearly-period interpolation.
 */
export function computePlanGymWeekScalarDefaults(opts: {
  goalSettings: WorkoutSettingsGoalParams | null;
  trainingLevel: TrainingLevel | null | undefined;
  currentPeriod: number;
  totalPeriods: number;
}): {
  defaultReps: number;
  pauseExerciseSec: number;
  pauseSeriesSec: number;
  pauseAreasSec: number;
  defaultPauseLabel: string;
  defaultMacroExerciseLabel: string;
  defaultMacroEndSectorLabel: string;
} {
  const lvIdx = levelIndex(opts.trainingLevel);
  const cur = Math.max(1, Math.floor(opts.currentPeriod || 1));
  const tot = Math.max(cur, Math.floor(opts.totalPeriods || 1));

  const iLvl = (b: number, p?: number) => interpolateBetweenAnchoredLevels(b, p ?? b, lvIdx);

  if (!opts.goalSettings) {
    const pe = 60;
    const ps = 120;
    const pa = 180;
    return {
      defaultReps: 12,
      pauseExerciseSec: pe,
      pauseSeriesSec: ps,
      pauseAreasSec: pa,
      defaultPauseLabel: secondsToPauseLabel(pe),
      defaultMacroExerciseLabel: secondsToPauseLabel(ps),
      defaultMacroEndSectorLabel: secondsToPauseLabel(pa),
    };
  }

  const g = opts.goalSettings;

  const pauseExerciseSec = interpolateByPeriod(
    iLvl(g.pauseExercisesFrom, g.pauseExercisesFromProfessional ?? g.pauseExercisesFrom),
    iLvl(g.pauseExercisesTo, g.pauseExercisesToProfessional ?? g.pauseExercisesTo),
    cur,
    tot
  );
  const pauseSeriesSec = interpolateByPeriod(
    iLvl(g.pauseSeriesFrom, g.pauseSeriesFromProfessional ?? g.pauseSeriesFrom),
    iLvl(g.pauseSeriesTo, g.pauseSeriesToProfessional ?? g.pauseSeriesTo),
    cur,
    tot
  );
  const pauseAreasSec = interpolateByPeriod(
    iLvl(g.pauseAreasFrom, g.pauseAreasFromProfessional ?? g.pauseAreasFrom),
    iLvl(g.pauseAreasTo, g.pauseAreasToProfessional ?? g.pauseAreasTo),
    cur,
    tot
  );
  const repsVal = interpolateByPeriod(
    iLvl(g.repsFrom, g.repsFromProfessional ?? g.repsFrom),
    iLvl(g.repsTo, g.repsToProfessional ?? g.repsTo),
    cur,
    tot
  );

  const defaultReps = Math.max(0, Math.min(99, Math.round(repsVal)));

  return {
    defaultReps,
    pauseExerciseSec,
    pauseSeriesSec,
    pauseAreasSec,
    defaultPauseLabel: secondsToPauseLabel(Math.round(pauseExerciseSec)),
    defaultMacroExerciseLabel: secondsToPauseLabel(Math.round(pauseSeriesSec)),
    defaultMacroEndSectorLabel: secondsToPauseLabel(Math.round(pauseAreasSec)),
  };
}
