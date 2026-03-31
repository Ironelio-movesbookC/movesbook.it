/**
 * 12 muscle areas for Plan Gym Week / Fast Plan selector (same assets as manual wizard + FastPlanner).
 * Order matches UI: Shoulders → … → Glutes.
 */
export interface GymWeekMuscleGroup {
  id:        string;
  label:     string;
  sector:    string;
  image:     string;
}

export const GYM_WEEK_MUSCLE_GROUPS: readonly GymWeekMuscleGroup[] = [
  { id: 'shoulders', label: 'Shoulders', sector: 'Shoulders', image: '/muscular/shoulders.png' },
  { id: 'biceps', label: 'Biceps', sector: 'Anterior arms', image: '/muscular/Biceps.png' },
  { id: 'triceps', label: 'Triceps', sector: 'Rear arms', image: '/muscular/Triceps.png' },
  { id: 'forearms', label: 'Forearms', sector: 'Forearms', image: '/muscular/Forearms.png' },
  { id: 'chest', label: 'Chest', sector: 'Chest', image: '/muscular/chest.png' },
  { id: 'abs', label: 'Abdominals', sector: 'Abdominals', image: '/muscular/abs.png' },
  { id: 'trapezius', label: 'Trapezius', sector: 'Trapezius', image: '/muscular/trapezius.png' },
  { id: 'lats', label: 'Lats', sector: 'Lats', image: '/muscular/Lats.png' },
  { id: 'quadriceps', label: 'Quadriceps', sector: 'Front thighs', image: '/muscular/quadriceps.png' },
  { id: 'hams', label: 'Hamstrings', sector: 'Hind thighs', image: '/muscular/hams.png' },
  { id: 'calves', label: 'Calves', sector: 'Calves', image: '/muscular/calves.png' },
  { id: 'glutes', label: 'Glutes', sector: 'Glutes', image: '/muscular/glutes.png' },
];
