/** Merge fragmented workout week rows that share the same weekNumber into one logical week. */
export function mergeWeeksByWeekNumber(weeks: any[]): any[] {
  const byNumber = new Map<number, any>();

  for (const week of weeks) {
    const weekNumber = week.weekNumber ?? 0;
    const existing = byNumber.get(weekNumber);

    if (!existing) {
      byNumber.set(weekNumber, {
        ...week,
        days: [...(week.days || [])],
        _primaryDayCount: week.days?.length || 0,
      });
      continue;
    }

    const dayById = new Map<string, any>();
    for (const day of [...(existing.days || []), ...(week.days || [])]) {
      if (day?.id) dayById.set(day.id, day);
    }

    existing.days = Array.from(dayById.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const weekDayCount = week.days?.length || 0;
    if (weekDayCount > (existing._primaryDayCount || 0)) {
      existing.id = week.id;
      existing._primaryDayCount = weekDayCount;
      if (week.period) existing.period = week.period;
      if (week.notes) existing.notes = week.notes;
    }
  }

  return Array.from(byNumber.values())
    .map(({ _primaryDayCount, ...week }) => week)
    .sort((a, b) => a.weekNumber - b.weekNumber);
}
