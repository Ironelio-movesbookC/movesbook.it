'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MUSCULAR_SECTORS } from '@/constants/moveframe.constants';
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
}

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

export default function FastPlannerOfMoveframes({
  sport,
  sectionId,
  workout,
  day,
  mode,
  existingMoveframe,
  onSave,
  onCancel
}: FastPlannerProps) {
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

  // Mock exercise data (placeholder until we have real exercise library)
  const mockExercises = MUSCLE_GROUPS.flatMap(group =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `${group.id}-${i}`,
      name: `${group.label} Exercise ${i + 1}`,
      sector: group.sector,
      image: group.image // Use the muscle group image as placeholder for exercise
    }))
  ).concat(
    Array.from({ length: 20 }, (_, i) => ({
      id: `general-${i}`,
      name: `General Exercise ${i + 1}`,
      sector: 'General',
      image: '/muscular/abs.png' // Default image for general exercises
    }))
  ).sort((a, b) => a.name.localeCompare(b.name));

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

  // Handle quick value selection from execution toolbar (keyboard-like input)
  const handleQuickFill = (field: string, value: string) => {
    if (!selectedCell) {
      // No cell selected - show a hint to user
      return;
    }

    // Only fill if the selected cell matches the field
    if (selectedCell.field !== field) {
      return;
    }

    // Fill the selected cell with the value
    setRows(prevRows => prevRows.map(row => {
      if (row.id === selectedCell.rowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));
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
    setRows(prev => {
      if (prev.length === 0) {
        const firstId = 1;
        const next = [{ id: firstId, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }];
        setSelectedCell({ rowId: firstId, field: 'exercise' });
        setActiveExerciseButton(null);
        setSelectedMuscleGroup('all');
        setShowSubExercises(false);
        return next;
      }
      const idx = prev.length - 1;
      const last = { ...prev[idx] };
      const previous = idx > 0 ? prev[idx - 1] : null;
      if (!last.series || last.series.trim() === '') last.series = previous?.series || '3';
      if (!last.ripTime || last.ripTime.trim() === '') last.ripTime = previous?.ripTime || '12';
      if (!last.break || last.break.trim() === '') last.break = previous?.break || "1'30\"";
      if (!last.speed || last.speed.trim() === '') last.speed = 'Normal';
      if (!last.weight || last.weight.trim() === '') last.weight = 'nc';
      if (!last.mode || last.mode.trim() === '') last.mode = 'Stopped';
      const updated = [...prev];
      updated[idx] = last;
      const newId = Math.max(...updated.map(r => r.id)) + 1;
      const next = [...updated, { id: newId, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }];
      setSelectedCell({ rowId: newId, field: 'exercise' });
      setActiveExerciseButton(null);
      setSelectedMuscleGroup('all');
      setShowSubExercises(false);
      return next;
    });
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
  // Duplicate last row
  const handleDuplicate = () => {
    if (rows.length === 0) return;
    const lastRow = rows[rows.length - 1];
    const newId = Math.max(...rows.map(r => r.id)) + 1;
    setRows([...rows, { ...lastRow, id: newId }]);
  };

  // Triplicate last row
  const handleTriplicate = () => {
    if (rows.length === 0) return;
    const lastRow = rows[rows.length - 1];
    const maxId = Math.max(...rows.map(r => r.id));
    const newRows = [
      { ...lastRow, id: maxId + 1 },
      { ...lastRow, id: maxId + 2 },
      { ...lastRow, id: maxId + 3 }
    ];
    setRows([...rows, ...newRows]);
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
    // Build moveframe data
    const moveframeData = {
      sport,
      section_id: sectionId,
      description: `Fast planner - ${rows.length} exercises`,
      type: 'BATTERY',
      uploadToWorkout: false,
      fastPlannerData: {
        sectorMode,
        execSpeed,
        execSeries,
        execRipTime,
        execWeight,
        execBreak,
        execMode,
        rows
      }
    };

    onSave(moveframeData);
  };
  const handleSaveMoveframeAndMovelaps = () => {
    const moveframeData = {
      sport,
      section_id: sectionId,
      description: `Fast planner - ${rows.length} exercises`,
      type: 'BATTERY',
      uploadToWorkout: true,
      fastPlannerData: {
        sectorMode,
        execSpeed,
        execSeries,
        execRipTime,
        execWeight,
        execBreak,
        execMode,
        rows,
        preferences
      }
    };
    onSave(moveframeData);
  };
  const openSeriesPlan = (sectorId: string) => {
    setPlanSectorId(sectorId);
    setPlanExerciseNumber(1);
    setPlanSeries('3');
    setPlanReps('12');
    setPlanPause("1'30\"");
    setPlanCandidate(null);
    setShowSeriesPlanModal(true);
  };
  const proceedScanExercise = () => {
    if (!planSectorId) return;
    const candidates = mockExercises.filter(ex => ex.id.startsWith(planSectorId));
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
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
    setRows(prev => {
      const copy = [...prev];
      const current = { ...copy[rowIndex] };
      const previous = rowIndex > 0 ? copy[rowIndex - 1] : null;

      // Mandatory defaults if empty
      if (!current.series || current.series.trim() === '') {
        current.series = previous?.series || '3';
      }
      if (!current.ripTime || current.ripTime.trim() === '') {
        current.ripTime = previous?.ripTime || '12';
      }
      if (!current.break || current.break.trim() === '') {
        current.break = previous?.break || "1'30\"";
      }
      // Optional defaults
      if (!current.speed || current.speed.trim() === '') {
        current.speed = 'Normal';
      }
      if (!current.weight || current.weight.trim() === '') {
        current.weight = 'nc';
      }
      if (!current.mode || current.mode.trim() === '') {
        current.mode = 'Stopped';
      }

      copy[rowIndex] = current;
      return copy;
    });

    // Focus next row exercise selection
    const nextIndex = Math.min(rowIndex + 1, rows.length - 1);
    const nextRowId = rows[nextIndex]?.id;
    if (nextRowId) {
      setSelectedCell({ rowId: nextRowId, field: 'exercise' });
      setActiveExerciseButton(null);
      setShowSubExercises(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Removed zoom control; fixed scale at 55% */}
      {/* Top Row: Execution, Intensity of work, Break between series */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
        {/* Execution Box */}
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center">
          <label className="block text-sm font-bold text-gray-700 mb-2">Execution</label>
          {selectedCell && (
            <p className="text-xs text-blue-600 font-medium mb-2">
              ✓ Row {rows.findIndex(r => r.id === selectedCell.rowId) + 1}, {selectedCell.field}
            </p>
          )}
        </div>

        {/* Intensity of Work Box */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-center">
          <label className="block text-sm font-bold text-gray-700 mb-2">Intensity of work</label>
        </div>

        {/* Break between series Box */}
        <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-center">
          <label className="block text-sm font-bold text-gray-700 mb-2">Break between series</label>
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
              className="px-3 py-2 text-sm font-bold border rounded text-black border-gray-300 whitespace-nowrap"
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
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${activeExerciseButton === 'speed'
                ? 'text-black border-blue-600'
                : 'text-black border-gray-300 hover:border-blue-500'
                }`}
            >
              Speed
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'series' ? null : 'series')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${activeExerciseButton === 'series'
                ? 'text-black border-blue-600'
                : 'text-black border-gray-300 hover:border-blue-500'
                }`}
            >
              Series
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'riptime' ? null : 'riptime')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${activeExerciseButton === 'riptime'
                ? 'text-black border-blue-600'
                : 'text-black border-gray-300 hover:border-blue-500'
                }`}
            >
              Rip\Time
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'weight' ? null : 'weight')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${activeExerciseButton === 'weight'
                ? 'text-black border-blue-600'
                : 'text-black border-gray-300 hover:border-blue-500'
                }`}
            >
              Weight
            </button>
          </div>

          {/* Right column: 2 buttons fill Break width */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'break' ? null : 'break')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${activeExerciseButton === 'break'
                ? 'text-black border-blue-600'
                : 'text-black border-gray-300 hover:border-blue-500'
                }`}
            >
              Break
            </button>
            <button
              onClick={() => setActiveExerciseButton(activeExerciseButton === 'mode' ? null : 'mode')}
              className={`w-full px-3 py-2 text-sm font-medium border rounded whitespace-nowrap ${activeExerciseButton === 'mode'
                ? 'text-black border-blue-600'
                : 'text-black border-gray-300 hover:border-blue-500'
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
                if (selectedMuscleGroup === 'all') {
                  setActiveExerciseButton(null);
                  setShowSubExercises(false);
                } else {
                  openSeriesPlan(selectedMuscleGroup);
                }
              }}
              className="mr-1.5"
            />
            <span className="text-xs text-gray-700">Plan series\exercise</span>
          </label>
        </div>
      </div>

      {/* Muscle Groups - Always visible */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center pb-2 gap-2" style={{ overflowX: 'hidden', flexWrap: 'nowrap' }}>
          {/* All button - Fixed on the left */}
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

          {/* Content area: show options or muscle groups within the same box */}
          <div className="bg-white border border-gray-300 rounded-lg p-3 flex-1 min-h-[160px] text-black">
            {activeExerciseButton ? (
              <div className="space-y-3">
                {activeExerciseButton === 'speed' && (
                  <div>
                    <p className="text-sm font-bold text-black mb-3">Select Speed of Execution</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            if (selectedCell) {
                              setRows(prevRows => prevRows.map(row => {
                                if (row.id === selectedCell.rowId && selectedCell.field === 'speed') {
                                  return { ...row, speed };
                                }
                                return row;
                              }));
                            }
                          }}
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
                          onClick={() => {
                            if (selectedCell) {
                              setRows(prevRows => prevRows.map(row => {
                                if (row.id === selectedCell.rowId && selectedCell.field === 'series') {
                                  return { ...row, series: num.toString() };
                                }
                                return row;
                              }));
                            }
                          }}
                          className="flex-shrink-0 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-base"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'riptime' && (
                  <div className="flex gap-8 justify-center items-start">
                    <div className="flex flex-col gap-2 items-start">
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

                    <div>
                      {ripTimeMode === 'reps' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const currentValue = parseInt(ripTimeValue) || 0;
                              if (currentValue > 1) {
                                const newValue = (currentValue - 1).toString();
                                setRipTimeValue(newValue);
                                if (selectedCell && selectedCell.field === 'ripTime') {
                                  setRows(prevRows => prevRows.map(row => {
                                    if (row.id === selectedCell.rowId) {
                                      return { ...row, ripTime: newValue };
                                    }
                                    return row;
                                  }));
                                }
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
                              if (selectedCell && selectedCell.field === 'ripTime') {
                                setRows(prevRows => prevRows.map(row => {
                                  if (row.id === selectedCell.rowId) {
                                    return { ...row, ripTime: value };
                                  }
                                  return row;
                                }));
                              }
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
                                if (selectedCell && selectedCell.field === 'ripTime') {
                                  setRows(prevRows => prevRows.map(row => {
                                    if (row.id === selectedCell.rowId) {
                                      return { ...row, ripTime: newValue };
                                    }
                                    return row;
                                  }));
                                }
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

                              if (selectedCell && selectedCell.field === 'ripTime') {
                                setRows(prev =>
                                  prev.map(row =>
                                    row.id === selectedCell.rowId
                                      ? { ...row, ripTime: ripTimeValue ? formatRipTime(ripTimeValue, true) : '' }
                                      : row
                                  )
                                );
                              }
                            }}
                            placeholder="MM'SS&quot;"
                            className="w-48 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'weight' && (
                  <div className="flex gap-8 justify-center items-start">
                    <div className="flex flex-col gap-2 items-start">
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const currentValue = parseFloat(weightValue) || 0;
                          if (currentValue > 0) {
                            const newValue = Math.max(0, currentValue - 0.5).toString();
                            setWeightValue(newValue);
                            if (selectedCell && selectedCell.field === 'weight') {
                              setRows(prevRows => prevRows.map(row => {
                                if (row.id === selectedCell.rowId) {
                                  return { ...row, weight: `${newValue} ${weightUnit}` };
                                }
                                return row;
                              }));
                            }
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
                          if (selectedCell && selectedCell.field === 'weight') {
                            setRows(prevRows => prevRows.map(row => {
                              if (row.id === selectedCell.rowId) {
                                return { ...row, weight: `${value} ${weightUnit}` };
                              }
                              return row;
                            }));
                          }
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
                            if (selectedCell && selectedCell.field === 'weight') {
                              setRows(prevRows => prevRows.map(row => {
                                if (row.id === selectedCell.rowId) {
                                  return { ...row, weight: `${newValue} ${weightUnit}` };
                                }
                                return row;
                              }));
                            }
                          }
                        }}
                          className="w-10 h-10 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {activeExerciseButton === 'break' && (
                  <div className="flex gap-8 justify-center items-start">
                    <div className="flex flex-col gap-2 items-start">
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

                    <div>
                      {breakMode === 'rest' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-3 justify-center">
                            {BREAK_OPTIONS.slice(0, Math.ceil(BREAK_OPTIONS.length / 2)).map((breakTime) => (
                              <button
                                key={breakTime}
                                onClick={() => {
                                  if (selectedCell && selectedCell.field === 'break') {
                                    setRows(prevRows => prevRows.map(row => {
                                      if (row.id === selectedCell.rowId) {
                                        return { ...row, break: breakTime };
                                      }
                                      return row;
                                    }));
                                  }
                                }}
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
                                onClick={() => {
                                  if (selectedCell && selectedCell.field === 'break') {
                                    setRows(prevRows => prevRows.map(row => {
                                      if (row.id === selectedCell.rowId) {
                                        return { ...row, break: breakTime };
                                      }
                                      return row;
                                    }));
                                  }
                                }}
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
                                  if (selectedCell && selectedCell.field === 'break') {
                                    setRows(prevRows => prevRows.map(row => {
                                      if (row.id === selectedCell.rowId) {
                                        return { ...row, break: `${newValue} bpm` };
                                      }
                                      return row;
                                    }));
                                  }
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
                                  if (selectedCell && selectedCell.field === 'break') {
                                    setRows(prevRows => prevRows.map(row => {
                                      if (row.id === selectedCell.rowId) {
                                        return { ...row, break: `${value} bpm` };
                                      }
                                      return row;
                                    }));
                                  }
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
                                  if (selectedCell && selectedCell.field === 'break') {
                                    setRows(prevRows => prevRows.map(row => {
                                      if (row.id === selectedCell.rowId) {
                                        return { ...row, break: `${newValue} bpm` };
                                      }
                                      return row;
                                    }));
                                  }
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
                )}

                {activeExerciseButton === 'mode' && (
                  <div>
                    <p className="text-sm font-bold text-black mb-3 text-center">Select Breaking Modality</p>
                    <div className="flex flex-row gap-3 items-center justify-center flex-wrap">
                      {MODE_OPTIONS.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => {
                            if (selectedCell && selectedCell.field === 'mode') {
                              setRows(prevRows => prevRows.map(row => {
                                if (row.id === selectedCell.rowId) {
                                  return { ...row, mode: mode.label };
                                }
                                return row;
                              }));
                            }
                          }}
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
                                  setRows(prevRows => prevRows.map(row => {
                                    if (row.id === selectedCell.rowId) {
                                      return { ...row, exercise: exercise.name };
                                    }
                                    return row;
                                  }));
                                  setExerciseSearch('');
                                }
                              }}
                            >
                              {indicatorColor && (
                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full border-2 border-white ${indicatorColor === 'green' ? 'bg-green-500' : 'bg-blue-500'
                                  }`} />
                              )}
                              <div className="aspect-square bg-gray-100 rounded mb-1 flex items-center justify-center">
                                <div className="text-center">
                                  <p className="text-[10px] font-bold text-black">{exercise.sector}</p>
                                </div>
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

      {/* Exercises are displayed inside the main content box when a sector is selected */}
 
 

      {/* Exercise Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
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
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <p className="text-xs text-blue-700">
            ℹ️ Scroll to view all repetitions. Each can have unique speed, time, and pause values.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleGoNext}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900"
        >
          Go next
        </button>
        <button
          onClick={handleDuplicate}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900"
        >
          Duplicate
        </button>
        <button
          onClick={handleTriplicate}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900"
        >
          Triplicate
        </button>
        <button
          onClick={handleRemove}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900"
        >
          Remove
        </button>
        <button
          onClick={handleResetRow}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-900"
        >
          Reset row
        </button>
        <button
          onClick={handleResetAll}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
        >
          Reset all
        </button>
        <button
          onClick={handleSaveMoveframe}
          className="ml-auto px-6 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700"
        >
          Save moveframe
        </button>
      </div>

      {/* Descriptions & Instructions */}
      <div className="bg-green-50 border border-green-300 rounded-lg p-3">
        <label className="block text-sm font-bold text-gray-700 mb-2">Descriptions & istructions</label>
        <textarea
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          rows={3}
          placeholder="Add descriptions or instructions here..."
        />
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700"
        >
          Cancel
        </button>
        <div className="flex items-center">
          <button
            onClick={handleSaveMoveframeAndMovelaps}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700"
          >
            Save moveframe and its movelaps
          </button>
          <button
            onClick={() => setShowPreferencesModal(true)}
            className="ml-2 px-6 py-2 bg-white text-black border-2 border-gray-300 rounded hover:border-blue-500 flex items-center justify-center w-64"
            title="Open preferences"
          >
            <Image src="/preference.png" alt="Preferences" width={20} height={20} className="mr-2 object-contain" unoptimized />
            Preferences
          </button>
        </div>
      </div>

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
                            setRows(prevRows => prevRows.map(row => {
                              if (row.id === selectedCell.rowId) {
                                return { ...row, exercise: exercise.name };
                              }
                              return row;
                            }));
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
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 w-10 text-center">#</th>
                    <th className="border px-2 py-1 text-center" colSpan={2}>WORK</th>
                    <th className="border px-2 py-1 text-center">PAUSE</th>
                  </tr>
                  <tr>
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
            <div className="h-24 bg-white border rounded flex items-center justify-center mb-3">
              {planCandidate ? (
                <div className="text-center">
                  <div className="text-xs font-bold">{planCandidate.sector}</div>
                  <div className="text-sm">{planCandidate.name}</div>
                </div>
              ) : (
                <span className="text-xs text-gray-500">No exercise selected</span>
              )}
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
}
