/**
 * Movelap.restType is stored as Prisma RestType enum (SET_TIME, …).
 * Forms use human-readable labels ("Set time", …). Normalize at boundaries.
 */

export const REST_TYPE_LABELS = [
  'Set time',
  'Restart time',
  'Set meters',
  'Restart pulse'
] as const;

const ENUM_TO_LABEL: Record<string, string> = {
  SET_TIME: 'Set time',
  RESTART_TIME: 'Restart time',
  SET_METERS: 'Set meters',
  RESTART_PULSE: 'Restart pulse'
};

const LABEL_TO_ENUM: Record<string, string> = {
  'Set time': 'SET_TIME',
  'Restart time': 'RESTART_TIME',
  'Set meters': 'SET_METERS',
  'Restart pulse': 'RESTART_PULSE'
};

const DB_ENUM_STRINGS = new Set(Object.keys(ENUM_TO_LABEL));

/** DB enum or UI label → UI label for selects */
export function restTypeDbToDisplay(db: string | null | undefined): string {
  if (db == null || String(db).trim() === '') return 'Set time';
  const u = String(db).trim();
  if (LABEL_TO_ENUM[u]) return u;
  return ENUM_TO_LABEL[u] ?? 'Set time';
}

/** UI label (or already SET_TIME, …) → Prisma enum string */
export function restTypeDisplayToDb(label: string | null | undefined): string | null {
  if (label == null || String(label).trim() === '') return null;
  const key = String(label).trim();
  if (DB_ENUM_STRINGS.has(key)) return key;
  return LABEL_TO_ENUM[key] ?? null;
}
