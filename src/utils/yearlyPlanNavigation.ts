/** Week row from yearly / done plans — needs weekNumber and day dates. */
export type YearlyPlanWeekLike = {
  weekNumber?: number | null;
  days?: Array<{ date?: string | Date | null; dayOfWeek?: number | null }> | null;
};

function normalizeDayDate(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Find which plan week contains today (or the closest week by Monday). */
export function findCurrentWeekNumberInPlan(
  weeks: YearlyPlanWeekLike[] | null | undefined,
  today: Date = new Date()
): number | null {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  const ref = new Date(today);
  ref.setHours(12, 0, 0, 0);

  for (const week of weeks) {
    const days = week.days;
    if (!Array.isArray(days) || days.length === 0) continue;

    const sortedDays = [...days].sort(
      (a, b) =>
        normalizeDayDate(a.date as string | Date).getTime() -
        normalizeDayDate(b.date as string | Date).getTime()
    );
    const firstDayDate = normalizeDayDate(sortedDays[0]!.date as string | Date);
    const lastDayDate = normalizeDayDate(
      sortedDays[sortedDays.length - 1]!.date as string | Date
    );
    lastDayDate.setHours(23, 59, 59, 999);

    if (ref >= firstDayDate && ref <= lastDayDate) {
      return typeof week.weekNumber === 'number' ? week.weekNumber : null;
    }
  }

  let closestWeek: YearlyPlanWeekLike | null = null;
  let smallestDiff = Infinity;

  for (const week of weeks) {
    const days = week.days;
    if (!Array.isArray(days) || days.length === 0) continue;

    const monday =
      days.find((d) => {
        const date = normalizeDayDate(d.date as string | Date);
        return date.getDay() === 1;
      }) ?? days[0];

    if (!monday?.date) continue;

    const mondayDate = normalizeDayDate(monday.date as string | Date);
    const diff = Math.abs(ref.getTime() - mondayDate.getTime());
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestWeek = week;
    }
  }

  if (closestWeek && typeof closestWeek.weekNumber === 'number') {
    return closestWeek.weekNumber;
  }

  return null;
}

/** First week number on the pagination page that includes `weekNumber`. */
export function yearlyPlanPageStartForWeek(
  weekNumber: number,
  weeksPerPage: number
): number {
  const perPage = Math.max(1, weeksPerPage);
  const week = Math.max(1, weekNumber);
  return Math.floor((week - 1) / perPage) * perPage + 1;
}

export function resolveYearlyPlanPageStart(
  weeks: YearlyPlanWeekLike[] | null | undefined,
  weeksPerPage: number,
  today?: Date
): number {
  const currentWeek = findCurrentWeekNumberInPlan(weeks, today);
  if (currentWeek != null) {
    return yearlyPlanPageStartForWeek(currentWeek, weeksPerPage);
  }
  return 1;
}

export type YearlyPlanStartDateSource = {
  startDate?: string | Date | null;
  weeks?: YearlyPlanWeekLike[] | null;
};

/** Resolve the yearly plan start date from plan metadata or week 1 days. */
export function resolveYearlyPlanStartDate(
  plan: YearlyPlanStartDateSource | null | undefined
): Date | null {
  if (!plan) return null;

  if (plan.startDate) {
    const fromPlan = normalizeDayDate(plan.startDate as string | Date);
    if (!Number.isNaN(fromPlan.getTime())) return fromPlan;
  }

  const weeks = plan.weeks;
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  const week1 = weeks.find((w) => w.weekNumber === 1) ?? weeks[0];
  const days = week1?.days;
  if (Array.isArray(days) && days.length > 0) {
    const sorted = [...days].sort(
      (a, b) =>
        normalizeDayDate(a.date as string | Date).getTime() -
        normalizeDayDate(b.date as string | Date).getTime()
    );
    const fromDay = normalizeDayDate(sorted[0]!.date as string | Date);
    if (!Number.isNaN(fromDay.getTime())) return fromDay;
  }

  return null;
}

/** Display label e.g. "01 March 2026". */
export function formatYearlyPlanStartDateLabel(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${day} ${month} ${date.getFullYear()}`;
}
