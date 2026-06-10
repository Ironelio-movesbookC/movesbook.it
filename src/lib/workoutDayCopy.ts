import {
  MovelapStatus,
  MoveframeType,
  SportType,
  WorkoutStatus,
  type Prisma,
} from '@prisma/client';

const VALID_SPORT_TYPES = new Set<string>(Object.values(SportType));
const VALID_MOVEFRAME_TYPES = new Set<string>(Object.values(MoveframeType));

function toSportType(value: string): SportType {
  return VALID_SPORT_TYPES.has(value) ? (value as SportType) : SportType.BODY_BUILDING;
}

function toMoveframeType(value: string): MoveframeType {
  return VALID_MOVEFRAME_TYPES.has(value) ? (value as MoveframeType) : MoveframeType.STANDARD;
}

function parseMovelapAlarm(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Compare calendar dates ignoring time (UTC-safe for stored noon dates). */
export function isSameCalendarDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

export function templateDaySlotLabel(day: { dayOfWeek?: number }): string {
  const dow = day.dayOfWeek ?? 0;
  const name = DAY_SHORT[(dow - 1 + 7) % 7] ?? `Day ${dow}`;
  return `Day ${dow} (${name})`;
}

export type WorkoutSessionCreateSource = {
    sessionNumber: number;
    name: string | null;
    code: string | null;
    time: string | null;
    location: string | null;
    notes: string | null;
    status: string;
    symbol?: string | null;
    includeStretching: boolean;
    sports: { sport: string }[];
    moveframes: {
      letter: string | null;
      code: string | null;
      type: string;
      description: string | null;
      sport: string;
      distance: number | null;
      distanceUnit: string | null;
      speed: string | null;
      pace: string | null;
      pause: string | null;
      repetitions: number | null;
      style: string | null;
      notes: string | null;
      sectionId: string | null;
      movelaps: {
        repetitionNumber: number;
        distance: number | null;
        speed: string | null;
        style: string | null;
        pace: string | null;
        time: string | null;
        pause: string | null;
        alarm: string | null;
        sound: string | null;
        notes: string | null;
        reps: number | null;
        weight: string | null;
        exercise: string | null;
        restType: string | null;
      }[];
    }[];
};

export function buildWorkoutSessionCreate(
  workout: WorkoutSessionCreateSource
): Prisma.WorkoutSessionCreateWithoutWorkoutDayInput {
  const moveframeCreates = workout.moveframes
    .filter((mf): mf is typeof mf & { sectionId: string } => Boolean(mf.sectionId))
    .map((mf) => ({
      letter: mf.letter ?? 'A',
      sport: toSportType(mf.sport),
      sectionId: mf.sectionId,
      type: toMoveframeType(mf.type),
      description: mf.description ?? '',
      notes: mf.notes,
      distance: mf.distance,
      repetitions: mf.repetitions,
      movelaps: {
        create: mf.movelaps.map((lap) => ({
          repetitionNumber: lap.repetitionNumber,
          distance: lap.distance,
          speed: lap.speed,
          style: lap.style,
          pace: lap.pace,
          time: lap.time,
          pause: lap.pause,
          alarm: parseMovelapAlarm(lap.alarm),
          sound: lap.sound,
          notes: lap.notes,
          reps: lap.reps,
          weight: lap.weight,
          exercise: lap.exercise,
          restType: lap.restType as Prisma.MovelapCreateWithoutMoveframeInput['restType'],
          status: MovelapStatus.PENDING,
          isSkipped: false,
          isDisabled: false,
        })),
      },
    }));

  return {
    sessionNumber: workout.sessionNumber,
    name: workout.name ?? '',
    code: workout.code ?? '',
    time: workout.time ?? '',
    location: workout.location,
    notes: workout.notes,
    status: WorkoutStatus.NOT_PLANNED,
    includeStretching: workout.includeStretching,
    sports: {
      create: workout.sports.map((s) => ({ sport: toSportType(s.sport) })),
    },
    ...(moveframeCreates.length > 0
      ? { moveframes: { create: moveframeCreates } }
      : {}),
  };
}

/** Map a Prisma workout row (with sports / moveframes / movelaps) for day copy/move APIs. */
export function mapPrismaWorkoutForSessionCreate(workout: {
  sessionNumber: number;
  name: string;
  code: string;
  time: string;
  location: string | null;
  notes: string | null;
  status: string;
  includeStretching: boolean;
  sports: { sport: string }[];
  moveframes: {
    letter: string;
    code?: string | null;
    type: string;
    description: string;
    sport: string;
    distance?: number | null;
    repetitions?: number | null;
    style?: string | null;
    notes?: string | null;
    sectionId: string;
    movelaps: {
      repetitionNumber: number;
      distance?: number | null;
      speed?: string | null;
      style?: string | null;
      pace?: string | null;
      time?: string | null;
      pause?: string | null;
      alarm?: number | null;
      sound?: string | null;
      notes?: string | null;
      reps?: number | null;
      weight?: string | null;
      exercise?: string | null;
      restType?: string | null;
    }[];
  }[];
}): WorkoutSessionCreateSource {
  return {
    sessionNumber: workout.sessionNumber,
    name: workout.name,
    code: workout.code,
    time: workout.time,
    location: workout.location,
    notes: workout.notes,
    status: workout.status,
    symbol: null,
    includeStretching: workout.includeStretching,
    sports: workout.sports.map((s) => ({ sport: String(s.sport) })),
    moveframes: workout.moveframes.map((mf) => ({
      letter: mf.letter,
      code: mf.code ?? null,
      type: String(mf.type),
      description: mf.description,
      sport: String(mf.sport),
      distance: mf.distance ?? null,
      distanceUnit: null,
      speed: null,
      pace: null,
      pause: null,
      repetitions: mf.repetitions ?? null,
      style: mf.style ?? null,
      notes: mf.notes ?? null,
      sectionId: mf.sectionId,
      movelaps: mf.movelaps.map((lap) => ({
        repetitionNumber: lap.repetitionNumber,
        distance: lap.distance ?? null,
        speed: lap.speed ?? null,
        style: lap.style ?? null,
        pace: lap.pace ?? null,
        time: lap.time ?? null,
        pause: lap.pause ?? null,
        alarm: lap.alarm != null ? String(lap.alarm) : null,
        sound: lap.sound ?? null,
        notes: lap.notes ?? null,
        reps: lap.reps ?? null,
        weight: lap.weight ?? null,
        exercise: lap.exercise ?? null,
        restType: lap.restType ?? null,
      })),
    })),
  };
}
