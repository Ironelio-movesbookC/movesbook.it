'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Settings, Clock, Play } from 'lucide-react';
import Image from 'next/image';
import { CIRCUIT_SERIES_PAUSE_OPTIONS } from '@/constants/moveframe.constants';
import CircuitExecutionPlayer from './CircuitExecutionPlayer';
import CircuitPlanner_OLD from './CircuitPlanner_OLD';

interface CircuitExercise {
  letter: string;
  name: string;
  isActive: boolean;
}

interface CircuitRow {
  circuit: string;
  series: number;
  station: number;
  sector: string;
  exercise: string;
  rip: string;
  pause: string;
}

interface BatteryCircuitPlannerProps {
  sectionId: string;
  sport: string;
  workout: any;
  day: any;
  onCreateCircuit: (data: any) => void;
  onCancel: () => void;
  existingMoveframe?: any; // For edit mode
  startInSecondView?: boolean; // Start directly in circuit grid view
  editingMovelapTarget?: { circuitLetter?: string; circuitIndex?: number; localSeriesNumber?: number; stationNumber?: number } | null;
  targetMovelap?: any; // The specific movelap being edited (for circuit mode)
  hideUI?: boolean;
}

// Helper function to extract circuit data from moveframe notes
const extractCircuitData = (notes: string | null) => {
  if (!notes) return null;
  
  const circuitDataMatch = notes.match(/\[CIRCUIT_DATA\]([\s\S]*?)\[\/CIRCUIT_DATA\]/);
  if (circuitDataMatch && circuitDataMatch[1]) {
    try {
      const circuitData = JSON.parse(circuitDataMatch[1]);
      return circuitData;
    } catch (e) {
      console.error('Failed to parse circuit data:', e);
      return null;
    }
  }
  return null;
};

const CIRCUIT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const parsePauseValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const s = value.trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s.includes("'")) {
    const [mStr, rest] = s.split("'");
    const m = parseInt((mStr || '0').replace(/\D/g, ''), 10) || 0;
    const sec = parseInt((rest || '').replace(/\D/g, '').slice(0, 2), 10) || 0;
    return m * 60 + sec;
  }
  const secOnly = s.match(/^(\d+)\s*"?$/);
  if (secOnly) return parseInt(secOnly[1], 10);
  return 0;
};

const extractCircuitMeta = (notes: unknown) => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_META\]([\s\S]*?)\[\/CIRCUIT_META\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

/**
 * REDESIGNED stores Pause\circuits / Pause\series (count) as whole minutes 1–10.
 * CircuitPlanner_OLD expects seconds (60–600). Saved data from OLD uses seconds already.
 */
const betweenCircuitsToPlannerSeconds = (n: number, fallbackSec = 120): number => {
  if (!Number.isFinite(n)) return fallbackSec;
  const v = Math.round(n);
  if (v >= 60 && v <= 600) return v;
  if (v >= 1 && v <= 10) return v * 60;
  if (v === 0) return fallbackSec;
  return Math.min(600, Math.max(60, v));
};

/** Count mode: series gap default from config — minutes 1–10 vs seconds from OLD saves. */
const countSeriesPauseToPlannerSeconds = (n: number, fallbackSec = 120): number => {
  if (!Number.isFinite(n)) return fallbackSec;
  const v = Math.round(n);
  if (v >= 60) return Math.min(600, v);
  if (v >= 1 && v <= 10) return v * 60;
  return v;
};

const snapCircuitSeriesPauseSec = (raw: number): number => {
  const allowed = CIRCUIT_SERIES_PAUSE_OPTIONS.map((o) => o.value);
  const r = Math.max(0, Math.round(Number.isFinite(raw) ? raw : 0));
  if (allowed.includes(r)) return r;
  let best = allowed[0]!;
  let bestDist = Infinity;
  for (const v of allowed) {
    const d = Math.abs(v - r);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  return best;
};

const formatCircuitSeriesPauseLabel = (seconds: number): string => {
  const found = CIRCUIT_SERIES_PAUSE_OPTIONS.find((o) => o.value === seconds);
  if (found) return found.label;
  const secTotal = Math.max(0, Math.round(seconds));
  const m = Math.floor(secTotal / 60);
  const s = secTotal % 60;
  if (m <= 0) return `${s}"`;
  if (s === 0) return `${m}'`;
  return `${m}'${String(s).padStart(2, '0')}"`;
};

const buildCircuitsFromMovelaps = (movelaps: any[], fallbackConfig: any) => {
  if (!Array.isArray(movelaps) || movelaps.length === 0) return null;
  const perCircuit = new Map<string, Map<number, Map<number, any>>>();
  const seriesCountByCircuit = new Map<string, number>();
  const stationsPerSeriesByCircuit = new Map<string, number>();
  let maxCircuitIndex = 0;

  movelaps.forEach((ml) => {
    if (!ml) return;
    const meta = extractCircuitMeta(ml.notes) || null;
    const rawLetter =
      typeof ml.circuitLetter === 'string' && ml.circuitLetter.trim()
        ? ml.circuitLetter.trim()
        : typeof meta?.circuitLetter === 'string' && meta.circuitLetter.trim()
          ? meta.circuitLetter.trim()
          : typeof ml.circuitIndex === 'number'
            ? CIRCUIT_LETTERS[ml.circuitIndex - 1]
            : typeof meta?.circuitIndex === 'number'
              ? CIRCUIT_LETTERS[meta.circuitIndex - 1]
              : '';
    const letter = rawLetter && CIRCUIT_LETTERS.includes(rawLetter) ? rawLetter : '';
    if (!letter) return;
    const localSeries = Number(ml.localSeriesNumber ?? ml.seriesNumber ?? meta?.localSeriesNumber ?? meta?.seriesNumber ?? 1) || 1;
    const stationNumber = Number(ml.stationNumber ?? meta?.stationNumber ?? 1) || 1;
    maxCircuitIndex = Math.max(maxCircuitIndex, CIRCUIT_LETTERS.indexOf(letter) + 1);
    const seriesMap = perCircuit.get(letter) ?? new Map<number, Map<number, any>>();
    const stationMap = seriesMap.get(localSeries) ?? new Map<number, any>();
    stationMap.set(stationNumber, {
      stationNumber,
      sector: ml.sector || ml.muscularSector || meta?.sector || '',
      exercise: ml.exercise || '',
      reps: ml.reps || '',
      pause: parsePauseValue(ml.pause),
      notes: ml.notes || ''
    });
    seriesMap.set(localSeries, stationMap);
    perCircuit.set(letter, seriesMap);
    seriesCountByCircuit.set(letter, Math.max(seriesCountByCircuit.get(letter) ?? 0, localSeries));
    stationsPerSeriesByCircuit.set(letter, Math.max(stationsPerSeriesByCircuit.get(letter) ?? 0, stationNumber));
  });

  if (perCircuit.size === 0) return null;
  const circuitLetters = Array.from(perCircuit.keys()).sort((a, b) => CIRCUIT_LETTERS.indexOf(a) - CIRCUIT_LETTERS.indexOf(b));
  const seriesModeFb = fallbackConfig?.seriesMode ?? 'count';
  const pauseSeriesRaw = Number(fallbackConfig?.pauseSeries ?? fallbackConfig?.pauses?.series ?? 0) || 0;
  const pauseCircuitsRaw = Number(fallbackConfig?.pauseCircuits ?? fallbackConfig?.pauses?.circuits ?? 0) || 0;
  const pauseCircuitsSec = betweenCircuitsToPlannerSeconds(pauseCircuitsRaw, 120);
  const pauseSeriesSec =
    seriesModeFb === 'time' ? pauseSeriesRaw : countSeriesPauseToPlannerSeconds(pauseSeriesRaw, 120);
  const pauseSeries = pauseSeriesRaw;
  const pauseCircuits = pauseCircuitsRaw;

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
        stations.push(
          existing || {
            stationNumber: st,
            sector: '',
            exercise: '',
            reps: '',
            pause: parsePauseValue(fallbackConfig?.pauseStations ?? fallbackConfig?.pauses?.stations ?? 0),
            notes: ''
          }
        );
      }
      stationsBySeries.push(stations);
    }
    return {
      letter,
      stationsBySeries,
      series: seriesCount,
      pauseBetweenSeries: pauseSeriesSec,
      pauseAfterCircuit: pauseCircuitsSec
    };
  });

  const numCircuits = fallbackConfig?.numCircuits ?? (maxCircuitIndex || circuits.length);
  const stationsPerCircuit =
    fallbackConfig?.stationsPerCircuit ?? Math.max(...Array.from(stationsPerSeriesByCircuit.values()));
  const seriesCount =
    fallbackConfig?.seriesCount ??
    fallbackConfig?.seriesPerCircuit ??
    Math.max(...Array.from(seriesCountByCircuit.values()));
  const seriesMode = fallbackConfig?.seriesMode ?? 'count';
  const config = {
    numCircuits,
    stationsPerCircuit,
    seriesMode,
    seriesCount,
    pauseSeries,
    pauseCircuits,
    pauses: {
      stations: fallbackConfig?.pauseStations ?? fallbackConfig?.pauses?.stations ?? 0,
      series: pauseSeries,
      circuits: pauseCircuits
    },
    executionMode: fallbackConfig?.executionMode ?? 'vertical'
  };

  return { config, circuits };
};

export default function BatteryCircuitPlanner({
  sectionId,
  sport,
  workout,
  day,
  onCreateCircuit,
  onCancel,
  existingMoveframe,
  startInSecondView,
  editingMovelapTarget,
  targetMovelap: _targetMovelap,
  hideUI: _hideUI
}: BatteryCircuitPlannerProps) {
  const existingCircuitData = React.useMemo(() => {
    if (!existingMoveframe) return null;
    const fromNotes = extractCircuitData(existingMoveframe.notes);
    if (fromNotes) return fromNotes;
    const hasCircuitData =
      !!existingMoveframe.circuitConfig ||
      Array.isArray(existingMoveframe.circuits) ||
      Array.isArray(existingMoveframe.rows);
    if (!hasCircuitData) return null;
    const fallback = {
      config: existingMoveframe.circuitConfig || existingMoveframe.config || {},
      circuits: Array.isArray(existingMoveframe.circuits) ? existingMoveframe.circuits : null,
      rows: Array.isArray(existingMoveframe.rows) ? existingMoveframe.rows : null
    };
    if (!fallback.circuits && Array.isArray(existingMoveframe.movelaps) && existingMoveframe.movelaps.length > 0) {
      const built = buildCircuitsFromMovelaps(existingMoveframe.movelaps, fallback.config);
      if (built) {
        return built;
      }
    }
    return fallback;
  }, [existingMoveframe]);
  const config = existingCircuitData?.config;
  
  const [description, setDescription] = useState(existingMoveframe?.description || '');
  const [showOldCircuitPlanner, setShowOldCircuitPlanner] = useState(false);
  const [timeInstructions, setTimeInstructions] = useState('');
  const [existingCircuits, setExistingCircuits] = useState(existingCircuitData?.circuits || null);
  
  // Circuit settings - All 9 circuits (A-I)
  // Initialize from existing data if available
  const initializeCircuits = () => {
    const defaultCircuits = [
      { letter: 'A', name: '', isActive: true },
      { letter: 'B', name: '', isActive: true },
      { letter: 'C', name: '', isActive: true },
      { letter: 'D', name: '', isActive: false },
      { letter: 'E', name: '', isActive: false },
      { letter: 'F', name: '', isActive: false },
      { letter: 'G', name: '', isActive: false },
      { letter: 'H', name: '', isActive: false },
      { letter: 'I', name: '', isActive: false }
    ];
    
    if (existingCircuitData?.circuits) {
      // Map existing circuits data to the circuit list
      return defaultCircuits.map((circuit, index) => {
        const existingCircuit = existingCircuitData.circuits.find((c: any) => c.letter === circuit.letter);
        if (existingCircuit) {
          return {
            letter: circuit.letter,
            name: existingCircuit.name || '',
            isActive: true
          };
        }
        return {
          ...circuit,
          isActive: index < (config?.numCircuits || 3)
        };
      });
    }
    return defaultCircuits;
  };
  
  const [circuits, setCircuits] = useState<CircuitExercise[]>(initializeCircuits());
  
  const [numCircuits, setNumCircuits] = useState(config?.numCircuits || 3);
  // Support both flat structure (pauseCircuits in minutes) and nested (pauses.circuits in seconds)
  const [pauseCircuits, setPauseCircuits] = useState(() => {
    if (config?.pauseCircuits !== undefined) return config.pauseCircuits;
    if (config?.pauses?.circuits != null) return Math.round(config.pauses.circuits / 60);
    return 4;
  }); // in minutes
  
  // Station settings
  const [stationsPerCircuit, setStationsPerCircuit] = useState(config?.stationsPerCircuit || 5);
  const [pauseStations, setPauseStations] = useState(config?.pauses?.stations || 10); // in seconds
  
  // Series settings
  const [seriesMode, setSeriesMode] = useState<'series' | 'time'>(
    config?.seriesMode === 'time' ? 'time' : 'series'
  );
  const [seriesPerCircuit, setSeriesPerCircuit] = useState(config?.seriesCount ?? 1);
  const [timePerCircuit, setTimePerCircuit] = useState(config?.seriesTime || 5); // in minutes
  // Support both flat structure (pauseSeries) and nested (pauses.series in seconds)
  const [pauseSeries, setPauseSeries] = useState(() => {
    if (config?.pauseSeries !== undefined) return config.pauseSeries;
    if (config?.pauses?.series != null) return Math.round(config.pauses.series / 60);
    return 2;
  }); // in minutes
  
  // Execution settings
  const [executionOrder, setExecutionOrder] = useState<'vertical' | 'horizontal'>(
    config?.executionMode === 'horizontal' ? 'horizontal' : 'vertical'
  );
  /** When Execution horizontally + Set series: "Pause at the end" (seconds; same option list as Pause\\series). */
  const [horizontalPauseAtEndSec, setHorizontalPauseAtEndSec] = useState(() => {
    let sec = 120;
    if (typeof config?.pauses?.series === 'number') {
      sec = countSeriesPauseToPlannerSeconds(config.pauses.series, 120);
    } else if (config?.pauseSeries !== undefined) {
      const min = Number(config.pauseSeries) || 2;
      sec = Math.min(600, Math.max(0, min * 60));
    }
    return snapCircuitSeriesPauseSec(sec);
  });
  /** Pause\\series (horizontal): rest between series at a station — seconds, same list as Pause at the end. */
  const [horizontalPauseBetweenSeriesSec, setHorizontalPauseBetweenSeriesSec] = useState(() => {
    const h =
      typeof config?.horizontalSeries === 'number'
        ? config.horizontalSeries
        : typeof config?.pauses?.horizontalSeries === 'number'
          ? config.pauses.horizontalSeries
          : 40;
    return snapCircuitSeriesPauseSec(h);
  });
  
  // Execution player state
  const [showExecutionPlayer, setShowExecutionPlayer] = useState(false);
  
  // Fetch time circuit instructions translation on mount
  useEffect(() => {
    const fetchTimeInstructions = async () => {
      const defaultText = 'If the series are set in minutes therefore the athlete will repeat all the stations continuosly for the time set. And once finished the time, after the Pause at the end, he will start again with the next serie.';
      const isAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      const token = localStorage.getItem('token');
      if (!isAdminPath || !token) {
        setTimeInstructions(defaultText);
        return;
      }
      try {
        const response = await fetch('/api/admin/translations', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.translations) {
            // Find the translation for circuit_time_instructions
            const translation = data.translations.find(
              (t: any) => t.key === 'circuit_time_instructions'
            );
            
            if (translation && translation.values) {
              // Get current language from localStorage or default to 'en'
              const currentLang = localStorage.getItem('selectedLanguage') || 'en';
              const text = translation.values[currentLang] || translation.values['en'] || '';
              setTimeInstructions(text);
            } else {
              setTimeInstructions(defaultText);
            }
            return;
          }
        }
        setTimeInstructions(defaultText);
      } catch (error) {
        setTimeInstructions(defaultText);
      }
    };
    
    fetchTimeInstructions();
  }, []);
  
  // Auto-navigate to second view if requested (e.g., when editing a movelap)
  useEffect(() => {
    if (startInSecondView) {
      setShowOldCircuitPlanner(true);
    }
  }, [startInSecondView]);
  
  useEffect(() => {
    if (existingCircuits && Array.isArray(existingCircuits) && existingCircuits.length > 0) {
      setShowOldCircuitPlanner(true);
    }
  }, [existingCircuits]);
  
  // Toggle circuit active state
  const toggleCircuit = (index: number) => {
    const newCircuits = [...circuits];
    newCircuits[index].isActive = !newCircuits[index].isActive;
    setCircuits(newCircuits);
    
    // Update numCircuits count
    const activeCount = newCircuits.filter(c => c.isActive).length;
    setNumCircuits(activeCount);
  };
  
  // Handle numCircuits change to update active circuits
  const handleNumCircuitsChange = (value: number) => {
    setNumCircuits(value);
    const newCircuits = circuits.map((circuit, index) => ({
      ...circuit,
      isActive: index < value
    }));
    setCircuits(newCircuits);
  };
  
  const generateCircuitTemplate = () => {
    if (!sectionId) {
      alert('Please select a workout section');
      return;
    }
    
    // Pass current configuration to the old circuit planner
    setShowOldCircuitPlanner(true);
  };

  /** Seconds for Pause\stations in OLD planner; horizontal + Set series uses Pause\series (granular list). */
  const pauseStationsForOldPlanner =
    executionOrder === 'horizontal' && seriesMode === 'series'
      ? horizontalPauseBetweenSeriesSec
      : pauseStations;

  const stationPauseSelectOptions = React.useMemo(() => {
    if (executionOrder === 'horizontal' && seriesMode === 'series') {
      return CIRCUIT_SERIES_PAUSE_OPTIONS.map((o) => o.value);
    }
    const base = [5, 10, 15, 20, 25, 30, 40, 50, 60];
    const sec = pauseStationsForOldPlanner;
    if (!base.includes(sec)) {
      return [...base, sec].sort((a, b) => a - b);
    }
    return base;
  }, [executionOrder, seriesMode, pauseStationsForOldPlanner]);

  // If showing old circuit planner, render it instead of the first view
  if (showOldCircuitPlanner) {
    return (
      <CircuitPlanner_OLD
        sport={sport}
        initialConfig={{
          numCircuits,
          stationsPerCircuit,
          seriesMode: seriesMode === 'series' ? 'count' : 'time',
          seriesCount: seriesPerCircuit,
          seriesTime: timePerCircuit,
          pauseStations: pauseStationsForOldPlanner,
          pauseCircuits,
          pauseSeries:
            executionOrder === 'horizontal' && seriesMode === 'series'
              ? horizontalPauseAtEndSec / 60
              : pauseSeries,
          horizontalSeries: horizontalPauseBetweenSeriesSec,
          loadOfWork: undefined,
          executionMode: executionOrder,
          startInTablePhase: true,
          existingCircuits: existingCircuits, // Pass existing circuit data for edit mode
          editingFromMovelap: !!editingMovelapTarget,
          editingMovelapTarget: editingMovelapTarget,
          editingMovelapData: _targetMovelap
        }}
        onSave={(data: any) => {
          // Pass the circuit data to the parent component
          onCreateCircuit({
            ...data,
            // Prefer settings coming from the old planner (it may have been edited there)
            settings: data?.config ?? data?.settings ?? {
              numCircuits,
              pauseCircuits,
              stationsPerCircuit,
              pauseStations,
              seriesMode,
              seriesPerCircuit,
              timePerCircuit,
              pauseSeries:
                executionOrder === 'horizontal' && seriesMode === 'series'
                  ? horizontalPauseAtEndSec / 60
                  : pauseSeries,
              executionOrder,
              horizontalSeries: horizontalPauseBetweenSeriesSec,
              executionPauseStations: String(horizontalPauseBetweenSeriesSec)
            }
          });
          setShowOldCircuitPlanner(false);
        }}
        onCancel={() => {
          if (startInSecondView) {
            onCancel(); // Close the parent modal completely if we started in second view (e.g. from movelap edit)
          } else {
            setShowOldCircuitPlanner(false);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning Message */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">⚠️ Here you can create sequences of exercises to be performed in circuits to be repeated</p>
      </div>
      
      {/* Descriptions & Instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Descriptions & instructions</label>
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-green-50" 
          rows={3} 
          placeholder="Add circuit description and instructions..." 
        />
      </div>
      
      <div className="space-y-4">
        {/* ROW 1: Circuit Letters (A-I) with No. Circuits and Pause\circuits */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Circuit Letter Buttons WITHOUT pause indicators */}
            <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {circuits.slice(0, 9).map((circuit, index) => (
                  <button
                    key={circuit.letter}
                    type="button"
                    onClick={() => toggleCircuit(index)}
                    className={`w-14 h-12 rounded flex items-center justify-center font-bold text-xl border-2 transition-all ${
                      circuit.isActive 
                        ? 'bg-yellow-400 border-yellow-600 text-black shadow-md' 
                        : 'bg-gray-200 border-gray-400 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {circuit.letter}
                  </button>
                ))}
              </div>
              
              {/* No. Circuits Control */}
              <div className="flex items-center justify-start gap-2">
                <label className="text-sm font-medium text-gray-700">No. Circuits</label>
                <select 
                  value={numCircuits} 
                  onChange={(e) => handleNumCircuitsChange(parseInt(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-gray-400 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm font-semibold bg-yellow-100"
                >
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button type="button" className="w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-700 text-lg font-bold">×</button>
              </div>
            </div>
            
            {/* Right: Circuit Letters WITH pause indicators (timer icons) */}
            <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {circuits.slice(0, 9).map((circuit, index) => (
                  <div key={`pause-${circuit.letter}`} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleCircuit(index)}
                      className={`w-14 h-12 rounded flex items-center justify-center font-bold text-xl border-2 transition-all ${
                        circuit.isActive 
                          ? 'bg-yellow-400 border-yellow-600 text-black shadow-md' 
                          : 'bg-gray-200 border-gray-400 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {circuit.letter}
                    </button>
                    {/* Timer icon below active circuits */}
                    {circuit.isActive && (
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                        <Image src="/timer.png" alt="timer" width={32} height={32} className="object-contain" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pause\circuits Control */}
              <div className="flex items-center justify-end gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Pause\circuits</label>
                <select 
                  value={pauseCircuits} 
                  onChange={(e) => setPauseCircuits(parseInt(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-gray-400 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}'</option>
                  ))}
                </select>
                <button type="button" className="w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-700 text-lg font-bold">×</button>
              </div>
            </div>
          </div>
          
          {/* ROW 2: Stations Visualization */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Station\circuit WITHOUT pause indicators */}
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-12 h-12 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-xl shadow-md">
                  A
                </div>
                {[...Array(stationsPerCircuit)].map((_, i) => (
                  <div key={i} className="flex-1 h-8 bg-cyan-500 border-2 border-cyan-700 rounded-md shadow-sm" />
                ))}
              </div>
              <div className="flex items-center justify-start gap-2 mt-4">
                <label className="text-sm font-medium text-gray-700">Station\circuit</label>
                <select 
                  value={stationsPerCircuit} 
                  onChange={(e) => setStationsPerCircuit(parseInt(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-gray-400 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                >
                  {[2,3,4,5,6,7,8,9].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button type="button" className="w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-700 text-lg font-bold">×</button>
              </div>
            </div>
            
            {/* Right: Pause\stations WITH timer icons between stations */}
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="flex items-center gap-1 mb-4">
                <div className="w-12 h-12 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-xl shadow-md flex-shrink-0">
                  A
                </div>
                {[...Array(stationsPerCircuit)].map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="flex-1 h-8 bg-cyan-500 border-2 border-cyan-700 rounded-md shadow-sm" />
                    {i < stationsPerCircuit - 1 && (
                      <div className="flex-shrink-0">
                        <Image src="/timer.png" alt="timer" width={32} height={32} className="object-contain" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <label
                  className={`text-sm font-medium ${
                    executionOrder === 'horizontal' && seriesMode === 'series' ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  Pause\stations
                </label>
                <select
                  value={pauseStationsForOldPlanner}
                  onChange={(e) => setPauseStations(parseInt(e.target.value, 10))}
                  disabled={executionOrder === 'horizontal' && seriesMode === 'series'}
                  title={
                    executionOrder === 'horizontal' && seriesMode === 'series'
                      ? 'Set series\\circuit: pause between stations matches Pause\\series (same time list). Edit Pause\\series.'
                      : undefined
                  }
                  className="w-20 px-2 py-1.5 border border-gray-400 rounded text-center focus:ring-2 focus:ring-blue-500 text-sm font-semibold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {stationPauseSelectOptions.map((n) => {
                    const opt = CIRCUIT_SERIES_PAUSE_OPTIONS.find((o) => o.value === n);
                    return (
                      <option key={n} value={n}>
                        {executionOrder === 'horizontal' && seriesMode === 'series' && opt ? opt.label : `${n}"`}
                      </option>
                    );
                  })}
                </select>
                <button type="button" className="w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-700 text-lg font-bold">×</button>
              </div>
            </div>
          </div>
          
          {/* ROW 3: Series Visualization */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Set series/time per circuit WITHOUT timer icon */}
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-2xl shadow-md flex-shrink-0">
                  A
                </div>
                <div className="flex-1 relative">
                  {/* Large dashed border visualization box WITHOUT timer icon - Screenshot 2 style */}
                  <div className="relative bg-white border-4 border-dashed border-gray-400 rounded-lg p-3 h-48 flex flex-col">
                    <div className="flex gap-2 flex-1">
                      {/* Left side: Horizontal gray bars (stations) - SMALLER */}
                      <div className="flex-1 flex flex-col justify-around py-2">
                        {[...Array(Math.min(seriesPerCircuit * 2, 6))].map((_, i) => (
                          <div key={i} className="h-2 bg-gray-300 border-2 border-gray-400 rounded-sm" />
                        ))}
                      </div>
                      
                      {/* Right side: Yellow vertical bar with RED ARROWS */}
                      <div className="relative w-10 bg-yellow-400 border-2 border-yellow-600 rounded flex flex-col justify-center items-center py-2">
                        {/* Red arrows pointing DOWN on the right outline */}
                        <div className="absolute right-0 top-6 w-4 h-4 flex items-center justify-center transform translate-x-1/2">
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600" />
                        </div>
                        <div className="absolute right-0 bottom-6 w-4 h-4 flex items-center justify-center transform translate-x-1/2">
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600" />
                        </div>
                        
                        {/* Red arrows pointing UP on the left outline */}
                        <div className="absolute left-0 top-6 w-4 h-4 flex items-center justify-center transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-600" />
                        </div>
                        <div className="absolute left-0 bottom-6 w-4 h-4 flex items-center justify-center transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-600" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Time Circuit Instructions - Inside the box in red */}
                    {seriesMode === 'time' && timeInstructions && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs text-red-600 leading-tight">
                          {timeInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={seriesMode === 'series'} 
                      onChange={() => setSeriesMode('series')} 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Set series\circuit</span>
                  </label>
                  <select
                    value={seriesPerCircuit}
                    onChange={(e) => setSeriesPerCircuit(parseInt(e.target.value, 10) || 1)}
                    className="w-16 px-2 py-1 border border-gray-400 rounded text-center focus:ring-2 focus:ring-blue-500 text-base font-bold"
                    title="Number of series (editable in both Set series and Set time per circuit)"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={seriesMode === 'time'} 
                      onChange={() => {
                        setSeriesMode('time');
                        setExecutionOrder('vertical');
                      }} 
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Set time\circuit</span>
                  </label>
                  <select 
                    value={timePerCircuit} 
                    onChange={(e) => setTimePerCircuit(parseInt(e.target.value))}
                    disabled={seriesMode !== 'time'}
                    className="w-16 px-2 py-1 border border-blue-500 rounded text-center focus:ring-2 focus:ring-blue-500 text-base font-bold bg-blue-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n}'</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="w-7 h-7 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-700 text-lg font-bold">×</button>
              </div>
            </div>
            
            {/* Right: Pause among series WITH timer icon */}
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-2xl shadow-md flex-shrink-0">
                  A
                </div>
                <div className="flex-1 relative">
                  {/* Large dashed border visualization box WITH timer icon - Screenshot 3 style */}
                  <div className="relative bg-white border-4 border-dashed border-gray-400 rounded-lg p-3 h-48 flex gap-2">
                    {/* Left side: Horizontal gray bars (stations) - THICKER */}
                    <div className="flex-1 flex flex-col justify-between py-2">
                      {[...Array(Math.min(seriesPerCircuit * 2, 8))].map((_, i) => (
                        <div key={i} className="h-3 bg-gray-300 border-2 border-gray-400 rounded-sm" />
                      ))}
                    </div>
                    
                    {/* Right side: WHITE vertical bar with RED ARROWS */}
                    <div className="relative w-10 bg-white border-2 border-gray-400 rounded flex flex-col justify-between items-center py-2">
                      {/* Display pauseSeries value at top */}
                      <div className="text-xs font-bold text-blue-700 mt-1">
                        {seriesMode === 'time'
                          ? String(pauseSeries)
                          : executionOrder === 'horizontal'
                            ? formatCircuitSeriesPauseLabel(horizontalPauseAtEndSec)
                            : `${pauseSeries}'`}
                        </div>
                      
                      {/* Timer icon at bottom */}
                      <div className="relative mb-1">
                        <Image src="/timer.png" alt="timer" width={32} height={32} className="object-contain" />
                      </div>
                      
                      {/* Red arrows pointing DOWN on the right outline */}
                      <div className="absolute right-0 top-8 w-4 h-4 flex items-center justify-center transform translate-x-1/2">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600" />
                      </div>
                      <div className="absolute right-0 bottom-12 w-4 h-4 flex items-center justify-center transform translate-x-1/2">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600" />
                      </div>
                      
                      {/* Red arrows pointing UP on the left outline */}
                      <div className="absolute left-0 top-8 w-4 h-4 flex items-center justify-center transform -translate-x-1/2">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-600" />
                      </div>
                      <div className="absolute left-0 bottom-12 w-4 h-4 flex items-center justify-center transform -translate-x-1/2">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-red-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <div className="bg-white border border-gray-300 rounded px-3 py-2">
                  <label className="text-sm font-medium text-gray-700">
                    {seriesMode === 'time' ? 'Macro' : 'Pause at the end'}
                  </label>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded px-2 py-1">
                  <select
                    value={
                      seriesMode === 'time'
                        ? pauseSeries
                        : executionOrder === 'horizontal'
                          ? horizontalPauseAtEndSec
                          : pauseSeries
                    }
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (seriesMode === 'time') {
                        setPauseSeries(Number.isFinite(v) ? v : 0);
                        return;
                      }
                      if (executionOrder === 'horizontal') {
                        setHorizontalPauseAtEndSec(snapCircuitSeriesPauseSec(v));
                        return;
                      }
                      setPauseSeries(Number.isFinite(v) ? v : 2);
                    }}
                    className={`border border-gray-400 rounded text-center focus:ring-2 focus:ring-blue-500 text-base font-semibold ${
                      seriesMode === 'series' && executionOrder === 'horizontal' ? 'min-w-[4.5rem] px-2 py-1' : 'w-16 px-2 py-1'
                    }`}
                  >
                    {seriesMode === 'time'
                      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))
                      : executionOrder === 'horizontal'
                        ? CIRCUIT_SERIES_PAUSE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))
                        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {`${n}'`}
                            </option>
                          ))}
                  </select>
                  <button type="button" className="w-7 h-7 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-700 text-lg font-bold">×</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* ROW 4: Execution Order Visualization */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Execution vertically - showing Circuit A and B */}
            <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
              {/* Circuit A with vertical flow */}
              <div className="mb-4">
                <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-xl shadow-md flex-shrink-0">
                  A
                </div>
                  <div className="flex-1" style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-cyan-400 border border-cyan-600 rounded-sm" />
                        <span className="text-xs text-gray-600 whitespace-nowrap" style={{minWidth: '90px'}}>1serie for station</span>
                      </div>
                    ))}
                  </div>
                  {/* Red circle, narrow line with arrow, green circle */}
                  <div className="flex flex-col items-center" style={{width: '28px', height: '165px', justifyContent: 'space-between', marginLeft: '32px'}}>
                    <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-red-700 shadow-sm flex-shrink-0" />
                    <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0'}}>
                      <div style={{position: 'relative', width: '20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                        {/* Vertical red line */}
                        <div style={{width: '4px', height: '100%', backgroundColor: '#DC2626'}} />
                        {/* Arrow triangle at bottom */}
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '12px solid #DC2626'
                        }} />
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-green-700 shadow-sm flex-shrink-0" />
                  </div>
                  {/* Yellow vertical box with timer and arrows */}
                  <div className="relative flex flex-col items-center justify-between bg-yellow-400 border-2 border-yellow-600 rounded-full shadow-md ml-2" style={{width: '48px', height: '165px', padding: '16px 8px'}}>
                    {/* Left side - two upward arrows */}
                    <div className="absolute left-0 top-1/4" style={{transform: 'translateX(-8px)'}}>
                      <div className="flex flex-col gap-6">
                        <span className="text-red-600 font-bold text-lg">↑</span>
                        <span className="text-red-600 font-bold text-lg">↑</span>
                      </div>
                    </div>
                    {/* Right side - two downward arrows */}
                    <div className="absolute right-0 top-1/4" style={{transform: 'translateX(8px)'}}>
                      <div className="flex flex-col gap-6">
                        <span className="text-red-600 font-bold text-lg">↓</span>
                        <span className="text-red-600 font-bold text-lg">↓</span>
                      </div>
                    </div>
                    {/* Timer icon */}
                    <div className="w-9 h-9 flex items-center justify-center" style={{marginTop: 'auto', marginBottom: 'auto'}}>
                      <Image src="/timer.png" alt="Timer" width={36} height={36} className="object-contain" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Circuit B */}
              <div className="mb-4">
                <div className="w-12 h-12 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-xl shadow-md">
                  B
                </div>
              </div>
              
              {/* Radio buttons */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={executionOrder === 'vertical'} 
                    onChange={() => {
                      if (executionOrder === 'horizontal' && seriesMode === 'series') {
                        setPauseSeries(
                          Math.max(1, Math.min(10, Math.round(horizontalPauseAtEndSec / 60)))
                        );
                      }
                      setExecutionOrder('vertical');
                    }} 
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Execution vertically <span className="text-gray-500">(1 serie for station)</span>
                  </span>
                </label>
              </div>
            </div>
            
            {/* Right: Horizontal execution - showing Circuit A and B with timer */}
            <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
              {/* Title */}
              <div className="text-center text-sm font-medium text-gray-700 mb-3">
                All the series for station
              </div>
              
              {/* Circuit A with stations */}
              <div className="mb-3">
                <div className="flex-1 space-y-3">
                  {[...Array(seriesPerCircuit)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* Circuit A box - only on first row */}
                      {i === 0 && (
                        <div className="w-12 h-12 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-xl shadow-md flex-shrink-0">
                          A
                        </div>
                      )}
                      {/* Spacer for other rows to align */}
                      {i > 0 && <div style={{width: '48px'}} />}
                      
                      {/* Station with timer and arrows */}
                      <div className="relative bg-yellow-300 border-2 border-yellow-500 rounded p-1 flex items-center gap-2 flex-1">
                        {/* Top arrows - 2 right arrows (far apart) */}
                        <span className="absolute -top-3 left-8 text-red-600 font-bold text-base">→</span>
                        <span className="absolute -top-3 right-8 text-red-600 font-bold text-base">→</span>
                        
                        {/* Cyan bar */}
                        <div className="flex-1 h-5 bg-cyan-400 border border-cyan-600 rounded" />
                        
                        {/* Timer icon */}
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <Image src="/timer.png" alt="Timer" width={32} height={32} className="object-contain" />
                        </div>
                        
                        {/* Bottom arrows - 2 left arrows (far apart) */}
                        <span className="absolute -bottom-3 left-8 text-red-600 font-bold text-base">←</span>
                        <span className="absolute -bottom-3 right-8 text-red-600 font-bold text-base">←</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Circuit B */}
              <div className="mb-4">
                <div className="w-12 h-12 rounded flex items-center justify-center font-bold bg-yellow-400 border-2 border-yellow-600 text-black text-xl shadow-md">
                  B
                </div>
              </div>
              
              {/* Radio button and Pause\stations selector */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={executionOrder === 'horizontal'} 
                    onChange={() => {
                      if (seriesMode === 'time') return;
                      setHorizontalPauseAtEndSec(snapCircuitSeriesPauseSec(pauseSeries * 60));
                      setHorizontalPauseBetweenSeriesSec(snapCircuitSeriesPauseSec(pauseStations));
                      setExecutionOrder('horizontal');
                    }} 
                    disabled={seriesMode === 'time'}
                    className="w-4 h-4 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm font-medium ${seriesMode === 'time' ? 'text-gray-400' : 'text-gray-700'}`}>
                    Execution horizontally <span className="text-gray-500">(all series for station)</span>
                  </span>
                </label>
                <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Pause\series</label>
                <select
                  value={horizontalPauseBetweenSeriesSec}
                  onChange={(e) =>
                    setHorizontalPauseBetweenSeriesSec(
                      snapCircuitSeriesPauseSec(parseInt(e.target.value, 10))
                    )
                  }
                  disabled={executionOrder !== 'horizontal' || seriesMode === 'time'}
                  className="min-w-[4.5rem] px-2 py-1 border border-gray-400 rounded text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {CIRCUIT_SERIES_PAUSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                  <button type="button" className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-gray-600 hover:bg-gray-300">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <div className="flex gap-3">
          <button type="button" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"><Settings className="w-4 h-4" />Preferences</button>
          <button 
            type="button" 
            onClick={generateCircuitTemplate} 
            disabled={!sectionId}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {existingMoveframe ? 'Edit circuit' : 'Create circuit'}
          </button>
        </div>
      </div>
    </div>
  );
}

