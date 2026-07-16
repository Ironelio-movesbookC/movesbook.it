import type { YearlyWorkoutStatus } from '@/utils/workoutSessionStatus';

export async function postExportToDone(payload: {
  mode: 'workout' | 'day';
  sourceWorkoutId?: string;
  sourceDayId?: string;
  targetDayIds?: string[];
  statusByWorkoutId?: Record<string, YearlyWorkoutStatus>;
}): Promise<{ exportedCount: number; weekCount?: number }> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not signed in');

  const response = await fetch('/api/workouts/export-to-done', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to export to Workouts Done');
  }

  return response.json();
}

export async function patchMoveframeMarkedDone(
  moveframeId: string,
  marked: boolean,
): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not signed in');

  const response = await fetch(`/api/workouts/moveframes/${moveframeId}/mark-done`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ marked }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update moveframe');
  }
}

/** Grey Done button — green label after export/mark. */
export function doneButtonClassName(isDone: boolean): string {
  return `px-2 py-1 text-[11px] rounded font-medium transition-colors ${
    isDone
      ? 'bg-gray-500 text-green-400 hover:bg-gray-600'
      : 'bg-gray-500 text-white hover:bg-gray-600'
  }`;
}
