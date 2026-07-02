import type { WorkoutSaveMetaInput } from '@/lib/workoutSaveMeta';

export type SaveFavoriteWorkoutResult =
  | { ok: true; message: string; duplicate?: boolean }
  | { ok: false; error: string; skipped?: boolean };

const inFlightWorkoutIds = new Set<string>();

export async function saveWorkoutToFavorites(
  workout: { id: string },
  options?: {
    name?: string;
    description?: string;
    saveMeta?: WorkoutSaveMetaInput;
    sourceTemplate?: string;
    sourceWeekNumber?: number;
  }
): Promise<SaveFavoriteWorkoutResult> {
  if (!workout?.id) {
    return { ok: false, error: 'No workout selected' };
  }

  if (inFlightWorkoutIds.has(workout.id)) {
    return { ok: false, error: 'Save already in progress', skipped: true };
  }

  inFlightWorkoutIds.add(workout.id);

  try {
    const token =
      localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (!token) {
      return { ok: false, error: 'Please log in' };
    }

    const response = await fetch('/api/workouts/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        workoutId: workout.id,
        name: options?.name,
        description: options?.description,
        saveMeta: options?.saveMeta,
        sourceTemplate: options?.sourceTemplate,
        sourceWeekNumber: options?.sourceWeekNumber,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 409) {
      return {
        ok: false,
        error: data.error || 'This workout is already in your favourites',
      };
    }

    if (!response.ok) {
      return { ok: false, error: data.error || 'Failed to save to favourites' };
    }

    return {
      ok: true,
      message: data.message || 'Workout saved to favourites!',
      duplicate: Boolean(data.duplicate),
    };
  } catch {
    return { ok: false, error: 'Error saving workout to favourites' };
  } finally {
    inFlightWorkoutIds.delete(workout.id);
  }
}
