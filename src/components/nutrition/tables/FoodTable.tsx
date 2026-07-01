'use client';

import React from 'react';
import { Settings, GripVertical } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useTableColumns } from '@/hooks/useTableColumns';
import { useColorSettings } from '@/hooks/useColorSettings';
import TableColumnConfig from '../TableColumnConfig';
import { formatNutritionFoodType } from '@/constants/nutrition-food.constants';
import { stripInternalWorkoutTags, stripCircuitCompactExerciseTrail } from '@/utils/sanitizeNutritionHtml';
import {
  computeAnaerobicFastPlannerRowStats,
  computeNutritionFoodAvePauseSeconds,
  formatAvePauseFromSeconds
} from '@/utils/nutrition-moveframeAvePause';
import { computeCircuitRipSetsCount } from '@/utils/circuitMovelapPause';
import {
  isAerobicFastPlannerContext,
  resolveAerobicMoveframeDistanceDescription
} from '@/utils/aerobicFastPlannerDescription';

const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return stripInternalWorkoutTags(content).trim();
};

const extractFastPlannerDataFromNotes = (notes: unknown): any | null => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[FAST_PLANNER_DATA\]([\s\S]*?)\[\/FAST_PLANNER_DATA\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

interface NutritionFoodTableProps {
  day: any;
  workout: any;
  nutritionFood: any;
  workoutIndex: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddNutritionComponent: () => void;
  onAddNutritionFood: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
}

export default function NutritionFoodTable({
  day,
  workout,
  nutritionFood,
  workoutIndex,
  onEdit,
  onDelete,
  onAddNutritionComponent,
  onAddNutritionFood,
  onToggleExpand,
  isExpanded
}: NutritionFoodTableProps) {
  const {
    visibleColumns,
    visibleColumnCount,
    toggleColumn,
    resetToDefault,
    isConfigModalOpen,
    setIsConfigModalOpen,
    columns
  } = useTableColumns('nutritionFood');
  const { colors, getBorderStyle } = useColorSettings();

  // Draggable hook for nutritionFood dragging
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragNodeRef,
    isDragging,
    transform: dragTransform
  } = useDraggable({
    id: `nutritionFood-${nutritionFood.id}`,
    data: {
      type: 'nutritionFood',
      nutritionFood: nutritionFood,
      workout: workout,
      day: day
    }
  });

  // Droppable hook for dropping other nutritionFoods before/after this one
  const {
    setNodeRef: setDropNodeRef,
    isOver: isDropOver
  } = useDroppable({
    id: `nutritionFood-drop-${nutritionFood.id}`,
    data: {
      type: 'nutritionFood',
      nutritionFood: nutritionFood,
      workout: workout,
      day: day
    }
  });

  const fastPlannerPayloadForAve = React.useMemo(
    () => extractFastPlannerDataFromNotes(nutritionFood.notes) ?? nutritionFood.fastPlannerData ?? null,
    [nutritionFood.notes, nutritionFood.fastPlannerData]
  );
  const isFastPlanNutritionFoodForAve = React.useMemo(
    () =>
      nutritionFood.type === 'BATTERY' &&
      !nutritionFood.isCircuitBased &&
      ((typeof nutritionFood.notes === 'string' && nutritionFood.notes.includes('[FAST_PLANNER_DATA]')) ||
        !!fastPlannerPayloadForAve),
    [nutritionFood.type, nutritionFood.isCircuitBased, nutritionFood.notes, fastPlannerPayloadForAve]
  );
  const anaerobicStatsForAve = React.useMemo(() => {
    if (!isFastPlanNutritionFoodForAve || !fastPlannerPayloadForAve || fastPlannerPayloadForAve.plannerType === 'aerobic')
      return null;
    return computeAnaerobicFastPlannerRowStats(fastPlannerPayloadForAve, nutritionFood.nutritionComponents);
  }, [isFastPlanNutritionFoodForAve, fastPlannerPayloadForAve, nutritionFood.nutritionComponents]);
  const nutritionFoodAvePauseSeconds = React.useMemo(
    () =>
      computeNutritionFoodAvePauseSeconds(
        nutritionFood,
        anaerobicStatsForAve,
        fastPlannerPayloadForAve,
        isFastPlanNutritionFoodForAve
      ),
    [nutritionFood, anaerobicStatsForAve, fastPlannerPayloadForAve, isFastPlanNutritionFoodForAve]
  );

  // Parse annotation colors from notes if type is ANNOTATION
  let annotationColors = null;
  if (nutritionFood.type === 'ANNOTATION' && nutritionFood.notes) {
    try {
      // Only parse if notes looks like JSON (starts with '{')
      if (typeof nutritionFood.notes === 'string' && nutritionFood.notes.trim().startsWith('{')) {
        annotationColors = JSON.parse(nutritionFood.notes);
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
        return nutritionFood.letter || nutritionFood.code || 'A';
      case 'color':
        return (
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: nutritionFood.section?.color || nutritionFood.color || '#10b981',
            border: '1px solid #666'
          }}></span>
        );
      case 'type':
        return nutritionFood.section?.name || formatNutritionFoodType(nutritionFood.type) || 'Warm up';
      case 'sport':
        return nutritionFood.sport || 'Swim';
      case 'description':
        {
        const fastPlannerPayload = extractFastPlannerDataFromNotes(nutritionFood.notes) ?? nutritionFood.fastPlannerData ?? null;
        const isFastPlanNutritionFood =
          nutritionFood.type === 'BATTERY' &&
          !nutritionFood.isCircuitBased &&
          ((typeof nutritionFood.notes === 'string' && nutritionFood.notes.includes('[FAST_PLANNER_DATA]')) ||
            !!fastPlannerPayload);
        if (isFastPlanNutritionFood) {
          const isAerobic = isAerobicFastPlannerContext(
            fastPlannerPayload,
            nutritionFood.nutritionComponents
          );
          const line1 = isAerobic
            ? resolveAerobicMoveframeDistanceDescription(
                fastPlannerPayload,
                nutritionFood.nutritionComponents
              )
            : (nutritionFood.nutritionComponents || [])
                .map((lap: any) => {
                  const val = lap.reps ?? lap.distance ?? lap.weight ?? '';
                  const sp = lap.speed ?? lap.pace ?? '';
                  if (val === '' && sp === '') return '';
                  return `${String(val || '?')}\\${String(sp || '?')}`;
                })
                .filter(Boolean)
                .join('+');
          const line2 =
            (typeof fastPlannerPayload?.descriptionInstructions === 'string'
              ? fastPlannerPayload.descriptionInstructions.trim()
              : '') ||
            stripCircuitTags(
              typeof nutritionFood.notes === 'string'
                ? nutritionFood.notes
                    .replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '')
                    .replace(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/g, '')
                : ''
            );
          return (
            <div className="text-left text-sm">
              {line1 ? <div className="font-medium">{line1}</div> : null}
              {line2 ? <div className="text-gray-600">{line2}</div> : null}
              {!line1 && !line2 ? 'No description' : null}
            </div>
          );
        }
        // For manual mode with priority, show full content from notes
        // For manual mode WITHOUT priority, show blank (user wants to hide content)
        // Otherwise show description
        // 2026-01-22 14:45 UTC - Strip circuit tags from all content
        const rawContent = (nutritionFood.manualMode && nutritionFood.manualPriority)
          ? (nutritionFood.notes || nutritionFood.description || '100s * 10 A2 R20*')
          : (nutritionFood.manualMode && !nutritionFood.manualPriority)
          ? '' // Blank for manual mode without priority
          : (nutritionFood.description || '100s * 10 A2 R20*');
        const content = stripCircuitTags(rawContent);
        const displayContent =
          nutritionFood.isCircuitBased ? stripCircuitCompactExerciseTrail(content) : content;
        const groupedAerobicLine = resolveAerobicMoveframeDistanceDescription(
          fastPlannerPayload,
          nutritionFood.nutritionComponents
        );
        if (groupedAerobicLine) {
          const brIndex = displayContent.indexOf('<br');
          const nlIndex = displayContent.indexOf('\n');
          const splitAt = brIndex >= 0 ? brIndex : nlIndex >= 0 ? nlIndex : -1;
          const noteLine =
            splitAt >= 0
              ? displayContent
                  .slice(splitAt)
                  .replace(/<br\s*\/?>/gi, '\n')
                  .replace(/<[^>]+>/g, '')
                  .trim()
              : '';
          return (
            <div className="text-left text-sm">
              <div className="font-medium">{groupedAerobicLine}</div>
              {noteLine ? <div className="text-gray-600">{noteLine}</div> : null}
            </div>
          );
        }
        console.log('📝 Description column:', {
          nutritionFoodId: nutritionFood.id,
          manualMode: nutritionFood.manualMode,
          manualPriority: nutritionFood.manualPriority,
          hasNotes: !!nutritionFood.notes,
          notesLength: nutritionFood.notes?.length || 0,
          hasDescription: !!nutritionFood.description,
          descriptionLength: nutritionFood.description?.length || 0,
          contentLength: displayContent?.length || 0,
          willShowBlank: nutritionFood.manualMode && !nutritionFood.manualPriority
        });
        return displayContent;
        }
      case 'repetitions':
        // For manual mode nutritionFoods in series-based sports, show nutritionFood.repetitions
        // For circuit nutritionFoods, show average reps per series (total reps ÷ repetitions / rounds)
        if (nutritionFood.manualMode) {
          return nutritionFood.repetitions || '0';
        }
        if (nutritionFood.isCircuitBased) {
          const ripSets = computeCircuitRipSetsCount({
            notes: nutritionFood.notes,
            movelaps: nutritionFood.nutritionComponents,
          });
          if (ripSets != null && ripSets > 0) return String(ripSets);
          return '—';
        }
        return nutritionFood.nutritionComponents?.length || '0';
      case 'total_distance':
        // Check if this is a time-based nutritionFood (Type of execution = Time)
        const firstNutritionComponent = nutritionFood.nutritionComponents?.[0];
        if (firstNutritionComponent?.time && firstNutritionComponent.time !== '0h00\'00"0') {
          // Show time (duration) for time-based nutrition_foods
          return firstNutritionComponent.time;
        }
        // Show total distance for distance-based nutrition_foods
        return (nutritionFood.nutritionComponents || []).reduce((sum: number, lap: any) => sum + (parseInt(lap.distance) || 0), 0);
      case 'macro': {
        if (nutritionFoodAvePauseSeconds != null && nutritionFoodAvePauseSeconds > 0) {
          return formatAvePauseFromSeconds(nutritionFoodAvePauseSeconds);
        }
        return '—';
      }
      case 'alarm':
        return nutritionFood.alarm?.toString() || '—';
      case 'notes':
        // 2026-01-22 14:45 UTC - Strip circuit tags from notes
        return stripCircuitTags(nutritionFood.notes);
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
                    NutritionFoods of workout #{workoutIndex + 1}
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
              title={isExpanded ? "Click to collapse nutrition_components" : "Click to expand nutritionComponents | Drop nutritionFood here"}
            >
              {/* Drag Handle Cell */}
              <td className="border border-gray-200 px-1 py-1 text-center w-6">
                <span
                  ref={setDragNodeRef}
                  {...dragAttributes}
                  {...dragListeners}
                  className="cursor-move text-purple-600 hover:text-purple-800 transition-colors inline-block"
                  title="Drag to move nutritionFood"
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
        tableTitle="NutritionFood"
      />
    </>
  );
}

