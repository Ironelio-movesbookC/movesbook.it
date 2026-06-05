import React, { useState } from 'react';
import { DndContext, closestCenter, closestCorners, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableNutritionFoodRow from './SortableFoodRow';
import NutritionFoodInfoPanel from '../FoodInfoPanel';
import SetWorkTypeModal from '../SetWorkTypeModal';
import { NUTRITION_TERMINOLOGY } from '@/config/nutrition.constants';
import { MEAL_LABELS } from '@/utils/nutritionMealTotals';

interface NutritionFoodsSectionProps {
  nutritionFoods: any[];
  workout: any;
  workoutIndex: number;
  day: any;
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  expandedNutritionFoodId?: string | null;
  autoExpandAll?: boolean;
  onAddNutritionFood: () => void;
  onAddNutritionFoodAfter?: (nutritionFood: any, index: number, workout: any, day: any) => void;
  onEditNutritionFood?: (nutritionFood: any) => void;
  onDeleteNutritionFood?: (nutritionFood: any) => void;
  onEditNutritionComponent?: (nutritionComponent: any, nutritionFood: any, workout?: any, day?: any) => void;
  onDeleteNutritionComponent?: (nutritionComponent: any, nutritionFood: any) => void;
  onAddNutritionComponent?: (nutritionFood: any) => void;
  onAddNutritionComponentAfter?: (nutritionComponent: any, index: number, nutritionFood: any, workout: any, day: any) => void;
  onCopyNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onMoveNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'nutritionFood' | 'nutritionComponent') => void;
  onRefreshWorkouts?: () => Promise<void>;
  columnSettings?: any;
  /** e.g. Breakfast, Lunch — used in section title */
  mealLabel?: string;
}

export default function NutritionFoodsSection({
  nutritionFoods,
  workout,
  workoutIndex,
  day,
  iconType,
  expandedNutritionFoodId,
  autoExpandAll = false,
  onAddNutritionFood,
  onAddNutritionFoodAfter,
  onEditNutritionFood,
  onDeleteNutritionFood,
  onEditNutritionComponent,
  onDeleteNutritionComponent,
  onAddNutritionComponent,
  onAddNutritionComponentAfter,
  onCopyNutritionFood,
  onMoveNutritionFood,
  onOpenColumnSettings,
  onRefreshWorkouts,
  columnSettings,
  mealLabel: mealLabelProp,
}: NutritionFoodsSectionProps) {
  const mealLabel =
    mealLabelProp ||
    MEAL_LABELS[workout?.sessionNumber] ||
    workout?.name ||
    'meal';
  const sectionTitle = NUTRITION_TERMINOLOGY.dietframeOfMeal(mealLabel);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [expandedNutritionFoods, setExpandedNutritionFoods] = React.useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = window.localStorage.getItem('workoutSettings');
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      const stored = parsed?.expandedNutritionFoods;
      if (!Array.isArray(stored)) return new Set();
      return new Set(stored.filter((id: any) => typeof id === 'string'));
    } catch {
      return new Set();
    }
  });
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [selectedNutritionFood, setSelectedNutritionFood] = useState<any>(null);
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(false);
  const [workTypeNutritionFood, setWorkTypeNutritionFood] = useState<any>(null);

  // Local state for nutritionFood order (sorted alphabetically)
  const [orderedNutritionFoods, setOrderedNutritionFoods] = useState(nutritionFoods);

  // Update local order when nutritionFoods prop changes
  React.useEffect(() => {
    setOrderedNutritionFoods(nutritionFoods);
  }, [nutritionFoods]);

  // Auto-expand nutritionFood when expandedNutritionFoodId is set
  React.useEffect(() => {
    if (expandedNutritionFoodId) {
      console.log('🔄 [NutritionFoodsSection] Auto-expanding nutritionFood:', expandedNutritionFoodId);
      setExpandedNutritionFoods(prev => {
        const newSet = new Set(prev);
        newSet.add(expandedNutritionFoodId);
        console.log('✅ [NutritionFoodsSection] Expanded nutritionFoods:', Array.from(newSet));
        return newSet;
      });
    }
  }, [expandedNutritionFoodId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('workoutSettings');
      const parsed = raw ? JSON.parse(raw) : {};
      const updated = {
        ...parsed,
        expandedNutritionFoods: Array.from(expandedNutritionFoods)
      };
      window.localStorage.setItem('workoutSettings', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, [expandedNutritionFoods]);

  // State to track checked nutritionFoods
  const [checkedNutritionFoods, setCheckedNutritionFoods] = React.useState<Set<string>>(new Set());

  // Toggle checkbox for a nutritionFood
  const toggleNutritionFoodCheck = (nutritionFoodId: string) => {
    setCheckedNutritionFoods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nutritionFoodId)) {
        newSet.delete(nutritionFoodId);
      } else {
        newSet.add(nutritionFoodId);
      }
      return newSet;
    });
  };

  // Open work type modal for a nutritionFood
  const handleOpenWorkTypeModal = (nutritionFood: any) => {
    setWorkTypeNutritionFood(nutritionFood);
    setShowWorkTypeModal(true);
  };

  // Save work type
  const handleSaveWorkType = async (workType: 'NONE' | 'MAIN' | 'SECONDARY') => {
    if (!workTypeNutritionFood) return;

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/nutrition/nutritionFoods/${workTypeNutritionFood.id}/set-work-type`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workType })
      });

      const data = await response.json();

      if (data.success) {
        // Reload workout data to refresh all tables with updated work types and descriptions
        if (onRefreshWorkouts) {
          await onRefreshWorkouts();
        }
      } else {
        console.error('Failed to set work type:', data.error, data.details);
        throw new Error(data.error || 'Failed to set work type');
      }
    } catch (error) {
      console.error('Error setting work type:', error);
      throw error;
    }
  };

  // Default column order - matching original layout from screenshot
  // ☑, ⋮⋮, #, MF, Color section, Name section, NutritionFood description, Duration, Rip, AvePause, Alarm & Sound, Options
  const defaultColumnOrder = ['checkbox', 'drag', 'expand', 'index', 'mf', 'color', 'section', 'description', 'duration', 'rip', 'macro', 'alarm', 'options', 'code_section', 'action', 'dist', 'style', 'speed', 'time', 'pace', 'rec', 'rest_to', 'aim_snd', 'sport', 'annotation', 'annotations'];

  // Column visibility helper
  const isColumnVisible = (columnId: string) => {
    if (!columnSettings) return true; // Show all if no settings
    const visible = columnSettings.isColumnVisible('nutritionFood', columnId);
    // If column ID is not in saved settings, show it by default
    return visible !== false;
  };

  // Get column order
  const getColumnOrder = () => {
    if (!columnSettings) {
      return defaultColumnOrder;
    }
    const order = columnSettings.getColumnOrder('nutritionFood');
    // If no saved order or empty, return default
    if (!order || order.length === 0) {
      return defaultColumnOrder;
    }
    // Filter out any column IDs that don't exist in our current definition
    const validOrder = order.filter((id: string) => defaultColumnOrder.includes(id));
    // If saved order is missing columns, add them at the end
    const missingColumns = defaultColumnOrder.filter((id: string) => !validOrder.includes(id));
    return [...validOrder, ...missingColumns];
  };

  // Map column IDs to their header components
  const renderColumnHeader = (columnId: string) => {
    const columnHeaders: { [key: string]: JSX.Element } = {
      checkbox: <th key="checkbox" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '18px' }} title="Select nutritionFood">☑</th>,
      drag: <th key="drag" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '28px' }} title="Drag to reorder">⋮⋮</th>,
      expand: <th key="expand" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '18px' }} title="Expand/Collapse">::</th>,
      index: <th key="index" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '25px' }} title="Index">#</th>,
      color: <th key="color" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '40px' }}>Color</th>,
      code_section: <th key="code_section" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '50px' }}>Code</th>,
      action: <th key="action" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Act</th>,
      dist: <th key="dist" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Dist</th>,
      style: <th key="style" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Style</th>,
      speed: <th key="speed" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Spd</th>,
      time: <th key="time" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Time</th>,
      pace: <th key="pace" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Pace</th>,
      rec: <th key="rec" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Rec</th>,
      rest_to: <th key="rest_to" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '38px' }}>Rest</th>,
      aim_snd: <th key="aim_snd" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '40px' }}>Aim</th>,
      annotations: <th key="annotations" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '50px' }}>Notes</th>,
      mf: <th key="mf" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '25px' }} title="Dietframe letter">DF</th>,
      section: <th key="section" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '96px' }}>Section</th>,
      sport: <th key="sport" className="border border-gray-200 px-1 py-1 text-left text-sm font-bold" style={{ width: '48px' }}>Group</th>,
      description: <th key="description" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '623px' }}>{NUTRITION_TERMINOLOGY.foodSelected}</th>,
      duration: <th key="duration" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '42px' }}>Grams</th>,
      rip: <th key="rip" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '45px' }}>Rip\sets</th>,
      macro: <th key="macro" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '32px' }}>AvePause</th>,
      alarm: <th key="alarm" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '42px' }}>Alarm</th>,
      annotation: <th key="annotation" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '50px' }}>Note</th>,
      options: <th key="options" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold sticky-options-header bg-purple-300" style={{ width: '250px', minWidth: '250px' }}>Options</th>,
    };
    return columnHeaders[columnId];
  };

  const columnOrder = getColumnOrder();
  const orderedVisibleColumns = columnOrder.filter(isColumnVisible);

  // Debug logging
  React.useEffect(() => {
    console.log('📊 NutritionFood Table Columns:', {
      total: columnOrder.length,
      visible: orderedVisibleColumns.length,
      columnOrder,
      orderedVisibleColumns
    });
  }, [columnOrder, orderedVisibleColumns]);

  // Setup drag sensors with reliable activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Distance before drag starts
      },
    })
  );

  // Handle drag end - reorder and reassign letters alphabetically
  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🎯 Drag ended:', event);
    const { active, over } = event;

    console.log('🎯 Active ID:', active?.id, 'Over ID:', over?.id);

    if (!over || active.id === over.id) {
      console.log('🎯 Drag cancelled or same position');
      return;
    }

    const oldIndex = orderedNutritionFoods.findIndex((mf: any) => mf.id === active.id);
    const newIndex = orderedNutritionFoods.findIndex((mf: any) => mf.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder array
    const newOrder = [...orderedNutritionFoods];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);

    // Reassign letters alphabetically
    const updatedOrder = newOrder.map((mf, index) => ({
      ...mf,
      letter: String.fromCharCode(65 + index) // A, B, C, D...
    }));

    // Update local state immediately for smooth UX
    setOrderedNutritionFoods(updatedOrder);

    // Persist the new order to database
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        alert('Authentication required. Please log in again.');
        setOrderedNutritionFoods(nutritionFoods);
        return;
      }

      const response = await fetch('/api/nutrition/moveframes/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionFoods: updatedOrder.map((mf: any) => ({
            id: mf.id,
            letter: mf.letter
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to persist nutritionFood order:', error);
        alert('Failed to save nutritionFood order. Please try again.');
        // Revert to original order on error
        setOrderedNutritionFoods(nutritionFoods);
      } else {
        const result = await response.json();
        console.log('✅ NutritionFood order persisted:', result);
        console.log('📝 New nutritionFood order:', updatedOrder.map((mf: any) => mf.letter).join(', '));
      }
    } catch (error) {
      console.error('❌ Error calling reorder API:', error);
      alert('Network error while saving nutritionFood order. Please check your connection.');
      // Revert to original order on error
      setOrderedNutritionFoods(nutritionFoods);
    }
  };

  return (
    <>
      <div className="mt-4 bg-purple-100 rounded-lg w-fit">
        {/* Header Bar - All buttons in one row */}
        <div className="bg-purple-200 px-4 py-2 flex items-center gap-2 rounded-t-lg">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-700 hover:bg-purple-300 rounded px-2 py-1 transition-colors font-bold"
            title="Toggle dietframes visibility"
          >
            {isExpanded ? '▼' : '►'}
          </button>
          <span className="font-bold text-sm text-purple-900">{sectionTitle}</span>
          <span className="text-xs text-purple-700 bg-purple-300 px-2 py-0.5 rounded">
            {nutritionFoods.length} total
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddNutritionFood) {
                onAddNutritionFood();
              }
            }}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            title={NUTRITION_TERMINOLOGY.addDietframe}
          >
            {NUTRITION_TERMINOLOGY.addDietframe}
          </button>
          {/* Action Buttons - Now beside Add button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (nutritionFoods.length > 0 && onCopyNutritionFood) {
                onCopyNutritionFood(nutritionFoods, workout, day);
              } else {
                alert(`No ${NUTRITION_TERMINOLOGY.dietframes.toLowerCase()} to copy`);
              }
            }}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            title={`Copy all ${NUTRITION_TERMINOLOGY.dietframes.toLowerCase()}`}
          >
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (nutritionFoods.length > 0 && onMoveNutritionFood) {
                onMoveNutritionFood(nutritionFoods, workout, day);
              } else {
                alert(`No ${NUTRITION_TERMINOLOGY.dietframes.toLowerCase()} to move`);
              }
            }}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            title={`Move all ${NUTRITION_TERMINOLOGY.dietframes.toLowerCase()}`}
          >
            Move
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete all dietframes in this ${NUTRITION_TERMINOLOGY.meal.toLowerCase()}?`)) {
                nutritionFoods.forEach((mf: any) => onDeleteNutritionFood?.(mf));
              }
            }}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            title={`Delete all ${NUTRITION_TERMINOLOGY.dietframes.toLowerCase()}`}
          >
            Del
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenColumnSettings) {
                onOpenColumnSettings('nutritionFood');
              }
            }}
            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            title="Configure columns"
          >
            ⚙ Col
          </button>
        </div>

        {/* Dietframes table */}
        {isExpanded && (
          <SortableContext
            items={orderedNutritionFoods.map((mf: any) => mf.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-2">
              <div className="max-h-[min(60vh,720px)] overflow-auto table-scrollbar overscroll-contain">
                <table className="text-xs bg-white" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '1400px', width: '100%' }}>
                  <thead className="sticky top-0 z-20 bg-purple-300 text-purple-900 shadow-sm">
                    <tr>
                      {orderedVisibleColumns.map(columnId => renderColumnHeader(columnId))}
                    </tr>
                  </thead>
                  <tbody>
                    {orderedNutritionFoods.length === 0 ? (
                      <tr>
                        <td
                          colSpan={orderedVisibleColumns.length}
                          className="border border-gray-200 px-4 py-6 text-center text-gray-500"
                        >
                          No foods in this meal yet. Click{' '}
                          <strong>{NUTRITION_TERMINOLOGY.addDietframe}</strong> above to add one.
                        </td>
                      </tr>
                    ) : null}
                    {orderedNutritionFoods.map((nutritionFood: any, mfIndex: number) => {
                      // Expand nutrition_components if: explicitly expanded OR autoExpandAll is true
                      const isNutritionComponentsExpanded = autoExpandAll || expandedNutritionFoods.has(nutritionFood.id);

                      return (
                        <SortableNutritionFoodRow
                          key={nutritionFood.id}
                          nutritionFood={nutritionFood}
                          mfIndex={mfIndex}
                          iconType={iconType}
                          isNutritionComponentsExpanded={isNutritionComponentsExpanded}
                          isChecked={checkedNutritionFoods.has(nutritionFood.id)}
                          onToggleCheck={() => toggleNutritionFoodCheck(nutritionFood.id)}
                          onToggleExpand={() => {
                            setExpandedNutritionFoods(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(nutritionFood.id)) {
                                newSet.delete(nutritionFood.id);
                              } else {
                                newSet.add(nutritionFood.id);
                              }
                              return newSet;
                            });
                          }}
                          onNavigateToNutritionFood={(nutritionFoodId) => setExpandedNutritionFoods(prev => new Set([...Array.from(prev), nutritionFoodId]))}
                          onEditNutritionFood={onEditNutritionFood}
                          onDeleteNutritionFood={onDeleteNutritionFood}
                          onEditNutritionComponent={onEditNutritionComponent}
                          onDeleteNutritionComponent={onDeleteNutritionComponent}
                          onAddNutritionComponent={onAddNutritionComponent}
                          onAddNutritionComponentAfter={onAddNutritionComponentAfter}
                          onAddNutritionFoodAfter={onAddNutritionFoodAfter}
                          onCopyNutritionFood={onCopyNutritionFood}
                          onMoveNutritionFood={onMoveNutritionFood}
                          onSetWorkType={handleOpenWorkTypeModal}
                          onRefresh={onRefreshWorkouts}
                          workout={workout}
                          day={day}
                          setShowInfoPanel={setShowInfoPanel}
                          setSelectedNutritionFood={setSelectedNutritionFood}
                          orderedVisibleColumns={orderedVisibleColumns}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </SortableContext>
        )}
      </div>

      {/* NutritionFood Info Panel */}
      {showInfoPanel && selectedNutritionFood && (
        <NutritionFoodInfoPanel
          isOpen={showInfoPanel}
          onClose={() => {
            setShowInfoPanel(false);
            setSelectedNutritionFood(null);
          }}
          nutritionFood={selectedNutritionFood}
          workout={workout}
          day={day}
          onEdit={() => {
            setShowInfoPanel(false);
            if (onEditNutritionFood) onEditNutritionFood(selectedNutritionFood);
          }}
          onCopy={() => {
            setShowInfoPanel(false);
            if (onCopyNutritionFood) onCopyNutritionFood(selectedNutritionFood, workout, day);
          }}
          onMove={() => {
            setShowInfoPanel(false);
            if (onMoveNutritionFood) onMoveNutritionFood(selectedNutritionFood, workout, day);
          }}
          onDelete={() => {
            setShowInfoPanel(false);
            if (onDeleteNutritionFood) onDeleteNutritionFood(selectedNutritionFood);
          }}
          onAddNutritionComponent={() => {
            setShowInfoPanel(false);
            if (onAddNutritionComponent) onAddNutritionComponent(selectedNutritionFood);
          }}
          onBulkAddNutritionComponents={() => {
            setShowInfoPanel(false);
            alert('Bulk Add NutritionComponents is planned. For now, use "Add NutritionComponent" to add nutrition_components one at a time.');
          }}
          onEditNutritionComponent={(nutritionComponent) => {
            setShowInfoPanel(false);
            if (onEditNutritionComponent) onEditNutritionComponent(nutritionComponent, selectedNutritionFood);
          }}
          onDeleteNutritionComponent={(nutritionComponent) => {
            if (onDeleteNutritionComponent) onDeleteNutritionComponent(nutritionComponent, selectedNutritionFood);
          }}
        />
      )}

      {/* Set Work Type Modal */}
      {showWorkTypeModal && workTypeNutritionFood && (
        <SetWorkTypeModal
          nutritionFood={workTypeNutritionFood}
          onClose={() => {
            setShowWorkTypeModal(false);
            setWorkTypeNutritionFood(null);
          }}
          onSave={handleSaveWorkType}
        />
      )}
    </>
  );
}

