import type { PlanGymWeekManualResult } from '@/components/workouts/modals/PlanGymWeekManualModal';
import type { GoalId } from '@/components/workouts/modals/PlanGymWeekModal';
import type { GymWeekArchiveSaveMetadata } from '@/types/gymWeekArchive';

/** Archive plans keep generic Day 1 / Day 2 labels — no calendar slot assignment. */
export function normalizeGymWeekPlanForArchive(plan: PlanGymWeekManualResult): PlanGymWeekManualResult {
  return {
    ...plan,
    days: plan.days.map((day, index) => ({
      ...day,
      routineName: `Day ${index + 1}`,
    })),
  };
}

export async function saveGymWeekPlanToArchive(
  plan: PlanGymWeekManualResult,
  goals: GoalId[] = [],
  metadata: GymWeekArchiveSaveMetadata,
): Promise<{ weekId: string; weekNumber: number }> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in to save to the archive.');
  }

  const normalized = normalizeGymWeekPlanForArchive(plan);
  const response = await fetch('/api/workouts/archive/gym-week-plan', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan: normalized, goals, metadata }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.details || 'Failed to save gym week plan to archive');
  }

  const data = await response.json();
  return { weekId: data.weekId, weekNumber: data.weekNumber };
}
