export type WorkoutShareMeta = {
  sourceWorkoutId: string;
  /** ISO date — original workout creation. */
  sourceCreatedAt?: string;
};

export function parseWorkoutShareMeta(payloadData?: string | null): WorkoutShareMeta | null {
  if (!payloadData?.trim()) return null;
  try {
    const parsed = JSON.parse(payloadData) as { _shareMeta?: WorkoutShareMeta };
    if (parsed._shareMeta?.sourceWorkoutId) return parsed._shareMeta;
  } catch {
    /* ignore */
  }
  return null;
}

export function buildWorkoutSharePayload(
  snapshot: Record<string, unknown>,
  meta: WorkoutShareMeta
): string {
  return JSON.stringify({ ...snapshot, _shareMeta: meta });
}
