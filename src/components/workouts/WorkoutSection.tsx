'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

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
  WORKOUT_SECTIONS, 
  UI_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  STORAGE_KEYS
} from '@/config/workout.constants';
import type { 
  WorkoutPlan, 
  WorkoutDay, 
  Workout, 
  Moveframe,
  Period,
  SectionId,
  ViewMode
} from '@/types/workout.types';

// API Utilities
import { movelapApi } from '@/utils/api.utils';

// Helper Functions
import { sectionHelpers } from '@/utils/workout.helpers';

// Custom Hooks
import { useWorkoutData } from '@/hooks/useWorkoutData';
import { useWorkoutModals } from '@/hooks/useWorkoutModals';
import { useWorkoutExpansion } from '@/hooks/useWorkoutExpansion';

// Components
import WorkoutSectionHeader from '@/components/workouts/WorkoutSectionHeader';
import WorkoutCalendarView from '@/components/workouts/WorkoutCalendarView';
import WorkoutTreeView from '@/components/workouts/WorkoutTreeView';
import DayTableView from '@/components/workouts/tables/DayTableView';
import StyledTableWrapper from '@/components/workouts/tables/StyledTableWrapper';
import AddWorkoutModal from '@/components/workouts/AddWorkoutModal';
import WorkoutInfoModal from '@/components/workouts/WorkoutInfoModal';
import AddMoveframeModal from '@/components/workouts/AddMoveframeModal';
import AddEditMoveframeModal from '@/components/workouts/AddEditMoveframeModal';
import ImportWorkoutsModal from '@/components/workouts/ImportWorkoutsModal';
import AddDayModal from '@/components/workouts/AddDayModal';
import EditDayModal from '@/components/workouts/modals/EditDayModal';
import AddMovelapModal from '@/components/workouts/modals/AddMovelapModal';
import EditMoveframeModal from '@/components/workouts/modals/EditMoveframeModal';
import EditMovelapModal from '@/components/workouts/modals/EditMovelapModal';
import AddEditMovelapModal from '@/components/workouts/AddEditMovelapModal';
import CopyDayModal from '@/components/workouts/modals/CopyDayModal';
import MoveDayModal from '@/components/workouts/modals/MoveDayModal';
import CopyWorkoutModal from '@/components/workouts/modals/CopyWorkoutModal';
import MoveWorkoutModal from '@/components/workouts/modals/MoveWorkoutModal';
import CopyMoveframeModal from '@/components/workouts/modals/CopyMoveframeModal';
import MoveMoveframeModal from '@/components/workouts/modals/MoveMoveframeModal';
import ColumnSettingsModal from '@/components/workouts/ColumnSettingsModal';
import BulkAddMovelapModal from '@/components/workouts/BulkAddMovelapModal';
import CreateYearlyPlanModal from '@/components/workouts/modals/CreateYearlyPlanModal';
import ImportFromPlanModal from '@/components/workouts/modals/ImportFromPlanModal';
import CopyFromTemplateModal from '@/components/workouts/modals/CopyFromTemplateModal';
import DayPrintModal from '@/components/workouts/modals/DayPrintModal';
import WorkoutPrintModal from '@/components/workouts/modals/WorkoutPrintModal';
import ShareWorkoutModal from '@/components/workouts/modals/ShareWorkoutModal';
import ShareDayModal from '@/components/workouts/modals/ShareDayModal';
import WeekTotalsModal from '@/components/workouts/modals/WeekTotalsModal';
import WeeklyInfoModal from '@/components/workouts/WeeklyInfoModal';
import CopyWeekModal from '@/components/workouts/modals/CopyWeekModal';
import DayOverviewModal from '@/components/workouts/DayOverviewModal';
import WorkoutOverviewModal from '@/components/workouts/WorkoutOverviewModal';
import ExportSharePrint from '@/components/workouts/ExportSharePrint';
import { useColumnSettings } from '@/hooks/useColumnSettings';
import DragDropConfirmModal, { DragAction, DropPosition } from '@/components/workouts/modals/DragDropConfirmModal';

// Icons
import { X, Download, Plus, Table, Calendar } from 'lucide-react';

// Extracted Handlers
import * as workoutHandlers from './handlers/workoutHandlers';
import * as moveframeHandlers from './handlers/moveframeHandlers';
import * as movelapHandlers from './handlers/movelapHandlers';
import * as dragDropHandlers from './handlers/dragDropHandlers';
import * as dayWeekHandlers from './handlers/dayWeekHandlers';

interface WorkoutSectionProps {
  onClose: () => void;
}

export default function WorkoutSection({ onClose }: WorkoutSectionProps) {
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
  };
  
  // Debug logging for Section B view mode
  useEffect(() => {
    if (activeSection === 'B') {
      console.log('🔍 [WorkoutSection] Section B Active - Current View Mode:', viewMode);
      console.log('🔍 [WorkoutSection] Workout Plan:', {
        exists: !!workoutPlan,
        weeksCount: workoutPlan?.weeks?.length || 0,
        currentPageStart,
        weeksPerPage
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, viewMode]);
  
  // Ensure Section B defaults to table view
  useEffect(() => {
    if (activeSection === 'B' && viewMode === 'tree') {
      console.log('⚠️ [WorkoutSection] Section B was in tree view, switching to table view');
      setViewMode('table');
    }
  }, [activeSection]);
  
  // Week grouping for Section B pagination
  const [weeksPerPage, setWeeksPerPage] = useState<number>(3); // 1, 2, 3, 4, 6, 8, 13
  const [currentPageStart, setCurrentPageStart] = useState<number>(1); // Starting week number for current page
  
  // Week index for Section A (Weekly Plans)
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  
  // 3-state expand/collapse for tree view
  // State 0: All collapsed, State 1: Days/workouts visible (no moveframes), State 2: All visible
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
    workoutPlan,
    periods,
    isLoading,
    userType,
    athleteList,
    loadWorkoutData,
    loadPeriods,
    loadUserProfile,
    loadAthleteList,
    updateWorkoutPlan,
    feedbackMessage,
    showMessage
  } = useWorkoutData({ initialSection: activeSection });
  
  // Reload data when subsection changes (for Section A only)
  useEffect(() => {
    if (activeSection === 'A') {
      loadWorkoutData(activeSection, activeSubSection);
    }
  }, [activeSection, activeSubSection, loadWorkoutData]);
  
  // Auto-initialize Section C when it's empty
  useEffect(() => {
    const initializeSectionC = async () => {
      if (activeSection === 'C' && workoutPlan) {
        // Check if Section C has no weeks or empty weeks
        const hasNoWeeks = !workoutPlan.weeks || workoutPlan.weeks.length === 0;
        const hasEmptyWeeks = workoutPlan.weeks && workoutPlan.weeks.every((week: any) => 
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
            
            const response = await fetch('/api/workouts/plan/create-completed', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              console.log('✅ Section C initialized successfully');
              // Reload the data to show the new blank structure
              loadWorkoutData(activeSection);
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
  }, [activeSection, workoutPlan, loadWorkoutData]);
  
  // ==================== MODAL STATES (Using Custom Hook) ====================
  const { modals, modes, settings, setters, actions: modalActions } = useWorkoutModals();

  // Column Settings Hook
  const columnSettings = useColumnSettings();
  
  // Copy/Paste state
  const [copiedDay, setCopiedDay] = useState<any>(null);
  const [copiedWorkout, setCopiedWorkout] = useState<any>(null);
  const [copiedMoveframe, setCopiedMoveframe] = useState<any>(null);
  
  // ==================== SELECTION STATES (Properly Typed) ====================
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [selectedMoveframe, setSelectedMoveframe] = useState<Moveframe | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  
  // Active selections for workout context
  const [activeDay, setActiveDay] = useState<WorkoutDay | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [activeMoveframe, setActiveMoveframe] = useState<Moveframe | null>(null);
  const [activeMovelap, setActiveMovelap] = useState<any>(null);
  const [movelapInsertIndex, setMovelapInsertIndex] = useState<number | null>(null);
  
  // Editing states
  const [addWorkoutDay, setAddWorkoutDay] = useState<WorkoutDay | null>(null);
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editingMoveframe, setEditingMoveframe] = useState<Moveframe | null>(null);
  const [editingMovelap, setEditingMovelap] = useState<any>(null);
  const [editingFromMovelap, setEditingFromMovelap] = useState(false); // Track if editing moveframe was triggered from movelap edit
  
  // ==================== UI STATE ====================
  const [excludeStretchingFromTotals, setExcludeStretchingFromTotals] = useState(false);

  // ==================== EXPANSION STATE (Using Custom Hook) ====================
  const {
    expandedWeeks,
    expandedDays,
    expandedWorkouts,
    fullyExpandedWorkouts,
    workoutsWithExpandedMovelaps,
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
    setWorkoutsWithExpandedMovelaps
  } = useWorkoutExpansion({
    workoutPlan,
    activeSection,
    selectedAthleteId: selectedAthlete?.id
  });

  // ==================== 3-STATE EXPAND/COLLAPSE FOR TREE VIEW ====================
  const toggleTreeExpandAll = () => {
    if (!workoutPlan || !workoutPlan.weeks) return;

    const allWeekNumbers = new Set<number>();
    const allDayIds = new Set<string>();
    const allWorkoutIds = new Set<string>();

    // Collect all week numbers, day and workout IDs
    workoutPlan.weeks.forEach((week: any) => {
      allWeekNumbers.add(week.weekNumber);
      week.days?.forEach((day: any) => {
        allDayIds.add(day.id);
        day.workouts?.forEach((workout: any) => {
          allWorkoutIds.add(workout.id);
        });
      });
    });

    console.log('🔄 Tree View Toggle - Current state:', treeExpandState);
    console.log('📊 Found', allWeekNumbers.size, 'weeks,', allDayIds.size, 'days and', allWorkoutIds.size, 'workouts');

    if (treeExpandState === 0) {
      // State 0 -> State 1: Expand weeks and days (workouts visible but moveframes hidden)
      console.log('🔄 Tree View: State 0 -> State 1 (Expanding weeks and days, hiding moveframes)');
      
      // Expand all weeks
      setTreeExpandedWeeks(new Set(allWeekNumbers));
      
      // Expand all days
      setExpandedDays(new Set(allDayIds));
      
      // Ensure all workouts are collapsed (moveframes hidden)
      setExpandedWorkouts(new Set());

      setTreeExpandState(1);
    } else if (treeExpandState === 1) {
      // State 1 -> State 2: Expand moveframes
      console.log('🔄 Tree View: State 1 -> State 2 (Showing moveframes)');
      
      // Keep weeks and days expanded, expand all workouts (moveframes visible)
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
    currentlyExpandedWorkouts.forEach((workoutId: string) => {
      if (workoutId !== workout.id) {
        console.log('❌ Closing workout:', workoutId);
        toggleWorkoutExpansion(workoutId);
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
   * 3-state cycle: closed → show moveframes → show movelaps → closed
   */
  const handleWorkoutNumberClick = (workout: any, day: any) => {
    console.log('🔢 Workout number clicked:', workout.id, 'on day:', day.id);
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
      
      const response = await fetch('/api/workouts/weeks/favorites', {
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
  const [showWorkoutInfoModal, setShowWorkoutInfoModal] = useState(false);
  const [showCreateYearlyPlanModal, setShowCreateYearlyPlanModal] = useState(false);
  const [showWeekNotesModal, setShowWeekNotesModal] = useState(false);
  const [selectedWeekNotes, setSelectedWeekNotes] = useState<string>('');
  const [showCopyFromTemplateModal, setShowCopyFromTemplateModal] = useState(false);
  const [showDayPrintModal, setShowDayPrintModal] = useState(false);
  const [dayToPrint, setDayToPrint] = useState<any>(null);
  const [autoPrintDay, setAutoPrintDay] = useState(false);
  const [showWorkoutPrintModal, setShowWorkoutPrintModal] = useState(false);
  const [workoutToPrint, setWorkoutToPrint] = useState<any>(null);
  const [dayForWorkoutPrint, setDayForWorkoutPrint] = useState<any>(null);
  const [autoPrintWorkout, setAutoPrintWorkout] = useState(false);
  const [showShareWorkoutModal, setShowShareWorkoutModal] = useState(false);
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
  const [showWorkoutOverviewModal, setShowWorkoutOverviewModal] = useState(false);
  const [workoutForOverview, setWorkoutForOverview] = useState<any>(null);
  const [dayForWorkoutOverview, setDayForWorkoutOverview] = useState<any>(null);
  // Use moveframeModalMode from the hook instead of local state
  const moveframeModalMode = modes.moveframeModalMode;
  const setMoveframeModalMode = setters.setMoveframeModalMode;
  const [moveframeInsertIndex, setMoveframeInsertIndex] = useState<number | null>(null); // For "Add MF" after specific moveframe
  
  // ==================== DRAG & DROP STATE ====================
  // Note: activeWorkout and activeMoveframe already defined above for workout context
  const [draggedWorkout, setDraggedWorkout] = useState<any>(null);
  const [draggedMoveframe, setDraggedMoveframe] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<any>(null);
  const [dragModalConfig, setDragModalConfig] = useState<{
    dragType: 'workout' | 'moveframe';
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
  const [autoExpandMoveframeId, setAutoExpandMoveframeId] = useState<string | null>(null);
  
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
    loadWorkoutData,
    activeSection
  });

  // Helper function to generate movelaps from moveframe data
  // Helper function to convert display rest type to enum value
  const convertRestTypeToEnum = (restType: string | null): string | null => {
    if (!restType || restType.trim() === '') return null;
    
    const mapping: Record<string, string> = {
      'Set time': 'SET_TIME',
      'Restart time': 'RESTART_TIME',
      'Restart pulse': 'RESTART_PULSE',
      'SET_TIME': 'SET_TIME', // Already correct
      'RESTART_TIME': 'RESTART_TIME', // Already correct
      'RESTART_PULSE': 'RESTART_PULSE' // Already correct
    };
    
    return mapping[restType] || null;
  };

  const generateMovelaps = (moveframeData: any): any[] => {
    const movelaps: any[] = [];
    
    // Skip movelaps for ANNOTATION types
    if (moveframeData.type === 'ANNOTATION') {
      return movelaps;
    }
    
    // 2026-01-22 10:35 UTC - For circuit-based moveframes (BATTERY type), use pre-generated movelaps
    if (moveframeData.type === 'BATTERY' && moveframeData.movelaps && moveframeData.movelaps.length > 0) {
      console.log('✅ [generateMovelaps] Using pre-generated circuit movelaps:', moveframeData.movelaps.length);
      return moveframeData.movelaps;
    }
    
    // For manual mode, ALWAYS create a single movelap (even if distance is 0)
    // This movelap is used to store notes/summary for the manual moveframe
    if (moveframeData.manualMode) {
      const distanceValue = parseInt(moveframeData.distance) || 0;
        movelaps.push({
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
      return movelaps;
    }
    
    const baseReps = parseInt(moveframeData.repetitions) || 1;
    const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
    const seriesMultiplier = AEROBIC_SPORTS.includes(moveframeData.sport) ? (parseInt(moveframeData.aerobicSeries) || 1) : 1;
    const repsCount = baseReps * seriesMultiplier;
    
    console.log('🔧 [generateMovelaps] Starting generation:', {
      baseReps,
      aerobicSeries: moveframeData.aerobicSeries,
      seriesMultiplier,
      repsCount,
      planningMode: moveframeData.planningMode,
      hasIndividualPlans: moveframeData.planningMode === 'individual',
      individualPlansCount: moveframeData.individualPlans?.length || 0
    });
    
    // Check if we're using individual planning mode
    const hasIndividualPlans = moveframeData.planningMode === 'individual' && 
                              moveframeData.individualPlans && 
                              moveframeData.individualPlans.length > 0;
    
    console.log('🔧 [generateMovelaps] hasIndividualPlans:', hasIndividualPlans);
    
    for (let i = 0; i < repsCount; i++) {
      // If using individual plans, get values from the specific plan
      const plan = hasIndividualPlans ? moveframeData.individualPlans[i] : null;
      
      console.log(`🔧 [generateMovelaps] Iteration ${i + 1}:`, {
        hasIndividualPlans,
        planExists: !!plan,
        planData: plan ? { reps: plan.reps, weight: plan.weight, tools: plan.tools } : null
      });
      
      movelaps.push({
        repetitionNumber: i + 1,
        distance: moveframeData.distance?.toString() || null,
        speed: plan?.speed || moveframeData.speed || null,
        style: moveframeData.style || null,
        pace: moveframeData.pace || null,
        time: plan?.time || moveframeData.time || null,
        reps: plan?.reps || moveframeData.reps || null,
        weight: plan?.weight || null,
        tools: plan?.tools || null,
        r1: moveframeData.r1 || null,
        r2: moveframeData.r2 || null,
        muscularSector: moveframeData.muscularSector || null,
        exercise: moveframeData.exercise || null,
        // Convert display value to enum value
        restType: convertRestTypeToEnum(moveframeData.restType),
        pause: plan?.pause || moveframeData.pause || null,
        macroFinal: plan?.macroFinal || moveframeData.macroFinal || null,
        alarm: moveframeData.alarm || null,
        sound: moveframeData.sound || null,
        notes: moveframeData.notes || null,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false
      });
    }
    
    return movelaps;
  };

  // ==================== LOAD DATA ON SECTION CHANGE ====================
  useEffect(() => {
    loadUserProfile();
    loadWorkoutData(activeSection);
    loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]); // Only re-run when section changes

  // ===== SMART BUTTON HANDLERS WITH SELECTION VALIDATION =====
  
  /**
   * EDIT DAY - Requires active day selection
   * Edits day metadata (date, period, weather, feeling, notes)
   * Does NOT modify workouts, moveframes, or movelaps
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
   * Creates a workout inside the selected day (max 3 per day)
   */
  const handleAddWorkout = () => {
    console.log('🏋️ handleAddWorkout called. activeDay:', activeDay);
    
    // Check if day is selected
    if (!activeDay) {
      console.log('⚠️ No activeDay selected');
      showMessage('warning', 'Please select a day first to add a workout');
      return;
    }
    
    // Check max 3 workouts per day
    const existingWorkouts = activeDay.workouts || [];
    console.log(`✓ activeDay found. Existing workouts: ${existingWorkouts.length}/3`);
    
    if (existingWorkouts.length >= 3) {
      showMessage('warning', 'This day already has 3 workouts (max)');
      return;
    }
    
    // All checks passed - open modal
    console.log('✅ Opening Add Workout modal');
    setAddWorkoutDay(activeDay);
    modalActions.setWorkoutModalMode('add');
    setEditingWorkout(null);
    modalActions.openAddWorkoutModal();
  };
  
  /**
   * ADD MOVEFRAME - Requires active day + active workout
   * Creates a moveframe inside the selected workout
   */
  const handleAddMoveframe = () => {
    console.log('📋 handleAddMoveframe called. activeDay:', activeDay, 'activeWorkout:', activeWorkout);
    
    // Check if day is selected
    if (!activeDay) {
      console.log('⚠️ No activeDay selected');
      showMessage('warning', 'Please select a day first');
      return;
    }
    
    // Check if workout is selected
    if (!activeWorkout) {
      console.log('⚠️ No activeWorkout selected');
      showMessage('warning', 'Please select a workout first to add a moveframe');
      return;
    }
    
    // All checks passed - open modal
    console.log('✅ Opening Add Moveframe modal');
    setSelectedWorkout(activeWorkout.id);
    setSelectedDay(activeDay);
    setMoveframeModalMode('add');
    setEditingMoveframe(null);
    setMoveframeInsertIndex(null); // Reset insert index for regular add (append to end)
    modalActions.openAddMoveframeModal();
  };
  
  /**
   * ADD MOVEFRAME AFTER - Adds a moveframe after a specific moveframe
   * @param moveframe - The moveframe to insert after
   * @param index - The index of the moveframe in the list
   */
  const handleAddMoveframeAfter = (moveframe: any, index: number, workout: any, day: any) => {
    if (!workout || !day) {
      showMessage('error', 'Could not find workout or day context');
      return;
    }
    
    setActiveWorkout(workout);
    setActiveDay(day);
    setSelectedWorkout(workout.id);
    setSelectedDay(day);
    setMoveframeModalMode('add');
    setEditingMoveframe(null);
    setMoveframeInsertIndex(index + 1);
    
    setters.setShowAddMoveframeModal(true);
  };
  
  /**
   * ADD MOVELAP - Requires active moveframe
   * Creates a movelap (microlap/repetition) inside the selected moveframe
   */
  const handleAddMovelap = () => {
    console.log('🔄 handleAddMovelap called. activeMoveframe:', activeMoveframe);
    
    // Check if moveframe is selected
    if (!activeMoveframe) {
      console.log('⚠️ No activeMoveframe selected');
      showMessage('warning', 'Please select a moveframe first to add a movelap');
      return;
    }
    
    // Show Add Movelap modal
    console.log('✅ Opening Add Movelap modal');
    modalActions.openAddMovelapModal();
  };
  
  /**
   * Create new movelap via API (Using API Utility)
   */
  const createMovelap = async (formData: any) => {
    if (!activeMoveframe) {
      showMessage('error', ERROR_MESSAGES.NO_ACTIVE_MOVEFRAME);
      return;
    }

    const response = await movelapApi.create(activeMoveframe.id, {
      mode: 'APPEND',
      ...formData
    });
    
    if (response.success) {
      modalActions.closeMovelapModal();
      
      // Auto-expand the day, workout, and moveframe to show the new movelap
      if (activeDay && activeWorkout && activeMoveframe) {
        setAutoExpandDayId(activeDay.id);
        setAutoExpandWorkoutId(activeWorkout.id);
        setAutoExpandMoveframeId(activeMoveframe.id);
        setTimeout(() => {
          setAutoExpandDayId(null);
          setAutoExpandWorkoutId(null);
          setAutoExpandMoveframeId(null);
        }, UI_CONFIG.AUTO_EXPAND_DELAY);
      }
      
      showMessage('success', SUCCESS_MESSAGES.MOVELAP_ADDED(activeMoveframe.letter || activeMoveframe.code));
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

      const response = await fetch('/api/workouts/import-from-plan', {
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
      console.error('Error importing workouts:', error);
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

      const response = await fetch('/api/workouts/weeks/copy', {
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
        await loadWorkoutData(activeSection);
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

      const response = await fetch('/api/workouts/plan/create-yearly', {
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
          console.log('📊 Setting workoutPlan directly from create response');
          console.log('   Plan ID:', data.plan.id);
          console.log('   Weeks:', data.plan.weeks.length);
          console.log('   First week days:', data.plan.weeks[0]?.days?.length);
          
          updateWorkoutPlan(data.plan);
          setCurrentPageStart(1);
          setViewMode('table');
          
          console.log('✅ Data set successfully! WorkoutPlan now has', data.plan.weeks.length, 'weeks');
        } else {
          console.warn('⚠️ Plan created but no weeks in response, reloading...');
          // Fallback: reload from API
          setCurrentPageStart(1);
          setViewMode('table');
          await new Promise(resolve => setTimeout(resolve, 500));
          await loadWorkoutData('B');
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
        
        const response = await fetch('/api/workouts/weeks/copy', {
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
      await loadWorkoutData('B');
      
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
    } else if (active.data.current?.type === 'moveframe') {
      setDraggedMoveframe(active.data.current.moveframe);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDraggedWorkout(null);
      setDraggedMoveframe(null);
      return;
    }
    
    const dragType = active.data.current?.type;
    const dropType = over.data.current?.type;
    
    // Handle same-workout moveframe reordering (simple case)
    if (dragType === 'moveframe' && dropType === 'moveframe') {
      const sourceWorkout = active.data.current?.workout;
      const targetWorkout = over.data.current?.workout;
      
      // Same workout - simple reorder
      if (sourceWorkout?.id === targetWorkout?.id) {
        console.log('🔄 Same-workout reorder - calling reorder API');
        await handleSameWorkoutMoveframeReorder(active.id, over.id, sourceWorkout);
        setDraggedMoveframe(null);
        return;
      }
      
      // Cross-workout - show modal
      setDragModalConfig({
        dragType: 'moveframe',
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
      const existingWorkoutCount = targetDay?.workouts?.length || 0;
      const existingWorkout = targetDay?.workouts?.[0] || null; // Get first workout if exists
      const hasConflict = existingWorkoutCount >= 3;
      
      setDragModalConfig({
        dragType: 'workout',
        hasConflict: hasConflict,
        conflictMessage: hasConflict ? 'This day already has 3 workouts (maximum). Choose an action:' : undefined,
        sourceData: { workout: sourceWorkout, sourceDay: sourceDay },
        targetData: { targetDay, existingWorkout }
      });
      modalActions.setShowDragModal(true);
    } else if (dragType === 'moveframe' && (dropType === 'workout' || dropType === 'day')) {
      // Handle moveframe dropped on workout or day
      setDragModalConfig({
        dragType: 'moveframe',
        hasConflict: false,
        showPositionChoice: false,
        sourceData: active.data.current,
        targetData: over.data.current
      });
      modalActions.setShowDragModal(true);
    }
    
    setDraggedWorkout(null);
    setDraggedMoveframe(null);
  };

  // Handle same-workout moveframe reordering
  const handleSameWorkoutMoveframeReorder = async (activeMoveframeId: any, overMoveframeId: any, workout: any) => {
    try {
      const moveframes = workout.moveframes || [];
      const oldIndex = moveframes.findIndex((mf: any) => mf.id === activeMoveframeId);
      const newIndex = moveframes.findIndex((mf: any) => mf.id === overMoveframeId);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      // Reorder array
      const newOrder = [...moveframes];
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
      
      const response = await fetch('/api/workouts/moveframes/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ moveframes: updatedOrder })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder moveframes');
      }
      
      console.log('✅ Moveframes reordered successfully');
      showMessage('success', 'Moveframes reordered successfully');
      await loadWorkoutData(activeSection);
    } catch (error) {
      console.error('Error reordering moveframes:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to reorder moveframes');
    }
  };

  // Handle same-day workout reordering  
  const handleSameDayWorkoutReorder = async (activeWorkoutId: any, overWorkoutId: any, day: any) => {
    try {
      const workouts = day.workouts || [];
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
      
      const response = await fetch('/api/workouts/sessions/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workouts: updatedOrder })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder workouts');
      }
      
      console.log('✅ Workouts reordered successfully');
      showMessage('success', 'Workouts reordered successfully');
      await loadWorkoutData(activeSection);
    } catch (error) {
      console.error('Error reordering workouts:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to reorder workouts');
    }
  };

  const handleDragConfirm = async (action: DragAction, position?: DropPosition) => {
    if (!dragModalConfig) return;
    
    try {
      if (dragModalConfig.dragType === 'workout') {
        await handleWorkoutDragAction(action, dragModalConfig.sourceData, dragModalConfig.targetData);
      } else {
        await handleMoveframeDragAction(action, position, dragModalConfig.sourceData, dragModalConfig.targetData);
      }
      
      // Better success messages
      const actionPastTense = action === 'copy' ? 'copied' : action === 'move' ? 'moved' : 'switched';
      const itemType = dragModalConfig.dragType === 'workout' ? 'Workout' : 'Moveframe';
      showMessage('success', `${itemType} ${actionPastTense} successfully!`);
    } catch (error) {
      console.error('Drag action failed:', error);
      const errorMsg = error instanceof Error ? error.message : `Failed to ${action} ${dragModalConfig.dragType}`;
      showMessage('error', errorMsg);
    }
    
    setDragModalConfig(null);
    await loadWorkoutData(activeSection);
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
        const deleteResponse = await fetch(`/api/workouts/sessions/${existingWorkout.id}`, {
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
      const response = await fetch('/api/workouts/sessions/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workoutId: workout.id,
          targetDayId: targetDay.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy workout');
      }
      
      console.log('✅ Workout copied:', workout.id, '→', targetDay.id);
    } else if (action === 'move') {
      // Move workout to different day - replace any existing workout
      // If there's an existing workout in the target day, delete it first
      if (existingWorkout) {
        console.log('🗑️ Deleting existing workout:', existingWorkout.id);
        const deleteResponse = await fetch(`/api/workouts/sessions/${existingWorkout.id}`, {
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
      const response = await fetch('/api/workouts/sessions/move-to-day', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workoutId: workout.id,
          targetDayId: targetDay.id
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move workout');
      }
      
      console.log('✅ Workout moved:', workout.id, '→', targetDay.id);
      await loadWorkoutData(activeSection); // Reload to show changes
    }
  };

  const handleMoveframeDragAction = async (action: DragAction, position: DropPosition | undefined, sourceData: any, targetData: any) => {
    const { moveframe, workout: sourceWorkout, day: sourceDay } = sourceData;
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
      const lastWorkout = targetDay.workouts?.[targetDay.workouts.length - 1];
      if (!lastWorkout) {
        throw new Error('Target day has no workouts');
      }
      targetWorkoutId = lastWorkout.id;
      finalPosition = 'append';
    } else if (dropType === 'workout') {
      // Dropped on workout → append to moveframes
      targetWorkoutId = targetData.workout.id;
      finalPosition = 'append';
    } else if (dropType === 'moveframe') {
      // Dropped on specific moveframe → use position (before/after)
      targetWorkoutId = targetData.workout.id;
      if (position === 'before') {
        insertBeforeId = targetData.moveframe.id;
      } else {
        // After: insert before the next moveframe
        const currentIndex = targetData.workout.moveframes.findIndex((mf: any) => mf.id === targetData.moveframe.id);
        const nextMoveframe = targetData.workout.moveframes[currentIndex + 1];
        if (nextMoveframe) {
          insertBeforeId = nextMoveframe.id;
        } else {
          finalPosition = 'append';
        }
      }
    } else {
      throw new Error('Invalid drop target');
    }

    if (action === 'copy') {
      // Duplicate moveframe
      const response = await fetch('/api/workouts/moveframes/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moveframeId: moveframe.id,
          targetWorkoutId,
          position: finalPosition,
          insertBeforeId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy moveframe');
      }
      
      console.log('✅ Moveframe copied:', moveframe.id, '→', targetWorkoutId);
    } else if (action === 'move') {
      // Move moveframe to different workout
      // Check if same workout or different
      if (sourceWorkout.id === targetWorkoutId) {
        // Same workout - this shouldn't happen as we handle it separately
        console.warn('Same workout move detected in modal handler - should be handled earlier');
        return;
      }
      
      // Cross-workout move - use move-to-workout API
      const response = await fetch('/api/workouts/moveframes/move-to-workout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moveframeId: moveframe.id,
          targetWorkoutId,
          targetIndex: position === 'before' ? 0 : undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move moveframe');
      }
      
      console.log('✅ Moveframe moved:', moveframe.id, '→', targetWorkoutId);
      await loadWorkoutData(activeSection); // Reload to show changes
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
        if (activeSection === 'A' && workoutPlan?.weeks) {
          // For Section A, check if any week has less than 7 days
          canAddDay = workoutPlan.weeks.some((week: any) => {
            const dayCount = week.days?.length || 0;
            return dayCount < 7;
          });
        }
        // For sections B and C, always allow adding days
        
        return (
          <WorkoutSectionHeader
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
            totalWeeks={workoutPlan?.weeks?.length || 0}
            workoutPlan={workoutPlan}
            iconType={iconType}
            currentWeekIndex={currentWeekIndex}
            onWeekIndexChange={setCurrentWeekIndex}
            onSectionChange={(section) => {
              setActiveSection(section);
              // Template plans (Section A) don't have calendar view since they don't have specific dates
              if (section === 'A' && viewMode === 'calendar') {
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
          const totalWeeks = workoutPlan?.weeks?.length || 0;
          setCurrentPageStart(Math.min(totalWeeks, currentPageStart + weeksPerPage));
        }}
        onPrintWeek={() => {
          // Get the current week for Section A based on currentWeekIndex
          if (workoutPlan?.weeks && workoutPlan.weeks[currentWeekIndex]) {
            setCurrentWeek(workoutPlan.weeks[currentWeekIndex]);
            setAutoPrintWeek(true);
            setShowWeekTotalsModal(true);
          }
        }}
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

      {/* ==================== COPY FROM TEMPLATE MODAL ==================== */}
      {showCopyFromTemplateModal && (
        <CopyFromTemplateModal
          isOpen={showCopyFromTemplateModal}
          onClose={() => setShowCopyFromTemplateModal(false)}
          onConfirm={handleCopyFromTemplate}
          yearlyPlanWeeks={workoutPlan?.weeks || []}
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

      {/* Workout area - full width */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center - main workout area (full width, no sidebars) */}
        {/* 2026-01-24 - Removed overflow-x to let table containers handle horizontal scrolling */}
        <main className="flex-1 bg-white overflow-y-auto w-full">
          <div className="p-2">

            {isLoading ? (
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
                {(activeSection === 'A' || activeSection === 'B') && workoutPlan && workoutPlan.weeks && workoutPlan.weeks.length > 0 && (
                  <div className="sticky top-0 z-50 bg-white shadow-lg border-b-2 border-gray-300">
                    <div className="flex items-center gap-2">
                      {/* Left: Period Badge (Display Only) */}
                      <div className="flex items-center px-4 py-3 bg-white border-r-2 border-gray-200">
                        {(() => {
                          const firstWeek = workoutPlan.weeks?.[0] as any;
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
                            const firstWeek = workoutPlan.weeks?.[0] as any;
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
                            const firstWeek = workoutPlan.weeks?.[0];
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
                        {activeSection === 'B' && workoutPlan?.weeks && workoutPlan.weeks.length > weeksPerPage && (
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
                                const totalWeeks = workoutPlan.weeks.length;
                                if (currentPageStart + weeksPerPage <= totalWeeks) {
                                  setCurrentPageStart(currentPageStart + weeksPerPage);
                                }
                              }}
                              disabled={currentPageStart + weeksPerPage > (workoutPlan.weeks.length || 0)}
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
                              ? "Show workouts + moveframes" 
                              : "Collapse all"
                          }
                        >
                          {treeExpandState === 0 
                            ? 'Expand All' 
                            : treeExpandState === 1 
                            ? 'Expand All (with moveframes)' 
                            : 'Collapse All'}
                        </button>

                        {/* Copy Week Button */}
                        <button
                          onClick={async () => {
                            const firstWeek = workoutPlan.weeks?.[0];
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
                              
                              const response = await fetch(`/api/workouts/plan?type=${targetPlanType}`, {
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
                            const firstWeek = workoutPlan.weeks?.[0];
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
                            const firstWeek = workoutPlan.weeks?.[0];
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
                  <WorkoutTreeView
                    workoutPlan={
                      // Apply pagination filter for Section A and B
                      (activeSection === 'A' || activeSection === 'B') && workoutPlan
                        ? {
                            ...workoutPlan,
                            weeks: workoutPlan.weeks?.filter((week: any) => {
                              const weekNum = week.weekNumber;
                              return weekNum >= currentPageStart && weekNum < currentPageStart + weeksPerPage;
                            }) || []
                          }
                        : workoutPlan
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
                      setAddWorkoutDay(day);
                      setSelectedWeekForTable(day.weekNumber);
                      setViewMode('table'); // Switch to table view
                    }}
                    onSaveFavoriteWeek={handleSaveFavoriteWeek}
                  />
                </div>
              </div>
            ) : viewMode === 'calendar' ? (
              <WorkoutCalendarView
                workoutPlan={workoutPlan}
                periods={periods}
                excludeStretchingFromTotals={excludeStretchingFromTotals}
                setExcludeStretchingFromTotals={setExcludeStretchingFromTotals}
                onDayClick={(day) => {
                  setSelectedDay(day.id);
                  setAddWorkoutDay(day);
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
                 allWeeks={activeSection === 'B' ? workoutPlan?.weeks : undefined}
                 workoutPlan={
                   selectedWeekForTable && workoutPlan
                     ? {
                         ...workoutPlan,
                         weeks: workoutPlan.weeks?.filter((week: any) => {
                           const weekNum = week.weekNumber;
                           return weekNum >= selectedWeekForTable - 1 && weekNum <= selectedWeekForTable + 1;
                         }) || []
                       }
                     : activeSection === 'B' && workoutPlan
                     ? (() => {
                         const filteredWeeks = workoutPlan.weeks?.filter((week: any) => {
                           const weekNum = week.weekNumber;
                           return weekNum >= currentPageStart && weekNum < currentPageStart + weeksPerPage;
                         }) || [];
                         return {
                           ...workoutPlan,
                           weeks: filteredWeeks
                         };
                       })()
                     : workoutPlan
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
                 workoutsWithExpandedMovelaps={workoutsWithExpandedMovelaps}
                 expandedMoveframeId={autoExpandMoveframeId}
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
                   setAddWorkoutDay(day);
                   setWorkoutModalMode('add');
                   modalActions.setShowAddWorkoutModal(true);
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
                     const response = await fetch('/api/workouts/days/copy', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`
                       },
                      body: JSON.stringify({
                        sourceDayId: copiedDay.id,
                        targetDate: targetDay.date,
                        targetWeekId: targetDay.workoutWeekId
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
                  setAddWorkoutDay(day);
                  setShowWorkoutInfoModal(true); // Open info modal
                }}
                onCopyWorkout={(workout, day) => {
                  setCopiedWorkout(workout);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  modalActions.openCopyWorkoutModal();
                }}
                onPasteWorkout={async (day) => {
                  if (!copiedWorkout) {
                    showMessage('error', 'No workout copied. Please copy a workout first.');
                    return;
                  }
                  
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/workouts/copy', {
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
                    await loadWorkoutData(activeSection);
                  } catch (error: any) {
                    showMessage('error', error.message || 'Failed to paste workout');
                  }
                }}
                onMoveWorkout={(workout, day) => {
                  setCopiedWorkout(workout);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  modalActions.openMoveWorkoutModal();
                }}
                onAddMoveframe={(workout, day) => {
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  setSelectedWorkout(workout.id);
                  setSelectedDay(day);
                  setMoveframeModalMode('add');
                  setEditingMoveframe(null);
                  modalActions.setShowAddMoveframeModal(true);
                }}
                onAddMoveframeAfter={handleAddMoveframeAfter}
                 onEditMoveframe={(moveframe, workout, day) => {
                   setEditingMoveframe(moveframe);
                   setActiveDay(day);
                   setActiveWorkout(workout);
                   setActiveMoveframe(moveframe);
                   setMoveframeModalMode('edit');
                   modalActions.setShowAddMoveframeModal(true);
                 }}
                 onEditMovelap={(movelap, moveframe, workout, day) => {
                  // Check if this movelap is part of a circuit
                  const isCircuitMovelap = movelap.notes && typeof movelap.notes === 'string' && 
                                          movelap.notes.includes('[CIRCUIT_META]');
                  
                  if (isCircuitMovelap && moveframe) {
                    // For circuit movelaps, open the circuit planner's second view
                    setEditingMoveframe(moveframe);
                    setActiveDay(day);
                    setActiveWorkout(workout);
                    setActiveMoveframe(moveframe);
                    setMoveframeModalMode('edit');
                    setEditingFromMovelap(true); // Set flag to indicate editing from movelap
                    modalActions.setShowAddMoveframeModal(true);
                  } else {
                    // For regular movelaps, open the movelap edit modal
                  setEditingMovelap(movelap);
                  setActiveDay(day);
                  setActiveWorkout(workout);
                  setActiveMoveframe(moveframe);
                  setActiveMovelap(movelap);
                  setMovelapInsertIndex(null); // Clear insert index for edit mode
                  modalActions.setMovelapModalMode('edit');
                  modalActions.setShowAddEditMovelapModal(true);
                  }
                }}
                onAddMovelap={(moveframe, workout, day) => {
                  setActiveMoveframe(moveframe);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  setEditingMovelap(null);
                  setMovelapInsertIndex(null); // Clear insert index for regular add
                  modalActions.setMovelapModalMode('add');
                  modalActions.setShowAddEditMovelapModal(true);
                }}
                onAddMovelapAfter={(movelap, index, moveframe, workout, day) => {
                  setActiveMoveframe(moveframe);
                  setActiveWorkout(workout);
                  setActiveDay(day);
                  setEditingMovelap(null);
                  setMovelapInsertIndex(index); // Store the position where to insert (after this index)
                  modalActions.setMovelapModalMode('add');
                  modalActions.setShowAddEditMovelapModal(true);
                }}
                 onDeleteDay={async (day) => {
                   if (confirm(`Are you sure you want to delete this day (${new Date(day.date).toLocaleDateString()})? This will also delete all workouts, moveframes, and movelaps for this day.`)) {
                     try {
                       const token = localStorage.getItem('token');
                       const response = await fetch(`/api/workouts/days?dayId=${day.id}`, {
                         method: 'DELETE',
                         headers: { 'Authorization': `Bearer ${token}` }
                       });
                       
                       if (response.ok) {
                         showMessage('success', 'Day deleted successfully');
                         
                         // Clear any references to this day
                         if (addWorkoutDay?.id === day.id) {
                           setAddWorkoutDay(null);
                         }
                         if (activeDay?.id === day.id) {
                           setActiveDay(null);
                         }
                         if (selectedDay === day.id) {
                           setSelectedDay(null);
                         }
                         
                         // Refresh workout data to remove deleted day from view
                         await loadWorkoutData(activeSection);
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
                      const response = await fetch(`/api/workouts/sessions/${workout.id}`, {
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
                        await loadWorkoutData(activeSection);
                      } else {
                        showMessage('error', 'Failed to delete workout');
                      }
                    } catch (error) {
                      console.error('Error deleting workout:', error);
                      showMessage('error', 'Error deleting workout');
                    }
                  }
                }}
                onSaveFavoriteWorkout={async (workout, day) => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/workouts/favorites', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                      },
                      body: JSON.stringify({ workoutId: workout.id })
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
                  setShowShareWorkoutModal(true);
                }}
                onExportPdfWorkout={(workout, day) => {
                  setWorkoutToPrint(workout);
                  setDayForWorkoutPrint(day);
                  setAutoPrintWorkout(true);
                  setShowWorkoutPrintModal(true);
                }}
                onPrintWorkout={(workout, day) => {
                  setWorkoutToPrint(workout);
                  setDayForWorkoutPrint(day);
                  setAutoPrintWorkout(false);
                  setShowWorkoutPrintModal(true);
                }}
                onShowWorkoutOverview={(workout, day) => {
                  // Transform the workout into the format expected by WorkoutOverviewModal
                  // The modal expects workoutData as a JSON string with workout, moveframes, and sports
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
                      moveframes: workout.moveframes || [],
                      sports: Array.from(new Set((workout.moveframes || []).map((mf: any) => mf.sport).filter(Boolean)))
                    })
                  };
                  
                  setWorkoutForOverview(transformedWorkout);
                  setDayForWorkoutOverview(day);
                  setShowWorkoutOverviewModal(true);
                }}
                 onCopyMoveframe={(moveframe, workout, day) => {
                   setCopiedMoveframe(moveframe);
                   setActiveWorkout(workout);
                   setActiveDay(day);
                   modalActions.setShowCopyMoveframeModal(true);
                 }}
                 onMoveMoveframe={(moveframe, workout, day) => {
                   setCopiedMoveframe(moveframe);
                   setActiveWorkout(workout);
                   setActiveDay(day);
                   modalActions.setShowMoveMoveframeModal(true);
                 }}
                onOpenColumnSettings={(tableType) => {
                  modalActions.setColumnSettingsTableType(tableType);
                  modalActions.setShowColumnSettingsModal(true);
                }}
                 columnSettings={columnSettings}
                 reloadWorkouts={async () => {
                   await loadWorkoutData(activeSection);
                 }}
                 onDeleteMoveframe={async (moveframe, workout, day) => {
                   if (confirm(`Are you sure you want to delete moveframe ${moveframe.letter || moveframe.code}?`)) {
                     try {
                       const token = localStorage.getItem('token');
                       const response = await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
                         method: 'DELETE',
                         headers: { 'Authorization': `Bearer ${token}` }
                       });
                       
                       if (response.ok) {
                         showMessage('success', 'Moveframe deleted successfully');
                         
                         // Clear any references to this moveframe
                         if (activeMoveframe?.id === moveframe.id) {
                           setActiveMoveframe(null);
                         }
                         if (editingMoveframe?.id === moveframe.id) {
                           setEditingMoveframe(null);
                         }
                         if (copiedMoveframe?.id === moveframe.id) {
                           setCopiedMoveframe(null);
                         }
                         
                         // Refresh workout data to remove deleted moveframe from view
                         await loadWorkoutData(activeSection);
                       } else {
                         showMessage('error', 'Failed to delete moveframe');
                       }
                     } catch (error) {
                       console.error('Error deleting moveframe:', error);
                       showMessage('error', 'Error deleting moveframe');
                     }
                   }
                 }}
                 onDeleteMovelap={async (movelap, moveframe, workout, day) => {
                   if (confirm('Are you sure you want to delete this movelap?')) {
                     try {
                       const token = localStorage.getItem('token');
                       const response = await fetch(`/api/workouts/movelaps/${movelap.id}`, {
                         method: 'DELETE',
                         headers: { 'Authorization': `Bearer ${token}` }
                       });
                       
                       if (response.ok) {
                         showMessage('success', 'Movelap deleted successfully');
                         
                         // Clear any references to this movelap
                         if (activeMovelap?.id === movelap.id) {
                           setActiveMovelap(null);
                         }
                         if (editingMovelap?.id === movelap.id) {
                           setEditingMovelap(null);
                         }
                         
                         // Refresh workout data to remove deleted movelap from view
                         await loadWorkoutData(activeSection);
                       } else {
                         showMessage('error', 'Failed to delete movelap');
                       }
                     } catch (error) {
                       console.error('Error deleting movelap:', error);
                       showMessage('error', 'Error deleting movelap');
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
      
      {modals.showAddWorkoutModal && addWorkoutDay && (
        <AddWorkoutModal
          isOpen={modals.showAddWorkoutModal}
          day={addWorkoutDay}
          existingWorkouts={addWorkoutDay.workouts || []}
          mode={workoutModalMode}
          existingWorkout={editingWorkout}
          activeSection={activeSection as 'A' | 'B' | 'C'}
          onClose={() => {
            modalActions.closeAddWorkoutModal();
            setAddWorkoutDay(null);
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
              await workoutHandlers.updateWorkout(editingWorkout.id, workoutData, deps);
            } else {
              // CREATE new workout
              const dayExists = workoutPlan?.weeks?.some((week: any) => 
                week.days?.some((day: any) => day.id === workoutData.dayId)
              ) ?? false;
              await workoutHandlers.createWorkout(workoutData, dayExists, deps);
            }
            
            // Keep day and its parent week expanded (for new workouts)
            if (workoutModalMode === 'add' && addWorkoutDay) {
              // Auto-expand the day using toggle if it's not already expanded
              if (!expandedDays.has(addWorkoutDay.id)) {
                toggleDayExpansion(addWorkoutDay.id);
              }
              
              // Find and expand the parent week
              const parentWeek = workoutPlan?.weeks?.find((week: any) => 
                week.days?.some((day: any) => day.id === addWorkoutDay.id)
              );
              if (parentWeek && !expandedWeeks.has(parentWeek.id)) {
                toggleWeekExpansion(parentWeek.id);
              }
              
              // Auto-expand the day to show the new workout
              setAutoExpandDayId(addWorkoutDay.id);
              setTimeout(() => setAutoExpandDayId(null), 500); // Clear after expansion
            }
            
            modalActions.setShowAddWorkoutModal(false);
            setAddWorkoutDay(null);
            setEditingWorkout(null);
            setWorkoutModalMode('add');
            
            // Refresh workout data to show the changes
            await loadWorkoutData(activeSection);
          }}
        />
      )}

      {/* Workout Info Modal (Read-only view) */}
      {showWorkoutInfoModal && editingWorkout && addWorkoutDay && (
        <WorkoutInfoModal
          isOpen={showWorkoutInfoModal}
          workout={editingWorkout}
          day={addWorkoutDay}
          onClose={() => {
            setShowWorkoutInfoModal(false);
            setEditingWorkout(null);
            setAddWorkoutDay(null);
          }}
          onEdit={() => {
            // Switch to edit mode
            setShowWorkoutInfoModal(false);
            setWorkoutModalMode('edit');
            modalActions.setShowAddWorkoutModal(true);
          }}
        />
      )}
      
       {modals.showAddMoveframeModal && activeWorkout && activeDay && (
        <AddEditMoveframeModal
          isOpen={modals.showAddMoveframeModal}
          mode={moveframeModalMode}
          workout={activeWorkout}
          day={activeDay}
          existingMoveframe={editingMoveframe}
          onSetInsertIndex={(index) => setMoveframeInsertIndex(index)}
          editingFromMovelap={editingFromMovelap}
          onClose={() => {
              modalActions.setShowAddMoveframeModal(false);
            setActiveWorkout(null);
            setActiveDay(null);
            setSelectedWorkout(null);
              setSelectedDay(null);
            setEditingMoveframe(null);
            setMoveframeModalMode('add');
            setMoveframeInsertIndex(null); // Reset insert index
            setEditingFromMovelap(false); // Reset the flag
            }}
             onSave={async (moveframeData) => {
             console.log(`📤 ${moveframeModalMode === 'edit' ? 'Updating' : 'Creating'} moveframe with data:`, moveframeData);
             
             try {
               const deps = getHandlerDeps();
               
               if (moveframeModalMode === 'edit' && editingMoveframe) {
                // UPDATE existing moveframe
              console.log('🔄 [UPDATE] Updating moveframe with manualPriority:', moveframeData.manualPriority);
                // 2026-01-22 10:45 UTC - Prepare notes field with circuit config if applicable
                let updateNotes = moveframeData.notes || '';
                if (moveframeData.isCircuitBased && moveframeData.circuitConfig) {
                  const circuitMeta = {
                    isCircuitBased: true,
                    config: moveframeData.circuitConfig,
                    circuits: moveframeData.circuits
                  };
                  const metaString = `\n\n[CIRCUIT_DATA]${JSON.stringify(circuitMeta)}[/CIRCUIT_DATA]`;
                  updateNotes = updateNotes + metaString;
                }
                
                await moveframeHandlers.updateMoveframe(editingMoveframe.id, {
                   sport: moveframeData.sport,
                   type: moveframeData.type,
                   description: moveframeData.description,
                   notes: updateNotes,
                   macroFinal: moveframeData.macroFinal,
                  alarm: moveframeData.alarm,
                  sectionId: moveframeData.sectionId,
                  manualMode: moveframeData.manualMode || false,
                 manualPriority: moveframeData.manualPriority || false,
                  manualInputType: moveframeData.manualInputType || 'meters',
                  manualRepetitions: moveframeData.manualRepetitions,
                  manualDistance: moveframeData.manualDistance,
                  appliedTechnique: moveframeData.appliedTechnique,
                  aerobicSeries: moveframeData.aerobicSeries,
                  // Annotation fields
                  annotationText: moveframeData.annotationText,
                  annotationBgColor: moveframeData.annotationBgColor,
                  annotationTextColor: moveframeData.annotationTextColor,
                  annotationBold: moveframeData.annotationBold
                }, deps);
                
                // ALWAYS regenerate movelaps for non-ANNOTATION types when editing
                // This ensures Rip\Sets column and all movelap data stays in sync
                // 2026-01-22 10:35 UTC - Skip regeneration for circuit-based moveframes (BATTERY type)
                // 2026-01-28 - Skip regeneration for manual mode moveframes (preserve user's custom summary)
                if (moveframeData.type !== 'ANNOTATION' && moveframeData.type !== 'BATTERY' && !moveframeData.manualMode) {
                   const baseReps = parseInt(moveframeData.repetitions) || 1;
                   const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                   const seriesMultiplier = AEROBIC_SPORTS.includes(moveframeData.sport) ? (parseInt(moveframeData.aerobicSeries) || 1) : 1;
                   const newRepsCount = baseReps * seriesMultiplier;
                   console.log(`🔄 Editing moveframe - regenerating ${newRepsCount} movelaps (${baseReps} reps × ${seriesMultiplier} series) to ensure data sync...`);
                   
                   const token = localStorage.getItem('token');
                   
                   // Delete ALL existing movelaps
                   const deletePromises = (editingMoveframe.movelaps || []).map((movelap: any) =>
                     fetch(`/api/workouts/movelaps/${movelap.id}`, {
                       method: 'DELETE',
                       headers: { 'Authorization': `Bearer ${token}` }
                     })
                   );
                   await Promise.all(deletePromises);
                   console.log(`✅ Deleted ${deletePromises.length} existing movelaps`);
                   
                   // Generate new movelaps with updated data
                   const newMovelaps = generateMovelaps(moveframeData);
                   
                   // Create new movelaps
                   for (const movelap of newMovelaps) {
                     await fetch('/api/workouts/movelaps', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`
                       },
                       body: JSON.stringify({
                         ...movelap,
                         moveframeId: editingMoveframe.id
                       })
                     });
                   }
                   
                   console.log(`✅ Created ${newMovelaps.length} new movelaps with updated data`);
                   console.log(`📊 Rip\\Sets column will now show: ${newMovelaps.length}`);
                 } else if (moveframeData.type === 'BATTERY' && moveframeData.movelaps) {
                   // 2026-01-30 - Regenerate movelaps for BATTERY/Circuit type
                   console.log(`🔄 Editing BATTERY moveframe - regenerating ${moveframeData.movelaps.length} movelaps...`);
                   
                   const token = localStorage.getItem('token');
                   
                   // Delete ALL existing movelaps
                   const deletePromises = (editingMoveframe.movelaps || []).map((movelap: any) =>
                     fetch(`/api/workouts/movelaps/${movelap.id}`, {
                       method: 'DELETE',
                       headers: { 'Authorization': `Bearer ${token}` }
                     })
                   );
                   await Promise.all(deletePromises);
                   
                   // Create new movelaps from the provided list
                   for (const movelap of moveframeData.movelaps) {
                     await fetch('/api/workouts/movelaps', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${token}`
                       },
                       body: JSON.stringify({
                         ...movelap,
                         moveframeId: editingMoveframe.id
                       })
                     });
                   }
                   console.log(`✅ Replaced movelaps for BATTERY moveframe`);
                 } else if (moveframeData.manualMode && editingMoveframe.movelaps && editingMoveframe.movelaps.length > 0) {
                   // For manual mode moveframes, update the existing movelap's notes instead of regenerating
                   const token = localStorage.getItem('token');
                   const existingMovelap = editingMoveframe.movelaps[0];
                   
                   console.log('📝 [UPDATE] Updating manual movelap notes with moveframe content...');
                   
                   await fetch(`/api/workouts/movelaps/${existingMovelap.id}`, {
                     method: 'PUT',
                     headers: {
                       'Content-Type': 'application/json',
                       'Authorization': `Bearer ${token}`
                     },
                     body: JSON.stringify({
                       notes: moveframeData.notes || moveframeData.description || ''
                     })
                   });
                   
                   console.log('✅ Updated manual movelap notes');
                 }
                 
                 // Reload data to show changes (updates Rip\Sets column)
                 await loadWorkoutData(activeSection);
                } else {
                  // CREATE new moveframe
                  console.log('🔍 [DEBUG] moveframeData before generateMovelaps:', {
                    planningMode: moveframeData.planningMode,
                    individualPlans: moveframeData.individualPlans,
                    individualPlansLength: moveframeData.individualPlans?.length,
                    repetitions: moveframeData.repetitions,
                    sport: moveframeData.sport
                  });
                  
                  // Log individual plans in detail
                  if (moveframeData.individualPlans && moveframeData.individualPlans.length > 0) {
                    console.log('📋 Individual Plans (detailed):');
                    moveframeData.individualPlans.forEach((plan: any, index: number) => {
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

                  const movelaps = generateMovelaps(moveframeData);

                  console.log('📤 Generated movelaps (count):', movelaps.length);
                  console.log('📤 Generated movelaps (detailed):');
                  movelaps.forEach((lap, index) => {
                    console.log(`  Movelap ${index + 1}:`, {
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
                let finalNotes = moveframeData.notes || '';
                if (moveframeData.isCircuitBased && moveframeData.circuitConfig) {
                  const circuitMeta = {
                    isCircuitBased: true,
                    config: moveframeData.circuitConfig,
                    circuits: moveframeData.circuits
                  };
                  const metaString = `\n\n[CIRCUIT_DATA]${JSON.stringify(circuitMeta)}[/CIRCUIT_DATA]`;
                  finalNotes = finalNotes + metaString;
                  
                  console.log('✅ Circuit config embedded in notes:', {
                    hasCircuitData: true,
                    notesLength: finalNotes.length,
                    circuitConfig: moveframeData.circuitConfig
                  });
                }
                
                // 2026-01-22 11:00 UTC - Build request body with only valid Prisma schema fields
                const requestBody = {
                   workoutSessionId: activeWorkout.id,
                  sport: moveframeData.sport,
                  type: moveframeData.type || 'STANDARD',
                   description: moveframeData.description,
                   notes: finalNotes,  // Contains embedded circuit data if applicable
                   macroFinal: moveframeData.macroFinal,
                   alarm: moveframeData.alarm,
                   movelaps,  // Movelaps already generated by CircuitPlanner
                  sectionId: moveframeData.sectionId || 'default',
                  manualMode: moveframeData.manualMode || false,
                 manualPriority: moveframeData.manualPriority || false,
                  manualInputType: moveframeData.manualInputType || 'meters',
                  // Manual mode fields for Moveframe model
                  manualRepetitions: moveframeData.manualRepetitions,
                  manualDistance: moveframeData.manualDistance,
                  // Aerobic series field
                  appliedTechnique: moveframeData.appliedTechnique,
                  aerobicSeries: moveframeData.aerobicSeries,
                  // Annotation fields
                  annotationText: moveframeData.annotationText,
                  annotationBgColor: moveframeData.annotationBgColor,
                  annotationTextColor: moveframeData.annotationTextColor,
                  annotationBold: moveframeData.annotationBold
                };
                
                // 2026-01-22 11:00 UTC - IMPORTANT: Don't include circuit-specific fields in request
                // They are already embedded in the notes field above
               
                console.log('🚨🚨🚨 [CREATE] CRITICAL DEBUG - manualInputType:');
                console.log('  From moveframeData:', moveframeData.manualInputType);
                console.log('  Type:', typeof moveframeData.manualInputType);
                console.log('  Is undefined?:', moveframeData.manualInputType === undefined);
                console.log('  Is null?:', moveframeData.manualInputType === null);
                console.log('  In requestBody:', requestBody.manualInputType);
                console.log('  Full moveframeData:', moveframeData);
               
                console.log('📤 Creating moveframe with request body:', {
                  ...requestBody,
                  manualMode: moveframeData.manualMode,
                 manualPriority: moveframeData.manualPriority,
                  hasNotes: !!requestBody.notes,
                  notesLength: requestBody.notes?.length || 0,
                  movelapCount: movelaps.length
                });
                 
                const result = await moveframeHandlers.createMoveframe(requestBody, deps);
                 console.log('✅ Moveframe created successfully:', result);
                 
                 // If we have an insert index, reorder the moveframes BEFORE reloading
                 if (moveframeInsertIndex !== null) {
                   console.log('📍 Inserting new moveframe at index:', moveframeInsertIndex);
                   
                   const token = localStorage.getItem('token');
                   // Fetch fresh workout plan data directly from API
                   const planType = sectionHelpers.getPlanType(activeSection);
                   const planResponse = await fetch(`/api/workouts/plan?type=${planType}`, {
                     headers: {
                       'Authorization': `Bearer ${token}`
                     }
                   });
                   
                   if (planResponse.ok) {
                     const freshPlanData = await planResponse.json();
                     const updatedWorkout = freshPlanData.plan?.weeks
                       ?.flatMap((w: any) => w.days)
                       ?.find((d: any) => d.id === activeDay.id)
                       ?.workouts?.find((w: any) => w.id === activeWorkout.id);
                   
                     if (updatedWorkout && updatedWorkout.moveframes && updatedWorkout.moveframes.length > 1) {
                       const moveframes = [...updatedWorkout.moveframes];
                       const newMoveframeId = result.moveframe.id;
                       
                       // Find the new moveframe
                       const newMoveframeIndex = moveframes.findIndex((mf: any) => mf.id === newMoveframeId);
                       
                       if (newMoveframeIndex !== -1 && newMoveframeIndex !== moveframeInsertIndex) {
                         console.log('📍 Reordering: moving moveframe from position', newMoveframeIndex, 'to', moveframeInsertIndex);
                         
                         // Remove the new moveframe from its current position
                         const [newMoveframe] = moveframes.splice(newMoveframeIndex, 1);
                         
                         // Insert it at the desired position
                         moveframes.splice(moveframeInsertIndex, 0, newMoveframe);
                         
                         // Reassign letters
                         const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                         const reorderedMoveframes = moveframes.map((mf: any, idx: number) => ({
                           id: mf.id,
                           letter: letters[idx] || `${letters[25]}${idx - 25}`
                         }));
                         
                         // Call reorder API
                         const reorderResponse = await fetch('/api/workouts/moveframes/reorder', {
                           method: 'PATCH',
                           headers: {
                             'Content-Type': 'application/json',
                             'Authorization': `Bearer ${token}`
                           },
                           body: JSON.stringify({
                             moveframes: reorderedMoveframes
                           })
                         });
                         
                         if (!reorderResponse.ok) {
                           const errorData = await reorderResponse.json();
                           console.error('❌ Failed to reorder moveframes:', errorData);
                           showMessage('error', 'Failed to reorder moveframes');
                         } else {
                           console.log('✅ Moveframes reordered successfully');
                         }
                       }
                     }
                   }
                   
                   // Reset insert index
                   setMoveframeInsertIndex(null);
                 }
                 
                 // Reload data to show the final result
                 await loadWorkoutData(activeSection);
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
               console.error('❌ Failed to save moveframe:', error);
               showMessage('error', error.message || 'Failed to save moveframe');
               throw error;
               }
           }}
           mode={moveframeModalMode}
           workout={activeWorkout}
           day={activeDay}
           existingMoveframe={moveframeModalMode === 'edit' ? editingMoveframe : undefined}
         />
       )}
       
      {modals.showImportModal && (activeSection === 'A' || activeSection === 'B') && (
        <ImportWorkoutsModal
          targetSection={activeSection}
          onClose={() => modalActions.setShowImportModal(false)}
          onImport={async (sourceType, sourceId, workouts) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/import', {
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
               console.error('Error importing workouts:', error);
               showMessage('error', 'Error importing workouts');
             }
           }}
         />
       )}
       
      {modals.showAddDayModal && workoutPlan && (
        <AddDayModal
          workoutPlanId={workoutPlan.id}
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
                      loadWorkoutData(activeSection); // Reload data for selected athlete
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
                  loadWorkoutData(activeSection); // Reload own data
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                View My Workouts
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
      
      {/* Workout Selector Modal - For Adding Moveframe */}
      {modals.showWorkoutSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select Workout for Moveframe</h2>
              <button onClick={() => modalActions.setShowWorkoutSelector(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select which workout to add the moveframe to. Showing all existing workouts for {addWorkoutDay?.date ? new Date(addWorkoutDay.date).toLocaleDateString() : 'selected day'}.
            </p>
            
            <div className="space-y-3">
              {availableWorkouts.map((workout, index) => (
                <button
                  key={workout.id}
                  onClick={() => {
                    setSelectedWorkout(workout.id);
                    modalActions.setShowWorkoutSelector(false);
                    modalActions.setShowAddMoveframeModal(true);
                  }}
                  className="w-full text-left px-4 py-4 border-2 border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-blue-600">Workout #{index + 1}</span>
                        <span className="text-sm text-gray-500">
                          {addWorkoutDay?.date ? new Date(addWorkoutDay.date).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-gray-900">
                          {workout.name || '<no name assigned>'}
                        </span>
                      </div>
                      {workout.moveframes && workout.moveframes.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-600">Sports:</span>
                          <div className="flex gap-1">
                            {(Array.from(new Set(workout.moveframes.map((mf: any) => mf.sport as string))) as string[]).slice(0, 4).map((sport: string, idx: number) => (
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
      {modals.showDaySelector && workoutPlan && (
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
              {workoutPlan.weeks.map((week: any) => (
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
            await loadWorkoutData(activeSection);
          }}
          onError={(msg) => showMessage('error', msg)}
          onSuccess={(msg) => showMessage('success', msg)}
        />
      )}

      {/* ==================== ADD MOVELAP MODAL (Extracted Component) ==================== */}
      {modals.showAddMovelapModal && activeMoveframe && activeWorkout && activeDay && (
        <AddMovelapModal
          moveframe={activeMoveframe}
          workout={activeWorkout}
          day={activeDay}
          onClose={() => modalActions.setShowAddMovelapModal(false)}
          onSave={(moveframeId, newMovelap) => {
            // Update local state without full page reload
            if (workoutPlan && newMovelap) {
              const updatedPlan = { ...workoutPlan };
              
              // Find and update the specific moveframe with the new movelap
              updatedPlan.weeks = workoutPlan.weeks.map((week: any) => ({
                ...week,
                days: week.days.map((day: any) => ({
                  ...day,
                  workouts: day.workouts?.map((workout: any) => ({
                    ...workout,
                    moveframes: workout.moveframes?.map((mf: any) => {
                      if (mf.id === moveframeId) {
                        return {
                          ...mf,
                          movelaps: [...(mf.movelaps || []), newMovelap]
                        };
                      }
                      return mf;
                    })
                  }))
                }))
              }));
              
              updateWorkoutPlan(updatedPlan);
            }
            
            // Keep moveframe expanded so user can see the new movelap
            if (activeDay && activeWorkout && moveframeId) {
              setAutoExpandDayId(activeDay.id);
              setAutoExpandWorkoutId(activeWorkout.id);
              setAutoExpandMoveframeId(moveframeId);
            }
          }}
          onError={(msg) => showMessage('error', msg)}
          onSuccess={(msg) => showMessage('success', msg)}
        />
      )}

      {/* ==================== EDIT MOVEFRAME MODAL (Extracted Component) ==================== */}
      {modals.showEditMoveframeModal && editingMoveframe && activeWorkout && activeDay && (
        <EditMoveframeModal
          moveframe={editingMoveframe}
          workout={activeWorkout}
          day={activeDay}
          onClose={() => {
            modalActions.setShowEditMoveframeModal(false);
            setEditingMoveframe(null);
          }}
          onSave={async () => {
            modalActions.setShowEditMoveframeModal(false);
            setEditingMoveframe(null);
            await loadWorkoutData(activeSection);
          }}
          onError={(msg) => showMessage('error', msg)}
          onSuccess={(msg) => showMessage('success', msg)}
        />
      )}

      {/* ==================== ADD/EDIT MOVELAP MODAL (New Unified Component) ==================== */}
      {modals.showAddEditMovelapModal && activeMoveframe && (
        <AddEditMovelapModal
          isOpen={modals.showAddEditMovelapModal}
          mode={modes.movelapModalMode}
          moveframe={activeMoveframe}
          existingMovelap={editingMovelap}
          onClose={() => {
            modalActions.setShowAddEditMovelapModal(false);
            setEditingMovelap(null);
            setActiveMoveframe(null);
            setMovelapInsertIndex(null); // Clear insert index on close
          }}
          onCopyToAll={async (fieldName: string, fieldValue: any) => {
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                showMessage('error', 'Authentication required');
                return;
              }

              // Get all movelaps in the current moveframe
              const movelapsToUpdate = activeMoveframe.movelaps?.filter(
                (ml: any) => editingMovelap && ml.id !== editingMovelap.id
              ) || [];

              if (movelapsToUpdate.length === 0) {
                showMessage('info', 'No other movelaps to copy to');
                return;
              }

              // Update all movelaps with the new field value ONLY (preserve other fields)
              const updatePromises = movelapsToUpdate.map((movelap: any) => {
                // Get the current movelap data and only update the specific field
                const existingData = {
                  distance: movelap.distance,
                  speed: movelap.speed,
                  style: movelap.style,
                  pause: movelap.pause,
                  pace: movelap.pace,
                  time: movelap.time,
                  notes: movelap.notes,
                  alarm: movelap.alarm,
                  sound: movelap.sound,
                  macroFinal: movelap.macroFinal,
                  reps: movelap.reps,
                  weight: movelap.weight,
                  tools: movelap.tools,
                  muscularSector: movelap.muscularSector,
                  exercise: movelap.exercise,
                  restType: movelap.restType,
                  r1: movelap.r1,
                  r2: movelap.r2,
                };
                
                // Only update the specific field
                const updateData = {
                  ...existingData,
                  [fieldName]: fieldValue
                };
                
                return fetch(`/api/workouts/movelaps?id=${movelap.id}`, {
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
                showMessage('success', `Copied ${fieldName} to ${movelapsToUpdate.length} movelap(s)`);
                
                // Refresh the moveframe data
                const dayIdToExpand = activeDay?.id;
                const workoutIdToExpand = activeWorkout?.id;
                const moveframeIdToExpand = activeMoveframe?.id;
                
                await loadWorkoutData(activeSection);
                
                // Keep the moveframe expanded after reload
                if (dayIdToExpand && workoutIdToExpand && moveframeIdToExpand) {
                  setAutoExpandDayId(dayIdToExpand);
                  setAutoExpandWorkoutId(workoutIdToExpand);
                  setAutoExpandMoveframeId(moveframeIdToExpand);
                  setTimeout(() => {
                    setAutoExpandDayId(null);
                    setAutoExpandWorkoutId(null);
                    setAutoExpandMoveframeId(null);
                  }, 500);
                }
              } else {
                showMessage('error', 'Failed to copy to all movelaps');
              }
            } catch (error: any) {
              console.error('Error copying to all movelaps:', error);
              showMessage('error', 'Failed to copy to all movelaps');
            }
          }}
          onSave={async (movelapData) => {
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                showMessage('error', 'Authentication required');
                return;
              }

              let response;
              if (modes.movelapModalMode === 'edit' && editingMovelap) {
                // Update existing movelap
                response = await fetch(`/api/workouts/movelaps?id=${editingMovelap.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(movelapData)
                });
              } else {
                // Create new movelap
                response = await fetch('/api/workouts/movelaps', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(movelapData)
                });

                // Always reorder based on sequence number or insert index
                if (response.ok) {
                  const newMovelap = await response.json();
                  
                  // Fetch fresh moveframe data with all movelaps
                  const moveframeResponse = await fetch(`/api/workouts/moveframes/${activeMoveframe.id}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  if (moveframeResponse.ok) {
                    const freshMoveframe = await moveframeResponse.json();
                    const allMovelaps = [...freshMoveframe.movelaps];
                    
                    // Find the newly created movelap (it will be at the end)
                    const newMovelapIndex = allMovelaps.findIndex((ml: any) => ml.id === newMovelap.id);
                    
                    if (newMovelapIndex !== -1) {
                      // Remove the new movelap from its current position
                      const [movedMovelap] = allMovelaps.splice(newMovelapIndex, 1);
                      
                      // Determine insertion position
                      let insertPosition;
                      if (movelapInsertIndex !== null) {
                        // Insert after the specified index (for "Add movelap after" button)
                        insertPosition = movelapInsertIndex + 1;
                      } else {
                        // Use sequence number from modal (insert AT that position, pushing others down)
                        insertPosition = (movelapData.repetitionNumber || 1) - 1;
                        if (insertPosition < 0) insertPosition = 0;
                        if (insertPosition > allMovelaps.length) insertPosition = allMovelaps.length;
                      }
                      
                      // Insert at the specified position
                      allMovelaps.splice(insertPosition, 0, movedMovelap);
                      
                      // Update repetitionNumbers for all movelaps and mark the new one
                      const reorderData = allMovelaps.map((ml: any, idx: number) => ({
                        id: ml.id,
                        repetitionNumber: idx + 1,
                        isNewlyAdded: ml.id === newMovelap.id // Mark newly added movelap
                      }));
                      
                      // Call reorder API
                      const reorderResponse = await fetch('/api/workouts/movelaps/reorder', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ movelaps: reorderData })
                      });
                      
                      if (!reorderResponse.ok) {
                        console.error('Failed to reorder movelaps');
                      }
                    }
                  }
                  
                  // Reset insert index
                  setMovelapInsertIndex(null);
                }
              }

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save movelap');
              }

              showMessage('success', modes.movelapModalMode === 'edit' ? 'Movelap updated successfully' : 'Movelap created successfully');
              
              // Store the IDs we need to keep expanded before clearing states
              const dayIdToExpand = activeDay?.id;
              const workoutIdToExpand = activeWorkout?.id;
              const moveframeIdToExpand = activeMoveframe?.id;
              
              modalActions.setShowAddEditMovelapModal(false);
              setEditingMovelap(null);
              setActiveMoveframe(null);
              setMovelapInsertIndex(null);
              
              // Refresh workout data to show changes
              await loadWorkoutData(activeSection);
              
              // Keep the moveframe expanded after reload
              if (dayIdToExpand && workoutIdToExpand && moveframeIdToExpand) {
                setAutoExpandDayId(dayIdToExpand);
                setAutoExpandWorkoutId(workoutIdToExpand);
                setAutoExpandMoveframeId(moveframeIdToExpand);
                setTimeout(() => {
                  setAutoExpandDayId(null);
                  setAutoExpandWorkoutId(null);
                  setAutoExpandMoveframeId(null);
                }, 500);
              }
            } catch (error: any) {
              console.error('Error saving movelap:', error);
              showMessage('error', error.message || 'Failed to save movelap');
            }
          }}
        />
      )}

      {/* ==================== COPY DAY MODAL ==================== */}
      {modals.showCopyDayModal && copiedDay && workoutPlan && (
        <CopyDayModal
          isOpen={modals.showCopyDayModal}
          onClose={() => {
            modalActions.closeCopyDayModal();
            setCopiedDay(null);
          }}
          sourceDay={copiedDay}
          workoutPlan={workoutPlan}
          activeSection={activeSection}
          onConfirm={async (targetDate, targetWeekId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/days/copy', {
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
      {modals.showMoveDayModal && copiedDay && workoutPlan && (
        <MoveDayModal
          isOpen={modals.showMoveDayModal}
          onClose={() => {
            modalActions.closeMoveDayModal();
            setCopiedDay(null);
          }}
          sourceDay={copiedDay}
          workoutPlan={workoutPlan}
          activeSection={activeSection}
          onConfirm={async (targetDate, targetWeekId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/days/move', {
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
      {modals.showCopyWorkoutModal && copiedWorkout && workoutPlan && (
        <CopyWorkoutModal
          isOpen={modals.showCopyWorkoutModal}
          onClose={() => {
            modalActions.closeCopyWorkoutModal();
            setCopiedWorkout(null);
          }}
          sourceWorkout={copiedWorkout}
          workoutPlan={workoutPlan}
          activeSection={activeSection}
          onConfirm={async (targetDayId, sessionNumber) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/sessions/copy', {
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
              modalActions.closeCopyWorkoutModal();
              setCopiedWorkout(null);
              
              // Refresh workout data to show the copied workout
              await loadWorkoutData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to copy workout');
            }
          }}
        />
      )}

      {/* ==================== MOVE WORKOUT MODAL ==================== */}
      {modals.showMoveWorkoutModal && copiedWorkout && workoutPlan && (
        <MoveWorkoutModal
          isOpen={modals.showMoveWorkoutModal}
          onClose={() => {
            modalActions.closeMoveWorkoutModal();
            setCopiedWorkout(null);
          }}
          sourceWorkout={copiedWorkout}
          workoutPlan={workoutPlan}
          activeSection={activeSection}
          onConfirm={async (targetDayId, sessionNumber) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/sessions/move', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  workoutId: copiedWorkout.id,
                  targetDayId,
                  sessionNumber
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to move workout');
              }

              showMessage('success', 'Workout moved successfully');
              modalActions.closeMoveWorkoutModal();
              setCopiedWorkout(null);
              
              // Refresh workout data to show the moved workout
              await loadWorkoutData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to move workout');
            }
          }}
        />
      )}

      {/* ==================== COPY MOVEFRAME MODAL ==================== */}
      {modals.showCopyMoveframeModal && copiedMoveframe && workoutPlan && (
        <CopyMoveframeModal
          isOpen={modals.showCopyMoveframeModal}
          onClose={() => {
            modalActions.setShowCopyMoveframeModal(false);
            setCopiedMoveframe(null);
          }}
          sourceMoveframe={copiedMoveframe}
          workoutPlan={workoutPlan}
          activeSection={activeSection}
          onConfirm={async (targetWorkoutId, position, targetMoveframeId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/moveframes/copy', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  sourceMoveframeId: copiedMoveframe.id,
                  targetWorkoutId,
                  position,
                  targetMoveframeId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to copy moveframe');
              }

              showMessage('success', 'Moveframe copied successfully');
              modalActions.setShowCopyMoveframeModal(false);
              setCopiedMoveframe(null);
              await loadWorkoutData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to copy moveframe');
            }
          }}
        />
      )}

      {/* ==================== MOVE MOVEFRAME MODAL ==================== */}
      {modals.showMoveMoveframeModal && copiedMoveframe && activeWorkout && workoutPlan && (
        <MoveMoveframeModal
          isOpen={modals.showMoveMoveframeModal}
          onClose={() => {
            modalActions.setShowMoveMoveframeModal(false);
            setCopiedMoveframe(null);
          }}
          sourceMoveframe={copiedMoveframe}
          sourceWorkout={activeWorkout}
          workoutPlan={workoutPlan}
          activeSection={activeSection}
          onConfirm={async (targetWorkoutId, position, targetMoveframeId) => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('/api/workouts/moveframes/move', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  moveframeId: copiedMoveframe.id,
                  targetWorkoutId,
                  position,
                  targetMoveframeId
                })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to move moveframe');
              }

              showMessage('success', 'Moveframe moved successfully');
              modalActions.setShowMoveMoveframeModal(false);
              setCopiedMoveframe(null);
              await loadWorkoutData(activeSection);
            } catch (error: any) {
              showMessage('error', error.message || 'Failed to move moveframe');
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
      {modals.showBulkAddMovelapModal && activeMoveframe && activeWorkout && activeDay && (
        <BulkAddMovelapModal
          isOpen={modals.showBulkAddMovelapModal}
          onClose={() => {
            modalActions.setShowBulkAddMovelapModal(false);
            setActiveMoveframe(null);
          }}
          moveframe={activeMoveframe}
          workout={activeWorkout}
          day={activeDay}
          onSave={async (movelaps) => {
            try {
              const token = localStorage.getItem('token');
              
              // Create all movelaps
              for (const movelapData of movelaps) {
                await fetch('/api/workouts/movelaps', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    ...movelapData,
                    moveframeId: activeMoveframe.id
                  })
                });
              }

              showMessage('success', `${movelaps.length} movelaps added successfully`);
              modalActions.setShowBulkAddMovelapModal(false);
              setActiveMoveframe(null);
              await loadWorkoutData(activeSection);
            } catch (error) {
              console.error('Error bulk adding movelaps:', error);
              showMessage('error', 'Failed to add movelaps');
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
        {draggedMoveframe && (
          <div className="bg-purple-400 text-white px-4 py-2 rounded shadow-lg opacity-90">
            💪 Dragging Moveframe...
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
          activeSection={activeSection}
        />
      )}

      {/* Workout Print/PDF Export Modal */}
      {showWorkoutPrintModal && workoutToPrint && (
        <WorkoutPrintModal
          isOpen={showWorkoutPrintModal}
          onClose={() => {
            setShowWorkoutPrintModal(false);
            setWorkoutToPrint(null);
            setDayForWorkoutPrint(null);
            setAutoPrintWorkout(false);
          }}
          workout={workoutToPrint}
          day={dayForWorkoutPrint}
          autoPrint={autoPrintWorkout}
          activeSection={activeSection}
        />
      )}

      {/* Share Workout Modal */}
      {showShareWorkoutModal && workoutToShare && (
        <ShareWorkoutModal
          isOpen={showShareWorkoutModal}
          onClose={() => {
            setShowShareWorkoutModal(false);
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

      {/* Workout Overview Modal */}
      {showWorkoutOverviewModal && workoutForOverview && (
        <WorkoutOverviewModal
          onClose={() => {
            setShowWorkoutOverviewModal(false);
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
          activeSection={activeSection}
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
              const response = await fetch(`/api/workouts/weeks/${currentWeek.id}/notes`, {
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
              await loadWorkoutData();
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
              Use the table view Move buttons to move individual days, workouts, moveframes, or movelaps.
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
