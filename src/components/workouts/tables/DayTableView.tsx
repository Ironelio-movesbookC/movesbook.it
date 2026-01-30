'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Flag } from 'lucide-react';
// import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useColorSettings } from '@/hooks/useColorSettings';
import { getContrastTextColor } from '@/utils/colorUtils';
import { useSportIconType } from '@/hooks/useSportIconType';
import DayRowTable from './DayRowTable';
import WorkoutHierarchyView from './WorkoutHierarchyView';
import WeeklyInfoModal from '../WeeklyInfoModal';
import WeekTotalsModal from '../modals/WeekTotalsModal';
import CopyWeekModal from '../modals/CopyWeekModal';
import MoveWeekModal from '../modals/MoveWeekModal';
import DayInfoModal from '../DayInfoModal';
import '../../../styles/sticky-table.css';

interface DayTableViewProps {
  workoutPlan: any;
  allWeeks?: any[]; // All weeks (unfiltered) for modal navigation
  activeSection?: 'A' | 'B' | 'C' | 'D'; // Active section for conditional display
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  currentPageStart?: number; // Current page start for Section B navigation
  setCurrentPageStart?: (page: number) => void; // Setter for current page start
  weeksPerPage?: number; // Weeks per page for Section B navigation
  excludeStretchingCheckbox?: React.ReactNode; // Checkbox for excluding stretching
  totalYearWeeks?: number; // Total weeks in year (default 52)
  currentWeekIndex?: number; // Current week index for Section A
  onWeekIndexChange?: (index: number) => void; // Setter for current week index in Section A
  expandedDays?: Set<string>;
  expandedWorkouts?: Set<string>;
  fullyExpandedWorkouts?: Set<string>; // Workouts with moveframes visible
  workoutsWithExpandedMovelaps?: Set<string>; // Workouts with movelaps expanded
  expandedMoveframeId?: string | null;
  onToggleDay?: (dayId: string) => void;
  onToggleWorkout?: (workoutId: string) => void;
  onExpandOnlyThisWorkout?: (workout: any, day: any) => void;
  onExpandDayWithAllWorkouts?: (dayId: string, workouts: any[]) => void;
  onCycleWorkoutExpansion?: (workout: any, day: any) => void; // 3-state cycle for workout numbers
  onEditDay?: (day: any) => void;
  onAddWorkout?: (day: any) => void;
  onCopyDay?: (day: any) => void;
  onMoveDay?: (day: any) => void;
  onPasteDay?: (day: any) => void;
  onShareDay?: (day: any) => void;
  onExportPdfDay?: (day: any) => void;
  onPrintDay?: (day: any) => void;
  onShowDayOverview?: (day: any) => void;
  onEditWorkout?: (workout: any, day: any) => void;
  onEditMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onEditMovelap?: (movelap: any, moveframe: any, workout: any, day: any) => void;
  onAddMoveframe?: (workout: any, day: any) => void;
  onAddMoveframeAfter?: (moveframe: any, index: number, workout: any, day: any) => void;
  onAddMovelap?: (moveframe: any, workout: any, day: any) => void;
  onAddMovelapAfter?: (movelap: any, index: number, moveframe: any, workout: any, day: any) => void;
  onDeleteDay?: (day: any) => void;
  onDeleteWorkout?: (workout: any, day: any) => void;
  onSaveFavoriteWorkout?: (workout: any, day: any) => void;
  onShareWorkout?: (workout: any, day: any) => void;
  onExportPdfWorkout?: (workout: any, day: any) => void;
  onPrintWorkout?: (workout: any, day: any) => void;
  onShowWorkoutOverview?: (workout: any, day: any) => void;
  onDeleteMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onDeleteMovelap?: (movelap: any, moveframe: any, workout: any, day: any) => void;
  onCopyWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'moveframe' | 'movelap') => void;
  columnSettings?: any;
  reloadWorkouts?: () => Promise<void>; // Added for reloading after copy/move
}

// Helper function to get section label and color
const getSectionBadge = (section?: 'A' | 'B' | 'C' | 'D') => {
  switch(section) {
    case 'B':
      return { label: 'PLANNED', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-300' };
    case 'C':
      return { label: 'COMPLETED', bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-300' };
    case 'A':
      return { label: 'DRAFT', bgColor: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-300' };
    case 'D':
      return { label: 'ARCHIVE', bgColor: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300' };
    default:
      return null;
  }
};

export default function DayTableView({
  workoutPlan,
  allWeeks,
  activeSection = 'A',
  iconType: iconTypeProp,
  currentPageStart = 1,
  setCurrentPageStart,
  weeksPerPage = 3,
  excludeStretchingCheckbox,
  totalYearWeeks = 52,
  currentWeekIndex: externalCurrentWeekIndex,
  onWeekIndexChange,
  expandedDays,
  expandedWorkouts,
  fullyExpandedWorkouts,
  workoutsWithExpandedMovelaps,
  expandedMoveframeId,
  onToggleDay,
  onToggleWorkout,
  onExpandOnlyThisWorkout,
  onExpandDayWithAllWorkouts,
  onCycleWorkoutExpansion,
  onEditDay,
  onAddWorkout,
  onCopyDay,
  onMoveDay,
  onPasteDay,
  onShareDay,
  onExportPdfDay,
  onPrintDay,
  onShowDayOverview,
  onEditWorkout,
  onEditMoveframe,
  onEditMovelap,
  onAddMoveframe,
  onAddMoveframeAfter,
  onAddMovelap,
  onAddMovelapAfter,
  reloadWorkouts,
  onDeleteDay,
  onDeleteWorkout,
  onSaveFavoriteWorkout,
  onShareWorkout,
  onExportPdfWorkout,
  onPrintWorkout,
  onShowWorkoutOverview,
  onDeleteMoveframe,
  onDeleteMovelap,
  onCopyWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyMoveframe,
  onMoveMoveframe,
  onOpenColumnSettings,
  columnSettings
}: DayTableViewProps) {
  const { colors } = useColorSettings();
  const defaultIconType = useSportIconType();
  const [localIconType, setLocalIconType] = useState<'emoji' | 'icon'>(defaultIconType);
  const iconType = iconTypeProp || localIconType;
  const [localCurrentWeekIndex, setLocalCurrentWeekIndex] = useState(0);
  const currentWeekIndex = externalCurrentWeekIndex !== undefined ? externalCurrentWeekIndex : localCurrentWeekIndex;
  const setCurrentWeekIndex = onWeekIndexChange || setLocalCurrentWeekIndex;
  const [isWeeklyInfoModalOpen, setIsWeeklyInfoModalOpen] = useState(false);
  const [weeklyNotes, setWeeklyNotes] = useState<Record<string, { periodId: string; notes: string }>>({});
  const [dayInfoModalOpen, setDayInfoModalOpen] = useState(false);
  const [selectedDayForInfo, setSelectedDayForInfo] = useState<any | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [selectedPeriodForRange, setSelectedPeriodForRange] = useState<any | null>(null);
  const [showWeekNotesModal, setShowWeekNotesModal] = useState(false);
  const [selectedWeekNotes, setSelectedWeekNotes] = useState<string>('');
  const [weekRangeStart, setWeekRangeStart] = useState<number>(1);
  const [weekRangeEnd, setWeekRangeEnd] = useState<number>(1);
  // Expand state: 0 = Collapsed, 1 = Workouts only (no moveframes), 2 = Workouts + Moveframes
  const [expandState, setExpandState] = useState<number>(0);
  const [showWeekTotalsModal, setShowWeekTotalsModal] = useState(false);
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false);
  const [showMoveWeekModal, setShowMoveWeekModal] = useState(false);
  const [autoPrintWeek, setAutoPrintWeek] = useState(false);
  const [showAllWeeksInModal, setShowAllWeeksInModal] = useState(false);
  const [targetWeeks, setTargetWeeks] = useState<any[]>([]);
  const [expandedWeeksHeaders, setExpandedWeeksHeaders] = useState<Set<string>>(new Set());
  const [currentWeekForModal, setCurrentWeekForModal] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<string>('');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  
  const expandedDaysSet = expandedDays || new Set<string>();
  const expandedWorkoutsSet = expandedWorkouts || new Set<string>();
  
  // Debug: Log expansion state (disabled for performance)
  // console.log('📅 DayTableView: expandedDays:', Array.from(expandedDaysSet));
  // console.log('🏋️ DayTableView: expandedWorkouts:', Array.from(expandedWorkoutsSet));
  
  // Load icon type from localStorage on mount (only if no prop provided)
  useEffect(() => {
    if (!iconTypeProp) {
      const saved = localStorage.getItem('sportIconType');
      if (saved === 'icon' || saved === 'emoji') {
        setLocalIconType(saved);
      }
    }
  }, [iconTypeProp]);
  
  // Load periods
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/workouts/periods', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPeriods(data.periods || []); // Extract periods array from response
        }
      } catch (error) {
        console.error('Error loading periods:', error);
      }
    };
    
    loadPeriods();
  }, []);

  // Reset expand state when week changes
  useEffect(() => {
    console.log('🔄 Week changed, resetting expandState to 0');
    setExpandState(0);
  }, [currentWeekIndex]);
  
  // Log current expand state for debugging
  useEffect(() => {
    console.log('📊 Current expandState:', expandState, '| Days expanded:', expandedDaysSet.size, '| Workouts expanded:', expandedWorkoutsSet.size);
  }, [expandState, expandedDaysSet.size, expandedWorkoutsSet.size]);

  // Load week notes when weeks change
  useEffect(() => {
    const loadWeekNotes = async () => {
      if (!workoutPlan?.weeks || workoutPlan.weeks.length === 0) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      // Load notes for all weeks
      const notesPromises = workoutPlan.weeks.map(async (week: any) => {
        try {
          const response = await fetch(`/api/workouts/weeks/${week.id}/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            return {
              weekId: week.id,
              data: {
                periodId: data.periodId || '',
                notes: data.notes || ''
              }
            };
          }
        } catch (error) {
          console.error(`Error loading notes for week ${week.id}:`, error);
        }
        return null;
      });

      const results = await Promise.all(notesPromises);
      const notesMap: Record<string, { periodId: string; notes: string }> = {};
      
      results.forEach(result => {
        if (result) {
          notesMap[result.weekId] = result.data;
        }
      });

      if (Object.keys(notesMap).length > 0) {
        setWeeklyNotes(prev => ({ ...prev, ...notesMap }));
        console.log('✅ Loaded week notes:', notesMap);
      }
    };

    loadWeekNotes();
  }, [workoutPlan?.weeks]);
  
  // Constants for UI dimensions
  const SCROLLBAR_HEIGHT = 24; // px
  
  // Column width constants (for consistent sizing across the table)
  const COL_WIDTHS = {
    noWorkouts: 50,
    colorCycle: 50,     // Color circle
    nameCycle: 90,      // Period name
    weekNumber: 60,     // Week
    dayNumber: 50,      // Day
    matchDone: 60,      // Match done checkbox (for sections B and C)
    dayname: 120,       // Dayname & Date (wider to accommodate both)
    workouts: 120,
    icoSport: 100,      // "Ico Sport" column
    distTime: 100,      // "Dist & Time" column
    mainWork: 200,      // "Main work" column
    secondaryWork: 200, // "Secondary work" column
    options: 320
  };
  
  // Calculate minimum table width dynamically based on column widths
  // Section A: 6 sticky columns (no Dayname, no Match done)
  // Section B, C: 8 sticky columns (has Dayname AND Match done)
  // Section D: 7 sticky columns (has Dayname, no Match done)
  const TABLE_MIN_WIDTH = 
    COL_WIDTHS.noWorkouts + 
    COL_WIDTHS.colorCycle + 
    COL_WIDTHS.nameCycle + 
    COL_WIDTHS.weekNumber + 
    COL_WIDTHS.dayNumber + 
    ((activeSection === 'B' || activeSection === 'C') ? COL_WIDTHS.matchDone : 0) + // Match done for sections B and C
    (activeSection !== 'A' ? COL_WIDTHS.dayname : 0) + // Dayname for sections B, C, and D (not A)
    COL_WIDTHS.workouts + 
    (COL_WIDTHS.icoSport + COL_WIDTHS.distTime + COL_WIDTHS.mainWork) * 4 + // 4 sport sections (3 cols each)
    COL_WIDTHS.options;
  
   // Synchronize scrollbars and position + Fix workout details scroll
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const scrollbar = scrollbarRef.current;
    const tableWrapper = tableWrapperRef.current;
    
    if (!tableContainer || !scrollbar || !tableWrapper) return;
    
    const handleTableScroll = () => {
      if (scrollbar) {
        scrollbar.scrollLeft = tableContainer.scrollLeft;
      }
       
       // Counter-scroll the workout details containers
       const workoutContainers = document.querySelectorAll('.workout-details-wrapper');
       workoutContainers.forEach((container) => {
         (container as HTMLElement).style.transform = `translateX(${tableContainer.scrollLeft}px)`;
       });
    };
    
    const handleScrollbarScroll = () => {
      if (tableContainer) {
        tableContainer.scrollLeft = scrollbar.scrollLeft;
      }
    };
    
    tableContainer.addEventListener('scroll', handleTableScroll);
    scrollbar.addEventListener('scroll', handleScrollbarScroll);
    
    // Update scrollbar position and width to match table
    const updateScrollbarPosition = () => {
      const table = tableContainer.querySelector('table');
      const scrollbarContent = scrollbar.firstElementChild as HTMLElement;
      const rect = tableWrapper.getBoundingClientRect();
      
      if (table && scrollbarContent) {
        // Set scrollbar content width to match table width
        const tableWidth = table.scrollWidth;
        scrollbarContent.style.width = `${tableWidth}px`;
        
        // Position scrollbar to match table wrapper
        scrollbar.style.left = `${rect.left}px`;
        scrollbar.style.width = `${rect.width}px`;
        
        // Hide scrollbar when table is not in viewport (scrolled past to footer)
        const viewportHeight = window.innerHeight;
        const tableBottom = rect.bottom;
        const tableTop = rect.top;
        
        // Show scrollbar only when table is visible in viewport
        // Hide if table bottom is above viewport or table top is below viewport
        if (tableBottom < 0 || tableTop > viewportHeight) {
          scrollbar.style.display = 'none';
        } else {
          scrollbar.style.display = 'block';
        }
      }
    };
    
    // Initial update with a slight delay to ensure table is rendered
    setTimeout(updateScrollbarPosition, 100);
    
    // Update on window resize and scroll
    const handleUpdate = () => updateScrollbarPosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);
    
    // Update scrollbar position when table content changes
    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarPosition();
    });
    
    resizeObserver.observe(tableWrapper);
    
    return () => {
      tableContainer.removeEventListener('scroll', handleTableScroll);
      scrollbar.removeEventListener('scroll', handleScrollbarScroll);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
      resizeObserver.disconnect();
    };
  }, []); // Empty dependency array - only run once on mount

  if (!workoutPlan || !workoutPlan.weeks) {
    return (
      <div className="p-8 text-center text-gray-500">
        No workout plan available. Click "Create Plan" to start.
      </div>
    );
  }

  const sortedWeeks = [...workoutPlan.weeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
  const totalWeeks = sortedWeeks.length;
  
  // For Section B, show ALL weeks (already filtered by parent)
  // For Section A/C, use pagination (show one week at a time)
  const weeksToDisplay = activeSection === 'B' ? sortedWeeks : [sortedWeeks[currentWeekIndex]].filter(Boolean);
  
  // Legacy variables for backward compatibility
  const currentWeek = sortedWeeks[currentWeekIndex];
  const weekDays = currentWeek?.days || [];
  const sortedDays = [...weekDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Debug: Log current week data (disabled for performance)
  // console.log('🗓️ Current week data:', {
  //   currentWeekIndex,
  //   currentWeek: currentWeek?.id,
  //   weekNumber: currentWeek?.weekNumber
  // });

  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < totalWeeks - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  const toggleWeekWorkouts = () => {
    // For Section B, work with ALL displayed weeks; for other sections, work with current week only
    const weeksToToggle = activeSection === 'B' ? weeksToDisplay : [currentWeek].filter(Boolean);
    
    if (weeksToToggle.length === 0) return;
    
    const allDayIds: string[] = [];
    const allWorkoutIds: string[] = [];
    
    // Collect all day and workout IDs from ALL displayed weeks
    weeksToToggle.forEach((week: any) => {
      if (!week || !week.days) return;
      
      week.days.forEach((day: any) => {
        allDayIds.push(day.id);
        
      if (day.workouts && Array.isArray(day.workouts)) {
        day.workouts.forEach((workout: any) => {
          allWorkoutIds.push(workout.id);
        });
      }
      });
    });
    
    // Cycle through 3 states: 0 (Collapsed) -> 1 (Show workout headers only) -> 2 (Show moveframes) -> 0
    const nextState = (expandState + 1) % 3;
    
    if (nextState === 0) {
      // State 0: Collapse all - Close all workouts and days
      console.log('📕 State 0: Collapsing all days and workouts');
      
      // Close all workouts first (remove from expandedWorkouts to hide moveframes)
      allWorkoutIds.forEach(workoutId => {
        if (expandedWorkoutsSet.has(workoutId) && onToggleWorkout) {
          onToggleWorkout(workoutId);
        }
      });
      
      // Then close all days (hide workout headers)
      allDayIds.forEach((dayId: string) => {
        if (expandedDaysSet.has(dayId) && onToggleDay) {
          onToggleDay(dayId);
        }
      });
      
      setExpandState(0);
    } else if (nextState === 1) {
      // State 1: Show workout headers only (expand days, but NOT workouts)
      console.log('📖 State 1: Expanding days to show workout headers (no moveframes)');
      
      // First, ensure all workouts are CLOSED (so moveframes are hidden)
      allWorkoutIds.forEach(workoutId => {
        if (expandedWorkoutsSet.has(workoutId) && onToggleWorkout) {
          onToggleWorkout(workoutId);
        }
      });
      
      // Then open all days (this shows workout headers)
      allDayIds.forEach((dayId: string) => {
        if (!expandedDaysSet.has(dayId) && onToggleDay) {
          onToggleDay(dayId);
        }
      });
      
      setExpandState(1);
    } else if (nextState === 2) {
      // State 2: Show moveframes (days are already open, now expand workouts)
      console.log('📖📖 State 2: Expanding workouts to show moveframes (no movelaps)');
      
      // Days should already be open from state 1
      // Now open all workouts to show moveframes
      allWorkoutIds.forEach(workoutId => {
        if (!expandedWorkoutsSet.has(workoutId) && onToggleWorkout) {
          onToggleWorkout(workoutId);
        }
      });
      
      setExpandState(2);
    }
  };

  const handleSaveWeeklyNotes = async (data: { periodId: string; notes: string }) => {
    // Use the week that's being edited (currentWeekForModal) or fallback to currentWeek
    const weekToEdit = currentWeekForModal || currentWeek;
    const weekId = weekToEdit?.id;
    if (!weekId) {
      console.error('❌ No week ID available');
      return;
    }

    console.log('💾 Saving weekly notes:', { 
      weekId, 
      weekNumber: weekToEdit?.weekNumber,
      data 
    });

    // Save to local state FIRST
    setWeeklyNotes(prev => {
      const updated = {
        ...prev,
        [weekId]: data
      };
      console.log('📝 Updated weeklyNotes state:', updated);
      return updated;
    });

    // Save to backend API
    try {
      const token = localStorage.getItem('token');
      if (token && weekId) {
        // Save the weekly notes and period to the backend
        const response = await fetch(`/api/workouts/weeks/${weekId}/notes`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          console.log('✅ Weekly notes saved to backend successfully');
          
          // Reload workouts to ensure UI is in sync with backend
          if (reloadWorkouts) {
            await reloadWorkouts();
            console.log('🔄 Workouts reloaded after saving notes');
          }
        } else {
          console.warn('⚠️ Backend save failed, but local state is updated');
        }
      }
    } catch (error) {
      console.error('❌ Error saving weekly notes to backend:', error);
      // Local state is still saved, so this is just a warning
    }
  };

  const handleShowDayInfo = (day: any) => {
    setSelectedDayForInfo(day);
    setDayInfoModalOpen(true);
  };

  const handleCopyWeek = async (targetWeekId: string) => {
    const sourceWeekId = currentWeek?.id;
    if (!sourceWeekId) {
      console.error('❌ No source week ID available');
      return;
    }

    console.log('📋 Copying week:', { sourceWeekId, targetWeekId });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ Authentication required');
        return;
      }

      const response = await fetch('/api/workouts/weeks/copy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sourceWeekId,
          targetWeekId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy week');
      }

      console.log('✅ Week copied successfully');
      
      // Close the modal first
      setShowCopyWeekModal(false);
      setTargetWeeks([]);
      
      // Reload the workout plan
      if (reloadWorkouts) {
        await reloadWorkouts();
      }
    } catch (error) {
      console.error('❌ Error copying week:', error);
    }
  };

  const handleMoveWeek = async (targetWeekId: string) => {
    // Check if we're moving multiple weeks (from Section B group) or single week
    const weekData = currentWeekForModal;
    const isMultipleWeeks = weekData?.multipleWeeks && Array.isArray(weekData.multipleWeeks);
    const weeksToMove = isMultipleWeeks ? weekData.multipleWeeks : [currentWeek].filter(Boolean);
    
    if (weeksToMove.length === 0) {
      console.error('❌ No source week(s) available');
      return;
    }

    console.log(`🚚 Moving ${weeksToMove.length} week(s):`, weeksToMove.map((w: any) => `Week ${w.weekNumber} (${w.id})`).join(', '));
    console.log(`🎯 Initial target week ID: ${targetWeekId}`);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ Authentication required');
        return;
      }

      // Find the target week's weekNumber
      const targetWeekObj = targetWeeks.find((w: any) => w.id === targetWeekId);
      if (!targetWeekObj) {
        throw new Error('Target week not found');
      }
      
      const baseTargetWeekNumber = targetWeekObj.weekNumber;
      console.log(`🎯 Base target week number: ${baseTargetWeekNumber}`);

      // Sort source weeks by weekNumber to maintain order
      const sortedWeeksToMove = [...weeksToMove].sort((a, b) => a.weekNumber - b.weekNumber);

      // Move each week to consecutive target weeks
      for (let i = 0; i < sortedWeeksToMove.length; i++) {
        const sourceWeek = sortedWeeksToMove[i];
        // Calculate target week number: baseTargetWeekNumber + offset
        const targetWeekNumber = baseTargetWeekNumber + i;
        
        // Find the target week ID for this week number
        const currentTargetWeek = targetWeeks.find((w: any) => w.weekNumber === targetWeekNumber);
        
        if (!currentTargetWeek) {
          console.error(`❌ Target week ${targetWeekNumber} not found`);
          continue;
        }
        
        console.log(`🚚 Moving week ${sourceWeek.weekNumber} (${sourceWeek.id}) → week ${targetWeekNumber} (${currentTargetWeek.id})`);
        
        const response = await fetch('/api/workouts/weeks/move', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sourceWeekId: sourceWeek.id,
            targetWeekId: currentTargetWeek.id
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to move week ${sourceWeek.weekNumber}`);
        }

        console.log(`✅ Week ${sourceWeek.weekNumber} → Week ${targetWeekNumber} moved successfully`);
      }

      console.log(`✅ All ${weeksToMove.length} week(s) moved successfully`);
      
      // Reload the workout plan
      if (reloadWorkouts) {
        await reloadWorkouts();
      }
    } catch (error) {
      console.error('❌ Error moving week(s):', error);
      alert(`Error moving week(s): ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const currentWeekId: string = currentWeek?.id || '';
  const currentWeekData = weeklyNotes[currentWeekId] || { periodId: '', notes: '' };

  // Render the main content
  return (
    <div className="day-table-view-wrapper">
      {/* CSS for rich text preview and fixed workout details */}
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
        .rich-text-preview strike,
        .rich-text-preview s {
          text-decoration: line-through !important;
        }
        .rich-text-preview ul {
          list-style-type: disc;
          margin-left: 20px;
          padding-left: 0;
        }
        .rich-text-preview ol {
          list-style-type: decimal;
          margin-left: 20px;
          padding-left: 0;
        }
        .rich-text-preview li {
          display: list-item;
        }
        .rich-text-preview a {
          color: #2563eb;
          text-decoration: underline;
        }
        .rich-text-preview p {
          display: inline;
          margin: 0;
        }
        .rich-text-preview div {
          display: inline;
        }
        /* Support for font colors */
        .rich-text-preview *[style*="color"] {
          color: inherit;
        }
        .rich-text-preview *[style*="background"] {
          background: inherit;
        }
        
        /* Fixed workout details - don't scroll with day row */
        .workout-expanded-row > td {
          position: relative;
          padding: 0 !important;
          overflow: visible;
          height: 0;
        }
        
        .workout-details-wrapper {
          position: relative;
          left: 0;
          width: 100%;
          max-width: 100%;
          transform: translateX(0);
          transition: transform 0s;
          z-index: 25;
          margin-left: calc(-1 * var(--scroll-offset, 0px));
        }
        
        .workout-details-container {
          position: relative;
          width: 100%;
          background: #f9fafb;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          margin: 0;
          padding: 1rem;
        }
      `}</style>
      
      <div className="bg-gray-100 relative" style={{ minHeight: '100vh', paddingTop: '0' }}>
        {/* Week Navigation - Redesigned Sticky Header */}
        <div className="sticky top-0 z-50 bg-gradient-to-r from-gray-50 to-white shadow-xl border-b-2 border-gray-200">
          <div className="flex items-stretch">
            {/* Week buttons moved to WorkoutSectionHeader for Section A */}
            {activeSection === 'A' && (
              <div className="flex flex-col gap-2 px-4 py-3 bg-white border-r-2 border-gray-200">
                {/* Set Periods Button */}
                <button
                  onClick={() => {
                    // Initialize week range to all displayed weeks in Section A
                    const allWeekNumbers = sortedWeeks.map((w: any) => w.weekNumber);
                    const minWeek = Math.min(...allWeekNumbers);
                    const maxWeek = Math.max(...allWeekNumbers);
                    setWeekRangeStart(minWeek);
                    setWeekRangeEnd(maxWeek);
                    setSelectedPeriodForRange(null);
                    setShowPeriodSelector(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md"
                  title="Set periods for multiple weeks"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Set periods of more weeks
                </button>
            </div>
              )}

            {/* CENTER-LEFT: Period Badge for Section A/C - Removed */}
              
            {/* CENTER: Week Description Box (Simplified) - Only for Section A/C */}
            {activeSection !== 'B' && (
            <div className="flex-1 max-w-lg flex items-center gap-3 px-2 py-2 bg-white border-r-2 border-gray-200">
              {/* Week Title/Notes */}
              <div className="flex-1 min-w-0">
                {currentWeekData.notes ? (
                  <div 
                    className="rich-text-preview text-gray-900 font-semibold leading-tight text-lg cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                    dangerouslySetInnerHTML={{ __html: currentWeekData.notes }}
                    onClick={() => {
                      setSelectedWeekNotes(currentWeekData.notes);
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
                ) : (
                  <span className="text-gray-400 italic text-base">Click Edit to add description...</span>
                )}
              </div>
            </div>
            )}

            {/* RIGHT: Action Buttons and Navigation */}
            <div className="flex items-center justify-end gap-4 px-4 py-3 bg-white flex-1">
              {/* Edit Button */}
              {activeSection !== 'B' && (
                <button
                  onClick={() => setIsWeeklyInfoModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  style={{ 
                    backgroundColor: colors.buttonEdit,
                    color: colors.buttonEditText
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonEditHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonEdit}
                  title="Edit Weekly Information"
                >
                  <FileText size={16} />
                  Edit
                </button>
              )}
              
              {/* Copy Week Button - Only show in Section A (3 Weeks Plan) */}
              {activeSection === 'A' && (
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    console.error('❌ Please log in first');
                    return;
                  }
                  
                  try {
                    // Always fetch from Yearly Plan (Section B)
                      const targetPlanType = 'YEARLY_PLAN';
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  style={{ 
                    backgroundColor: colors.buttonAdd,
                    color: colors.buttonAddText
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonAddHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonAdd}
                  title="Copy this week to Yearly Plan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy
              </button>
              )}
              
              {/* Overview Button - For Section A/C */}
              {activeSection !== 'B' && (
              <button
                onClick={() => {
                    console.log('📊 Overview button clicked for Section', activeSection);
                    console.log('   - sortedWeeks:', sortedWeeks?.length || 0, 'weeks');
                    console.log('   - currentWeek:', currentWeek?.weekNumber);
                  setAutoPrintWeek(false);
                    setShowAllWeeksInModal(false);
                  setShowWeekTotalsModal(true);
                }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg"
                  title="View week overview"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Overview
              </button>
              )}
              
              {/* Save in Favourites Button - Only for Section A/C */}
              {activeSection !== 'B' && (
              <button
                onClick={async () => {
                  console.log('⭐ Save in Favourites button clicked');
                  console.log('📅 Current week:', currentWeek);
                  
                  if (!currentWeek || !currentWeek.id) {
                    alert('No week selected');
                    return;
                  }
                  
                  try {
                    const token = localStorage.getItem('token');
                    const weekNumber = currentWeek.weekNumber || 1;
                    const weekName = `Week ${weekNumber}`;
                    
                    const response = await fetch('/api/workouts/weeks/favorites', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        weekId: currentWeek.id,
                        name: weekName,
                        description: `Saved from ${new Date().toLocaleDateString()}`
                      })
                    });
                    
                    if (response.ok) {
                      alert(`"${weekName}" saved to favorites!`);
                    } else {
                      const error = await response.json();
                      alert(error.error || 'Failed to save to favorites');
                    }
                  } catch (error) {
                    console.error('Error saving week to favorites:', error);
                    alert('Error saving week to favorites');
                  }
                }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all shadow-md hover:shadow-lg"
                title="Save this week in favourites"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Save in Favourites
              </button>
              )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 pt-0">
           {/* Action Bar - Only for Section B (Yearly Plan) */}
           {activeSection === 'B' && (
             <div className="bg-gray-100 py-3 flex items-center justify-between gap-3 border-b border-gray-300 shadow-md">
               {/* Left side - Set periods for Section B */}
               <div className="flex items-center gap-3">
          <button
            onClick={() => {
                     // Initialize week range to all displayed weeks
                     const allWeekNumbers = sortedWeeks.map((w: any) => w.weekNumber);
                     const minWeek = Math.min(...allWeekNumbers);
                     const maxWeek = Math.max(...allWeekNumbers);
                     setWeekRangeStart(minWeek);
                     setWeekRangeEnd(maxWeek);
                     setSelectedPeriodForRange(null);
                     setShowPeriodSelector(true);
                   }}
                   className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-md bg-gray-700 text-white hover:bg-gray-800"
                   title="Set periods for multiple weeks in yearly plan"
                 >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                   <span className="font-bold text-sm">
                     Set periods of more weeks
                   </span>
                 </button>
               </div>
              
               {/* Right side - Action Buttons for Section B */}
               <div className="flex items-center gap-3">
                {/* Expand/Collapse All Button */}
                <button
                  onClick={toggleWeekWorkouts}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md"
                  title={expandState === 0 ? "Show workout headers" : expandState === 1 ? "Show moveframes" : "Collapse all weeks"}
                >
                  {expandState === 0 ? 'Expand all the Weeks displayed' : expandState === 1 ? 'Expand all (with moveframes)' : 'Collapse all the weeks displayed'}
                </button>

                 {/* Overview of the weeks displayed Button */}
                 <button
                   onClick={() => {
                     console.log('📊 Overview of the weeks displayed clicked');
                     console.log('📊 Total weeks in sortedWeeks:', sortedWeeks.length);
                     console.log('📊 Week numbers:', sortedWeeks.map((w: any) => w.weekNumber));
                     setAutoPrintWeek(false);
                     setShowAllWeeksInModal(true);
                     setCurrentWeekForModal(null);
                     setShowWeekTotalsModal(true);
                   }}
                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
                   title="View overview of all displayed weeks in yearly plan"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                   Overview of the weeks displayed
                 </button>

                 {/* Print Button */}
                 <button
                   onClick={() => {
                     console.log('ðŸ–¨ï¸ Print current view clicked');
                     console.log('ðŸ–¨ï¸ Total weeks in sortedWeeks:', sortedWeeks.length);
                     setAutoPrintWeek(true);
                     setShowAllWeeksInModal(true);
                     setCurrentWeekForModal(null);
                     setShowWeekTotalsModal(true);
                   }}
                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md"
                   title="Print current view"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                   Print
                 </button>
                 
                 {/* Move Button */}
                 <button
                   onClick={() => alert('Move functionality coming soon')}
                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-md"
                   title="Move selected items"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
                   Move
                 </button>
        </div>
             </div>
           )}

      {/* Days Table - Section B: Multiple Week Headers */}
      {activeSection === 'B' ? (
        <>
          {/* Options for Selected Days - Section B */}
          <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-gray-50 border border-gray-300 rounded shadow-md">
            <label className="text-sm font-semibold text-gray-700">Options of the selected days</label>
            <select 
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                console.log('Selected action:', e.target.value);
              }}
            >
              <option value="">Select action...</option>
              <option value="copy">Copy</option>
              <option value="move">Move</option>
              <option value="delete">Delete</option>
              <option value="save-favorite">Save in favourites</option>
            </select>
            <button
              className="px-4 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={selectedDays.size === 0 || !selectedAction}
              onClick={() => {
                if (selectedDays.size === 0) {
                  alert('Please select at least one day by checking the checkbox.');
                  return;
                }
                if (!selectedAction) {
                  alert('Please select an action from the dropdown.');
                  return;
                }
                const dayCount = selectedDays.size;
                const selectedDayIds = Array.from(selectedDays);
                switch (selectedAction) {
                  case 'copy':
                    if (confirm(`Copy ${dayCount} selected day(s)?`)) {
                      console.log('Copy days:', selectedDayIds);
                      alert(`Copying ${dayCount} day(s)... (Not yet implemented)`);
                    }
                    break;
                  case 'move':
                    if (confirm(`Move ${dayCount} selected day(s)?`)) {
                      console.log('Move days:', selectedDayIds);
                      alert(`Moving ${dayCount} day(s)... (Not yet implemented)`);
                    }
                    break;
                  case 'delete':
                    if (confirm(`Delete ${dayCount} selected day(s)?`)) {
                      console.log('Delete days:', selectedDayIds);
                      alert(`Deleting ${dayCount} day(s)... (Not yet implemented)`);
                    }
                    break;
                  case 'save-favorite':
                    if (confirm(`Save ${dayCount} selected day(s) in favourites?`)) {
                      console.log('Save to favourites:', selectedDayIds);
                      alert(`Saving ${dayCount} day(s) to favourites... (Not yet implemented)`);
                    }
                    break;
                }
              }}
            >
              Execute
            </button>
            <span className="text-sm text-gray-500">
              {selectedDays.size} day{selectedDays.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Show all weeks */}
          {console.log('🔍 [DEBUG] weeksToDisplay count:', weeksToDisplay.length)}
          {weeksToDisplay.length === 0 && (
            <div className="text-center py-8 text-red-600 font-bold">
              ⚠️ No weeks to display! weeksToDisplay is empty.
            </div>
          )}
          {weeksToDisplay.map((week, weekIdx) => {
            const weekDays = week?.days || [];
            const sortedWeekDays = [...weekDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            console.log(`🔍 [DEBUG] Week ${weekIdx + 1}:`, {
              weekId: week.id,
              weekNumber: week.weekNumber,
              daysCount: weekDays.length,
              sortedDaysCount: sortedWeekDays.length
            });
            
            return (
              <div key={week.id} className="mb-6">
                {/* Week Header Bar */}
                <div 
                  className="rounded-t-lg px-4 py-3 flex items-center justify-between border-b-2 border-gray-300"
                  style={{ 
                    backgroundColor: week.period?.color || '#f3f4f6',
                    color: getContrastTextColor(week.period?.color || '#f3f4f6')
                  }}
                >
                  {/* Left: Period Badge and Description */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Period Badge */}
                    <button
                      onClick={() => {
                        setCurrentWeekForModal(week);
                        const weekNum = week.weekNumber || 1;
                        setWeekRangeStart(weekNum);
                        setWeekRangeEnd(weekNum);
                        setSelectedPeriodForRange(null);
                        setShowPeriodSelector(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 shadow border-2 bg-white/90"
                      style={{
                        borderColor: week.period?.color || '#d1d5db'
                      }}
                      title="Set period for this week"
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: week.period?.color || '#3b82f6' }}
                      />
                      <span className="font-semibold text-base">
                        {week.period?.name || 'Set Period'}
                      </span>
                    </button>
                    
                    {/* Week Description */}
                    <div className="flex-1 max-w-xl">
                      {weeklyNotes[week.id]?.notes ? (
                        <div 
                          className="text-sm font-medium cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          dangerouslySetInnerHTML={{ __html: weeklyNotes[week.id].notes }}
                          onClick={() => {
                            setSelectedWeekNotes(weeklyNotes[week.id].notes);
                            setShowWeekNotesModal(true);
                          }}
                          title="Click to view full notes"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        />
                      ) : (
                        <span className="text-sm italic opacity-70">Click Edit to add description...</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2">
                    
                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setCurrentWeekForModal(week);
                        setIsWeeklyInfoModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md"
                    >
                      <FileText size={14} />
                      Edit
                    </button>
                    
                    {/* Expand All Workouts Button - expands all workouts/moveframes */}
                    <button
                      onClick={toggleWeekWorkouts}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md"
                      title={expandState === 0 ? "Show workout headers" : expandState === 1 ? "Show moveframes" : "Collapse all"}
                    >
                      <span>{expandState === 0 ? 'Expand All' : expandState === 1 ? 'Expand (+ moveframes)' : 'Collapse All'}</span>
                    </button>
                    
                    {/* Overview Button - Single week only */}
                    <button
                      onClick={() => {
                        setCurrentWeekForModal(week);
                        setAutoPrintWeek(false);
                        setShowAllWeeksInModal(false);
                        setShowWeekTotalsModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Overview
                    </button>
                    
                    {/* Copy Button */}
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          console.error('❌ Please log in first');
                          return;
                        }
                        
                        try {
                          // Fetch all weeks from Yearly Plan
                          const targetPlanType = 'YEARLY_PLAN';
                          console.log('📥 Fetching target weeks for Copy');
                          
                          const response = await fetch(`/api/workouts/plan?type=${targetPlanType}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            console.log('✅ Loaded target plan with', data.plan?.weeks?.length || 0, 'weeks');
                            setTargetWeeks(data.plan?.weeks || []);
                            setCurrentWeekForModal(week);
                            setShowCopyWeekModal(true);
                          } else {
                            console.error('❌ Failed to load target weeks');
                          }
                        } catch (error) {
                          console.error('Error loading target weeks:', error);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                    
                    {/* Move Button */}
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          console.error('❌ Please log in first');
                          return;
                        }
                        
                        try {
                          // Fetch all weeks from Yearly Plan for Move operation
                          const targetPlanType = 'YEARLY_PLAN';
                          console.log('📥 Fetching target weeks for Move');
                          
                          const response = await fetch(`/api/workouts/plan?type=${targetPlanType}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            console.log('✅ Loaded target plan with', data.plan?.weeks?.length || 0, 'weeks');
                            setTargetWeeks(data.plan?.weeks || []);
                            setCurrentWeekForModal(week);
                            setShowMoveWeekModal(true);
                          } else {
                            console.error('❌ Failed to load target weeks');
                          }
                        } catch (error) {
                          console.error('Error loading target weeks:', error);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Move
                    </button>
                    
                    {/* Save in Favourites Button - Single week only */}
                    <button
                      onClick={async () => {
                        if (!week || !week.id) {
                          alert('No week selected');
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
                            alert(`"${weekName}" saved to favorites!`);
                          } else {
                            const error = await response.json();
                            alert(error.error || 'Failed to save to favorites');
                          }
                        } catch (error) {
                          console.error('Error saving week to favorites:', error);
                          alert('Error saving week to favorites');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Save
                    </button>
                    
                    {/* Print Button - Single week only */}
                    <button
                      onClick={() => {
                        setCurrentWeekForModal(week);
                        setAutoPrintWeek(true);
                        setShowAllWeeksInModal(false);
                        setShowWeekTotalsModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                  </div>
                </div>
                
                {/* Week Table - Always show in Section B */}
                <div ref={weekIdx === 0 ? tableWrapperRef : null} className="bg-white rounded-b-lg shadow-md relative">
                  <div className="relative">
                    <div 
                      ref={weekIdx === 0 ? tableContainerRef : null}
                      className="overflow-x-auto overflow-y-visible table-scrollbar" 
                    >
                        <table className="text-sm" style={{ tableLayout: 'fixed', minWidth: `${TABLE_MIN_WIDTH}px`, width: '100%' }}>
                        <thead className="sticky-table-header">
                          <tr style={{ backgroundColor: colors.weekHeader, color: colors.weekHeaderText }}>
                            <th className="border border-gray-400 px-1 py-2 text-xs font-bold sticky-header-1" style={{ width: COL_WIDTHS.noWorkouts, minWidth: COL_WIDTHS.noWorkouts, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                              Check
                            </th>
                          <th className="border border-gray-400 px-1 py-2 text-xs font-bold sticky-header-2" style={{ width: COL_WIDTHS.colorCycle, minWidth: COL_WIDTHS.colorCycle, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                            
                          </th>
                          <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-3" style={{ width: COL_WIDTHS.nameCycle, minWidth: COL_WIDTHS.nameCycle, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                            Period
                          </th>
                          <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-4" style={{ width: COL_WIDTHS.weekNumber, minWidth: COL_WIDTHS.weekNumber, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                            Week
                          </th>
                          <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-5" style={{ width: COL_WIDTHS.dayNumber, minWidth: COL_WIDTHS.dayNumber, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                            Day
                          </th>
                          {/* Dayname column - Always shown in Section B */}
                          <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-6" style={{ width: COL_WIDTHS.dayname, minWidth: COL_WIDTHS.dayname, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                            Dayname & Date
                          </th>
                          {/* Match done column - Always shown in Section B */}
                          <th 
                            className="border border-gray-400 px-1 py-2 text-xs font-bold sticky-header-7"
                            style={{ 
                              width: COL_WIDTHS.matchDone, 
                              minWidth: COL_WIDTHS.matchDone,
                              backgroundColor: colors.weekHeader,
                              color: colors.weekHeaderText
                            }} 
                            rowSpan={2}
                          >
                              Match<br/>done
                          </th>
                          <th 
                            className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-8"
                            style={{ width: COL_WIDTHS.workouts, minWidth: COL_WIDTHS.workouts, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} 
                            rowSpan={2}
                          >
                            Workouts
                          </th>
                          
                          {/* S1 - Blue */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-blue-300 text-black" colSpan={3}>
                            Sport 1
                          </th>
                          
                          {/* S2 - Green */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-green-300 text-black" colSpan={3}>
                            Sport 2
                          </th>
                          
                          {/* S3 - Orange */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-orange-300 text-black" colSpan={3}>
                            Sport 3
                          </th>
                          
                          {/* S4 - Pink */}
                          <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-pink-300 text-black" colSpan={3}>
                            Sport 4
                          </th>
                          
                          <th 
                            className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-options-header" 
                            style={{ 
                              width: COL_WIDTHS.options, 
                              minWidth: COL_WIDTHS.options,
                              backgroundColor: colors.weekHeader,
                              color: colors.weekHeaderText
                            }}
                            rowSpan={2}
                          >
                            Options
                          </th>
                        </tr>
                        <tr style={{ backgroundColor: colors.weekHeader, color: colors.weekHeaderText }}>
                          {/* S1 sub-headers - Blue */}
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-blue-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-blue-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-blue-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
                          
                          {/* S2 sub-headers - Green */}
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-green-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-green-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-green-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
                          
                          {/* S3 sub-headers - Orange */}
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-orange-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-orange-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-orange-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
                          
                          {/* S4 sub-headers - Pink */}
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-pink-200 text-black" style={{ width: '107px', minWidth: '107px' }}>Sport</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-pink-200 text-black" style={{ width: '80px', minWidth: '80px' }}>Duration & Time</th>
                          <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-pink-200 text-black text-left" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedWeekDays.length === 0 && (
                            <tr>
                              <td colSpan={15} className="text-center py-8 text-red-600 font-bold">
                                ⚠️ No days in this week! sortedWeekDays is empty for week {week.weekNumber}
                              </td>
                            </tr>
                          )}
                          {sortedWeekDays.map((day, dayIdx) => {
                            const isLastDayOfWeek = dayIdx === sortedWeekDays.length - 1;
                            
                            return (
                              <React.Fragment key={day.id}>
                                <DayRowTable
                                  day={day}
                                  currentWeek={week}
                                  isExpanded={expandedDaysSet.has(day.id)}
                                  isLastDayOfWeek={false}
                                  isSelected={selectedDays.has(day.id)}
                                  activeSection={activeSection}
                                  iconType={iconType}
                                  onToggleDay={onToggleDay!}
                                  onToggleDaySelection={(dayId) => {
                                    setSelectedDays(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(dayId)) {
                                        newSet.delete(dayId);
                                      } else {
                                        newSet.add(dayId);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  onToggleWorkout={onToggleWorkout}
                                  onExpandOnlyThisWorkout={onExpandOnlyThisWorkout}
                                  onExpandDayWithAllWorkouts={onExpandDayWithAllWorkouts}
                                  onCycleWorkoutExpansion={onCycleWorkoutExpansion}
                                  onEditDay={onEditDay}
                                  onAddWorkout={onAddWorkout}
                                  onShowDayInfo={handleShowDayInfo}
                                  onShowDayOverview={onShowDayOverview}
                                  onCopyDay={onCopyDay}
                                  onMoveDay={onMoveDay}
                                  onPasteDay={onPasteDay}
                                  onShareDay={onShareDay}
                                  onExportPdfDay={onExportPdfDay}
                                  onPrintDay={onPrintDay}
                                  onDeleteDay={onDeleteDay}
                                />
                                {expandedDaysSet.has(day.id) && (
                                  <tr className="workout-expanded-row">
                                    <td colSpan={20} className="p-0 bg-transparent">
                                      <div className="workout-details-wrapper">
                                        <div className="workout-details-container">
                                          <div className="mb-2 text-sm font-semibold text-gray-700">
                                            Workouts for {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                          </div>
                                          <WorkoutHierarchyView
                                        day={{ ...day, weekNumber: week?.weekNumber }}
                                        activeSection={activeSection}
                                        iconType={iconType}
                                        expandedWorkouts={expandedWorkoutsSet}
                                        fullyExpandedWorkouts={fullyExpandedWorkouts}
                                        workoutsWithExpandedMovelaps={workoutsWithExpandedMovelaps}
                                        expandedMoveframeId={expandedMoveframeId}
                                        expandState={expandState}
                                        onToggleWorkout={onToggleWorkout!}
                                        onExpandOnlyThisWorkout={onExpandOnlyThisWorkout}
                                        onAddWorkout={onAddWorkout}
                                        onEditWorkout={onEditWorkout}
                                        onEditMoveframe={onEditMoveframe}
                                        onEditMovelap={onEditMovelap}
                                        onAddMoveframe={onAddMoveframe}
                                        onAddMoveframeAfter={onAddMoveframeAfter}
                                        onAddMovelap={onAddMovelap}
                                        onAddMovelapAfter={onAddMovelapAfter}
                                        onDeleteWorkout={onDeleteWorkout}
                                        onSaveFavoriteWorkout={onSaveFavoriteWorkout}
                                        onShareWorkout={onShareWorkout}
                                        onExportPdfWorkout={onExportPdfWorkout}
                                        onPrintWorkout={onPrintWorkout}
                                        onShowWorkoutOverview={onShowWorkoutOverview}
                                        onDeleteMoveframe={onDeleteMoveframe}
                                        onDeleteMovelap={onDeleteMovelap}
                                        onCopyWorkout={onCopyWorkout}
                                        onPasteWorkout={onPasteWorkout}
                                        onMoveWorkout={onMoveWorkout}
                                        onCopyMoveframe={onCopyMoveframe}
                                        onMoveMoveframe={onMoveMoveframe}
                                        onOpenColumnSettings={onOpenColumnSettings}
                                        reloadWorkouts={reloadWorkouts}
                                        columnSettings={columnSettings}
                                      />
                                      
                                      {/* Add Workout Button - Only show if less than 3 workouts */}
                                      {(!day.workouts || day.workouts.length < 3) && (
                                        <div className="mt-4 py-4" style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', paddingLeft: '60px' }}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onAddWorkout?.(day);
                                            }}
                                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition-all duration-150"
                                          >
                                            Add a workout
                                          </button>
                                        </div>
                                      )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
        })}
        </>
      ) : (
        <>
          {/* Section A/C: Original single table layout */}
          
          {/* Options for Selected Days + Grid Settings - Above Table */}
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-white border-2 border-gray-400 rounded shadow-lg" style={{ minHeight: '60px' }}>
            {/* Left side: Options of the selected days */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Options of the selected days</label>
                  <select 
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                    value={selectedAction}
                    onChange={(e) => {
                      setSelectedAction(e.target.value);
                      console.log('Selected action:', e.target.value);
                    }}
                  >
                    <option value="">Select action...</option>
                    <option value="copy">Copy</option>
                    <option value="move">Move</option>
                    <option value="delete">Delete</option>
                    <option value="save-favorite">Save in favourites</option>
                  </select>
                  <button
                    className="px-4 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={selectedDays.size === 0 || !selectedAction}
                    onClick={() => {
                      if (selectedDays.size === 0) {
                        alert('Please select at least one day by checking the checkbox.');
                        return;
                      }
                      if (!selectedAction) {
                        alert('Please select an action from the dropdown.');
                        return;
                      }

                      const dayCount = selectedDays.size;
                      const selectedDayIds = Array.from(selectedDays);

                      switch (selectedAction) {
                        case 'copy':
                          if (confirm(`Copy ${dayCount} selected day(s)?`)) {
                            console.log('Copy days:', selectedDayIds);
                            alert(`Copying ${dayCount} day(s)... (Not yet implemented)`);
                          }
                          break;
                        case 'move':
                          if (confirm(`Move ${dayCount} selected day(s)?`)) {
                            console.log('Move days:', selectedDayIds);
                            alert(`Moving ${dayCount} day(s)... (Not yet implemented)`);
                          }
                          break;
                        case 'delete':
                          if (confirm(`Are you sure you want to delete ${dayCount} selected day(s)? This action cannot be undone.`)) {
                            console.log('Delete days:', selectedDayIds);
                            alert(`Deleting ${dayCount} day(s)... (Not yet implemented)`);
                            setSelectedDays(new Set());
                          }
                          break;
                        case 'save-favorite':
                          if (confirm(`Save ${dayCount} selected day(s) to favourites?`)) {
                            console.log('Save to favourites:', selectedDayIds);
                            alert(`Saving ${dayCount} day(s) to favourites... (Not yet implemented)`);
                          }
                          break;
                        default:
                          alert('Please select a valid action.');
                      }
                    }}
                  >
                    Proceed
                  </button>
                  {selectedDays.size > 0 && (
                    <span className="text-sm text-gray-600">
                      ({selectedDays.size} day{selectedDays.size > 1 ? 's' : ''} selected)
                    </span>
                  )}
                </div>
                
                {/* Right side: Action buttons */}
                <div className="flex items-center gap-2">
                  {/* Expand All Button */}
                  <button
                    onClick={toggleWeekWorkouts}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md"
                    title={expandState === 0 ? "Show workout headers" : expandState === 1 ? "Show moveframes" : "Collapse all"}
                  >
                    {expandState === 0 ? 'Expand All' : expandState === 1 ? 'Expand (with moveframes)' : 'Collapse All'}
                  </button>
                  
                  {/* Save Grid Settings Button */}
                  <button
                    onClick={async () => {
                      try {
                        const gridSettings = {
                          savedAt: new Date().toISOString(),
                          message: 'Grid settings saved successfully!'
                        };
                        localStorage.setItem('workoutGridSettings', JSON.stringify(gridSettings));
                        alert('✅ Grid settings saved successfully!');
                      } catch (error) {
                        console.error('Error saving grid settings:', error);
                        alert('❌ Failed to save grid settings');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
                    title="Save current grid settings"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Save Grid Settings
                  </button>
                  
                  {/* Reset to Default Button */}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to reset grid settings to default?')) {
                        try {
                          localStorage.removeItem('workoutGridSettings');
                          alert('✅ Grid settings reset to default!');
                          window.location.reload();
                        } catch (error) {
                          console.error('Error resetting grid settings:', error);
                          alert('❌ Failed to reset grid settings');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md"
                    title="Reset grid settings to default"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Reset to Default
                  </button>
                </div>

          </div>

          {/* Table Wrapper */}
      <div ref={tableWrapperRef} className="bg-white rounded-lg shadow-md relative mb-6">
        <div className="relative">
          <div 
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-visible table-scrollbar" 
          >
            <table className="text-sm" style={{ tableLayout: 'fixed', minWidth: `${TABLE_MIN_WIDTH}px`, width: '100%' }}>
                  <thead className="sticky-table-header">
                    <tr style={{ backgroundColor: colors.weekHeader, color: colors.weekHeaderText }}>
                      <th className="border border-gray-400 px-1 py-2 text-xs font-bold sticky-header-1" style={{ width: COL_WIDTHS.noWorkouts, minWidth: COL_WIDTHS.noWorkouts, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                 Check
               </th>
                      <th className="border border-gray-400 px-1 py-2 text-xs font-bold sticky-header-2" style={{ width: COL_WIDTHS.colorCycle, minWidth: COL_WIDTHS.colorCycle, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                        
                      </th>
                      <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-3" style={{ width: COL_WIDTHS.nameCycle, minWidth: COL_WIDTHS.nameCycle, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                        Period
                      </th>
                      <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-4" style={{ width: COL_WIDTHS.weekNumber, minWidth: COL_WIDTHS.weekNumber, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                        Week
               </th>
                      <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-5" style={{ width: COL_WIDTHS.dayNumber, minWidth: COL_WIDTHS.dayNumber, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                        Day
               </th>
              {/* Dayname column - For Sections C and D (not A which is template mode, B has its own table) */}
              {activeSection !== 'A' && (
                <th className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-header-6" style={{ width: COL_WIDTHS.dayname, minWidth: COL_WIDTHS.dayname, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} rowSpan={2}>
                 Dayname & Date
              </th>
              )}
              {/* Match done column - For Section C only (B has its own table) */}
              {activeSection === 'C' && (
                <th 
                  className="border border-gray-400 px-1 py-2 text-xs font-bold sticky-header-7"
                  style={{ 
                    width: COL_WIDTHS.matchDone, 
                    minWidth: COL_WIDTHS.matchDone,
                    backgroundColor: colors.weekHeader,
                    color: colors.weekHeaderText
                  }} 
                  rowSpan={2}
                >
                  Match<br/>done
                </th>
              )}
              <th 
                className={`border border-gray-400 px-2 py-2 text-xs font-bold ${activeSection === 'C' ? 'sticky-header-8' : activeSection === 'D' ? 'sticky-header-7' : 'sticky-header-6'}`}
                 style={{ width: COL_WIDTHS.workouts, minWidth: COL_WIDTHS.workouts, backgroundColor: colors.weekHeader, color: colors.weekHeaderText }} 
                 rowSpan={2}
               >
                 Workouts
               </th>
              
              {/* S1 - Blue */}
              <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-blue-300 text-black" colSpan={3}>
                Sport 1
              </th>
              
              {/* S2 - Green */}
              <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-green-300 text-black" colSpan={3}>
                Sport 2
              </th>
              
              {/* S3 - Orange */}
              <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-orange-300 text-black" colSpan={3}>
                Sport 3
              </th>
              
              {/* S4 - Pink */}
              <th className="border border-gray-400 px-2 py-1 text-xs font-bold bg-pink-300 text-black" colSpan={3}>
                Sport 4
              </th>
              
              <th 
                className="border border-gray-400 px-2 py-2 text-xs font-bold sticky-options-header" 
                style={{ 
                  width: COL_WIDTHS.options, 
                  minWidth: COL_WIDTHS.options,
                  backgroundColor: colors.weekHeader,
                  color: colors.weekHeaderText
                }}
                rowSpan={2}
              >
                Options
              </th>
            </tr>
            <tr style={{ backgroundColor: colors.weekHeader, color: colors.weekHeaderText }}>
              {/* S1 sub-headers - Blue */}
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-blue-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-blue-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-blue-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
              
              {/* S2 sub-headers - Green */}
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-green-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-green-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-green-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
              
              {/* S3 sub-headers - Orange */}
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-orange-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-orange-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-orange-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
              
              {/* S4 sub-headers - Pink */}
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-pink-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Sport</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-pink-200 text-black" style={{ width: '100px', minWidth: '100px' }}>Duration & Time</th>
              <th className="border border-gray-400 px-1 py-1 text-xs font-bold bg-pink-200 text-black" style={{ width: '200px', minWidth: '200px' }}>Main work</th>
            </tr>
          </thead>
          <tbody>
            {weeksToDisplay.flatMap((week, weekIdx) => {
              const weekDays = week?.days || [];
              const sortedWeekDays = [...weekDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              
              const weekRows = sortedWeekDays.map((day, dayIdx) => {
                const isLastDayOfWeek = dayIdx === sortedWeekDays.length - 1;
                const isNotLastWeek = weekIdx < weeksToDisplay.length - 1;
                const isMultiWeekView = weeksToDisplay.length > 1;
                const shouldShowWeekSeparator = isLastDayOfWeek && isNotLastWeek && isMultiWeekView;
                
                return (
                  <React.Fragment key={day.id}>
                    {/* Day Row */}
                    <DayRowTable
                      day={day}
                      currentWeek={week}
                      isExpanded={expandedDaysSet.has(day.id)}
                      isLastDayOfWeek={shouldShowWeekSeparator}
                        isSelected={selectedDays.has(day.id)}
                        activeSection={activeSection}
                        iconType={iconType}
                      onToggleDay={onToggleDay!}
                        onToggleDaySelection={(dayId) => {
                          setSelectedDays(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(dayId)) {
                              newSet.delete(dayId);
                            } else {
                              newSet.add(dayId);
                            }
                            return newSet;
                          });
                        }}
                      onToggleWorkout={onToggleWorkout}
                      onExpandOnlyThisWorkout={onExpandOnlyThisWorkout}
                      onExpandDayWithAllWorkouts={onExpandDayWithAllWorkouts}
                      onCycleWorkoutExpansion={onCycleWorkoutExpansion}
                      onEditDay={onEditDay}
                      onAddWorkout={onAddWorkout}
                      onShowDayInfo={handleShowDayInfo}
                      onShowDayOverview={onShowDayOverview}
                      onCopyDay={onCopyDay}
                      onMoveDay={onMoveDay}
                      onPasteDay={onPasteDay}
                      onShareDay={onShareDay}
                      onExportPdfDay={onExportPdfDay}
                      onPrintDay={onPrintDay}
                      onDeleteDay={onDeleteDay}
                    />
                  {/* Expanded Workouts Section */}
                    {expandedDaysSet.has(day.id) && (
                      <tr className="workout-expanded-row">
                       <td colSpan={activeSection === 'D' ? 21 : 20} className="p-0 bg-transparent">
                        <div className="workout-details-wrapper">
                         <div className="workout-details-container">
                          <div className="mb-2 flex items-center gap-3">
                            <div className="text-sm font-semibold text-gray-700">
                              Workouts for {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </div>
                            {day.notes && day.notes.trim().length > 0 && (
                              <div className="text-xs text-gray-600 italic">
                                {day.notes.substring(0, 60)}{day.notes.length > 60 ? '...' : ''}
                                   </div>
                            )}
                                   </div>
                          
                          {day.workouts && day.workouts.length > 0 ? (
                            <WorkoutHierarchyView
                              day={{ ...day, weekNumber: week?.weekNumber }}
                              activeSection={activeSection}
                              iconType={iconType}
                              expandedWorkouts={expandedWorkoutsSet}
                              fullyExpandedWorkouts={fullyExpandedWorkouts}
                              workoutsWithExpandedMovelaps={workoutsWithExpandedMovelaps}
                              expandedMoveframeId={expandedMoveframeId}
                              expandState={expandState}
                              onToggleWorkout={onToggleWorkout!}
                              onExpandOnlyThisWorkout={onExpandOnlyThisWorkout}
                              onAddWorkout={onAddWorkout}
                              onEditWorkout={onEditWorkout}
                              onEditMoveframe={onEditMoveframe}
                              onEditMovelap={onEditMovelap}
                              onAddMoveframe={onAddMoveframe}
                              onAddMoveframeAfter={onAddMoveframeAfter}
                              onAddMovelap={onAddMovelap}
                              onAddMovelapAfter={onAddMovelapAfter}
                              onDeleteWorkout={onDeleteWorkout}
                              onSaveFavoriteWorkout={onSaveFavoriteWorkout}
                              onShareWorkout={onShareWorkout}
                              onExportPdfWorkout={onExportPdfWorkout}
                              onPrintWorkout={onPrintWorkout}
                              onShowWorkoutOverview={onShowWorkoutOverview}
                              onDeleteMoveframe={onDeleteMoveframe}
                              onDeleteMovelap={onDeleteMovelap}
                              onCopyWorkout={onCopyWorkout}
                              onPasteWorkout={onPasteWorkout}
                              onMoveWorkout={onMoveWorkout}
                              onCopyMoveframe={onCopyMoveframe}
                              onMoveMoveframe={onMoveMoveframe}
                              onOpenColumnSettings={onOpenColumnSettings}
                              reloadWorkouts={reloadWorkouts}
                              columnSettings={columnSettings}
                            />
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-xs">
                              No workouts scheduled for this day
                            </div>
                          )}
                          
                           {/* Add Workout Button - Only show if less than 3 workouts */}
                           {(!day.workouts || day.workouts.length < 3) && (
                             <div className="mt-4 py-4" style={{ backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', paddingLeft: '60px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddWorkout?.(day);
                              }}
                              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md shadow-md hover:shadow-lg transition-all duration-150"
                            >
                              Add a workout
                            </button>
                           </div>
                           )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            });
            
            return weekRows;
          })}
          </tbody>
        </table>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Horizontal Scrollbar - Fixed at bottom of viewport, below footer */}
      <div 
        ref={scrollbarRef}
        className="overflow-x-auto custom-scrollbar bg-gradient-to-b from-gray-300 to-gray-200 border-t-2 border-blue-400 shadow-lg"
        style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${SCROLLBAR_HEIGHT}px`,
          zIndex: 10, // Lower z-index so footer appears above it
        }}
        title="Horizontal scroll - Drag to navigate table"
      >
        <div style={{ height: '1px', width: '100%' }}>        </div>
      </div>
        </div>
        {/* End of Scrollable Content Area */}
      </div>

      {/* Weekly Info Modal */}
      <WeeklyInfoModal
        isOpen={isWeeklyInfoModalOpen}
        onClose={() => {
          setIsWeeklyInfoModalOpen(false);
          setCurrentWeekForModal(null);
        }}
        weekNumber={(currentWeekForModal || currentWeek)?.weekNumber || currentWeekIndex + 1}
        weekId={(currentWeekForModal || currentWeek)?.id || currentWeekId}
        initialPeriodId={weeklyNotes[(currentWeekForModal || currentWeek)?.id]?.periodId || currentWeekData.periodId}
        initialNotes={weeklyNotes[(currentWeekForModal || currentWeek)?.id]?.notes || currentWeekData.notes}
        onSave={handleSaveWeeklyNotes}
      />

      {/* Week Totals Modal */}
      <WeekTotalsModal
        isOpen={showWeekTotalsModal}
        week={currentWeekForModal || currentWeek}
        weeks={sortedWeeks}
        isMultiWeekView={showAllWeeksInModal && activeSection === 'B'}
        autoPrint={autoPrintWeek}
        activeSection={activeSection}
        onClose={() => {
          console.log('🚪 WeekTotalsModal closing...');
          setShowWeekTotalsModal(false);
          setAutoPrintWeek(false);
          setShowAllWeeksInModal(false);
          setCurrentWeekForModal(null);
          console.log('✅ Modal closed and autoPrint reset');
        }}
      />

      {/* Copy Week Modal */}
      <CopyWeekModal
        isOpen={showCopyWeekModal}
        sourceWeek={currentWeekForModal || currentWeek}
        allWeeks={targetWeeks}
        onClose={() => {
          setShowCopyWeekModal(false);
          setTargetWeeks([]);
          setCurrentWeekForModal(null);
        }}
        onCopy={handleCopyWeek}
      />

      {/* Move Week Modal */}
      <MoveWeekModal
        isOpen={showMoveWeekModal}
        sourceWeek={currentWeekForModal || currentWeek}
        allWeeks={targetWeeks}
        onClose={() => {
          setShowMoveWeekModal(false);
          setTargetWeeks([]);
          setCurrentWeekForModal(null);
        }}
        onMove={handleMoveWeek}
      />

      {/* Period Selector Modal with Week Range */}
      {showPeriodSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Select Period for Week {(currentWeekForModal || currentWeek)?.weekNumber}</h2>
              <button
                onClick={() => {
                  setShowPeriodSelector(false);
                  setSelectedPeriodForRange(null);
                  setWeekRangeStart(1);
                  setWeekRangeEnd(1);
                  setCurrentWeekForModal(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-gray-600 mb-3">
              This will set the period for the entire week and update all days in this week.
            </p>
            
            {/* Period Selection */}
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
              {periods && periods.length > 0 ? periods.map((period) => {
                // For sections B and C, calculate date range from weeks in this period
                const getWeekDateRange = () => {
                  if (activeSection === 'A' || !sortedWeeks || sortedWeeks.length === 0) {
                    return null;
                  }
                  
                  // Find all weeks that belong to this period
                  const periodWeeks = sortedWeeks.filter((week: any) => week.period?.id === period.id);
                  
                  if (periodWeeks.length === 0) {
                    return null;
                  }
                  
                  // Sort by week number to get first and last
                  const sortedPeriodWeeks = [...periodWeeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
                  const firstWeek = sortedPeriodWeeks[0];
                  const lastWeek = sortedPeriodWeeks[sortedPeriodWeeks.length - 1];
                  
                  // Get start date from first week's first day
                  const firstDays = firstWeek.days || [];
                  const sortedFirstDays = [...firstDays].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  const firstDay = sortedFirstDays[0];
                  const startDate = firstDay?.date ? new Date(firstDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  
                  // Get end date from last week's last day
                  const lastDays = lastWeek.days || [];
                  const sortedLastDays = [...lastDays].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const lastDay = sortedLastDays[0];
                  const endDate = lastDay?.date ? new Date(lastDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
                  
                  if (startDate && endDate) {
                    return `${startDate} - ${endDate}`;
                  }
                  
                  return null;
                };
                
                const dateRange = getWeekDateRange();
                
                const isSelected = selectedPeriodForRange?.id === period.id;
                const bgColor = isSelected ? period.color : 'white';
                const textColor = isSelected ? getContrastTextColor(period.color) : '#111827';
                
                return (
                  <button
                    key={period.id}
                    onClick={() => {
                      setSelectedPeriodForRange(period);
                      // Initialize range to current week
                      setWeekRangeStart(currentWeek?.weekNumber || 1);
                      setWeekRangeEnd(currentWeek?.weekNumber || 1);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-2 rounded-lg hover:opacity-90 transition-all"
                    style={{
                      borderColor: isSelected ? period.color : '#e5e7eb',
                      backgroundColor: bgColor,
                      color: textColor
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: period.color }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{period.name}</div>
                      {dateRange && (
                        <div className="text-xs opacity-80 mt-0.5">{dateRange}</div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="font-bold opacity-90">✓</div>
                    )}
                  </button>
                );
              }) : null}
              
              {(!periods || periods.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>No periods found.</p>
                  <p className="text-sm mt-2">Create periods in the Settings section.</p>
                </div>
              )}
            </div>

            {/* Week Range Selectors */}
            {selectedPeriodForRange && (
              <div className="space-y-2 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  Apply to week range:
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700 whitespace-nowrap">
                    From week:
                  </label>
                  <select
                    value={weekRangeStart}
                    onChange={(e) => {
                      const start = Number(e.target.value);
                      setWeekRangeStart(start);
                      // Ensure end is not before start
                      if (weekRangeEnd < start) {
                        setWeekRangeEnd(start);
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    size={5}
                  >
                    {sortedWeeks.map((week: any) => {
                      // Get week date range
                      const weekDays = week.days || [];
                      const sortedDays = [...weekDays].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      const startDate = sortedDays[0]?.date ? new Date(sortedDays[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                      const endDate = sortedDays[sortedDays.length - 1]?.date ? new Date(sortedDays[sortedDays.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                      const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';
                      const periodName = week.period?.name || 'No Period';
                      
                      // Format based on section
                      if (activeSection === 'A') {
                        // Section A: ● Period Name - Week N (no dates)
                        return (
                          <option key={week.id} value={week.weekNumber}>
                            ● {periodName} - Week {week.weekNumber}
                          </option>
                        );
                      } else {
                        // Sections B & C: ● Period Name - Week N (dates)
                        return (
                          <option key={week.id} value={week.weekNumber}>
                            ● {periodName} - Week {week.weekNumber}{dateRange}
                          </option>
                        );
                      }
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700 whitespace-nowrap">
                    To week:
                  </label>
                  <select
                    value={weekRangeEnd}
                    onChange={(e) => {
                      const end = Number(e.target.value);
                      setWeekRangeEnd(end);
                      // Ensure start is not after end
                      if (weekRangeStart > end) {
                        setWeekRangeStart(end);
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    size={5}
                  >
                    {sortedWeeks.map((week: any) => {
                      // Get week date range
                      const weekDays = week.days || [];
                      const sortedDays = [...weekDays].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      const startDate = sortedDays[0]?.date ? new Date(sortedDays[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                      const endDate = sortedDays[sortedDays.length - 1]?.date ? new Date(sortedDays[sortedDays.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                      const dateRange = startDate && endDate ? ` (${startDate} - ${endDate})` : '';
                      const periodName = week.period?.name || 'No Period';
                      
                      // Format based on section
                      if (activeSection === 'A') {
                        // Section A: ● Period Name - Week N (no dates)
                        return (
                          <option key={week.id} value={week.weekNumber}>
                            ● {periodName} - Week {week.weekNumber}
                          </option>
                        );
                      } else {
                        // Sections B & C: ● Period Name - Week N (dates)
                        return (
                          <option key={week.id} value={week.weekNumber}>
                            ● {periodName} - Week {week.weekNumber}{dateRange}
                          </option>
                        );
                      }
                    })}
                  </select>
                </div>

                <div className="mt-2 p-2 bg-white rounded text-xs text-gray-700">
                  <strong>Preview:</strong> "{selectedPeriodForRange.name}" → {' '}
                  {weekRangeStart === weekRangeEnd 
                    ? `Week ${weekRangeStart}` 
                    : `Weeks ${weekRangeStart}-${weekRangeEnd} (${weekRangeEnd - weekRangeStart + 1} weeks)`}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowPeriodSelector(false);
                  setSelectedPeriodForRange(null);
                  setWeekRangeStart(1);
                  setWeekRangeEnd(1);
                  setCurrentWeekForModal(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {selectedPeriodForRange && (
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      
                      // Get weeks in the selected range
                      const weeksInRange = sortedWeeks.filter((week: any) => 
                        week.weekNumber >= weekRangeStart && week.weekNumber <= weekRangeEnd
                      );

                      console.log('📅 Applying period to weeks:', {
                        periodName: selectedPeriodForRange.name,
                        periodId: selectedPeriodForRange.id,
                        weekRange: `${weekRangeStart} to ${weekRangeEnd}`,
                        weeksCount: weeksInRange.length
                      });

                      // Apply period to all weeks in range
                      const updatePromises = weeksInRange.map((week: any) =>
                        fetch(`/api/workouts/weeks/${week.id}/period`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            periodId: selectedPeriodForRange.id,
                            updateAllDays: true
                          })
                        })
                      );

                      const results = await Promise.all(updatePromises);
                      const allSuccessful = results.every(r => r.ok);

                      if (allSuccessful) {
                        console.log('✅ Successfully applied period to all weeks in range');
                        setShowPeriodSelector(false);
                        setSelectedPeriodForRange(null);
                        setWeekRangeStart(1);
                        setWeekRangeEnd(1);
                        setCurrentWeekForModal(null);
                        
                        // Reload workouts data without page refresh
                        if (reloadWorkouts) {
                          await reloadWorkouts();
                        }
                      } else {
                        console.error('❌ Failed to update some weeks');
                        alert('Failed to update some weeks. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error updating weeks period:', error);
                      alert('Error updating weeks period. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Period
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Day Info Modal */}
      <DayInfoModal
        isOpen={dayInfoModalOpen}
        day={selectedDayForInfo}
        isTemplate={activeSection === 'A'} // Template plans don't have specific dates
        onClose={() => {
          setDayInfoModalOpen(false);
          setSelectedDayForInfo(null);
        }}
      />

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
      </div>
    </div>
  );
}