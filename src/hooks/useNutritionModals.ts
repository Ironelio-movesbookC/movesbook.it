import { useState } from 'react';

/**
 * Custom hook to manage all workout modal states
 * Extracts modal management from NutritionSection.tsx
 * Provides modal states, modes, and action helpers
 */
export function useNutritionModals() {
  // ==================== MODAL STATES ====================
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [showAddNutritionFoodModal, setShowAddNutritionFoodModal] = useState(false);
  const [showEditNutritionFoodModal, setShowEditNutritionFoodModal] = useState(false);
  const [showAddNutritionComponentModal, setShowAddNutritionComponentModal] = useState(false);
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showAthleteSelector, setShowAthleteSelector] = useState(false);
  const [showAddEditNutritionComponentModal, setShowAddEditNutritionComponentModal] = useState(false);
  const [showBulkAddNutritionComponentModal, setShowBulkAddNutritionComponentModal] = useState(false);
  const [showEditNutritionComponentModal, setShowEditNutritionComponentModal] = useState(false);
  
  // Copy/Move/Export Modals
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [showMoveDayModal, setShowMoveDayModal] = useState(false);
  const [showCopyMealModal, setShowCopyMealModal] = useState(false);
  const [showMoveMealModal, setShowMoveMealModal] = useState(false);
  const [showCopyNutritionFoodModal, setShowCopyNutritionFoodModal] = useState(false);
  const [showMoveNutritionFoodModal, setShowMoveNutritionFoodModal] = useState(false);
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
  const [nutritionFoodModalMode, setNutritionFoodModalMode] = useState<'add' | 'edit'>('add');
  const [nutritionComponentModalMode, setNutritionComponentModalMode] = useState<'add' | 'edit'>('add');
  
  // Column Settings
  const [columnSettingsTableType, setColumnSettingsTableType] = useState<'day' | 'workout' | 'nutritionFood' | 'nutritionComponent'>('workout');
  
  // Export Settings
  const [exportType, setExportType] = useState<'day' | 'week' | 'plan'>('day');
  const [exportId, setExportId] = useState<string>('');
  
  // Drag Modal Configuration
  const [dragModalConfig, setDragModalConfig] = useState<{
    dragType: 'workout' | 'nutritionFood';
    hasConflict: boolean;
    conflictMessage?: string;
    showPositionChoice?: boolean;
    sourceData: any;
    targetData: any;
  } | null>(null);

  // ==================== MODAL ACTIONS ====================
  
  /**
   * Open Add NutritionMeal Modal
   */
  const openAddMealModal = (day?: any) => {
    setWorkoutModalMode('add');
    setShowAddMealModal(true);
  };

  /**
   * Open Edit NutritionMeal Modal
   */
  const openEditWorkoutModal = () => {
    setWorkoutModalMode('edit');
    setShowAddMealModal(true);
  };

  /**
   * Close Add NutritionMeal Modal
   */
  const closeAddMealModal = () => {
    setShowAddMealModal(false);
  };

  /**
   * Open Add NutritionFood Modal
   */
  const openAddNutritionFoodModal = () => {
    setNutritionFoodModalMode('add');
    setShowAddNutritionFoodModal(true);
  };

  /**
   * Open Edit NutritionFood Modal
   */
  const openEditNutritionFoodModal = () => {
    setNutritionFoodModalMode('edit');
    setShowAddNutritionFoodModal(true);
  };

  /**
   * Close Add/Edit NutritionFood Modal
   */
  const closeAddNutritionFoodModal = () => {
    setShowAddNutritionFoodModal(false);
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
   * Open Add NutritionComponent Modal
   */
  const openAddNutritionComponentModal = () => {
    setNutritionComponentModalMode('add');
    setShowAddEditNutritionComponentModal(true);
  };

  /**
   * Open Edit NutritionComponent Modal
   */
  const openEditNutritionComponentModal = () => {
    setNutritionComponentModalMode('edit');
    setShowAddEditNutritionComponentModal(true);
  };

  /**
   * Close NutritionComponent Modal
   */
  const closeNutritionComponentModal = () => {
    setShowAddEditNutritionComponentModal(false);
    setShowEditNutritionComponentModal(false);
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
   * Open Copy NutritionMeal Modal
   */
  const openCopyMealModal = () => {
    setShowCopyMealModal(true);
  };

  /**
   * Close Copy NutritionMeal Modal
   */
  const closeCopyMealModal = () => {
    setShowCopyMealModal(false);
  };

  /**
   * Open Move NutritionMeal Modal
   */
  const openMoveMealModal = () => {
    setShowMoveMealModal(true);
  };

  /**
   * Close Move NutritionMeal Modal
   */
  const closeMoveMealModal = () => {
    setShowMoveMealModal(false);
  };

  /**
   * Open Copy NutritionFood Modal
   */
  const openCopyNutritionFoodModal = () => {
    setShowCopyNutritionFoodModal(true);
  };

  /**
   * Close Copy NutritionFood Modal
   */
  const closeCopyNutritionFoodModal = () => {
    setShowCopyNutritionFoodModal(false);
  };

  /**
   * Open Move NutritionFood Modal
   */
  const openMoveNutritionFoodModal = () => {
    setShowMoveNutritionFoodModal(true);
  };

  /**
   * Close Move NutritionFood Modal
   */
  const closeMoveNutritionFoodModal = () => {
    setShowMoveNutritionFoodModal(false);
  };

  /**
   * Open Column Settings Modal
   */
  const openColumnSettingsModal = (tableType: 'day' | 'workout' | 'nutritionFood' | 'nutritionComponent') => {
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
   * Open Bulk Add NutritionComponent Modal
   */
  const openBulkAddNutritionComponentModal = () => {
    setShowBulkAddNutritionComponentModal(true);
  };

  /**
   * Close Bulk Add NutritionComponent Modal
   */
  const closeBulkAddNutritionComponentModal = () => {
    setShowBulkAddNutritionComponentModal(false);
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
    setShowAddMealModal(false);
    setShowAddNutritionFoodModal(false);
    setShowEditNutritionFoodModal(false);
    setShowAddNutritionComponentModal(false);
    setShowAddDayModal(false);
    setShowEditDayModal(false);
    setShowImportModal(false);
    setShowStartDatePicker(false);
    setShowAthleteSelector(false);
    setShowAddEditNutritionComponentModal(false);
    setShowBulkAddNutritionComponentModal(false);
    setShowEditNutritionComponentModal(false);
    setShowCopyDayModal(false);
    setShowMoveDayModal(false);
    setShowCopyMealModal(false);
    setShowMoveMealModal(false);
    setShowCopyNutritionFoodModal(false);
    setShowMoveNutritionFoodModal(false);
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
      showAddMealModal,
      showAddNutritionFoodModal,
      showEditNutritionFoodModal,
      showAddNutritionComponentModal,
      showAddDayModal,
      showEditDayModal,
      showImportModal,
      showStartDatePicker,
      showAthleteSelector,
      showAddEditNutritionComponentModal,
      showBulkAddNutritionComponentModal,
      showEditNutritionComponentModal,
      showCopyDayModal,
      showMoveDayModal,
      showCopyMealModal,
      showMoveMealModal,
      showCopyNutritionFoodModal,
      showMoveNutritionFoodModal,
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
      nutritionFoodModalMode,
      nutritionComponentModalMode,
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
      setShowAddMealModal,
      setShowAddNutritionFoodModal,
      setShowEditNutritionFoodModal,
      setShowAddNutritionComponentModal,
      setShowAddDayModal,
      setShowEditDayModal,
      setShowImportModal,
      setShowStartDatePicker,
      setShowAthleteSelector,
      setShowAddEditNutritionComponentModal,
      setShowBulkAddNutritionComponentModal,
      setShowEditNutritionComponentModal,
      setShowCopyDayModal,
      setShowMoveDayModal,
      setShowCopyMealModal,
      setShowMoveMealModal,
      setShowCopyNutritionFoodModal,
      setShowMoveNutritionFoodModal,
      setShowColumnSettingsModal,
      setShowExportSharePrint,
      setShowWorkoutSelector,
      setShowDaySelector,
      setShowDragModal,
      setShowCircuitPlannerModal,
      setWorkoutModalMode,
      setNutritionFoodModalMode,
      setNutritionComponentModalMode,
      setColumnSettingsTableType,
      setExportType,
      setExportId,
      setDragModalConfig,
    },
    
    // Actions (recommended way to interact with modals)
    actions: {
      // Helper methods (open/close pattern)
      openAddMealModal,
      openEditWorkoutModal,
      closeAddMealModal,
      openAddNutritionFoodModal,
      openEditNutritionFoodModal,
      closeAddNutritionFoodModal,
      openAddNutritionComponentModal,
      openEditNutritionComponentModal,
      closeNutritionComponentModal,
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
      openBulkAddNutritionComponentModal,
      closeBulkAddNutritionComponentModal,
      openCopyDayModal,
      closeCopyDayModal,
      openMoveDayModal,
      closeMoveDayModal,
      openCopyMealModal,
      closeCopyMealModal,
      openMoveMealModal,
      closeMoveMealModal,
      openCopyNutritionFoodModal,
      closeCopyNutritionFoodModal,
      openMoveNutritionFoodModal,
      closeMoveNutritionFoodModal,
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
      setShowAddMealModal,
      setShowAddNutritionFoodModal,
      setShowEditNutritionFoodModal,
      setShowAddNutritionComponentModal,
      setShowAddDayModal,
      setShowEditDayModal,
      setShowImportModal,
      setShowStartDatePicker,
      setShowAthleteSelector,
      setShowAddEditNutritionComponentModal,
      setShowBulkAddNutritionComponentModal,
      setShowEditNutritionComponentModal,
      setShowCopyDayModal,
      setShowMoveDayModal,
      setShowCopyMealModal,
      setShowMoveMealModal,
      setShowCopyNutritionFoodModal,
      setShowMoveNutritionFoodModal,
      setShowColumnSettingsModal,
      setShowExportSharePrint,
      setShowWorkoutSelector,
      setShowDaySelector,
      setShowDragModal,
      setWorkoutModalMode,
      setNutritionFoodModalMode,
      setNutritionComponentModalMode,
      setColumnSettingsTableType,
      setExportType,
      setExportId,
      setDragModalConfig,
    },
  };
}

