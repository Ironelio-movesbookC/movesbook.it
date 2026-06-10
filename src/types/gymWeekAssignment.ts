import type { PlanGymWeekManualResult } from '@/components/workouts/modals/PlanGymWeekManualModal';

/** One routine (plan day index) placed on a calendar day + workout slot (1–3). */
export type GymWeekSlotAssignment = {
  dayOfWeek: number;
  workoutIndex: number;
  routineDayIndex: number;
};

export type GymWeekWeekAssignment = {
  weekId: string;
  weekNumber?: number;
  plan: PlanGymWeekManualResult;
  slots: GymWeekSlotAssignment[];
  updatedAt: string;
};

export type GymWeekPlanMode = 'ggw' | 'sgw';

export type GymWeekPlanLaunchContext = {
  mode: GymWeekPlanMode;
  /** Set for SGW — the week row where "Plan gym week" was clicked. */
  targetWeekId?: string;
  targetWeekNumber?: number;
};
