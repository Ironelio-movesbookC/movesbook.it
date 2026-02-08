'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import CircuitPreferencesModal from './CircuitPreferencesModal';

interface FastPlannerRow {
  id: number;
  exercise: string;
  speed: string;
  series: string;
  ripTime: string;
  weight: string;
  break: string;
  mode: string;
}

interface FastPlannerProps {
  sport: string;
  sectionId: string;
  workout: any;
  day: any;
  mode: 'add' | 'edit';
  existingMoveframe?: any;
  onSave: (moveframeData: any) => void;
  onCancel: () => void;
  fullView?: boolean;
}

export type FastPlannerHandle = {
  saveMoveframe: () => void;
  saveMoveframeAndMovelaps: () => void;
  openPreferences: () => void;
};

const parseFastPlannerDataFromNotes = (notes: unknown): any | null => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[FAST_PLANNER_DATA\]([\s\S]*?)\[\/FAST_PLANNER_DATA\]/);
  if (!match || !match[1]) return null;
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

// Muscle groups for the body diagram - all available muscles from /public/muscular/
const MUSCLE_GROUPS = [
  { id: 'shoulders', label: 'Shoulders', sector: 'Shoulders', image: '/muscular/shoulders.png' },
  { id: 'biceps', label: 'Biceps', sector: 'Anterior arms', image: '/muscular/Biceps.png' },
  { id: 'triceps', label: 'Triceps', sector: 'Rear arms', image: '/muscular/Triceps.png' },
  { id: 'forearms', label: 'Forearms', sector: 'Forearms', image: '/muscular/Forearms.png' },
  { id: 'chest', label: 'Chest', sector: 'Chest', image: '/muscular/chest.png' },
  { id: 'abs', label: 'Abdominals', sector: 'Abdominals', image: '/muscular/abs.png' },
  { id: 'trapezius', label: 'Trapezius', sector: 'Trapezius', image: '/muscular/trapezius.png' },
  { id: 'lats', label: 'Lats', sector: 'Lats', image: '/muscular/Lats.png' },
  { id: 'quadriceps', label: 'Quadriceps', sector: 'Front thighs', image: '/muscular/quadriceps.png' },
  { id: 'hams', label: 'Hamstrings', sector: 'Hind thighs', image: '/muscular/hams.png' },
  { id: 'calves', label: 'Calves', sector: 'Calves', image: '/muscular/calves.png' },
  { id: 'glutes', label: 'Glutes', sector: 'Glutes', image: '/muscular/glutes.png' }
];

const FastPlannerOfMoveframes = React.forwardRef<FastPlannerHandle, FastPlannerProps>(function FastPlannerOfMoveframes({
  sport,
  sectionId,
  workout,
  day,
  mode,
  existingMoveframe,
  onSave,
  onCancel,
  fullView
}: FastPlannerProps, ref) {
  // State for sector selection mode
  const [sectorMode, setSectorMode] = useState<'exercises' | 'series'>('exercises');

  // State for exercise search
  const [exerciseSearch, setExerciseSearch] = useState('');

  // State for showing exercise selector popup
  const [showExercisePopup, setShowExercisePopup] = useState(false);

  // State for execution toolbar values (quick selection bar)
  const [execSpeed, setExecSpeed] = useState('');
  const [execSeries, setExecSeries] = useState('');
  const [execRipTime, setExecRipTime] = useState('');
  const [execWeight, setExecWeight] = useState('');
  const [execBreak, setExecBreak] = useState('');
  const [execMode, setExecMode] = useState('');

  // State for selected cell (for keyboard-like input)
  const [selectedCell, setSelectedCell] = useState<{ rowId: number; field: string } | null>(null);

  // State for exercise rows
  const [rows, setRows] = useState<FastPlannerRow[]>([
    { id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' },
    { id: 2, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' },
    { id: 3, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' },
    { id: 4, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }
  ]);

  // Selected muscle group for filtering exercises
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const ZOOM = 0.55;
  const [showSubExercises, setShowSubExercises] = useState<boolean>(false);

  // State for which exercise toolbar button is active (speed, series, etc.)
  const [activeExerciseButton, setActiveExerciseButton] = useState<'speed' | 'series' | 'riptime' | 'weight' | 'break' | 'mode' | null>(null);

  // State for Rip\Time input mode
  const [ripTimeMode, setRipTimeMode] = useState<'reps' | 'time'>('reps');
  const [ripTimeValue, setRipTimeValue] = useState<string>('');

  // State for Weight input
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // State for Break input
  const [breakMode, setBreakMode] = useState<'rest' | 'cardio'>('rest');
  const [cardioValue, setCardioValue] = useState<string>('120');
  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [showSeriesPlanModal, setShowSeriesPlanModal] = useState<boolean>(false);
  const [planSectorId, setPlanSectorId] = useState<string | null>(null);
  const [planExerciseNumber, setPlanExerciseNumber] = useState<number>(1);
  const [planSeries, setPlanSeries] = useState<string>('3');
  const [planReps, setPlanReps] = useState<string>('12');
  const [planPause, setPlanPause] = useState<string>("1'30\"");
  const [planCandidate, setPlanCandidate] = useState<any>(null);
  const [planExerciseSearch, setPlanExerciseSearch] = useState<string>('');
  const loadedMoveframeIdRef = React.useRef<string | null>(null);
  const planListRef = React.useRef<HTMLDivElement | null>(null);

  // Speed options for body building and similar sports
  const SPEED_OPTIONS = ['Very slow', 'Slow', 'Normal', 'Quick', 'Fast', 'Very fast', 'Explosive', 'Negative'];

  // Break/Pause options
  const BREAK_OPTIONS = ['0', '0"', '5"', '10"', '15"', '20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"];

  // Mode options - Breaking modality among series
  const MODE_OPTIONS = [
    { id: 'stopped', label: 'Stopped', icon: '/icons/stopped.png' },
    { id: 'superset', label: 'Superset', icon: '/icons/superset.png' },
    { id: 'movement', label: 'Movement Customized', icon: '/icons/movement.png' }
  ];

  // Helper function to format time input (MM'SS" format)
  const formatRipTime = (value: string, finalize = false): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    // While typing → don't force zeros
    if (!finalize) return digits;

    // On blur → format
    const padded = digits.length < 4 ? digits.padStart(4, '0') : digits;
    const seconds = padded.slice(-2);
    const minutes = padded.slice(0, -2);

    return `${minutes}'${seconds}"`;
  };

  const EXERCISE_IMAGES_BY_GROUP: Record<string, string[]> = {
    shoulders: [
      '/Exercises/shoulder/shoulder exercise 01.png',
      '/Exercises/shoulder/shoulder exercise 02.png',
      '/Exercises/shoulder/shoulder exercise 03.png',
      '/Exercises/shoulder/shoulder exercise 04.png',
      '/Exercises/shoulder/shoulder exercise 05.png',
      '/Exercises/shoulder/shoulder exercise 06.png',
      '/Exercises/shoulder/shoulder exercise 07.png',
      '/Exercises/shoulder/shoulder exercise 08.png',
      '/Exercises/shoulder/shoulder exercise 09.png',
      '/Exercises/shoulder/shoulder exercise 10.png',
      '/Exercises/shoulder/shoulder exercise 11.png',
      '/Exercises/shoulder/shoulder exercise 12.png'
    ],
    biceps: [
      '/Exercises/biceps/biceps exercise 01.png',
      '/Exercises/biceps/biceps exercise 02.png',
      '/Exercises/biceps/biceps exercise 03.png',
      '/Exercises/biceps/biceps exercise 04.png',
      '/Exercises/biceps/biceps exercise 05.png',
      '/Exercises/biceps/biceps exercise 06.png',
      '/Exercises/biceps/biceps exercise 07.png',
      '/Exercises/biceps/biceps exercise 08.png',
      '/Exercises/biceps/biceps exercise 09.png',
      '/Exercises/biceps/biceps exercise 10.png',
      '/Exercises/biceps/biceps exercise 11.png',
      '/Exercises/biceps/biceps exercise 12.png'
    ],
    triceps: [
      '/Exercises/triceps/triceps exercise 01.png',
      '/Exercises/triceps/triceps exercise 02.png',
      '/Exercises/triceps/triceps exercise 03.png',
      '/Exercises/triceps/triceps exercise 04.png',
      '/Exercises/triceps/triceps exercise 05.png',
      '/Exercises/triceps/triceps exercise 06.png',
      '/Exercises/triceps/triceps exercise 07.png',
      '/Exercises/triceps/triceps exercise 08.png',
      '/Exercises/triceps/triceps exercise 09.png',
      '/Exercises/triceps/triceps exercise 10.png',
      '/Exercises/triceps/triceps exercise 11.png',
      '/Exercises/triceps/triceps exercise 12.png'
    ],
    forearms: [
      '/Exercises/forearms/forearms exercise 01.png',
      '/Exercises/forearms/forearms exercise 02.png',
      '/Exercises/forearms/forearms exercise 03.png',
      '/Exercises/forearms/forearms exercise 04.png',
      '/Exercises/forearms/forearms exercise 05.png',
      '/Exercises/forearms/forearms exercise 06.png',
      '/Exercises/forearms/forearms exercise 07.png',
      '/Exercises/forearms/forearms exercise 08.png',
      '/Exercises/forearms/forearms exercise 09.png',
      '/Exercises/forearms/forearms exercise 10.png',
      '/Exercises/forearms/forearms exercise 11.png',
      '/Exercises/forearms/forearms exercise 12.png'
    ],
    chest: [
      '/Exercises/chest/chest exercise 01.png',
      '/Exercises/chest/chest exercise 02.png',
      '/Exercises/chest/chest exercise 03.png',
      '/Exercises/chest/chest exercise 04.png',
      '/Exercises/chest/chest exercise 05.png',
      '/Exercises/chest/chest exercise 06.png',
      '/Exercises/chest/chest exercise 07.png',
      '/Exercises/chest/chest exercise 08.png',
      '/Exercises/chest/chest exercise 09.png',
      '/Exercises/chest/chest exercise 10.png',
      '/Exercises/chest/chest exercise 11.png',
      '/Exercises/chest/chest exercise 12.png'
    ],
    abs: [
      '/Exercises/abdominals/abdominals exercise 01.png',
      '/Exercises/abdominals/abdominals exercise 02.png',
      '/Exercises/abdominals/abdominals exercise 03.png',
      '/Exercises/abdominals/abdominals exercise 04.png',
      '/Exercises/abdominals/abdominals exercise 05.png',
      '/Exercises/abdominals/abdominals exercise 06.png',
      '/Exercises/abdominals/abdominals exercise 07.png',
      '/Exercises/abdominals/abdominals exercise 08.png',
      '/Exercises/abdominals/abdominals exercise 9.png',
      '/Exercises/abdominals/abdominals exercise 10.png',
      '/Exercises/abdominals/abdominals exercise 11.png',
      '/Exercises/abdominals/abdominals exercise 12.png'
    ],
    trapezius: [
      '/Exercises/trapezius/trapezius exercise 01.png',
      '/Exercises/trapezius/trapezius exercise 02.png',
      '/Exercises/trapezius/trapezius exercise 03.png',
      '/Exercises/trapezius/trapezius exercise 04.png',
      '/Exercises/trapezius/trapezius exercise 05.png',
      '/Exercises/trapezius/trapezius exercise 06.png',
      '/Exercises/trapezius/trapezius exercise 07.png',
      '/Exercises/trapezius/trapezius exercise 08.png',
      '/Exercises/trapezius/trapezius exercise 09.png',
      '/Exercises/trapezius/trapezius exercise 10.png',
      '/Exercises/trapezius/trapezius exercise 11.png',
      '/Exercises/trapezius/trapezius exercise 12.png'
    ],
    lats: [
      '/Exercises/lats/lats exercise 01.png',
      '/Exercises/lats/lats exercise 02.png',
      '/Exercises/lats/lats exercise 03.png',
      '/Exercises/lats/lats exercise 04.png',
      '/Exercises/lats/lats exercise 05.png',
      '/Exercises/lats/lats exercise 06.png',
      '/Exercises/lats/lats exercise 07.png',
      '/Exercises/lats/lats exercise 08.png',
      '/Exercises/lats/lats exercise 09.png',
      '/Exercises/lats/lats exercise 10.png',
      '/Exercises/lats/lats exercise 11.png',
      '/Exercises/lats/lats exercise 12.png'
    ],
    quadriceps: [
      '/Exercises/quadriceps/quadriceps exercise 01.png',
      '/Exercises/quadriceps/quadriceps exercise 02.png',
      '/Exercises/quadriceps/quadriceps exercise 03.png',
      '/Exercises/quadriceps/quadriceps exercise 04.png',
      '/Exercises/quadriceps/quadriceps exercise 05.png',
      '/Exercises/quadriceps/quadriceps exercise 06.png',
      '/Exercises/quadriceps/quadriceps exercise 07.png',
      '/Exercises/quadriceps/quadriceps exercise 08.png',
      '/Exercises/quadriceps/quadriceps exercise 09.png',
      '/Exercises/quadriceps/quadriceps exercise 10.png',
      '/Exercises/quadriceps/quadriceps exercise 11.png',
      '/Exercises/quadriceps/quadriceps exercise 12.png'
    ],
    hams: [
      '/Exercises/hamstrings/hamstrings exercise 01.png',
      '/Exercises/hamstrings/hamstrings exercise 02.png',
      '/Exercises/hamstrings/hamstrings exercise 03.png',
      '/Exercises/hamstrings/hamstrings exercise 04.png',
      '/Exercises/hamstrings/hamstrings exercise 05.png',
      '/Exercises/hamstrings/hamstrings exercise 06.png',
      '/Exercises/hamstrings/hamstrings exercise 07.png',
      '/Exercises/hamstrings/hamstrings exercise 08.png',
      '/Exercises/hamstrings/hamstrings exercise 09.png',
      '/Exercises/hamstrings/hamstrings exercise 10.png',
      '/Exercises/hamstrings/hamstrings exercise 11.png',
      '/Exercises/hamstrings/hamstrings exercise 12.png'
    ],
    calves: [
      '/Exercises/calves/calves exercise 01.png',
      '/Exercises/calves/calves exercise 02.png',
      '/Exercises/calves/calves exercise 03.png',
      '/Exercises/calves/calves exercise 04.png',
      '/Exercises/calves/calves exercise 05.png',
      '/Exercises/calves/calves exercise 06.png',
      '/Exercises/calves/calves exercise 07.png',
      '/Exercises/calves/calves exercise 08.png',
      '/Exercises/calves/calves exercise 09.png',
      '/Exercises/calves/calves exercise10.png',
      '/Exercises/calves/calves exercise 11.png',
      '/Exercises/calves/calves exercise 12.png'
    ],
    glutes: [
      '/Exercises/glutes/glutes exercise 01.png',
      '/Exercises/glutes/glutes exercise 02.png',
      '/Exercises/glutes/glutes exercise 03.png',
      '/Exercises/glutes/glutes exercise 04.png',
      '/Exercises/glutes/glutes exercise 05.png',
      '/Exercises/glutes/glutes exercise 06.png',
      '/Exercises/glutes/glutes exercise 07.png',
      '/Exercises/glutes/glutes exercise 08.png',
      '/Exercises/glutes/glutes exercise 09.png',
      '/Exercises/glutes/glutes exercise 10.png',
      '/Exercises/glutes/glutes exercise 11.png',
      '/Exercises/glutes/glutes exercise 12.png'
    ]
  };
  const getExerciseImage = (groupId: string, index: number): string => {
    const images = EXERCISE_IMAGES_BY_GROUP[groupId];
    if (!images || images.length === 0) return '/Exercises/abdominals/abdominals exercise 01.png';
    return images[index % images.length];
  };
  const formatExerciseIndex = (index: number) => `${index + 1}`.padStart(2, '0');
  const mockExercises = MUSCLE_GROUPS.flatMap(group =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `${group.id}-${i}`,
      name: `${group.label} Exercise ${formatExerciseIndex(i)}`,
      sector: group.sector,
      image: getExerciseImage(group.id, i)
    }))
  ).concat(
    Array.from({ length: 20 }, (_, i) => ({
      id: `general-${i}`,
      name: `General Exercise ${formatExerciseIndex(i)}`,
      sector: 'General',
      image: '/Exercises/abdominals/abdominals exercise 01.png'
    }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getSectorForExercise = (exerciseName: string): string | null => {
    const ex = mockExercises.find(e => e.name === exerciseName);
    return ex?.sector || null;
  };

  const buildMovelapsFromRows = (filledRows: FastPlannerRow[]) => {
    return filledRows.map((row, index) => {
      const sector = row.exercise ? getSectorForExercise(row.exercise) : null;
      const repsValue = ripTimeMode === 'reps' ? (parseInt(row.ripTime || '', 10) || null) : null;
      const timeValue = ripTimeMode === 'time' ? (row.ripTime || null) : null;

      return {
        repetitionNumber: index + 1,
        distance: null,
        speed: row.speed || null,
        style: null,
        pace: null,
        time: timeValue,
        reps: repsValue,
        weight: row.weight && row.weight.trim() !== '' && row.weight.trim().toLowerCase() !== 'nc' ? row.weight : null,
        tools: null,
        r1: null,
        r2: null,
        muscularSector: sector,
        exercise: row.exercise || null,
        restType: null,
        pause: row.break || null,
        macroFinal: null,
        alarm: null,
        sound: null,
        notes: row.mode || null,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false
      };
    });
  };

  const buildFastPlannerDescription = (filledRows: FastPlannerRow[]) => {
    const sectors = Array.from(
      new Set(
        filledRows
          .map(r => (r.exercise ? getSectorForExercise(r.exercise) : null))
          .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
      )
    );
    const base = `Fast planner - ${filledRows.length} exercises`;
    return sectors.length > 0 ? `${base} - ${sectors.join(' - ')}` : base;
  };

  useEffect(() => {
    if (mode !== 'edit') return;
    if (!existingMoveframe?.id) return;
    if (loadedMoveframeIdRef.current === existingMoveframe.id) return;

    loadedMoveframeIdRef.current = existingMoveframe.id;

    const parsed = parseFastPlannerDataFromNotes(existingMoveframe.notes);
    if (parsed) {
      if (parsed.sectorMode === 'exercises' || parsed.sectorMode === 'series') setSectorMode(parsed.sectorMode);
      if (typeof parsed.execSpeed === 'string') setExecSpeed(parsed.execSpeed);
      if (typeof parsed.execSeries === 'string') setExecSeries(parsed.execSeries);
      if (typeof parsed.execRipTime === 'string') setExecRipTime(parsed.execRipTime);
      if (typeof parsed.execWeight === 'string') setExecWeight(parsed.execWeight);
      if (typeof parsed.execBreak === 'string') setExecBreak(parsed.execBreak);
      if (typeof parsed.execMode === 'string') setExecMode(parsed.execMode);
      if (parsed.ripTimeMode === 'reps' || parsed.ripTimeMode === 'time') setRipTimeMode(parsed.ripTimeMode);
      if (Array.isArray(parsed.rows) && parsed.rows.length > 0) setRows(parsed.rows);
      if (parsed.preferences != null) setPreferences(parsed.preferences);
      setSelectedCell(null);
      setShowSubExercises(false);
      setShowExercisePopup(false);
      return;
    }

    if (Array.isArray(existingMoveframe.movelaps) && existingMoveframe.movelaps.length > 0) {
      const byExercise = new Map<string, any[]>();
      for (const ml of existingMoveframe.movelaps) {
        const key = typeof ml.exercise === 'string' && ml.exercise.trim() !== '' ? ml.exercise : 'Exercise';
        if (!byExercise.has(key)) byExercise.set(key, []);
        byExercise.get(key)!.push(ml);
      }

      const rebuilt: FastPlannerRow[] = Array.from(byExercise.entries()).map(([exercise, laps], idx) => {
        const first = laps[0] || {};
        return {
          id: idx + 1,
          exercise,
          speed: typeof first.speed === 'string' ? first.speed : '',
          series: String(laps.length),
          ripTime: first.reps != null ? String(first.reps) : '',
          weight: typeof first.weight === 'string' ? first.weight : '',
          break: typeof first.pause === 'string' ? first.pause : '',
          mode: typeof first.notes === 'string' ? first.notes : ''
        };
      });

      setRows(rebuilt.length > 0 ? rebuilt : [{ id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }]);
      setSelectedCell(null);
      setShowSubExercises(false);
      setShowExercisePopup(false);
    }
  }, [mode, existingMoveframe?.id]);

  // Mock frequently used exercises (for blue indicator)
  const frequentlyUsedExercises = ['shoulders-0', 'chest-0', 'biceps-1', 'quadriceps-0'];

  // Function to get indicator color for an exercise
  const getExerciseIndicatorColor = (exerciseName: string): 'green' | 'blue' | null => {
    // Check if exercise is already selected in current workout (green has priority)
    const isSelected = rows.some(row => row.exercise === exerciseName);
    if (isSelected) return 'green';

    // Check if exercise is frequently used
    const exercise = mockExercises.find(ex => ex.name === exerciseName);
    if (exercise && frequentlyUsedExercises.includes(exercise.id)) return 'blue';

    return null;
  };

  const getTargetRowId = () => {
    if (selectedCell?.rowId != null) return selectedCell.rowId;
    return rows.length > 0 ? rows[rows.length - 1].id : null;
  };

  const applyValueToRow = (field: string, value: string) => {
    const targetRowId = getTargetRowId();
    if (targetRowId == null) return;
    setRows(prevRows => prevRows.map(row => {
      if (row.id === targetRowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Handle quick value selection from execution toolbar (keyboard-like input)
  const handleQuickFill = (field: string, value: string) => {
    applyValueToRow(field, value);
  };

  // Handle cell click (select cell for quick input)
  const handleCellClick = (rowId: number, field: string) => {
    setSelectedCell({ rowId, field });
    const row = rows.find(r => r.id === rowId);
    const sectorSelected = !!selectedMuscleGroup;
    const exerciseSelected = !!row?.exercise;

    if (field === 'exercise') {
      setActiveExerciseButton(null);
      setShowSubExercises(true);
      setShowExercisePopup(false);
    } else if (field === 'speed') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('speed');
    } else if (field === 'series') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('series');
    } else if (field === 'ripTime') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('riptime');
    } else if (field === 'weight') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('weight');
    } else if (field === 'break') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('break');
    } else if (field === 'mode') {
      if (!sectorSelected || !exerciseSelected) {
        setActiveExerciseButton(null);
        setShowSubExercises(true);
        return;
      }
      setActiveExerciseButton('mode');
    }
  };

  // Add new row
  const handleGoNext = () => {
    appendNextRowFromIndex(pickActiveRowIndex(rows));
  };

  // Rescan: choose another exercise of the same sector/type
  const handleRescanExercise = (rowId: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    let sector: string | null = null;
    if (row.exercise) {
      const current = mockExercises.find(ex => ex.name === row.exercise);
      sector = current?.sector || null;
    } else if (selectedMuscleGroup) {
      const group = MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup);
      sector = group?.sector || null;
    }

    let candidates = mockExercises;
    if (sector) {
      candidates = mockExercises.filter(ex => ex.sector === sector);
    }

    // Exclude current exercise from candidates
    if (row.exercise) {
      candidates = candidates.filter(ex => ex.name !== row.exercise);
    }

    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    setRows(prevRows =>
      prevRows.map(r => (r.id === rowId ? { ...r, exercise: pick.name } : r))
    );
  };

  const applyRowDefaults = (current: FastPlannerRow, previous: FastPlannerRow | null): FastPlannerRow => {
    const next = { ...current };

    if (!next.series || next.series.trim() === '') {
      next.series = previous?.series || '3';
    }
    if (!next.ripTime || next.ripTime.trim() === '') {
      next.ripTime = previous?.ripTime || '15';
    }
    if (!next.break || next.break.trim() === '') {
      next.break = previous?.break || "1'30\"";
    }

    if (!next.speed || next.speed.trim() === '') {
      next.speed = previous?.speed || 'Normal';
    }
    if (!next.weight || next.weight.trim() === '') {
      next.weight = previous?.weight || '0 kg';
    }
    if (!next.mode || next.mode.trim() === '') {
      next.mode = previous?.mode || 'Stopped';
    }

    return next;
  };

  const findPreviousFilledRow = (list: FastPlannerRow[], rowId: number): FastPlannerRow | null => {
    const idx = list.findIndex((r) => r.id === rowId);
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      const r = list[i];
      if (typeof r?.exercise === 'string' && r.exercise.trim() !== '') return r;
    }
    return null;
  };

  const pickActiveRowIndex = (list: FastPlannerRow[]): number => {
    const selectedRowId = selectedCell?.rowId;
    if (selectedRowId != null) {
      const idx = list.findIndex(r => r.id === selectedRowId);
      if (idx >= 0) return idx;
    }
    return Math.max(0, list.length - 1);
  };

  const appendRowCopiesById = (rowId: number, copies: number) => {
    setRows(prev => {
      if (prev.length === 0) return prev;
      const baseRow = prev.find(r => r.id === rowId);
      if (!baseRow) return prev;
      if (typeof baseRow.exercise !== 'string' || baseRow.exercise.trim() === '') return prev;
      const maxId = Math.max(...prev.map(r => r.id));
      const nextRows = Array.from({ length: copies }, (_, index) => ({
        ...baseRow,
        id: maxId + index + 1
      }));
      return [...prev, ...nextRows];
    });
  };

  const focusNewRowExercise = (newRowId: number) => {
    setSelectedCell({ rowId: newRowId, field: 'exercise' });
    setActiveExerciseButton(null);
    setSelectedMuscleGroup('all');
    setShowSubExercises(true);
  };

  const appendNextRowFromIndex = (rowIndex: number) => {
    if (rows.length === 0) {
      setRows([{ id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }]);
      focusNewRowExercise(1);
      return;
    }

    const safeIndex = Math.min(Math.max(rowIndex, 0), rows.length - 1);
    const nextRowId = rows[safeIndex + 1]?.id;
    const newRowId = Math.max(0, ...rows.map(r => r.id)) + 1;
    const focusRowId = nextRowId ?? newRowId;

    setRows(prev => {
      if (prev.length === 0) {
        return [{ id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }];
      }

      const copy = [...prev];
      const safeIndexInner = Math.min(Math.max(rowIndex, 0), copy.length - 1);
      const currentDraft = { ...copy[safeIndexInner] };
      const currentHasExercise = typeof currentDraft.exercise === 'string' && currentDraft.exercise.trim() !== '';
      const previousFilled = findPreviousFilledRow(copy, currentDraft.id);
      const current = currentHasExercise ? applyRowDefaults(currentDraft, previousFilled) : currentDraft;
      if (currentHasExercise) copy[safeIndexInner] = current;

      const template = currentHasExercise ? current : applyRowDefaults({ ...currentDraft }, previousFilled);
      const nextIndex = safeIndexInner + 1;
      if (nextIndex < copy.length) {
        const existingNext = copy[nextIndex];
        const filledNext = applyRowDefaults({ ...existingNext }, template);
        copy[nextIndex] = filledNext;
        return copy;
      }

      const maxId = Math.max(...copy.map(r => r.id));
      const id = Math.max(newRowId, maxId + 1);
      const nextRow: FastPlannerRow = {
        id,
        exercise: '',
        speed: template.speed,
        series: template.series,
        ripTime: template.ripTime,
        weight: template.weight,
        break: template.break,
        mode: template.mode
      };

      return [...copy, nextRow];
    });

    focusNewRowExercise(focusRowId);
  };

  // Duplicate selected row
  const handleDuplicate = () => {
    if (rows.length === 0) return;
    const baseIndex = pickActiveRowIndex(rows);
    const baseRowId = rows[baseIndex]?.id;
    if (baseRowId == null) return;
    appendRowCopiesById(baseRowId, 1);
  };

  // Triplicate selected row (2 copies)
  const handleTriplicate = () => {
    if (rows.length === 0) return;
    const baseIndex = pickActiveRowIndex(rows);
    const baseRowId = rows[baseIndex]?.id;
    if (baseRowId == null) return;
    appendRowCopiesById(baseRowId, 2);
  };

  // Remove last row
  const handleRemove = () => {
    if (rows.length > 1) {
      setRows(rows.slice(0, -1));
    }
  };

  // Reset current row
  const handleResetRow = () => {
    if (!selectedCell) return;
    setRows(prevRows => prevRows.map(row => {
      if (row.id === selectedCell.rowId) {
        return { ...row, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' };
      }
      return row;
    }));
  };

  // Reset all rows
  const handleResetAll = () => {
    const ok = typeof window !== 'undefined' ? window.confirm('This will reset all rows. Continue?') : true;
    if (!ok) return;
    setRows([
      { id: 1, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }
    ]);
    setSelectedCell(null);
  };

  // Save moveframe
  const handleSaveMoveframe = () => {
    const filledRows = rows
      .map(r => ({ ...r, exercise: (r.exercise || '').trim() }))
      .filter(r => r.exercise !== '');
    const payload = {
      sectorMode,
      execSpeed,
      execSeries,
      execRipTime,
      execWeight,
      execBreak,
      execMode,
      ripTimeMode,
      rows: filledRows,
      preferences
    };
    const notes = upsertFastPlannerDataInNotes(existingMoveframe?.notes, payload);
    const movelaps = buildMovelapsFromRows(filledRows);
    const description = buildFastPlannerDescription(filledRows);

    const moveframeData = {
      sport,
      sectionId,
      description,
      type: 'BATTERY',
      uploadToWorkout: false,
      notes,
      fastPlannerData: payload,
      movelaps,
      isFastPlannerBased: true
    };

    onSave(moveframeData);
  };
  const handleSaveMoveframeAndMovelaps = () => {
    const filledRows = rows
      .map(r => ({ ...r, exercise: (r.exercise || '').trim() }))
      .filter(r => r.exercise !== '');
    const payload = {
      sectorMode,
      execSpeed,
      execSeries,
      execRipTime,
      execWeight,
      execBreak,
      execMode,
      ripTimeMode,
      rows: filledRows,
      preferences
    };
    const notes = upsertFastPlannerDataInNotes(existingMoveframe?.notes, payload);
    const movelaps = buildMovelapsFromRows(filledRows);
    const description = buildFastPlannerDescription(filledRows);

    const moveframeData = {
      sport,
      sectionId,
      description,
      type: 'BATTERY',
      uploadToWorkout: true,
      notes,
      fastPlannerData: payload,
      movelaps,
      isFastPlannerBased: true
    };
    onSave(moveframeData);
  };

  React.useImperativeHandle(ref, () => ({
    saveMoveframe: handleSaveMoveframe,
    saveMoveframeAndMovelaps: handleSaveMoveframeAndMovelaps,
    openPreferences: () => setShowPreferencesModal(true)
  }));
  const openSeriesPlan = (sectorId: string) => {
    setPlanSectorId(sectorId);
    setPlanExerciseNumber(1);
    setPlanSeries('3');
    setPlanReps('12');
    setPlanPause("1'30\"");
    setPlanCandidate(null);
    setPlanExerciseSearch('');
    setShowSeriesPlanModal(true);
  };
  const planCandidates = React.useMemo(() => {
    if (!planSectorId) return [];
    return mockExercises.filter(ex => {
      if (!ex.id.startsWith(planSectorId)) return false;
      if (planExerciseSearch && !ex.name.toLowerCase().includes(planExerciseSearch.toLowerCase())) return false;
      return true;
    });
  }, [mockExercises, planExerciseSearch, planSectorId]);
  const pickPlanCandidateByOffset = (offset: number) => {
    if (planCandidates.length === 0) return;
    const currentIndex = planCandidate ? planCandidates.findIndex(c => c.id === planCandidate.id) : -1;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + planCandidates.length) % planCandidates.length;
    setPlanCandidate(planCandidates[nextIndex]);
  };
  const proceedScanExercise = () => {
    if (planCandidates.length === 0) return;
    if (planCandidates.length === 1) {
      setPlanCandidate(planCandidates[0]);
      return;
    }
    const currentId = planCandidate?.id;
    let pick = planCandidates[Math.floor(Math.random() * planCandidates.length)];
    if (currentId && planCandidates.length > 1) {
      while (pick.id === currentId) {
        pick = planCandidates[Math.floor(Math.random() * planCandidates.length)];
      }
    }
    setPlanCandidate(pick);
  };
  const addPlannedExercise = () => {
    if (!planCandidate) return;
    let targetIndex = rows.findIndex(r => !r.exercise || r.exercise.trim() === '');
    let newRows = [...rows];
    if (targetIndex === -1) {
      const newId = Math.max(...newRows.map(r => r.id)) + 1;
      newRows = [...newRows, { id: newId, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }];
      targetIndex = newRows.length - 1;
    }
    const targetId = newRows[targetIndex].id;
    newRows = newRows.map(r => r.id === targetId ? {
      ...r,
      exercise: planCandidate.name,
      series: planSeries,
      ripTime: planReps,
      break: planPause,
      speed: r.speed || 'Normal',
      weight: r.weight || 'nc',
      mode: r.mode || 'Stopped'
    } : r);
    setRows(newRows);
    setPlanExerciseNumber(n => n + 1);
    setPlanCandidate(null);
  };
  const endSeriesPlan = () => {
    setShowSeriesPlanModal(false);
  };
  React.useEffect(() => {
    if (!showSeriesPlanModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        pickPlanCandidateByOffset(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        pickPlanCandidateByOffset(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pickPlanCandidateByOffset, showSeriesPlanModal]);
  React.useEffect(() => {
    if (!planCandidate || !planListRef.current) return;
    const card = planListRef.current.querySelector(`[data-exercise-id="${planCandidate.id}"]`) as HTMLElement | null;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [planCandidate]);

  // Drag & reorder rows
  const [draggingRowId, setDraggingRowId] = useState<number | null>(null);
  const handleRowDragStart = (rowId: number, e: React.DragEvent) => {
    setDraggingRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleRowDrop = (targetIndex: number) => {
    if (draggingRowId == null) return;
    const fromIndex = rows.findIndex(r => r.id === draggingRowId);
    if (fromIndex < 0 || fromIndex === targetIndex) {
      setDraggingRowId(null);
      return;
    }
    const updated = [...rows];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setRows(updated);
    setDraggingRowId(null);
  };

  // Delete a specific row
  const handleDeleteRow = (rowId: number) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== rowId) : prev);
  };

  // Complete current row with defaults and move to next exercise
  const handleCompleteAndNext = (rowIndex: number) => {
    appendNextRowFromIndex(rowIndex);
  };

  const showAllButton = selectedMuscleGroup !== 'all';

  return (
    <div className="space-y-4">
      {!fullView && (
      <div className="sticky top-0 z-20 bg-white pb-4">
        <div className="space-y-4">
          {/* Removed zoom control; fixed scale at 55% */}
          {/* Top Row: Execution, Intensity of work, Break between series */}
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
            {/* Execution Box */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-center">
              {selectedCell ? (
                <div className="text-xs text-blue-600 font-medium whitespace-nowrap">
                  <span className="text-gray-700 font-bold">Execution:</span> ✓ Row {rows.findIndex(r => r.id === selectedCell.rowId) + 1}, {selectedCell.field}
                </div>
              ) : (
                <div className="text-xs text-gray-700 font-bold">Execution</div>
              )}
            </div>

            {/* Intensity of Work Box */}
            <div className="bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 text-center">
              <div className="text-xs font-bold text-gray-700 whitespace-nowrap">Intensity of work</div>
            </div>

            {/* Break between series Box */}
            <div className="bg-green-50 border border-green-300 rounded-lg px-2 py-1 text-center">
              <div className="text-xs font-bold text-gray-700 whitespace-nowrap">Break between series</div>
            </div>
          </div>

          {/* Controls Row: Sector + Search + grouped buttons by column width; radios below */}
          <div className="space-y-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
          {/* Left column: Sector + Search */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveExerciseButton(null);
                setShowSubExercises(false);
                setSelectedMuscleGroup('all');
              }}
              className={`px-3 py-2 text-sm font-bold border rounded whitespace-nowrap ${
                activeExerciseButton === null
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Sector
            </button>
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Name exercise"
              className="w-64 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Middle column: 4 buttons fill Intensity width */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'speed' ? null : 'speed')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${
                activeExerciseButton === 'speed'
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Speed
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'series' ? null : 'series')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${
                activeExerciseButton === 'series'
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Series
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'riptime' ? null : 'riptime')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${
                activeExerciseButton === 'riptime'
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Rip\Time
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'weight' ? null : 'weight')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${
                activeExerciseButton === 'weight'
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Weight
            </button>
          </div>

          {/* Right column: 2 buttons fill Break width */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'break' ? null : 'break')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${
                activeExerciseButton === 'break'
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Break
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'mode' ? null : 'mode')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${
                activeExerciseButton === 'mode'
                  ? 'bg-yellow-50 text-black border-yellow-400'
                  : 'bg-white text-black border-gray-300 hover:bg-yellow-50'
              }`}
            >
              Mode
            </button>
          </div>
        </div>
        <div className="flex gap-2 px-1 py-1">
          <label className="flex items-center cursor-pointer whitespace-nowrap">
            <input
              type="radio"
              name="sectorMode"
              value="exercises"
              checked={sectorMode === 'exercises'}
              onChange={() => setSectorMode('exercises')}
              className="mr-1.5"
            />
            <span className="text-xs text-gray-700">Select exercises</span>
          </label>
          <label className="flex items-center cursor-pointer whitespace-nowrap">
            <input
              type="radio"
              name="sectorMode"
              value="series"
              checked={sectorMode === 'series'}
              onChange={() => {
                setSectorMode('series');
                setActiveExerciseButton(null);
                setShowSubExercises(false);
                setSelectedMuscleGroup('all');
              }}
              className="mr-1.5"
            />
            <span className="text-xs text-gray-700">Plan series\exercise</span>
          </label>
        </div>
          </div>
        </div>

        {/* Muscle Groups - Always visible */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2">
          <div className="flex items-center pb-2 gap-2" style={{ overflowX: 'hidden', flexWrap: 'nowrap' }}>
            {showAllButton && (
              <div className="flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedMuscleGroup('all');
                    setShowSubExercises(true);
                  }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="mb-2 flex items-center justify-center" style={{ width: `${96 * ZOOM}px`, height: `${96 * ZOOM}px` }}>
                    <Image
                      src="/all.png"
                      alt="All"
                      width={Math.round(96 * ZOOM)}
                      height={Math.round(96 * ZOOM)}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <span className="sr-only">All</span>
                </button>
              </div>
            )}

            {/* Content area: show options or muscle groups within the same box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex-1 h-[165px] overflow-y-hidden text-black">
              {activeExerciseButton ? (
                <div className="space-y-3">
                {activeExerciseButton === 'speed' && (
                  <div>
                    <p className="text-sm font-bold text-black mb-3">Select Speed of Execution</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleQuickFill('speed', speed)}
                          className="flex-shrink-0 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-base whitespace-nowrap"
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'series' && (
                  <div>
                    <p className="text-sm font-bold text-black mb-3">Select Number of Series</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleQuickFill('series', num.toString())}
                          className="flex-shrink-0 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-base"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'riptime' && (
                  <div className="min-h-[120px] flex items-center justify-center">
                    <div className="flex gap-1 justify-center items-center">
                      <div className="w-44 flex flex-col gap-2 items-start pl-2">
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="ripTimeMode"
                            value="reps"
                            checked={ripTimeMode === 'reps'}
                            onChange={() => {
                              setRipTimeMode('reps');
                              setRipTimeValue('');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Repetitions</span>
                        </label>
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="ripTimeMode"
                            value="time"
                            checked={ripTimeMode === 'time'}
                            onChange={() => {
                              setRipTimeMode('time');
                              setRipTimeValue('');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Time</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-center">
                        {ripTimeMode === 'reps' && (
                          <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const currentValue = parseInt(ripTimeValue) || 0;
                              if (currentValue > 1) {
                                const newValue = (currentValue - 1).toString();
                                setRipTimeValue(newValue);
                                applyValueToRow('ripTime', newValue);
                              }
                            }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            value={ripTimeValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              setRipTimeValue(value);
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                            applyValueToRow('ripTime', value);
                            }}
                            placeholder="0"
                            min="1"
                            max="99"
                            className="w-32 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          <button
                            onClick={() => {
                              const currentValue = parseInt(ripTimeValue) || 0;
                              if (currentValue < 99) {
                                const newValue = (currentValue + 1).toString();
                                setRipTimeValue(newValue);
                                applyValueToRow('ripTime', newValue);
                              }
                            }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                          >
                            +
                          </button>
                          </div>
                        )}

                        {ripTimeMode === 'time' && (
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              value={ripTimeValue}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setRipTimeValue(raw);
                              }}
                              onBlur={() => {
                                if (ripTimeValue && ripTimeValue.length > 0) {
                                  const formatted = formatRipTime(ripTimeValue, true);
                                  setRipTimeValue(formatted);
                                } else {
                                  setRipTimeValue('');
                                }

                                applyValueToRow('ripTime', ripTimeValue ? formatRipTime(ripTimeValue, true) : '');
                              }}
                              placeholder="MM'SS&quot;"
                              className="w-48 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'weight' && (
                  <div className="min-h-[120px] flex items-center justify-center">
                    <div className="flex gap-10 justify-center items-center">
                      <div className="w-44 flex flex-col gap-2 items-start pl-2">
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="weightUnit"
                            value="kg"
                            checked={weightUnit === 'kg'}
                            onChange={() => setWeightUnit('kg')}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Kg</span>
                        </label>
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="weightUnit"
                            value="lbs"
                            checked={weightUnit === 'lbs'}
                            onChange={() => setWeightUnit('lbs')}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Lbs</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          const currentValue = parseFloat(weightValue) || 0;
                          if (currentValue > 0) {
                            const newValue = Math.max(0, currentValue - 0.5).toString();
                            setWeightValue(newValue);
                            applyValueToRow('weight', `${newValue} ${weightUnit}`);
                          }
                        }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                      >
                        −
                      </button>

                      <input
                        type="number"
                        value={weightValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWeightValue(value);
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          applyValueToRow('weight', `${value} ${weightUnit}`);
                        }}
                        placeholder="0"
                        min="0"
                        max="9999"
                        step="0.5"
                        className="w-40 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        onClick={() => {
                          const currentValue = parseFloat(weightValue) || 0;
                          if (currentValue < 9999) {
                            const newValue = Math.min(9999, currentValue + 0.5).toString();
                            setWeightValue(newValue);
                            applyValueToRow('weight', `${newValue} ${weightUnit}`);
                          }
                        }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {activeExerciseButton === 'break' && (
                  <div className="min-h-[120px] flex items-center justify-center">
                    <div className="flex gap-10 justify-center items-center">
                      <div className="w-44 flex flex-col gap-2 items-start pl-2">
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="breakMode"
                            value="rest"
                            checked={breakMode === 'rest'}
                            onChange={() => {
                              setBreakMode('rest');
                              setActiveExerciseButton('break');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Rest time</span>
                        </label>
                        <label className="flex items-center cursor-pointer whitespace-nowrap">
                          <input
                            type="radio"
                            name="breakMode"
                            value="cardio"
                            checked={breakMode === 'cardio'}
                            onChange={() => {
                              setBreakMode('cardio');
                              setCardioValue('120');
                              setActiveExerciseButton('break');
                            }}
                            className="w-6 h-6 mr-2"
                          />
                          <span className="text-sm text-black">Cardio</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-center">
                      {breakMode === 'rest' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-3 justify-center">
                            {BREAK_OPTIONS.slice(0, Math.ceil(BREAK_OPTIONS.length / 2)).map((breakTime) => (
                              <button
                                key={breakTime}
                                onClick={() => applyValueToRow('break', breakTime)}
                                className="flex-shrink-0 px-5 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-sm whitespace-nowrap"
                              >
                                {breakTime}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-3 justify-center">
                            {BREAK_OPTIONS.slice(Math.ceil(BREAK_OPTIONS.length / 2)).map((breakTime) => (
                              <button
                                key={breakTime}
                                onClick={() => applyValueToRow('break', breakTime)}
                                className="flex-shrink-0 px-5 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-sm whitespace-nowrap"
                              >
                                {breakTime}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {breakMode === 'cardio' && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const currentValue = parseInt(cardioValue) || 120;
                                if (currentValue > 60) {
                                  const newValue = Math.max(60, currentValue - 1).toString();
                                  setCardioValue(newValue);
                                  applyValueToRow('break', `${newValue} bpm`);
                                }
                              }}
                              className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              value={cardioValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCardioValue(value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                const numValue = parseInt(value);
                                if (numValue >= 60 && numValue <= 200) {
                                  setCardioValue(value);
                                  applyValueToRow('break', `${value} bpm`);
                                } else {
                                  setCardioValue('120');
                                }
                              }}
                              placeholder="120"
                              min="60"
                              max="200"
                              className="w-28 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <button
                              onClick={() => {
                                const currentValue = parseInt(cardioValue) || 120;
                                if (currentValue < 200) {
                                  const newValue = Math.min(200, currentValue + 1).toString();
                                  setCardioValue(newValue);
                                  applyValueToRow('break', `${newValue} bpm`);
                                }
                              }}
                              className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-lg text-gray-300 font-medium">bpm (60-200)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {activeExerciseButton === 'mode' && (
                  <div>
                    <p className="text-sm font-bold text-black mb-3 text-center">Select Breaking Modality</p>
                    <div className="flex flex-row gap-3 items-center justify-center flex-wrap">
                      {MODE_OPTIONS.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => applyValueToRow('mode', mode.label)}
                          className="w-56 px-5 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-bold text-base"
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!showSubExercises ? (
                  <div className="flex" style={{ gap: `${Math.max(4, 14 * ZOOM)}px` }}>
                    {MUSCLE_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedMuscleGroup(group.id);
                          if (sectorMode === 'series') {
                            setShowSubExercises(false);
                            openSeriesPlan(group.id);
                          } else {
                            setShowSubExercises(true);
                          }
                        }}
                        className={`flex flex-col items-center justify-center px-4 py-4 rounded-lg transition-all flex-shrink-0 border-2 ${selectedMuscleGroup === group.id
                          ? 'bg-white text-black border-blue-600 ring-2 ring-blue-200'
                          : 'bg-white text-black border-gray-300 hover:border-blue-500 hover:shadow-md'
                          }`}
                      >
                        <div className="mb-2 flex items-center justify-center relative" style={{ width: `${112 * ZOOM}px`, height: `${112 * ZOOM}px` }}>
                          <Image
                            src={group.image}
                            alt={group.label}
                            width={Math.round(112 * ZOOM)}
                            height={Math.round(112 * ZOOM)}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <span className="font-medium text-black" style={{ fontSize: `${Math.max(10, 16 * ZOOM)}px` }}>{group.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 pb-2">
                      {mockExercises
                        .filter(exercise => {
                          if (selectedMuscleGroup !== 'all' && !exercise.id.startsWith(selectedMuscleGroup)) return false;
                          if (exerciseSearch && !exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())) return false;
                          return true;
                        })
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((exercise) => {
                          const indicatorColor = getExerciseIndicatorColor(exercise.name);
                          return (
                            <div
                              key={exercise.id}
                              className="flex-shrink-0 w-28 bg-white border-2 border-gray-300 rounded-lg p-1 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all relative"
                              onClick={() => {
                                if (selectedCell) {
                                  setRows(prevRows =>
                                    prevRows.map(row => (row.id === selectedCell.rowId ? { ...row, exercise: exercise.name } : row))
                                  );
                                  setExerciseSearch('');
                                }
                              }}
                            >
                              {indicatorColor && (
                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full border-2 border-white ${indicatorColor === 'green' ? 'bg-green-500' : 'bg-blue-500'
                                  }`} />
                              )}
                              <div className="aspect-square bg-gray-100 rounded mb-1 relative overflow-hidden">
                                <Image
                                  src={exercise.image}
                                  alt={exercise.name}
                                  fill
                                  className="object-contain"
                                  sizes="112px"
                                  unoptimized
                                />
                              </div>
                              <p className="text-[10px] text-center text-black font-medium" title={exercise.name}>
                                {exercise.name}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* Exercise Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden relative z-0">
        <div className={fullView ? 'overflow-x-auto overflow-y-visible' : 'overflow-x-auto overflow-y-auto max-h-[45vh]'}>
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="h-12 flex items-center gap-2 px-2 overflow-x-auto whitespace-nowrap">
              <button
                onClick={handleGoNext}
                className="px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded hover:bg-gray-900"
              >
                Go next
              </button>
              <button
                onClick={handleDuplicate}
                className="px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded hover:bg-gray-900"
              >
                Duplicate
              </button>
              <button
                onClick={handleTriplicate}
                className="px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded hover:bg-gray-900"
              >
                Triplicate
              </button>
              <button
                onClick={handleRemove}
                className="px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded hover:bg-gray-900"
              >
                Remove
              </button>
              <button
                onClick={handleResetRow}
                className="px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded hover:bg-gray-900"
              >
                Reset row
              </button>
              <button
                onClick={handleResetAll}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700"
              >
                Reset all
              </button>
              <button
                onClick={handleSaveMoveframe}
                className="ml-auto px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
              >
                Save moveframe
              </button>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-12 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r w-12">#</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r" style={{ minWidth: '250px' }}>Exercise</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r">Speed</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r">Series</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r">Rip\Time</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r">Weight</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r">Break</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 border-r" style={{ width: '140px' }}>Mode</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 w-14">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-t hover:bg-gray-50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleRowDrop(index)}
                >
                  <td className="px-1 py-1 text-sm text-gray-600 border-r w-12">
                    <div className="flex items-center gap-1">
                      <button
                        draggable
                        onDragStart={(e) => handleRowDragStart(row.id, e)}
                        className="p-1 rounded hover:bg-gray-100"
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                      >
                        <div className="flex flex-col items-center gap-[2px]">
                          <span className="w-4 h-[2px] bg-gray-600 rounded"></span>
                          <span className="w-4 h-[2px] bg-gray-600 rounded"></span>
                          <span className="w-4 h-[2px] bg-gray-600 rounded"></span>
                        </div>
                      </button>
                      <span>{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-1 py-1 border-r">
                    <div
                      onClick={() => handleCellClick(row.id, 'exercise')}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        appendRowCopiesById(row.id, 1);
                      }}
                      className={`relative cursor-pointer border-2 rounded overflow-hidden ${selectedCell?.rowId === row.id && selectedCell?.field === 'exercise'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200'
                        }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRescanExercise(row.id);
                        }}
                        className="absolute top-1 right-1 p-1 bg-white/90 border border-gray-300 rounded hover:border-blue-500 hover:shadow-sm"
                        aria-label="Rescan exercise"
                        title="Rescan exercise"
                      >
                        <Image src="/rescan.png" alt="Rescan" width={16} height={16} className="object-contain" unoptimized />
                      </button>
                      {row.exercise ? (
                        <div className="flex items-center gap-3 p-2">
                          <div className="rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ width: `${92 * ZOOM}px`, height: `${92 * ZOOM}px` }}>
                            {(() => {
                              const exercise = mockExercises.find(ex => ex.name === row.exercise);
                              return exercise?.image ? (
                                <Image
                                  src={exercise.image}
                                  alt={row.exercise}
                                  width={Math.round(92 * ZOOM)}
                                  height={Math.round(92 * ZOOM)}
                                  className="object-contain"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-sm text-gray-400">Ex</span>
                              );
                            })()}
                          </div>
                          <span className="text-gray-700 flex-1" style={{ fontSize: `${Math.max(10, 14 * ZOOM)}px` }}>{row.exercise}</span>
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-gray-50 flex items-center justify-center">
                          <span className="text-xs text-gray-400">Click to select</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1 border-r">
                    <input
                      type="text"
                      value={row.speed}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, speed: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'speed')}
                      className={`w-full px-2 py-1 text-sm border rounded ${selectedCell?.rowId === row.id && selectedCell?.field === 'speed'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r bg-green-50">
                    <input
                      type="text"
                      value={row.series}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, series: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'series')}
                      className={`w-full px-2 py-1 text-sm border rounded bg-green-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'series'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-green-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r bg-green-50">
                    <input
                      type="text"
                      value={row.ripTime}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, ripTime: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'ripTime')}
                      className={`w-full px-2 py-1 text-sm border rounded bg-green-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'ripTime'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-green-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r">
                    <input
                      type="text"
                      value={row.weight}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, weight: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'weight')}
                      className={`w-full px-2 py-1 text-sm border rounded ${selectedCell?.rowId === row.id && selectedCell?.field === 'weight'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 border-r bg-yellow-50">
                    <input
                      type="text"
                      value={row.break}
                      onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, break: e.target.value } : r))}
                      onClick={() => handleCellClick(row.id, 'break')}
                      className={`w-full px-2 py-1 text-sm border rounded bg-yellow-50 ${selectedCell?.rowId === row.id && selectedCell?.field === 'break'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-yellow-200'
                        }`}
                    />
                  </td>
                  <td className="px-1 py-1 bg-yellow-50">
                    <div
                      onClick={() => handleCellClick(row.id, 'mode')}
                      className={`cursor-pointer border-2 rounded p-2 bg-yellow-50 min-h-[40px] flex items-center justify-center ${selectedCell?.rowId === row.id && selectedCell?.field === 'mode'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-yellow-200'
                        }`}
                      style={{ width: '140px' }}
                    >
                      {row.mode ? (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const modeOption = MODE_OPTIONS.find(m => m.label === row.mode);
                            return modeOption ? (
                              <>
                                <Image
                                  src={modeOption.icon}
                                  alt={row.mode}
                                  width={24}
                                  height={24}
                                  className="object-contain"
                                  unoptimized
                                />
                                <span className="text-xs">{row.mode}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-700">{row.mode}</span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Click to select</span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1 text-center w-14">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="w-8 h-8 bg-white border-2 border-gray-300 rounded hover:border-red-500"
                        title="Delete row"
                        aria-label="Delete row"
                      >
                        <Image src="/delete.png" alt="Delete" width={24} height={24} className="object-contain" unoptimized />
                      </button>
                      <button
                        onClick={() => handleCompleteAndNext(index)}
                        className="w-8 h-8 border-2 border-gray-300 rounded hover:border-orange-500"
                        title="Complete and go to next"
                        aria-label="Complete and go to next"
                      >
                        <Image src="/down.png" alt="Next" width={24} height={24} className="object-contain" unoptimized />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll to view all repetitions note */}
        {!fullView && (
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              ℹ️ Scroll to view all repetitions. Each can have unique speed, time, and pause values.
            </p>
          </div>
        )}
      </div>

      {!fullView && (
      <div className="bg-green-50 border border-green-300 rounded-lg p-3">
        <label className="block text-sm font-bold text-gray-700 mb-2">Descriptions & istructions</label>
        <textarea
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          rows={3}
          placeholder="Add descriptions or instructions here..."
        />
      </div>
      )}

      {/* Exercise Selection Popup */}
      {showExercisePopup && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[80vh] flex flex-col">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Select Exercise</h3>
                <p className="text-sm text-gray-600">
                  {selectedMuscleGroup === 'all'
                    ? 'Showing all exercises'
                    : `Showing ${MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.label || 'All'} exercises`}
                </p>
              </div>
              <button
                onClick={() => setShowExercisePopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Field */}
            <div className="p-4 border-b">
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-4">
                {mockExercises
                  .filter(exercise => {
                    if (selectedMuscleGroup !== 'all' && !exercise.id.startsWith(selectedMuscleGroup)) return false;
                    if (exerciseSearch && !exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase())) return false;
                    return true;
                  })
                  .map((exercise) => {
                    const indicatorColor = getExerciseIndicatorColor(exercise.name);
                    return (
                      <div
                        key={exercise.id}
                        className="bg-white border-2 border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all relative"
                        onClick={() => {
                          if (selectedCell) {
                            setRows(prevRows =>
                              prevRows.map(row => (row.id === selectedCell.rowId ? { ...row, exercise: exercise.name } : row))
                            );
                            setShowExercisePopup(false);
                            setExerciseSearch('');
                          }
                        }}
                      >
                        {/* Color indicator circle */}
                        {indicatorColor && (
                          <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white ${indicatorColor === 'green' ? 'bg-green-500' : 'bg-blue-500'
                            }`} />
                        )}

                        <div className="aspect-square bg-gray-100 rounded mb-3 relative overflow-hidden">
                          <Image
                            src={exercise.image}
                            alt={exercise.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 33vw, 33vw"
                            unoptimized
                          />
                        </div>
                        <p className="text-sm text-center text-gray-700 font-medium" title={exercise.name}>
                          {exercise.name}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowExercisePopup(false);
                  setExerciseSearch('');
                }}
                className="px-6 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showSeriesPlanModal && planSectorId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-yellow-100 rounded-lg shadow-xl w-[90%] max-w-md p-4">
            <div className="mb-3">
              <div className="text-base font-bold text-gray-900">Plan series\exercise</div>
            </div>
            <div className="mb-3 flex items-center gap-3">
              {(() => {
                const sector = MUSCLE_GROUPS.find(g => g.id === planSectorId);
                return sector ? (
                  <>
                    <div className="w-16 h-16 bg-white border rounded flex items-center justify-center">
                      <Image src={sector.image} alt={sector.label} width={56} height={56} className="object-contain" unoptimized />
                    </div>
                    <div className="text-base font-semibold text-gray-800">{sector.label}</div>
                  </>
                ) : null;
              })()}
            </div>
            <div className="mb-3">
              <table className="w-full border-collapse text-sm bg-white">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 w-10 text-center">#</th>
                    <th className="border px-2 py-1 text-center" colSpan={2}>WORK</th>
                    <th className="border px-2 py-1 text-center">PAUSE</th>
                  </tr>
                  <tr className="bg-green-50">
                    <th className="border px-2 py-1 text-center"></th>
                    <th className="border px-2 py-1 text-center">Series</th>
                    <th className="border px-2 py-1 text-center">Reps</th>
                    <th className="border px-2 py-1 text-center">Pause</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-2 py-1 text-center">{planExerciseNumber}</td>
                    <td className="border px-2 py-1 text-center">
                      <select value={planSeries} onChange={(e) => setPlanSeries(e.target.value)} className="px-2 py-1 border rounded text-sm">
                        {[1,2,3,4,5,6,7,8,9,10,12,15,20].map(n => (<option key={n} value={n.toString()}>{n}</option>))}
                      </select>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <select value={planReps} onChange={(e) => setPlanReps(e.target.value)} className="px-2 py-1 border rounded text-sm">
                        {[4,6,8,10,12,15,20,25,30].map(n => (<option key={n} value={n.toString()}>{n}</option>))}
                      </select>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <select value={planPause} onChange={(e) => setPlanPause(e.target.value)} className="px-2 py-1 border rounded text-sm">
                        {BREAK_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mb-3">
              <button onClick={proceedScanExercise} className="w-full px-4 py-2 bg-red-600 text-white rounded font-bold">Proceed scan exercises</button>
            </div>
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">Search exercise</div>
              <input
                type="text"
                value={planExerciseSearch}
                onChange={(e) => setPlanExerciseSearch(e.target.value)}
                placeholder="Name exercise"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              />
            </div>
            <div className="h-40 bg-white border rounded flex items-center justify-center mb-2 relative">
              <button
                onClick={() => pickPlanCandidateByOffset(-1)}
                className="absolute left-2 w-7 h-7 flex items-center justify-center border rounded bg-white hover:border-orange-400"
                aria-label="Previous exercise"
              >
                ‹
              </button>
              <div ref={planListRef} className="flex gap-3 px-10 overflow-x-auto w-full h-full items-center">
                {planCandidates.length > 0 ? (
                  planCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      data-exercise-id={candidate.id}
                      onClick={() => {
                        setPlanCandidate(candidate);
                        setSectorMode('exercises');
                      }}
                      className={`flex-shrink-0 w-28 h-28 border rounded bg-white flex items-center justify-center ${
                        planCandidate?.id === candidate.id ? 'border-orange-400' : 'border-gray-200'
                      }`}
                      aria-label={candidate.name}
                    >
                      <Image src={candidate.image} alt={candidate.name} width={100} height={100} className="object-contain" unoptimized />
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">No exercise selected</span>
                )}
              </div>
              <button
                onClick={() => pickPlanCandidateByOffset(1)}
                className="absolute right-2 w-7 h-7 flex items-center justify-center border rounded bg-white hover:border-orange-400"
                aria-label="Next exercise"
              >
                ›
              </button>
            </div>
            <div className="bg-white border rounded px-3 py-2 mb-3 text-center">
              <div className="text-xs font-semibold text-gray-600">Name exercise</div>
              <div className="text-lg font-semibold text-gray-900">{planCandidate?.name || 'No exercise selected'}</div>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={addPlannedExercise} className="px-4 py-2 bg-gray-300 text-black rounded">Add exercise</button>
              <span className="text-xs text-gray-700"></span>
              <button onClick={endSeriesPlan} className="px-4 py-2 bg-black text-white rounded">End the plan</button>
            </div>
          </div>
        </div>
      )}
      <CircuitPreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSave={(prefs) => setPreferences(prefs)}
      />
    </div>
  );
});

export default FastPlannerOfMoveframes;
