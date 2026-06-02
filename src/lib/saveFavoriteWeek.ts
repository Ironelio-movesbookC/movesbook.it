const inFlightWeekIds = new Set<string>();

export type SaveFavoriteWeekResult =
  | { ok: true; message: string; duplicate?: boolean }
  | { ok: false; error: string; skipped?: boolean };

export async function saveWeekToFavorites(
  week: { id: string; weekNumber?: number },
  options?: { name?: string; description?: string }
): Promise<SaveFavoriteWeekResult> {
  if (!week?.id) {
    return { ok: false, error: 'No week selected' };
  }

  if (inFlightWeekIds.has(week.id)) {
    return { ok: false, error: 'Save already in progress', skipped: true };
  }

  inFlightWeekIds.add(week.id);

  try {
    const token =
      localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (!token) {
      return { ok: false, error: 'Please log in' };
    }

    const weekNumber = week.weekNumber || 1;
    const weekName = options?.name || `Week ${weekNumber}`;

    const response = await fetch('/api/workouts/weeks/favorites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        weekId: week.id,
        name: weekName,
        description: options?.description || `Saved from ${new Date().toLocaleDateString()}`,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, error: data.error || 'Failed to save to favorites' };
    }

    return {
      ok: true,
      message: data.message || `"${weekName}" saved to favorites!`,
      duplicate: Boolean(data.duplicate),
    };
  } catch (error) {
    console.error('Error saving week to favorites:', error);
    return { ok: false, error: 'Error saving week to favorites' };
  } finally {
    inFlightWeekIds.delete(week.id);
  }
}
