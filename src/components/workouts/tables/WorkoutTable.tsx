'use client';

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { GripVertical, MoreVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { useColorSettings } from '@/hooks/useColorSettings';
import { isSeriesBasedSport, getDistTimeColumnHeader, isDistanceBasedSport } from '@/constants/moveframe.constants';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import MoveframesSection from './MoveframesSection';

// Helper function to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface WorkoutTableProps {
  day: any;
  workout: any;
  workoutIndex: number;
  weekNumber?: number;
  periodName?: string;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  isExpanded?: boolean;
  expandedMoveframeId?: string | null;
  showMoveframes?: boolean; // Control whether to show moveframes (for 3-state expand)
  expandMovelaps?: boolean; // Control whether to expand all movelaps (for 3-state expand)
  onToggleExpand?: () => void;
  onExpandOnlyThis?: (workout: any, day: any) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveFavorite?: () => void;
  onShowOverview?: () => void;
  onShareWorkout?: (workout: any, day: any) => void;
  onExportPdfWorkout?: (workout: any, day: any) => void;
  onPrintWorkout?: (workout: any, day: any) => void;
  onAddMoveframe: () => void;
  onAddMoveframeAfter?: (moveframe: any, index: number, workout: any, day: any) => void;
  onEditMoveframe?: (moveframe: any) => void;
  onDeleteMoveframe?: (moveframe: any) => void;
  onEditMovelap?: (movelap: any, moveframe: any) => void;
  onDeleteMovelap?: (movelap: any, moveframe: any) => void;
  onAddMovelap?: (moveframe: any) => void;
  onAddMovelapAfter?: (movelap: any, index: number, moveframe: any, workout: any, day: any) => void;
  onCopyWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onShowMoveframeInfoPanel?: (moveframe: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'moveframe' | 'movelap') => void;
  onBulkAddMovelap?: (moveframe: any) => void;
  onRefreshWorkouts?: () => Promise<void>;
  columnSettings?: any;
}

export default function WorkoutTable({
  day,
  workout,
  workoutIndex,
  weekNumber,
  periodName,
  activeSection,
  iconType: iconTypeProp,
  isExpanded = false,
  expandedMoveframeId,
  showMoveframes = true,
  expandMovelaps = false,
  onToggleExpand,
  onExpandOnlyThis,
  onEdit,
  onDelete,
  onSaveFavorite,
  onShowOverview,
  onShareWorkout,
  onExportPdfWorkout,
  onPrintWorkout,
  onAddMoveframe,
  onAddMoveframeAfter,
  onEditMoveframe,
  onDeleteMoveframe,
  onEditMovelap,
  onDeleteMovelap,
  onAddMovelap,
  onAddMovelapAfter,
  onCopyWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyMoveframe,
  onMoveMoveframe,
  onOpenColumnSettings,
  onRefreshWorkouts,
  columnSettings
}: WorkoutTableProps) {
  // Get sport icon type from user settings or prop
  const defaultIconType = useSportIconType();
  const iconType = iconTypeProp || defaultIconType;
  const { colors, getBorderStyle } = useColorSettings();
  
  // Track if user clicked the workout number to expand all movelaps
  const [autoExpandAllMovelaps, setAutoExpandAllMovelaps] = React.useState(false);

  // Click popup state for main/secondary work (toggle on/off)
  const [clickedMoveframe, setClickedMoveframe] = React.useState<any>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [clickedCellElement, setClickedCellElement] = React.useState<HTMLElement | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Update popup position when scrolling to keep it attached to the cell
  React.useEffect(() => {
    if (!clickedCellElement || !clickedMoveframe) return;

    const updatePosition = () => {
      const rect = clickedCellElement.getBoundingClientRect();
      setPopupPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.bottom + 10 
      });
    };

    // Update position on scroll
    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [clickedCellElement, clickedMoveframe]);

  // Close popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside the popup
      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }
      
      // Don't close if clicking on one of the main/secondary work cells
      if (target.closest('.main-secondary-work-cell')) {
        return;
      }
      
      // Close the popup
      setClickedMoveframe(null);
      setPopupPosition(null);
      setClickedCellElement(null);
    };

    if (clickedMoveframe) {
      // Small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [clickedMoveframe]);

  // Dropdown state management
  const {
    isOpen: isOptionsOpen,
    buttonRef: optionsButtonRef,
    dropdownContentRef,
    dropdownPosition,
    isMounted,
    openDropdown,
    closeDropdown
  } = useDropdownPosition();

  // Reset auto-expand when workout is collapsed
  React.useEffect(() => {
    if (!isExpanded) {
      setAutoExpandAllMovelaps(false);
    }
  }, [isExpanded]);
  
  // Draggable hook for workout
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging
  } = useDraggable({
    id: `workout-${workout.id}`,
    data: {
      type: 'workout',
      workout: workout,
      day: day
    }
  });

  // Droppable hook for moveframe drops
  const {
    setNodeRef: setDropNodeRef,
    isOver: isDropOver
  } = useDroppable({
    id: `workout-drop-${workout.id}`,
    data: {
      type: 'workout',
      workout: workout,
      day: day
    }
  });

  // Calculate sport totals from moveframes and workout sessions
  const calculateSportTotals = () => {
    console.log(`🔍 [WorkoutTable] calculateSportTotals - workout.sports:`, workout.sports);
    console.log(`🔍 [WorkoutTable] workout.moveframes:`, workout.moveframes?.length || 0);
    
    // IMPORTANT: workout.sports is often empty, so we calculate sports from moveframes
    // Get unique sports from moveframes in the order they appear
    const sportsFromMoveframes: string[] = [];
    (workout.moveframes || []).forEach((mf: any) => {
      if (mf.sport && !sportsFromMoveframes.includes(mf.sport)) {
        sportsFromMoveframes.push(mf.sport);
      }
    });
    
    // IMPORTANT FIX: Only use workout.sports if there are NO moveframes
    // This prevents "ghost" sports from showing in new workouts
    const workoutSportNames = (workout.moveframes && workout.moveframes.length > 0)
      ? sportsFromMoveframes 
      : [];  // Empty array for workouts with no moveframes, regardless of workout.sports
    
    console.log(`🔍 [WorkoutTable] Sports found in moveframes:`, sportsFromMoveframes);
    console.log(`🔍 [WorkoutTable] Using sports:`, workoutSportNames);
    
    // Build a map of totals from moveframes
    const sportMap = new Map<string, { distance: number; durationSeconds: number; series: number; repetitions: number; k: string }>();
    
    // Calculate from moveframes
    (workout.moveframes || []).forEach((mf: any) => {
      const sport = mf.sport || 'Unknown';
      if (!sportMap.has(sport)) {
        sportMap.set(sport, { distance: 0, durationSeconds: 0, series: 0, repetitions: 0, k: '' });
      }
      
      const totals = sportMap.get(sport)!;
      const isSeries = isSeriesBasedSport(sport);
      
      if (isSeries) {
        // For NON-AEROBIC (series-based) sports
        if (mf.manualMode) {
          // For manual input: use the repetitions field from moveframe (since movelaps may not exist)
          const totalSeries = mf.repetitions || 0;
          totals.series += totalSeries;
          
          // Manual mode series-based sports don't have movelaps, so repetitions is the count
          totals.repetitions += totalSeries;
        } else {
          // For standard mode: count movelaps as series
          const totalSeries = mf.movelaps?.length || 0;
          totals.series += totalSeries;
          
          // Sum actual reps from all movelaps
          (mf.movelaps || []).forEach((lap: any) => {
            totals.repetitions += parseInt(lap.reps) || 0;
          });
        }
      } else {
        // For AEROBIC (distance-based) sports
        // Sum distances and duration from movelaps (works for both manual and standard mode)
        (mf.movelaps || []).forEach((lap: any) => {
          // Add distance
          if (lap.distance) {
            totals.distance += parseInt(lap.distance) || 0;
          }
          
          // Add duration (parse time in various formats: "1h23'45"6", "00:05:30", or minutes)
          if (lap.time) {
            const timeStr = lap.time.toString();
            let totalSeconds = 0;
            
            // Check for our custom format: 1h23'45"6
            if (timeStr.includes('h') || timeStr.includes("'")) {
              const match = timeStr.match(/(\d+)h(\d+)'(\d+)"(\d)?/);
              if (match) {
                const hours = parseInt(match[1]) || 0;
                const minutes = parseInt(match[2]) || 0;
                const seconds = parseInt(match[3]) || 0;
                totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
              }
            }
            // Check for HH:MM:SS format
            else if (timeStr.includes(':')) {
              const parts = timeStr.split(':');
              const hours = parseInt(parts[0]) || 0;
              const minutes = parseInt(parts[1]) || 0;
              const seconds = parseInt(parts[2]) || 0;
              totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
            }
            // Plain number (assume minutes)
            else {
              const mins = parseFloat(timeStr) || 0;
              totalSeconds = mins * 60;
            }
            
            if (totalSeconds > 0) {
              totals.durationSeconds += totalSeconds;
            }
          }
        });
      }
    });
    
    // Format duration as HH:MM:SS (compact)
    const formatDuration = (seconds: number): string => {
      if (seconds === 0) return '00:00:00';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Build array of sports (up to 4), using the sports found
    const sportsArray = [];
    const maxSports = 4; // Maximum sports to display
    const sportsToShow = Math.min(workoutSportNames.length, maxSports);
    
    for (let i = 0; i < maxSports; i++) {
      const sportName = workoutSportNames[i];
      if (sportName) {
        // Sport is defined in workout - show it with totals (or empty if no moveframes yet)
        const totals = sportMap.get(sportName);
        const isSeries = isSeriesBasedSport(sportName);
        
        // Find all moveframes of this sport in THIS workout only (not all workouts in the day)
        const allMoveframesOfSport: any[] = [];
        if (workout.moveframes) {
          workout.moveframes.forEach((mf: any) => {
              if (mf.sport === sportName) {
                allMoveframesOfSport.push(mf);
              }
            });
          }

        // Find explicitly set main/secondary work
        let mainWork = allMoveframesOfSport.find((mf: any) => mf.workType === 'MAIN');
        let secondaryWork = allMoveframesOfSport.find((mf: any) => mf.workType === 'SECONDARY');
        
        // CRITICAL: Prevent same moveframe from being both main and secondary
        if (mainWork && secondaryWork && mainWork.id === secondaryWork.id) {
          console.warn(`⚠️ [WorkoutTable] Same moveframe (${mainWork.letter}) set as both MAIN and SECONDARY - clearing secondary`);
          secondaryWork = null;
        }
        
        // Debug logging
        console.log(`🔍 [WorkoutTable] Sport ${sportName} - ${allMoveframesOfSport.length} moveframes:`, 
          allMoveframesOfSport.map(mf => ({
            id: mf.id,
            letter: mf.letter,
            workType: mf.workType,
            hasWorkType: mf.hasOwnProperty('workType'),
            description: mf.description?.substring(0, 30)
          }))
        );
        console.log(`   [WorkoutTable] Main work found:`, mainWork ? `${mainWork.letter} (${mainWork.workType})` : 'None');
        console.log(`   [WorkoutTable] Secondary work found:`, secondaryWork ? `${secondaryWork.letter} (${secondaryWork.workType})` : 'None');
        
        // NOTE: Removed automatic fallback logic
        // Moveframes will ONLY appear in main/secondary work columns when explicitly set via workType
        // Users must double-click the moveframe letter to set workType to 'MAIN' or 'SECONDARY'
        
        // Get display content - for manual mode, ALWAYS use notes first (full content)
        // Prepend workout section CODE (max 5 chars) before description
        const getDisplayContent = (mf: any) => {
          if (!mf) return '';
          
          // Get the description content
          const description = mf.manualMode 
            ? (mf.notes || mf.description || '') 
            : (mf.description || '');
          
          // Prepend section code if it exists
          const sectionCode = mf.section?.code;
          if (sectionCode && description) {
            return `${sectionCode} - ${description}`;
          }
          
          return description;
        };
        
        sportsArray.push({
          name: sportName.replace(/_/g, ' '), // Remove underscores and replace with spaces
          icon: getSportIcon(sportName, iconType),
          isSeriesBased: isSeries,
          distance: totals ? (isSeries ? totals.series : totals.distance) : 0,
          duration: totals ? (isSeries ? totals.repetitions.toString() : formatDuration(totals.durationSeconds)) : '00:00:00',
          k: totals ? totals.k : '',
          mainWork: getDisplayContent(mainWork),
          secondaryWork: getDisplayContent(secondaryWork),
          mainWorkMoveframe: mainWork || null,
          secondaryWorkMoveframe: secondaryWork || null
        });
      } else {
        // Empty slot - no sport defined for this position
        console.log(`⚠️ [WorkoutTable] Empty sport slot at position ${i}`);
        sportsArray.push({ name: '', icon: '', isSeriesBased: false, distance: 0, duration: '', k: '', mainWork: '', secondaryWork: '', mainWorkMoveframe: null, secondaryWorkMoveframe: null });
      }
    }
    
    return sportsArray;
  };
  
  const sports = calculateSportTotals();
  const useImageIcons = isImageIcon(iconType);
  
  // Calculate match percentage (85% + 20%)
  const matchPercentage = workout.completionRate 
    ? `${Math.round(workout.completionRate)}% + ${Math.round(workout.bonusRate || 0)}%`
    : '85% + 20%';

  // Debug: Log workout rendering and sport totals
  console.log(`\n🏋️ ========== WORKOUT TABLE RENDERING ==========`);
  console.log(`🏋️ Workout ID: ${workout.id}, isExpanded: ${isExpanded}`);
  console.log(`🏋️ Workout has ${workout.moveframes?.length || 0} moveframes`);
  console.log(`🏋️ Sport totals:`);
  sports.forEach((s: any, idx: number) => {
    console.log(`   Sport ${idx + 1}: ${s.name}`);
    console.log(`      Main Work: ${s.mainWork || 'EMPTY'}`);
    console.log(`      Secondary Work: ${s.secondaryWork || 'EMPTY'}`);
  });
  console.log(`🏋️ ========== END WORKOUT TABLE ==========\n`);

  return (
      <div 
        ref={setDropNodeRef}
        className={`mb-4 ${isDropOver ? 'ring-4 ring-yellow-400 ring-opacity-75 rounded' : ''}`}
      >
        {/* WORKOUT HEADER BAR - Contains title, day info, and action buttons */}
        <div 
          className="px-4 py-2 rounded-t-lg" 
          style={{
            backgroundColor: workoutIndex % 3 === 0 ? colors.workoutHeader : (workoutIndex % 3 === 1 ? colors.workout2Header : colors.workout3Header),
            color: workoutIndex % 3 === 0 ? colors.workoutHeaderText : (workoutIndex % 3 === 1 ? colors.workout2HeaderText : colors.workout3HeaderText),
            border: getBorderStyle('workout') || '1px solid #e5e7eb'
          }}
        >
          {/* All Controls on Left Side */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Checkbox */}
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer flex-shrink-0"
              title="Select workout"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Drag Handle */}
            <span
              ref={setDragNodeRef}
              {...attributes}
              {...listeners}
              className="cursor-move text-white hover:text-cyan-200 transition-colors inline-block flex-shrink-0"
              title="Drag to move workout"
            >
              <GripVertical size={18} />
            </span>
            
            {/* Toggle and Workout Number */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleExpand) onToggleExpand();
                }}
                className="text-white hover:bg-cyan-500 rounded px-2 py-1 transition-colors font-bold text-base flex-shrink-0"
                title={`Click to ${isExpanded ? 'collapse' : 'expand'} workout`}
              >
                {isExpanded ? '▼' : '►'}
              </button>
              <span className="font-bold text-lg whitespace-nowrap">Workout #{workoutIndex + 1}</span>
            </div>
            
            {/* Day Info */}
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="text-cyan-50">|</span>
              {/* Period color circle */}
              <div
                className="w-4 h-4 rounded-full border border-white flex-shrink-0"
                style={{ backgroundColor: day.period?.color || '#9CA3AF' }}
                title={day.period?.name || 'No period'}
              />
              {/* Period name - black color */}
              <span className="font-medium whitespace-nowrap text-black">
                {day.period?.name || 'No Period'}
              </span>
              {/* Only show weekday if NOT in template mode (activeSection !== 'A') */}
              {activeSection !== 'A' && (
                <>
                  <span className="text-cyan-50">•</span>
                  <span className="whitespace-nowrap text-cyan-50">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                </>
              )}
              {day.weather && (
                <>
                  <span className="text-cyan-50">•</span>
                  <span className="whitespace-nowrap text-cyan-50">{day.weather}</span>
                </>
              )}
            </div>
            
            {/* Separator */}
            <span className="text-white/40 flex-shrink-0">|</span>
            
            {/* Action Buttons - Now on Left Side */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onShowOverview) onShowOverview();
              }}
              className="px-3 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors font-medium whitespace-nowrap flex-shrink-0"
              title="View Workout Overview"
            >
              Overview
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit();
              }}
              className="px-3 py-1 text-xs bg-white text-cyan-600 rounded hover:bg-cyan-50 transition-colors font-medium whitespace-nowrap flex-shrink-0"
              title="View/Edit Workout Info"
            >
              Workout Info
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onAddMoveframe) onAddMoveframe();
              }}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium whitespace-nowrap flex-shrink-0"
              title="Add a Moveframe"
            >
              Add a Moveframe
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onCopyWorkout) onCopyWorkout(workout, day);
              }}
              className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors whitespace-nowrap flex-shrink-0"
              title="Copy Workout"
            >
              Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onMoveWorkout) onMoveWorkout(workout, day);
              }}
              className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors whitespace-nowrap flex-shrink-0"
              title="Move Workout"
            >
              Move
            </button>
            
            {/* Options Dropdown - Between Move and Delete */}
            <div className="relative flex-shrink-0">
              <button 
                ref={optionsButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOptionsOpen) {
                    closeDropdown();
                  } else {
                    openDropdown();
                  }
                }}
                className="px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors whitespace-nowrap flex items-center gap-1"
                title="More Options"
              >
                <MoreVertical size={14} />
                Options
              </button>
              
              {/* Dropdown Menu - Rendered via Portal */}
              {isOptionsOpen && isMounted && ReactDOM.createPortal(
                <div 
                  ref={dropdownContentRef}
                  className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl z-[99999] min-w-[160px]" 
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`
                  }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDropdown();
                      if (onEdit) onEdit();
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-green-50 transition-colors flex items-center gap-2"
                  >
                    <span className="text-green-600">✏️</span>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDropdown();
                      if (onShareWorkout) onShareWorkout(workout, day);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                  >
                    <span className="text-blue-600">🔗</span>
                    <span>Share</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDropdown();
                      if (onExportPdfWorkout) onExportPdfWorkout(workout, day);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                  >
                    <span className="text-red-600">📕</span>
                    <span>Export PDF</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDropdown();
                      if (onSaveFavorite) onSaveFavorite();
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-yellow-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                  >
                    <span className="text-yellow-600">⭐</span>
                    <span>Save in Fav</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDropdown();
                      if (onPrintWorkout) onPrintWorkout(workout, day);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-200"
                  >
                    <span className="text-gray-600">🖨️</span>
                    <span>Print</span>
                  </button>
                </div>,
                document.body
              )}
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete();
              }}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors whitespace-nowrap flex-shrink-0"
              title="Delete Workout"
            >
              Delete
            </button>
          </div>
        </div>
        
        {/* WORKOUT TABLE CONTAINER - Scrollable wrapper */}
        <div className="overflow-x-auto">
          <table 
            className="border-collapse shadow-sm text-sm" 
            style={{ 
              tableLayout: 'fixed', 
              width: '100%',
              minWidth: '1600px',
              backgroundColor: colors.workoutHeader
            }}
          >
          {/* COLUMN HEADERS */}
          <thead 
            className="sticky top-0 z-[500]"
            style={{
              backgroundColor: workoutIndex % 3 === 0 ? colors.workoutHeader : (workoutIndex % 3 === 1 ? colors.workout2Header : colors.workout3Header),
              color: workoutIndex % 3 === 0 ? colors.workoutHeaderText : (workoutIndex % 3 === 1 ? colors.workout2HeaderText : colors.workout3HeaderText)
            }}
          >
            <tr>
              <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-center" style={{ width: '50px' }}>No</th>
              <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-center" style={{ width: '80px' }}>Match</th>
              
              {/* Dynamic headers for each sport */}
              {sports.map((sport, index) => (
                  <React.Fragment key={index}>
                    <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-center" style={{ width: '107px' }}>Sport</th>
                    <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-center" style={{ width: '80px' }}>{getDistTimeColumnHeader(sport.name)}</th>
                    <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-center" style={{ width: '50px' }}>K</th>
                    <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-left" style={{ width: '300px' }}>Main work</th>
                    <th className="border border-gray-200 px-2 py-1 text-xs font-bold text-left" style={{ width: '300px' }}>Secondary work</th>
                  </React.Fragment>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* WORKOUT DATA ROW - Shows sport totals */}
            <tr 
              className="transition-colors hover:opacity-90"
              style={{
                backgroundColor: colors.alternateRow,
                color: colors.alternateRowText
              }}
            >
              {/* Workout number column */}
              <td 
                className="border border-gray-200 px-2 text-xs text-center font-bold align-middle"
                style={{ 
                  backgroundColor: isExpanded ? colors.selectedRow : colors.alternateRow,
                  color: isExpanded ? colors.selectedRowText : colors.alternateRowText,
                  height: '60px' 
                }}
              >
                <span className="text-gray-600 select-none">{workoutIndex + 1}</span>
              </td>
              <td className="border border-gray-200 px-2 text-xs text-center font-semibold text-red-600 align-middle" style={{ height: '60px' }}>
                <div className="whitespace-nowrap text-[10px] leading-tight">{matchPercentage}</div>
              </td>
              
              {/* Sport 1 */}
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '107px', height: '60px' }}>
                {(() => {
                  const sportName = sports[0].name;
                  const words = sportName.split(' ');
                  const isOneWord = words.length === 1;
                  const icon = sports[0].icon && (useImageIcons ? 
                    <img src={sports[0].icon} alt={sportName} className="object-cover rounded flex-shrink-0" style={{ width: '40px', height: '40px', filter: 'grayscale(100%)' }} /> : 
                    <span className="text-base flex-shrink-0">{sports[0].icon}</span>
                  );
                  
                  if (isOneWord) {
                    // One word: icon and name on same line
                    return (
                      <div className="flex items-center justify-center gap-2">
                        {icon}
                        <span className="font-medium whitespace-nowrap">{sportName}</span>
                      </div>
                    );
                  } else {
                    // Two words: icon + first word on first line, second word on second line
                    return (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="font-medium">{words[0]}</span>
                        </div>
                        <span className="font-medium">{words.slice(1).join(' ')}</span>
                      </div>
                    );
                  }
                })()}
              </td>
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '80px', height: '60px' }}>
                <div className="leading-tight">
                  <div className="text-black font-bold text-base">
                    {sports[0].distance > 0 
                      ? (isDistanceBasedSport(sports[0].name) ? `${sports[0].distance}m` : sports[0].distance)
                      : ''}
                  </div>
                  <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sports[0].duration}</div>
                </div>
              </td>
              <td className="border border-gray-200 px-2 text-xs text-center align-middle text-red-600 font-bold" style={{ width: '50px', height: '60px' }}>{sports[0].k}</td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px' }}
                onClick={(e) => {
                  if (sports[0].mainWorkMoveframe) {
                    e.stopPropagation();
                    // Toggle: if same moveframe clicked, close popup; otherwise open new one
                    if (clickedMoveframe?.id === sports[0].mainWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[0].mainWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[0].mainWork) return '';
                    // Create a temporary div to decode HTML entities and strip tags
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[0].mainWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    // Get first 3 lines only
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[0].secondaryWorkMoveframe) {
                    e.stopPropagation();
                    // Toggle: if same moveframe clicked, close popup; otherwise open new one
                    if (clickedMoveframe?.id === sports[0].secondaryWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[0].secondaryWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[0].secondaryWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[0].secondaryWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              
              {/* Sport 2 */}
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '107px', height: '60px' }}>
                {(() => {
                  const sportName = sports[1].name;
                  const words = sportName.split(' ');
                  const isOneWord = words.length === 1;
                  const icon = sports[1].icon && (useImageIcons ? 
                    <img src={sports[1].icon} alt={sportName} className="object-cover rounded flex-shrink-0" style={{ width: '40px', height: '40px', filter: 'grayscale(100%)' }} /> : 
                    <span className="text-base flex-shrink-0">{sports[1].icon}</span>
                  );
                  
                  if (isOneWord) {
                    // One word: icon and name on same line
                    return (
                      <div className="flex items-center justify-center gap-2">
                        {icon}
                        <span className="font-medium whitespace-nowrap">{sportName}</span>
                      </div>
                    );
                  } else {
                    // Two words: icon + first word on first line, second word on second line
                    return (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="font-medium">{words[0]}</span>
                        </div>
                        <span className="font-medium">{words.slice(1).join(' ')}</span>
                      </div>
                    );
                  }
                })()}
              </td>
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '80px', height: '60px' }}>
                <div className="leading-tight">
                  <div className="text-black font-bold text-base">
                    {sports[1].distance > 0 
                      ? (isDistanceBasedSport(sports[1].name) ? `${sports[1].distance}m` : sports[1].distance)
                      : ''}
                  </div>
                  <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sports[1].duration}</div>
                </div>
              </td>
              <td className="border border-gray-200 px-2 text-xs text-center align-middle text-red-600 font-bold" style={{ width: '50px', height: '60px' }}>{sports[1].k}</td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[1].mainWorkMoveframe) {
                    e.stopPropagation();
                    if (clickedMoveframe?.id === sports[1].mainWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[1].mainWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[1].mainWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[1].mainWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[1].secondaryWorkMoveframe) {
                    e.stopPropagation();
                    if (clickedMoveframe?.id === sports[1].secondaryWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[1].secondaryWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[1].secondaryWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[1].secondaryWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              
              {/* Sport 3 */}
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '107px', height: '60px' }}>
                {(() => {
                  const sportName = sports[2].name;
                  const words = sportName.split(' ');
                  const isOneWord = words.length === 1;
                  const icon = sports[2].icon && (useImageIcons ? 
                    <img src={sports[2].icon} alt={sportName} className="object-cover rounded flex-shrink-0" style={{ width: '40px', height: '40px', filter: 'grayscale(100%)' }} /> : 
                    <span className="text-base flex-shrink-0">{sports[2].icon}</span>
                  );
                  
                  if (isOneWord) {
                    // One word: icon and name on same line
                    return (
                      <div className="flex items-center justify-center gap-2">
                        {icon}
                        <span className="font-medium whitespace-nowrap">{sportName}</span>
                      </div>
                    );
                  } else {
                    // Two words: icon + first word on first line, second word on second line
                    return (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="font-medium">{words[0]}</span>
                        </div>
                        <span className="font-medium">{words.slice(1).join(' ')}</span>
                      </div>
                    );
                  }
                })()}
              </td>
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '80px', height: '60px' }}>
                <div className="leading-tight">
                  <div className="text-black font-bold text-base">
                    {sports[2].distance > 0 
                      ? (isDistanceBasedSport(sports[2].name) ? `${sports[2].distance}m` : sports[2].distance)
                      : ''}
                  </div>
                  <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sports[2].duration}</div>
                </div>
              </td>
              <td className="border border-gray-200 px-2 text-xs text-center align-middle text-red-600 font-bold" style={{ width: '50px', height: '60px' }}>{sports[2].k}</td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[2].mainWorkMoveframe) {
                    e.stopPropagation();
                    if (clickedMoveframe?.id === sports[2].mainWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[2].mainWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[2].mainWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[2].mainWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[2].secondaryWorkMoveframe) {
                    e.stopPropagation();
                    if (clickedMoveframe?.id === sports[2].secondaryWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[2].secondaryWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[2].secondaryWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[2].secondaryWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              
              {/* Sport 4 */}
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '107px', height: '60px' }}>
                {(() => {
                  const sportName = sports[3].name;
                  const words = sportName.split(' ');
                  const isOneWord = words.length === 1;
                  const icon = sports[3].icon && (useImageIcons ? 
                    <img src={sports[3].icon} alt={sportName} className="object-cover rounded flex-shrink-0" style={{ width: '40px', height: '40px', filter: 'grayscale(100%)' }} /> : 
                    <span className="text-base flex-shrink-0">{sports[3].icon}</span>
                  );
                  
                  if (isOneWord) {
                    // One word: icon and name on same line
                    return (
                      <div className="flex items-center justify-center gap-2">
                        {icon}
                        <span className="font-medium whitespace-nowrap">{sportName}</span>
                      </div>
                    );
                  } else {
                    // Two words: icon + first word on first line, second word on second line
                    return (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="font-medium">{words[0]}</span>
                        </div>
                        <span className="font-medium">{words.slice(1).join(' ')}</span>
                      </div>
                    );
                  }
                })()}
              </td>
              <td className="border border-gray-200 px-1 text-xs text-center align-middle" style={{ width: '80px', height: '60px' }}>
                <div className="leading-tight">
                  <div className="text-black font-bold text-base">
                    {sports[3].distance > 0 
                      ? (isDistanceBasedSport(sports[3].name) ? `${sports[3].distance}m` : sports[3].distance)
                      : ''}
                  </div>
                  <div className="mt-0.5 font-semibold text-[10px] text-gray-700">{sports[3].duration}</div>
                </div>
              </td>
              <td className="border border-gray-200 px-2 text-xs text-center align-middle text-red-600 font-bold" style={{ width: '50px', height: '60px' }}>{sports[3].k}</td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[3].mainWorkMoveframe) {
                    e.stopPropagation();
                    if (clickedMoveframe?.id === sports[3].mainWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[3].mainWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[3].mainWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[3].mainWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
              <td className="main-secondary-work-cell border border-gray-200 px-3 text-xs text-left text-gray-900 font-semibold align-middle cursor-pointer" style={{ width: '300px', height: '60px', position: 'relative' }}
                onClick={(e) => {
                  if (sports[3].secondaryWorkMoveframe) {
                    e.stopPropagation();
                    if (clickedMoveframe?.id === sports[3].secondaryWorkMoveframe.id) {
                      setClickedMoveframe(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedMoveframe(sports[3].secondaryWorkMoveframe);
                      setClickedCellElement(e.currentTarget);
                      setPopupPosition({ 
                        x: rect.left + rect.width / 2, 
                        y: rect.bottom + 10 
                      });
                    }
                  }
                }}
              >
                <div className="line-clamp-3 leading-tight whitespace-pre-wrap">
                  {(() => {
                    if (!sports[3].secondaryWork) return '';
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sports[3].secondaryWork;
                    const plainText = (tempDiv.textContent || tempDiv.innerText || '').trim();
                    const lines = plainText.split('\n');
                    const firstThreeLines = lines.slice(0, 3).join('\n');
                    return firstThreeLines;
                  })()}
                </div>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
        
      {/* MOVEFRAMES SECTION - Level 2: Indented from workout table */}
      {isExpanded && showMoveframes !== false && (workout.moveframes || []).length > 0 && (
        <div className="ml-8">
          <MoveframesSection
            moveframes={workout.moveframes}
            workout={workout}
            workoutIndex={workoutIndex}
            day={day}
            iconType={iconType}
            expandedMoveframeId={expandedMoveframeId}
            autoExpandAll={expandMovelaps}
            onAddMoveframe={onAddMoveframe}
            onAddMoveframeAfter={onAddMoveframeAfter}
            onEditMoveframe={onEditMoveframe}
            onDeleteMoveframe={onDeleteMoveframe}
            onEditMovelap={onEditMovelap}
            onDeleteMovelap={onDeleteMovelap}
            onAddMovelap={onAddMovelap}
            onAddMovelapAfter={onAddMovelapAfter}
            onCopyMoveframe={onCopyMoveframe}
            onMoveMoveframe={onMoveMoveframe}
            onOpenColumnSettings={onOpenColumnSettings}
            onRefreshWorkouts={onRefreshWorkouts}
            columnSettings={columnSettings}
          />
        </div>
      )}

      {/* Click Popup for Main/Secondary Work (Toggle on/off, scrollable, close on outside click) */}
      {clickedMoveframe && popupPosition && ReactDOM.createPortal(
        <div 
          ref={popupRef}
          className="fixed z-[99999] bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 max-w-md max-h-[80vh] overflow-y-auto animate-fadeIn"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: 'translate(-50%, 0)',
            pointerEvents: 'auto',
            overscrollBehavior: 'contain'
          }}
          onWheel={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs space-y-2">
            {/* Moveframe Letter */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: clickedMoveframe.section?.color || '#6366f1' }}
              >
                {clickedMoveframe.letter || 'A'}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{clickedMoveframe.sport || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{clickedMoveframe.section?.name || 'Section'}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-700 mb-1">Description:</div>
              <div className="text-gray-900 bg-gray-50 p-2 rounded">
                {clickedMoveframe.description ? (
                  <div dangerouslySetInnerHTML={{ __html: clickedMoveframe.description }} />
                ) : (
                  'No description'
                )}
              </div>
            </div>

            {/* All Moveframe Details */}
            <div className="grid grid-cols-2 gap-2">
              {/* Repetitions */}
              {clickedMoveframe.repetitions && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Repetitions</span>
                  <span className="font-semibold text-blue-600">{clickedMoveframe.repetitions}</span>
                </div>
              )}

              {/* Movelaps Count */}
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px]">Movelaps</span>
                <span className="font-semibold text-purple-600">
                  {clickedMoveframe.movelaps?.length || 0}
                </span>
              </div>

              {/* Pause */}
              {clickedMoveframe.pause && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Pause</span>
                  <span className="font-semibold text-orange-600">{clickedMoveframe.pause}</span>
                </div>
              )}

              {/* Macro Rest */}
              {clickedMoveframe.macroRest && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Rest</span>
                  <span className="font-semibold text-orange-600">{clickedMoveframe.macroRest}</span>
                </div>
              )}

              {/* Macro Final */}
              {clickedMoveframe.macroFinal && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Final</span>
                  <span className="font-semibold text-green-600">{clickedMoveframe.macroFinal}</span>
                </div>
              )}

              {/* Alarm */}
              {clickedMoveframe.alarm && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Alarm</span>
                  <span className="font-semibold text-red-600">{clickedMoveframe.alarm}</span>
                </div>
              )}

              {/* Code */}
              {clickedMoveframe.code && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Code</span>
                  <span className="font-semibold text-gray-700 font-mono text-[10px]">{clickedMoveframe.code}</span>
                </div>
              )}

              {/* Total Distance - Hide for bodybuilding */}
              {clickedMoveframe.totalDistance > 0 && clickedMoveframe.sport !== 'BODY_BUILDING' && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Distance</span>
                  <span className="font-semibold text-blue-600">{clickedMoveframe.totalDistance}m</span>
                </div>
              )}

              {/* Total Reps */}
              {clickedMoveframe.totalReps > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Reps</span>
                  <span className="font-semibold text-purple-600">{clickedMoveframe.totalReps}</span>
                </div>
              )}
            </div>

            {/* Notes - Only show for non-manual moveframes, as manual mode uses notes for content */}
            {clickedMoveframe.notes && !clickedMoveframe.manualMode && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Notes:</div>
                <div className="text-gray-900 bg-gray-50 p-2 rounded text-[10px]">
                  {stripCircuitTags(clickedMoveframe.notes)}
                </div>
              </div>
            )}

            {/* Movelaps Details */}
            {clickedMoveframe.movelaps && clickedMoveframe.movelaps.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Movelaps ({clickedMoveframe.movelaps.length}):</div>
                <div className="space-y-1">
                  {clickedMoveframe.movelaps.map((lap: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-1.5 rounded text-[10px]">
                      <div className="font-semibold text-gray-700">#{idx + 1}</div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        {/* For Body Building, show exercise name instead of distance */}
                        {clickedMoveframe.sport === 'BODY_BUILDING' ? (
                          lap.exercise && <div>Exercise: <span className="font-semibold">{lap.exercise}</span></div>
                        ) : (
                          lap.distance && <div>Distance: <span className="font-semibold">{isDistanceBasedSport(clickedMoveframe.sport) ? `${lap.distance}m` : lap.distance}</span></div>
                        )}
                        {lap.reps && <div>Reps: <span className="font-semibold">{lap.reps}</span></div>}
                        {lap.time && <div>Time: <span className="font-semibold">{lap.time}</span></div>}
                        {lap.pace && <div>Pace: <span className="font-semibold">{lap.pace}</span></div>}
                        {lap.speed && <div>Speed: <span className="font-semibold">{lap.speed}</span></div>}
                        {lap.pause && <div>Pause: <span className="font-semibold">{lap.pause}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
