export function getWeekWorkoutCount(week: { days?: { workouts?: unknown[] }[] } | null | undefined): number {
  if (!week?.days) return 0;
  return week.days.reduce((sum, day) => sum + (day.workouts?.length || 0), 0);
}

export function isWeekEmpty(week: { days?: { workouts?: unknown[] }[] } | null | undefined): boolean {
  return getWeekWorkoutCount(week) === 0;
}

export function getDayWorkoutCount(day: { workouts?: unknown[] } | null | undefined): number {
  return day?.workouts?.length ?? 0;
}

export function isDayEmpty(day: { workouts?: unknown[] } | null | undefined): boolean {
  return getDayWorkoutCount(day) === 0;
}

export async function fetchPlanWeeks(
  token: string,
  planType: string,
  section?: string
): Promise<any[]> {
  let url = `/api/workouts/plan?type=${encodeURIComponent(planType)}`;
  if (section) url += `&section=${encodeURIComponent(section)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return [];
  const data = await response.json();
  return data.plan?.weeks ?? [];
}
