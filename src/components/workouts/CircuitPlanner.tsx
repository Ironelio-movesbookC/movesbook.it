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

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Settings, RotateCw, Plus, Trash2 } from 'lucide-react';
import { MUSCULAR_SECTORS } from '@/constants/moveframe.constants';
import CircuitPreferencesModal, { ExercisePreferences } from './CircuitPreferencesModal';
// 2026-01-22 11:45 UTC - Import mock exercise database
import { getExercisesBySector, getRandomExercise, getAllSectors, MockExercise } from '@/data/mockExercises';

// ============================================================================
// TYPE DEFINITIONS - 2026-01-21 19:30 UTC
// ============================================================================

interface Station {
  stationNumber: number;
  sector: string;
  exercise: string;
  reps: string;
  pause: number; // 2026-01-22 10:15 UTC - Added pause value
}

// 2026-01-22 12:15 UTC - Restructured: stations are now organized by series
// Each series has its own independent array of stations
interface Circuit {
  letter: string;
  stationsBySeries: Station[][]; // Array of series, each containing an array of stations
  series: number;
}

interface CircuitPlannerProps {
  sport: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

// 2026-01-22 12:40 UTC - Mapping of muscular sectors to images
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

// ============================================================================
// CONSTANTS - 2026-01-21 19:30 UTC
// ============================================================================

const CIRCUIT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

// Pause options in seconds (converted from time format)
const STATION_PAUSE_OPTIONS = [
  { label: '0"', value: 0 },
  { label: '5"', value: 5 },
  { label: '10"', value: 10 },
  { label: '15"', value: 15 },
  { label: '20"', value: 20 },
  { label: '25"', value: 25 },
  { label: '30"', value: 30 },
  { label: '40"', value: 40 },
  { label: '50"', value: 50 },
  { label: '1\'', value: 60 },
  { label: '1\'30"', value: 90 },
  { label: '2\'', value: 120 }
];

const CIRCUIT_PAUSE_OPTIONS = [
  { label: '0"', value: 0 },
  { label: '30"', value: 30 },
  { label: '1\'', value: 60 },
  { label: '1\'30"', value: 90 },
  { label: '2\'', value: 120 },
  { label: '3\'', value: 180 },
  { label: '4\'', value: 240 },
  { label: '5\'', value: 300 },
  { label: '6\'', value: 360 }
];

const SERIES_PAUSE_OPTIONS = [
  { label: '0"', value: 0 },
  { label: '30"', value: 30 },
  { label: '1\'', value: 60 },
  { label: '1\'30"', value: 90 },
  { label: '2\'', value: 120 },
  { label: '2\'30"', value: 150 },
  { label: '3\'', value: 180 },
  { label: '4\'', value: 240 },
  { label: '5\'', value: 300 }
];

const HORIZONTAL_SERIES_PAUSE_OPTIONS = [
  { label: '15"', value: 15 },
  { label: '20"', value: 20 },
  { label: '25"', value: 25 },
  { label: '30"', value: 30 },
  { label: '40"', value: 40 },
  { label: '50"', value: 50 },
  { label: '1\'', value: 60 },
  { label: '1\'30"', value: 90 },
  { label: '2\'', value: 120 }
];

// ============================================================================
// MAIN COMPONENT - 2026-01-21 19:30 UTC
// ============================================================================

export default function CircuitPlanner({ sport, onSave, onCancel }: CircuitPlannerProps) {
  // Configuration State - 2026-01-21 19:30 UTC
  const [numCircuits, setNumCircuits] = useState(1);
  const [stationsPerCircuit, setStationsPerCircuit] = useState(4);
  const [seriesMode, setSeriesMode] = useState<'count' | 'time'>('count');
  const [seriesCount, setSeriesCount] = useState(2);
  const [seriesTime, setSeriesTime] = useState(2); // minutes
  const [executionMode, setExecutionMode] = useState<'vertical' | 'horizontal'>('vertical');
  
  // Pause State - 2026-01-21 19:30 UTC
  const [pauseStations, setPauseStations] = useState(10); // seconds
  const [pauseCircuits, setPauseCircuits] = useState(120); // seconds
  const [pauseSeries, setPauseSeries] = useState(120); // seconds
  const [pauseHorizontalSeries, setPauseHorizontalSeries] = useState(30); // seconds
  
  // Circuit Data - 2026-01-21 19:30 UTC
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  
  // UI State - 2026-01-21 19:30 UTC
  // 2026-01-21 20:15 UTC - Added phase management (config -> table)
  const [currentPhase, setCurrentPhase] = useState<'config' | 'table'>('config');
  // 2026-01-22 15:15 UTC - Track if circuits have been initialized to prevent re-generation
  const [circuitsInitialized, setCircuitsInitialized] = useState(false);
  const [showSectorSelector, setShowSectorSelector] = useState(false);
  const [selectedCircuitForSector, setSelectedCircuitForSector] = useState<string | null>(null);
  // 2026-01-22 13:10 UTC - Track specific station for sector selection
  const [selectedStationForSector, setSelectedStationForSector] = useState<{circuitLetter: string, seriesIdx: number, stationNumber: number} | null>(null);
  const [selectedStationForExercise, setSelectedStationForExercise] = useState<{circuit: string, series: number, station: number} | null>(null);
  // 2026-01-21 20:30 UTC - Added exercise menu state
  // 2026-01-22 12:30 UTC - Added x, y position for fixed positioning
  const [showExerciseMenu, setShowExerciseMenu] = useState<{circuit: string, series: number, station: number, x: number, y: number} | null>(null);
  
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
  const [showManualExerciseModal, setShowManualExerciseModal] = useState(false);
  const [selectedStationForManualExercise, setSelectedStationForManualExercise] = useState<{circuitIdx: number, seriesIdx: number, stationIdx: number} | null>(null);
  const [pendingExercise, setPendingExercise] = useState<{name: string, sector: string, reps: string} | null>(null);
  // 2026-01-21 22:10 UTC - Action modals state
  const [showAddCircuitModal, setShowAddCircuitModal] = useState(false);
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [showAddSerieModal, setShowAddSerieModal] = useState(false);
  const [showRemoveMenu, setShowRemoveMenu] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  // 2026-01-22 10:00 UTC - Checkbox selection state for remove functionality
  const [selectedCircuits, setSelectedCircuits] = useState<Set<string>>(new Set());
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set()); // format: "circuit-series" e.g., "A-1"
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set()); // format: "circuit-series-station" e.g., "A-1-1"
  
  // 2026-01-22 14:40 UTC - Dragging exercise state
  const [draggedExercise, setDraggedExercise] = useState<{circuit: string, series: number, station: number, exercise: string, reps: string, pause: number, sector: string} | null>(null);
  const [showSubstituteExchangeModal, setShowSubstituteExchangeModal] = useState<{source: any, target: any} | null>(null);
  const [copyClickTimer, setCopyClickTimer] = useState<NodeJS.Timeout | null>(null);
  
  // ============================================================================
  // INITIALIZATION - 2026-01-21 19:35 UTC
  // Generate initial circuit structure when settings change
  // 2026-01-21 20:15 UTC - Only generate when in table phase
  // 2026-01-22 15:15 UTC - Fixed: Only generate circuits once when entering table phase
  // ============================================================================
  
  useEffect(() => {
    // Only generate circuits ONCE when first entering table phase
    if (currentPhase !== 'table') return;
    if (circuitsInitialized) return; // Don't regenerate if already initialized
    
    const newCircuits: Circuit[] = [];
    
    for (let i = 0; i < numCircuits; i++) {
      const seriesNum = seriesMode === 'count' ? seriesCount : 1;
      const stationsBySeries: Station[][] = [];
      
      // Create independent stations for each series
      for (let s = 0; s < seriesNum; s++) {
        const stationsForThisSeries: Station[] = [];
        for (let j = 0; j < stationsPerCircuit; j++) {
          stationsForThisSeries.push({
            stationNumber: j + 1,
            sector: '',
            exercise: '',
            reps: '',
            pause: pauseStations // Use configured pause between stations
          });
        }
        stationsBySeries.push(stationsForThisSeries);
      }
      
      newCircuits.push({
        letter: CIRCUIT_LETTERS[i],
        stationsBySeries,
        series: seriesNum
      });
    }
    
    setCircuits(newCircuits);
    setCircuitsInitialized(true); // Mark as initialized
  }, [currentPhase, numCircuits, stationsPerCircuit, seriesCount, seriesMode, pauseStations, circuitsInitialized]);
  
  // ============================================================================
  // HANDLERS - 2026-01-21 19:40 UTC
  // ============================================================================
  
  const handleRemoveCircuit = (circuitLetter: string) => {
    // 2026-01-21 19:40 UTC - Remove entire circuit
    if (circuits.length <= 1) {
      alert('You must have at least one circuit');
      return;
    }
    setCircuits(circuits.filter(c => c.letter !== circuitLetter));
    setNumCircuits(prev => prev - 1);
  };
  
  const removeSeries = (circuitLetter: string, seriesNumber: number) => {
    // 2026-01-21 21:55 UTC - Remove one series from a SPECIFIC circuit only
    // 2026-01-22 12:20 UTC - Fixed to remove from stationsBySeries array
    // Do NOT update global seriesCount - only update this circuit's series
    setCircuits(prevCircuits => prevCircuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        if (circuit.series <= 1) {
          alert('Circuit must have at least 1 series');
          return circuit;
        }
        // Remove the series at the specified index (seriesNumber is 1-based)
        const seriesIndex = seriesNumber - 1;
        const newStationsBySeries = circuit.stationsBySeries.filter((_, idx) => idx !== seriesIndex);
        
        return {
          ...circuit,
          stationsBySeries: newStationsBySeries,
          series: circuit.series - 1
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
    setShowSectorSelector(true);
  };
  
  // 2026-01-22 13:10 UTC - Open sector selector for a specific station
  const handleSectorCellClick = (circuitLetter: string, seriesIdx: number, stationNumber: number) => {
    setSelectedStationForSector({circuitLetter, seriesIdx, stationNumber});
    setShowSectorSelector(true);
  };
  
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
              // Clear source station
              if (sIdx === srcSeriesIdx && station.stationNumber === srcStationNum) {
                return { ...station, sector: '' };
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
        
        // Clear source station if in different circuit
        if (isDraggingFromStation && circuit.letter === sourceCircuit) {
          const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
            if (sIdx === srcSeriesIdx) {
              return seriesStations.map(station => 
                station.stationNumber === srcStationNum 
                  ? { ...station, sector: '' }
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
  const handleRemoveSector = (circuitLetter: string, seriesIdx: number, stationNumber: number) => {
    setCircuits(prevCircuits => prevCircuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        const newStationsBySeries = circuit.stationsBySeries.map((seriesStations, sIdx) => {
          if (sIdx === seriesIdx) {
            return seriesStations.map(station => 
              station.stationNumber === stationNumber 
                ? { ...station, sector: '' } 
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
  
  const handleExerciseClick = (circuitLetter: string, seriesNum: number, stationNumber: number) => {
    // 2026-01-21 19:50 UTC - Open exercise selector
    setSelectedStationForExercise({ circuit: circuitLetter, series: seriesNum, station: stationNumber });
    // TODO: Open exercise selection modal
  };
  
  const handleLoadAutoExercise = (circuitLetter: string, stationNumber: number) => {
    // 2026-01-21 19:50 UTC - Auto-load exercise based on sector
    // TODO: Implement auto-load logic with preferences
  };
  
  const handleCreateCircuit = () => {
    // 2026-01-21 20:15 UTC - Move from config phase to table phase
    setCurrentPhase('table');
  };
  
  const generateMovelaps = () => {
    // 2026-01-22 10:30 UTC - Generate movelaps from circuit configuration
    // 2026-01-22 12:15 UTC - Fixed to use series-specific stations
    const movelaps: any[] = [];
    let globalSeriesNumber = 1; // Continuous series numbering across all circuits
    let sequenceNumber = 1; // Sequential numbering for all movelaps
    
    circuits.forEach((circuit, circuitIndex) => {
      for (let seriesNum = 1; seriesNum <= circuit.series; seriesNum++) {
        circuit.stationsBySeries[seriesNum - 1].forEach((station, stationIndex) => {
          // Create a movelap for each station in each series
          const movelap = {
            repetitionNumber: sequenceNumber, // Sequential number for movelap ordering
            circuitLetter: circuit.letter,
            circuitIndex: circuitIndex + 1,
            seriesNumber: globalSeriesNumber, // Global series number (e.g., 1-5 for Circuit A, 6-10 for B)
            localSeriesNumber: seriesNum, // Local series within circuit (1, 2, 3...)
            stationNumber: station.stationNumber,
            sector: station.sector || '',
            exercise: station.exercise || '', // 2026-01-22 14:45 UTC - Don't show "Exercise to be defined"
            reps: station.reps || '',
            pause: station.pause || pauseStations,
            // Additional fields that might be needed
            muscularSector: station.sector || '',
            distance: '',
            time: '',
            pace: '',
            speed: '',
            restType: 'SET_TIME', // Use enum format
            restTime: null,
            notes: '',
            alarm: false,
            sound: false,
            status: 'PENDING',
            isSkipped: false,
            isDisabled: false
          };
          
          movelaps.push(movelap);
          sequenceNumber++;
        });
        globalSeriesNumber++; // Increment after each complete series (all stations)
      }
    });
    
    return movelaps;
  };

  const handleSave = () => {
    // 2026-01-21 19:55 UTC - Validate and save circuit configuration
    // 2026-01-22 10:20 UTC - Include preview description for moveframe
    // 2026-01-22 10:30 UTC - Generate movelaps from circuit configuration
    const description = generatePreview();
    const movelaps = generateMovelaps();
    
    onSave({
      circuits,
      description, // Preview to be used as moveframe description
      movelaps, // Generated movelaps for the moveframe
      config: {
        numCircuits,
        stationsPerCircuit,
        seriesMode,
        seriesCount,
        seriesTime,
        executionMode,
        pauses: {
          stations: pauseStations,
          circuits: pauseCircuits,
          series: pauseSeries,
          horizontalSeries: pauseHorizontalSeries
        }
      }
    });
  };
  
  const handleSavePreferences = (prefs: ExercisePreferences) => {
    // 2026-01-21 22:00 UTC - Save exercise selection preferences
    setExercisePreferences(prefs);
    // TODO: Use these preferences for auto-loading exercises
  };
  
  // ============================================================================
  // ACTION HANDLERS - 2026-01-21 22:10 UTC
  // ============================================================================
  
  const handleAddCircuits = (count: number) => {
    // 2026-01-21 22:10 UTC - Add 1-3 circuits at the end
    // 2026-01-22 10:15 UTC - Include pause value in new circuits
    // 2026-01-22 12:15 UTC - Updated to create series-specific stations
    // 2026-01-22 15:10 UTC - Fixed: Use existing circuit structure instead of initial state values
    const newCircuits = [...circuits];
    
    // Get structure from the last existing circuit if available
    const lastCircuit = circuits.length > 0 ? circuits[circuits.length - 1] : null;
    const seriesNum = lastCircuit ? lastCircuit.series : (seriesMode === 'count' ? seriesCount : 1);
    const stationsCount = lastCircuit && lastCircuit.stationsBySeries[0] 
      ? lastCircuit.stationsBySeries[0].length 
      : stationsPerCircuit;
    
    for (let i = 0; i < count; i++) {
      const circuitIndex = circuits.length + i;
      if (circuitIndex >= CIRCUIT_LETTERS.length) break;
      
      const stationsBySeries: Station[][] = [];
      
      // Create independent stations for each series
      for (let s = 0; s < seriesNum; s++) {
        const stationsForThisSeries: Station[] = [];
        for (let j = 0; j < stationsCount; j++) {
          stationsForThisSeries.push({
            stationNumber: j + 1,
            sector: '',
            exercise: '',
            reps: '',
            pause: pauseStations // Use configured pause value
          });
        }
        stationsBySeries.push(stationsForThisSeries);
      }
      
      newCircuits.push({
        letter: CIRCUIT_LETTERS[circuitIndex],
        stationsBySeries,
        series: seriesNum
      });
    }
    
    setCircuits(newCircuits);
    setNumCircuits(newCircuits.length);
    setActionLog(prev => [...prev, `${count} circuit${count > 1 ? 's' : ''} added`]);
    setShowAddCircuitModal(false);
  };
  
  const handleAddStations = (circuitLetter: string, count: number) => {
    // 2026-01-21 22:10 UTC - Add 1-5 stations to a circuit
    // 2026-01-22 10:15 UTC - Include pause value in new stations
    // 2026-01-22 12:15 UTC - Updated to work with series-specific stations
    setCircuits(circuits.map(circuit => {
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
              pause: pauseStations // Use configured pause value
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
  
  const handleAddSerie = (circuitLetter: string) => {
    // 2026-01-21 22:10 UTC - Add a serie to a circuit
    // 2026-01-22 12:20 UTC - Fixed to add new stations array to stationsBySeries
    // Copy exercises from serie before the previous (if 2 series, adding 3rd copies from serie 1)
    setCircuits(circuits.map(circuit => {
      if (circuit.letter === circuitLetter) {
        const currentSeriesCount = circuit.series;
        // Determine which series to copy from (serie before the previous)
        // If current is 1, copy from 0 (the first)
        // If current is 2, copy from 0 (serie 1)
        // If current is 3, copy from 1 (serie 2), etc.
        const serieToCopyFromIndex = Math.max(0, currentSeriesCount - 2);
        
        // Deep clone the stations from that series
        const newSeriesStations = JSON.parse(JSON.stringify(circuit.stationsBySeries[serieToCopyFromIndex]));
        
        return {
          ...circuit,
          stationsBySeries: [...circuit.stationsBySeries, newSeriesStations],
          series: circuit.series + 1
        };
      }
      return circuit;
    }));
    
    setActionLog(prev => [...prev, `1 serie added to circuit ${circuitLetter}`]);
    setShowAddSerieModal(false);
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

  const handleRemoveCircuitAction = () => {
    // 2026-01-22 10:00 UTC - Remove selected circuits
    if (selectedCircuits.size === 0) {
      alert('Please select at least one circuit to remove');
      return;
    }
    
    const circuitsToRemove = Array.from(selectedCircuits);
    circuitsToRemove.forEach(letter => {
      handleRemoveCircuit(letter);
    });
    
    setActionLog(prev => [...prev, `${circuitsToRemove.length} circuit(s) removed: ${circuitsToRemove.join(', ')}`]);
    setSelectedCircuits(new Set());
    setShowRemoveMenu(false);
  };
  
  const handleRemoveSerieAction = () => {
    // 2026-01-22 10:00 UTC - Remove selected series
    if (selectedSeries.size === 0) {
      alert('Please select at least one series to remove');
      return;
    }
    
    const seriesToRemove = Array.from(selectedSeries);
    seriesToRemove.forEach(key => {
      const [circuit, series] = key.split('-');
      removeSeries(circuit, parseInt(series));
    });
    
    setActionLog(prev => [...prev, `${seriesToRemove.length} series removed`]);
    setSelectedSeries(new Set());
    setShowRemoveMenu(false);
  };
  
  const handleRemoveStationAction = () => {
    // 2026-01-22 10:00 UTC - Remove selected stations
    if (selectedStations.size === 0) {
      alert('Please select at least one station to remove');
      return;
    }
    
    const stationsToRemove = Array.from(selectedStations);
    stationsToRemove.forEach(key => {
      const [circuit, series, station] = key.split('-');
      handleRemoveStation(circuit, parseInt(station));
    });
    
    setActionLog(prev => [...prev, `${stationsToRemove.length} station(s) removed`]);
    setSelectedStations(new Set());
    setShowRemoveMenu(false);
  };
  
  const handleReloadExercises = () => {
    // 2026-01-21 22:10 UTC - Reload exercises according to preferences
    // 2026-01-22 13:20 UTC - Implemented auto-reload for all stations with sectors
    // 2026-01-22 14:50 UTC - Updated to ensure no duplicate exercises in same station position across series
    
    setCircuits(prevCircuits => {
      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
      
      let exercisesLoaded = 0;
      
      newCircuits.forEach((circuit: any) => {
        // For each station position, track used exercises across all series
        const maxStations = Math.max(...circuit.stationsBySeries.map((ss: any[]) => ss.length));
        
        for (let stationPos = 0; stationPos < maxStations; stationPos++) {
          const usedExercisesForThisPosition = new Set<string>();
          
          // Iterate through all series for this station position
          circuit.stationsBySeries.forEach((seriesStations: any[], seriesIdx: number) => {
            const station = seriesStations[stationPos];
            
            if (station && station.sector) {
              // Get random exercise, excluding already used ones for this station position
              let randomExercise = null;
              
              // Try to get a unique exercise for this position
              const availableExercises = getExercisesBySector(station.sector);
              
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
                station.exercise = randomExercise.name;
                usedExercisesForThisPosition.add(randomExercise.name);
                exercisesLoaded++;
                // Keep existing reps or set default
                if (!station.reps) {
                  station.reps = '10';
                }
              }
            }
          });
        }
      });
      
      return newCircuits;
    });
    setActionLog(prev => [...prev, `Exercises reloaded: ${circuits.reduce((sum, c) => sum + c.stationsBySeries.reduce((s, ss) => s + ss.length, 0), 0)} stations processed`]);
  };
  
  const generatePreview = (): string => {
    // 2026-01-21 22:10 UTC - Generate preview text
    // 2026-01-22 10:20 UTC - Format like: "Circuit: X circuits x Y series Pause Z" M0'"
    const parts: string[] = [];
    
    // Circuit info
    const avgSeries = circuits.length > 0 
      ? Math.round(circuits.reduce((sum, c) => sum + c.series, 0) / circuits.length)
      : seriesCount;
    
    parts.push(`Circuit: ${circuits.length || numCircuits} circuits x ${avgSeries} series`);
    
    // Pause info
    const pauseCircStr = CIRCUIT_PAUSE_OPTIONS.find(p => p.value === pauseCircuits)?.label || '0"';
    const pauseStatStr = STATION_PAUSE_OPTIONS.find(p => p.value === pauseStations)?.label || '0"';
    const pauseSerStr = SERIES_PAUSE_OPTIONS.find(p => p.value === pauseSeries)?.label || '0"';
    
    parts.push(`Pause circ ${pauseCircStr} - stations ${pauseStatStr} - series ${pauseSerStr}`);
    parts.push(`M0'`);
    
    return parts.join(' ');
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
  // COPY STATION HANDLERS - 2026-01-22 14:40 UTC
  // ============================================================================
  
  const handleCopyStation = (circuit: string, seriesIdx: number, stationNumber: number, isDoubleClick: boolean) => {
    const circuitIdx = circuits.findIndex(c => c.letter === circuit);
    const stationIdx = circuits[circuitIdx].stationsBySeries[seriesIdx].findIndex(s => s.stationNumber === stationNumber);
    const sourceStation = circuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx];
    
    if (isDoubleClick) {
      // Copy to all stations in all series of this circuit
      setCircuits(prevCircuits => {
        const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
        
        newCircuits[circuitIdx].stationsBySeries.forEach((seriesStations: Station[], sIdx: number) => {
          seriesStations.forEach((station: Station, stIdx: number) => {
            newCircuits[circuitIdx].stationsBySeries[sIdx][stIdx] = {
              ...station,
              exercise: sourceStation.exercise,
              reps: sourceStation.reps,
              pause: sourceStation.pause,
              sector: sourceStation.sector
            };
          });
        });
        
        return newCircuits;
      });
      
      setActionLog(prev => [...prev, `Station ${circuit}${seriesIdx + 1}${stationNumber} copied to all stations in circuit ${circuit}`]);
    } else {
      // Copy to next station only
      const nextStationIdx = stationIdx + 1;
      if (nextStationIdx < circuits[circuitIdx].stationsBySeries[seriesIdx].length) {
        setCircuits(prevCircuits => {
          const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
          
          newCircuits[circuitIdx].stationsBySeries[seriesIdx][nextStationIdx] = {
            ...newCircuits[circuitIdx].stationsBySeries[seriesIdx][nextStationIdx],
            exercise: sourceStation.exercise,
            reps: sourceStation.reps,
            pause: sourceStation.pause,
            sector: sourceStation.sector
          };
          
          return newCircuits;
        });
        
        setActionLog(prev => [...prev, `Station ${circuit}${seriesIdx + 1}${stationNumber} copied to next station`]);
      } else {
        alert('No next station to copy to');
      }
    }
  };
  
  // ============================================================================
  // RENDER - 2026-01-21 19:30 UTC
  // 2026-01-21 20:15 UTC - Split into two phases: config and table
  // ============================================================================
  
  // Phase 1: Configuration View (matches screenshot)
  if (currentPhase === 'config') {
    return (
      <div className="space-y-4">
        {/* Warning Message - 2026-01-21 20:15 UTC */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-start gap-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <p className="text-sm text-yellow-800">
            Here you can create sequences of exercises to be performed in circuits to be repeated
          </p>
        </div>

        {/* Descriptions & Instructions - 2026-01-21 20:15 UTC */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descriptions & instructions
          </label>
          <textarea
            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-green-50"
            rows={2}
            placeholder="Add circuit description..."
          />
        </div>

        {/* Configuration Grid - 2026-01-21 20:15 UTC */}
        <div className="grid grid-cols-2 gap-6">
          {/* LEFT COLUMN - Circuit Names */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Circuit Names
              </label>
              <div className="space-y-2">
                {Array.from({ length: numCircuits }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-bold text-gray-700 w-6">{CIRCUIT_LETTERS[idx]}</span>
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-yellow-100"
                      placeholder={`Circuit ${CIRCUIT_LETTERS[idx]}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">No. Circuits</label>
              <input
                type="number"
                min="1"
                max="9"
                value={numCircuits}
                onChange={(e) => setNumCircuits(Math.min(9, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 px-3 py-2 border-2 border-blue-500 rounded focus:ring-2 focus:ring-blue-500"
              />
              <button className="p-2 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Station/circuit</label>
                <input
                  type="number"
                  min="2"
                  max="9"
                  value={stationsPerCircuit}
                  onChange={(e) => setStationsPerCircuit(Math.min(9, Math.max(2, parseInt(e.target.value) || 4)))}
                  className="w-20 px-3 py-2 border-2 border-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                />
                <button className="p-2 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              <div className="border rounded p-2">
                {Array.from({ length: stationsPerCircuit }).map((_, idx) => (
                  <div key={idx} className="h-6 bg-yellow-200 border-b border-yellow-400"></div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={seriesMode === 'count'}
                  onChange={() => setSeriesMode('count')}
                  id="series-count"
                />
                <label htmlFor="series-count" className="text-sm">Set series/circuit</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={seriesMode === 'time'}
                  onChange={() => setSeriesMode('time')}
                  id="series-time"
                />
                <label htmlFor="series-time" className="text-sm">Set time/circuit</label>
              </div>
              
              {seriesMode === 'count' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Series/circuit</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={seriesCount}
                    onChange={(e) => setSeriesCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 2)))}
                    className="w-20 px-3 py-2 border-2 border-blue-500 rounded"
                  />
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${seriesTime}'00"`}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 2;
                      setSeriesTime(Math.min(9, Math.max(1, val)));
                    }}
                    className="w-24 px-3 py-2 border-2 border-green-500 rounded text-center"
                  />
                  <span className="text-xs text-gray-500">Disabled when selected Time/circuit</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={executionMode === 'vertical'}
                  onChange={() => setExecutionMode('vertical')}
                  id="exec-vertical"
                />
                <label htmlFor="exec-vertical" className="text-sm">Execution vertically<br/><span className="text-xs text-gray-500">(1 serie for station)</span></label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={executionMode === 'horizontal'}
                  onChange={() => setExecutionMode('horizontal')}
                  id="exec-horizontal"
                />
                <label htmlFor="exec-horizontal" className="text-sm">Execution orizzontally<br/><span className="text-xs text-gray-500">(all series for station)</span></label>
              </div>
              
              {executionMode === 'horizontal' && (
                <div className="border rounded p-2">
                  <div className="space-y-1">
                    {Array.from({ length: stationsPerCircuit }).map((_, idx) => (
                      <div key={idx} className="flex gap-1">
                        {Array.from({ length: seriesCount }).map((_, sIdx) => (
                          <div key={sIdx} className="flex-1 h-4 bg-gray-300 border border-gray-400 flex items-center justify-center text-xs">
                            ↔️
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Pause Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause Settings
              </label>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm w-32">Pause\circuits</label>
                  <select
                    value={pauseCircuits}
                    onChange={(e) => setPauseCircuits(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border-2 border-blue-500 rounded"
                  >
                    {CIRCUIT_PAUSE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <X size={20} />
                  </button>
                </div>

                <div className="border rounded p-2">
                  {Array.from({ length: stationsPerCircuit }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-1 mb-1">
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm w-32">Pause\stations</label>
                  <select
                    value={pauseStations}
                    onChange={(e) => setPauseStations(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border-2 border-blue-500 rounded"
                  >
                    {STATION_PAUSE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <X size={20} />
                  </button>
                </div>

                <div className="border rounded p-2">
                  {Array.from({ length: stationsPerCircuit }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-1 mb-1">
                      <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm w-32">Pause among series</label>
                  <select
                    value={pauseSeries}
                    onChange={(e) => setPauseSeries(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border-2 border-blue-500 rounded"
                    disabled={seriesMode === 'time'}
                  >
                    {SERIES_PAUSE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <X size={20} />
                  </button>
                </div>
                {seriesMode === 'time' && (
                  <p className="text-xs text-gray-500">Disabled when selected Time/circuit</p>
                )}

                <div className="border rounded p-2">
                  {Array.from({ length: stationsPerCircuit }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-1 mb-1">
                      <div className="w-6 h-6 rounded-full bg-red-400 border-2 border-red-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {executionMode === 'horizontal' && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-sm w-32">Pause\stations</label>
                      <select
                        value={pauseHorizontalSeries}
                        onChange={(e) => setPauseHorizontalSeries(parseInt(e.target.value))}
                        className="flex-1 px-3 py-2 border-2 border-blue-500 rounded"
                      >
                        {HORIZONTAL_SERIES_PAUSE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <X size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - 2026-01-21 20:15 UTC */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
            >
              <Settings size={20} />
              Preferences
            </button>
            <button
              onClick={handleCreateCircuit}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              Create circuit
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Phase 2: Circuit Table View (after clicking Create circuit)
  return (
    <>
      <div className="space-y-2">
        {/* Configuration Section - 2026-01-21 19:30 UTC */}
        {/* 2026-01-22 15:20 UTC - Reduced width to 50% and centered */}
        {/* 2026-01-22 15:30 UTC - Increased width to 75% */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-3/4 mx-auto">
        <h3 className="text-lg font-bold text-blue-900 mb-4">Circuit Configuration</h3>
        
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
              onChange={(e) => setNumCircuits(Math.min(9, Math.max(1, parseInt(e.target.value) || 1)))}
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
              onChange={(e) => setStationsPerCircuit(Math.min(9, Math.max(2, parseInt(e.target.value) || 4)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">2-9 (default: 4)</p>
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
          
          {/* Series Count or Time */}
          {seriesMode === 'count' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={seriesCount}
                onChange={(e) => setSeriesCount(Math.min(5, Math.max(1, parseInt(e.target.value) || 2)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">1-5 (default: 2)</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minutes
              </label>
              <input
                type="number"
                min="1"
                max="9"
                value={seriesTime}
                onChange={(e) => setSeriesTime(Math.min(9, Math.max(1, parseInt(e.target.value) || 2)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">1-9 minutes (default: 2)</p>
            </div>
          )}
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
                className="mr-2"
              />
              <span className="text-sm">Horizontal (all series, then next exercise)</span>
            </label>
          </div>
        </div>
      </div>
      
        {/* Pause Settings Section - 2026-01-21 19:32 UTC */}
        {/* 2026-01-22 15:20 UTC - Reduced width to 50% and centered */}
        {/* 2026-01-22 15:30 UTC - Increased width to 75% */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 w-3/4 mx-auto">
        <h3 className="text-lg font-bold text-amber-900 mb-4">Pause Settings</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pause between Stations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Between Stations
            </label>
            <select
              value={pauseStations}
              onChange={(e) => setPauseStations(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              {STATION_PAUSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Pause between Circuits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Between Circuits
            </label>
            <select
              value={pauseCircuits}
              onChange={(e) => setPauseCircuits(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              {CIRCUIT_PAUSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Pause between Series */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Between Series of a Circuit
            </label>
            <select
              value={pauseSeries}
              onChange={(e) => setPauseSeries(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
            >
              {SERIES_PAUSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Pause between Series in Horizontal Mode */}
          {executionMode === 'horizontal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horizontal Series
              </label>
              <select
                value={pauseHorizontalSeries}
                onChange={(e) => setPauseHorizontalSeries(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500"
              >
                {HORIZONTAL_SERIES_PAUSE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
        {/* Circuit Grid Section - 2026-01-21 19:35 UTC */}
        {/* 2026-01-22 12:20 UTC - Removed overflow to allow dropdown to show properly */}
        {/* 2026-01-22 14:50 UTC - Reduced table width to 4/5 (80%) */}
        {/* 2026-01-22 15:20 UTC - Reduced width to 50% */}
        {/* 2026-01-22 15:30 UTC - Increased width to 75% */}
        <div className="bg-white border border-gray-300 rounded-lg w-3/4 mx-auto">
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
                <th colSpan={3} className="border border-gray-300 px-3 py-2 text-sm font-semibold text-left">
                  Load of work
                </th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Circ</th>
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Series</th>
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Stations</th>
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium bg-green-50" style={{minWidth: '150px'}}>Sectors</th>
                <th className="border border-gray-300 px-2 py-1 text-xs font-medium bg-green-50">Exercise</th>
                 <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Rip</th>
                 <th className="border border-gray-300 px-2 py-1 text-xs font-medium">Pause</th>
                 <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-center">Actions</th>
              </tr>
             </thead>
            <tbody>
              {circuits.map((circuit, circuitIdx) => {
                // 2026-01-22 12:15 UTC - Use first series to get stations count
                // 2026-01-22 14:05 UTC - Fixed: Sum all series' station counts
                const totalRows = circuit.stationsBySeries.reduce((sum, seriesStations) => sum + seriesStations.length, 0);
                let rowIndex = 0;
                
                return (
                  <React.Fragment key={circuit.letter}>
                    {Array.from({ length: circuit.series }).map((_, seriesIdx) => (
                      circuit.stationsBySeries[seriesIdx].map((station, stationIdx) => {
                        const isFirstRowOfCircuit = rowIndex === 0;
                        const isFirstRowOfSeries = stationIdx === 0;
                        rowIndex++;
                        
                         return (
                           <tr key={`${circuit.letter}-${seriesIdx}-${stationIdx}`} className="hover:bg-gray-50" style={{height: '36px'}}>
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
                                rowSpan={circuit.stationsBySeries[seriesIdx]?.length || 0}
                                className="border border-gray-300 px-2 py-2 text-center align-middle"
                              >
                                 <div className="flex flex-col items-center gap-1">
                                   <div className="flex items-center gap-2">
                                     <input
                                       type="checkbox"
                                       checked={selectedSeries.has(`${circuit.letter}-${seriesIdx + 1}`)}
                                       onChange={() => toggleSeriesSelection(circuit.letter, seriesIdx + 1)}
                                       className="w-4 h-4 cursor-pointer"
                                       title="Select series for removal"
                                     />
                                     <span className="text-sm">{seriesIdx + 1}</span>
                                   </div>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       removeSeries(circuit.letter, seriesIdx + 1);
                                     }}
                                     className="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                     title={`Delete series ${seriesIdx + 1} of circuit ${circuit.letter}`}
                                   >
                                     <X size={12} className="text-gray-700" strokeWidth={2.5} />
                                   </button>
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
                                    <img 
                                      src={MUSCULAR_SECTOR_IMAGES[station.sector]} 
                                      alt={station.sector}
                                      className="w-8 h-8 object-contain flex-shrink-0 pointer-events-none"
                                    />
                                    <span className="text-xs font-medium text-gray-700 flex-1">
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
                                    <X size={14} className="text-red-600" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center min-h-[32px]">
                                  <span className="text-xs text-gray-400">+</span>
                                </div>
                              )}
                            </td>
                            
                            {/* Exercise with Three Bars Drag Handle - 2026-01-21 20:30 UTC */}
                            {/* 2026-01-22 14:40 UTC - Changed to draggable for moving exercises */}
                            <td 
                              className="border border-gray-300 px-0 py-0 bg-green-50"
                              onDragOver={handleDragExerciseOver}
                              onDrop={(e) => handleDropExercise(e, circuit.letter, seriesIdx + 1, station.stationNumber)}
                            >
                              <div className="flex items-center gap-1 exercise-menu-container relative z-[10000]">
                                <input
                                  type="text"
                                  value={station.exercise}
                                  readOnly
                                  placeholder="Select exercise"
                                  className="flex-1 px-2 py-1 text-xs border-0 bg-green-100"
                                />
                                <button
                                  draggable
                                  onDragStart={(e) => handleDragExerciseStart(e, circuit.letter, seriesIdx + 1, station.stationNumber)}
                                  className="p-1.5 hover:bg-gray-200 rounded mr-1 cursor-move"
                                  title="Drag to move exercise"
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
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
                                value={station.reps}
                                onChange={(e) => {
                                  // 2026-01-22 12:15 UTC - Fixed to use series-specific stations
                                  setCircuits(prevCircuits => {
                                    const newCircuits = JSON.parse(JSON.stringify(prevCircuits)); // Deep clone
                                    newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].reps = e.target.value;
                                    return newCircuits;
                                  });
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              >
                                <option value="">-</option>
                                {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                                  <option key={num} value={num}>{num}</option>
                                ))}
                              </select>
                            </td>
                            
                             {/* Pause - 2026-01-22 10:15 UTC - Use configured pause value */}
                             <td className="border border-gray-300 px-2 py-1">
                               <select 
                                 value={station.pause}
                                 onChange={(e) => {
                                   // 2026-01-22 12:15 UTC - Fixed to use series-specific stations
                                   setCircuits(prevCircuits => {
                                     const newCircuits = JSON.parse(JSON.stringify(prevCircuits)); // Deep clone
                                     newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].pause = parseInt(e.target.value);
                                     return newCircuits;
                                   });
                                 }}
                                 className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                               >
                                 {STATION_PAUSE_OPTIONS.map(opt => (
                                   <option key={opt.value} value={opt.value}>{opt.label}</option>
                                 ))}
                               </select>
                             </td>
                             
                             {/* Actions - 2026-01-22 14:40 UTC - Edit and Copy buttons */}
                             {/* 2026-01-22 14:50 UTC - Centered buttons */}
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
                                   className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                   title="Edit station"
                                 >
                                   Edit
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     
                                     // Handle double-click detection
                                     if (copyClickTimer) {
                                       // Double click detected
                                       clearTimeout(copyClickTimer);
                                       setCopyClickTimer(null);
                                       handleCopyStation(circuit.letter, seriesIdx, station.stationNumber, true);
                                     } else {
                                       // First click - wait for potential double click
                                       const timer = setTimeout(() => {
                                         // Single click confirmed
                                         handleCopyStation(circuit.letter, seriesIdx, station.stationNumber, false);
                                         setCopyClickTimer(null);
                                       }, 300);
                                       setCopyClickTimer(timer);
                                     }
                                   }}
                                   className="p-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                   title="Copy: Single click = next station, Double click = all stations in circuit"
                                 >
                                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                     <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                     <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                   </svg>
                                 </button>
                               </div>
                             </td>
                          </tr>
                        );
                      })
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>
      
      {/* Sector Selector Modal with Drag & Drop - 2026-01-22 12:40 UTC */}
      {/* 2026-01-22 13:10 UTC - Updated to support single station selection */}
      {showSectorSelector && (selectedCircuitForSector || selectedStationForSector) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {selectedStationForSector 
                  ? `Select Muscular Area - Circuit ${selectedStationForSector.circuitLetter} / Series ${selectedStationForSector.seriesIdx + 1} / Station ${selectedStationForSector.stationNumber}`
                  : `Drag Muscular Areas to Stations - Circuit ${selectedCircuitForSector}`
                }
              </h3>
              <button
                onClick={() => {
                  setShowSectorSelector(false);
                  setSelectedCircuitForSector(null);
                  setSelectedStationForSector(null);
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
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 p-4 rounded-lg border-2 border-dashed border-gray-300" style={{backgroundColor: 'rgb(230, 252, 255)'}}>
                {MUSCULAR_SECTORS.filter(sector => MUSCULAR_SECTOR_IMAGES[sector]).map(sector => (
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
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-2 bg-white rounded border border-gray-300 transition-all ${
                      selectedStationForSector 
                        ? 'cursor-pointer hover:border-green-500 hover:bg-green-50 hover:shadow-md' 
                        : 'cursor-move hover:border-blue-500 hover:shadow-md'
                    }`}
                    title={sector}
                  >
                    <img 
                      src={MUSCULAR_SECTOR_IMAGES[sector]} 
                      alt={sector}
                      className="w-12 h-12 object-contain pointer-events-none"
                    />
                    <span className="text-[10px] text-center font-medium text-gray-700 leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                      {sector}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Station Drop Zones by Series - 2026-01-22 12:40 UTC */}
            {/* 2026-01-22 13:10 UTC - Only show in full circuit mode, added scrollbar */}
            {/* 2026-01-22 14:30 UTC - Moved Reply areas button to Series 1, added validation warning */}
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
                    <div className="flex items-center gap-3 mb-3">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {seriesStations.map((station) => (
                        <div
                          key={`station-${station.stationNumber}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => selectedCircuitForSector && handleDropOnStation(e, selectedCircuitForSector, seriesIdx, station.stationNumber)}
                          className="relative border-2 border-dashed border-gray-400 rounded-lg p-3 min-h-[120px] flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                          <div className="text-xs font-bold text-gray-600">
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
                                <img 
                                  src={MUSCULAR_SECTOR_IMAGES[station.sector]} 
                                  alt={station.sector}
                                  className="w-12 h-12 object-contain pointer-events-none"
                                />
                                <span className="text-[10px] text-center font-medium text-gray-700 pointer-events-none">
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
      
      {/* Add Serie Modal - 2026-01-21 22:10 UTC */}
      {showAddSerieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Serie to Circuit</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select circuit:
            </label>
            <select
              id="add-serie-circuit"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            >
              {circuits.map(c => (
                <option key={c.letter} value={c.letter}>Circuit {c.letter}</option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mb-4">
              The serie will be added at the end and will copy exercises from the serie before the previous one.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddSerieModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const circuit = (document.getElementById('add-serie-circuit') as HTMLSelectElement)?.value;
                  handleAddSerie(circuit);
                }}
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
      
      {/* Manual Exercise Selection Modal - 2026-01-22 11:45 UTC */}
      {/* 2026-01-22 13:20 UTC - Updated to include reps editing */}
      {showManualExerciseModal && selectedStationForManualExercise && !pendingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Select Exercise</h3>
              <button
                onClick={() => {
                  setShowManualExerciseModal(false);
                  setSelectedStationForManualExercise(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {getAllSectors().map(sector => {
                const exercises = getExercisesBySector(sector);
                return (
                  <div key={sector} className="border border-gray-200 rounded p-3">
                    <h4 className="font-semibold text-sm mb-2 text-blue-700">{sector}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {exercises.map(exercise => (
                        <button
                          key={exercise.id}
                          onClick={() => {
                            // 2026-01-22 13:20 UTC - Show reps dialog first
                            const { circuitIdx, seriesIdx, stationIdx } = selectedStationForManualExercise;
                            const currentReps = circuits[circuitIdx]?.stationsBySeries[seriesIdx]?.[stationIdx]?.reps || '10';
                            setPendingExercise({
                              name: exercise.name,
                              sector: sector,
                              reps: currentReps
                            });
                          }}
                          className="px-3 py-2 text-xs bg-gray-100 hover:bg-blue-100 border border-gray-300 rounded text-left"
                        >
                          {exercise.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Reps Editor Modal - 2026-01-22 13:20 UTC */}
      {showManualExerciseModal && selectedStationForManualExercise && pendingExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Set Repetitions</h3>
              <button
                onClick={() => {
                  setPendingExercise(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exercise:</label>
                <p className="text-base font-semibold text-gray-900">{pendingExercise.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repetitions (Rip):</label>
                <select
                  value={pendingExercise.reps}
                  onChange={(e) => setPendingExercise({...pendingExercise, reps: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-</option>
                  {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setPendingExercise(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    // Apply the exercise and reps
                    setCircuits(prevCircuits => {
                      const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                      const { circuitIdx, seriesIdx, stationIdx } = selectedStationForManualExercise;
                      newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].exercise = pendingExercise.name;
                      newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].sector = pendingExercise.sector;
                      newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].reps = pendingExercise.reps;
                      return newCircuits;
                    });
                    setShowManualExerciseModal(false);
                    setSelectedStationForManualExercise(null);
                    setPendingExercise(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Circuit Action Buttons - 2026-01-21 22:10 UTC */}
      {/* 2026-01-22 15:20 UTC - Center-aligned buttons */}
      <div className="flex items-center justify-center gap-3 mt-6 border-t pt-6">
        <button
          onClick={() => setShowAddCircuitModal(true)}
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
          Add serie to a circuit
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
      </div>
      
       {/* Preview Section - 2026-01-21 22:10 UTC - 2026-01-22 14:35 UTC - Compacted */}
       {/* 2026-01-22 15:20 UTC - Reduced width to 50% and centered */}
       <div className="p-3 bg-gray-50 border border-gray-300 rounded w-1/2 mx-auto">
         <div className="text-sm font-semibold text-gray-700 mb-2">PREVIEW:</div>
         <div className="text-sm text-gray-800">
           {generatePreview()}
         </div>
         {actionLog.length > 0 && (
           <div className="mt-2 pt-2 border-t border-gray-300">
             {actionLog.map((log, idx) => (
               <div key={idx} className="text-xs text-blue-600">{log}</div>
             ))}
           </div>
         )}
       </div>
       
       {/* Action Buttons - 2026-01-22 14:35 UTC - Right-aligned buttons, Back returns to config */}
       {/* 2026-01-22 15:15 UTC - Reset circuitsInitialized when going back to config */}
       <div className="flex items-center justify-end gap-3 pt-3 border-t">
           <button
             onClick={() => {
               setCurrentPhase('config');
               setCircuitsInitialized(false); // Reset so circuits can be regenerated if config changes
             }}
             className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
           >
             Back
           </button>
           <button
             onClick={handleSave}
             className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
           >
             Add Moveframe
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
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Stop mousedown from reaching document to prevent handleClickOutside from interfering
            e.stopPropagation();
          }}
        >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const circuit = circuits.find(c => c.letter === showExerciseMenu.circuit);
            if (circuit) {
              handleRemoveStation(showExerciseMenu.circuit, showExerciseMenu.station, showExerciseMenu.series);
            }
            setShowExerciseMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 border-b border-gray-200 cursor-pointer"
        >
          Remove station
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
            const circuitIdx = circuits.findIndex(c => c.letter === showExerciseMenu.circuit);
            const seriesIdx = showExerciseMenu.series - 1;
            const circuit = circuits[circuitIdx];
            if (circuit && circuit.stationsBySeries[seriesIdx]) {
              const stationIdx = circuit.stationsBySeries[seriesIdx].findIndex(
                s => s.stationNumber === showExerciseMenu.station
              );
              const station = circuit.stationsBySeries[seriesIdx][stationIdx];
              const currentSector = station?.sector;
              const currentExercise = station?.exercise;
              
              if (currentSector) {
                // 2026-01-22 14:50 UTC - Exclude current exercise to get a different one
                const randomExercise = getRandomExercise(currentSector, currentExercise);
                
                if (randomExercise) {
                  setCircuits(prevCircuits => {
                    const newCircuits = JSON.parse(JSON.stringify(prevCircuits));
                    newCircuits[circuitIdx].stationsBySeries[seriesIdx][stationIdx].exercise = randomExercise.name;
                    return newCircuits;
                  });
                  setActionLog(prev => [...prev, `Exercise replaced in ${showExerciseMenu.circuit}${showExerciseMenu.series}${showExerciseMenu.station}`]);
                } else {
                  alert(`No other exercises available for ${currentSector}. There may be only one exercise in this sector.`);
                }
              } else {
                alert('Please assign a muscular sector first.');
              }
            }
            setShowExerciseMenu(null);
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 cursor-pointer"
        >
          Load a new station
        </button>
      </div>
      </>,
      document.body
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
    </>
  );
}

