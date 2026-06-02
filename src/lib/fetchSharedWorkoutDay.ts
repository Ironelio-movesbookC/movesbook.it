import { prisma } from '@/lib/prisma';

export type SharedWorkoutDayPayload = {
  id: string;
  date: Date;
  weekNumber: number | null;
  dayOfWeek: number;
  notes: string | null;
  weather: string | null;
  feelingStatus: string | null;
  period: { name: string } | null;
  workouts: Array<{
    id: string;
    name: string | null;
    code: string | null;
    sessionNumber: number;
    time: string | null;
    weather: string | null;
    location: string | null;
    surface: string | null;
    notes: string | null;
    status: string;
    sports: { sport: string }[];
    moveframes: Array<{
      id: string;
      letter: string | null;
      sport: string;
      type: string;
      description: string | null;
      notes: string | null;
      manualMode: boolean;
      manualInputType: string | null;
      distance: number | null;
      repetitions: number | null;
      aerobicSeries: number | null;
      movelaps: Array<{
        id: string;
        repetitionNumber: number;
        distance: number | null;
        speed: string | null;
        style: string | null;
        pace: string | null;
        time: string | null;
        reps: string | null;
        exercise: string | null;
        restType: string | null;
        pause: string | null;
        weight: string | null;
        notes: string | null;
      }>;
    }>;
  }>;
};

export async function fetchSharedWorkoutDay(
  dayId: string
): Promise<SharedWorkoutDayPayload | null> {
  const day = await prisma.workoutDay.findUnique({
    where: { id: dayId },
    include: {
      period: true,
      workoutWeek: { select: { weekNumber: true } },
      workouts: {
        orderBy: { sessionNumber: 'asc' },
        include: {
          sports: true,
          moveframes: {
            include: {
              movelaps: { orderBy: { repetitionNumber: 'asc' } },
              section: true,
            },
            orderBy: { letter: 'asc' },
          },
        },
      },
    },
  });

  if (!day) return null;

  const weekNumber = day.weekNumber ?? day.workoutWeek?.weekNumber ?? null;

  return {
    id: day.id,
    date: day.date,
    weekNumber,
    dayOfWeek: day.dayOfWeek,
    notes: day.notes,
    weather: day.weather,
    feelingStatus: day.feelingStatus,
    period: day.period ? { name: day.period.name } : null,
    workouts: day.workouts.map((workout) => ({
      id: workout.id,
      name: workout.name,
      code: workout.code,
      sessionNumber: workout.sessionNumber,
      time: workout.time,
      weather: workout.weather,
      location: workout.location,
      surface: workout.surface,
      notes: workout.notes,
      status: String(workout.status),
      sports: workout.sports.map((s) => ({ sport: String(s.sport) })),
      moveframes: workout.moveframes.map((mf) => ({
        id: mf.id,
        letter: mf.letter,
        sport: String(mf.sport),
        type: String(mf.type),
        description: mf.description,
        notes: mf.notes,
        manualMode: mf.manualMode ?? false,
        manualInputType: mf.manualInputType,
        distance: mf.distance,
        repetitions: mf.repetitions,
        aerobicSeries: mf.aerobicSeries,
        movelaps: mf.movelaps.map((ml) => ({
          id: ml.id,
          repetitionNumber: ml.repetitionNumber,
          distance: ml.distance,
          speed: ml.speed,
          style: ml.style,
          pace: ml.pace,
          time: ml.time,
          reps: ml.reps != null ? String(ml.reps) : null,
          exercise: ml.exercise,
          restType: ml.restType != null ? String(ml.restType) : null,
          pause: ml.pause,
          weight: ml.weight,
          notes: ml.notes,
        })),
      })),
    })),
  };
}
