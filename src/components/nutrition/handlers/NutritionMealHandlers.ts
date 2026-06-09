/**
 * NutritionMeal Handlers - CRUD operations for workouts
 * Extracted from NutritionSection.tsx for better maintainability
 */

import type { NutritionDay, NutritionMeal } from '@/types/nutrition.types';

export interface WorkoutHandlerDeps {
  token: string | null;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  loadNutritionData: (section?: any) => Promise<void>;
  activeSection: string;
}

/**
 * Create a new workout
 */
export async function createWorkout(
  workoutData: any,
  dayExists: boolean,
  deps: WorkoutHandlerDeps
) {
  const { token, showMessage } = deps;
  
  // Verify the day exists before creating workout
  if (!workoutData.dayId) {
    throw new Error('No day selected. Please select a day first.');
  }
  
  if (!dayExists) {
    throw new Error('The selected day no longer exists. Please refresh and try again.');
  }
  
  const response = await fetch('/api/nutrition/sessions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      nutritionDayId: workoutData.dayId,
      sessionNumber: workoutData.sessionNumber,
      name: workoutData.name,
      code: workoutData.code,
      sports: workoutData.sports,
      symbol: workoutData.symbol,
      includeStretching: workoutData.includeStretching,
      status: 'PLANNED_FUTURE',
      time: '',
      location: '',
      notes: ''
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create workout');
  }
  
  showMessage('success', 'Workout added successfully');
  return response.json();
}

/**
 * Update an existing workout
 */
export async function updateWorkout(
  nutritionMealId: string,
  workoutData: any,
  deps: WorkoutHandlerDeps
) {
  const { token, showMessage } = deps;
  
  console.log('Updating workout with data:', workoutData);
  
  const response = await fetch(`/api/nutrition/sessions/${nutritionMealId}`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      name: workoutData.name,
      code: workoutData.code,
      sports: workoutData.sports,
      symbol: workoutData.symbol,
      includeStretching: workoutData.includeStretching
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update workout');
  }
  
  showMessage('success', 'Workout updated successfully');
  return response.json();
}

/**
 * Delete a workout
 */
export async function deleteWorkout(
  nutritionMealId: string,
  deps: WorkoutHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch(`/api/nutrition/sessions/${nutritionMealId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}` 
    }
  });
  
  if (response.ok) {
    showMessage('success', 'Workout deleted successfully');
    await loadNutritionData(activeSection);
  } else {
    showMessage('error', 'Failed to delete workout');
  }
}

/**
 * Copy a workout to another day
 */
export async function copyWorkout(
  sourceWorkoutId: string,
  targetDayId: string,
  deps: WorkoutHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/sessions/copy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      sourceWorkoutId, 
      targetDayId 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'Workout copied successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to copy workout');
  }
}

/**
 * Move a workout to another day
 */
export async function moveWorkout(
  nutritionMealId: string,
  targetDayId: string,
  deps: WorkoutHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/sessions/move', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      workoutId: nutritionMealId, 
      targetDayId 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'Workout moved successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to move workout');
  }
}

