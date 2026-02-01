'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { MUSCULAR_SECTORS } from '@/constants/moveframe.constants';

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
    // Show exercise popup when clicking on exercise field
    if (field === 'exercise') {
      setShowExercisePopup(true);
    }
  };

  // Add new row
  const handleGoNext = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([...rows, { id: newId, exercise: '', speed: '', series: '', ripTime: '', weight: '', break: '', mode: '' }]);
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
              onClick={() => setActiveExerciseButton(null)}
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
              onChange={() => setSectorMode('series')}
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
              onClick={() => setSelectedMuscleGroup('all')}
              className="flex flex-col items-center justify-center"
            >
              <div className="mb-2 flex items-center justify-center" style={{ width: `${64 * ZOOM}px`, height: `${64 * ZOOM}px` }}>
                <Image
                  src="/all.png"
                  alt="All"
                  width={Math.round(64 * ZOOM)}
                  height={Math.round(64 * ZOOM)}
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="sr-only">All</span>
            </button>
          </div>

          {/* Muscle group buttons - Scrollable horizontally with larger images */}
          <div className="bg-slate-800 rounded-lg p-3 flex-1">
            <div className="flex" style={{ gap: `${Math.max(4, 14 * ZOOM)}px` }}>
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedMuscleGroup(group.id)}
                  className={`flex flex-col items-center justify-center px-4 py-4 rounded-lg transition-colors flex-shrink-0 ${selectedMuscleGroup === group.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-600 text-gray-200 hover:bg-slate-700'
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
                  <span className="font-medium" style={{ fontSize: `${Math.max(10, 16 * ZOOM)}px` }}>{group.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Exercise Display Section - content driven by upper controls */}
      {selectedMuscleGroup && (
        <div className="space-y-3">

          {/* Exercise images / Speed / Series Options Display */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
            {/* Speed Options */}
            {activeExerciseButton === 'speed' && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Select Speed of Execution</p>
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
                      className="flex-shrink-0 px-8 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-base whitespace-nowrap"
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Series Options */}
            {activeExerciseButton === 'series' && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Select Number of Series</p>
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
                      className="flex-shrink-0 px-8 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-base"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rip\Time Options */}
            {activeExerciseButton === 'riptime' && (
              <div className="flex gap-8 justify-center items-start">
                {/* Mode selector - Dropdown */}
                <div>
                  <select
                    value={ripTimeMode}
                    onChange={(e) => {
                      const v = e.target.value as 'reps' | 'time';
                      setRipTimeMode(v);
                      setRipTimeValue('');
                    }}
                    className="px-2 py-1 text-sm border rounded text-black border-gray-300 bg-white"
                  >
                    <option value="reps">Repetitions</option>
                    <option value="time">Time</option>
                  </select>
                </div>

                {/* Input Area */}
                <div>
                  {/* Repetitions Input */}
                  {ripTimeMode === 'reps' && (
                    <div className="flex items-center gap-2">
                      {/* Decrease Button */}
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
                        className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl font-bold"
                      >
                        −
                      </button>

                      {/* Reps Input */}
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

                      {/* Increase Button */}
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
                        className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Time Input */}
                  {ripTimeMode === 'time' && (
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={ripTimeValue}
                        onChange={(e) => {
                          // allow free typing
                          const raw = e.target.value.replace(/\D/g, '');
                          setRipTimeValue(raw);
                        }}
                        onBlur={() => {
                          const formatted = formatRipTime(ripTimeValue, true);
                          setRipTimeValue(formatted);

                          if (selectedCell && selectedCell.field === 'ripTime') {
                            setRows(prev =>
                              prev.map(row =>
                                row.id === selectedCell.rowId
                                  ? { ...row, ripTime: formatted }
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

            {/* Weight Options */}
            {activeExerciseButton === 'weight' && (
              <div className="flex gap-8 justify-center items-start">
                {/* Unit selector - Dropdown */}
                <div>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                    className="px-2 py-1 text-sm border rounded text-black border-gray-300 bg-white"
                  >
                    <option value="kg">Kg</option>
                    <option value="lbs">Lbs</option>
                  </select>
                </div>

                {/* Input Area */}
                <div className="flex items-center gap-2">
                  {/* Decrease Button */}
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
                    className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl font-bold"
                  >
                    −
                  </button>

                  {/* Weight Input */}
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

                  {/* Increase Button */}
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
                    className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Break Options */}
            {activeExerciseButton === 'break' && (
              <div className="flex gap-8 justify-center items-start">
                {/* Break mode selector - Dropdown */}
                <div>
                  <select
                    value={breakMode}
                    onChange={(e) => {
                      const v = e.target.value as 'rest' | 'cardio';
                      setBreakMode(v);
                      if (v === 'cardio') {
                        setCardioValue('120');
                      }
                      setActiveExerciseButton('break');
                    }}
                    className="px-2 py-1 text-sm border rounded text-black border-gray-300 bg-white"
                  >
                    <option value="rest">Rest time</option>
                    <option value="cardio">Cardio</option>
                  </select>
                </div>


                {/* Input Area */}
                <div>
                  {/* Rest Time - Preset Buttons */}
                  {breakMode === 'rest' && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {BREAK_OPTIONS.map((breakTime) => (
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
                          className="flex-shrink-0 px-8 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-medium text-base whitespace-nowrap"
                        >
                          {breakTime}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cardio - Numeric Input */}
                  {breakMode === 'cardio' && (
                    <div className="flex items-center gap-4">
                      {/* Cardio Input with +/- buttons */}
                      <div className="flex items-center gap-2">
                        {/* Decrease Button */}
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
                          className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl font-bold"
                        >
                          −
                        </button>

                        {/* Cardio Input */}
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
                              // Reset to default if invalid
                              setCardioValue('120');
                            }
                          }}
                          placeholder="120"
                          min="60"
                          max="200"
                          className="w-32 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Increase Button */}
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
                          className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-lg text-gray-600 font-medium">bpm (60-200)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode Options */}
            {activeExerciseButton === 'mode' && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-4 text-center">Select Breaking Modality</p>
                <div className="flex flex-col gap-4 items-center">
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
                      className="w-80 px-8 py-6 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-md transition-all font-bold text-xl"
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exercise images in horizontal scrollable band */}
            {!activeExerciseButton && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Exercises sorted alphabetically
                </p>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 pb-2">
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
                            className="flex-shrink-0 w-40 bg-white border-2 border-gray-300 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all relative"
                            onClick={() => {
                              if (selectedCell) {
                                setRows(prevRows => prevRows.map(row => {
                                  if (row.id === selectedCell.rowId) {
                                    return { ...row, exercise: exercise.name };
                                  }
                                  return row;
                                }));
                              }
                            }}
                          >
                            {/* Color indicator circle */}
                            {indicatorColor && (
                              <div className={`absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white ${indicatorColor === 'green' ? 'bg-green-500' : 'bg-blue-500'
                                }`} />
                            )}

                            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                              <div className="text-center">
                                <p className="text-sm font-bold text-gray-600">{exercise.sector}</p>
                              </div>
                            </div>
                            <p className="text-sm text-center text-gray-700 font-medium" title={exercise.name}>
                              {exercise.name}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercise Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
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
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Mode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-600 border-r">{index + 1}</td>
                  <td className="px-1 py-1 border-r">
                    <div
                      onClick={() => handleCellClick(row.id, 'exercise')}
                      className={`cursor-pointer border-2 rounded overflow-hidden ${selectedCell?.rowId === row.id && selectedCell?.field === 'exercise'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200'
                        }`}
                    >
                      {row.exercise ? (
                        <div className="flex items-center gap-3 p-2">
                          <div className="bg-slate-900 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ width: `${92 * ZOOM}px`, height: `${92 * ZOOM}px` }}>
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
        <button
          onClick={handleSaveMoveframe}
          className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700"
        >
          Save moveframe and its movelaps
        </button>
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
    </div>
  );
}
