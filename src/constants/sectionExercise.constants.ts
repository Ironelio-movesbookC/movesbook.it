import type { ExerciseSharedBy, ExerciseTypology } from '@/constants/tools.constants';

export const SECTION_EXERCISE_TYPOLOGY_OPTIONS: ExerciseTypology[] = [
  'Strength',
  'Aerobic',
  'Stretching',
  'Gymnic',
  'Pilates',
  'Calistenic',
  'Spartan',
  'Crossfit',
  'Technical moves for sports',
];

export const SECTION_EXERCISE_EQUIPMENT_TYPES = [
  'Barbell',
  'Dumbbells',
  'Cables',
  'Multi-gym',
  'Free Body',
  'Counterweight Machine',
  'Kettlebells',
  'Benches',
  'TRX',
  'Bands',
  'Bar',
  'Aerobic Machines',
  'Medicine Ball',
  'Fitball',
  'Bosu',
  'Rope',
  'Power Sled',
  'Wall Bars',
] as const;

export const SECTION_EXERCISE_MUSCLE_GROUPS = [
  'Shoulder',
  'Trapezius',
  'Chest',
  'Biceps',
  'Triceps',
  'Forearm',
  'Abdominals',
  'Obliques',
  'Gluteus',
  'Front Leg',
  'Rear Leg',
  'Calf',
  'Tibial',
  'All body superior',
  'All body inferior',
] as const;

export const SECTION_EXERCISE_SHARED_BY: { value: ExerciseSharedBy; label: string }[] = [
  { value: 'MOVESBOOK', label: 'Movesbook' },
  { value: 'SINGLE_USER', label: 'A Single User' },
  { value: 'COACH', label: 'A Coach' },
  { value: 'TEAM_TRAINER', label: 'A Team Trainer' },
  { value: 'CLUB_TRAINER', label: 'A Club Trainer' },
  { value: 'MY_LIBRARY', label: 'My library' },
];
