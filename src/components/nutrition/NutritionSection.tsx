'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

// Drag and Drop
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';

// Configuration and Types
import { 
  NUTRITION_SECTIONS, 
  UI_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  STORAGE_KEYS
} from '@/config/nutrition.constants';
import type { 
  NutritionPlan, 
  NutritionDay, 
  Workout, 
  NutritionFood,
  Period,
  SectionId,
  ViewMode
} from '@/types/nutrition.types';

// API Utilities
import { nutritionComponentApi } from '@/utils/nutrition-api.utils';

// Helper Functions
import { sectionHelpers } from '@/utils/nutrition.helpers';
import { restTypeDisplayToDb } from '@/utils/restTypeDb';

// Custom Hooks
import { useNutritionData } from '@/hooks/useNutritionData';
import { useNutritionModals } from '@/hooks/useNutritionModals';
import { useNutritionExpansion } from '@/hooks/useNutritionExpansion';

// Components
import NutritionSectionHeader from '@/components/nutrition/NutritionSectionHeader';
import WeeklyNutritionStructurePanel from '@/components/nutrition/WeeklyNutritionStructurePanel';
import NutritionCalendarView from '@/components/nutrition/NutritionCalendarView';
import NutritionTreeView from '@/components/nutrition/NutritionTreeView';
import DayTableView from '@/components/nutrition/tables/DayTableView';
import StyledTableWrapper from '@/components/nutrition/tables/StyledTableWrapper';
import AddMealModal from '@/components/nutrition/AddNutritionMealModal';
import NutritionMealInfoModal from '@/components/nutrition/NutritionMealInfoModal';
import AddEditNutritionFoodModal from '@/components/nutrition/AddEditFoodModal';
import AddDietframeModal from '@/components/nutrition/modals/AddDietframeModal';
import { MEAL_LABELS } from '@/utils/nutritionMealTotals';
import ImportMealsModal from '@/components/nutrition/ImportNutritionMealsModal';
import AddDayModal from '@/components/nutrition/AddDayModal';
import EditDayModal from '@/components/nutrition/modals/EditDayModal';
import AddNutritionComponentModal from '@/components/nutrition/modals/AddComponentModal';
import EditNutritionFoodModal from '@/components/nutrition/modals/EditFoodModal';
import EditNutritionComponentModal from '@/components/nutrition/modals/EditComponentModal';
import AddEditNutritionComponentModal from '@/components/nutrition/AddEditComponentModal';
import CopyDayModal from '@/components/nutrition/modals/CopyDayModal';
import MoveDayModal from '@/components/nutrition/modals/MoveDayModal';
import CopyMealModal from '@/components/nutrition/modals/CopyNutritionMealModal';
import MoveMealModal from '@/components/nutrition/modals/MoveNutritionMealModal';
import CopyNutritionFoodModal from '@/components/nutrition/modals/CopyFoodModal';
import MoveNutritionFoodModal from '@/components/nutrition/modals/MoveFoodModal';
import ColumnSettingsModal from '@/components/nutrition/ColumnSettingsModal';
import BulkAddNutritionComponentModal from '@/components/nutrition/BulkAddComponentModal';
import CreateYearlyPlanModal from '@/components/nutrition/modals/CreateYearlyPlanModal';
import InsertActionsModal from '@/components/nutrition/modals/InsertActionsModal';
import ImportFromPlanModal from '@/components/nutrition/modals/ImportFromPlanModal';
import CopyFromTemplateModal from '@/components/nutrition/modals/CopyFromTemplateModal';
import DayPrintModal from '@/components/nutrition/modals/DayPrintModal';
import MealPrintModal from '@/components/nutrition/modals/NutritionMealPrintModal';
import ShareMealModal from '@/components/nutrition/modals/ShareNutritionMealModal';
import ShareDayModal from '@/components/nutrition/modals/ShareDayModal';
import WeekTotalsModal from '@/components/nutrition/modals/WeekTotalsModal';
import WeeklyInfoModal from '@/components/nutrition/WeeklyInfoModal';
import CopyWeekModal from '@/components/nutrition/modals/CopyWeekModal';
import PlanGymWeekModal, {
  type PlanGymWeekAnswers,
  type GoalId,
  type TrainingLevel
} from '@/components/nutrition/modals/PlanGymWeekModal';
import PlanGymWeekManualModal, {
  type PlanGymWeekManualResult,
  type PlanGymWeekRescanParams
} from '@/components/nutrition/modals/PlanGymWeekManualModal';
import PlanGymWeekFastPlanModal from '@/components/nutrition/modals/PlanGymWeekFastPlanModal';
import { type LastWorkoutBySector } from '@/components/nutrition/PlanGymWeekWizard';
import { buildHelpedRoutines } from '@/utils/planGymWeekLogic';
import DayOverviewModal from '@/components/nutrition/DayOverviewModal';
import MealOverviewModal from '@/components/nutrition/NutritionMealOverviewModal';
import ExportSharePrint from '@/components/nutrition/ExportSharePrint';
import { useColumnSettings } from '@/hooks/useColumnSettings';
import DragDropConfirmModal, { DragAction, DropPosition } from '@/components/nutrition/modals/DragDropConfirmModal';

// Icons
import { X, Download, Plus, Table, Calendar } from 'lucide-react';

/** Build last-workout stats per sector from plan (last previous nutritionFood with that sector). */
function computeLastWorkoutBySector(plan: any): Record<string, LastWorkoutBySector> {
  const out: Record<string, LastWorkoutBySector> = {};
  if (!plan?.weeks) return out;
  const entries: { date: Date; sector: string; laps: any[] }[] = [];
  for (const week of plan.weeks) {
    for (const day of week.days || []) {
      const dayDate = day.date ? new Date(day.date) : null;
      if (!dayDate) continue;
      for (const workout of day.meals || []) {
        for (const mf of workout.nutritionFoods || []) {
          const nutritionComponents = mf.nutritionComponents || [];
          const bySector = new Map<string, any[]>();
          for (const lap of nutritionComponents) {
            const sector = (lap.muscularSector || lap.sector || '').trim();
            if (!sector) continue;
            if (!bySector.has(sector)) bySector.set(sector, []);
            bySector.get(sector)!.push(lap);
          }
          bySector.forEach((laps, sector) => {
            entries.push({ date: dayDate, sector, laps });
          });
        }
      }
    }
  }
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  const seen = new Set<string>();
  for (const { date, sector, laps } of entries) {
    if (seen.has(sector)) continue;
    seen.add(sector);
    const totalReps = laps.reduce((s, l) => s + (parseInt(String(l.reps), 10) || 0), 0);
    const count = laps.length;
    const series = count;
    const aveRepPerSet = series > 0 ? Math.round((totalReps / series) * 10) / 10 : 0;
    const pause = (laps[0]?.pause != null && laps[0].pause !== '') ? String(laps[0].pause) : "—";
    out[sector] = {
      date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      series,
      aveRepPerSet,
      totalReps,
      pause
    };
  }
  return out;
}

// Extracted Handlers
import * as nutritionMealHandlers from './handlers/NutritionMealHandlers';
import * as nutritionFoodHandlers from './handlers/FoodHandlers';
import * as nutritionComponentHandlers from './handlers/ComponentHandlers';
import * as dragDropHandlers from './handlers/dragDropHandlers';
import * as dayWeekHandlers from './handlers/dayWeekHandlers';

interface NutritionSectionProps {
  onClose: () => void;
}

export default function NutritionSection({ onClose }: NutritionSectionProps) {
  // ==================== SECTION & VIEW STATE ====================
  const [activeSection, setActiveSection] = useState<SectionId>('A');
  const [activeSubSection, setActiveSubSection] = useState<'A' | 'B' | 'C'>('A'); // For Section A subsections
  const [viewMode, setViewMode] = useState<ViewMode>('table'); // Default to table view
  const [selectedWeekForTable, setSelectedWeekForTable] = useState<number | null>(null);
  const [iconType, setIconType] = useState<'emoji' | 'icon'>('emoji');
  
  // Load icon type from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sportIconType');
    if (saved === 'icon' || saved === 'emoji') {
      setIconType(saved);
    }
  }, []);
  
  const toggleIconType = () => {
    const newType = iconType === 'emoji' ? 'icon' : 'emoji';
    localStorage.setItem('sportIconType', newType);
    setIconType(newType);
    window.dispatchEvent(new Event('sportIconTypeChange'));
  };
  
  // Debug logging for Section B view mode
  useEffect(() => {
    if (activeSection === 'B') {
      console.log('🔍 [NutritionSection] Section B Active - Current View Mode:', viewMode);
      console.log('🔍 [NutritionSection] NutritionMeal Plan:', {
        exists: !!nutritionPlan,
        weeksCount: nutritionPlan?.weeks?.length || 0,
        currentPageStart,
        weeksPerPage
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, viewMode]);
  
  // Ensure Section B defaults to table view
  useEffect(() => {
    if (activeSection === 'B' && viewMode === 'tree') {
      console.log('⚠️ [NutritionSection] Section B was in tree view, switching to table view');
      setViewMode('table');
    }
  }, [activeSection, viewMode]);
  
  // Week grouping for Section B pagination
  const [weeksPerPage, setWeeksPerPage] = useState<number>(3); // 1, 2, 3, 4, 6, 8, 13
  const [currentPageStart, setCurrentPageStart] = useState<number>(1); // Starting week number for current page
  
  // Week index for Section A (Weekly Plans)
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  
  // 3-state expand/collapse for tree view
  // State 0: All collapsed, State 1: Days/workouts visible (no nutritionFoods), State 2: All visible
  const [treeExpandState, setTreeExpandState] = useState<number>(0);
  const [treeExpandedWeeks, setTreeExpandedWeeks] = useState<Set<number>>(new Set());
  
  // Reset view mode when section changes
  useEffect(() => {
    // Section A, B, C: All support Tree, Table, and Calendar views
    // Clear week filter when changing sections
    setSelectedWeekForTable(null);
    // Reset pagination when changing sections
    setCurrentPageStart(1);
    // Reset tree expand state and week expansion when changing sections or view modes
    setTreeExpandState(0);
    setTreeExpandedWeeks(new Set());
  }, [activeSection, viewMode]);
  
  // ==================== USE CUSTOM HOOK FOR DATA MANAGEMENT ====================
  const {
    nutritionPlan,
    periods,
    isLoading,
    userType,
    athleteList,
    loadNutritionData,
    loadPeriods,
    loadUserProfile,
    loadAthleteList,
    updateNutritionPlan,
    feedbackMessage,
    showMessage
  } = useNutritionData({ initialSection: activeSection });

  /** Modals / print flows only know legacy sections A–D (weekly-structure tab W maps to A for typing). */
  const activeSectionForModals = (activeSection === 'W' ? 'A' : activeSection) as 'A' | 'B' | 'C' | 'D';

  
  // Reload data when subsection changes (for Section A only)
  useEffect(() => {
    if (activeSection === 'A') {
      loadNutritionData(activeSection, activeSubSection);
    }
  }, [activeSection, activeSubSection, loadNutritionData]);
  
  // Auto-initialize Section C when it's empty
  useEffect(() => {
    const initializeSectionC = async () => {
      if (activeSection === 'C' && nutritionPlan) {
        // Check if Section C has no weeks or empty weeks
        const hasNoWeeks = !nutritionPlan.weeks || nutritionPlan.weeks.length === 0;
        const hasEmptyWeeks = nutritionPlan.weeks && nutritionPlan.weeks.every((week: any) => 
          !week.days || week.days.length === 0
        );
        
        if (hasNoWeeks || hasEmptyWeeks) {
          console.log('🔄 Section C is empty, initializing with blank 52-week structure...');
          try {
            const token = localStorage.getItem('token');
            if (!token) {
              console.error('❌ No auth token found');
              return;
            }
            
            const response = await fetch('/api/nutrition/plan/create-completed', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              console.log('✅ Section C initialized successfully');
              // Reload the data to show the new blank structure
              loadNutritionData(activeSection);
            } else {
              console.error('❌ Failed to initialize Section C');
            }
          } catch (error) {
            console.error('❌ Error initializing Section C:', error);
          }
        }
      }
    };
    
    initializeSectionC();
  }, [activeSection, nutritionPlan, loadNutritionData]);
  
  // ==================== MODAL STATES (Using Custom Hook) ====================
  const { modals, modes, settings, setters, actions: modalActions } = useNutritionModals();

  // Column Settings Hook
  const columnSettings = useColumnSettings();
  
  // Copy/Paste state
  const [copiedDay, setCopiedDay] = useState<any>(null);
  const [copiedWorkout, setCopiedWorkout] = useState<any>(null);
  const [copiedNutritionFood, setCopiedNutritionFood] = useState<any>(null);
  
  // ==================== SELECTION STATES (Properly Typed) ====================
  const [selectedDay, setSelectedDay] = useState<NutritionDay | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [selectedNutritionFood, setSelectedNutritionFood] = useState<NutritionFood | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  
  // Active selections for workout context
  const [activeDay, setActiveDay] = useState<NutritionDay | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [activeNutritionFood, setActiveNutritionFood] = useState<NutritionFood | null>(null);
  const [activeNutritionComponent, setActiveNutritionComponent] = useState<any>(null);
  const [nutritionComponentInsertIndex, setNutritionComponentInsertIndex] = useState<number | null>(null);
  const [sourceNutritionComponentForAdd, setSourceNutritionComponentForAdd] = useState<any>(null); // When adding via "Add nutritionComponent" from Options, the exercise to inherit from
  
  // Editing states
  const [addNutritionDay, setAddNutritionDay] = useState<NutritionDay | null>(null);
  const [editingDay, setEditingDay] = useState<NutritionDay | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editingNutritionFood, setEditingNutritionFood] = useState<NutritionFood | null>(null);
  const [editingNutritionComponent, setEditingNutritionComponent] = useState<any>(null);
  const [editingFromNutritionComponent, setEditingFromNutritionComponent] = useState(false);
  const [startInCircuitGrid, setStartInCircuitGrid] = useState(false);
  /** When editing a nutritionFood, open the same form used to create it: 'circuits' = Circuit Planner, 'fast' = Fast Planner */
  const [openNutritionFoodInBatterySubmenu, setOpenNutritionFoodInBatterySubmenu] = useState<'circuits' | 'fast' | null>(null);
  const [editingCircuitStation, setEditingCircuitStation] = useState<{ circuitLetter?: string; circuitIndex?: number; localSeriesNumber?: number; stationNumber?: number } | null>(null);
  
  // ==================== UI STATE ====================
  const [excludeStretchingFromTotals, setExcludeStretchingFromTotals] = useState(false);
  const [showPlanGymWeekModal, setShowPlanGymWeekModal] = useState(false);
  const [showPlanGymWeekManualForm, setShowPlanGymWeekManualForm] = useState(false);
  const [planGymWeekManualDaysCount, setPlanGymWeekManualDaysCount] = useState(3);
  const [planGymWeekInitialPlan, setPlanGymWeekInitialPlan] = useState<PlanGymWeekManualResult | null>(null);
  const [planGymWeekGoals, setPlanGymWeekGoals] = useState<GoalId[]>([]);
  const [planGymWeekCreatedPlan, setPlanGymWeekCreatedPlan] = useState<PlanGymWeekManualResult | null>(null);
  const [planGymWeekRescanParams, setPlanGymWeekRescanParams] = useState<PlanGymWeekRescanParams | null>(null);
  const [planGymWeekTrainingLevel, setPlanGymWeekTrainingLevel] = useState<TrainingLevel | null>(null);
  const [planGymWeekWizardInitialStep, setPlanGymWeekWizardInitialStep] = useState<1 | 2>(1);

  // ==================== EXPANSION STATE (Using Custom Hook) ====================
  const {
    expandedWeeks,
    expandedDays,
    expandedWorkouts,
    fullyExpandedWorkouts,
    workoutsWithExpandedNutritionComponents,
    toggleDayExpansion,
    toggleWorkoutExpansion,
    toggleWeekExpansion,
    expandAll,
    collapseAll,
    expandDayWithAllWorkouts,
    cycleWorkoutExpansion,
    setExpandedDays,
    setExpandedWorkouts,
    setFullyExpandedWorkouts,
    setWorkoutsWithExpandedNutritionComponents
  } = useNutritionExpansion({
    nutritionPlan,
    activeSection,
    selectedAthleteId: selectedAthlete?.id
  });

  // ==================== 3-STATE EXPAND/COLLAPSE FOR TREE VIEW ====================
  const toggleTreeExpandAll = () => {
    if (!nutritionPlan || !nutritionPlan.weeks) return;

    const allWeekNumbers = new Set<number>();
    const allDayIds = new Set<string>();
    const allWorkoutIds = new Set<string>();

    // Collect all week numbers, day and workout IDs
    nutritionPlan.weeks.forEach((week: any) => {
      allWeekNumbers.add(week.weekNumber);
      week.days?.forEach((day: any) => {
        allDayIds.add(day.id);
        day.meals?.forEach((workout: any) => {
          allWorkoutIds.add(workout.id);
        });
      });
    });

    console.log('🔄 Tree View Toggle - Current state:', treeExpandState);
    console.log('📊 Found', allWeekNumbers.size, 'weeks,', allDayIds.size, 'days and', allWorkoutIds.size, 'meals');

    if (treeExpandState === 0) {
      // State 0 -> State 1: Expand weeks and days (workouts visible but nutritionFoods hidden)
      console.log('🔄 Tree View: State 0 -> State 1 (Expanding weeks and days, hiding nutritionFoods)');
      
      // Expand all weeks
      setTreeExpandedWeeks(new Set(allWeekNumbers));
      
      // Expand all days
      setExpandedDays(new Set(allDayIds));
      
      // Ensure all workouts are collapsed (nutritionFoods hidden)
      setExpandedWorkouts(new Set());

      setTreeExpandState(1);
    } else if (treeExpandState === 1) {
      // State 1 -> State 2: Expand nutrition_foods
      console.log('🔄 Tree View: State 1 -> State 2 (Showing nutritionFoods)');
      
      // Keep weeks and days expanded, expand all workouts (nutritionFoods visible)
      setExpandedWorkouts(new Set(allWorkoutIds));

      setTreeExpandState(2);
    } else {
      // State 2 -> State 0: Collapse all
      console.log('🔄 Tree View: State 2 -> State 0 (Collapsing all)');
      
      // Collapse everything
      setTreeExpandedWeeks(new Set());
      setExpandedDays(new Set());
      setExpandedWorkouts(new Set());

      setTreeExpandState(0);
    }
  };

  // Handler to toggle individual week expansion in tree view
  const toggleTreeWeekExpansion = (weekNumber: number) => {
    setTreeExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  // Handler to expand only the selected workout and collapse all others
  const handleExpandOnlyThisWorkout = (workout: any, day: any) => {
    console.log('🎯 Expanding ONLY workout:', workout.id, 'on day:', day.id);
    console.log('📊 Currently expanded workouts BEFORE:', Array.from(expandedWorkouts));
    
    // Step 1: Ensure the day is expanded first
    if (!expandedDays.has(day.id)) {
      console.log('📅 Day is collapsed, expanding day:', day.id);
      toggleDayExpansion(day.id);
    } else {
      console.log('📅 Day is already expanded:', day.id);
    }
    
    // Step 2: Get snapshot of all currently expanded workouts
    const currentlyExpandedWorkouts = Array.from(expandedWorkouts);
    console.log('📊 Workouts to close:', currentlyExpandedWorkouts.filter(id => id !== workout.id));
    
    // Step 3: Close ALL workouts except the target
    currentlyExpandedWorkouts.forEach((nutritionMealId: string) => {
      if (nutritionMealId !== workout.id) {
        console.log('❌ Closing meal:', nutritionMealId);
        toggleWorkoutExpansion(nutritionMealId);
      }
    });
    
    // Step 4: Open the target workout if it's not already open
    if (!expandedWorkouts.has(workout.id)) {
      console.log('✅ Opening target workout:', workout.id);
      toggleWorkoutExpansion(workout.id);
    } else {
      console.log('ℹ️ Target workout already open:', workout.id);
    }
    
    console.log('📊 Expanded workouts AFTER:', Array.from(expandedWorkouts));
    console.log('✅ Done. Should have ONLY workout', workout.id, 'open');
  };

  /**
   * Handler for workout number clicks in day table
   * 3-state cycle: closed → show nutritionFoods → show nutrition_components → closed
   */
  const handleWorkoutNumberClick = (workout: any, day: any) => {
    console.log('🔢 NutritionMeal number clicked:', workout.id, 'on day:', day.id);
    cycleWorkoutExpansion(workout.id, day.id);
  };

  /**
   * Handler to save a week to favorites
   */
  const handleSaveFavoriteWeek = async (week: any) => {
    console.log('⭐ Save week to favorites:', week);
    
    if (!week || !week.id) {
      showMessage('error', 'No week selected');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const weekNumber = week.weekNumber || 1;
      const weekName = `Week ${weekNumber}`;
      
      const response = await fetch('/api/nutrition/weeks/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weekId: week.id,
          name: weekName,
          description: `Saved from ${new Date().toLocaleDateString()}`
        })
      });
      
      if (response.ok) {
        showMessage('success', `"${weekName}" saved to favorites!`);
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to save to favorites');
      }
    } catch (error) {
      console.error('Error saving week to favorites:', error);
      showMessage('error', 'Error saving week to favorites');
    }
  };

  // ==================== MODAL MODE STATE ====================
  const [workoutModalMode, setWorkoutModalMode] = useState<'add' | 'edit'>('add');
  const [showNutritionMealInfoModal, setShowNutritionMealInfoModal] = useState(false);
  const [showCreateYearlyPlanModal, setShowCreateYearlyPlanModal] = useState(false);
  const [showWeekNotesModal, setShowWeekNotesModal] = useState(false);
  const [selectedWeekNotes, setSelectedWeekNotes] = useState<string>('');
  const [showCopyFromTemplateModal, setShowCopyFromTemplateModal] = useState(false);
  const [showDayPrintModal, setShowDayPrintModal] = useState(false);
  const [dayToPrint, setDayToPrint] = useState<any>(null);
  const [autoPrintDay, setAutoPrintDay] = useState(false);
  const [showMealPrintModal, setShowMealPrintModal] = useState(false);
  const [workoutToPrint, setWorkoutToPrint] = useState<any>(null);
  const [dayForWorkoutPrint, setDayForWorkoutPrint] = useState<any>(null);
  const [autoPrintWorkout, setAutoPrintWorkout] = useState(false);
  const [showShareMealModal, setShowShareMealModal] = useState(false);
  const [workoutToShare, setWorkoutToShare] = useState<any>(null);
  const [dayForWorkoutShare, setDayForWorkoutShare] = useState<any>(null);
  const [showShareDayModal, setShowShareDayModal] = useState(false);
  const [dayToShare, setDayToShare] = useState<any>(null);
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false);
  const [showMoveWeekModal, setShowMoveWeekModal] = useState(false);
  const [showWeekTotalsModal, setShowWeekTotalsModal] = useState(false);
  const [isWeeklyInfoModalOpen, setIsWeeklyInfoModalOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [autoPrintWeek, setAutoPrintWeek] = useState(false);
  const [targetWeeks, setTargetWeeks] = useState<any[]>([]);
  const [showDayOverviewModal, setShowDayOverviewModal] = useState(false);
  const [dayForOverview, setDayForOverview] = useState<any>(null);
  const [showMealOverviewModal, setShowMealOverviewModal] = useState(false);
  const [showInsertActionsModal, setShowInsertActionsModal] = useState(false);
  const [workoutForOverview, setWorkoutForOverview] = useState<any>(null);
  const [dayForWorkoutOverview, setDayForWorkoutOverview] = useState<any>(null);
  // Use nutritionFoodModalMode from the hook instead of local state
  const nutritionFoodModalMode = modes.nutritionFoodModalMode;
  const setNutritionFoodModalMode = setters.setNutritionFoodModalMode;
  const [nutritionFoodInsertIndex, setNutritionFoodInsertIndex] = useState<number | null>(null); // For "Add MF" after specific nutritionFood
  const [savingDietframe, setSavingDietframe] = useState(false);
  
  // ==================== DRAG & DROP STATE ====================
  // Note: activeWorkout and activeNutritionFood already defined above for workout context
  const [draggedWorkout, setDraggedWorkout] = useState<any>(null);
  const [draggedNutritionFood, setDraggedNutritionFood] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<any>(null);
  const [dragModalConfig, setDragModalConfig] = useState<{
    dragType: 'workout' | 'nutritionFood';
    hasConflict: boolean;
    conflictMessage?: string;
    showPositionChoice?: boolean;
    sourceData: any;
    targetData: any;
  } | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag starts after 8px movement
      },
    }),
    useSensor(KeyboardSensor)
  );

  const [availableWorkouts, setAvailableWorkouts] = useState<Workout[]>([]);
  // Auto-expansion tracking for newly added items
  const [autoExpandDayId, setAutoExpandDayId] = useState<string | null>(null);
  const [autoExpandWorkoutId, setAutoExpandWorkoutId] = useState<string | null>(null);
  const [autoExpandNutritionFoodId, setAutoExpandNutritionFoodId] = useState<string | null>(null);
  
  // Section-specific settings
  const [userSubscription, setUserSubscription] = useState<{ expiryDate: Date | null, isActive: boolean }>({ 
    expiryDate: null, 
    isActive: true 
  });
  const [managedAthletes, setManagedAthletes] = useState<any[]>([]);
  
  // ==================== HELPER FUNCTIONS (Using Utilities) ====================
  const canAddDays = () => sectionHelpers.canAddDays(activeSection);
  const isDateAllowedForSection = (date: Date) => sectionHelpers.isDateAllowedForSection(date, activeSection);

  // Create dependency object for handlers
  const getHandlerDeps = () => ({
    token: localStorage.getItem('token'),
    showMessage,
    loadNutritionData,
    activeSection
  });

  // Helper function to generate nutrition_components from nutritionFood data
  const convertRestTypeToEnum = (restType: string | null): string | null =>
    restTypeDisplayToDb(restType ?? undefined);

  const generateNutritionComponents = (nutritionFoodData: any): any[] => {
    const nutritionComponents: any[] = [];
    
    // Skip nutrition_components for ANNOTATION types
    if (nutritionFoodData.type === 'ANNOTATION') {
      return nutritionComponents;
    }
    
    // 2026-01-22 10:35 UTC - For circuit-based nutritionFoods (BATTERY type), use pre-generated nutrition_components
    if (nutritionFoodData.type === 'BATTERY' && nutritionFoodData.nutritionComponents && nutritionFoodData.nutritionComponents.length > 0) {
      console.log('✅ [generateNutritionComponents] Using pre-generated circuit nutritionComponents:', nutritionFoodData.nutritionComponents.length);
      return nutritionFoodData.nutritionComponents;
    }
    
    // For manual mode, ALWAYS create a single nutritionComponent (even if distance is 0)
    // This nutritionComponent is used to store notes/summary for the manual nutritionFood
    if (nutritionFoodData.manualMode) {
      const distanceValue = parseInt(nutritionFoodData.distance) || 0;
        nutritionComponents.push({
          repetitionNumber: 1,
          distance: distanceValue,
          speed: null,
          style: null,
          pace: null,
          time: null,
          reps: null,
          weight: null,
          tools: null,
          r1: null,
          r2: null,
          muscularSector: null,
          exercise: null,
          restType: null,
          pause: null,
          macroFinal: null,
          alarm: null,
          sound: null,
        notes: null, // This will store the summary when edited
          status: 'PENDING',
          isSkipped: false,
          isDisabled: false
        });
      return nutritionComponents;
    }
    
    const baseReps = parseInt(nutritionFoodData.repetitions) || 1;
    const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
    const seriesMultiplier = AEROBIC_SPORTS.includes(nutritionFoodData.sport) ? (parseInt(nutritionFoodData.aerobicSeries) || 1) : 1;
    const repsCount = baseReps * seriesMultiplier;
    
    console.log('🔧 [generateNutritionComponents] Starting generation:', {
      baseReps,
      aerobicSeries: nutritionFoodData.aerobicSeries,
      seriesMultiplier,
      repsCount,
      planningMode: nutritionFoodData.planningMode,
      hasIndividualPlans: nutritionFoodData.planningMode === 'individual',
      individualPlansCount: nutritionFoodData.individualPlans?.length || 0
    });
    
    // Check if we're using individual planning mode
    const hasIndividualPlans = nutritionFoodData.planningMode === 'individual' && 
                              nutritionFoodData.individualPlans && 
                              nutritionFoodData.individualPlans.length > 0;
    
    console.log('🔧 [generateNutritionComponents] hasIndividualPlans:', hasIndividualPlans);
    
    for (let i = 0; i < repsCount; i++) {
      // If using individual plans, get values from the specific plan
      const plan = hasIndividualPlans ? nutritionFoodData.individualPlans[i] : null;
      
      console.log(`🔧 [generateNutritionComponents] Iteration ${i + 1}:`, {
        hasIndividualPlans,
        planExists: !!plan,
        planData: plan ? { reps: plan.reps, weight: plan.weight, tools: plan.tools } : null
      });
      
      const lapPace =
        hasIndividualPlans && plan
          ? plan.workPace != null && String(plan.workPace).trim() !== ''
            ? plan.workPace
            : nutritionFoodData.pace ?? null
          : nutritionFoodData.pace ?? null;
      const lapTime =
        hasIndividualPlans && plan
          ? plan.time != null && String(plan.time).trim() !== ''
            ? plan.time
            : nutritionFoodData.time ?? null
          : nutritionFoodData.time ?? null;
      const lapRestTypeRaw =
        hasIndividualPlans && plan?.restType ? plan.restType : nutritionFoodData.restType;

      nutritionComponents.push({
        repetitionNumber: i + 1,
        distance: nutritionFoodData.distance?.toString() || null,
        speed: plan?.speed || nutritionFoodData.speed || null,
        style: nutritionFoodData.style || null,
        pace: lapPace,
        time: lapTime,
        reps: plan?.reps || nutritionFoodData.reps || null,
        weight: plan?.weight || null,
        tools: plan?.tools || null,
        r1: nutritionFoodData.r1 || null,
        r2: nutritionFoodData.r2 || null,
        muscularSector: nutritionFoodData.muscularSector || null,
        exercise: nutritionFoodData.exercise || null,
        // Convert display value to enum value
        restType: convertRestTypeToEnum(lapRestTypeRaw),
        pause: plan?.pause || nutritionFoodData.pause || null,
        macroFinal: plan?.macroFinal || nutritionFoodData.macroFinal || null,
        alarm: nutritionFoodData.alarm || null,
        sound: nutritionFoodData.sound || null,
        notes: nutritionFoodData.notes || null,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false
      });
    }
    
    return nutritionComponents;
  };

  // ==================== LOAD DATA ON SECTION CHANGE ====================
  useEffect(() => {
    loadUserProfile();
    loadNutritionData(activeSection);
    loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]); // Only re-run when section changes

  // ===== SMART BUTTON HANDLERS WITH SELECTION VALIDATION =====
  
  /**
   * EDIT DAY - Requires active day selection
   * Edits day metadata (date, period, weather, feeling, notes)
   * Does NOT modify workouts, nutritionFoods, or nutrition_components
   */
  const handleEditDay = () => {
    if (!activeDay) {
      showMessage('warning', 'Please select a day first to edit its information');
      return;
    }
    
    // Open Edit Day modal with the active day
    setEditingDay(activeDay);
    modalActions.openEditDayModal();
  };
  
  /**
   * ADD WORKOUT - Requires active day selection
   * Creates a meal inside the selected day (max 4 per day)
   */
  const handleAddWorkout = () => {
    console.log('🏋️ handleAddWorkout called. activeDay:', activeDay);
    
    // Check if day is selected
    if (!activeDay) {
      console.log('⚠️ No activeDay selected');
      showMessage('warning', 'Please select a day first to add a workout');
      return;
    }
    
    // Check max 4 meals per day
    const existingWorkouts = activeDay.meals || [];
    console.log(`✓ activeDay found. Existing meals: ${existingWorkouts.length}/4`);
    
    if (existingWorkouts.length >= 4) {
      showMessage('warning', 'This day already has 4 meals (max)');
      return;
    }
    
    // All checks passed - open modal
    console.log('✅ Opening Add NutritionMeal modal');
    setAddNutritionDay(activeDay);
    modalActions.setWorkoutModalMode('add');
    setEditingWorkout(null);
    modalActions.openAddMealModal();
  };
  
  /**
   * ADD MOVEFRAME - Requires active day + active workout
   * Creates a nutritionFood inside the selected workout
   */
  const handleAddNutritionFood = () => {
    console.log('📋 handleAddNutritionFood called. activeDay:', activeDay, 'activeWorkout:', activeWorkout);
    
    // Check if day is selected
    if (!activeDay) {
      console.log('⚠️ No activeDay selected');
      showMessage('warning', 'Please select a day first');
      return;
    }
    
    // Check if workout is selected
    if (!activeWorkout) {
      console.log('⚠️ No activeWorkout selected');
      showMessage('warning', 'Please select a meal first to add a dietframe');
      return;
    }
    
    // All checks passed - open modal
    console.log('✅ Opening Add NutritionFood modal');
    setSelectedWorkout(activeWorkout.id);
    setSelectedDay(activeDay);
    setNutritionFoodModalMode('add');
    setEditingNutritionFood(null);
    setNutritionFoodInsertIndex(null); // Reset insert index for regular add (append to end)
    modalActions.openAddNutritionFoodModal();
  };
  
  /**
   * ADD MOVEFRAME AFTER - Adds a nutritionFood after a specific nutritionFood
   * @param nutritionFood - The nutritionFood to insert after
   * @param index - The index of the nutritionFood in the list
   */
  const handleAddNutritionFoodAfter = (nutritionFood: any, index: number, workout: any, day: any) => {
    if (!workout || !day) {
      showMessage('error', 'Could not find workout or day context');
      return;
    }
    
    setActiveWorkout(workout);
    setActiveDay(day);
    setSelectedWorkout(workout.id);
    setSelectedDay(day);
    setNutritionFoodModalMode('add');
    setEditingNutritionFood(null);
    setNutritionFoodInsertIndex(index + 1);
    
    setters.setShowAddNutritionFoodModal(true);
  };
  
  /**
   * ADD MOVELAP - Requires active nutritionFood
   * Creates a nutritionComponent (microlap/repetition) inside the selected nutritionFood
   */
  const handleAddNutritionComponent = () => {
    console.log('🔄 handleAddNutritionComponent called. activeNutritionFood:', activeNutritionFood);
    
    // Check if nutritionFood is selected
    if (!activeNutritionFood) {
      console.log('⚠️ No activeNutritionFood selected');
      showMessage('warning', 'Please select a nutritionFood first to add a nutritionComponent');
      return;
    }
    
    // Show Add NutritionComponent modal
    console.log('✅ Opening Add NutritionComponent modal');
    modalActions.openAddNutritionComponentModal();
  };
  
  /**
   * Create new nutritionComponent via API (Using API Utility)
   */
  const createNutritionComponent = async (formData: any) => {
    if (!activeNutritionFood) {
      showMessage('error', ERROR_MESSAGES.NO_ACTIVE_MOVEFRAME);
      return;
    }

    const response = await nutritionComponentApi.create(activeNutritionFood.id, {
      mode: 'APPEND',
      ...formData
    });
    
    if (response.success) {
      modalActions.closeNutritionComponentModal();
      
      // Auto-expand the day, workout, and nutritionFood to show the new nutritionComponent
      if (activeDay && activeWorkout && activeNutritionFood) {
        setAutoExpandDayId(activeDay.id);
        setAutoExpandWorkoutId(activeWorkout.id);
        setAutoExpandNutritionFoodId(activeNutritionFood.id);
        setTimeout(() => {
          setAutoExpandDayId(null);
          setAutoExpandWorkoutId(null);
          setAutoExpandNutritionFoodId(null);
        }, UI_CONFIG.AUTO_EXPAND_DELAY);
      }
      
      showMessage('success', SUCCESS_MESSAGES.MOVELAP_ADDED(activeNutritionFood.letter || activeNutritionFood.code));
    } else {
      showMessage('error', response.error || ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  /**
   * IMPORT WORKOUTS - Handler for importing workouts from Yearly Plan to Workouts Done
   */
  const handleImportWorkouts = async (workoutIds: string[], targetDate?: string) => {
    modalActions.closeImportModal();
    
    try {
      showMessage('info', 'Importing workouts...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        showMessage('error', 'Please log in first');
        return;
      }

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
      } else {
        showMessage('error', data.error || 'Failed to import workouts');
      }
    } catch (error) {
      console.error('Error importing meals:', error);
      showMessage('error', 'Failed to import workouts');
    }
  };

  /**
   * COPY WEEK - Handler for copying a week to another week (Section A to Section B)
   */
  const handleCopyWeek = async (targetWeekId: string) => {
    if (!currentWeek) {
      showMessage('error', 'No source week selected');
      return;
    }

    try {
      showMessage('info', `Copying Week ${currentWeek.weekNumber}...`);
      
      const token = localStorage.getItem('token');
      if (!token) {
        showMessage('error', 'Please log in first');
        return;
      }

      const response = await fetch('/api/nutrition/weeks/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sourceWeekId: currentWeek.id, 
          targetWeekId 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage('success', data.message || 'Week copied successfully!');
        
        // Close the modal
        setShowCopyWeekModal(false);
        setTargetWeeks([]);
        setCurrentWeek(null);
        
        // Reload data for the current active section only to avoid state overwrite
        await loadNutritionData(activeSection);
      } else {
        showMessage('error', data.error || 'Failed to copy week');
      }
    } catch (error) {
      console.error('Error copying week:', error);
      showMessage('error', 'An error occurred while copying the week');
    }
  };

  /**
   * CREATE YEARLY PLAN - Handler for creating yearly plan from start date
   */
  const handleCreateYearlyPlan = async (startDate: Date) => {
    // Close modal immediately to prevent overlapping
    setShowCreateYearlyPlanModal(false);
    
    try {
      showMessage('info', 'Creating yearly plan...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        showMessage('error', 'Please log in first');
        return;
      }

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
        
        // Use the plan data directly from the response instead of reloading
        if (data.plan && data.plan.weeks) {
          console.log('📊 Setting nutritionPlan directly from create response');
          console.log('   Plan ID:', data.plan.id);
          console.log('   Weeks:', data.plan.weeks.length);
          console.log('   First week days:', data.plan.weeks[0]?.days?.length);
          
          updateNutritionPlan(data.plan);
          setCurrentPageStart(1);
          setViewMode('table');
          
          console.log('✅ Data set successfully! NutritionPlan now has', data.plan.weeks.length, 'weeks');
        } else {
          console.warn('⚠️ Plan created but no weeks in response, reloading...');
          // Fallback: reload from API
          setCurrentPageStart(1);
          setViewMode('table');
          await new Promise(resolve => setTimeout(resolve, 500));
          await loadNutritionData('B');
        }
      } else {
        console.error('❌ Failed:', data.error);
        showMessage('error', data.error || 'Failed to create yearly plan');
      }
    } catch (error) {
      console.error('Error creating yearly plan:', error);
      showMessage('error', 'Failed to create yearly plan');
    }
  };

  /**
   * COPY FROM TEMPLATE - Handler for copying weeks from template plans to yearly plan
   */
  const handleCopyFromTemplate = async (
    templatePlan: 'A' | 'B' | 'C', 
    selectedWeeks: number[], 
    targetStartWeek: number
  ) => {
    try {
      console.log('📋 Starting copy from template:', {
        templatePlan,
        selectedWeeks,
        targetStartWeek
      });
      
      showMessage('info', `Copying ${selectedWeeks.length} week(s) from Weekly Plan ${templatePlan}...`);
      
      const token = localStorage.getItem('token');
      if (!token) {
        showMessage('error', 'Please log in first');
        return;
      }

      // Copy each selected week to the target week in yearly plan
      for (let i = 0; i < selectedWeeks.length; i++) {
        const sourceWeekNum = selectedWeeks[i];
        const targetWeekNum = targetStartWeek + i;
        
        console.log(`📋 Copying week ${sourceWeekNum} -> ${targetWeekNum}`);
        
        const response = await fetch('/api/nutrition/weeks/copy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sourceSection: templatePlan,
            sourceWeekNumber: sourceWeekNum,
            targetSection: 'B', // Yearly Plan
            targetWeekNumber: targetWeekNum
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to copy week ${sourceWeekNum}`);
        }
        
        const result = await response.json();
        console.log(`✅ Week ${sourceWeekNum} copied successfully:`, result);
      }

      showMessage('success', `Successfully copied ${selectedWeeks.length} week(s) to Yearly Plan!`);
      
      console.log('🔄 Reloading yearly plan data...');
      // Reload yearly plan data
      await loadNutritionData('B');
      
      // Navigate to the page containing the first copied week
      if (setCurrentPageStart) {
        const firstCopiedWeek = targetStartWeek;
        const targetPage = Math.floor((firstCopiedWeek - 1) / weeksPerPage) * weeksPerPage + 1;
        console.log(`📍 Navigating to page starting at week ${targetPage}`);
        setCurrentPageStart(targetPage);
      }
      
      console.log('✅ Copy from template completed successfully');
      
    } catch (error: any) {
      console.error('❌ Error copying from template:', error);
      showMessage('error', error.message || 'Failed to copy from template');
    }
  };

  // ==================== DRAG & DROP HANDLERS ====================
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    if (active.data.current?.type === 'workout') {
      setDraggedWorkout(active.data.current.workout);
    } else if (active.data.current?.type === 'nutritionFood') {
      setDraggedNutritionFood(active.data.current.nutritionFood);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDraggedWorkout(null);
      setDraggedNutritionFood(null);
      return;
    }
    
    const dragType = active.data.current?.type;
    const dropType = over.data.current?.type;
    
    // Handle same-workout nutritionFood reordering (simple case)
    if (dragType === 'nutritionFood' && dropType === 'nutritionFood') {
      const sourceWorkout = active.data.current?.workout;
      const targetWorkout = over.data.current?.workout;
      
      // Same workout - simple reorder
      if (sourceWorkout?.id === targetWorkout?.id) {
        console.log('🔄 Same-workout reorder - calling reorder API');
        await handleSameWorkoutNutritionFoodReorder(active.id, over.id, sourceWorkout);
        setDraggedNutritionFood(null);
        return;
      }
      
      // Cross-workout - show modal
      setDragModalConfig({
        dragType: 'nutritionFood',
        hasConflict: false,
        showPositionChoice: true,
        sourceData: active.data.current,
        targetData: over.data.current
      });
      modalActions.setShowDragModal(true);
    } else if (dragType === 'workout' && (dropType === 'day' || dropType === 'workout')) {
      // Handle workout dragging
      const sourceWorkout = active.data.current?.workout;
      const sourceDay = active.data.current?.day;
      const targetDay = dropType === 'day' ? over.data.current?.day : over.data.current?.day;
      
      // Same day - simple reorder
      if (sourceDay?.id === targetDay?.id && active.id !== over.id) {
        console.log('🔄 Same-day workout reorder');
        await handleSameDayWorkoutReorder(active.id, over.id, sourceDay);
        setDraggedWorkout(null);
        return;
      }
      
      // Cross-day - show modal
      const existingWorkoutCount = targetDay?.meals?.length || 0;
      const existingWorkout = targetDay?.meals?.[0] || null; // Get first workout if exists
      const hasConflict = existingWorkoutCount >= 4;
      
      setDragModalConfig({
        dragType: 'workout',
        hasConflict: hasConflict,
        conflictMessage: hasConflict ? 'This day already has 4 meals (maximum). Choose an action:' : undefined,
        sourceData: { workout: sourceWorkout, sourceDay: sourceDay },
        targetData: { targetDay, existingWorkout }
      });
      modalActions.setShowDragModal(true);
    } else if (dragType === 'nutritionFood' && (dropType === 'workout' || dropType === 'day')) {
      // Handle nutritionFood dropped on workout or day
      setDragModalConfig({
        dragType: 'nutritionFood',
        hasConflict: false,
        showPositionChoice: false,
        sourceData: active.data.current,
        targetData: over.data.current
      });
      modalActions.setShowDragModal(true);
    }
    
    setDraggedWorkout(null);
    setDraggedNutritionFood(null);
  };

  // Handle same-workout nutritionFood reordering
  const handleSameWorkoutNutritionFoodReorder = async (activeNutritionFoodId: any, overNutritionFoodId: any, workout: any) => {
    try {
      const nutritionFoods = workout.nutritionFoods || [];
      const oldIndex = nutritionFoods.findIndex((mf: any) => mf.id === activeNutritionFoodId);
      const newIndex = nutritionFoods.findIndex((mf: any) => mf.id === overNutritionFoodId);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      // Reorder array
      const newOrder = [...nutritionFoods];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
      
      // Reassign letters alphabetically
      const updatedOrder = newOrder.map((mf, index) => ({
        id: mf.id,
        letter: String.fromCharCode(65 + index) // A, B, C, D...
      }));
      
      // Call reorder API
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch('/api/nutrition/nutrition_foods/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nutritionFoods: updatedOrder })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder nutrition_foods');
      }
      
      console.log('✅ NutritionFoods reordered successfully');
      showMessage('success', 'NutritionFoods reordered successfully');
      await loadNutritionData(activeSection);
    } catch (error) {
      console.error('Error reordering nutritionFoods:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to reorder nutrition_foods');
    }
  };

  // Handle same-day workout reordering  
  const handleSameDayWorkoutReorder = async (activeWorkoutId: any, overWorkoutId: any, day: any) => {
    try {
      const workouts = day.meals || [];
      const oldIndex = workouts.findIndex((w: any) => w.id === activeWorkoutId.replace('workout-', ''));
      const newIndex = workouts.findIndex((w: any) => w.id === overWorkoutId.replace('workout-', ''));
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      // Reorder array
      const newOrder = [...workouts];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
      
      // Reassign session numbers
      const updatedOrder = newOrder.map((w, index) => ({
        id: w.id,
        sessionNumber: index + 1 // 1, 2, 3
      }));
      
      // Call reorder API
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch('/api/nutrition/sessions/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ meals: updatedOrder })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder workouts');
      }
      
      console.log('✅ Workouts reordered successfully');
      showMessage('success', 'Workouts reordered successfully');
      await loadNutritionData(activeSection);
    } catch (error) {
      console.error('Error reordering meals:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to reorder workouts');
    }
  };

  const handleDragConfirm = async (action: DragAction, position?: DropPosition) => {
    if (!dragModalConfig) return;
    
    try {
      if (dragModalConfig.dragType === 'workout') {
        await handleWorkoutDragAction(action, dragModalConfig.sourceData, dragModalConfig.targetData);
      } else {
        await handleNutritionFoodDragAction(action, position, dragModalConfig.sourceData, dragModalConfig.targetData);
      }
      
      // Better success messages
      const actionPastTense = action === 'copy' ? 'copied' : action === 'move' ? 'moved' : 'switched';
      const itemType = dragModalConfig.dragType === 'workout' ? 'Workout' : 'NutritionFood';
      showMessage('success', `${itemType} ${actionPastTense} successfully!`);
    } catch (error) {
      console.error('Drag action failed:', error);
      const errorMsg = error instanceof Error ? error.message : `Failed to ${action} ${dragModalConfig.dragType}`;
      showMessage('error', errorMsg);
    }
    
    setDragModalConfig(null);
    await loadNutritionData(activeSection);
  };

  const handleWorkoutDragAction = async (action: DragAction, sourceData: any, targetData: any) => {
    const { workout, sourceDay } = sourceData;
    const { targetDay, existingWorkout } = targetData;
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    if (action === 'copy') {
      // Copy workout - replace any existing workout in target day
      // If there's an existing workout in the target day, delete it first
      if (existingWorkout) {
        console.log('🗑️ Deleting existing workout before copy:', existingWorkout.id);
        const deleteResponse = await fetch(`/api/nutrition/sessions/${existingWorkout.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!deleteResponse.ok) {
          const error = await deleteResponse.json();
          console.error('Failed to delete existing workout:', error);
          throw new Error('Failed to replace existing workout');
        }
      }
      
      // Now duplicate the workout to the target day
      const response = await fetch('/api/nutrition/sessions/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionMealId: workout.id,
          targetDayId: targetDay.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy workout');
      }
      
      console.log('✅ NutritionMeal copied:', workout.id, '→', targetDay.id);
    } else if (action === 'move') {
      // Move workout to different day - replace any existing workout
      // If there's an existing workout in the target day, delete it first
      if (existingWorkout) {
        console.log('🗑️ Deleting existing workout:', existingWorkout.id);
        const deleteResponse = await fetch(`/api/nutrition/sessions/${existingWorkout.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!deleteResponse.ok) {
          const error = await deleteResponse.json();
          console.error('Failed to delete existing workout:', error);
          throw new Error('Failed to replace existing workout');
        }
      }
      
      // Now move the workout to the target day
      const response = await fetch('/api/nutrition/sessions/move-to-day', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionMealId: workout.id,
          targetDayId: targetDay.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move workout');
      }
      
      console.log('✅ NutritionMeal moved:', workout.id, '→', targetDay.id);
      await loadNutritionData(activeSection); // Reload to show changes
    }
  };

  const handleNutritionFoodDragAction = async (action: DragAction, position: DropPosition | undefined, sourceData: any, targetData: any) => {
    const { nutritionFood, workout: sourceWorkout, day: sourceDay } = sourceData;
    const dropType = targetData.type;
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Determine target workout based on drop type
    let targetWorkoutId: string;
    let insertBeforeId: string | undefined;
    let finalPosition: string = 'append';

    if (dropType === 'day') {
      // Dropped on day header → append to last workout of that day
      const targetDay = targetData.day;
      const lastWorkout = targetDay.meals?.[targetDay.meals.length - 1];
      if (!lastWorkout) {
        throw new Error('Target day has no workouts');
      }
      targetWorkoutId = lastWorkout.id;
      finalPosition = 'append';
    } else if (dropType === 'workout') {
      // Dropped on workout → append to nutrition_foods
      targetWorkoutId = targetData.workout.id;
      finalPosition = 'append';
    } else if (dropType === 'nutritionFood') {
      // Dropped on specific nutritionFood → use position (before/after)
      targetWorkoutId = targetData.workout.id;
      if (position === 'before') {
        insertBeforeId = targetData.nutritionFood.id;
      } else {
        // After: insert before the next nutritionFood
        const currentIndex = targetData.workout.nutritionFoods.findIndex((mf: any) => mf.id === targetData.nutritionFood.id);
        const nextNutritionFood = targetData.workout.nutritionFoods[currentIndex + 1];
        if (nextNutritionFood) {
          insertBeforeId = nextNutritionFood.id;
        } else {
          finalPosition = 'append';
        }
      }
    } else {
      throw new Error('Invalid drop target');
    }

    if (action === 'copy') {
      // Duplicate nutritionFood
      const response = await fetch('/api/nutrition/nutrition_foods/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionFoodId: nutritionFood.id,
          targetWorkoutId,
          position: finalPosition,
          insertBeforeId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy nutritionFood');
      }
      
      console.log('✅ NutritionFood copied:', nutritionFood.id, '→', targetWorkoutId);
    } else if (action === 'move') {
      // Move nutritionFood to different workout
      // Check if same workout or different
      if (sourceWorkout.id === targetWorkoutId) {
        // Same workout - this shouldn't happen as we handle it separately
        console.warn('Same workout move detected in modal handler - should be handled earlier');
        return;
      }
      
      // Cross-workout move - use move-to-workout API
      const response = await fetch('/api/nutrition/nutrition_foods/move-to-workout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionFoodId: nutritionFood.id,
          targetWorkoutId,
          targetIndex: position === 'before' ? 0 : undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move nutritionFood');
      }
      
      console.log('✅ NutritionFood moved:', nutritionFood.id, '→', targetWorkoutId);
      await loadNutritionData(activeSection); // Reload to show changes
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-white">
      {/* Feedback Message */}
      {feedbackMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all ${
            feedbackMessage.type === 'success' ? 'bg-green-500' :
            feedbackMessage.type === 'error' ? 'bg-red-500' :
            feedbackMessage.type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}
      {/* Small header bar with close button */}
      {/* Header Component */}
      {/* Check if we can add a day (Section A: only if a week has < 7 days) */}
      {(() => {
        let canAddDay = true;
        if (activeSection === 'W') {
          canAddDay = false;
        } else if (activeSection === 'A' && nutritionPlan?.weeks) {
          // For Section A, check if any week has less than 7 days
          canAddDay = nutritionPlan.weeks.some((week: any) => {
            const dayCount = week.days?.length || 0;
            return dayCount < 7;
          });
        }
        // For sections B and C, always allow adding days
        
        return (
          <NutritionSectionHeader
            activeSection={activeSection}
            activeSubSection={activeSubSection}
            onSubSectionChange={setActiveSubSection}
            viewMode={viewMode}
            selectedWeekForTable={selectedWeekForTable}
            userType={userType ?? undefined}
            selectedAthlete={selectedAthlete}
            canAddDay={canAddDay}
            weeksPerPage={weeksPerPage}
            currentPageStart={currentPageStart}
            totalWeeks={nutritionPlan?.weeks?.length || 0}
            nutritionPlan={nutritionPlan}
            iconType={iconType}
            currentWeekIndex={currentWeekIndex}
            onWeekIndexChange={setCurrentWeekIndex}
            onSectionChange={(section) => {
              setActiveSection(section);
              // Template plans (Section A) don't have calendar view since they don't have specific dates
              if ((section === 'A' || section === 'W') && viewMode === 'calendar') {
                setViewMode('table');
              }
            }}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          if (mode === 'calendar') {
            setSelectedWeekForTable(null);
          }
        }}
        onIconTypeToggle={toggleIconType}
        onImportClick={() => {
          // For Section B (Yearly Plan), open Copy from Template modal
          // For Section C (Done), open Import from Yearly Plan modal
          if (activeSection === 'B') {
            setShowCopyFromTemplateModal(true);
          } else {
            modalActions.openImportModal();
          }
        }}
        onAthleteSelect={() => modalActions.openAthleteSelector()}
        onWeekFilterClear={() => {
          setSelectedWeekForTable(null);
          setViewMode('calendar');
        }}
            onAddDay={() => modalActions.openAddDayModal()}
            onCreatePlan={() => setShowCreateYearlyPlanModal(true)}
            onClose={onClose}
        onWeeksPerPageChange={(weeks: number) => {
          setWeeksPerPage(weeks);
          setCurrentPageStart(1); // Reset to first page when changing grouping
        }}
        onPrevPage={() => {
          setCurrentPageStart(Math.max(1, currentPageStart - weeksPerPage));
        }}
        onNextPage={() => {
          const totalWeeks = nutritionPlan?.weeks?.length || 0;
          setCurrentPageStart(Math.min(totalWeeks, currentPageStart + weeksPerPage));
        }}
        onPrintWeek={() => {
          // Get the current week for Section A based on currentWeekIndex
          if (nutritionPlan?.weeks && nutritionPlan.weeks[currentWeekIndex]) {
            setCurrentWeek(nutritionPlan.weeks[currentWeekIndex]);
            setAutoPrintWeek(true);
            setShowWeekTotalsModal(true);
          }
        }}
        onPlanGymWeek={() => {
          setPlanGymWeekWizardInitialStep(1);
          setShowPlanGymWeekModal(true);
        }}
        onInsertActions={
          activeSection === 'B' || activeSection === 'C'
            ? () => setShowInsertActionsModal(true)
            : undefined
        }
        excludeStretchingCheckbox={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="exclude-stretching"
                checked={excludeStretchingFromTotals}
                onChange={(e) => setExcludeStretchingFromTotals(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              />
              <label 
                htmlFor="exclude-stretching"
                className="text-sm font-medium text-gray-700 cursor-pointer select-none"
              >
                Exclude stretching from the totals
              </label>
            </div>
            <span className="text-xs text-yellow-700">
              ⚠️ Note: Stretching is auto-excluded when 4+ sports are selected in a day
            </span>
          </div>
        }
          />
        );
      })()}
      
      {/* ==================== CREATE YEARLY PLAN MODAL ==================== */}
      {showCreateYearlyPlanModal && (
        <CreateYearlyPlanModal
          isOpen={showCreateYearlyPlanModal}
          onClose={() => setShowCreateYearlyPlanModal(false)}
          onConfirm={handleCreateYearlyPlan}
        />
      )}

      {(activeSection === 'B' || activeSection === 'C') && (
        <InsertActionsModal
          isOpen={showInsertActionsModal}
          onClose={() => setShowInsertActionsModal(false)}
          nutritionPlan={nutritionPlan}
          activeSection={activeSection}
          onSaved={async () => {
            await loadNutritionData(activeSection);
          }}
        />
      )}

      {/* ==================== COPY FROM TEMPLATE MODAL ==================== */}
      {showCopyFromTemplateModal && (
        <CopyFromTemplateModal
          isOpen={showCopyFromTemplateModal}
          onClose={() => setShowCopyFromTemplateModal(false)}
          onConfirm={handleCopyFromTemplate}
          yearlyPlanWeeks={nutritionPlan?.weeks || []}
          onNavigateToTemplate={(template) => {
            setActiveSection('A');
            setActiveSubSection(template);
            setShowCopyFromTemplateModal(false);
          }}
        />
      )}

      {/* ==================== IMPORT FROM PLAN MODAL ==================== */}
      {modals.showImportModal && (
        <ImportFromPlanModal
          isOpen={modals.showImportModal}
          onClose={() => modalActions.closeImportModal()}
          onConfirm={handleImportWorkouts}
        />
      )}

      {/* NutritionMeal area - full width */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center - main workout area (full width, no sidebars) */}
        {/* 2026-01-24 - Removed overflow-x to let table containers handle horizontal scrolling */}
        <main className="flex-1 bg-white overflow-y-auto w-full">
          <div className="p-2">

            {activeSection === 'W' ? (
              <WeeklyNutritionStructurePanel
                periods={(Array.isArray(periods) ? periods : []).map((p) => ({
                  id: p.id,
                  name: p.name,
                  color: p.color
                }))}
              />
            ) : isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : viewMode === 'tree' ? (
              <div className="flex flex-col h-full">
                {/* CSS for rich text preview */}
                <style>{`
                  .rich-text-preview b,
                  .rich-text-preview strong {
                    font-weight: bold !important;
                  }
                  .rich-text-preview i,
                  .rich-text-preview em {
                    font-style: italic !important;
                  }
                  .rich-text-preview u {
                    text-decoration: underline !important;
                  }
                  .rich-text-preview s,
                  .rich-text-preview strike {
                    text-decoration: line-through !important;
                  }
                  .rich-text-preview ul {
                    list-style-type: disc;
                    padding-left: 1.5em;
                  }
                  .rich-text-preview ol {
                    list-style-type: decimal;
                    padding-left: 1.5em;
                  }
                  .rich-text-preview a {
                    color: #3b82f6;
                    text-decoration: underline;
                  }
                  .rich-text-preview img {
                    max-width: 100%;
                    height: auto;
                  }
                `}</style>
                
                {/* Tree View Week Navigation Header */}
                {(activeSection === 'A' || activeSection === 'B') && nutritionPlan && nutritionPlan.weeks && nutritionPlan.weeks.length > 0 && (
                  <div className="sticky top-0 z-50 bg-white shadow-lg border-b-2 border-gray-300">
                    <div className="flex items-center gap-2">
                      {/* Left: Period Badge (Display Only) */}
                      <div className="flex items-center px-4 py-3 bg-white border-r-2 border-gray-200">
                        {(() => {
                          const firstWeek = nutritionPlan.weeks?.[0] as any;
                          const period = firstWeek?.period;
                          return (
                            <div
                              className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg border-2"
                              style={{
                                backgroundColor: period?.color || '#e5e7eb',
                                borderColor: period?.color || '#d1d5db',
                                color: '#000000'
                              }}
                            >
                              <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: period?.color || '#3b82f6' }}
                              />
                              <span className="font-bold text-sm">
                                {period?.name || 'Set Period'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Center: Week Description Box (Simplified) */}
                      <div className="flex-1 max-w-lg flex items-center gap-3 px-2 py-2 bg-white border-r-2 border-gray-200">
                        {/* Week Title/Notes */}
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const firstWeek = nutritionPlan.weeks?.[0] as any;
                            const weekNotes = firstWeek?.notes;
                            
                            // Display notes if available, otherwise show default text
                            if (weekNotes) {
                              return (
                                <div 
                                  className="rich-text-preview text-gray-900 font-semibold leading-tight text-lg cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                  dangerouslySetInnerHTML={{ __html: weekNotes }}
                                  onClick={() => {
                                    setSelectedWeekNotes(weekNotes);
                                    setShowWeekNotesModal(true);
                                  }}
                                  title="Click to view full notes"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.3',
                                    maxHeight: '2.6em'
                                  }}
                                />
                              );
                            } else {
                              return (
                                <span className="text-gray-400 italic text-base">Click Edit to add description...</span>
                              );
                            }
                          })()}
                        </div>
                        
                        {/* Edit Button Inside */}
                        <button
                          onClick={() => {
                            const firstWeek = nutritionPlan.weeks?.[0];
                            if (firstWeek) {
                              setCurrentWeek(firstWeek);
                              setIsWeeklyInfoModalOpen(true);
                            } else {
                              showMessage('error', 'No week to edit');
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg flex-shrink-0"
                          title="Edit week description and notes"
                        >
                          <FileText size={14} />
                          Edit
                        </button>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex items-center gap-2 px-4 py-3 bg-white">
                        {/* Section B Navigation - Previous/Next buttons */}
                        {activeSection === 'B' && nutritionPlan?.weeks && nutritionPlan.weeks.length > weeksPerPage && (
                          <>
                            <button
                              onClick={() => {
                                if (currentPageStart > 1) {
                                  const newStart = Math.max(1, currentPageStart - weeksPerPage);
                                  setCurrentPageStart(newStart);
                                }
                              }}
                              disabled={currentPageStart <= 1}
                              className="flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md"
                              title="Previous weeks"
                            >
                              <ChevronLeft size={16} />
                              Previous
                            </button>
                            <button
                              onClick={() => {
                                const totalWeeks = nutritionPlan.weeks.length;
                                if (currentPageStart + weeksPerPage <= totalWeeks) {
                                  setCurrentPageStart(currentPageStart + weeksPerPage);
                                }
                              }}
                              disabled={currentPageStart + weeksPerPage > (nutritionPlan.weeks.length || 0)}
                              className="flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md"
                              title="Next weeks"
                            >
                              Next
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}

                        {/* Expand All Button - 3 State Toggle */}
                        <button
                          onClick={toggleTreeExpandAll}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md hover:shadow-lg"
                          title={
                            treeExpandState === 0 
                              ? "Show workouts only" 
                              : treeExpandState === 1 
                              ? "Show workouts + nutrition_foods" 
                              : "Collapse all"
                          }
                        >
                          {treeExpandState === 0 
                            ? 'Expand All' 
                            : treeExpandState === 1 
                            ? 'Expand All (with nutritionFoods)' 
                            : 'Collapse All'}
                        </button>

                        {/* Copy Week Button */}
                        <button
                          onClick={async () => {
                            const firstWeek = nutritionPlan.weeks?.[0];
                            if (!firstWeek) {
                              showMessage('error', 'No week to copy');
                              return;
                            }
                            
                            setCurrentWeek(firstWeek);
                            
                            const token = localStorage.getItem('token');
                            if (!token) {
                              console.error('❌ Please log in first');
                              return;
                            }
                            
                            try {
                              // Same logic as table view: Section A -> copy to YEARLY_PLAN, Section B -> copy to TEMPLATE_WEEKS
                              const targetPlanType = activeSection === 'A' ? 'YEARLY_PLAN' : 'TEMPLATE_WEEKS';
                              console.log('📥 Fetching target weeks for Copy from:', targetPlanType);
                              
                              const response = await fetch(`/api/nutrition/plan?type=${targetPlanType}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                console.log('✅ Loaded target plan:', data.plan?.type, 'with', data.plan?.weeks?.length || 0, 'weeks');
                                setTargetWeeks(data.plan?.weeks || []);
                                setShowCopyWeekModal(true);
                              } else {
                                console.error('❌ Failed to load target weeks');
                              }
                            } catch (error) {
                              console.error('Error loading target weeks:', error);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                          title="Copy this week"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          Copy
                        </button>

                        {/* Overview Button */}
                        <button
                          onClick={() => {
                            const firstWeek = nutritionPlan.weeks?.[0];
                            if (firstWeek) {
                              setCurrentWeek(firstWeek);
                              setAutoPrintWeek(false);
                              setShowWeekTotalsModal(true);
                            } else {
                              showMessage('error', 'No week selected for overview');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg"
                          title="View overview and totals for the first week"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                          Overview
                        </button>

                        {/* Print Button */}
                        <button
                          onClick={() => {
                            const firstWeek = nutritionPlan.weeks?.[0];
                            if (firstWeek) {
                              setCurrentWeek(firstWeek);
                              setAutoPrintWeek(true);
                              setShowWeekTotalsModal(true);
                            } else {
                              showMessage('error', 'No week selected to print');
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                          title="Print the first week in the displayed range"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tree View Content */}
                <div className="flex-1 overflow-y-auto">
                  <NutritionTreeView
                    nutritionPlan={
                      // Apply pagination filter for Section A and B
                      (activeSection === 'A' || activeSection === 'B') && nutritionPlan
                        ? {
                            ...nutritionPlan,
                            weeks: nutritionPlan.weeks?.filter((week: any) => {
                              const weekNum = week.weekNumber;
                              return weekNum >= currentPageStart && weekNum < currentPageStart + weeksPerPage;
                            }) || []
                          }
                        : nutritionPlan
                    }
                    activeSection={activeSection}
                    iconType={iconType}
                    expandedWeeks={treeExpandedWeeks}
                    expandedDays={expandedDays}
                    expandedWorkouts={expandedWorkouts}
                    expandState={treeExpandState}
                    onToggleWeek={toggleTreeWeekExpansion}
                    onToggleDay={toggleDayExpansion}
                    onToggleWorkout={toggleWorkoutExpansion}
                    onWeekClick={(weekNumber) => {
                      setSelectedWeekForTable(weekNumber);
                      setViewMode('table');
                    }}
                    onDayClick={(day) => {
                      setSelectedDay(day.id);
                      setAddNutritionDay(day);
                      setSelectedWeekForTable(day.weekNumber);
                      setViewMode('table'); // Switch to table view
                    }}
                    onSaveFavoriteWeek={handleSaveFavoriteWeek}
                  />
                </div>
              </div>
            ) : viewMode === 'calendar' ? (
              <NutritionCalendarView
                nutritionPlan={nutritionPlan}
                periods={periods}
                excludeStretchingFromTotals={excludeStretchingFromTotals}
                setExcludeStretchingFromTotals={setExcludeStretchingFromTotals}
                onDayClick={(day) => {
                  setSelectedDay(day.id);
                  setAddNutritionDay(day);
                  setSelectedWeekForTable(day.weekNumber);
                  setViewMode('table'); // Switch to table view
                 }}
               />
            ) : (
              <>
                <StyledTableWrapper>
                <DayTableView
                 excludeStretchingCheckbox={
                   <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <input
                       type="checkbox"
                       id="exclude-stretching"
                       checked={excludeStretchingFromTotals}
                       onChange={(e) => setExcludeStretchingFromTotals(e.target.checked)}
                       className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                     />
                     <label 
                       htmlFor="exclude-stretching"
                       className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                     >
                       Exclude stretching from the totals
                     </label>
                     </div>
                     <span className="text-xs text-yellow-700">
                       ⚠️ Note: Stretching is auto-excluded when 4+ sports are selected in a day
                     </span>
                   </div>
                 }
                 totalYearWeeks={52}
                 allWeeks={activeSection === 'B' ? nutritionPlan?.weeks : undefined}
                 nutritionPlan={
                   selectedWeekForTable && nutritionPlan
                     ? {
                         ...nutritionPlan,
                         weeks: nutritionPlan.weeks?.filter((week: any) => {
                           const weekNum = week.weekNumber;
                           return weekNum >= selectedWeekForTable - 1 && weekNum <= selectedWeekForTable + 1;
                         }) || []
                       }
                     : activeSection === 'B' && nutritionPlan
                     ? (() => {
                         const filteredWeeks = nutritionPlan.weeks?.filter((week: any) => {
                           const weekNum = week.weekNumber;
                           return weekNum >= currentPageStart && weekNum < currentPageStart + weeksPerPage;
                         }) || [];
                         return {
                           ...nutritionPlan,
                           weeks: filteredWeeks
                         };
                       })()
                     : nutritionPlan
                 }
                activeSection={activeSection}
                iconType={iconType}
                currentPageStart={currentPageStart}
                setCurrentPageStart={setCurrentPageStart}
                weeksPerPage={weeksPerPage}
                currentWeekIndex={currentWeekIndex}
                onWeekIndexChange={setCurrentWeekIndex}
                expandedDays={expandedDays}
                 expandedWorkouts={expandedWorkouts}
                 fullyExpandedWorkouts={fullyExpandedWorkouts}
                 workoutsWithExpandedNutritionComponents={workoutsWithExpandedNutritionComponents}
                 expandedNutritionFoodId={autoExpandNutritionFoodId}
                onToggleDay={toggleDayExpansion}
                onToggleWorkout={toggleWorkoutExpansion}
                onExpandOnlyThisWorkout={handleExpandOnlyThisWorkout}
                onExpandDayWithAllWorkouts={expandDayWithAllWorkouts}
                onCycleWorkoutExpansion={handleWorkoutNumberClick}
                 onEditDay={(day) => {
                   setEditingDay(day);
                   modalActions.setShowEditDayModal(true);
                 }}
                 onAddWorkout={(day) => {
                   setAddNutritionDay(day);
                   setWorkoutModalMode('add');
                   modalActions.setShowAddMealModal(true);
                 }}
                 onCopyDay={(day) => {
                   setCopiedDay(day);
                   modalActions.setShowCopyDayModal(true);
                 }}
                 onMoveDay={(day) => {
                   setCopiedDay(day);
                   modalActions.setShowMoveDayModal(true);
                 }}
                 onPasteDay={async (targetDay) => {
                   if (!copiedDay) {
                     showMessage('error', 'No day copied. Please copy a day first.');
                     return;
                   }
                   
                   try {
                     const token = localStorage.getItem('token');
                     const response = await fetch('/api/nutrition/days/copy', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`
                       },
                      body: JSON.stringify({
                        sourceDayId: copiedDay.id,
                        targetDate: targetDay.date,
                        targetWeekId: targetDay.nutritionWeekId
                      })
                     });
                     
                     if (!response.ok) {
                       const error = await response.json();
                       throw new Error(error.error || 'Failed to paste day');
                     }
                     
                     showMessage('success', 'Day pasted successfully');
                   } catch (error: any) {
                     showMessage('error', error.message || 'Failed to paste day');
                   }
                 }}
                 onShareDay={(day) => {
                   setDayToShare(day);
                   setShowShareDayModal(true);
                 }}
                 onExportPdfDay={(day) => {
                   setDayToPrint(day);
                   setAutoPrintDay(true);
                   setShowDayPrintModal(true);
                 }}
                 onPrintDay={(day) => {
                   setDayToPrint(day);
                   setAutoPrintDay(false);
                   setShowDayPrintModal(true);
                 }}
                 onShowDayOverview={(day) => {
                   setDayForOverview(day);
                   setShowDayOverviewModal(true);
                 }}
                onEditWorkout={(workout, day) => {
                  setEditingWorkout(workout);
                  setAddNutritionDay(day);
                  setShowNutritionMealInfoModal(true); // Open info modal
                }}
                onCopyWorkout={(workout, day) => {
                  setCopiedWorkout(workout);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  modalActions.openCopyMealModal();
                }}
                onPasteWorkout={async (day) => {
                  if (!copiedWorkout) {
                    showMessage('error', 'No workout copied. Please copy a workout first.');
                    return;
                  }
                  
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/nutrition/copy', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        sourceWorkoutId: copiedWorkout.id,
                        targetDayId: day.id
                      })
                    });
                    
                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Failed to paste workout');
                    }
                    
                    showMessage('success', 'Workout pasted successfully');
                    await loadNutritionData(activeSection);
                  } catch (error: any) {
                    showMessage('error', error.message || 'Failed to paste workout');
                  }
                }}
                onMoveWorkout={(workout, day) => {
                  setCopiedWorkout(workout);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  modalActions.openMoveMealModal();
                }}
                onAddNutritionFood={(workout, day) => {
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  setSelectedWorkout(workout.id);
                  setSelectedDay(day);
                  setNutritionFoodModalMode('add');
                  setEditingNutritionFood(null);
                  modalActions.setShowAddNutritionFoodModal(true);
                }}
                onAddNutritionFoodAfter={handleAddNutritionFoodAfter}
                onEditNutritionFood={(nutritionFood, workout, day) => {
                  const notes = typeof nutritionFood?.notes === 'string' ? nutritionFood.notes : '';
                  const description = typeof nutritionFood?.description === 'string' ? nutritionFood.description : '';
                  const isLegacyCircuitDescription =
                    /circuit/i.test(description) && /(station|series|pause)/i.test(description);
                  const hasCircuitNutritionComponentMeta = (nutritionFood?.nutritionComponents || []).some((nutritionComponent: any) => {
                    if (!nutritionComponent) return false;
                    if (nutritionComponent.circuitIndex != null || nutritionComponent.circuitLetter || nutritionComponent.stationNumber != null) return true;
                    return typeof nutritionComponent.notes === 'string' && nutritionComponent.notes.includes('[CIRCUIT_META]');
                  });
                  const isCircuitNutritionFood =
                    !!nutritionFood?.isCircuitBased ||
                    (typeof notes === 'string' && notes.includes('[CIRCUIT_DATA]')) ||
                    hasCircuitNutritionComponentMeta ||
                    !!nutritionFood?.circuitConfig ||
                    Array.isArray(nutritionFood?.circuits) ||
                    Array.isArray(nutritionFood?.rows) ||
                    isLegacyCircuitDescription;
                   setStartInCircuitGrid(isCircuitNutritionFood);
                   setEditingFromNutritionComponent(false);
                   setEditingCircuitStation(null);
                   setActiveNutritionComponent(null);
                   setEditingNutritionFood(nutritionFood);
                   setActiveDay(day);
                   setActiveWorkout(workout);
                   setActiveNutritionFood(nutritionFood);
                   setNutritionFoodModalMode('edit');
                   modalActions.setShowAddNutritionFoodModal(true);
                }}
                 onEditNutritionComponent={(nutritionComponent, nutritionFood, workout, day) => {
                  let circuitMeta = null;
                  if (nutritionComponent?.notes && typeof nutritionComponent.notes === 'string') {
                    const match = nutritionComponent.notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
                    if (match && match[1]) {
                      try {
                        circuitMeta = JSON.parse(match[1]);
                      } catch (e) {
                        circuitMeta = null;
                      }
                    }
                  }

                  const circuitTarget = {
                    circuitLetter: circuitMeta?.circuitLetter ?? nutritionComponent?.circuitLetter,
                    circuitIndex: circuitMeta?.circuitIndex ?? nutritionComponent?.circuitIndex,
                    localSeriesNumber: circuitMeta?.localSeriesNumber ?? nutritionComponent?.localSeriesNumber,
                    stationNumber: circuitMeta?.stationNumber ?? nutritionComponent?.stationNumber
                  };

                  const isCircuitNutritionComponent = !!(circuitTarget.circuitLetter || circuitTarget.circuitIndex || nutritionFood?.isCircuitBased);

                  // Always use AddEditNutritionComponentModal for editing a single nutritionComponent - never open Circuit Planner
                  // Opening Circuit Planner can overwrite/transform the circuit scheme when saving
                  if (isCircuitNutritionComponent && nutritionFood) {
                    setEditingNutritionComponent(nutritionComponent);
                    setActiveDay(day);
                    setActiveWorkout(workout);
                    setActiveNutritionFood(nutritionFood);
                    setActiveNutritionComponent(nutritionComponent);
                    setNutritionFoodModalMode('edit');
                    setEditingFromNutritionComponent(true);
                    setStartInCircuitGrid(true);
                    setEditingCircuitStation(circuitTarget);
                    modalActions.setShowAddNutritionFoodModal(true);
                    return;
                  }

                  setEditingNutritionComponent(nutritionComponent);
                  setActiveDay(day);
                  setActiveWorkout(workout);
                  setActiveNutritionFood(nutritionFood);
                  setActiveNutritionComponent(nutritionComponent);
                  setNutritionComponentInsertIndex(null);
                  setSourceNutritionComponentForAdd(null);
                  setEditingCircuitStation(null);
                  modalActions.setNutritionComponentModalMode('edit');
                  modalActions.setShowAddEditNutritionComponentModal(true);
                }}
                onAddNutritionComponent={(nutritionFood, workout, day) => {
                  setActiveNutritionFood(nutritionFood);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  setEditingNutritionComponent(null);
                  setNutritionComponentInsertIndex(null);
                  setSourceNutritionComponentForAdd(null);
                  modalActions.setNutritionComponentModalMode('add');
                  modalActions.setShowAddEditNutritionComponentModal(true);
                }}
                onAddNutritionComponentAfter={(nutritionComponent, index, nutritionFood, workout, day) => {
                  setActiveNutritionFood(nutritionFood);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  setEditingNutritionComponent(null);
                  setNutritionComponentInsertIndex(index); // Insert after this index
                  setSourceNutritionComponentForAdd(nutritionComponent); // Pre-fill form with this exercise's data
                  modalActions.setNutritionComponentModalMode('add');
                  modalActions.setShowAddEditNutritionComponentModal(true);
                }}
                 onDeleteDay={async (day) => {
                   if (confirm(`Are you sure you want to delete this day (${new Date(day.date).toLocaleDateString()})? This will also delete all workouts, nutritionFoods, and nutrition_components for this day.`)) {
                     try {
                       const token = localStorage.getItem('token');
                       const response = await fetch(`/api/nutrition/days?dayId=${day.id}`, {
                         method: 'DELETE',
                         headers: { 'Authorization': `Bearer ${token}` }
                       });
                       
                       if (response.ok) {
                         showMessage('success', 'Day deleted successfully');
                         
                         // Clear any references to this day
                         if (addNutritionDay?.id === day.id) {
                           setAddNutritionDay(null);
                         }
                         if (activeDay?.id === day.id) {
                           setActiveDay(null);
                         }
                         if (selectedDay === day.id) {
                           setSelectedDay(null);
                         }
                         
                         // Refresh workout data to remove deleted day from view
                         await loadNutritionData(activeSection);
                       } else {
                         const error = await response.json();
                         console.error('Failed to delete day:', error);
                         showMessage('error', error.error || 'Failed to delete day');
                       }
                     } catch (error) {
                       console.error('Error deleting day:', error);
                       showMessage('error', 'Error deleting day');
                     }
                   }
                 }}
                onDeleteWorkout={async (workout, day) => {
                  if (confirm('Are you sure you want to delete this workout?')) {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`/api/nutrition/sessions/${workout.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      
                      if (response.ok) {
                        showMessage('success', 'Workout deleted successfully');
                        
                        // Clear any references to this workout
                        if (activeWorkout?.id === workout.id) {
                          setActiveWorkout(null);
                        }
                        if (editingWorkout?.id === workout.id) {
                          setEditingWorkout(null);
                        }
                        if (copiedWorkout?.id === workout.id) {
                          setCopiedWorkout(null);
                        }
                        
                        // Refresh workout data to remove deleted workout from view
                        await loadNutritionData(activeSection);
                      } else {
                        showMessage('error', 'Failed to delete workout');
                      }
                    } catch (error) {
                      console.error('Error deleting workout:', error);
                      showMessage('error', 'Error deleting workout');
                    }
                  }
                }}
                onSaveFavoriteNutritionMeal={async (workout, day) => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/nutrition/favorites', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                      },
                      body: JSON.stringify({ nutritionMealId: workout.id })
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      showMessage('success', `"${workout.name}" saved to favorites!`);
                      // Note: Saving to favorites doesn't modify the workout plan, so no need to reload
                    } else if (response.status === 409) {
                      // Duplicate workout - show warning
                      const error = await response.json();
                      showMessage('warning', `⚠️ This workout is already in your favorites!`);
                    } else {
                      const error = await response.json();
                      showMessage('error', error.error || 'Failed to save to favorites');
                    }
                  } catch (error) {
                    console.error('Error saving workout to favorites:', error);
                    showMessage('error', 'Error saving workout to favorites');
                  }
                }}
                onShareWorkout={(workout, day) => {
                  setWorkoutToShare(workout);
                  setDayForWorkoutShare(day);
                  setShowShareMealModal(true);
                }}
                onExportPdfWorkout={(workout, day) => {
                  setWorkoutToPrint(workout);
                  setDayForWorkoutPrint(day);
                  setAutoPrintWorkout(true);
                  setShowMealPrintModal(true);
                }}
                onPrintWorkout={(workout, day) => {
                  setWorkoutToPrint(workout);
                  setDayForWorkoutPrint(day);
                  setAutoPrintWorkout(false);
                  setShowMealPrintModal(true);
                }}
                onShowWorkoutOverview={(workout, day) => {
                  // Transform the workout into the format expected by MealOverviewModal
                  // The modal expects workoutData as a JSON string with workout, nutritionFoods, and sports
                  const transformedWorkout = {
                    ...workout,
                    workoutData: JSON.stringify({
                      workout: {
                        id: workout.id,
                        name: workout.name,
                        code: workout.code,
                        notes: workout.notes,
                        description: workout.description
                      },
                      nutritionFoods: workout.nutritionFoods || [],
                      sports: Array.from(new Set((workout.nutritionFoods || []).map((mf: any) => mf.sport).filter(Boolean)))
                    })
                  };
                  
                  setWorkoutForOverview(transformedWorkout);
                  setDayForWorkoutOverview(day);
                  setShowMealOverviewModal(true);
                }}
                 onCopyNutritionFood={(nutritionFood, workout, day) => {
                   setCopiedNutritionFood(nutritionFood);
                   setActiveWorkout(workout);
                   setActiveDay(day);
                   modalActions.setShowCopyNutritionFoodModal(true);
                 }}
                 onMoveNutritionFood={(nutritionFood, workout, day) => {
                   setCopiedNutritionFood(nutritionFood);
                   setActiveWorkout(workout);
                   setActiveDay(day);
                   modalActions.setShowMoveNutritionFoodModal(true);
                 }}
                onOpenColumnSettings={(tableType) => {
                  modalActions.setColumnSettingsTableType(tableType);
                  modalActions.setShowColumnSettingsModal(true);
                }}
                 columnSettings={columnSettings}
                onPlanGymWeek={() => {
                  setPlanGymWeekWizardInitialStep(1);
                  setShowPlanGymWeekModal(true);
                }}
                 reloadWorkouts={async () => {
                   await loadNutritionData(activeSection);
                 }}
                 onDeleteNutritionFood={async (nutritionFood, workout, day) => {
                   if (confirm(`Are you sure you want to delete nutritionFood ${nutritionFood.letter || nutritionFood.code}?`)) {
                     try {
                       const token = localStorage.getItem('token');
                       const response = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
                         method: 'DELETE',
                         headers: { 'Authorization': `Bearer ${token}` }
                       });
                       
                       if (response.ok) {
                         showMessage('success', 'NutritionFood deleted successfully');
                         
                         // Clear any references to this nutritionFood
                         if (activeNutritionFood?.id === nutritionFood.id) {
                           setActiveNutritionFood(null);
                         }
                         if (editingNutritionFood?.id === nutritionFood.id) {
                           setEditingNutritionFood(null);
                         }
                         if (copiedNutritionFood?.id === nutritionFood.id) {
                           setCopiedNutritionFood(null);
                         }
                         
                         // Refresh workout data to remove deleted nutritionFood from view
                         await loadNutritionData(activeSection);
                       } else {
                         showMessage('error', 'Failed to delete nutritionFood');
                       }
                     } catch (error) {
                       console.error('Error deleting nutritionFood:', error);
                       showMessage('error', 'Error deleting nutritionFood');
                     }
                   }
                 }}
                 onDeleteNutritionComponent={async (nutritionComponent, nutritionFood, workout, day) => {
                   if (confirm('Are you sure you want to delete this nutritionComponent?')) {
                     try {
                       const token = localStorage.getItem('token');
                       const response = await fetch(`/api/nutrition/nutrition_components/${nutritionComponent.id}`, {
                         method: 'DELETE',
                         headers: { 'Authorization': `Bearer ${token}` }
                       });
                       
                       if (response.ok) {
                         showMessage('success', 'NutritionComponent deleted successfully');
                         
                         // Clear any references to this nutritionComponent
                         if (activeNutritionComponent?.id === nutritionComponent.id) {
                           setActiveNutritionComponent(null);
                         }
                         if (editingNutritionComponent?.id === nutritionComponent.id) {
                           setEditingNutritionComponent(null);
                         }
                         
                         // Refresh workout data to remove deleted nutritionComponent from view
                         await loadNutritionData(activeSection);
                       } else {
                         showMessage('error', 'Failed to delete nutritionComponent');
                       }
                     } catch (error) {
                       console.error('Error deleting nutritionComponent:', error);
                       showMessage('error', 'Error deleting nutritionComponent');
                     }
                   }
                 }}
               />
               </StyledTableWrapper>
              </>
            )}
          </div>
        </main>
      </div>
      
      {modals.showAddMealModal && addNutritionDay && (
        <AddMealModal
          isOpen={modals.showAddMealModal}
          day={addNutritionDay}
          existingWorkouts={addNutritionDay.meals || []}
          mode={workoutModalMode}
          existingWorkout={editingWorkout}
          activeSection={activeSection as 'A' | 'B' | 'C'}
          onClose={() => {
            modalActions.closeAddMealModal();
            setAddNutritionDay(null);
            setEditingWorkout(null);
            modalActions.setWorkoutModalMode('add');
          }}
          onEdit={() => {
            // Switch from view mode to edit mode
            setWorkoutModalMode('edit');
          }}
          onSave={async (workoutData) => {
            const deps = getHandlerDeps();
            
            if (workoutModalMode === 'edit' && editingWorkout) {
              // UPDATE existing workout
              await nutritionMealHandlers.updateWorkout(editingWorkout.id, workoutData, deps);
            } else {
              // CREATE new workout
              const dayExists = nutritionPlan?.weeks?.some((week: any) => 
                week.days?.some((day: any) => day.id === workoutData.dayId)
              ) ?? false;
              await nutritionMealHandlers.createWorkout(workoutData, dayExists, deps);
            }
            
            // Keep day and its parent week expanded (for new workouts)
            if (workoutModalMode === 'add' && addNutritionDay) {
              // Auto-expand the day using toggle if it's not already expanded
              if (!expandedDays.has(addNutritionDay.id)) {
                toggleDayExpansion(addNutritionDay.id);
              }
              
              // Find and expand the parent week
              const parentWeek = nutritionPlan?.weeks?.find((week: any) => 
                week.days?.some((day: any) => day.id === addNutritionDay.id)
              );
              if (parentWeek && !expandedWeeks.has(parentWeek.id)) {
                toggleWeekExpansion(parentWeek.id);
              }
              
              // Auto-expand the day to show the new workout
              setAutoExpandDayId(addNutritionDay.id);
              setTimeout(() => setAutoExpandDayId(null), 500); // Clear after expansion
            }
            
            modalActions.setShowAddMealModal(false);
            setAddNutritionDay(null);
            setEditingWorkout(null);
            setWorkoutModalMode('add');
            
            // Refresh workout data to show the changes
            await loadNutritionData(activeSection);
          }}
        />
      )}

      {/* NutritionMeal Info Modal (Read-only view) */}
      {showNutritionMealInfoModal && editingWorkout && addNutritionDay && (
        <NutritionMealInfoModal
          isOpen={showNutritionMealInfoModal}
          workout={editingWorkout}
          day={addNutritionDay}
          onClose={() => {
            setShowNutritionMealInfoModal(false);
            setEditingWorkout(null);
            setAddNutritionDay(null);
          }}
          onEdit={() => {
            // Switch to edit mode
            setShowNutritionMealInfoModal(false);
            setWorkoutModalMode('edit');
            modalActions.setShowAddMealModal(true);
          }}
        />
      )}
      
       {modals.showAddNutritionFoodModal && activeWorkout && activeDay && nutritionFoodModalMode === 'add' && !editingNutritionFood ? (
         <AddDietframeModal
           isOpen={modals.showAddNutritionFoodModal}
           meal={activeWorkout}
           mealLabel={
             MEAL_LABELS[activeWorkout.sessionNumber ?? 1] ||
             activeWorkout.name ||
             `Meal ${activeWorkout.sessionNumber ?? ''}`
           }
           isSaving={savingDietframe}
           onClose={() => {
             modalActions.setShowAddNutritionFoodModal(false);
             setActiveWorkout(null);
             setActiveDay(null);
             setSelectedWorkout(null);
             setSelectedDay(null);
             setNutritionFoodInsertIndex(null);
           }}
           onSave={async (payloads) => {
             setSavingDietframe(true);
             try {
               for (const payload of payloads) {
                 await nutritionFoodHandlers.createNutritionFood(payload, getHandlerDeps());
               }
               modalActions.setShowAddNutritionFoodModal(false);
               setNutritionFoodInsertIndex(null);
             } catch (err: any) {
               showMessage('error', err?.message || 'Failed to add dietframe');
             } finally {
               setSavingDietframe(false);
             }
           }}
         />
       ) : modals.showAddNutritionFoodModal && activeWorkout && activeDay ? (
         <AddEditNutritionFoodModal
           isOpen={modals.showAddNutritionFoodModal}
           mode={nutritionFoodModalMode}
           workout={activeWorkout}
           day={activeDay}
           existingNutritionFood={editingNutritionFood}
            onSetInsertIndex={(index) => setNutritionFoodInsertIndex(index)}
            editingFromNutritionComponent={editingFromNutritionComponent}
            editingNutritionComponentTarget={editingCircuitStation}
            targetNutritionComponent={activeNutritionComponent}
            startInSecondView={startInCircuitGrid}
            openInBatterySubmenu={openNutritionFoodInBatterySubmenu}
            onClose={() => {
              modalActions.setShowAddNutritionFoodModal(false);
            setActiveWorkout(null);
            setActiveDay(null);
            setSelectedWorkout(null);
              setSelectedDay(null);
            setEditingNutritionFood(null);
            setNutritionFoodModalMode('add');
            setNutritionFoodInsertIndex(null); // Reset insert index
            setEditingFromNutritionComponent(false);
            setStartInCircuitGrid(false);
            setOpenNutritionFoodInBatterySubmenu(null);
            setEditingCircuitStation(null);
            }}
            onSave={async (nutritionFoodData) => {
             console.log(`📤 ${nutritionFoodModalMode === 'edit' ? 'Updating' : 'Creating'} nutritionFood with data:`, nutritionFoodData);
             
             try {
               const deps = getHandlerDeps();
               
               if (nutritionFoodModalMode === 'edit' && editingNutritionFood) {
                const resolvedNutritionFoodData = (editingFromNutritionComponent && editingNutritionFood)
                  ? {
                      ...nutritionFoodData,
                      sport: editingNutritionFood.sport,
                      type: editingNutritionFood.type,
                      sectionId: editingNutritionFood.sectionId,
                      manualMode: editingNutritionFood.manualMode || false,
                      manualPriority: editingNutritionFood.manualPriority || false,
                      manualInputType: editingNutritionFood.manualInputType || 'meters',
                      manualRepetitions: editingNutritionFood.manualRepetitions,
                      manualDistance: editingNutritionFood.manualDistance,
                      appliedTechnique: editingNutritionFood.appliedTechnique,
                      aerobicSeries: editingNutritionFood.aerobicSeries
                    }
                  : nutritionFoodData;
                const shouldUpdateNutritionFood = !(editingFromNutritionComponent && activeNutritionComponent && resolvedNutritionFoodData.type === 'BATTERY');
                if (shouldUpdateNutritionFood) {
                  // UPDATE existing nutritionFood
                  console.log('🔄 [UPDATE] Updating nutritionFood with manualPriority:', resolvedNutritionFoodData.manualPriority);
                  // 2026-01-22 10:45 UTC - Prepare notes field with circuit config if applicable
                  const existingNotes = typeof editingNutritionFood?.notes === 'string' ? editingNutritionFood.notes : '';
                  let updateNotes = resolvedNutritionFoodData.notes || (editingFromNutritionComponent ? existingNotes : '');
                  const circuitDataMatch = existingNotes.match(/\[CIRCUIT_DATA\]([\s\S]*?)\[\/CIRCUIT_DATA\]/);
                  let circuitDataFromNotes: any = null;
                  if (circuitDataMatch?.[1]) {
                    try {
                      circuitDataFromNotes = JSON.parse(circuitDataMatch[1]);
                    } catch {
                      circuitDataFromNotes = null;
                    }
                  }
                  const resolvedCircuitConfig = resolvedNutritionFoodData.circuitConfig ?? circuitDataFromNotes?.config ?? editingNutritionFood?.circuitConfig ?? null;
                  const resolvedCircuits = resolvedNutritionFoodData.circuits ?? circuitDataFromNotes?.circuits ?? editingNutritionFood?.circuits ?? null;
                  const resolvedIsCircuitBased = resolvedNutritionFoodData.isCircuitBased ?? editingNutritionFood?.isCircuitBased ?? !!resolvedCircuitConfig;
                  if (resolvedIsCircuitBased && resolvedCircuitConfig) {
                    const baseNotes = (updateNotes || '')
                      .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
                      .trim();
                    const circuitMeta = {
                      isCircuitBased: true,
                      config: resolvedCircuitConfig,
                      circuits: resolvedCircuits
                    };
                    const metaString = `[CIRCUIT_DATA]${JSON.stringify(circuitMeta)}[/CIRCUIT_DATA]`;
                    updateNotes = baseNotes ? `${baseNotes}\n\n${metaString}` : metaString;
                  }
                  
                  await nutritionFoodHandlers.updateNutritionFood(editingNutritionFood.id, {
                     sport: resolvedNutritionFoodData.sport,
                     type: resolvedNutritionFoodData.type,
                     description: resolvedNutritionFoodData.description,
                     notes: updateNotes,
                     macroFinal: resolvedNutritionFoodData.macroFinal,
                    repetitions: resolvedNutritionFoodData.repetitions,
                    alarm: resolvedNutritionFoodData.alarm,
                    sectionId: resolvedNutritionFoodData.sectionId,
                    manualMode: resolvedNutritionFoodData.manualMode || false,
                   manualPriority: resolvedNutritionFoodData.manualPriority || false,
                    manualInputType: resolvedNutritionFoodData.manualInputType || 'meters',
                    manualRepetitions: resolvedNutritionFoodData.manualRepetitions,
                    manualDistance: resolvedNutritionFoodData.manualDistance,
                    appliedTechnique: resolvedNutritionFoodData.appliedTechnique,
                    aerobicSeries: resolvedNutritionFoodData.aerobicSeries,
                    // Annotation fields
                    annotationText: resolvedNutritionFoodData.annotationText,
                    annotationBgColor: resolvedNutritionFoodData.annotationBgColor,
                    annotationTextColor: resolvedNutritionFoodData.annotationTextColor,
                    annotationBold: resolvedNutritionFoodData.annotationBold
                  }, deps);
                }
                
                // ALWAYS regenerate nutrition_components for non-ANNOTATION types when editing
                // This ensures Rip\Sets column and all nutritionComponent data stays in sync
                // 2026-01-28 - Skip regeneration for manual mode nutritionFoods (preserve user's custom summary)
                if (resolvedNutritionFoodData.type === 'BATTERY' && Array.isArray(resolvedNutritionFoodData.nutritionComponents) && resolvedNutritionFoodData.nutritionComponents.length > 0) {
                  if (editingFromNutritionComponent && activeNutritionComponent) {
                    const existingNutritionFoodNotes = typeof editingNutritionFood?.notes === 'string' ? editingNutritionFood.notes : '';
                    const existingCircuitMatch = existingNutritionFoodNotes.match(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/);
                    const circuitConfigToStore = resolvedNutritionFoodData.circuitConfig ?? editingNutritionFood?.circuitConfig ?? null;
                    const circuitsToStore = resolvedNutritionFoodData.circuits ?? editingNutritionFood?.circuits ?? null;
                    if (!existingCircuitMatch && (circuitConfigToStore || circuitsToStore)) {
                      const baseNotes = (resolvedNutritionFoodData.notes || existingNutritionFoodNotes || '')
                        .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
                        .trim();
                      const circuitMeta = {
                        isCircuitBased: true,
                        config: circuitConfigToStore,
                        circuits: circuitsToStore
                      };
                      const metaString = `[CIRCUIT_DATA]${JSON.stringify(circuitMeta)}[/CIRCUIT_DATA]`;
                      const restoredNotes = baseNotes ? `${baseNotes}\n\n${metaString}` : metaString;
                      await nutritionFoodHandlers.updateNutritionFood(editingNutritionFood.id, { notes: restoredNotes }, deps);
                    }
                    const target = editingCircuitStation || {
                      circuitLetter: activeNutritionComponent.circuitLetter,
                      circuitIndex: activeNutritionComponent.circuitIndex,
                      localSeriesNumber: activeNutritionComponent.localSeriesNumber,
                      stationNumber: activeNutritionComponent.stationNumber
                    };

                    const matchedLap = resolvedNutritionFoodData.nutritionComponents.find((lap: any) => {
                      const letterMatch = target?.circuitLetter ? lap.circuitLetter === target.circuitLetter : true;
                      const indexMatch = typeof target?.circuitIndex === 'number' ? lap.circuitIndex === target.circuitIndex : true;
                      const seriesMatch = typeof target?.localSeriesNumber === 'number' ? lap.localSeriesNumber === target.localSeriesNumber : true;
                      const stationMatch = typeof target?.stationNumber === 'number' ? lap.stationNumber === target.stationNumber : true;
                      return letterMatch && indexMatch && seriesMatch && stationMatch;
                    });

                    if (matchedLap) {
                      let pauseValue = matchedLap.pause ?? activeNutritionComponent.pause ?? null;
                      if (typeof pauseValue === 'number') {
                        const minutes = Math.floor(pauseValue / 60);
                        const seconds = pauseValue % 60;
                        pauseValue = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
                      }
                      let updatedPauseValue = pauseValue;
                      let updatedMacroFinal =
                        matchedLap.macroFinal !== undefined && matchedLap.macroFinal !== null && matchedLap.macroFinal !== ''
                          ? matchedLap.macroFinal
                          : activeNutritionComponent.macroFinal ?? null;

                      // Circuit planner puts macro duration on both Pause (formatted rest) and macroFinal on the final lap.
                      // The generic modal heuristic below swaps/clears pause when only macro was set — that wipes Pause on circuit saves.
                      if (!matchedLap.circuitLetter) {
                        const hasExplicitMacro =
                          activeNutritionComponent.macroFinal !== null &&
                          activeNutritionComponent.macroFinal !== undefined &&
                          activeNutritionComponent.macroFinal !== '';
                        const hasExplicitPause =
                          activeNutritionComponent.pause !== null &&
                          activeNutritionComponent.pause !== undefined &&
                          activeNutritionComponent.pause !== '';
                        if (hasExplicitMacro && !hasExplicitPause) {
                          updatedPauseValue = null;
                          updatedMacroFinal = pauseValue;
                        } else if (hasExplicitPause && !hasExplicitMacro) {
                          updatedPauseValue = pauseValue;
                          updatedMacroFinal = null;
                        } else if (!hasExplicitPause && !hasExplicitMacro) {
                          updatedPauseValue = pauseValue;
                          updatedMacroFinal = null;
                        }
                      }

                      const existingNotes = typeof activeNutritionComponent.notes === 'string' ? activeNutritionComponent.notes : '';
                      let updatedNotes = matchedLap.notes || existingNotes || '';
                      const metaMatch = existingNotes.match(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/);
                      if (metaMatch) {
                        updatedNotes = updatedNotes ? `${updatedNotes}\n${metaMatch[0]}` : metaMatch[0];
                      }

                      const token = localStorage.getItem('token');
                      if (!token) {
                        showMessage('error', 'Authentication required');
                        return;
                      }

                      const response = await fetch(`/api/nutrition/nutritionComponents?id=${activeNutritionComponent.id}`, {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          speed: matchedLap.reps ? String(matchedLap.reps) : activeNutritionComponent.speed,
                          style: matchedLap.sector || activeNutritionComponent.style,
                          pause: updatedPauseValue,
                          macroFinal: updatedMacroFinal,
                          notes: updatedNotes,
                          muscularSector: matchedLap.sector || activeNutritionComponent.muscularSector,
                          exercise: matchedLap.exercise || activeNutritionComponent.exercise,
                          reps: matchedLap.reps ?? activeNutritionComponent.reps
                        })
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData?.error || 'Failed to update nutritionComponent');
                      }

                      console.log('✅ Updated single circuit nutritionComponent without regenerating table');
                    } else {
                      showMessage('warning', 'Unable to match the edited station to update');
                    }
                  } else {
                    const token = localStorage.getItem('token');
                    
                    const deletePromises = (editingNutritionFood.nutritionComponents || []).map((nutritionComponent: any) =>
                      fetch(`/api/nutrition/nutrition_components/${nutritionComponent.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                    );
                    await Promise.all(deletePromises);
                    console.log(`✅ Deleted ${deletePromises.length} existing nutrition_components`);
                    
                    const newNutritionComponents = [...resolvedNutritionFoodData.nutritionComponents].sort((a: any, b: any) =>
                      (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
                    );
                    
                    for (let index = 0; index < newNutritionComponents.length; index++) {
                      const lap = newNutritionComponents[index];
                      
                      let nutritionComponentNotes = lap.notes || '';
                      if (lap.circuitLetter) {
                        const circuitMeta = {
                          circuitLetter: lap.circuitLetter,
                          circuitIndex: lap.circuitIndex,
                          seriesNumber: lap.seriesNumber,
                          localSeriesNumber: lap.localSeriesNumber,
                          stationNumber: lap.stationNumber,
                          sector: lap.sector
                        };
                        const metaString = `\n[CIRCUIT_META]${JSON.stringify(circuitMeta)}[/CIRCUIT_META]`;
                        nutritionComponentNotes = nutritionComponentNotes + metaString;
                      }
                      
                      let pauseValue = lap.pause || null;
                      if (typeof pauseValue === 'number') {
                        const minutes = Math.floor(pauseValue / 60);
                        const seconds = pauseValue % 60;
                        pauseValue = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
                      }
                      
                      await fetch('/api/nutrition/nutrition_components', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          nutritionFoodId: editingNutritionFood.id,
                          repetitionNumber: lap.repetitionNumber || (index + 1),
                          distance: lap.distance || null,
                          speed: (lap.circuitLetter && lap.reps) ? String(lap.reps) : (lap.speed || null),
                          style: lap.circuitLetter ? (lap.sector || lap.style || null) : (lap.style || null),
                          pace: lap.pace || null,
                          time: lap.time || null,
                          rowPerMin: lap.rowPerMin || null,
                          pause: pauseValue,
                          alarm: lap.alarm || null,
                          sound: lap.sound || null,
                          notes: nutritionComponentNotes || null,
                          reps: lap.reps || null,
                          weight: lap.weight || null,
                          tools: lap.tools || null,
                          muscularSector: lap.muscularSector || null,
                          exercise: lap.exercise || null,
                          restType: lap.restType || null,
                          r1: lap.r1 || null,
                          r2: lap.r2 || null,
                          macroFinal: lap.macroFinal || null,
                          status: lap.status || 'PENDING'
                        })
                      });
                    }
                    
                    console.log(`✅ Created ${newNutritionComponents.length} new nutrition_components with updated circuit data`);
                    console.log(`📊 Rip\\Sets column will now show: ${newNutritionComponents.length}`);
                  }
                } else if (nutritionFoodData.type !== 'ANNOTATION' && !nutritionFoodData.manualMode) {
                   const baseReps = parseInt(nutritionFoodData.repetitions) || 1;
                   const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                   const seriesMultiplier = AEROBIC_SPORTS.includes(nutritionFoodData.sport) ? (parseInt(nutritionFoodData.aerobicSeries) || 1) : 1;
                   const newRepsCount = baseReps * seriesMultiplier;
                   console.log(`🔄 Editing nutritionFood - regenerating ${newRepsCount} nutrition_components (${baseReps} reps × ${seriesMultiplier} series) to ensure data sync...`);
                   
                   const token = localStorage.getItem('token');
                   
                   // Delete ALL existing nutrition_components
                   const deletePromises = (editingNutritionFood.nutritionComponents || []).map((nutritionComponent: any) =>
                     fetch(`/api/nutrition/nutrition_components/${nutritionComponent.id}`, {
                       method: 'DELETE',
                       headers: { 'Authorization': `Bearer ${token}` }
                     })
                   );
                   await Promise.all(deletePromises);
                   console.log(`✅ Deleted ${deletePromises.length} existing nutrition_components`);
                   
                   // Generate new nutrition_components with updated data
                   const newNutritionComponents = generateNutritionComponents(nutritionFoodData);
                   
                   // Create new nutrition_components
                   for (const nutritionComponent of newNutritionComponents) {
                     await fetch('/api/nutrition/nutrition_components', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`
                       },
                       body: JSON.stringify({
                         ...nutritionComponent,
                         nutritionFoodId: editingNutritionFood.id
                       })
                     });
                   }
                   
                   console.log(`✅ Created ${newNutritionComponents.length} new nutrition_components with updated data`);
                   console.log(`📊 Rip\\Sets column will now show: ${newNutritionComponents.length}`);
                 } else if (nutritionFoodData.type === 'BATTERY' && nutritionFoodData.nutritionComponents) {
                   // 2026-01-30 - Regenerate nutrition_components for BATTERY/Circuit type
                   console.log(`🔄 Editing BATTERY nutritionFood - regenerating ${nutritionFoodData.nutritionComponents.length} nutritionComponents...`);
                   
                   const token = localStorage.getItem('token');
                   
                   // Delete ALL existing nutrition_components
                   const deletePromises = (editingNutritionFood.nutritionComponents || []).map((nutritionComponent: any) =>
                     fetch(`/api/nutrition/nutrition_components/${nutritionComponent.id}`, {
                       method: 'DELETE',
                       headers: { 'Authorization': `Bearer ${token}` }
                     })
                   );
                   await Promise.all(deletePromises);
                   
                   // Create new nutrition_components from the provided list
                   for (const nutritionComponent of nutritionFoodData.nutritionComponents) {
                     await fetch('/api/nutrition/nutrition_components', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`
                       },
                       body: JSON.stringify({
                         ...nutritionComponent,
                         nutritionFoodId: editingNutritionFood.id
                       })
                     });
                   }
                   console.log(`✅ Replaced nutrition_components for BATTERY nutritionFood`);
                 } else if (nutritionFoodData.manualMode && editingNutritionFood.nutritionComponents && editingNutritionFood.nutritionComponents.length > 0) {
                   // For manual mode nutritionFoods, update the existing nutritionComponent's notes instead of regenerating
                   const token = localStorage.getItem('token');
                   const existingNutritionComponent = editingNutritionFood.nutritionComponents[0];
                   
                   console.log('📝 [UPDATE] Updating manual nutritionComponent notes with nutritionFood content...');
                   
                   await fetch(`/api/nutrition/nutrition_components/${existingNutritionComponent.id}`, {
                     method: 'PUT',
                     headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`
                     },
                     body: JSON.stringify({
                       notes: nutritionFoodData.notes || nutritionFoodData.description || ''
                     })
                   });
                   
                   console.log('✅ Updated manual nutritionComponent notes');
                 }
                 
                 // Keep edited nutritionFood expanded so circuit nutritionComponent table stays visible
                 setAutoExpandNutritionFoodId(editingNutritionFood.id);
                 // Reload data to show changes (updates Rip\Sets column)
                if (editingNutritionFood?.id) {
                  setAutoExpandNutritionFoodId(editingNutritionFood.id);
                  setTimeout(() => {
                    setAutoExpandNutritionFoodId(null);
                  }, UI_CONFIG.AUTO_EXPAND_DELAY);
                }
                 await loadNutritionData(activeSection);
                 setTimeout(() => setAutoExpandNutritionFoodId(null), 500);
                } else {
                  // CREATE new nutritionFood
                  console.log('🔍 [DEBUG] nutritionFoodData before generateNutritionComponents:', {
                    planningMode: nutritionFoodData.planningMode,
                    individualPlans: nutritionFoodData.individualPlans,
                    individualPlansLength: nutritionFoodData.individualPlans?.length,
                    repetitions: nutritionFoodData.repetitions,
                    sport: nutritionFoodData.sport
                  });
                  
                  // Log individual plans in detail
                  if (nutritionFoodData.individualPlans && nutritionFoodData.individualPlans.length > 0) {
                    console.log('📋 Individual Plans (detailed):');
                    nutritionFoodData.individualPlans.forEach((plan: any, index: number) => {
                      console.log(`  Plan ${index + 1}:`, {
                        reps: plan.reps,
                        weight: plan.weight,
                        tools: plan.tools,
                        speed: plan.speed,
                        time: plan.time,
                        pause: plan.pause
                      });
                    });
                  }

                  // For Fast Planner/Circuit flows, preserve nutrition_components generated by the planner UI.
                  // Falling back to generic generation here causes corrupted preview lines (e.g. ?\?) for aerobic fast plans.
                  const hasPlannerNutritionComponents = Array.isArray(nutritionFoodData.nutritionComponents) && nutritionFoodData.nutritionComponents.length > 0;
                  const nutritionComponents = hasPlannerNutritionComponents ? nutritionFoodData.nutritionComponents : generateNutritionComponents(nutritionFoodData);

                  // Require at least one nutritionComponent for non-ANNOTATION types (e.g. Fast Planner / BATTERY)
                  if (nutritionFoodData.type !== 'ANNOTATION' && !nutritionFoodData.manualMode && (!nutritionComponents || nutritionComponents.length === 0)) {
                    showMessage('error', 'Add at least one exercise before saving.');
                    return;
                  }

                  console.log('📤 Generated nutrition_components (count):', nutritionComponents.length);
                  console.log('📤 Generated nutrition_components (detailed):');
                  nutritionComponents.forEach((lap: any, index: number) => {
                    console.log(`  NutritionComponent ${index + 1}:`, {
                      reps: lap.reps,
                      weight: lap.weight,
                      tools: lap.tools,
                      speed: lap.speed,
                      time: lap.time,
                      pause: lap.pause
                    });
                  });
               
                // 2026-01-22 10:45 UTC - Prepare notes field with circuit config if applicable
                // 2026-01-22 11:00 UTC - Fixed: Embed circuit config in notes field properly
                let finalNotes = nutritionFoodData.notes || '';
                if (nutritionFoodData.isCircuitBased && nutritionFoodData.circuitConfig) {
                  const baseNotes = (finalNotes || '')
                    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
                    .trim();
                  const circuitMeta = {
                    isCircuitBased: true,
                    config: nutritionFoodData.circuitConfig,
                    circuits: nutritionFoodData.circuits
                  };
                  const metaString = `[CIRCUIT_DATA]${JSON.stringify(circuitMeta)}[/CIRCUIT_DATA]`;
                  finalNotes = baseNotes ? `${baseNotes}\n\n${metaString}` : metaString;
                  
                  console.log('✅ Circuit config embedded in notes:', {
                    hasCircuitData: true,
                    notesLength: finalNotes.length,
                    circuitConfig: nutritionFoodData.circuitConfig
                  });
                }
                
                // 2026-01-22 11:00 UTC - Build request body with only valid Prisma schema fields
                const requestBody = {
                   nutritionMealId: activeWorkout.id,
                  sport: nutritionFoodData.sport,
                  type: nutritionFoodData.type || 'STANDARD',
                   description: nutritionFoodData.description,
                   notes: finalNotes,  // Contains embedded circuit data if applicable
                   macroFinal: nutritionFoodData.macroFinal,
                   alarm: nutritionFoodData.alarm,
                   nutritionComponents,  // NutritionComponents already generated by CircuitPlanner
                  repetitions: nutritionFoodData.repetitions,
                  sectionId: nutritionFoodData.sectionId || 'default',
                  manualMode: nutritionFoodData.manualMode || false,
                 manualPriority: nutritionFoodData.manualPriority || false,
                  manualInputType: nutritionFoodData.manualInputType || 'meters',
                  // Manual mode fields for NutritionFood model
                  manualRepetitions: nutritionFoodData.manualRepetitions,
                  manualDistance: nutritionFoodData.manualDistance,
                  // Aerobic series field
                  appliedTechnique: nutritionFoodData.appliedTechnique,
                  aerobicSeries: nutritionFoodData.aerobicSeries,
                  // Annotation fields
                  annotationText: nutritionFoodData.annotationText,
                  annotationBgColor: nutritionFoodData.annotationBgColor,
                  annotationTextColor: nutritionFoodData.annotationTextColor,
                  annotationBold: nutritionFoodData.annotationBold
                };
                
                // 2026-01-22 11:00 UTC - IMPORTANT: Don't include circuit-specific fields in request
                // They are already embedded in the notes field above
               
                console.log('🚨🚨🚨 [CREATE] CRITICAL DEBUG - manualInputType:');
                console.log('  From nutritionFoodData:', nutritionFoodData.manualInputType);
                console.log('  Type:', typeof nutritionFoodData.manualInputType);
                console.log('  Is undefined?:', nutritionFoodData.manualInputType === undefined);
                console.log('  Is null?:', nutritionFoodData.manualInputType === null);
                console.log('  In requestBody:', requestBody.manualInputType);
                console.log('  Full nutritionFoodData:', nutritionFoodData);
               
                console.log('📤 Creating nutritionFood with request body:', {
                  ...requestBody,
                  manualMode: nutritionFoodData.manualMode,
                 manualPriority: nutritionFoodData.manualPriority,
                  hasNotes: !!requestBody.notes,
                  notesLength: requestBody.notes?.length || 0,
                  nutritionComponentCount: nutritionComponents.length
                });
                 
                const result = await nutritionFoodHandlers.createNutritionFood(requestBody, deps);
                 console.log('✅ NutritionFood created successfully:', result);
                 
                 // If we have an insert index, reorder the nutritionFoods BEFORE reloading
                 if (nutritionFoodInsertIndex !== null) {
                   console.log('📍 Inserting new nutritionFood at index:', nutritionFoodInsertIndex);
                   
                   const token = localStorage.getItem('token');
                   // Fetch fresh workout plan data directly from API
                   const planType = sectionHelpers.getPlanType(activeSection);
                   const planResponse = await fetch(`/api/nutrition/plan?type=${planType}`, {
                     headers: {
                       'Authorization': `Bearer ${token}`
                     }
                   });
                   
                   if (planResponse.ok) {
                     const freshPlanData = await planResponse.json();
                     const updatedWorkout = freshPlanData.plan?.weeks
                       ?.flatMap((w: any) => w.days)
                       ?.find((d: any) => d.id === activeDay.id)
                       ?.meals?.find((w: any) => w.id === activeWorkout.id);
                   
                     if (updatedWorkout && updatedWorkout.nutritionFoods && updatedWorkout.nutritionFoods.length > 1) {
                       const nutritionFoods = [...updatedWorkout.nutritionFoods];
                       const newNutritionFoodId = result.nutritionFood.id;
                       
                       // Find the new nutritionFood
                       const newNutritionFoodIndex = nutritionFoods.findIndex((mf: any) => mf.id === newNutritionFoodId);
                       
                       if (newNutritionFoodIndex !== -1 && newNutritionFoodIndex !== nutritionFoodInsertIndex) {
                         console.log('📍 Reordering: moving nutritionFood from position', newNutritionFoodIndex, 'to', nutritionFoodInsertIndex);
                         
                         // Remove the new nutritionFood from its current position
                         const [newNutritionFood] = nutritionFoods.splice(newNutritionFoodIndex, 1);
                         
                         // Insert it at the desired position
                         nutritionFoods.splice(nutritionFoodInsertIndex, 0, newNutritionFood);
                         
                         // Reassign letters
                         const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                         const reorderedNutritionFoods = nutritionFoods.map((mf: any, idx: number) => ({
                           id: mf.id,
                           letter: letters[idx] || `${letters[25]}${idx - 25}`
                         }));
                         
                         // Call reorder API
                         const reorderResponse = await fetch('/api/nutrition/nutrition_foods/reorder', {
                           method: 'PATCH',
                           headers: {
                             'Content-Type': 'application/json',
                             'Authorization': `Bearer ${token}`
                           },
                           body: JSON.stringify({
                             nutritionFoods: reorderedNutritionFoods
                           })
                         });
                         
                         if (!reorderResponse.ok) {
                           const errorData = await reorderResponse.json();
                           console.error('❌ Failed to reorder nutritionFoods:', errorData);
                           showMessage('error', 'Failed to reorder nutrition_foods');
                         } else {
                           console.log('✅ NutritionFoods reordered successfully');
                         }
                       }
                     }
                   }
                   
                   // Reset insert index
                   setNutritionFoodInsertIndex(null);
                 }
                 
                 // Reload data to show the final result
                 await loadNutritionData(activeSection);
               }
                
                // Keep workout expanded
               if (activeWorkout && !expandedWorkouts.has(activeWorkout.id)) {
                  toggleWorkoutExpansion(activeWorkout.id);
                }
                
               // Auto-expand the day and workout
               if (activeDay && activeWorkout) {
                 setAutoExpandDayId(activeDay.id);
                 setAutoExpandWorkoutId(activeWorkout.id);
                  setTimeout(() => {
                    setAutoExpandDayId(null);
                    setAutoExpandWorkoutId(null);
                 }, 500);
                }
             } catch (error: any) {
               console.error('❌ Failed to save nutritionFood:', error);
               showMessage('error', error.message || 'Failed to save nutritionFood');
               throw error;
               }
           }}
        />
       ) : null}
       
      <PlanGymWeekModal
        isOpen={showPlanGymWeekModal}
        initialStepOnOpen={planGymWeekWizardInitialStep}
        onClose={() => {
          setShowPlanGymWeekModal(false);
          setPlanGymWeekWizardInitialStep(1);
        }}
        questionImages={{
          q1: '/plan-gym-week/q1.jpg',
          q2: '/plan-gym-week/q2.jpg',
          q3: '/plan-gym-week/q3.jpg',
          q4: '/plan-gym-week/q4.jpg'
        }}
        onProceed={(answers: PlanGymWeekAnswers) => {
          setShowPlanGymWeekModal(false);
          setPlanGymWeekWizardInitialStep(1);
          setPlanGymWeekTrainingLevel(answers.trainingLevel);
          setPlanGymWeekGoals(answers.goals ?? []);
          if (answers.sectorSelectionMode === 'manual') {
            setPlanGymWeekManualDaysCount(answers.daysCount);
            setPlanGymWeekInitialPlan(null);
            setPlanGymWeekRescanParams(null);
            setShowPlanGymWeekManualForm(true);
          } else {
            setPlanGymWeekRescanParams({
              daysCount: answers.daysCount,
              timesPerSector: answers.timesPerSector,
              distributionType: answers.distributionType,
              constantSectors: answers.constantSectors,
              trainingLevel: answers.trainingLevel,
            });
            const plan = buildHelpedRoutines({
              daysCount: answers.daysCount,
              timesPerSector: answers.timesPerSector,
              distributionType: answers.distributionType,
              constantSectors: answers.constantSectors,
              trainingLevel: answers.trainingLevel,
            });
            setPlanGymWeekInitialPlan(plan);
            setPlanGymWeekManualDaysCount(plan.daysCount);
            setShowPlanGymWeekManualForm(true);
          }
        }}
      />

      {showPlanGymWeekManualForm && (
        <PlanGymWeekManualModal
          isOpen={showPlanGymWeekManualForm}
          initialDaysCount={planGymWeekManualDaysCount}
          initialPlan={planGymWeekInitialPlan}
          goals={planGymWeekGoals}
          nutritionPlan={nutritionPlan as any}
          rescanParams={planGymWeekRescanParams}
          trainingLevel={planGymWeekTrainingLevel}
          onBack={() => {
            setPlanGymWeekWizardInitialStep(2);
            setShowPlanGymWeekManualForm(false);
            setShowPlanGymWeekModal(true);
          }}
          onClose={() => {
            setShowPlanGymWeekManualForm(false);
            setPlanGymWeekInitialPlan(null);
            setPlanGymWeekRescanParams(null);
            setPlanGymWeekTrainingLevel(null);
          }}
          onCreateRoutines={(result: PlanGymWeekManualResult) => {
            setShowPlanGymWeekManualForm(false);
            setPlanGymWeekInitialPlan(null);
            setPlanGymWeekRescanParams(null);
            // Keep trainingLevel until Fast Plan closes — needed for Lev 1–2 vs 3–4 vs 5 distribution tables
            setPlanGymWeekCreatedPlan(result);
          }}
        />
      )}

      {planGymWeekCreatedPlan && (
        <PlanGymWeekFastPlanModal
          isOpen={!!planGymWeekCreatedPlan}
          plan={planGymWeekCreatedPlan}
          goals={planGymWeekGoals}
          trainingLevel={planGymWeekTrainingLevel}
          onBack={(updatedPlan) => {
            setPlanGymWeekCreatedPlan(null);
            setPlanGymWeekManualDaysCount(updatedPlan.daysCount);
            setPlanGymWeekInitialPlan(updatedPlan);
            setShowPlanGymWeekManualForm(true);
          }}
          onClose={() => {
            setPlanGymWeekCreatedPlan(null);
            setPlanGymWeekTrainingLevel(null);
            // After creation, switch to table view so the user can see their workout schedule
            setViewMode('table');
          }}
          onSave={(plan) => {
            const totalSeries = plan.days.reduce(
              (sum, d) => sum + d.sectors.reduce((s, sec) => s + (sec.series ?? 0), 0), 0
            );
            showMessage(
              'success',
              `✅ GYM WEEKLY PLAN created: ${plan.daysCount} day(s), ${totalSeries} total series. Saved as template — apply it to your weekly calendar.`
            );
          }}
        />
      )}

      {modals.showImportModal && (activeSection === 'A' || activeSection === 'B') && (
        <ImportMealsModal
          targetSection={activeSection}
          onClose={() => modalActions.setShowImportModal(false)}
          onImport={async (sourceType, sourceId, workouts) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/import', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  targetSection: activeSection,
                  sourceType,
                  sourceId,
                  workoutIds: workouts.map(w => w.id)
                })
              });
              
              if (response.ok) {
                modalActions.setShowImportModal(false);
                showMessage('success', `Successfully imported ${workouts.length} workout(s)!`);
              } else {
                showMessage('error', 'Failed to import workouts');
              }
             } catch (error) {
               console.error('Error importing meals:', error);
               showMessage('error', 'Error importing workouts');
             }
           }}
         />
       )}
       
      {modals.showAddDayModal && nutritionPlan && (
        <AddDayModal
          nutritionPlanId={nutritionPlan.id}
          onClose={() => modalActions.setShowAddDayModal(false)}
          onSave={() => {
            modalActions.setShowAddDayModal(false);
          }}
        />
      )}
      
      {/* Athlete Selector Modal for Section C (Coaches/Teams/Clubs) */}
      {modals.showAthleteSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select Athlete</h2>
              <button onClick={() => modalActions.setShowAthleteSelector(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select an athlete to view their completed workouts. You can only view workouts if the athlete has given you permission.
            </p>
            
            {athleteList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No athletes found.</p>
                <p className="text-sm mt-2">Athletes you manage will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {athleteList.map((athlete) => (
                  <button
                    key={athlete.id}
                    onClick={() => {
                      setSelectedAthlete(athlete);
                      modalActions.setShowAthleteSelector(false);
                      loadNutritionData(activeSection); // Reload data for selected athlete
                    }}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{athlete.name}</div>
                      <div className="text-sm text-gray-500">{athlete.email}</div>
                    </div>
                    {selectedAthlete?.id === athlete.id && (
                      <div className="text-blue-600 text-sm font-medium">✓ Selected</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setSelectedAthlete(null);
                  modalActions.setShowAthleteSelector(false);
                  loadNutritionData(activeSection); // Reload own data
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                View My Nutrition
              </button>
              <button
                onClick={() => modalActions.setShowAthleteSelector(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* NutritionMeal Selector Modal - For Adding NutritionFood */}
      {modals.showWorkoutSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select NutritionMeal for NutritionFood</h2>
              <button onClick={() => modalActions.setShowWorkoutSelector(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select which workout to add the nutritionFood to. Showing all existing workouts for {addNutritionDay?.date ? new Date(addNutritionDay.date).toLocaleDateString() : 'selected day'}.
            </p>
            
            <div className="space-y-3">
              {availableWorkouts.map((workout, index) => (
                <button
                  key={workout.id}
                  onClick={() => {
                    setSelectedWorkout(workout.id);
                    modalActions.setShowWorkoutSelector(false);
                    modalActions.setShowAddNutritionFoodModal(true);
                  }}
                  className="w-full text-left px-4 py-4 border-2 border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-blue-600">Workout #{index + 1}</span>
                        <span className="text-sm text-gray-500">
                          {addNutritionDay?.date ? new Date(addNutritionDay.date).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-gray-900">
                          {workout.name || '<no name assigned>'}
                        </span>
                      </div>
                      {workout.nutritionFoods && workout.nutritionFoods.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-600">Sports:</span>
                          <div className="flex gap-1">
                            {(Array.from(new Set(workout.nutritionFoods.map((mf: any) => mf.sport as string))) as string[]).slice(0, 4).map((sport: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {sport}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-blue-600 text-2xl">→</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => modalActions.setShowWorkoutSelector(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      
      {/* Day Selector Modal - For Editing Day Notes/Annotations */}
      {modals.showDaySelector && nutritionPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select Day to Edit</h2>
              <button onClick={() => modalActions.setShowDaySelector(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select a day from the grid below to edit its notes, weather, feeling, and annotations.
            </p>
            
            {/* Display days in a grid format by week */}
            <div className="space-y-6">
              {nutritionPlan.weeks.map((week: any) => (
                <div key={week.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Week {week.weekNumber}</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {week.days.map((day: any) => {
                      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                      return (
                        <button
                          key={day.id}
                          onClick={() => {
                            setEditingDay(day);
                            modalActions.setShowDaySelector(false);
                            modalActions.setShowEditDayModal(true);
                          }}
                          className="p-3 border-2 border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors text-center"
                        >
                          <div className="text-xs font-medium text-gray-600">
                            {dayNames[day.dayOfWeek - 1]}
                          </div>
                          <div className="text-sm font-bold text-gray-900 mt-1">
                            {new Date(day.date).getDate()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          {day.notes && (
                            <div className="mt-1 text-xs text-blue-600">📝</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => modalActions.setShowDaySelector(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Day Modal - Edit day notes, weather, feeling, annotations */}
      {/* ==================== EDIT DAY MODAL (Extracted Component) ==================== */}
      {modals.showEditDayModal && editingDay && (
        <EditDayModal
          day={editingDay}
          periods={periods}
          activeSection={activeSection as 'A' | 'B' | 'C'}
          onClose={() => {
            modalActions.closeEditDayModal();
            setEditingDay(null);
          }}
          onSave={async () => {
            modalActions.closeEditDayModal();
            setEditingDay(null);
            await loadNutritionData(activeSection);
          }}
          onError={(msg) => showMessage('error', msg)}
          onSuccess={(msg) => showMessage('success', msg)}
        />
      )}

      {/* ==================== ADD MOVELAP MODAL (Extracted Component) ==================== */}
      {modals.showAddNutritionComponentModal && activeNutritionFood && activeWorkout && activeDay && (
        <AddNutritionComponentModal
          nutritionFood={activeNutritionFood}
          workout={activeWorkout}
          day={activeDay}
          onClose={() => modalActions.setShowAddNutritionComponentModal(false)}
          onSave={(nutritionFoodId, newNutritionComponent) => {
            // Update local state without full page reload
            if (nutritionPlan && newNutritionComponent) {
              const updatedPlan = { ...nutritionPlan };
              
              // Find and update the specific nutritionFood with the new nutritionComponent
              updatedPlan.weeks = nutritionPlan.weeks.map((week: any) => ({
                ...week,
                days: week.days.map((day: any) => ({
                  ...day,
                  meals: day.meals?.map((workout: any) => ({
                    ...workout,
                    nutritionFoods: workout.nutritionFoods?.map((mf: any) => {
                      if (mf.id === nutritionFoodId) {
                        return {
                          ...mf,
                          nutritionComponents: [...(mf.nutritionComponents || []), newNutritionComponent]
                        };
                      }
                      return mf;
                    })
                  }))
                }))
              }));
              
              updateNutritionPlan(updatedPlan);
            }
            
            // Keep nutritionFood expanded so user can see the new nutritionComponent
            if (activeDay && activeWorkout && nutritionFoodId) {
              setAutoExpandDayId(activeDay.id);
              setAutoExpandWorkoutId(activeWorkout.id);
              setAutoExpandNutritionFoodId(nutritionFoodId);
            }
          }}
          onError={(msg) => showMessage('error', msg)}
          onSuccess={(msg) => showMessage('success', msg)}
        />
      )}

      {/* ==================== EDIT MOVEFRAME MODAL (Extracted Component) ==================== */}
      {modals.showEditNutritionFoodModal && editingNutritionFood && activeWorkout && activeDay && (
        <EditNutritionFoodModal
          nutritionFood={editingNutritionFood}
          workout={activeWorkout}
          day={activeDay}
          onClose={() => {
            modalActions.setShowEditNutritionFoodModal(false);
            setEditingNutritionFood(null);
          }}
          onSave={async () => {
            modalActions.setShowEditNutritionFoodModal(false);
            setEditingNutritionFood(null);
            await loadNutritionData(activeSection);
          }}
          onError={(msg) => showMessage('error', msg)}
          onSuccess={(msg) => showMessage('success', msg)}
        />
      )}

      {/* ==================== ADD/EDIT MOVELAP MODAL (New Unified Component) ==================== */}
      {modals.showAddEditNutritionComponentModal && activeNutritionFood && (
        <AddEditNutritionComponentModal
          isOpen={modals.showAddEditNutritionComponentModal}
          mode={modes.nutritionComponentModalMode}
          nutritionFood={activeNutritionFood}
          existingNutritionComponent={editingNutritionComponent}
          sourceNutritionComponentForAdd={sourceNutritionComponentForAdd}
          nutritionComponentInsertIndex={nutritionComponentInsertIndex}
          onClose={() => {
            modalActions.setShowAddEditNutritionComponentModal(false);
            setEditingNutritionComponent(null);
            setActiveNutritionFood(null);
            setNutritionComponentInsertIndex(null);
            setSourceNutritionComponentForAdd(null);
          }}
          onCopyToAll={async (fieldName: string, fieldValue: any) => {
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                showMessage('error', 'Authentication required');
                return;
              }

              // Get all nutrition_components in the current nutritionFood
              const nutrition_componentsToUpdate = activeNutritionFood.nutritionComponents?.filter(
                (ml: any) => editingNutritionComponent && ml.id !== editingNutritionComponent.id
              ) || [];

              if (nutrition_componentsToUpdate.length === 0) {
                showMessage('info', 'No other nutrition_components to copy to');
                return;
              }

              // Update all nutrition_components with the new field value ONLY (preserve other fields)
              const updatePromises = nutrition_componentsToUpdate.map((nutritionComponent: any) => {
                // Get the current nutritionComponent data and only update the specific field
                const existingData = {
                  distance: nutritionComponent.distance,
                  speed: nutritionComponent.speed,
                  style: nutritionComponent.style,
                  pause: nutritionComponent.pause,
                  pace: nutritionComponent.pace,
                  time: nutritionComponent.time,
                  notes: nutritionComponent.notes,
                  alarm: nutritionComponent.alarm,
                  sound: nutritionComponent.sound,
                  macroFinal: nutritionComponent.macroFinal,
                  reps: nutritionComponent.reps,
                  weight: nutritionComponent.weight,
                  tools: nutritionComponent.tools,
                  muscularSector: nutritionComponent.muscularSector,
                  exercise: nutritionComponent.exercise,
                  restType: nutritionComponent.restType,
                  r1: nutritionComponent.r1,
                  r2: nutritionComponent.r2,
                };
                
                // Only update the specific field
                const updateData = {
                  ...existingData,
                  [fieldName]: fieldValue
                };
                
                return fetch(`/api/nutrition/nutritionComponents?id=${nutritionComponent.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(updateData)
                });
              });

              const responses = await Promise.all(updatePromises);
              const allSuccessful = responses.every(r => r.ok);

              if (allSuccessful) {
                showMessage('success', `Copied ${fieldName} to ${nutrition_componentsToUpdate.length} nutritionComponent(s)`);
                
                // Refresh the nutritionFood data
                const dayIdToExpand = activeDay?.id;
                const workoutIdToExpand = activeWorkout?.id;
                const nutritionFoodIdToExpand = activeNutritionFood?.id;
                
                await loadNutritionData(activeSection);
                
                // Keep the nutritionFood expanded after reload
                if (dayIdToExpand && workoutIdToExpand && nutritionFoodIdToExpand) {
                  setAutoExpandDayId(dayIdToExpand);
                  setAutoExpandWorkoutId(workoutIdToExpand);
                  setAutoExpandNutritionFoodId(nutritionFoodIdToExpand);
                  setTimeout(() => {
                    setAutoExpandDayId(null);
                    setAutoExpandWorkoutId(null);
                    setAutoExpandNutritionFoodId(null);
                  }, 500);
                }
              } else {
                showMessage('error', 'Failed to copy to all nutrition_components');
              }
            } catch (error: any) {
              console.error('Error copying to all nutritionComponents:', error);
              showMessage('error', 'Failed to copy to all nutrition_components');
            }
          }}
          onSave={async (nutritionComponentData) => {
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                showMessage('error', 'Authentication required');
                return;
              }

              let response;
              if (modes.nutritionComponentModalMode === 'edit' && editingNutritionComponent) {
                // Update existing nutritionComponent
                response = await fetch(`/api/nutrition/nutritionComponents?id=${editingNutritionComponent.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(nutritionComponentData)
                });
              } else {
                // Create new nutritionComponent
                response = await fetch('/api/nutrition/nutrition_components', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(nutritionComponentData)
                });

                // Always reorder based on sequence number or insert index
                if (response.ok) {
                  const newNutritionComponent = await response.json();
                  
                  // Fetch fresh nutritionFood data with all nutrition_components
                  const nutritionFoodResponse = await fetch(`/api/nutrition/nutrition_foods/${activeNutritionFood.id}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  if (nutritionFoodResponse.ok) {
                    const freshNutritionFood = await nutritionFoodResponse.json();
                    const allNutritionComponents = [...freshNutritionFood.nutritionComponents];
                    
                    // Find the newly created nutritionComponent (it will be at the end)
                    const newNutritionComponentIndex = allNutritionComponents.findIndex((ml: any) => ml.id === newNutritionComponent.id);
                    
                    if (newNutritionComponentIndex !== -1) {
                      // Remove the new nutritionComponent from its current position
                      const [movedNutritionComponent] = allNutritionComponents.splice(newNutritionComponentIndex, 1);
                      
                      // Determine insertion position
                      let insertPosition;
                      if (nutritionComponentInsertIndex !== null) {
                        // Insert after the specified index (for "Add nutritionComponent after" button)
                        insertPosition = nutritionComponentInsertIndex + 1;
                      } else {
                        // Use sequence number from modal (insert AT that position, pushing others down)
                        insertPosition = (nutritionComponentData.repetitionNumber || 1) - 1;
                        if (insertPosition < 0) insertPosition = 0;
                        if (insertPosition > allNutritionComponents.length) insertPosition = allNutritionComponents.length;
                      }
                      
                      // Insert at the specified position
                      allNutritionComponents.splice(insertPosition, 0, movedNutritionComponent);
                      
                      // Update repetitionNumbers for all nutrition_components and mark the new one
                      const reorderData = allNutritionComponents.map((ml: any, idx: number) => ({
                        id: ml.id,
                        repetitionNumber: idx + 1,
                        ...(ml.id === newNutritionComponent.id ? { isNewlyAdded: true } : {})
                      }));
                      
                      // Call reorder API
                      const reorderResponse = await fetch('/api/nutrition/nutrition_components/reorder', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ nutritionComponents: reorderData })
                      });
                      
                      if (!reorderResponse.ok) {
                        console.error('Failed to reorder nutrition_components');
                      }
                    }
                  }
                  
                  // Reset insert index and source nutritionComponent
                  setNutritionComponentInsertIndex(null);
                  setSourceNutritionComponentForAdd(null);
                }
              }

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save nutritionComponent');
              }

              showMessage('success', modes.nutritionComponentModalMode === 'edit' ? 'NutritionComponent updated successfully' : 'NutritionComponent created successfully');
              
              // Store the IDs we need to keep expanded before clearing states
              const dayIdToExpand = activeDay?.id;
              const workoutIdToExpand = activeWorkout?.id;
              const nutritionFoodIdToExpand = activeNutritionFood?.id;
              
              modalActions.setShowAddEditNutritionComponentModal(false);
              setEditingNutritionComponent(null);
              setActiveNutritionFood(null);
              setNutritionComponentInsertIndex(null);
              setSourceNutritionComponentForAdd(null);
              
              // Refresh workout data to show changes
              await loadNutritionData(activeSection);
              
              // Keep the nutritionFood expanded after reload
              if (dayIdToExpand && workoutIdToExpand && nutritionFoodIdToExpand) {
                setAutoExpandDayId(dayIdToExpand);
                setAutoExpandWorkoutId(workoutIdToExpand);
                setAutoExpandNutritionFoodId(nutritionFoodIdToExpand);
                setTimeout(() => {
                  setAutoExpandDayId(null);
                  setAutoExpandWorkoutId(null);
                  setAutoExpandNutritionFoodId(null);
                }, 500);
              }
            } catch (error: any) {
              console.error('Error saving nutritionComponent:', error);
              showMessage('error', error.message || 'Failed to save nutritionComponent');
            }
          }}
        />
      )}

      {/* ==================== COPY DAY MODAL ==================== */}
      {modals.showCopyDayModal && copiedDay && nutritionPlan && (
        <CopyDayModal
          isOpen={modals.showCopyDayModal}
          onClose={() => {
            modalActions.closeCopyDayModal();
            setCopiedDay(null);
          }}
          sourceDay={copiedDay}
          nutritionPlan={nutritionPlan}
          activeSection={activeSectionForModals}
          onConfirm={async (targetDate, targetWeekId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/days/copy', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sourceDayId: copiedDay.id,
                  targetDate: targetDate.toISOString(),
                  targetWeekId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to copy day');
              }

              showMessage('success', 'Day copied successfully');
              modalActions.closeCopyDayModal();
              setCopiedDay(null);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to copy day');
            }
          }}
        />
      )}

      {/* ==================== MOVE DAY MODAL ==================== */}
      {modals.showMoveDayModal && copiedDay && nutritionPlan && (
        <MoveDayModal
          isOpen={modals.showMoveDayModal}
          onClose={() => {
            modalActions.closeMoveDayModal();
            setCopiedDay(null);
          }}
          sourceDay={copiedDay}
          nutritionPlan={nutritionPlan}
          activeSection={activeSectionForModals}
          onConfirm={async (targetDate, targetWeekId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/days/move', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sourceDayId: copiedDay.id,
                  targetDate: targetDate.toISOString(),
                  targetWeekId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to move day');
              }

              showMessage('success', 'Day moved successfully');
              modalActions.closeMoveDayModal();
              setCopiedDay(null);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to move day');
            }
          }}
        />
      )}

      {/* ==================== COPY WORKOUT MODAL ==================== */}
      {modals.showCopyMealModal && copiedWorkout && nutritionPlan && (
        <CopyMealModal
          isOpen={modals.showCopyMealModal}
          onClose={() => {
            modalActions.closeCopyMealModal();
            setCopiedWorkout(null);
          }}
          sourceWorkout={copiedWorkout}
          nutritionPlan={nutritionPlan}
          activeSection={activeSectionForModals}
          onConfirm={async (targetDayId, sessionNumber) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/sessions/copy', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sourceWorkoutId: copiedWorkout.id,
                  targetDayId,
                  sessionNumber
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to copy workout');
              }

              showMessage('success', 'Workout copied successfully');
              modalActions.closeCopyMealModal();
              setCopiedWorkout(null);
              
              // Refresh workout data to show the copied workout
              await loadNutritionData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to copy workout');
            }
          }}
        />
      )}

      {/* ==================== MOVE WORKOUT MODAL ==================== */}
      {modals.showMoveMealModal && copiedWorkout && nutritionPlan && (
        <MoveMealModal
          isOpen={modals.showMoveMealModal}
          onClose={() => {
            modalActions.closeMoveMealModal();
            setCopiedWorkout(null);
          }}
          sourceWorkout={copiedWorkout}
          nutritionPlan={nutritionPlan}
          activeSection={activeSectionForModals}
          onConfirm={async (targetDayId, sessionNumber) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/sessions/move', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  nutritionMealId: copiedWorkout.id,
                  targetDayId,
                  sessionNumber
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to move workout');
              }

              showMessage('success', 'Workout moved successfully');
              modalActions.closeMoveMealModal();
              setCopiedWorkout(null);
              
              // Refresh workout data to show the moved workout
              await loadNutritionData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to move workout');
            }
          }}
        />
      )}

      {/* ==================== COPY MOVEFRAME MODAL ==================== */}
      {modals.showCopyNutritionFoodModal && copiedNutritionFood && nutritionPlan && (
        <CopyNutritionFoodModal
          isOpen={modals.showCopyNutritionFoodModal}
          onClose={() => {
            modalActions.setShowCopyNutritionFoodModal(false);
            setCopiedNutritionFood(null);
          }}
          sourceNutritionFood={copiedNutritionFood}
          nutritionPlan={nutritionPlan}
          activeSection={activeSectionForModals}
          onConfirm={async (targetWorkoutId, position, targetNutritionFoodId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/nutrition_foods/copy', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sourceNutritionFoodId: copiedNutritionFood.id,
                  targetWorkoutId,
                  position,
                  targetNutritionFoodId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to copy nutritionFood');
              }

              showMessage('success', 'NutritionFood copied successfully');
              modalActions.setShowCopyNutritionFoodModal(false);
              setCopiedNutritionFood(null);
              await loadNutritionData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to copy nutritionFood');
            }
          }}
        />
      )}

      {/* ==================== MOVE MOVEFRAME MODAL ==================== */}
      {modals.showMoveNutritionFoodModal && copiedNutritionFood && activeWorkout && nutritionPlan && (
        <MoveNutritionFoodModal
          isOpen={modals.showMoveNutritionFoodModal}
          onClose={() => {
            modalActions.setShowMoveNutritionFoodModal(false);
            setCopiedNutritionFood(null);
          }}
          sourceNutritionFood={copiedNutritionFood}
          sourceWorkout={activeWorkout}
          nutritionPlan={nutritionPlan}
          activeSection={activeSectionForModals}
          onConfirm={async (targetWorkoutId, position, targetNutritionFoodId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/nutrition/nutrition_foods/move', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  nutritionFoodId: copiedNutritionFood.id,
                  targetWorkoutId,
                  position,
                  targetNutritionFoodId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to move nutritionFood');
              }

              showMessage('success', 'NutritionFood moved successfully');
              modalActions.setShowMoveNutritionFoodModal(false);
              setCopiedNutritionFood(null);
              await loadNutritionData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to move nutritionFood');
            }
          }}
        />
      )}

      {/* ==================== COLUMN SETTINGS MODAL ==================== */}
      {modals.showColumnSettingsModal && (
        <ColumnSettingsModal
          isOpen={modals.showColumnSettingsModal}
          onClose={() => modalActions.setShowColumnSettingsModal(false)}
          tableType={settings.columnSettingsTableType}
          visibleColumns={columnSettings.getVisibleColumns(settings.columnSettingsTableType)}
          columnOrder={columnSettings.getColumnOrder(settings.columnSettingsTableType)}
          onSave={(visibleColumns, columnOrder) => {
            columnSettings.updateTableSettings(settings.columnSettingsTableType, visibleColumns, columnOrder);
            showMessage('success', 'Column settings saved');
          }}
          onReset={() => {
            columnSettings.resetTableSettings(settings.columnSettingsTableType);
            showMessage('success', 'Column settings reset to default');
          }}
        />
      )}

      {/* ==================== BULK ADD MOVELAP MODAL ==================== */}
      {modals.showBulkAddNutritionComponentModal && activeNutritionFood && activeWorkout && activeDay && (
        <BulkAddNutritionComponentModal
          isOpen={modals.showBulkAddNutritionComponentModal}
          onClose={() => {
            modalActions.setShowBulkAddNutritionComponentModal(false);
            setActiveNutritionFood(null);
          }}
          nutritionFood={activeNutritionFood}
          workout={activeWorkout}
          day={activeDay}
          onSave={async (nutritionComponents) => {
            try {
              const token = localStorage.getItem('token');
              
              // Create all nutrition_components
              for (const nutritionComponentData of nutritionComponents) {
                await fetch('/api/nutrition/nutrition_components', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    ...nutritionComponentData,
                    nutritionFoodId: activeNutritionFood.id
                  })
                });
              }

              showMessage('success', `${nutritionComponents.length} nutrition_components added successfully`);
              modalActions.setShowBulkAddNutritionComponentModal(false);
              setActiveNutritionFood(null);
              await loadNutritionData(activeSection);
            } catch (error) {
              console.error('Error bulk adding nutritionComponents:', error);
              showMessage('error', 'Failed to add nutrition_components');
            }
          }}
        />
      )}
     </div>

      {/* Drag Overlay - Shows preview while dragging */}
      <DragOverlay>
        {draggedWorkout && (
          <div className="bg-cyan-400 text-white px-4 py-2 rounded shadow-lg opacity-90">
            🏃 Dragging Workout...
          </div>
        )}
        {draggedNutritionFood && (
          <div className="bg-purple-400 text-white px-4 py-2 rounded shadow-lg opacity-90">
            💪 Dragging NutritionFood...
          </div>
        )}
      </DragOverlay>

      {/* Drag & Drop Confirmation Modal */}
      {dragModalConfig && (
        <DragDropConfirmModal
          isOpen={modals.showDragModal}
          onClose={() => {
            modalActions.setShowDragModal(false);
            setDragModalConfig(null);
          }}
          onConfirm={handleDragConfirm}
          dragType={dragModalConfig.dragType}
          hasConflict={dragModalConfig.hasConflict}
          conflictMessage={dragModalConfig.conflictMessage}
          showPositionChoice={dragModalConfig.showPositionChoice}
        />
      )}

      {/* Day Print/PDF Export Modal */}
      {showDayPrintModal && dayToPrint && (
        <DayPrintModal
          isOpen={showDayPrintModal}
          onClose={() => {
            setShowDayPrintModal(false);
            setDayToPrint(null);
            setAutoPrintDay(false);
          }}
          day={dayToPrint}
          autoPrint={autoPrintDay}
          activeSection={activeSectionForModals}
        />
      )}

      {/* NutritionMeal Print/PDF Export Modal */}
      {showMealPrintModal && workoutToPrint && (
        <MealPrintModal
          isOpen={showMealPrintModal}
          onClose={() => {
            setShowMealPrintModal(false);
            setWorkoutToPrint(null);
            setDayForWorkoutPrint(null);
            setAutoPrintWorkout(false);
          }}
          workout={workoutToPrint}
          day={dayForWorkoutPrint}
          autoPrint={autoPrintWorkout}
          activeSection={activeSectionForModals}
        />
      )}

      {/* Share NutritionMeal Modal */}
      {showShareMealModal && workoutToShare && (
        <ShareMealModal
          isOpen={showShareMealModal}
          onClose={() => {
            setShowShareMealModal(false);
            setWorkoutToShare(null);
            setDayForWorkoutShare(null);
          }}
          workout={workoutToShare}
          day={dayForWorkoutShare}
        />
      )}

      {/* Share Day Modal */}
      {showShareDayModal && dayToShare && (
        <ShareDayModal
          isOpen={showShareDayModal}
          onClose={() => {
            setShowShareDayModal(false);
            setDayToShare(null);
          }}
          day={dayToShare}
        />
      )}

      {/* Day Overview Modal */}
      {showDayOverviewModal && dayForOverview && (
        <DayOverviewModal
          onClose={() => {
            setShowDayOverviewModal(false);
            setDayForOverview(null);
          }}
          day={dayForOverview}
        />
      )}

      {/* NutritionMeal Overview Modal */}
      {showMealOverviewModal && workoutForOverview && (
        <MealOverviewModal
          onClose={() => {
            setShowMealOverviewModal(false);
            setWorkoutForOverview(null);
            setDayForWorkoutOverview(null);
          }}
          workout={workoutForOverview}
        />
      )}

      {/* Week Totals Modal (Overview & Print) */}
      {showWeekTotalsModal && currentWeek && (
        <WeekTotalsModal
          isOpen={showWeekTotalsModal}
          onClose={() => {
            setShowWeekTotalsModal(false);
            setCurrentWeek(null);
            setAutoPrintWeek(false);
          }}
          week={currentWeek}
          autoPrint={autoPrintWeek}
          activeSection={activeSectionForModals}
        />
      )}

      {/* Weekly Info Modal (Edit Week Description & Period) */}
      {isWeeklyInfoModalOpen && currentWeek && (
        <WeeklyInfoModal
          isOpen={isWeeklyInfoModalOpen}
          onClose={() => {
            setIsWeeklyInfoModalOpen(false);
            setCurrentWeek(null);
          }}
          weekNumber={currentWeek.weekNumber}
          weekId={currentWeek.id}
          initialPeriodId={currentWeek.periodId || ''}
          initialNotes={currentWeek.notes || ''}
          onSave={async (data) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`/api/nutrition/weeks/${currentWeek.id}/notes`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  periodId: data.periodId,
                  notes: data.notes
                })
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update week');
              }

              showMessage('success', 'Week updated successfully!');
              setIsWeeklyInfoModalOpen(false);
              setCurrentWeek(null);
              
              // Reload workout data to reflect changes
              await loadNutritionData();
            } catch (error: any) {
              console.error('Error updating week:', error);
              showMessage('error', error.message || 'Failed to update week');
            }
          }}
        />
      )}

      {/* Copy Week Modal */}
      {showCopyWeekModal && currentWeek && (
        <CopyWeekModal
          isOpen={showCopyWeekModal}
          sourceWeek={currentWeek}
          allWeeks={targetWeeks}
          onClose={() => {
            setShowCopyWeekModal(false);
            setCurrentWeek(null);
            setTargetWeeks([]);
          }}
          onCopy={handleCopyWeek}
        />
      )}

      {/* Move Week Modal - Coming Soon */}
      {showMoveWeekModal && currentWeek && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Move Week</h2>
              <button
                onClick={() => {
                  setShowMoveWeekModal(false);
                  setCurrentWeek(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Move Week {currentWeek.weekNumber} functionality is coming in the next update.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Use the table view Move buttons to move individual days, workouts, nutritionFoods, or nutritionComponents.
            </p>
            <button
              onClick={() => {
                setShowMoveWeekModal(false);
                setCurrentWeek(null);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Week Notes Modal */}
      {showWeekNotesModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999999] p-4"
          onClick={() => setShowWeekNotesModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Week Planning Notes</h3>
              <button
                onClick={() => setShowWeekNotesModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="prose prose-lg max-w-none text-gray-800"
                style={{
                  lineHeight: '1.8',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '16px'
                }}
                dangerouslySetInnerHTML={{ __html: selectedWeekNotes }}
              />
            </div>
          </div>
        </div>
      )}
    </DndContext>
   );
}
