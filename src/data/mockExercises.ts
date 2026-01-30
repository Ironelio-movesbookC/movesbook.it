/**
 * Mock Exercise Database for Circuit Planner
 * 2026-01-22 11:45 UTC - Created temporary exercise database
 * This will be replaced with a real database in future tasks
 */

export interface MockExercise {
  id: string;
  name: string;
  sector: string;
}

export const MOCK_EXERCISES: MockExercise[] = [
  // Shoulders
  { id: 'shoulder_01', name: 'Exercise #01 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_02', name: 'Exercise #02 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_03', name: 'Exercise #03 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_04', name: 'Exercise #04 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_05', name: 'Exercise #05 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_06', name: 'Exercise #06 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_07', name: 'Exercise #07 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_08', name: 'Exercise #08 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_09', name: 'Exercise #09 Shoulder', sector: 'Shoulders' },
  { id: 'shoulder_10', name: 'Exercise #10 Shoulder', sector: 'Shoulders' },

  // Trapezius
  { id: 'trapezius_01', name: 'Exercise #01 Trapezius', sector: 'Trapezius' },
  { id: 'trapezius_02', name: 'Exercise #02 Trapezius', sector: 'Trapezius' },
  { id: 'trapezius_03', name: 'Exercise #03 Trapezius', sector: 'Trapezius' },
  { id: 'trapezius_04', name: 'Exercise #04 Trapezius', sector: 'Trapezius' },
  { id: 'trapezius_05', name: 'Exercise #05 Trapezius', sector: 'Trapezius' },

  // Chest
  { id: 'chest_01', name: 'Exercise #01 Chest', sector: 'Chest' },
  { id: 'chest_02', name: 'Exercise #02 Chest', sector: 'Chest' },
  { id: 'chest_03', name: 'Exercise #03 Chest', sector: 'Chest' },
  { id: 'chest_04', name: 'Exercise #04 Chest', sector: 'Chest' },
  { id: 'chest_05', name: 'Exercise #05 Chest', sector: 'Chest' },
  { id: 'chest_06', name: 'Exercise #06 Chest', sector: 'Chest' },
  { id: 'chest_07', name: 'Exercise #07 Chest', sector: 'Chest' },
  { id: 'chest_08', name: 'Exercise #08 Chest', sector: 'Chest' },
  { id: 'chest_09', name: 'Exercise #09 Chest', sector: 'Chest' },
  { id: 'chest_10', name: 'Exercise #10 Chest', sector: 'Chest' },

  // Anterior arms (Biceps)
  { id: 'biceps_01', name: 'Exercise #01 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_02', name: 'Exercise #02 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_03', name: 'Exercise #03 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_04', name: 'Exercise #04 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_05', name: 'Exercise #05 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_06', name: 'Exercise #06 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_07', name: 'Exercise #07 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_08', name: 'Exercise #08 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_09', name: 'Exercise #09 Biceps', sector: 'Anterior arms' },
  { id: 'biceps_10', name: 'Exercise #10 Biceps', sector: 'Anterior arms' },

  // Rear arms (Triceps)
  { id: 'triceps_01', name: 'Exercise #01 Triceps', sector: 'Rear arms' },
  { id: 'triceps_02', name: 'Exercise #02 Triceps', sector: 'Rear arms' },
  { id: 'triceps_03', name: 'Exercise #03 Triceps', sector: 'Rear arms' },
  { id: 'triceps_04', name: 'Exercise #04 Triceps', sector: 'Rear arms' },
  { id: 'triceps_05', name: 'Exercise #05 Triceps', sector: 'Rear arms' },
  { id: 'triceps_06', name: 'Exercise #06 Triceps', sector: 'Rear arms' },
  { id: 'triceps_07', name: 'Exercise #07 Triceps', sector: 'Rear arms' },
  { id: 'triceps_08', name: 'Exercise #08 Triceps', sector: 'Rear arms' },
  { id: 'triceps_09', name: 'Exercise #09 Triceps', sector: 'Rear arms' },
  { id: 'triceps_10', name: 'Exercise #10 Triceps', sector: 'Rear arms' },

  // Forearms
  { id: 'forearm_01', name: 'Exercise #01 Forearm', sector: 'Forearms' },
  { id: 'forearm_02', name: 'Exercise #02 Forearm', sector: 'Forearms' },
  { id: 'forearm_03', name: 'Exercise #03 Forearm', sector: 'Forearms' },
  { id: 'forearm_04', name: 'Exercise #04 Forearm', sector: 'Forearms' },
  { id: 'forearm_05', name: 'Exercise #05 Forearm', sector: 'Forearms' },
  { id: 'forearm_06', name: 'Exercise #06 Forearm', sector: 'Forearms' },
  { id: 'forearm_07', name: 'Exercise #07 Forearm', sector: 'Forearms' },
  { id: 'forearm_08', name: 'Exercise #08 Forearm', sector: 'Forearms' },
  { id: 'forearm_09', name: 'Exercise #09 Forearm', sector: 'Forearms' },
  { id: 'forearm_10', name: 'Exercise #10 Forearm', sector: 'Forearms' },

  // Abdominals
  { id: 'abdominals_01', name: 'Exercise #01 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_02', name: 'Exercise #02 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_03', name: 'Exercise #03 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_04', name: 'Exercise #04 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_05', name: 'Exercise #05 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_06', name: 'Exercise #06 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_07', name: 'Exercise #07 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_08', name: 'Exercise #08 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_09', name: 'Exercise #09 Abdominals', sector: 'Abdominals' },
  { id: 'abdominals_10', name: 'Exercise #10 Abdominals', sector: 'Abdominals' },

  // Intercostals (Obliques)
  { id: 'obliques_01', name: 'Exercise #01 Obliques', sector: 'Intercostals' },
  { id: 'obliques_02', name: 'Exercise #02 Obliques', sector: 'Intercostals' },
  { id: 'obliques_03', name: 'Exercise #03 Obliques', sector: 'Intercostals' },
  { id: 'obliques_04', name: 'Exercise #04 Obliques', sector: 'Intercostals' },
  { id: 'obliques_05', name: 'Exercise #05 Obliques', sector: 'Intercostals' },
  { id: 'obliques_06', name: 'Exercise #06 Obliques', sector: 'Intercostals' },
  { id: 'obliques_07', name: 'Exercise #07 Obliques', sector: 'Intercostals' },
  { id: 'obliques_08', name: 'Exercise #08 Obliques', sector: 'Intercostals' },
  { id: 'obliques_09', name: 'Exercise #09 Obliques', sector: 'Intercostals' },
  { id: 'obliques_10', name: 'Exercise #10 Obliques', sector: 'Intercostals' },

  // Glutes (using Glutes from MUSCULAR_SECTOR_IMAGES)
  { id: 'gluteus_01', name: 'Exercise #01 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_02', name: 'Exercise #02 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_03', name: 'Exercise #03 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_04', name: 'Exercise #04 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_05', name: 'Exercise #05 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_06', name: 'Exercise #06 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_07', name: 'Exercise #07 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_08', name: 'Exercise #08 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_09', name: 'Exercise #09 Gluteus', sector: 'Glutes' },
  { id: 'gluteus_10', name: 'Exercise #10 Gluteus', sector: 'Glutes' },

  // Front thighs (Front Legs)
  { id: 'front_leg_01', name: 'Exercise #01 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_02', name: 'Exercise #02 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_03', name: 'Exercise #03 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_04', name: 'Exercise #04 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_05', name: 'Exercise #05 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_06', name: 'Exercise #06 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_07', name: 'Exercise #07 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_08', name: 'Exercise #08 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_09', name: 'Exercise #09 Front Leg', sector: 'Front thighs' },
  { id: 'front_leg_10', name: 'Exercise #10 Front Leg', sector: 'Front thighs' },

  // Hind thighs (Rear Legs)
  { id: 'rear_legs_01', name: 'Exercise #01 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_02', name: 'Exercise #02 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_03', name: 'Exercise #03 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_04', name: 'Exercise #04 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_05', name: 'Exercise #05 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_06', name: 'Exercise #06 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_07', name: 'Exercise #07 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_08', name: 'Exercise #08 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_09', name: 'Exercise #09 Rear Legs', sector: 'Hind thighs' },
  { id: 'rear_legs_10', name: 'Exercise #10 Rear Legs', sector: 'Hind thighs' },

  // Calves
  { id: 'calfs_01', name: 'Exercise #01 Calfs', sector: 'Calves' },
  { id: 'calfs_02', name: 'Exercise #02 Calfs', sector: 'Calves' },
  { id: 'calfs_03', name: 'Exercise #03 Calfs', sector: 'Calves' },
  { id: 'calfs_04', name: 'Exercise #04 Calfs', sector: 'Calves' },
  { id: 'calfs_05', name: 'Exercise #05 Calfs', sector: 'Calves' },
  { id: 'calfs_06', name: 'Exercise #06 Calfs', sector: 'Calves' },
  { id: 'calfs_07', name: 'Exercise #07 Calfs', sector: 'Calves' },
  { id: 'calfs_08', name: 'Exercise #08 Calfs', sector: 'Calves' },
  { id: 'calfs_09', name: 'Exercise #09 Calfs', sector: 'Calves' },
  { id: 'calfs_10', name: 'Exercise #10 Calfs', sector: 'Calves' },

  // Tibials
  { id: 'tibials_01', name: 'Exercise #01 Tibials', sector: 'Tibials' },
  { id: 'tibials_02', name: 'Exercise #02 Tibials', sector: 'Tibials' },
  { id: 'tibials_03', name: 'Exercise #03 Tibials', sector: 'Tibials' },
  { id: 'tibials_04', name: 'Exercise #04 Tibials', sector: 'Tibials' },
  { id: 'tibials_05', name: 'Exercise #05 Tibials', sector: 'Tibials' },
  
  // Lats - 5 exercises
  { id: 'lats_01', name: 'Exercise #01 Lats', sector: 'Lats' },
  { id: 'lats_02', name: 'Exercise #02 Lats', sector: 'Lats' },
  { id: 'lats_03', name: 'Exercise #03 Lats', sector: 'Lats' },
  { id: 'lats_04', name: 'Exercise #04 Lats', sector: 'Lats' },
  { id: 'lats_05', name: 'Exercise #05 Lats', sector: 'Lats' },
  
  // Lumbosacral - 5 exercises
  { id: 'lumbar_01', name: 'Exercise #01 Lumbosacral', sector: 'Lumbosacral' },
  { id: 'lumbar_02', name: 'Exercise #02 Lumbosacral', sector: 'Lumbosacral' },
  { id: 'lumbar_03', name: 'Exercise #03 Lumbosacral', sector: 'Lumbosacral' },
  { id: 'lumbar_04', name: 'Exercise #04 Lumbosacral', sector: 'Lumbosacral' },
  { id: 'lumbar_05', name: 'Exercise #05 Lumbosacral', sector: 'Lumbosacral' },
];

// Map to actual MUSCULAR_SECTORS from constants
export const MUSCULAR_SECTORS = [
  'Shoulders',
  'Anterior arms', // Biceps
  'Rear arms', // Triceps
  'Forearms',
  'Chest',
  'Abdominals',
  'Intercostals', // Obliques
  'Trapezius',
  'Lats',
  'Lumbosacral',
  'Front thighs', // Front Legs
  'Hind thighs', // Rear Legs
  'Calves',
  'Tibials'
];

/**
 * Get exercises for a specific muscular sector
 */
export function getExercisesBySector(sector: string): MockExercise[] {
  return MOCK_EXERCISES.filter(ex => ex.sector === sector);
}

/**
 * Get a random exercise from a specific sector
 * 2026-01-22 14:50 UTC - Added excludeExercise parameter to avoid duplicates
 */
export function getRandomExercise(sector: string, excludeExercise?: string): MockExercise | null {
  let exercises = getExercisesBySector(sector);
  if (exercises.length === 0) return null;
  
  // Exclude the current exercise if provided
  if (excludeExercise) {
    exercises = exercises.filter(ex => ex.name !== excludeExercise);
    // If no other exercises available after filtering, return null
    if (exercises.length === 0) return null;
  }
  
  return exercises[Math.floor(Math.random() * exercises.length)];
}

/**
 * Get all sectors that have exercises
 */
export function getAllSectors(): string[] {
  return MUSCULAR_SECTORS;
}

