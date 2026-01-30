'use client';

import React from 'react';
import { Settings, GripVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTableColumns } from '@/hooks/useTableColumns';
import { useColorSettings } from '@/hooks/useColorSettings';
import TableColumnConfig from '../TableColumnConfig';
import { formatMoveframeType } from '@/constants/moveframe.constants';

// 2026-01-22 14:45 UTC - Helper to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface MoveframeTableProps {
  day: any;
  workout: any;
  moveframe: any;
  workoutIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddMovelap: () => void;
  onAddMoveframe: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
}

export default function MoveframeTable({
  day,
  workout,
  moveframe,
  workoutIndex,
  onEdit,
  onDelete,
  onAddMovelap,
  onAddMoveframe,
  onToggleExpand,
  isExpanded
}: MoveframeTableProps) {
  const {
    visibleColumns,
    visibleColumnCount,
    toggleColumn,
    resetToDefault,
    isConfigModalOpen,
    setIsConfigModalOpen,
    columns
  } = useTableColumns('moveframe');
  const { colors, getBorderStyle } = useColorSettings();

  // Draggable hook for moveframe dragging
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragNodeRef,
    isDragging,
    transform: dragTransform
  } = useDraggable({
    id: `moveframe-${moveframe.id}`,
    data: {
      type: 'moveframe',
      moveframe: moveframe,
      workout: workout,
      day: day
    }
  });

  // Droppable hook for dropping other moveframes before/after this one
  const {
    setNodeRef: setDropNodeRef,
    isOver: isDropOver
  } = useDroppable({
    id: `moveframe-drop-${moveframe.id}`,
    data: {
      type: 'moveframe',
      moveframe: moveframe,
      workout: workout,
      day: day
    }
  });

  // Parse annotation colors from notes if type is ANNOTATION
  let annotationColors = null;
  if (moveframe.type === 'ANNOTATION' && moveframe.notes) {
    try {
      // Only parse if notes looks like JSON (starts with '{')
      if (typeof moveframe.notes === 'string' && moveframe.notes.trim().startsWith('{')) {
        annotationColors = JSON.parse(moveframe.notes);
      }
    } catch (e) {
      // Silently fail for malformed JSON - use default colors
      annotationColors = null;
    }
  }

  // Helper function to get cell value
  const getCellValue = (column: any) => {
    switch (column.id) {
      case 'mf':
        return moveframe.letter || moveframe.code || 'A';
      case 'color':
        return (
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: moveframe.section?.color || moveframe.color || '#10b981',
            border: '1px solid #666'
          }}></span>
        );
      case 'type':
        return moveframe.section?.name || formatMoveframeType(moveframe.type) || 'Warm up';
      case 'sport':
        return moveframe.sport || 'Swim';
      case 'description':
        // For manual mode with priority, show full content from notes
        // For manual mode WITHOUT priority, show blank (user wants to hide content)
        // Otherwise show description
        // 2026-01-22 14:45 UTC - Strip circuit tags from all content
        const rawContent = (moveframe.manualMode && moveframe.manualPriority)
          ? (moveframe.notes || moveframe.description || '100s * 10 A2 R20*')
          : (moveframe.manualMode && !moveframe.manualPriority)
          ? '' // Blank for manual mode without priority
          : (moveframe.description || '100s * 10 A2 R20*');
        const content = stripCircuitTags(rawContent);
        console.log('📝 Description column:', {
          moveframeId: moveframe.id,
          manualMode: moveframe.manualMode,
          manualPriority: moveframe.manualPriority,
          hasNotes: !!moveframe.notes,
          notesLength: moveframe.notes?.length || 0,
          hasDescription: !!moveframe.description,
          descriptionLength: moveframe.description?.length || 0,
          contentLength: content?.length || 0,
          willShowBlank: moveframe.manualMode && !moveframe.manualPriority
        });
        return content;
      case 'repetitions':
        // For manual mode moveframes in series-based sports, show moveframe.repetitions
        // For normal moveframes, show movelaps count
        if (moveframe.manualMode) {
          return moveframe.repetitions || '0';
        }
        return moveframe.movelaps?.length || '0';
      case 'total_distance':
        // Check if this is a time-based moveframe (Type of execution = Time)
        const firstMovelap = moveframe.movelaps?.[0];
        if (firstMovelap?.time && firstMovelap.time !== '0h00\'00"0') {
          // Show time (duration) for time-based moveframes
          return firstMovelap.time;
        }
        // Show total distance for distance-based moveframes
        return (moveframe.movelaps || []).reduce((sum: number, lap: any) => sum + (parseInt(lap.distance) || 0), 0);
      case 'macro':
        return moveframe.macroFinal || '—';
      case 'alarm':
        return moveframe.alarm?.toString() || '—';
      case 'notes':
        // 2026-01-22 14:45 UTC - Strip circuit tags from notes
        return stripCircuitTags(moveframe.notes);
      default:
        return '—';
    }
  };

  return (
    <>
      <div className="mb-2 ml-4">
        <table 
          className="border-collapse shadow-sm text-sm" 
          style={{ 
            tableLayout: 'fixed', 
            width: '650px',
            backgroundColor: colors.moveframeHeader,
            border: getBorderStyle('moveframe') || '1px solid #e5e7eb'
          }}
        >
          {/* Title Row */}
          <thead style={{ backgroundColor: colors.moveframeHeader }}>
            <tr>
              <th colSpan={visibleColumnCount + 1} className="border border-gray-200 px-2 py-1 text-left text-base" style={{ color: colors.moveframeHeaderText }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onToggleExpand}
                      className="hover:opacity-70 rounded p-1"
                      style={{ color: colors.moveframeHeaderText }}
                    >
                      {isExpanded ? '▼' : '►'}
                    </button>
                  <span className="font-bold text-base">
                    Moveframes of workout #{workoutIndex + 1}
                  </span>
                  <span className="ml-2 text-base" style={{ color: colors.moveframeHeaderText }}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm" style={{ color: colors.moveframeHeaderText }}>Options:</span>
                  <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                        }}
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{
                          backgroundColor: colors.buttonEdit,
                          color: colors.buttonEditHeaderText
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonEditHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonEdit}
                      >
                        MF Info
                      </button>
                      <button 
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{
                          backgroundColor: colors.buttonAdd,
                          color: colors.buttonAddHeaderText
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonAddHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonAdd}
                      >
                        Copy
                      </button>
                      <button 
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{
                          backgroundColor: colors.buttonAdd,
                          color: colors.buttonAddHeaderText
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonAddHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonAdd}
                      >
                        Move
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        className="px-2 py-1 text-xs rounded transition-colors"
                        style={{
                          backgroundColor: colors.buttonDelete,
                          color: colors.buttonDeleteHeaderText
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.buttonDeleteHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.buttonDelete}
                      >
                        Del
                      </button>
                  </div>
                </div>
                  <button
                    onClick={() => setIsConfigModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: colors.buttonPrint,
                      color: colors.buttonPrintHeaderText
                    }}
                    title="Configure columns"
                  >
                    <Settings size={14} />
                    Columns
                  </button>
                </div>
              </th>
            </tr>
            {/* Column Headers */}
            <tr style={{ backgroundColor: colors.moveframeHeader, filter: 'brightness(0.95)' }}>
              {/* Drag Handle Header */}
              <th 
                className="border border-gray-200 px-1 py-1 text-center text-sm font-bold w-6"
                title="Drag handle"
              >
                ⋮⋮
              </th>
              
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="border border-gray-200 px-1 py-1 text-sm font-bold text-center"
                  style={{ 
                    width: column.id === 'description' ? '300px' : // Decreased by 1/3 from 450px
                           column.id === 'sport' ? '28px' :         // Decreased by additional 2/5 from 47px
                           column.id === 'mf' ? '40px' : 
                           column.id === 'type' ? '60px' :          // Compact Type/Section
                           column.id === 'repetitions' ? '45px' :   // Compact Rip\Sets
                           column.id === 'total_distance' ? '50px' : // Compact Duration/Distance
                           column.id === 'macro' ? '50px' :         // Compact Macro
                           column.id === 'alarm' ? '50px' :         // Compact Alarm
                           '70px'
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr 
              ref={setDropNodeRef}
              className={`cursor-pointer ${
                annotationColors ? '' : 'hover:bg-purple-100'
              } ${
                isDragging ? 'opacity-50 bg-purple-200' : ''
              } ${
                isDropOver ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''
              }`}
              style={annotationColors ? {
                backgroundColor: annotationColors.headerBgColor || '#5168c2',
                color: annotationColors.textBgColor || '#ffffff'
              } : {}}
              onClick={onToggleExpand}
              title={isExpanded ? "Click to collapse movelaps" : "Click to expand movelaps | Drop moveframe here"}
            >
              {/* Drag Handle Cell */}
              <td className="border border-gray-200 px-1 py-1 text-center w-6">
                <span
                  ref={setDragNodeRef}
                  {...dragAttributes}
                  {...dragListeners}
                  className="cursor-move text-purple-600 hover:text-purple-800 transition-colors inline-block"
                  title="Drag to move moveframe"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} />
                </span>
              </td>
              
              {visibleColumns.map((column) => {
                const cellValue = getCellValue(column);
                const isHtml = column.id === 'description' && typeof cellValue === 'string' && cellValue.includes('<');
                
                return (
                  <td
                    key={column.id}
                    className={`border border-gray-200 px-1 py-1 text-xs text-center overflow-hidden ${
                      column.id === 'mf' ? 'font-bold' : ''
                    }`}
                    style={{ 
                      width: column.id === 'description' ? '500px' : column.id === 'mf' ? '40px' : '70px'
                    }}
                  >
                    {isHtml ? (
                      <div 
                        className="break-words whitespace-normal" 
                        dangerouslySetInnerHTML={{ __html: cellValue }}
                        title={cellValue.replace(/<[^>]*>/g, '')}
                      />
                    ) : (
                      <div className={column.id === 'description' ? 'break-words whitespace-normal' : ''} title={String(cellValue)}>
                        {cellValue}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Column Configuration Modal */}
      <TableColumnConfig
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        columns={columns}
        onToggleColumn={toggleColumn}
        onResetToDefault={resetToDefault}
        tableTitle="Moveframe"
      />
    </>
  );
}

