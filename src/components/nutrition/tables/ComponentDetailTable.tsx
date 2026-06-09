import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { GripVertical, Volume2, VolumeX, Bell, BellOff, MoreVertical } from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MACRO_FINAL_OPTIONS, getSportConfig, REST_TYPES, circuitLoadOfWorkToMacroFinal } from '@/constants/nutrition-food.constants';
import { getExercisesBySector, getExerciseMedia, getMockExerciseThumbnail } from '@/data/mockExercises';
import ExerciseGalleryModal from '@/components/nutrition/ExerciseGalleryModal';
import { stripInternalWorkoutTags } from '@/utils/sanitizeNutritionHtml';
import { computeAnaerobicFastPlannerRowStats, formatAvePauseFromSeconds } from '@/utils/nutrition-moveframeAvePause';
import '../../../styles/sticky-table.css';

type AerobicRestChoice = 'rest_time' | 'restart_to' | 'reset_pulse';
type AerobicBreakChoice = 'stopped' | 'speed' | 'watts';

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

/** Preserve metadata tags when saving the user note. Prevents the grid from reverting to server nutritionComponents. */
const preserveMetadataTagsInNotes = (existingNotes: string, newUserNote: string): string => {
  if (typeof existingNotes !== 'string') existingNotes = '';
  const tags: string[] = [];
  const fpMatch = existingNotes.match(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/);
  if (fpMatch) tags.push(fpMatch[0]);
  const cdMatch = existingNotes.match(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/);
  if (cdMatch) tags.push(cdMatch[0]);
  const cmMatch = existingNotes.match(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/);
  if (cmMatch) tags.push(cmMatch[0]);
  const fmMatch = existingNotes.match(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/);
  if (fmMatch) tags.push(fmMatch[0]);
  const userPart = (newUserNote || '').trim();
  const tagsPart = tags.join('\n\n');
  return tagsPart ? (userPart ? `${userPart}\n\n${tagsPart}` : tagsPart) : userPart;
};

/** Parse nutritionComponent.pause (seconds number or M'SS" / legacy forms) for circuit display logic */
function parseNutritionComponentPauseToSeconds(value: unknown): number {
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
}

type CircuitTableLayoutHint = { letter: string; localSeries: number; station: number };

function readCircuitLayoutFromNutritionComponent(ml: any | null | undefined): CircuitTableLayoutHint | null {
  if (!ml || typeof ml !== 'object') return null;
  const letter =
    typeof ml.circuitLetter === 'string' ? ml.circuitLetter.trim().toUpperCase() : '';
  const localSeries =
    typeof ml.localSeriesNumber === 'number' && Number.isFinite(ml.localSeriesNumber)
      ? ml.localSeriesNumber
      : 0;
  const station =
    typeof ml.stationNumber === 'number' && Number.isFinite(ml.stationNumber) ? ml.stationNumber : 0;
  if (!letter && typeof ml.circuitIndex !== 'number') return null;
  return { letter, localSeries, station };
}

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

const normalizeFastPlannerExerciseKey = (exercise: unknown): string => {
  const value =
    typeof exercise === 'string'
      ? exercise
      : exercise && typeof exercise === 'object' && 'name' in exercise && typeof (exercise as any).name === 'string'
        ? (exercise as any).name
        : '';

  if (!value) return '';
  return value.replace(/\u00A0/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
};

// Mapping of muscular sectors to images (from CircuitPlanner_OLD)
const MUSCULAR_SECTOR_IMAGES: Record<string, string> = {
  'Shoulders': '/muscular/shoulders.png',
  'Anterior arms': '/muscular/Biceps.png',
  'Rear arms': '/muscular/Triceps.png',
  'Forearms': '/muscular/Forearms.png',
  'Chest': '/muscular/chest.png',
  'Abdominals': '/muscular/abs.png',
  'Intercostals': '/muscular/abs.png',
  'Trapezius': '/muscular/trapezius.png',
  'Lats': '/muscular/Lats.png',
  'Lumbosacral': '/muscular/Lats.png',
  'Front thighs': '/muscular/quadriceps.png',
  'Hind thighs': '/muscular/hams.png',
  'Calves': '/muscular/calves.png',
  'Tibials': '/muscular/calves.png',
  'Glutes': '/muscular/glutes.png',
};

interface NutritionComponentDetailTableProps {
  nutritionFood: any;
  onEditNutritionComponent?: (nutritionComponent: any) => void;
  onDeleteNutritionComponent?: (nutritionComponent: any) => void;
  onAddNutritionComponent?: () => void;
  onAddNutritionComponentAfter?: (nutritionComponent: any, index: number) => void;
  onRefresh?: () => void;
  allNutritionFoods?: any[]; // All nutritionFoods in the workout for navigation
  onNavigateNutritionFood?: (nutritionFoodId: string) => void; // Navigate to another nutritionFood
  /** When the anaerobic fast-planner nutritionComponent modal opens/closes (parent can hide the nutritionFood summary row). */
  onAnaerobicFastPlannerModalOpenChange?: (open: boolean) => void;
}

// Editable Notes Field Component - 2026-01-22 12:00 UTC
// 2026-01-22 15:35 UTC - Added onRefresh callback to trigger parent refresh after save
// 2026-01-26 - Added isNewlyAdded prop for red text styling
function EditableNotesField({ nutritionComponent, stripHtmlTags, onRefresh, isNewlyAdded }: { nutritionComponent: any; stripHtmlTags: (html: string) => string; onRefresh?: () => void; isNewlyAdded?: boolean }) {
  const [notesValue, setNotesValue] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Initialize and update notes value when nutritionComponent changes
  // 2026-01-22 14:15 UTC - Strip both CIRCUIT_META and CIRCUIT_DATA tags
  React.useEffect(() => {
    let cleanNotes = nutritionComponent.notes || '';
    if (typeof cleanNotes === 'string') {
      cleanNotes = stripInternalWorkoutTags(cleanNotes).trim();
    }
    setNotesValue(stripHtmlTags(cleanNotes));
  }, [nutritionComponent.notes, nutritionComponent.id, stripHtmlTags]);
  
  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsSaving(false);
      return;
    }
    
    let finalNotes = notesValue;
    const modeFromNutritionComponent =
      typeof nutritionComponent?._fastPlannerMode === 'string' && nutritionComponent._fastPlannerMode.trim() !== ''
        ? nutritionComponent._fastPlannerMode.trim()
        : null;

    if (modeFromNutritionComponent) {
      finalNotes = upsertFastPlannerModeInNotes(finalNotes, modeFromNutritionComponent);
    }

    const rawNotesForCircuitMeta = typeof nutritionComponent?._fastPlannerRawNotes === 'string' ? nutritionComponent._fastPlannerRawNotes : nutritionComponent.notes;
    if (rawNotesForCircuitMeta && typeof rawNotesForCircuitMeta === 'string') {
      const metaMatch = rawNotesForCircuitMeta.match(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/);
      if (metaMatch) {
        finalNotes = finalNotes ? `${finalNotes}\n${metaMatch[0]}` : metaMatch[0];
      }
    }
    
    try {
      const response = await fetch(`/api/nutrition/nutrition_components/${nutritionComponent.id}`, {
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
        // Update the nutritionComponent object
        nutritionComponent.notes = finalNotes;
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
function SortableNutritionComponentRow({ 
  nutritionComponent, 
  isNewlyAdded,
  index, 
  sequenceNumber,
  nutritionFoodLetter, 
  sectionColor, 
  sectionName, 
  nutritionFood, 
  mapToolsToBreakChoice,
  mapRestTypeToChoice,
  onEditNutritionComponent, 
  onEditFastPlannerNutritionComponent,
  onEditAerobicFastPlannerNutritionComponent,
  onAddFastPlannerNutritionComponent,
  onAddAerobicFastPlannerNutritionComponent,
  onDeleteNutritionComponent,
  onCopyNutritionComponent,
  onPasteNutritionComponent,
  onAddNutritionComponentAfter,
  onAddStationAfter,
  pauseAmongCircuits,
  lastCircuitLetter = '',
  circuitInfoByLetter,
  defaultSeriesPerCircuit,
  defaultStationsPerCircuit,
  pauseCircuitsSeconds,
  pauseSeriesSeconds,
  pauseByCircuit,
  pauseByCircuitIndex,
  onRefresh,
  isCircuitBased: isCircuitBasedProp,
  circuitExecutionMode,
  nextNutritionComponentInTable = null,
  circuitMacroFromConfig = null
}: {
  nutritionComponent: any;
  isNewlyAdded?: boolean;
  index: number;
  sequenceNumber: number;
  nutritionFoodLetter: string;
  sectionColor: string;
  sectionName: string;
  nutritionFood: any;
  mapToolsToBreakChoice: (tools: unknown) => string;
  mapRestTypeToChoice: (restType: unknown) => string;
  onEditNutritionComponent?: (nutritionComponent: any) => void;
  onEditFastPlannerNutritionComponent?: (nutritionComponent: any) => void;
  onEditAerobicFastPlannerNutritionComponent?: (nutritionComponent: any, index: number) => void;
  onAddFastPlannerNutritionComponent?: (position?: number, sourceNutritionComponent?: any) => void;
  onAddAerobicFastPlannerNutritionComponent?: (position?: number, sourceNutritionComponent?: any) => void;
  onDeleteNutritionComponent?: (nutritionComponent: any) => void;
  onCopyNutritionComponent: (nutritionComponent: any) => void;
  onPasteNutritionComponent: (index: number) => void;
  onAddNutritionComponentAfter?: (nutritionComponent: any, index: number) => void;
  onAddStationAfter?: (nutritionComponent: any, index: number) => void;
  pauseAmongCircuits?: string;
  /** Letter of the last circuit in this nutritionFood (final workout rest is not "between circuits"). */
  lastCircuitLetter?: string;
  circuitInfoByLetter?: Map<string, { seriesCount: number; stationsPerSeries: number }>;
  defaultSeriesPerCircuit?: number | null;
  defaultStationsPerCircuit?: number | null;
  pauseCircuitsSeconds?: number | null;
  pauseSeriesSeconds?: number | null;
  pauseByCircuit?: Map<string, { pauseAfterCircuit?: number; pauseBetweenSeries?: number; seriesPauses?: number[] }>;
  pauseByCircuitIndex?: Map<number, { pauseAfterCircuit?: number; pauseBetweenSeries?: number; seriesPauses?: number[] }>;
  onRefresh?: () => void;
  isCircuitBased?: boolean;
  /** From saved circuit config — drives thick row separator between series blocks in the nutritionComponent list. */
  circuitExecutionMode?: 'vertical' | 'horizontal';
  /** Next nutritionComponent in table order (same nutritionFood list); used for circuit serie boundaries in sparse grids. */
  nextNutritionComponentInTable?: any | null;
  /** Macro rest derived from saved circuit `loadOfWork` / config for final-row fallback. */
  circuitMacroFromConfig?: string | null;
}) {
  const isCircuitBasedRow = isCircuitBasedProp ?? nutritionFood?.isCircuitBased;
  const [exerciseGallery, setExerciseGallery] = useState<{
    title: string;
    pictureA: string | null;
    pictureB: string | null;
  } | null>(null);

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
  } = useSortable({ id: nutritionComponent.id });

  const handleOpenDropdown = () => {
    if (optionsButtonRef.current) {
      const rect = optionsButtonRef.current.getBoundingClientRect();
      
      setButtonRect(rect);
      setShowOptionsDropdown(true);
    } 
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsDropdown && dropdownRef.current && optionsButtonRef.current) {
        const target = event.target as Node;
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


  const normalizedCircuitLetter =
    typeof nutritionComponent.circuitLetter === 'string' ? nutritionComponent.circuitLetter.trim().toUpperCase() : '';
  const hasCircuitIdentity = !!normalizedCircuitLetter || typeof nutritionComponent.circuitIndex === 'number';
  const circuitInfo = normalizedCircuitLetter ? circuitInfoByLetter?.get(normalizedCircuitLetter) : null;
  const seriesCount = circuitInfo?.seriesCount ?? defaultSeriesPerCircuit ?? 0;
  const stationsPerSeries = circuitInfo?.stationsPerSeries ?? defaultStationsPerCircuit ?? 0;
  const isEndOfSeries = !!(hasCircuitIdentity && stationsPerSeries && nutritionComponent.stationNumber === stationsPerSeries);
  const isEndOfCircuit = !!(hasCircuitIdentity && isEndOfSeries && seriesCount && nutritionComponent.localSeriesNumber === seriesCount);
  const localSeriesNum =
    typeof nutritionComponent.localSeriesNumber === 'number' ? nutritionComponent.localSeriesNumber : 0;
  const stationNum = typeof nutritionComponent.stationNumber === 'number' ? nutritionComponent.stationNumber : 0;
  const execMode = circuitExecutionMode ?? 'vertical';
  const macroFromLap =
    nutritionComponent?.macroFinal != null && String(nutritionComponent.macroFinal).trim() !== '' && String(nutritionComponent.macroFinal).trim() !== '—'
      ? String(nutritionComponent.macroFinal).trim()
      : null;
  const circuitMacroFallback =
    circuitMacroFromConfig != null && String(circuitMacroFromConfig).trim() !== ''
      ? String(circuitMacroFromConfig).trim()
      : null;
  const nutritionFoodMacroFallback =
    nutritionFood?.macroFinal != null && String(nutritionFood.macroFinal).trim() !== ''
      ? String(nutritionFood.macroFinal).trim()
      : null;
  /** Vertical list order: thick line after the last row of serie N when the next row is same circuit and serie N+1 — not only when serie N fills `stationsPerSeries` (e.g. serie 1 with one station). */
  const nextLayout = nextNutritionComponentInTable ? readCircuitLayoutFromNutritionComponent(nextNutritionComponentInTable) : null;
  const sameCircuitNext =
    !!normalizedCircuitLetter && !!nextLayout && nextLayout.letter === normalizedCircuitLetter;
  /** Sparse grids (e.g. 1 station per serie): end-of-serie is when the next lap is not the same local serie — not when stationNumber hits configured width. */
  const nextSameSerieVertical =
    execMode === 'vertical' &&
    sameCircuitNext &&
    !!nextLayout &&
    nextLayout.localSeries === localSeriesNum;
  const nextSameSerieHorizontal =
    execMode === 'horizontal' &&
    sameCircuitNext &&
    !!nextLayout &&
    nextLayout.localSeries === localSeriesNum &&
    nextLayout.station === stationNum;
  const isLogicalEndOfSerie =
    hasCircuitIdentity &&
    (isEndOfSeries ||
      (execMode === 'vertical' && !!normalizedCircuitLetter && !nextSameSerieVertical) ||
      (execMode === 'horizontal' && !!normalizedCircuitLetter && !nextSameSerieHorizontal));
  const isLogicalEndOfCircuit =
    hasCircuitIdentity &&
    isLogicalEndOfSerie &&
    (seriesCount > 0 ? localSeriesNum === seriesCount : !sameCircuitNext);
  /** Next lap same circuit and strictly later local serie — works for sparse grids where serie 1 only fills station 1. */
  const listDetectsVerticalSeriesEnd =
    execMode === 'vertical' &&
    sameCircuitNext &&
    !!nextLayout &&
    nextLayout.localSeries > localSeriesNum &&
    localSeriesNum > 0 &&
    (seriesCount <= 0 || localSeriesNum < seriesCount);
  const listDetectsHorizontalSeriesEnd =
    execMode === 'horizontal' &&
    sameCircuitNext &&
    !!nextLayout &&
    nextLayout.station === stationNum &&
    nextLayout.localSeries > localSeriesNum &&
    localSeriesNum > 0 &&
    (seriesCount <= 0 || localSeriesNum < seriesCount);
  /** Vertical: after last station of a serie, except the last serie of the circuit. Horizontal: after last serie at a station, except the last station of the circuit. */
  const classicVerticalSerieEnd =
    execMode === 'vertical' &&
    seriesCount > 0 &&
    stationsPerSeries > 0 &&
    stationNum === stationsPerSeries &&
    localSeriesNum < seriesCount;
  const classicHorizontalSerieEnd =
    execMode === 'horizontal' &&
    seriesCount > 0 &&
    stationsPerSeries > 0 &&
    localSeriesNum === seriesCount &&
    stationNum < stationsPerSeries;
  /**
   * List-order truth: next lap is same circuit and starts local serie N+1 — works for vertical listing (C-1-4 → C-2-1)
   * even when saved executionMode is "horizontal". Does NOT fire after last serie (guarded by localSeriesNum < seriesCount)
   * nor after C-2-4 when the next row is another nutritionFood / circuit.
   */
  const listShowsNextSerieSameCircuit =
    !!normalizedCircuitLetter &&
    !!nextLayout &&
    sameCircuitNext &&
    localSeriesNum >= 1 &&
    Number.isFinite(nextLayout.localSeries) &&
    nextLayout.localSeries === localSeriesNum + 1 &&
    (seriesCount <= 0 || localSeriesNum < seriesCount);
  const showThickSerieEndSeparator =
    !!hasCircuitIdentity &&
    localSeriesNum > 0 &&
    stationNum > 0 &&
    (listShowsNextSerieSameCircuit ||
      classicVerticalSerieEnd ||
      classicHorizontalSerieEnd ||
      listDetectsVerticalSeriesEnd ||
      listDetectsHorizontalSeriesEnd);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 9999 : 1,
    position: 'relative' as const,
    cursor: isDragging ? 'grabbing' : 'auto',
    ...(showThickSerieEndSeparator ? { borderBottom: '4px solid #171717' } : {}),
  };

  const formatPause = (pauseSeconds: number) => {
    const minutes = Math.floor(pauseSeconds / 60);
    const seconds = pauseSeconds % 60;
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  };
  const circuitPauseConfig =
    (normalizedCircuitLetter ? pauseByCircuit?.get(normalizedCircuitLetter) : null) ??
    (typeof nutritionComponent.circuitIndex === 'number' ? pauseByCircuitIndex?.get(nutritionComponent.circuitIndex) ?? null : null);
  const seriesPauseFromCircuit = (() => {
    if (!circuitPauseConfig) return null;
    const seriesIndex = typeof nutritionComponent.localSeriesNumber === 'number' ? nutritionComponent.localSeriesNumber - 1 : -1;
    if (Array.isArray(circuitPauseConfig.seriesPauses) && seriesIndex >= 0 && seriesIndex < circuitPauseConfig.seriesPauses.length) {
      const value = circuitPauseConfig.seriesPauses[seriesIndex];
      if (typeof value === 'number') return value;
    }
    if (typeof circuitPauseConfig.pauseBetweenSeries === 'number') return circuitPauseConfig.pauseBetweenSeries;
    return null;
  })();
  const circuitPauseFromCircuit =
    typeof circuitPauseConfig?.pauseAfterCircuit === 'number' ? circuitPauseConfig.pauseAfterCircuit : null;
  const isLastCircuitInWorkout =
    !!lastCircuitLetter &&
    !!normalizedCircuitLetter &&
    normalizedCircuitLetter === lastCircuitLetter;
  const isWorkoutFinalRestRow = isLogicalEndOfCircuit && isLastCircuitInWorkout;
  const isIntermediateSeriesEndRow =
    hasCircuitIdentity && isLogicalEndOfSerie && !isLogicalEndOfCircuit;
  const finalRestSeconds =
    isWorkoutFinalRestRow && (circuitPauseFromCircuit ?? pauseCircuitsSeconds) != null
      ? (circuitPauseFromCircuit ?? pauseCircuitsSeconds)!
      : null;
  const storedPauseSeconds = parseNutritionComponentPauseToSeconds(nutritionComponent.pause);
  const useLegacyFinalRestInPause =
    isWorkoutFinalRestRow &&
    finalRestSeconds != null &&
    !nutritionComponent.macroFinal &&
    storedPauseSeconds + 2 < finalRestSeconds;

  // Same pause→macro mapping as non-final rows: after last serie of a circuit use pause-after-circuit; else end-of-serie uses pause-between-series.
  const macroFromCircuitPauses = !hasCircuitIdentity
    ? null
    : isLogicalEndOfCircuit && (circuitPauseFromCircuit ?? pauseCircuitsSeconds) != null
      ? formatPause((circuitPauseFromCircuit ?? pauseCircuitsSeconds) as number)
      : isLogicalEndOfSerie && (seriesPauseFromCircuit ?? pauseSeriesSeconds) != null
        ? formatPause((seriesPauseFromCircuit ?? pauseSeriesSeconds) as number)
        : null;

  const lapMacroSeconds = macroFromLap ? parseNutritionComponentPauseToSeconds(macroFromLap) : 0;
  const fallbackMacroSecondsFromConfig = Math.max(
    circuitMacroFallback ? parseNutritionComponentPauseToSeconds(circuitMacroFallback) : 0,
    nutritionFoodMacroFallback ? parseNutritionComponentPauseToSeconds(nutritionFoodMacroFallback) : 0,
    macroFromCircuitPauses ? parseNutritionComponentPauseToSeconds(macroFromCircuitPauses) : 0,
    finalRestSeconds ?? 0,
  );
  /** Lap sometimes stores legacy `0'` while planner macro lives in [CIRCUIT_DATA]. Prefer non-zero config when final lap macro parses to 0. */
  const suppressZeroLapMacroForFinal =
    isWorkoutFinalRestRow && !!macroFromLap && lapMacroSeconds === 0 && fallbackMacroSecondsFromConfig > 0;

  // Macro column: lap macro only on rows that store macroFinal; final-row fallback from config/nutritionFood. Between-series rest lives on nutritionComponent.pause (Pause column), not here — avoids every lap inheriting macro and hiding Pause.
  const macroValue = macroFromLap && !suppressZeroLapMacroForFinal
    ? macroFromLap
    : hasCircuitIdentity && isWorkoutFinalRestRow
      ? circuitMacroFallback ?? nutritionFoodMacroFallback ?? macroFromCircuitPauses
      : null;
  const pauseValue = macroValue
    ? null
    : useLegacyFinalRestInPause && finalRestSeconds != null
      ? formatPause(finalRestSeconds)
      : nutritionComponent.pause;
  const recValue = nutritionComponent?.restType === REST_TYPES.SET_TIME ? nutritionComponent.pause : null;
  const restToValue =
    nutritionComponent?.restType === REST_TYPES.RESTART_TIME || nutritionComponent?.restType === REST_TYPES.RESTART_PULSE
      ? nutritionComponent.pause
      : null;

  // Get sound icon
  const getSoundIcon = (nutritionComponent: any) => {
    const forceRed = !!isNewlyAdded;
    if (nutritionComponent.sound) {
      const soundLower = nutritionComponent.sound.toLowerCase();
      if (soundLower.includes('beep') || soundLower.includes('alarm')) {
        return <Bell size={14} className={forceRed ? 'text-red-600' : 'text-yellow-600'} />;
      } else if (soundLower.includes('none') || soundLower === '—') {
        return <BellOff size={14} className={forceRed ? 'text-red-600' : 'text-gray-400'} />;
      } else {
        return <Volume2 size={14} className={forceRed ? 'text-red-600' : 'text-blue-600'} />;
      }
    }
    if (nutritionComponent.alarm) {
      return <Bell size={14} className={forceRed ? 'text-red-600' : 'text-yellow-600'} />;
    }
    return <VolumeX size={14} className={forceRed ? 'text-red-600' : 'text-gray-400'} />;
  };

  // Sport-specific rendering logic
  const sport = nutritionFood.sport || 'SWIM';
  const isSwim = sport === 'SWIM';
  const isBike = sport === 'BIKE' || sport === 'MTB';
  const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
  const isRowing = sport === 'ROWING' || sport === 'CANOEING';
  const isBodyBuilding = sport === 'BODY_BUILDING';
  const fastPlannerPayloadFromNotes = extractFastPlannerDataFromNotes(nutritionFood?.notes);
  const fastPlannerPayload = nutritionFood?.fastPlannerData ?? fastPlannerPayloadFromNotes ?? null;
  const hasFastPlannerNotes = !!fastPlannerPayloadFromNotes;
  const hasFastPlannerData = !!nutritionFood?.fastPlannerData;
  const hasFastPlannerDescription =
    typeof nutritionFood?.description === 'string' && nutritionFood.description.toLowerCase().startsWith('fast planner');
  const isFastPlanner =
    (!!fastPlannerPayload || hasFastPlannerDescription) &&
    nutritionFood?.type === 'BATTERY' &&
    !nutritionFood?.isCircuitBased;
  const isAerobicFastPlanner = isFastPlanner && fastPlannerPayload?.plannerType === 'aerobic';
  const isAnaerobicFastPlanner = isFastPlanner && !isAerobicFastPlanner;

  /** Circuit laps store pause as seconds on `nutritionComponent.pause` — format Pause column (between-series / macro rest live here when only one station produces nutrition_components per serie). */
  const pauseSecondsCircuitDisplay =
    hasCircuitIdentity && !isAnaerobicFastPlanner && !isAerobicFastPlanner
      ? isWorkoutFinalRestRow
        ? Math.max(
            storedPauseSeconds,
            finalRestSeconds ?? 0,
            lapMacroSeconds,
            fallbackMacroSecondsFromConfig,
          )
        : storedPauseSeconds
      : storedPauseSeconds;
  const pauseColumnDisplay =
    hasCircuitIdentity && !isAnaerobicFastPlanner && !isAerobicFastPlanner
      ? useLegacyFinalRestInPause && finalRestSeconds != null
        ? formatPause(finalRestSeconds)
        : formatPause(pauseSecondsCircuitDisplay)
      : pauseValue === 0
        ? '0'
        : pauseValue || '—';
  
  // Distance-based sports (no tools)
  const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
  const isDistanceBased = distanceBasedSports.includes(sport);
  
  const hasTools = !isBodyBuilding && !isDistanceBased;
  
  return (
    <>
    <tr 
      ref={setNodeRef} 
      style={{
        ...style,
        ...(isIntermediateSeriesEndRow
          ? { boxShadow: 'inset 0 -3px 0 0 rgba(31,41,55,0.95)' }
          : {}),
      }} 
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
          title="Drag to reorder nutritionComponent"
          type="button"
        >
          <GripVertical size={18} />
        </button>
      </td>
      
      {/* MF (NutritionFood Letter) / Circuit Letter Column - 2026-01-22 10:30 UTC */}
      {/* 2026-01-22 11:30 UTC - Updated to show circuit letter (A, B, C) for circuits */}
      <td className="border border-gray-300 px-1 py-1 text-center font-bold text-xs">
        {nutritionComponent.circuitLetter ? nutritionComponent.circuitLetter : nutritionFoodLetter}
      </td>
      
      {/* # (Repetition Number) / Circuit Info Column - 2026-01-22 10:30 UTC */}
      {/* 2026-01-24 - Updated to show format like "B-2-3" (circuit-series-station) */}
      <td className="border border-gray-300 px-1 py-1 text-center font-bold text-xs">
        {nutritionComponent.circuitLetter 
          ? `${nutritionComponent.circuitLetter}-${nutritionComponent.localSeriesNumber || nutritionComponent.seriesNumber}-${nutritionComponent.stationNumber}` 
          : sequenceNumber}
      </td>
      
      {/* NutritionMeal Section Column - Combined color and name */}
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
      <td className={`border border-gray-300 px-1 py-1 text-center text-[10px] ${isNewlyAdded ? 'text-red-600' : ''}`}>
        {sport.replace(/_/g, ' ')}
      </td>
      
      {/* SPORT-SPECIFIC COLUMNS */}
      
       {isAnaerobicFastPlanner && (
         <>
           <td className={`border border-gray-300 px-1 py-1 align-middle ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {(() => {
               const exName = (nutritionComponent.exercise || '').trim();
               const sectorLabel = (nutritionComponent.muscularSector || nutritionComponent.style || '').trim();
               const sectorImg =
                 sectorLabel && MUSCULAR_SECTOR_IMAGES[sectorLabel]
                   ? MUSCULAR_SECTOR_IMAGES[sectorLabel]
                   : null;
               const media = exName ? getExerciseMedia(exName) : null;
               const thumbSrc =
                 media?.thumb?.src ?? (exName && sectorImg ? sectorImg : null);
               const thumbData =
                 media?.thumb?.isDataUrl === true || (!!thumbSrc && thumbSrc.startsWith('data:'));
               const openGallery = () => {
                 const title =
                   exName || (sectorLabel ? `${sectorLabel} — exercise` : 'Exercise');
                 setExerciseGallery({
                   title,
                   pictureA: media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                   pictureB:
                     media?.pictureB ?? media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                 });
               };
               if (!exName && !sectorLabel) {
                 return <span className="text-sm text-gray-400">—</span>;
               }
               return (
                 <div className="flex max-w-[220px] items-center gap-1.5">
                   <button
                     type="button"
                     title="Click to enlarge pictures"
                     className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-teal-500"
                     onClick={(e) => {
                       e.stopPropagation();
                       openGallery();
                     }}
                   >
                     {thumbSrc ? (
                       thumbData ? (
                         // eslint-disable-next-line @next/next/no-img-element -- thumb may be data URL from catalog
                         <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                       ) : (
                         <Image
                           src={thumbSrc}
                           alt=""
                           width={40}
                           height={40}
                           className="h-full w-full object-cover"
                           unoptimized
                         />
                       )
                     ) : (
                       <div className="h-full w-full bg-gray-100" aria-hidden />
                     )}
                   </button>
                   <div className="min-w-0 flex-1 text-left text-sm leading-tight text-gray-900">
                     {exName || (
                       <span className="italic text-amber-800">{sectorLabel}</span>
                     )}
                   </div>
                 </div>
               );
             })()}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-sm ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {(() => {
               const s = typeof nutritionComponent.speed === 'string' ? nutritionComponent.speed.trim() : (nutritionComponent.speed != null ? String(nutritionComponent.speed).trim() : '');
               if (!s) return '—';
               if (/^\d+$/.test(s)) return '—';
               if ((nutritionComponent.reps != null || nutritionComponent._fastPlannerRipTime) && (String(nutritionComponent.reps) === s || nutritionComponent._fastPlannerRipTime === s)) return '—';
               return s;
             })()}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {nutritionComponent._fastPlannerSeries || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {nutritionComponent._fastPlannerRipTime || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-blue-700'}`}>
             {nutritionComponent.weight || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {nutritionComponent._fastPlannerBreak || nutritionComponent.pause || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {nutritionComponent._fastPlannerMode || '—'}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {macroValue != null && parseNutritionComponentPauseToSeconds(macroValue) === 0 ? '0' : macroValue || '—'}
           </td>
         </>
       )}

      {isAerobicFastPlanner && (
        <>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {(() => {
              const distRaw = nutritionComponent.distance != null ? String(nutritionComponent.distance).trim() : '';
              return distRaw ? (/^[0-9]+$/.test(distRaw) ? `${distRaw}m` : distRaw) : '—';
            })()}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {nutritionComponent.style ? String(nutritionComponent.style).trim() : '—'}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {nutritionComponent.speed ? String(nutritionComponent.speed).trim() : '—'}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {nutritionComponent.rowPerMin != null ? String(nutritionComponent.rowPerMin) : '—'}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {nutritionComponent.pace != null ? String(nutritionComponent.pace) : '—'}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {nutritionComponent.time ? String(nutritionComponent.time).trim() : '—'}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {(() => {
              const restChoice = mapRestTypeToChoice(nutritionComponent?.restType);
              if (restChoice === 'restart_to') return 'Restart to';
              if (restChoice === 'reset_pulse') return 'Rest pulse';
              return 'Rest Time';
            })()}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {(() => {
              const restValue = nutritionComponent.pause != null ? String(nutritionComponent.pause).trim() : '';
              return restValue || '—';
            })()}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {(() => {
              const rawTools = typeof nutritionComponent.tools === 'string' ? nutritionComponent.tools.trim() : '';
              const choice = mapToolsToBreakChoice(rawTools);
              if (choice === 'stopped') return 'Stopped';
              if (choice === 'speed') return 'Speed';
              return 'Watts';
            })()}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {(() => {
              const rawTools = typeof nutritionComponent.tools === 'string' ? nutritionComponent.tools.trim() : '';
              const choice = mapToolsToBreakChoice(rawTools);
              if (rawTools) return rawTools;
              return choice === 'stopped' ? 'Stopped' : '—';
            })()}
          </td>
          <td className={`border border-gray-300 px-1 py-1 text-left text-[10px] ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {typeof nutritionComponent.notes === 'string' && nutritionComponent.notes.trim() !== '' ? nutritionComponent.notes : '—'}
          </td>
        </>
      )}

       {/* BODY BUILDING — circuit rows: muscular icon + exercise thumb/name */}
       {isBodyBuilding && !isAnaerobicFastPlanner && !isAerobicFastPlanner && (
         <>
           {isCircuitBasedRow && (
             <>
               <td
                 className={`border border-gray-300 px-1 py-1 text-center align-middle ${isNewlyAdded ? 'text-red-600' : ''}`}
               >
                 {(() => {
                   const sectorLabel = (nutritionComponent.muscularSector || nutritionComponent.style || '').trim();
                   const src =
                     sectorLabel && MUSCULAR_SECTOR_IMAGES[sectorLabel]
                       ? MUSCULAR_SECTOR_IMAGES[sectorLabel]
                       : null;
                   if (!src) {
                     return <span className="text-[10px] text-gray-400">—</span>;
                   }
                   return (
                     <div className="flex flex-col items-center gap-0.5">
                       <Image
                         src={src}
                         alt={sectorLabel}
                         width={40}
                         height={40}
                         className="h-10 w-10 object-contain"
                         unoptimized
                       />
                       <span
                         className="max-w-[56px] truncate text-[8px] leading-tight text-gray-700"
                         title={sectorLabel}
                       >
                         {sectorLabel}
                       </span>
                     </div>
                   );
                 })()}
               </td>
               <td
                 className={`border border-gray-300 px-1 py-1 align-middle ${isNewlyAdded ? 'text-red-600' : ''}`}
               >
                 {(() => {
                   const exName = (nutritionComponent.exercise || '').trim();
                   const sectorLabel = (nutritionComponent.muscularSector || nutritionComponent.style || '').trim();
                   const sectorImg =
                     sectorLabel && MUSCULAR_SECTOR_IMAGES[sectorLabel]
                       ? MUSCULAR_SECTOR_IMAGES[sectorLabel]
                       : null;
                   const media = exName ? getExerciseMedia(exName) : null;
                  const thumbSrc =
                    media?.thumb?.src ?? (exName && sectorImg ? sectorImg : null);
                   const thumbData =
                     media?.thumb?.isDataUrl === true || (!!thumbSrc && thumbSrc.startsWith('data:'));
                   const openGallery = () => {
                     const title =
                       exName || (sectorLabel ? `${sectorLabel} — select exercise` : 'Exercise');
                    setExerciseGallery({
                      title,
                      pictureA: media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                      pictureB:
                        media?.pictureB ?? media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                    });
                   };
                   return (
                     <div className="flex items-center gap-1.5">
                       <button
                         type="button"
                         title="Click to enlarge positions A and B"
                         className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-teal-500"
                         onClick={(e) => {
                           e.stopPropagation();
                           openGallery();
                         }}
                       >
                         {thumbSrc ? (
                           thumbData ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                           ) : (
                             <Image
                               src={thumbSrc}
                               alt=""
                               width={40}
                               height={40}
                               className="h-full w-full object-cover"
                               unoptimized
                             />
                           )
                         ) : (
                           <div className="h-full w-full bg-gray-100" aria-hidden />
                         )}
                       </button>
                       <div className="min-w-0 flex-1 text-left text-[10px] leading-tight text-gray-900">
                         {exName ? (
                           exName
                         ) : (
                           <span className="italic text-amber-800">Select exercise — Edit</span>
                         )}
                       </div>
                     </div>
                   );
                 })()}
               </td>
             </>
           )}
           {/* Reps */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {isCircuitBasedRow
               ? (nutritionComponent.reps != null && nutritionComponent.reps !== ''
                   ? String(nutritionComponent.reps)
                   : nutritionComponent.speed) || '—'
               : nutritionComponent.reps || '—'}
           </td>
           {!nutritionFood.isCircuitBased && (
             <>
           {/* Weight */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-blue-700'}`}>
             {nutritionComponent.weight || '—'}
           </td>
           {/* Tempo/Speed - Only show if user set a real tempo (e.g. Slow, Normal); do not show numeric values they did not type as Time */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {(() => {
               const s = typeof nutritionComponent.speed === 'string' ? nutritionComponent.speed.trim() : (nutritionComponent.speed != null ? String(nutritionComponent.speed).trim() : '');
               if (!s) return '—';
               if (/^\d+$/.test(s)) return '—';
               if (nutritionComponent.reps != null && String(nutritionComponent.reps) === s) return '—';
               return s;
             })()}
           </td>
             </>
           )}
         </>
       )}
      
       {/* OTHER SPORTS WITH TOOLS (Gymnastic, Stretching, Pilates, Yoga, etc.) */}
       {hasTools && !isAerobicFastPlanner && (
         <>
           <td
             className={`border border-gray-300 px-1 py-1 text-center align-middle ${isNewlyAdded ? 'text-red-600' : ''}`}
           >
             {(() => {
               const sectorLabel = (nutritionComponent.muscularSector || nutritionComponent.style || '').trim();
               const src =
                 sectorLabel && MUSCULAR_SECTOR_IMAGES[sectorLabel]
                   ? MUSCULAR_SECTOR_IMAGES[sectorLabel]
                   : null;
               if (!sectorLabel && !src) {
                 return <span className="text-sm text-gray-400">—</span>;
               }
               if (!src) {
                 return (
                   <span className="text-sm leading-tight text-gray-800" title={sectorLabel}>
                     {sectorLabel || '—'}
                   </span>
                 );
               }
               return (
                 <div className="flex flex-col items-center gap-0.5">
                   <Image
                     src={src}
                     alt={sectorLabel}
                     width={40}
                     height={40}
                     className="h-10 w-10 object-contain"
                     unoptimized
                   />
                   <span
                     className="max-w-[56px] truncate text-sm leading-tight text-gray-700"
                     title={sectorLabel}
                   >
                     {sectorLabel}
                   </span>
                 </div>
               );
             })()}
           </td>
           <td
             className={`border border-gray-300 px-1 py-1 align-middle ${isNewlyAdded ? 'text-red-600' : ''}`}
           >
             {(() => {
               const exName = (nutritionComponent.exercise || '').trim();
               const sectorLabel = (nutritionComponent.muscularSector || nutritionComponent.style || '').trim();
               const sectorImg =
                 sectorLabel && MUSCULAR_SECTOR_IMAGES[sectorLabel]
                   ? MUSCULAR_SECTOR_IMAGES[sectorLabel]
                   : null;
               const media = exName ? getExerciseMedia(exName) : null;
              const thumbSrc =
                media?.thumb?.src ?? (exName && sectorImg ? sectorImg : null);
               const thumbData =
                 media?.thumb?.isDataUrl === true || (!!thumbSrc && thumbSrc.startsWith('data:'));
               const openGallery = () => {
                 const title =
                   exName || (sectorLabel ? `${sectorLabel} — select exercise` : 'Exercise');
                setExerciseGallery({
                  title,
                  pictureA: media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                  pictureB:
                    media?.pictureB ?? media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                });
               };
               return (
                 <div className="flex items-center gap-1.5">
                   <button
                     type="button"
                     title="Click to enlarge positions A and B"
                     className="h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 hover:ring-2 hover:ring-teal-500"
                     onClick={(e) => {
                       e.stopPropagation();
                       openGallery();
                     }}
                   >
                     {thumbSrc ? (
                       thumbData ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                       ) : (
                         <Image
                           src={thumbSrc}
                           alt=""
                           width={40}
                           height={40}
                           className="h-full w-full object-cover"
                           unoptimized
                         />
                       )
                     ) : (
                       <div className="h-full w-full bg-gray-100" aria-hidden />
                     )}
                   </button>
                   <div className="min-w-0 flex-1 text-left text-sm leading-tight text-gray-900">
                     {exName ? (
                       exName
                     ) : (
                       <span className="italic text-amber-800">Select exercise — Edit</span>
                     )}
                   </div>
                 </div>
               );
             })()}
           </td>
           <td className={`border border-gray-300 px-1 py-1 text-center text-sm ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {nutritionComponent.reps || '—'}
           </td>
           {/* Tools */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-green-700'}`}>
             {nutritionComponent.tools || '—'}
           </td>
         </>
       )}
      
       {/* SWIM, BIKE, RUN, ROWING, SKATE, SKI, SNOWBOARD - Distance-based sports */}
       {isDistanceBased && !isAerobicFastPlanner && (
         <>
           {/* Distance/Duration - 2026-01-22 11:30 UTC - Show sector for circuits, distance/time for regular */}
           {/* 2026-01-22 14:20 UTC - Use style field for sector (stored in DB) */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
             {nutritionComponent.circuitLetter 
               ? (nutritionComponent.style || nutritionComponent.sector || '—')
               : (nutritionComponent.distance ? nutritionComponent.distance : (nutritionComponent.time || '—'))}
           </td>
           
           {/* Exercise (formerly Style) - 2026-01-22 11:30 UTC - Show exercise for circuits, style for regular */}
           {(isSwim || isRun) && (
             <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
               {nutritionComponent.circuitLetter 
                 ? (nutritionComponent.exercise || '—')
                 : (nutritionComponent.style || '—')}
             </td>
           )}
           
           {/* R1, R2 - Only for BIKE */}
           {isBike && (
             <>
               <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
                 {nutritionComponent.r1 || '—'}
               </td>
               <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
                 {nutritionComponent.r2 || '—'}
               </td>
             </>
           )}
           
          {/* Speed/Reps - For SWIM, BIKE, RUN - 2026-01-22 14:10 UTC - Show reps for circuits, speed for regular */}
          {/* 2026-01-22 14:20 UTC - For circuits, speed field stores reps value */}
          <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
            {nutritionComponent.speed || '—'}
          </td>
           
           {/* Row/min - Only for ROWING and CANOEING */}
           {(nutritionFood.sport === 'ROWING' || nutritionFood.sport === 'CANOEING') && (
             <td className={`border border-gray-300 px-1 py-1 text-center text-xs font-semibold ${isNewlyAdded ? 'text-red-600' : 'text-purple-700'}`}>
               {nutritionComponent.rowPerMin || '—'}
             </td>
           )}
           
           {/* Time */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '85px', minWidth: '85px' }}>
             {nutritionComponent.time || '—'}
           </td>
           
           {/* Pace */}
           <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '85px', minWidth: '85px' }}>
             {nutritionComponent.pace || '—'}
           </td>
         </>
       )}
      
      {/* COMMON COLUMNS for all sports */}
       
       {/* Pause/Recovery */}
     {!isAnaerobicFastPlanner && !isAerobicFastPlanner && (
      <td className={`border border-gray-300 px-1 py-1 text-center text-sm ${isNewlyAdded ? 'text-red-600' : ''}`}>
        {pauseColumnDisplay}
       </td>
      )}
       
       {/* Macro: between series / between circuits (final workout rest is in Pause on last row) */}
       {/* 2026-01-22 15:35 UTC - Calculate pause for each nutritionComponent individually */}
     {!isAnaerobicFastPlanner && !isAerobicFastPlanner && (
      <td className={`border border-gray-300 px-1 py-1 text-center text-xs ${isNewlyAdded ? 'text-red-600' : ''}`}>
        {macroValue != null && parseNutritionComponentPauseToSeconds(macroValue) === 0 ? '0' : macroValue || '—'}
       </td>
      )}
       
       {/* Alarm & Sound - Hide for circuit-based nutritionFoods */}
       {!nutritionFood.isCircuitBased && !isAnaerobicFastPlanner && !isAerobicFastPlanner && (
      <td className={`border border-gray-300 px-1 py-1 text-center ${isNewlyAdded ? 'text-red-600' : ''}`}>
         <div className="flex items-center justify-center gap-1">
           {getSoundIcon(nutritionComponent)}
           {nutritionComponent.alarm && nutritionComponent.alarm !== -1 && <span className="text-[8px]">{Math.abs(nutritionComponent.alarm)}</span>}
         </div>
       </td>
       )}
      
      {/* Notes - Display with increased width for better readability */}
      {/* 2026-01-24 - Increased width 4x to 1200px for circuit nutritionComponent table */}
      {/* 2026-01-26 - Added red text styling for newly added nutrition_components */}
      {!isAerobicFastPlanner && (
        <td className={`border border-gray-300 px-2 py-1 text-left text-xs ${isNewlyAdded ? 'text-red-600' : ''}`} style={{ width: '300px' }}>
          {/* 2026-01-22 11:45 UTC - Made notes field editable */}
          {/* 2026-01-22 12:00 UTC - Fixed to use controlled component with local state */}
          {/* 2026-01-22 15:35 UTC - Added onRefresh callback */}
          {/* 2026-01-26 - Added isNewlyAdded prop for red text styling */}
          <EditableNotesField
            nutritionComponent={nutritionComponent}
            stripHtmlTags={stripHtmlTags}
            onRefresh={onRefresh}
            isNewlyAdded={isNewlyAdded}
          />
        </td>
      )}
      
      {/* Options Column - Simplified to Edit + Options dropdown */}
      {/* 2026-01-24 - Sticky options column */}
      <td className="border border-gray-300 px-1 py-1 text-center sticky-options-col bg-white" style={{ width: '110px', minWidth: '110px' }}>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isAnaerobicFastPlanner) {
                if (onEditFastPlannerNutritionComponent) onEditFastPlannerNutritionComponent(nutritionComponent);
                return;
              }
              if (isAerobicFastPlanner) {
                if (onEditAerobicFastPlannerNutritionComponent) onEditAerobicFastPlannerNutritionComponent(nutritionComponent, index);
                return;
              }
              if (onEditNutritionComponent) onEditNutritionComponent(nutritionComponent);
            }}
            className="px-3 py-1 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
            title="Edit nutritionComponent"
          >
            Edit
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
            onCopyNutritionComponent(nutritionComponent);
            setShowOptionsDropdown(false);
          }}
          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
        >
          Copy
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPasteNutritionComponent(index);
            setShowOptionsDropdown(false);
          }}
          className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
        >
          Paste
        </button>
        {/* Add nutritionComponent: one entry for all non-circuit types; insert after selected row */}
        {!(nutritionComponent.circuitLetter || nutritionFood.isCircuitBased) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isAnaerobicFastPlanner) {
                onAddFastPlannerNutritionComponent?.(index + 2, nutritionComponent);
                setShowOptionsDropdown(false);
                return;
              }
              if (isAerobicFastPlanner) {
                onAddAerobicFastPlannerNutritionComponent?.(index + 1, nutritionComponent);
                setShowOptionsDropdown(false);
                return;
              }
              if (onAddNutritionComponentAfter) {
                onAddNutritionComponentAfter(nutritionComponent, index);
              }
              setShowOptionsDropdown(false);
            }}
            className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100"
          >
            Add dietlap
          </button>
        )}
        {!!(nutritionComponent.circuitLetter || nutritionFood.isCircuitBased) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStationAfter?.(nutritionComponent, index);
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
            if (onDeleteNutritionComponent) {
              if (confirm(`Delete ${nutritionFoodLetter}${index + 1}?`)) {
                onDeleteNutritionComponent(nutritionComponent);
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
    <ExerciseGalleryModal
      open={!!exerciseGallery}
      onClose={() => setExerciseGallery(null)}
      title={exerciseGallery?.title ?? ''}
      pictureA={exerciseGallery?.pictureA ?? null}
      pictureB={exerciseGallery?.pictureB ?? null}
    />
    </>
  );
}

export default function NutritionComponentDetailTable({ 
  nutritionFood, 
  onEditNutritionComponent, 
  onDeleteNutritionComponent, 
  onAddNutritionComponent,
  onAddNutritionComponentAfter,
  onRefresh,
  allNutritionFoods = [],
  onNavigateNutritionFood,
  onAnaerobicFastPlannerModalOpenChange
}: NutritionComponentDetailTableProps) {
  const [nutritionComponents, setNutritionComponents] = useState(nutritionFood.nutritionComponents || []);
  const [pendingStationMove, setPendingStationMove] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);
  const [isApplyingStationMove, setIsApplyingStationMove] = useState(false);
  const nutritionFoodLetter = nutritionFood.letter || 'A'; // Parent nutritionFood letter
  const sectionColor = nutritionFood.section?.color || '#5b8def';
  const sectionName = nutritionFood.section?.name || 'Default';
  const [copiedNutritionComponent, setCopiedNutritionComponent] = useState<any>(null);
  const [newlyAddedStationNutritionComponentIds, setNewlyAddedStationNutritionComponentIds] = useState<Set<string>>(() => new Set());
  const [newlyAddedFastPlannerExercises, setNewlyAddedFastPlannerExercises] = useState<Set<string>>(() => new Set());
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [stationModalMode, setStationModalMode] = useState<'add' | 'edit'>('add');
  /** When false, sector dropdown lists only the station's current sector (edit + sector set, no exercise). Reset shows all. */
  const [stationSectorShowAll, setStationSectorShowAll] = useState(true);
  const [editingStationNutritionComponent, setEditingStationNutritionComponent] = useState<any>(null);
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
    afterNutritionComponentId: string;
    circuitLetter: string;
    circuitIndex?: number;
    seriesNumber?: number;
    localSeriesNumber: number;
    stationNumber: number;
  } | null>(null);
  const [showFastPlannerNutritionComponentModal, setShowFastPlannerNutritionComponentModal] = useState(false);
  const [fpNutritionComponentExerciseGallery, setFpNutritionComponentExerciseGallery] = useState<{
    title: string;
    pictureA: string | null;
    pictureB: string | null;
  } | null>(null);
  const [fastPlannerNutritionComponentModalMode, setFastPlannerNutritionComponentModalMode] = useState<'add' | 'edit'>('add');
  const [fastPlannerOriginalExercise, setFastPlannerOriginalExercise] = useState<string | null>(null);
  const [isSavingFastPlannerNutritionComponent, setIsSavingFastPlannerNutritionComponent] = useState(false);
  const [fastPlannerInsertPosition, setFastPlannerInsertPosition] = useState<number>(1);
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
  const [showAerobicFastPlannerNutritionComponentModal, setShowAerobicFastPlannerNutritionComponentModal] = useState(false);
  const [aerobicFastPlannerNutritionComponentModalMode, setAerobicFastPlannerNutritionComponentModalMode] = useState<'add' | 'edit'>('add');
  const [aerobicFastPlannerInsertPosition, setAerobicFastPlannerInsertPosition] = useState<number>(1);
  const [aerobicFastPlannerTargetIndex, setAerobicFastPlannerTargetIndex] = useState<number | null>(null);
  const [isSavingAerobicFastPlannerNutritionComponent, setIsSavingAerobicFastPlannerNutritionComponent] = useState(false);
  const [aerobicFastPlannerDraft, setAerobicFastPlannerDraft] = useState(() => ({
    distance: '',
    style: '',
    speed: '',
    strokes: '',
    watts: '',
    time: '',
    restChoice: 'rest_time' as AerobicRestChoice,
    rest: '',
    breakChoice: 'stopped' as AerobicBreakChoice,
    break: 'Stopped',
    note: ''
  }));
  // 2026-01-22 14:15 UTC - Strip circuit tags from initial notes value
  const [noteValue, setNoteValue] = useState(() => {
    const raw = nutritionFood.notes || '';
    const cleanNotes = typeof raw === 'string' ? stripInternalWorkoutTags(raw).trim() : '';
    return stripHtmlTags(cleanNotes);
  });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [currentNutritionComponentIndex, setCurrentNutritionComponentIndex] = useState(0); // Current nutritionComponent being viewed
  const [showManualContentPopup, setShowManualContentPopup] = useState(false); // Popup for manual content
  const [popupContentType, setPopupContentType] = useState<'summary' | 'detail'>('detail'); // Track which section is being viewed

  React.useEffect(() => {
    try {
      const stationKey = `mlNewIds:${nutritionFood.id}`;
      const exerciseKey = `fpNewExercises:${nutritionFood.id}`;
      const stationRaw = typeof window !== 'undefined' ? window.localStorage.getItem(stationKey) : null;
      const exerciseRaw = typeof window !== 'undefined' ? window.localStorage.getItem(exerciseKey) : null;
      if (stationRaw) {
        const parsed = JSON.parse(stationRaw);
        if (Array.isArray(parsed)) {
          setNewlyAddedStationNutritionComponentIds(new Set(parsed.filter((v) => typeof v === 'string')));
        } else {
          setNewlyAddedStationNutritionComponentIds(new Set());
        }
      } else {
        setNewlyAddedStationNutritionComponentIds(new Set());
      }
      if (exerciseRaw) {
        const parsed = JSON.parse(exerciseRaw);
        if (Array.isArray(parsed)) {
          setNewlyAddedFastPlannerExercises(new Set(parsed.filter((v) => typeof v === 'string')));
        } else {
          setNewlyAddedFastPlannerExercises(new Set());
        }
      } else {
        setNewlyAddedFastPlannerExercises(new Set());
      }
    } catch {
      setNewlyAddedStationNutritionComponentIds(new Set());
      setNewlyAddedFastPlannerExercises(new Set());
    }
  }, [nutritionFood.id]);

  React.useEffect(() => {
    onAnaerobicFastPlannerModalOpenChange?.(showFastPlannerNutritionComponentModal);
    return () => {
      onAnaerobicFastPlannerModalOpenChange?.(false);
    };
  }, [showFastPlannerNutritionComponentModal, onAnaerobicFastPlannerModalOpenChange]);

  React.useEffect(() => {
    setNewlyAddedStationNutritionComponentIds((prev) => {
      if (!prev.size) return prev;
      const currentIds = new Set<string>((nutritionFood.nutritionComponents || []).map((ml: any) => ml.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      if (changed) {
        try {
          const stationKey = `mlNewIds:${nutritionFood.id}`;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(stationKey, JSON.stringify(Array.from(next)));
          }
        } catch {
          // ignore
        }
      }
      return changed ? next : prev;
    });
  }, [nutritionFood.nutritionComponents, nutritionFood.id]);
  
  // 2026-01-22 10:50 UTC - Extract circuit data from nutritionFood notes if present
  // 2026-01-22 11:30 UTC - Also extract pause among circuits value
  let circuitBasedNutritionFood = false;
  let pauseAmongCircuits = '—';
  let circuitConfig: any = null;
  let circuitRows: any[] | null = null;
  let pauseCircuitsSeconds: number | null = null;
  let pauseSeriesSeconds: number | null = null;
  let defaultSeriesPerCircuit: number | null = null;
  let defaultStationsPerCircuit: number | null = null;
  const pauseByCircuit = new Map<string, { pauseAfterCircuit?: number; pauseBetweenSeries?: number; seriesPauses?: number[] }>();
  const pauseByCircuitIndex = new Map<number, { pauseAfterCircuit?: number; pauseBetweenSeries?: number; seriesPauses?: number[] }>();
  const derivePauseFromCircuits = (circuits: any[] | null, key: 'pauseAfterCircuit' | 'restAfterCircuit' | 'pauseBetweenSeries') => {
    if (!Array.isArray(circuits)) return null;
    for (let i = 0; i < circuits.length; i++) {
      const value = circuits[i]?.[key];
      if (typeof value === 'number') return value;
    }
    return null;
  };
  let derivedPauseCircuits: number | null = null;
  let derivedPauseSeries: number | null = null;
  if (nutritionFood.notes && typeof nutritionFood.notes === 'string') {
    const circuitDataMatch = nutritionFood.notes.match(/\[CIRCUIT_DATA\](.*?)\[\/CIRCUIT_DATA\]/);
    if (circuitDataMatch) {
      try {
        const circuitData = JSON.parse(circuitDataMatch[1]);
        circuitBasedNutritionFood = circuitData.isCircuitBased || false;
        nutritionFood.isCircuitBased = circuitBasedNutritionFood;
        circuitConfig = circuitData.config || null;
        circuitRows = circuitData.circuits || null;
        if (Array.isArray(circuitRows)) {
          circuitRows.forEach((circuit: any, index: number) => {
            const pauseConfig = {
              pauseAfterCircuit: typeof circuit.pauseAfterCircuit === 'number' ? circuit.pauseAfterCircuit : undefined,
              pauseBetweenSeries: typeof circuit.pauseBetweenSeries === 'number' ? circuit.pauseBetweenSeries : undefined,
              seriesPauses: Array.isArray(circuit.seriesPauses) ? circuit.seriesPauses : undefined
            };
            const normalizedLetter =
              typeof circuit?.letter === 'string' ? circuit.letter.trim().toUpperCase() : '';
            if (normalizedLetter) {
              pauseByCircuit.set(normalizedLetter, pauseConfig);
            }
            pauseByCircuitIndex.set(index + 1, pauseConfig);
          });
        }
        derivedPauseCircuits =
          derivePauseFromCircuits(circuitRows, 'pauseAfterCircuit') ??
          derivePauseFromCircuits(circuitRows, 'restAfterCircuit');
        derivedPauseSeries = derivePauseFromCircuits(circuitRows, 'pauseBetweenSeries');
        
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
        if (derivedPauseCircuits != null) {
          pauseCircuitsSeconds = derivedPauseCircuits;
          const minutes = Math.floor(derivedPauseCircuits / 60);
          const seconds = derivedPauseCircuits % 60;
          pauseAmongCircuits = `${minutes}'${seconds.toString().padStart(2, '0')}"`;
        }
        if (derivedPauseSeries != null) {
          pauseSeriesSeconds = derivedPauseSeries;
        }
      } catch (e) {
        console.error('Failed to parse circuit data:', e);
      }
    }
  }

  const fastPlannerData = extractFastPlannerDataFromNotes(nutritionFood.notes) ?? nutritionFood.fastPlannerData ?? null;
  const hasFastPlannerDescription =
    typeof nutritionFood?.description === 'string' && nutritionFood.description.toLowerCase().startsWith('fast planner');
  const isFastPlanner = (!!fastPlannerData || hasFastPlannerDescription) && nutritionFood.type === 'BATTERY' && !circuitBasedNutritionFood;
  const isAerobicFastPlanner = isFastPlanner && fastPlannerData?.plannerType === 'aerobic';
  const isAnaerobicFastPlanner = isFastPlanner && !isAerobicFastPlanner;
  const aerobicSportConfig = useMemo(() => getSportConfig((nutritionFood.sport || 'SWIM') as any), [nutritionFood.sport]);
  const aerobicDistanceChoices = useMemo(() => {
    const meters = Array.isArray((aerobicSportConfig as any)?.meters) ? (aerobicSportConfig as any).meters : [];
    return meters.filter((m: string) => m !== 'input').map(String);
  }, [aerobicSportConfig]);
  const aerobicStyleChoices = useMemo(() => {
    const styles = Array.isArray((aerobicSportConfig as any)?.styles) ? (aerobicSportConfig as any).styles : [];
    return styles.map(String);
  }, [aerobicSportConfig]);
  const aerobicSpeedChoices = useMemo(() => {
    const speeds = Array.isArray((aerobicSportConfig as any)?.speeds) ? (aerobicSportConfig as any).speeds : [];
    return speeds.map(String);
  }, [aerobicSportConfig]);
  const aerobicRestChoices = useMemo(() => {
    const restTypes = Array.isArray((aerobicSportConfig as any)?.restTypes) ? (aerobicSportConfig as any).restTypes : [];
    const out: { choice: AerobicRestChoice; label: string; type: string }[] = [];
    if (restTypes.includes(REST_TYPES.SET_TIME)) out.push({ choice: 'rest_time', label: 'Rest Time', type: REST_TYPES.SET_TIME });
    if (restTypes.includes(REST_TYPES.RESTART_TIME)) out.push({ choice: 'restart_to', label: 'Restart to', type: REST_TYPES.RESTART_TIME });
    if (restTypes.includes(REST_TYPES.RESTART_PULSE)) out.push({ choice: 'reset_pulse', label: 'Rest pulse', type: REST_TYPES.RESTART_PULSE });
    return out;
  }, [aerobicSportConfig]);
  const aerobicInsertMax = Math.max(1, (nutritionComponents || []).length + 1);
  const fastPlannerSpeedOptions = ['Very slow', 'Slow', 'Normal', 'Quick', 'Fast', 'Very fast', 'Explosive', 'Negative'];
  const fastPlannerBreakOptions = ['0', '0"', '5"', '10"', '15"', '20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"];
  const fastPlannerModeOptions = ['Stopped', 'Superset', 'Movement Customized'];

  const mapRestTypeToChoice = useCallback((restType: unknown): AerobicRestChoice => {
    if (restType === REST_TYPES.RESTART_TIME) return 'restart_to';
    if (restType === REST_TYPES.RESTART_PULSE) return 'reset_pulse';
    return 'rest_time';
  }, []);

  const mapChoiceToRestType = useCallback((choice: AerobicRestChoice): string => {
    if (choice === 'restart_to') return REST_TYPES.RESTART_TIME;
    if (choice === 'reset_pulse') return REST_TYPES.RESTART_PULSE;
    return REST_TYPES.SET_TIME;
  }, []);

  const formatAerobicTimeFromDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const len = digits.length;
    if (len === 1) return `0h00'00"${digits}`;
    if (len === 2) return `0h00'0${digits[0]}"${digits[1]}`;
    if (len === 3) return `0h00'${digits.slice(0, 2)}"${digits[2]}`;
    if (len === 4) return `0h0${digits[0]}'${digits.slice(1, 3)}"${digits[3]}`;
    if (len === 5) return `0h${digits.slice(0, 2)}'${digits.slice(2, 4)}"${digits[4]}`;
    if (len === 6) return `${digits[0]}h${digits.slice(1, 3)}'${digits.slice(3, 5)}"${digits[5]}`;
    return `${digits.slice(0, -5)}h${digits.slice(-5, -3)}'${digits.slice(-3, -1)}"${digits.slice(-1)}`;
  };
  const formatAerobicPauseFromDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 1) return `0'${digits}`;
    if (digits.length === 2) return `0'${digits}"`;
    if (digits.length === 3) return `${digits[0]}'${digits.slice(1, 3)}"`;
    const mins = digits.slice(0, -2);
    const secs = digits.slice(-2);
    return `${mins}'${secs}"`;
  };
  const normalizeAerobicNumberInput = (value: string, min: number, max: number): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const parsed = parseInt(digits, 10);
    if (!Number.isFinite(parsed)) return '';
    return String(Math.min(max, Math.max(min, parsed)));
  };

  const mapToolsToBreakChoice = useCallback((tools: unknown): AerobicBreakChoice => {
    const value = typeof tools === 'string' ? tools.trim() : '';
    if (!value || value.toLowerCase() === 'stopped') return 'stopped';
    if (aerobicSpeedChoices.includes(value)) return 'speed';
    return 'watts';
  }, [aerobicSpeedChoices]);

  const circuitInfoByLetter = new Map<string, { seriesCount: number; stationsPerSeries: number }>();
  if (Array.isArray(circuitRows)) {
    circuitRows.forEach((circuit: any) => {
      const seriesCount = circuit.series ?? circuit.stationsBySeries?.length ?? defaultSeriesPerCircuit ?? 0;
      const stationsPerSeries = circuit.stationsBySeries?.[0]?.length ?? defaultStationsPerCircuit ?? 0;
      if (typeof circuit.letter === 'string' && circuit.letter.trim()) {
        circuitInfoByLetter.set(circuit.letter.trim().toUpperCase(), { seriesCount, stationsPerSeries });
      }
    });
  }

  const lastCircuitLetter =
    Array.isArray(circuitRows) && circuitRows.length > 0
      ? String(circuitRows[circuitRows.length - 1]?.letter ?? '').trim().toUpperCase()
      : (() => {
          const letters = (nutritionFood.nutritionComponents || [])
            .map((ml: any) => String(ml?.circuitLetter || '').trim().toUpperCase())
            .filter(Boolean);
          if (!letters.length) return '';
          return letters.reduce((max: string, L: string) => (L > max ? L : max), letters[0]);
        })();

  const toPositiveInt = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  };

  const getCircuitSeriesCount = (normalizedCircuitLetter: string, circuitIndex?: number): number => {
    if (Array.isArray(circuitRows) && circuitRows.length > 0) {
      let row: any = null;
      if (normalizedCircuitLetter) {
        row = (circuitRows as any[]).find((c: any) => String(c?.letter || '').trim().toUpperCase() === normalizedCircuitLetter);
      }
      if (!row && typeof circuitIndex === 'number' && circuitIndex > 0) {
        row = (circuitRows as any[])[circuitIndex - 1];
      }
      if (row) {
        return row?.series ?? row?.stationsBySeries?.length ?? defaultSeriesPerCircuit ?? 1;
      }
    }
    return circuitInfoByLetter.get(normalizedCircuitLetter)?.seriesCount ?? defaultSeriesPerCircuit ?? 1;
  };

  const resolveLocalSeriesNumber = (nutritionComponent: any, meta: any, normalizedCircuitLetter: string, circuitIndex?: number): number => {
    const explicitLocal =
      toPositiveInt(meta?.localSeriesNumber) ??
      toPositiveInt(nutritionComponent?.localSeriesNumber);

    const fallbackSeries =
      toPositiveInt(meta?.seriesNumber) ??
      toPositiveInt(nutritionComponent?.seriesNumber) ??
      1;

    const seriesCount = Math.max(1, getCircuitSeriesCount(normalizedCircuitLetter, circuitIndex));
    if (explicitLocal) return Math.min(Math.max(1, explicitLocal), seriesCount);

    // Legacy rows may store global seriesNumber in place of localSeriesNumber.
    if (Array.isArray(circuitRows) && circuitRows.length > 0) {
      let resolvedCircuitIndex = toPositiveInt(circuitIndex) ?? null;

      if (!resolvedCircuitIndex && normalizedCircuitLetter) {
        const idx = (circuitRows as any[]).findIndex(
          (c: any) => String(c?.letter || '').trim().toUpperCase() === normalizedCircuitLetter
        );
        if (idx >= 0) resolvedCircuitIndex = idx + 1;
      }

      if (resolvedCircuitIndex && resolvedCircuitIndex > 0 && resolvedCircuitIndex <= (circuitRows as any[]).length) {
        let startGlobalSeries = 1;
        for (let i = 0; i < resolvedCircuitIndex - 1; i++) {
          const prevSeriesCount =
            (circuitRows as any[])[i]?.series ??
            (circuitRows as any[])[i]?.stationsBySeries?.length ??
            defaultSeriesPerCircuit ??
            0;
          startGlobalSeries += prevSeriesCount;
        }
        const localFromGlobal = fallbackSeries - startGlobalSeries + 1;
        if (localFromGlobal >= 1 && localFromGlobal <= seriesCount) {
          return localFromGlobal;
        }
      }
    }

    return Math.min(Math.max(1, fallbackSeries), seriesCount);
  };

  const formatPause = (pauseSeconds: number) => {
    const minutes = Math.floor(pauseSeconds / 60);
    const seconds = pauseSeconds % 60;
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  };

  const isPlaceholderEmptyExercise = (value: unknown): boolean => {
    if (typeof value !== 'string') return true;
    const normalized = value.trim().toLowerCase();
    return !normalized || normalized === '—' || normalized === '-' || normalized === '--' || normalized === 'n/a';
  };
  
  // Navigation for nutrition_components within the same nutritionFood
  const hasPreviousNutritionComponent = currentNutritionComponentIndex > 0;
  const fastPlannerDisplayCount = isAnaerobicFastPlanner
    ? Array.from(
        new Set(
          (nutritionComponents || [])
            .map((ml: any) => normalizeFastPlannerExerciseKey(ml?.exercise))
            .filter((ex: string) => ex !== '')
        )
      ).length
    : nutritionComponents.length;
  const fastPlannerInsertMax = Math.max(1, fastPlannerDisplayCount + 1);
  const hasNextNutritionComponent = currentNutritionComponentIndex < fastPlannerDisplayCount - 1;
  
  // Check if this nutritionFood is manual mode
  const isManualMode = nutritionFood.manualMode === true;
  
  // Update noteValue when nutritionFood.notes changes (strip HTML and internal metadata tags)
  React.useEffect(() => {
    const raw = nutritionFood.notes || '';
    const cleanNotes = typeof raw === 'string' ? stripInternalWorkoutTags(raw).trim() : '';
    setNoteValue(stripHtmlTags(cleanNotes));
  }, [nutritionFood.notes]);
  
  // Store original sequence numbers for each nutritionComponent (persists through drag operations)
  const [nutritionComponentSequences, setNutritionComponentSequences] = useState<Map<string, number>>(new Map());

  // Initialize or update sequence numbers when nutrition_components change
  React.useEffect(() => {
    // Sort nutrition_components by repetitionNumber to maintain order after reload
    const unsortedNutritionComponents = nutritionFood.nutritionComponents || [];    
    const newNutritionComponents = [...unsortedNutritionComponents].sort((a: any, b: any) => 
      (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
    );
    
    setNutritionComponents(newNutritionComponents);
    // Reset navigation to first nutritionComponent when nutritionFood changes
    setCurrentNutritionComponentIndex(0);
    
    // Regenerate all sequence numbers when nutrition_components change (e.g., when adding new nutritionComponents)
    setNutritionComponentSequences((prevSequences) => {
      const newSequences = new Map<string, number>();
      newNutritionComponents.forEach((nutritionComponent: any, idx: number) => {
        // Keep existing sequence if available, otherwise assign new one
        if (prevSequences.has(nutritionComponent.id)) {
          newSequences.set(nutritionComponent.id, prevSequences.get(nutritionComponent.id)!);
        } else {
          // New nutritionComponent - assign next available sequence number
          newSequences.set(nutritionComponent.id, idx + 1);
        }
      });
      
      // If count changed (new nutritionComponent added), regenerate all sequences sequentially
      if (newNutritionComponents.length !== prevSequences.size) {
        newNutritionComponents.forEach((nutritionComponent: any, idx: number) => {
          newSequences.set(nutritionComponent.id, idx + 1);
        });
      }
      
      return newSequences;
    });
  }, [nutritionFood.nutritionComponents]);

  // Setup drag sensors with reliable activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Small distance to start drag
      },
    })
  );
  // Handle drag end - reorder nutrition_components
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    
    if (!over || active.id === over.id) {
      return;
    }
    
    let newOrder: any[] = [];

    if (isAnaerobicFastPlanner) {
      const fpRows: any[] = Array.isArray(fastPlannerData?.rows) ? fastPlannerData.rows : [];
      const lapsByExercise = new Map<string, any[]>();
      for (const lap of nutritionComponents) {
        const exKey = normalizeFastPlannerExerciseKey(lap?.exercise);
        if (!exKey) continue;
        const list = lapsByExercise.get(exKey) || [];
        list.push(lap);
        lapsByExercise.set(exKey, list);
      }

      const orderedExercises = fpRows
        .map((r: any) => normalizeFastPlannerExerciseKey(r?.exercise))
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
      const byId = new Map<string, any>(nutritionComponents.map((l: any) => [l.id, l]));
      newOrder = idsInOrder.map((id) => byId.get(id)).filter(Boolean);
    } else {
      const oldIndex = nutritionComponents.findIndex((ml: any) => ml.id === active.id);
      const newIndex = nutritionComponents.findIndex((ml: any) => ml.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      newOrder = [...nutritionComponents];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
    }
    
    // Update local state immediately for smooth UX
    setNutritionComponents(newOrder);
    
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
      
      const response = await fetch('/api/nutrition/nutrition_components/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionComponents: reorderPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to persist nutritionComponent order:', errorData);
        // Revert on error
        setNutritionComponents(nutritionFood.nutritionComponents || []);
      } else {
        const result = await response.json();
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (error) {
      setNutritionComponents(nutritionFood.nutritionComponents || []);
    }
  };

  const extractUserNotesOnly = (rawNotes: unknown): string => {
    if (typeof rawNotes !== 'string') return '';
    return stripInternalWorkoutTags(rawNotes).trim();
  };

  const handleApplyStationMove = async (mode: 'substitute' | 'exchange') => {
    if (!pendingStationMove || isApplyingStationMove) return;

    const source = nutritionComponents.find((ml: any) => String(ml?.id) === pendingStationMove.sourceId);
    const target = nutritionComponents.find((ml: any) => String(ml?.id) === pendingStationMove.targetId);
    if (!source || !target) {
      setPendingStationMove(null);
      return;
    }

    const sourceIntoTarget = {
      muscularSector: source.muscularSector ?? source.sector ?? '',
      sector: source.sector ?? source.muscularSector ?? '',
      exercise: source.exercise ?? '',
      reps: source.reps ?? '',
      pause: source.pause ?? '',
      macroFinal: source.macroFinal ?? '',
      notes: preserveMetadataTagsInNotes(String(target.notes ?? ''), extractUserNotesOnly(source.notes)),
    };

    const targetIntoSource = {
      muscularSector: target.muscularSector ?? target.sector ?? '',
      sector: target.sector ?? target.muscularSector ?? '',
      exercise: target.exercise ?? '',
      reps: target.reps ?? '',
      pause: target.pause ?? '',
      macroFinal: target.macroFinal ?? '',
      notes: preserveMetadataTagsInNotes(String(source.notes ?? ''), extractUserNotesOnly(target.notes)),
    };

    const sourceUpdate =
      mode === 'substitute'
        ? {
            muscularSector: '',
            sector: '',
            exercise: '',
            reps: '',
          }
        : targetIntoSource;
    const targetUpdate = sourceIntoTarget;

    setIsApplyingStationMove(true);
    const previousNutritionComponents = nutritionComponents;
    const nextNutritionComponents = nutritionComponents.map((ml: any) => {
      const id = String(ml?.id);
      if (id === pendingStationMove.sourceId) return { ...ml, ...sourceUpdate };
      if (id === pendingStationMove.targetId) return { ...ml, ...targetUpdate };
      return ml;
    });
    setNutritionComponents(nextNutritionComponents);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Missing auth token');

      const reqInit = {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const [sourceResp, targetResp] = await Promise.all([
        fetch(`/api/nutrition/nutrition_components/${source.id}`, {
          ...reqInit,
          body: JSON.stringify(sourceUpdate),
        }),
        fetch(`/api/nutrition/nutrition_components/${target.id}`, {
          ...reqInit,
          body: JSON.stringify(targetUpdate),
        }),
      ]);

      if (!sourceResp.ok || !targetResp.ok) {
        throw new Error('Failed to update station move');
      }

      if (onRefresh) await onRefresh();
      setPendingStationMove(null);
    } catch (error) {
      console.error('Error applying station move:', error);
      setNutritionComponents(previousNutritionComponents);
      alert('Could not apply station move. Please try again.');
    } finally {
      setIsApplyingStationMove(false);
    }
  };

  // Handle copy nutritionComponent
  const handleCopyNutritionComponent = (nutritionComponent: any) => {
    setCopiedNutritionComponent(nutritionComponent);
    alert(`NutritionComponent #${nutritionComponents.findIndex((ml: any) => ml.id === nutritionComponent.id) + 1} copied! Click "Paste" on any row to insert it after that position.`);
  };

  // Handle paste nutritionComponent
  const handlePasteNutritionComponent = async (afterIndex: number) => {
    if (!copiedNutritionComponent) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        return;
      }

      // Create new nutritionComponent after the specified position
      const newNutritionComponent = {
        ...copiedNutritionComponent,
        id: undefined, // Will be assigned by backend
        nutritionFoodId: nutritionFood.id,
        repetitionNumber: afterIndex + 2 // Insert after current position
      };

      const response = await fetch('/api/nutrition/nutrition_components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newNutritionComponent)
      });

      if (response.ok) {
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to paste nutritionComponent');
      }
    } catch (error) {
      console.error('Error pasting nutritionComponent:', error);
    }
  };

  const handleOpenAddStationModal = (nutritionComponent: any) => {
    setStationModalMode('add');
    setStationSectorShowAll(true);
    setEditingStationNutritionComponent(null);
    const meta = extractCircuitMetaFromNotes(nutritionComponent?.notes);
    const circuitLetterRaw = meta?.circuitLetter ?? nutritionComponent?.circuitLetter;
    const circuitLetter = typeof circuitLetterRaw === 'string' ? circuitLetterRaw.trim().toUpperCase() : '';
    const circuitIndex =
      toPositiveInt(meta?.circuitIndex) ??
      toPositiveInt(nutritionComponent?.circuitIndex) ??
      undefined;
    const localSeriesNumber = resolveLocalSeriesNumber(nutritionComponent, meta, circuitLetter, circuitIndex);
    const stationNumber = toPositiveInt(meta?.stationNumber) ?? toPositiveInt(nutritionComponent?.stationNumber);
    if (!circuitLetter || !localSeriesNumber || !stationNumber) return;

    const baseNotes = typeof nutritionComponent?.notes === 'string' ? nutritionComponent.notes : '';
    const cleanedNotes = baseNotes
      .replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '')
      .replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '')
      .trim();

    // Default Pause to circuit config "between stations" (pauseStations) - reference nutritionComponent may have macro
    const pauseStationsSeconds = circuitConfig?.pauses?.stations ?? 20;
    const defaultPause = formatSecondsToPauseInput(typeof pauseStationsSeconds === 'number' ? pauseStationsSeconds : 20);

    setAddStationDraft({
      muscularSector: nutritionComponent?.muscularSector || nutritionComponent?.style || '',
      exercise: nutritionComponent?.exercise || '',
      reps: typeof nutritionComponent?.reps === 'number' ? String(nutritionComponent.reps) : (nutritionComponent?.reps ? String(nutritionComponent.reps) : ''),
      pause: defaultPause,
      macroFinal: nutritionComponent?.macroFinal || '',
      notes: cleanedNotes,
      seriesNumber: localSeriesNumber
    });
    setAddStationTarget({
      afterNutritionComponentId: nutritionComponent.id,
      circuitLetter,
      circuitIndex,
      seriesNumber: meta?.seriesNumber ?? nutritionComponent?.seriesNumber,
      localSeriesNumber,
      stationNumber
    });
    setShowAddStationModal(true);
  };

  const handleOpenEditStationModal = (nutritionComponent: any) => {
    setStationModalMode('edit');
    setEditingStationNutritionComponent(nutritionComponent);
    const meta = extractCircuitMetaFromNotes(nutritionComponent?.notes);
    const circuitLetterRaw = meta?.circuitLetter ?? nutritionComponent?.circuitLetter;
    const circuitLetter = typeof circuitLetterRaw === 'string' ? circuitLetterRaw.trim().toUpperCase() : '';
    const circuitIndex =
      toPositiveInt(meta?.circuitIndex) ??
      toPositiveInt(nutritionComponent?.circuitIndex) ??
      undefined;
    const localSeriesNumber = resolveLocalSeriesNumber(nutritionComponent, meta, circuitLetter, circuitIndex);
    const stationNumber = toPositiveInt(meta?.stationNumber) ?? toPositiveInt(nutritionComponent?.stationNumber);
    if (!circuitLetter || !localSeriesNumber || !stationNumber) return;

    const baseNotes = typeof nutritionComponent?.notes === 'string' ? nutritionComponent.notes : '';
    const cleanedNotes = baseNotes
      .replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '')
      .replace(/\[CIRCUIT_DATA\].*?\[\/CIRCUIT_DATA\]/g, '')
      .trim();
    const sectorInit = (nutritionComponent?.muscularSector || nutritionComponent?.style || '').trim();
    const exerciseInitRaw = (nutritionComponent?.exercise || '').trim();
    const exerciseInit = isPlaceholderEmptyExercise(exerciseInitRaw) ? '' : exerciseInitRaw;
    setAddStationDraft({
      muscularSector: nutritionComponent?.muscularSector || nutritionComponent?.style || '',
      exercise: nutritionComponent?.exercise || '',
      reps: typeof nutritionComponent?.reps === 'number' ? String(nutritionComponent.reps) : (nutritionComponent?.reps ? String(nutritionComponent.reps) : ''),
      pause:
        nutritionComponent?.pause != null && String(nutritionComponent.pause).trim() !== ''
          ? formatSecondsToPauseInput(parsePauseToSeconds(nutritionComponent.pause))
          : '',
      macroFinal: nutritionComponent?.macroFinal || '',
      notes: cleanedNotes,
      seriesNumber: localSeriesNumber
    });
    setAddStationTarget({
      afterNutritionComponentId: nutritionComponent.id,
      circuitLetter,
      circuitIndex,
      seriesNumber: meta?.seriesNumber ?? nutritionComponent?.seriesNumber,
      localSeriesNumber,
      stationNumber
    });
    setStationSectorShowAll(!(sectorInit.length > 0 && exerciseInit.length === 0));
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

  const CIRCUIT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const buildCircuitDataFromNutritionComponents = (nutritionComponents: any[], fallbackConfig: any) => {
    if (!Array.isArray(nutritionComponents) || nutritionComponents.length === 0) return null;
    const perCircuit = new Map<string, Map<number, Map<number, any>>>();
    const seriesCountByCircuit = new Map<string, number>();
    const stationsPerSeriesByCircuit = new Map<string, number>();
    nutritionComponents.forEach((ml) => {
      if (!ml) return;
      const meta = extractCircuitMetaFromNotes(ml?.notes) || null;
      const rawLetter = (typeof ml.circuitLetter === 'string' && ml.circuitLetter.trim())
        ? ml.circuitLetter.trim()
        : (typeof meta?.circuitLetter === 'string' && meta.circuitLetter.trim())
          ? meta.circuitLetter.trim()
          : (typeof ml.circuitIndex === 'number' ? CIRCUIT_LETTERS[ml.circuitIndex - 1] : '');
      const letter = rawLetter && CIRCUIT_LETTERS.includes(rawLetter) ? rawLetter : '';
      if (!letter) return;
      const localSeries = Number(ml.localSeriesNumber ?? ml.seriesNumber ?? meta?.localSeriesNumber ?? meta?.seriesNumber ?? 1) || 1;
      const stationNumber = Number(ml.stationNumber ?? meta?.stationNumber ?? 1) || 1;
      const seriesMap = perCircuit.get(letter) ?? new Map();
      const stationMap = seriesMap.get(localSeries) ?? new Map();
      stationMap.set(stationNumber, {
        stationNumber,
        sector: ml.sector || ml.muscularSector || meta?.sector || '',
        exercise: ml.exercise || '',
        reps: ml.reps || '',
        pause: parsePauseToSeconds(ml.pause),
        notes: (typeof ml.notes === 'string' ? ml.notes.replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '').trim() : '') || ''
      });
      seriesMap.set(localSeries, stationMap);
      perCircuit.set(letter, seriesMap);
      seriesCountByCircuit.set(letter, Math.max(seriesCountByCircuit.get(letter) ?? 0, localSeries));
      stationsPerSeriesByCircuit.set(letter, Math.max(stationsPerSeriesByCircuit.get(letter) ?? 0, stationNumber));
    });
    if (perCircuit.size === 0) return null;
    const pauseSeries = fallbackConfig?.pauseSeries ?? fallbackConfig?.pauses?.series ?? 0;
    const pauseCircuits = fallbackConfig?.pauseCircuits ?? fallbackConfig?.pauses?.circuits ?? 0;
    const defaultPause = parsePauseToSeconds(fallbackConfig?.pauseStations ?? fallbackConfig?.pauses?.stations ?? 0);
    const circuitLetters = Array.from(perCircuit.keys()).sort((a, b) => CIRCUIT_LETTERS.indexOf(a) - CIRCUIT_LETTERS.indexOf(b));
    const circuits = circuitLetters.map((letter) => {
      const seriesCount = seriesCountByCircuit.get(letter) ?? 1;
      const stationsPerSeries = stationsPerSeriesByCircuit.get(letter) ?? 1;
      const seriesMap = perCircuit.get(letter) ?? new Map();
      const stationsBySeries: any[] = [];
      for (let s = 1; s <= seriesCount; s++) {
        const stationMap = seriesMap.get(s) ?? new Map();
        const stations: any[] = [];
        for (let st = 1; st <= stationsPerSeries; st++) {
          const existing = stationMap.get(st);
          stations.push(existing || {
            stationNumber: st,
            sector: '',
            exercise: '',
            reps: '',
            pause: defaultPause,
            notes: ''
          });
        }
        stationsBySeries.push(stations);
      }
      return {
        letter,
        stationsBySeries,
        series: seriesCount,
        pauseBetweenSeries: pauseSeries,
        pauseAfterCircuit: pauseCircuits
      };
    });
    return {
      circuits,
      config: fallbackConfig
    };
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
    const trimmed = s.trim();
    if (!trimmed) return '';
    // Values like 2'00" become digits 2000 if we strip first — normalize through seconds instead.
    if (/'/.test(trimmed) || /"/.test(trimmed)) {
      return formatSecondsToPauseInput(parsePauseToSeconds(trimmed));
    }
    const digits = trimmed.replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';
    if (digits.length <= 2) return `${digits}'`;
    if (digits.length === 3) {
      const mNum = parseInt(digits.slice(0, 1), 10);
      const sNum = parseInt(digits.slice(1), 10);
      return formatSecondsToPauseInput(mNum * 60 + Math.min(59, sNum));
    }
    const mNum = parseInt(digits.slice(0, 2), 10);
    const sNum = parseInt(digits.slice(2, 4), 10);
    return formatSecondsToPauseInput(mNum * 60 + Math.min(59, sNum));
  };

  const formatSecondsToPauseInput = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}'${s.toString().padStart(2, '0')}"`;
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
      const nutritionFoodResponse = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!nutritionFoodResponse.ok) return;

      const freshNutritionFood = await nutritionFoodResponse.json();
      const allNutritionComponents = [...(freshNutritionFood.nutritionComponents || [])].sort((a: any, b: any) =>
        (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
      );
      const afterIdx = allNutritionComponents.findIndex((ml: any) => ml.id === addStationTarget.afterNutritionComponentId);
      if (afterIdx < 0) return;
      const afterNutritionComponent = allNutritionComponents[afterIdx];
      const baseRepetitionNumber = (afterNutritionComponent?.repetitionNumber || (afterIdx + 1)) + 1;
      const createResponse = await fetch('/api/nutrition/nutrition_components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionFoodId: nutritionFood.id,
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
        setNewlyAddedStationNutritionComponentIds((prev) => {
          const next = new Set(prev);
          next.add(created.id);
          return next;
        });
      }

      const updatedNutritionFoodResponse = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!updatedNutritionFoodResponse.ok) return;

      const updatedNutritionFood = await updatedNutritionFoodResponse.json();
      const updatedNutritionComponents = [...(updatedNutritionFood.nutritionComponents || [])].sort((a: any, b: any) =>
        (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
      );

      await fetch('/api/nutrition/nutrition_components/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionComponents: updatedNutritionComponents.map((ml: any, idx: number) => ({
            id: ml.id,
            repetitionNumber: idx + 1,
            ...(ml.id === created.id ? { isNewlyAdded: true } : {})
          }))
        })
      });

      try {
        const circuitData = extractCircuitDataFromNotes(freshNutritionFood.notes);
        if (circuitData?.circuits && Array.isArray(circuitData.circuits)) {
          const nextCircuitData = JSON.parse(JSON.stringify(circuitData));
          const circuit = nextCircuitData.circuits.find((c: any) => c?.letter === addStationTarget.circuitLetter);
          const targetSeriesNum = toPositiveInt(addStationDraft.seriesNumber) ?? addStationTarget.localSeriesNumber ?? 1;
          const seriesIdx = Math.max(0, targetSeriesNum - 1);
          if (circuit) {
            if (!Array.isArray(circuit.stationsBySeries) || !Array.isArray(circuit.stationsBySeries[seriesIdx])) return;
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

            const nextNotes = upsertCircuitDataInNotes(freshNutritionFood.notes ?? '', nextCircuitData);
            await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
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
      setStationSectorShowAll(true);
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsAddingStation(false);
    }
  };

  const handleEditStation = async () => {
    if (!addStationTarget || !editingStationNutritionComponent) return;
    if (isAddingStation) return;

    setIsAddingStation(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAddingStation(false);
      return;
    }

    try {
      const meta = extractCircuitMetaFromNotes(editingStationNutritionComponent?.notes) || {};
      const circuitMeta = {
        circuitLetter: addStationTarget.circuitLetter,
        circuitIndex: addStationTarget.circuitIndex ?? meta?.circuitIndex,
        seriesNumber: addStationTarget.seriesNumber ?? meta?.seriesNumber,
        localSeriesNumber: addStationDraft.seriesNumber ?? addStationTarget.localSeriesNumber,
        stationNumber: addStationTarget.stationNumber,
        sector: addStationDraft.muscularSector || meta?.sector
      };
      const nextNotes = upsertCircuitMetaInNotes(addStationDraft.notes || '', circuitMeta);

      await fetch(`/api/nutrition/nutritionComponents?id=${editingStationNutritionComponent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          muscularSector: addStationDraft.muscularSector || null,
          exercise: addStationDraft.exercise || null,
          reps: addStationDraft.reps || null,
          pause: addStationDraft.pause || null,
          macroFinal: addStationDraft.macroFinal || null,
          notes: nextNotes || null
        })
      });

      const nutritionFoodResponse = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (nutritionFoodResponse.ok) {
        const freshNutritionFood = await nutritionFoodResponse.json();
        const allNutritionComponents = [...(freshNutritionFood.nutritionComponents || [])].sort((a: any, b: any) =>
          (a.repetitionNumber || 0) - (b.repetitionNumber || 0)
        );
        const circuitData = extractCircuitDataFromNotes(freshNutritionFood.notes);
        const fallbackConfig = circuitData?.config || {};
        const builtFromNutritionComponents = buildCircuitDataFromNutritionComponents(allNutritionComponents, fallbackConfig);
        // Preserve the existing circuit schema from notes when available.
        // Rebuilding from nutrition_components can expand/reorder rows unexpectedly after editing a single station.
        const baseCircuitData = circuitData || builtFromNutritionComponents;
        if (baseCircuitData?.circuits && Array.isArray(baseCircuitData.circuits)) {
          const nextCircuitData = JSON.parse(JSON.stringify(baseCircuitData));
          const circuit = nextCircuitData.circuits.find((c: any) => c?.letter === addStationTarget.circuitLetter);
          const targetSeriesNum = toPositiveInt(addStationDraft.seriesNumber) ?? addStationTarget.localSeriesNumber ?? 1;
          const seriesIdx = Math.max(0, targetSeriesNum - 1);
          const stationIdx = Math.max(0, (toPositiveInt(addStationTarget.stationNumber) ?? 1) - 1);
          if (circuit) {
            if (!Array.isArray(circuit.stationsBySeries)) {
              circuit.stationsBySeries = [];
            }
            while (circuit.stationsBySeries.length <= seriesIdx) {
              circuit.stationsBySeries.push([]);
            }
            let seriesStations = circuit.stationsBySeries[seriesIdx] as any[];
            if (!Array.isArray(seriesStations)) {
              seriesStations = [];
            }
            while (seriesStations.length <= stationIdx) {
              seriesStations.push({
                stationNumber: seriesStations.length + 1,
                sector: '',
                exercise: '',
                reps: '',
                pause: parsePauseToSeconds(fallbackConfig?.pauseStations ?? fallbackConfig?.pauses?.stations ?? 0),
                notes: ''
              });
            }
            seriesStations[stationIdx] = {
              ...seriesStations[stationIdx],
              stationNumber: stationIdx + 1,
              sector: addStationDraft.muscularSector || '',
              exercise: addStationDraft.exercise || '',
              reps: addStationDraft.reps ? String(addStationDraft.reps) : '',
              pause: parsePauseToSeconds(addStationDraft.pause),
              notes: addStationDraft.notes || ''
            };
            circuit.stationsBySeries[seriesIdx] = seriesStations.map((st: any, idx: number) => ({
              ...st,
              stationNumber: idx + 1
            }));
            const mergedCircuitData = {
              ...baseCircuitData,
              circuits: nextCircuitData.circuits,
              config: baseCircuitData.config || fallbackConfig
            };
            const updatedNotes = upsertCircuitDataInNotes(freshNutritionFood.notes ?? '', mergedCircuitData);
            await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ notes: updatedNotes })
            });
          }
        }
      }
    } finally {
      setIsAddingStation(false);
      setShowAddStationModal(false);
      setAddStationTarget(null);
      setEditingStationNutritionComponent(null);
      setStationModalMode('add');
      setStationSectorShowAll(true);
      if (onRefresh) {
        await onRefresh();
      }
    }
  };

  // Handle save note (notes-only PATCH). Preserve [FAST_PLANNER_DATA] and other metadata
  // so the grid does not revert from 2–3 exercises to server nutrition_components (e.g. 8). Do not
  // call onRefresh() so the grid stays as the user sees it.
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication required');
        return;
      }

      const finalNotes = preserveMetadataTagsInNotes(nutritionFood.notes || '', noteValue);

      const response = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: finalNotes })
      });

      if (response.ok) {
        try {
          (nutritionFood as any).notes = finalNotes;
        } catch {}
      } else {
        console.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const openFastPlannerNutritionComponentEditor = (mode: 'add' | 'edit', nutritionComponent?: any, position?: number) => {
    const fp = fastPlannerData ?? extractFastPlannerDataFromNotes(nutritionFood.notes);
    const fpRows: any[] = Array.isArray(fp?.rows) ? fp.rows : [];
    const fallbackCount = fpRows.length > 0
      ? fpRows.length
      : Array.from(
          new Set(
            (nutritionComponents || [])
              .map((ml: any) => normalizeFastPlannerExerciseKey(ml?.exercise))
              .filter((ex: string) => ex !== '')
          )
        ).length;
    const maxPosition = Math.max(1, fallbackCount + 1);

    if (mode === 'add') {
      const nextPositionRaw = typeof position === 'number' ? position : maxPosition;
      const nextPosition = Math.min(Math.max(1, nextPositionRaw), maxPosition);
      setFastPlannerInsertPosition(nextPosition);
      setFastPlannerNutritionComponentModalMode('add');
      setFastPlannerOriginalExercise(null);

      const sourceNutritionComponent = nutritionComponent;
      if (sourceNutritionComponent) {
        const exercise = typeof sourceNutritionComponent?.exercise === 'string'
          ? sourceNutritionComponent.exercise.replace(/\u00A0/g, ' ').trim().replace(/\s+/g, ' ')
          : '';
        const exerciseKey = normalizeFastPlannerExerciseKey(exercise);
        const row = fpRows.find((r: any) => normalizeFastPlannerExerciseKey(r?.exercise) === exerciseKey);
        const extracted = extractFastPlannerModeFromNotes(sourceNutritionComponent?.notes);
        const modeFromRow = typeof row?.mode === 'string' ? row.mode.trim() : '';
        const seriesFromRow = typeof row?.series === 'string' && row.series.trim() !== '' ? row.series.trim() : '1';
        const ripTimeFromRow = typeof row?.ripTime === 'string' ? row.ripTime : '';
        const breakFromRow = typeof row?.break === 'string' ? row.break : '';
        const weightFromRow = typeof row?.weight === 'string' ? row.weight : '';
        const rawWeight = (weightFromRow || sourceNutritionComponent?.weight || '').toString().trim();
        const weightMatch = rawWeight.match(/^(\d+(?:\.\d+)?)\s*(kg|lbs)$/i);
        const nextWeightUnit = (weightMatch?.[2] || '').toLowerCase() === 'lbs' ? 'lbs' : 'kg';
        const nextWeightValue = weightMatch?.[1] ? weightMatch[1] : '';
        setFastPlannerWeightUnit(nextWeightUnit as 'kg' | 'lbs');
        setFastPlannerWeightValue(nextWeightValue);

        const rawBreak = ((breakFromRow || sourceNutritionComponent?.pause || '') as string).trim();
        const isCardio = /\bbpm\b/i.test(rawBreak);
        setFastPlannerBreakMode(isCardio ? 'cardio' : 'rest');
        const bpmMatch = rawBreak.match(/(\d+)\s*bpm/i);
        setFastPlannerCardioValue(bpmMatch?.[1] ? bpmMatch[1] : '120');

        setFastPlannerDraft({
          muscularSector: typeof sourceNutritionComponent?.muscularSector === 'string' ? sourceNutritionComponent.muscularSector : '',
          exercise,
          speed: (typeof row?.speed === 'string' && row.speed.trim() !== '' ? row.speed : sourceNutritionComponent?.speed) || 'Normal',
          series: seriesFromRow || '1',
          ripTime: ripTimeFromRow || (sourceNutritionComponent?.reps != null ? String(sourceNutritionComponent.reps) : (sourceNutritionComponent?.time ? String(sourceNutritionComponent.time) : '')),
          ripTimeMode: fp?.ripTimeMode === 'time' ? 'time' : 'reps',
          weight: rawWeight || 'nc',
          break: rawBreak || "1'30\"",
          mode: modeFromRow || extracted.mode || 'Stopped'
        });
      } else {
        setFastPlannerWeightUnit('kg');
        setFastPlannerWeightValue('');
        setFastPlannerBreakMode('rest');
        setFastPlannerCardioValue('120');
        setFastPlannerDraft({
          muscularSector: '',
          exercise: 'Set',
          speed: 'Normal',
          series: '1',
          ripTime: '',
          ripTimeMode: fp?.ripTimeMode === 'time' ? 'time' : 'reps',
          weight: 'nc',
          break: "1'30\"",
          mode: 'Stopped'
        });
      }
      setShowFastPlannerNutritionComponentModal(true);
      return;
    }

    const exercise = typeof nutritionComponent?.exercise === 'string'
      ? nutritionComponent.exercise.replace(/\u00A0/g, ' ').trim().replace(/\s+/g, ' ')
      : '';
    const exerciseKey = normalizeFastPlannerExerciseKey(exercise);
    const row = fpRows.find((r: any) => normalizeFastPlannerExerciseKey(r?.exercise) === exerciseKey);
    const extracted = extractFastPlannerModeFromNotes(nutritionComponent?.notes);
    const modeFromRow = typeof row?.mode === 'string' ? row.mode.trim() : '';
    const seriesFromRow = typeof row?.series === 'string' && row.series.trim() !== '' ? row.series.trim() : '';
    const ripTimeFromRow = typeof row?.ripTime === 'string' ? row.ripTime : '';
    const breakFromRow = typeof row?.break === 'string' ? row.break : '';
    const weightFromRow = typeof row?.weight === 'string' ? row.weight : '';
    const rawWeight = (weightFromRow || nutritionComponent?.weight || '').toString().trim();
    const weightMatch = rawWeight.match(/^(\d+(?:\.\d+)?)\s*(kg|lbs)$/i);
    const nextWeightUnit = (weightMatch?.[2] || '').toLowerCase() === 'lbs' ? 'lbs' : 'kg';
    const nextWeightValue = weightMatch?.[1] ? weightMatch[1] : '';
    setFastPlannerWeightUnit(nextWeightUnit as 'kg' | 'lbs');
    setFastPlannerWeightValue(nextWeightValue);

    const rawBreak = ((breakFromRow || nutritionComponent?.pause || '') as string).trim();
    const isCardio = /\bbpm\b/i.test(rawBreak);
    setFastPlannerBreakMode(isCardio ? 'cardio' : 'rest');
    const bpmMatch = rawBreak.match(/(\d+)\s*bpm/i);
    setFastPlannerCardioValue(bpmMatch?.[1] ? bpmMatch[1] : '120');

    setFastPlannerNutritionComponentModalMode('edit');
    setFastPlannerOriginalExercise(exerciseKey || null);
    setFastPlannerDraft({
      muscularSector: typeof nutritionComponent?.muscularSector === 'string' ? nutritionComponent.muscularSector : '',
      exercise,
      speed: (typeof row?.speed === 'string' && row.speed.trim() !== '' ? row.speed : nutritionComponent?.speed) || '',
      series: seriesFromRow || '1',
      ripTime: ripTimeFromRow || (nutritionComponent?.reps != null ? String(nutritionComponent.reps) : (nutritionComponent?.time ? String(nutritionComponent.time) : '')),
      ripTimeMode: fp?.ripTimeMode === 'time' ? 'time' : 'reps',
      weight: rawWeight || 'nc',
      break: rawBreak || "1'30\"",
      mode: modeFromRow || extracted.mode || 'Stopped'
    });
    setShowFastPlannerNutritionComponentModal(true);
  };

  const handleSaveFastPlannerNutritionComponent = async () => {
    if (isSavingFastPlannerNutritionComponent) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const canonicalExercise = typeof fastPlannerDraft.exercise === 'string'
      ? fastPlannerDraft.exercise.replace(/\u00A0/g, ' ').trim().replace(/\s+/g, ' ')
      : '';
    const normalizedExercise = canonicalExercise || 'Set';
    const normalizedExerciseKey = normalizeFastPlannerExerciseKey(normalizedExercise);

    setIsSavingFastPlannerNutritionComponent(true);
    try {
      const assertOk = async (response: Response, context: string) => {
        if (response.ok) return;
        const body = await response.text().catch(() => '');
        throw new Error(`${context} failed (${response.status}): ${body || response.statusText || 'Unknown error'}`);
      };

      const baseFastPlannerData = (fastPlannerData ?? extractFastPlannerDataFromNotes(nutritionFood.notes)) ?? {};
      const baseRows: any[] = Array.isArray(baseFastPlannerData.rows) ? [...baseFastPlannerData.rows] : [];
      const ripTimeMode = fastPlannerDraft.ripTimeMode === 'time' ? 'time' : 'reps';
      const normalizedWeightValue = fastPlannerWeightValue.trim();
      const effectiveWeight = normalizedWeightValue ? `${normalizedWeightValue} ${fastPlannerWeightUnit}` : 'nc';
      const cardioNum = parseInt(fastPlannerCardioValue || '120', 10);
      const safeBpm = Number.isFinite(cardioNum) ? Math.min(200, Math.max(60, cardioNum)) : 120;
      const defaultPause = "1'30\"";
      const effectiveBreak = fastPlannerBreakMode === 'cardio' ? `${safeBpm} bpm` : (fastPlannerDraft.break?.trim() || defaultPause);
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

      const originalExerciseKey = typeof fastPlannerOriginalExercise === 'string' ? fastPlannerOriginalExercise : '';
      const matchExerciseKey = fastPlannerNutritionComponentModalMode === 'edit' ? originalExerciseKey : normalizedExerciseKey;
      const existingIndex = nextRows.findIndex((r: any) => normalizeFastPlannerExerciseKey(r?.exercise) === matchExerciseKey);
      const isNewExerciseRow = fastPlannerNutritionComponentModalMode === 'add' && existingIndex < 0;

    if (existingIndex >= 0) {
      nextRows[existingIndex] = { ...nextRows[existingIndex], ...rowPayload, id: nextRows[existingIndex]?.id ?? rowId };
    } else {
      const insertIndexRaw = fastPlannerNutritionComponentModalMode === 'add' ? fastPlannerInsertPosition - 1 : nextRows.length;
      const insertIndex = Math.min(Math.max(0, insertIndexRaw), nextRows.length);
      nextRows.splice(insertIndex, 0, rowPayload);
    }

      const nextFastPlannerData = {
        ...baseFastPlannerData,
        ripTimeMode,
        rows: nextRows
      };

      const updatedNutritionFoodNotes = upsertFastPlannerDataInNotes(nutritionFood.notes, nextFastPlannerData);
      const nutritionFoodPatchResponse = await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: updatedNutritionFoodNotes })
      });
      await assertOk(nutritionFoodPatchResponse, 'Update nutritionFood fast planner notes');

      if (isNewExerciseRow) {
        setNewlyAddedFastPlannerExercises((prev) => {
          const next = new Set([...Array.from(prev), normalizedExerciseKey]);
          try {
            const exerciseKey = `fpNewExercises:${nutritionFood.id}`;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(exerciseKey, JSON.stringify(Array.from(next)));
            }
          } catch {
            // ignore
          }
          return next;
        });
      }

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

      const exerciseKeyToMatch = matchExerciseKey;
      const existingLaps = (nutritionComponents || []).filter((lap: any) => normalizeFastPlannerExerciseKey(lap?.exercise) === exerciseKeyToMatch);

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
          const updateResponse = await fetch(`/api/nutrition/nutrition_components/${lap.id}`, {
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
          await assertOk(updateResponse, `Update fast planner nutritionComponent ${lap.id}`);
        })
      );

      await Promise.all(
        idsToDelete.map(async (id) => {
          const deleteResponse = await fetch(`/api/nutrition/nutrition_components/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          await assertOk(deleteResponse, `Delete extra fast planner nutritionComponent ${id}`);
        })
      );

      for (let i = 0; i < lapsToCreateCount; i++) {
        const response = await fetch('/api/nutrition/nutrition_components', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nutritionFoodId: nutritionFood.id,
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
        await assertOk(response, 'Create additional fast planner nutritionComponent');
        const created = await response.json().catch(() => null);
        if (created) {
          createdLaps.push(created);
          if (typeof created?.id === 'string') {
            createdIds.push(created.id);
          }
        }
      }

      const remainingLaps = (nutritionComponents || [])
        .filter((lap: any) => typeof lap?.id === 'string' && !idsToDelete.includes(lap.id))
        .map((lap: any) => {
          const currentExerciseKey = normalizeFastPlannerExerciseKey(lap?.exercise);
          if (currentExerciseKey === exerciseKeyToMatch) {
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
        const reorderResponse = await fetch('/api/nutrition/nutrition_components/reorder', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ nutritionComponents: reorderPayload })
        });
        await assertOk(reorderResponse, 'Reorder fast planner nutrition_components');
      }

      if (createdIds.length > 0) {
        setNewlyAddedStationNutritionComponentIds((prev) => {
          const next = new Set([...Array.from(prev), ...createdIds]);
          try {
            const stationKey = `mlNewIds:${nutritionFood.id}`;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(stationKey, JSON.stringify(Array.from(next)));
            }
          } catch {
            // ignore
          }
          return next;
        });
      }

      setShowFastPlannerNutritionComponentModal(false);
      setFastPlannerOriginalExercise(null);
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Failed to save fast planner nutritionComponent edit', error);
      alert('Failed to save fast planner changes. Please try again.');
    } finally {
      setIsSavingFastPlannerNutritionComponent(false);
    }
  };

  const buildAerobicRowsFromNutritionComponents = useCallback((laps: any[]) =>
    (laps || []).map((lap: any, idx: number) => {
      const restChoice = mapRestTypeToChoice(lap?.restType);
      const breakChoice = mapToolsToBreakChoice(lap?.tools);
      const breakValue =
        typeof lap?.tools === 'string' && lap.tools.trim() !== ''
          ? lap.tools.trim()
          : breakChoice === 'stopped'
            ? 'Stopped'
            : '';
      return {
        id: idx + 1,
        distance: lap?.distance != null ? String(lap.distance) : '',
        style: typeof lap?.style === 'string' ? lap.style : '',
        speed: typeof lap?.speed === 'string' ? lap.speed : '',
        strokes: lap?.rowPerMin != null ? String(lap.rowPerMin) : '',
        watts: lap?.pace != null ? String(lap.pace) : '',
        time: typeof lap?.time === 'string' ? lap.time : '',
        restChoice,
        rest: typeof lap?.pause === 'string' ? lap.pause : '',
        breakChoice,
        break: breakValue,
        note: typeof lap?.notes === 'string' ? lap.notes : ''
      };
    }), [mapRestTypeToChoice, mapToolsToBreakChoice]);

  const openAerobicFastPlannerNutritionComponentEditor = (mode: 'add' | 'edit', nutritionComponent?: any, position?: number, index?: number) => {
    const fp = fastPlannerData ?? extractFastPlannerDataFromNotes(nutritionFood.notes);
    const baseRows = Array.isArray(fp?.rows) ? fp.rows : [];
    const fallbackRows = baseRows.length > 0 ? baseRows : buildAerobicRowsFromNutritionComponents(nutritionComponents || []);
    const defaultRestChoice = aerobicRestChoices[0]?.choice ?? 'rest_time';

    if (mode === 'add') {
      const nextPositionRaw = typeof position === 'number' ? position : aerobicInsertMax;
      const nextPosition = Math.min(Math.max(1, nextPositionRaw), aerobicInsertMax);
      setAerobicFastPlannerInsertPosition(nextPosition);
      setAerobicFastPlannerNutritionComponentModalMode('add');
      setAerobicFastPlannerTargetIndex(null);

      const sourceNutritionComponent = nutritionComponent;
      if (sourceNutritionComponent) {
        const restChoice = mapRestTypeToChoice(sourceNutritionComponent?.restType) ?? defaultRestChoice;
        const breakChoice = mapToolsToBreakChoice(sourceNutritionComponent?.tools);
        const breakValue =
          typeof sourceNutritionComponent?.tools === 'string' && sourceNutritionComponent.tools.trim() !== ''
            ? sourceNutritionComponent.tools.trim()
            : breakChoice === 'stopped'
              ? 'Stopped'
              : '';
        setAerobicFastPlannerDraft({
          distance: sourceNutritionComponent?.distance != null ? String(sourceNutritionComponent.distance) : '',
          style: typeof sourceNutritionComponent?.style === 'string' ? sourceNutritionComponent.style : '',
          speed: typeof sourceNutritionComponent?.speed === 'string' ? sourceNutritionComponent.speed : '',
          strokes: sourceNutritionComponent?.rowPerMin != null ? String(sourceNutritionComponent.rowPerMin) : '',
          watts: sourceNutritionComponent?.pace != null ? String(sourceNutritionComponent.pace) : '',
          time: typeof sourceNutritionComponent?.time === 'string' ? sourceNutritionComponent.time : '',
          restChoice,
          rest: typeof sourceNutritionComponent?.pause === 'string' ? sourceNutritionComponent.pause : '',
          breakChoice,
          break: breakValue,
          note: typeof sourceNutritionComponent?.notes === 'string' ? sourceNutritionComponent.notes : ''
        });
      } else {
        setAerobicFastPlannerDraft({
          distance: '',
          style: '',
          speed: '',
          strokes: '',
          watts: '',
          time: '',
          restChoice: defaultRestChoice,
          rest: '',
          breakChoice: 'stopped',
          break: 'Stopped',
          note: ''
        });
      }
      setShowAerobicFastPlannerNutritionComponentModal(true);
      return;
    }

    const resolvedIndex = typeof index === 'number' ? index : (nutritionComponents || []).findIndex((ml: any) => ml?.id === nutritionComponent?.id);
    const row = fallbackRows[resolvedIndex] ?? null;
    const restChoice = row?.restChoice ?? mapRestTypeToChoice(nutritionComponent?.restType) ?? defaultRestChoice;
    const breakChoice = row?.breakChoice ?? mapToolsToBreakChoice(nutritionComponent?.tools);
    const breakValue =
      row?.break ??
      (typeof nutritionComponent?.tools === 'string' && nutritionComponent.tools.trim() !== ''
        ? nutritionComponent.tools.trim()
        : breakChoice === 'stopped'
          ? 'Stopped'
          : '');

    setAerobicFastPlannerNutritionComponentModalMode('edit');
    setAerobicFastPlannerTargetIndex(resolvedIndex >= 0 ? resolvedIndex : null);
    setAerobicFastPlannerDraft({
      distance: row?.distance ?? (nutritionComponent?.distance != null ? String(nutritionComponent.distance) : ''),
      style: row?.style ?? (typeof nutritionComponent?.style === 'string' ? nutritionComponent.style : ''),
      speed: row?.speed ?? (typeof nutritionComponent?.speed === 'string' ? nutritionComponent.speed : ''),
      strokes: row?.strokes ?? (nutritionComponent?.rowPerMin != null ? String(nutritionComponent.rowPerMin) : ''),
      watts: row?.watts ?? (nutritionComponent?.pace != null ? String(nutritionComponent.pace) : ''),
      time: row?.time ?? (typeof nutritionComponent?.time === 'string' ? nutritionComponent.time : ''),
      restChoice,
      rest: row?.rest ?? (typeof nutritionComponent?.pause === 'string' ? nutritionComponent.pause : ''),
      breakChoice,
      break: breakValue,
      note: row?.note ?? (typeof nutritionComponent?.notes === 'string' ? nutritionComponent.notes : '')
    });
    setShowAerobicFastPlannerNutritionComponentModal(true);
  };

  const handleSaveAerobicFastPlannerNutritionComponent = async () => {
    if (isSavingAerobicFastPlannerNutritionComponent) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setIsSavingAerobicFastPlannerNutritionComponent(true);
    try {
      const baseFastPlannerData = (fastPlannerData ?? extractFastPlannerDataFromNotes(nutritionFood.notes)) ?? {};
      const baseRows: any[] = Array.isArray(baseFastPlannerData.rows) && baseFastPlannerData.rows.length > 0
        ? [...baseFastPlannerData.rows]
        : buildAerobicRowsFromNutritionComponents(nutritionComponents || []);
      const nextRows = [...baseRows];
      const defaultRestChoice = aerobicRestChoices[0]?.choice ?? 'rest_time';
      const rowId = nextRows.reduce((max: number, r: any) => Math.max(max, typeof r?.id === 'number' ? r.id : 0), 0) + 1;
      const normalizedBreak = aerobicFastPlannerDraft.breakChoice === 'stopped' ? 'Stopped' : (aerobicFastPlannerDraft.break || '');
      const strokesValueRaw = aerobicFastPlannerDraft.strokes.trim();
      const wattsValueRaw = aerobicFastPlannerDraft.watts.trim();
      const strokesNumber = strokesValueRaw ? parseInt(strokesValueRaw, 10) : null;
      const wattsNumber = wattsValueRaw ? parseInt(wattsValueRaw, 10) : null;
      const clampedStrokesNumber = Number.isFinite(strokesNumber as number) ? Math.min(999, Math.max(0, strokesNumber as number)) : null;
      const clampedWattsNumber = Number.isFinite(wattsNumber as number) ? Math.min(999, Math.max(0, wattsNumber as number)) : null;
      const clampedStrokesText = clampedStrokesNumber != null ? String(clampedStrokesNumber) : '';
      const clampedWattsText = clampedWattsNumber != null ? String(clampedWattsNumber) : '';
      const rowPayload = {
        id: rowId,
        distance: aerobicFastPlannerDraft.distance || '',
        style: aerobicFastPlannerDraft.style || '',
        speed: aerobicFastPlannerDraft.speed || '',
        strokes: clampedStrokesText,
        watts: clampedWattsText,
        time: aerobicFastPlannerDraft.time || '',
        restChoice: aerobicFastPlannerDraft.restChoice || defaultRestChoice,
        rest: aerobicFastPlannerDraft.rest || '',
        breakChoice: aerobicFastPlannerDraft.breakChoice || 'stopped',
        break: normalizedBreak,
        note: aerobicFastPlannerDraft.note || ''
      };

      if (aerobicFastPlannerNutritionComponentModalMode === 'edit' && typeof aerobicFastPlannerTargetIndex === 'number' && aerobicFastPlannerTargetIndex >= 0) {
        const existing = nextRows[aerobicFastPlannerTargetIndex];
        nextRows[aerobicFastPlannerTargetIndex] = { ...existing, ...rowPayload, id: existing?.id ?? rowId };
      } else {
        const insertIndexRaw = aerobicFastPlannerNutritionComponentModalMode === 'add' ? aerobicFastPlannerInsertPosition - 1 : nextRows.length;
        const insertIndex = Math.min(Math.max(0, insertIndexRaw), nextRows.length);
        nextRows.splice(insertIndex, 0, rowPayload);
      }

      const nextFastPlannerData = {
        ...baseFastPlannerData,
        plannerType: 'aerobic',
        activeField: baseFastPlannerData.activeField || 'distance',
        restChoice: baseFastPlannerData.restChoice || rowPayload.restChoice,
        breakChoice: baseFastPlannerData.breakChoice || rowPayload.breakChoice,
        rows: nextRows
      };

      const updatedNutritionFoodNotes = upsertFastPlannerDataInNotes(nutritionFood.notes, nextFastPlannerData);
      await fetch(`/api/nutrition/nutrition_foods/${nutritionFood.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: updatedNutritionFoodNotes })
      });

      const distanceValue = aerobicFastPlannerDraft.distance.trim();
      const distanceNumber = distanceValue ? parseInt(distanceValue, 10) : null;
      const restTypeValue = mapChoiceToRestType(aerobicFastPlannerDraft.restChoice || defaultRestChoice);
      const toolsValue = normalizedBreak || null;
      const pauseValue = aerobicFastPlannerDraft.rest || null;
      const updatedNutritionComponentValues = {
        distance: Number.isFinite(distanceNumber as number) ? distanceNumber : null,
        style: aerobicFastPlannerDraft.style || null,
        speed: aerobicFastPlannerDraft.speed || null,
        rowPerMin: clampedStrokesNumber,
        pace: clampedWattsText || null,
        time: aerobicFastPlannerDraft.time || null,
        restType: restTypeValue || null,
        pause: pauseValue,
        tools: toolsValue,
        notes: aerobicFastPlannerDraft.note || null
      };

      if (aerobicFastPlannerNutritionComponentModalMode === 'edit' && typeof aerobicFastPlannerTargetIndex === 'number') {
        const targetNutritionComponent = (nutritionComponents || [])[aerobicFastPlannerTargetIndex];
        if (targetNutritionComponent?.id) {
          await fetch(`/api/nutrition/nutrition_components/${targetNutritionComponent.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedNutritionComponentValues)
          });
          setNutritionComponents((prev: any[]) =>
            prev.map((lap: any) => (lap?.id === targetNutritionComponent.id ? { ...lap, ...updatedNutritionComponentValues } : lap))
          );
        }
      } else {
        const response = await fetch('/api/nutrition/nutrition_components', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nutritionFoodId: nutritionFood.id,
            repetitionNumber: 9999,
            distance: Number.isFinite(distanceNumber as number) ? distanceNumber : null,
            speed: aerobicFastPlannerDraft.speed || null,
            style: aerobicFastPlannerDraft.style || null,
            pace: clampedWattsText || null,
            time: aerobicFastPlannerDraft.time || null,
            rowPerMin: clampedStrokesNumber,
            reps: null,
            weight: null,
            tools: toolsValue,
            r1: null,
            r2: null,
            muscularSector: null,
            exercise: null,
            restType: restTypeValue || null,
            pause: pauseValue,
            macroFinal: null,
            alarm: null,
            sound: null,
            notes: aerobicFastPlannerDraft.note || null,
            status: 'PENDING',
            isSkipped: false,
            isDisabled: false
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to create aerobic fast planner nutritionComponent', errorData);
          return;
        }

        const createdResponse = await response.json().catch(() => null);
        const createdNutritionComponent = createdResponse && (createdResponse as any).nutritionComponent ? (createdResponse as any).nutritionComponent : createdResponse;
        if (!createdNutritionComponent?.id) {
          console.error('Created nutritionComponent response missing id', createdResponse);
          return;
        }

        const baseOrder = [...(nutritionComponents || [])];
        const insertIndexRaw = aerobicFastPlannerInsertPosition - 1;
        const insertIndex = Math.min(Math.max(0, insertIndexRaw), baseOrder.length);
        baseOrder.splice(insertIndex, 0, createdNutritionComponent);
        setNutritionComponents(baseOrder);
        setNewlyAddedStationNutritionComponentIds((prev) => {
          const createdId = typeof createdNutritionComponent.id === 'number' ? String(createdNutritionComponent.id) : createdNutritionComponent.id;
          if (!createdId || typeof createdId !== 'string') return prev;
          const next = new Set([...Array.from(prev), createdId]);
          try {
            const stationKey = `mlNewIds:${nutritionFood.id}`;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(stationKey, JSON.stringify(Array.from(next)));
            }
          } catch {
            // ignore
          }
          return next;
        });
        const reorderPayload = baseOrder
          .map((lap: any, idx: number) => {
            const idValue = typeof lap?.id === 'number' ? String(lap.id) : lap?.id;
            if (!idValue || typeof idValue !== 'string') return null;
            return { id: idValue, repetitionNumber: idx + 1 };
          })
          .filter((item: any) => item);
        if (reorderPayload.length > 0) {
          await fetch('/api/nutrition/nutrition_components/reorder', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nutritionComponents: reorderPayload })
          });
        }
      }

      setShowAerobicFastPlannerNutritionComponentModal(false);
      setAerobicFastPlannerTargetIndex(null);
      if (onRefresh) await onRefresh();
    } finally {
      setIsSavingAerobicFastPlannerNutritionComponent(false);
    }
  };

  const fastPlannerView = React.useMemo(() => {
    if (!isAnaerobicFastPlanner) return null;
    const fpRows: any[] = Array.isArray(fastPlannerData?.rows) ? fastPlannerData.rows : [];
    const fpByExercise = new Map<string, any>();
    for (const r of fpRows) {
      const exKey = normalizeFastPlannerExerciseKey(r?.exercise);
      if (!exKey || fpByExercise.has(exKey)) continue;
      fpByExercise.set(exKey, r);
    }

    const lapsByExercise = new Map<string, any[]>();
    for (const lap of nutritionComponents) {
      const exKey = normalizeFastPlannerExerciseKey(lap?.exercise);
      if (!exKey) continue;
      const list = lapsByExercise.get(exKey) || [];
      list.push(lap);
      lapsByExercise.set(exKey, list);
    }

    const orderedExercises = fpRows
      .map((r: any) => normalizeFastPlannerExerciseKey(r?.exercise))
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

    const displayNutritionComponents = exerciseOrder
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

        const isNewExercise = newlyAddedFastPlannerExercises.has(exercise);
        return {
          ...rep,
          speed: typeof row?.speed === 'string' && row.speed.trim() !== '' ? row.speed.trim() : rep.speed,
          weight: typeof row?.weight === 'string' && row.weight.trim() !== '' ? row.weight.trim() : rep.weight,
          notes: extracted.notes,
          _fastPlannerRawNotes: rep?.notes,
          _fastPlannerMode: mode,
          _fastPlannerSeries: seriesFromRow,
          _fastPlannerRipTime: ripTimeFromRow || (rep?.reps != null ? String(rep.reps) : (rep?.time ? String(rep.time) : '')),
          _fastPlannerBreak: breakFromRow || rep?.pause || '',
          _fastPlannerIsNewRow: isNewExercise
        };
      })
      .filter((v): v is any => !!v);

    return { displayNutritionComponents };
  }, [isAnaerobicFastPlanner, fastPlannerData, nutritionComponents, newlyAddedFastPlannerExercises]);

  const aerobicFastPlannerView = React.useMemo(() => {
    if (!isAerobicFastPlanner) return null;
    const fpRows: any[] = Array.isArray(fastPlannerData?.rows) ? fastPlannerData.rows : [];
    const baseRows: any[] = fpRows.length > 0 ? fpRows : buildAerobicRowsFromNutritionComponents(nutritionComponents || []);
    const next = (nutritionComponents || []).map((lap: any, idx: number) => {
      const row = baseRows[idx] ?? null;
      if (!row) return lap;
      const restChoice = row?.restChoice ?? mapRestTypeToChoice(lap?.restType);
      const breakChoice = row?.breakChoice ?? mapToolsToBreakChoice(lap?.tools);
      const rowBreak = typeof row?.break === 'string' ? row.break.trim() : '';
      const toolsValue = rowBreak ? rowBreak : breakChoice === 'stopped' ? 'Stopped' : '';
      const rowNote = typeof row?.note === 'string' ? row.note.trim() : '';
      const lapNote = typeof lap?.notes === 'string' ? lap.notes : '';
      return {
        ...lap,
        distance: row?.distance ?? lap?.distance,
        style: row?.style ?? lap?.style,
        speed: row?.speed ?? lap?.speed,
        rowPerMin: row?.strokes ?? lap?.rowPerMin,
        pace: row?.watts ?? lap?.pace,
        time: row?.time ?? lap?.time,
        restType: mapChoiceToRestType(restChoice),
        pause: row?.rest ?? lap?.pause,
        tools: toolsValue || lap?.tools,
        notes: rowNote !== '' ? row?.note : lapNote
      };
    });
    return { displayNutritionComponents: next };
  }, [isAerobicFastPlanner, fastPlannerData, nutritionComponents, mapRestTypeToChoice, mapToolsToBreakChoice, mapChoiceToRestType, buildAerobicRowsFromNutritionComponents]);

  /** Fallback: when anaerobic Fast Plan has rows in fastPlannerData but no nutrition_components yet, build display from rows */
  const anaerobicFallbackFromRows = React.useMemo(() => {
    if (!isAnaerobicFastPlanner || (fastPlannerView?.displayNutritionComponents?.length ?? 0) > 0) return [];
    const fpRows: any[] = Array.isArray(fastPlannerData?.rows) ? fastPlannerData.rows : [];
    if (fpRows.length === 0) return [];
    return fpRows.map((r: any, idx: number) => ({
      id: `fp-row-${idx}`,
      exercise: r.exercise || '',
      speed: r.speed || '',
      _fastPlannerSeries: r.series || '',
      _fastPlannerRipTime: r.ripTime || '',
      weight: r.weight || '',
      _fastPlannerBreak: r.break || '',
      _fastPlannerMode: r.mode || '',
      _fastPlannerIsNewRow: true
    }));
  }, [isAnaerobicFastPlanner, fastPlannerView?.displayNutritionComponents?.length, fastPlannerData?.rows]);

  const displayNutritionComponents = isAnaerobicFastPlanner
    ? (fastPlannerView?.displayNutritionComponents?.length ? fastPlannerView.displayNutritionComponents : anaerobicFallbackFromRows)
    : isAerobicFastPlanner
      ? (aerobicFastPlannerView?.displayNutritionComponents ?? nutritionComponents)
      : nutritionComponents;
  
  // Manual Mode Layout - Simplified
  if (isManualMode) {
    // Parse manual content from notes - it might be JSON or HTML
    // 2026-01-22 14:15 UTC - Strip circuit tags from manual content
    let manualContent = '';
    try {
      const parsed = JSON.parse(nutritionFood.notes || '{}');
      manualContent = parsed.htmlContent || parsed.content || nutritionFood.notes || '';
    } catch {
      // Not JSON, use as-is
      manualContent = nutritionFood.notes || 'No content';
    }
    
    // Strip internal planner / circuit tags if present
    if (typeof manualContent === 'string') {
      manualContent = stripInternalWorkoutTags(manualContent).trim();
    }

    return (
      <>
      <div className="p-2 pr-0">
        {/* Note Box, Save Button, and Add NutritionComponent Button for Manual Mode - Above Table */}
        <div className="mb-3 flex items-center gap-4">
          {/* NutritionComponent Navigation */}
          {nutritionComponents.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentNutritionComponentIndex(Math.max(0, currentNutritionComponentIndex - 1))}
                disabled={!hasPreviousNutritionComponent}
                className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                title={hasPreviousNutritionComponent ? `Previous nutritionComponent ${currentNutritionComponentIndex}` : 'First nutritionComponent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="15,18 9,12 15,6" />
                </svg>
              </button>
              <span className="text-xs font-semibold text-gray-700">
                Dietlaps of {nutritionFoodLetter}
              </span>
              <button
                onClick={() => setCurrentNutritionComponentIndex(Math.min(nutritionComponents.length - 1, currentNutritionComponentIndex + 1))}
                disabled={!hasNextNutritionComponent}
                className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                title={hasNextNutritionComponent ? `Next nutritionComponent ${currentNutritionComponentIndex + 2}` : 'Last nutritionComponent'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="9,6 15,12 9,18" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Add NutritionComponent Button */}
          {onAddNutritionComponent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddNutritionComponent();
              }}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
            >
              + Add Dietlap
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
              placeholder="Add a note for this dietframe..."
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
                  {nutritionFood.sport?.replace(/_/g, ' ') || '—'}
                </span>
              </td>
              
              {/* Summary (Notes from nutritionComponent) */}
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
                    __html: nutritionFood.nutritionComponents?.[0]?.notes || 'No summary' 
                  }}
                />
              </td>
              
              {/* Detail of workout (Manual Content from nutritionFood.notes) */}
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
                      const nutritionComponentToEdit = nutritionFood.nutritionComponents && nutritionFood.nutritionComponents.length > 0 
                        ? nutritionFood.nutritionComponents[0]
                        : {
                            id: 'temp-manual-nutritionComponent',
                            nutritionFoodId: nutritionFood.id,
                            sequenceNumber: 1,
                            repetitionNumber: 1,
                          };
                      
                      if (onEditNutritionComponent) {
                        onEditNutritionComponent(nutritionComponentToEdit);
                      }
                    }}
                    className="px-3 py-1 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit nutritionComponent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddNutritionComponent) {
                        onAddNutritionComponent();
                      }
                    }}
                    className="px-2 py-1 text-[10px] bg-purple-500 text-white rounded hover:bg-purple-600"
                    title="Add dietlap"
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
                  {stripHtmlTags(nutritionFood.nutritionComponents?.[0]?.notes || 'No summary available')}
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
        {showAerobicFastPlannerNutritionComponentModal && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4"
            onClick={() => {
              if (isSavingAerobicFastPlannerNutritionComponent) return;
              setShowAerobicFastPlannerNutritionComponentModal(false);
            }}
            style={{ margin: 0 }}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white p-4 flex items-center justify-between">
                <div className="font-bold text-base">
                {aerobicFastPlannerNutritionComponentModalMode === 'edit'
                  ? 'Edit Fast planner for Aerobic NutritionComponents'
                  : 'Add Fast planner for Aerobic NutritionComponents'}
                </div>
                {aerobicFastPlannerNutritionComponentModalMode === 'add' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold">Insert position</label>
                    <select
                      value={aerobicFastPlannerInsertPosition}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value || '1', 10);
                        const next = Number.isFinite(raw) ? Math.min(Math.max(1, raw), aerobicInsertMax) : 1;
                        setAerobicFastPlannerInsertPosition(next);
                      }}
                      className="px-2 py-1 text-xs bg-white text-black rounded"
                    >
                      {Array.from({ length: aerobicInsertMax }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (isSavingAerobicFastPlannerNutritionComponent) return;
                    setShowAerobicFastPlannerNutritionComponentModal(false);
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
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Distance</label>
                    <select
                      value={aerobicFastPlannerDraft.distance}
                      onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, distance: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    >
                      <option value="">—</option>
                      {aerobicDistanceChoices.map((v: string) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Style</label>
                    <select
                      value={aerobicFastPlannerDraft.style}
                      onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, style: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    >
                      <option value="">—</option>
                      {aerobicStyleChoices.map((v: string) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Speed</label>
                    <select
                      value={aerobicFastPlannerDraft.speed}
                      onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, speed: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    >
                      <option value="">—</option>
                      {aerobicSpeedChoices.map((v: string) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Strokes</label>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={aerobicFastPlannerDraft.strokes}
                      onChange={(e) =>
                        setAerobicFastPlannerDraft((prev) => ({
                          ...prev,
                          strokes: normalizeAerobicNumberInput(e.target.value, 0, 999)
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Watts</label>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={aerobicFastPlannerDraft.watts}
                      onChange={(e) =>
                        setAerobicFastPlannerDraft((prev) => ({
                          ...prev,
                          watts: normalizeAerobicNumberInput(e.target.value, 0, 999)
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Time</label>
                    <input
                      type="text"
                      value={aerobicFastPlannerDraft.time}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 7);
                        setAerobicFastPlannerDraft((prev) => ({ ...prev, time: raw }));
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 7);
                        const formatted = formatAerobicTimeFromDigits(raw);
                        setAerobicFastPlannerDraft((prev) => ({ ...prev, time: formatted }));
                      }}
                      placeholder={'Type digits like 123456 → 1h23\'45"6'}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Rest</label>
                    <div className="flex items-center gap-3 mb-2">
                      <select
                        value={aerobicFastPlannerDraft.restChoice}
                        onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, restChoice: e.target.value as AerobicRestChoice }))}
                        className="px-2 py-1 text-xs bg-white text-black rounded border border-gray-300"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      >
                        {aerobicRestChoices.map((opt) => (
                          <option key={opt.choice} value={opt.choice}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={aerobicFastPlannerDraft.rest}
                        onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, rest: e.target.value }))}
                        onBlur={(e) => {
                          const rawField = e.target.value;
                          setAerobicFastPlannerDraft((prev) => {
                            if (prev.restChoice === 'restart_to') {
                              const raw = rawField.replace(/\D/g, '').slice(0, 7);
                              const formatted = formatAerobicTimeFromDigits(raw);
                              return { ...prev, rest: formatted };
                            }
                            if (prev.restChoice === 'rest_time') {
                              const raw = rawField.replace(/\D/g, '').slice(0, 6);
                              const formatted = formatAerobicPauseFromDigits(raw);
                              return { ...prev, rest: formatted };
                            }
                            return prev;
                          });
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                        placeholder=""
                        autoComplete="off"
                        aria-label="Rest value"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-800 mb-1">Break</label>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={aerobicFastPlannerDraft.breakChoice}
                        onChange={(e) => {
                          const choice = e.target.value as AerobicBreakChoice;
                          setAerobicFastPlannerDraft((prev) => ({
                            ...prev,
                            breakChoice: choice,
                            break: choice === 'stopped' ? 'Stopped' : ''
                          }));
                        }}
                        className="px-2 py-1 text-xs bg-white text-black rounded border border-gray-300"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      >
                        <option value="stopped">Stopped</option>
                        <option value="speed">Speed</option>
                        <option value="watts">Watts</option>
                      </select>
                      {aerobicFastPlannerDraft.breakChoice === 'speed' ? (
                        <select
                          value={aerobicFastPlannerDraft.break}
                          onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, break: e.target.value }))}
                          className="px-2 py-1 text-xs bg-white text-black rounded border border-gray-300"
                          disabled={isSavingAerobicFastPlannerNutritionComponent}
                        >
                          <option value="">—</option>
                          {aerobicSpeedChoices.map((v: string) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={aerobicFastPlannerDraft.break}
                          onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, break: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isSavingAerobicFastPlannerNutritionComponent || aerobicFastPlannerDraft.breakChoice === 'stopped'}
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="sr-only">Notes for this repetition</span>
                    <input
                      type="text"
                      value={aerobicFastPlannerDraft.note}
                      onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, note: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                      placeholder=""
                      autoComplete="off"
                      aria-label="Notes for this repetition"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (isSavingAerobicFastPlannerNutritionComponent) return;
                      setShowAerobicFastPlannerNutritionComponentModal(false);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    disabled={isSavingAerobicFastPlannerNutritionComponent}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAerobicFastPlannerNutritionComponent}
                    className="px-3 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-400"
                    disabled={isSavingAerobicFastPlannerNutritionComponent}
                  >
                    {isSavingAerobicFastPlannerNutritionComponent ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => console.log('🚀 NutritionComponent drag started:', event.active.id)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={displayNutritionComponents.map((ml: any) => ml.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 pr-0">
          {/* Top Controls - Note and Add NutritionComponent Button */}
          <div className="mb-3 flex items-center gap-4" style={{ backgroundColor: 'rgb(250, 255, 214)', padding: '8px', marginLeft: '-8px', marginRight: '8px', marginTop: '-8px' }}>
            {/* NutritionComponent Navigation */}
            {displayNutritionComponents.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentNutritionComponentIndex(Math.max(0, currentNutritionComponentIndex - 1))}
                  disabled={!hasPreviousNutritionComponent}
                  className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  title={hasPreviousNutritionComponent ? `Previous nutritionComponent ${currentNutritionComponentIndex}` : 'First nutritionComponent'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="15,18 9,12 15,6" />
                  </svg>
                </button>
                <span className="text-xs font-semibold text-gray-700">
                  Dietlaps of {nutritionFoodLetter} ({currentNutritionComponentIndex + 1}/{displayNutritionComponents.length})
                </span>
                <button
                  onClick={() => setCurrentNutritionComponentIndex(Math.min(displayNutritionComponents.length - 1, currentNutritionComponentIndex + 1))}
                  disabled={!hasNextNutritionComponent}
                  className="p-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                  title={hasNextNutritionComponent ? `Next nutritionComponent ${currentNutritionComponentIndex + 2}` : 'Last nutritionComponent'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="9,6 15,12 9,18" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Add NutritionComponent Button */}
            {isAnaerobicFastPlanner ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openFastPlannerNutritionComponentEditor('add', undefined, fastPlannerInsertMax);
                }}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
              >
                + Add Dietlap
              </button>
            ) : isAerobicFastPlanner ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAerobicFastPlannerNutritionComponentEditor('add', undefined, aerobicInsertMax);
                }}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
              >
                + Add Dietlap
              </button>
            ) : onAddNutritionComponent ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Use Add Station modal for circuits to preserve circuit structure; Add Exercise for others.
                  if (circuitBasedNutritionFood || nutritionFood.isCircuitBased) {
                    const lastCircuitNutritionComponent = [...displayNutritionComponents]
                      .reverse()
                      .find((ml: any) => {
                        const meta = extractCircuitMetaFromNotes(ml?.notes);
                        return !!(meta?.circuitLetter || ml?.circuitLetter);
                      });
                    if (lastCircuitNutritionComponent) {
                      handleOpenAddStationModal(lastCircuitNutritionComponent);
                      return;
                    }
                  }
                  onAddNutritionComponent();
                }}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
              >
                + Add Dietlap
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
                placeholder="Add a note for this dietframe..."
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
            <table className="text-sm bg-white" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: isAnaerobicFastPlanner ? '1700px' : (nutritionFood.isCircuitBased ? '1560px' : '1600px'), width: '100%' }}>
            {/* Render sport-specific column headers */}
            {(() => {
              const sport = nutritionFood.sport || 'SWIM';
              const isSwim = sport === 'SWIM';
              const isBike = sport === 'BIKE' || sport === 'MTB';
              const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
              const isRowing = sport === 'ROWING' || sport === 'CANOEING';
              const isBodyBuilding = sport === 'BODY_BUILDING';
              const isFastPlannerTable = isAnaerobicFastPlanner;
              const isAerobicFastPlannerTable = isAerobicFastPlanner;
              
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
                      <col style={{ width: '200px', minWidth: '180px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '300px' }} />
                      <col style={{ width: '110px', minWidth: '110px' }} />
                    </colgroup>
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm" title="Drag to reorder">Move</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">MF</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">#</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Components of the food</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Sport</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Description</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Speed</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Series</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Rip\time</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Weight</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Break</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Mode</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm">Macro</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm" style={{ width: '300px' }}>Notes</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-sm sticky-options-header bg-gray-200" style={{ width: '110px', minWidth: '110px' }}>Options</th>
                      </tr>
                    </thead>
                  </>
                );
              }

              if (isAerobicFastPlannerTable) {
                return (
                  <>
                    <colgroup>
                      <col style={{ width: '20px' }} />
                      <col style={{ width: '20px' }} />
                      <col style={{ width: '20px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '170px' }} />
                      <col style={{ width: '80px', minWidth: '80px' }} />
                    </colgroup>
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" title="Drag to reorder">Move</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">MF</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">#</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Components of the food</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Sport</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Distance</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Style</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Speed</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Strokes</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Watts</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Time</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Rest Type</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Reset</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Break Type</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Break</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" style={{ width: '170px' }}>Notes</th>
                        <th className="border border-gray-300 px-1 py-1 text-center text-[10px] sticky-options-header bg-gray-200" style={{ width: '80px', minWidth: '80px' }}>Options</th>
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
                    {/* 2026-01-27 - Reduced widths for circuit nutritionComponent table */}
                    <col style={{ width: circuitBasedNutritionFood ? '60px' : '30px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '80px' }} />
                    {isBodyBuilding && (
                      <>
                        {circuitBasedNutritionFood && (
                          <>
                            <col style={{ width: '56px' }} />
                            <col style={{ width: '168px' }} />
                          </>
                        )}
                        <col style={{ width: circuitBasedNutritionFood ? '40px' : '50px' }} />
                        {!circuitBasedNutritionFood && (
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
                    {!nutritionFood.isCircuitBased && <col style={{ width: '60px' }} />}
                    {/* 2026-01-27 - Reduced Notes width for circuits */}
                    <col style={{ width: circuitBasedNutritionFood ? '200px' : '300px' }} />
                    <col style={{ width: '110px', minWidth: '110px' }} />
                  </colgroup>
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]" title="Drag to reorder">Move</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">MF</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">#</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Components of the food</th>
                      <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Sport</th>
                      
                      {isBodyBuilding && (
                        <>
                          {circuitBasedNutritionFood && (
                            <>
                              <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Muscular</th>
                              <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Exercise</th>
                            </>
                          )}
                          <th className="border border-gray-300 px-1 py-1 text-center text-[10px]">Reps</th>
                          {!circuitBasedNutritionFood && (
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
                            {circuitBasedNutritionFood ? 'Musc.Sector' : 'Dist/Dur'}
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
                            {circuitBasedNutritionFood ? 'Reps' : 'Speed'}
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
                      {!circuitBasedNutritionFood && (
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
                    {displayNutritionComponents.map((nutritionComponent: any, index: number) => {
                // 2026-01-22 10:50 UTC - Extract circuit metadata from notes if present
                let circuitMetadata: any = null;
                if (nutritionComponent.notes && typeof nutritionComponent.notes === 'string') {
                  const metaMatch = nutritionComponent.notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
                  if (metaMatch) {
                    try {
                      circuitMetadata = JSON.parse(metaMatch[1]);
                      // Attach to nutritionComponent for easy access
                      nutritionComponent.circuitLetter = circuitMetadata.circuitLetter;
                      nutritionComponent.circuitIndex = circuitMetadata.circuitIndex;
                      nutritionComponent.seriesNumber = circuitMetadata.seriesNumber;
                      nutritionComponent.localSeriesNumber = circuitMetadata.localSeriesNumber;
                      nutritionComponent.stationNumber = circuitMetadata.stationNumber;
                    } catch (e) {
                      console.error('Failed to parse circuit metadata:', e);
                    }
                  }
                }
                // Calculate group headers for aerobic sports
                const aerobicSeriesNum = parseInt(nutritionFood.aerobicSeries || '1');
                const repsPerGroup = Math.ceil(displayNutritionComponents.length / aerobicSeriesNum);
                const currentGroup = Math.floor(index / repsPerGroup) + 1;
                const isFirstInGroup = index % repsPerGroup === 0;
                const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                const sport = nutritionFood.sport || 'SWIM';
                
                // Calculate column count based on sport type
                const isSwim = sport === 'SWIM';
                const isBike = sport === 'BIKE' || sport === 'MTB';
                const isRun = sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING';
                const isRowing = sport === 'ROWING' || sport === 'CANOEING';
                const isBodyBuilding = sport === 'BODY_BUILDING';
                const distanceBasedSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'ROWING', 'CANOEING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
                const isDistanceBased = distanceBasedSports.includes(sport);
                const hasTools = !isBodyBuilding && !isDistanceBased;
                
                // Base columns: Move(1) + MF(1) + #(1) + NutritionMeal section(1) + Sport(1) = 5
                let totalColumns = 5;

                if (isAerobicFastPlanner) {
                  totalColumns = 17;
                } else if (isAnaerobicFastPlanner) {
                  totalColumns = 15;
                } else if (isBodyBuilding) {
                  totalColumns += 3; // Reps + Weight + Tempo
                  if (circuitBasedNutritionFood) {
                    totalColumns -= 2; // Remove Weight + Tempo
                    totalColumns += 2; // Muscular + Exercise (thumb + name)
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
                
                if (!isAnaerobicFastPlanner && !isAerobicFastPlanner) {
                  totalColumns += nutritionFood.isCircuitBased ? 4 : 5;
                }
                
                // 2026-01-22 10:30 UTC - Circuit header logic
                const isCircuitBased = nutritionFood.isCircuitBased || nutritionComponent.circuitLetter;
                const isFirstInCircuit =
                  isCircuitBased && (index === 0 || displayNutritionComponents[index - 1]?.circuitLetter !== nutritionComponent.circuitLetter);
                const circuitLetter = nutritionComponent.circuitLetter || '';
                const circuitIndex = nutritionComponent.circuitIndex || 1;
                
                return (
                  <React.Fragment key={nutritionComponent.id}>
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
                    <SortableNutritionComponentRow
                      nutritionComponent={nutritionComponent}
                      isNewlyAdded={newlyAddedStationNutritionComponentIds.has(nutritionComponent.id) || !!nutritionComponent.isNewlyAdded || !!nutritionComponent._fastPlannerIsNewRow}
                      index={index}
                      sequenceNumber={isAnaerobicFastPlanner ? index + 1 : (nutritionComponentSequences.get(nutritionComponent.id) || index + 1)}
                      nutritionFoodLetter={nutritionFoodLetter}
                      sectionColor={sectionColor}
                      sectionName={sectionName}
                      nutritionFood={nutritionFood}
                      mapToolsToBreakChoice={mapToolsToBreakChoice}
                      mapRestTypeToChoice={mapRestTypeToChoice}
                      onEditNutritionComponent={(nutritionComponent: any) => {
                        // Use Add Station modal for circuits to preserve circuit structure (avoids scheme transformation).
                        if (nutritionComponent?.circuitLetter || nutritionFood.isCircuitBased) {
                          handleOpenEditStationModal(nutritionComponent);
                          return;
                        }
                        onEditNutritionComponent?.(nutritionComponent);
                      }}
                      onEditFastPlannerNutritionComponent={isAnaerobicFastPlanner ? (ml) => openFastPlannerNutritionComponentEditor('edit', ml) : undefined}
                      onAddFastPlannerNutritionComponent={isAnaerobicFastPlanner ? (position, sourceNutritionComponent) => openFastPlannerNutritionComponentEditor('add', sourceNutritionComponent ?? undefined, position) : undefined}
                      onEditAerobicFastPlannerNutritionComponent={isAerobicFastPlanner ? (ml, idx) => openAerobicFastPlannerNutritionComponentEditor('edit', ml, undefined, idx) : undefined}
                      onAddAerobicFastPlannerNutritionComponent={isAerobicFastPlanner ? (position, sourceNutritionComponent) => openAerobicFastPlannerNutritionComponentEditor('add', sourceNutritionComponent ?? undefined, position) : undefined}
                      onDeleteNutritionComponent={onDeleteNutritionComponent}
                      onCopyNutritionComponent={handleCopyNutritionComponent}
                      onPasteNutritionComponent={handlePasteNutritionComponent}
                      onAddNutritionComponentAfter={onAddNutritionComponentAfter}
                      onAddStationAfter={(targetNutritionComponent) => handleOpenAddStationModal(targetNutritionComponent)}
                      pauseAmongCircuits={pauseAmongCircuits}
                      lastCircuitLetter={lastCircuitLetter}
                      circuitInfoByLetter={circuitInfoByLetter}
                      defaultSeriesPerCircuit={defaultSeriesPerCircuit}
                      defaultStationsPerCircuit={defaultStationsPerCircuit}
                      pauseCircuitsSeconds={pauseCircuitsSeconds}
                      pauseSeriesSeconds={pauseSeriesSeconds}
                      pauseByCircuit={pauseByCircuit}
                      pauseByCircuitIndex={pauseByCircuitIndex}
                      onRefresh={onRefresh}
                      isCircuitBased={circuitBasedNutritionFood}
                      circuitExecutionMode={
                        circuitConfig?.executionMode === 'horizontal' ? 'horizontal' : 'vertical'
                      }
                      circuitMacroFromConfig={(() => {
                        const lw = circuitConfig?.loadOfWork;
                        const fromDigit = circuitLoadOfWorkToMacroFinal(lw);
                        if (fromDigit) return fromDigit;
                        const sec = parseInt(String(lw ?? '').trim(), 10);
                        if (Number.isFinite(sec) && sec >= 60 && sec <= 600 && sec % 60 === 0) {
                          const m = sec / 60;
                          if (m >= 1 && m <= 10) return `${m}'`;
                        }
                        return null;
                      })()}
                      nextNutritionComponentInTable={displayNutritionComponents[index + 1] ?? null}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
            {isAnaerobicFastPlanner && displayNutritionComponents.length > 0 && (() => {
              const stats = computeAnaerobicFastPlannerRowStats(fastPlannerData, nutritionFood.nutritionComponents);
              const avgSec =
                stats.totalRepVolume > 0 ? stats.totalPauseSec / stats.totalRepVolume : 0;
              const avgPause = avgSec > 0 ? formatAvePauseFromSeconds(avgSec) : '—';
              return (
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={12} className="border border-gray-300 px-2 py-1 text-right text-sm font-semibold text-gray-700">AvePause (avg)</td>
                    <td className="border border-gray-300 px-1 py-1 text-center text-sm font-semibold">{avgPause}</td>
                    <td colSpan={2} className="border border-gray-300" />
                  </tr>
                </tfoot>
              );
            })()}
          </table>
          </div>

          {showAddStationModal && addStationTarget && typeof document !== 'undefined' && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4"
              onClick={() => {
                if (isAddingStation) return;
                setShowAddStationModal(false);
                setAddStationTarget(null);
                setEditingStationNutritionComponent(null);
                setStationModalMode('add');
                setStationSectorShowAll(true);
              }}
              style={{ margin: 0 }}
            >
              <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white p-4 flex items-center justify-between">
                  <div className="font-bold text-base">{stationModalMode === 'edit' ? 'Edit station' : 'Add station'}</div>
                  <button
                    onClick={() => {
                      if (isAddingStation) return;
                      setShowAddStationModal(false);
                      setAddStationTarget(null);
                      setEditingStationNutritionComponent(null);
                      setStationModalMode('add');
                      setStationSectorShowAll(true);
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
                    Circuit {addStationTarget.circuitLetter} · Series {addStationDraft.seriesNumber} · {stationModalMode === 'edit' ? 'Station' : 'After station'} {addStationTarget.stationNumber}
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
                              disabled={isAddingStation || isTargetEndOfSeries || stationModalMode === 'edit'}
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
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-gray-800">Sector</label>
                        {!stationSectorShowAll && stationModalMode === 'edit' && (
                          <button
                            type="button"
                            onClick={() => setStationSectorShowAll(true)}
                            disabled={isAddingStation}
                            className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      {!stationSectorShowAll && stationModalMode === 'edit' && (
                        <p className="mb-1 text-[10px] text-gray-600">
                          Only this station&apos;s sector is listed. Use Reset to choose any sector.
                        </p>
                      )}
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
                        {(stationSectorShowAll
                          ? Object.keys(MUSCULAR_SECTOR_IMAGES)
                          : (() => {
                              const cur = (addStationDraft.muscularSector || '').trim();
                              if (!cur) return Object.keys(MUSCULAR_SECTOR_IMAGES);
                              return Object.keys(MUSCULAR_SECTOR_IMAGES).includes(cur) ? [cur] : [cur];
                            })()
                        ).map((sector) => (
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
                        setEditingStationNutritionComponent(null);
                        setStationModalMode('add');
                        setStationSectorShowAll(true);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      disabled={isAddingStation}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={stationModalMode === 'edit' ? handleEditStation : handleAddStation}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                      disabled={isAddingStation}
                    >
                      {isAddingStation ? (stationModalMode === 'edit' ? 'Saving…' : 'Adding…') : (stationModalMode === 'edit' ? 'Save' : 'Add')}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {showFastPlannerNutritionComponentModal && typeof document !== 'undefined' && ReactDOM.createPortal(
            <div
              className="fixed inset-0 z-[9999999] overflow-y-auto bg-black/60"
              onClick={() => {
                if (isSavingFastPlannerNutritionComponent) return;
                setShowFastPlannerNutritionComponentModal(false);
                setFastPlannerOriginalExercise(null);
              }}
              style={{ margin: 0 }}
            >
              <div className="flex min-h-full items-center justify-center p-4">
                <div
                  className="my-auto flex w-full max-w-2xl max-h-[min(92dvh,920px)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="fp-nutritionComponent-modal-title"
                >
                  <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                    <div className="font-bold text-base pr-2" id="fp-nutritionComponent-modal-title">
                      {fastPlannerNutritionComponentModalMode === 'edit'
                        ? 'Edit Fast planner for Anaerobic NutritionComponents'
                        : 'Add Fast planner for Anaerobic NutritionComponents'}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {fastPlannerNutritionComponentModalMode === 'add' && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold">Insert position</label>
                          <select
                            value={fastPlannerInsertPosition}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value || '1', 10);
                              const next = Number.isFinite(raw) ? Math.min(Math.max(1, raw), fastPlannerInsertMax) : 1;
                              setFastPlannerInsertPosition(next);
                            }}
                            className="rounded bg-white px-2 py-1 text-xs text-black"
                          >
                            {Array.from({ length: fastPlannerInsertMax }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isSavingFastPlannerNutritionComponent) return;
                          setShowFastPlannerNutritionComponentModal(false);
                          setFastPlannerOriginalExercise(null);
                        }}
                        className="rounded-lg p-2 text-white transition-colors hover:bg-white/20"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
                  <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-800">Muscular sector</label>
                      <select
                        value={fastPlannerDraft.muscularSector}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFastPlannerDraft((prev) => ({
                            ...prev,
                            muscularSector: v,
                            exercise: v !== prev.muscularSector ? '' : prev.exercise
                          }));
                        }}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={isSavingFastPlannerNutritionComponent}
                      >
                        <option value="">—</option>
                        {Object.keys(MUSCULAR_SECTOR_IMAGES).map((sector) => (
                          <option key={sector} value={sector}>{sector}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-800">Exercise</label>
                      <select
                        value={fastPlannerDraft.exercise}
                        onChange={(e) =>
                          setFastPlannerDraft((prev) => ({ ...prev, exercise: e.target.value }))
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={isSavingFastPlannerNutritionComponent || !fastPlannerDraft.muscularSector}
                      >
                        <option value="">—</option>
                        {(() => {
                          if (!fastPlannerDraft.muscularSector) return null;
                          const options = getExercisesBySector(fastPlannerDraft.muscularSector);
                          const hasCurrent =
                            !!fastPlannerDraft.exercise &&
                            options.some((o) => o.name === fastPlannerDraft.exercise);
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
                      <label className="mb-1 mt-2 block text-xs font-semibold text-gray-800">Name (type to customize)</label>
                      <input
                        type="text"
                        value={fastPlannerDraft.exercise}
                        onChange={(e) =>
                          setFastPlannerDraft((prev) => ({ ...prev, exercise: e.target.value }))
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        disabled={isSavingFastPlannerNutritionComponent}
                        placeholder="Exercise name"
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        Dropdown and thumbnails use the mock exercise bank; typing keeps names outside the bank.
                      </p>
                    </div>
                    {fastPlannerDraft.muscularSector ? (
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-gray-800">
                          Exercises in sector (tap thumbnail)
                        </label>
                        <div className="flex max-h-[200px] flex-wrap gap-2 overflow-y-auto rounded border border-gray-200 bg-white p-2">
                          {getExercisesBySector(fastPlannerDraft.muscularSector).map((o) => {
                            const thumb = getMockExerciseThumbnail(o.name);
                            const src = thumb?.src;
                            const isData = thumb?.isDataUrl === true || (!!src && src.startsWith('data:'));
                            const selected = fastPlannerDraft.exercise === o.name;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                title={o.name}
                                onClick={() =>
                                  setFastPlannerDraft((prev) => ({ ...prev, exercise: o.name }))
                                }
                                disabled={isSavingFastPlannerNutritionComponent}
                                className={`flex w-[72px] flex-shrink-0 flex-col items-center gap-0.5 rounded border p-1 transition-colors ${
                                  selected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-indigo-300'
                                }`}
                              >
                                <div className="relative h-14 w-14 overflow-hidden rounded bg-gray-100">
                                  {src ? (
                                    isData ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={src} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <Image
                                        src={src}
                                        alt=""
                                        width={56}
                                        height={56}
                                        className="h-full w-full object-cover"
                                        unoptimized
                                      />
                                    )
                                  ) : (
                                    <div className="h-full w-full bg-gray-200" aria-hidden />
                                  )}
                                </div>
                                <span className="line-clamp-2 w-full text-center text-[8px] leading-tight text-gray-800">
                                  {o.name.replace(/^Exercise #\d+\s+/i, '').slice(0, 24)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {(() => {
                      const exName = (fastPlannerDraft.exercise || '').trim();
                      const sectorLabel = (fastPlannerDraft.muscularSector || '').trim();
                      const sectorImg =
                        sectorLabel && MUSCULAR_SECTOR_IMAGES[sectorLabel]
                          ? MUSCULAR_SECTOR_IMAGES[sectorLabel]
                          : null;
                      const media = exName ? getExerciseMedia(exName) : null;
                      const thumbSrc = media?.thumb?.src ?? (exName ? sectorImg : null);
                      const thumbData =
                        media?.thumb?.isDataUrl === true || (!!thumbSrc && thumbSrc.startsWith('data:'));
                      return (
                        <div className="col-span-2 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-slate-50 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 text-sm font-semibold text-gray-800">Preview</div>
                            <p className="text-sm text-gray-600">
                              Uses exercise image when available. Click to open A/B gallery.
                            </p>
                          </div>
                          <button
                            type="button"
                            title="Enlarge exercise positions"
                            onClick={() =>
                              setFpNutritionComponentExerciseGallery({
                                title: exName || sectorLabel || 'Exercise',
                                pictureA: media?.pictureA ?? (exName ? sectorImg : null) ?? null,
                                pictureB:
                                  media?.pictureB ??
                                  media?.pictureA ??
                                  (exName ? sectorImg : null) ??
                                  null,
                              })
                            }
                            disabled={!thumbSrc || isSavingFastPlannerNutritionComponent}
                            className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-sm hover:ring-2 hover:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {thumbSrc ? (
                              thumbData ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Image
                                  src={thumbSrc}
                                  alt=""
                                  width={96}
                                  height={96}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              )
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                                Select sector / exercise
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Speed</label>
                      <select
                        value={fastPlannerDraft.speed}
                        onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, speed: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingFastPlannerNutritionComponent}
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
                        disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
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
                        disabled={isSavingFastPlannerNutritionComponent}
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
                          disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
                          />
                          Cardio
                        </label>
                      </div>

                      {fastPlannerBreakMode === 'rest' ? (
                        <select
                          value={fastPlannerDraft.break}
                          onChange={(e) => setFastPlannerDraft((prev) => ({ ...prev, break: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isSavingFastPlannerNutritionComponent}
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
                            disabled={isSavingFastPlannerNutritionComponent}
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
                        disabled={isSavingFastPlannerNutritionComponent}
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
                        if (isSavingFastPlannerNutritionComponent) return;
                        setShowFastPlannerNutritionComponentModal(false);
                        setFastPlannerOriginalExercise(null);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      disabled={isSavingFastPlannerNutritionComponent}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveFastPlannerNutritionComponent}
                      className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
                      disabled={isSavingFastPlannerNutritionComponent}
                    >
                      {isSavingFastPlannerNutritionComponent ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
            </div>,
            document.body
          )}
          {showAerobicFastPlannerNutritionComponentModal && typeof document !== 'undefined' && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999999] p-4"
              onClick={() => {
                if (isSavingAerobicFastPlannerNutritionComponent) return;
                setShowAerobicFastPlannerNutritionComponentModal(false);
              }}
              style={{ margin: 0 }}
            >
              <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white p-4 flex items-center justify-between">
                  <div className="font-bold text-base">
                    {aerobicFastPlannerNutritionComponentModalMode === 'edit'
                      ? 'Edit Fast planner for Aerobic NutritionComponents'
                      : 'Add Fast planner for Aerobic NutritionComponents'}
                  </div>
                  {aerobicFastPlannerNutritionComponentModalMode === 'add' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold">Insert position</label>
                      <select
                        value={aerobicFastPlannerInsertPosition}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value || '1', 10);
                          const next = Number.isFinite(raw) ? Math.min(Math.max(1, raw), aerobicInsertMax) : 1;
                          setAerobicFastPlannerInsertPosition(next);
                        }}
                        className="px-2 py-1 text-xs bg-white text-black rounded"
                      >
                        {Array.from({ length: aerobicInsertMax }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isSavingAerobicFastPlannerNutritionComponent) return;
                      setShowAerobicFastPlannerNutritionComponentModal(false);
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
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Distance</label>
                      <select
                        value={aerobicFastPlannerDraft.distance}
                        onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, distance: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      >
                        <option value="">—</option>
                        {aerobicDistanceChoices.map((v: string) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Style</label>
                      <select
                        value={aerobicFastPlannerDraft.style}
                        onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, style: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      >
                        <option value="">—</option>
                        {aerobicStyleChoices.map((v: string) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Speed</label>
                      <select
                        value={aerobicFastPlannerDraft.speed}
                        onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, speed: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      >
                        <option value="">—</option>
                        {aerobicSpeedChoices.map((v: string) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Strokes</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={aerobicFastPlannerDraft.strokes}
                        onChange={(e) =>
                          setAerobicFastPlannerDraft((prev) => ({
                            ...prev,
                            strokes: normalizeAerobicNumberInput(e.target.value, 0, 999)
                          }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Watts</label>
                      <input
                        type="number"
                        min={0}
                        max={999}
                        value={aerobicFastPlannerDraft.watts}
                        onChange={(e) =>
                          setAerobicFastPlannerDraft((prev) => ({
                            ...prev,
                            watts: normalizeAerobicNumberInput(e.target.value, 0, 999)
                          }))
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Time</label>
                      <input
                        type="text"
                        value={aerobicFastPlannerDraft.time}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 7);
                          setAerobicFastPlannerDraft((prev) => ({ ...prev, time: raw }));
                        }}
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 7);
                          const formatted = formatAerobicTimeFromDigits(raw);
                          setAerobicFastPlannerDraft((prev) => ({ ...prev, time: formatted }));
                        }}
                        placeholder={'Type digits like 123456 → 1h23\'45"6'}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Rest</label>
                      <div className="flex items-center gap-3 mb-2">
                        <select
                          value={aerobicFastPlannerDraft.restChoice}
                          onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, restChoice: e.target.value as AerobicRestChoice }))}
                          className="px-2 py-1 text-xs bg-white text-black rounded border border-gray-300"
                          disabled={isSavingAerobicFastPlannerNutritionComponent}
                        >
                          {aerobicRestChoices.map((opt) => (
                            <option key={opt.choice} value={opt.choice}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={aerobicFastPlannerDraft.rest}
                          onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, rest: e.target.value }))}
                          onBlur={(e) => {
                          if (aerobicFastPlannerDraft.restChoice === 'restart_to') {
                            const raw = e.target.value.replace(/\D/g, '').slice(0, 7);
                            const formatted = formatAerobicTimeFromDigits(raw);
                            setAerobicFastPlannerDraft((prev) => ({ ...prev, rest: formatted }));
                            return;
                          }
                          if (aerobicFastPlannerDraft.restChoice === 'rest_time') {
                            const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
                            const formatted = formatAerobicPauseFromDigits(raw);
                            setAerobicFastPlannerDraft((prev) => ({ ...prev, rest: formatted }));
                          }
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={isSavingAerobicFastPlannerNutritionComponent}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Break</label>
                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={aerobicFastPlannerDraft.breakChoice}
                          onChange={(e) => {
                            const choice = e.target.value as AerobicBreakChoice;
                            setAerobicFastPlannerDraft((prev) => ({
                              ...prev,
                              breakChoice: choice,
                              break: choice === 'stopped' ? 'Stopped' : ''
                            }));
                          }}
                          className="px-2 py-1 text-xs bg-white text-black rounded border border-gray-300"
                          disabled={isSavingAerobicFastPlannerNutritionComponent}
                        >
                          <option value="stopped">Stopped</option>
                          <option value="speed">Speed</option>
                          <option value="watts">Watts</option>
                        </select>
                        {aerobicFastPlannerDraft.breakChoice === 'speed' ? (
                          <select
                            value={aerobicFastPlannerDraft.break}
                            onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, break: e.target.value }))}
                            className="px-2 py-1 text-xs bg-white text-black rounded border border-gray-300"
                            disabled={isSavingAerobicFastPlannerNutritionComponent}
                          >
                            <option value="">—</option>
                            {aerobicSpeedChoices.map((v: string) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={aerobicFastPlannerDraft.break}
                            onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, break: e.target.value }))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={isSavingAerobicFastPlannerNutritionComponent || aerobicFastPlannerDraft.breakChoice === 'stopped'}
                          />
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-800 mb-1">Note</label>
                      <input
                        type="text"
                        value={aerobicFastPlannerDraft.note}
                        onChange={(e) => setAerobicFastPlannerDraft((prev) => ({ ...prev, note: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isSavingAerobicFastPlannerNutritionComponent}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (isSavingAerobicFastPlannerNutritionComponent) return;
                        setShowAerobicFastPlannerNutritionComponentModal(false);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAerobicFastPlannerNutritionComponent}
                      className="px-3 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-400"
                      disabled={isSavingAerobicFastPlannerNutritionComponent}
                    >
                      {isSavingAerobicFastPlannerNutritionComponent ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </SortableContext>
      <ExerciseGalleryModal
        open={!!fpNutritionComponentExerciseGallery}
        onClose={() => setFpNutritionComponentExerciseGallery(null)}
        title={fpNutritionComponentExerciseGallery?.title ?? ''}
        pictureA={fpNutritionComponentExerciseGallery?.pictureA ?? null}
        pictureB={fpNutritionComponentExerciseGallery?.pictureB ?? null}
      />
    </DndContext>
  );
}
