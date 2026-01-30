import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { GripVertical, Volume2, VolumeX, Bell, BellOff, MoreVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../../../styles/sticky-table.css';

// Helper function to strip HTML tags from text (defined at module level for accessibility)
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR safety
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

// Mapping of muscular sectors to images (from CircuitPlanner_OLD)
const MUSCULAR_SECTOR_IMAGES: Record<string, string> = {
  'Shoulders': '/muscular/shoulders.png',
  'Anterior arms': '/muscular/Biceps.png',
  'Rear arms': '/muscular/Triceps.png',
  'Forearms': '/muscular/Forearms.png',
  'Chest': '/muscular/chest.png',
  'Abdominals': '/muscular/abs.png',
  'Trapezius': '/muscular/trapezius.png',
  'Lats': '/muscular/Lats.png',
  'Front thighs': '/muscular/quadriceps.png',
  'Hind thighs': '/muscular/hams.png',
  'Calves': '/muscular/calves.png',
  'Glutes': '/muscular/glutes.png',
};

interface MovelapDetailTableProps {
  moveframe: any;
  onEditMovelap?: (movelap: any) => void;
  onDeleteMovelap?: (movelap: any) => void;
  onAddMovelap?: () => void;
  onAddMovelapAfter?: (movelap: any, index: number) => void;
  onRefresh?: () => void;
  allMoveframes?: any[]; // All moveframes in the workout for navigation
  onNavigateMoveframe?: (moveframeId: string) => void; // Navigate to another moveframe
}

// Editable Notes Field Component - 2026-01-22 12:00 UTC
// 2026-01-22 15:35 UTC - Added onRefresh callback to trigger parent refresh after save
// 2026-01-26 - Added isNewlyAdded prop for red text styling
function EditableNotesField({ movelap, stripHtmlTags, onRefresh, isNewlyAdded }: { movelap: any; stripHtmlTags: (html: string) => string; onRefresh?: () => void; isNewlyAdded?: boolean }) {
  const [notesValue, setNotesValue] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Initialize and update notes value when movelap changes
  // 2026-01-22 14:15 UTC - Strip both CIRCUIT_META and CIRCUIT_DATA tags
  React.useEffect(() => {
    let cleanNotes = movelap.notes || '';
    if (typeof cleanNotes === 'string') {
      // Remove circuit metadata tags
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '');
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '');
      cleanNotes = cleanNotes.trim();
    }
    setNotesValue(stripHtmlTags(cleanNotes));
  }, [movelap.notes, movelap.id, stripHtmlTags]);
  
  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsSaving(false);
      return;
    }
    
    // Preserve CIRCUIT_META if it exists
    let finalNotes = notesValue;
    if (movelap.notes && typeof movelap.notes === 'string') {
      const metaMatch = movelap.notes.match(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/);
      if (metaMatch) {
        finalNotes = notesValue + '\n' + metaMatch[0];
      }
    }
    
    try {
      const response = await fetch(`/api/workouts/movelaps/${movelap.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: finalNotes
        })
      });
      
      if (response.ok) {
        // Update the movelap object
        movelap.notes = finalNotes;
        // Trigger parent refresh if callback provided
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <input
      type="text"
      value={notesValue}
      onChange={(e) => setNotesValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      disabled={isSaving}
      className={`w-full px-1 py-0.5 text-xs border border-gray-200 rounded focus:border-blue-500 focus:outline-none disabled:bg-gray-100 ${isNewlyAdded ? 'text-red-600' : ''}`}
      placeholder="Add notes..."
      title="Edit notes (press Enter to save)"
    />
  );
}

// Sortable Row Component
// 2026-01-22 15:35 UTC - Added onRefresh callback
function SortableMovelapRow({ 
  movelap, 
  index, 
  sequenceNumber,
  moveframeLetter, 
  sectionColor, 
  sectionName, 
  moveframe, 
  onEditMovelap, 
  onDeleteMovelap,
  onCopyMovelap,
  onPasteMovelap,
  onAddMovelapAfter,
  pauseAmongCircuits,
  onRefresh
}: {
  movelap: any;
  index: number;
  sequenceNumber: number;
  moveframeLetter: string;
  sectionColor: string;
  sectionName: string;
  moveframe: any;
  onEditMovelap?: (movelap: any) => void;
  onDeleteMovelap?: (movelap: any) => void;
  onCopyMovelap: (movelap: any) => void;
  onPasteMovelap: (index: number) => void;
  onAddMovelapAfter?: (movelap: any, index: number) => void;
  pauseAmongCircuits?: string;
  onRefresh?: () => void;
}) {
  // Options dropdown state
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: movelap.id });

  // Calculate button position when dropdown opens
  const handleOpenDropdown = () => {
    console.log('🔵 handleOpenDropdown called');
    if (optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      console.log('🔵 Button rect:', rect);
      console.log('🔵 Viewport width:', window.innerWidth);
      
      setButtonRect(rect);
      setShowOptionsDropdown(true);
      console.log('🔵 Dropdown state set to true');
    } else {
      console.log('❌ optionsButtonRef.current is null');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsDropdown && dropdownRef.current && optionsButtonRef.current) {
        const target = event.target as Node;
        if (!dropdownRef.current.contains(target) && !optionsButtonRef.current.contains(target)) {
          console.log('🔴 Closing dropdown (clicked outside)');
          setShowOptionsDropdown(false);
          setButtonRect(null);
        }
      }
    };

    if (showOptionsDropdown) {
      console.log('👂 Adding mousedown listener');
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (showOptionsDropdown) {
        console.log('🧹 Removing mousedown listener');
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsDropdown]);

  // Debug: Track dropdown state changes
  useEffect(() => {
    console.log('🔷 showOptionsDropdown changed to:', showOptionsDropdown);
    console.log('🔷 buttonRect:', buttonRect);
    if (showOptionsDropdown && buttonRect) {
      console.log('✅ DROPDOWN SHOULD BE VISIBLE NOW!');
    }
  }, [showOptionsDropdown, buttonRect]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 9999 : 1,
    position: 'relative' as const,
    cursor: isDragging ? 'grabbing' : 'auto',
  };

  // Get sound icon
  const getSoundIcon = (movelap: any) => {
    if (movelap.sound) {
      const soundLower = movelap.sound.toLowerCase();
      if (soundLower.includes('beep') || soundLower.includes('alarm')) {
        return <Bell size={14} className="text-yellow-600" />;
      } else if (soundLower.includes('none') || soundLower === '—') {
        return <BellOff size={14} className="text-gray-400" />;
      } else {
        return <Volume2 size={14} className="text-blue-600" />;
      }
    }
    if (movelap.alarm) {
      return <Bell size={14} className="text-yellow-600" />;
    }
    return <VolumeX size={14} className="text-gray-400" />;
  };

  // Sport-specific rendering logic
  const sport = moveframe.sport || 'SWIM';
  const isSwim = sport === 'SWIM';
  const isBike = sport === 'BIKE' || sport === 'MTB';
  const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
  const isRowing = sport === 'ROWING' || sport === 'CANOEING';
  const isBodyBuilding = sport === 'BODY_BUILDING';
  
  // Distance-based sports (no tools)
  const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
  const isDistanceBased = distanceBasedSports.includes(sport);
  
  // Debug logging
  console.log('🏃 MovelapDetailTable sport:', sport, 'isDistanceBased:', isDistanceBased, 'hasTools:', !isBodyBuilding && !isDistanceBased);
  
  // Other sports have tools (Gymnastic, Stretching, Pilates, Yoga, Technical moves, Free moves, etc.)
  const hasTools = !isBodyBuilding && !isDistanceBased;
  
  return (
    <>
    <tr 
      ref={setNodeRef} 
      style={style} 
      className="hover:bg-gray-100 transition-colors duration-150 isolate relative z-0"
    >
      {/* Move (Drag Handle) Column */}
      <td className="border border-gray-300 px-1 py-1 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center w-8 h-8 rounded select-none transition-colors"
          style={{ touchAction: 'none' }}
          title="Drag to reorder movelap"
          type="button"
        >
          <GripVertical size={18} />
        </button>
      </td>
      
      {/* MF (Moveframe Letter) / Circuit Letter Column - 2026-01-22 10:30 UTC */}
      {/* 2026-01-22 11:30 UTC - Updated to show circuit letter (A, B, C) for circuits */}
      <td className="border border-gray-300 px-1 py-1 text-center font-bold text-xs">
        {movelap.circuitLetter ? movelap.circuitLetter : moveframeLetter}
      </td>
      
      {/* # (Repetition Number) / Circuit Info Column - 2026-01-22 10:30 UTC */}
      {/* 2026-01-24 - Updated to show format like "B-2-3" (circuit-series-station) */}
      <td className={`border border-gray-300 px-1 py-1 text-center font-bold text-xs ${
        movelap.isNewlyAdded ? 'text-red-600' : ''
      }`}>
        {movelap.circuitLetter 
          ? `${movelap.circuitLetter}-${movelap.localSeriesNumber || movelap.seriesNumber}-${movelap.stationNumber}` 
          : sequenceNumber}
      </td>
      
      {/* Workout Section Column - Combined color and name */}
      <td className="border border-gray-300 px-1 py-1 text-center">
        <div className="flex items-center justify-center gap-2">
          <div
            className="w-5 h-5 rounded flex-shrink-0"
            style={{ backgroundColor: sectionColor }}
            title={sectionName}
          />
          <span className="text-[10px]">{sectionName}</span>
        </div>
      </td>
      
      {/* Action Column - Shows sport name */}
      <td className="border border-gray-300 px-1 py-1 text-center text-[10px]">
        {sport.replace(/_/g, ' ')}
      </td>
      
      {/* SPORT-SPECIFIC COLUMNS */}
      
       {/* BODY BUILDING - Different fields */}
       {isBodyBuilding && (
         <>
           {/* Muscular Sector - 2026-01-24 - Added image display and doubled width, left aligned */}
           <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.muscularSector ? (
               <div className="flex items-center gap-2">
                 {MUSCULAR_SECTOR_IMAGES[movelap.muscularSector] && (
                   <img 
                     src={MUSCULAR_SECTOR_IMAGES[movelap.muscularSector]} 
                     alt={movelap.muscularSector}
                     className="w-8 h-8 object-contain flex-shrink-0"
                   />
                 )}
                 <span className="text-xs font-medium">{movelap.muscularSector}</span>
               </div>
             ) : '—'}
           </td>
           {/* Exercise - 2026-01-24 - Doubled width, left aligned */}
           <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.exercise || '—'}
           </td>
           {/* Reps */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.reps || '—'}
           </td>
           {!moveframe.isCircuitBased && (
             <>
           {/* Weight */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${movelap.isNewlyAdded ? 'text-red-600' : 'text-blue-700'}`}>
             {movelap.weight || '—'}
           </td>
           {/* Tempo/Speed */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.speed || '—'}
           </td>
             </>
           )}
         </>
       )}
      
       {/* OTHER SPORTS WITH TOOLS (Gymnastic, Stretching, Pilates, Yoga, etc.) */}
       {hasTools && (
         <>
           {/* Reps */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.reps || '—'}
           </td>
           {/* Tools */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${movelap.isNewlyAdded ? 'text-red-600' : 'text-green-700'}`}>
             {movelap.tools || '—'}
           </td>
         </>
       )}
      
       {/* SWIM, BIKE, RUN, ROWING, SKATE, SKI, SNOWBOARD - Distance-based sports */}
       {isDistanceBased && (
         <>
           {/* Distance/Duration - 2026-01-22 11:30 UTC - Show sector for circuits, distance/time for regular */}
           {/* 2026-01-22 14:20 UTC - Use style field for sector (stored in DB) */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.circuitLetter 
               ? (movelap.style || movelap.sector || '—')
               : (movelap.distance ? movelap.distance : (movelap.time || '—'))}
           </td>
           
           {/* Exercise (formerly Style) - 2026-01-22 11:30 UTC - Show exercise for circuits, style for regular */}
           {(isSwim || isRun) && (
             <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
               {movelap.circuitLetter 
                 ? (movelap.exercise || '—')
                 : (movelap.style || '—')}
             </td>
           )}
           
           {/* R1, R2 - Only for BIKE */}
           {isBike && (
             <>
               <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
                 {movelap.r1 || '—'}
               </td>
               <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
                 {movelap.r2 || '—'}
               </td>
             </>
           )}
           
          {/* Speed/Reps - For SWIM, BIKE, RUN - 2026-01-22 14:10 UTC - Show reps for circuits, speed for regular */}
          {/* 2026-01-22 14:20 UTC - For circuits, speed field stores reps value */}
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
            {movelap.speed || '—'}
          </td>
           
           {/* Row/min - Only for ROWING and CANOEING */}
           {(moveframe.sport === 'ROWING' || moveframe.sport === 'CANOEING') && (
             <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${movelap.isNewlyAdded ? 'text-red-600' : 'text-purple-700'}`}>
               {movelap.rowPerMin || '—'}
             </td>
           )}
           
           {/* Time */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '85px', minWidth: '85px' }}>
             {movelap.time || '—'}
           </td>
           
           {/* Pace */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '85px', minWidth: '85px' }}>
             {movelap.pace || '—'}
           </td>
         </>
       )}
      
       {/* COMMON COLUMNS for all sports */}
       
       {/* Pause/Recovery */}
       <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
         {movelap.pause || '—'}
       </td>
       
       {/* Macro Final - 2026-01-22 11:30 UTC - Show pause among circuits for circuit movelaps */}
       {/* 2026-01-22 15:35 UTC - Calculate pause for each movelap individually */}
       <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
         {movelap.circuitLetter ? (() => {
           // Extract pause value from moveframe notes for this specific movelap
           if (moveframe.notes && typeof moveframe.notes === 'string') {
             const circuitDataMatch = moveframe.notes.match(/\[CIRCUIT_DATA\](.*?)\[\/CIRCUIT_DATA\]/);
             if (circuitDataMatch) {
               try {
                 const circuitData = JSON.parse(circuitDataMatch[1]);
                 if (circuitData.config) {
                   // Support both old nested structure (pauses.circuits) and new flat structure (pauseCircuits)
                   let pauseSeconds = null;
                   if (circuitData.config.pauseCircuits !== undefined) {
                     // New structure: pauseCircuits in minutes
                     pauseSeconds = circuitData.config.pauseCircuits * 60; // Convert to seconds
                   } else if (circuitData.config.pauses && circuitData.config.pauses.circuits) {
                     // Old structure: pauses.circuits in seconds
                     pauseSeconds = circuitData.config.pauses.circuits;
                   }
                   
                   if (pauseSeconds !== null) {
                   const minutes = Math.floor(pauseSeconds / 60);
                   const seconds = pauseSeconds % 60;
                   return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
                   }
                 }
               } catch (e) {
                 console.error('Failed to parse circuit data:', e);
               }
             }
           }
           return '—';
         })() : (movelap.macroFinal || '—')}
       </td>
       
       {/* Alarm & Sound - Hide for circuit-based moveframes */}
       {!moveframe.isCircuitBased && (
       <td className={`border border-gray-300 px-1 py-1 text-center ${movelap.isNewlyAdded ? 'text-red-600' : ''}`}>
         <div className="flex items-center justify-center gap-1">
           {getSoundIcon(movelap)}
           {movelap.alarm && movelap.alarm !== -1 && <span className="text-[8px]">{Math.abs(movelap.alarm)}</span>}
         </div>
       </td>
       )}
      
      {/* Notes - Display with increased width for better readability */}
      {/* 2026-01-24 - Increased width 4x to 1200px for circuit movelap table */}
      {/* 2026-01-26 - Added red text styling for newly added movelaps */}
      <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${movelap.isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '300px' }}>
        {/* 2026-01-22 11:45 UTC - Made notes field editable */}
        {/* 2026-01-22 12:00 UTC - Fixed to use controlled component with local state */}
        {/* 2026-01-22 15:35 UTC - Added onRefresh callback */}
        {/* 2026-01-26 - Added isNewlyAdded prop for red text styling */}
        <EditableNotesField
          movelap={movelap}
          stripHtmlTags={stripHtmlTags}
          onRefresh={onRefresh}
          isNewlyAdded={movelap.isNewlyAdded}
        />
      </td>
      
      {/* Options Column - Simplified to Edit + Options dropdown */}
      {/* 2026-01-24 - Sticky options column */}
      <td className="border border-gray-300 px-1 py-1 text-center sticky-options-col bg-white" style={{ width: '110px', minWidth: '110px' }}>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEditMovelap) onEditMovelap(movelap);
            }}
            className="px-3 py-1 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Edit movelap"
          >
            Edit
          </button>
          <button
            ref={optionsButtonRef}
            onClick={(e) => {
              console.log('🟢 Options button clicked');
              e.stopPropagation();
              if (showOptionsDropdown) {
                console.log('🟢 Closing dropdown');
                setShowOptionsDropdown(false);
                setButtonRect(null);
              } else {
                console.log('🟢 Opening dropdown');
                handleOpenDropdown();
              }
            }}
            className="px-2 py-1 text-[10px] bg-gray-600 text-white rounded hover:bg-gray-700"
            title="More options"
          >
            Options
          </button>
        </div>
      </td>
    </tr>
    {/* Options Dropdown Menu Portal */}
    {showOptionsDropdown && buttonRect && (() => {
      const dropdownWidth = 150;
      const left = (buttonRect.right - dropdownWidth > 0) 
        ? Math.min(buttonRect.left, window.innerWidth - dropdownWidth - 10)
        : 10;
      
      console.log('🟣 Rendering dropdown portal at:', { 
        top: buttonRect.bottom + 5, 
        left: left,
        buttonLeft: buttonRect.left,
        buttonRight: buttonRect.right,
        viewportWidth: window.innerWidth
      });
      
      return ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-xl py-2"
          style={{
            top: `${buttonRect.bottom + 5}px`,
            left: `${left}px`,
            minWidth: '150px',
            zIndex: 999999,
            border: '2px solid #2563eb',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}
        >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyMovelap(movelap);
            setShowOptionsDropdown(false);
          }}
          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
        >
          Copy
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPasteMovelap(index);
            setShowOptionsDropdown(false);
          }}
          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
        >
          Paste
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onAddMovelapAfter) {
              onAddMovelapAfter(movelap, index);
            }
            setShowOptionsDropdown(false);
          }}
          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
        >
          Add movelap
        </button>
        <div className="border-t border-gray-200 my-1"></div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDeleteMovelap) {
              if (confirm(`Delete ${moveframeLetter}${index + 1}?`)) {
                onDeleteMovelap(movelap);
              }
            }
            setShowOptionsDropdown(false);
          }}
          className="block w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>,
      document.body
    );
    })()}
    </>
  );
}

export default function MovelapDetailTable({ 
  moveframe, 
  onEditMovelap, 
  onDeleteMovelap, 
  onAddMovelap,
  onAddMovelapAfter,
  onRefresh,
  allMoveframes = [],
  onNavigateMoveframe
}: MovelapDetailTableProps) {
  const [movelaps, setMovelaps] = useState(moveframe.movelaps || []);
  const moveframeLetter = moveframe.letter || 'A'; // Parent moveframe letter
  const sectionColor = moveframe.section?.color || '#5b8def';
  const sectionName = moveframe.section?.name || 'Default';
  const [copiedMovelap, setCopiedMovelap] = useState<any>(null);
  // 2026-01-22 14:15 UTC - Strip circuit tags from initial notes value
  const [noteValue, setNoteValue] = useState(() => {
    let cleanNotes = moveframe.notes || '';
    if (typeof cleanNotes === 'string') {
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '');
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '');
      cleanNotes = cleanNotes.trim();
    }
    return stripHtmlTags(cleanNotes);
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [currentMovelapIndex, setCurrentMovelapIndex] = useState(0); // Current movelap being viewed
  const [showManualContentPopup, setShowManualContentPopup] = useState(false); // Popup for manual content
  const [popupContentType, setPopupContentType] = useState<'summary' | 'detail'>('detail'); // Track which section is being viewed
  
  // 2026-01-22 10:50 UTC - Extract circuit data from moveframe notes if present
  // 2026-01-22 11:30 UTC - Also extract pause among circuits value
  let circuitBasedMoveframe = false;
  let pauseAmongCircuits = '—';
  if (moveframe.notes && typeof moveframe.notes === 'string') {
    const circuitDataMatch = moveframe.notes.match(/\[CIRCUIT_DATA\](.*?)\[\/CIRCUIT_DATA\]/);
    if (circuitDataMatch) {
      try {
        const circuitData = JSON.parse(circuitDataMatch[1]);
        circuitBasedMoveframe = circuitData.isCircuitBased || false;
        moveframe.isCircuitBased = circuitBasedMoveframe;
        
        // Extract pause among circuits (pauseCircuits in minutes or seconds)
        // Support both old nested structure (pauses.circuits) and new flat structure (pauseCircuits)
        let pauseValue = null;
        if (circuitData.config) {
          if (circuitData.config.pauseCircuits !== undefined) {
            // New structure: pauseCircuits in minutes
            pauseValue = circuitData.config.pauseCircuits * 60; // Convert to seconds
          } else if (circuitData.config.pauses && circuitData.config.pauses.circuits) {
            // Old structure: pauses.circuits in seconds
            pauseValue = circuitData.config.pauses.circuits;
          }
          
          if (pauseValue !== null) {
            const minutes = Math.floor(pauseValue / 60);
            const seconds = pauseValue % 60;
          pauseAmongCircuits = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
          }
        }
      } catch (e) {
        console.error('Failed to parse circuit data:', e);
      }
    }
  }
  
  // Navigation for movelaps within the same moveframe
  const hasPreviousMovelap = currentMovelapIndex > 0;
  const hasNextMovelap = currentMovelapIndex < movelaps.length - 1;
  
  // Check if this moveframe is manual mode
  const isManualMode = moveframe.manualMode === true;
  
  // Update noteValue when moveframe.notes changes (strip HTML and circuit tags)
  // 2026-01-22 14:15 UTC - Strip CIRCUIT_DATA and CIRCUIT_META tags
  React.useEffect(() => {
    let cleanNotes = moveframe.notes || '';
    if (typeof cleanNotes === 'string') {
      // Remove circuit data and metadata tags
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '');
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '');
      cleanNotes = cleanNotes.trim();
    }
    setNoteValue(stripHtmlTags(cleanNotes));
  }, [moveframe.notes]);
  
  // Debug logging
  console.log('🔍 MovelapDetailTable - Moveframe data:', {
    id: moveframe.id,
    letter: moveframe.letter,
    manualMode: moveframe.manualMode,
    isManualMode,
    hasNotes: !!moveframe.notes,
    notesLength: moveframe.notes?.length || 0,
    movelapCount: moveframe.movelaps?.length || 0
  });
  
  // Store original sequence numbers for each movelap (persists through drag operations)
  const [movelapSequences, setMovelapSequences] = useState<Map<string, number>>(new Map());

  // Initialize or update sequence numbers when movelaps change
  React.useEffect(() => {
    // Sort movelaps by repetitionNumber to maintain order after reload
    const unsortedMovelaps = moveframe.movelaps || [];
    console.log('🔄 MovelapDetailTable: Loading movelaps', {
      count: unsortedMovelaps.length,
      unsorted: unsortedMovelaps.map((ml: any) => ({ id: ml.id.slice(-4), repNum: ml.repetitionNumber }))
    });
    
    const newMovelaps = [...unsortedMovelaps].sort((a: any, b: any) => 
      (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
    );
    
    console.log('✅ MovelapDetailTable: Sorted movelaps', {
      sorted: newMovelaps.map((ml: any) => ({ id: ml.id.slice(-4), repNum: ml.repetitionNumber }))
    });
    
    setMovelaps(newMovelaps);
    // Reset navigation to first movelap when moveframe changes
    setCurrentMovelapIndex(0);
    
    // Regenerate all sequence numbers when movelaps change (e.g., when adding new movelaps)
    setMovelapSequences((prevSequences) => {
      const newSequences = new Map<string, number>();
      newMovelaps.forEach((movelap: any, idx: number) => {
        // Keep existing sequence if available, otherwise assign new one
        if (prevSequences.has(movelap.id)) {
          newSequences.set(movelap.id, prevSequences.get(movelap.id)!);
        } else {
          // New movelap - assign next available sequence number
          newSequences.set(movelap.id, idx + 1);
        }
      });
      
      // If count changed (new movelap added), regenerate all sequences sequentially
      if (newMovelaps.length !== prevSequences.size) {
        newMovelaps.forEach((movelap: any, idx: number) => {
          newSequences.set(movelap.id, idx + 1);
        });
      }
      
      return newSequences;
    });
  }, [moveframe.movelaps]);

  // Setup drag sensors with reliable activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Small distance to start drag
      },
    })
  );
  // Handle drag end - reorder movelaps
  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🎯 Movelap drag ended:', event);
    const { active, over } = event;
    
    console.log('🎯 Active ID:', active?.id, 'Over ID:', over?.id);
    
    if (!over || active.id === over.id) {
      console.log('🎯 Movelap drag cancelled or same position');
      return;
    }
    
    const oldIndex = movelaps.findIndex((ml: any) => ml.id === active.id);
    const newIndex = movelaps.findIndex((ml: any) => ml.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Reorder array
    const newOrder = [...movelaps];
    const [movedItem] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, movedItem);
    
    // Update local state immediately for smooth UX
    setMovelaps(newOrder);
    
    // Persist the new order to database
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No auth token for reorder');
        return;
      }

      const reorderPayload = newOrder.map((ml: any, idx: number) => ({
        id: ml.id,
        repetitionNumber: idx + 1 // repetitionNumber starts from 1
      }));
      
      console.log('📤 Calling movelap reorder API with:', reorderPayload.map((ml: any) => ({ id: ml.id.slice(-4), repNum: ml.repetitionNumber })));

      const response = await fetch('/api/workouts/movelaps/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          movelaps: reorderPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to persist movelap order:', errorData);
        // Revert on error
        setMovelaps(moveframe.movelaps || []);
      } else {
        const result = await response.json();
        console.log('✅ Movelap order persisted successfully:', result);
        // Notify parent to refresh data (expansion state is preserved in MoveframesSection)
        if (onRefresh) {
          console.log('🔄 Calling onRefresh to update Rip count...');
          await onRefresh();
          console.log('✅ onRefresh completed - Rip count updated, expansion preserved');
        } else {
          console.warn('⚠️ No onRefresh callback provided');
        }
      }
    } catch (error) {
      console.error('Error calling reorder API:', error);
      // Revert on error
      setMovelaps(moveframe.movelaps || []);
    }
  };

  // Handle copy movelap
  const handleCopyMovelap = (movelap: any) => {
    setCopiedMovelap(movelap);
    alert(`Movelap #${movelaps.findIndex((ml: any) => ml.id === movelap.id) + 1} copied! Click "Paste" on any row to insert it after that position.`);
  };

  // Handle paste movelap
  const handlePasteMovelap = async (afterIndex: number) => {
    if (!copiedMovelap) {
      console.log('No movelap copied. Click "Copy" on a movelap first.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        return;
      }

      // Create new movelap after the specified position
      const newMovelap = {
        ...copiedMovelap,
        id: undefined, // Will be assigned by backend
        moveframeId: moveframe.id,
        repetitionNumber: afterIndex + 2 // Insert after current position
      };

      const response = await fetch('/api/workouts/movelaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newMovelap)
      });

      if (response.ok) {
        console.log('Movelap pasted successfully');
        // Refresh data without page reload
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to paste movelap');
      }
    } catch (error) {
      console.error('Error pasting movelap:', error);
    }
  };

  // Handle save note
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: noteValue })
      });

      if (response.ok) {
        console.log('Note saved successfully');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSavingNote(false);
    }
  };
  
  // Manual Mode Layout - Simplified
  if (isManualMode) {
    // Parse manual content from notes - it might be JSON or HTML
    // 2026-01-22 14:15 UTC - Strip circuit tags from manual content
    let manualContent = '';
    try {
      const parsed = JSON.parse(moveframe.notes || '{}');
      manualContent = parsed.htmlContent || parsed.content || moveframe.notes || '';
    } catch {
      // Not JSON, use as-is
      manualContent = moveframe.notes || 'No content';
    }
    
    // Strip circuit tags if present
    if (typeof manualContent === 'string') {
      manualContent = manualContent.replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '');
      manualContent = manualContent.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '');
      manualContent = manualContent.trim();
    }

    return (
      <>
      <div className="p-2 pr-0">
        {/* Note Box, Save Button, and Add Movelap Button for Manual Mode - Above Table */}
        <div className="mb-3 flex items-center gap-4">
          {/* Movelap Navigation */}
          {movelaps.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMovelapIndex(Math.max(0, currentMovelapIndex - 1))}
                disabled={!hasPreviousMovelap}
                className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                title={hasPreviousMovelap ? `Previous movelap ${currentMovelapIndex}` : 'First movelap'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="15,18 9,12 15,6" />
                </svg>
              </button>
              <span className="text-xs font-semibold text-gray-700">
                Movelaps of {moveframeLetter} ({currentMovelapIndex + 1}/{movelaps.length})
              </span>
              <button
                onClick={() => setCurrentMovelapIndex(Math.min(movelaps.length - 1, currentMovelapIndex + 1))}
                disabled={!hasNextMovelap}
                className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                title={hasNextMovelap ? `Next movelap ${currentMovelapIndex + 2}` : 'Last movelap'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="9,6 15,12 9,18" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Add Movelap Button */}
          {onAddMovelap && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddMovelap();
              }}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
            >
              + Add Movelap
            </button>
          )}
          
          {/* Note Box with Save Button */}
          <div className="flex items-center gap-2" style={{ maxWidth: '600px' }}>
            <label className="text-xs font-semibold text-black whitespace-nowrap">
              Note
            </label>
            <input
              type="text"
              className="px-2 py-1 text-xs text-red-600 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              style={{ width: '500px' }}
              placeholder="Add a note for this moveframe..."
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
            />
            <button
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 whitespace-nowrap"
            >
              {isSavingNote ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Manual Mode Table - Two separate editable sections */}
        {/* 2026-01-24 - Scrollable wrapper for sticky Options column */}
        <div className="overflow-x-auto overflow-y-visible table-scrollbar">
          <table className="text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '1100px', width: '100%' }}>
          <thead className="bg-gradient-to-r from-purple-200 to-pink-200">
            <tr>
              <th className="border border-gray-300 px-3 py-2 text-center text-[11px] font-bold" style={{ width: '80px', minWidth: '80px' }}>Sport</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-[11px] font-bold" style={{ minWidth: '400px' }}>Summary</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-[11px] font-bold" style={{ minWidth: '400px' }}>Detail of workout</th>
              <th className="border border-gray-300 px-3 py-2 text-center text-[11px] font-bold sticky-options-header bg-gradient-to-r from-purple-200 to-pink-200" style={{ width: '100px', minWidth: '100px' }}>Options</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-blue-50">
              {/* Sport */}
              <td className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold bg-white align-middle" style={{ width: '80px', minWidth: '80px' }}>
                <span className="font-bold text-purple-800">
                  {moveframe.sport?.replace(/_/g, ' ') || '—'}
                </span>
              </td>
              
              {/* Summary (Notes from movelap) */}
              <td 
                className="border border-gray-300 px-2 py-2 text-xs cursor-pointer hover:bg-gray-50 bg-white align-top"
                onDoubleClick={() => {
                  setPopupContentType('summary');
                  setShowManualContentPopup(true);
                }}
                title="Double-click to view full text"
              >
                <div 
                  className="max-h-48 overflow-y-auto text-left"
                  style={{
                    lineHeight: '1.6',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: moveframe.movelaps?.[0]?.notes || 'No summary' 
                  }}
                />
              </td>
              
              {/* Detail of workout (Manual Content from moveframe.notes) */}
              <td 
                className="border border-gray-300 px-2 py-2 text-xs cursor-pointer hover:bg-gray-50 bg-white align-top"
                onClick={() => {
                  setPopupContentType('detail');
                  setShowManualContentPopup(true);
                }}
                title="Click to view full text"
              >
                <div 
                  className="line-clamp-3 text-left"
                  style={{
                    lineHeight: '1.6',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '12px'
                  }}
                  dangerouslySetInnerHTML={{ __html: manualContent }}
                />
              </td>
              
              {/* Options */}
              <td className="border border-gray-300 px-2 py-2 text-center sticky-options-col bg-white align-middle" style={{ width: '100px', minWidth: '100px' }}>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const movelapToEdit = moveframe.movelaps && moveframe.movelaps.length > 0 
                        ? moveframe.movelaps[0]
                        : {
                            id: 'temp-manual-movelap',
                            moveframeId: moveframe.id,
                            sequenceNumber: 1,
                            repetitionNumber: 1,
                          };
                      
                      if (onEditMovelap) {
                        onEditMovelap(movelapToEdit);
                      }
                    }}
                    className="px-3 py-1 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit movelap"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddMovelap) {
                        onAddMovelap();
                      }
                    }}
                    className="px-2 py-1 text-[10px] bg-purple-500 text-white rounded hover:bg-purple-600"
                    title="Add movelap"
                  >
                    Options
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* Manual Content Popup Modal */}
      {showManualContentPopup && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4"
          onClick={() => setShowManualContentPopup(false)}
          style={{ margin: 0 }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${popupContentType === 'summary' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white p-4 rounded-t-xl flex items-center justify-between`}>
              <h3 className="text-xl font-bold">
                {popupContentType === 'summary' ? 'Summary - Extended Text' : 'Detail of workout - Extended Text'}
              </h3>
              <button
                onClick={() => setShowManualContentPopup(false)}
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
              {popupContentType === 'summary' ? (
                <div
                  className="prose prose-lg max-w-none text-gray-800"
                  style={{
                    lineHeight: '1.8',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '16px',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {stripHtmlTags(moveframe.movelaps?.[0]?.notes || 'No summary available')}
                </div>
              ) : (
                <div
                  className="prose prose-lg max-w-none text-gray-800"
                  style={{
                    lineHeight: '1.8',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '16px'
                  }}
                  dangerouslySetInnerHTML={{ __html: manualContent }}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
    );
  }

  // Standard Mode Layout - Full movelaps table
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => console.log('🚀 Movelap drag started:', event.active.id)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={movelaps.map((ml: any) => ml.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 pr-0">
          {/* Top Controls - Note and Add Movelap Button */}
          <div className="mb-3 flex items-center gap-4" style={{ backgroundColor: 'rgb(250, 255, 214)', padding: '8px', marginLeft: '-8px', marginRight: '8px', marginTop: '-8px' }}>
            {/* Movelap Navigation */}
            {movelaps.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMovelapIndex(Math.max(0, currentMovelapIndex - 1))}
                  disabled={!hasPreviousMovelap}
                  className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  title={hasPreviousMovelap ? `Previous movelap ${currentMovelapIndex}` : 'First movelap'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="15,18 9,12 15,6" />
                  </svg>
                </button>
                <span className="text-xs font-semibold text-gray-700">
                  Movelaps of {moveframeLetter} ({currentMovelapIndex + 1}/{movelaps.length})
                </span>
                <button
                  onClick={() => setCurrentMovelapIndex(Math.min(movelaps.length - 1, currentMovelapIndex + 1))}
                  disabled={!hasNextMovelap}
                  className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  title={hasNextMovelap ? `Next movelap ${currentMovelapIndex + 2}` : 'Last movelap'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="9,6 15,12 9,18" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Add Movelap Button */}
            {onAddMovelap && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMovelap();
                }}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
              >
                + Add Movelap
              </button>
            )}
            
            {/* Note Box with Save Button */}
            <div className="flex items-center gap-2" style={{ maxWidth: '600px' }}>
              <label className="text-xs font-semibold text-black whitespace-nowrap">
                Note
              </label>
              <input
                type="text"
                className="px-2 py-1 text-xs text-red-600 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                style={{ width: '500px' }}
                placeholder="Add a note for this moveframe..."
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
              />
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 whitespace-nowrap"
              >
                {isSavingNote ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* 2026-01-24 - Scrollable wrapper for sticky Options column */}
          <div className="overflow-x-auto overflow-y-visible table-scrollbar">
            <table className="text-xs bg-white" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: moveframe.isCircuitBased ? '1340px' : '1600px', width: '100%' }}>
            {/* Render sport-specific column headers */}
            {(() => {
              const sport = moveframe.sport || 'SWIM';
              const isSwim = sport === 'SWIM';
              const isBike = sport === 'BIKE' || sport === 'MTB';
              const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
              const isRowing = sport === 'ROWING' || sport === 'CANOEING';
              const isBodyBuilding = sport === 'BODY_BUILDING';
              
              // Distance-based sports (no tools) - MUST match the array at top of component!
              const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
              const isDistanceBased = distanceBasedSports.includes(sport);
              
              // Other sports have tools (Gymnastic, Stretching, Pilates, Yoga, Technical moves, Free moves, etc.)
              const hasTools = !isBodyBuilding && !isDistanceBased;
              
              return (
                <>
                  <colgroup>
                    <col style={{ width: '30px' }} />
                    <col style={{ width: '30px' }} />
                    {/* 2026-01-27 - Reduced widths for circuit movelap table */}
                    <col style={{ width: moveframe.isCircuitBased ? '60px' : '30px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '80px' }} />
                    {isBodyBuilding && (
                      <>
                        {/* 2026-01-27 - Reduced Musc.Sector and Exercise widths for circuits */}
                        <col style={{ width: moveframe.isCircuitBased ? '140px' : '100px' }} />
                        <col style={{ width: moveframe.isCircuitBased ? '180px' : '120px' }} />
                        <col style={{ width: moveframe.isCircuitBased ? '40px' : '50px' }} />
                        {!moveframe.isCircuitBased && (
                          <>
                        <col style={{ width: '60px' }} />
                        <col style={{ width: '50px' }} />
                          </>
                        )}
                      </>
                    )}
                    {hasTools && (
                      <>
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '120px' }} />
                      </>
                    )}
                    {isDistanceBased && (
                      <>
                        <col style={{ width: '60px' }} />
                        {(isSwim || isRun) && <col style={{ width: '100px' }} />}
                        {isBike && (
                          <>
                            <col style={{ width: '50px' }} />
                            <col style={{ width: '50px' }} />
                          </>
                        )}
                        <col style={{ width: '50px' }} />
                        {isRowing && <col style={{ width: '60px' }} />}
                        <col style={{ width: '60px' }} />
                        <col style={{ width: '60px' }} />
                      </>
                    )}
                    <col style={{ width: '45px' }} />
                    <col style={{ width: '40px' }} />
                    {!moveframe.isCircuitBased && <col style={{ width: '60px' }} />}
                    {/* 2026-01-27 - Reduced Notes width for circuits */}
                    <col style={{ width: moveframe.isCircuitBased ? '200px' : '300px' }} />
                    <col style={{ width: '110px', minWidth: '110px' }} />
                  </colgroup>
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" title="Drag to reorder">Move</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">MF</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">#</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Workout section</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Sport</th>
                      
                      {isBodyBuilding && (
                        <>
                          <th className="border border-gray-300 px-1 py-1 text-left text-[10px]">Musc.Sector</th>
                          <th className="border border-gray-300 px-1 py-1 text-left text-[10px]">Exercise</th>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Reps</th>
                          {!moveframe.isCircuitBased && (
                            <>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Weight</th>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Tempo</th>
                            </>
                          )}
                        </>
                      )}
                      
                      {hasTools && (
                        <>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Reps</th>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Tools</th>
                        </>
                      )}
                      
                      {isDistanceBased && (
                        <>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">
                            {moveframe.isCircuitBased ? 'Musc.Sector' : 'Dist/Dur'}
                          </th>
                          {(isSwim || isRun) && (
                            <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Exercise</th>
                          )}
                          {isBike && (
                            <>
                              <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">R1</th>
                              <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">R2</th>
                            </>
                          )}
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">
                            {moveframe.isCircuitBased ? 'Reps' : 'Speed'}
                          </th>
                          {isRowing && (
                            <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Row/min</th>
                          )}
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" style={{ width: '85px', minWidth: '85px' }}>Time</th>
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" style={{ width: '85px', minWidth: '85px' }}>Pace</th>
                        </>
                      )}
                      
                      {/* Common headers */}
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Pause</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Macro</th>
                      {!moveframe.isCircuitBased && (
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Alarm&Snd</th>
                      )}
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" style={{ width: '300px' }}>Notes</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px] sticky-options-header bg-gray-200" style={{ width: '110px', minWidth: '110px' }}>Options</th>
                    </tr>
                  </thead>
                </>
              );
            })()}
            
            <tbody>
              {movelaps.map((movelap: any, index: number) => {
                // 2026-01-22 10:50 UTC - Extract circuit metadata from notes if present
                let circuitMetadata: any = null;
                if (movelap.notes && typeof movelap.notes === 'string') {
                  const metaMatch = movelap.notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
                  if (metaMatch) {
                    try {
                      circuitMetadata = JSON.parse(metaMatch[1]);
                      // Attach to movelap for easy access
                      movelap.circuitLetter = circuitMetadata.circuitLetter;
                      movelap.circuitIndex = circuitMetadata.circuitIndex;
                      movelap.seriesNumber = circuitMetadata.seriesNumber;
                      movelap.localSeriesNumber = circuitMetadata.localSeriesNumber;
                      movelap.stationNumber = circuitMetadata.stationNumber;
                    } catch (e) {
                      console.error('Failed to parse circuit metadata:', e);
                    }
                  }
                }
                // Calculate group headers for aerobic sports
                const aerobicSeriesNum = parseInt(moveframe.aerobicSeries || '1');
                const repsPerGroup = Math.ceil(movelaps.length / aerobicSeriesNum);
                const currentGroup = Math.floor(index / repsPerGroup) + 1;
                const isFirstInGroup = index % repsPerGroup === 0;
                const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                const sport = moveframe.sport || 'SWIM';
                
                // Calculate column count based on sport type
                const isSwim = sport === 'SWIM';
                const isBike = sport === 'BIKE' || sport === 'MTB';
                const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
                const isRowing = sport === 'ROWING' || sport === 'CANOEING';
                const isBodyBuilding = sport === 'BODY_BUILDING';
                const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
                const isDistanceBased = distanceBasedSports.includes(sport);
                const hasTools = !isBodyBuilding && !isDistanceBased;
                
                // Base columns: Move(1) + MF(1) + #(1) + Workout section(1) + Sport(1) = 5
                let totalColumns = 5;
                
                if (isBodyBuilding) {
                  totalColumns += 5; // Musc.Sector + Exercise + Reps + Weight + Tempo (Rest Type removed 2026-01-24)
                  // For circuit-based bodybuilding, remove Weight and Tempo columns
                  if (moveframe.isCircuitBased) {
                    totalColumns -= 2; // Remove Weight + Tempo
                  }
                } else if (hasTools) {
                  totalColumns += 2; // Reps + Tools
                } else if (isDistanceBased) {
                  totalColumns += 1; // Dist/Dur
                  if (isSwim || isRun) totalColumns += 1; // Style
                  if (isBike) totalColumns += 2; // R1 + R2
                  totalColumns += 1; // Speed
                  if (isRowing) totalColumns += 1; // Row/min
                  totalColumns += 2; // Time + Pace
                }
                
                // Trailing columns: Pause(1) + Macro(1) + Alarm&Snd(1) + Notes(1) + Options(1) = 5
                // For circuit-based moveframes, remove Alarm&Snd column
                totalColumns += moveframe.isCircuitBased ? 4 : 5;
                
                // 2026-01-22 10:30 UTC - Circuit header logic
                const isCircuitBased = moveframe.isCircuitBased || movelap.circuitLetter;
                const isFirstInCircuit = isCircuitBased && (index === 0 || movelaps[index - 1]?.circuitLetter !== movelap.circuitLetter);
                const circuitLetter = movelap.circuitLetter || '';
                const circuitIndex = movelap.circuitIndex || 1;
                
                return (
                  <React.Fragment key={movelap.id}>
                    {/* Circuit Header - 2026-01-22 10:30 UTC */}
                    {/* 2026-01-22 15:25 UTC - Removed "Group" text, keeping only Circuit letter */}
                    {isCircuitBased && isFirstInCircuit && (
                      <tr>
                        <td colSpan={totalColumns} className="border border-gray-400 bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900">
                          Circuit {circuitLetter}
                        </td>
                      </tr>
                    )}
                    
                    {/* Group Header (for aerobic sports without circuits) */}
                    {!isCircuitBased && AEROBIC_SPORTS.includes(sport) && aerobicSeriesNum > 1 && isFirstInGroup && (
                      <tr>
                        <td colSpan={totalColumns} className="border border-gray-400 bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900 text-center">
                          Group {currentGroup}
                        </td>
                      </tr>
                    )}
                    <SortableMovelapRow
                      movelap={movelap}
                      index={index}
                      sequenceNumber={movelapSequences.get(movelap.id) || index + 1}
                      moveframeLetter={moveframeLetter}
                      sectionColor={sectionColor}
                      sectionName={sectionName}
                      moveframe={moveframe}
                      onEditMovelap={onEditMovelap}
                      onDeleteMovelap={onDeleteMovelap}
                      onCopyMovelap={handleCopyMovelap}
                      onPasteMovelap={handlePasteMovelap}
                      onAddMovelapAfter={onAddMovelapAfter}
                      pauseAmongCircuits={pauseAmongCircuits}
                      onRefresh={onRefresh}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

