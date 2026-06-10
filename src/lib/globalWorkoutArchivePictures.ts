/** Parse pictureUrls JSON column on GlobalWorkoutArchiveEntry. */
export function parseGlobalArchivePictureUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u) => String(u).trim()).filter(Boolean);
  } catch {
    return raw
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter(Boolean);
  }
}

export function serializeGlobalArchivePictureUrls(urls: string[]): string | null {
  const clean = urls.map((u) => u.trim()).filter(Boolean);
  return clean.length > 0 ? JSON.stringify(clean) : null;
}

export type GlobalArchiveBulkAction =
  | 'enable'
  | 'disable'
  | 'favorite'
  | 'unfavorite'
  | 'delete';

export function defaultPayloadForRecordType(
  recordType: string
): Record<string, unknown> {
  switch (recordType) {
    case 'STRUCTURED_PROGRAM':
      return {
        name: 'Structured program',
        sport: 'RUN',
        level: 'All levels',
        language: 'en',
        build: { weekPeriodByNumber: {} },
      };
    case 'COACH_PLAN':
      return { weekNumber: 1, days: [] };
    case 'WEEKLY_PLAN':
      return { weekNumber: 1, days: [] };
    default:
      return {
        workout: { name: 'Workout', code: 'IMP', sessionNumber: 1 },
        sports: [],
        moveframes: [],
      };
  }
}
