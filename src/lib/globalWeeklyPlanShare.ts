export type WeeklyPlanShareSourceType = 'YEARLY_PLAN' | 'ARCHIVE' | 'TEMPLATE';

export type WeeklyPlanShareMeta = {
  sourceWeekId: string;
  sourcePlanType: WeeklyPlanShareSourceType;
  /** ISO date — original weekly plan creation (week.createdAt). */
  sourceCreatedAt?: string;
};

export function parseWeeklyPlanShareMeta(payloadData?: string | null): WeeklyPlanShareMeta | null {
  if (!payloadData?.trim()) return null;
  try {
    const parsed = JSON.parse(payloadData) as { _shareMeta?: WeeklyPlanShareMeta };
    if (parsed._shareMeta?.sourceWeekId) return parsed._shareMeta;
  } catch {
    /* ignore */
  }
  return null;
}

export function buildWeeklyPlanSharePayload(
  snapshot: Record<string, unknown>,
  meta: WeeklyPlanShareMeta
): string {
  return JSON.stringify({ ...snapshot, _shareMeta: meta });
}
