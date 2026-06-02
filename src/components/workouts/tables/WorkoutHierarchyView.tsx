'use client';

import React, { useState } from 'react';
import { sortWorkoutsForDisplay } from '@/lib/workoutDisplayOrder';
import WorkoutTable from './WorkoutTable';

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
  onCopyWorkoutToClipboard?: (workout: any) => void;
  hasWorkoutClipboard?: boolean;
  onCopyWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyMoveframeToClipboard?: (moveframe: any) => void;
  hasMoveframeClipboard?: boolean;
  onPasteMoveframe?: (workout: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any, workoutDisplayNumber?: number) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any, workoutDisplayNumber?: number) => void;
  hasMovelapClipboard?: boolean;
  movelapClipboard?: any;
  onCopyMovelapToClipboard?: (movelap: any) => void;
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
  onCopyWorkoutToClipboard,
  hasWorkoutClipboard,
  onCopyWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyMoveframeToClipboard,
  hasMoveframeClipboard,
  onPasteMoveframe,
  onCopyMoveframe,
  onMoveMoveframe,
  hasMovelapClipboard,
  movelapClipboard,
  onCopyMovelapToClipboard,
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

  const workouts = sortWorkoutsForDisplay(day.workouts);
  
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
              onCopyWorkoutToClipboard={() => onCopyWorkoutToClipboard?.(workout)}
              hasWorkoutClipboard={hasWorkoutClipboard}
              onCopyWorkout={() => onCopyWorkout?.(workout, day)}
              onPasteWorkout={() => onPasteWorkout?.(day)}
              onMoveWorkout={() => onMoveWorkout?.(workout, day)}
              onCopyMoveframeToClipboard={onCopyMoveframeToClipboard}
              hasMoveframeClipboard={hasMoveframeClipboard}
              onPasteMoveframe={onPasteMoveframe}
              onCopyMoveframe={(moveframe) =>
                onCopyMoveframe?.(moveframe, workout, day, workoutIndex)
              }
              onMoveMoveframe={(moveframe) =>
                onMoveMoveframe?.(moveframe, workout, day, workoutIndex)
              }
              hasMovelapClipboard={hasMovelapClipboard}
              movelapClipboard={movelapClipboard}
              onCopyMovelapToClipboard={onCopyMovelapToClipboard}
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

