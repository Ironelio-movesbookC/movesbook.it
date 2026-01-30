import React, { useState } from 'react';
import { DndContext, closestCenter, closestCorners, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableMoveframeRow from './SortableMoveframeRow';
import MoveframeInfoPanel from '../MoveframeInfoPanel';
import SetWorkTypeModal from '../SetWorkTypeModal';

interface MoveframesSectionProps {
  moveframes: any[];
  workout: any;
  workoutIndex: number;
  day: any;
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  expandedMoveframeId?: string | null;
  autoExpandAll?: boolean;
  onAddMoveframe: () => void;
  onAddMoveframeAfter?: (moveframe: any, index: number, workout: any, day: any) => void;
  onEditMoveframe?: (moveframe: any) => void;
  onDeleteMoveframe?: (moveframe: any) => void;
  onEditMovelap?: (movelap: any, moveframe: any) => void;
  onDeleteMovelap?: (movelap: any, moveframe: any) => void;
  onAddMovelap?: (moveframe: any) => void;
  onAddMovelapAfter?: (movelap: any, index: number, moveframe: any, workout: any, day: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onOpenColumnSettings?: (tableType: 'day' | 'workout' | 'moveframe' | 'movelap') => void;
  onRefreshWorkouts?: () => Promise<void>;
  columnSettings?: any;
}

export default function MoveframesSection({ 
  moveframes, 
  workout, 
  workoutIndex, 
  day,
  iconType,
  expandedMoveframeId,
  autoExpandAll = false,
  onAddMoveframe,
  onAddMoveframeAfter,
  onEditMoveframe,
  onDeleteMoveframe,
  onEditMovelap,
  onDeleteMovelap,
  onAddMovelap,
  onAddMovelapAfter,
  onCopyMoveframe,
  onMoveMoveframe,
  onOpenColumnSettings,
  onRefreshWorkouts,
  columnSettings
}: MoveframesSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [expandedMoveframes, setExpandedMoveframes] = React.useState<Set<string>>(new Set());
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [selectedMoveframe, setSelectedMoveframe] = useState<any>(null);
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(false);
  const [workTypeMoveframe, setWorkTypeMoveframe] = useState<any>(null);
  
  // Local state for moveframe order (sorted alphabetically)
  const [orderedMoveframes, setOrderedMoveframes] = useState(moveframes);
  
  // Update local order when moveframes prop changes
  React.useEffect(() => {
    setOrderedMoveframes(moveframes);
  }, [moveframes]);
  
  // Auto-expand moveframe when expandedMoveframeId is set
  React.useEffect(() => {
    if (expandedMoveframeId) {
      setExpandedMoveframes(prev => new Set([...Array.from(prev), expandedMoveframeId]));
    }
  }, [expandedMoveframeId]);

  // State to track checked moveframes
  const [checkedMoveframes, setCheckedMoveframes] = React.useState<Set<string>>(new Set());

  // Toggle checkbox for a moveframe
  const toggleMoveframeCheck = (moveframeId: string) => {
    setCheckedMoveframes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moveframeId)) {
        newSet.delete(moveframeId);
      } else {
        newSet.add(moveframeId);
      }
      return newSet;
    });
  };

  // Open work type modal for a moveframe
  const handleOpenWorkTypeModal = (moveframe: any) => {
    setWorkTypeMoveframe(moveframe);
    setShowWorkTypeModal(true);
  };

  // Save work type
  const handleSaveWorkType = async (workType: 'NONE' | 'MAIN' | 'SECONDARY') => {
    if (!workTypeMoveframe) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/workouts/moveframes/${workTypeMoveframe.id}/set-work-type`, {
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
  // ☑, ⋮⋮, #, MF, Color section, Name section, Moveframe description, Duration, Rip, Macro, Alarm & Sound, Options
  const defaultColumnOrder = ['checkbox', 'drag', 'expand', 'index', 'mf', 'color', 'section', 'description', 'duration', 'rip', 'macro', 'alarm', 'options', 'code_section', 'action', 'dist', 'style', 'speed', 'time', 'pace', 'rec', 'rest_to', 'aim_snd', 'sport', 'annotation', 'annotations'];

  // Column visibility helper
  const isColumnVisible = (columnId: string) => {
    if (!columnSettings) return true; // Show all if no settings
    const visible = columnSettings.isColumnVisible('moveframe', columnId);
    // If column ID is not in saved settings, show it by default
    return visible !== false;
  };

  // Get column order
  const getColumnOrder = () => {
    if (!columnSettings) {
      return defaultColumnOrder;
    }
    const order = columnSettings.getColumnOrder('moveframe');
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
      checkbox: <th key="checkbox" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '18px' }} title="Select moveframe">☑</th>,
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
      mf: <th key="mf" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '25px' }}>MF</th>,
      section: <th key="section" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '96px' }}>Section</th>,
      sport: <th key="sport" className="border border-gray-200 px-1 py-1 text-left text-sm font-bold" style={{ width: '48px' }}>Sport</th>,
      description: <th key="description" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '623px' }}>Description</th>,
      duration: <th key="duration" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '42px' }}>Dur</th>,
      rip: <th key="rip" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '45px' }}>Rip\sets</th>,
      macro: <th key="macro" className="border border-gray-200 px-1 py-1 text-center text-sm font-bold" style={{ width: '32px' }}>Macro</th>,
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
    console.log('📊 Moveframe Table Columns:', {
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
    
    const oldIndex = orderedMoveframes.findIndex((mf: any) => mf.id === active.id);
    const newIndex = orderedMoveframes.findIndex((mf: any) => mf.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Reorder array
    const newOrder = [...orderedMoveframes];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);
    
    // Reassign letters alphabetically
    const updatedOrder = newOrder.map((mf, index) => ({
      ...mf,
      letter: String.fromCharCode(65 + index) // A, B, C, D...
    }));
    
    // Update local state immediately for smooth UX
    setOrderedMoveframes(updatedOrder);
    
    // Persist the new order to database
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        alert('Authentication required. Please log in again.');
        setOrderedMoveframes(moveframes);
        return;
      }

      const response = await fetch('/api/workouts/moveframes/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moveframes: updatedOrder.map((mf: any) => ({
            id: mf.id,
            letter: mf.letter
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to persist moveframe order:', error);
        alert('Failed to save moveframe order. Please try again.');
        // Revert to original order on error
        setOrderedMoveframes(moveframes);
      } else {
        const result = await response.json();
        console.log('✅ Moveframe order persisted:', result);
        console.log('📝 New moveframe order:', updatedOrder.map((mf: any) => mf.letter).join(', '));
      }
    } catch (error) {
      console.error('❌ Error calling reorder API:', error);
      alert('Network error while saving moveframe order. Please check your connection.');
      // Revert to original order on error
      setOrderedMoveframes(moveframes);
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
            title="Toggle moveframes visibility"
          >
            {isExpanded ? '▼' : '►'}
          </button>
          <span className="font-bold text-sm text-purple-900">Moveframes</span>
          <span className="text-xs text-purple-700 bg-purple-300 px-2 py-0.5 rounded">
            {moveframes.length} total
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onAddMoveframe) {
                onAddMoveframe();
              }
            }}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            title="Add a Moveframe"
          >
            Add a Moveframe
          </button>
          {/* Action Buttons - Now beside Add button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (moveframes.length > 0 && onCopyMoveframe) {
                onCopyMoveframe(moveframes, workout, day);
              } else {
                alert('No moveframes to copy');
              }
            }}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            title="Copy all moveframes"
          >
            Copy
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (moveframes.length > 0 && onMoveMoveframe) {
                onMoveMoveframe(moveframes, workout, day);
              } else {
                alert('No moveframes to move');
              }
            }}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            title="Move all moveframes"
          >
            Move
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete all moveframes in this workout?')) {
                moveframes.forEach((mf: any) => onDeleteMoveframe?.(mf));
              }
            }}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            title="Delete all moveframes"
          >
            Del
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenColumnSettings) {
                onOpenColumnSettings('moveframe');
              }
            }}
            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            title="Configure columns"
          >
            ⚙ Col
          </button>
        </div>

        {/* Moveframes Table */}
        {isExpanded && (
          <SortableContext
            items={orderedMoveframes.map((mf: any) => mf.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-2">
              <div className="overflow-x-auto overflow-y-visible table-scrollbar">
                <table className="text-xs bg-white" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '1400px', width: '100%' }}>
                  <thead className="bg-purple-300 text-purple-900">
                    <tr>
                      {orderedVisibleColumns.map(columnId => renderColumnHeader(columnId))}
                    </tr>
                  </thead>
                <tbody>
                  {orderedMoveframes.map((moveframe: any, mfIndex: number) => {
                    // Expand movelaps if: explicitly expanded OR autoExpandAll is true
                    const isMovelapsExpanded = autoExpandAll || expandedMoveframes.has(moveframe.id);
                    
                    return (
                      <SortableMoveframeRow
                        key={moveframe.id}
                        moveframe={moveframe}
                        mfIndex={mfIndex}
                        iconType={iconType}
                        isMovelapsExpanded={isMovelapsExpanded}
                        isChecked={checkedMoveframes.has(moveframe.id)}
                        onToggleCheck={() => toggleMoveframeCheck(moveframe.id)}
                        onToggleExpand={() => {
                          setExpandedMoveframes(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(moveframe.id)) {
                              newSet.delete(moveframe.id);
                            } else {
                              newSet.add(moveframe.id);
                            }
                            return newSet;
                          });
                        }}
                        onNavigateToMoveframe={(moveframeId) => setExpandedMoveframes(prev => new Set([...Array.from(prev), moveframeId]))}
                        onEditMoveframe={onEditMoveframe}
                        onDeleteMoveframe={onDeleteMoveframe}
                        onEditMovelap={onEditMovelap}
                        onDeleteMovelap={onDeleteMovelap}
                        onAddMovelap={onAddMovelap}
                        onAddMovelapAfter={onAddMovelapAfter}
                        onAddMoveframeAfter={onAddMoveframeAfter}
                        onCopyMoveframe={onCopyMoveframe}
                        onMoveMoveframe={onMoveMoveframe}
                        onSetWorkType={handleOpenWorkTypeModal}
                        onRefresh={onRefreshWorkouts}
                        workout={workout}
                        day={day}
                        setShowInfoPanel={setShowInfoPanel}
                        setSelectedMoveframe={setSelectedMoveframe}
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

      {/* Moveframe Info Panel */}
      {showInfoPanel && selectedMoveframe && (
        <MoveframeInfoPanel
          isOpen={showInfoPanel}
          onClose={() => {
            setShowInfoPanel(false);
            setSelectedMoveframe(null);
          }}
          moveframe={selectedMoveframe}
          workout={workout}
          day={day}
          onEdit={() => {
            setShowInfoPanel(false);
            if (onEditMoveframe) onEditMoveframe(selectedMoveframe);
          }}
          onCopy={() => {
            setShowInfoPanel(false);
            if (onCopyMoveframe) onCopyMoveframe(selectedMoveframe, workout, day);
          }}
          onMove={() => {
            setShowInfoPanel(false);
            if (onMoveMoveframe) onMoveMoveframe(selectedMoveframe, workout, day);
          }}
          onDelete={() => {
            setShowInfoPanel(false);
            if (onDeleteMoveframe) onDeleteMoveframe(selectedMoveframe);
          }}
          onAddMovelap={() => {
            setShowInfoPanel(false);
            if (onAddMovelap) onAddMovelap(selectedMoveframe);
          }}
          onBulkAddMovelaps={() => {
            alert('Bulk Add Movelaps feature - integration in progress');
            setShowInfoPanel(false);
          }}
          onEditMovelap={(movelap) => {
            setShowInfoPanel(false);
            if (onEditMovelap) onEditMovelap(movelap, selectedMoveframe);
          }}
          onDeleteMovelap={(movelap) => {
            if (onDeleteMovelap) onDeleteMovelap(movelap, selectedMoveframe);
          }}
        />
      )}

      {/* Set Work Type Modal */}
      {showWorkTypeModal && workTypeMoveframe && (
        <SetWorkTypeModal
          moveframe={workTypeMoveframe}
          onClose={() => {
            setShowWorkTypeModal(false);
            setWorkTypeMoveframe(null);
          }}
          onSave={handleSaveWorkType}
        />
      )}
    </>
  );
}

