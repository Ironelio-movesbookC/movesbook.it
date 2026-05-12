/**
 * Gym week / fast-plan exercise picker catalog — same visual assets and naming
 * pattern as `FastPlannerOfMoveframes` mock exercises (per muscle × 12 + general).
 */
import { GYM_WEEK_MUSCLE_GROUPS } from '@/constants/gymWeekMuscleGroups';

export interface GymWeekCatalogExercise {
  id: string;
  name: string;
  sector: string;
  groupId: string;
  image: string;
}

const EXERCISE_IMAGES_BY_GROUP: Record<string, string[]> = {
  shoulders: [
    '/Exercises/shoulder/shoulder exercise 01.png',
    '/Exercises/shoulder/shoulder exercise 02.png',
    '/Exercises/shoulder/shoulder exercise 03.png',
    '/Exercises/shoulder/shoulder exercise 04.png',
    '/Exercises/shoulder/shoulder exercise 05.png',
    '/Exercises/shoulder/shoulder exercise 06.png',
    '/Exercises/shoulder/shoulder exercise 07.png',
    '/Exercises/shoulder/shoulder exercise 08.png',
    '/Exercises/shoulder/shoulder exercise 09.png',
    '/Exercises/shoulder/shoulder exercise 10.png',
    '/Exercises/shoulder/shoulder exercise 11.png',
    '/Exercises/shoulder/shoulder exercise 12.png',
  ],
  biceps: [
    '/Exercises/biceps/biceps exercise 01.png',
    '/Exercises/biceps/biceps exercise 02.png',
    '/Exercises/biceps/biceps exercise 03.png',
    '/Exercises/biceps/biceps exercise 04.png',
    '/Exercises/biceps/biceps exercise 05.png',
    '/Exercises/biceps/biceps exercise 06.png',
    '/Exercises/biceps/biceps exercise 07.png',
    '/Exercises/biceps/biceps exercise 08.png',
    '/Exercises/biceps/biceps exercise 09.png',
    '/Exercises/biceps/biceps exercise 10.png',
    '/Exercises/biceps/biceps exercise 11.png',
    '/Exercises/biceps/biceps exercise 12.png',
  ],
  triceps: [
    '/Exercises/triceps/triceps exercise 01.png',
    '/Exercises/triceps/triceps exercise 02.png',
    '/Exercises/triceps/triceps exercise 03.png',
    '/Exercises/triceps/triceps exercise 04.png',
    '/Exercises/triceps/triceps exercise 05.png',
    '/Exercises/triceps/triceps exercise 06.png',
    '/Exercises/triceps/triceps exercise 07.png',
    '/Exercises/triceps/triceps exercise 08.png',
    '/Exercises/triceps/triceps exercise 09.png',
    '/Exercises/triceps/triceps exercise 10.png',
    '/Exercises/triceps/triceps exercise 11.png',
    '/Exercises/triceps/triceps exercise 12.png',
  ],
  forearms: [
    '/Exercises/forearms/forearms exercise 01.png',
    '/Exercises/forearms/forearms exercise 02.png',
    '/Exercises/forearms/forearms exercise 03.png',
    '/Exercises/forearms/forearms exercise 04.png',
    '/Exercises/forearms/forearms exercise 05.png',
    '/Exercises/forearms/forearms exercise 06.png',
    '/Exercises/forearms/forearms exercise 07.png',
    '/Exercises/forearms/forearms exercise 08.png',
    '/Exercises/forearms/forearms exercise 09.png',
    '/Exercises/forearms/forearms exercise 10.png',
    '/Exercises/forearms/forearms exercise 11.png',
    '/Exercises/forearms/forearms exercise 12.png',
  ],
  chest: [
    '/Exercises/chest/chest exercise 01.png',
    '/Exercises/chest/chest exercise 02.png',
    '/Exercises/chest/chest exercise 03.png',
    '/Exercises/chest/chest exercise 04.png',
    '/Exercises/chest/chest exercise 05.png',
    '/Exercises/chest/chest exercise 06.png',
    '/Exercises/chest/chest exercise 07.png',
    '/Exercises/chest/chest exercise 08.png',
    '/Exercises/chest/chest exercise 09.png',
    '/Exercises/chest/chest exercise 10.png',
    '/Exercises/chest/chest exercise 11.png',
    '/Exercises/chest/chest exercise 12.png',
  ],
  abs: [
    '/Exercises/abdominals/abdominals exercise 01.png',
    '/Exercises/abdominals/abdominals exercise 02.png',
    '/Exercises/abdominals/abdominals exercise 03.png',
    '/Exercises/abdominals/abdominals exercise 04.png',
    '/Exercises/abdominals/abdominals exercise 05.png',
    '/Exercises/abdominals/abdominals exercise 06.png',
    '/Exercises/abdominals/abdominals exercise 07.png',
    '/Exercises/abdominals/abdominals exercise 08.png',
    '/Exercises/abdominals/abdominals exercise 9.png',
    '/Exercises/abdominals/abdominals exercise 10.png',
    '/Exercises/abdominals/abdominals exercise 11.png',
    '/Exercises/abdominals/abdominals exercise 12.png',
  ],
  trapezius: [
    '/Exercises/trapezius/trapezius exercise 01.png',
    '/Exercises/trapezius/trapezius exercise 02.png',
    '/Exercises/trapezius/trapezius exercise 03.png',
    '/Exercises/trapezius/trapezius exercise 04.png',
    '/Exercises/trapezius/trapezius exercise 05.png',
    '/Exercises/trapezius/trapezius exercise 06.png',
    '/Exercises/trapezius/trapezius exercise 07.png',
    '/Exercises/trapezius/trapezius exercise 08.png',
    '/Exercises/trapezius/trapezius exercise 09.png',
    '/Exercises/trapezius/trapezius exercise 10.png',
    '/Exercises/trapezius/trapezius exercise 11.png',
    '/Exercises/trapezius/trapezius exercise 12.png',
  ],
  lats: [
    '/Exercises/lats/lats exercise 01.png',
    '/Exercises/lats/lats exercise 02.png',
    '/Exercises/lats/lats exercise 03.png',
    '/Exercises/lats/lats exercise 04.png',
    '/Exercises/lats/lats exercise 05.png',
    '/Exercises/lats/lats exercise 06.png',
    '/Exercises/lats/lats exercise 07.png',
    '/Exercises/lats/lats exercise 08.png',
    '/Exercises/lats/lats exercise 09.png',
    '/Exercises/lats/lats exercise 10.png',
    '/Exercises/lats/lats exercise 11.png',
    '/Exercises/lats/lats exercise 12.png',
  ],
  quadriceps: [
    '/Exercises/quadriceps/quadriceps exercise 01.png',
    '/Exercises/quadriceps/quadriceps exercise 02.png',
    '/Exercises/quadriceps/quadriceps exercise 03.png',
    '/Exercises/quadriceps/quadriceps exercise 04.png',
    '/Exercises/quadriceps/quadriceps exercise 05.png',
    '/Exercises/quadriceps/quadriceps exercise 06.png',
    '/Exercises/quadriceps/quadriceps exercise 07.png',
    '/Exercises/quadriceps/quadriceps exercise 08.png',
    '/Exercises/quadriceps/quadriceps exercise 09.png',
    '/Exercises/quadriceps/quadriceps exercise 10.png',
    '/Exercises/quadriceps/quadriceps exercise 11.png',
    '/Exercises/quadriceps/quadriceps exercise 12.png',
  ],
  hams: [
    '/Exercises/hamstrings/hamstrings exercise 01.png',
    '/Exercises/hamstrings/hamstrings exercise 02.png',
    '/Exercises/hamstrings/hamstrings exercise 03.png',
    '/Exercises/hamstrings/hamstrings exercise 04.png',
    '/Exercises/hamstrings/hamstrings exercise 05.png',
    '/Exercises/hamstrings/hamstrings exercise 06.png',
    '/Exercises/hamstrings/hamstrings exercise 07.png',
    '/Exercises/hamstrings/hamstrings exercise 08.png',
    '/Exercises/hamstrings/hamstrings exercise 09.png',
    '/Exercises/hamstrings/hamstrings exercise 10.png',
    '/Exercises/hamstrings/hamstrings exercise 11.png',
    '/Exercises/hamstrings/hamstrings exercise 12.png',
  ],
  calves: [
    '/Exercises/calves/calves exercise 01.png',
    '/Exercises/calves/calves exercise 02.png',
    '/Exercises/calves/calves exercise 03.png',
    '/Exercises/calves/calves exercise 04.png',
    '/Exercises/calves/calves exercise 05.png',
    '/Exercises/calves/calves exercise 06.png',
    '/Exercises/calves/calves exercise 07.png',
    '/Exercises/calves/calves exercise 08.png',
    '/Exercises/calves/calves exercise 09.png',
    '/Exercises/calves/calves exercise10.png',
    '/Exercises/calves/calves exercise 11.png',
    '/Exercises/calves/calves exercise 12.png',
  ],
  glutes: [
    '/Exercises/glutes/glutes exercise 01.png',
    '/Exercises/glutes/glutes exercise 02.png',
    '/Exercises/glutes/glutes exercise 03.png',
    '/Exercises/glutes/glutes exercise 04.png',
    '/Exercises/glutes/glutes exercise 05.png',
    '/Exercises/glutes/glutes exercise 06.png',
    '/Exercises/glutes/glutes exercise 07.png',
    '/Exercises/glutes/glutes exercise 08.png',
    '/Exercises/glutes/glutes exercise 09.png',
    '/Exercises/glutes/glutes exercise 10.png',
    '/Exercises/glutes/glutes exercise 11.png',
    '/Exercises/glutes/glutes exercise 12.png',
  ],
};

function getExerciseImage(groupId: string, index: number): string {
  const images = EXERCISE_IMAGES_BY_GROUP[groupId];
  if (!images || images.length === 0) return '/Exercises/abdominals/abdominals exercise 01.png';
  return images[index % images.length];
}

function formatExerciseIndex(index: number): string {
  return `${index + 1}`.padStart(2, '0');
}

export const GYM_WEEK_CATALOG_EXERCISES: GymWeekCatalogExercise[] = GYM_WEEK_MUSCLE_GROUPS.flatMap((group) =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `${group.id}-${i}`,
    name: `${group.label} Exercise ${formatExerciseIndex(i)}`,
    sector: group.sector,
    groupId: group.id,
    image: getExerciseImage(group.id, i),
  })),
)
  .concat(
    Array.from({ length: 20 }, (_, i) => ({
      id: `general-${i}`,
      name: `General Exercise ${formatExerciseIndex(i)}`,
      sector: 'General',
      groupId: 'general',
      image: '/Exercises/abdominals/abdominals exercise 01.png',
    })),
  )
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Random exercise names for a muscular-area row (catalog for that `groupId`, else general pool).
 * When there are more rows than catalog entries, names repeat in a shuffled order.
 */
export function pickRandomCatalogExerciseNamesForMuscleGroup(groupId: string, count: number): string[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  const pool = GYM_WEEK_CATALOG_EXERCISES.filter(e => e.groupId === groupId);
  const use = pool.length > 0 ? pool : GYM_WEEK_CATALOG_EXERCISES.filter(e => e.groupId === 'general');
  if (!use.length) return Array.from({ length: n }, () => '');
  const order = use.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: string[] = [];
  for (let r = 0; r < n; r++) {
    out.push(use[order[r % order.length]].name);
  }
  return out;
}
