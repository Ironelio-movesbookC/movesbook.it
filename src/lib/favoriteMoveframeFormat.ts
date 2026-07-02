/**
 * Format a Prisma moveframe (with movelaps + workoutSession) for Favourites UI / API.
 */

export function formatFavoriteMoveframe(mf: {
  id: string;
  workoutSessionId?: string;
  letter: string;
  sport: string;
  type: string;
  description: string;
  notes: string | null;
  macroFinal: string | null;
  alarm: number | null;
  workType: string | null;
  createdAt: Date;
  movelaps: Array<{
    repetitionNumber: number;
    distance: number | null;
    speed: string | null;
    style: string | null;
    pace: string | null;
    time: string | null;
    reps: number | null;
    r1: string | null;
    r2: string | null;
    muscularSector: string | null;
    exercise: string | null;
    restType: string | null;
    pause: string | null;
    notes: string | null;
    weight?: string | null;
  }>;
  section?: { name: string; color: string | null } | null;
  workoutSession: {
    id?: string;
    name: string;
    sessionNumber: number;
    workoutDay?: { date: Date } | null;
  };
}) {
  let totalDistance = 0;
  let totalDuration = 0;

  mf.movelaps.forEach((ml) => {
    totalDistance += ml.distance || 0;
    totalDuration += Number(ml.time) || 0;
  });

  return {
    id: mf.id,
    workoutSessionId: mf.workoutSessionId ?? mf.workoutSession?.id ?? '',
    name: mf.description || `Moveframe ${mf.letter}`,
    description: mf.notes || '',
    sport: mf.sport,
    type: mf.type,
    letter: mf.letter,
    lapsCount: mf.movelaps.length,
    totalDistance,
    totalDuration,
    workoutName: mf.workoutSession.name,
    workoutNumber: mf.workoutSession.sessionNumber,
    lastUsed: mf.workoutSession.workoutDay?.date || mf.createdAt,
    createdAt: mf.createdAt,
    section: mf.section
      ? { name: mf.section.name, color: mf.section.color }
      : null,
    moveframeData: {
      letter: mf.letter,
      sport: mf.sport,
      type: mf.type,
      description: mf.description,
      notes: mf.notes,
      macroFinal: mf.macroFinal,
      alarm: mf.alarm,
      workType: mf.workType,
      section: mf.section
        ? { name: mf.section.name, color: mf.section.color }
        : null,
      movelaps: mf.movelaps.map((ml) => ({
        repetitionNumber: ml.repetitionNumber,
        distance: ml.distance,
        speed: ml.speed,
        style: ml.style,
        pace: ml.pace,
        time: ml.time,
        reps: ml.reps,
        r1: ml.r1,
        r2: ml.r2,
        muscularSector: ml.muscularSector,
        exercise: ml.exercise,
        restType: ml.restType,
        pause: ml.pause,
        notes: ml.notes,
        weight: ml.weight ?? null,
      })),
    },
  };
}

export function toFavouritesSettingsRow(mf: ReturnType<typeof formatFavoriteMoveframe>) {
  return {
    id: mf.id,
    workoutSessionId: mf.workoutSessionId,
    name: mf.name,
    description: mf.description || '',
    sets: mf.lapsCount || 0,
    reps: mf.totalDistance ? `${mf.totalDistance}m` : '-',
    restTime: 0,
    equipment: [] as string[],
    muscleGroups: [mf.sport],
    difficulty: 'Intermediate' as const,
    lastUsed: new Date(mf.lastUsed).toLocaleDateString(),
    usageCount: 0,
  };
}
