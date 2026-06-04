/**
 * NutritionComponent Handlers - CRUD operations for nutrition_components
 * Extracted from NutritionSection.tsx for better maintainability
 */

import { nutritionComponentApi } from '@/utils/api.utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/config/nutrition.constants';

export interface NutritionComponentHandlerDeps {
  token: string | null;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  loadNutritionData: (section?: any) => Promise<void>;
  activeSection: string;
}

/**
 * Create a new nutritionComponent
 */
export async function createNutritionComponent(
  nutritionFoodId: string,
  formData: any,
  deps: NutritionComponentHandlerDeps
) {
  const { showMessage } = deps;
  
  const response = await nutritionComponentApi.create(nutritionFoodId, {
    mode: 'APPEND',
    ...formData
  });
  
  if (response.success) {
    showMessage('success', 'NutritionComponent added successfully');
    return response;
  } else {
    throw new Error(response.error || ERROR_MESSAGES.GENERIC_ERROR);
  }
}

/**
 * Update an existing nutritionComponent
 */
export async function updateNutritionComponent(
  nutritionComponentId: string,
  formData: any,
  deps: NutritionComponentHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch(`/api/nutrition/nutrition_components/${nutritionComponentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', 'NutritionComponent updated successfully');
    return data;
  } else {
    throw new Error(data.error || 'Failed to update nutritionComponent');
  }
}

/**
 * Delete a nutritionComponent
 */
export async function deleteNutritionComponent(
  nutritionComponentId: string,
  deps: NutritionComponentHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch(`/api/nutrition/nutrition_components/${nutritionComponentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    showMessage('success', 'NutritionComponent deleted successfully');
    await loadNutritionData(activeSection);
  } else {
    showMessage('error', 'Failed to delete nutritionComponent');
  }
}

/**
 * Add nutrition_components in bulk
 */
export async function bulkAddNutritionComponents(
  nutritionFoodId: string,
  nutritionComponents: any[],
  deps: NutritionComponentHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch('/api/nutrition/nutrition_components/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      nutritionFoodId, 
      nutritionComponents 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', `${nutritionComponents.length} nutrition components added successfully`);
    await loadNutritionData(activeSection);
    return data;
  } else {
    throw new Error(data.error || 'Failed to add nutrition_components');
  }
}

