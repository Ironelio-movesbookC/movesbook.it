/**
 * NutritionFood Handlers - CRUD operations for nutrition_foods
 * Extracted from NutritionSection.tsx for better maintainability
 */

import type { NutritionFood } from '@/types/nutrition.types';

export interface NutritionFoodHandlerDeps {
  token: string | null;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  loadNutritionData: (section?: any) => Promise<void>;
  activeSection: string;
}

/**
 * Create a new nutritionFood
 */
export async function createNutritionFood(
  nutritionFoodData: any,
  deps: NutritionFoodHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  console.log('📤 Creating nutritionFood with data:', nutritionFoodData);
  
  const response = await fetch('/api/nutrition/moveframes', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(nutritionFoodData)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error?.error || 'Failed to create nutritionFood';
    const details = error?.details ? `: ${error.details}` : '';
    console.error('❌ API Error Response:', error);
    throw new Error(message + details);
  }
  
  const data = await response.json();
  showMessage('success', 'Dietframe added successfully');
  
  // 2026-02-01 - Reload workout data to refresh the UI (fix table visibility issue)
  if (loadNutritionData) {
    await loadNutritionData(activeSection);
  }
  
  return data;
}

/**
 * Update an existing nutritionFood
 */
export async function updateNutritionFood(
  nutritionFoodId: string,
  nutritionFoodData: any,
  deps: NutritionFoodHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  console.log('📤 Updating nutritionFood with data:', nutritionFoodData);
  
  const response = await fetch(`/api/nutrition/moveframes/${nutritionFoodId}`, {
    method: 'PATCH',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(nutritionFoodData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('❌ API Error Response:', error);
    console.error('❌ Error details:', error.error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error name:', error.name);
    throw new Error(error.error || 'Failed to update nutritionFood');
  }
  
  const data = await response.json();
  showMessage('success', 'Dietframe updated successfully');
  if (loadNutritionData) {
    await loadNutritionData(activeSection);
  }
  return data;
}

/**
 * Delete a nutritionFood
 */
export async function deleteNutritionFood(
  nutritionFoodId: string,
  deps: NutritionFoodHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch(`/api/nutrition/moveframes/${nutritionFoodId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}` 
    }
  });
  
  if (response.ok) {
    showMessage('success', 'NutritionFood deleted successfully');
    await loadNutritionData(activeSection);
  } else {
    showMessage('error', 'Failed to delete nutritionFood');
  }
}

/**
 * Copy a nutritionFood to another workout
 */
export async function copyNutritionFood(
  sourceNutritionFoodId: string,
  targetWorkoutId: string,
  deps: NutritionFoodHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/moveframes/copy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      sourceNutritionFoodId, 
      targetWorkoutId 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'NutritionFood copied successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to copy nutritionFood');
  }
}

/**
 * Move a nutritionFood to another workout
 */
export async function moveNutritionFood(
  nutritionFoodId: string,
  targetWorkoutId: string,
  deps: NutritionFoodHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/moveframes/move', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      nutritionFoodId, 
      targetWorkoutId 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'NutritionFood moved successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to move nutritionFood');
  }
}

/**
 * Reorder nutritionFoods within the same workout
 */
export async function reorderNutritionFoods(
  nutritionMealId: string,
  nutritionFoodIds: string[],
  deps: NutritionFoodHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch('/api/nutrition/moveframes/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      nutritionMealId, 
      nutritionFoodIds 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', 'NutritionFoods reordered successfully');
    await loadNutritionData(activeSection);
    return data;
  } else {
    throw new Error(data.error || 'Failed to reorder nutrition_foods');
  }
}

