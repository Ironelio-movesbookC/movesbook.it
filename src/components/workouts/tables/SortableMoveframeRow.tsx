import React from 'react';
import ReactDOM from 'react-dom';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import MovelapDetailTable from './MovelapDetailTable';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { getSportDisplayName, DISTANCE_BASED_SPORTS } from '@/constants/moveframe.constants';

// 2026-01-22 14:45 UTC - Helper to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface SortableMoveframeRowProps {
  moveframe: any;
  mfIndex: number;
  iconType?: 'emoji' | 'icon'; // Icon type override from parent
  isMovelapsExpanded: boolean;
  isChecked: boolean;
  onToggleCheck: () => void;
  onToggleExpand: () => void;
  onEditMoveframe?: (moveframe: any) => void;
  onDeleteMoveframe?: (moveframe: any) => void;
  onEditMovelap?: (movelap: any, moveframe: any) => void;
  onDeleteMovelap?: (movelap: any, moveframe: any) => void;
  onAddMovelap?: (moveframe: any) => void;
  onAddMovelapAfter?: (movelap: any, index: number, moveframe: any, workout: any, day: any) => void;
  onAddMoveframeAfter?: (moveframe: any, index: number, workout: any, day: any) => void;
  onCopyMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onMoveMoveframe?: (moveframe: any, workout: any, day: any) => void;
  onSetWorkType?: (moveframe: any) => void;
  onRefresh?: () => void;
  workout: any;
  day: any;
  setShowInfoPanel: (show: boolean) => void;
  setSelectedMoveframe: (moveframe: any) => void;
  orderedVisibleColumns?: string[];
  onNavigateToMoveframe?: (moveframeId: string) => void; // For navigation between moveframes
}

export default function SortableMoveframeRow({
  moveframe,
  mfIndex,
  iconType: iconTypeProp,
  isMovelapsExpanded,
  isChecked,
  onToggleCheck,
  onToggleExpand,
  onEditMoveframe,
  onDeleteMoveframe,
  onEditMovelap,
  onDeleteMovelap,
  onAddMovelap,
  onAddMovelapAfter,
  onAddMoveframeAfter,
  onCopyMoveframe,
  onMoveMoveframe,
  onSetWorkType,
  onRefresh,
  workout,
  day,
  setShowInfoPanel,
  setSelectedMoveframe,
  orderedVisibleColumns,
  onNavigateToMoveframe
}: SortableMoveframeRowProps) {
  // Disable sorting for annotation moveframes
  const isAnnotation = moveframe.type === 'ANNOTATION';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: moveframe.id,
    disabled: isAnnotation, // Disable drag for annotations
    data: {
      type: 'moveframe',
      moveframe: moveframe,
      workout: workout,
      day: day
    }
  });
  
  // Droppable for receiving other moveframes
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
  
  const movelapsCount = moveframe.movelaps?.length || 0;
  const totalDistance = (moveframe.movelaps || []).reduce(
    (sum: number, lap: any) => sum + (parseInt(lap.distance) || 0),
    0
  );
  
  // Debug: Log movelaps count and appliedTechnique to verify updates
  React.useEffect(() => {
    console.log(`🔢 Moveframe ${moveframe.letter} - Rip count: ${movelapsCount}, Movelaps:`, moveframe.movelaps);
    if (moveframe.appliedTechnique) {
      console.log(`🎯 Moveframe ${moveframe.letter} has technique: "${moveframe.appliedTechnique}"`);
    }
  }, [moveframe.movelaps, movelapsCount, moveframe.letter, moveframe.appliedTechnique]);
  const sectionColor = moveframe.section?.color || '#5b8def';
  const sectionName = moveframe.section?.name || 'Default';
  const sportIcon = getSportIcon(moveframe.sport || 'SWIM', iconType);
  const sportName = getSportDisplayName(moveframe.sport || 'SWIM');
  
  // Get annotation colors (if set)
  const hasAnnotation = moveframe.annotationBgColor || moveframe.annotationTextColor;

  // Hover popup state for moveframe letter
  const [hoveredMoveframe, setHoveredMoveframe] = React.useState<any>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isHoveringPopup, setIsHoveringPopup] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
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
  
  // Calculate macro time (total time for all movelaps)
  const macroTime = (moveframe.movelaps || []).reduce((sum: number, lap: any) => {
    const time = lap.estimatedTime || lap.time || 0;
    return sum + (typeof time === 'string' ? parseFloat(time) : time);
  }, 0);
  
  const formatMacroTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  // Default column order if not provided - should match MoveframesSection
  const visibleColumns = orderedVisibleColumns || ['checkbox', 'drag', 'expand', 'index', 'mf', 'color', 'section', 'description', 'duration', 'rip', 'macro', 'alarm', 'options', 'code_section', 'action', 'dist', 'style', 'speed', 'time', 'pace', 'rec', 'rest_to', 'aim_snd', 'sport', 'annotation', 'annotations'];

  // Get annotation background color
  const annotationBgColor = isAnnotation ? (moveframe.annotationBgColor || '#5168c2') : null;
  const annotationTextColor = isAnnotation ? (moveframe.annotationTextColor || '#ffffff') : null;
  
  // Debug logging for annotations (only when needed)
  if (isAnnotation) {
    console.log('🎨 Annotation Moveframe:', {
      moveframeId: moveframe.id,
      letter: moveframe.letter,
      annotationBgColor,
      annotationTextColor
    });
  }

  // Render individual cells based on column ID
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
              title="Select moveframe"
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
              title="Drag to reorder moveframe"
              type="button"
            >
              <GripVertical size={18} />
            </button>
          </td>
        );
      
      case 'expand':
        return (
          <td key="expand" className="border border-gray-200 px-1 py-1 text-center text-gray-600 text-[10px] cursor-pointer" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}} onClick={onToggleExpand}>
            <span className="font-bold">{isMovelapsExpanded ? '▼' : '►'}</span>
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
            {moveframe.section?.name || 'Default'}
          </td>
        );
      
      case 'action':
        return (
          <td key="action" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {getSportDisplayName(moveframe.sport || 'SWIM')}
          </td>
        );
      
      case 'dist':
        return (
          <td key="dist" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.movelaps?.[0]?.distance || moveframe.customDistance || '—')}
          </td>
        );
      
      case 'style':
        return (
          <td key="style" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.movelaps?.[0]?.style || moveframe.style || '—')}
          </td>
        );
      
      case 'speed':
        return (
          <td key="speed" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.movelaps?.[0]?.speed || moveframe.speed || '—')}
          </td>
        );
      
      case 'time':
        return (
          <td key="time" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.movelaps?.[0]?.time || moveframe.time || '—')}
          </td>
        );
      
      case 'pace':
        return (
          <td key="pace" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.movelaps?.[0]?.pace || moveframe.pace || '—')}
          </td>
        );
      
      case 'rec':
        return (
          <td key="rec" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.pause ? `${moveframe.pause}"` : '—')}
          </td>
        );
      
      case 'rest_to':
        return (
          <td key="rest_to" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.restTo || '—')}
          </td>
        );
      
      case 'aim_snd':
        return (
          <td key="aim_snd" className="border border-gray-200 px-1 py-1 text-center text-[10px]" style={isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {}}>
            {moveframe.type === 'ANNOTATION' ? '—' : (moveframe.alarm || moveframe.sound ? '🔔' : '—')}
          </td>
        );
      
      case 'annotations':
        return (
          <td 
            key="annotations" 
            className="border border-gray-200 px-1 py-1 text-center text-[10px]"
            style={{
              backgroundColor: moveframe.annotationBgColor || 'transparent',
              color: moveframe.annotationTextColor || 'inherit'
            }}
          >
            {moveframe.annotationText || '—'}
          </td>
        );
      
      case 'mf':
        // Colored circle around letter based on work type
        const getWorkTypeStyle = () => {
          if (moveframe.workType === 'MAIN') {
            return 'border-2 border-red-500 bg-red-50 text-red-700';
          } else if (moveframe.workType === 'SECONDARY') {
            return 'border-2 border-blue-500 bg-blue-50 text-blue-700';
          }
          return 'border border-gray-300';
        };
        
        const isMfManualMode = moveframe.manualMode === true;
        const mfHasHtmlContent = moveframe.description && moveframe.description.includes('<');
        
        return (
           <td 
             key="mf" 
             className="border border-gray-200 px-1 py-1 text-center cursor-pointer hover:bg-blue-100 transition-colors"
             style={{ width: '25px', ...isAnnotation ? { backgroundColor: annotationBgColor || '#5168c2', color: annotationTextColor || '#ffffff' } : {} }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Set work type on double click (for all moveframes)
              if (onSetWorkType) {
                onSetWorkType(moveframe);
              }
            }}
            onMouseEnter={(e) => {
              // Clear any existing timeout
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredMoveframe(moveframe);
              setPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
            }}
            onMouseLeave={() => {
              // Delay closing to allow mouse to move to popup
              hoverTimeoutRef.current = setTimeout(() => {
                if (!isHoveringPopup) {
                  setHoveredMoveframe(null);
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
                {moveframe.letter || String.fromCharCode(65 + mfIndex)}
              </div>
              {/* Red-Yellow circle indicator for moveframes with applied technique */}
              {moveframe.appliedTechnique && (
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ 
                    background: 'linear-gradient(135deg, #ef4444 50%, #eab308 50%)'
                  }}
                  title={`Technique: ${moveframe.appliedTechnique}`}
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
                <img 
                  src={sportIcon} 
                  alt={sportName} 
                  className="w-5 h-5 object-cover rounded flex-shrink-0" 
                />
              ) : (
                <span className="text-base">{sportIcon}</span>
              )}
              <span className="text-xs">{sportName}</span>
            </div>
          </td>
        );
      
      case 'description':
        // Check if this is a manual mode moveframe
        const isManualMode = moveframe.manualMode === true;
        const hasManualPriority = moveframe.manualPriority === true;
        console.log('📋 [DISPLAY] Moveframe', moveframe.letter, ':', {
          manualMode: isManualMode,
          manualPriority: hasManualPriority,
          willShowManualContent: isManualMode && hasManualPriority
        });
        // For manual mode with priority, use notes field first (it contains the full rich text content)
        // Description field might be truncated for database constraints
        // If manual mode WITHOUT priority, show blank (user wants to hide content)
        // 2026-01-22 14:45 UTC - Strip circuit tags from all content
        // 2026-01-27 - For circuit-based moveframes, always show description
        const isCircuitBased = moveframe.isCircuitBased === true;
        const rawContent = (isManualMode && hasManualPriority)
          ? (moveframe.notes || moveframe.description || '') 
          : isManualMode && !hasManualPriority
          ? '' // Blank for manual mode without priority
          : moveframe.description;
        const manualContent = stripCircuitTags(rawContent);
        
        // Debug logging for circuit-based moveframes
        if (isCircuitBased) {
          console.log(`🔄 [SortableMoveframeRow] Circuit-based moveframe ${moveframe.letter}:`, {
            isCircuitBased,
            hasDescription: !!moveframe.description,
            description: moveframe.description,
            descriptionLength: moveframe.description?.length || 0,
            manualContent,
            manualContentLength: manualContent?.length || 0
          });
        }
        
        // Debug logging for manual mode
        if (isManualMode) {
          console.log(`📝 [SortableMoveframeRow] Manual mode moveframe ${moveframe.letter}:`, {
            manualMode: moveframe.manualMode,
            manualPriority: hasManualPriority,
            hasDescription: !!moveframe.description,
            hasNotes: !!moveframe.notes,
            descriptionLength: moveframe.description?.length || 0,
            notesLength: moveframe.notes?.length || 0,
            manualContentLength: manualContent?.length || 0
          });
        }
        
        const hasHtmlContent = manualContent && (manualContent.includes('<') || manualContent.includes('\n'));
        
        return (
          <td 
            key="description" 
            className={`border border-gray-200 px-2 py-1 text-center text-sm ${
              moveframe.type === 'ANNOTATION' && moveframe.annotationBold ? 'font-bold' : ''
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
                console.log('🔍 [SortableMoveframeRow] Opening popup with content:', {
                  contentLength: manualContent.length,
                  contentPreview: manualContent.substring(0, 100),
                  fullContent: manualContent,
                  moveframeDescription: moveframe.description,
                  moveframeNotes: moveframe.notes,
                  descriptionLength: moveframe.description?.length || 0,
                  notesLength: moveframe.notes?.length || 0
                });
                setManualPopupContent(manualContent);
                setShowManualPopup(true);
              }
            }}
           title={isManualMode && hasManualPriority && manualContent ? "Click to view full content" : ""}
          >
           {isManualMode && hasManualPriority && manualContent ? (
              <div 
                className="text-left text-sm overflow-hidden manual-content-preview break-words"
                dangerouslySetInnerHTML={{ __html: manualContent }}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              />
            ) : hasHtmlContent ? (
              <div className="text-sm overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: manualContent }} />
            ) : (
              <div className="overflow-hidden break-words">
                {(() => {
                  // For manual mode without priority, show blank (empty string)
                  if (isManualMode && !hasManualPriority) {
                    console.log(`📄 [SortableMoveframeRow] Manual mode without priority for ${moveframe.letter}: showing BLANK`);
                    return ''; // Return empty string for blank cell
                  }
                  // For circuit-based moveframes, show description or "No description"
                  if (moveframe.isCircuitBased) {
                    const displayText = manualContent || 'No circuit description';
                    console.log(`🔄 [SortableMoveframeRow] Circuit display for ${moveframe.letter}:`, displayText);
                    return displayText;
                  }
                  const displayText = manualContent || moveframe.annotationText || 'No description';
                  return displayText;
                })()}
              </div>
            )}
          </td>
        );
      
      case 'duration':
        // Check if manual mode
        const isManualModeDuration = moveframe.manualMode === true;
        const isAerobicSportDuration = DISTANCE_BASED_SPORTS.includes(moveframe.sport);
        
        // Calculate duration based on sport type
        const isSeriesBased = ['BODY_BUILDING', 'GYMNASTIC', 'CALISTHENICS', 'CROSSFIT', 'FUNCTIONAL'].includes(moveframe.sport || '');
        const isTimeBased = ['TREADMILL', 'ROLLER', 'CYCLETTE', 'ELLIPTICAL'].includes(moveframe.sport || '');
        
        let durationDisplay = '—';
        
        if (moveframe.type === 'ANNOTATION') {
          durationDisplay = '—';
        } else if (isManualModeDuration && isAerobicSportDuration) {
          // For manual mode with aerobic sports, check input type (meters or time)
          const manualInputType = moveframe.manualInputType || 'meters';
          const firstMovelap = moveframe.movelaps?.[0];
          
          console.log('📊 [TABLE] Manual mode display - Moveframe:', moveframe.letter);
          console.log('  Sport:', moveframe.sport);
          console.log('  Manual Input Type:', manualInputType);
          console.log('  Distance (raw):', moveframe.distance);
          console.log('  Manual Mode:', moveframe.manualMode);
          
          if (manualInputType === 'time') {
            // Display time format (from distance field which stores deciseconds)
            const deciseconds = moveframe.distance || 0;
            console.log('  🕐 Converting deciseconds to time:', deciseconds);
            console.log('  🔍 manualInputType from database:', moveframe.manualInputType);
            console.log('  🔍 Full moveframe object:', JSON.stringify({
              id: moveframe.id,
              letter: moveframe.letter,
              distance: moveframe.distance,
              manualInputType: moveframe.manualInputType,
              manualMode: moveframe.manualMode
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
              console.log('  🔍 Variable durationDisplay length:', durationDisplay.length);
            } else {
              durationDisplay = '0h00\'00"0';
              console.log('  ⚠️ Zero deciseconds, showing:', durationDisplay);
            }
          } else {
            // Display meters (default)
            // For manual mode, read from moveframe.distance directly
            const distanceValue = moveframe.distance || firstMovelap?.distance || 0;
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
        } else if (isSeriesBased) {
          // Show total series
          const totalSeries = moveframe.movelaps?.length || 0;
          durationDisplay = totalSeries > 0 ? `${totalSeries} ${totalSeries === 1 ? 'series' : 'series'}` : '—';
        } else if (isTimeBased) {
          // Show total time
          const totalTime = (moveframe.movelaps || []).reduce((sum: number, lap: any) => {
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
        
        console.log(`🎯 [RENDER] About to render Dur cell for ${moveframe.letter}:`, durationDisplay);
        
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
        const isManualModeRip = moveframe.manualMode === true;
        const isAerobicSport = DISTANCE_BASED_SPORTS.includes(moveframe.sport);
        let ripDisplay = movelapsCount;
        
        if (moveframe.type === 'ANNOTATION') {
          ripDisplay = '—';
        } else if (isManualModeRip && !isAerobicSport) {
          // For non-aerobic sports in manual mode, show repetitions from moveframe.repetitions field with "series" unit
          // (not movelaps count, because manual mode has no movelaps)
          const seriesValue = moveframe.repetitions || 0;
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
        const isManualModeMacro = moveframe.manualMode === true;
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
            {moveframe.type === 'ANNOTATION' ? '—' : (isManualModeMacro ? '—' : (moveframe.macroFinal || formatMacroTime(macroTime)))}
          </td>
        );
      
      case 'alarm':
        const isManualModeAlarm = moveframe.manualMode === true;
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
            {moveframe.type === 'ANNOTATION' ? '—' : (isManualModeAlarm ? '—' : (moveframe.alarm ? (
              <span>{moveframe.alarm} 🔔</span>
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
              backgroundColor: moveframe.annotationBgColor || 'transparent',
              color: moveframe.annotationTextColor || 'inherit'
            }}
            title={moveframe.annotationText || 'No annotation'}
          >
            {moveframe.annotationText ? (
              <div className="truncate max-w-[120px]" title={moveframe.annotationText}>
                {moveframe.annotationText}
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
                      if (onEditMoveframe) onEditMoveframe(moveframe);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit this annotation"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteMoveframe) onDeleteMoveframe(moveframe);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    title="Delete this annotation"
                  >
                    Delete
                  </button>
                </>
              ) : (
                /* For regular moveframes, show all options */
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onAddMoveframeAfter) {
                        onAddMoveframeAfter(moveframe, mfIndex, workout, day);
                      }
                    }}
                    className="px-1.5 py-0.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600"
                    title="Add a new moveframe after this one"
                  >
                    Add MF
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditMoveframe) onEditMoveframe(moveframe);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit this moveframe"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMoveframe(moveframe);
                      setShowInfoPanel(true);
                    }}
                    className="px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
                    title="View moveframe info"
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
    <React.Fragment key={moveframe.id}>
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
          ${hasAnnotation ? '' : 'hover:bg-purple-50'}
          ${isDropOver ? 'ring-4 ring-green-400 ring-opacity-75' : ''}
          transition-colors duration-150
        `}
        title="Click expand button to show/hide movelaps, Double-click moveframe to edit, Drag to reorder or move"
      >
        {visibleColumns.map(columnId => renderCell(columnId))}
      </tr>
      
      {/* Movelaps Detail Table - Level 3: Indented from moveframe table */}
      {isMovelapsExpanded && (
        <tr>
          <td colSpan={visibleColumns.length} className="border border-gray-200 p-0" style={{ backgroundColor: 'rgb(250, 255, 214)', overflow: 'visible', maxWidth: 0 }}>
            <div className="pl-8">
              <MovelapDetailTable 
                moveframe={moveframe}
                onEditMovelap={(movelap) => onEditMovelap?.(movelap, moveframe)}
                onDeleteMovelap={(movelap) => onDeleteMovelap?.(movelap, moveframe)}
                onAddMovelap={() => onAddMovelap?.(moveframe)}
                onAddMovelapAfter={(movelap, index) => onAddMovelapAfter?.(movelap, index, moveframe, workout, day)}
                onRefresh={onRefresh}
                allMoveframes={workout?.moveframes || []}
                onNavigateMoveframe={onNavigateToMoveframe}
              />
            </div>
          </td>
        </tr>
      )}

      {/* Hover Popup for Moveframe Letter */}
      {hoveredMoveframe && popupPosition && ReactDOM.createPortal(
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
            setHoveredMoveframe(null);
            setPopupPosition(null);
          }}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs space-y-2">
            {/* Moveframe Letter */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: hoveredMoveframe.section?.color || '#6366f1' }}
              >
                {hoveredMoveframe.letter || 'A'}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900">{hoveredMoveframe.sport || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{hoveredMoveframe.section?.name || 'Section'}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-700 mb-1">Description:</div>
              <div className="text-gray-900 bg-gray-50 p-2 rounded max-h-[150px] overflow-y-auto">
                {(() => {
                  // For manual mode, show full content from notes, otherwise show description
                  const content = hoveredMoveframe.manualMode 
                    ? (hoveredMoveframe.notes || hoveredMoveframe.description)
                    : hoveredMoveframe.description;
                  
                  return content ? (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  ) : (
                    'No description'
                  );
                })()}
              </div>
            </div>

            {/* All Moveframe Details */}
            <div className="grid grid-cols-2 gap-2">
              {/* Repetitions */}
              {hoveredMoveframe.repetitions && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Repetitions</span>
                  <span className="font-semibold text-blue-600">{hoveredMoveframe.repetitions}</span>
                </div>
              )}

              {/* Movelaps Count */}
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px]">Movelaps</span>
                <span className="font-semibold text-purple-600">
                  {hoveredMoveframe.movelaps?.length || 0}
                </span>
              </div>

              {/* Pause */}
              {hoveredMoveframe.pause && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Pause</span>
                  <span className="font-semibold text-orange-600">{hoveredMoveframe.pause}</span>
                </div>
              )}

              {/* Macro Rest */}
              {hoveredMoveframe.macroRest && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Rest</span>
                  <span className="font-semibold text-orange-600">{hoveredMoveframe.macroRest}</span>
                </div>
              )}

              {/* Macro Final */}
              {hoveredMoveframe.macroFinal && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Macro Final</span>
                  <span className="font-semibold text-green-600">{hoveredMoveframe.macroFinal}</span>
                </div>
              )}

              {/* Alarm */}
              {hoveredMoveframe.alarm && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Alarm</span>
                  <span className="font-semibold text-red-600">{hoveredMoveframe.alarm}</span>
                </div>
              )}

              {/* Code */}
              {hoveredMoveframe.code && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Code</span>
                  <span className="font-semibold text-gray-700 font-mono text-[10px]">{hoveredMoveframe.code}</span>
                </div>
              )}

              {/* Total Distance */}
              {hoveredMoveframe.totalDistance > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Distance</span>
                  <span className="font-semibold text-blue-600">{hoveredMoveframe.totalDistance}m</span>
                </div>
              )}

              {/* Total Reps */}
              {hoveredMoveframe.totalReps > 0 && (
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px]">Total Reps</span>
                  <span className="font-semibold text-purple-600">{hoveredMoveframe.totalReps}</span>
                </div>
              )}
            </div>

            {/* Notes - Only show for non-manual moveframes, as manual mode uses notes for content */}
            {hoveredMoveframe.notes && !hoveredMoveframe.manualMode && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Notes:</div>
                <div className="text-gray-900 bg-yellow-50 p-2 rounded text-[10px]">
                  {stripCircuitTags(hoveredMoveframe.notes)}
                </div>
              </div>
            )}

            {/* Movelaps Details */}
            {hoveredMoveframe.movelaps && hoveredMoveframe.movelaps.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="font-semibold text-gray-700 mb-1 text-[10px]">Movelaps ({hoveredMoveframe.movelaps.length}):</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {hoveredMoveframe.movelaps.map((lap: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-1.5 rounded text-[10px]">
                      <div className="font-semibold text-gray-700">#{idx + 1}</div>
                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        {/* For Body Building, show exercise name instead of distance */}
                        {hoveredMoveframe.sport === 'BODY_BUILDING' ? (
                          lap.exercise && <div>Exercise: <span className="font-semibold">{lap.exercise}</span></div>
                        ) : (
                          lap.distance && <div>Distance: <span className="font-semibold">{lap.distance}m</span></div>
                        )}
                        {lap.reps && <div>Reps: <span className="font-semibold">{lap.reps}</span></div>}
                        {lap.time && <div>Time: <span className="font-semibold">{lap.time}</span></div>}
                        {lap.pace && <div>Pace: <span className="font-semibold">{lap.pace}</span></div>}
                        {lap.speed && <div>Speed: <span className="font-semibold">{lap.speed}</span></div>}
                        {lap.pause && <div>Pause: <span className="font-semibold">{lap.pause}</span></div>}
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
              if (onCopyMoveframe) {
                onCopyMoveframe(moveframe, workout, day);
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
              if (onMoveMoveframe) {
                onMoveMoveframe(moveframe, workout, day);
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
              if (onDeleteMoveframe) {
                if (confirm(`Delete moveframe ${moveframe.letter}?`)) {
                  onDeleteMoveframe(moveframe);
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

                const response = await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    favourite: !moveframe.favourite
                  })
                });

                if (response.ok) {
                  alert(moveframe.favourite ? 'Removed from favorites!' : 'Saved to favorites!');
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
              color: moveframe.favourite ? '#a16207' : '#7e22ce',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = moveframe.favourite ? '#fef3c7' : '#f3e8ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            {moveframe.favourite ? 'Unfavorite' : 'Save to Favs'}
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
                  {moveframe.letter || 'A'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {sportName} - Manual Moveframe
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

