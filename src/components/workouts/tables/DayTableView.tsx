'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import CloneWeekModal from '../modals/CloneWeekModal';
import ExportWeekToPlanModal, { type ExportWeekDestination } from '../modals/ExportWeekToPlanModal';
import ImportWeeklyPlansModal, {
  type ImportWeeklyPlansPayload,
} from '../modals/ImportWeeklyPlansModal';
import ShareWeeklyPlanModal from '../modals/ShareWeeklyPlanModal';
import SaveTemplateWeeklyPlanModal from '../modals/SaveTemplateWeeklyPlanModal';
import UnshareWeeklyPlanModal from '../modals/UnshareWeeklyPlanModal';
import type { WeeklyPlanShareSourceType } from '@/lib/globalWeeklyPlanShare';
import CloneArchiveWeekModal from '../modals/CloneArchiveWeekModal';
import MoveWeekModal from '../modals/MoveWeekModal';
import DayInfoModal from '../DayInfoModal';
import '../../../styles/sticky-table.css';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import { saveWeekToFavorites } from '@/lib/saveFavoriteWeek';

interface DayTableViewProps {
  workoutPlan: any;
  allWeeks?: any[]; // All weeks (unfiltered) for modal navigation
  activeSection?: 'A' | 'B' | 'C' | 'D'; // Active section for conditional display
  activeSubSection?: 'A' | 'B' | 'C'; // Template plan A/B/C when in section A
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
  onCopyDayToClipboard?: (day: any) => void;
  hasDayClipboard?: boolean;
  onCopyDay?: (day: any) => void;
  onMoveDay?: (day: any) => void;
  onPasteDay?: (day: any) => void;
  onShareDay?: (day: any) => void;
  onExportDayToTemplate?: (day: any) => void;
  onExportPdfDay?: (day: any) => void;
  onPrintDay?: (day: any) => void;
  onShowDayOverview?: (day: any) => void;
  onEditWorkout?: (workout: any, day: any) => void;
  onEditMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onEditMovelap?: (movelap: any, moveframe: any, workout: any, day: any) => void;
  onAddMoveframe?: (workout: any, day: any) => void;
  onQuickTrainingEntry?: (workout: any, day: any) => void;
  onAddMoveframeAfter?: (moveframe: any, index: number, workout: any, day: any) => void;
  onAddMovelap?: (moveframe: any, workout: any, day: any) => void;
  onAddMovelapAfter?: (movelap: any, index: number, moveframe: any, workout: any, day: any) => void;
  onDeleteDay?: (day: any) => void;
  onDeleteWorkout?: (workout: any, day: any) => void;
  onSaveFavoriteWorkout?: (workout: any, day: any) => void;
  onSaveTemplateWorkout?: (workout: any, day: any) => void;
  onShareWorkout?: (workout: any, day: any) => void;
  onExportPdfWorkout?: (workout: any, day: any) => void;
  onExportWorkoutToArchive?: (workout: any, day: any) => void;
  onExportWorkoutToDone?: (workout: any, day: any) => void;
  onExportWorkoutToYearly?: (workout: any, day: any) => void;
  onPrintWorkout?: (workout: any, day: any) => void;
  onShowWorkoutOverview?: (workout: any, day: any) => void;
  onDeleteMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onDeleteMovelap?: (movelap: any, moveframe: any, workout: any, day: any) => void;
  onCopyWorkoutToClipboard?: (workout: any) => void;
  hasWorkoutClipboard?: boolean;
  onCopyWorkout?: (workout: any, day: any) => void;
  onImportWorkout?: (workout: any, day: any) => void;
  onPasteWorkout?: (day: any) => void;
  onMoveWorkout?: (workout: any, day: any) => void;
  onCopyMoveframeToClipboard?: (moveframe: any) => void;
  hasMoveframeClipboard?: boolean;
  onPasteMoveframe?: (workout: any) => void;
  onImportMoveframe?: (workout: any, day: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any, workoutDisplayNumber?: number) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any, workoutDisplayNumber?: number) => void;
  hasMovelapClipboard?: boolean;
  movelapClipboard?: any;
  onCopyMovelapToClipboard?: (movelap: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'moveframe' | 'movelap') => void;
  /** GGW from header passes no week; SGW from week toolbar passes that week + button element for menus. */
  onPlanGymWeek?: (week: { id: string; weekNumber: number }, anchorEl?: HTMLElement | null) => void;
  columnSettings?: any;
  reloadWorkouts?: () => Promise<void>; // Added for reloading after copy/move
  /** Increment to refresh shared-workout entries after global share from Share modal. */
  workoutGlobalSharedTick?: number;
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
  activeSubSection = 'A',
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
  onCopyDayToClipboard,
  hasDayClipboard,
  onCopyDay,
  onMoveDay,
  onPasteDay,
  onShareDay,
  onExportDayToTemplate,
  onExportPdfDay,
  onPrintDay,
  onShowDayOverview,
  onEditWorkout,
  onEditMoveframe,
  onEditMovelap,
  onAddMoveframe,
  onQuickTrainingEntry,
  onAddMoveframeAfter,
  onAddMovelap,
  onAddMovelapAfter,
  reloadWorkouts,
  workoutGlobalSharedTick,
  onDeleteDay,
  onDeleteWorkout,
  onSaveFavoriteWorkout,
  onSaveTemplateWorkout,
  onShareWorkout,
  onExportPdfWorkout,
  onExportWorkoutToArchive,
  onExportWorkoutToDone,
  onExportWorkoutToYearly,
  onPrintWorkout,
  onShowWorkoutOverview,
  onDeleteMoveframe,
  onDeleteMovelap,
  onCopyWorkoutToClipboard,
  hasWorkoutClipboard,
  onCopyWorkout,
  onImportWorkout,
  onPasteWorkout,
  onMoveWorkout,
  onCopyMoveframeToClipboard,
  hasMoveframeClipboard,
  onPasteMoveframe,
  onImportMoveframe,
  onCopyMoveframe,
  onMoveMoveframe,
  hasMovelapClipboard,
  movelapClipboard,
  onCopyMovelapToClipboard,
  onOpenColumnSettings,
  onPlanGymWeek,
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
  const [copyWeekModalMode, setCopyWeekModalMode] = useState<'assign' | 'copy'>('copy');
  const [showCloneWeekModal, setShowCloneWeekModal] = useState(false);
  const [showCloneArchiveWeekModal, setShowCloneArchiveWeekModal] = useState(false);
  const [showExportWeekModal, setShowExportWeekModal] = useState(false);
  const [exportWeekDestination, setExportWeekDestination] = useState<ExportWeekDestination>('ARCHIVE');
  const [showMoveWeekModal, setShowMoveWeekModal] = useState(false);
  const [showImportWeeklyPlansModal, setShowImportWeeklyPlansModal] = useState(false);
  const [importYearlyWeeks, setImportYearlyWeeks] = useState<any[]>([]);
  const [autoPrintWeek, setAutoPrintWeek] = useState(false);
  const [showAllWeeksInModal, setShowAllWeeksInModal] = useState(false);
  const [targetWeeks, setTargetWeeks] = useState<any[]>([]);
  const [expandedWeeksHeaders, setExpandedWeeksHeaders] = useState<Set<string>>(new Set());
  const [currentWeekForModal, setCurrentWeekForModal] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [savingFavoriteWeekId, setSavingFavoriteWeekId] = useState<string | null>(null);
  const [showShareWeeklyPlanModal, setShowShareWeeklyPlanModal] = useState(false);
  const [showSaveTemplateWeeklyPlanModal, setShowSaveTemplateWeeklyPlanModal] = useState(false);
  const [saveTemplateWeekSource, setSaveTemplateWeekSource] = useState<any>(null);
  const [showUnshareWeeklyPlanModal, setShowUnshareWeeklyPlanModal] = useState(false);
  const [shareSourcePlanType, setShareSourcePlanType] =
    useState<WeeklyPlanShareSourceType>('YEARLY_PLAN');
  const [mySharedGlobalEntries, setMySharedGlobalEntries] = useState<
    Array<{ id: string; title: string; shareMeta?: { sourceWeekId?: string } | null }>
  >([]);
  const [mySharedWorkoutEntries, setMySharedWorkoutEntries] = useState<
    Array<{ id: string; title: string; shareMeta?: { sourceWorkoutId?: string } | null }>
  >([]);
  const [unshareTarget, setUnshareTarget] = useState<{ id: string; title: string } | null>(null);
  const [unshareItemKind, setUnshareItemKind] = useState<'weekly plan' | 'workout'>('weekly plan');
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

  const loadMySharedGlobalEntries = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMySharedGlobalEntries([]);
      setMySharedWorkoutEntries([]);
      return;
    }
    try {
      const headers = { Authorization: 'Bearer ' + token };
      const [weeklyRes, workoutRes] = await Promise.all([
        fetch('/api/workouts/my-shared-global?recordType=WEEKLY_PLAN', { headers }),
        fetch('/api/workouts/my-shared-global?recordType=WORKOUT', { headers }),
      ]);
      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        setMySharedGlobalEntries(data.records ?? []);
      } else {
        setMySharedGlobalEntries([]);
      }
      if (workoutRes.ok) {
        const data = await workoutRes.json();
        setMySharedWorkoutEntries(data.records ?? []);
      } else {
        setMySharedWorkoutEntries([]);
      }
    } catch {
      setMySharedGlobalEntries([]);
      setMySharedWorkoutEntries([]);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'B' || activeSection === 'D') {
      void loadMySharedGlobalEntries();
    }
  }, [activeSection, loadMySharedGlobalEntries]);

  useEffect(() => {
    if (!workoutGlobalSharedTick) return;
    if (activeSection === 'B' || activeSection === 'D') {
      void loadMySharedGlobalEntries();
    }
  }, [workoutGlobalSharedTick, activeSection, loadMySharedGlobalEntries]);

  if (!workoutPlan || !workoutPlan.weeks) {
    return (
      <div className="p-8 text-center text-gray-500">
        No workout plan available. Click "Create Plan" to start.
      </div>
    );
  }

  const sortedWeeks = [...workoutPlan.weeks].sort((a: any, b: any) => a.weekNumber - b.weekNumber);
  const totalWeeks = sortedWeeks.length;
  
  // For Section B, show ALL weeks (already filtered by parent), merged by weekNumber
  // For Section A/C, use pagination (show one week at a time)
  const weeksToDisplay =
    activeSection === 'B'
      ? mergeWeeksByWeekNumber(sortedWeeks)
      : [sortedWeeks[currentWeekIndex]].filter(Boolean);

  const resolveDayFromPlan = (dayId: string): any | null => {
    const merged = mergeWeeksByWeekNumber(workoutPlan?.weeks ?? []);
    for (const week of merged) {
      const day = week.days?.find((d: any) => d.id === dayId);
      if (day) {
        return { ...day, weekNumber: week.weekNumber };
      }
    }
    for (const week of workoutPlan?.weeks ?? []) {
      const day = week.days?.find((d: any) => d.id === dayId);
      if (day) {
        return { ...day, weekNumber: week.weekNumber };
      }
    }
    return null;
  };

  const getSaveWeekLockKey = (week: any) =>
    `${workoutPlan?.id ?? 'plan'}-week-${week?.weekNumber ?? week?.id ?? '0'}`;

  const handleSaveWeekFavorite = async (week: any) => {
    if (!week?.id) return;

    const logicalWeek =
      activeSection === 'B' || activeSection === 'C'
        ? mergeWeeksByWeekNumber(sortedWeeks).find((w) => w.weekNumber === week.weekNumber) || week
        : week;

    const lockKey = getSaveWeekLockKey(logicalWeek);
    if (savingFavoriteWeekId === lockKey) return;

    setSavingFavoriteWeekId(lockKey);
    try {
      const weekNumber = logicalWeek.weekNumber || 1;
      const defaultName =
        activeSection === 'A'
          ? `Weekly Plan ${activeSubSection} - Week ${weekNumber}`
          : activeSection === 'D'
            ? `Archive Week ${weekNumber}`
            : `Week ${weekNumber}`;
      const result = await saveWeekToFavorites(
        { ...logicalWeek, workoutPlanId: workoutPlan?.id },
        {
          name: defaultName,
          description: `Saved from ${new Date().toLocaleDateString()}`,
        }
      );

      if (result.ok) {
        alert(result.message);
      } else if (!result.skipped) {
        alert(result.error);
      }
    } finally {
      setSavingFavoriteWeekId(null);
    }
  };

  const executeBulkDayAction = async () => {
    if (selectedDays.size === 0) {
      alert('Please select at least one day by checking the checkbox.');
      return;
    }
    if (!selectedAction) {
      alert('Please select an action from the dropdown.');
      return;
    }

    const resolvedDays = Array.from(selectedDays)
      .map((id) => resolveDayFromPlan(id))
      .filter(Boolean) as any[];

    if (resolvedDays.length === 0) {
      alert('Could not resolve selected days. Refresh and try again.');
      return;
    }

    switch (selectedAction) {
      case 'copy': {
        if (resolvedDays.length !== 1) {
          alert('Select exactly one day to copy, then choose the target week and day.');
          return;
        }
        onCopyDay?.(resolvedDays[0]);
        break;
      }
      case 'move': {
        if (resolvedDays.length !== 1) {
          alert('Select exactly one day to move, then choose the target week and day.');
          return;
        }
        onMoveDay?.(resolvedDays[0]);
        break;
      }
      case 'delete': {
        const dayCount = resolvedDays.length;
        const isTemplate = activeSection === 'A';
        const confirmMessage = isTemplate
          ? `Clear all workouts from ${dayCount} selected day slot(s)?`
          : `Delete ${dayCount} selected day(s) and all their workouts? This cannot be undone.`;
        if (!confirm(confirmMessage)) return;

        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in first');
          return;
        }

        try {
          for (const day of resolvedDays) {
            const response = await fetch(
              isTemplate
                ? `/api/workouts/days/${day.id}/clear`
                : `/api/workouts/days?dayId=${day.id}`,
              {
                method: isTemplate ? 'POST' : 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!response.ok) {
              const error = await response.json().catch(() => ({}));
              throw new Error(error.error || 'Failed to delete day');
            }
          }
          setSelectedDays(new Set());
          setSelectedAction('');
          if (reloadWorkouts) await reloadWorkouts();
          alert(
            isTemplate
              ? `Cleared workouts from ${dayCount} day(s).`
              : `Deleted ${dayCount} day(s).`
          );
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Failed to delete day(s)');
        }
        break;
      }
      case 'save-favorite': {
        const weekNumbers = new Set(
          resolvedDays.map((d) => d.weekNumber).filter((n) => n != null)
        );

        if (
          weekNumbers.size === 1 &&
          (activeSection === 'B' || activeSection === 'C') &&
          resolvedDays.length >= 1
        ) {
          const weekNumber = Array.from(weekNumbers)[0];
          const mergedWeek = mergeWeeksByWeekNumber(sortedWeeks).find(
            (w) => w.weekNumber === weekNumber
          );
          if (mergedWeek) {
            if (
              !confirm(
                `Save Week ${weekNumber} (${mergedWeek.days?.length ?? 0} days) as one favourite weekly plan?`
              )
            ) {
              return;
            }
            await handleSaveWeekFavorite(mergedWeek);
            setSelectedDays(new Set());
            setSelectedAction('');
            return;
          }
        }

        if (!confirm(
            `Save all workouts from ${resolvedDays.length} selected day(s) to favourite workouts?`
          )
        ) {
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in first');
          return;
        }

        let saved = 0;
        let skipped = 0;
        for (const day of resolvedDays) {
          for (const workout of day.workouts ?? []) {
            const response = await fetch('/api/workouts/favorites', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ workoutId: workout.id }),
            });
            if (response.ok) {
              saved++;
            } else {
              skipped++;
            }
          }
        }
        setSelectedDays(new Set());
        setSelectedAction('');
        alert(
          saved > 0
            ? `Saved ${saved} workout(s) to favourites${skipped ? ` (${skipped} skipped)` : ''}.`
            : 'No workouts were saved (days may be empty or already in favourites).'
        );
        break;
      }
      default:
        alert('Please select a valid action.');
    }
  };
  
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
    // Always work with the current week only.
    const weeksToToggle = [currentWeek].filter(Boolean);
    
    if (weeksToToggle.length === 0) return;
    
    const allDayIds: string[] = [];
    const allWorkoutIds: string[] = [];
    
    // Collect all day and workout IDs from the current week only
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

  const openCloneWeekModalForWeek = (sourceWeek: any) => {
    setCurrentWeekForModal(sourceWeek);
    setShowCloneWeekModal(true);
  };

  const openAssignWeekModalForWeek = (sourceWeek: any) => {
    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('/api/workouts/plan?type=YEARLY_PLAN', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const weeks = data.plan?.weeks || [];
          setTargetWeeks(
            activeSection === 'B' ? mergeWeeksByWeekNumber(weeks) : weeks
          );
          setCurrentWeekForModal(sourceWeek);
          setCopyWeekModalMode('assign');
          setShowCopyWeekModal(true);
        }
      } catch (error) {
        console.error('Error loading yearly plan weeks:', error);
      }
    })();
  };

  const openExportWeekModalForWeek = (sourceWeek: any, destination: ExportWeekDestination) => {
    const mergedSource =
      activeSection === 'B' || activeSection === 'C'
        ? mergeWeeksByWeekNumber(sortedWeeks).find(
            (w) => w.weekNumber === sourceWeek.weekNumber
          ) || sourceWeek
        : sourceWeek;
    setCurrentWeekForModal(mergedSource);
    setExportWeekDestination(destination);
    setShowExportWeekModal(true);
  };

  const openExportWeekToArchiveModalForWeek = (sourceWeek: any) => {
    openExportWeekModalForWeek(sourceWeek, 'ARCHIVE');
  };

  const openCloneArchiveWeekModalForWeek = (sourceWeek: any) => {
    setCurrentWeekForModal(sourceWeek);
    setShowCloneArchiveWeekModal(true);
  };

  const handleCloneArchiveWeek = async (targetWeekId: string) => {
    const sourceWeek = currentWeekForModal || currentWeek;
    const sourceWeekId = sourceWeek?.id;
    if (!sourceWeekId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/workouts/weeks/copy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceWeekId, targetWeekId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone week');
      }

      setShowCloneArchiveWeekModal(false);
      setCurrentWeekForModal(null);
      alert('Week cloned in Archive successfully. You can edit and rename the target week.');
      if (reloadWorkouts) await reloadWorkouts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to clone week');
    }
  };

  const openCopyWithinTemplateForWeek = (sourceWeek: any) => {
    if (!sourceWeek?.id) {
      alert('No week selected');
      return;
    }
    setTargetWeeks(sortedWeeks);
    setCurrentWeekForModal(sourceWeek);
    setCopyWeekModalMode('copy');
    setShowCopyWeekModal(true);
  };

  const handleSaveTemplateWeekPlan = (week: any) => {
    if (!week?.id) {
      alert('No week selected');
      return;
    }
    setSaveTemplateWeekSource(week);
    setShowSaveTemplateWeeklyPlanModal(true);
  };

  const openCopyWeekModalForWeek = (sourceWeek: any) => {
    if (activeSection === 'A') {
      openAssignWeekModalForWeek(sourceWeek);
      return;
    }
    const planType = activeSection === 'C' ? 'WORKOUTS_DONE' : 'YEARLY_PLAN';
    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch(`/api/workouts/plan?type=${planType}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const weeks = mergeWeeksByWeekNumber(data.plan?.weeks || []);
          const mergedSource =
            weeks.find((w) => w.weekNumber === sourceWeek.weekNumber) || sourceWeek;
          setTargetWeeks(weeks);
          setCurrentWeekForModal(mergedSource);
          setCopyWeekModalMode('copy');
          setShowCopyWeekModal(true);
        }
      } catch (error) {
        console.error('Error loading target weeks:', error);
      }
    })();
  };

  const openMoveWeekModalForWeek = (sourceWeek: any) => {
    if (activeSection === 'A') {
      setTargetWeeks(sortedWeeks);
      setCurrentWeekForModal(sourceWeek);
      setShowMoveWeekModal(true);
      return;
    }
    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in first');
        return;
      }
      try {
        const response = await fetch('/api/workouts/plan?type=YEARLY_PLAN', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const weeks = data.plan?.weeks || [];
          setTargetWeeks(
            activeSection === 'B' ? mergeWeeksByWeekNumber(weeks) : weeks
          );
          setCurrentWeekForModal(sourceWeek);
          setShowMoveWeekModal(true);
        } else {
          alert('Failed to load target weeks for move');
        }
      } catch (error) {
        console.error('Error loading target weeks:', error);
        alert('Failed to load target weeks for move');
      }
    })();
  };

  const findSharedEntryForWeek = (week: any) => {
    if (!week?.id) return null;
    return (
      mySharedGlobalEntries.find((entry) => entry.shareMeta?.sourceWeekId === week.id) ?? null
    );
  };

  const findSharedEntryForWorkout = (workoutId: string) => {
    if (!workoutId) return null;
    return (
      mySharedWorkoutEntries.find((entry) => entry.shareMeta?.sourceWorkoutId === workoutId) ??
      null
    );
  };

  const openUnshareWorkoutModal = (workout: any) => {
    const shared = findSharedEntryForWorkout(workout?.id);
    if (!shared) return;
    setUnshareItemKind('workout');
    setUnshareTarget({ id: shared.id, title: shared.title });
    setShowUnshareWeeklyPlanModal(true);
  };

  const openShareWeeklyPlanModalForWeek = (
    week: any,
    sourcePlanType: WeeklyPlanShareSourceType = 'YEARLY_PLAN'
  ) => {
    setCurrentWeekForModal(week);
    setShareSourcePlanType(sourcePlanType);
    setShowShareWeeklyPlanModal(true);
  };

  const openUnshareWeeklyPlanModalForWeek = (week: any) => {
    const shared = findSharedEntryForWeek(week);
    if (!shared) return;
    setUnshareItemKind('weekly plan');
    setUnshareTarget({ id: shared.id, title: shared.title });
    setShowUnshareWeeklyPlanModal(true);
  };

  const openImportWeeklyPlansModalForWeek = (week: any) => {
    void (async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in first');
        return;
      }
      try {
        const response = await fetch('/api/workouts/plan?type=YEARLY_PLAN', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          alert('Failed to load yearly plan weeks');
          return;
        }
        const data = await response.json();
        const weeks = mergeWeeksByWeekNumber(data.plan?.weeks || []);
        const mergedAnchor = weeks.find((w) => w.weekNumber === week.weekNumber) || week;
        setImportYearlyWeeks(weeks);
        setCurrentWeekForModal(mergedAnchor);
        setShowImportWeeklyPlansModal(true);
      } catch (error) {
        console.error('Error loading yearly weeks for import:', error);
        alert('Failed to load yearly plan weeks');
      }
    })();
  };

  const resolveTargetWeekIds = (anchorWeekNumber: number, count: number): string[] => {
    const sorted = [...importYearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const startIdx = sorted.findIndex((w) => w.weekNumber === anchorWeekNumber);
    if (startIdx === -1) return [];
    return sorted.slice(startIdx, startIdx + count).map((w) => w.id);
  };

  const handleImportWeeklyPlans = async (payload: ImportWeeklyPlansPayload) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please log in first');
    }

    const { source, anchorWeekNumber, overwrite } = payload;

    if (source.type === 'template') {
      for (let i = 0; i < source.weekNumbers.length; i++) {
        const targetWeekNumber = anchorWeekNumber + i;
        const response = await fetch('/api/workouts/weeks/copy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceSection: source.section,
            sourceWeekNumber: source.weekNumbers[i],
            targetSection: 'B',
            targetWeekNumber,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `Failed to import template week ${source.weekNumbers[i]}`);
        }
      }
    } else if (source.type === 'plan_weeks') {
      const targetIds = resolveTargetWeekIds(anchorWeekNumber, source.weekIds.length);
      for (let i = 0; i < source.weekIds.length; i++) {
        const targetWeekId = targetIds[i];
        if (!targetWeekId) break;
        const response = await fetch('/api/workouts/weeks/copy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceWeekId: source.weekIds[i],
            targetWeekId,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to import week');
        }
      }
    } else if (source.type === 'yearly_plan_copy') {
      for (const targetWeekId of source.targetWeekIds) {
        const response = await fetch('/api/workouts/weeks/copy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceWeekId: source.sourceWeekId,
            targetWeekId,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to import week');
        }
      }
    } else if (source.type === 'favorite') {
      const targetIds = resolveTargetWeekIds(anchorWeekNumber, source.favoriteIds.length);
      for (let i = 0; i < source.favoriteIds.length; i++) {
        const targetWeekId = targetIds[i];
        if (!targetWeekId) break;
        const response = await fetch('/api/workouts/plans/favorites/apply', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            favoriteId: source.favoriteIds[i],
            targetWeekIds: [targetWeekId],
            targetPlanType: 'YEARLY_PLAN',
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || err.details || 'Failed to import favourite week');
        }
      }
    } else if (source.type === 'structure') {
      const targetIds = resolveTargetWeekIds(anchorWeekNumber, source.items.length);
      for (let i = 0; i < source.items.length; i++) {
        const targetWeekId = targetIds[i];
        if (!targetWeekId) break;
        const response = await fetch('/api/workouts/weekly-structure/apply-week', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planData: source.items[i].planData,
            targetWeekId,
            overwrite,
          }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to import structure plan');
        }
      }
    } else if (source.type === 'general_archive') {
      for (const targetWeekId of source.targetWeekIds) {
        if (source.source.kind === 'personal') {
          const copyResponse = await fetch('/api/workouts/weeks/copy', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sourceWeekId: source.source.weekId,
              targetWeekId,
            }),
          });
          if (!copyResponse.ok) {
            const err = await copyResponse.json();
            throw new Error(err.error || 'Failed to copy archive week into yearly plan');
          }
        } else {
          const importResponse = await fetch('/api/workouts/global-archive/import', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ globalEntryId: source.source.entryId }),
          });
          if (!importResponse.ok) {
            const err = await importResponse.json();
            throw new Error(err.error || 'Failed to import from general archive');
          }
          const importData = await importResponse.json();
          const sourceWeekId = importData.weekId as string | undefined;
          if (!sourceWeekId) {
            throw new Error('Archive import did not produce a week to copy');
          }

          const copyResponse = await fetch('/api/workouts/weeks/copy', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sourceWeekId, targetWeekId }),
          });
          if (!copyResponse.ok) {
            const err = await copyResponse.json();
            throw new Error(err.error || 'Failed to copy imported week into yearly plan');
          }
        }
      }
    } else if (source.type === 'coach_annual') {
      for (const targetWeekId of source.targetWeekIds) {
        const importResponse = await fetch('/api/workouts/global-archive/import', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ globalEntryId: source.entryId }),
        });
        if (!importResponse.ok) {
          const err = await importResponse.json();
          throw new Error(err.error || 'Failed to import from coach annual plan');
        }
        const importData = await importResponse.json();
        const sourceWeekId = importData.weekId as string | undefined;
        if (!sourceWeekId) {
          throw new Error('Coach plan import did not produce a week to copy');
        }

        const copyResponse = await fetch('/api/workouts/weeks/copy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sourceWeekId, targetWeekId }),
        });
        if (!copyResponse.ok) {
          const err = await copyResponse.json();
          throw new Error(err.error || 'Failed to copy coach plan into yearly plan');
        }
      }
    } else if (source.type === 'global_archive') {
      const targetIds = resolveTargetWeekIds(anchorWeekNumber, source.entryIds.length);
      for (let i = 0; i < source.entryIds.length; i++) {
        const targetWeekId = targetIds[i];
        if (!targetWeekId) break;

        const importResponse = await fetch('/api/workouts/global-archive/import', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ globalEntryId: source.entryIds[i] }),
        });
        if (!importResponse.ok) {
          const err = await importResponse.json();
          throw new Error(err.error || 'Failed to import from general archive');
        }
        const importData = await importResponse.json();
        const sourceWeekId = importData.weekId as string | undefined;
        if (!sourceWeekId) {
          throw new Error('Archive import did not produce a week to copy');
        }

        const copyResponse = await fetch('/api/workouts/weeks/copy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sourceWeekId, targetWeekId }),
        });
        if (!copyResponse.ok) {
          const err = await copyResponse.json();
          throw new Error(err.error || 'Failed to copy imported week into yearly plan');
        }
      }
    }

    setShowImportWeeklyPlansModal(false);
    setImportYearlyWeeks([]);
    setCurrentWeekForModal(null);
    if (reloadWorkouts) await reloadWorkouts();
  };

  const handleCopyWeek = async (targetWeekId: string) => {
    const sourceWeek = currentWeekForModal || currentWeek;
    const sourceWeekId = sourceWeek?.id;
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

      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'Failed to copy week');
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
      alert(error instanceof Error ? error.message : 'Failed to copy week');
    }
  };

  const handleCloneWeek = async (targetWeekId: string) => {
    const sourceWeek = currentWeekForModal || currentWeek;
    const sourceWeekId = sourceWeek?.id;
    if (!sourceWeekId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/workouts/weeks/copy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceWeekId, targetWeekId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone week');
      }

      setShowCloneWeekModal(false);
      setCurrentWeekForModal(null);
      if (reloadWorkouts) await reloadWorkouts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to clone week');
    }
  };

  const handleExportWeekToArchive = async (targetWeekIdOrIds: string | string[]) => {
    const targetIds = Array.isArray(targetWeekIdOrIds) ? targetWeekIdOrIds : [targetWeekIdOrIds];
    const sourceWeek = currentWeekForModal || currentWeek;
    const mergedSource =
      activeSection === 'B' || activeSection === 'C'
        ? mergeWeeksByWeekNumber(sortedWeeks).find((w) => w.weekNumber === sourceWeek.weekNumber) ||
          sourceWeek
        : sourceWeek;
    const sourceWeekId = mergedSource?.id;
    if (!sourceWeekId || targetIds.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      for (const targetWeekId of targetIds) {
        const response = await fetch('/api/workouts/weeks/copy', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sourceWeekId, targetWeekId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to export week');
        }
      }

      setShowExportWeekModal(false);
      setCurrentWeekForModal(null);
      const successMessage =
        exportWeekDestination === 'ARCHIVE'
          ? 'Week exported to Archive successfully.'
          : exportWeekDestination === 'WORKOUTS_DONE'
            ? 'Week exported to Workouts Done successfully.'
            : `Week exported to ${targetIds.length} Yearly Plan week(s) successfully.`;
      alert(successMessage);
      if (reloadWorkouts) await reloadWorkouts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export week');
    }
  };

  const handleMoveWeek = async (targetWeekId: string) => {
    const weekData = currentWeekForModal;
    const isMultipleWeeks = weekData?.multipleWeeks && Array.isArray(weekData.multipleWeeks);
    const weeksToMove = isMultipleWeeks
      ? weekData.multipleWeeks
      : [weekData || currentWeek].filter(Boolean);

    if (weeksToMove.length === 0) {
      alert('No source week selected');
      return;
    }

    if (weeksToMove.some((w: any) => w.id === targetWeekId)) {
      alert('Cannot move a week onto itself');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in first');
        return;
      }

      // Single week (typical in template plans): use the week chosen in the modal
      if (weeksToMove.length === 1) {
        const sourceWeek = weeksToMove[0];
        const response = await fetch('/api/workouts/weeks/move', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceWeekId: sourceWeek.id,
            targetWeekId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to move week');
        }
      } else {
        // Section B: move consecutive weeks starting at selected target week number
        const targetWeekObj = targetWeeks.find((w: any) => w.id === targetWeekId);
        if (!targetWeekObj) {
          throw new Error('Target week not found');
        }

        const sortedWeeksToMove = [...weeksToMove].sort(
          (a: any, b: any) => a.weekNumber - b.weekNumber
        );
        const baseTargetWeekNumber = targetWeekObj.weekNumber;

        for (let i = 0; i < sortedWeeksToMove.length; i++) {
          const sourceWeek = sortedWeeksToMove[i];
          const targetWeekNumber = baseTargetWeekNumber + i;
          const currentTargetWeek = targetWeeks.find(
            (w: any) => w.weekNumber === targetWeekNumber
          );

          if (!currentTargetWeek) {
            throw new Error(`Target week ${targetWeekNumber} not found`);
          }

          const response = await fetch('/api/workouts/weeks/move', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sourceWeekId: sourceWeek.id,
              targetWeekId: currentTargetWeek.id,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to move week ${sourceWeek.weekNumber}`);
          }
        }
      }

      setShowMoveWeekModal(false);
      setTargetWeeks([]);
      setCurrentWeekForModal(null);

      if (reloadWorkouts) {
        await reloadWorkouts();
      }
    } catch (error) {
      console.error('Error moving week(s):', error);
      alert(error instanceof Error ? error.message : 'Failed to move week');
      throw error;
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
              
              {/* Clone Week — template to template (Plans A/B/C) */}
              {activeSection === 'A' && (
              <button
                onClick={() => openCloneWeekModalForWeek(currentWeek)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg bg-purple-600 text-white hover:bg-purple-700"
                  title="Clone this week to another template plan (A, B, or C)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Clone
              </button>
              )}

              {/* Assign Week — template to yearly plan */}
              {activeSection === 'A' && (
              <button
                onClick={() => openAssignWeekModalForWeek(currentWeek)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  style={{ 
                    backgroundColor: colors.buttonAdd,
                    color: colors.buttonAddText
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonAddHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonAdd}
                  title="Assign this week to the Yearly Plan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Assign
              </button>
              )}

              {/* Export Week — template to archive */}
              {activeSection === 'A' && (
              <button
                onClick={() => openExportWeekToArchiveModalForWeek(currentWeek)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                  title="Export this week to Archive workouts & weekly plans"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export
              </button>
              )}
              
              {/* Copy / Export for Section B — use per-week header buttons (multi-week grid) */}

              {/* Copy / Export — Workouts Done (Section C) */}
              {activeSection === 'C' && (
              <button
                onClick={() => openCopyWeekModalForWeek(currentWeek)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                style={{
                  backgroundColor: colors.buttonAdd,
                  color: colors.buttonAddText,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonAddHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonAdd}
                title="Copy this week within Workouts Done (max 2 target weeks)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy
              </button>
              )}

              {activeSection === 'C' && (
              <button
                onClick={() => openExportWeekModalForWeek(currentWeek, 'YEARLY_PLAN')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                title="Export this week to Yearly Plan (update planned workouts)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export Yearly
              </button>
              )}

              {activeSection === 'C' && (
              <button
                onClick={() => openExportWeekToArchiveModalForWeek(currentWeek)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                title="Export this week to Archive workouts & weekly plans"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export Archive
              </button>
              )}

              {/* Clone / Export — Archive (Section D) */}
              {activeSection === 'D' && (
              <button
                onClick={() => openCloneArchiveWeekModalForWeek(currentWeek)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all shadow-md hover:shadow-lg"
                title="Clone this archive week for editing and renaming"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Clone Week
              </button>
              )}

              {activeSection === 'D' && (
              <button
                onClick={() => openExportWeekModalForWeek(currentWeek, 'YEARLY_PLAN')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                title="Export this archive week to Yearly Plan (one or more target weeks)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export Yearly
              </button>
              )}

              {activeSection === 'D' && currentWeek && (
                findSharedEntryForWeek(currentWeek) ? (
                  <button
                    onClick={() => openUnshareWeeklyPlanModalForWeek(currentWeek)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
                    title="Remove from Global archive of shared plans"
                  >
                    Unshare
                  </button>
                ) : (
                  <button
                    onClick={() => openShareWeeklyPlanModalForWeek(currentWeek, 'ARCHIVE')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md hover:shadow-lg"
                    title="Share this archive week with all Movesbook users"
                  >
                    Share
                  </button>
                )
              )}
              
              {/* Overview Button - For Section A/C/D */}
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
              
              {/* Save — template / archive favourites (not yearly grid) */}
              {activeSection !== 'B' && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!currentWeek || !currentWeek.id) {
                    alert('No week selected');
                    return;
                  }
                  if (activeSection === 'A') {
                    await handleSaveTemplateWeekPlan(currentWeek);
                  } else {
                    await handleSaveWeekFavorite(currentWeek);
                  }
                }}
                disabled={!!savingFavoriteWeekId}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                title={activeSection === 'A' ? 'Save this week plan to favourites' : 'Save this week in favourites'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Save
              </button>
              )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 pt-0">
           {/* Action Bar - Only for Section B (Yearly Plan) */}
           {activeSection === 'B' && (
             <div className="bg-gray-100 py-3 flex flex-nowrap items-center justify-between gap-3 border-b border-gray-300 shadow-md overflow-x-auto">
               {/* Left side - Set periods for Section B */}
               <div className="flex flex-nowrap items-center gap-3 shrink-0">
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
                   className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-md bg-gray-700 text-white hover:bg-gray-800 whitespace-nowrap shrink-0"
                   title="Set periods for multiple weeks in yearly plan"
                 >
                   <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                   <span className="font-bold text-sm whitespace-nowrap">
                     Set periods of more weeks
                   </span>
                 </button>
                {excludeStretchingCheckbox ? (
                  <div className="ml-1 flex items-start">{excludeStretchingCheckbox}</div>
                ) : null}
               </div>
              
               {/* Right side - Action Buttons for Section B */}
               <div className="flex flex-nowrap items-center gap-3 shrink-0">
                {/* Expand/Collapse All Button */}
                <button
                  onClick={toggleWeekWorkouts}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-md whitespace-nowrap shrink-0"
                  title={expandState === 0 ? "Show workout headers for current week" : expandState === 1 ? "Show moveframes for current week" : "Collapse current week"}
                >
                  {expandState === 0 ? 'Expand current week' : expandState === 1 ? 'Expand current week (with moveframes)' : 'Collapse current week'}
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
                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md whitespace-nowrap shrink-0"
                   title="View overview of all displayed weeks in yearly plan"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
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
                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md whitespace-nowrap shrink-0"
                   title="Print current view"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                   Print
                 </button>
                 
                 {/* Move Button */}
                 <button
                   onClick={() => alert('Move functionality coming soon')}
                   className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-md whitespace-nowrap shrink-0"
                   title="Move selected items"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
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
              onClick={() => void executeBulkDayAction()}
            >
              Execute
            </button>
            <span className="text-sm text-gray-500">
              {selectedDays.size} day{selectedDays.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Show all weeks */}
          {weeksToDisplay.length === 0 && (
            <div className="text-center py-8 text-red-600 font-bold">
              ⚠️ No weeks to display! weeksToDisplay is empty.
            </div>
          )}
          {weeksToDisplay.map((week, weekIdx) => {
            const weekDays = week?.days || [];
            const sortedWeekDays = [...weekDays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const weekBgColor = week.period?.color || '#f3f4f6';
            const weekTextColor = getContrastTextColor(weekBgColor);
            const badgeBgColor = 'rgba(255, 255, 255, 0.9)';
            const badgeTextColor = getContrastTextColor('#ffffff');
            
            return (
              <div key={week.id} className="mb-6">
                {/* Week Header Bar */}
                <div 
                  className="rounded-t-lg px-4 py-3 flex items-center justify-between border-b-2 border-gray-300"
                  style={{ 
                    backgroundColor: weekBgColor,
                    color: weekTextColor
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
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105 shadow border-2"
                      style={{
                        borderColor: week.period?.color || '#d1d5db',
                        backgroundColor: badgeBgColor,
                        color: badgeTextColor
                      }}
                      title="Set period for this week"
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 shadow-sm"
                        style={{
                          backgroundColor: week.period?.color || 'transparent',
                          borderColor: week.period?.color ? '#ffffff' : '#9ca3af'
                        }}
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
                        <span className="text-sm italic" style={{ color: weekTextColor, opacity: 0.85 }}>
                          Click Edit to add description...
                        </span>
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
                      onClick={() => openCopyWeekModalForWeek(week)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>

                    <button
                      onClick={() => openExportWeekModalForWeek(week, 'WORKOUTS_DONE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md"
                      title="Export week to Workouts Done"
                    >
                      Export Done
                    </button>

                    <button
                      onClick={() => openExportWeekToArchiveModalForWeek(week)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md"
                      title="Export week to Archive"
                    >
                      Export Archive
                    </button>
                    
                    {/* Move Button */}
                    <button
                      onClick={() => openMoveWeekModalForWeek(week)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Move
                    </button>
                    
                    {/* Save in Favourites Button - Single week only */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSaveWeekFavorite(week);
                      }}
                      disabled={savingFavoriteWeekId === getSaveWeekLockKey(week)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all shadow-md"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Save
                    </button>
                    
                    {/* Plan gym week - plan a routine (save to Archive or Yearly Plan) */}
                    {onPlanGymWeek && (
                      <button
                        onClick={(e) => onPlanGymWeek(week, e.currentTarget)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                        title="Plan gym week for this calendar week (SGW)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Plan gym week
                      </button>
                    )}
                    
                    {/* Import — load weekly plan(s) into this week and following weeks */}
                    <button
                      onClick={() => openImportWeeklyPlansModalForWeek(week)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow-md"
                      title="Import one or more weekly plans starting from this week"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import
                    </button>

                    {findSharedEntryForWeek(week) ? (
                      <button
                        onClick={() => openUnshareWeeklyPlanModalForWeek(week)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md"
                        title="Remove this week from the Global archive of shared plans"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        Unshare
                      </button>
                    ) : (
                      <button
                        onClick={() => openShareWeeklyPlanModalForWeek(week, 'YEARLY_PLAN')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md"
                        title="Share — export to Archive and/or share with Movesbook users"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share
                      </button>
                    )}

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
                                  onCopyDayToClipboard={onCopyDayToClipboard}
                                  hasDayClipboard={hasDayClipboard}
                                  onCopyDay={onCopyDay}
                                  onMoveDay={onMoveDay}
                                  onPasteDay={onPasteDay}
                                  onShareDay={onShareDay}
                                  onExportDayToTemplate={onExportDayToTemplate}
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
                                        onQuickTrainingEntry={onQuickTrainingEntry}
                                        onAddMoveframeAfter={onAddMoveframeAfter}
                                        onAddMovelap={onAddMovelap}
                                        onAddMovelapAfter={onAddMovelapAfter}
                                        onDeleteWorkout={onDeleteWorkout}
                                        onSaveFavoriteWorkout={onSaveFavoriteWorkout}
                                        onSaveTemplateWorkout={onSaveTemplateWorkout}
                                        onShareWorkout={onShareWorkout}
                                        onShareWorkoutLink={onShareWorkout}
                                        onExportPdfWorkout={onExportPdfWorkout}
                                        onExportWorkoutToArchive={onExportWorkoutToArchive}
                                        onExportWorkoutToDone={onExportWorkoutToDone}
                                        onExportWorkoutToYearly={onExportWorkoutToYearly}
                                        onPrintWorkout={onPrintWorkout}
                                        onShowWorkoutOverview={onShowWorkoutOverview}
                                        onDeleteMoveframe={onDeleteMoveframe}
                                        onDeleteMovelap={onDeleteMovelap}
                                        onCopyWorkoutToClipboard={onCopyWorkoutToClipboard}
                                        hasWorkoutClipboard={hasWorkoutClipboard}
                                        onCopyWorkout={onCopyWorkout}
                                        onImportWorkout={onImportWorkout}
                                        onPasteWorkout={onPasteWorkout}
                                        onMoveWorkout={onMoveWorkout}
                                        onCopyMoveframeToClipboard={onCopyMoveframeToClipboard}
                                        hasMoveframeClipboard={hasMoveframeClipboard}
                                        onPasteMoveframe={onPasteMoveframe}
                                        onImportMoveframe={onImportMoveframe}
                                        onCopyMoveframe={onCopyMoveframe}
                                        onMoveMoveframe={onMoveMoveframe}
                                        hasMovelapClipboard={hasMovelapClipboard}
                                        movelapClipboard={movelapClipboard}
                                        onCopyMovelapToClipboard={onCopyMovelapToClipboard}
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
                                {dayIdx < sortedWeekDays.length - 1 && (
                                  <tr className="day-row-gap">
                                    <td colSpan={20}>&nbsp;</td>
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
                    onClick={() => void executeBulkDayAction()}
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

                  {activeSection === 'A' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsWeeklyInfoModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-md"
                        style={{
                          backgroundColor: colors.buttonEdit,
                          color: colors.buttonEditText,
                        }}
                        title="Edit weekly plan description"
                      >
                        <FileText size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAutoPrintWeek(false);
                          setShowAllWeeksInModal(false);
                          setShowWeekTotalsModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-md"
                        title="View week overview"
                      >
                        Overview
                      </button>

                      <button
                        type="button"
                        onClick={() => openCopyWithinTemplateForWeek(currentWeek)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
                        title="Copy this week to another week in the same template plan"
                      >
                        Copy
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSaveTemplateWeekPlan(currentWeek)}
                        disabled={!!savingFavoriteWeekId}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all shadow-md disabled:opacity-50"
                        title="Save this week plan to favourites"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Save
                      </button>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
                      onCopyDayToClipboard={onCopyDayToClipboard}
                      hasDayClipboard={hasDayClipboard}
                      onCopyDay={onCopyDay}
                      onMoveDay={onMoveDay}
                      onPasteDay={onPasteDay}
                      onShareDay={onShareDay}
                      onExportDayToTemplate={onExportDayToTemplate}
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
                              onQuickTrainingEntry={onQuickTrainingEntry}
                              onAddMoveframeAfter={onAddMoveframeAfter}
                              onAddMovelap={onAddMovelap}
                              onAddMovelapAfter={onAddMovelapAfter}
                              onDeleteWorkout={onDeleteWorkout}
                              onSaveFavoriteWorkout={onSaveFavoriteWorkout}
                              onSaveTemplateWorkout={onSaveTemplateWorkout}
                              onShareWorkout={onShareWorkout}
                              onShareWorkoutLink={onShareWorkout}
                              findSharedWorkoutEntry={
                                activeSection === 'D' ? findSharedEntryForWorkout : undefined
                              }
                              onUnshareWorkout={
                                activeSection === 'D' ? openUnshareWorkoutModal : undefined
                              }
                              onExportPdfWorkout={onExportPdfWorkout}
                              onExportWorkoutToArchive={onExportWorkoutToArchive}
                              onExportWorkoutToDone={onExportWorkoutToDone}
                              onExportWorkoutToYearly={onExportWorkoutToYearly}
                              onPrintWorkout={onPrintWorkout}
                              onShowWorkoutOverview={onShowWorkoutOverview}
                              onDeleteMoveframe={onDeleteMoveframe}
                              onDeleteMovelap={onDeleteMovelap}
                              onCopyWorkoutToClipboard={onCopyWorkoutToClipboard}
                              hasWorkoutClipboard={hasWorkoutClipboard}
                              onCopyWorkout={onCopyWorkout}
                              onImportWorkout={onImportWorkout}
                              onPasteWorkout={onPasteWorkout}
                              onMoveWorkout={onMoveWorkout}
                              onCopyMoveframeToClipboard={onCopyMoveframeToClipboard}
                              hasMoveframeClipboard={hasMoveframeClipboard}
                              onPasteMoveframe={onPasteMoveframe}
                              onImportMoveframe={onImportMoveframe}
                              onCopyMoveframe={onCopyMoveframe}
                              onMoveMoveframe={onMoveMoveframe}
                              hasMovelapClipboard={hasMovelapClipboard}
                              movelapClipboard={movelapClipboard}
                              onCopyMovelapToClipboard={onCopyMovelapToClipboard}
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
                  {dayIdx < sortedWeekDays.length - 1 && (
                    <tr className="day-row-gap">
                      <td colSpan={activeSection === 'D' ? 21 : 20}>&nbsp;</td>
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

      {/* Assign / Copy Week Modal */}
      <CopyWeekModal
        isOpen={showCopyWeekModal}
        sourceWeek={currentWeekForModal || currentWeek}
        allWeeks={targetWeeks}
        title={copyWeekModalMode === 'assign' ? 'Assign Week' : 'Copy Week'}
        actionLabel={copyWeekModalMode === 'assign' ? 'Assign' : 'Copy'}
        onClose={() => {
          setShowCopyWeekModal(false);
          setTargetWeeks([]);
          setCurrentWeekForModal(null);
        }}
        onCopy={handleCopyWeek}
        checkRecipientStatus
        disableConsecutiveMode={activeSection === 'C'}
        maxSelectableWeeks={activeSection === 'C' ? 2 : undefined}
      />

      {/* Clone Week Modal (template → template) */}
      <CloneWeekModal
        isOpen={showCloneWeekModal}
        sourceWeek={currentWeekForModal || currentWeek}
        sourceTemplate={activeSubSection}
        onClose={() => {
          setShowCloneWeekModal(false);
          setCurrentWeekForModal(null);
        }}
        onConfirm={async ({ targetWeekId }) => {
          await handleCloneWeek(targetWeekId);
        }}
      />

      {/* Export Week to Archive / Workouts Done */}
      <ExportWeekToPlanModal
        isOpen={showExportWeekModal}
        sourceWeek={currentWeekForModal || currentWeek}
        sourceLabel={
          activeSection === 'B'
            ? `Yearly Plan, Week ${(currentWeekForModal || currentWeek)?.weekNumber ?? '?'}`
            : activeSection === 'C'
              ? `Workouts Done, Week ${(currentWeekForModal || currentWeek)?.weekNumber ?? '?'}`
              : activeSection === 'D'
                ? `Archive, Week ${(currentWeekForModal || currentWeek)?.weekNumber ?? '?'}`
                : `Weekly Plan ${activeSubSection}, Week ${(currentWeekForModal || currentWeek)?.weekNumber ?? '?'}`
        }
        destination={exportWeekDestination}
        onClose={() => {
          setShowExportWeekModal(false);
          setCurrentWeekForModal(null);
        }}
        onConfirm={handleExportWeekToArchive}
      />

      {/* Clone Week — Archive to Archive */}
      <CloneArchiveWeekModal
        isOpen={showCloneArchiveWeekModal}
        sourceWeek={currentWeekForModal || currentWeek}
        onClose={() => {
          setShowCloneArchiveWeekModal(false);
          setCurrentWeekForModal(null);
        }}
        onConfirm={handleCloneArchiveWeek}
      />

      {/* Import Weekly Plans Modal (Yearly Plan) */}
      {currentWeekForModal?.id && (
        <ImportWeeklyPlansModal
          isOpen={showImportWeeklyPlansModal}
          anchorWeek={{
            id: currentWeekForModal.id,
            weekNumber: currentWeekForModal.weekNumber ?? 1,
          }}
          yearlyWeeks={importYearlyWeeks}
          onClose={() => {
            setShowImportWeeklyPlansModal(false);
            setImportYearlyWeeks([]);
            setCurrentWeekForModal(null);
          }}
          onConfirm={handleImportWeeklyPlans}
        />
      )}

      <ShareWeeklyPlanModal
        isOpen={showShareWeeklyPlanModal && Boolean(currentWeekForModal?.id)}
        sourceWeek={currentWeekForModal}
        sourcePlanType={shareSourcePlanType}
        periods={periods}
        onClose={() => {
          setShowShareWeeklyPlanModal(false);
          setCurrentWeekForModal(null);
        }}
        onArchiveExported={() => {
          if (reloadWorkouts) void reloadWorkouts();
        }}
        onShared={() => void loadMySharedGlobalEntries()}
      />

      <SaveTemplateWeeklyPlanModal
        isOpen={showSaveTemplateWeeklyPlanModal && Boolean(saveTemplateWeekSource?.id)}
        sourceWeek={saveTemplateWeekSource}
        activeSubSection={activeSubSection}
        periods={periods}
        onClose={() => {
          setShowSaveTemplateWeeklyPlanModal(false);
          setSaveTemplateWeekSource(null);
        }}
        onAssignToYearlyPlan={(sourceWeek) => {
          setSaveTemplateWeekSource(null);
          openAssignWeekModalForWeek(sourceWeek);
        }}
        onSaved={() => {
          if (reloadWorkouts) void reloadWorkouts();
        }}
      />

      <UnshareWeeklyPlanModal
        isOpen={showUnshareWeeklyPlanModal && Boolean(unshareTarget?.id)}
        globalEntryId={unshareTarget?.id ?? ''}
        planTitle={unshareTarget?.title ?? unshareItemKind}
        itemKind={unshareItemKind}
        onClose={() => {
          setShowUnshareWeeklyPlanModal(false);
          setUnshareTarget(null);
        }}
        onUnshared={() => void loadMySharedGlobalEntries()}
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
