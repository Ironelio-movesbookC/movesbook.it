/**
 * NutritionMeal Constants
 * Extracted from AddMealModal.tsx for better maintainability
 */

// Sport options with icons and colors (matching database enum SportType)
export const SPORT_OPTIONS = [
  { value: 'SWIM', label: 'Swim', icon: '🏊', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'BIKE', label: 'Bike', icon: '🚴', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'RUN', label: 'Run', icon: '🏃', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'BODY_BUILDING', label: 'Body Building', icon: '💪', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'ROWING', label: 'Rowing', icon: '🚣', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { value: 'SKATE', label: 'Skate', icon: '⛸️', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'GYMNASTIC', label: 'Gymnastic', icon: '🤸', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'STRETCHING', label: 'Stretching', icon: '🧘', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'PILATES', label: 'Pilates', icon: '🧘‍♀️', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  { value: 'YOGA', label: 'Yoga', icon: '🧘‍♂️', color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'SKI', label: 'Ski', icon: '⛷️', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { value: 'SNOWBOARD', label: 'Snowboard', icon: '🏂', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'TECHNICAL_MOVES', label: 'Technical Moves', icon: '⚙️', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'FREE_MOVES', label: 'Free Moves', icon: '🤾', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'SOCCER', label: 'Soccer', icon: '⚽', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'BASKETBALL', label: 'Basketball', icon: '🏀', color: 'bg-orange-100 text-orange-800 border-orange-400' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾', color: 'bg-lime-100 text-lime-700 border-lime-300' },
  { value: 'VOLLEYBALL', label: 'Volleyball', icon: '🏐', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'GOLF', label: 'Golf', icon: '⛳', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'BOXING', label: 'Boxing', icon: '🥊', color: 'bg-red-100 text-red-800 border-red-400' },
  { value: 'MARTIAL_ARTS', label: 'Martial Arts', icon: '🥋', color: 'bg-stone-100 text-stone-700 border-stone-300' },
  { value: 'CLIMBING', label: 'Climbing', icon: '🧗', color: 'bg-orange-100 text-orange-800 border-orange-400' },
  { value: 'HIKING', label: 'Hiking', icon: '🥾', color: 'bg-green-100 text-green-800 border-green-400' },
  { value: 'WALKING', label: 'Walking', icon: '🚶', color: 'bg-slate-100 text-slate-600 border-slate-300' },
  { value: 'DANCING', label: 'Dancing', icon: '💃', color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' },
  { value: 'CROSSFIT', label: 'CrossFit', icon: '🏋️', color: 'bg-zinc-100 text-zinc-700 border-zinc-300' },
  { value: 'TRIATHLON', label: 'Triathlon', icon: '🏊‍♂️', color: 'bg-blue-100 text-blue-800 border-blue-400' },
  { value: 'TRACK_FIELD', label: 'Track & Field', icon: '🏃‍♀️', color: 'bg-green-100 text-green-700 border-green-300' }
] as const;

// NutritionMeal symbols for meal numbers (1–4)
export const WORKOUT_SYMBOLS = {
  1: { symbol: '○', label: 'Circle' },
  2: { symbol: '□', label: 'Square' },
  3: { symbol: '△', label: 'Triangle' },
  4: { symbol: '▽', label: 'Inverted triangle' },
} as const;

// Type definitions
export type SportOptionValue = typeof SPORT_OPTIONS[number]['value'];
export type WorkoutNumber = 1 | 2 | 3 | 4;

export interface SportOption {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export interface WorkoutSymbol {
  symbol: string;
  label: string;
}

// Helper function to get sport option by value
export function getSportOption(value: string): SportOption | undefined {
  return SPORT_OPTIONS.find(option => option.value === value);
}

// Helper function to get workout symbol
export function getWorkoutSymbol(workoutNumber: WorkoutNumber): WorkoutSymbol {
  return WORKOUT_SYMBOLS[workoutNumber];
}

// Helper function to get next available session number
export function getNextAvailableSessionNumber(existingWorkouts: any[]): WorkoutNumber {
  const usedNumbers = new Set(existingWorkouts.map((w: any) => w.sessionNumber));
  for (let i = 1; i <= 4; i++) {
    if (!usedNumbers.has(i)) {
      return i as WorkoutNumber;
    }
  }
  return 1; // Fallback
}

