import React from 'react';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import NutritionComponentDetailTable from './ComponentDetailTable';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { getSportDisplayName, DISTANCE_BASED_SPORTS } from '@/constants/nutrition-food.constants';
import { stripInternalWorkoutTags, stripCircuitCompactExerciseTrail } from '@/utils/sanitizeNutritionHtml';
import { nutritionComponentPauseFieldLabel } from '@/utils/restTypeDb';
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

interface SortableNutritionFoodRowProps {
  nutritionFood: any;
  mfIndex: number;
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  isNutritionComponentsExpanded: boolean;
  isChecked: boolean;
  onToggleCheck: () => void;
  onToggleExpand: () => void;
  onEditNutritionFood?: (nutritionFood: any) => void;
  onDeleteNutritionFood?: (nutritionFood: any) => void;
  onEditNutritionComponent?: (nutritionComponent: any, nutritionFood: any, workout?: any, day?: any) => void;
  onDeleteNutritionComponent?: (nutritionComponent: any, nutritionFood: any) => void;
  onAddNutritionComponent?: (nutritionFood: any) => void;
  onAddNutritionComponentAfter?: (nutritionComponent: any, index: number, nutritionFood: any, workout: any, day: any) => void;
  onAddNutritionFoodAfter?: (nutritionFood: any, index: number, workout: any, day: any) => void;
  onCopyNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onMoveNutritionFood?: (nutritionFood: any, workout: any, day: any) => void;
  onSetWorkType?: (nutritionFood: any) => void;
  onRefresh?: () => void;
  workout: any;
  day: any;
  setShowInfoPanel: (show: boolean) => void;
  setSelectedNutritionFood: (nutritionFood: any) => void;
  orderedVisibleColumns?: string[];
  onNavigateToNutritionFood?: (nutritionFoodId: string) => void; // For navigation between nutrition_foods
}

export default function SortableNutritionFoodRow({
  nutritionFood,
  mfIndex,
  iconType: iconTypeProp,
  isNutritionComponentsExpanded,
  isChecked,
  onToggleCheck,
  onToggleExpand,
  onEditNutritionFood,
  onDeleteNutritionFood,
  onEditNutritionComponent,
  onDeleteNutritionComponent,
  onAddNutritionComponent,
  onAddNutritionComponentAfter,
  onAddNutritionFoodAfter,
  onCopyNutritionFood,
  onMoveNutritionFood,
  onSetWorkType,
  onRefresh,
  workout,
  day,
  setShowInfoPanel,
  setSelectedNutritionFood,
  orderedVisibleColumns,
  onNavigateToNutritionFood
}: SortableNutritionFoodRowProps) {
  // Disable sorting for annotation nutrition_foods
  const isAnnotation = nutritionFood.type === 'ANNOTATION';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: nutritionFood.id,
    disabled: isAnnotation, // Disable drag for annotations
    data: {
      type: 'nutritionFood',
      nutritionFood: nutritionFood,
      workout: workout,
      day: day
    }
  });
  
  // Droppable for receiving other nutrition_foods
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
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 9999 : 1,
    position: 'relative' as const,
    cursor: isDragging ? 'grabbing' : 'auto',
  };
  
  // Get icon type preference from prop or hook
  const defaultIconType = useSportIconType();
  const iconType = iconTypeProp || defaultIconType;
  const useImageIcons = isImageIcon(iconType);
  
  const nutrition_componentsCount = nutritionFood.nutritionComponents?.length || 0;
  const totalDistance = (nutritionFood.nutritionComponents || []).reduce(
    (sum: number, lap: any) => sum + (parseInt(lap.distance) || 0),
    0
  );

  const fastPlannerPayloadMemo =
    extractFastPlannerDataFromNotes(nutritionFood.notes) ?? nutritionFood.fastPlannerData ?? null;
  const isFastPlanNutritionFoodMemo =
    nutritionFood.type === 'BATTERY' &&
    !nutritionFood.isCircuitBased &&
    (fastPlannerPayloadMemo != null ||
      (typeof nutritionFood.description === 'string' &&
        nutritionFood.description.toLowerCase().startsWith('fast planner')) ||
      (typeof nutritionFood.notes === 'string' && nutritionFood.notes.includes('[FAST_PLANNER_DATA]')));

  const anaerobicFastPlannerStats = React.useMemo(() => {
    if (!isFastPlanNutritionFoodMemo || !fastPlannerPayloadMemo) return null;
    if (fastPlannerPayloadMemo.plannerType === 'aerobic') return null;
    return computeAnaerobicFastPlannerRowStats(fastPlannerPayloadMemo, nutritionFood.nutritionComponents);
  }, [isFastPlanNutritionFoodMemo, fastPlannerPayloadMemo, nutritionFood.nutritionComponents]);

  const nutritionFoodAvePauseSeconds = React.useMemo(
    () =>
      computeNutritionFoodAvePauseSeconds(
        nutritionFood,
        anaerobicFastPlannerStats,
        fastPlannerPayloadMemo,
        isFastPlanNutritionFoodMemo
      ),
    [nutritionFood, anaerobicFastPlannerStats, fastPlannerPayloadMemo, isFastPlanNutritionFoodMemo]
  );
  
  const sectionColor = nutritionFood.section?.color || '#5b8def';
  const sectionName = nutritionFood.section?.name || 'Default';
  const sportIcon = getSportIcon(nutritionFood.sport || 'SWIM', iconType);
  const sportName = getSportDisplayName(nutritionFood.sport || 'SWIM');
  
  // Get annotation colors (if set)
  const hasAnnotation = nutritionFood.annotationBgColor || nutritionFood.annotationTextColor;

  // Hover popup state for nutritionFood letter
  const [hoveredNutritionFood, setHoveredNutritionFood] = React.useState<any>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isHoveringPopup, setIsHoveringPopup] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  /** Hide nutritionFood summary row while anaerobic fast-planner nutritionComponent editor modal is open (see NutritionComponentDetailTable). */
  const [hideFpSummaryWhileNutritionComponentEdit, setHideFpSummaryWhileNutritionComponentEdit] = React.useState(false);
  const hideNutritionFoodSummaryForFpNutritionComponentModal =
    hideFpSummaryWhileNutritionComponentEdit &&
    isFastPlanNutritionFoodMemo &&
    fastPlannerPayloadMemo?.plannerType !== 'aerobic';
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Manual content popup state
  const [showManualPopup, setShowManualPopup] = React.useState(false);
  const [manualPopupContent, setManualPopupContent] = React.useState('');
  
  // Options dropdown state
  const [showOptionsDropdown, setShowOptionsDropdown] = React.useState(false);
  const [buttonRect, setButtonRect] = React.useState<DOMRect | null>(null);
  const optionsButtonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  // Calculate button position when dropdown opens
  const handleOpenDropdown = () => {
    if (optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      setButtonRect(rect);
      setShowOptionsDropdown(true);
    }
  };
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsDropdown && dropdownRef.current && optionsButtonRef.current) {
        const target = event.target as Node;
        // Only close if clicking outside both the dropdown and the button
        if (!dropdownRef.current.contains(target) && !optionsButtonRef.current.contains(target)) {
          setShowOptionsDropdown(false);
          setButtonRect(null);
        }
      }
    };
    
    if (showOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsDropdown]);

  // Default column order if not provided - should match NutritionFoodsSection
  const visibleColumns = orderedVisibleColumns || ['checkbox', 'drag', 'expand', 'index', 'mf', 'color', 'section', 'description', 'duration', 'rip', 'macro', 'alarm', 'options', 'code_section', 'action', 'dist', 'style', 'speed', 'time', 'pace', 'rec', 'rest_to', 'aim_snd', 'sport', 'annotation', 'annotations'];

  // Get annotation background color
  const annotationBgColor = isAnnotation ? (nutritionFood.annotationBgColor || '#5168c2') : null;
  const annotationTextColor = isAnnotation ? (nutritionFood.annotationTextColor || '#ffffff') : null;
  
  const renderCell = (columnId: string) => {
    switch (columnId) {
      case 'checkbox':
        return (
          <td 
            key="checkbox" 
            className="border border-gray-200 px-1 py-1 text-center" 
            style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={onToggleCheck}
              className="w-4 h-4 cursor-pointer accent-purple-600"
              title="Select nutritionFood"
            />
          </td>
        );
      
      case 'drag':
        return (
           <td 
             key="drag" 
             className="border border-gray-200 text-center" 
             style={{
               width: '28px',
               padding: '0',
               ...(isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {})
             }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center w-8 h-8 rounded select-none transition-colors"
              style={{ touchAction: 'none' }}
              title="Drag to reorder nutritionFood"
              type="button"
            >
              <GripVertical size={18} />
            </button>
          </td>
        );
      
      case 'expand':
        return (
          <td key="expand" className="border border-gray-200 px-1 py-1 text-center text-gray-600 text-[10px] cursor-pointer" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}} onClick={onToggleExpand}>
            <span className="font-bold">{isNutritionComponentsExpanded ? '▼' : '►'}</span>
          </td>
        );
      
      case 'index':
        return (
          <td key="index" className="border border-gray-200 px-1 py-1 text-center font-bold text-sm" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {mfIndex + 1}
          </td>
        );
      
      case 'color':
        return (
          <td key="color" className="border border-gray-200 px-1 py-1 text-center" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            <div
              className="w-6 h-4 mx-auto rounded border border-gray-400"
              style={{ backgroundColor: sectionColor }}
              title={sectionName}
            />
          </td>
        );
      
      case 'code_section':
        return (
          <td key="code_section" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.section?.name || 'Default'}
          </td>
        );
      
      case 'action':
        return (
          <td key="action" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {getSportDisplayName(nutritionFood.sport || 'SWIM')}
          </td>
        );
      
      case 'dist':
        return (
          <td key="dist" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.nutritionComponents?.[0]?.distance || nutritionFood.customDistance || '—')}
          </td>
        );
      
      case 'style':
        return (
          <td key="style" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.nutritionComponents?.[0]?.style || nutritionFood.style || '—')}
          </td>
        );
      
      case 'speed':
        return (
          <td key="speed" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.nutritionComponents?.[0]?.speed || nutritionFood.speed || '—')}
          </td>
        );
      
      case 'time':
        return (
          <td key="time" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.nutritionComponents?.[0]?.time || nutritionFood.time || '—')}
          </td>
        );
      
      case 'pace':
        return (
          <td key="pace" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.nutritionComponents?.[0]?.pace || nutritionFood.pace || '—')}
          </td>
        );
      
      case 'rec':
        return (
          <td key="rec" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.pause ? `${nutritionFood.pause}"` : '—')}
          </td>
        );
      
      case 'rest_to':
        return (
          <td key="rest_to" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.restTo || '—')}
          </td>
        );
      
      case 'aim_snd':
        return (
          <td key="aim_snd" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {nutritionFood.type === 'ANNOTATION' ? '—' : (nutritionFood.alarm || nutritionFood.sound ? '🔔' : '—')}
          </td>
        );
      
      case 'annotations':
        return (
          <td 
            key="annotations" 
            className="border border-gray-200 px-1 py-1 text-center text-[10px]"
            style={{
              backgroundColor: nutritionFood.annotationBgColor || 'transparent',
              color: nutritionFood.annotationTextColor || 'inherit'
            }}
          >
            {nutritionFood.annotationText || '—'}
          </td>
        );
      
      case 'mf':
        // Colored circle around letter based on work type
        const getWorkTypeStyle = () => {
          if (nutritionFood.workType === 'MAIN') {
            return 'border-2 border-red-500 bg-red-50 text-red-700';
          } else if (nutritionFood.workType === 'SECONDARY') {
            return 'border-2 border-blue-500 bg-blue-50 text-blue-700';
          }
          return 'border border-gray-300';
        };
        
        const isMfManualMode = nutritionFood.manualMode === true;
        const mfHasHtmlContent = nutritionFood.description && nutritionFood.description.includes('<');
        
        return (
           <td 
             key="mf" 
             className="border border-gray-200 px-1 py-1 text-center cursor-pointer hover:bg-blue-100 transition-colors"
             style={{ width: '25px', ...isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {} }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Set work type on double click (for all nutritionFoods)
              if (onSetWorkType) {
                onSetWorkType(nutritionFood);
              }
            }}
            onMouseEnter={(e) => {
              // Clear any existing timeout
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredNutritionFood(nutritionFood);
              setPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
            }}
            onMouseLeave={() => {
              // Delay closing to allow mouse to move to popup
              hoverTimeoutRef.current = setTimeout(() => {
                if (!isHoveringPopup) {
                  setHoveredNutritionFood(null);
                  setPopupPosition(null);
                }
              }, 300);
            }}
            title="Double-click to set work type (Main/Secondary) | Hover to see full details"
          >
            <div className="relative inline-block">
              <div 
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${getWorkTypeStyle()}`}
              >
                {nutritionFood.letter || String.fromCharCode(65 + mfIndex)}
              </div>
              {/* Red-Yellow circle indicator for nutritionFoods with applied technique */}
              {nutritionFood.appliedTechnique && (
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ 
                    background: 'linear-gradient(135deg, #ef4444 50%, #eab308 50%)'
                  }}
                  title={`Technique: ${nutritionFood.appliedTechnique}`}
                />
              )}
            </div>
          </td>
        );
      
      case 'section':
        // Show workout section information (section name and color)
        return (
           <td key="section" className="border border-gray-200 px-1 py-1 text-center text-xs" style={{ width: '96px', ...isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {} }}>
            <div className="flex items-center justify-center gap-1">
              <div
                className="w-3 h-3 rounded-full border border-gray-400 flex-shrink-0"
                style={{ backgroundColor: sectionColor }}
                title={`Section: ${sectionName}`}
              />
              <span className="text-xs">{sectionName}</span>
            </div>
          </td>
        );
      
      case 'sport':
        return (
           <td key="sport" className="border border-gray-200 px-1 py-1 text-left" style={{ width: '48px', ...isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {} }}>
            <div className="flex items-center gap-1">
              {useImageIcons ? (
                <Image 
                  src={sportIcon} 
                  alt={sportName} 
                  width={20}
                  height={20}
                  className="w-5 h-5 object-cover rounded flex-shrink-0" 
                  unoptimized
                />
              ) : (
                <span className="text-base">{sportIcon}</span>
              )}
              <span className="text-xs">{sportName}</span>
            </div>
          </td>
        );
      
      case 'description':
        // Check if this is a manual mode nutritionFood
        const isManualMode = nutritionFood.manualMode === true;
        const hasManualPriority = nutritionFood.manualPriority === true;
        const isCircuitBased = nutritionFood.isCircuitBased === true;
        const rawContent = (isManualMode && hasManualPriority)
          ? (nutritionFood.notes || nutritionFood.description || '') 
          : isManualMode && !hasManualPriority
          ? ''
          : nutritionFood.description;
        const manualContent = stripCircuitTags(rawContent);
        const hasHtmlContent = manualContent && (manualContent.includes('<') || manualContent.includes('\n'));

        const fastPlannerPayload = extractFastPlannerDataFromNotes(nutritionFood.notes) ?? nutritionFood.fastPlannerData ?? null;
        const isAerobicFastPlan = isAerobicFastPlannerContext(
          fastPlannerPayload,
          nutritionFood.nutritionComponents
        );
        const isFastPlanNutritionFood = nutritionFood.type === 'BATTERY' && !nutritionFood.isCircuitBased &&
          (fastPlannerPayload != null ||
            (typeof nutritionFood.description === 'string' && nutritionFood.description.toLowerCase().startsWith('fast planner')) ||
            (typeof nutritionFood.notes === 'string' && nutritionFood.notes.includes('[FAST_PLANNER_DATA]')));
        /** Aerobic only: distance\\style or fallback nutritionComponent line. Anaerobic shows Tot. reps / Tot. series / Reps\\serie instead of raw reps\\pace. */
        const fastPlanDistancesLine = isFastPlanNutritionFood
          ? isAerobicFastPlan
            ? resolveAerobicMoveframeDistanceDescription(
                fastPlannerPayload,
                nutritionFood.nutritionComponents
              )
            : Array.isArray(nutritionFood.nutritionComponents) && nutritionFood.nutritionComponents.length > 0
            ? nutritionFood.nutritionComponents
                .map((lap: any) => {
                  const val = lap.reps ?? lap.distance ?? lap.weight ?? '';
                  const sp = lap.speed ?? lap.pace ?? '';
                  const v = val !== '' && val != null ? String(val) : '?';
                  const s = sp !== '' && sp != null ? String(sp) : '?';
                  return `${v}\\${s}`;
                })
                .join('+')
            : ''
          : '';
        const fastPlanUserNoteLine = isFastPlanNutritionFood
          ? (typeof fastPlannerPayload?.descriptionInstructions === 'string'
              ? fastPlannerPayload.descriptionInstructions.trim()
              : '') ||
            (typeof nutritionFood.notes === 'string'
              ? stripCircuitTags(
                  nutritionFood.notes
                    .replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '')
                    .replace(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/g, '')
                    .trim()
                )
              : '')
          : '';
        
        return (
          <td 
            key="description" 
            className={`border border-gray-200 px-2 py-1 text-center text-sm ${
              nutritionFood.type === 'ANNOTATION' && nutritionFood.annotationBold ? 'font-bold' : ''
            } ${isManualMode && hasManualPriority && manualContent && !isAnnotation ? 'cursor-pointer hover:bg-blue-50' : ''}`}
             style={{
               width: '623px',
               minWidth: '623px',
               maxWidth: '623px',
               overflow: 'hidden',
              ...(isAnnotation ? {
                backgroundColor: annotationBgColor || '#5168c2',
                color: annotationTextColor || '#ffffff'
              } : {})
            }}
            onClick={(e) => {
             if (isManualMode && hasManualPriority && manualContent) {
                e.stopPropagation();
                console.log('🔍 [SortableNutritionFoodRow] Opening popup with content:', {
                  contentLength: manualContent.length,
                  contentPreview: manualContent.substring(0, 100),
                  fullContent: manualContent,
                  nutritionFoodDescription: nutritionFood.description,
                  nutritionFoodNotes: nutritionFood.notes,
                  descriptionLength: nutritionFood.description?.length || 0,
                  notesLength: nutritionFood.notes?.length || 0
                });
                setManualPopupContent(manualContent);
                setShowManualPopup(true);
              }
            }}
           title={isManualMode && hasManualPriority && manualContent ? "Click to view full content" : ""}
          >
           {isFastPlanNutritionFood ? (
              <div className="text-left text-sm break-words">
                {!isAerobicFastPlan && anaerobicFastPlannerStats?.sectorPairs?.length ? (
                  <div
                    className="mb-1 flex max-h-10 flex-wrap gap-x-2 gap-y-0.5 text-xs font-medium leading-snug text-gray-900"
                    title={anaerobicFastPlannerStats.sectorSummaryLine}
                  >
                    {anaerobicFastPlannerStats.sectorPairs.map(({ name, series }) => (
                      <span key={name} className="whitespace-nowrap">
                        {name}
                        <span className="font-semibold text-teal-800"> {series}</span>
                        <span className="font-normal text-gray-600"> ser.</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                {!isAerobicFastPlan && anaerobicFastPlannerStats ? (
                  <div className="font-medium leading-snug text-gray-900">
                    Tot. reps {anaerobicFastPlannerStats.totalRepVolume} Tot. series{' '}
                    {anaerobicFastPlannerStats.totalSeries} Reps{'\\'}serie{' '}
                    {anaerobicFastPlannerStats.ripPerSetDisplay}
                  </div>
                ) : isAerobicFastPlan && fastPlanDistancesLine ? (
                  <div className="font-medium text-gray-900">{fastPlanDistancesLine}</div>
                ) : null}
                {fastPlanUserNoteLine ? (
                  <div className="mt-0.5 text-xs text-gray-600">{fastPlanUserNoteLine}</div>
                ) : null}
                {(() => {
                  const hasAnaerobicSectors =
                    !isAerobicFastPlan && !!anaerobicFastPlannerStats?.sectorPairs?.length;
                  const hasAny =
                    hasAnaerobicSectors || !!fastPlanDistancesLine || !!fastPlanUserNoteLine;
                  return hasAny ? null : <span className="text-gray-400">No description</span>;
                })()}
              </div>
            ) : isManualMode && hasManualPriority && manualContent ? (
              <div 
                className="text-left text-sm manual-content-preview break-words"
                dangerouslySetInnerHTML={{ __html: manualContent }}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              />
            ) : hasHtmlContent ? (
              <div className="text-sm text-left break-words" dangerouslySetInnerHTML={{ __html: manualContent }} />
            ) : (
              <div className="text-left break-words">
                {(() => {
                  // For manual mode without priority, show blank (empty string)
                  if (isManualMode && !hasManualPriority) {
                    console.log(`📄 [SortableNutritionFoodRow] Manual mode without priority for ${nutritionFood.letter}: showing BLANK`);
                    return ''; // Return empty string for blank cell
                  }
                  // For circuit-based nutritionFoods, show description or "No circuit description"
                  if (nutritionFood.isCircuitBased) {
                    const displayText =
                      stripCircuitCompactExerciseTrail(manualContent).trim() || 'No circuit description';
                    console.log(`🔄 [SortableNutritionFoodRow] Circuit display for ${nutritionFood.letter}:`, displayText);
                    return displayText;
                  }
                  const displayText = manualContent || nutritionFood.annotationText || 'No description';
                  if (
                    DISTANCE_BASED_SPORTS.includes(nutritionFood.sport || '') &&
                    Array.isArray(nutritionFood.nutritionComponents) &&
                    nutritionFood.nutritionComponents.length > 0
                  ) {
                    const groupedLine = resolveAerobicMoveframeDistanceDescription(
                      fastPlannerPayload,
                      nutritionFood.nutritionComponents
                    );
                    if (groupedLine) {
                      const brIndex = displayText.indexOf('<br');
                      const nlIndex = displayText.indexOf('\n');
                      const splitAt =
                        brIndex >= 0 ? brIndex : nlIndex >= 0 ? nlIndex : -1;
                      const noteLine =
                        splitAt >= 0
                          ? displayText
                              .slice(splitAt)
                              .replace(/<br\s*\/?>/gi, '\n')
                              .replace(/<[^>]+>/g, '')
                              .trim()
                          : '';
                      return (
                        <div className="text-left space-y-0.5">
                          <div className="font-medium">{groupedLine}</div>
                          {noteLine ? (
                            <div className="text-gray-600 text-xs">{noteLine}</div>
                          ) : null}
                        </div>
                      );
                    }
                  }
                  // Fast Plan: row 1 = distances only, row 2 = typed description (format "dist\\speed+...\nuserDesc")
                  const isFastPlan = typeof nutritionFood.notes === 'string' && nutritionFood.notes.includes('[FAST_PLANNER_DATA]');
                  if (isFastPlan && displayText.includes('\n')) {
                    const [row1, ...rest] = displayText.split('\n');
                    const row2 = rest.join('\n').trim();
                    return (
                      <div className="text-left space-y-0.5">
                        <div className="font-medium">{row1 || '—'}</div>
                        {row2 ? <div className="text-gray-600 text-xs">{row2}</div> : null}
                      </div>
                    );
                  }
                  return displayText;
                })()}
              </div>
            )}
          </td>
        );
      
      case 'duration':
        // Check if manual mode
        const isManualModeDuration = nutritionFood.manualMode === true;
        const isAerobicSportDuration = DISTANCE_BASED_SPORTS.includes(nutritionFood.sport);
        
        // Calculate duration based on sport type
        const isSeriesBased = ['BODY_BUILDING', 'GYMNASTIC', 'CALISTHENICS', 'CROSSFIT', 'FUNCTIONAL'].includes(nutritionFood.sport || '');
        const isTimeBased = ['TREADMILL', 'ROLLER', 'CYCLETTE', 'ELLIPTICAL'].includes(nutritionFood.sport || '');
        
        let durationDisplay: React.ReactNode = '—';
        
        if (nutritionFood.type === 'ANNOTATION') {
          durationDisplay = '—';
        } else if (isManualModeDuration && isAerobicSportDuration) {
          // For manual mode with aerobic sports, check input type (meters or time)
          const manualInputType = nutritionFood.manualInputType || 'meters';
          const firstNutritionComponent = nutritionFood.nutritionComponents?.[0];
          
          console.log('📊 [TABLE] Manual mode display - NutritionFood:', nutritionFood.letter);
          console.log('  Sport:', nutritionFood.sport);
          console.log('  Manual Input Type:', manualInputType);
          console.log('  Distance (raw):', nutritionFood.distance);
          console.log('  Manual Mode:', nutritionFood.manualMode);
          
          if (manualInputType === 'time') {
            // Display time format (from distance field which stores deciseconds)
            const deciseconds = nutritionFood.distance || 0;
            console.log('  🕐 Converting deciseconds to time:', deciseconds);
            console.log('  🔍 manualInputType from database:', nutritionFood.manualInputType);
            console.log('  🔍 Full nutritionFood object:', JSON.stringify({
              id: nutritionFood.id,
              letter: nutritionFood.letter,
              distance: nutritionFood.distance,
              manualInputType: nutritionFood.manualInputType,
              manualMode: nutritionFood.manualMode
            }));
            if (deciseconds > 0) {
              // Convert deciseconds back to time format
              const totalSeconds = Math.floor(deciseconds / 10);
              const ds = deciseconds % 10;
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;
              const timeFormatted = `${hours}h${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"${ds}`;
              durationDisplay = timeFormatted;
              console.log('  ✅ Time display SET TO:', durationDisplay);
              console.log('  🔍 Variable durationDisplay type:', typeof durationDisplay);
              console.log(
                '  🔍 Variable durationDisplay length:',
                typeof durationDisplay === 'string' ? durationDisplay.length : 'n/a'
              );
            } else {
              durationDisplay = '0h00\'00"0';
              console.log('  ⚠️ Zero deciseconds, showing:', durationDisplay);
            }
          } else {
            // Display meters (default)
            // For manual mode, read from nutritionFood.distance directly
            const distanceValue = nutritionFood.distance || firstNutritionComponent?.distance || 0;
            console.log('  📏 Displaying meters:', distanceValue);
            if (distanceValue > 0) {
              durationDisplay = `${distanceValue}m`;
              console.log('  ✅ Meters display:', durationDisplay);
            } else {
              durationDisplay = '—';
              console.log('  ⚠️ Zero meters, showing:', durationDisplay);
            }
          }
        } else if (isManualModeDuration && !isAerobicSportDuration) {
          // For manual mode with non-aerobic sports, Duration column should be empty
          // Series value only shows in Rip\Sets column
          durationDisplay = '—';
        } else if (nutritionFood.isCircuitBased && !isManualModeDuration) {
          let circuitSeries = Math.max(0, parseInt(String(nutritionFood.repetitions ?? '0'), 10) || 0);
          if (circuitSeries <= 0 && Array.isArray(nutritionFood.nutritionComponents) && nutritionFood.nutritionComponents.length > 0) {
            const keys = new Set<string>();
            for (const lap of nutritionFood.nutritionComponents) {
              const letter = String(lap?.circuitLetter || '').trim().toUpperCase();
              if (!letter) continue;
              const sn = lap?.localSeriesNumber ?? lap?.seriesNumber ?? 1;
              keys.add(`${letter}:${sn}`);
            }
            circuitSeries = keys.size;
          }
          durationDisplay = circuitSeries > 0 ? `${circuitSeries} series` : '—';
        } else if (anaerobicFastPlannerStats != null) {
          // Fast planner request: DUR must show total series only.
          durationDisplay =
            anaerobicFastPlannerStats.totalSeries > 0
              ? `${anaerobicFastPlannerStats.totalSeries} series`
              : '—';
        } else if (isSeriesBased) {
          // Show total series
          const totalSeries = nutritionFood.nutritionComponents?.length || 0;
          durationDisplay = totalSeries > 0 ? `${totalSeries} ${totalSeries === 1 ? 'series' : 'series'}` : '—';
        } else if (isTimeBased) {
          // Show total time
          const totalTime = (nutritionFood.nutritionComponents || []).reduce((sum: number, lap: any) => {
            if (lap.time) {
              // Parse time string like "7:00" to minutes
              const parts = lap.time.split(':');
              const minutes = parseInt(parts[0] || '0');
              const seconds = parseInt(parts[1] || '0');
              return sum + minutes + (seconds / 60);
            }
            return sum;
          }, 0);
          
          if (totalTime > 0) {
            const mins = Math.floor(totalTime);
            const secs = Math.round((totalTime - mins) * 60);
            durationDisplay = `${mins}'${secs.toString().padStart(2, '0')}"`;
          }
        } else {
          // Show total distance in meters
          durationDisplay = totalDistance > 0 ? `${totalDistance}m` : '—';
        }
        
        console.log(`🎯 [RENDER] About to render Dur cell for ${nutritionFood.letter}:`, durationDisplay);
        
        return (
          <td 
            key="duration" 
            className="border border-gray-200 px-1 py-1 text-center font-semibold text-sm"
            style={
               isAnnotation 
                 ? {
                     width: '42px',
                     backgroundColor: annotationBgColor || '#5168c2',
                     color: annotationTextColor || '#ffffff'
                   }
                 : {
                     width: '42px',
                     backgroundColor: '#f9fafb',
                     color: '#1f2937'
                   }
            }
          >
            {durationDisplay}
          </td>
        );
      
      case 'rip':
        // For manual mode: show total series for non-aerobic sports, "—" for aerobic sports
        const isManualModeRip = nutritionFood.manualMode === true;
        const isAerobicSport = DISTANCE_BASED_SPORTS.includes(nutritionFood.sport);
        let ripDisplay: React.ReactNode = nutrition_componentsCount;
        
        if (nutritionFood.type === 'ANNOTATION') {
          ripDisplay = '—';
        } else if (nutritionFood.isCircuitBased) {
          const ripSets = computeCircuitRipSetsCount({
            notes: nutritionFood.notes,
            movelaps: nutritionFood.nutritionComponents,
          });
          ripDisplay = ripSets != null && ripSets > 0 ? String(ripSets) : '—';
        } else if (anaerobicFastPlannerStats) {
          ripDisplay = String(anaerobicFastPlannerStats.totalRepVolume);
        } else if (isManualModeRip && !isAerobicSport) {
          // For non-aerobic sports in manual mode, show repetitions from nutritionFood.repetitions field with "series" unit
          // (not nutrition_components count, because manual mode has no nutritionComponents)
          const seriesValue = nutritionFood.repetitions || 0;
          ripDisplay = seriesValue > 0 ? `${seriesValue} series` : '—';
        } else if (isManualModeRip && isAerobicSport) {
          // For aerobic sports in manual mode, show "—"
          ripDisplay = '—';
        }
        
         const ripCellStyle: React.CSSProperties = isAnnotation
           ? {
               width: '28px',
               backgroundColor: annotationBgColor || '#5168c2',
               color: annotationTextColor || '#ffffff'
             }
           : {
               width: '28px',
               backgroundColor: '#ffffff',
               color: '#dc2626' // red-600
             };
        
        return (
          <td 
            key="rip" 
            className={`border border-gray-200 px-1 py-1 text-center font-semibold text-sm ${!isAnnotation ? 'rip-column' : ''}`}
            style={ripCellStyle}
          >
            {ripDisplay}
          </td>
        );
      
      case 'macro':
        const isManualModeMacro = nutritionFood.manualMode === true;
        const avePauseDisplay =
          nutritionFoodAvePauseSeconds != null && nutritionFoodAvePauseSeconds > 0
            ? formatAvePauseFromSeconds(nutritionFoodAvePauseSeconds)
            : '—';
        return (
          <td 
            key="macro" 
            className="border border-gray-200 px-1 py-1 text-center font-semibold text-sm"
            style={
               isAnnotation
                 ? {
                     width: '32px',
                     backgroundColor: annotationBgColor || '#5168c2',
                     color: annotationTextColor || '#ffffff'
                   }
                 : isManualModeMacro
                 ? {
                     width: '32px',
                     backgroundColor: '#e5e7eb',
                     color: '#9ca3af'
                   }
                 : { width: '32px' }
            }
          >
            {nutritionFood.type === 'ANNOTATION'
              ? '—'
              : isManualModeMacro
                ? '—'
                : avePauseDisplay}
          </td>
        );
      
      case 'alarm':
        const isManualModeAlarm = nutritionFood.manualMode === true;
        return (
          <td 
            key="alarm" 
            className="border border-gray-200 px-1 py-1 text-center text-[10px]"
            style={
               isAnnotation
                 ? {
                     width: '42px',
                     backgroundColor: annotationBgColor || '#5168c2',
                     color: annotationTextColor || '#ffffff'
                   }
                 : isManualModeAlarm
                 ? {
                     width: '42px',
                     backgroundColor: '#e5e7eb',
                     color: '#9ca3af'
                   }
                 : { width: '42px' }
            }
          >
            {nutritionFood.type === 'ANNOTATION' ? '—' : (isManualModeAlarm ? '—' : (nutritionFood.alarm ? (
              <span>{nutritionFood.alarm} 🔔</span>
            ) : (
              <span>-</span>
            )))}
          </td>
        );
      
      case 'annotation':
        return (
          <td 
            key="annotation" 
            className="border border-gray-200 px-1 py-1 text-center text-[10px]"
            style={{
              backgroundColor: nutritionFood.annotationBgColor || 'transparent',
              color: nutritionFood.annotationTextColor || 'inherit'
            }}
            title={nutritionFood.annotationText || 'No annotation'}
          >
            {nutritionFood.annotationText ? (
              <div className="truncate max-w-[120px]" title={nutritionFood.annotationText}>
                {nutritionFood.annotationText}
              </div>
            ) : '—'}
          </td>
        );
      
      case 'options':
        return (
           <td 
             key="options" 
             className="border border-gray-200 px-1 py-1 text-center sticky-options-col" 
             style={{
               width: '250px',
               minWidth: '250px',
               ...(isAnnotation ? {
                 backgroundColor: annotationBgColor || '#5168c2',
                 color: annotationTextColor || '#ffffff'
               } : {
                 backgroundColor: '#ffffff'
               })
             }}
           >
            <div className="flex items-center justify-center gap-1 flex-wrap" style={{ position: 'relative', zIndex: 1 }}>
              {/* For annotations, show only Edit and Delete */}
              {isAnnotation ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditNutritionFood) onEditNutritionFood(nutritionFood);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit this annotation"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteNutritionFood) onDeleteNutritionFood(nutritionFood);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    title="Delete this annotation"
                  >
                    Delete
                  </button>
                </>
              ) : (
                /* For regular nutritionFoods, show all options */
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onAddNutritionFoodAfter) {
                        onAddNutritionFoodAfter(nutritionFood, mfIndex, workout, day);
                      }
                    }}
                    className="px-1.5 py-0.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600"
                    title="Add a new nutritionFood after this one"
                  >
                    Add MF
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditNutritionFood) onEditNutritionFood(nutritionFood);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit this nutritionFood"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNutritionFood(nutritionFood);
                      setShowInfoPanel(true);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    title="View nutritionFood info"
                  >
                    MF Info
                  </button>
                  <button
                    ref={optionsButtonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showOptionsDropdown) {
                        setShowOptionsDropdown(false);
                        setButtonRect(null);
                      } else {
                        handleOpenDropdown();
                      }
                    }}
                    className="px-1.5 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                    title="More options"
                  >
                    Options
                    <span className="text-[10px]">{showOptionsDropdown ? '▲' : '▼'}</span>
                  </button>
                </>
              )}
            </div>
          </td>
        );
      
      default:
        return null;
    }
  };
  
  // Combine both refs
  const combineRefs = (el: HTMLTableRowElement | null) => {
    setNodeRef(el);
    setDropNodeRef(el);
  };

  return (
    <React.Fragment key={nutritionFood.id}>
      <tr 
        ref={combineRefs}
        style={{
          ...style,
          ...(annotationBgColor ? {
            backgroundColor: annotationBgColor
          } : {}),
          ...(annotationTextColor ? {
            color: annotationTextColor
          } : {}),
          position: 'relative'
        }}
        className={`
          ${hideNutritionFoodSummaryForFpNutritionComponentModal ? 'hidden' : ''}
          ${hasAnnotation ? '' : 'hover:bg-purple-50'}
          ${isDropOver ? 'ring-4 ring-green-400 ring-opacity-75' : ''}
          transition-colors duration-150
        `}
        title="Click expand button to show/hide dietlaps, Double-click dietframe to edit, Drag to reorder or move"
      >
        {visibleColumns.map(columnId => renderCell(columnId))}
      </tr>
      
      {/* NutritionComponents Detail Table - Level 3: Indented from nutritionFood table */}
      {isNutritionComponentsExpanded && (
        <tr>
          <td colSpan={visibleColumns.length} className="border border-gray-200 p-0" style={{ backgroundColor: 'rgb(250, 255, 214)', overflow: 'visible', maxWidth: 0 }}>
            <div className="pl-8">
              <NutritionComponentDetailTable 
                nutritionFood={nutritionFood}
                onEditNutritionComponent={(nutritionComponent) => {
                  console.log('🔘 SortableNutritionFoodRow onEditNutritionComponent triggered', { 
                    nutritionComponentId: nutritionComponent.id, 
                    hasWorkout: !!workout, 
                    hasDay: !!day,
                    onEditNutritionComponentDefined: !!onEditNutritionComponent 
                  });
                  onEditNutritionComponent?.(nutritionComponent, nutritionFood);
                }}
                onDeleteNutritionComponent={(nutritionComponent) => onDeleteNutritionComponent?.(nutritionComponent, nutritionFood)}
                onAddNutritionComponent={() => onAddNutritionComponent?.(nutritionFood)}
                onAddNutritionComponentAfter={(nutritionComponent, index) => onAddNutritionComponentAfter?.(nutritionComponent, index, nutritionFood, workout, day)}
                onRefresh={onRefresh}
                allNutritionFoods={workout?.nutritionFoods || []}
                onNavigateNutritionFood={onNavigateToNutritionFood}
                onAnaerobicFastPlannerModalOpenChange={setHideFpSummaryWhileNutritionComponentEdit}
              />
            </div>
          </td>
        </tr>
      )}

      {/* Hover Popup for NutritionFood Letter */}
      {hoveredNutritionFood && popupPosition && ReactDOM.createPortal(
        <div 
          className="fixed z-[9999] bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 max-w-md max-h-[80vh] overflow-y-auto animate-fadeIn"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'auto',
            overscrollBehavior: 'contain'
          }}
          onMouseEnter={() => {
            // Clear any timeout and mark as hovering popup
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setIsHoveringPopup(true);
          }}
          onMouseLeave={() => {
            // Close popup when leaving it
            setIsHoveringPopup(false);
            setHoveredNutritionFood(null);
            setPopupPosition(null);
          }}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs space-y-2">
            {/* NutritionFood Letter */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: hoveredNutritionFood.section?.color || '#6366f1' }}
              >
                {hoveredNutritionFood.letter || 'A'}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{hoveredNutritionFood.sport || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{hoveredNutritionFood.section?.name || 'Section'}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-700 mb-1">Description:</div>
              <div className="text-gray-900 bg-gray-50 p-2 rounded max-h-[150px] overflow-y-auto">
                {(() => {
                  // For manual mode, show full content from notes, otherwise show description
                  const content = hoveredNutritionFood.manualMode 
                    ? (hoveredNutritionFood.notes || hoveredNutritionFood.description)
                    : hoveredNutritionFood.description;
                  
                  return content ? (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  ) : (
                    'No description'
                  );
                })()}
              </div>
            </div>

            {/* All NutritionFood Details */}
            <div className="grid grid-cols-2 gap-2">
              {/* Repetitions */}
              {hoveredNutritionFood.repetitions && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Repetitions</span>
                  <span className="font-semibold text-blue-600">{hoveredNutritionFood.repetitions}</span>
                </div>
              )}

              {/* NutritionComponents Count */}
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px]">NutritionComponents</span>
                <span className="font-semibold text-purple-600">
                  {hoveredNutritionFood.nutritionComponents?.length || 0}
                </span>
              </div>

              {/* Pause */}
              {hoveredNutritionFood.pause && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Pause</span>
                  <span className="font-semibold text-orange-600">{hoveredNutritionFood.pause}</span>
                </div>
              )}

              {/* Macro Rest */}
              {hoveredNutritionFood.macroRest && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Rest</span>
                  <span className="font-semibold text-orange-600">{hoveredNutritionFood.macroRest}</span>
                </div>
              )}

              {/* Macro Final */}
              {hoveredNutritionFood.macroFinal && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Final</span>
                  <span className="font-semibold text-green-600">{hoveredNutritionFood.macroFinal}</span>
                </div>
              )}

              {/* Alarm */}
              {hoveredNutritionFood.alarm && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Alarm</span>
                  <span className="font-semibold text-red-600">{hoveredNutritionFood.alarm}</span>
                </div>
              )}

              {/* Code */}
              {hoveredNutritionFood.code && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Code</span>
                  <span className="font-semibold text-gray-700 font-mono text-[10px]">{hoveredNutritionFood.code}</span>
                </div>
              )}

              {/* Total Distance */}
              {hoveredNutritionFood.totalDistance > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Distance</span>
                  <span className="font-semibold text-blue-600">{hoveredNutritionFood.totalDistance}m</span>
                </div>
              )}

              {/* Total Reps */}
              {hoveredNutritionFood.totalReps > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Reps</span>
                  <span className="font-semibold text-purple-600">{hoveredNutritionFood.totalReps}</span>
                </div>
              )}
            </div>

            {/* Notes - Only show for non-manual nutritionFoods, as manual mode uses notes for content */}
            {hoveredNutritionFood.notes && !hoveredNutritionFood.manualMode && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Notes:</div>
                <div className="text-gray-900 bg-yellow-50 p-2 rounded text-[10px]">
                  {stripCircuitTags(hoveredNutritionFood.notes)}
                </div>
              </div>
            )}

            {/* NutritionComponents Details */}
            {hoveredNutritionFood.nutritionComponents && hoveredNutritionFood.nutritionComponents.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">NutritionComponents ({hoveredNutritionFood.nutritionComponents.length}):</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {hoveredNutritionFood.nutritionComponents.map((lap: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-1.5 rounded text-[10px]">
                      <div className="font-semibold text-gray-700">#{idx + 1}</div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        {/* For Body Building, show exercise name instead of distance */}
                        {hoveredNutritionFood.sport === 'BODY_BUILDING' ? (
                          lap.exercise && <div>Exercise: <span className="font-semibold">{lap.exercise}</span></div>
                        ) : (
                          lap.distance && <div>Distance: <span className="font-semibold">{lap.distance}m</span></div>
                        )}
                        {lap.reps && <div>Reps: <span className="font-semibold">{lap.reps}</span></div>}
                        {lap.time && <div>Time: <span className="font-semibold">{lap.time}</span></div>}
                        {lap.pace && <div>Pace: <span className="font-semibold">{lap.pace}</span></div>}
                        {lap.speed && <div>Speed: <span className="font-semibold">{lap.speed}</span></div>}
                        {lap.pause && (
                          <div>
                            {nutritionComponentPauseFieldLabel(lap.restType)}: <span className="font-semibold">{lap.pause}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Options Dropdown Portal */}
      {showOptionsDropdown && buttonRect && ReactDOM.createPortal(
        <div 
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${buttonRect.bottom + 4}px`,
            left: `${buttonRect.right - 120}px`,
            backgroundColor: 'white',
            border: '2px solid #9ca3af',
            borderRadius: '4px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999999,
            minWidth: '120px',
            width: '120px'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onCopyNutritionFood) {
                onCopyNutritionFood(nutritionFood, workout, day);
              }
              setShowOptionsDropdown(false);
              setButtonRect(null);
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: '500',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: 'pointer',
              color: '#047857',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onMoveNutritionFood) {
                onMoveNutritionFood(nutritionFood, workout, day);
              }
              setShowOptionsDropdown(false);
              setButtonRect(null);
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: '500',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: 'pointer',
              color: '#c2410c',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffedd5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Move
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteNutritionFood) {
                if (confirm(`Delete nutritionFood ${nutritionFood.letter}?`)) {
                  onDeleteNutritionFood(nutritionFood);
                }
              }
              setShowOptionsDropdown(false);
              setButtonRect(null);
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: '500',
              border: 'none',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: 'pointer',
              color: '#b91c1c',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Delete
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const token = localStorage.getItem('token');
                if (!token) {
                  alert('Please log in to save favorites');
                  setShowOptionsDropdown(false);
                  setButtonRect(null);
                  return;
                }

                const response = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    favourite: !nutritionFood.favourite
                  })
                });

                if (response.ok) {
                  alert(nutritionFood.favourite ? 'Removed from favorites!' : 'Saved to favorites!');
                  if (onRefresh) {
                    onRefresh();
                  }
                } else {
                  const data = await response.json().catch(() => ({ error: 'Unknown error' }));
                  alert(`Error: ${data.error || data.details || 'Failed to update favorite status'}`);
                }
              } catch (error: any) {
                alert(`Failed to save to favorites: ${error.message}`);
              } finally {
                setShowOptionsDropdown(false);
                setButtonRect(null);
              }
            }}
            style={{
              width: '100%',
              padding: '8px 10px',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: '500',
              border: 'none',
              backgroundColor: 'white',
              cursor: 'pointer',
              color: nutritionFood.favourite ? '#a16207' : '#7e22ce',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = nutritionFood.favourite ? '#fef3c7' : '#f3e8ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            {nutritionFood.favourite ? 'Unfavorite' : 'Save to Favs'}
          </button>
        </div>,
        document.body
      )}

      {/* Manual Content Popup Modal */}
      {showManualPopup && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowManualPopup(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 w-full m-4 flex flex-col"
            style={{ maxWidth: '65vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: sectionColor }}
                >
                  {nutritionFood.letter || 'A'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {sportName} - Manual NutritionFood
                  </h3>
                  <p className="text-sm text-gray-500">{sectionName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualPopup(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-3 py-1 rounded hover:bg-gray-100"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Full Content - Scrollable */}
            <div className="flex-1 overflow-y-auto mb-4" style={{ minHeight: '300px', maxHeight: 'calc(90vh - 200px)' }}>
              {manualPopupContent.includes('<') ? (
                <div 
                  className="text-gray-900 bg-gray-50 p-6 rounded border border-gray-200 w-full manual-content-display"
                  style={{
                    lineHeight: '1.8',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '15px',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  dangerouslySetInnerHTML={{ __html: manualPopupContent }}
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-6 rounded border border-gray-200 w-full"
                  style={{
                    lineHeight: '1.8',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '15px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {manualPopupContent}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-300 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowManualPopup(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}

