export type WeeklyPlanSaveMetaInput = {
  title: string;
  mainSport: string;
  mainGoal: string;
  trainingLevel: string;
  period: string;
  language: string;
  shortDescription: string;
  expirationDate?: string | null;
};

export type WeeklyPlanSaveMeta = WeeklyPlanSaveMetaInput & {
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  authorCountryName?: string;
  authorCountryFlag?: string;
  workoutCount?: number;
  totalMeters?: number;
  totalTimeSeconds?: number;
  totalSeries?: number;
  createdAt?: string;
  savedAt?: string;
  sharedAt?: string | null;
  sourceTemplate?: string;
};

export const WEEKLY_PLAN_SAVE_META_KEY = '_saveMeta';

export function parseWeeklyPlanSaveMeta(
  planData?: string | Record<string, unknown> | null
): WeeklyPlanSaveMeta | null {
  if (!planData) return null;
  try {
    const parsed =
      typeof planData === 'string'
        ? (JSON.parse(planData) as Record<string, unknown>)
        : planData;
    const meta = parsed[WEEKLY_PLAN_SAVE_META_KEY];
    if (meta && typeof meta === 'object') return meta as WeeklyPlanSaveMeta;
  } catch {
    /* ignore */
  }
  return null;
}
