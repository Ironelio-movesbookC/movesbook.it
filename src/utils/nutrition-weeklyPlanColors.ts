/**
 * Calculate the color for a weekly plan based on how many workouts have nutrition_foods
 */

export function calculateWeeklyPlanColor(nutritionPlan: any): string {
  if (!nutritionPlan || !nutritionPlan.weeks) {
    return '#EF4444'; // Red - no data
  }

  // Count unique workouts that have at least 1 nutritionFood
  const workoutsWithNutritionFoods = new Set<string>();
  
  nutritionPlan.weeks.forEach((week: any) => {
    if (!week.days) return;
    
    week.days.forEach((day: any) => {
      if (!day.workouts) return;
      
      day.workouts.forEach((workout: any) => {
        // Check if workout has at least 1 nutritionFood
        if (workout.nutrition_foods && workout.nutrition_foods.length > 0) {
          workoutsWithNutritionFoods.add(workout.id);
        }
      });
    });
  });

  const count = workoutsWithNutritionFoods.size;

  // Return color based on count
  if (count === 0) return '#EF4444';        // Red
  if (count === 1) return '#D1D5DB';        // Light Grey
  if (count === 2) return '#FDE047';        // Light Yellow
  if (count === 3) return '#FACC15';        // Yellow
  if (count === 4) return '#86EFAC';        // Light Green
  if (count === 5) return '#22C55E';        // Green
  if (count === 6) return '#15803D';        // Dark Green
  if (count >= 7) return '#3B82F6';         // Blue

  return '#EF4444'; // Default to red
}

export function getWorkoutCountLabel(nutritionPlan: any): string {
  if (!nutritionPlan || !nutritionPlan.weeks) {
    return '0 workouts with nutrition_foods';
  }

  const workoutsWithNutritionFoods = new Set<string>();
  
  nutritionPlan.weeks.forEach((week: any) => {
    if (!week.days) return;
    
    week.days.forEach((day: any) => {
      if (!day.workouts) return;
      
      day.workouts.forEach((workout: any) => {
        if (workout.nutrition_foods && workout.nutrition_foods.length > 0) {
          workoutsWithNutritionFoods.add(workout.id);
        }
      });
    });
  });

  const count = workoutsWithNutritionFoods.size;
  return `${count} workout${count !== 1 ? 's' : ''} with nutrition_foods`;
}

