import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { GripVertical, Volume2, VolumeX, Bell, BellOff, MoreVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MACRO_FINAL_OPTIONS } from '@/constants/moveframe.constants';
import { getExercisesBySector } from '@/data/mockExercises';
import '../../../styles/sticky-table.css';

// Helper function to strip HTML tags from text (defined at module level for accessibility)
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined') return html; // SSR safety
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

const extractCircuitMetaFromNotes = (notes: unknown) => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const upsertCircuitMetaInNotes = (notes: unknown, circuitMeta: any) => {
  const base = typeof notes === 'string' ? notes : '';
  const cleaned = base.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '').trim();
  const metaString = `[CIRCUIT_META]${JSON.stringify(circuitMeta)}[/CIRCUIT_META]`;
  return cleaned ? `${cleaned}\n${metaString}` : metaString;
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

const upsertFastPlannerDataInNotes = (notes: unknown, data: any): string => {
  const base = typeof notes === 'string' ? notes : '';
  const stripped = base.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '').trim();
  const tag = `[FAST_PLANNER_DATA]${JSON.stringify(data)}[/FAST_PLANNER_DATA]`;
  return stripped ? `${stripped}\n\n${tag}` : tag;
};

const extractFastPlannerModeFromNotes = (notes: unknown): { mode: string | null; notes: string } => {
  if (typeof notes !== 'string') return { mode: null, notes: '' };
  const withoutCircuit = notes
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .trim();

  const tagMatch = withoutCircuit.match(/\[FP_MODE\]([\s\S]*?)\[\/FP_MODE\]/);
  if (tagMatch) {
    const mode = (tagMatch[1] ?? '').trim();
    const cleanedNotes = withoutCircuit.replace(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/g, '').trim();
    return { mode: mode || null, notes: cleanedNotes };
  }

  const legacy = withoutCircuit.trim();
  const legacyModes = new Set(['Stopped', 'Superset', 'Movement Customized']);
  if (legacyModes.has(legacy)) {
    return { mode: legacy, notes: '' };
  }

  return { mode: null, notes: legacy };
};

const upsertFastPlannerModeInNotes = (notes: unknown, mode: string | null): string => {
  const base = typeof notes === 'string' ? notes : '';
  const cleaned = base.replace(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/g, '').trim();
  const normalizedMode = typeof mode === 'string' ? mode.trim() : '';
  if (!normalizedMode) return cleaned;
  const tag = `[FP_MODE]${normalizedMode}[/FP_MODE]`;
  return cleaned ? `${cleaned}\n${tag}` : tag;
};

const formatFastPlannerTime = (value: string, finalize = false): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (!finalize) return digits;
  const padded = digits.length < 4 ? digits.padStart(4, '0') : digits;
  const seconds = padded.slice(-2);
  const minutes = padded.slice(0, -2);
  return `${minutes}'${seconds}"`;
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
      cleanNotes = cleanNotes.replace(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/g, '');
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
    
    let finalNotes = notesValue;
    const modeFromMovelap =
      typeof movelap?._fastPlannerMode === 'string' && movelap._fastPlannerMode.trim() !== ''
        ? movelap._fastPlannerMode.trim()
        : null;

    if (modeFromMovelap) {
      finalNotes = upsertFastPlannerModeInNotes(finalNotes, modeFromMovelap);
    }

    const rawNotesForCircuitMeta = typeof movelap?._fastPlannerRawNotes === 'string' ? movelap._fastPlannerRawNotes : movelap.notes;
    if (rawNotesForCircuitMeta && typeof rawNotesForCircuitMeta === 'string') {
      const metaMatch = rawNotesForCircuitMeta.match(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/);
      if (metaMatch) {
        finalNotes = finalNotes ? `${finalNotes}\n${metaMatch[0]}` : metaMatch[0];
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
  isNewlyAdded,
  index, 
  sequenceNumber,
  moveframeLetter, 
  sectionColor, 
  sectionName, 
  moveframe, 
  onEditMovelap, 
  onEditFastPlannerMovelap,
  onAddFastPlannerMovelap,
  onDeleteMovelap,
  onCopyMovelap,
  onPasteMovelap,
  onAddMovelapAfter,
  onAddStationAfter,
  pauseAmongCircuits,
  circuitInfoByLetter,
  defaultSeriesPerCircuit,
  defaultStationsPerCircuit,
  pauseCircuitsSeconds,
  pauseSeriesSeconds,
  onRefresh
}: {
  movelap: any;
  isNewlyAdded?: boolean;
  index: number;
  sequenceNumber: number;
  moveframeLetter: string;
  sectionColor: string;
  sectionName: string;
  moveframe: any;
  onEditMovelap?: (movelap: any) => void;
  onEditFastPlannerMovelap?: (movelap: any) => void;
  onAddFastPlannerMovelap?: () => void;
  onDeleteMovelap?: (movelap: any) => void;
  onCopyMovelap: (movelap: any) => void;
  onPasteMovelap: (index: number) => void;
  onAddMovelapAfter?: (movelap: any, index: number) => void;
  onAddStationAfter?: (movelap: any, index: number) => void;
  pauseAmongCircuits?: string;
  circuitInfoByLetter?: Map<string, { seriesCount: number; stationsPerSeries: number }>;
  defaultSeriesPerCircuit?: number | null;
  defaultStationsPerCircuit?: number | null;
  pauseCircuitsSeconds?: number | null;
  pauseSeriesSeconds?: number | null;
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

  const circuitInfo = movelap.circuitLetter ? circuitInfoByLetter?.get(movelap.circuitLetter) : null;
  const seriesCount = circuitInfo?.seriesCount ?? defaultSeriesPerCircuit ?? 0;
  const stationsPerSeries = circuitInfo?.stationsPerSeries ?? defaultStationsPerCircuit ?? 0;
  const isEndOfSeries = !!(movelap.circuitLetter && stationsPerSeries && movelap.stationNumber === stationsPerSeries);
  const isEndOfCircuit = !!(movelap.circuitLetter && isEndOfSeries && seriesCount && movelap.localSeriesNumber === seriesCount);
  const formatPause = (pauseSeconds: number) => {
    const minutes = Math.floor(pauseSeconds / 60);
    const seconds = pauseSeconds % 60;
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  };
  const macroValue = movelap.macroFinal
    ? movelap.macroFinal
    : movelap.circuitLetter
      ? isEndOfCircuit && pauseCircuitsSeconds != null
        ? formatPause(pauseCircuitsSeconds)
        : isEndOfSeries && pauseSeriesSeconds != null
          ? formatPause(pauseSeriesSeconds)
          : null
      : null;
  const pauseValue = macroValue ? null : movelap.pause;

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
  const isFastPlanner = !!extractFastPlannerDataFromNotes(moveframe?.notes) && moveframe?.type === 'BATTERY' && !moveframe?.isCircuitBased;
  
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
        isNewlyAdded ? 'text-red-600' : ''
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
      
       {isFastPlanner && (
         <>
           <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
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
           <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.exercise || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.speed || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap._fastPlannerSeries || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap._fastPlannerRipTime || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-blue-700'}`}>
             {movelap.weight || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap._fastPlannerBreak || movelap.pause || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap._fastPlannerMode || '—'}
           </td>
         </>
       )}

       {/* BODY BUILDING - Different fields */}
       {isBodyBuilding && !isFastPlanner && (
         <>
           {/* Muscular Sector - 2026-01-24 - Added image display and doubled width, left aligned */}
           <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
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
           <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.exercise || '—'}
           </td>
           {/* Reps */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.reps || '—'}
           </td>
           {!moveframe.isCircuitBased && (
             <>
           {/* Weight */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-blue-700'}`}>
             {movelap.weight || '—'}
           </td>
           {/* Tempo/Speed */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
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
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.reps || '—'}
           </td>
           {/* Tools */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-green-700'}`}>
             {movelap.tools || '—'}
           </td>
         </>
       )}
      
       {/* SWIM, BIKE, RUN, ROWING, SKATE, SKI, SNOWBOARD - Distance-based sports */}
       {isDistanceBased && (
         <>
           {/* Distance/Duration - 2026-01-22 11:30 UTC - Show sector for circuits, distance/time for regular */}
           {/* 2026-01-22 14:20 UTC - Use style field for sector (stored in DB) */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {movelap.circuitLetter 
               ? (movelap.style || movelap.sector || '—')
               : (movelap.distance ? movelap.distance : (movelap.time || '—'))}
           </td>
           
           {/* Exercise (formerly Style) - 2026-01-22 11:30 UTC - Show exercise for circuits, style for regular */}
           {(isSwim || isRun) && (
             <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
               {movelap.circuitLetter 
                 ? (movelap.exercise || '—')
                 : (movelap.style || '—')}
             </td>
           )}
           
           {/* R1, R2 - Only for BIKE */}
           {isBike && (
             <>
               <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
                 {movelap.r1 || '—'}
               </td>
               <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
                 {movelap.r2 || '—'}
               </td>
             </>
           )}
           
          {/* Speed/Reps - For SWIM, BIKE, RUN - 2026-01-22 14:10 UTC - Show reps for circuits, speed for regular */}
          {/* 2026-01-22 14:20 UTC - For circuits, speed field stores reps value */}
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {movelap.speed || '—'}
          </td>
           
           {/* Row/min - Only for ROWING and CANOEING */}
           {(moveframe.sport === 'ROWING' || moveframe.sport === 'CANOEING') && (
             <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-purple-700'}`}>
               {movelap.rowPerMin || '—'}
             </td>
           )}
           
           {/* Time */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '85px', minWidth: '85px' }}>
             {movelap.time || '—'}
           </td>
           
           {/* Pace */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '85px', minWidth: '85px' }}>
             {movelap.pace || '—'}
           </td>
         </>
       )}
      
       {/* COMMON COLUMNS for all sports */}
       
       {/* Pause/Recovery */}
      {!isFastPlanner && (
      <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
        {pauseValue === 0 ? '0' : pauseValue || '—'}
       </td>
      )}
       
       {/* Macro Final - 2026-01-22 11:30 UTC - Show pause among circuits for circuit movelaps */}
       {/* 2026-01-22 15:35 UTC - Calculate pause for each movelap individually */}
      {!isFastPlanner && (
      <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
        {macroValue === 0 ? '0' : macroValue || '—'}
       </td>
      )}
       
       {/* Alarm & Sound - Hide for circuit-based moveframes */}
       {!moveframe.isCircuitBased && !isFastPlanner && (
      <td className={`border border-gray-300 px-1 py-1 text-center ${isNewlyAdded ? 'text-red-600' : ''}`}>
         <div className="flex items-center justify-center gap-1">
           {getSoundIcon(movelap)}
           {movelap.alarm && movelap.alarm !== -1 && <span className="text-[8px]">{Math.abs(movelap.alarm)}</span>}
         </div>
       </td>
       )}
      
      {/* Notes - Display with increased width for better readability */}
      {/* 2026-01-24 - Increased width 4x to 1200px for circuit movelap table */}
      {/* 2026-01-26 - Added red text styling for newly added movelaps */}
      <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '300px' }}>
        {/* 2026-01-22 11:45 UTC - Made notes field editable */}
        {/* 2026-01-22 12:00 UTC - Fixed to use controlled component with local state */}
        {/* 2026-01-22 15:35 UTC - Added onRefresh callback */}
        {/* 2026-01-26 - Added isNewlyAdded prop for red text styling */}
        <EditableNotesField
          movelap={movelap}
          stripHtmlTags={stripHtmlTags}
          onRefresh={onRefresh}
          isNewlyAdded={isNewlyAdded}
        />
      </td>
      
      {/* Options Column - Simplified to Edit + Options dropdown */}
      {/* 2026-01-24 - Sticky options column */}
      <td className="border border-gray-300 px-1 py-1 text-center sticky-options-col bg-white" style={{ width: '110px', minWidth: '110px' }}>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isFastPlanner) {
                if (onEditFastPlannerMovelap) onEditFastPlannerMovelap(movelap);
                return;
              }
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
        {!moveframe.isCircuitBased && !isFastPlanner && (
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
        )}
        {isFastPlanner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddFastPlannerMovelap?.();
              setShowOptionsDropdown(false);
            }}
            className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
          >
            Add movelap
          </button>
        )}
        {!!(movelap.circuitLetter || moveframe.isCircuitBased) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStationAfter?.(movelap, index);
              setShowOptionsDropdown(false);
            }}
            className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
          >
            Add station
          </button>
        )}
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
  const [newlyAddedStationMovelapIds, setNewlyAddedStationMovelapIds] = useState<Set<string>>(() => new Set());
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [addStationDraft, setAddStationDraft] = useState(() => ({
    muscularSector: '',
    exercise: '',
    reps: '',
    pause: '',
    macroFinal: '',
    notes: '',
    seriesNumber: 1
  }));
  const [isAddingStation, setIsAddingStation] = useState(false);
  const [addStationTarget, setAddStationTarget] = useState<{
    afterMovelapId: string;
    circuitLetter: string;
    circuitIndex?: number;
    seriesNumber?: number;
    localSeriesNumber: number;
    stationNumber: number;
  } | null>(null);
  const [showFastPlannerMovelapModal, setShowFastPlannerMovelapModal] = useState(false);
  const [fastPlannerMovelapModalMode, setFastPlannerMovelapModalMode] = useState<'add' | 'edit'>('add');
  const [fastPlannerOriginalExercise, setFastPlannerOriginalExercise] = useState<string | null>(null);
  const [isSavingFastPlannerMovelap, setIsSavingFastPlannerMovelap] = useState(false);
  const [fastPlannerDraft, setFastPlannerDraft] = useState(() => ({
    muscularSector: '',
    exercise: '',
    speed: '',
    series: '1',
    ripTime: '',
    ripTimeMode: 'reps' as 'reps' | 'time',
    weight: '',
    break: '',
    mode: 'Stopped'
  }));
  const [fastPlannerWeightUnit, setFastPlannerWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [fastPlannerWeightValue, setFastPlannerWeightValue] = useState<string>('');
  const [fastPlannerBreakMode, setFastPlannerBreakMode] = useState<'rest' | 'cardio'>('rest');
  const [fastPlannerCardioValue, setFastPlannerCardioValue] = useState<string>('120');
  // 2026-01-22 14:15 UTC - Strip circuit tags from initial notes value
  const [noteValue, setNoteValue] = useState(() => {
    let cleanNotes = moveframe.notes || '';
    if (typeof cleanNotes === 'string') {
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '');
      cleanNotes = cleanNotes.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '');
      cleanNotes = cleanNotes.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '');
      cleanNotes = cleanNotes.trim();
    }
    return stripHtmlTags(cleanNotes);
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [currentMovelapIndex, setCurrentMovelapIndex] = useState(0); // Current movelap being viewed
  const [showManualContentPopup, setShowManualContentPopup] = useState(false); // Popup for manual content
  const [popupContentType, setPopupContentType] = useState<'summary' | 'detail'>('detail'); // Track which section is being viewed

  React.useEffect(() => {
    setNewlyAddedStationMovelapIds(new Set());
  }, [moveframe.id]);

  React.useEffect(() => {
    setNewlyAddedStationMovelapIds((prev) => {
      if (!prev.size) return prev;
      const currentIds = new Set<string>((moveframe.movelaps || []).map((ml: any) => ml.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [moveframe.movelaps]);
  
  // 2026-01-22 10:50 UTC - Extract circuit data from moveframe notes if present
  // 2026-01-22 11:30 UTC - Also extract pause among circuits value
  let circuitBasedMoveframe = false;
  let pauseAmongCircuits = '—';
  let circuitConfig: any = null;
  let circuitRows: any[] | null = null;
  let pauseCircuitsSeconds: number | null = null;
  let pauseSeriesSeconds: number | null = null;
  let defaultSeriesPerCircuit: number | null = null;
  let defaultStationsPerCircuit: number | null = null;
  if (moveframe.notes && typeof moveframe.notes === 'string') {
    const circuitDataMatch = moveframe.notes.match(/\[CIRCUIT_DATA\](.*?)\[\/CIRCUIT_DATA\]/);
    if (circuitDataMatch) {
      try {
        const circuitData = JSON.parse(circuitDataMatch[1]);
        circuitBasedMoveframe = circuitData.isCircuitBased || false;
        moveframe.isCircuitBased = circuitBasedMoveframe;
        circuitConfig = circuitData.config || null;
        circuitRows = circuitData.circuits || null;
        
        // Extract pause among circuits (pauseCircuits in minutes or seconds)
        // Support both old nested structure (pauses.circuits) and new flat structure (pauseCircuits)
        let pauseValue = null;
        if (circuitConfig) {
          if (circuitConfig.pauseCircuits !== undefined) {
            // New structure: pauseCircuits in minutes
            pauseValue = circuitConfig.pauseCircuits * 60; // Convert to seconds
          } else if (circuitConfig.pauses && circuitConfig.pauses.circuits) {
            // Old structure: pauses.circuits in seconds
            pauseValue = circuitConfig.pauses.circuits;
          }
          
          if (pauseValue !== null) {
            const minutes = Math.floor(pauseValue / 60);
            const seconds = pauseValue % 60;
          pauseAmongCircuits = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
          }

          if (circuitConfig.pauseCircuits !== undefined) {
            pauseCircuitsSeconds = circuitConfig.pauseCircuits * 60;
          } else if (circuitConfig.pauses && circuitConfig.pauses.circuits !== undefined) {
            pauseCircuitsSeconds = circuitConfig.pauses.circuits;
          }

          if (circuitConfig.pauseSeries !== undefined) {
            pauseSeriesSeconds = circuitConfig.pauseSeries * 60;
          } else if (circuitConfig.pauses && circuitConfig.pauses.series !== undefined) {
            pauseSeriesSeconds = circuitConfig.pauses.series;
          }

          defaultSeriesPerCircuit = circuitConfig.seriesPerCircuit ?? circuitConfig.seriesCount ?? circuitConfig.series ?? null;
          defaultStationsPerCircuit = circuitConfig.stationsPerCircuit ?? circuitConfig.stations ?? null;
        }
      } catch (e) {
        console.error('Failed to parse circuit data:', e);
      }
    }
  }

  const fastPlannerData = extractFastPlannerDataFromNotes(moveframe.notes);
  const isFastPlanner = !!fastPlannerData && moveframe.type === 'BATTERY' && !circuitBasedMoveframe;
  const fastPlannerSpeedOptions = ['Very slow', 'Slow', 'Normal', 'Quick', 'Fast', 'Very fast', 'Explosive', 'Negative'];
  const fastPlannerBreakOptions = ['0', '0"', '5"', '10"', '15"', '20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"];
  const fastPlannerModeOptions = ['Stopped', 'Superset', 'Movement Customized'];

  const circuitInfoByLetter = new Map<string, { seriesCount: number; stationsPerSeries: number }>();
  if (Array.isArray(circuitRows)) {
    circuitRows.forEach((circuit: any) => {
      const seriesCount = circuit.series ?? circuit.stationsBySeries?.length ?? defaultSeriesPerCircuit ?? 0;
      const stationsPerSeries = circuit.stationsBySeries?.[0]?.length ?? defaultStationsPerCircuit ?? 0;
      if (circuit.letter) {
        circuitInfoByLetter.set(circuit.letter, { seriesCount, stationsPerSeries });
      }
    });
  }

  const formatPause = (pauseSeconds: number) => {
    const minutes = Math.floor(pauseSeconds / 60);
    const seconds = pauseSeconds % 60;
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  };
  
  // Navigation for movelaps within the same moveframe
  const hasPreviousMovelap = currentMovelapIndex > 0;
  const fastPlannerDisplayCount = isFastPlanner
    ? Array.from(
        new Set(
          (movelaps || [])
            .map((ml: any) => (typeof ml?.exercise === 'string' ? ml.exercise.trim() : ''))
            .filter((ex: string) => ex !== '')
        )
      ).length
    : movelaps.length;
  const hasNextMovelap = currentMovelapIndex < fastPlannerDisplayCount - 1;
  
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
      cleanNotes = cleanNotes.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '');
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
    
    let newOrder: any[] = [];

    if (isFastPlanner) {
      const fpRows: any[] = Array.isArray(fastPlannerData?.rows) ? fastPlannerData.rows : [];
      const lapsByExercise = new Map<string, any[]>();
      for (const lap of movelaps) {
        const ex = typeof lap?.exercise === 'string' ? lap.exercise.trim() : '';
        if (!ex) continue;
        const list = lapsByExercise.get(ex) || [];
        list.push(lap);
        lapsByExercise.set(ex, list);
      }

      const orderedExercises = fpRows
        .map((r: any) => (typeof r?.exercise === 'string' ? r.exercise.trim() : ''))
        .filter((ex: string) => ex !== '');

      const exerciseOrder: string[] = [];
      const seen = new Set<string>();
      for (const ex of orderedExercises) {
        if (seen.has(ex)) continue;
        seen.add(ex);
        if (lapsByExercise.has(ex)) exerciseOrder.push(ex);
      }
      for (const ex of Array.from(lapsByExercise.keys())) {
        if (seen.has(ex)) continue;
        seen.add(ex);
        exerciseOrder.push(ex);
      }

      const groups = exerciseOrder
        .map((exercise) => {
          const list = lapsByExercise.get(exercise) || [];
          const repId = list[0]?.id;
          return repId ? { exercise, repId, ids: list.map((l) => l.id) } : null;
        })
        .filter((g): g is { exercise: string; repId: string; ids: string[] } => !!g);

      const oldGroupIndex = groups.findIndex((g) => g.repId === active.id);
      const newGroupIndex = groups.findIndex((g) => g.repId === over.id);
      if (oldGroupIndex === -1 || newGroupIndex === -1) return;

      const reorderedGroups = [...groups];
      const [movedGroup] = reorderedGroups.splice(oldGroupIndex, 1);
      reorderedGroups.splice(newGroupIndex, 0, movedGroup);

      const idsInOrder = reorderedGroups.flatMap((g) => g.ids);
      const byId = new Map<string, any>(movelaps.map((l: any) => [l.id, l]));
      newOrder = idsInOrder.map((id) => byId.get(id)).filter(Boolean);
    } else {
      const oldIndex = movelaps.findIndex((ml: any) => ml.id === active.id);
      const newIndex = movelaps.findIndex((ml: any) => ml.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      newOrder = [...movelaps];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
    }
    
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

  const handleOpenAddStationModal = (movelap: any) => {
    const meta = extractCircuitMetaFromNotes(movelap?.notes);
    const circuitLetter = meta?.circuitLetter ?? movelap?.circuitLetter;
    const localSeriesNumber = meta?.localSeriesNumber ?? meta?.seriesNumber ?? movelap?.localSeriesNumber ?? movelap?.seriesNumber;
    const stationNumber = meta?.stationNumber ?? movelap?.stationNumber;
    if (!circuitLetter || !localSeriesNumber || !stationNumber) return;

    const baseNotes = typeof movelap?.notes === 'string' ? movelap.notes : '';
    const cleanedNotes = baseNotes
      .replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '')
      .replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '')
      .trim();
    setAddStationDraft({
      muscularSector: movelap?.muscularSector || '',
      exercise: movelap?.exercise || '',
      reps: typeof movelap?.reps === 'number' ? String(movelap.reps) : (movelap?.reps ? String(movelap.reps) : ''),
      pause: movelap?.pause ? formatPauseInput(movelap.pause) : '',
      macroFinal: movelap?.macroFinal || '',
      notes: cleanedNotes,
      seriesNumber: localSeriesNumber
    });
    setAddStationTarget({
      afterMovelapId: movelap.id,
      circuitLetter,
      circuitIndex: meta?.circuitIndex ?? movelap?.circuitIndex,
      seriesNumber: meta?.seriesNumber ?? movelap?.seriesNumber,
      localSeriesNumber,
      stationNumber
    });
    setShowAddStationModal(true);
  };

  const extractCircuitDataFromNotes = (notes: unknown) => {
    if (typeof notes !== 'string') return null;
    const match = notes.match(/\[CIRCUIT_DATA\]([\s\S]*?)\[\/CIRCUIT_DATA\]/);
    if (!match?.[1]) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  };

  const upsertCircuitDataInNotes = (notes: unknown, circuitData: any) => {
    const base = typeof notes === 'string' ? notes : '';
    const cleaned = base.replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '').trim();
    const metaString = `[CIRCUIT_DATA]${JSON.stringify(circuitData)}[/CIRCUIT_DATA]`;
    return cleaned ? `${cleaned}\n\n${metaString}` : metaString;
  };

  const parsePauseToSeconds = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    if (typeof value !== 'string') return 0;
    const s = value.trim();
    if (!s) return 0;
    if (/^\d+$/.test(s)) return Math.max(0, parseInt(s, 10));
    if (s.includes("'")) {
      const parts = s.split("'");
      const mStr = (parts[0] ?? '').replace(/\D/g, '');
      const secStr = parts.slice(1).join("'").replace(/\D/g, '');
      const m = mStr ? parseInt(mStr, 10) : 0;
      const sec = secStr ? parseInt(secStr.slice(0, 2), 10) : 0;
      return Math.max(0, m * 60 + sec);
    }
    const secOnly = s.match(/^(\d+)\s*"?$/);
    if (secOnly) return Math.max(0, parseInt(secOnly[1], 10));
    return 0;
  };

  const formatPauseInput = (raw: unknown) => {
    const s = typeof raw === 'string' ? raw : String(raw ?? '');
    const digits = s.replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';
    if (digits.length <= 2) return `${digits}'`;
    const mm = digits.slice(0, 2);
    const ss = digits.slice(2);
    return `${mm}'${ss}''`;
  };

  const handleAddStation = async () => {
    if (!addStationTarget) return;
    if (isAddingStation) return;

    setIsAddingStation(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAddingStation(false);
      return;
    }

    try {
      const moveframeResponse = await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!moveframeResponse.ok) return;

      const freshMoveframe = await moveframeResponse.json();
      const allMovelaps = [...(freshMoveframe.movelaps || [])].sort((a: any, b: any) =>
        (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
      );
      const afterIdx = allMovelaps.findIndex((ml: any) => ml.id === addStationTarget.afterMovelapId);
      if (afterIdx < 0) return;
      const afterMovelap = allMovelaps[afterIdx];
      const baseRepetitionNumber = (afterMovelap?.repetitionNumber || (afterIdx + 1)) + 1;
      const createResponse = await fetch('/api/workouts/movelaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moveframeId: moveframe.id,
          repetitionNumber: baseRepetitionNumber,
          muscularSector: addStationDraft.muscularSector,
          exercise: addStationDraft.exercise,
          reps: addStationDraft.reps,
          pause: addStationDraft.pause,
          macroFinal: addStationDraft.macroFinal,
          notes: addStationDraft.notes,
          status: 'PENDING'
        })
      });
      if (!createResponse.ok) return;
      const created = await createResponse.json();
      if (created?.id) {
        setNewlyAddedStationMovelapIds((prev) => {
          const next = new Set(prev);
          next.add(created.id);
          return next;
        });
      }

      const updatedMoveframeResponse = await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!updatedMoveframeResponse.ok) return;

      const updatedMoveframe = await updatedMoveframeResponse.json();
      const updatedMovelaps = [...(updatedMoveframe.movelaps || [])].sort((a: any, b: any) =>
        (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
      );

      await fetch('/api/workouts/movelaps/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          movelaps: updatedMovelaps.map((ml: any, idx: number) => ({
            id: ml.id,
            repetitionNumber: idx + 1,
            ...(ml.id === created.id ? { isNewlyAdded: true } : {})
          }))
        })
      });

      try {
        const circuitData = extractCircuitDataFromNotes(freshMoveframe.notes);
        if (circuitData?.circuits && Array.isArray(circuitData.circuits)) {
          const nextCircuitData = JSON.parse(JSON.stringify(circuitData));
          const circuit = nextCircuitData.circuits.find((c: any) => c?.letter === addStationTarget.circuitLetter);
          const seriesIdx = Math.max(0, (addStationDraft.seriesNumber || addStationTarget.localSeriesNumber || 1) - 1);
          if (circuit) {
            if (!Array.isArray(circuit.stationsBySeries)) circuit.stationsBySeries = [];
            if (!Array.isArray(circuit.stationsBySeries[seriesIdx])) circuit.stationsBySeries[seriesIdx] = [];
            const seriesStations = circuit.stationsBySeries[seriesIdx] as any[];
            const insertIndex = Math.min(Math.max(0, addStationTarget.stationNumber), seriesStations.length);
            const newStation = {
              stationNumber: insertIndex + 1,
              sector: addStationDraft.muscularSector || '',
              exercise: addStationDraft.exercise || '',
              reps: addStationDraft.reps ? String(addStationDraft.reps) : '',
              pause: parsePauseToSeconds(addStationDraft.pause),
              notes: addStationDraft.notes || ''
            };
            seriesStations.splice(insertIndex, 0, newStation);
            circuit.stationsBySeries[seriesIdx] = seriesStations.map((st: any, idx: number) => ({
              ...st,
              stationNumber: idx + 1
            }));

            const nextNotes = upsertCircuitDataInNotes(freshMoveframe.notes ?? '', nextCircuitData);
            await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ notes: nextNotes })
            });
          }
        }
      } catch {}

      setShowAddStationModal(false);
      setAddStationTarget(null);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsAddingStation(false);
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

  const openFastPlannerMovelapEditor = (mode: 'add' | 'edit', movelap?: any) => {
    const fp = extractFastPlannerDataFromNotes(moveframe.notes);
    const fpRows: any[] = Array.isArray(fp?.rows) ? fp.rows : [];

    if (mode === 'add') {
      setFastPlannerMovelapModalMode('add');
      setFastPlannerOriginalExercise(null);
      setFastPlannerWeightUnit('kg');
      setFastPlannerWeightValue('');
      setFastPlannerBreakMode('rest');
      setFastPlannerCardioValue('120');
      setFastPlannerDraft({
        muscularSector: '',
        exercise: '',
        speed: 'Normal',
        series: '1',
        ripTime: '',
        ripTimeMode: fp?.ripTimeMode === 'time' ? 'time' : 'reps',
        weight: 'nc',
        break: "1'30\"",
        mode: 'Stopped'
      });
      setShowFastPlannerMovelapModal(true);
      return;
    }

    const exercise = typeof movelap?.exercise === 'string' ? movelap.exercise.trim() : '';
    const row = fpRows.find((r: any) => typeof r?.exercise === 'string' && r.exercise.trim() === exercise);
    const extracted = extractFastPlannerModeFromNotes(movelap?.notes);
    const modeFromRow = typeof row?.mode === 'string' ? row.mode.trim() : '';
    const seriesFromRow = typeof row?.series === 'string' && row.series.trim() !== '' ? row.series.trim() : '';
    const ripTimeFromRow = typeof row?.ripTime === 'string' ? row.ripTime : '';
    const breakFromRow = typeof row?.break === 'string' ? row.break : '';
    const weightFromRow = typeof row?.weight === 'string' ? row.weight : '';
    const rawWeight = (weightFromRow || movelap?.weight || '').toString().trim();
    const weightMatch = rawWeight.match(/^(\d+(?:\.\d+)?)\s*(kg|lbs)$/i);
    const nextWeightUnit = (weightMatch?.[2] || '').toLowerCase() === 'lbs' ? 'lbs' : 'kg';
    const nextWeightValue = weightMatch?.[1] ? weightMatch[1] : '';
    setFastPlannerWeightUnit(nextWeightUnit as 'kg' | 'lbs');
    setFastPlannerWeightValue(nextWeightValue);

    const rawBreak = ((breakFromRow || movelap?.pause || '') as string).trim();
    const isCardio = /\bbpm\b/i.test(rawBreak);
    setFastPlannerBreakMode(isCardio ? 'cardio' : 'rest');
    const bpmMatch = rawBreak.match(/(\d+)\s*bpm/i);
    setFastPlannerCardioValue(bpmMatch?.[1] ? bpmMatch[1] : '120');

    setFastPlannerMovelapModalMode('edit');
    setFastPlannerOriginalExercise(exercise || null);
    setFastPlannerDraft({
      muscularSector: typeof movelap?.muscularSector === 'string' ? movelap.muscularSector : '',
      exercise,
      speed: (typeof row?.speed === 'string' && row.speed.trim() !== '' ? row.speed : movelap?.speed) || '',
      series: seriesFromRow || '1',
      ripTime: ripTimeFromRow || (movelap?.reps != null ? String(movelap.reps) : (movelap?.time ? String(movelap.time) : '')),
      ripTimeMode: fp?.ripTimeMode === 'time' ? 'time' : 'reps',
      weight: rawWeight || 'nc',
      break: rawBreak || "1'30\"",
      mode: modeFromRow || extracted.mode || 'Stopped'
    });
    setShowFastPlannerMovelapModal(true);
  };

  const handleSaveFastPlannerMovelap = async () => {
    if (isSavingFastPlannerMovelap) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const normalizedExercise = typeof fastPlannerDraft.exercise === 'string' ? fastPlannerDraft.exercise.trim() : '';
    if (!normalizedExercise) return;

    setIsSavingFastPlannerMovelap(true);
    try {
      const baseFastPlannerData = extractFastPlannerDataFromNotes(moveframe.notes) ?? {};
      const baseRows: any[] = Array.isArray(baseFastPlannerData.rows) ? [...baseFastPlannerData.rows] : [];
      const ripTimeMode = fastPlannerDraft.ripTimeMode === 'time' ? 'time' : 'reps';
      const normalizedWeightValue = fastPlannerWeightValue.trim();
      const effectiveWeight = normalizedWeightValue ? `${normalizedWeightValue} ${fastPlannerWeightUnit}` : 'nc';
      const cardioNum = parseInt(fastPlannerCardioValue || '120', 10);
      const safeBpm = Number.isFinite(cardioNum) ? Math.min(200, Math.max(60, cardioNum)) : 120;
      const effectiveBreak = fastPlannerBreakMode === 'cardio' ? `${safeBpm} bpm` : (fastPlannerDraft.break || '');
      const rawRipTime = (fastPlannerDraft.ripTime || '').trim();
      const effectiveRipTime =
        ripTimeMode === 'time'
          ? (rawRipTime.includes("'") || rawRipTime.includes('"')
              ? rawRipTime
              : formatFastPlannerTime(rawRipTime, true))
          : rawRipTime;

      const nextRows = [...baseRows];
      const rowId = nextRows.reduce((max: number, r: any) => Math.max(max, typeof r?.id === 'number' ? r.id : 0), 0) + 1;

      const rowPayload = {
        id: rowId,
        exercise: normalizedExercise,
        speed: fastPlannerDraft.speed || '',
        series: fastPlannerDraft.series || '1',
        ripTime: effectiveRipTime || '',
        weight: effectiveWeight,
        break: effectiveBreak,
        mode: fastPlannerDraft.mode || ''
      };

      const originalExercise = typeof fastPlannerOriginalExercise === 'string' ? fastPlannerOriginalExercise.trim() : '';
      const matchExercise = fastPlannerMovelapModalMode === 'edit' ? originalExercise : normalizedExercise;
      const existingIndex = nextRows.findIndex((r: any) => typeof r?.exercise === 'string' && r.exercise.trim() === matchExercise);

      if (existingIndex >= 0) {
        nextRows[existingIndex] = { ...nextRows[existingIndex], ...rowPayload, id: nextRows[existingIndex]?.id ?? rowId };
      } else {
        nextRows.push(rowPayload);
      }

      const nextFastPlannerData = {
        ...baseFastPlannerData,
        ripTimeMode,
        rows: nextRows
      };

      const updatedMoveframeNotes = upsertFastPlannerDataInNotes(moveframe.notes, nextFastPlannerData);
      await fetch(`/api/workouts/moveframes/${moveframe.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: updatedMoveframeNotes })
      });

      const parseSeriesValue = (value: string) => {
        const parsed = parseInt(value || '1', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      };
      const desiredSeries = parseSeriesValue(fastPlannerDraft.series);

      const repsValue =
        (ripTimeMode === 'reps' && effectiveRipTime.trim() !== '')
          ? (parseInt(effectiveRipTime, 10) || null)
          : null;
      const timeValue =
        ripTimeMode === 'time' && effectiveRipTime.trim() !== '' ? effectiveRipTime.trim() : null;

      const exerciseKeyToMatch = fastPlannerMovelapModalMode === 'edit' ? originalExercise : normalizedExercise;
      const existingLaps = (movelaps || []).filter((lap: any) => (typeof lap?.exercise === 'string' ? lap.exercise.trim() : '') === exerciseKeyToMatch);

      const idsToDelete: string[] = [];
      const lapsToUpdate: any[] = [];
      const lapsToCreateCount = Math.max(0, desiredSeries - existingLaps.length);

      for (let i = 0; i < existingLaps.length; i++) {
        if (i < desiredSeries) {
          lapsToUpdate.push(existingLaps[i]);
        } else {
          if (typeof existingLaps[i]?.id === 'string') idsToDelete.push(existingLaps[i].id);
        }
      }

      const createdLaps: any[] = [];
      const createdIds: string[] = [];

      await Promise.all(
        lapsToUpdate.map(async (lap: any) => {
          const nextNotes = upsertFastPlannerModeInNotes(lap?.notes, fastPlannerDraft.mode || null);
          await fetch(`/api/workouts/movelaps/${lap.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              muscularSector: fastPlannerDraft.muscularSector || null,
              exercise: normalizedExercise || null,
              speed: fastPlannerDraft.speed || null,
              reps: repsValue,
              time: timeValue,
              weight: effectiveWeight || null,
              pause: effectiveBreak || null,
              notes: nextNotes || null
            })
          });
        })
      );

      await Promise.all(
        idsToDelete.map(async (id) =>
          fetch(`/api/workouts/movelaps/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          })
        )
      );

      for (let i = 0; i < lapsToCreateCount; i++) {
        const response = await fetch('/api/workouts/movelaps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            moveframeId: moveframe.id,
            repetitionNumber: 9999,
            distance: null,
            speed: fastPlannerDraft.speed || null,
            style: null,
            pace: null,
            time: timeValue,
            reps: repsValue,
            weight: effectiveWeight || null,
            tools: null,
            r1: null,
            r2: null,
            muscularSector: fastPlannerDraft.muscularSector || null,
            exercise: normalizedExercise || null,
            restType: null,
            pause: effectiveBreak || null,
            macroFinal: null,
            alarm: null,
            sound: null,
            notes: upsertFastPlannerModeInNotes('', fastPlannerDraft.mode || null) || null,
            status: 'PENDING',
            isSkipped: false,
            isDisabled: false
          })
        });
        if (response.ok) {
          const created = await response.json().catch(() => null);
          if (created) {
            createdLaps.push(created);
            if (typeof created?.id === 'string') {
              createdIds.push(created.id);
            }
          }
        }
      }

      const remainingLaps = (movelaps || [])
        .filter((lap: any) => typeof lap?.id === 'string' && !idsToDelete.includes(lap.id))
        .map((lap: any) => {
          const currentExercise = typeof lap?.exercise === 'string' ? lap.exercise.trim() : '';
          if (currentExercise === exerciseKeyToMatch) {
            return {
              ...lap,
              muscularSector: fastPlannerDraft.muscularSector || lap.muscularSector,
              exercise: normalizedExercise,
              speed: fastPlannerDraft.speed || lap.speed,
              reps: repsValue,
              time: timeValue,
              weight: effectiveWeight || lap.weight,
              pause: effectiveBreak || lap.pause,
              notes: upsertFastPlannerModeInNotes(lap?.notes, fastPlannerDraft.mode || null)
            };
          }
          return lap;
        });

      const allAfterChanges = [...remainingLaps, ...createdLaps];
      const rowsInOrder: any[] = Array.isArray(nextFastPlannerData.rows) ? nextFastPlannerData.rows : [];
      const orderExercises = Array.from(
        new Set(
          rowsInOrder
            .map((r: any) => (typeof r?.exercise === 'string' ? r.exercise.trim() : ''))
            .filter((ex: string) => ex !== '')
        )
      );

      const lapsByExercise = new Map<string, any[]>();
      for (const lap of allAfterChanges) {
        const ex = typeof lap?.exercise === 'string' ? lap.exercise.trim() : '';
        if (!ex) continue;
        const list = lapsByExercise.get(ex) || [];
        list.push(lap);
        lapsByExercise.set(ex, list);
      }

      const orderedIds: string[] = [];
      for (const ex of orderExercises) {
        const group = (lapsByExercise.get(ex) || []).slice().sort((a: any, b: any) => (a.repetitionNumber || 0) - (b.repetitionNumber || 0));
        group.forEach((lap: any) => {
          if (typeof lap?.id === 'string') orderedIds.push(lap.id);
        });
      }
      for (const ex of Array.from(lapsByExercise.keys())) {
        if (orderExercises.includes(ex)) continue;
        const group = (lapsByExercise.get(ex) || []).slice().sort((a: any, b: any) => (a.repetitionNumber || 0) - (b.repetitionNumber || 0));
        group.forEach((lap: any) => {
          if (typeof lap?.id === 'string') orderedIds.push(lap.id);
        });
      }

      if (orderedIds.length > 0) {
        const reorderPayload = orderedIds.map((id: string, idx: number) => ({ id, repetitionNumber: idx + 1 }));
        await fetch('/api/workouts/movelaps/reorder', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ movelaps: reorderPayload })
        });
      }

      if (createdIds.length > 0) {
        setNewlyAddedStationMovelapIds((prev) => new Set([...Array.from(prev), ...createdIds]));
      }

      setShowFastPlannerMovelapModal(false);
      setFastPlannerOriginalExercise(null);
      if (onRefresh) await onRefresh();
    } finally {
      setIsSavingFastPlannerMovelap(false);
    }
  };

  const fastPlannerView = React.useMemo(() => {
    if (!isFastPlanner) return null;
    const fpRows: any[] = Array.isArray(fastPlannerData?.rows) ? fastPlannerData.rows : [];
    const fpByExercise = new Map<string, any>();
    for (const r of fpRows) {
      const ex = typeof r?.exercise === 'string' ? r.exercise.trim() : '';
      if (!ex || fpByExercise.has(ex)) continue;
      fpByExercise.set(ex, r);
    }

    const lapsByExercise = new Map<string, any[]>();
    for (const lap of movelaps) {
      const ex = typeof lap?.exercise === 'string' ? lap.exercise.trim() : '';
      if (!ex) continue;
      const list = lapsByExercise.get(ex) || [];
      list.push(lap);
      lapsByExercise.set(ex, list);
    }

    const orderedExercises = fpRows
      .map((r: any) => (typeof r?.exercise === 'string' ? r.exercise.trim() : ''))
      .filter((ex: string) => ex !== '');

    const exerciseOrder: string[] = [];
    const seen = new Set<string>();
    for (const ex of orderedExercises) {
      if (seen.has(ex)) continue;
      seen.add(ex);
      if (lapsByExercise.has(ex)) exerciseOrder.push(ex);
    }
    for (const ex of Array.from(lapsByExercise.keys())) {
      if (seen.has(ex)) continue;
      seen.add(ex);
      exerciseOrder.push(ex);
    }

    const displayMovelaps = exerciseOrder
      .map((exercise) => {
        const list = lapsByExercise.get(exercise) || [];
        if (list.length === 0) return null;
        const rep = list[0];
        const row = fpByExercise.get(exercise);
        const extracted = extractFastPlannerModeFromNotes(rep?.notes);
        const modeFromRow = typeof row?.mode === 'string' ? row.mode.trim() : '';
        const mode = modeFromRow || extracted.mode || null;
        const seriesFromRow = typeof row?.series === 'string' && row.series.trim() !== '' ? row.series.trim() : String(list.length);
        const ripTimeFromRow = typeof row?.ripTime === 'string' && row.ripTime.trim() !== '' ? row.ripTime.trim() : '';
        const breakFromRow = typeof row?.break === 'string' && row.break.trim() !== '' ? row.break.trim() : '';

        return {
          ...rep,
          speed: typeof row?.speed === 'string' && row.speed.trim() !== '' ? row.speed.trim() : rep.speed,
          weight: typeof row?.weight === 'string' && row.weight.trim() !== '' ? row.weight.trim() : rep.weight,
          notes: extracted.notes,
          _fastPlannerRawNotes: rep?.notes,
          _fastPlannerMode: mode,
          _fastPlannerSeries: seriesFromRow,
          _fastPlannerRipTime: ripTimeFromRow || (rep?.reps != null ? String(rep.reps) : (rep?.time ? String(rep.time) : '')),
          _fastPlannerBreak: breakFromRow || rep?.pause || ''
        };
      })
      .filter((v): v is any => !!v);

    return { displayMovelaps };
  }, [isFastPlanner, fastPlannerData, movelaps]);

  const displayMovelaps = isFastPlanner ? (fastPlannerView?.displayMovelaps ?? []) : movelaps;
  
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
      <SortableContext items={displayMovelaps.map((ml: any) => ml.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 pr-0">
          {/* Top Controls - Note and Add Movelap Button */}
          <div className="mb-3 flex items-center gap-4" style={{ backgroundColor: 'rgb(250, 255, 214)', padding: '8px', marginLeft: '-8px', marginRight: '8px', marginTop: '-8px' }}>
            {/* Movelap Navigation */}
            {displayMovelaps.length > 0 && (
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
                  Movelaps of {moveframeLetter} ({currentMovelapIndex + 1}/{displayMovelaps.length})
                </span>
                <button
                  onClick={() => setCurrentMovelapIndex(Math.min(displayMovelaps.length - 1, currentMovelapIndex + 1))}
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
            {isFastPlanner ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openFastPlannerMovelapEditor('add');
                }}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
              >
                + Add Movelap
              </button>
            ) : onAddMovelap ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMovelap();
                }}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
              >
                + Add Movelap
              </button>
            ) : null}
            
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
            <table className="text-xs bg-white" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: isFastPlanner ? '1500px' : (moveframe.isCircuitBased ? '1340px' : '1600px'), width: '100%' }}>
            {/* Render sport-specific column headers */}
            {(() => {
              const sport = moveframe.sport || 'SWIM';
              const isSwim = sport === 'SWIM';
              const isBike = sport === 'BIKE' || sport === 'MTB';
              const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
              const isRowing = sport === 'ROWING' || sport === 'CANOEING';
              const isBodyBuilding = sport === 'BODY_BUILDING';
              const isFastPlannerTable = isFastPlanner;
              
              // Distance-based sports (no tools) - MUST match the array at top of component!
              const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
              const isDistanceBased = distanceBasedSports.includes(sport);
              
              // Other sports have tools (Gymnastic, Stretching, Pilates, Yoga, Technical moves, Free moves, etc.)
              const hasTools = !isBodyBuilding && !isDistanceBased;
              
              if (isFastPlannerTable) {
                return (
                  <>
                    <colgroup>
                      <col style={{ width: '30px' }} />
                      <col style={{ width: '30px' }} />
                      <col style={{ width: '30px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '220px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '300px' }} />
                      <col style={{ width: '110px', minWidth: '110px' }} />
                    </colgroup>
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" title="Drag to reorder">Move</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">MF</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">#</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Workout section</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Sport</th>
                        <th className="border border-gray-300 px-1 py-1 text-left text-[10px]">Musc.Sector</th>
                        <th className="border border-gray-300 px-1 py-1 text-left text-[10px]">Exercise</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Speed</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Series</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Rip\time</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Weight</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Break</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Mode</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" style={{ width: '300px' }}>Notes</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px] sticky-options-header bg-gray-200" style={{ width: '110px', minWidth: '110px' }}>Options</th>
                      </tr>
                    </thead>
                  </>
                );
              }

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
              {displayMovelaps.map((movelap: any, index: number) => {
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
                const repsPerGroup = Math.ceil(displayMovelaps.length / aerobicSeriesNum);
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

                if (isFastPlanner) {
                  totalColumns = 15;
                } else if (isBodyBuilding) {
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
                
                if (!isFastPlanner) {
                  totalColumns += moveframe.isCircuitBased ? 4 : 5;
                }
                
                // 2026-01-22 10:30 UTC - Circuit header logic
                const isCircuitBased = moveframe.isCircuitBased || movelap.circuitLetter;
                const isFirstInCircuit =
                  isCircuitBased && (index === 0 || displayMovelaps[index - 1]?.circuitLetter !== movelap.circuitLetter);
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
                      isNewlyAdded={newlyAddedStationMovelapIds.has(movelap.id) || !!movelap.isNewlyAdded}
                      index={index}
                      sequenceNumber={isFastPlanner ? index + 1 : (movelapSequences.get(movelap.id) || index + 1)}
                      moveframeLetter={moveframeLetter}
                      sectionColor={sectionColor}
                      sectionName={sectionName}
                      moveframe={moveframe}
                      onEditMovelap={onEditMovelap}
                      onEditFastPlannerMovelap={isFastPlanner ? (ml) => openFastPlannerMovelapEditor('edit', ml) : undefined}
                      onAddFastPlannerMovelap={isFastPlanner ? () => openFastPlannerMovelapEditor('add') : undefined}
                      onDeleteMovelap={onDeleteMovelap}
                      onCopyMovelap={handleCopyMovelap}
                      onPasteMovelap={handlePasteMovelap}
                      onAddMovelapAfter={onAddMovelapAfter}
                      onAddStationAfter={(targetMovelap) => handleOpenAddStationModal(targetMovelap)}
                      pauseAmongCircuits={pauseAmongCircuits}
                      circuitInfoByLetter={circuitInfoByLetter}
                      defaultSeriesPerCircuit={defaultSeriesPerCircuit}
                      defaultStationsPerCircuit={defaultStationsPerCircuit}
                      pauseCircuitsSeconds={pauseCircuitsSeconds}
                      pauseSeriesSeconds={pauseSeriesSeconds}
                      onRefresh={onRefresh}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>

          {showAddStationModal && addStationTarget && typeof document !== 'undefined' && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4"
              onClick={() => {
                if (isAddingStation) return;
                setShowAddStationModal(false);
                setAddStationTarget(null);
              }}
              style={{ margin: 0 }}
            >
              <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white p-4 flex items-center justify-between">
                  <div className="font-bold text-base">Add station</div>
                  <button
                    onClick={() => {
                      if (isAddingStation) return;
                      setShowAddStationModal(false);
                      setAddStationTarget(null);
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="text-xs text-gray-700">
                    Circuit {addStationTarget.circuitLetter} · Series {addStationDraft.seriesNumber} · After station {addStationTarget.stationNumber}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(() => {
                      const targetCircuit = Array.isArray(circuitRows)
                        ? (circuitRows as any[]).find((c) => c?.letter === addStationTarget.circuitLetter)
                        : null;
                      const seriesIdx = Math.max(0, (addStationDraft.seriesNumber || 1) - 1);
                      const seriesCount =
                        (targetCircuit?.stationsBySeries?.length as number | undefined) ??
                        circuitInfoByLetter.get(addStationTarget.circuitLetter)?.seriesCount ??
                        defaultSeriesPerCircuit ??
                        10;
                      const seriesLen =
                        (targetCircuit?.stationsBySeries?.[seriesIdx]?.length as number | undefined) ??
                        circuitInfoByLetter.get(addStationTarget.circuitLetter)?.stationsPerSeries ??
                        defaultStationsPerCircuit ??
                        0;
                      const isTargetEndOfSeries = !!(seriesLen && addStationTarget.stationNumber === seriesLen);

                      return (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">Series</label>
                            <select
                              value={addStationDraft.seriesNumber}
                              onChange={(e) => setAddStationDraft((prev: any) => ({ ...prev, seriesNumber: parseInt(e.target.value) || 1 }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              disabled={isAddingStation || isTargetEndOfSeries}
                            >
                              {Array.from({ length: Math.max(1, Math.min(10, seriesCount)) }, (_, idx) => idx + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">Macro</label>
                            <select
                              value={addStationDraft.macroFinal}
                              onChange={(e) => setAddStationDraft((prev: any) => ({ ...prev, macroFinal: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              disabled={isAddingStation || !isTargetEndOfSeries}
                            >
                              <option value="">—</option>
                              {MACRO_FINAL_OPTIONS.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      );
                    })()}

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Sector</label>
                      <select
                        value={addStationDraft.muscularSector}
                        onChange={(e) =>
                          setAddStationDraft((prev: any) => ({
                            ...prev,
                            muscularSector: e.target.value,
                            exercise: ''
                          }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isAddingStation}
                      >
                        <option value="">—</option>
                        {Object.keys(MUSCULAR_SECTOR_IMAGES).map((sector) => (
                          <option key={sector} value={sector}>{sector}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Exercise</label>
                      <select
                        value={addStationDraft.exercise}
                        onChange={(e) => setAddStationDraft((prev: any) => ({ ...prev, exercise: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isAddingStation || !addStationDraft.muscularSector}
                      >
                        <option value="">—</option>
                        {(() => {
                          if (!addStationDraft.muscularSector) return null;
                          const options = getExercisesBySector(addStationDraft.muscularSector);
                          const hasCurrent =
                            !!addStationDraft.exercise && options.some((o) => o.name === addStationDraft.exercise);
                          return (
                            <>
                              {!hasCurrent && !!addStationDraft.exercise && (
                                <option value={addStationDraft.exercise}>{addStationDraft.exercise}</option>
                              )}
                              {options.map((o) => (
                                <option key={o.id} value={o.name}>{o.name}</option>
                              ))}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Repetitions</label>
                      <input
                        type="number"
                        min={0}
                        value={addStationDraft.reps}
                        onChange={(e) => setAddStationDraft((prev: any) => ({ ...prev, reps: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isAddingStation}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Pause</label>
                      <input
                        type="text"
                        value={addStationDraft.pause}
                        onChange={(e) => setAddStationDraft((prev: any) => ({ ...prev, pause: formatPauseInput(e.target.value) }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isAddingStation}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Notes</label>
                      <textarea
                        value={addStationDraft.notes}
                        onChange={(e) => setAddStationDraft((prev: any) => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm min-h-[90px]"
                        disabled={isAddingStation}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (isAddingStation) return;
                        setShowAddStationModal(false);
                        setAddStationTarget(null);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      disabled={isAddingStation}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddStation}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                      disabled={isAddingStation}
                    >
                      {isAddingStation ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {showFastPlannerMovelapModal && typeof document !== 'undefined' && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4"
              onClick={() => {
                if (isSavingFastPlannerMovelap) return;
                setShowFastPlannerMovelapModal(false);
                setFastPlannerOriginalExercise(null);
              }}
              style={{ margin: 0 }}
            >
              <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
                  <div className="font-bold text-base">
                    {fastPlannerMovelapModalMode === 'edit' ? 'Edit fast planner movelap' : 'Add fast planner movelap'}
                  </div>
                  <button
                    onClick={() => {
                      if (isSavingFastPlannerMovelap) return;
                      setShowFastPlannerMovelapModal(false);
                      setFastPlannerOriginalExercise(null);
                    }}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Musc.Sector</label>
                      <select
                        value={fastPlannerDraft.muscularSector}
                        onChange={(e) =>
                          setFastPlannerDraft((prev) => ({
                            ...prev,
                            muscularSector: e.target.value,
                            exercise: ''
                          }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerMovelap}
                      >
                        <option value="">—</option>
                        {Object.keys(MUSCULAR_SECTOR_IMAGES).map((sector) => (
                          <option key={sector} value={sector}>{sector}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Exercise</label>
                      <select
                        value={fastPlannerDraft.exercise}
                        onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, exercise: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerMovelap || !fastPlannerDraft.muscularSector}
                      >
                        <option value="">—</option>
                        {(() => {
                          if (!fastPlannerDraft.muscularSector) return null;
                          const options = getExercisesBySector(fastPlannerDraft.muscularSector);
                          const hasCurrent =
                            !!fastPlannerDraft.exercise && options.some((o) => o.name === fastPlannerDraft.exercise);
                          return (
                            <>
                              {!hasCurrent && !!fastPlannerDraft.exercise && (
                                <option value={fastPlannerDraft.exercise}>{fastPlannerDraft.exercise}</option>
                              )}
                              {options.map((o) => (
                                <option key={o.id} value={o.name}>{o.name}</option>
                              ))}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Speed</label>
                      <select
                        value={fastPlannerDraft.speed}
                        onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, speed: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerMovelap}
                      >
                        <option value="">—</option>
                        {fastPlannerSpeedOptions.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Series</label>
                      <input
                        type="number"
                        min={1}
                        value={fastPlannerDraft.series}
                        onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, series: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerMovelap}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Rip\Time</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-black">
                          <input
                            type="radio"
                            name="fpRipTimeMode"
                            value="reps"
                            checked={fastPlannerDraft.ripTimeMode === 'reps'}
                            onChange={() => {
                              setFastPlannerDraft((prev) => ({ ...prev, ripTimeMode: 'reps', ripTime: '' }));
                            }}
                            disabled={isSavingFastPlannerMovelap}
                          />
                          Repetitions
                        </label>
                        <label className="flex items-center gap-2 text-sm text-black">
                          <input
                            type="radio"
                            name="fpRipTimeMode"
                            value="time"
                            checked={fastPlannerDraft.ripTimeMode === 'time'}
                            onChange={() => {
                              setFastPlannerDraft((prev) => ({ ...prev, ripTimeMode: 'time', ripTime: '' }));
                            }}
                            disabled={isSavingFastPlannerMovelap}
                          />
                          Time
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">
                        {fastPlannerDraft.ripTimeMode === 'time' ? 'Time' : 'Rip'}
                      </label>
                      <input
                        type={fastPlannerDraft.ripTimeMode === 'reps' ? 'number' : 'text'}
                        min={fastPlannerDraft.ripTimeMode === 'reps' ? 1 : undefined}
                        value={fastPlannerDraft.ripTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (fastPlannerDraft.ripTimeMode === 'time') {
                            const raw = value.replace(/\D/g, '').slice(0, 4);
                            setFastPlannerDraft((prev) => ({ ...prev, ripTime: raw }));
                            return;
                          }
                          setFastPlannerDraft((prev) => ({ ...prev, ripTime: value }));
                        }}
                        onBlur={() => {
                          if (fastPlannerDraft.ripTimeMode !== 'time') return;
                          const raw = (fastPlannerDraft.ripTime || '').replace(/\D/g, '').slice(0, 4);
                          const formatted = raw ? formatFastPlannerTime(raw, true) : '';
                          setFastPlannerDraft((prev) => ({ ...prev, ripTime: formatted }));
                        }}
                        placeholder={fastPlannerDraft.ripTimeMode === 'time' ? "MM'SS\"" : '0'}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerMovelap}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Weight</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={fastPlannerWeightValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFastPlannerWeightValue(value);
                            const trimmed = value.trim();
                            const nextWeight = trimmed ? `${trimmed} ${fastPlannerWeightUnit}` : 'nc';
                            setFastPlannerDraft((prev) => ({ ...prev, weight: nextWeight }));
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isSavingFastPlannerMovelap}
                        />
                        <label className="flex items-center gap-2 text-sm text-black whitespace-nowrap">
                          <input
                            type="radio"
                            name="fpWeightUnit"
                            value="kg"
                            checked={fastPlannerWeightUnit === 'kg'}
                            onChange={() => {
                              setFastPlannerWeightUnit('kg');
                              const trimmed = fastPlannerWeightValue.trim();
                              const nextWeight = trimmed ? `${trimmed} kg` : 'nc';
                              setFastPlannerDraft((prev) => ({ ...prev, weight: nextWeight }));
                            }}
                            disabled={isSavingFastPlannerMovelap}
                          />
                          Kg
                        </label>
                        <label className="flex items-center gap-2 text-sm text-black whitespace-nowrap">
                          <input
                            type="radio"
                            name="fpWeightUnit"
                            value="lbs"
                            checked={fastPlannerWeightUnit === 'lbs'}
                            onChange={() => {
                              setFastPlannerWeightUnit('lbs');
                              const trimmed = fastPlannerWeightValue.trim();
                              const nextWeight = trimmed ? `${trimmed} lbs` : 'nc';
                              setFastPlannerDraft((prev) => ({ ...prev, weight: nextWeight }));
                            }}
                            disabled={isSavingFastPlannerMovelap}
                          />
                          Lbs
                        </label>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Break</label>
                      <div className="flex items-center gap-4 mb-2">
                        <label className="flex items-center gap-2 text-sm text-black">
                          <input
                            type="radio"
                            name="fpBreakMode"
                            value="rest"
                            checked={fastPlannerBreakMode === 'rest'}
                            onChange={() => {
                              setFastPlannerBreakMode('rest');
                              if (!fastPlannerBreakOptions.includes(fastPlannerDraft.break)) {
                                setFastPlannerDraft((prev) => ({ ...prev, break: "1'30\"" }));
                              }
                            }}
                            disabled={isSavingFastPlannerMovelap}
                          />
                          Rest time
                        </label>
                        <label className="flex items-center gap-2 text-sm text-black">
                          <input
                            type="radio"
                            name="fpBreakMode"
                            value="cardio"
                            checked={fastPlannerBreakMode === 'cardio'}
                            onChange={() => {
                              setFastPlannerBreakMode('cardio');
                              setFastPlannerCardioValue('120');
                              setFastPlannerDraft((prev) => ({ ...prev, break: '120 bpm' }));
                            }}
                            disabled={isSavingFastPlannerMovelap}
                          />
                          Cardio
                        </label>
                      </div>

                      {fastPlannerBreakMode === 'rest' ? (
                        <select
                          value={fastPlannerDraft.break}
                          onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, break: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isSavingFastPlannerMovelap}
                        >
                          <option value="">—</option>
                          {fastPlannerBreakOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={60}
                            max={200}
                            value={fastPlannerCardioValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFastPlannerCardioValue(value);
                              setFastPlannerDraft((prev) => ({ ...prev, break: `${value} bpm` }));
                            }}
                            onBlur={(e) => {
                              const num = parseInt(e.target.value || '0', 10);
                              const safe = Number.isFinite(num) ? Math.min(200, Math.max(60, num)) : 120;
                              setFastPlannerCardioValue(String(safe));
                              setFastPlannerDraft((prev) => ({ ...prev, break: `${safe} bpm` }));
                            }}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={isSavingFastPlannerMovelap}
                          />
                          <span className="text-sm text-gray-700">bpm (60-200)</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Mode</label>
                      <select
                        value={fastPlannerDraft.mode}
                        onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, mode: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerMovelap}
                      >
                        {fastPlannerModeOptions.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (isSavingFastPlannerMovelap) return;
                        setShowFastPlannerMovelapModal(false);
                        setFastPlannerOriginalExercise(null);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      disabled={isSavingFastPlannerMovelap}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFastPlannerMovelap}
                      className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
                      disabled={isSavingFastPlannerMovelap}
                    >
                      {isSavingFastPlannerMovelap ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

