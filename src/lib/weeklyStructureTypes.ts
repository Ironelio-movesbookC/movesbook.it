export const WEEKLY_STRUCTURE_PLAN_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
export type WeeklyStructurePlanKey = (typeof WEEKLY_STRUCTURE_PLAN_KEYS)[number];

export type PlannedWorkout = {
  id: string;
  sportKey: string;
  distance: string;
  time: string;
  goalCode: string;
  description: string;
};

/** day 1–7, session 1–3 → planned workout ids */
export type WeeklyStructureDayGrid = Record<number, Record<number, string[]>>;

export type WeeklyStructurePlanPersist = {
  meta: { name: string; color: string; periodId: string };
  planned: PlannedWorkout[];
  grid: WeeklyStructureDayGrid;
};

export const WEEKLY_STRUCTURE_SESSIONS = [1, 2, 3] as const;
