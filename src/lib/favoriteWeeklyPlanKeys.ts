/** Stable key for one logical calendar week favourite (dedupe save/delete/load). */
export function getFavoriteWeeklyPlanDedupeKey(planData: unknown): string | null {
  if (!planData || typeof planData !== 'object') return null;
  const data = planData as Record<string, unknown>;

  const sourcePlanId = data.sourcePlanId;
  const sourceWeekNumber = data.sourceWeekNumber;
  if (typeof sourcePlanId === 'string' && sourceWeekNumber != null) {
    return `plan:${sourcePlanId}:week:${sourceWeekNumber}`;
  }

  const sourceWeekId = data.sourceWeekId;
  if (typeof sourceWeekId === 'string' && sourceWeekId) {
    return `weekId:${sourceWeekId}`;
  }

  const weeks = data.weeks;
  if (Array.isArray(weeks) && weeks.length > 0) {
    const first = weeks[0] as Record<string, unknown> | undefined;
    const weekNumber = first?.weekNumber;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (weekNumber != null && name) {
      return `legacy:${name}:week:${weekNumber}`;
    }
  }

  return null;
}

export function parseFavoriteWeeklyPlanData(planDataJson: string): unknown {
  try {
    return JSON.parse(planDataJson);
  } catch {
    return null;
  }
}
