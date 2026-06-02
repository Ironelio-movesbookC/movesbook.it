/**
 * Drag & Drop Handlers - Handle drag and drop operations
 * Extracted from WorkoutSection.tsx for better maintainability
 */

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export interface DragDropHandlerDeps {
  token: string | null;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  loadWorkoutData: (section?: any) => Promise<void>;
  activeSection: string;
}

/**
 * Handle same-workout moveframe reordering
 */
export async function handleSameWorkoutMoveframeReorder(
  sourceMoveframeId: string,
  targetMoveframeId: string,
  workout: any,
  deps: DragDropHandlerDeps
) {
  const { token, showMessage, loadWorkoutData, activeSection } = deps;
  
  console.log('🔄 Reordering moveframes:', { sourceMoveframeId, targetMoveframeId, workoutId: workout.id });
  
  const moveframes = workout.moveframes || [];
  const sourceIndex = moveframes.findIndex((m: any) => m.id === sourceMoveframeId);
  const targetIndex = moveframes.findIndex((m: any) => m.id === targetMoveframeId);
  
  if (sourceIndex === -1 || targetIndex === -1) {
    console.error('❌ Could not find source or target moveframe');
    return;
  }
  
  // Create new order
  const reorderedMoveframes = [...moveframes];
  const [removed] = reorderedMoveframes.splice(sourceIndex, 1);
  reorderedMoveframes.splice(targetIndex, 0, removed);
  
  const moveframeIds = reorderedMoveframes.map((m: any) => m.id);
  
  try {
    const response = await fetch('/api/workouts/moveframes/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ workoutId: workout.id, moveframeIds })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showMessage('success', 'Moveframes reordered successfully');
      await loadWorkoutData(activeSection);
    } else {
      showMessage('error', data.error || 'Failed to reorder moveframes');
    }
  } catch (error) {
    console.error('Error reordering moveframes:', error);
    showMessage('error', 'Failed to reorder moveframes');
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
  const { token, showMessage, loadWorkoutData, activeSection } = deps;
  
  console.log('🔄 Reordering workouts:', { sourceWorkoutId, targetWorkoutId, dayId: day.id });
  
  const workouts = day.workouts || [];
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
    const response = await fetch('/api/workouts/sessions/reorder', {
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
      await loadWorkoutData(activeSection);
    } else {
      showMessage('error', data.error || 'Failed to reorder workouts');
    }
  } catch (error) {
    console.error('Error reordering workouts:', error);
    showMessage('error', 'Failed to reorder workouts');
  }
}

/**
 * Handle moveframe drag to different workout
 */
export async function handleMoveframeCrossWorkoutDrag(
  action: 'copy' | 'move',
  sourceMoveframe: any,
  targetWorkout: any,
  position: 'before' | 'after' | 'end',
  targetMoveframe?: any,
  deps?: DragDropHandlerDeps
) {
  const { token, showMessage, loadWorkoutData, activeSection } = deps!;
  
  console.log('🔄 Cross-workout moveframe drag:', { action, position, sourceMoveframe: sourceMoveframe.id, targetWorkout: targetWorkout.id });
  
  const endpoint = action === 'copy' 
    ? '/api/workouts/moveframes/copy' 
    : '/api/workouts/moveframes/move';
  
  try {
    const apiPosition =
      position === 'end' ? 'after' : position === 'before' ? 'before' : 'after';

    const requestBody: Record<string, string> = {
      sourceMoveframeId: sourceMoveframe.id,
      targetWorkoutId: targetWorkout.id,
      position: apiPosition,
    };

    if (action === 'move') {
      requestBody.moveframeId = sourceMoveframe.id;
    }

    if (targetMoveframe?.id) {
      requestBody.targetMoveframeId = targetMoveframe.id;
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
    
    if (response.ok) {
      showMessage('success', `Moveframe ${action}d successfully`);
      await loadWorkoutData(activeSection);
    } else {
      showMessage('error', data.error || `Failed to ${action} moveframe`);
    }
  } catch (error) {
    console.error(`Error ${action}ing moveframe:`, error);
    showMessage('error', `Failed to ${action} moveframe`);
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
  const { token, showMessage, loadWorkoutData, activeSection } = deps;
  
  console.log('🔄 Cross-day workout drag:', { action, sourceWorkout: sourceWorkout.id, targetDay: targetDay.id });
  
  const endpoint = action === 'copy' 
    ? '/api/workouts/sessions/copy' 
    : '/api/workouts/sessions/move';
  
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
      await loadWorkoutData(activeSection);
    } else {
      showMessage('error', data.error || `Failed to ${action} workout`);
    }
  } catch (error) {
    console.error(`Error ${action}ing workout:`, error);
    showMessage('error', `Failed to ${action} workout`);
  }
}

