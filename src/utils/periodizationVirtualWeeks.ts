import type { Period, PeriodizationTemplateBuild } from '@/constants/tools.constants';

export const PERIODIZATION_TEMPLATE_WEEKS = 52;

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  return d;
}

export function addCalendarDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Template week 1 → this plan week number when applying from applyStartMonday. */
export function anchorPlanWeekForApplyStart(
  planStartMonday: Date,
  applyStartMonday: Date
): number {
  const planMon = getMondayOfWeek(planStartMonday);
  const applyMon = getMondayOfWeek(applyStartMonday);
  const diffDays = Math.round((applyMon.getTime() - planMon.getTime()) / (24 * 60 * 60 * 1000));
  const offsetWeeks = Math.floor(diffDays / 7);
  return Math.max(1, offsetWeeks + 1);
}

export type VirtualPlanWeek = {
  id: string;
  weekNumber: number;
  days: { date?: string }[];
  period?: { id: string; name: string; color: string } | null;
};

export function virtualWeeksFromBuild(
  build: PeriodizationTemplateBuild | undefined,
  periods: Period[]
): VirtualPlanWeek[] {
  const byId = new Map(periods.map((p) => [p.id, p]));
  const map = build?.weekPeriodByNumber ?? {};
  return Array.from({ length: PERIODIZATION_TEMPLATE_WEEKS }, (_, i) => {
    const weekNumber = i + 1;
    const periodId = map[weekNumber];
    const p = periodId ? byId.get(periodId) : undefined;
    return {
      id: `fav-week-${weekNumber}`,
      weekNumber,
      days: [],
      period: p
        ? { id: p.id, name: p.title, color: p.color }
        : null,
    };
  });
}

export function weekPeriodMapFromVirtualWeeks(weeks: VirtualPlanWeek[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const w of weeks) {
    if (w.period?.id) out[w.weekNumber] = w.period.id;
  }
  return out;
}

export function applyPeriodToWeekRange(
  weeks: VirtualPlanWeek[],
  period: Period,
  start: number,
  end: number
): VirtualPlanWeek[] {
  return weeks.map((w) => {
    if (w.weekNumber < start || w.weekNumber > end) return w;
    return {
      ...w,
      period: { id: period.id, name: period.title, color: period.color },
    };
  });
}
