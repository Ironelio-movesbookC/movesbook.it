/**
 * Day & Week Handlers - Operations for days and weeks
 * Extracted from NutritionSection.tsx for better maintainability
 */

export interface DayWeekHandlerDeps {
  token: string | null;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  loadNutritionData: (section?: any) => Promise<void>;
  activeSection: string;
}

/**
 * Update day metadata (weather, feeling, notes, period)
 */
export async function updateDay(
  dayId: string,
  dayData: any,
  deps: DayWeekHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch(`/api/nutrition/days/${dayId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dayData)
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', 'Day updated successfully');
    await loadNutritionData(activeSection);
    return data;
  } else {
    throw new Error(data.error || 'Failed to update day');
  }
}

/**
 * Copy a day to another week
 */
export async function copyDay(
  sourceDayId: string,
  targetWeekId: string,
  targetDate: string,
  deps: DayWeekHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/days/copy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      sourceDayId, 
      targetWeekId, 
      targetDate 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'Day copied successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to copy day');
  }
}

/**
 * Move a day to another week
 */
export async function moveDay(
  dayId: string,
  targetWeekId: string,
  targetDate: string,
  deps: DayWeekHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/days/move', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      dayId, 
      targetWeekId, 
      targetDate 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'Day moved successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to move day');
  }
}

/**
 * Delete a day
 */
export async function deleteDay(
  dayId: string,
  deps: DayWeekHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch(`/api/nutrition/days/${dayId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    showMessage('success', 'Day deleted successfully');
    await loadNutritionData(activeSection);
  } else {
    showMessage('error', 'Failed to delete day');
  }
}

/**
 * Copy a week to another week (Section A to Section B)
 */
export async function copyWeek(
  sourceWeekId: string,
  targetWeekId: string,
  deps: DayWeekHandlerDeps
) {
  const { token, showMessage, loadNutritionData, activeSection } = deps;
  
  const response = await fetch('/api/nutrition/weeks/copy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      sourceWeekId, 
      targetWeekId 
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'Week copied successfully!');
    await loadNutritionData(activeSection);
    return data;
  } else {
    throw new Error(data.error || 'Failed to copy week');
  }
}

/**
 * Update week notes and period
 */
export async function updateWeekNotes(
  weekId: string,
  notes: string,
  periodId?: string,
  deps?: DayWeekHandlerDeps
) {
  const { token, showMessage } = deps!;
  
  const response = await fetch(`/api/nutrition/weeks/${weekId}/notes`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ notes, periodId })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', 'Week notes updated successfully');
    return data;
  } else {
    throw new Error(data.error || 'Failed to update week notes');
  }
}

/**
 * Import workouts from Yearly Plan to Workouts Done
 */
export async function importWorkouts(
  workoutIds: string[],
  targetDate?: string,
  deps?: DayWeekHandlerDeps
) {
  const { token, showMessage } = deps!;
  
  const response = await fetch('/api/nutrition/import-from-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ workoutIds, targetDate })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    showMessage('success', data.message || 'Workouts imported successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to import workouts');
  }
}

/**
 * Create yearly plan from start date
 */
export async function createYearlyPlan(
  startDate: Date,
  deps: DayWeekHandlerDeps
) {
  const { token, showMessage } = deps;
  
  const response = await fetch('/api/nutrition/plan/create-yearly', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ startDate: startDate.toISOString() })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    console.log('✅ Plan created! Response data:', data);
    console.log('📊 Plan has', data.plan?.weeks?.length, 'weeks');
    showMessage('success', data.message || 'Yearly plan created successfully!');
    return data;
  } else {
    throw new Error(data.error || 'Failed to create yearly plan');
  }
}

