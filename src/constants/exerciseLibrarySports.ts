import { SPORTS_LIST, getSportDisplayName } from '@/constants/moveframe.constants';

/** Row 1 — official Exercise Data Bank libraries (mockup). */
export const EXERCISE_LIBRARY_ROW_1 = [
  'BODY_BUILDING',
  'POWERLIFTING',
  'CALISTENIC',
  'SPARTAN',
  'CROSSFIT',
  'STRETCHING',
  'PILATES',
  'YOGA',
  'GYMNASTIC',
  'ARTISTIC_GYMNASTICS',
  'DANCING',
  'FREE_MOVES',
] as const;

/** Row 2 — official Exercise Data Bank libraries (mockup). */
export const EXERCISE_LIBRARY_ROW_2 = [
  'RUN',
  'ATHLETICS',
  'SWIM',
  'SOCCER',
  'BASKETBALL',
  'TENNIS',
  'VOLLEYBALL',
  'CLIMBING',
  'MARTIAL_ARTS',
  'KICKBOXING',
  'DOWNHILL_SKIING',
  'TECHNICAL_MOVES',
] as const;

export type ExerciseLibrarySportKey =
  | (typeof EXERCISE_LIBRARY_ROW_1)[number]
  | (typeof EXERCISE_LIBRARY_ROW_2)[number];

export const EXERCISE_LIBRARY_SPORT_KEYS: ExerciseLibrarySportKey[] = [
  ...EXERCISE_LIBRARY_ROW_1,
  ...EXERCISE_LIBRARY_ROW_2,
];

export const EXERCISE_LIBRARY_CATCHALL_KEYS = ['FREE_MOVES', 'TECHNICAL_MOVES'] as const;

/** Library sports users explore/fill (excludes Free moves & Technical moves buckets). */
export const EXERCISE_LIBRARY_CORE_KEYS = EXERCISE_LIBRARY_SPORT_KEYS.filter(
  (k) => k !== 'FREE_MOVES' && k !== 'TECHNICAL_MOVES'
);

const LIBRARY_KEY_SET = new Set<string>(EXERCISE_LIBRARY_SPORT_KEYS);

const LIBRARY_LABELS: Record<string, string> = {
  BODY_BUILDING: 'BODY BUILDING',
  POWERLIFTING: 'POWERLIFTING',
  CALISTENIC: 'CALISTENIC',
  SPARTAN: 'SPARTAN',
  CROSSFIT: 'CROSSFIT',
  STRETCHING: 'STRETCHING',
  PILATES: 'PILATES',
  YOGA: 'YOGA',
  GYMNASTIC: 'GYMNASTIC',
  ARTISTIC_GYMNASTICS: 'ARTISTIC GYMNASTICS',
  DANCING: 'DANCING',
  FREE_MOVES: 'FREE MOVES',
  RUN: 'RUN',
  ATHLETICS: 'ATHLETICS',
  SWIM: 'SWIM',
  SOCCER: 'SOCCER',
  BASKETBALL: 'BASKETBALL',
  TENNIS: 'TENNIS',
  VOLLEYBALL: 'VOLLEYBALL',
  CLIMBING: 'CLIMBING',
  MARTIAL_ARTS: 'MARTIAL ARTS',
  KICKBOXING: 'KICKBOXING',
  DOWNHILL_SKIING: 'DOWNHILL SKIING',
  TECHNICAL_MOVES: 'TECHNICAL MOVES',
};

export function getExerciseLibrarySportLabel(sportKey: string): string {
  if (LIBRARY_LABELS[sportKey]) return LIBRARY_LABELS[sportKey];
  if (SPORTS_LIST.includes(sportKey as (typeof SPORTS_LIST)[number])) {
    return getSportDisplayName(sportKey).replace(/\\/g, ' ').toUpperCase();
  }
  return sportKey.replace(/_/g, ' ').toUpperCase();
}

export function isExerciseLibrarySportKey(key: string): key is ExerciseLibrarySportKey {
  return LIBRARY_KEY_SET.has(key);
}

/** Map stored sport token (key or legacy display name) to a library key when possible. */
export function normalizeSportToLibraryKey(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (isExerciseLibrarySportKey(trimmed)) return trimmed;

  const upper = trimmed.toUpperCase().replace(/\s+/g, '_');
  if (isExerciseLibrarySportKey(upper)) return upper;

  for (const key of EXERCISE_LIBRARY_SPORT_KEYS) {
    if (getExerciseLibrarySportLabel(key).toLowerCase() === trimmed.toLowerCase()) return key;
    if (getSportDisplayName(key).toLowerCase() === trimmed.toLowerCase()) return key;
  }

  for (const key of SPORTS_LIST) {
    if (getSportDisplayName(key).toLowerCase() === trimmed.toLowerCase()) {
      if (isExerciseLibrarySportKey(key)) return key;
      return null;
    }
  }

  return null;
}

export function normalizeSportsIndicatedToLibraryKeys(sports: string[] | undefined): string[] {
  const out: string[] = [];
  for (const token of sports || []) {
    const key = normalizeSportToLibraryKey(token);
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

/** True when exercise should appear for the selected library icon (or all when filterKey is "all"). */
export function exerciseMatchesLibraryFilter(
  sportsIndicated: string[] | undefined,
  filterKey: string
): boolean {
  if (!filterKey || filterKey === 'all') return true;
  if (!isExerciseLibrarySportKey(filterKey)) return false;

  const normalized = normalizeSportsIndicatedToLibraryKeys(sportsIndicated);
  if (normalized.includes(filterKey)) return true;

  // Legacy tokens stored as display names before library keys were enforced
  for (const token of sportsIndicated || []) {
    const key = normalizeSportToLibraryKey(token);
    if (key === filterKey) return true;
  }

  return false;
}

/** Keep only official library keys (for save). */
export function sanitizeSportsIndicatedForLibrary(sports: string[] | undefined): string[] {
  return normalizeSportsIndicatedToLibraryKeys(sports);
}
