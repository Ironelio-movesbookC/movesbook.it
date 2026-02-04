import { useState } from 'react';

/**
 * Custom hook to manage all workout modal states
 * Extracts modal management from WorkoutSection.tsx
 * Provides modal states, modes, and action helpers
 */
export function useWorkoutModals() {
  // ==================== MODAL STATES ====================
  const [showAddWorkoutModal, setShowAddWorkoutModal] = useState(false);
  const [showAddMoveframeModal, setShowAddMoveframeModal] = useState(false);
  const [showEditMoveframeModal, setShowEditMoveframeModal] = useState(false);
  const [showAddMovelapModal, setShowAddMovelapModal] = useState(false);
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showAthleteSelector, setShowAthleteSelector] = useState(false);
  const [showAddEditMovelapModal, setShowAddEditMovelapModal] = useState(false);
  const [showBulkAddMovelapModal, setShowBulkAddMovelapModal] = useState(false);
  const [showEditMovelapModal, setShowEditMovelapModal] = useState(false);
  
  // Copy/Move/Export Modals
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [showMoveDayModal, setShowMoveDayModal] = useState(false);
  const [showCopyWorkoutModal, setShowCopyWorkoutModal] = useState(false);
  const [showMoveWorkoutModal, setShowMoveWorkoutModal] = useState(false);
  const [showCopyMoveframeModal, setShowCopyMoveframeModal] = useState(false);
  const [showMoveMoveframeModal, setShowMoveMoveframeModal] = useState(false);
  const [showColumnSettingsModal, setShowColumnSettingsModal] = useState(false);
  const [showExportSharePrint, setShowExportSharePrint] = useState(false);
  const [showWorkoutSelector, setShowWorkoutSelector] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);
  
  // Drag & Drop Modal
  const [showDragModal, setShowDragModal] = useState(false);
  
  // Circuit Planner Modal
  const [showCircuitPlannerModal, setShowCircuitPlannerModal] = useState(false);
  
  // Modal Modes
  const [workoutModalMode, setWorkoutModalMode] = useState<'add' | 'edit'>('add');
  const [moveframeModalMode, setMoveframeModalMode] = useState<'add' | 'edit'>('add');
  const [movelapModalMode, setMovelapModalMode] = useState<'add' | 'edit'>('add');
  
  // Column Settings
  const [columnSettingsTableType, setColumnSettingsTableType] = useState<'day' | 'workout' | 'moveframe' | 'movelap'>('workout');
  
  // Export Settings
  const [exportType, setExportType] = useState<'day' | 'week' | 'plan'>('day');
  const [exportId, setExportId] = useState<string>('');
  
  // Drag Modal Configuration
  const [dragModalConfig, setDragModalConfig] = useState<{
    dragType: 'workout' | 'moveframe';
    hasConflict: boolean;
    conflictMessage?: string;
    showPositionChoice?: boolean;
    sourceData: any;
    targetData: any;
  } | null>(null);

  // ==================== MODAL ACTIONS ====================
  
  /**
   * Open Add Workout Modal
   */
  const openAddWorkoutModal = (day?: any) => {
    setWorkoutModalMode('add');
    setShowAddWorkoutModal(true);
  };

  /**
   * Open Edit Workout Modal
   */
  const openEditWorkoutModal = () => {
    setWorkoutModalMode('edit');
    setShowAddWorkoutModal(true);
  };

  /**
   * Close Add Workout Modal
   */
  const closeAddWorkoutModal = () => {
    setShowAddWorkoutModal(false);
  };

  /**
   * Open Add Moveframe Modal
   */
  const openAddMoveframeModal = () => {
    setMoveframeModalMode('add');
    setShowAddMoveframeModal(true);
  };

  /**
   * Open Edit Moveframe Modal
   */
  const openEditMoveframeModal = () => {
    setMoveframeModalMode('edit');
    setShowAddMoveframeModal(true);
  };

  /**
   * Close Add/Edit Moveframe Modal
   */
  const closeAddMoveframeModal = () => {
    setShowAddMoveframeModal(false);
  };

  /**
   * Open Add Day Modal
   */
  const openAddDayModal = () => {
    setShowAddDayModal(true);
  };

  /**
   * Close Add Day Modal
   */
  const closeAddDayModal = () => {
    setShowAddDayModal(false);
  };

  /**
   * Open Edit Day Modal
   */
  const openEditDayModal = () => {
    setShowEditDayModal(true);
  };

  /**
   * Close Edit Day Modal
   */
  const closeEditDayModal = () => {
    setShowEditDayModal(false);
  };

  /**
   * Open Import Modal
   */
  const openImportModal = () => {
    setShowImportModal(true);
  };

  /**
   * Close Import Modal
   */
  const closeImportModal = () => {
    setShowImportModal(false);
  };

  /**
   * Open Start Date Picker
   */
  const openStartDatePicker = () => {
    setShowStartDatePicker(true);
  };

  /**
   * Close Start Date Picker
   */
  const closeStartDatePicker = () => {
    setShowStartDatePicker(false);
  };

  /**
   * Open Athlete Selector
   */
  const openAthleteSelector = () => {
    setShowAthleteSelector(true);
  };

  /**
   * Close Athlete Selector
   */
  const closeAthleteSelector = () => {
    setShowAthleteSelector(false);
  };

  /**
   * Open Add Movelap Modal
   */
  const openAddMovelapModal = () => {
    setMovelapModalMode('add');
    setShowAddEditMovelapModal(true);
  };

  /**
   * Open Edit Movelap Modal
   */
  const openEditMovelapModal = () => {
    setMovelapModalMode('edit');
    setShowAddEditMovelapModal(true);
  };

  /**
   * Close Movelap Modal
   */
  const closeMovelapModal = () => {
    setShowAddEditMovelapModal(false);
    setShowEditMovelapModal(false);
  };

  /**
   * Open Copy Day Modal
   */
  const openCopyDayModal = () => {
    setShowCopyDayModal(true);
  };

  /**
   * Close Copy Day Modal
   */
  const closeCopyDayModal = () => {
    setShowCopyDayModal(false);
  };

  /**
   * Open Move Day Modal
   */
  const openMoveDayModal = () => {
    setShowMoveDayModal(true);
  };

  /**
   * Close Move Day Modal
   */
  const closeMoveDayModal = () => {
    setShowMoveDayModal(false);
  };

  /**
   * Open Copy Workout Modal
   */
  const openCopyWorkoutModal = () => {
    setShowCopyWorkoutModal(true);
  };

  /**
   * Close Copy Workout Modal
   */
  const closeCopyWorkoutModal = () => {
    setShowCopyWorkoutModal(false);
  };

  /**
   * Open Move Workout Modal
   */
  const openMoveWorkoutModal = () => {
    setShowMoveWorkoutModal(true);
  };

  /**
   * Close Move Workout Modal
   */
  const closeMoveWorkoutModal = () => {
    setShowMoveWorkoutModal(false);
  };

  /**
   * Open Copy Moveframe Modal
   */
  const openCopyMoveframeModal = () => {
    setShowCopyMoveframeModal(true);
  };

  /**
   * Close Copy Moveframe Modal
   */
  const closeCopyMoveframeModal = () => {
    setShowCopyMoveframeModal(false);
  };

  /**
   * Open Move Moveframe Modal
   */
  const openMoveMoveframeModal = () => {
    setShowMoveMoveframeModal(true);
  };

  /**
   * Close Move Moveframe Modal
   */
  const closeMoveMoveframeModal = () => {
    setShowMoveMoveframeModal(false);
  };

  /**
   * Open Column Settings Modal
   */
  const openColumnSettingsModal = (tableType: 'day' | 'workout' | 'moveframe' | 'movelap') => {
    setColumnSettingsTableType(tableType);
    setShowColumnSettingsModal(true);
  };

  /**
   * Close Column Settings Modal
   */
  const closeColumnSettingsModal = () => {
    setShowColumnSettingsModal(false);
  };

  /**
   * Open Export/Share/Print Modal
   */
  const openExportModal = (type: 'day' | 'week' | 'plan', id: string) => {
    setExportType(type);
    setExportId(id);
    setShowExportSharePrint(true);
  };

  /**
   * Close Export/Share/Print Modal
   */
  const closeExportModal = () => {
    setShowExportSharePrint(false);
  };

  /**
   * Open Bulk Add Movelap Modal
   */
  const openBulkAddMovelapModal = () => {
    setShowBulkAddMovelapModal(true);
  };

  /**
   * Close Bulk Add Movelap Modal
   */
  const closeBulkAddMovelapModal = () => {
    setShowBulkAddMovelapModal(false);
  };

  /**
   * Open Drag & Drop Confirmation Modal
   */
  const openDragModal = (config: typeof dragModalConfig) => {
    setDragModalConfig(config);
    setShowDragModal(true);
  };

  /**
   * Close Drag & Drop Confirmation Modal
   */
  const closeDragModal = () => {
    setShowDragModal(false);
    setDragModalConfig(null);
  };

  /**
   * Open Circuit Planner Modal
   */
  const openCircuitPlannerModal = () => {
    setShowCircuitPlannerModal(true);
  };

  /**
   * Close Circuit Planner Modal
   */
  const closeCircuitPlannerModal = () => {
    setShowCircuitPlannerModal(false);
  };

  /**
   * Close All Modals (useful for cleanup or navigation)
   */
  const closeAllModals = () => {
    setShowAddWorkoutModal(false);
    setShowAddMoveframeModal(false);
    setShowEditMoveframeModal(false);
    setShowAddMovelapModal(false);
    setShowAddDayModal(false);
    setShowEditDayModal(false);
    setShowImportModal(false);
    setShowStartDatePicker(false);
    setShowAthleteSelector(false);
    setShowAddEditMovelapModal(false);
    setShowBulkAddMovelapModal(false);
    setShowEditMovelapModal(false);
    setShowCopyDayModal(false);
    setShowMoveDayModal(false);
    setShowCopyWorkoutModal(false);
    setShowMoveWorkoutModal(false);
    setShowCopyMoveframeModal(false);
    setShowMoveMoveframeModal(false);
    setShowColumnSettingsModal(false);
    setShowExportSharePrint(false);
    setShowWorkoutSelector(false);
    setShowDaySelector(false);
    setShowDragModal(false);
    setShowCircuitPlannerModal(false);
    setDragModalConfig(null);
  };

  // ==================== RETURN VALUES ====================
  return {
    // Modal States
    modals: {
      showAddWorkoutModal,
      showAddMoveframeModal,
      showEditMoveframeModal,
      showAddMovelapModal,
      showAddDayModal,
      showEditDayModal,
      showImportModal,
      showStartDatePicker,
      showAthleteSelector,
      showAddEditMovelapModal,
      showBulkAddMovelapModal,
      showEditMovelapModal,
      showCopyDayModal,
      showMoveDayModal,
      showCopyWorkoutModal,
      showMoveWorkoutModal,
      showCopyMoveframeModal,
      showMoveMoveframeModal,
      showColumnSettingsModal,
      showExportSharePrint,
      showWorkoutSelector,
      showDaySelector,
      showDragModal,
      showCircuitPlannerModal,
    },
    
    // Modal Modes
    modes: {
      workoutModalMode,
      moveframeModalMode,
      movelapModalMode,
    },
    
    // Settings
    settings: {
      columnSettingsTableType,
      exportType,
      exportId,
      dragModalConfig,
    },
    
    // Setters (for direct control if needed)
    setters: {
      setShowAddWorkoutModal,
      setShowAddMoveframeModal,
      setShowEditMoveframeModal,
      setShowAddMovelapModal,
      setShowAddDayModal,
      setShowEditDayModal,
      setShowImportModal,
      setShowStartDatePicker,
      setShowAthleteSelector,
      setShowAddEditMovelapModal,
      setShowBulkAddMovelapModal,
      setShowEditMovelapModal,
      setShowCopyDayModal,
      setShowMoveDayModal,
      setShowCopyWorkoutModal,
      setShowMoveWorkoutModal,
      setShowCopyMoveframeModal,
      setShowMoveMoveframeModal,
      setShowColumnSettingsModal,
      setShowExportSharePrint,
      setShowWorkoutSelector,
      setShowDaySelector,
      setShowDragModal,
      setShowCircuitPlannerModal,
      setWorkoutModalMode,
      setMoveframeModalMode,
      setMovelapModalMode,
      setColumnSettingsTableType,
      setExportType,
      setExportId,
      setDragModalConfig,
    },
    
    // Actions (recommended way to interact with modals)
    actions: {
      // Helper methods (open/close pattern)
      openAddWorkoutModal,
      openEditWorkoutModal,
      closeAddWorkoutModal,
      openAddMoveframeModal,
      openEditMoveframeModal,
      closeAddMoveframeModal,
      openAddMovelapModal,
      openEditMovelapModal,
      closeMovelapModal,
      openAddDayModal,
      closeAddDayModal,
      openEditDayModal,
      closeEditDayModal,
      openImportModal,
      closeImportModal,
      openStartDatePicker,
      closeStartDatePicker,
      openAthleteSelector,
      closeAthleteSelector,
      openBulkAddMovelapModal,
      closeBulkAddMovelapModal,
      openCopyDayModal,
      closeCopyDayModal,
      openMoveDayModal,
      closeMoveDayModal,
      openCopyWorkoutModal,
      closeCopyWorkoutModal,
      openMoveWorkoutModal,
      closeMoveWorkoutModal,
      openCopyMoveframeModal,
      closeCopyMoveframeModal,
      openMoveMoveframeModal,
      closeMoveMoveframeModal,
      openColumnSettingsModal,
      closeColumnSettingsModal,
      openExportModal,
      closeExportModal,
      openDragModal,
      closeDragModal,
      openCircuitPlannerModal,
      closeCircuitPlannerModal,
      closeAllModals,
      // Direct setters (for manual control)
      setShowAddWorkoutModal,
      setShowAddMoveframeModal,
      setShowEditMoveframeModal,
      setShowAddMovelapModal,
      setShowAddDayModal,
      setShowEditDayModal,
      setShowImportModal,
      setShowStartDatePicker,
      setShowAthleteSelector,
      setShowAddEditMovelapModal,
      setShowBulkAddMovelapModal,
      setShowEditMovelapModal,
      setShowCopyDayModal,
      setShowMoveDayModal,
      setShowCopyWorkoutModal,
      setShowMoveWorkoutModal,
      setShowCopyMoveframeModal,
      setShowMoveMoveframeModal,
      setShowColumnSettingsModal,
      setShowExportSharePrint,
      setShowWorkoutSelector,
      setShowDaySelector,
      setShowDragModal,
      setWorkoutModalMode,
      setMoveframeModalMode,
      setMovelapModalMode,
      setColumnSettingsTableType,
      setExportType,
      setExportId,
      setDragModalConfig,
    },
  };
}

