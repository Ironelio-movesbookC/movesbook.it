import type { GoalId } from '@/components/workouts/modals/PlanGymWeekModal';
import type { GymWeekWeekAssignment } from '@/types/gymWeekAssignment';

export async function applyGymWeekPlanToWorkouts(
  assignments: GymWeekWeekAssignment[],
  goals: GoalId[] = [],
): Promise<{ results: { weekId: string; weekNumber: number; sessionsUpdated: number; moveframesCreated: number }[] }> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in to save the gym week plan.');
  }

  const response = await fetch('/api/workouts/plan/gym-week-apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assignments, goals }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to save gym week plan to your workouts');
  }

  return response.json();
}

export async function removeGymWeekPlanFromWeek(weekId: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You must be signed in.');
  }

  const response = await fetch(
    `/api/workouts/plan/gym-week-apply?weekId=${encodeURIComponent(weekId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.details || err.error || 'Failed to remove gym week plan');
  }
}
