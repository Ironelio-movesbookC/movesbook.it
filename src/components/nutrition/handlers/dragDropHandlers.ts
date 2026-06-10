/**
 * Drag & Drop Handlers - Handle drag and drop operations
 * Extracted from NutritionSection.tsx for better maintainability
 */

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export interface DragDropHandlerDeps {
  token: string | null;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  loadNutritionData: (section?: any) => Promise<void>;
  activeSection: string;
}

/**
 * Handle same-workout nutritionFood reordering
 */
export async function handleSameWorkoutNutritionFoodReorder(
  sourceNutritionFoodId: string,
  targetNutritionFoodId: string,
  workout: any,
  deps: DragDropHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  console.log('🔄 Reordering nutritionFoods:', { sourceNutritionFoodId, targetNutritionFoodId, nutritionMealId: workout.id });
  
  const nutritionFoods = workout.nutritionFoods || [];
  const sourceIndex = nutritionFoods.findIndex((m: any) => m.id === sourceNutritionFoodId);
  const targetIndex = nutritionFoods.findIndex((m: any) => m.id === targetNutritionFoodId);
  
  if (sourceIndex === -1 || targetIndex === -1) {
    console.error('❌ Could not find source or target nutritionFood');
    return;
  }
  
  // Create new order
  const reorderedNutritionFoods = [...nutritionFoods];
  const [removed] = reorderedNutritionFoods.splice(sourceIndex, 1);
  reorderedNutritionFoods.splice(targetIndex, 0, removed);
  
  const nutritionFoodIds = reorderedNutritionFoods.map((m: any) => m.id);
  
  try {
    const response = await fetch('/api/nutrition/nutrition_foods/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nutritionMealId: workout.id, nutritionFoodIds })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('success', 'NutritionFoods reordered successfully');
      await loadNutritionData(activeSection);
    } else {
      showMessage('error', data.error || 'Failed to reorder nutrition_foods');
    }
  } catch (error) {
    console.error('Error reordering nutritionFoods:', error);
    showMessage('error', 'Failed to reorder nutrition_foods');
  }
}

/**
 * Handle same-day workout reordering
 */
export async function handleSameDayWorkoutReorder(
  sourceWorkoutId: string,
  targetWorkoutId: string,
  day: any,
  deps: DragDropHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  console.log('🔄 Reordering meals:', { sourceWorkoutId, targetWorkoutId, dayId: day.id });
  
  const workouts = day.meals || [];
  const sourceIndex = workouts.findIndex((w: any) => w.id === sourceWorkoutId);
  const targetIndex = workouts.findIndex((w: any) => w.id === targetWorkoutId);
  
  if (sourceIndex === -1 || targetIndex === -1) {
    console.error('❌ Could not find source or target workout');
    return;
  }
  
  // Create new order
  const reorderedWorkouts = [...workouts];
  const [removed] = reorderedWorkouts.splice(sourceIndex, 1);
  reorderedWorkouts.splice(targetIndex, 0, removed);
  
  const workoutIds = reorderedWorkouts.map((w: any) => w.id);
  
  try {
    const response = await fetch('/api/nutrition/sessions/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ dayId: day.id, workoutIds })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('success', 'Workouts reordered successfully');
      await loadNutritionData(activeSection);
    } else {
      showMessage('error', data.error || 'Failed to reorder workouts');
    }
  } catch (error) {
    console.error('Error reordering meals:', error);
    showMessage('error', 'Failed to reorder workouts');
  }
}

/**
 * Handle nutritionFood drag to different workout
 */
export async function handleNutritionFoodCrossWorkoutDrag(
  action: 'copy' | 'move',
  sourceNutritionFood: any,
  targetWorkout: any,
  position: 'before' | 'after' | 'end',
  targetNutritionFood?: any,
  deps?: DragDropHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps!;
  
  console.log('🔄 Cross-workout nutritionFood drag:', { action, position, sourceNutritionFood: sourceNutritionFood.id, targetWorkout: targetWorkout.id });
  
  const endpoint = action === 'copy' 
    ? '/api/nutrition/nutrition_foods/copy' 
    : '/api/nutrition/nutrition_foods/move';
  
  try {
    const requestBody: any = {
      sourceNutritionFoodId: sourceNutritionFood.id,
      targetWorkoutId: targetWorkout.id,
      position,
    };
    
    if (targetNutritionFood) {
      requestBody.targetNutritionFoodId = targetNutritionFood.id;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('success', data.message || `NutritionFood ${action}d successfully`);
      await loadNutritionData(activeSection);
    } else {
      showMessage('error', data.error || `Failed to ${action} nutritionFood`);
    }
  } catch (error) {
    console.error(`Error ${action}ing nutritionFood:`, error);
    showMessage('error', `Failed to ${action} nutritionFood`);
  }
}

/**
 * Handle workout drag to different day
 */
export async function handleWorkoutCrossDayDrag(
  action: 'copy' | 'move',
  sourceWorkout: any,
  targetDay: any,
  deps: DragDropHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  console.log('🔄 Cross-day workout drag:', { action, sourceWorkout: sourceWorkout.id, targetDay: targetDay.id });
  
  const endpoint = action === 'copy' 
    ? '/api/nutrition/sessions/copy' 
    : '/api/nutrition/sessions/move';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourceWorkoutId: sourceWorkout.id,
        targetDayId: targetDay.id
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('success', data.message || `Workout ${action}d successfully`);
      await loadNutritionData(activeSection);
    } else {
      showMessage('error', data.error || `Failed to ${action} workout`);
    }
  } catch (error) {
    console.error(`Error ${action}ing workout:`, error);
    showMessage('error', `Failed to ${action} workout`);
  }
}

