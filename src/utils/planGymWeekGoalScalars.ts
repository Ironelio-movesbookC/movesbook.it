import type { GoalId, TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';

/** Shape returned from persisted “Workouts parameters” (optional). */
export type GoalParamsFromSettings = {
  volumeFrom?: number[];
  volumeTo?: number[];
} | null;

export function readGoalParamsFromWorkoutSettings(_goalId: GoalId | undefined): GoalParamsFromSettings {
  return null;
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

export function readVolumeDeltaPctFromWorkoutSettings(
  _trainingLevel: TrainingLevel | null | undefined,
  _daysPerWeek: number
): number {
  return 0;
}

export type ComputePlanGymWeekScalarDefaultsInput = {
  goalSettings: GoalParamsFromSettings;
  trainingLevel: TrainingLevel | null | undefined;
  currentPeriod: number;
  totalPeriods: number;
};

export function computePlanGymWeekScalarDefaults(_input: ComputePlanGymWeekScalarDefaultsInput) {
  return {
    defaultReps: 12,
    defaultPauseLabel: "1'30\"",
    defaultMacroExerciseLabel: "1'",
    defaultMacroEndSectorLabel: "2'",
  };
}
