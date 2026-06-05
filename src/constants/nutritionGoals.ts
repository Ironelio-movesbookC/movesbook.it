/**
 * Main workout goals — same options as NutritionMealInfoModal / Languages (`goal_*` keys).
 * Values are stable codes for storage and APIs.
 */
export const WORKOUT_GOALS = [
  { value: 'STRENGTH', label: 'Strength' },
  { value: 'EXPLOSIVE_STRENGTH', label: 'Explosive Strength' },
  { value: 'SPEED_STRENGTH', label: 'Speed ​​Strength' },
  { value: 'ENDURANCE_STRENGTH', label: 'Endurance Strength' },
  { value: 'AEROBIC_POWER', label: 'Aerobic Power' },
  { value: 'AEROBIC_CAPACITY', label: 'Aerobic Capacity' },
  { value: 'ALACTIC_POWER', label: 'Alactic Power' },
  { value: 'ALACTIC_CAPACITY', label: 'Alactic Capacity' },
  { value: 'LACTIC_CAPACITY', label: 'Lactic Capacity' },
  { value: 'SPEED_ENDURANCE', label: 'Speed ​​Endurance' },
  { value: 'SPEED', label: 'Speed' },
  { value: 'ACCELERATION', label: 'Acceleration' },
  { value: 'ELASTICITY', label: 'Elasticity' },
  { value: 'FLEXIBILITY', label: 'Flexibility' },
  { value: 'MUSCLE_MASS', label: 'Muscle Mass' },
  { value: 'MUSCLE_DEFINITION', label: 'Muscle Definition' },
  { value: 'MUSCLE_DENSITY', label: 'Muscle Density' },
  { value: 'MOTOR_COORDINATION', label: 'Motor Coordination' },
  { value: 'SPORT_RELATED', label: 'Goal related to the current sport' }
] as const;

export type WorkoutGoalValue = (typeof WORKOUT_GOALS)[number]['value'];

export function isWorkoutGoalKey(s: string): s is WorkoutGoalValue {
  return WORKOUT_GOALS.some((g) => g.value === s);
}
