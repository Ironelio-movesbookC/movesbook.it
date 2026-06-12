import { SportType } from '@prisma/client';
import { buildWorkoutSessionCreate } from '@/lib/workoutDayCopy';

const VALID_SPORT_TYPES = new Set<string>(Object.values(SportType));

/** Coerce favourite snapshot mainSport to a Prisma enum value, or null if invalid. */
export function parseFavoriteMainSport(
  value: string | null | undefined
): SportType | null {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  return VALID_SPORT_TYPES.has(normalized) ? (normalized as SportType) : null;
}

export type ParsedFavoriteWorkout = {
  workout: {
    name?: string | null;
    code?: string | null;
    sessionNumber?: number;
    time?: string | null;
    location?: string | null;
    notes?: string | null;
    status?: string;
    mainSport?: string | null;
    mainGoal?: string | null;
    intensity?: string | null;
    tags?: string | null;
    symbol?: string | null;
    includeStretching?: boolean;
  };
  sports: Array<string | { sport: string }>;
  moveframes: Array<{
    letter?: string | null;
    sport?: string;
    type?: string;
    description?: string | null;
    notes?: string | null;
    macroFinal?: string | null;
    movelaps?: Array<Record<string, unknown>>;
  }>;
};

export function parseFavoriteWorkoutData(raw: unknown): ParsedFavoriteWorkout | null {
  if (!raw) return null;
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (!obj.workout || typeof obj.workout !== 'object') return null;
  return {
    workout: obj.workout as ParsedFavoriteWorkout['workout'],
    sports: Array.isArray(obj.sports) ? (obj.sports as ParsedFavoriteWorkout['sports']) : [],
    moveframes: Array.isArray(obj.moveframes)
      ? (obj.moveframes as ParsedFavoriteWorkout['moveframes'])
      : [],
  };
}

function normalizeSports(
  sports: ParsedFavoriteWorkout['sports']
): { sport: string }[] {
  return sports
    .map((s) => {
      if (typeof s === 'string' && s.trim()) return { sport: s.trim() };
      if (s && typeof s === 'object' && 'sport' in s && typeof (s as { sport: string }).sport === 'string') {
        return { sport: (s as { sport: string }).sport.trim() };
      }
      return null;
    })
    .filter((s): s is { sport: string } => Boolean(s?.sport));
}

/** Build prisma nested create input for applying a favourite workout onto a day. */
export function favoriteWorkoutDataToSessionCreate(
  data: ParsedFavoriteWorkout,
  sessionNumber: number,
  defaultSectionId: string
) {
  const w = data.workout;
  return {
    sessionNumber,
    name: w.name?.trim() || `Workout ${sessionNumber}`,
    code: w.code?.trim() || '',
    time: w.time?.trim() || '',
    location: w.location ?? null,
    notes: w.notes ?? null,
    status: w.status ?? 'NOT_PLANNED',
    symbol: w.symbol ?? null,
    includeStretching: w.includeStretching ?? false,
    sports: normalizeSports(data.sports),
    moveframes: (data.moveframes ?? []).map((mf, mfIdx) => ({
      letter: mf.letter ?? String.fromCharCode(65 + mfIdx),
      code: null,
      type: mf.type ?? 'STANDARD',
      description: mf.description ?? '',
      sport: mf.sport ?? 'BODY_BUILDING',
      distance: null,
      distanceUnit: null,
      speed: null,
      pace: null,
      pause: null,
      repetitions: null,
      style: null,
      notes: mf.notes ?? null,
      sectionId: defaultSectionId,
      movelaps: (mf.movelaps ?? []).map((ml, mlIdx) => ({
        repetitionNumber:
          typeof ml.repetitionNumber === 'number' ? ml.repetitionNumber : mlIdx + 1,
        distance:
          ml.distance != null && ml.distance !== ''
            ? typeof ml.distance === 'number'
              ? ml.distance
              : parseInt(String(ml.distance), 10) || null
            : null,
        speed: ml.speed != null ? String(ml.speed) : null,
        style: ml.style != null ? String(ml.style) : null,
        pace: ml.pace != null ? String(ml.pace) : null,
        time: ml.time != null ? String(ml.time) : null,
        pause: ml.pause != null ? String(ml.pause) : null,
        alarm: ml.alarm != null ? String(ml.alarm) : null,
        sound: ml.sound != null ? String(ml.sound) : null,
        notes: ml.notes != null ? String(ml.notes) : null,
        reps:
          ml.reps != null && ml.reps !== ''
            ? typeof ml.reps === 'number'
              ? ml.reps
              : parseInt(String(ml.reps), 10) || null
            : null,
        weight: ml.weight != null ? String(ml.weight) : null,
        exercise: ml.exercise != null ? String(ml.exercise) : null,
        restType: ml.restType != null ? String(ml.restType) : null,
      })),
    })),
  };
}

export function buildFavoriteSessionCreateData(
  data: ParsedFavoriteWorkout,
  sessionNumber: number,
  defaultSectionId: string
) {
  return buildWorkoutSessionCreate(
    favoriteWorkoutDataToSessionCreate(data, sessionNumber, defaultSectionId) as Parameters<
      typeof buildWorkoutSessionCreate
    >[0]
  );
}
