'use client';

import React, { useState } from 'react';
import WorkoutTable from './WorkoutTable';
import MoveframeTable from './MoveframeTable';
import MovelapTable from './MovelapTable';

interface WorkoutHierarchyViewProps {
  day: any;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  expandedWorkouts?: Set<string>;
  fullyExpandedWorkouts?: Set<string>; // Workouts with moveframes visible
  workoutsWithExpandedMovelaps?: Set<string>; // Workouts with movelaps expanded
  expandedMoveframeId?: string | null;
  expandState?: number; // 0 = collapsed, 1 = workouts only, 2 = workouts + moveframes
  onToggleWorkout?: (workoutId: string) => void;
  onExpandOnlyThisWorkout?: (workout: any, day: any) => void;
  onAddWorkout?: (day: any) => void;
  onEditWorkout?: (workout: any, day: any) => void;
  onEditMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onEditMovelap?: (movelap: any, moveframe: any, workout: any, day: any) => void;
  onAddMoveframe?: (workout: any, day: any) => void;
  onAddMoveframeAfter?: (moveframe: any, index: number, workout: any, day: any) => void;
  onAddMovelap?: (moveframe: any, workout: any, day: any) => void;
  onAddMovelapAfter?: (movelap: any, index: number, moveframe: any, workout: any, day: any) => void;
  onDeleteWorkout?: (workout: any, day: any) => void;
  onSaveFavoriteWorkout?: (workout: any, day: any) => void;
  onShareWorkout?: (workout: any, day: any) => void;
  onExportPdfWorkout?: (workout: any, day: any) => void;
  onPrintWorkout?: (workout: any, day: any) => void;
  onDeleteMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onDeleteMovelap?: (movelap: any, moveframe: any, workout: any, day: any) => void;
  onCopyWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'moveframe' | 'movelap') => void;
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
  workoutsWithExpandedMovelaps,
  expandedMoveframeId,
  expandState = 2, // Default to fully expanded (workouts + moveframes)
  onToggleWorkout,
  onExpandOnlyThisWorkout,
  onAddWorkout,
  onEditWorkout,
  onEditMoveframe,
  onEditMovelap,
  onAddMoveframe,
  onAddMoveframeAfter,
  onAddMovelap,
  onAddMovelapAfter,
  onDeleteWorkout,
  onSaveFavoriteWorkout,
  onShareWorkout,
  onExportPdfWorkout,
  onPrintWorkout,
  onDeleteMoveframe,
  onDeleteMovelap,
  onCopyWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyMoveframe,
  onMoveMoveframe,
  onOpenColumnSettings,
  onShowWorkoutOverview,
  reloadWorkouts,
  columnSettings
}: WorkoutHierarchyViewProps) {
  const [expandedMoveframes, setExpandedMoveframes] = useState<Set<string>>(new Set());
  
  // Use empty Set if not provided
  const expandedWorkoutsSet = expandedWorkouts || new Set<string>();

  const toggleMoveframeExpansion = (moveframeId: string) => {
    setExpandedMoveframes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moveframeId)) {
        newSet.delete(moveframeId);
      } else {
        newSet.add(moveframeId);
      }
      return newSet;
    });
  };

  // Sort workouts by creation time (earliest = #1)
  const workouts = day.workouts 
    ? [...day.workouts].sort((a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id) || 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id) || 0;
        return timeA - timeB;
      })
    : [];
  
  console.log(`📋 WorkoutHierarchyView rendering for day with ${workouts.length} workouts`);
  console.log(`📋 Expanded workouts in view:`, Array.from(expandedWorkoutsSet));

  return (
    <div className="space-y-6">
      {workouts.map((workout: any, workoutIndex: number) => {
        const isWorkoutExpanded = expandedWorkoutsSet.has(workout.id);
        console.log(`📋 Rendering workout ${workout.id}, isExpanded: ${isWorkoutExpanded}`);
        
        return (
          <div key={workout.id} className="space-y-4 ml-8">
            {/* WORKOUT TABLE - Level 1: Indented from day */}
            <WorkoutTable
              day={day}
              workout={workout}
              workoutIndex={workoutIndex}
              weekNumber={day.weekNumber}
              periodName={day.period?.name}
              activeSection={activeSection}
              iconType={iconType}
              isExpanded={isWorkoutExpanded}
              expandedMoveframeId={expandedMoveframeId}
              showMoveframes={expandState === 2 || (fullyExpandedWorkouts && fullyExpandedWorkouts.has(workout.id))} // Show moveframes when Expand All is in state 2 OR when individually fully expanded
              expandMovelaps={workoutsWithExpandedMovelaps?.has(workout.id) || false} // Expand movelaps when workout is in the set
              onToggleExpand={() => onToggleWorkout?.(workout.id)}
              onExpandOnlyThis={(workout, day) => onExpandOnlyThisWorkout?.(workout, day)}
              onEdit={() => onEditWorkout?.(workout, day)}
              onDelete={() => onDeleteWorkout?.(workout, day)}
              onSaveFavorite={() => onSaveFavoriteWorkout?.(workout, day)}
              onShareWorkout={(workout, day) => onShareWorkout?.(workout, day)}
              onExportPdfWorkout={(workout, day) => onExportPdfWorkout?.(workout, day)}
              onPrintWorkout={(workout, day) => onPrintWorkout?.(workout, day)}
              onShowOverview={() => onShowWorkoutOverview?.(workout, day)}
              onAddMoveframe={() => onAddMoveframe?.(workout, day)}
              onAddMoveframeAfter={(moveframe, index) => onAddMoveframeAfter?.(moveframe, index, workout, day)}
              onEditMoveframe={(moveframe) => onEditMoveframe?.(moveframe, workout, day)}
              onDeleteMoveframe={(moveframe) => onDeleteMoveframe?.(moveframe, workout, day)}
              onEditMovelap={(movelap, moveframe) => onEditMovelap?.(movelap, moveframe, workout, day)}
              onDeleteMovelap={(movelap, moveframe) => onDeleteMovelap?.(movelap, moveframe, workout, day)}
              onAddMovelap={(moveframe) => onAddMovelap?.(moveframe, workout, day)}
              onAddMovelapAfter={(movelap, index, moveframe) => onAddMovelapAfter?.(movelap, index, moveframe, workout, day)}
              onCopyWorkout={() => onCopyWorkout?.(workout, day)}
              onPasteWorkout={() => onPasteWorkout?.(day)}
              onMoveWorkout={() => onMoveWorkout?.(workout, day)}
              onCopyMoveframe={(moveframe) => onCopyMoveframe?.(moveframe, workout, day)}
              onMoveMoveframe={(moveframe) => onMoveMoveframe?.(moveframe, workout, day)}
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

