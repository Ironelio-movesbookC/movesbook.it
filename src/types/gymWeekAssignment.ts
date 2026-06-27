import type { PlanGymWeekManualResult } from '@/components/workouts/modals/PlanGymWeekManualModal';

/** One routine (plan day index) placed on a calendar day + workout slot (1–3). */
export type GymWeekSlotAssignment = {
  dayOfWeek: number;
  workoutIndex: number;
  routineDayIndex: number;
};

/** Section where the gym week wizard was started — drives save destination. */
export type GymWeekPlanSourceSection = 'A' | 'B' | 'D';

export type GymWeekWeekAssignment = {
  weekId: string;
  weekNumber?: number;
  plan: PlanGymWeekManualResult;
  slots: GymWeekSlotAssignment[];
  updatedAt: string;
  /** Weekly Plans A-B-C vs Yearly Plan vs Archive */
  sourceSection?: GymWeekPlanSourceSection;
  /** Template A/B/C when saved from Section A */
  templateKey?: 'A' | 'B' | 'C';
};

/** GGW = pick week(s) then assign; SGW = started from a specific yearly-plan week row */
export type GymWeekPlanMode = 'ggw' | 'sgw';

export type GymWeekPlanLaunchContext = {
  mode: GymWeekPlanMode;
  sourceSection: GymWeekPlanSourceSection;
  /** Set for SGW — the week row where "Plan gym week" was clicked. */
  targetWeekId?: string;
  targetWeekNumber?: number;
  /** Active template (A/B/C) when sourceSection is A */
  templateKey?: 'A' | 'B' | 'C';
};
