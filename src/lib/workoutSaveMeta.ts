export type WorkoutSaveMetaInput = {
  title: string;
  mainSport: string;
  mainGoal: string;
  trainingLevel: string;
  period: string;
  language: string;
  shortDescription: string;
  expirationDate?: string | null;
};

export type WorkoutSaveMeta = WorkoutSaveMetaInput & {
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  authorCountryName?: string;
  authorCountryFlag?: string;
  workoutCount?: number;
  moveframeCount?: number;
  totalMeters?: number;
  totalTimeSeconds?: number;
  totalSeries?: number;
  createdAt?: string;
  savedAt?: string;
  sharedAt?: string | null;
  sourceTemplate?: string;
  sourceWeekNumber?: number;
};

export const WORKOUT_SAVE_META_KEY = '_saveMeta';

export function parseWorkoutSaveMeta(
  workoutData?: string | Record<string, unknown> | null
): WorkoutSaveMeta | null {
  if (!workoutData) return null;
  try {
    const parsed =
      typeof workoutData === 'string'
        ? (JSON.parse(workoutData) as Record<string, unknown>)
        : workoutData;
    const meta = parsed[WORKOUT_SAVE_META_KEY];
    if (meta && typeof meta === 'object') return meta as WorkoutSaveMeta;
  } catch {
    /* ignore */
  }
  return null;
}
