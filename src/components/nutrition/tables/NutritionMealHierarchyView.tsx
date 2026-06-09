'use client';

import React, { useState } from 'react';
import NutritionMealTable from './NutritionMealTable';

const ACTION_TIME_TAG = /\[ACTION_TIME\](\d{2}:\d{2})\[\/ACTION_TIME\]/;
const ACTION_TITLE_TAG = /\[ACTION_TITLE\]([\s\S]*?)\[\/ACTION_TITLE\]/;

function extractActionShortTitle(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  const m = rawDescription.match(ACTION_TITLE_TAG);
  return (m?.[1] || '').trim();
}

function extractActionStartTime(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  const m = rawDescription.match(ACTION_TIME_TAG);
  return m?.[1] ?? '';
}

function stripActionMetaTags(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  return rawDescription
    .replace(ACTION_TITLE_TAG, '')
    .replace(ACTION_TIME_TAG, '')
    .trim();
}
import NutritionFoodTable from './FoodTable';
import NutritionComponentTable from './ComponentTable';

interface WorkoutHierarchyViewProps {
  day: any;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  expandedWorkouts?: Set<string>;
  fullyExpandedWorkouts?: Set<string>; // Workouts with nutritionFoods visible
  workoutsWithExpandedNutritionComponents?: Set<string>; // Workouts with nutrition_components expanded
  expandedNutritionFoodId?: string | null;
  expandState?: number; // 0 = collapsed, 1 = workouts only, 2 = workouts + nutrition_foods
  onToggleWorkout?: (nutritionMealId: string) => void;
  onExpandOnlyThisWorkout?: (workout: any, day: any) => void;
  onAddWorkout?: (day: any) => void;
  onEditWorkout?: (workout: any, day: any) => void;
  onEditNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onEditNutritionComponent?: (nutritionComponent: any, nutritionFood: any, workout: any, day: any) => void;
  onAddNutritionFood?: (workout: any, day: any) => void;
  onAddNutritionFoodAfter?: (nutritionFood: any, index: number, workout: any, day: any) => void;
  onAddNutritionComponent?: (nutritionFood: any, workout: any, day: any) => void;
  onAddNutritionComponentAfter?: (nutritionComponent: any, index: number, nutritionFood: any, workout: any, day: any) => void;
  onDeleteWorkout?: (workout: any, day: any) => void;
  onSaveFavoriteNutritionMeal?: (workout: any, day: any) => void;
  onShareWorkout?: (workout: any, day: any) => void;
  onExportPdfWorkout?: (workout: any, day: any) => void;
  onPrintWorkout?: (workout: any, day: any) => void;
  onDeleteNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onDeleteNutritionComponent?: (nutritionComponent: any, nutritionFood: any, workout: any, day: any) => void;
  onCopyWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onMoveNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'nutritionFood' | 'nutritionComponent') => void;
  onShowWorkoutOverview?: (workout: any, day: any) => void;
  reloadWorkouts?: () => Promise<void>;
  columnSettings?: any;
}

export default function WorkoutHierarchyView({
  day,
  activeSection,
  iconType,
  expandedWorkouts,
  fullyExpandedWorkouts,
  workoutsWithExpandedNutritionComponents,
  expandedNutritionFoodId,
  expandState = 2, // Default to fully expanded (workouts + nutritionFoods)
  onToggleWorkout,
  onExpandOnlyThisWorkout,
  onAddWorkout,
  onEditWorkout,
  onEditNutritionFood,
  onEditNutritionComponent,
  onAddNutritionFood,
  onAddNutritionFoodAfter,
  onAddNutritionComponent,
  onAddNutritionComponentAfter,
  onDeleteWorkout,
  onSaveFavoriteNutritionMeal,
  onShareWorkout,
  onExportPdfWorkout,
  onPrintWorkout,
  onDeleteNutritionFood,
  onDeleteNutritionComponent,
  onCopyWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyNutritionFood,
  onMoveNutritionFood,
  onOpenColumnSettings,
  onShowWorkoutOverview,
  reloadWorkouts,
  columnSettings
}: WorkoutHierarchyViewProps) {
  const [expandedNutritionFoods, setExpandedNutritionFoods] = useState<Set<string>>(new Set());
  
  // Use empty Set if not provided
  const expandedWorkoutsSet = expandedWorkouts || new Set<string>();

  const toggleNutritionFoodExpansion = (nutritionFoodId: string) => {
    setExpandedNutritionFoods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nutritionFoodId)) {
        newSet.delete(nutritionFoodId);
      } else {
        newSet.add(nutritionFoodId);
      }
      return newSet;
    });
  };

  // Sort workouts by creation time (earliest = #1)
  const workouts = day.meals 
    ? [...day.meals].sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id) || 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id) || 0;
        return timeA - timeB;
      })
    : [];
  
  console.log(`📋 WorkoutHierarchyView rendering for day with ${workouts.length} workouts`);
  console.log(`📋 Expanded workouts in view:`, Array.from(expandedWorkoutsSet));

  const planned = Array.isArray(day.plannedActions) ? day.plannedActions : [];

  return (
    <div className="space-y-6">
      {planned.length > 0 && (
        <div className="ml-8 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Planned actions
          </div>
          <div className="flex flex-wrap gap-2">
            {planned.map((pa: any) => (
              <div
                key={pa.id}
                className="rounded-lg border-2 px-3 py-2 text-sm shadow-sm max-w-md"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  borderColor: pa.colorSnapshot || '#cbd5e1',
                }}
                title={stripActionMetaTags(pa.description || '') || pa.nameSnapshot || ''}
              >
                <span className="mr-2">{pa.iconSnapshot || '•'}</span>
                <span
                  className="inline-block w-3 h-3 rounded-full border border-gray-300 align-middle mr-2"
                  style={{ backgroundColor: pa.colorSnapshot || '#6366f1' }}
                  title={pa.nameSnapshot || 'Action color'}
                />
                <span className="font-medium">{pa.nameSnapshot}</span>
                {extractActionShortTitle(pa.description || '') && (
                  <span
                    className="ml-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium border"
                    style={{
                      backgroundColor: pa.backgroundColor || '#f8fafc',
                      color: pa.textColor || '#111827',
                      borderColor: pa.colorSnapshot || '#cbd5e1',
                    }}
                  >
                    {extractActionShortTitle(pa.description || '')}
                  </span>
                )}
                {extractActionStartTime(pa.description || '') && (
                  <span className="ml-2 text-xs text-gray-500">
                    {extractActionStartTime(pa.description || '')}
                  </span>
                )}
                {pa.url ? (
                  <a
                    href={pa.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs underline break-all"
                  >
                    link
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {workouts.map((workout: any, workoutIndex: number) => {
        const isWorkoutExpanded = expandedWorkoutsSet.has(workout.id);
        console.log(`📋 Rendering workout ${workout.id}, isExpanded: ${isWorkoutExpanded}`);
        
        return (
          <div key={workout.id} className="space-y-4 ml-8">
            {/* WORKOUT TABLE - Level 1: Indented from day */}
            <NutritionMealTable
              day={day}
              workout={workout}
              workoutIndex={workoutIndex}
              weekNumber={day.weekNumber}
              periodName={day.period?.name}
              activeSection={activeSection}
              iconType={iconType}
              isExpanded={isWorkoutExpanded}
              expandedNutritionFoodId={expandedNutritionFoodId}
              showNutritionFoods={expandState === 2 || (fullyExpandedWorkouts && fullyExpandedWorkouts.has(workout.id))} // Show nutritionFoods when Expand All is in state 2 OR when individually fully expanded
              expandNutritionComponents={workoutsWithExpandedNutritionComponents?.has(workout.id) || false} // Expand nutrition_components when workout is in the set
              onToggleExpand={() => onToggleWorkout?.(workout.id)}
              onExpandOnlyThis={(workout, day) => onExpandOnlyThisWorkout?.(workout, day)}
              onEdit={() => onEditWorkout?.(workout, day)}
              onDelete={() => onDeleteWorkout?.(workout, day)}
              onSaveFavorite={() => onSaveFavoriteNutritionMeal?.(workout, day)}
              onShareWorkout={(workout, day) => onShareWorkout?.(workout, day)}
              onExportPdfWorkout={(workout, day) => onExportPdfWorkout?.(workout, day)}
              onPrintWorkout={(workout, day) => onPrintWorkout?.(workout, day)}
              onShowOverview={() => onShowWorkoutOverview?.(workout, day)}
              onAddNutritionFood={() => onAddNutritionFood?.(workout, day)}
              onAddNutritionFoodAfter={(nutritionFood, index) => onAddNutritionFoodAfter?.(nutritionFood, index, workout, day)}
              onEditNutritionFood={(nutritionFood) => onEditNutritionFood?.(nutritionFood, workout, day)}
              onDeleteNutritionFood={(nutritionFood) => onDeleteNutritionFood?.(nutritionFood, workout, day)}
              onEditNutritionComponent={(nutritionComponent, nutritionFood) => onEditNutritionComponent?.(nutritionComponent, nutritionFood, workout, day)}
              onDeleteNutritionComponent={(nutritionComponent, nutritionFood) => onDeleteNutritionComponent?.(nutritionComponent, nutritionFood, workout, day)}
              onAddNutritionComponent={(nutritionFood) => onAddNutritionComponent?.(nutritionFood, workout, day)}
              onAddNutritionComponentAfter={(nutritionComponent, index, nutritionFood) => onAddNutritionComponentAfter?.(nutritionComponent, index, nutritionFood, workout, day)}
              onCopyWorkout={() => onCopyWorkout?.(workout, day)}
              onPasteWorkout={() => onPasteWorkout?.(day)}
              onMoveWorkout={() => onMoveWorkout?.(workout, day)}
              onCopyNutritionFood={(nutritionFood) => onCopyNutritionFood?.(nutritionFood, workout, day)}
              onMoveNutritionFood={(nutritionFood) => onMoveNutritionFood?.(nutritionFood, workout, day)}
              onOpenColumnSettings={onOpenColumnSettings}
              onRefreshWorkouts={reloadWorkouts}
              columnSettings={columnSettings}
            />
          </div>
        );
      })}
    </div>
  );
}

