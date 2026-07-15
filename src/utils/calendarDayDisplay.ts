import type { CalendarColorTab } from '@/utils/workoutSessionStatus';

export function calendarDateKey(date: Date | string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayHasWorkoutsWithMoveframes(day: any | undefined | null): boolean {
  return Boolean(
    day?.workouts?.some((w: any) => (w?.moveframes?.length ?? 0) > 0),
  );
}

export type CalendarDaySource = 'planned' | 'done';

/** Which plan day to show in the day popup / symbol row for the active color tab. */
export function resolveCalendarDaySource(
  colorTab: CalendarColorTab,
  plannedDay: any | undefined | null,
  doneDay: any | undefined | null,
): { source: CalendarDaySource | null; day: any | null } {
  const hasPlanned = dayHasWorkoutsWithMoveframes(plannedDay);
  const hasDone = dayHasWorkoutsWithMoveframes(doneDay);

  if (colorTab === 'planned') {
    return hasPlanned ? { source: 'planned', day: plannedDay ?? null } : { source: null, day: null };
  }
  if (colorTab === 'done') {
    return hasDone ? { source: 'done', day: doneDay ?? null } : { source: null, day: null };
  }
  // both: prefer done when both exist
  if (hasPlanned && hasDone) return { source: 'done', day: doneDay ?? null };
  if (hasDone) return { source: 'done', day: doneDay ?? null };
  if (hasPlanned) return { source: 'planned', day: plannedDay ?? null };
  return { source: null, day: null };
}

export function calendarDayHasVisibleWorkouts(
  colorTab: CalendarColorTab,
  plannedDay: any | undefined | null,
  doneDay: any | undefined | null,
): boolean {
  return resolveCalendarDaySource(colorTab, plannedDay, doneDay).day !== null;
}

export function workoutsDayForSymbols(
  colorTab: CalendarColorTab,
  plannedDay: any | undefined | null,
  doneDay: any | undefined | null,
): any | null {
  return resolveCalendarDaySource(colorTab, plannedDay, doneDay).day;
}

export function buildDoneDaysByDate(weeks: any[]): Map<string, any> {
  const map = new Map<string, any>();
  for (const week of weeks) {
    for (const day of week.days ?? []) {
      if (!day?.date) continue;
      map.set(calendarDateKey(day.date), {
        ...day,
        weekNumber: week.weekNumber,
      });
    }
  }
  return map;
}
