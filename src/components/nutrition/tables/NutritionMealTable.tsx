'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { GripVertical, MoreVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { useColorSettings } from '@/hooks/useColorSettings';
import { isSeriesBasedSport, getDistTimeColumnHeader, isDistanceBasedSport } from '@/constants/nutrition-food.constants';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { nutritionComponentPauseFieldLabel } from '@/utils/restTypeDb';
import NutritionFoodsSection from './FoodsSection';
import NutritionMealConstituentsTable from './NutritionMealConstituentsTable';
import { MEAL_LABELS, MEAL_HEADER_COLORS, isMealEnabled } from '@/utils/nutritionMealTotals';
import { NUTRITION_TERMINOLOGY } from '@/config/nutrition.constants';
import { stripInternalWorkoutTags } from '@/utils/sanitizeNutritionHtml';

const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return stripInternalWorkoutTags(content).trim();
};

interface NutritionMealTableProps {
  day: any;
  workout: any;
  workoutIndex: number;
  weekNumber?: number;
  periodName?: string;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  isExpanded?: boolean;
  expandedNutritionFoodId?: string | null;
  showNutritionFoods?: boolean; // Control whether to show nutritionFoods (for 3-state expand)
  expandNutritionComponents?: boolean; // Control whether to expand all nutrition_components (for 3-state expand)
  onToggleExpand?: () => void;
  onExpandOnlyThis?: (workout: any, day: any) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveFavorite?: () => void;
  onShowOverview?: () => void;
  onShareWorkout?: (workout: any, day: any) => void;
  onExportPdfWorkout?: (workout: any, day: any) => void;
  onPrintWorkout?: (workout: any, day: any) => void;
  onAddNutritionFood: () => void;
  onAddNutritionFoodAfter?: (nutritionFood: any, index: number, workout: any, day: any) => void;
  onEditNutritionFood?: (nutritionFood: any) => void;
  onDeleteNutritionFood?: (nutritionFood: any) => void;
  onEditNutritionComponent?: (nutritionComponent: any, nutritionFood: any) => void;
  onDeleteNutritionComponent?: (nutritionComponent: any, nutritionFood: any) => void;
  onAddNutritionComponent?: (nutritionFood: any) => void;
  onAddNutritionComponentAfter?: (nutritionComponent: any, index: number, nutritionFood: any, workout: any, day: any) => void;
  onCopyWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onMoveNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onShowNutritionFoodInfoPanel?: (nutritionFood: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'nutritionFood' | 'nutritionComponent') => void;
  onBulkAddNutritionComponent?: (nutritionFood: any) => void;
  onRefreshWorkouts?: () => Promise<void>;
  columnSettings?: any;
}

export default function NutritionMealTable({
  day,
  workout,
  workoutIndex,
  weekNumber,
  periodName,
  activeSection,
  iconType: iconTypeProp,
  isExpanded = false,
  expandedNutritionFoodId,
  showNutritionFoods = true,
  expandNutritionComponents = false,
  onToggleExpand,
  onExpandOnlyThis,
  onEdit,
  onDelete,
  onSaveFavorite,
  onShowOverview,
  onShareWorkout,
  onExportPdfWorkout,
  onPrintWorkout,
  onAddNutritionFood,
  onAddNutritionFoodAfter,
  onEditNutritionFood,
  onDeleteNutritionFood,
  onEditNutritionComponent,
  onDeleteNutritionComponent,
  onAddNutritionComponent,
  onAddNutritionComponentAfter,
  onCopyWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyNutritionFood,
  onMoveNutritionFood,
  onOpenColumnSettings,
  onRefreshWorkouts,
  columnSettings
}: NutritionMealTableProps) {
  // Get sport icon type from user settings or prop
  const defaultIconType = useSportIconType();
  const iconType = iconTypeProp || defaultIconType;
  const { colors, getBorderStyle } = useColorSettings();
  
  // Track if user clicked the workout number to expand all nutrition_components
  const [autoExpandAllNutritionComponents, setAutoExpandAllNutritionComponents] = React.useState(false);

  // Click popup state for main/secondary work (toggle on/off)
  const [clickedNutritionFood, setClickedNutritionFood] = React.useState<any>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [clickedCellElement, setClickedCellElement] = React.useState<HTMLElement | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  // Update popup position when scrolling to keep it attached to the cell
  React.useEffect(() => {
    if (!clickedCellElement || !clickedNutritionFood) return;

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
  }, [clickedCellElement, clickedNutritionFood]);

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
      setClickedNutritionFood(null);
      setPopupPosition(null);
      setClickedCellElement(null);
    };

    if (clickedNutritionFood) {
      // Small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [clickedNutritionFood]);

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
      setAutoExpandAllNutritionComponents(false);
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

  // Droppable hook for nutritionFood drops
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

  const slot = workout.sessionNumber ?? workoutIndex + 1;
  const mealLabel = MEAL_LABELS[slot] || `Meal ${slot}`;
  const mealColors = MEAL_HEADER_COLORS[slot] || MEAL_HEADER_COLORS[1];
  const workoutId = workout?.id;
  const workoutStatus = workout?.status;
  const workoutEnabledField = workout?.enabled;
  const hasNutritionFoods = Boolean(workout?.nutritionFoods?.length);
  const [mealEnabled, setMealEnabled] = React.useState(() => isMealEnabled(workout));

  React.useEffect(() => {
    if (!workoutId) {
      setMealEnabled(false);
      return;
    }
    setMealEnabled(
      isMealEnabled({
        enabled: workoutEnabledField,
        status: workoutStatus,
        nutritionFoods: hasNutritionFoods ? [{}] : [],
      })
    );
  }, [workoutId, workoutStatus, workoutEnabledField, hasNutritionFoods]);

  const calculateSportTotals = () => {
    console.log(`🔍 [NutritionMealTable] calculateSportTotals - workout.sports:`, workout.sports);
    console.log(`🔍 [NutritionMealTable] workout.nutritionFoods:`, workout.nutritionFoods?.length || 0);
    
    const sportsFromNutritionFoods: string[] = [];
    (workout.nutritionFoods || []).forEach((mf: any) => {
      if (mf.sport && !sportsFromNutritionFoods.includes(mf.sport)) {
        sportsFromNutritionFoods.push(mf.sport);
      }
    });
    
    const workoutSportNames = (workout.nutritionFoods && workout.nutritionFoods.length > 0)
      ? sportsFromNutritionFoods 
      : [];
    
    console.log(`🔍 [NutritionMealTable] Sports found in nutritionFoods:`, sportsFromNutritionFoods);
    console.log(`🔍 [NutritionMealTable] Using sports:`, workoutSportNames);
    
    const sportMap = new Map<string, { distance: number; durationSeconds: number; series: number; repetitions: number; k: string }>();
    
    (workout.nutritionFoods || []).forEach((mf: any) => {
      const sport = mf.sport || 'Unknown';
      if (!sportMap.has(sport)) {
        sportMap.set(sport, { distance: 0, durationSeconds: 0, series: 0, repetitions: 0, k: '' });
      }
      
      const totals = sportMap.get(sport)!;
      const isSeries = isSeriesBasedSport(sport);
      
      if (isSeries) {
        if (mf.manualMode) {
          const totalSeries = mf.repetitions || 0;
          totals.series += totalSeries;
          
          totals.repetitions += totalSeries;
        } else {
          const totalSeries = mf.nutritionComponents?.length || 0;
          totals.series += totalSeries;
          
          // Sum actual reps from all nutrition_components
          (mf.nutritionComponents || []).forEach((lap: any) => {
            totals.repetitions += parseInt(lap.reps) || 0;
          });
        }
      } else {
        // For AEROBIC (distance-based) sports
        // Sum distances and duration from nutrition_components (works for both manual and standard mode)
        (mf.nutritionComponents || []).forEach((lap: any) => {
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
        // Sport is defined in workout - show it with totals (or empty if no nutritionFoods yet)
        const totals = sportMap.get(sportName);
        const isSeries = isSeriesBasedSport(sportName);
        
        // Find all nutritionFoods of this sport in THIS workout only (not all workouts in the day)
        const allNutritionFoodsOfSport: any[] = [];
        if (workout.nutritionFoods) {
          workout.nutritionFoods.forEach((mf: any) => {
              if (mf.sport === sportName) {
                allNutritionFoodsOfSport.push(mf);
              }
            });
          }

        // Find explicitly set main/secondary work
        let mainWork = allNutritionFoodsOfSport.find((mf: any) => mf.workType === 'MAIN');
        let secondaryWork = allNutritionFoodsOfSport.find((mf: any) => mf.workType === 'SECONDARY');
        
        // CRITICAL: Prevent same nutritionFood from being both main and secondary
        if (mainWork && secondaryWork && mainWork.id === secondaryWork.id) {
          console.warn(`⚠️ [NutritionMealTable] Same nutritionFood (${mainWork.letter}) set as both MAIN and SECONDARY - clearing secondary`);
          secondaryWork = null;
        }
        
        // Debug logging
        console.log(`🔍 [NutritionMealTable] Sport ${sportName} - ${allNutritionFoodsOfSport.length} nutritionFoods:`, 
          allNutritionFoodsOfSport.map(mf => ({
            id: mf.id,
            letter: mf.letter,
            workType: mf.workType,
            hasWorkType: mf.hasOwnProperty('workType'),
            description: mf.description?.substring(0, 30)
          }))
        );
        console.log(`   [NutritionMealTable] Main work found:`, mainWork ? `${mainWork.letter} (${mainWork.workType})` : 'None');
        console.log(`   [NutritionMealTable] Secondary work found:`, secondaryWork ? `${secondaryWork.letter} (${secondaryWork.workType})` : 'None');
        
        // NOTE: Removed automatic fallback logic
        // NutritionFoods will ONLY appear in main/secondary work columns when explicitly set via workType
        // Users must double-click the nutritionFood letter to set workType to 'MAIN' or 'SECONDARY'
        
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
          mainWorkNutritionFood: mainWork || null,
          secondaryWorkNutritionFood: secondaryWork || null
        });
      } else {
        // Empty slot - no sport defined for this position
        console.log(`⚠️ [NutritionMealTable] Empty sport slot at position ${i}`);
        sportsArray.push({ name: '', icon: '', isSeriesBased: false, distance: 0, duration: '', k: '', mainWork: '', secondaryWork: '', mainWorkNutritionFood: null, secondaryWorkNutritionFood: null });
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
  console.log(`🏋️ NutritionMeal ID: ${workout.id}, isExpanded: ${isExpanded}`);
  console.log(`🏋️ NutritionMeal has ${workout.nutritionFoods?.length || 0} nutrition_foods`);
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
        {/* MEAL HEADER BAR */}
        <div 
          className={`px-4 py-2 rounded-t-lg ${mealColors.bg} text-black`}
          style={{
            border: getBorderStyle('workout') || '1px solid #e5e7eb'
          }}
        >
          {/* All Controls on Left Side */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Checkbox */}
            <input
              type="checkbox"
              className="w-4 h-4 cursor-pointer flex-shrink-0"
              style={{ accentColor: '#111111' }}
              title="Select workout"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Drag Handle */}
            <span
              ref={setDragNodeRef}
              {...attributes}
              {...listeners}
              className="cursor-move text-black hover:text-gray-700 transition-colors inline-block flex-shrink-0"
              title="Drag to move workout"
            >
              <GripVertical size={18} />
            </span>
            
            {/* Toggle and NutritionMeal Number */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleExpand) onToggleExpand();
                }}
                className="text-white hover:bg-cyan-500 rounded px-2 py-1 transition-colors font-bold text-base flex-shrink-0"
                title={`Click to ${isExpanded ? 'collapse' : 'expand'} meal and show foods`}
              >
                {isExpanded ? '▼' : '►'}
              </button>
              <span className="font-bold text-lg whitespace-nowrap">{mealLabel}</span>
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
              title="View NutritionMeal Overview"
            >
              Overview
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit();
              }}
              className="px-3 py-1 text-xs bg-white text-cyan-600 rounded hover:bg-cyan-50 transition-colors font-medium whitespace-nowrap flex-shrink-0"
              title="View/Edit NutritionMeal Info"
            >
              Diet info
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onAddNutritionFood) onAddNutritionFood();
              }}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium whitespace-nowrap flex-shrink-0"
              title={NUTRITION_TERMINOLOGY.addDietframe}
            >
              {NUTRITION_TERMINOLOGY.addDietframe}
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
              title={`Delete ${NUTRITION_TERMINOLOGY.meal}`}
            >
              Delete
            </button>
          </div>
        </div>

        {isExpanded && (
          <NutritionMealConstituentsTable
            meal={workout}
            mealIndex={workoutIndex}
            enabled={mealEnabled}
            onToggleEnabled={setMealEnabled}
          />
        )}
        
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
              {/* NutritionMeal number column */}
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
                    <Image src={sports[0].icon} alt={sportName} width={40} height={40} className="object-cover rounded flex-shrink-0" style={{ filter: 'grayscale(100%)' }} unoptimized /> : 
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
                  if (sports[0].mainWorkNutritionFood) {
                    e.stopPropagation();
                    // Toggle: if same nutritionFood clicked, close popup; otherwise open new one
                    if (clickedNutritionFood?.id === sports[0].mainWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[0].mainWorkNutritionFood);
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
                  if (sports[0].secondaryWorkNutritionFood) {
                    e.stopPropagation();
                    // Toggle: if same nutritionFood clicked, close popup; otherwise open new one
                    if (clickedNutritionFood?.id === sports[0].secondaryWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[0].secondaryWorkNutritionFood);
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
                    <Image src={sports[1].icon} alt={sportName} width={40} height={40} className="object-cover rounded flex-shrink-0" style={{ filter: 'grayscale(100%)' }} unoptimized /> : 
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
                  if (sports[1].mainWorkNutritionFood) {
                    e.stopPropagation();
                    if (clickedNutritionFood?.id === sports[1].mainWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[1].mainWorkNutritionFood);
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
                  if (sports[1].secondaryWorkNutritionFood) {
                    e.stopPropagation();
                    if (clickedNutritionFood?.id === sports[1].secondaryWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[1].secondaryWorkNutritionFood);
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
                    <Image src={sports[2].icon} alt={sportName} width={40} height={40} className="object-cover rounded flex-shrink-0" style={{ filter: 'grayscale(100%)' }} unoptimized /> : 
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
                  if (sports[2].mainWorkNutritionFood) {
                    e.stopPropagation();
                    if (clickedNutritionFood?.id === sports[2].mainWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[2].mainWorkNutritionFood);
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
                  if (sports[2].secondaryWorkNutritionFood) {
                    e.stopPropagation();
                    if (clickedNutritionFood?.id === sports[2].secondaryWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[2].secondaryWorkNutritionFood);
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
                    <Image src={sports[3].icon} alt={sportName} width={40} height={40} className="object-cover rounded flex-shrink-0" style={{ filter: 'grayscale(100%)' }} unoptimized /> : 
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
                  if (sports[3].mainWorkNutritionFood) {
                    e.stopPropagation();
                    if (clickedNutritionFood?.id === sports[3].mainWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[3].mainWorkNutritionFood);
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
                  if (sports[3].secondaryWorkNutritionFood) {
                    e.stopPropagation();
                    if (clickedNutritionFood?.id === sports[3].secondaryWorkNutritionFood.id) {
                      setClickedNutritionFood(null);
                      setPopupPosition(null);
                      setClickedCellElement(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickedNutritionFood(sports[3].secondaryWorkNutritionFood);
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
        
      {/* DIETFRAMES SECTION — Level 2: foods selected in this meal */}
      {isExpanded && showNutritionFoods !== false && (
        <div className="ml-8">
          <NutritionFoodsSection
            nutritionFoods={workout.nutritionFoods || []}
            mealLabel={mealLabel}
            workout={workout}
            workoutIndex={workoutIndex}
            day={day}
            iconType={iconType}
            expandedNutritionFoodId={expandedNutritionFoodId}
            autoExpandAll={expandNutritionComponents}
            onAddNutritionFood={onAddNutritionFood}
            onAddNutritionFoodAfter={onAddNutritionFoodAfter}
            onEditNutritionFood={onEditNutritionFood}
            onDeleteNutritionFood={onDeleteNutritionFood}
            onEditNutritionComponent={onEditNutritionComponent}
            onDeleteNutritionComponent={onDeleteNutritionComponent}
            onAddNutritionComponent={onAddNutritionComponent}
            onAddNutritionComponentAfter={onAddNutritionComponentAfter}
            onCopyNutritionFood={onCopyNutritionFood}
            onMoveNutritionFood={onMoveNutritionFood}
            onOpenColumnSettings={onOpenColumnSettings}
            onRefreshWorkouts={onRefreshWorkouts}
            columnSettings={columnSettings}
          />
        </div>
      )}

      {/* Click Popup for Main/Secondary Work (Toggle on/off, scrollable, close on outside click) */}
      {clickedNutritionFood && popupPosition && ReactDOM.createPortal(
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
            {/* NutritionFood Letter */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: clickedNutritionFood.section?.color || '#6366f1' }}
              >
                {clickedNutritionFood.letter || 'A'}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{clickedNutritionFood.sport || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{clickedNutritionFood.section?.name || 'Section'}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-700 mb-1">Description:</div>
              <div className="text-gray-900 bg-gray-50 p-2 rounded">
                {clickedNutritionFood.description ? (
                  <div dangerouslySetInnerHTML={{ __html: clickedNutritionFood.description }} />
                ) : (
                  'No description'
                )}
              </div>
            </div>

            {/* All NutritionFood Details */}
            <div className="grid grid-cols-2 gap-2">
              {/* Repetitions */}
              {clickedNutritionFood.repetitions && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Repetitions</span>
                  <span className="font-semibold text-blue-600">{clickedNutritionFood.repetitions}</span>
                </div>
              )}

              {/* NutritionComponents Count */}
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px]">NutritionComponents</span>
                <span className="font-semibold text-purple-600">
                  {clickedNutritionFood.nutritionComponents?.length || 0}
                </span>
              </div>

              {/* Pause */}
              {clickedNutritionFood.pause && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Pause</span>
                  <span className="font-semibold text-orange-600">{clickedNutritionFood.pause}</span>
                </div>
              )}

              {/* Macro Rest */}
              {clickedNutritionFood.macroRest && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Rest</span>
                  <span className="font-semibold text-orange-600">{clickedNutritionFood.macroRest}</span>
                </div>
              )}

              {/* Macro Final */}
              {clickedNutritionFood.macroFinal && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Final</span>
                  <span className="font-semibold text-green-600">{clickedNutritionFood.macroFinal}</span>
                </div>
              )}

              {/* Alarm */}
              {clickedNutritionFood.alarm && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Alarm</span>
                  <span className="font-semibold text-red-600">{clickedNutritionFood.alarm}</span>
                </div>
              )}

              {/* Code */}
              {clickedNutritionFood.code && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Code</span>
                  <span className="font-semibold text-gray-700 font-mono text-[10px]">{clickedNutritionFood.code}</span>
                </div>
              )}

              {/* Total Distance - Hide for bodybuilding */}
              {clickedNutritionFood.totalDistance > 0 && clickedNutritionFood.sport !== 'BODY_BUILDING' && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Distance</span>
                  <span className="font-semibold text-blue-600">{clickedNutritionFood.totalDistance}m</span>
                </div>
              )}

              {/* Total Reps */}
              {clickedNutritionFood.totalReps > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Reps</span>
                  <span className="font-semibold text-purple-600">{clickedNutritionFood.totalReps}</span>
                </div>
              )}
            </div>

            {/* Notes - Only show for non-manual nutritionFoods, as manual mode uses notes for content */}
            {clickedNutritionFood.notes && !clickedNutritionFood.manualMode && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Notes:</div>
                <div className="text-gray-900 bg-gray-50 p-2 rounded text-[10px]">
                  {stripCircuitTags(clickedNutritionFood.notes)}
                </div>
              </div>
            )}

            {/* NutritionComponents Details */}
            {clickedNutritionFood.nutritionComponents && clickedNutritionFood.nutritionComponents.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">NutritionComponents ({clickedNutritionFood.nutritionComponents.length}):</div>
                <div className="space-y-1">
                  {clickedNutritionFood.nutritionComponents.map((lap: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-1.5 rounded text-[10px]">
                      <div className="font-semibold text-gray-700">#{idx + 1}</div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        {/* For Body Building, show exercise name instead of distance */}
                        {clickedNutritionFood.sport === 'BODY_BUILDING' ? (
                          lap.exercise && <div>Exercise: <span className="font-semibold">{lap.exercise}</span></div>
                        ) : (
                          lap.distance && <div>Distance: <span className="font-semibold">{isDistanceBasedSport(clickedNutritionFood.sport) ? `${lap.distance}m` : lap.distance}</span></div>
                        )}
                        {lap.reps && <div>Reps: <span className="font-semibold">{lap.reps}</span></div>}
                        {lap.time && <div>Time: <span className="font-semibold">{lap.time}</span></div>}
                        {lap.pace && <div>Pace: <span className="font-semibold">{lap.pace}</span></div>}
                        {lap.speed && <div>Speed: <span className="font-semibold">{lap.speed}</span></div>}
                        {lap.pause && (
                          <div>
                            {nutritionComponentPauseFieldLabel(lap.restType)}: <span className="font-semibold">{lap.pause}</span>
                          </div>
                        )}
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
