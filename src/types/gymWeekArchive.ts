import type { GoalId, TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';

/** User-editable + automatic metadata when saving a gym week to the personal archive. */
export type GymWeekArchiveSaveMetadata = {
  code: string;
  title: string;
  description: string;
  goal: GoalId | string;
  level: TrainingLevel | string;
  periodId: string;
  periodName: string;
  expirationDate: string;
  tags: string;
  /** Automatic fields (stored for archive grid display) */
  workoutType: string;
  duration: string;
  authorType: string;
  authorName: string;
  authorCountry: string;
  workoutCount: number;
  createdAt: string;
};

export type GymWeekArchivePlanPayload = {
  type: 'gym_week_plan';
  plan: unknown;
  goals: unknown[];
  savedAt: string;
  metadata: GymWeekArchiveSaveMetadata;
};

export function parseGymWeekArchivePayload(
  notes: string | null | undefined
): GymWeekArchivePlanPayload | null {
  if (!notes?.trim()) return null;
  try {
    const parsed = JSON.parse(notes) as GymWeekArchivePlanPayload;
    if (parsed?.type === 'gym_week_plan') return parsed;
  } catch {
    /* plain text notes */
  }
  return null;
}
