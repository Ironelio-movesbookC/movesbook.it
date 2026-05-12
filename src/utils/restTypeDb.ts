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

/**
 * Label for the pause value line in hover cards / summaries (matches fast-planner wording).
 * Prisma returns enum names (SET_TIME) or clients may send display strings ("Set time").
 */
export function movelapPauseFieldLabel(restType: string | null | undefined): string {
  if (restType == null || String(restType).trim() === '') return 'Pause';
  const raw = String(restType).trim();
  const upper = raw.toUpperCase();
  if (upper === 'SET_TIME' || raw === 'Set time') return 'Rest time';
  if (upper === 'RESTART_TIME' || raw === 'Restart time') return 'Restart to';
  if (upper === 'RESTART_PULSE' || raw === 'Restart pulse') return 'Rest pulse';
  if (upper === 'SET_METERS' || raw === 'Set meters') return 'Set meters';
  return restTypeDbToDisplay(raw);
}
