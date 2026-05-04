// ============================================================================
// Circuit Planner Component  
// Created: 2026-01-21 19:30 UTC
// Purpose: Complete circuit training planning interface with:
// - Circuit configuration (A, B, C, D...)
// - Series management (1-5 or continuous time 1'-9')
// - Station management (2-9 stations per circuit, default 4)
// - Execution modes (vertical/horizontal sequence)
// - Pause settings (stations, circuits, series, horizontal series)
// - Exercise selection and sector management
// - Auto-load functionality with preferences
// ============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ReactDOM from 'react-dom';
import { X, Settings, RotateCw, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MUSCULAR_SECTORS,
  circuitLoadOfWorkToMacroFinal,
  CIRCUIT_STATION_PAUSE_OPTIONS as STATION_PAUSE_OPTIONS,
  CIRCUIT_SERIES_PAUSE_OPTIONS as SERIES_PAUSE_OPTIONS,
} from '@/constants/moveframe.constants';
import CircuitPreferencesModal, { ExercisePreferences } from './CircuitPreferencesModal';
// 2026-01-22 11:45 UTC - Import mock exercise database
import {
  getExercisesBySector,
  getRandomExercise,
  getAllSectors,
  getMockExerciseThumbnail,
  getExerciseMedia,
  getExercisePictureAThumbnailForDisplay,
  MockExercise,
} from '@/data/mockExercises';
import ExerciseGalleryModal from './ExerciseGalleryModal';
import { HorizontalSeriesCircuitGrid } from './CircuitPlannerHorizontalSeriesGrid';

// ============================================================================
// TYPE DEFINITIONS - 2026-01-21 19:30 UTC
// ============================================================================

interface Station {
  stationNumber: number;
  sector: string;
  exercise: string;
  reps: string;
  pause: number; // 2026-01-22 10:15 UTC - Added pause value
  notes: string;
}

// 2026-01-22 12:15 UTC - Restructured: stations are now organized by series
// Each series has its own independent array of stations
interface Circuit {
  letter: string;
  stationsBySeries: Station[][]; // Array of series, each containing an array of stations
  series: number;
  pauseBetweenSeries: number;
  pauseAfterCircuit: number;
  /** Per-series pause (index = series number - 1). Falls back to pauseSeries if absent. */
  seriesPauses?: number[];
  /** Pause after this circuit. Alias / optional override for pauseAfterCircuit. */
  restAfterCircuit?: number;
}

/** Same as table render: min(c.series, stationsBySeries.length) with safe fallbacks. */
function effectiveSeriesCountOnCircuit(c: Circuit): number {
  const len = c.stationsBySeries?.length ?? 0;
  if (len === 0) return 0;
  const ser = typeof c.series === 'number' ? c.series : len;
  return Math.min(len, ser > 0 ? ser : len);
}

/** Count mode: one entry per gap between consecutive series (length series−1). Time mode: one per serie row (length series). */
function seriesPausesSlotCount(nSeries: number, mode: 'count' | 'time'): number {
  if (nSeries <= 0) return 0;
  return mode === 'time' ? nSeries : Math.max(0, nSeries - 1);
}

function buildDefaultSeriesPauses(
  circuit: Circuit,
  mode: 'count' | 'time',
  fallbackBetween: number,
  fallbackAfterCirc: number
): number[] {
  const n = circuit.stationsBySeries?.length ?? circuit.series;
  const len = seriesPausesSlotCount(n, mode);
  if (len <= 0) return [];
  const existing = circuit.seriesPauses;
  return Array.from({ length: len }, (_, i) => {
    const isLastTimeSlot = mode === 'time' && i === len - 1;
    const defaultVal = isLastTimeSlot ? fallbackAfterCirc : fallbackBetween;
    const raw =
      existing != null && i < existing.length && existing[i] !== undefined ? existing[i]! : defaultVal;
    return mode === 'time' && isLastTimeSlot
      ? coerceBetweenCircuitsSeconds(raw, fallbackAfterCirc)
      : coerceCountSeriesPauseSeconds(raw, fallbackBetween);
  });
}

/** After removing serie at removedSeriesIndex (0-based), rebuild seriesPauses. */
function seriesPausesAfterRemovingSerie(
  pauses: number[] | undefined,
  removedSeriesIndex: number,
  mode: 'count' | 'time'
): number[] | undefined {
  if (!pauses || pauses.length === 0) return pauses;
  if (mode === 'time') {
    const next = pauses.filter((_, i) => i !== removedSeriesIndex);
    return next.length > 0 ? next : undefined;
  }
  if (pauses.length <= 1) return undefined;
  const out: number[] = [];
  for (let j = 0; j < pauses.length - 1; j++) {
    if (j < removedSeriesIndex) out.push(pauses[j]!);
    else out.push(pauses[j + 1]!);
  }
  return out.length > 0 ? out : undefined;
}

/** Movelaps are not generated for fully empty grid cells (no sector and no exercise). */
function circuitStationProducesMovelap(station: Station): boolean {
  const sectorS = (station.sector || '').trim();
  const exerciseS = (station.exercise || '').trim();
  return !!(sectorS || exerciseS);
}

/** Picker hints: green = already in this serie, yellow = only in other series of this circuit. */
function getExerciseCircuitSeriesUsage(
  circuit: Circuit | undefined,
  exerciseName: string,
  currentSeriesIdx: number
): { inCurrentSeries: boolean; inOtherSeries: boolean } {
  const target = (exerciseName || '').trim();
  if (!circuit?.stationsBySeries?.length || !target) {
    return { inCurrentSeries: false, inOtherSeries: false };
  }
  let inCurrentSeries = false;
  let inOtherSeries = false;
  circuit.stationsBySeries.forEach((seriesStations, si) => {
    const found = seriesStations.some((st) => (st.exercise || '').trim() === target);
    if (!found) return;
    if (si === currentSeriesIdx) inCurrentSeries = true;
    else inOtherSeries = true;
  });
  return { inCurrentSeries, inOtherSeries };
}

/** PREVIEW station pause average: count rows with non-blank exercise only (ignore sector). */
function stationHasNonBlankExercise(station: Station): boolean {
  return !!(station.exercise || '').trim();
}

interface CircuitPlannerProps {
  sport: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  initialConfig?: {
    numCircuits?: number;
    stationsPerCircuit?: number;
    seriesMode?: 'count' | 'time';
    seriesCount?: number;
    seriesTime?: number;
    pauseStations?: number;
    pauseCircuits?: number;
    pauseSeries?: number;
    /** Seconds — rest between stations when execution is horizontal (distinct from pauseSeries). */
    horizontalSeries?: number;
    loadOfWork?: number;
    executionMode?: 'vertical' | 'horizontal';
    startInTablePhase?: boolean;
    hideUI?: boolean; // Hide configuration UI (e.g. invisible mode)
    existingCircuits?: any[]; // Pre-existing circuit data with exercises
    editingFromMovelap?: boolean; // Flag to indicate editing from movelap click
    editingMovelapTarget?: { circuitLetter?: string; circuitIndex?: number; localSeriesNumber?: number; stationNumber?: number } | null;
    editingMovelapData?: any;
  };
}

// 2026-01-22 12:40 UTC - Mapping of muscular sectors to images
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

// ============================================================================
// CONSTANTS - 2026-01-21 19:30 UTC
// ============================================================================

const CIRCUIT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

/** Macro digit 0–9 → target seconds digit×10; snap to nearest footer Pause option (e.g. 4→40″, 6→1′). */
function footerPauseSecondsFromMacroDigit(digit: number): number {
  const targetSec = Math.max(0, Math.min(90, digit * 10));
  let best = STATION_PAUSE_OPTIONS[0]!.value;
  let bestDist = Infinity;
  for (const o of STATION_PAUSE_OPTIONS) {
    const d = Math.abs(o.value - targetSec);
    if (d < bestDist) {
      bestDist = d;
      best = o.value;
    }
  }
  return best;
}

/** Pause among / between circuits — dropdown only 1′ … 10′ (values in seconds). */
const CIRCUIT_PAUSE_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const minutes = i + 1;
  return { label: `${minutes}'`, value: minutes * 60 };
});

/**
 * Battery REDESIGNED / legacy rows may store 1–10 as whole minutes; grid `<select>` uses seconds.
 * Without this, value `6` matches no option (only `360` exists) and the menu looks incomplete.
 */
function coerceBetweenCircuitsSeconds(v: number, fallbackSec: number): number {
  if (!Number.isFinite(v)) return fallbackSec;
  const n = Math.round(v);
  if (n >= 60 && n <= 600) return n;
  if (n >= 1 && n <= 10) return n * 60;
  if (n === 0) return fallbackSec;
  return Math.min(600, Math.max(60, fallbackSec));
}

function coerceCountSeriesPauseSeconds(v: number, fallbackSec: number): number {
  if (!Number.isFinite(v)) return fallbackSec;
  const n = Math.round(v);
  if (n >= 60) return Math.min(600, n);
  if (n >= 1 && n <= 10) return n * 60;
  return n;
}

/**
 * Horizontal station scan: prefer distinct exercises; avoid adjacent duplicates until pool forces it.
 */
function pickExercisesForStationColumn(
  sector: string,
  n: number,
  getPool: typeof getExercisesBySector
): string[] {
  const exercises = getPool(sector) || [];
  const pool = exercises.map((e) => e.name).filter(Boolean);
  const result: string[] = Array.from({ length: n }, () => '');
  if (n === 0 || pool.length === 0) return result;
  const usedCount = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? result[i - 1] : '';
    const ranked = [...pool].sort((a, b) => (usedCount.get(a) ?? 0) - (usedCount.get(b) ?? 0));
    let choice = ranked.find((name) => name !== prev && (usedCount.get(name) ?? 0) === 0);
    if (choice === undefined) choice = ranked.find((name) => name !== prev);
    if (choice === undefined) choice = ranked[0]!;
    result[i] = choice;
    usedCount.set(choice, (usedCount.get(choice) ?? 0) + 1);
  }
  return result;
}

/**
 * Execution horizontally (count): exercise chosen on **series 1** (index 0) for a station is copied to the
 * same station column in series 2+ so the grid pre-fills. Each cell remains editable afterwards.
 */
function replicateHorizontalExerciseFromSeriesOne(
  nextCircuits: Circuit[],
  circuitIdx: number,
  stationIdx: number,
  exerciseName: string,
  sectorName: string
): void {
  const circuit = nextCircuits[circuitIdx];
  const rows = circuit?.stationsBySeries;
  if (!rows?.length) return;
  if (!(exerciseName || '').trim()) return;
  for (let s = 1; s < rows.length; s++) {
    const list = rows[s];
    if (!list?.[stationIdx]) continue;
    list[stationIdx] = {
      ...list[stationIdx],
      exercise: exerciseName,
      sector: sectorName || list[stationIdx].sector,
    };
  }
}

/** Format seconds as pause label; prefer dropdown option, else clean M′SS″ (no floating-point artifacts). */
function formatPauseSeconds(options: { label: string; value: number }[], valueSeconds: number): string {
  const secTotal = Math.max(0, Math.round(Number.isFinite(valueSeconds) ? Number(valueSeconds) : 0));
  const found = options.find((o) => o.value === secTotal);
  if (found) return found.label;
  const m = Math.floor(secTotal / 60);
  const s = secTotal % 60;
  if (m <= 0) return `${s}"`;
  if (s === 0) return `${m}'`;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** Parse pause from movelap format (e.g. "0'10\"", "0'15\"", "10", 10) to seconds */
function parsePauseFromMovelap(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return 0;
  const s = String(value).trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const parts = s.split(/'/);
  if (parts.length >= 2) {
    const mins = parseInt((parts[0] || '0').replace(/\D/g, ''), 10) || 0;
    const secPart = (parts[1] || '0').replace(/"/g, '').replace(/\D/g, '') || '0';
    const secs = parseInt(secPart.slice(0, 2), 10) || 0;
    return mins * 60 + secs;
  }
  const secOnly = s.replace(/\D/g, '');
  return secOnly ? parseInt(secOnly.slice(0, 3), 10) || 0 : 0;
}

// ============================================================================
// MAIN COMPONENT - 2026-01-21 19:30 UTC
// ============================================================================

export default function CircuitPlanner({ sport, onSave, onCancel, initialConfig }: CircuitPlannerProps) {
  // Configuration State - 2026-01-21 19:30 UTC
  // 2026-01-24 - Initialize from initialConfig if provided
  const [numCircuits, setNumCircuits] = useState(initialConfig?.numCircuits || 1);
  const [stationsPerCircuit, setStationsPerCircuit] = useState(initialConfig?.stationsPerCircuit || 4);
  const [seriesMode, setSeriesMode] = useState<'count' | 'time'>(initialConfig?.seriesMode || 'count');
  const [seriesCount, setSeriesCount] = useState(initialConfig?.seriesCount ?? 1);
  const [seriesTime, setSeriesTime] = useState(initialConfig?.seriesTime || 2); // minutes
  const [executionMode, setExecutionMode] = useState<'vertical' | 'horizontal'>(initialConfig?.executionMode || 'vertical');
  
  // Pause State - 2026-01-21 19:30 UTC
  const [pauseStations, setPauseStations] = useState(initialConfig?.pauseStations || 10); // seconds
  const [pauseCircuits, setPauseCircuits] = useState(initialConfig?.pauseCircuits ? initialConfig.pauseCircuits * 60 : 120); // convert minutes to seconds
  const [pauseSeries, setPauseSeries] = useState(initialConfig?.pauseSeries ? initialConfig.pauseSeries * 60 : 120); // convert minutes to seconds
  /** Table-phase "Pause Settings" drafts — applied to grid only when user clicks Proceed. */
  const [pauseDraftStations, setPauseDraftStations] = useState(initialConfig?.pauseStations || 10);
  const [pauseDraftCircuits, setPauseDraftCircuits] = useState(
    initialConfig?.pauseCircuits ? initialConfig.pauseCircuits * 60 : 120
  );
  const [pauseDraftSeries, setPauseDraftSeries] = useState(
    initialConfig?.pauseSeries ? initialConfig.pauseSeries * 60 : 120
  );
  const horizontalSeriesInitial =
    typeof initialConfig?.horizontalSeries === 'number'
      ? initialConfig.horizontalSeries
      : typeof (initialConfig as any)?.pauses?.horizontalSeries === 'number'
        ? (initialConfig as any).pauses.horizontalSeries
        : 40;
  const [pauseHorizontalSeries, setPauseHorizontalSeries] = useState(horizontalSeriesInitial);
  const [pauseDraftHorizontalSeries, setPauseDraftHorizontalSeries] = useState(horizontalSeriesInitial);
  /** Inter-station: vertical uses Pause\\stations; horizontal uses “Pause after all the series of each station” (not Between series). */
  const pauseAmongStationsBase =
    executionMode === 'horizontal' ? pauseHorizontalSeries : pauseStations;
  const pauseAmongStationsDraft =
    executionMode === 'horizontal' ? pauseDraftHorizontalSeries : pauseDraftStations;
  /** Macro (0–9) for Continuous Time Rip column; bulk apply from Pause settings panel only. */
  const [loadOfWork, setLoadOfWork] = useState(
    initialConfig?.loadOfWork !== undefined && initialConfig?.loadOfWork !== null
      ? String(initialConfig.loadOfWork)
      : ''
  );
  /** Series-count mode only: bulk Rip value (1–99 / nc); independent of Macro (`loadOfWork`). */
  const [bulkRepsLoad, setBulkRepsLoad] = useState('');
  /** Circuit table footer: bulk apply inter-station pause (seconds) — same options as per-row Pause. */
  const [bulkPauseFooterSeconds, setBulkPauseFooterSeconds] = useState('');
  const [exerciseGallery, setExerciseGallery] = useState<{
    title: string;
    pictureA: string | null;
    pictureB: string | null;
  } | null>(null);

  // Circuit Data - 2026-01-21 19:30 UTC
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  
  // UI State - 2026-01-21 19:30 UTC
  // 2026-01-21 20:15 UTC - Added phase management (config -> table)
  // 2026-01-24 - Start in table phase if initialConfig.startInTablePhase is true
  const [currentPhase, setCurrentPhase] = useState<'config' | 'table'>(initialConfig?.startInTablePhase ? 'table' : 'config');
  const [showSectorSelector, setShowSectorSelector] = useState(false);
  const [selectedCircuitForSector, setSelectedCircuitForSector] = useState<string | null>(null);
  // 2026-01-22 13:10 UTC - Track specific station for sector selection
  const [selectedStationForSector, setSelectedStationForSector] = useState<{circuitLetter: string, seriesIdx: number, stationNumber: number} | null>(null);
  const [previousStationSector, setPreviousStationSector] = useState<string | null>(null); // 2026-01-26 - Track previous station's sector for highlighting
  const [selectedStationForExercise, setSelectedStationForExercise] = useState<{circuit: string, series: number, station: number} | null>(null);
  // 2026-01-21 20:30 UTC - Added exercise menu state
  // 2026-01-22 12:30 UTC - Added x, y position for fixed positioning
  const [showExerciseMenu, setShowExerciseMenu] = useState<{circuit: string, series: number, station: number, x: number, y: number} | null>(null);
  
  // 2026-01-22 13:50 UTC - Debug useEffect to track menu state
  useEffect(() => {
    console.log('showExerciseMenu changed:', showExerciseMenu);
    if (showExerciseMenu) {
      console.log('Menu should render at position:', { x: showExerciseMenu.x, y: showExerciseMenu.y });
    }
  }, [showExerciseMenu]);
  
  // 2026-01-27 - Auto-switch to vertical execution mode when time mode is selected
  useEffect(() => {
    if (seriesMode === 'time' && executionMode === 'horizontal') {
      setExecutionMode('vertical');
    }
  }, [seriesMode, executionMode]);

  // Horizontal execution: keep legacy pauseStations in sync for any code that still reads it.
  useEffect(() => {
    if (executionMode !== 'horizontal') return;
    setPauseStations(pauseHorizontalSeries);
    setPauseDraftStations(pauseHorizontalSeries);
  }, [executionMode, pauseHorizontalSeries]);

  // When entering table phase, align pause drafts with committed defaults (e.g. after "Start Planning").
  const prevPhaseForPauseDraft = useRef(currentPhase);
  useEffect(() => {
    if (currentPhase === 'table' && prevPhaseForPauseDraft.current !== 'table') {
      setPauseDraftStations(executionMode === 'horizontal' ? pauseHorizontalSeries : pauseStations);
      setPauseDraftCircuits(pauseCircuits);
      setPauseDraftSeries(pauseSeries);
      setPauseDraftHorizontalSeries(pauseHorizontalSeries);
    }
    prevPhaseForPauseDraft.current = currentPhase;
  }, [currentPhase, pauseStations, pauseCircuits, pauseSeries, pauseHorizontalSeries, executionMode]);
  
  // Macro (`loadOfWork`) is always 0–9 or empty; never bulk reps like 12.
  useEffect(() => {
    if (seriesMode === 'time') {
      const valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      if (!loadOfWork || !valid.includes(loadOfWork)) {
        setLoadOfWork('0');
      }
    } else {
      const valid = new Set(['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
      if (!valid.has(loadOfWork)) {
        setLoadOfWork('');
      }
    }
  }, [seriesMode, loadOfWork]);

  useEffect(() => {
    if (circuits.length === 0) return;
    const nextMode: 'count' | 'time' = seriesMode === 'time' ? 'time' : 'count';
    setCircuits((prev) => {
      let changed = false;
      const next = prev.map((circuit) => {
        const nSeries = circuit.stationsBySeries?.length ?? circuit.series ?? 0;
        const pauseAfter = coerceBetweenCircuitsSeconds(
          typeof circuit.pauseAfterCircuit === 'number' ? circuit.pauseAfterCircuit : pauseCircuits,
          pauseCircuits
        );
        const pauseBetween = coerceCountSeriesPauseSeconds(
          typeof circuit.pauseBetweenSeries === 'number' ? circuit.pauseBetweenSeries : pauseSeries,
          pauseSeries
        );
        const expectedSlots = seriesPausesSlotCount(nSeries, nextMode);

        let nextSeriesPauses: number[] | undefined;
        if (expectedSlots > 0) {
          const src = Array.isArray(circuit.seriesPauses) ? circuit.seriesPauses : [];
          nextSeriesPauses = Array.from({ length: expectedSlots }, (_, i) => {
            const slotFallback =
              nextMode === 'time' && i < expectedSlots - 1 ? pauseBetween : pauseAfter;
            const raw = i < src.length && typeof src[i] === 'number' ? src[i]! : slotFallback;
            return nextMode === 'time' && i < expectedSlots - 1
              ? coerceCountSeriesPauseSeconds(raw, pauseBetween)
              : nextMode === 'time'
                ? coerceBetweenCircuitsSeconds(raw, pauseAfter)
                : coerceCountSeriesPauseSeconds(raw, pauseBetween);
          });
        } else {
          nextSeriesPauses = undefined;
        }

        const normalizedSeriesCount = circuit.stationsBySeries?.length ?? circuit.series;
        const sameSeriesPauses =
          (nextSeriesPauses == null && circuit.seriesPauses == null) ||
          (Array.isArray(nextSeriesPauses) &&
            Array.isArray(circuit.seriesPauses) &&
            nextSeriesPauses.length === circuit.seriesPauses.length &&
            nextSeriesPauses.every((v, i) => v === circuit.seriesPauses![i]));
        const same =
          circuit.pauseAfterCircuit === pauseAfter &&
          circuit.pauseBetweenSeries === pauseBetween &&
          circuit.series === normalizedSeriesCount &&
          sameSeriesPauses;

        if (same) return circuit;
        changed = true;
        return {
          ...circuit,
          pauseAfterCircuit: pauseAfter,
          pauseBetweenSeries: pauseBetween,
          seriesPauses: nextSeriesPauses,
          series: normalizedSeriesCount,
        };
      });
      return changed ? next : prev;
    });
  }, [seriesMode, pauseCircuits, pauseSeries, circuits.length]);
  
  // 2026-01-21 22:00 UTC - Added preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [exercisePreferences, setExercisePreferences] = useState<ExercisePreferences>({
    typeOfExercise: '',
    equipments: '',
    sportSuggested: '',
    muscularArea: '',
    libraryOfExercises: '',
    favouritesToUse: ''
  });
  // 2026-01-22 11:45 UTC - Manual exercise selection modal state
  // 2026-01-22 12:15 UTC - Added seriesIdx to track which series
  // 2026-01-22 13:20 UTC - Added reps state for editing
  // 2026-01-26 - Added pause state for editing
  const [showManualExerciseModal, setShowManualExerciseModal] = useState(false);
  const [selectedStationForManualExercise, setSelectedStationForManualExercise] = useState<{circuitIdx: number, seriesIdx: number, stationIdx: number} | null>(null);
  const [pendingExercise, setPendingExercise] = useState<{name: string, sector: string, reps: string, pause: number, notes: string} | null>(null);
  const [hasOpenedFromMovelap, setHasOpenedFromMovelap] = useState(false);
  const notesEditorRef = useRef<HTMLDivElement | null>(null);
  const [showAllSectorsInManual, setShowAllSectorsInManual] = useState(false);
  // 2026-01-21 22:10 UTC - Action modals state
  const [showAddCircuitModal, setShowAddCircuitModal] = useState(false);
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [showAddSerieModal, setShowAddSerieModal] = useState(false);
  const [showRemoveMenu, setShowRemoveMenu] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [insertAfterCircuit, setInsertAfterCircuit] = useState('');
  // 2026-01-22 10:00 UTC - Checkbox selection state for remove functionality
  const [selectedCircuits, setSelectedCircuits] = useState<Set<string>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set()); // format: "circuit-series" e.g., "A-1"
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set()); // format: "circuit-series-station" e.g., "A-1-1"
  const selectedStationsRef = useRef<Set<string>>(new Set());
  selectedStationsRef.current = selectedStations;

  // 2026-01-22 14:40 UTC - Dragging exercise state
  const [draggedExercise, setDraggedExercise] = useState<{circuit: string, series: number, station: number, exercise: string, reps: string, pause: number, sector: string} | null>(null);
  const [showSubstituteExchangeModal, setShowSubstituteExchangeModal] = useState<{source: any, target: any} | null>(null);
  const [copyClickTimer, setCopyClickTimer] = useState<NodeJS.Timeout | null>(null);
  // Load New Station scan modal: ordered list = [exercises NOT in current series] first, then [already in series]
  const [loadNewStationScan, setLoadNewStationScan] = useState<{
    circuitIdx: number;
    seriesIdx: number;
    stationIdx: number;
    sector: string;
    orderedCandidates: MockExercise[];
    scanIndex: number;
  } | null>(null);
  
  // ============================================================================
  // INITIALIZATION - 2026-01-21 19:35 UTC
  // Generate initial circuit structure when settings change
  // 2026-01-21 20:15 UTC - Only generate when in table phase
  // 2026-01-24 - Load existing circuits if provided for edit mode
  // ============================================================================
  useEffect(() => {
    // 2026-01-21 20:15 UTC - Only generate circuits in table phase
    // 2026-01-22 10:15 UTC - Include pause settings in generated circuits
    // 2026-01-22 12:15 UTC - Fixed: Create independent stations for each series
    // 2026-01-24 - Check for existing circuits first
    if (currentPhase !== 'table') return;
    // Prevent re-initialization while editing table data.
    // Without this guard, parent prop reference changes can rebuild the grid
    // and wipe already entered station values.
    if (circuits.length > 0) return;
    
    // If we have existing circuits from edit mode, use them instead of generating new ones
    if (initialConfig?.existingCircuits && initialConfig.existingCircuits.length > 0) {
      console.log('🔄 Loading existing circuits for edit:', initialConfig.existingCircuits);
      const normalizedCircuits = initialConfig.existingCircuits.map((c: Circuit) => {
        const afterRaw = typeof c.pauseAfterCircuit === 'number' ? c.pauseAfterCircuit : pauseCircuits;
        const after = coerceBetweenCircuitsSeconds(afterRaw, pauseCircuits);
        const between = coerceCountSeriesPauseSeconds(
          typeof c.pauseBetweenSeries === 'number' ? c.pauseBetweenSeries : pauseSeries,
          pauseSeries
        );
        const n = c.stationsBySeries?.length ?? c.series;
        const expected = seriesPausesSlotCount(n, seriesMode === 'time' ? 'time' : 'count');
        let seriesPauses = c.seriesPauses;
        if (expected > 0) {
          if (!Array.isArray(seriesPauses) || seriesPauses.length !== expected) {
            seriesPauses = buildDefaultSeriesPauses(
              { ...c, pauseBetweenSeries: between, pauseAfterCircuit: after },
              seriesMode === 'time' ? 'time' : 'count',
              between,
              after
            );
          } else {
            seriesPauses = seriesPauses.map((p, i) => {
              const raw = typeof p === 'number' ? p : seriesMode === 'time' && i < expected - 1 ? between : after;
              return seriesMode === 'time' && i < expected - 1
                ? coerceCountSeriesPauseSeconds(raw, between)
                : seriesMode === 'time'
                  ? coerceBetweenCircuitsSeconds(raw, after)
                  : coerceCountSeriesPauseSeconds(raw, between);
            });
          }
        } else {
          seriesPauses = undefined;
        }
        return { ...c, pauseBetweenSeries: between, pauseAfterCircuit: after, seriesPauses };
      });
      setCircuits(normalizedCircuits);
      return;
    }
    
    // Do NOT regenerate when circuits already exist - add/reduce via inputs updates in place
    if (circuits.length > 0) return;
    
    const newCircuits: Circuit[] = [];
    
    for (let i = 0; i < numCircuits; i++) {
      const seriesNum = seriesCount;
      const stationsBySeries: Station[][] = [];
      
      // Create independent stations for each series
      for (let s = 0; s < seriesNum; s++) {
        const stationsForThisSeries: Station[] = [];
        for (let j = 0; j < stationsPerCircuit; j++) {
          const lastSerie = s === seriesNum - 1;
          const lastStation = j === stationsPerCircuit - 1;
          const pauseCell =
            executionMode === 'horizontal' && seriesMode === 'count'
              ? lastSerie && !lastStation
                ? pauseHorizontalSeries
                : 0
              : executionMode === 'horizontal'
                ? pauseHorizontalSeries
                : pauseStations;
          stationsForThisSeries.push({
            stationNumber: j + 1,
            sector: '',
            exercise: '',
            reps: '',
            pause: pauseCell,
            notes: ''
          });
        }
        stationsBySeries.push(stationsForThisSeries);
      }
      
      const between = pauseSeries;
      const slots = seriesPausesSlotCount(seriesNum, seriesMode === 'time' ? 'time' : 'count');
      const after = pauseCircuits;
      newCircuits.push({
        letter: CIRCUIT_LETTERS[i],
        stationsBySeries,
        series: seriesNum,
        pauseBetweenSeries: between,
        pauseAfterCircuit: after,
        seriesPauses:
          slots > 0
            ? buildDefaultSeriesPauses(
                {
                  letter: CIRCUIT_LETTERS[i],
                  stationsBySeries,
                  series: seriesNum,
                  pauseBetweenSeries: between,
                  pauseAfterCircuit: after,
                },
                seriesMode === 'time' ? 'time' : 'count',
                between,
                after
              )
            : undefined
      });
    }
    
    setCircuits(newCircuits);
  }, [currentPhase, circuits.length, numCircuits, stationsPerCircuit, seriesCount, seriesMode, pauseCircuits, pauseSeries, pauseStations, pauseHorizontalSeries, executionMode, initialConfig?.existingCircuits]);

  useEffect(() => {
    if (!initialConfig?.editingFromMovelap || !initialConfig?.editingMovelapTarget || hasOpenedFromMovelap) return;
    if (!circuits.length) return;

    const target = initialConfig.editingMovelapTarget;
    let circuitIdx = -1;
    if (target.circuitLetter) {
      circuitIdx = circuits.findIndex(c => c.letter === target.circuitLetter);
    }
    if (circuitIdx < 0 && typeof target.circuitIndex === 'number') {
      circuitIdx = target.circuitIndex - 1;
    }

    const seriesIdx = typeof target.localSeriesNumber === 'number' ? target.localSeriesNumber - 1 : 0;
    const stationIdx = typeof target.stationNumber === 'number' ? target.stationNumber - 1 : 0;

    if (circuitIdx < 0 || circuitIdx >= circuits.length) return;
    const circuit = circuits[circuitIdx];
    const seriesList = circuit?.stationsBySeries || [];
    if (seriesIdx < 0 || seriesIdx >= seriesList.length) return;
    const stationList = seriesList[seriesIdx] || [];
    if (stationIdx < 0 || stationIdx >= stationList.length) return;

    const lap = initialConfig.editingMovelapData;
    if (lap && !stationList[stationIdx].sector) {
      stationList[stationIdx].sector = lap.sector || lap.muscularSector || '';
    }

    setSelectedStationForManualExercise({ circuitIdx, seriesIdx, stationIdx });
    setShowAllSectorsInManual(false);
    setShowManualExerciseModal(true);
    setHasOpenedFromMovelap(true);
  }, [circuits, hasOpenedFromMovelap, initialConfig?.editingFromMovelap, initialConfig?.editingMovelapTarget, initialConfig?.editingMovelapData]);

  useEffect(() => {
    if (!showManualExerciseModal || !pendingExercise || !notesEditorRef.current) return;
    if (notesEditorRef.current.innerHTML !== pendingExercise.notes) {
      notesEditorRef.current.innerHTML = pendingExercise.notes || '';
    }
  }, [showManualExerciseModal, pendingExercise]);

  useEffect(() => {
    if (!showManualExerciseModal || !selectedStationForManualExercise) return;
    setShowAllSectorsInManual(false);
  }, [showManualExerciseModal, selectedStationForManualExercise]);

  // Load New Station scan modal: Arrow keys to proceed scan, Enter to confirm
  useEffect(() => {
    if (!loadNewStationScan) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setLoadNewStationScan(prev => {
          if (!prev) return null;
          const nextIdx = (prev.scanIndex + 1) % prev.orderedCandidates.length;
          return { ...prev, scanIndex: nextIdx };
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setLoadNewStationScan(prev => {
          if (!prev) return null;
          const nextIdx = (prev.scanIndex - 1 + prev.orderedCandidates.length) % prev.orderedCandidates.length;
          return { ...prev, scanIndex: nextIdx };
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const scan = loadNewStationScan;
        if (!scan) return;
        setCircuits(prevCircuits => {
          const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
          const ex = scan.orderedCandidates[scan.scanIndex];
          const cell = newCircuits[scan.circuitIdx].stationsBySeries[scan.seriesIdx][scan.stationIdx];
          cell.exercise = ex.name;
          if (
            executionMode === 'horizontal' &&
            seriesMode === 'count' &&
            scan.seriesIdx === 0 &&
            (ex.name || '').trim()
          ) {
            replicateHorizontalExerciseFromSeriesOne(
              newCircuits,
              scan.circuitIdx,
              scan.stationIdx,
              ex.name,
              cell.sector || ''
            );
          }
          return newCircuits;
        });
        const circuitLetter = circuits[scan.circuitIdx]?.letter || '';
        const station = circuits[scan.circuitIdx]?.stationsBySeries[scan.seriesIdx]?.[scan.stationIdx];
        const stationNum = station?.stationNumber;
        setActionLog(prev => [...prev, `Exercise replaced in ${circuitLetter}${scan.seriesIdx + 1}-${stationNum}`]);
        setLoadNewStationScan(null);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setLoadNewStationScan(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loadNewStationScan, circuits, executionMode, seriesMode]);

  // ============================================================================
  // HANDLERS - 2026-01-21 19:40 UTC
  // ============================================================================

  /** Push Pause Settings drafts into committed state and every station / circuit row (on Proceed). */
  const commitPauseSettingsFromDraft = () => {
    const interStationCommitted =
      executionMode === 'horizontal' ? pauseDraftHorizontalSeries : pauseDraftStations;
    const c = pauseDraftCircuits;
    const ser = pauseDraftSeries;
    setPauseStations(interStationCommitted);
    setPauseCircuits(c);
    setPauseSeries(ser);
    setPauseHorizontalSeries(pauseDraftHorizontalSeries);
    setCircuits((prev) =>
      prev.map((circuit) => {
        const slots = seriesPausesSlotCount(
          circuit.stationsBySeries?.length ?? circuit.series,
          seriesMode === 'time' ? 'time' : 'count'
        );
        const seriesPauses =
          slots > 0
            ? seriesMode === 'time'
              ? Array.from({ length: slots }, (_, i) => (i < slots - 1 ? ser : c))
              : Array.from({ length: slots }, () => ser)
            : undefined;
        return {
          ...circuit,
          pauseAfterCircuit: c,
          pauseBetweenSeries: ser,
          seriesPauses,
          stationsBySeries: circuit.stationsBySeries.map((series, sIdx) => {
            const nSer = circuit.stationsBySeries.length;
            const lastSeriesRow = sIdx === nSer - 1;
            return series.map((station, stIdx) => {
              const lastStationCol = stIdx === series.length - 1;
              let pauseVal: number;
              if (seriesMode === 'time') {
                pauseVal = interStationCommitted;
              } else if (executionMode === 'horizontal') {
                if (lastSeriesRow && !lastStationCol) pauseVal = interStationCommitted;
                else pauseVal = station.pause;
              } else {
                pauseVal = lastStationCol ? station.pause : interStationCommitted;
              }
              return { ...station, pause: pauseVal };
            });
          }),
        };
      })
    );
  };

  // Circuit Configuration: add/reduce without clearing existing data
  // Add Circuit: append at end. Reduce Circuit: remove last only.
  const handleNumCircuitsChange = (newValue: number) => {
    const clamped = Math.min(9, Math.max(1, newValue));
    setNumCircuits(clamped);
    if (circuits.length === 0) return; // Initial load handled by useEffect
    const delta = clamped - circuits.length;
    if (delta > 0) {
      // Add circuits at end
      const stationsPerSeries = circuits[0]?.stationsBySeries?.[0]?.length ?? stationsPerCircuit;
      const seriesCountActual = circuits[0]?.stationsBySeries?.length ?? seriesCount;
      const newCircuits: Circuit[] = [...circuits];
      for (let i = 0; i < delta; i++) {
        const letter = CIRCUIT_LETTERS[circuits.length + i];
        const stationsBySeries: Station[][] = [];
        for (let s = 0; s < seriesCountActual; s++) {
          const stationsForThisSeries: Station[] = [];
          for (let j = 0; j < stationsPerSeries; j++) {
            const lastSerie = s === seriesCountActual - 1;
            const lastStation = j === stationsPerSeries - 1;
            const pauseCell =
              executionMode === 'horizontal' && seriesMode === 'count'
                ? lastSerie && !lastStation
                  ? pauseAmongStationsBase
                  : 0
                : pauseAmongStationsBase;
            stationsForThisSeries.push({
              stationNumber: j + 1,
              sector: '',
              exercise: '',
              reps: '',
              pause: pauseCell,
              notes: ''
            });
          }
          stationsBySeries.push(stationsForThisSeries);
        }
        const between = pauseSeries;
        const after = pauseCircuits;
        const slots = seriesPausesSlotCount(seriesCountActual, seriesMode === 'time' ? 'time' : 'count');
        const modeSer = seriesMode === 'time' ? 'time' : 'count';
        newCircuits.push({
          letter,
          stationsBySeries,
          series: seriesCountActual,
          pauseBetweenSeries: between,
          pauseAfterCircuit: after,
          seriesPauses:
            slots > 0
              ? buildDefaultSeriesPauses(
                  {
                    letter,
                    stationsBySeries,
                    series: seriesCountActual,
                    pauseBetweenSeries: between,
                    pauseAfterCircuit: after,
                  },
                  modeSer,
                  between,
                  after
                )
              : undefined
        });
      }
      setCircuits(newCircuits);
    } else if (delta < 0) {
      // Remove circuits from end
      setCircuits(prev => prev.slice(0, clamped));
    }
  };

  // Add Station: add in all series of all circuits. Reduce: remove last station in all series of all circuits.
  // Normalize every series to exactly `clamped` (not delta vs series 0 only — avoids skew after "Add serie").
  const handleStationsPerCircuitChange = (newValue: number) => {
    const clamped = Math.min(9, Math.max(2, newValue));
    setStationsPerCircuit(clamped);
    if (circuits.length === 0) return;
    setCircuits((prev) =>
      prev.map((circuit) => ({
        ...circuit,
        stationsBySeries: circuit.stationsBySeries.map((seriesStations) => {
          if (seriesStations.length < clamped) {
            const newStations = [...seriesStations];
            while (newStations.length < clamped) {
              newStations.push({
                stationNumber: newStations.length + 1,
                sector: '',
                exercise: '',
                reps: '',
                pause: pauseAmongStationsBase,
                notes: '',
              });
            }
            return newStations;
          }
          return seriesStations
            .slice(0, clamped)
            .map((s, idx) => ({ ...s, stationNumber: idx + 1 }));
        }),
      }))
    );
  };

  // Add Serie: add in all circuits. Reduce: remove last serie in all circuits.
  // Uses per-circuit effective series count (matches grid), not only circuit A length — so a stale
  // "Series" field of 1 still applies reduction when every circuit actually has 2+ series.
  const handleSeriesCountChange = (newValue: number) => {
    const clamped = Math.min(5, Math.max(1, newValue));
    setSeriesCount(clamped);
    if (circuits.length === 0) return;
    const pauseMode = seriesMode === 'time' ? 'time' : 'count';
    setCircuits((prev) =>
      prev.map((circuit) => {
        const curEff = effectiveSeriesCountOnCircuit(circuit);
        const delta = clamped - curEff;
        if (delta === 0) return circuit;
        if (delta > 0) {
          const stationsCount =
            circuit.stationsBySeries?.[0]?.length ??
            prev[0]?.stationsBySeries?.[0]?.length ??
            stationsPerCircuit;
          let newStationsBySeries = circuit.stationsBySeries.slice(0, curEff);
          if (executionMode === 'horizontal' && seriesMode === 'count' && newStationsBySeries.length > 0) {
            const lastIdx = newStationsBySeries.length - 1;
            newStationsBySeries = newStationsBySeries.map((row, sIdx) =>
              sIdx === lastIdx
                ? row.map((st, j) => ({
                    ...st,
                    pause: j === row.length - 1 ? st.pause : 0,
                  }))
                : row
            );
          }
          for (let i = 0; i < delta; i++) {
            const stationsForThisSeries: Station[] = [];
            for (let j = 0; j < stationsCount; j++) {
              const lastStation = j === stationsCount - 1;
              const pauseCell =
                executionMode === 'horizontal' && seriesMode === 'count'
                  ? !lastStation
                    ? pauseAmongStationsBase
                    : 0
                  : pauseAmongStationsBase;
              stationsForThisSeries.push({
                stationNumber: j + 1,
                sector: '',
                exercise: '',
                reps: '',
                pause: pauseCell,
                notes: '',
              });
            }
            newStationsBySeries.push(stationsForThisSeries);
          }
          const newN = newStationsBySeries.length;
          const targetLen = seriesPausesSlotCount(newN, pauseMode);
          const between = circuit.pauseBetweenSeries ?? pauseSeries;
          const after = circuit.pauseAfterCircuit ?? pauseCircuits;
          const sp =
            targetLen > 0
              ? buildDefaultSeriesPauses(
                  {
                    ...circuit,
                    stationsBySeries: newStationsBySeries,
                    series: newN,
                    seriesPauses: circuit.seriesPauses,
                  },
                  pauseMode,
                  between,
                  after
                )
              : undefined;
          return {
            ...circuit,
            stationsBySeries: newStationsBySeries,
            series: newN,
            seriesPauses: sp,
          };
        }
        let pauses = circuit.seriesPauses;
        let curN = curEff;
        while (curN > clamped) {
          pauses = seriesPausesAfterRemovingSerie(pauses, curN - 1, pauseMode);
          curN -= 1;
        }
        return {
          ...circuit,
          stationsBySeries: circuit.stationsBySeries.slice(0, clamped),
          series: clamped,
          seriesPauses: pauses,
        };
      })
    );
  };
  
  const handleRemoveCircuit = (circuitLetter: string) => {
    // 2026-01-21 19:40 UTC - Remove entire circuit
    // 2026-01-26 - Fixed: Re-assign letters to remaining circuits and preserve all settings
    // 2026-01-26 - Added confirmation dialog
    if (circuits.length <= 1) {
      alert('You must have at least one circuit');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete Circuit ${circuitLetter}? This will remove all its series and stations.`)) {
      return;
    }
    
    // Filter out the circuit and re-assign letters to preserve settings
    const updatedCircuits = circuits
      .filter(c => c.letter !== circuitLetter)
      .map((circuit, index) => ({
        ...circuit,
        letter: CIRCUIT_LETTERS[index] // Re-assign letters: A, B, C, etc.
      }));
    setCircuits(updatedCircuits);
    // DON'T update numCircuits - it would trigger useEffect and regenerate all circuits!
  };
  
  const removeSeries = (circuitLetter: string, seriesNumber: number) => {
    // 2026-01-21 21:55 UTC - Remove one series from a SPECIFIC circuit only
    // 2026-01-22 12:20 UTC - Fixed to remove from stationsBySeries array
    // 2026-01-26 - Added confirmation dialog
    // Do NOT update global seriesCount - only update this circuit's series
    
    if (!confirm(`Are you sure you want to delete Series ${seriesNumber} of Circuit ${circuitLetter}? This will remove all its stations.`)) {
      return;
    }
    
    setCircuits(prevCircuits => prevCircuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        if (circuit.series <= 1) {
          alert('Circuit must have at least 1 series');
          return circuit;
        }
        // Remove the series at the specified index (seriesNumber is 1-based)
        const seriesIndex = seriesNumber - 1;
        const newStationsBySeries = circuit.stationsBySeries.filter((_, idx) => idx !== seriesIndex);
        const newSeriesPauses = seriesPausesAfterRemovingSerie(
          circuit.seriesPauses,
          seriesIndex,
          seriesMode === 'time' ? 'time' : 'count'
        );

        return {
          ...circuit,
          stationsBySeries: newStationsBySeries,
          series: circuit.series - 1,
          seriesPauses: newSeriesPauses
        };
      }
      return circuit;
    }));
    // DO NOT update global seriesCount - it should not affect other circuits
  };
  
  const handleRemoveStation = (circuitLetter: string, stationNumber: number, seriesNumber?: number) => {
    // 2026-01-21 19:40 UTC - Remove station from circuit
    // 2026-01-22 12:15 UTC - Updated to work with series-specific stations
    // 2026-01-22 14:00 UTC - Added seriesNumber parameter to remove from specific series only
    // 2026-01-26 - Added confirmation dialog
    
    const seriesText = seriesNumber !== undefined ? ` from Series ${seriesNumber}` : ' from all series';
    if (!confirm(`Are you sure you want to delete Station ${stationNumber}${seriesText} of Circuit ${circuitLetter}?`)) {
      return;
    }
    
    setCircuits(circuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, idx) => {
          // If seriesNumber is provided, only remove from that specific series
          if (seriesNumber !== undefined && idx !== seriesNumber - 1) {
            return seriesStations; // Keep this series unchanged
          }
          // Remove the station
          const filteredStations = seriesStations.filter(s => s.stationNumber !== stationNumber);
          // Renumber remaining stations
          return filteredStations.map((s, idx) => ({ ...s, stationNumber: idx + 1 }));
        });
        return {
          ...circuit,
          stationsBySeries: newStationsBySeries
        };
      }
      return circuit;
    }));
  };
  
  const handleCircuitLetterClick = (circuitLetter: string) => {
    // 2026-01-21 19:45 UTC - Open sector selector for entire circuit
    // 2026-01-22 12:40 UTC - Updated to support drag-and-drop for each station
    setSelectedCircuitForSector(circuitLetter);
    setSelectedStationForSector(null); // Show all stations
    setPreviousStationSector(null); // 2026-01-26 - Clear previous sector highlight
    setShowSectorSelector(true);
  };
  
  // 2026-01-22 13:10 UTC - Open sector selector for a specific station
  // 2026-01-26 - Track previous station's sector for highlighting
  const handleSectorCellClick = (circuitLetter: string, seriesIdx: number, stationNumber: number) => {
    setSelectedStationForSector({circuitLetter, seriesIdx, stationNumber});
    
    // Find the previous station's sector to highlight it
    const circuit = circuits.find(c => c.letter === circuitLetter);
    if (circuit) {
      const seriesStations = circuit.stationsBySeries[seriesIdx];
      const currentStationIdx = seriesStations.findIndex(s => s.stationNumber === stationNumber);
      
      if (currentStationIdx > 0) {
        // There is a previous station - look for the last one with a sector
        let foundPreviousSector = null;
        for (let i = currentStationIdx - 1; i >= 0; i--) {
          if (seriesStations[i].sector) {
            foundPreviousSector = seriesStations[i].sector;
            break;
          }
        }
        console.log('Previous sector found:', foundPreviousSector);
        setPreviousStationSector(foundPreviousSector);
      } else {
        // First station, no previous
        console.log('No previous station (first station)');
        setPreviousStationSector(null);
      }
    }
    
    setShowSectorSelector(true);
  };

  const sectorPresenceByCircuitSeries = React.useMemo(() => {
    const map: Record<string, string[]> = {};

    circuits.forEach((circuit) => {
      circuit.stationsBySeries.forEach((seriesStations, seriesIdx) => {
        seriesStations.forEach((station) => {
          const sectorName = (station.sector || '').trim();
          if (!sectorName) return;

          const slot = `${circuit.letter}${seriesIdx + 1}`;
          if (!map[sectorName]) map[sectorName] = [];
          if (!map[sectorName].includes(slot)) {
            map[sectorName].push(slot);
          }
        });
      });
    });

    return map;
  }, [circuits]);
  
  // 2026-01-22 12:40 UTC - Handle dragging muscular area
  const handleDragStart = (e: React.DragEvent, sector: string) => {
    e.dataTransfer.setData('sector', sector);
  };
  
  // 2026-01-22 12:50 UTC - Handle dragging from station to station
  const handleDragStartFromStation = (e: React.DragEvent, sector: string, circuitLetter: string, seriesIdx: number, stationNumber: number) => {
    e.dataTransfer.setData('sector', sector);
    e.dataTransfer.setData('sourceCircuit', circuitLetter);
    e.dataTransfer.setData('sourceSeriesIdx', seriesIdx.toString());
    e.dataTransfer.setData('sourceStationNumber', stationNumber.toString());
  };
  
  // 2026-01-22 12:40 UTC - Handle dropping on a station
  // 2026-01-22 12:50 UTC - Updated to handle dragging between stations
  // 2026-01-22 13:05 UTC - Don't clear if dragging to the same station
  const handleDropOnStation = (e: React.DragEvent, circuitLetter: string, seriesIdx: number, stationNumber: number) => {
    e.preventDefault();
    const sector = e.dataTransfer.getData('sector');
    const sourceCircuit = e.dataTransfer.getData('sourceCircuit');
    const sourceSeriesIdx = e.dataTransfer.getData('sourceSeriesIdx');
    const sourceStationNumber = e.dataTransfer.getData('sourceStationNumber');
    
    if (sector) {
      const srcSeriesIdx = sourceSeriesIdx ? parseInt(sourceSeriesIdx) : -1;
      const srcStationNum = sourceStationNumber ? parseInt(sourceStationNumber) : -1;
      const isDraggingFromStation = sourceCircuit && !isNaN(srcSeriesIdx) && !isNaN(srcStationNum);
      const horizCount = executionMode === 'horizontal' && seriesMode === 'count';

      if (horizCount) {
        if (isDraggingFromStation && sourceCircuit === circuitLetter && srcStationNum === stationNumber) {
          return;
        }
        setCircuits((prevCircuits) =>
          prevCircuits.map((circuit) => {
            let rows = circuit.stationsBySeries;
            if (isDraggingFromStation && circuit.letter === sourceCircuit) {
              rows = rows.map((seriesStations) =>
                seriesStations.map((station) =>
                  station.stationNumber === srcStationNum
                    ? { ...station, sector: '', exercise: '', reps: '', notes: '' }
                    : station
                )
              );
            }
            if (circuit.letter === circuitLetter) {
              rows = rows.map((seriesStations) =>
                seriesStations.map((station) =>
                  station.stationNumber === stationNumber
                    ? {
                        ...station,
                        sector,
                        // Changing sector for a station column invalidates old exercise picks.
                        exercise: '',
                        notes: '',
                      }
                    : station
                )
              );
            }
            return { ...circuit, stationsBySeries: rows };
          })
        );
        return;
      }

      // Check if dragging to the same station - if so, do nothing
      if (isDraggingFromStation && 
          sourceCircuit === circuitLetter && 
          srcSeriesIdx === seriesIdx && 
          srcStationNum === stationNumber) {
        return; // Don't do anything if dropping on the same station
      }
      
      setCircuits(prevCircuits => prevCircuits.map(circuit => {
        // Handle both source and target if they're in the same circuit
        if (isDraggingFromStation && circuit.letter === sourceCircuit && circuit.letter === circuitLetter) {
          const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
            return seriesStations.map(station => {
              // Clear source station (also clear exercise and reps)
              if (sIdx === srcSeriesIdx && station.stationNumber === srcStationNum) {
                return { ...station, sector: '', exercise: '', reps: '', notes: '' };
              }
              // Set target station
              if (sIdx === seriesIdx && station.stationNumber === stationNumber) {
                return { ...station, sector };
              }
              return station;
            });
          });
          return { ...circuit, stationsBySeries: newStationsBySeries };
        }
        
        // Clear source station if in different circuit (also clear exercise and reps)
        if (isDraggingFromStation && circuit.letter === sourceCircuit) {
          const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
            if (sIdx === srcSeriesIdx) {
              return seriesStations.map(station => 
                station.stationNumber === srcStationNum 
                  ? { ...station, sector: '', exercise: '', reps: '', notes: '' }
                  : station
              );
            }
            return seriesStations;
          });
          return { ...circuit, stationsBySeries: newStationsBySeries };
        }
        
        // Set target station if in different circuit or dragging from modal
        if (circuit.letter === circuitLetter) {
          const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
            if (sIdx === seriesIdx) {
              return seriesStations.map(station => 
                station.stationNumber === stationNumber 
                  ? { ...station, sector } 
                  : station
              );
            }
            return seriesStations;
          });
          return { ...circuit, stationsBySeries: newStationsBySeries };
        }
        
        return circuit;
      }));
    }
  };
  
  // 2026-01-22 12:50 UTC - Remove sector from a station
  // 2026-01-26 - Also clear exercise and reps when sector is removed, added confirmation
  const handleRemoveSector = (circuitLetter: string, seriesIdx: number, stationNumber: number) => {
    const horiz = executionMode === 'horizontal' && seriesMode === 'count';
    const msg = horiz
      ? `Remove sector from Circuit ${circuitLetter}, Station ${stationNumber} (all series)? This will also clear related exercises and reps.`
      : `Remove sector from Circuit ${circuitLetter}, Series ${seriesIdx + 1}, Station ${stationNumber}? This will also clear the exercise and reps.`;
    if (!confirm(msg)) {
      return;
    }
    
    setCircuits(prevCircuits => prevCircuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        if (horiz) {
          return {
            ...circuit,
            stationsBySeries: circuit.stationsBySeries.map((seriesStations) =>
              seriesStations.map((station) =>
                station.stationNumber === stationNumber
                  ? { ...station, sector: '', exercise: '', reps: '', notes: '' }
                  : station
              )
            ),
          };
        }
        const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
          if (sIdx === seriesIdx) {
            return seriesStations.map(station => 
              station.stationNumber === stationNumber 
                ? { ...station, sector: '', exercise: '', reps: '', notes: '' }
                : station
            );
          }
          return seriesStations;
        });
        return { ...circuit, stationsBySeries: newStationsBySeries };
      }
      return circuit;
    }));
  };
  
  // 2026-01-22 12:40 UTC - Reply areas button - copy sectors from series 1 to all other series
  const handleReplyAreas = (circuitLetter: string) => {
    setCircuits(prevCircuits => prevCircuits.map(circuit => {
      if (circuit.letter === circuitLetter && circuit.stationsBySeries.length > 0) {
        const series1Sectors = circuit.stationsBySeries[0]; // Get series 1 sectors
        const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
          if (sIdx === 0) return seriesStations; // Keep series 1 as is
          // Copy sectors from series 1 to this series
          return seriesStations.map((station, stIdx) => ({
            ...station,
            sector: series1Sectors[stIdx]?.sector || ''
          }));
        });
        return { ...circuit, stationsBySeries: newStationsBySeries };
      }
      return circuit;
    }));
  };
  
  const handleSectorSelect = (sector: string) => {
    // 2026-01-21 19:45 UTC - Assign sector to all stations in circuit
    // 2026-01-22 12:15 UTC - Updated to work with series-specific stations
    if (selectedCircuitForSector) {
      setCircuits(circuits.map(circuit => {
        if (circuit.letter === selectedCircuitForSector) {
          return {
            ...circuit,
            stationsBySeries: circuit.stationsBySeries.map(seriesStations =>
              seriesStations.map(s => ({ ...s, sector }))
            )
          };
        }
        return circuit;
      }));
    }
    setShowSectorSelector(false);
    setSelectedCircuitForSector(null);
  };
  
  /** Open the exercise selection modal for this station (same as "Select exercise + rip" from dropdown). */
  const handleExerciseClick = (circuitLetter: string, seriesNum: number, stationNumber: number) => {
    setSelectedStationForExercise({ circuit: circuitLetter, series: seriesNum, station: stationNumber });
    const circuitIdx = circuits.findIndex(c => c.letter === circuitLetter);
    const seriesIdx = Math.max(0, seriesNum - 1);
    const circuit = circuitIdx >= 0 ? circuits[circuitIdx] : null;
    const stationIdx = circuit?.stationsBySeries?.[seriesIdx]?.findIndex(s => s.stationNumber === stationNumber) ?? -1;
    if (circuit && stationIdx >= 0) {
      setSelectedStationForManualExercise({ circuitIdx, seriesIdx, stationIdx });
      setShowAllSectorsInManual(false);
      setShowManualExerciseModal(true);
    }
  };

  /** Auto-load exercise for station: open manual exercise modal to choose/load exercise. */
  const handleLoadAutoExercise = (_circuitLetter: string, _seriesNumber: number, _stationNumber: number) => {
    setShowManualExerciseModal(true);
  };
  
  const handleCreateCircuit = () => {
    // 2026-01-21 20:15 UTC - Move from config phase to table phase
    setCurrentPhase('table');
  };

  /** Build circuit grid from current config (used by Proceed). */
  const buildCircuitsFromConfig = (): Circuit[] => {
    const newCircuits: Circuit[] = [];
    const nCircuits = circuits.length || numCircuits;
    const nStations = circuits[0]?.stationsBySeries?.[0]?.length ?? stationsPerCircuit;
    const nSeries = circuits[0]?.stationsBySeries?.length ?? seriesCount;
    for (let i = 0; i < nCircuits; i++) {
      const stationsBySeries: Station[][] = [];
      for (let s = 0; s < nSeries; s++) {
        const stations: Station[] = [];
        for (let j = 0; j < nStations; j++) {
          const lastSerie = s === nSeries - 1;
          const lastStation = j === nStations - 1;
          const pauseCell =
            executionMode === 'horizontal' && seriesMode === 'count'
              ? lastSerie && !lastStation
                ? pauseAmongStationsBase
                : 0
              : pauseAmongStationsBase;
          stations.push({
            stationNumber: j + 1,
            sector: '',
            exercise: '',
            reps: '',
            pause: pauseCell,
            notes: ''
          });
        }
        stationsBySeries.push(stations);
      }
      const between = pauseSeries;
      const after = pauseCircuits;
      const slots = seriesPausesSlotCount(nSeries, seriesMode === 'time' ? 'time' : 'count');
      const modeSer = seriesMode === 'time' ? 'time' : 'count';
      const letter = CIRCUIT_LETTERS[i];
      newCircuits.push({
        letter,
        stationsBySeries,
        series: nSeries,
        pauseBetweenSeries: between,
        pauseAfterCircuit: after,
        seriesPauses:
          slots > 0
            ? buildDefaultSeriesPauses(
                {
                  letter,
                  stationsBySeries,
                  series: nSeries,
                  pauseBetweenSeries: between,
                  pauseAfterCircuit: after,
                },
                modeSer,
                between,
                after
              )
            : undefined
      });
    }
    return newCircuits;
  };

  /** Proceed: apply config and (re)build circuit grid. Alert only if circuits were already created (data will be reset). */
  const handleProceedFromConfig = () => {
    const circuitsAlreadyCreated = circuits.length > 0;
    if (circuitsAlreadyCreated) {
      const message = 'All the data of the current circuits will be reset. Do you want to continue?';
      if (!confirm(message)) return;
    }
    setCircuits(buildCircuitsFromConfig());
    setActionLog(prev => [...prev, circuitsAlreadyCreated ? 'Circuit grid reset from config' : 'Proceeded to circuit grid']);
  };
  
  const generateMovelaps = (overrideCircuits?: Circuit[]) => {
    // 2026-01-22 10:30 UTC - Generate movelaps from circuit configuration
    // 2026-01-22 12:15 UTC - Fixed to use series-specific stations
    // 2026-03-30 - One movelap per grid cell (sum of station slots).
    // Horizontal + Count: visit all series at station 1, then station 2, … Pause\series (blue row)
    // rests between series at the same station; pause-after-all-series rests after the last serie before the next station.
    const movelaps: any[] = [];
    let workoutSeriesBase = 1; // Per grid serie row, continuous across circuits (same as legacy globalSeriesNumber start)
    let sequenceNumber = 1;
    const circuitsToUse = overrideCircuits ?? circuits;
    const lapMacroFinal = circuitLoadOfWorkToMacroFinal(loadOfWork);
    const loadTrim = String(loadOfWork ?? '').trim();
    const finalMacroPauseSeconds = /^[0-9]$/.test(loadTrim) ? parseInt(loadTrim, 10) * 60 : 0;

    circuitsToUse.forEach((circuit, circuitIndex) => {
      const seriesRows = Array.isArray(circuit.stationsBySeries) ? circuit.stationsBySeries : [];
      const nSer = seriesRows.length;
      const nSta = seriesRows[0]?.length ?? 0;
      const isLastCircuit = circuitIndex === circuitsToUse.length - 1;

      if (executionMode === 'horizontal' && seriesMode === 'count' && nSer > 0 && nSta > 0) {
        for (let j = 0; j < nSta; j++) {
          for (let s = 0; s < nSer; s++) {
            const seriesStations = seriesRows[s];
            if (!Array.isArray(seriesStations) || !seriesStations[j]) continue;
            const station = seriesStations[j];
            if (!circuitStationProducesMovelap(station)) continue;

            const isLastSeriesAtStation = s === nSer - 1;
            const isLastStationCol = j === nSta - 1;

            let effectivePause: number;
            if (!isLastSeriesAtStation) {
              effectivePause =
                circuit.seriesPauses?.[s] ?? circuit.pauseBetweenSeries ?? pauseSeries;
            } else if (!isLastStationCol) {
              effectivePause = station.pause ?? pauseAmongStationsBase;
            } else {
              effectivePause = isLastCircuit
                ? finalMacroPauseSeconds
                : (circuit.pauseAfterCircuit ?? pauseCircuits);
            }

            movelaps.push({
              repetitionNumber: sequenceNumber,
              circuitLetter: circuit.letter,
              circuitIndex: circuitIndex + 1,
              seriesNumber: workoutSeriesBase + s,
              localSeriesNumber: s + 1,
              stationNumber: station.stationNumber,
              sector: station.sector || '',
              exercise: station.exercise || '',
              reps: station.reps || '',
              pause: effectivePause,
              macroFinal: lapMacroFinal,
              muscularSector: station.sector || '',
              distance: '',
              time: '',
              pace: '',
              speed: '',
              restType: 'SET_TIME',
              restTime: null,
              notes: station.notes || '',
              alarm: false,
              sound: false,
              status: 'PENDING',
              isSkipped: false,
              isDisabled: false
            });
            sequenceNumber++;
          }
        }
        workoutSeriesBase += nSer;
        return;
      }

      seriesRows.forEach((seriesStations, seriesIdx) => {
        if (!Array.isArray(seriesStations) || seriesStations.length === 0) return;
        const seriesNum = seriesIdx + 1;
        seriesStations.forEach((station, stationIndex) => {
          if (!circuitStationProducesMovelap(station)) return;
          const isLastStationOfSeries = stationIndex === seriesStations.length - 1;
          const isLastSeriesOfCircuit = seriesIdx === seriesRows.length - 1;

          let effectivePause: number;
          if (isLastStationOfSeries) {
            if (isLastSeriesOfCircuit) {
              if (isLastCircuit) {
                effectivePause = finalMacroPauseSeconds;
              } else {
                // Continuous Time: yellow Between Circuits + synced seriesPauses[last]; Count: pauseAfterCircuit only
                effectivePause =
                  seriesMode === 'time'
                    ? (circuit.seriesPauses?.[seriesIdx] ?? circuit.pauseAfterCircuit ?? pauseCircuits)
                    : (circuit.pauseAfterCircuit ?? pauseCircuits);
              }
            } else {
              effectivePause =
                circuit.seriesPauses?.[seriesIdx] ?? circuit.pauseBetweenSeries ?? pauseSeries;
            }
          } else {
            effectivePause = station.pause || pauseAmongStationsBase;
          }

          movelaps.push({
            repetitionNumber: sequenceNumber,
            circuitLetter: circuit.letter,
            circuitIndex: circuitIndex + 1,
            seriesNumber: workoutSeriesBase + seriesIdx,
            localSeriesNumber: seriesNum,
            stationNumber: station.stationNumber,
            sector: station.sector || '',
            exercise: station.exercise || '',
            reps: station.reps || '',
            pause: effectivePause,
            macroFinal: lapMacroFinal,
            muscularSector: station.sector || '',
            distance: '',
            time: '',
            pace: '',
            speed: '',
            restType: 'SET_TIME',
            restTime: null,
            notes: station.notes || '',
            alarm: false,
            sound: false,
            status: 'PENDING',
            isSkipped: false,
            isDisabled: false
          });
          sequenceNumber++;
        });
      });
      workoutSeriesBase += nSer;
    });

    return movelaps;
  };

  const handleSave = (overrideCircuits?: Circuit[]) => {
    // 2026-01-21 19:55 UTC - Validate and save circuit configuration
    // 2026-01-22 10:20 UTC - Include preview description for moveframe
    // 2026-01-22 10:30 UTC - Generate movelaps from circuit configuration
    // 2026-03-12 - Ensure circuit-level pause overrides (from grid) are preserved for movelaps display
    const circuitsToSave = overrideCircuits ?? circuits;
    const movelaps = generateMovelaps(circuitsToSave);
    if (!movelaps || movelaps.length === 0) {
      alert(
        'Cannot save: add at least one station with a muscular sector (exercise can be chosen later), or pick an exercise. Fully empty rows are skipped.'
      );
      return;
    }
    const description = `${generatePreviewStructurePlanned(circuitsToSave)} | ${generatePreviewRealData(circuitsToSave)}`;
    // Normalize circuits so each explicitly has pauseAfterCircuit and pauseBetweenSeries (grid-edited values)
    const circuitsWithPauses = circuitsToSave.map((c) => {
      const after = typeof c.pauseAfterCircuit === 'number' ? c.pauseAfterCircuit : pauseCircuits;
      const between =
        typeof c.pauseBetweenSeries === 'number' ? c.pauseBetweenSeries : pauseSeries;
      return { ...c, pauseBetweenSeries: between, pauseAfterCircuit: after };
    });
    
    console.log('💾 [handleSave] Generated movelaps:', movelaps);
    console.log('💾 [handleSave] Description to save:', description);
    
    // Use circuit-level pause overrides (from grid) for config fallback when displaying movelaps
    const firstCircuitPauseAfter = circuitsWithPauses.find((c) => typeof c.pauseAfterCircuit === 'number')?.pauseAfterCircuit;
    const firstCircuitPauseBetween = circuitsWithPauses.find((c) => typeof c.pauseBetweenSeries === 'number')?.pauseBetweenSeries;
    
    const circuitData = {
      circuits: circuitsWithPauses,
      description, // Preview to be used as moveframe description
      movelaps, // Generated movelaps for the moveframe
      config: {
        numCircuits,
        stationsPerCircuit,
        seriesMode,
        seriesCount,
        seriesTime,
        executionMode,
        loadOfWork,
        pauses: {
          stations: executionMode === 'horizontal' ? pauseHorizontalSeries : pauseStations,
          circuits: firstCircuitPauseAfter ?? pauseCircuits,
          series: firstCircuitPauseBetween ?? pauseSeries,
          horizontalSeries: pauseHorizontalSeries
        }
      }
    };
    
    console.log('💾 [handleSave] Calling onSave with circuitData:', circuitData);
    onSave(circuitData);
  };

  const closeManualExerciseFlow = () => {
    setShowManualExerciseModal(false);
    setSelectedStationForManualExercise(null);
    setPendingExercise(null);
    setShowAllSectorsInManual(false);
    if (initialConfig?.editingFromMovelap) {
      onCancel();
    }
  };

  const renderExerciseSelectionModal = () => {
    if (!showManualExerciseModal || !selectedStationForManualExercise || pendingExercise) return null;

    const { circuitIdx, seriesIdx, stationIdx } = selectedStationForManualExercise;
    const currentStation = circuits[circuitIdx]?.stationsBySeries[seriesIdx]?.[stationIdx];
    const lapData = initialConfig?.editingMovelapData;
    const currentSector = currentStation?.sector || lapData?.muscularSector || lapData?.sector || '';
    const currentExerciseName = currentStation?.exercise || lapData?.exercise || '';
    const hasExistingExercise = !!currentExerciseName;
    const currentNotes = currentStation?.notes || (typeof lapData?.notes === 'string' ? lapData.notes : '') || '';

    // Derive sector from exercise if sector is missing
    const derivedSector = (() => {
      if (currentSector) return currentSector;
      if (!currentExerciseName) return '';
      const all = getAllSectors();
      for (let s of all) {
        const exs = getExercisesBySector(s);
        if (exs.some(e => e.name === currentExerciseName)) {
          return s;
        }
      }
      return initialConfig?.editingMovelapData?.sector || initialConfig?.editingMovelapData?.muscularSector || '';
    })();

    const isEditingFromMovelap = !!initialConfig?.editingFromMovelap;
    const hasSelectedSectorWithoutExercise = !!currentSector && !hasExistingExercise;
    const shouldFilterToSingleSector =
      !showAllSectorsInManual &&
      !!derivedSector &&
      (isEditingFromMovelap || hasSelectedSectorWithoutExercise);
    const sectorsToShow = shouldFilterToSingleSector ? [derivedSector] : getAllSectors();
    const isSectorLocked = shouldFilterToSingleSector;
    const circuitForPicker = circuits[circuitIdx];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{hasExistingExercise ? 'Edit Exercise' : 'Select Exercise'}</h3>
            <button onClick={closeManualExerciseFlow} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <span className="font-semibold text-gray-600">Legend:</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-yellow-300 ring-1 ring-yellow-500/60" aria-hidden />
              Already used in another serie of this circuit
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full bg-green-400 ring-1 ring-green-600/50" aria-hidden />
              Already used in this serie
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border-2 border-red-500 bg-red-100" aria-hidden />
              Current exercise / sector (editing)
            </span>
          </div>

          {hasExistingExercise && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                Editing <strong>{currentExerciseName}</strong> from <strong>{currentSector || derivedSector}</strong> muscle group.
                <br />
                Select a different exercise from the same group or click the current one to edit reps/pause.
              </p>
            </div>
          )}

          {shouldFilterToSingleSector && (currentSector || derivedSector) && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-gray-600">Showing exercises for sector: <strong className="text-blue-700">{currentSector || derivedSector}</strong></span>
              <button
                onClick={() => setShowAllSectorsInManual(true)}
                className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                title="Reset - display all sectors"
              >
                Reset
              </button>
            </div>
          )}

          <div className="space-y-4">
            {sectorsToShow.map((sector) => {
              const exercises = getExercisesBySector(sector);
              const isSectorDisabled = isSectorLocked && sector !== derivedSector;
              const isCurrentSector = !!(currentSector || derivedSector) && sector === (currentSector || derivedSector);
              return (
                <div
                  key={sector}
                  className={`rounded-lg p-3 ${isSectorDisabled ? 'opacity-50 pointer-events-none' : ''} ${
                    isCurrentSector
                      ? 'border-2 border-red-500 bg-red-50/80 shadow-sm'
                      : 'border border-gray-200 bg-white'
                  }`}
                >
                  <h4 className={`font-semibold text-sm mb-2 flex items-center gap-2 ${isSectorDisabled ? 'text-gray-500' : 'text-blue-700'}`}>
                    {sector}
                    {isCurrentSector && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 font-medium">
                        Current sector
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {exercises.map((exercise, exIndex) => {
                      const isCurrentExercise = exercise.name === currentExerciseName;
                      const { inCurrentSeries, inOtherSeries } = getExerciseCircuitSeriesUsage(
                        circuitForPicker,
                        exercise.name,
                        seriesIdx
                      );
                      const sectorImgPick = MUSCULAR_SECTOR_IMAGES[sector] ?? null;
                      const mediaRow = getExerciseMedia(exercise.name);
                      // Picture A: catalog A → generated bank thumb (SVG) → sector diagram
                      const rowSrc =
                        (mediaRow?.pictureA && mediaRow.pictureA.trim()) ||
                        mediaRow?.thumb?.src ||
                        (mediaRow?.pictureB && mediaRow.pictureB.trim()) ||
                        sectorImgPick ||
                        null;

                      let exercisePickClasses =
                        'flex items-center gap-2 px-2 py-2 text-xs border rounded text-left transition-all ';
                      if (isSectorDisabled) {
                        exercisePickClasses +=
                          'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed';
                      } else if (isCurrentExercise) {
                        exercisePickClasses +=
                          'bg-red-100 border-red-500 border-2 font-semibold hover:bg-red-200';
                      } else if (inCurrentSeries) {
                        exercisePickClasses +=
                          'bg-green-100 border-green-400 hover:bg-green-200';
                      } else if (inOtherSeries) {
                        exercisePickClasses +=
                          'bg-yellow-100 border-yellow-400 hover:bg-yellow-200';
                      } else {
                        exercisePickClasses += 'bg-gray-100 border-gray-300 hover:bg-blue-50';
                      }

                      return (
                        <button
                          key={exercise.id}
                          onClick={
                            isSectorDisabled
                              ? undefined
                              : () => {
                            const { circuitIdx, seriesIdx, stationIdx } = selectedStationForManualExercise;
                            const defaultRepsFallback = '10';
                            let defaultReps = '';
                            let defaultPause = pauseAmongStationsBase;
                            let defaultNotes = currentNotes || '';

                            // When editing from movelap, prefer the movelap's data as default for this station
                            const lapReps = lapData?.reps != null ? String(lapData.reps) : '';
                            const lapPause =
                              lapData != null ? parsePauseFromMovelap(lapData.pause) : pauseAmongStationsBase;
                            const lapNotes = (typeof lapData?.notes === 'string' ? lapData.notes : '') || '';

                            // If re-selecting the current exercise, keep values from this exact station or movelap
                            if (currentStation?.exercise === exercise.name || (lapData && lapData.exercise === exercise.name)) {
                              defaultReps = currentStation?.reps || lapReps || defaultRepsFallback;
                              defaultPause = currentStation?.pause ?? (lapData ? lapPause : pauseAmongStationsBase);
                              defaultNotes = currentStation?.notes || lapNotes || currentNotes || '';
                            }

                            // Otherwise, prefer defaults from another occurrence of the selected exercise in the grid
                            if (!defaultReps) {
                              outer: {
                                for (let ci = 0; ci < circuits.length; ci++) {
                                  for (let si = 0; si < circuits[ci].stationsBySeries.length; si++) {
                                    const seriesStations = circuits[ci].stationsBySeries[si];
                                    for (let st = 0; st < seriesStations.length; st++) {
                                      const s = seriesStations[st];
                                      if (s.exercise === exercise.name) {
                                        defaultReps = s.reps || defaultRepsFallback;
                                        defaultPause = s.pause || pauseAmongStationsBase;
                                        defaultNotes = s.notes || defaultNotes;
                                        break outer;
                                      }
                                    }
                                  }
                                }
                              }
                            }

                            if (currentStation?.exercise && !defaultReps) {
                              defaultReps = currentStation.reps || defaultRepsFallback;
                              defaultPause = currentStation.pause || pauseAmongStationsBase;
                              defaultNotes = currentStation.notes || defaultNotes;
                            } else if (!currentStation?.exercise && !defaultReps) {
                              for (let i = stationIdx - 1; i >= 0; i--) {
                                const prevStation = circuits[circuitIdx]?.stationsBySeries[seriesIdx]?.[i];
                                if (prevStation?.exercise) {
                                  defaultReps = prevStation.reps || defaultRepsFallback;
                                  defaultPause = prevStation.pause || pauseAmongStationsBase;
                                  defaultNotes = prevStation.notes || defaultNotes;
                                  break;
                                }
                              }

                              if (!defaultReps && seriesIdx > 0) {
                                for (let si = seriesIdx - 1; si >= 0; si--) {
                                  const seriesStations = circuits[circuitIdx]?.stationsBySeries[si] || [];
                                  for (let i = seriesStations.length - 1; i >= 0; i--) {
                                    if (seriesStations[i]?.exercise) {
                                      defaultReps = seriesStations[i].reps || defaultRepsFallback;
                                      defaultPause = seriesStations[i].pause || pauseAmongStationsBase;
                                      defaultNotes = seriesStations[i].notes || defaultNotes;
                                      break;
                                    }
                                  }
                                  if (defaultReps) break;
                                }
                              }
                            }

                            if (!defaultReps) {
                              defaultReps = lapReps || defaultRepsFallback;
                            }
                            if (
                              lapData &&
                              defaultPause === pauseAmongStationsBase &&
                              lapPause !== pauseAmongStationsBase
                            ) {
                              defaultPause = lapPause;
                            }
                            if (lapData && !defaultNotes && lapNotes) {
                              defaultNotes = lapNotes;
                            }

                            setPendingExercise({
                              name: exercise.name,
                              sector: sector,
                              reps: defaultReps,
                              pause: defaultPause,
                              notes: defaultNotes
                            });
                          }}
                          className={exercisePickClasses}
                          title={
                            isCurrentExercise
                              ? 'Current exercise — click to edit reps / pause'
                              : inCurrentSeries
                                ? 'Already placed in this serie'
                                : inOtherSeries
                                  ? 'Used in another serie of this circuit'
                                  : undefined
                          }
                          disabled={isSectorDisabled}
                        >
                          <span
                            className="relative h-12 w-12 min-h-[3rem] min-w-[3rem] flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-white"
                            title="Picture A"
                          >
                            {!rowSrc ? (
                              <span
                                className="flex h-full w-full items-center justify-center bg-gray-100 text-[9px] font-medium text-gray-500 leading-tight text-center px-0.5"
                                aria-hidden
                              >
                                A
                              </span>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element -- data: SVG + absolute /public paths; reliable in modal
                              <img
                                src={rowSrc}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 leading-snug">
                            <span className="text-[10px] font-mono text-gray-500">
                              #{String(exIndex + 1).padStart(2, '0')}
                            </span>{' '}
                            {exercise.name}
                            {isCurrentExercise && (
                              <span className="mt-0.5 block text-red-700">(Current)</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderRepsEditorModal = () => {
    if (!showManualExerciseModal || !selectedStationForManualExercise || !pendingExercise) return null;

    const sectorImgRep =
      pendingExercise.sector && MUSCULAR_SECTOR_IMAGES[pendingExercise.sector]
        ? MUSCULAR_SECTOR_IMAGES[pendingExercise.sector]
        : null;
    const mediaRep = getExerciseMedia(pendingExercise.name);
    const srcRepA =
      (mediaRep?.pictureA && mediaRep.pictureA.trim()) || sectorImgRep || null;
    const srcRepB =
      (mediaRep?.pictureB && mediaRep.pictureB.trim()) ||
      (mediaRep?.pictureA && mediaRep.pictureA.trim()) ||
      sectorImgRep ||
      null;

    const openRepGallery = () => {
      setExerciseGallery({
        title: pendingExercise.name,
        pictureA: mediaRep?.pictureA ?? sectorImgRep,
        pictureB: mediaRep?.pictureB ?? mediaRep?.pictureA ?? sectorImgRep,
      });
    };

    const renderRepPictureThumb = (label: string, src: string | null) => {
      const isData = !!src && src.startsWith('data:');
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</span>
          <button
            type="button"
            title="Enlarge picture A and B"
            onClick={openRepGallery}
            className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 shadow-sm hover:ring-2 hover:ring-teal-500"
          >
            {!src ? (
              <span className="px-2 text-center text-[10px] leading-tight text-gray-400">No image</span>
            ) : isData ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs for catalog SVG/thumbs
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image src={src} alt="" width={112} height={112} className="h-full w-full object-cover" unoptimized />
            )}
          </button>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Edit Exercise</h3>
            <button onClick={closeManualExerciseFlow} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Exercise:</label>
                <p className="text-base font-semibold text-gray-900">{pendingExercise.name}</p>
              </div>
              <div className="flex shrink-0 justify-center gap-4 sm:justify-end">
                {renderRepPictureThumb('Picture A', srcRepA)}
                {renderRepPictureThumb('Picture B', srcRepB)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repetitions (Rip):</label>
              <select
                value={pendingExercise.reps}
                onChange={(e) => setPendingExercise({ ...pendingExercise, reps: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-</option>
                {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={String(num)}>
                    {num}
                  </option>
                ))}
                <option value="nc">nc</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pause:</label>
              <select
                value={pendingExercise.pause}
                onChange={(e) => setPendingExercise({ ...pendingExercise, pause: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {STATION_PAUSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes:</label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div
                  ref={notesEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    setPendingExercise({ ...pendingExercise, notes: e.currentTarget.innerHTML });
                  }}
                  onPaste={(e) => {
                    const target = e.currentTarget;
                    setTimeout(() => {
                      setPendingExercise((prev) => {
                        if (!prev) return prev;
                        return { ...prev, notes: target.innerHTML };
                      });
                    }, 0);
                  }}
                  className="w-full min-h-[120px] max-h-[220px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto bg-white"
                  style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setPendingExercise(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={() => {
                  const { circuitIdx, seriesIdx, stationIdx } = selectedStationForManualExercise!;
                  const pe = pendingExercise!;
                  setCircuits(prevCircuits => {
                    const nextCircuits = JSON.parse(JSON.stringify(prevCircuits));
                    const horizontalCount = executionMode === 'horizontal' && seriesMode === 'count';
                    if (horizontalCount) {
                      // Keep station-column sector aligned across all series rows.
                      const totalSeries = nextCircuits[circuitIdx].stationsBySeries?.length ?? 0;
                      for (let s = 0; s < totalSeries; s++) {
                        const current = nextCircuits[circuitIdx].stationsBySeries[s]?.[stationIdx];
                        if (!current) continue;
                        nextCircuits[circuitIdx].stationsBySeries[s][stationIdx].sector = pe.sector;
                        if (s !== seriesIdx && current.sector !== pe.sector) {
                          nextCircuits[circuitIdx].stationsBySeries[s][stationIdx].exercise = '';
                          nextCircuits[circuitIdx].stationsBySeries[s][stationIdx].notes = '';
                        }
                      }
                    }
                    nextCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].exercise = pe.name;
                    nextCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].sector = pe.sector;
                    nextCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].reps = pe.reps;
                    nextCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].pause = pe.pause;
                    nextCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].notes = pe.notes || '';
                    if (horizontalCount && seriesIdx === 0 && (pe.name || '').trim()) {
                      replicateHorizontalExerciseFromSeriesOne(
                        nextCircuits,
                        circuitIdx,
                        stationIdx,
                        pe.name,
                        pe.sector
                      );
                    }
                    if (initialConfig?.editingFromMovelap) {
                      handleSave(nextCircuits);
                      onCancel();
                    } else {
                      setShowManualExerciseModal(false);
                      setSelectedStationForManualExercise(null);
                      setPendingExercise(null);
                    }
                    return nextCircuits;
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const handleSavePreferences = (prefs: ExercisePreferences) => {
    setExercisePreferences(prefs);
    // Preferences are available for future use in handleLoadNewStation / getRandomExercise (e.g. prefer sectors or exercises).
  };
  
  // ============================================================================
  // ACTION HANDLERS - 2026-01-21 22:10 UTC
  // ============================================================================
  
  const handleAddCircuits = (count: number) => {
    const availableSlots = CIRCUIT_LETTERS.length - circuits.length;
    const safeCount = Math.min(Math.max(1, count), availableSlots);
    if (safeCount <= 0) {
      setShowAddCircuitModal(false);
      return;
    }

    setCircuits(prevCircuits => {
      const seriesNum = seriesCount;
      const newCircuits: Circuit[] = [];
      for (let i = 0; i < safeCount; i++) {
        const stationsBySeries: Station[][] = [];
        for (let s = 0; s < seriesNum; s++) {
          const stationsForThisSeries: Station[] = [];
          for (let j = 0; j < stationsPerCircuit; j++) {
            const lastSerie = s === seriesNum - 1;
            const lastStation = j === stationsPerCircuit - 1;
            const pauseCell =
              executionMode === 'horizontal' && seriesMode === 'count'
                ? lastSerie && !lastStation
                  ? pauseAmongStationsBase
                  : 0
                : pauseAmongStationsBase;
            stationsForThisSeries.push({
              stationNumber: j + 1,
              sector: '',
              exercise: '',
              reps: '',
              pause: pauseCell,
              notes: ''
            });
          }
          stationsBySeries.push(stationsForThisSeries);
        }
        const between = pauseSeries;
        const after = pauseCircuits;
        const slots = seriesPausesSlotCount(seriesNum, seriesMode === 'time' ? 'time' : 'count');
        const modeSer = seriesMode === 'time' ? 'time' : 'count';
        newCircuits.push({
          letter: '',
          stationsBySeries,
          series: seriesNum,
          pauseBetweenSeries: between,
          pauseAfterCircuit: after,
          seriesPauses:
            slots > 0
              ? buildDefaultSeriesPauses(
                  {
                    letter: '',
                    stationsBySeries,
                    series: seriesNum,
                    pauseBetweenSeries: between,
                    pauseAfterCircuit: after,
                  },
                  modeSer,
                  between,
                  after
                )
              : undefined
        });
      }

      const relabeled = [...prevCircuits, ...newCircuits].map((c, idx) => ({
        ...c,
        letter: CIRCUIT_LETTERS[idx]
      }));
      return relabeled;
    });
    setNumCircuits(prev => Math.min(9, prev + safeCount));
    setActionLog(prev => [...prev, `${safeCount} circuit${safeCount > 1 ? 's' : ''} added at the end`]);
    setShowAddCircuitModal(false);
  };
  
  const handleAddStations = (circuitLetter: string, count: number) => {
    // 2026-01-21 22:10 UTC - Add 1-5 stations to a circuit
    // 2026-01-22 10:15 UTC - Include pause value in new stations
    // 2026-01-22 12:15 UTC - Updated to work with series-specific stations
    setCircuits(prevCircuits => prevCircuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        const newStationsBySeries = circuit.stationsBySeries.map(seriesStations => {
          const newStations = [...seriesStations];
          const currentCount = newStations.length;
          
          for (let i = 0; i < count; i++) {
            newStations.push({
              stationNumber: currentCount + i + 1,
              sector: '',
              exercise: '',
              reps: '',
              pause: pauseAmongStationsBase,
              notes: ''
            });
          }
          
          return newStations;
        });
        
        return { ...circuit, stationsBySeries: newStationsBySeries };
      }
      return circuit;
    }));
    
    setActionLog(prev => [...prev, `${count} station${count > 1 ? 's' : ''} added to circuit ${circuitLetter}`]);
    setShowAddStationModal(false);
  };
  
  const handleAddSerie = (circuitLetter?: string) => {
    // 2026-01-21 22:10 UTC - Add a serie to a circuit
    // 2026-01-22 12:20 UTC - Fixed to add new stations array to stationsBySeries
    // Copy exercises from serie before the previous (if 2 series, adding 3rd copies from serie 1)
    // When circuitLetter is omitted (modal "Add serie to circuits"), append to every circuit — was broken
    // because `circuit.letter === undefined` never matched.
    setCircuits((prevCircuits) =>
      prevCircuits.map((circuit) => {
        if (circuitLetter != null && circuit.letter !== circuitLetter) return circuit;

        const nSeries = circuit.stationsBySeries?.length ?? 0;
        if (nSeries === 0) return circuit;

        const serieToCopyFromIndex = Math.max(0, nSeries - 2);
        const source = circuit.stationsBySeries[serieToCopyFromIndex];
        if (!Array.isArray(source)) return circuit;

        const newSeriesStations = JSON.parse(JSON.stringify(source)) as Station[];

        let nextBySeries = [...circuit.stationsBySeries];
        if (executionMode === 'horizontal' && seriesMode === 'count' && nextBySeries.length > 0) {
          const prevLast = nextBySeries.length - 1;
          nextBySeries = nextBySeries.map((row, sIdx) =>
            sIdx === prevLast
              ? row.map((st, j) => ({
                  ...st,
                  pause: j === row.length - 1 ? st.pause : 0,
                }))
              : row
          );
          const nSta = newSeriesStations.length;
          newSeriesStations.forEach((st, j) => {
            st.pause = j < nSta - 1 ? pauseAmongStationsBase : 0;
          });
        }

        const mergedStations = [...nextBySeries, newSeriesStations];
        const newN = mergedStations.length;
        const pauseMode = seriesMode === 'time' ? 'time' : 'count';
        const slotCount = seriesPausesSlotCount(newN, pauseMode);
        const between = circuit.pauseBetweenSeries ?? pauseSeries;
        const after = circuit.pauseAfterCircuit ?? pauseCircuits;
        let newSeriesPauses: number[] | undefined;
        if (slotCount > 0) {
          if (seriesMode === 'time') {
            newSeriesPauses = buildDefaultSeriesPauses(
              { ...circuit, stationsBySeries: mergedStations, series: newN, seriesPauses: circuit.seriesPauses },
              'time',
              between,
              after
            );
          } else if (circuit.seriesPauses && circuit.seriesPauses.length > 0) {
            newSeriesPauses = [
              ...circuit.seriesPauses,
              circuit.seriesPauses[serieToCopyFromIndex] ?? between,
            ];
          } else {
            newSeriesPauses = Array.from({ length: slotCount }, () => between);
          }
        }

        return {
          ...circuit,
          stationsBySeries: mergedStations,
          series: newN,
          seriesPauses: newSeriesPauses,
        };
      })
    );
    setSeriesCount((prev) => Math.min(5, prev + 1));
    setActionLog((prev) => [...prev, '1 serie added to all circuits']);
    setShowAddSerieModal(false);
  };
  
  // Handlers for Circuit Config inputs: add/remove to match new value (never regenerate)
  const handleCircuitsInputChange = (newVal: number) => {
    const target = Math.min(9, Math.max(1, newVal));
    const current = circuits.length;
    if (target > current) {
      handleAddCircuits(target - current);
    } else if (target < current) {
      const toRemove = current - target;
      setCircuits(prev => {
        const updated = prev.slice(0, prev.length - toRemove).map((c, idx) => ({
          ...c, letter: CIRCUIT_LETTERS[idx]
        }));
        return updated;
      });
      setNumCircuits(target);
      setActionLog(prev => [...prev, `${toRemove} circuit(s) removed from end`]);
    }
  };

  const handleStationsInputChange = (newVal: number) => {
    const target = Math.min(9, Math.max(2, newVal));
    if (circuits.length === 0) return;
    const prevLens = circuits.flatMap((c) =>
      c.stationsBySeries.map((ss) => ss.length)
    );
    const prevMin = Math.min(...prevLens);
    const prevMax = Math.max(...prevLens);
    if (prevMin === target && prevMax === target) return;

    setCircuits((prev) =>
      prev.map((circuit) => ({
        ...circuit,
        stationsBySeries: circuit.stationsBySeries.map((seriesStations) => {
          if (seriesStations.length < target) {
            const newStations = [...seriesStations];
            while (newStations.length < target) {
              newStations.push({
                stationNumber: newStations.length + 1,
                sector: '',
                exercise: '',
                reps: '',
                pause: pauseAmongStationsBase,
                notes: '',
              });
            }
            return newStations;
          }
          if (seriesStations.length > target) {
            return seriesStations
              .slice(0, target)
              .map((s, idx) => ({ ...s, stationNumber: idx + 1 }));
          }
          return seriesStations;
        }),
      }))
    );
    setStationsPerCircuit(target);
    const added = Math.max(0, target - prevMin);
    const removed = Math.max(0, prevMax - target);
    if (added > 0 && removed === 0) {
      setActionLog((p) => [...p, `${added} station(s) added to all series of all circuits`]);
    } else if (removed > 0 && added === 0) {
      setActionLog((p) => [...p, `${removed} station(s) removed from all series of all circuits`]);
    } else {
      setActionLog((p) => [
        ...p,
        `Stations set to ${target} per series in all circuits`,
      ]);
    }
  };

  const handleSeriesInputChange = (newVal: number) => {
    const target = Math.min(5, Math.max(1, newVal));
    const current = circuits[0]?.stationsBySeries?.length ?? seriesCount;
    if (circuits.length === 0 || target === current) return;
    if (target > current) {
      const toAdd = target - current;
      setCircuits(prev => prev.map(circuit => {
        const serieToCopyIdx = Math.max(0, circuit.stationsBySeries.length - 2);
        const newStationsBySeries = [...circuit.stationsBySeries];
        for (let i = 0; i < toAdd; i++) {
          const copyFrom = newStationsBySeries[serieToCopyIdx + i] ?? newStationsBySeries[0];
          newStationsBySeries.push(JSON.parse(JSON.stringify(copyFrom)));
        }
        return {
          ...circuit,
          stationsBySeries: newStationsBySeries,
          series: circuit.series + toAdd
        };
      }));
      setSeriesCount(target);
      setActionLog(prev => [...prev, `${toAdd} serie(s) added to all circuits`]);
    } else {
      const toRemove = current - target;
      setCircuits(prev => prev.map(c => {
        if (c.series <= toRemove) return c;
        const newStationsBySeries = c.stationsBySeries.slice(0, c.stationsBySeries.length - toRemove);
        return { ...c, stationsBySeries: newStationsBySeries, series: c.series - toRemove };
      }));
      setSeriesCount(target);
      setActionLog(prev => [...prev, `${toRemove} serie(s) removed from each circuit`]);
    }
  };

  // Reduce last items helpers
  const handleReduceCircuitLast = () => {
    if (circuits.length <= 1) {
      alert('You must have at least one circuit');
      return;
    }
    setCircuits(prev => prev.slice(0, prev.length - 1).map((c, idx) => ({
      ...c, letter: CIRCUIT_LETTERS[idx]
    })));
    setNumCircuits(prev => Math.max(1, prev - 1));
    setActionLog(prev => [...prev, 'Last circuit removed']);
  };
  
  const handleReduceStationLast = () => {
    // Remove exactly ONE station from every series row of every circuit.
    const lengths = circuits.flatMap((c) => (c.stationsBySeries ?? []).map((ss) => ss?.length ?? 0));
    const minAcrossGrid = lengths.length > 0 ? Math.min(...lengths) : stationsPerCircuit;
    if (minAcrossGrid <= 2) {
      alert('You must have at least 2 stations');
      return;
    }
    setCircuits((prev) =>
      prev.map((c) => ({
        ...c,
        stationsBySeries: c.stationsBySeries.map((seriesStations) => {
          const nextLen = Math.max(2, (seriesStations?.length ?? 0) - 1);
          return seriesStations.slice(0, nextLen).map((s, idx) => ({ ...s, stationNumber: idx + 1 }));
        }),
      }))
    );
    // Keep selector aligned with the smallest row after reduction.
    setStationsPerCircuit(Math.max(2, minAcrossGrid - 1));
    setActionLog((prev) => [...prev, 'Last station removed from all series of all circuits']);
  };
  
  const handleReduceSerieLast = () => {
    if (circuits.length === 0) return;
    const minSeries = Math.min(...circuits.map((c) => c.stationsBySeries?.length ?? 0));
    if (minSeries <= 1) {
      alert('You must have at least 1 serie');
      return;
    }
    const pauseMode = seriesMode === 'time' ? 'time' : 'count';
    setCircuits((prev) =>
      prev.map((c) => {
        const currentCount = c.stationsBySeries?.length ?? 0;
        if (currentCount <= 1) return c;
        const removeIdx = currentCount - 1;
        let pauses = c.seriesPauses;
        pauses = seriesPausesAfterRemovingSerie(pauses, removeIdx, pauseMode);
        return {
          ...c,
          stationsBySeries: c.stationsBySeries.slice(0, removeIdx),
          series: Math.max(1, (c.series ?? currentCount) - 1),
          seriesPauses: pauses,
        };
      })
    );
    setSeriesCount(Math.max(1, minSeries - 1));
    setActionLog((prev) => [...prev, 'Last serie removed from each circuit']);
  };

  const reloadExercisesForSeries = (circuitLetter: string, seriesNumber: number) => {
    setCircuits(prevCircuits => {
      const circuitIdx = prevCircuits.findIndex((c: Circuit) => c.letter === circuitLetter);
      if (circuitIdx === -1) return prevCircuits;
      const seriesIdx = Math.max(0, seriesNumber - 1);
      const targetCircuit = prevCircuits[circuitIdx];
      const seriesStations = targetCircuit?.stationsBySeries?.[seriesIdx];
      if (!Array.isArray(seriesStations)) return prevCircuits;
      const alreadyInSeries = new Set(seriesStations.map((s: Station) => s.exercise).filter(Boolean));
      const used = new Set<string>();

      const reloadedSeries = seriesStations.map((station: Station) => {
        if (!station.sector) return station;
        const available = getExercisesBySector(station.sector) || [];
        const notInSeries = available.filter(ex => !alreadyInSeries.has(ex.name));
        const inSeries = available.filter(ex => alreadyInSeries.has(ex.name));
        const pool = [...notInSeries, ...inSeries];
        const unused = pool.filter(ex => !used.has(ex.name) && ex.name !== station.exercise);
        const chosen = unused.length > 0
          ? unused[Math.floor(Math.random() * unused.length)]
          : getRandomExercise(station.sector, station.exercise);
        if (chosen) {
          used.add(chosen.name);
          return { ...station, exercise: chosen.name };
        }
        return station;
      });

      return prevCircuits.map((circuit, idx) => {
        if (idx !== circuitIdx) return circuit;
        return {
          ...circuit,
          stationsBySeries: circuit.stationsBySeries.map((seriesStationsEntry, idxSeries) =>
            idxSeries === seriesIdx ? reloadedSeries : seriesStationsEntry
          )
        };
      });
    });
    setActionLog(prev => [...prev, `Series ${seriesNumber} of circuit ${circuitLetter} rescanned`]);
  };

  /** Horizontal: rescan exercises for one station column (all series) with uniqueness / non-adjacent rules. */
  const reloadExercisesForStationHorizontal = (circuitLetter: string, stationIdx0: number) => {
    setCircuits((prevCircuits) => {
      const circuitIdx = prevCircuits.findIndex((c: Circuit) => c.letter === circuitLetter);
      if (circuitIdx < 0) return prevCircuits;
      const next = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
      const c = next[circuitIdx];
      const nSer = c.stationsBySeries?.length ?? 0;
      if (nSer === 0) return prevCircuits;
      let sector = '';
      for (let s = 0; s < nSer; s++) {
        const st = c.stationsBySeries[s][stationIdx0];
        if (st?.sector?.trim()) {
          sector = st.sector;
          break;
        }
      }
      if (!sector.trim()) return prevCircuits;
      const names = pickExercisesForStationColumn(sector, nSer, getExercisesBySector);
      for (let s = 0; s < nSer; s++) {
        if (names[s]) c.stationsBySeries[s][stationIdx0].exercise = names[s];
      }
      return next;
    });
    setActionLog((prev) => [
      ...prev,
      `Station ${stationIdx0 + 1} of circuit ${circuitLetter} rescanned (horizontal rules)`,
    ]);
  };

  /** Horizontal: rescan every station column in the circuit (each column uses sector + rules). */
  const reloadExercisesForCircuitHorizontal = (circuitLetter: string) => {
    setCircuits((prevCircuits) => {
      const circuitIdx = prevCircuits.findIndex((c: Circuit) => c.letter === circuitLetter);
      if (circuitIdx < 0) return prevCircuits;
      const next = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
      const c = next[circuitIdx];
      const nSer = c.stationsBySeries?.length ?? 0;
      const nSta = c.stationsBySeries[0]?.length ?? 0;
      if (nSer === 0 || nSta === 0) return prevCircuits;
      for (let j = 0; j < nSta; j++) {
        let sector = '';
        for (let s = 0; s < nSer; s++) {
          const st = c.stationsBySeries[s][j];
          if (st?.sector?.trim()) {
            sector = st.sector;
            break;
          }
        }
        if (!sector.trim()) continue;
        const names = pickExercisesForStationColumn(sector, nSer, getExercisesBySector);
        for (let s = 0; s < nSer; s++) {
          if (names[s]) c.stationsBySeries[s][j].exercise = names[s];
        }
      }
      return next;
    });
    setActionLog((prev) => [
      ...prev,
      `Circuit ${circuitLetter}: full exercise scan (horizontal — distinct per station, avoid adjacent duplicates)`,
    ]);
  };

  const applyRepsValueToAllStations = (repsStr: string, logLabel: string) => {
    setCircuits((prevCircuits) => {
      const next = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
      for (const circuit of next) {
        if (!Array.isArray(circuit.stationsBySeries)) continue;
        for (const seriesStations of circuit.stationsBySeries) {
          if (!Array.isArray(seriesStations)) continue;
          for (const station of seriesStations) {
            station.reps = repsStr;
          }
        }
      }
      return next;
    });
    setActionLog((prev) => [...prev, logLabel]);
  };

  /** Macro digit (0–9) → Rip (`reps`). Continuous Time: also presets footer Pause dropdown (digit×10″ snapped); station Pause cells use footer Apply. */
  const applyMacroToAllCells = () => {
    const macroValue = (loadOfWork || '').trim();
    if (!macroValue) return;
    const digit = parseInt(macroValue, 10);
    let logLabel = `Macro applied to Rip: "${macroValue}"`;
    if (seriesMode === 'time' && /^[0-9]$/.test(macroValue)) {
      const snapped = footerPauseSecondsFromMacroDigit(digit);
      setBulkPauseFooterSeconds(String(snapped));
      const lab = STATION_PAUSE_OPTIONS.find((o) => o.value === snapped)?.label ?? `${snapped}s`;
      logLabel += `; footer Pause preset ${lab} (click Pause Apply below to fill station cells)`;
    } else {
      logLabel += ' (Pause footer unchanged)';
    }
    applyRepsValueToAllStations(String(macroValue), logLabel);
  };

  const applyBulkRepsLoadToAllCells = () => {
    const v = (bulkRepsLoad || '').trim();
    if (!v) return;
    applyRepsValueToAllStations(
      String(v),
      `Load of work applied: Rip (repetitions) "${v}" set for all stations (Macro unchanged)`
    );
  };

  /** Footer Pause dropdown — uses `bulkPauseFooterSeconds`. Macro Apply (Continuous Time) presets this select only; this handler writes station.pause. */
  const applyPauseToAllStations = () => {
    if (executionMode === 'horizontal') {
      setActionLog((prev) => [
        ...prev,
        'Horizontal execution: inter-station pause comes from “Pause after all the series of each station” (Pause Settings). Footer “Apply” for Pause column is not used.'
      ]);
      return;
    }
    const raw = (bulkPauseFooterSeconds || '').trim();
    if (raw === '') return;
    const sec = parseInt(raw, 10);
    if (!Number.isFinite(sec) || sec < 0) return;
    const label =
      STATION_PAUSE_OPTIONS.find((o) => o.value === sec)?.label ?? `${sec}s`;
    setCircuits((prevCircuits) => {
      const next = JSON.parse(JSON.stringify(prevCircuits)) as Circuit[];
      for (const circuit of next) {
        if (!Array.isArray(circuit.stationsBySeries)) continue;
        for (const seriesStations of circuit.stationsBySeries) {
          if (!Array.isArray(seriesStations)) continue;
          seriesStations.forEach((station, idx) => {
            // Count mode: last station pause comes from Between series / Between Circuits bars (generateMovelaps).
            if (seriesMode !== 'time' && idx === seriesStations.length - 1) return;
            station.pause = sec;
          });
        }
      }
      return next;
    });
    setActionLog((prev) => [...prev, `Pause applied: ${label} to station Pause cells only (Rip/Macro unchanged)`]);
  };

  // 2026-01-22 10:00 UTC - Checkbox handlers
  const toggleCircuitSelection = (circuitLetter: string) => {
    setSelectedCircuits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(circuitLetter)) {
        newSet.delete(circuitLetter);
      } else {
        newSet.add(circuitLetter);
      }
      return newSet;
    });
  };

  const toggleSeriesSelection = (circuitLetter: string, seriesNumber: number) => {
    const key = `${circuitLetter}-${seriesNumber}`;
    setSelectedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleStationSelection = (circuitLetter: string, seriesNumber: number, stationNumber: number) => {
    const key = `${circuitLetter}-${seriesNumber}-${stationNumber}`;
    setSelectedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  /** Horizontal grid: one checkbox for the whole station column (all series). */
  const horizontalStationColumnFullySelected = (
    circuitLetter: string,
    stationNumber: number,
    nSeries: number
  ) =>
    Array.from({ length: nSeries }, (_, i) =>
      selectedStations.has(`${circuitLetter}-${i + 1}-${stationNumber}`)
    ).every(Boolean);

  const toggleHorizontalStationColumnSelection = (
    circuitLetter: string,
    stationNumber: number,
    nSeries: number
  ) => {
    const keys = Array.from({ length: nSeries }, (_, i) => `${circuitLetter}-${i + 1}-${stationNumber}`);
    setSelectedStations((prev) => {
      const next = new Set(prev);
      const allOn = keys.every((k) => next.has(k));
      keys.forEach((k) => {
        if (allOn) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  const handleRemoveCircuitAction = () => {
    // 2026-01-22 10:00 UTC - Remove selected circuits
    // 2026-01-26 - Added confirmation dialog
    if (selectedCircuits.size === 0) {
      alert('Please select at least one circuit to remove');
      return;
    }
    
    const circuitsToRemove = Array.from(selectedCircuits);
    if (!confirm(`Are you sure you want to delete ${circuitsToRemove.length} circuit(s): ${circuitsToRemove.join(', ')}? This will remove all their series and stations.`)) {
      return;
    }
    
    circuitsToRemove.forEach(letter => {
      // Skip individual confirmation since we already confirmed the batch
      if (circuits.length > 1) {
        const updatedCircuits = circuits
          .filter(c => c.letter !== letter)
          .map((circuit, index) => ({
            ...circuit,
            letter: CIRCUIT_LETTERS[index]
          }));
        setCircuits(updatedCircuits);
      }
    });
    
    setActionLog(prev => [...prev, `${circuitsToRemove.length} circuit(s) removed: ${circuitsToRemove.join(', ')}`]);
    setSelectedCircuits(new Set());
    setShowRemoveMenu(false);
  };
  
  const handleRemoveSerieAction = () => {
    // 2026-01-22 10:00 UTC - Remove selected series
    // 2026-01-26 - Added confirmation dialog
    if (selectedSeries.size === 0) {
      alert('Please select at least one series to remove');
      return;
    }
    
    const seriesToRemove = Array.from(selectedSeries);
    if (!confirm(`Are you sure you want to delete ${seriesToRemove.length} series: ${seriesToRemove.join(', ')}? This will remove all their stations.`)) {
      return;
    }
    
    seriesToRemove.forEach(key => {
      const [circuit, series] = key.split('-');
      // Skip individual confirmation since we already confirmed the batch
      setCircuits(prevCircuits => prevCircuits.map(c => {
        if (c.letter === circuit && c.series > 1) {
          const seriesIndex = parseInt(series) - 1;
          const newStationsBySeries = c.stationsBySeries.filter((_, idx) => idx !== seriesIndex);
          return {
            ...c,
            stationsBySeries: newStationsBySeries,
            series: c.series - 1,
            seriesPauses: seriesPausesAfterRemovingSerie(
              c.seriesPauses,
              seriesIndex,
              seriesMode === 'time' ? 'time' : 'count'
            )
          };
        }
        return c;
      }));
    });
    
    setActionLog(prev => [...prev, `${seriesToRemove.length} series removed`]);
    setSelectedSeries(new Set());
    setShowRemoveMenu(false);
  };
  
  const handleRemoveStationAction = () => {
    // Remove ONLY the stations that are selected; ONLY in the series where they were selected (never from other series)
    const toRemove = selectedStationsRef.current;
    if (toRemove.size === 0) {
      alert('Please select at least one station to remove');
      return;
    }
    const stationsToRemove = Array.from(toRemove);
    if (!confirm(`Are you sure you want to delete ${stationsToRemove.length} selected station(s)?`)) {
      return;
    }
    const removeSet = new Set(stationsToRemove);
    setCircuits(prevCircuits => {
      return prevCircuits.map(circuit => {
        if (!circuit.stationsBySeries) return circuit;
        const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, seriesIdx) => {
          const seriesNum = seriesIdx + 1;
          const circuitLetter = String(circuit.letter);
          const filteredStations = seriesStations.filter(station => {
            const key = `${circuitLetter}-${seriesNum}-${station.stationNumber}`;
            return !removeSet.has(key);
          });
          return filteredStations.map((s, idx) => ({ ...s, stationNumber: idx + 1 }));
        });
        return { ...circuit, stationsBySeries: newStationsBySeries };
      });
    });
    setActionLog(prev => [...prev, `${stationsToRemove.length} station(s) removed (only selected)`]);
    setSelectedStations(new Set());
    setShowRemoveMenu(false);
  };
  
  const handleReloadExercises = () => {
    // 2026-01-21 22:10 UTC - Reload exercises according to preferences
    // 2026-01-22 13:20 UTC - Implemented auto-reload for all stations with sectors
    // 2026-01-22 14:50 UTC - Updated to ensure no duplicate exercises in same station position across series
    // 2026-01-22 14:55 UTC - Added debugging and fixed logic
    console.log('=��� Reload exercises clicked');
    
    setCircuits(prevCircuits => {
      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
      console.log('Current circuits:', newCircuits);
      
      let exercisesLoaded = 0;
      
      newCircuits.forEach((circuit: Circuit) => {
        // For each station position, track used exercises across all series
        const maxStations = Math.max(...circuit.stationsBySeries.map((ss: Station[]) => ss.length));
        console.log(`Circuit ${circuit.letter}: ${maxStations} stations, ${circuit.stationsBySeries.length} series`);
        
        for (let stationPos = 0; stationPos < maxStations; stationPos++) {
          const usedExercisesForThisPosition = new Set<string>();
          
          // Iterate through all series for this station position
          circuit.stationsBySeries.forEach((seriesStations: Station[], seriesIdx: number) => {
            const station = seriesStations[stationPos];
            console.log(`  Circuit ${circuit.letter}, Series ${seriesIdx + 1}, Station ${stationPos + 1}:`, {
              hasSector: !!station?.sector,
              sector: station?.sector,
              currentExercise: station?.exercise
            });
            
            if (station && station.sector) {
              // Get random exercise, excluding already used ones for this station position
              let randomExercise = null;
              
              // Try to get a unique exercise for this position
              const availableExercises = getExercisesBySector(station.sector);
              console.log(`    Available exercises for ${station.sector}:`, availableExercises.length);
              
              const unusedExercises = availableExercises.filter(
                ex => !usedExercisesForThisPosition.has(ex.name)
              );
              
              if (unusedExercises.length > 0) {
                randomExercise = unusedExercises[Math.floor(Math.random() * unusedExercises.length)];
              } else {
                // If all exercises have been used, just pick a random one
                randomExercise = getRandomExercise(station.sector);
              }
              
              if (randomExercise) {
                console.log(`    G�� Loading exercise: ${randomExercise.name}`);
                station.exercise = randomExercise.name;
                usedExercisesForThisPosition.add(randomExercise.name);
                exercisesLoaded++;
                // Keep existing reps or set default
                if (!station.reps) {
                  station.reps = '10';
                }
              } else {
                console.log(`    G�� No exercise found for sector: ${station.sector}`);
              }
            } else {
              console.log(`    G��n+� Station has no sector assigned`);
            }
          });
        }
      });
      
      console.log(`G�� Reload complete: ${exercisesLoaded} exercises loaded`);
      return newCircuits;
    });
    setActionLog(prev => [...prev, `Exercises reloaded: ${circuits.reduce((sum, c) => sum + c.stationsBySeries.reduce((s, ss) => s + ss.length, 0), 0)} stations processed`]);
  };
  
  /** Planned grid only: circuits, station slots, averages — ignores whether exercises are chosen. */
  const generatePreviewStructurePlanned = (overrideCircuits?: Circuit[]): string => {
    const circuitsToUse = overrideCircuits ?? circuits;
    const fallbackCircuits = Math.max(1, numCircuits);

    const circuitCount =
      circuitsToUse.length > 0 ? circuitsToUse.length : fallbackCircuits;

    const totalSeriesRows = circuitsToUse.reduce(
      (sum, c) => sum + (c.stationsBySeries?.length ?? 0),
      0
    );
    const totalStationSlots = circuitsToUse.reduce(
      (sum, c) =>
        sum +
        (c.stationsBySeries ?? []).reduce(
          (sSum, seriesStations) => sSum + seriesStations.length,
          0
        ),
      0
    );

    const avgStationsSerie =
      totalSeriesRows > 0 ? totalStationSlots / totalSeriesRows : stationsPerCircuit;
    const avgSeriesCircuit =
      totalSeriesRows > 0 && circuitCount > 0
        ? totalSeriesRows / circuitCount
        : seriesCount;

    const fmtAvg = (n: number) => {
      const r = Math.round(n * 100) / 100;
      return Number.isInteger(r) ? String(r) : r.toFixed(2);
    };

    return `${circuitCount} circuits planned, ${totalStationSlots} total stations planned, avg ${fmtAvg(avgStationsSerie)} stations/serie, avg ${fmtAvg(avgSeriesCircuit)} series/circuit`;
  };

  const generatePreviewRealData = (overrideCircuits?: Circuit[]): string => {
    const circuitsToUse = overrideCircuits ?? circuits;
    const fallbackCircuits = Math.max(1, numCircuits);

    const seriesHasExercise = (seriesStations: Station[] | undefined) =>
      !!(seriesStations?.some((st) => stationHasNonBlankExercise(st)));

    const circuitHasExercise = (c: Circuit) =>
      (c.stationsBySeries ?? []).some((row) => seriesHasExercise(row));

    /** Circuits that have at least one station with an exercise selected. */
    const filledCircuits = circuitsToUse.filter(circuitHasExercise);
    const filledCircuitCount = filledCircuits.length;

    /** Stations where an exercise is selected (sector-only empty cells excluded). */
    const totalStationsWithExercise = circuitsToUse.reduce((sum, c) => {
      for (const series of c.stationsBySeries ?? []) {
        for (const st of series) {
          if (stationHasNonBlankExercise(st)) sum += 1;
        }
      }
      return sum;
    }, 0);

    /** Series rows that contain at least one station with an exercise. */
    const filledSeriesCount = circuitsToUse.reduce((sum, c) => {
      for (const series of c.stationsBySeries ?? []) {
        if (seriesHasExercise(series)) sum += 1;
      }
      return sum;
    }, 0);

    const circuitCountDisplay = filledCircuitCount > 0 ? filledCircuitCount : fallbackCircuits;

    const avgStationsSerie =
      filledSeriesCount > 0 ? totalStationsWithExercise / filledSeriesCount : stationsPerCircuit;
    const avgSeriesCircuit =
      filledCircuitCount > 0 ? filledSeriesCount / filledCircuitCount : seriesCount;

    const fmtAvg = (n: number) => {
      const r = Math.round(n * 100) / 100;
      return Number.isInteger(r) ? String(r) : r.toFixed(2);
    };

    const loadOfWorkTrimmed = String(loadOfWork ?? '').trim();

    // Pause among circuits: each circuit with ≥1 exercise contributes pauseAfterCircuit (last circuit includes Macro / final slot).
    let sumPauseAfterCirc = 0;
    let circPauseCount = 0;
    filledCircuits.forEach((c) => {
      sumPauseAfterCirc += coerceBetweenCircuitsSeconds(
        c.pauseAfterCircuit ?? pauseCircuits,
        pauseCircuits ?? 120
      );
      circPauseCount += 1;
    });
    if (circPauseCount === 0) {
      sumPauseAfterCirc = coerceBetweenCircuitsSeconds(pauseCircuits ?? 120, 120) * fallbackCircuits;
      circPauseCount = fallbackCircuits;
    }
    const avgPauseCircSeconds = sumPauseAfterCirc / Math.max(1, circPauseCount);
    const pauseCircStr = formatPauseSeconds(CIRCUIT_PAUSE_OPTIONS, avgPauseCircSeconds);

    // Pause among series: only gaps between consecutive series where BOTH have ≥1 exercise; pause = slot after lower series.
    let sumPauseSeries = 0;
    let seriesGapCount = 0;
    circuitsToUse.forEach((c) => {
      const rows = c.stationsBySeries ?? [];
      const n = rows.length;
      const fb = c.pauseBetweenSeries ?? pauseSeries;
      for (let s = 0; s < n - 1; s++) {
        if (!seriesHasExercise(rows[s]) || !seriesHasExercise(rows[s + 1])) continue;
        const raw = c.seriesPauses?.[s] ?? fb;
        const sec =
          seriesMode === 'time'
            ? coerceBetweenCircuitsSeconds(typeof raw === 'number' ? raw : fb, fb)
            : coerceCountSeriesPauseSeconds(typeof raw === 'number' ? raw : fb, fb);
        sumPauseSeries += sec;
        seriesGapCount += 1;
      }
    });
    // User spec: divide by count of series that have ≥1 exercise (not only gap count).
    const avgPauseSeriesSeconds =
      filledSeriesCount > 0 && seriesGapCount > 0
        ? sumPauseSeries / filledSeriesCount
        : pauseSeries;
    const pauseSerStr = formatPauseSeconds(SERIES_PAUSE_OPTIONS, avgPauseSeriesSeconds);

    // Pause among stations: station.pause only where an exercise exists; average over those stations only.
    let sumPauseStat = 0;
    let exerciseRowCount = 0;
    circuitsToUse.forEach((c) => {
      for (const seriesStations of c.stationsBySeries ?? []) {
        for (const station of seriesStations) {
          if (!stationHasNonBlankExercise(station)) continue;
          sumPauseStat += station.pause ?? pauseAmongStationsBase;
          exerciseRowCount += 1;
        }
      }
    });
    const avgPauseStatSeconds =
      exerciseRowCount > 0 ? sumPauseStat / exerciseRowCount : pauseAmongStationsBase;
    const pauseStatStr = formatPauseSeconds(STATION_PAUSE_OPTIONS, avgPauseStatSeconds);

    // M… : Continuous time → real seconds from last filled circuit's Macro / final pause row; count mode → load-of-work label.
    let mSegment = '';
    if (seriesMode === 'time' && filledCircuitCount > 0) {
      const lastFilled = filledCircuits[filledCircuits.length - 1]!;
      const n = lastFilled.stationsBySeries?.length ?? 0;
      const rawLast =
        n > 0
          ? lastFilled.seriesPauses?.[n - 1] ?? lastFilled.pauseAfterCircuit ?? pauseCircuits
          : lastFilled.pauseAfterCircuit ?? pauseCircuits;
      const macroSec = coerceBetweenCircuitsSeconds(
        typeof rawLast === 'number' ? rawLast : pauseCircuits ?? 120,
        pauseCircuits ?? 120
      );
      mSegment = `M${formatPauseSeconds(CIRCUIT_PAUSE_OPTIONS, macroSec)}`;
    } else {
      const mf = circuitLoadOfWorkToMacroFinal(loadOfWorkTrimmed);
      mSegment = mf ? `M${mf}` : `M0'`;
    }

    const timeSuffix =
      seriesMode === 'time' ? ` (${seriesTime}' continuous)` : '';

    return (
      `Circuit: ${totalStationsWithExercise} total stations (${circuitCountDisplay} circuits, avg ${fmtAvg(avgStationsSerie)} stations/serie, avg ${fmtAvg(avgSeriesCircuit)} series/circuit)${timeSuffix} ` +
      `Pause circ. ${pauseCircStr} - stations ${pauseStatStr} - series ${pauseSerStr} ${mSegment}`
    );
  };
  
  // ============================================================================
  // EFFECTS - 2026-01-21 20:30 UTC
  // ============================================================================
  
  // Close exercise menu when clicking outside - 2026-01-21 20:30 UTC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExerciseMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.exercise-menu-container')) {
          setShowExerciseMenu(null);
        }
      }
      // 2026-01-21 22:10 UTC - Also close remove menu when clicking outside
      if (showRemoveMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.remove-menu-container')) {
          setShowRemoveMenu(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExerciseMenu, showRemoveMenu]);
  
  // ============================================================================
  // DRAG & DROP EXERCISE HANDLERS - 2026-01-22 14:40 UTC
  // ============================================================================
  
  const handleDragExerciseStart = (e: React.DragEvent, circuit: string, series: number, station: number) => {
    // Store the source exercise data
    const circuitIdx = circuits.findIndex(c => c.letter === circuit);
    const seriesIdx = series - 1;
    const stationIdx = circuits[circuitIdx].stationsBySeries[seriesIdx].findIndex(s => s.stationNumber === station);
    const stationData = circuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx];
    
    setDraggedExercise({
      circuit,
      series,
      station,
      exercise: stationData.exercise,
      reps: stationData.reps,
      pause: stationData.pause,
      sector: stationData.sector
    });
    
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragExerciseOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDropExercise = (e: React.DragEvent, targetCircuit: string, targetSeries: number, targetStation: number) => {
    e.preventDefault();
    
    if (!draggedExercise) return;
    
    // Don't drop on the same station
    if (draggedExercise.circuit === targetCircuit && 
        draggedExercise.series === targetSeries && 
        draggedExercise.station === targetStation) {
      setDraggedExercise(null);
      return;
    }
    
    // Get target station data
    const targetCircuitIdx = circuits.findIndex(c => c.letter === targetCircuit);
    const targetSeriesIdx = targetSeries - 1;
    const targetStationIdx = circuits[targetCircuitIdx].stationsBySeries[targetSeriesIdx].findIndex(s => s.stationNumber === targetStation);
    const targetStationData = circuits[targetCircuitIdx].stationsBySeries[targetSeriesIdx][targetStationIdx];
    
    // Show substitute/exchange modal
    setShowSubstituteExchangeModal({
      source: {
        ...draggedExercise,
        circuitIdx: circuits.findIndex(c => c.letter === draggedExercise.circuit),
        seriesIdx: draggedExercise.series - 1,
        stationIdx: circuits[circuits.findIndex(c => c.letter === draggedExercise.circuit)].stationsBySeries[draggedExercise.series - 1].findIndex(s => s.stationNumber === draggedExercise.station)
      },
      target: {
        circuit: targetCircuit,
        series: targetSeries,
        station: targetStation,
        circuitIdx: targetCircuitIdx,
        seriesIdx: targetSeriesIdx,
        stationIdx: targetStationIdx,
        exercise: targetStationData.exercise,
        reps: targetStationData.reps,
        pause: targetStationData.pause,
        sector: targetStationData.sector
      }
    });
  };
  
  const handleSubstitute = () => {
    // Replace target with source, clear source
    if (!showSubstituteExchangeModal) return;
    
    const { source, target } = showSubstituteExchangeModal;
    
    setCircuits(prevCircuits => {
      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
      
      // Set target with source values
      newCircuits[target.circuitIdx].stationsBySeries[target.seriesIdx][target.stationIdx] = {
        ...newCircuits[target.circuitIdx].stationsBySeries[target.seriesIdx][target.stationIdx],
        exercise: source.exercise,
        reps: source.reps,
        pause: source.pause,
        sector: source.sector
      };
      
      // Clear source
      newCircuits[source.circuitIdx].stationsBySeries[source.seriesIdx][source.stationIdx] = {
        ...newCircuits[source.circuitIdx].stationsBySeries[source.seriesIdx][source.stationIdx],
        exercise: '',
        reps: '',
        sector: ''
      };
      
      return newCircuits;
    });
    
    setActionLog(prev => [...prev, `Exercise substituted from ${source.circuit}${source.series}${source.station} to ${target.circuit}${target.series}${target.station}`]);
    setShowSubstituteExchangeModal(null);
    setDraggedExercise(null);
  };
  
  const handleExchange = () => {
    // Swap source and target values
    if (!showSubstituteExchangeModal) return;
    
    const { source, target } = showSubstituteExchangeModal;
    
    setCircuits(prevCircuits => {
      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
      
      // Store target values
      const tempExercise = target.exercise;
      const tempReps = target.reps;
      const tempPause = target.pause;
      const tempSector = target.sector;
      
      // Set target with source values
      newCircuits[target.circuitIdx].stationsBySeries[target.seriesIdx][target.stationIdx] = {
        ...newCircuits[target.circuitIdx].stationsBySeries[target.seriesIdx][target.stationIdx],
        exercise: source.exercise,
        reps: source.reps,
        pause: source.pause,
        sector: source.sector
      };
      
      // Set source with temp (original target) values
      newCircuits[source.circuitIdx].stationsBySeries[source.seriesIdx][source.stationIdx] = {
        ...newCircuits[source.circuitIdx].stationsBySeries[source.seriesIdx][source.stationIdx],
        exercise: tempExercise,
        reps: tempReps,
        pause: tempPause,
        sector: tempSector
      };
      
      return newCircuits;
    });
    
    setActionLog(prev => [...prev, `Exercises exchanged between ${source.circuit}${source.series}${source.station} and ${target.circuit}${target.series}${target.station}`]);
    setShowSubstituteExchangeModal(null);
    setDraggedExercise(null);
  };
  
  // ============================================================================
  // COPY STATION HANDLERS — Rip + Pause only; never sector or exercise.
  // Vertical: single click = next station in same serie; double = all following stations in that serie.
  // Horizontal: single click = next serie, same station column; double = all following series for that station.
  // Vertical last station in serie: copy Rip only (pause from Between series / Horizontal pause-after-all-series bar).
  // ============================================================================
  const mergeRipPauseFromSource = (
    target: Station,
    source: Station,
    targetIsLastInSeries: boolean
  ): Station => ({
    ...target,
    reps: source.reps || '',
    pause: targetIsLastInSeries ? target.pause : source.pause,
  });

  const handleCopyToNextStation = (circuit: string, seriesIdx: number, stationNumber: number) => {
    setCircuits(prevCircuits => {
      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
      const circuitIdx = newCircuits.findIndex((c: Circuit) => c.letter === circuit);
      if (circuitIdx < 0) return prevCircuits;
      const circuitData = newCircuits[circuitIdx];
      if (!circuitData?.stationsBySeries?.[seriesIdx]) return prevCircuits;
      const seriesStations = circuitData.stationsBySeries[seriesIdx];
      const sourceStationIdx = seriesStations.findIndex((s: Station) => s.stationNumber === stationNumber);
      if (sourceStationIdx < 0) return prevCircuits;
      const sourceStation = seriesStations[sourceStationIdx];

      if (executionMode === 'horizontal') {
        const colIdx = sourceStationIdx;
        const nextSer = seriesIdx + 1;
        if (nextSer >= circuitData.stationsBySeries.length) return prevCircuits;
        const targetSeries = circuitData.stationsBySeries[nextSer];
        if (!targetSeries || colIdx >= targetSeries.length) return prevCircuits;
        const targetStation = targetSeries[colIdx];
        newCircuits[circuitIdx].stationsBySeries[nextSer][colIdx] = {
          ...targetStation,
          reps: sourceStation.reps ?? '',
          pause: sourceStation.pause,
        };
        setActionLog((prev) => [
          ...prev,
          `Rip, Pause copied to next serie (same station ${stationNumber}) in ${circuit}: serie ${seriesIdx + 1} → ${nextSer + 1} (sector & exercise unchanged)`,
        ]);
        return newCircuits;
      }

      const nextIdxInSeries = sourceStationIdx + 1;
      if (nextIdxInSeries >= seriesStations.length) return prevCircuits;

      const targetIsLast = nextIdxInSeries === seriesStations.length - 1;
      newCircuits[circuitIdx].stationsBySeries[seriesIdx][nextIdxInSeries] = mergeRipPauseFromSource(
        seriesStations[nextIdxInSeries],
        sourceStation,
        targetIsLast
      );
      setActionLog(prev => [
        ...prev,
        `Rip, Pause copied from station ${stationNumber} to next station in ${circuit} series ${seriesIdx + 1} (sector & exercise unchanged)`
      ]);
      return newCircuits;
    });
  };

  /** Double click: vertical = rest of stations in same serie; horizontal = all following series, same station. */
  const handleCopyRipPauseToRestOfSeries = (circuit: string, seriesIdx: number, stationNumber: number) => {
    setCircuits(prevCircuits => {
      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
      const circuitIdx = newCircuits.findIndex((c: Circuit) => c.letter === circuit);
      if (circuitIdx < 0) return prevCircuits;
      const circuitData = newCircuits[circuitIdx];
      if (!circuitData?.stationsBySeries?.[seriesIdx]) return prevCircuits;
      const seriesStations = circuitData.stationsBySeries[seriesIdx];
      const sourceStationIdx = seriesStations.findIndex((s: Station) => s.stationNumber === stationNumber);
      if (sourceStationIdx < 0) return prevCircuits;
      const sourceStation = seriesStations[sourceStationIdx];

      if (executionMode === 'horizontal') {
        const colIdx = sourceStationIdx;
        let copiedCount = 0;
        for (let ser = seriesIdx + 1; ser < circuitData.stationsBySeries.length; ser++) {
          const targetSeries = circuitData.stationsBySeries[ser];
          if (!targetSeries || colIdx >= targetSeries.length) continue;
          const targetStation = targetSeries[colIdx];
          newCircuits[circuitIdx].stationsBySeries[ser][colIdx] = {
            ...targetStation,
            reps: sourceStation.reps ?? '',
            pause: sourceStation.pause,
          };
          copiedCount++;
        }
        if (copiedCount === 0) return prevCircuits;
        setActionLog((prev) => [
          ...prev,
          `Rip, Pause copied to ${copiedCount} subsequent serie(s) (same station ${stationNumber}) in ${circuit} from serie ${seriesIdx + 1} (sector & exercise unchanged)`,
        ]);
        return newCircuits;
      }

      let copiedCount = 0;
      for (let stIdx = sourceStationIdx + 1; stIdx < seriesStations.length; stIdx++) {
        const targetIsLast = stIdx === seriesStations.length - 1;
        newCircuits[circuitIdx].stationsBySeries[seriesIdx][stIdx] = mergeRipPauseFromSource(
          seriesStations[stIdx],
          sourceStation,
          targetIsLast
        );
        copiedCount++;
      }
      if (copiedCount === 0) return prevCircuits;
      setActionLog(prev => [
        ...prev,
        `Rip, Pause copied from station ${stationNumber} to ${copiedCount} subsequent station(s) in ${circuit} series ${seriesIdx + 1} (same serie only; sector & exercise unchanged)`
      ]);
      return newCircuits;
    });
  };

  const handleCopySeries = (circuitLetter: string, seriesNumber: number) => {
    let logMessage = '';
    setCircuits(prevCircuits => {
      const circuitIdx = prevCircuits.findIndex((c: Circuit) => c.letter === circuitLetter);
      if (circuitIdx === -1) return prevCircuits;
      const seriesIdx = Math.max(0, seriesNumber - 1);
      const circuit = prevCircuits[circuitIdx];
      const currentSeries = circuit?.stationsBySeries?.[seriesIdx];
      if (!Array.isArray(currentSeries)) return prevCircuits;

      const clonedSeries = JSON.parse(JSON.stringify(currentSeries));
      const n = circuit.stationsBySeries.length;
      const insertAt = seriesIdx + 1;

      const newStationsBySeries = [...circuit.stationsBySeries];
      newStationsBySeries.splice(insertAt, 0, clonedSeries);

      const pauseMode = seriesMode === 'time' ? 'time' : 'count';
      const fallbackBetween = circuit.pauseBetweenSeries ?? pauseSeries;
      const fallbackAfter = circuit.pauseAfterCircuit ?? pauseCircuits;
      const slotsOld = seriesPausesSlotCount(n, pauseMode);
      const oldPauses = Array.from({ length: slotsOld }, (_, i) => {
        if (circuit.seriesPauses && i < circuit.seriesPauses.length && circuit.seriesPauses[i] !== undefined) {
          return circuit.seriesPauses[i]!;
        }
        if (pauseMode === 'time' && i === slotsOld - 1) return fallbackAfter;
        return fallbackBetween;
      });
      const needsPauseArray = pauseMode === 'time' || Array.isArray(circuit.seriesPauses);
      let newSeriesPauses: number[] | undefined = undefined;
      if (needsPauseArray) {
        if (pauseMode === 'time') {
          // Time mode: one pause per serie row; last slot stays circuit-level “after”.
          const pauseFromPrevSeries =
            insertAt - 1 >= 0 && insertAt - 1 < oldPauses.length ? oldPauses[insertAt - 1]! : fallbackBetween;
          newSeriesPauses = [...oldPauses];
          newSeriesPauses.splice(insertAt, 0, pauseFromPrevSeries);
          const newN = newStationsBySeries.length;
          newSeriesPauses = buildDefaultSeriesPauses(
            {
              ...circuit,
              stationsBySeries: newStationsBySeries,
              series: newN,
              seriesPauses: newSeriesPauses,
            },
            'time',
            fallbackBetween,
            fallbackAfter
          );
        } else {
          // Count mode stores one pause value per gap between consecutive series.
          // Keep old gap after source series for "new -> next" and set "source -> new"
          // from the immediately previous series pause value.
          const oldGapAfterSource =
            seriesIdx >= 0 && seriesIdx < oldPauses.length ? oldPauses[seriesIdx]! : fallbackBetween;
          const prevGapValue =
            seriesIdx - 1 >= 0 && seriesIdx - 1 < oldPauses.length ? oldPauses[seriesIdx - 1]! : fallbackBetween;
          newSeriesPauses = [...oldPauses];
          newSeriesPauses.splice(insertAt - 1, 0, oldGapAfterSource);
          newSeriesPauses[insertAt - 1] = prevGapValue;
        }
      }

      logMessage = `Series ${seriesNumber} of circuit ${circuitLetter} duplicated after series ${seriesNumber}`;
      return prevCircuits.map((c, idx) => {
        if (idx !== circuitIdx) return c;
        return {
          ...c,
          stationsBySeries: newStationsBySeries,
          series: c.series + 1,
          seriesPauses: newSeriesPauses,
        };
      });

    });
    if (logMessage) setActionLog(prev => [...prev, logMessage]);
  };

  // ============================================================================
  // RENDER - 2026-01-21 19:30 UTC
  // ============================================================================
  
  // First View - Configuration Phase
  if (currentPhase === 'config') {
    // 2026-01-31 - Hide configuration UI if in invisible mode
    if ((initialConfig as any)?.hideUI) return null;

    return (
      <>
        <div className="space-y-4 max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Circuit Planner Configuration</h2>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          
          {/* Configuration Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Basic Configuration</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Number of Circuits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Circuits
                </label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={numCircuits}
                  onChange={(e) => handleNumCircuitsChange(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Stations per Circuit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stations
                </label>
                <input
                  type="number"
                  min="2"
                  max="9"
                  value={stationsPerCircuit}
                  onChange={(e) => handleStationsPerCircuitChange(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Series Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Series Mode
                </label>
                <select
                  value={seriesMode}
                  onChange={(e) => setSeriesMode(e.target.value as 'count' | 'time')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="count">Count</option>
                  <option value="time">Continuous Time</option>
                </select>
              </div>
              
              {/* Series count — visible and editable in Count and Continuous Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Series
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={seriesCount}
                  onChange={(e) => handleSeriesCountChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">1-5 (default: 1)</p>
              </div>
              
              {/* Macro (0-9) - when Set Time/Circuit (Continuous Time) mode */}
              {seriesMode === 'time' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Macro
                </label>
                <select
                  value={loadOfWork}
                  onChange={(e) => setLoadOfWork(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <option key={num} value={String(num)}>{num}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">0-9</p>
              </div>
              )}
              
              {/* Time per Circuit */}
              <div className={seriesMode !== 'time' ? 'opacity-50' : ''}>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  title="Continuous Time: length of each serie work block (minutes). Yearly period From-to targets belong here, not in Macro (Rip digits 0-9)."
                >
                  Minutes of work
                </label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={seriesTime}
                  onChange={(e) => setSeriesTime(Math.min(9, Math.max(1, parseInt(e.target.value) || 2)))}
                  disabled={seriesMode !== 'time'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  aria-label="Minutes of work per serie in Continuous Time mode"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1–9 minutes per serie (default 2). With yearly period planning, this field carries your Continuous Time target; Macro is separate (Rip).
                </p>
              </div>
            </div>
          </div>
          
          {/* Circuit Flow Visualization with Red Arrow */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Box - Vertical Flow */}
            <div className={`bg-gray-50 border-2 rounded-lg p-4 cursor-pointer transition-all ${
              executionMode === 'vertical' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
            }`} onClick={() => setExecutionMode('vertical')}>
              <div className="space-y-3 mb-4">
                {/* Circuit A with vertical flow */}
                <div className="flex items-start gap-2">
                  <div className="w-12 h-12 bg-yellow-400 border-2 border-yellow-600 rounded flex items-center justify-center font-bold text-xl flex-shrink-0">
                    A
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[1, 2, 3, 4, 5, 6].map((serie) => (
                      <div key={serie} className="flex items-center gap-1">
                        <div className="flex-1 h-7 bg-cyan-400 rounded"></div>
                        <span className="text-orange-500 text-sm font-bold">→</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '8px', height: '185px'}}>
                    <div style={{width: '32px', height: '32px', backgroundColor: '#EF4444', borderRadius: '50%', border: '3px solid #991B1B', flexShrink: 0}}></div>
                    <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0'}}>
                      <svg width="32" height="130" viewBox="0 0 32 130" style={{display: 'block', overflow: 'visible'}}>
                        <defs>
                          <marker id="arrowhead-red-vertical" markerWidth="20" markerHeight="20" refX="10" refY="10" orient="auto">
                            <polygon points="2 2, 18 10, 2 18" fill="#DC2626" stroke="none" />
                          </marker>
                        </defs>
                        <line x1="16" y1="0" x2="16" y2="130" stroke="#DC2626" strokeWidth="14" strokeLinecap="round" markerEnd="url(#arrowhead-red-vertical)" />
                      </svg>
                    </div>
                    <div style={{width: '32px', height: '32px', backgroundColor: '#22C55E', borderRadius: '50%', border: '3px solid #166534', flexShrink: 0}}></div>
                  </div>
                </div>
                
                {/* Circuit B */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-yellow-400 border-2 border-yellow-600 rounded flex items-center justify-center font-bold text-xl">
                    B
                  </div>
                </div>
              </div>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="vertical"
                  checked={executionMode === 'vertical'}
                  onChange={(e) => setExecutionMode(e.target.value as 'vertical')}
                  className="mr-2 w-4 h-4"
                />
                <span className="text-sm">Execution vertically <span className="text-gray-600">(1 serie for station)</span></span>
              </label>
            </div>
            
            {/* Right Box - Horizontal Flow */}
            <div className={`bg-gray-50 border-2 rounded-lg p-4 transition-all ${
              seriesMode === 'time' ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-100' : 'cursor-pointer ' + (executionMode === 'horizontal' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white')
            }`} onClick={() => seriesMode !== 'time' && setExecutionMode('horizontal')}>
              <div className="text-center text-sm font-medium text-gray-700 mb-3">
                All the series for station
              </div>
              
              <div className="space-y-3 mb-4">
                {/* Circuit A */}
                <div className="flex items-start gap-2">
                  <div className="w-12 h-12 bg-yellow-400 border-2 border-yellow-600 rounded flex items-center justify-center font-bold text-xl flex-shrink-0">
                    A
                  </div>
                  <div className="flex-1 space-y-3">
                    {[1, 2, 3].map((station, idx) => (
                      <div key={station} className="relative">
                        {/* Top arrow */}
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                          <div className="text-red-600 font-bold text-xl leading-none">↓</div>
                        </div>
                        {/* Yellow padding box */}
                        <div className="bg-yellow-300 border-2 border-yellow-500 rounded-lg p-2 flex items-center gap-2">
                          <div className="flex-1 h-10 bg-cyan-400 rounded"></div>
                          <div className="w-10 h-10 bg-yellow-400 border-2 border-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">⏸</span>
                          </div>
                        </div>
                        {/* Bottom arrow */}
                        {idx < 2 && (
                          <div className="absolute -bottom-3 left-0 right-0 flex justify-center">
                            <div className="text-red-600 font-bold text-xl leading-none">↓</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Circuit B */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-yellow-400 border-2 border-yellow-600 rounded flex items-center justify-center font-bold text-xl">
                    B
                  </div>
                </div>
              </div>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="horizontal"
                  checked={executionMode === 'horizontal'}
                  onChange={(e) => setExecutionMode(e.target.value as 'horizontal')}
                  disabled={seriesMode === 'time'}
                  className="mr-2 w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`text-sm ${seriesMode === 'time' ? 'text-gray-400' : ''}`}>Execution horizontally <span className="text-gray-600">(all series for station)</span></span>
              </label>
            </div>
          </div>
          
          {/* Start Planning Button */}
          <div className="flex items-center justify-center py-6">
            <button
              onClick={() => setCurrentPhase('table')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg shadow-lg"
            >
              Start Planning
            </button>
          </div>
        </div>
      </>
    );
  }
  
  // Second View - Table/Grid Phase
  // When editing from movelap, show only the selection modals
  if (initialConfig?.editingFromMovelap) {
    return (
      <>
        {renderExerciseSelectionModal()}
        {renderRepsEditorModal()}
      </>
    );
  }

  return (
    <>
    <div className="space-y-2">
      {/* Configuration Section - 2026-01-21 19:30 UTC */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-900 mb-4">Circuit Configuration</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Number of Circuits - add/remove at end, never regenerate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Circuits
            </label>
            <input
              type="number"
              min="1"
              max="9"
              value={numCircuits}
              onChange={(e) => handleNumCircuitsChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Stations per Circuit - add/remove in all series of all circuits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stations
            </label>
            <input
              type="number"
              min="2"
              max="9"
              value={stationsPerCircuit}
              onChange={(e) => handleStationsPerCircuitChange(parseInt(e.target.value) || 4)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Series Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Series Mode
            </label>
            <select
              value={seriesMode}
              onChange={(e) => setSeriesMode(e.target.value as 'count' | 'time')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="count">Count</option>
              <option value="time">Continuous Time</option>
            </select>
          </div>
          
          {/* Series count — visible and editable in Count and Continuous Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Series
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={seriesCount}
              onChange={(e) => handleSeriesCountChange(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">1-5 (default: 1)</p>
          </div>
          
          {/* Time per Circuit */}
          <div className={seriesMode !== 'time' ? 'opacity-50' : ''}>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              title="Continuous Time: length of each serie work block (minutes). Yearly period From-to targets belong here, not Macro (Rip)."
            >
              Minutes of work
            </label>
            <input
              type="number"
              min="1"
              max="9"
              value={seriesTime}
              onChange={(e) => setSeriesTime(Math.min(9, Math.max(1, parseInt(e.target.value) || 2)))}
              disabled={seriesMode !== 'time'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              aria-label="Minutes of work per serie in Continuous Time mode"
            />
            <p className="text-xs text-gray-500 mt-1">
              1–9 minutes per serie (default 2). Yearly Continuous Time targets use this field; Macro does not replace it.
            </p>
          </div>
        </div>
        
        {/* Execution Mode */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Execution Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="vertical"
                checked={executionMode === 'vertical'}
                onChange={(e) => setExecutionMode(e.target.value as 'vertical')}
                className="mr-2"
              />
              <span className="text-sm">Vertical (1 serie per exercise, then next)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="horizontal"
                checked={executionMode === 'horizontal'}
                onChange={(e) => setExecutionMode(e.target.value as 'horizontal')}
                disabled={seriesMode === 'time'}
                className="mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className={`text-sm ${seriesMode === 'time' ? 'text-gray-400' : ''}`}>Horizontal (all series, then next exercise)</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Pause Settings Section - 2026-01-21 19:32 UTC - Initial defaults; override per circuit in grid below */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-amber-900 mb-1">Pause Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={
              executionMode === 'horizontal'
                ? 'rounded-md opacity-90 pointer-events-none'
                : ''
            }
          >
            <label className="block text-sm font-medium mb-1">
              Between Stations
            </label>
            <select
              value={pauseAmongStationsDraft}
              onChange={(e) => setPauseDraftStations(parseInt(e.target.value, 10))}
              disabled={executionMode === 'horizontal'}
              title={
                executionMode === 'horizontal'
                  ? 'Horizontal execution: Pause\\stations is disabled. Set rest between stations with “Pause after all the series of each station” in Pause Settings (Count mode).'
                  : undefined
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {STATION_PAUSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Pause between Circuits — Continuous Time wording: Pause among the circuits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {seriesMode === 'time' ? 'Pause among the circuits' : 'Between Circuits'}
            </label>
            <select
              value={pauseDraftCircuits}
              onChange={(e) => setPauseDraftCircuits(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              {CIRCUIT_PAUSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Continuous Time: default for Pause among the series (blue); last serie uses Pause among the circuits or Macro. */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              title={
                seriesMode === 'time'
                  ? 'Default for Pause among the series (blue rows, when needed). The last serie of a circuit uses Pause among the circuits (amber); on the last circuit that slot is Macro, not this default.'
                  : undefined
              }
            >
              {seriesMode === 'time' ? 'Pause among the series' : 'Between series of stations'}
            </label>
            <select
              value={pauseDraftSeries}
              onChange={(e) => setPauseDraftSeries(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              {(seriesMode === 'time' ? CIRCUIT_PAUSE_OPTIONS : SERIES_PAUSE_OPTIONS).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time: Macro digit → Rip (`reps`) only. Count: Load of work → Rip. Footer purple row → Pause only — never Macro. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {seriesMode === 'time' ? 'Macro' : 'Load of work (Reps) - optional'}
            </label>
            <div className="flex items-center gap-2">
              {seriesMode === 'time' ? (
                <select
                  value={loadOfWork}
                  onChange={(e) => setLoadOfWork(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <option key={num} value={String(num)}>
                      {num}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={bulkRepsLoad}
                  onChange={(e) => setBulkRepsLoad(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select...</option>
                  {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={String(num)}>
                      {num}
                    </option>
                  ))}
                  <option value="nc">nc</option>
                </select>
              )}
              <button
                type="button"
                onClick={seriesMode === 'time' ? applyMacroToAllCells : applyBulkRepsLoadToAllCells}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 shrink-0"
                title={
                  seriesMode === 'time'
                    ? 'Apply Macro digit to Rip; also presets footer Pause (digit×10″, e.g. 4→40″). Use Pause Apply below for station cells.'
                    : 'Apply Load of work to Rip column only (never Pause)'
                }
              >
                Apply
              </button>
            </div>
          </div>

          {/* Proceed: go to table phase; alert only if circuits have been previously created with data */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                const circuitsHaveData = circuits.some((c) =>
                  c.stationsBySeries?.some((series) =>
                    series?.some((s) => (s?.sector?.trim?.() ?? '') !== '' || (s?.exercise?.trim?.() ?? '') !== '')
                  )
                );
                if (circuitsHaveData) {
                  alert('All the data of the current circuits will be reset.');
                }
                commitPauseSettingsFromDraft();
                setCurrentPhase('table');
              }}
              className="px-5 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 focus:ring-2 focus:ring-amber-400"
              title="Apply Pause Settings to the grid, then open or stay on the circuit table. Horizontal + Count: Between Circuits, Between series of stations, and pause after all the series of each station."
            >
              Proceed
            </button>
          </div>

          {/* Bulk Pause lives in the purple circuit table footer — not Macro */}

          {executionMode === 'horizontal' && seriesMode === 'count' && (
            <div className="col-span-full mt-2 pt-3 border-t border-amber-200/80">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1 leading-snug">
                  Pause after all the series of each station
                </label>
                <select
                  value={pauseDraftHorizontalSeries}
                  onChange={(e) => setPauseDraftHorizontalSeries(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
                  title="After you finish all series at the current station, rest before starting the next station (not between series at the same station — that is Pause\\series / blue row)."
                >
                  {STATION_PAUSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      {/* Action Buttons - Duplicate under Pause Settings - 2026-01-27 */}
      <div className="flex items-center justify-end gap-3 py-4 border-t">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
        >
          Back
        </button>
        <button
          onClick={() => handleSave()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {initialConfig?.editingFromMovelap || (initialConfig?.existingCircuits && initialConfig.existingCircuits.length > 0) ? 'Save' : 'Add Moveframe'}
        </button>
        <button
          onClick={handleReloadExercises}
          className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          title="This button allows to recall all the exercises in according to the Preferences"
        >
          <RotateCw size={16} />
          Reload exercises
        </button>
        <button
          onClick={() => {
            // Autoscanning - Replace all exercises with random ones from same sector
            if (!confirm('This will replace ALL exercises in the grid with new random exercises from the same muscular sectors. Continue?')) {
              return;
            }
            
            setCircuits(prevCircuits => {
              const newCircuits = JSON.parse(JSON.stringify(prevCircuits)); // Deep clone
              let replacedCount = 0;
              
              newCircuits.forEach((circuit: Circuit) => {
                circuit.stationsBySeries.forEach((seriesStations: Station[]) => {
                  seriesStations.forEach((station: Station) => {
                    if (station.sector) {
                      const randomExercise = getRandomExercise(station.sector, station.exercise);
                      if (randomExercise) {
                        station.exercise = randomExercise.name;
                        replacedCount++;
                      }
                    }
                  });
                });
              });
              
              setActionLog(prev => [...prev, `Autoscanning completed: ${replacedCount} exercises replaced`]);
              return newCircuits;
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          title="Automatically replace all exercises in the grid with new random exercises from the same sectors"
        >
          <RotateCw size={16} />
          Autoscanning
        </button>
        <button
          onClick={() => setShowPreferencesModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          <Settings size={20} />
          Preferences
        </button>
      </div>
      
      {/* Circuit Grid Section - 2026-01-21 19:35 UTC */}
      {/* 2026-01-22 12:20 UTC - Removed overflow to allow dropdown to show properly */}
      {/* 2026-01-22 14:50 UTC - Reduced table width to 4/5 (80%) */}
      <div className="bg-white border border-gray-300 rounded-lg w-4/5 mx-auto">
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900">Circuit Grid</h3>
        </div>
        
        {/* Table - 2026-01-22 14:40 UTC - Removed left X buttons column */}
        <div className="flex">
           {/* Table - 2026-01-22 10:10 UTC - Circuit checkbox under letter */}
           {/* 2026-01-22 12:25 UTC - Keep overflow-x-auto for horizontal scrolling */}
           <div className="flex-1 overflow-x-auto overflow-y-visible" style={{ position: 'relative', zIndex: 1 }}>
           <table className="w-full border-collapse text-sm">
             <thead>
               <tr className="bg-gray-50">
                 <th colSpan={3} className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left">
                   Parameters of work
                 </th>
                 <th colSpan={2} className="border border-gray-300 px-3 py-2 text-sm font-semibold text-center bg-green-50">
                   Exercises
                 </th>
                <th
                  colSpan={3}
                  className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left"
                  title={
                    seriesMode === 'time'
                      ? 'Rip · Pause · Actions — Macro (Pause Settings, Apply) updates Rip only, not Pause.'
                      : 'Rip · Pause · Actions — Load of work updates Rip only, not Pause.'
                  }
                >
                  Rip · Pause · Actions
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Circ</th>
                {executionMode === 'horizontal' && seriesMode === 'count' ? (
                  <>
                    <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Stations</th>
                    <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Series</th>
                  </>
                ) : (
                  <>
                    <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Series</th>
                    <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Stations</th>
                  </>
                )}
                <th className="border border-gray-300 px-2 py-1 text-sm font-medium bg-green-50" style={{minWidth: '200px'}}>Sectors</th>
                <th className="border border-gray-300 px-2 py-1 text-sm font-medium bg-green-50" style={{minWidth: '250px'}}>Exercise</th>
                 <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Rip</th>
                 <th className="border border-gray-300 px-2 py-1 text-sm font-medium">Pause</th>
                 <th className="border border-gray-300 px-2 py-1 text-sm font-medium text-center">Actions</th>
              </tr>
             </thead>
            <tbody>
              {circuits.map((circuit, circuitIdx) => {
                // Row counts must match exactly what we render: only series 0..seriesCountToRender-1.
                // Summing all stationsBySeries entries when circuit.series is smaller caused too-large
                // Circ rowSpan → rowSpan ended late / table column grid broke (misaligned last station in Time mode).
                const seriesCountToRender = Math.min(circuit.series, circuit.stationsBySeries?.length ?? 0);
                if (executionMode === 'horizontal' && seriesMode === 'count') {
                  return (
                    <HorizontalSeriesCircuitGrid
                      key={circuit.letter}
                      circuit={circuit}
                      circuitIdx={circuitIdx}
                      circuits={circuits}
                      seriesCountToRender={seriesCountToRender}
                      pauseHorizontalSeries={pauseHorizontalSeries}
                      pauseSeries={pauseSeries}
                      pauseCircuits={pauseCircuits}
                      selectedCircuits={selectedCircuits}
                      selectedSeries={selectedSeries}
                      copyClickTimer={copyClickTimer}
                      setCircuits={setCircuits}
                      setShowExerciseMenu={setShowExerciseMenu}
                      setCopyClickTimer={setCopyClickTimer}
                      setExerciseGallery={setExerciseGallery}
                      setLoadNewStationScan={setLoadNewStationScan}
                      handleCircuitLetterClick={handleCircuitLetterClick}
                      toggleCircuitSelection={toggleCircuitSelection}
                      handleRemoveCircuit={handleRemoveCircuit}
                      reloadExercisesForCircuitHorizontal={reloadExercisesForCircuitHorizontal}
                      reloadExercisesForStationHorizontal={reloadExercisesForStationHorizontal}
                      horizontalStationColumnFullySelected={horizontalStationColumnFullySelected}
                      toggleHorizontalStationColumnSelection={toggleHorizontalStationColumnSelection}
                      toggleSeriesSelection={toggleSeriesSelection}
                      handleCopySeries={handleCopySeries}
                      handleDropOnStation={handleDropOnStation}
                      handleSectorCellClick={handleSectorCellClick}
                      handleDragStartFromStation={handleDragStartFromStation}
                      handleRemoveSector={handleRemoveSector}
                      handleDragExerciseOver={handleDragExerciseOver}
                      handleDropExercise={handleDropExercise}
                      handleDragExerciseStart={handleDragExerciseStart}
                      handleRemoveStation={handleRemoveStation}
                      handleCopyToNextStation={handleCopyToNextStation}
                      handleCopyRipPauseToRestOfSeries={handleCopyRipPauseToRestOfSeries}
                      MUSCULAR_SECTOR_IMAGES={MUSCULAR_SECTOR_IMAGES}
                      STATION_PAUSE_OPTIONS={STATION_PAUSE_OPTIONS}
                      SERIES_PAUSE_OPTIONS={SERIES_PAUSE_OPTIONS}
                      CIRCUIT_PAUSE_OPTIONS={CIRCUIT_PAUSE_OPTIONS}
                      formatPauseSeconds={formatPauseSeconds}
                    />
                  );
                }
                const seriesSlice = (circuit.stationsBySeries ?? []).slice(0, seriesCountToRender);
                const stationRowsCount = seriesSlice.reduce((sum, ss) => sum + (ss?.length ?? 0), 0);
                const betweenCircuitsRows = circuitIdx < circuits.length - 1 ? 1 : 0;
                // Count mode: between-series rows + optional "Between Circuits" row (already in this count).
                const betweenSeriesRowsCount =
                  seriesMode !== 'time'
                    ? Math.max(0, circuit.series - 1 + betweenCircuitsRows)
                    : 0;
                // Time mode: after each non-empty serie — one yellow row: "Repeat continuously for X'" + pause/macro controls.
                const timeModeFooterRows =
                  seriesMode === 'time' ? seriesSlice.filter((ss) => ss?.length).length : 0;
                const totalRows =
                  stationRowsCount + betweenSeriesRowsCount + timeModeFooterRows;
                let lastNonEmptySeriesIdx = -1;
                for (let i = seriesCountToRender - 1; i >= 0; i--) {
                  if (circuit.stationsBySeries[i]?.length) {
                    lastNonEmptySeriesIdx = i;
                    break;
                  }
                }
                let rowIndex = 0;
                return (
                  <React.Fragment key={circuit.letter}>
                    {seriesMode === 'time' && (
                      <tr
                        key={`continuous-time-banner-${circuit.letter}`}
                        className="bg-yellow-200 border-y-2 border-yellow-500"
                        style={{ minHeight: '40px' }}
                      >
                        <td
                          colSpan={8}
                          className="border-l border-r border-t border-b border-yellow-600 px-4 py-2"
                        >
                          <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-start sm:gap-6">
                            <div className="min-w-0 text-xs font-medium leading-snug text-yellow-900">
                              <span className="font-semibold text-yellow-950">Circuit {circuit.letter}</span>
                              {' · Continuous Time: yellow rows after each serie show '}
                              <span className="font-semibold">{`Repeat continuously for ${seriesTime}'`}</span>
                              {' plus the pause/macro dropdown. Between series: pause among the series; after last serie of a circuit: pause among the circuits; on the '}
                              <span className="font-semibold">last</span> circuit: <span className="font-semibold">Macro</span>.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {Array.from({ length: seriesCountToRender }).map((_, seriesIdx) => {
                      const seriesStations = circuit.stationsBySeries[seriesIdx];
                      if (!seriesStations?.length) return <React.Fragment key={`series-${circuit.letter}-${seriesIdx}`} />;
                      const isLastSeries = seriesIdx === lastNonEmptySeriesIdx;

                      return (
                        <React.Fragment key={`series-${circuit.letter}-${seriesIdx}`}>
                          {seriesStations.map((station, stationIdx) => {
                        const isFirstRowOfCircuit = rowIndex === 0;
                        const isFirstRowOfSeries = stationIdx === 0;
                            const isLastStationOfSeries = stationIdx === seriesStations.length - 1;
                        rowIndex++;
                        
                         return (
                              <tr key={`${circuit.letter}-${seriesIdx}-${stationIdx}`} className="hover:bg-gray-50" style={{height: '70px'}}>
                             {/* Circuit Letter with Checkbox and X button underneath - 2026-01-22 10:10 UTC */}
                             {/* 2026-01-22 14:40 UTC - Moved red X button under checkbox */}
                             {isFirstRowOfCircuit && (
                               <td 
                                 rowSpan={totalRows} 
                                 className="border border-gray-300 px-2 py-2 text-center align-middle hover:bg-yellow-50"
                               >
                                 <div className="flex flex-col items-center gap-1">
                                   <span 
                                     className="font-bold text-lg cursor-pointer hover:text-blue-600"
                                     onClick={() => handleCircuitLetterClick(circuit.letter)}
                                     title="Click to select sectors for all stations"
                                   >
                                     {circuit.letter}
                                   </span>
                                   <input
                                     type="checkbox"
                                     checked={selectedCircuits.has(circuit.letter)}
                                     onChange={() => toggleCircuitSelection(circuit.letter)}
                                     className="w-4 h-4 cursor-pointer"
                                     title="Select circuit for removal"
                                   />
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleRemoveCircuit(circuit.letter);
                                     }}
                                     className="w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center hover:bg-red-50 transition-colors mt-1"
                                     title={`Delete entire circuit ${circuit.letter}`}
                                   >
                                     <X size={16} className="text-red-600" strokeWidth={2.5} />
                                   </button>
                                 </div>
                               </td>
                             )}
                             
                            {/* Series Checkbox & Number - 2026-01-22 10:00 UTC */}
                            {/* 2026-01-22 14:05 UTC - Fixed: Use current series length instead of series[0] */}
                            {/* 2026-01-22 14:40 UTC - Moved black X button under checkbox */}
                            {isFirstRowOfSeries && (
                              <td 
                                rowSpan={seriesStations.length}
                                className="relative border border-gray-300 px-2 py-2 text-center align-middle"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    reloadExercisesForSeries(circuit.letter, seriesIdx + 1);
                                  }}
                                  className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors z-50 bg-white"
                                  title={`Rescan exercises of series ${seriesIdx + 1} in circuit ${circuit.letter}`}
                                >
                                  <Image src="/rescan.png" alt="rescan" width={24} height={24} className="w-6 h-6 pointer-events-none" />
                                </button>
                                <div className="absolute inset-0 flex items-center justify-center gap-2 pt-12 pointer-events-none">
                                  <input
                                    type="checkbox"
                                    checked={selectedSeries.has(`${circuit.letter}-${seriesIdx + 1}`)}
                                    onChange={() => toggleSeriesSelection(circuit.letter, seriesIdx + 1)}
                                    className="w-4 h-4 cursor-pointer pointer-events-auto"
                                    title="Select series for removal"
                                  />
                                  <span className="text-sm pointer-events-none">{seriesIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopySeries(circuit.letter, seriesIdx + 1);
                                    }}
                                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-green-100 border border-green-600 pointer-events-auto"
                                    title="Copy serie: copy all data (sectors, exercises, reps, pause) to next series or create new one"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                  </button>
                                  {/* <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCopySeries(circuit.letter, seriesIdx + 1);
                                    }}
                                    className="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center hover:bg-gray-100 transition-colors pointer-events-auto"
                                    title={`Delete series ${seriesIdx + 1} of circuit ${circuit.letter}`}
                                  >
                                    Copy serie
                                  </button> */}
                                </div>
                               </td>
                             )}
                             
                             {/* Station Checkbox & Number - 2026-01-22 10:00 UTC */}
                             <td className="border border-gray-300 px-2 py-2 text-center">
                               <div className="flex items-center justify-center gap-2">
                                 <input
                                   type="checkbox"
                                   checked={selectedStations.has(`${circuit.letter}-${seriesIdx + 1}-${station.stationNumber}`)}
                                   onChange={() => toggleStationSelection(circuit.letter, seriesIdx + 1, station.stationNumber)}
                                   className="w-4 h-4 cursor-pointer"
                                   title="Select station for removal"
                                 />
                                 <span className="text-sm">{station.stationNumber}</span>
                               </div>
                             </td>
                            
                            {/* Sector - 2026-01-21 19:50 UTC */}
                            {/* 2026-01-22 12:45 UTC - Display image with name */}
                            {/* 2026-01-22 12:50 UTC - Made draggable between stations, added remove button */}
                            {/* 2026-01-22 13:10 UTC - Click to open selector modal */}
                            <td 
                              className="border border-gray-300 px-2 py-1 bg-green-50 cursor-pointer hover:bg-green-100"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDropOnStation(e, circuit.letter, seriesIdx, station.stationNumber)}
                              onClick={() => !station.sector && handleSectorCellClick(circuit.letter, seriesIdx, station.stationNumber)}
                            >
                              {station.sector && MUSCULAR_SECTOR_IMAGES[station.sector] ? (
                                <div className="flex items-center gap-2 group">
                                  <div 
                                    draggable
                                    onDragStart={(e) => handleDragStartFromStation(e, station.sector, circuit.letter, seriesIdx, station.stationNumber)}
                                    className="flex items-center gap-2 flex-1 cursor-move hover:opacity-70"
                                  >
                                    <Image 
                                      src={MUSCULAR_SECTOR_IMAGES[station.sector]} 
                                      alt={station.sector}
                                      width={56}
                                      height={56}
                                      className="w-14 h-14 object-contain flex-shrink-0 pointer-events-none"
                                    />
                                    <span className="text-sm font-medium text-gray-700 flex-1">
                                      {station.sector}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSector(circuit.letter, seriesIdx, station.stationNumber);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                    title="Remove sector"
                                  >
                                    <X size={16} className="text-red-600" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center min-h-[50px]">
                                  <span className="text-sm text-gray-400">+</span>
                                </div>
                              )}
                            </td>
                            
                            {/* Exercise with Three Bars Drag Handle - 2026-01-21 20:30 UTC */}
                            {/* 2026-01-22 14:40 UTC - Changed to draggable for moving exercises */}
                            {/* Double-click on Exercise opens Load new station scan modal directly */}
                            <td 
                              className="border border-gray-300 px-0 py-0 bg-green-50 cursor-pointer"
                              onDragOver={handleDragExerciseOver}
                              onDrop={(e) => handleDropExercise(e, circuit.letter, seriesIdx + 1, station.stationNumber)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                const currentSector = station?.sector;
                                if (currentSector) {
                                  const allExercises = getExercisesBySector(currentSector);
                                  const currentSeriesStations = circuit.stationsBySeries[seriesIdx] || [];
                                  const alreadyInSeries = new Set(
                                    currentSeriesStations
                                      .map((s: Station) => s.exercise)
                                      .filter((ex: string) => ex && ex.trim() !== '') as string[]
                                  );
                                  const notInSeries = allExercises.filter(ex => !alreadyInSeries.has(ex.name));
                                  const inSeries = allExercises.filter(ex => alreadyInSeries.has(ex.name));
                                  const orderedCandidates = [...notInSeries, ...inSeries];
                                  if (orderedCandidates.length > 0) {
                                    setLoadNewStationScan({
                                      circuitIdx,
                                      seriesIdx,
                                      stationIdx,
                                      sector: currentSector,
                                      orderedCandidates,
                                      scanIndex: 0
                                    });
                                  } else {
                                    alert(`No exercises available for ${currentSector}.`);
                                  }
                                } else {
                                  alert('Please assign a muscular sector first.');
                                }
                              }}
                              title="Double-click to open Load new station"
                            >
                              <div className="flex items-center gap-1 exercise-menu-container relative z-[10000]">
                                {/* Exercise thumb — click opens A/B gallery */}
                                {(() => {
                                  const picA = getExercisePictureAThumbnailForDisplay(
                                    (station.exercise || '').trim()
                                  );
                                  const sectorImg =
                                    station.sector && MUSCULAR_SECTOR_IMAGES[station.sector]
                                      ? MUSCULAR_SECTOR_IMAGES[station.sector]
                                      : null;
                                  const src =
                                    picA?.src ??
                                    (station.exercise?.trim() && sectorImg ? sectorImg : null);
                                  const openGallery = () => {
                                    const exName = (station.exercise || '').trim();
                                    const sectorS = (station.sector || '').trim();
                                    const media = exName ? getExerciseMedia(exName) : null;
                                    const title = exName || (sectorS ? `${sectorS} — select exercise` : 'Exercise');
                                    const fallback = sectorImg || null;
                                    setExerciseGallery({
                                      title,
                                      pictureA: media?.pictureA ?? fallback,
                                      pictureB: media?.pictureB ?? media?.pictureA ?? fallback,
                                    });
                                  };
                                  if (!src) {
                                    return (
                                      <button
                                        type="button"
                                        className="ml-1 h-11 w-11 flex-shrink-0 rounded-md border border-green-300 bg-green-100 hover:bg-green-200"
                                        title="Click to view muscular area / exercise images"
                                        aria-label="Open exercise images"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openGallery();
                                        }}
                                      />
                                    );
                                  }
                                  const isData =
                                    picA?.isDataUrl === true || (!!src && src.startsWith('data:'));
                                  return (
                                    <button
                                      type="button"
                                      title="Click to enlarge positions A and B"
                                      className="ml-1 h-11 w-11 flex-shrink-0 overflow-hidden rounded-md border border-green-300 bg-green-50 hover:ring-2 hover:ring-teal-500"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openGallery();
                                      }}
                                    >
                                      {isData ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- data: SVG URLs are not supported by next/image here
                                        <img
                                          src={src}
                                          alt=""
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <Image
                                          src={src}
                                          alt=""
                                          width={44}
                                          height={44}
                                          className="h-full w-full object-contain"
                                          unoptimized
                                        />
                                      )}
                                    </button>
                                  );
                                })()}
                                <input
                                  type="text"
                                  value={station.exercise}
                                  readOnly
                                  placeholder="Select exercise"
                                  className="min-w-0 flex-1 px-2 py-2 text-sm border-0 bg-green-100 pointer-events-none"
                                />
                                <button
                                  draggable
                                  onDragStart={(e) => handleDragExerciseStart(e, circuit.letter, seriesIdx + 1, station.stationNumber)}
                                  className="p-2 hover:bg-gray-200 rounded mr-1 cursor-move"
                                  title="Drag to move exercise"
                                >
                                  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                                    <rect x="2" y="3" width="12" height="2" rx="1"/>
                                    <rect x="2" y="7" width="12" height="2" rx="1"/>
                                    <rect x="2" y="11" width="12" height="2" rx="1"/>
                                  </svg>
                                </button>
                                
                              </div>
                            </td>
                            
                            {/* Rip (Repetitions) - 2026-01-21 20:30 UTC */}
                            <td className="border border-gray-300 px-2 py-1">
                              <select 
                                value={station.reps != null && station.reps !== '' ? String(station.reps) : ''}
                                onChange={(e) => {
                                  // 2026-01-22 12:15 UTC - Fixed to use series-specific stations
                                  setCircuits(prevCircuits => {
                                    const newCircuits = JSON.parse(JSON.stringify(prevCircuits)); // Deep clone
                                    newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].reps = e.target.value;
                                    return newCircuits;
                                  });
                                }}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                              >
                                <option value="">-</option>
                                {Array.from({ length: 99 }, (_, i) => i + 1).map(num => (
                                  <option key={num} value={String(num)}>{num}</option>
                                ))}
                                <option value="nc">nc</option>
                              </select>
                            </td>
                            
                             {/* Pause — vertical: inter-station in cell; last col → blue/yellow. Horizontal: Pause\series between rows; last row non-last col → pause after all series at station. */}
                             <td className="border border-gray-300 px-2 py-1">
                               {seriesMode === 'time' && isLastStationOfSeries ? (
                                 <div
                                   className="flex min-h-[38px] items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 px-2 text-sm text-gray-400"
                                   title={
                                     !isLastSeries
                                       ? `Continuous Time: yellow row below — Repeat continuously for ${seriesTime}', then Pause among the series (when needed).`
                                       : circuitIdx < circuits.length - 1
                                         ? `Continuous Time: yellow row below — Repeat continuously for ${seriesTime}', then Pause among the circuits (when needed).`
                                         : `Continuous Time: yellow row below — Repeat continuously for ${seriesTime}', then Macro (end of workout rest).`
                                   }
                                   aria-label="Pause or macro controlled by row below"
                                 >
                                   —
                                 </div>
                               ) : seriesMode === 'count' &&
                                 executionMode === 'horizontal' &&
                                 seriesIdx < seriesCountToRender - 1 ? (
                                 <div
                                   className="flex min-h-[38px] items-center justify-center rounded border border-gray-200 bg-blue-50/60 px-2 text-sm font-medium text-blue-900"
                                   title="Horizontal: rest after this serie at this station — Pause\\series (blue row between series)."
                                 >
                                   {formatPauseSeconds(
                                     SERIES_PAUSE_OPTIONS,
                                     circuit.seriesPauses?.[seriesIdx] ??
                                       circuit.pauseBetweenSeries ??
                                       pauseSeries
                                   )}
                                 </div>
                               ) : seriesMode === 'count' &&
                                 executionMode === 'horizontal' &&
                                 seriesIdx === seriesCountToRender - 1 &&
                                 !isLastStationOfSeries ? (
                                 <div
                                   className="flex min-h-[38px] items-center justify-center rounded border border-gray-200 bg-gray-100 px-2 text-sm font-medium text-gray-700"
                                  title="Horizontal: after all series at this station, rest before the next station — Pause after all the series of each station (Pause Settings)."
                                 >
                                   {formatPauseSeconds(
                                     STATION_PAUSE_OPTIONS,
                                    station.pause ?? pauseHorizontalSeries
                                   )}
                                 </div>
                               ) : seriesMode !== 'time' && isLastStationOfSeries ? (
                                 <div
                                   className="flex min-h-[38px] items-center justify-center px-2 text-xs text-center font-semibold text-blue-600"
                                   title={
                                     isLastSeries && circuitIdx === circuits.length - 1
                                       ? 'Pause among the circuits (amber) or Macro (last circuit) — see rows below.'
                                       : 'Rest after the last station of this serie: Pause among the series (blue) or Pause among the circuits (amber after last serie).'
                                   }
                                 >
                                   ↓ look down here
                                 </div>
                               ) : (
                                 <select
                                   value={station.pause}
                                   onChange={(e) => {
                                     const value = parseInt(e.target.value, 10);
                                     setCircuits((prevCircuits) => {
                                       const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                                       newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].pause =
                                         value;
                                       return newCircuits;
                                     });
                                   }}
                                   className="w-full px-2 py-2 text-sm border border-gray-300 rounded"
                                 >
                                   {STATION_PAUSE_OPTIONS.map((opt) => (
                                     <option key={opt.value} value={opt.value}>
                                       {opt.label}
                                     </option>
                                   ))}
                                 </select>
                               )}
                             </td>
                             
                             {/* Actions - 2026-01-22 14:40 UTC - Edit and Copy buttons */}
                             {/* 2026-01-22 14:50 UTC - Centered buttons */}
                             {/* 2026-01-26 Added delete button */}
                             <td className="border border-gray-300 px-2 py-1">
                               <div className="flex items-center justify-center gap-1">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const rect = e.currentTarget.getBoundingClientRect();
                                     setShowExerciseMenu({
                                       circuit: circuit.letter, 
                                       series: seriesIdx + 1, 
                                       station: station.stationNumber,
                                       x: rect.left,
                                       y: rect.bottom + 4
                                     });
                                   }}
                                   className="px-2 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                   title="Edit station"
                                 >
                                   Edit
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (copyClickTimer) {
                                       clearTimeout(copyClickTimer);
                                       setCopyClickTimer(null);
                                       handleCopyRipPauseToRestOfSeries(circuit.letter, seriesIdx, station.stationNumber);
                                     } else {
                                       const timer = setTimeout(() => {
                                         handleCopyToNextStation(circuit.letter, seriesIdx, station.stationNumber);
                                         setCopyClickTimer(null);
                                       }, 300);
                                       setCopyClickTimer(timer);
                                     }
                                   }}
                                   className="p-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                                  title="Single click: copy Rip & Pause to the next station in this serie only (sector & exercise unchanged). Double click: copy Rip & Pause to all following stations in this serie until the end (last station keeps bar pause)."
                                 >
                                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                     <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                     <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                   </svg>
                                 </button>
                                 <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStation(circuit.letter, station.stationNumber, seriesIdx + 1);
                                  }}
                                   className="p-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                   title="Delete station"
                                 >
                                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                     <polyline points="3 6 5 6 21 6"></polyline>
                                     <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                     <line x1="10" y1="11" x2="10" y2="17"></line>
                                     <line x1="14" y1="11" x2="14" y2="17"></line>
                                   </svg>
                                 </button>
                               </div>
                             </td>
                          </tr>
                        );
                          })}
                          
                          {/* Continuous Time: one yellow row per serie — "Repeat continuously for X'" + pause among series / circuits / macro (dropdown). */}
                          {/* Count mode: "Between series of stations" - show only between series (not after last) */}
                          {seriesMode === 'time' ? (
                            <>
                              {!isLastSeries ? (
                                <tr
                                  key={`ct-pause-series-${circuit.letter}-${seriesIdx}`}
                                  className="bg-yellow-200 border-y-2 border-yellow-500"
                                  style={{ minHeight: '44px' }}
                                >
                                  <td
                                    colSpan={7}
                                    className="border-l border-r border-t border-b border-yellow-600 px-4 py-2"
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                      <div className="min-w-0 leading-tight">
                                        <div className="text-sm font-bold text-yellow-950">
                                          {`Repeat continuously for ${seriesTime}'`}
                                        </div>
                                        <div
                                          className="mt-0.5 text-xs font-semibold text-yellow-900"
                                          title={`Continuous Time — ${seriesTime}' per serie. Pause among the series (when needed): rest before the next serie in this circuit.`}
                                        >
                                          Pause among the series (when needed)
                                          <span className="block font-normal text-yellow-900/90">
                                            {`${seriesTime}' work block / serie`}
                                          </span>
                                        </div>
                                      </div>
                                      <select
                                        value={
                                          circuit.seriesPauses?.[seriesIdx] ??
                                          circuit.pauseBetweenSeries ??
                                          pauseSeries
                                        }
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value, 10);
                                          setCircuits((prevCircuits) => {
                                            const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                                            const c = newCircuits[circuitIdx];
                                            const n = c.stationsBySeries?.length ?? 0;
                                            const len = seriesPausesSlotCount(n, 'time');
                                            const fbBetween = c.pauseBetweenSeries ?? pauseSeries;
                                            const fbAfter = c.pauseAfterCircuit ?? pauseCircuits;
                                            let arr = Array.isArray(c.seriesPauses) ? [...c.seriesPauses] : [];
                                            while (arr.length < len) {
                                              const i = arr.length;
                                              arr.push(i < len - 1 ? fbBetween : fbAfter);
                                            }
                                            if (arr.length > len) arr = arr.slice(0, len);
                                            arr[seriesIdx] = value;
                                            c.seriesPauses = len > 0 ? arr : undefined;
                                            return newCircuits;
                                          });
                                        }}
                                        className="shrink-0 px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                                      >
                                        {CIRCUIT_PAUSE_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              ) : circuitIdx < circuits.length - 1 ? (
                                <tr
                                  key={`ct-pause-circuits-${circuit.letter}-${seriesIdx}`}
                                  className="bg-yellow-200 border-y-2 border-yellow-500"
                                  style={{ minHeight: '44px' }}
                                >
                                  <td
                                    colSpan={7}
                                    className="border-l border-r border-t border-b border-yellow-600 px-4 py-2"
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                      <div className="min-w-0 leading-tight">
                                        <div className="text-sm font-bold text-yellow-950">
                                          {`Repeat continuously for ${seriesTime}'`}
                                        </div>
                                        <div
                                          className="mt-0.5 text-xs font-semibold text-yellow-900"
                                          title={`Continuous Time — Pause among the circuits (when needed): after the last serie of this circuit (${seriesTime}' work block / serie), rest before the next circuit.`}
                                        >
                                          Pause among the circuits (when needed)
                                          <span className="block font-normal text-yellow-900/90">
                                            {`${seriesTime}' work block / serie`}
                                          </span>
                                        </div>
                                      </div>
                                      <select
                                        value={circuit.pauseAfterCircuit ?? pauseCircuits}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value, 10);
                                          setCircuits((prevCircuits) => {
                                            const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                                            const c = newCircuits[circuitIdx];
                                            c.pauseAfterCircuit = value;
                                            const n = c.stationsBySeries?.length ?? 0;
                                            const len = seriesPausesSlotCount(n, 'time');
                                            const fbBetween = c.pauseBetweenSeries ?? pauseSeries;
                                            let arr = Array.isArray(c.seriesPauses) ? [...c.seriesPauses] : [];
                                            while (arr.length < len) {
                                              const i = arr.length;
                                              arr.push(i < len - 1 ? fbBetween : value);
                                            }
                                            if (arr.length > len) arr = arr.slice(0, len);
                                            const lastIdx = len - 1;
                                            if (lastIdx >= 0) arr[lastIdx] = value;
                                            c.seriesPauses = len > 0 ? arr : undefined;
                                            return newCircuits;
                                          });
                                        }}
                                        className="shrink-0 px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                                      >
                                        {CIRCUIT_PAUSE_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr
                                  key={`ct-macro-final-${circuit.letter}-${seriesIdx}`}
                                  className="bg-yellow-200 border-y-2 border-yellow-500"
                                  style={{ minHeight: '44px' }}
                                >
                                  <td
                                    colSpan={7}
                                    className="border-l border-r border-t border-b border-yellow-600 px-4 py-2"
                                  >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                      <div className="min-w-0 leading-tight">
                                        <div className="text-sm font-bold text-yellow-950">
                                          {`Repeat continuously for ${seriesTime}'`}
                                        </div>
                                        <div
                                          className="mt-0.5 text-xs font-semibold text-violet-900"
                                          title={`Continuous Time — Macro (not Pause among the circuits): after the last serie of the last circuit (${seriesTime}' work block / serie). This row sets the final timing / macro rest.`}
                                        >
                                          Macro — end of workout rest
                                          <span className="block font-normal text-violet-800/95">
                                            {`Replaces Pause among the circuits here · ${seriesTime}' work block / serie`}
                                          </span>
                                        </div>
                                      </div>
                                      <select
                                        value={
                                          circuit.seriesPauses?.[seriesIdx] ??
                                          circuit.pauseAfterCircuit ??
                                          pauseCircuits
                                        }
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value, 10);
                                          setCircuits((prevCircuits) => {
                                            const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                                            const c = newCircuits[circuitIdx];
                                            c.pauseAfterCircuit = value;
                                            const n = c.stationsBySeries?.length ?? 0;
                                            const len = seriesPausesSlotCount(n, 'time');
                                            const fbBetween = c.pauseBetweenSeries ?? pauseSeries;
                                            let arr = Array.isArray(c.seriesPauses) ? [...c.seriesPauses] : [];
                                            while (arr.length < len) {
                                              const i = arr.length;
                                              arr.push(i < len - 1 ? fbBetween : value);
                                            }
                                            if (arr.length > len) arr = arr.slice(0, len);
                                            arr[seriesIdx] = value;
                                            c.seriesPauses = len > 0 ? arr : undefined;
                                            return newCircuits;
                                          });
                                        }}
                                        className="shrink-0 px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                                      >
                                        {CIRCUIT_PAUSE_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ) : !isLastSeries && (
                            <tr className="bg-blue-50" style={{height: '40px'}}>
                              <td colSpan={7} className="border-l border-r border-t border-b border-gray-300 px-4 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-blue-700">
                                    Between series of stations
                                  </span>
                                  <select 
                                    value={
                                      circuit.seriesPauses?.[seriesIdx] ??
                                      circuit.pauseBetweenSeries ??
                                      pauseSeries
                                    }
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value, 10);
                                      setCircuits((prevCircuits) => {
                                        const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                                        const c = newCircuits[circuitIdx];
                                        const n = c.stationsBySeries?.length ?? 0;
                                        const len = seriesPausesSlotCount(n, 'count');
                                        const fb = c.pauseBetweenSeries ?? pauseSeries;
                                        let arr = Array.isArray(c.seriesPauses) ? [...c.seriesPauses] : [];
                                        while (arr.length < len) arr.push(arr[arr.length - 1] ?? fb);
                                        if (arr.length > len) arr = arr.slice(0, len);
                                        arr[seriesIdx] = value;
                                        c.seriesPauses = len > 0 ? arr : undefined;
                                        return newCircuits;
                                      });
                                    }}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                                  >
                                    {SERIES_PAUSE_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Pause Between Circuits Row — Count mode only (Continuous Time: Pause among the circuits inline after the last serie row above). */}
                    {seriesMode !== 'time' && circuitIdx < circuits.length - 1 && (
                      <tr className="bg-yellow-50" style={{height: '40px'}}>
                        <td colSpan={7} className="border-l border-r border-t border-b border-gray-300 px-4 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-amber-700">Between Circuits</span>
                            <select 
                              value={circuit.pauseAfterCircuit}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                setCircuits(prevCircuits => {
                                  const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                                  newCircuits[circuitIdx].pauseAfterCircuit = value;
                                  return newCircuits;
                                });
                              }}
                              className="px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              {CIRCUIT_PAUSE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {/* Bulk-fill inter-station Pause column. Continuous Time: Macro Apply presets this dropdown (digit→×10″); Apply here fills station Pause cells. */}
            <tfoot>
              <tr className="bg-purple-50" style={{height: '40px'}}>
                <td colSpan={8} className="border-l border-r border-t border-b border-gray-300 px-4 py-2">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className="text-sm font-semibold text-purple-700"
                      title={
                        seriesMode === 'time'
                          ? 'Rest between stations. Macro Apply above presets this value (digit×10″, e.g. 4→40″); click Apply here to write Pause cells. Rip unchanged by this row.'
                          : 'Rest between stations — applies this Pause value only. Macro / Load of work affects Rip, not these Pause cells.'
                      }
                    >
                      Pause
                    </span>
                    <select
                      value={bulkPauseFooterSeconds}
                      onChange={(e) => setBulkPauseFooterSeconds(e.target.value)}
                      disabled={executionMode === 'horizontal'}
                      className="px-2 py-1 text-sm border border-gray-300 rounded min-w-[7rem] disabled:bg-gray-200 disabled:cursor-not-allowed"
                    >
                      <option value="">Select...</option>
                      {STATION_PAUSE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={applyPauseToAllStations}
                      disabled={executionMode === 'horizontal'}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={
                        executionMode === 'horizontal'
                          ? 'Horizontal execution: set inter-station rest with “Pause after all the series of each station” in Pause Settings, not this footer.'
                          : 'Apply this pause to every station Pause cell. Does not change Rip or Macro.'
                      }
                    >
                      Apply
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      </div>
      
      {/* Sector Selector Modal with Drag & Drop - 2026-01-22 12:40 UTC */}
      {/* 2026-01-22 13:10 UTC - Updated to support single station selection */}
      {showSectorSelector && (selectedCircuitForSector || selectedStationForSector) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pointer-events-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {selectedStationForSector 
                  ? executionMode === 'horizontal' && seriesMode === 'count'
                    ? `Select Muscular Area - Circuit ${selectedStationForSector.circuitLetter} / Station ${selectedStationForSector.stationNumber} (all series)`
                    : `Select Muscular Area - Circuit ${selectedStationForSector.circuitLetter} / Series ${selectedStationForSector.seriesIdx + 1} / Station ${selectedStationForSector.stationNumber}`
                  : `Drag Muscular Areas to Stations - Circuit ${selectedCircuitForSector}`
                }
              </h3>
              <button
                onClick={() => {
                  if ((initialConfig as any)?.hideUI) {
                    onCancel();
                  } else {
                    setShowSectorSelector(false);
                    setSelectedCircuitForSector(null);
                    setSelectedStationForSector(null);
                    setPreviousStationSector(null); // 2026-01-26 - Clear previous sector highlight
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Muscular Areas - 2026-01-22 12:40 UTC */}
            {/* 2026-01-22 13:10 UTC - Support for single station selection */}
            {/* 2026-01-22 13:15 UTC - Removed scrollbar from this section */}
            {/* 2026-01-22 14:30 UTC - Updated background color to RGB(230, 252, 255) */}
            {/* 2026-01-22 15:00 UTC - Fixed grid layout to display in 2 rows */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                {selectedStationForSector ? 'Select a muscular area:' : 'Drag from here:'}
              </h4>
              <div className="grid grid-cols-6 gap-4 p-4 rounded-lg border-2 border-dashed border-gray-300" style={{backgroundColor: 'rgb(230, 252, 255)'}}>
                {MUSCULAR_SECTORS.filter(sector => MUSCULAR_SECTOR_IMAGES[sector]).map(sector => {
                  // 2026-01-26 - Highlight previous station's sector in red
                  const isPreviousSector = previousStationSector && sector === previousStationSector;
                  const sectorPresence = sectorPresenceByCircuitSeries[sector] || [];
                  const visiblePresence = sectorPresence.slice(0, 10);
                  const hasMorePresence = sectorPresence.length > 10;
                  const presenceText = visiblePresence.join('-') + (hasMorePresence ? '-...' : '');
                  
                  return (
                  <div
                    key={sector}
                    draggable={!selectedStationForSector}
                    onDragStart={(e) => !selectedStationForSector && handleDragStart(e, sector)}
                    onClick={() => {
                      if (selectedStationForSector) {
                        // Single station mode - click to select
                        handleDropOnStation(
                          { preventDefault: () => {}, dataTransfer: { getData: () => sector } } as any,
                          selectedStationForSector.circuitLetter,
                          selectedStationForSector.seriesIdx,
                          selectedStationForSector.stationNumber
                        );
                        setShowSectorSelector(false);
                        setSelectedStationForSector(null);
                        setPreviousStationSector(null);
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded border transition-all ${
                      isPreviousSector 
                        ? 'bg-red-100 border-red-500 border-2' 
                        : 'bg-white border-gray-300'
                    } ${
                      selectedStationForSector 
                        ? 'cursor-pointer hover:border-green-500 hover:bg-green-50 hover:shadow-md' 
                        : 'cursor-move hover:border-blue-500 hover:shadow-md'
                    }`}
                    title={isPreviousSector ? `${sector} (Previous station)` : sector}
                  >
                    <Image 
                      src={MUSCULAR_SECTOR_IMAGES[sector]} 
                      alt={sector}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-contain pointer-events-none"
                    />
                    <span className={`text-sm text-center font-medium leading-tight ${
                      isPreviousSector ? 'text-red-600 font-bold' : 'text-gray-700'
                    }`}>
                      {sector}
                    </span>
                    {isPreviousSector && selectedStationForSector && (
                      <span className="text-[10px] leading-tight text-red-600 font-semibold text-center">
                        Last selected in current series
                      </span>
                    )}
                    {!!sectorPresence.length && (
                      <span
                        className="text-[10px] leading-tight text-red-600 font-semibold text-center break-words"
                        title={sectorPresence.join('-')}
                      >
                        {presenceText}
                      </span>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
            
            {/* Station Drop Zones by Series - 2026-01-22 12:40 UTC */}
            {/* 2026-01-22 13:10 UTC - Only show in full circuit mode, added scrollbar */}
            {!selectedStationForSector && selectedCircuitForSector && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Drop on stations below:</h4>
                <p className="text-xs text-red-600 mt-1">
                  You cannot remove all the stations - must exist at least 2 stations.
                </p>
              </div>
              
              {circuits
                .find(c => c.letter === selectedCircuitForSector)
                ?.stationsBySeries.map((seriesStations, seriesIdx) => (
                  <div key={`series-${seriesIdx}`} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-semibold text-gray-800">
                        Series {seriesIdx + 1}
                      </h5>
                      {seriesIdx === 0 && (
                        <button
                          onClick={() => handleReplyAreas(selectedCircuitForSector)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                          title="Copy sectors from Series 1 to all other series"
                        >
                          Reply areas on the next serie
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {seriesStations.map((station) => (
                        <div
                          key={`station-${station.stationNumber}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => selectedCircuitForSector && handleDropOnStation(e, selectedCircuitForSector, seriesIdx, station.stationNumber)}
                          className="relative border-2 border-dashed border-gray-400 rounded-lg p-4 min-h-[160px] flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                          <div className="text-sm font-bold text-gray-600">
                            Station {station.stationNumber}
                          </div>
                          {station.sector && MUSCULAR_SECTOR_IMAGES[station.sector] ? (
                            <>
                              {/* Cancel button - 2026-01-22 13:00 UTC */}
                              <button
                                onClick={() => selectedCircuitForSector && handleRemoveSector(selectedCircuitForSector, seriesIdx, station.stationNumber)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 hover:bg-red-600 rounded-full"
                                title="Remove sector"
                              >
                                <X size={12} className="text-white" />
                              </button>
                              
                              {/* Draggable content - 2026-01-22 13:00 UTC */}
                              <div
                                draggable
                                onDragStart={(e) => selectedCircuitForSector && handleDragStartFromStation(e, station.sector, selectedCircuitForSector, seriesIdx, station.stationNumber)}
                                className="flex flex-col items-center gap-2 cursor-move hover:opacity-70"
                              >
                                <Image 
                                  src={MUSCULAR_SECTOR_IMAGES[station.sector]} 
                                  alt={station.sector}
                                  width={80}
                                  height={80}
                                  className="w-20 h-20 object-contain pointer-events-none"
                                />
                                <span className="text-xs text-center font-medium text-gray-700 pointer-events-none">
                                  {station.sector}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Drop here</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowSectorSelector(false);
                  setSelectedCircuitForSector(null);
                  setSelectedStationForSector(null);
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      
      {/* Add Circuit Modal - 2026-01-21 22:10 UTC */}
      {showAddCircuitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Circuits</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many circuits? (1-3)
            </label>
            <input
              type="number"
              min="1"
              max="3"
              defaultValue="1"
              id="add-circuit-count"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            />
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insert after which circuit
            </label>
            <select
              value={insertAfterCircuit}
              onChange={(e) => setInsertAfterCircuit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            >
              <option value="START">Before Circuit A</option>
              {circuits.map(c => (
                <option key={c.letter} value={c.letter}>After Circuit {c.letter}</option>
              ))}
              <option value="">At End</option>
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddCircuitModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const count = parseInt((document.getElementById('add-circuit-count') as HTMLInputElement)?.value || '1');
                  handleAddCircuits(Math.min(3, Math.max(1, count)));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Station Modal - 2026-01-21 22:10 UTC */}
      {showAddStationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Stations</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select circuit:
            </label>
            <select
              id="add-station-circuit"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3"
            >
              {circuits.map(c => (
                <option key={c.letter} value={c.letter}>Circuit {c.letter}</option>
              ))}
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many stations? (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              defaultValue="1"
              id="add-station-count"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddStationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const circuit = (document.getElementById('add-station-circuit') as HTMLSelectElement)?.value;
                  const count = parseInt((document.getElementById('add-station-count') as HTMLInputElement)?.value || '1');
                  handleAddStations(circuit, Math.min(5, Math.max(1, count)));
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Serie Modal - 2026-01-21 22:10 UTC - Adds to ALL circuits for consistent display */}
      {showAddSerieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Serie to Circuits</h3>
            <p className="text-sm text-gray-600 mb-4">
              One serie will be added at the end of <strong>all circuits</strong>, copying exercises from the previous serie.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddSerieModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddSerie()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Circuit Preferences Modal - 2026-01-21 22:00 UTC */}
      <CircuitPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSave={handleSavePreferences}
      />
      
      {renderExerciseSelectionModal()}
      {renderRepsEditorModal()}
      
      <div className={`space-y-2 ${((initialConfig as any)?.hideUI || initialConfig?.editingFromMovelap) ? 'hidden' : ''}`}>
      {/* Circuit Action Buttons - 2026-01-21 22:10 UTC */}
      <div className="flex items-center justify-center gap-3 mt-6 border-t pt-6">
        <button
          onClick={() => {
            // Directly add one circuit at the end
            handleAddCircuits(1);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
        >
          Add a circuit
        </button>
        <button
          onClick={() => setShowAddStationModal(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
        >
          Add a station
        </button>
        <button
          onClick={() => setShowAddSerieModal(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium"
        >
          Add serie to circuits
        </button>
        <div className="relative remove-menu-container">
          <button
            onClick={() => setShowRemoveMenu(!showRemoveMenu)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
          >
            Remove
          </button>
           {showRemoveMenu && (
             <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-300 rounded shadow-lg z-10 w-64">
               <div className="p-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700">
                 Select items using checkboxes, then choose action:
               </div>
               <button
                 onClick={handleRemoveCircuitAction}
                 className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-200"
               >
                 <div className="font-medium">Remove selected circuit(s)</div>
                 <div className="text-xs text-gray-500">
                   ({selectedCircuits.size} selected)
                 </div>
               </button>
               <button
                 onClick={handleRemoveSerieAction}
                 className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-200"
               >
                 <div className="font-medium">Remove selected serie(s)</div>
                 <div className="text-xs text-gray-500">
                   ({selectedSeries.size} selected)
                 </div>
               </button>
               <button
                 onClick={handleRemoveStationAction}
                 className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
               >
                 <div className="font-medium">Remove selected station(s)</div>
                 <div className="text-xs text-gray-500">
                   ({selectedStations.size} selected)
                 </div>
               </button>
             </div>
           )}
        </div>
        
        {/* Reduce quick actions */}
        <button
          onClick={handleReduceCircuitLast}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
          title="Remove last circuit"
        >
          Reduce circuit
        </button>
        <button
          onClick={handleReduceStationLast}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
          title="Remove last station from all series of all circuits"
        >
          Reduce station
        </button>
        <button
          onClick={handleReduceSerieLast}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
          title="Remove last serie from each circuit"
        >
          Reduce serie
        </button>
      </div>
      
       {/* Preview Section - structure (planned grid) vs real (stations with exercises) */}
       <div className="p-3 bg-gray-50 border border-gray-300 rounded">
         <div className="space-y-3">
           <div className="text-sm text-gray-800">
             <span className="font-semibold text-gray-700">PREVIEW STRUCTURE CIRCUIT PLANNED</span>
             <span className="mx-2"> </span>
             <span>{generatePreviewStructurePlanned()}</span>
           </div>
           <div className="text-sm text-gray-800">
             <span className="font-semibold text-gray-700">PREVIEW REAL DATA CIRCUITS</span>
             <span className="mx-2"> </span>
             <span>{generatePreviewRealData()}</span>
           </div>
         </div>
         {actionLog.length > 0 && (
           <div className="mt-2 pt-2 border-t border-gray-300">
             {actionLog.map((log, idx) => (
               <div key={idx} className="text-xs text-blue-600">{log}</div>
             ))}
           </div>
         )}
       </div>
       
       {/* Action Buttons - 2026-01-22 14:35 UTC - Right-aligned buttons, Back returns to first view */}
       <div className="flex items-center justify-end gap-3 pt-3 border-t">
           <button
             onClick={onCancel}
             className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
           >
             Back
           </button>
           <button
             onClick={() => handleSave()}
             className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
           >
             {initialConfig?.editingFromMovelap || (initialConfig?.existingCircuits && initialConfig.existingCircuits.length > 0) ? 'Save' : 'Add Moveframe'}
           </button>
           <button
             onClick={handleReloadExercises}
             className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
             title="This button allows to recall all the exercises in according to the Preferences"
           >
             <RotateCw size={16} />
             Reload exercises
           </button>
           <button
             onClick={() => {
               // Autoscanning - Replace all exercises with random ones from same sector
               if (!confirm('This will replace ALL exercises in the grid with new random exercises from the same muscular sectors. Continue?')) {
                 return;
               }
               
              setCircuits(prevCircuits => {
                const newCircuits = JSON.parse(JSON.stringify(prevCircuits)); // Deep clone
                let replacedCount = 0;
                
                newCircuits.forEach((circuit: Circuit) => {
                  circuit.stationsBySeries.forEach((seriesStations: Station[]) => {
                    seriesStations.forEach((station: Station) => {
                      // Replace if station has sector (even if exercise is empty)
                      if (station.sector) {
                         const randomExercise = getRandomExercise(station.sector, station.exercise);
                         if (randomExercise) {
                           station.exercise = randomExercise.name;
                           replacedCount++;
                         }
                       }
                     });
                   });
                 });
                 
                 setActionLog(prev => [...prev, `Autoscanning completed: ${replacedCount} exercises replaced`]);
                 return newCircuits;
               });
             }}
             className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
             title="Automatically replace all exercises in the grid with new random exercises from the same sectors"
           >
             <RotateCw size={16} />
             Autoscanning
           </button>
           <button
             onClick={() => setShowPreferencesModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
           >
             <Settings size={20} />
             Preferences
           </button>
       </div>
    </div>
    
    {/* Exercise Menu Dropdown Portal - 2026-01-22 12:35 UTC */}
    {/* Render outside component hierarchy to escape all overflow containers */}
    {showExerciseMenu && typeof document !== 'undefined' && ReactDOM.createPortal(
      <>
        {/* 2026-01-22 13:40 UTC - Backdrop to close menu on click outside */}
        <div 
          className="fixed inset-0 z-[99998]"
          onClick={(e) => {
            console.log('Backdrop clicked, closing menu');
            setShowExerciseMenu(null);
          }}
          onMouseDown={(e) => {
            // Stop mousedown from reaching document to prevent handleClickOutside from interfering
            e.stopPropagation();
          }}
          style={{ backgroundColor: 'rgba(0,0,0,0.05)', pointerEvents: 'auto' }}
        />
        <div 
          className="exercise-menu-container bg-white border-2 border-blue-500 rounded-lg shadow-2xl w-64"
          style={{ 
            position: 'fixed',
            zIndex: 99999,
            top: `${showExerciseMenu.y}px`,
            left: `${showExerciseMenu.x}px`,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            console.log('Dropdown container clicked');
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Stop mousedown from reaching document to prevent handleClickOutside from interfering
            console.log('Dropdown mousedown');
            e.stopPropagation();
          }}
        >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Select exercise + rip clicked');
            const circuitIdx = circuits.findIndex(c => c.letter === showExerciseMenu.circuit);
            const seriesIdx = showExerciseMenu.series - 1;
            const circuit = circuits[circuitIdx];
            if (circuit && circuit.stationsBySeries[seriesIdx]) {
              const stationIdx = circuit.stationsBySeries[seriesIdx].findIndex(
                s => s.stationNumber === showExerciseMenu.station
              );
              setSelectedStationForManualExercise({
                circuitIdx,
                seriesIdx,
                stationIdx
              });
              setShowAllSectorsInManual(false);
              setShowManualExerciseModal(true);
            }
            setShowExerciseMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 border-b border-gray-200 cursor-pointer"
        >
          Select exercise + rip
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Load a new station clicked');
            const circuitIdx = circuits.findIndex(c => c.letter === showExerciseMenu.circuit);
            const seriesIdx = showExerciseMenu.series - 1;
            const circuit = circuits[circuitIdx];
            if (circuit && circuit.stationsBySeries[seriesIdx]) {
              const stationIdx = circuit.stationsBySeries[seriesIdx].findIndex(
                s => s.stationNumber === showExerciseMenu.station
              );
              const station = circuit.stationsBySeries[seriesIdx][stationIdx];
              const currentSector = station?.sector;
              if (currentSector) {
                const allExercises = getExercisesBySector(currentSector);
                const currentSeriesStations = circuit.stationsBySeries[seriesIdx] || [];
                const alreadyInSeries = new Set(
                  currentSeriesStations
                    .map((s: Station) => s.exercise)
                    .filter((ex: string) => ex && ex.trim() !== '') as string[]
                );
                // Autoscan order: exercises NOT in current series first, then already-in-series at the end
                const notInSeries = allExercises.filter(ex => !alreadyInSeries.has(ex.name));
                const inSeries = allExercises.filter(ex => alreadyInSeries.has(ex.name));
                const orderedCandidates = [...notInSeries, ...inSeries];
                if (orderedCandidates.length === 0) {
                  alert(`No exercises available for ${currentSector}.`);
                } else {
                  setLoadNewStationScan({
                    circuitIdx,
                    seriesIdx,
                    stationIdx,
                    sector: currentSector,
                    orderedCandidates,
                    scanIndex: 0
                  });
                }
              } else {
                alert('Please assign a muscular sector first.');
              }
            }
            setShowExerciseMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 border-b border-gray-200 cursor-pointer"
        >
          Load a new station
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Remove station clicked');
            const circuit = circuits.find(c => c.letter === showExerciseMenu.circuit);
            if (circuit) {
              handleRemoveStation(showExerciseMenu.circuit, showExerciseMenu.station, showExerciseMenu.series);
            }
            setShowExerciseMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 cursor-pointer"
        >
          Remove station
        </button>
      </div>
      </>,
      document.body
    )}

    {/* Load New Station Scan Modal - Autoscan: not-in-series first, then already-in-series at end */}
    {loadNewStationScan && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Load a new station</h3>
            <button
              onClick={() => setLoadNewStationScan(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            The list orders exercises not yet in this series first, then repeats (same order when using the arrows).{' '}
            <span className="font-medium text-gray-800">Proceed scan</span> jumps to a{' '}
            <span className="font-medium text-gray-800">random</span> other exercise — never the one currently shown.
          </p>
          {loadNewStationScan.orderedCandidates.length > 0 && (() => {
            const current = loadNewStationScan.orderedCandidates[loadNewStationScan.scanIndex];
            const circuit = circuits[loadNewStationScan.circuitIdx];
            const seriesStations = circuit?.stationsBySeries[loadNewStationScan.seriesIdx] || [];
            const alreadyInSeries = new Set(
              seriesStations.map((s: Station) => s.exercise).filter(Boolean)
            );
            const notInSeriesCount = loadNewStationScan.orderedCandidates.filter(
              ex => !alreadyInSeries.has(ex.name)
            ).length;
            const isInRepeatPhase = loadNewStationScan.scanIndex >= notInSeriesCount;
            const nCand = loadNewStationScan.orderedCandidates.length;
            const picA = getExercisePictureAThumbnailForDisplay(current.name);
            const sectorImg =
              loadNewStationScan.sector && MUSCULAR_SECTOR_IMAGES[loadNewStationScan.sector]
                ? MUSCULAR_SECTOR_IMAGES[loadNewStationScan.sector]
                : null;
            const thumbSrc =
              picA?.src ?? (current.name?.trim() && sectorImg ? sectorImg : null);
            const thumbIsData =
              picA?.isDataUrl === true || (thumbSrc != null && thumbSrc.startsWith('data:'));

            return (
              <>
                <div className="mb-4 flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoadNewStationScan((prev) =>
                        prev
                          ? {
                              ...prev,
                              scanIndex: (prev.scanIndex - 1 + nCand) % nCand,
                            }
                          : null
                      );
                    }}
                    disabled={nCand <= 1}
                    className="flex w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous exercise"
                  >
                    <ChevronLeft className="h-8 w-8" strokeWidth={2} />
                  </button>
                  <div className="flex min-w-0 flex-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <button
                      type="button"
                      title="Click to enlarge positions A and B"
                      className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:ring-2 hover:ring-teal-500"
                      onClick={() => {
                        const media = getExerciseMedia(current.name);
                        setExerciseGallery({
                          title: current.name,
                          pictureA: media?.pictureA ?? thumbSrc,
                          pictureB: media?.pictureB ?? media?.pictureA ?? thumbSrc,
                        });
                      }}
                    >
                      {!thumbSrc ? (
                        <div className="h-full w-full bg-gray-100" aria-hidden />
                      ) : thumbIsData ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data: SVG URLs are not supported by next/image here
                        <img
                          src={thumbSrc}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={thumbSrc}
                          alt=""
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-base font-semibold leading-snug text-gray-900">{current.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {loadNewStationScan.scanIndex + 1} / {nCand}
                      </p>
                      {isInRepeatPhase && (
                        <span className="mt-2 inline-block rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Already in series (showing after new ones)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadNewStationScan((prev) =>
                        prev
                          ? {
                              ...prev,
                              scanIndex: (prev.scanIndex + 1) % nCand,
                            }
                          : null
                      );
                    }}
                    disabled={nCand <= 1}
                    className="flex w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next exercise"
                  >
                    <ChevronRight className="h-8 w-8" strokeWidth={2} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoadNewStationScan((prev) => {
                        if (!prev) return prev;
                        const list = prev.orderedCandidates;
                        const n = list.length;
                        if (n <= 1) return prev;
                        const cur = prev.scanIndex;
                        if (n === 2) {
                          return { ...prev, scanIndex: cur === 0 ? 1 : 0 };
                        }
                        let nextIdx = cur;
                        while (nextIdx === cur) {
                          nextIdx = Math.floor(Math.random() * n);
                        }
                        return { ...prev, scanIndex: nextIdx };
                      });
                    }}
                    disabled={loadNewStationScan.orderedCandidates.length <= 1}
                    title={
                      loadNewStationScan.orderedCandidates.length <= 1
                        ? 'Need at least two exercises to randomize'
                        : 'Pick another exercise at random (not the current one)'
                    }
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
                  >
                    Proceed scan
                  </button>
                  <button
                    onClick={() => {
                      const scan = loadNewStationScan;
                      if (!scan) return;
                      setCircuits(prevCircuits => {
                        const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                        const ex = scan.orderedCandidates[scan.scanIndex];
                        const cell = newCircuits[scan.circuitIdx].stationsBySeries[scan.seriesIdx][scan.stationIdx];
                        cell.exercise = ex.name;
                        if (
                          executionMode === 'horizontal' &&
                          seriesMode === 'count' &&
                          scan.seriesIdx === 0 &&
                          (ex.name || '').trim()
                        ) {
                          replicateHorizontalExerciseFromSeriesOne(
                            newCircuits,
                            scan.circuitIdx,
                            scan.stationIdx,
                            ex.name,
                            cell.sector || ''
                          );
                        }
                        return newCircuits;
                      });
                      const circuitLetter = circuits[scan.circuitIdx]?.letter || '';
                      const station = circuits[scan.circuitIdx]?.stationsBySeries[scan.seriesIdx]?.[scan.stationIdx];
                      const stationNum = station?.stationNumber;
                      setActionLog(prev => [...prev, `Exercise replaced in ${circuitLetter}${scan.seriesIdx + 1}-${stationNum}`]);
                      setLoadNewStationScan(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                  >
                    Use this exercise
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* Substitute/Exchange Modal - 2026-01-22 14:40 UTC */}
    {showSubstituteExchangeModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Move Exercise</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <strong>From:</strong> Circuit {showSubstituteExchangeModal.source.circuit}, Series {showSubstituteExchangeModal.source.series}, Station {showSubstituteExchangeModal.source.station}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <strong>To:</strong> Circuit {showSubstituteExchangeModal.target.circuit}, Series {showSubstituteExchangeModal.target.series}, Station {showSubstituteExchangeModal.target.station}
            </p>
            <p className="text-xs text-gray-500 italic">
              Choose how to move the exercise
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubstitute}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Substitute
              <span className="block text-xs font-normal mt-1">Replace target with source (source becomes empty)</span>
            </button>
            <button
              onClick={handleExchange}
              className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              Exchange
              <span className="block text-xs font-normal mt-1">Swap source and target exercises</span>
            </button>
            <button
              onClick={() => {
                setShowSubstituteExchangeModal(null);
                setDraggedExercise(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

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
