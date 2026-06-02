/** Build a week-shaped object for WeekTotalsModal from favourite planData JSON. */
export function favoritePlanDataToDisplayWeek(planData: any) {
  const snapshot = planData?.weeks?.[0];
  if (!snapshot) return null;

  return {
    id: 'favorite-preview',
    weekNumber: snapshot.weekNumber ?? 1,
    notes: snapshot.notes ?? '',
    period: snapshot.periodName ? { name: snapshot.periodName } : null,
    days: (snapshot.days ?? []).map((day: any, di: number) => ({
      id: `fav-day-${di}`,
      dayOfWeek: day.dayOfWeek,
      date: day.date,
      notes: day.notes ?? '',
      period: day.periodName
        ? { name: day.periodName, color: '#5b8def' }
        : null,
      workouts: (day.workouts ?? []).map((w: any, wi: number) => ({
        id: `fav-w-${di}-${wi}`,
        sessionNumber: w.sessionNumber ?? wi + 1,
        name: w.name,
        code: w.code,
        time: w.time,
        notes: w.notes,
        sports: w.sports ?? [],
        moveframes: (w.moveframes ?? []).map((mf: any, mi: number) => ({
          id: `fav-mf-${di}-${wi}-${mi}`,
          letter: mf.letter,
          sport: mf.sport,
          type: mf.type,
          description: mf.description,
          notes: mf.notes,
          workType: mf.workType,
          section: mf.sectionName ? { name: mf.sectionName } : null,
          movelaps: mf.movelaps ?? [],
        })),
      })),
    })),
  };
}
