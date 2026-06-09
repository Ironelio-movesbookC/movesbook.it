'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
import { stripInternalWorkoutTags } from '@/utils/sanitizeNutritionHtml';

const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return stripInternalWorkoutTags(content).trim();
};

interface AddEditNutritionComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nutritionComponentData: any) => void;
  onCopyToAll?: (fieldName: string, fieldValue: any) => Promise<void>;
  mode: 'add' | 'edit';
  nutritionFood: any;
  existingNutritionComponent?: any;
  /** When adding via "Add nutritionComponent" from Options - the exercise to inherit data from */
  sourceNutritionComponentForAdd?: any;
  /** When adding via "Add nutritionComponent" from Options - insert after this index (0-based) */
  nutritionComponentInsertIndex?: number | null;
}

// Sport-specific configurations
const SPORT_CONFIGS = {
  SWIM: {
    distances: ['20', '50', '75', '100', '150', '200', '400', '500', '800', '1000', '1200', '1500'],
    speeds: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'],
    styles: ['Freestyle', 'Dolphin', 'Backstroke', 'Breaststroke', 'Sliding', 'Apnea'],
    pauses: ['0"', '5"', '10"', '15"', '20"', '25"', '30"', '35"', '40"', '45"', '50"', "1'", "1'10\"", "1'15\"", "1'30\"", "2'", "2'30\"", "3'"]
  },
  RUN: {
    distances: ['50', '60', '80', '100', '110', '150', '200', '300', '400', '500', '600', '800', '1000', '1200', '1500', '2000', '3000', '5000', '10000'],
    speeds: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'],
    styles: ['Track', 'Road', 'Cross', 'Beach', 'Hill', 'Downhill'],
    pauses: ['20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"]
  },
  WALKING: {
    distances: ['50', '60', '80', '100', '110', '150', '200', '300', '400', '500', '600', '800', '1000', '1200', '1500', '2000', '3000', '5000', '10000'],
    speeds: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'],
    styles: ['Track', 'Road', 'Cross', 'Beach', 'Hill', 'Downhill'],
    pauses: ['20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"]
  },
  HIKING: {
    distances: ['50', '60', '80', '100', '110', '150', '200', '300', '400', '500', '600', '800', '1000', '1200', '1500', '2000', '3000', '5000', '10000'],
    speeds: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'],
    styles: ['Track', 'Road', 'Cross', 'Beach', 'Hill', 'Downhill'],
    pauses: ['20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"]
  },
  BIKE: {
    distances: ['200', '400', '500', '1000', '1500', '2000', '3000', '4000', '5000', '7000', '8000', '10000'],
    speeds: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'],
    ranges: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    pauses: ['15"', '30"', '45"', "1'", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'"]
  },
  BODY_BUILDING: {
    speeds: ['Very slow', 'Slow', 'Normal', 'Quick', 'Fast', 'Very fast', 'Explosive', 'Negative'],
    muscularSectors: [
      'Shoulders',
      'Anterior arms',
      'Rear arms',
      'Forearms',
      'Chest',
      'Abdominals',
      'Intercostals',
      'Trapezius',
      'Lats',
      'Lumbosacral',
      'Front thighs',
      'Hind thighs',
      'Calves',
      'Tibials'
    ],
    restTypes: ['SET_TIME', 'RESTART_TIME', 'RESTART_PULSE'],
    pauses: ['0"', '5"', '10"', '15"', '20"', '30"', '45"', "1'", "1'15\"", "1'30\"", "2'", "2'30\"", "3'", "4'", "5'", "6'", "7'"]
  }
};

const MACRO_FINALS = ["0'", "1'", "2'", "3'", "4'", "5'", "6'", "7'", "8'", "9'"];
const ALARMS = ['-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9', '-10'];
const SOUNDS = ['Beep', 'Bell', 'Chime', 'None'];

export default function AddEditNutritionComponentModal({
  isOpen,
  onClose,
  onSave,
  onCopyToAll,
  mode,
  nutritionFood,
  existingNutritionComponent,
  sourceNutritionComponentForAdd,
  nutritionComponentInsertIndex
}: AddEditNutritionComponentModalProps) {
  const sport = nutritionFood.sport || 'SWIM';
  const config = SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS] || SPORT_CONFIGS.SWIM;
  
  // Check if this is a manual nutritionFood
  const isManualNutritionFood = nutritionFood.manualMode === true;
  
  // Extract circuit metadata if this is a circuit nutritionComponent
  const extractCircuitMetadata = () => {
    if (!existingNutritionComponent?.notes || typeof existingNutritionComponent.notes !== 'string') return null;
    const metaMatch = existingNutritionComponent.notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
    if (metaMatch && metaMatch[1]) {
      try {
        return JSON.parse(metaMatch[1]);
      } catch (e) {
        console.error('Failed to parse circuit metadata:', e);
        return null;
      }
    }
    return null;
  };
  
  const circuitMetadata = extractCircuitMetadata();

  // Form state - inherit from nutritionFood
  const [sequence, setSequence] = useState(1);
  const [distance, setDistance] = useState('');
  const [speed, setSpeed] = useState('');
  const [style, setStyle] = useState('');
  const [pause, setPause] = useState('');
  const [pace, setPace] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [alarm, setAlarm] = useState('');
  const [sound, setSound] = useState('Beep');
  const [macroFinal, setMacroFinal] = useState("0'");
  
  // BODY_BUILDING specific
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [muscularSector, setMuscularSector] = useState('');
  const [exercise, setExercise] = useState('');
  const [restType, setRestType] = useState('');
  
  // OTHER SPORTS (Gymnastic, Stretching, Pilates, Yoga, etc.)
  const [tools, setTools] = useState('');
  
  // BIKE specific
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [copyingFields, setCopyingFields] = useState<Set<string>>(new Set());

  // Copy button component
  const CopyButton = ({ fieldName, fieldValue, disabled }: { fieldName: string; fieldValue: any; disabled?: boolean }) => {
    const isCopying = copyingFields.has(fieldName);
    
    if (!onCopyToAll || mode === 'add' || disabled) return null;
    
    return (
      <button
        type="button"
        onClick={async () => {
          // Add field to copying set
          setCopyingFields(prev => new Set(prev).add(fieldName));
          try {
            await onCopyToAll(fieldName, fieldValue);
          } catch (error) {
            console.error('Error copying to all:', error);
          } finally {
            // Remove field from copying set
            setCopyingFields(prev => {
              const newSet = new Set(prev);
              newSet.delete(fieldName);
              return newSet;
            });
          }
        }}
        disabled={isCopying}
        className="ml-2 p-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Copy this value to all other nutrition_components"
      >
        <Copy size={14} />
      </button>
    );
  };

  // Fast input parsing functions - Format: 123456 → 12h34'56"
  const parsePaceInput = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    if (!digits) return '';

    // Parse from right to left: seconds, minutes
    const len = digits.length;
    let sec = '00';
    let min = '0';
    
    if (len === 1) {
      // "5" → "0'05""
      sec = digits.padStart(2, '0');
    } else if (len === 2) {
      // "25" → "0'25""
      sec = digits;
    } else if (len === 3) {
      // "325" → "3'25""
      min = digits[0];
      sec = digits.slice(1, 3);
    } else if (len === 4) {
      // "1325" → "13'25""
      min = digits.slice(0, 2);
      sec = digits.slice(2, 4);
    } else {
      // 5+ digits: treat first digits as extra minutes
      min = digits.slice(0, -2);
      sec = digits.slice(-2);
    }
    
    return `${min}'${sec}"`;
  };

  const parseTimeInput = (input: string): string => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');
    if (!digits) return '';

    // Parse from right to left: seconds, minutes, hours
    // Format: 123456 → 12h34'56"
    const len = digits.length;
    let sec = '00';
    let min = '00';
    let hour = '0';
    
    if (len === 1) {
      // "5" → "0h00'05""
      sec = digits.padStart(2, '0');
    } else if (len === 2) {
      // "25" → "0h00'25""
      sec = digits;
    } else if (len === 3) {
      // "325" → "0h03'25""
      min = digits[0].padStart(2, '0');
      sec = digits.slice(1, 3);
    } else if (len === 4) {
      // "1325" → "0h13'25""
      min = digits.slice(0, 2);
      sec = digits.slice(2, 4);
    } else if (len === 5) {
      // "13255" → "1h32'55""
      hour = digits[0];
      min = digits.slice(1, 3);
      sec = digits.slice(3, 5);
    } else if (len === 6) {
      // "123456" → "12h34'56""
      hour = digits.slice(0, 2);
      min = digits.slice(2, 4);
      sec = digits.slice(4, 6);
    } else {
      // 7+ digits: HH+:MM'SS"
      hour = digits.slice(0, -4);
      min = digits.slice(-4, -2);
      sec = digits.slice(-2);
    }
    
    return `${hour}h${min}'${sec}"`;
  };

  const handlePaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just update the value, don't format while typing
    setPace(e.target.value);
  };

  const handlePaceBlur = () => {
    if (pace && /^\d+$/.test(pace)) {
      const formatted = parsePaceInput(pace);
      setPace(formatted);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just update the value, don't format while typing
    setTime(e.target.value);
  };

  const handleTimeBlur = () => {
    if (time && /^\d+$/.test(time)) {
      const formatted = parseTimeInput(time);
      setTime(formatted);
    }
  };

  // Initialize form
  useEffect(() => {
    if (mode === 'edit' && existingNutritionComponent) {
      // EDIT MODE: Pre-fill with the nutritionComponent being edited
      setSequence(existingNutritionComponent.repetitionNumber || 1);
      setDistance(existingNutritionComponent.distance?.toString() || '');
      setSpeed(existingNutritionComponent.speed || '');
      setStyle(existingNutritionComponent.style || '');
      setPause(existingNutritionComponent.pause || '');
      setPace(existingNutritionComponent.pace || '');
      setTime(existingNutritionComponent.time || '');
      setNotes(existingNutritionComponent.notes || '');
      setAlarm(existingNutritionComponent.alarm?.toString() || '');
      setSound(existingNutritionComponent.sound || 'Beep');
      setMacroFinal(existingNutritionComponent.macroFinal || "0'");
      setReps(existingNutritionComponent.reps?.toString() || '');
      setWeight(existingNutritionComponent.weight || '');
      setTools(existingNutritionComponent.tools || '');
      setMuscularSector(existingNutritionComponent.muscularSector || '');
      setExercise(existingNutritionComponent.exercise || '');
      setRestType(existingNutritionComponent.restType || '');
      setR1(existingNutritionComponent.r1 || '');
      setR2(existingNutritionComponent.r2 || '');
    } else if (mode === 'add' && sourceNutritionComponentForAdd && nutritionComponentInsertIndex != null) {
      // ADD MODE (from "Add nutritionComponent" on a row): Pre-fill with that exercise's data; insert after it
      const src = sourceNutritionComponentForAdd;
      const insertPosition = nutritionComponentInsertIndex + 1; // 1-based "insert after position N"
      setSequence(insertPosition);
      setDistance(src.distance?.toString() || '');
      setSpeed(src.speed || src._fastPlannerRipTime || '');
      setStyle(src.style || '');
      setPause(typeof src.pause === 'string' ? src.pause : (src._fastPlannerBreak || src.pause?.toString() || ''));
      setPace(src.pace || '');
      setTime(src.time || '');
      setNotes('');
      setAlarm(src.alarm?.toString() || '');
      setSound(src.sound || 'Beep');
      setMacroFinal(src.macroFinal || "0'");
      setReps(src.reps?.toString() || '');
      setWeight(src.weight || '');
      setTools(src.tools || '');
      setMuscularSector(src.muscularSector || '');
      setExercise(src.exercise || '');
      setRestType(src.restType || '');
      setR1(src.r1 || '');
      setR2(src.r2 || '');
    } else {
      // ADD MODE: Pre-fill from source nutritionComponent (when "Add nutritionComponent" from Options) or last nutritionComponent
      const nutritionComponents = nutritionFood.nutritionComponents || [];
      const sourceNutritionComponent = sourceNutritionComponentForAdd ?? nutritionComponents[nutritionComponents.length - 1];
      // When adding via "Add nutritionComponent" from Options: insert after nutritionComponentInsertIndex → repetitionNumber = nutritionComponentInsertIndex + 2
      const nextSequence = typeof nutritionComponentInsertIndex === 'number' ? nutritionComponentInsertIndex + 2 : nutritionComponents.length + 1;
      
      setSequence(nextSequence);
      
      if (sourceNutritionComponent) {
        // Pre-fill with the selected exercise's data (when adding via Options) or last nutritionComponent
        setDistance(sourceNutritionComponent.distance?.toString() || '');
        setSpeed(sourceNutritionComponent.speed || '');
        setStyle(sourceNutritionComponent.style || '');
        setPause(sourceNutritionComponent.pause || (sport === 'BODY_BUILDING' ? "1'30\"" : ''));
        setPace(sourceNutritionComponentForAdd ? '' : (sourceNutritionComponent.pace || ''));
        setTime(sourceNutritionComponentForAdd ? '' : (sourceNutritionComponent.time || ''));
        setNotes('');
        setAlarm(sourceNutritionComponent.alarm?.toString() || '');
        setSound(sourceNutritionComponent.sound || 'Beep');
        setMacroFinal(sourceNutritionComponent.macroFinal || "0'");
        setReps(sourceNutritionComponent.reps?.toString() || '');
        setWeight(sourceNutritionComponent.weight || '');
        setTools(sourceNutritionComponent.tools || '');
        setMuscularSector(sourceNutritionComponent.muscularSector || '');
        setExercise(sourceNutritionComponent.exercise || '');
        setRestType(sourceNutritionComponent.restType || '');
        setR1(sourceNutritionComponent.r1 || '');
        setR2(sourceNutritionComponent.r2 || '');
      } else {
        // No source nutritionComponent, inherit from nutritionFood
        setDistance(nutritionFood.distance?.toString() || '');
        setSpeed(nutritionFood.speed || '');
        setStyle(nutritionFood.style || '');
        setPause(nutritionFood.pause || (sport === 'BODY_BUILDING' ? "1'30\"" : ''));
        setPace('');
        setTime('');
        setNotes('');
        setAlarm('');
        setSound('Beep');
        setMacroFinal("0'");
        setReps('');
        setWeight('');
        setTools('');
        setMuscularSector('');
        setExercise('');
        setRestType('');
        setR1('');
        setR2('');
      }
    }
  }, [mode, existingNutritionComponent, nutritionFood, sourceNutritionComponentForAdd, nutritionComponentInsertIndex, isOpen, sport]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Distance-based sports (SWIM, BIKE, RUN, ROWING, SKATE, SKI, SNOWBOARD)
    const distanceBasedSports = ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD'];
    
    if (sport === 'BODY_BUILDING') {
      // Body building requires reps
      if (!reps) newErrors.reps = 'Reps is required';
    } else if (distanceBasedSports.includes(sport)) {
      // Distance-based sports require distance
      if (!distance) newErrors.distance = 'Distance is required';
    } else {
      // Tools-based sports (Gymnastic, Stretching, Pilates, Yoga, etc.) require reps
      if (!reps) newErrors.reps = 'Reps is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // For manual nutritionComponents, skip validation
    if (!isManualNutritionFood || mode !== 'edit') {
      if (!validateForm()) return;
    }

    setIsSaving(true);

    try {
      // For manual nutrition_components in edit mode, preserve all existing data and only update notes
      const nutritionComponentData = (isManualNutritionFood && mode === 'edit' && existingNutritionComponent) ? {
        repetitionNumber: existingNutritionComponent.repetitionNumber,
        distance: existingNutritionComponent.distance,
        speed: existingNutritionComponent.speed,
        style: existingNutritionComponent.style,
        pace: existingNutritionComponent.pace,
        time: existingNutritionComponent.time,
        pause: existingNutritionComponent.pause,
        macroFinal: existingNutritionComponent.macroFinal,
        alarm: existingNutritionComponent.alarm,
        sound: existingNutritionComponent.sound,
        notes, // Updated notes value
        reps: existingNutritionComponent.reps,
        weight: existingNutritionComponent.weight,
        muscularSector: existingNutritionComponent.muscularSector,
        exercise: existingNutritionComponent.exercise,
        restType: existingNutritionComponent.restType,
        tools: existingNutritionComponent.tools,
        r1: existingNutritionComponent.r1,
        r2: existingNutritionComponent.r2,
        status: existingNutritionComponent.status,
        nutritionFoodId: nutritionFood.id
      } : {
        repetitionNumber: sequence,
        distance: distance ? parseInt(distance) : null,
        speed,
        style,
        pace,
        time,
        // BODY_BUILDING: default pause to 1'30" when adding if not set (fixes "Pause will not be put in the cell")
        pause: sport === 'BODY_BUILDING' && !pause ? "1'30\"" : pause,
        macroFinal,
        alarm: alarm ? parseInt(alarm) : null,
        sound,
        notes,
        // BODY_BUILDING specific
        reps: reps ? parseInt(reps) : null,
        weight: weight || null,
        muscularSector: muscularSector || null,
        exercise: exercise || null,
        restType: restType || null,
        // OTHER SPORTS specific
        tools: tools || null,
        // BIKE specific
        r1: r1 || null,
        r2: r2 || null,
        status: existingNutritionComponent?.status || 'PENDING',
        isSkipped: false,
        isDisabled: false,
        nutritionFoodId: nutritionFood.id
      };

      console.log('📤 Saving nutritionComponent:', nutritionComponentData);
      console.log('📝 Manual nutritionComponent notes being saved:', notes);
      console.log('🔍 Is manual nutritionFood:', isManualNutritionFood, 'Mode:', mode);
      console.log('🔍 Existing nutritionComponent ID:', existingNutritionComponent?.id);
      
      // Check if this is a temporary ID (for old manual nutritionFoods without real nutritionComponents)
      const isTempId = existingNutritionComponent?.id && (
        typeof existingNutritionComponent.id === 'string' && (
          existingNutritionComponent.id.startsWith('temp-') || 
          existingNutritionComponent.id === 'temp-manual-nutritionComponent'
        )
      );
      
      if (isTempId && isManualNutritionFood && mode === 'edit') {
        console.log('⚠️ Detected temporary nutritionComponent ID. Creating new nutritionComponent for this manual nutritionFood.');
        
        // Create a new nutritionComponent instead of updating the non-existent one
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Authentication required');
          setIsSaving(false);
          return;
        }
        
        try {
          // Create new nutritionComponent with notes
          const response = await fetch('/api/nutrition/nutrition_components', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              nutritionFoodId: nutritionFood.id,
              repetitionNumber: 1,
              distance: nutritionFood.distance || 0,
              notes: notes,
              status: 'PENDING',
              isSkipped: false,
              isDisabled: false
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to create nutritionComponent');
          }
          
          console.log('✅ Created new nutritionComponent for manual nutritionFood');
          onClose();
          
          // Refresh the page to show the new nutritionComponent
          window.location.reload();
        } catch (error) {
          console.error('Error creating nutritionComponent:', error);
          alert('Failed to save summary. Please try again.');
        } finally {
          setIsSaving(false);
        }
        return;
      }
      
      await onSave(nutritionComponentData);
      onClose();
    } catch (error) {
      console.error('Error saving nutritionComponent:', error);
      setErrors({ general: 'Failed to save nutritionComponent' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {mode === 'add' ? 'Add Exercise' : 'Edit Exercise'}
              {circuitMetadata && (
                <span className="ml-3 text-sm font-normal bg-white/20 px-3 py-1 rounded">
                  Circuit {circuitMetadata.circuitLetter} • Series {circuitMetadata.localSeriesNumber || circuitMetadata.seriesNumber} • Station {circuitMetadata.stationNumber}
                </span>
              )}
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              NutritionFood: {stripCircuitTags(nutritionFood.description) || 'No description'}
            </p>
            {circuitMetadata && (
              <p className="text-xs text-blue-100 mt-1">
                📍 {circuitMetadata.sector ? `Sector: ${circuitMetadata.sector}` : 'No sector assigned'}
              </p>
            )}
            {isManualNutritionFood && mode === 'edit' && (
              <p className="text-xs text-yellow-200 font-semibold mt-1">
                ⚠️ Manual NutritionComponent - Only summary can be edited
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          {/* For manual nutrition_components in edit mode, show only the summary field */}
          {isManualNutritionFood && mode === 'edit' ? (
            <div className="h-full flex flex-col">
              <label className="block text-lg font-bold text-gray-700 mb-3">
                Summary / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full flex-1 px-4 py-3 text-base border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter summary or notes for this manual nutritionComponent..."
                style={{ minHeight: '400px' }}
              />
            </div>
          ) : (
            <>
          {/* Sequence */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Sequence: <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-blue-600 font-normal">
                {mode === 'add' ? '(New nutritionComponent will be inserted after this position)' : '(Position in sequence)'}
              </span>
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={sequence}
                onChange={(e) => setSequence(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={(nutritionFood.nutritionComponents?.length || 0) + (mode === 'add' ? 1 : 0)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <CopyButton fieldName="repetitionNumber" fieldValue={sequence} disabled={true} />
              <span className="ml-2 text-sm text-gray-500">
                (#{sequence} of {(nutritionFood.nutritionComponents?.length || 0) + (mode === 'add' ? 1 : 0)})
              </span>
            </div>
          </div>

          {/* Single Column Layout - matches table column order (left to right = top to bottom) */}
          <div className="space-y-3">

            {sport === 'BODY_BUILDING' ? (
              <>
                {/* BODY BUILDING - Vertical layout matching table columns */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Muscular Sector:
                  </label>
                  <div className="flex items-center">
                    <select
                      value={muscularSector}
                      onChange={(e) => setMuscularSector(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {(config as any).muscularSectors?.map((m: string) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <CopyButton fieldName="muscularSector" fieldValue={muscularSector} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Exercise:
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={exercise}
                      onChange={(e) => setExercise(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Bench Press, Squat..."
                    />
                    <CopyButton fieldName="exercise" fieldValue={exercise} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reps: <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="12"
                    />
                    <CopyButton fieldName="reps" fieldValue={reps} />
                  </div>
                  {errors.reps && <p className="mt-1 text-xs text-red-500">{errors.reps}</p>}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Weight:
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="12 kg, 50 lbs, etc."
                    />
                    <CopyButton fieldName="weight" fieldValue={weight} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tempo/Speed:
                  </label>
                  <div className="flex items-center">
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {config.speeds.map((s: string) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <CopyButton fieldName="speed" fieldValue={speed} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Check if it's a tools-based sport (not distance-based) */}
                {(() => {
                  const distanceBasedSports = ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                  const isDistanceBased = distanceBasedSports.includes(sport);
                  const hasTools = !isDistanceBased;
                  
                  if (hasTools) {
                    // Sports with tools (Gymnastic, Stretching, Pilates, Yoga, etc.)
                    return (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Reps: <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              value={reps}
                              onChange={(e) => setReps(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              placeholder="12"
                            />
                            <CopyButton fieldName="reps" fieldValue={reps} />
                          </div>
                          {errors.reps && <p className="mt-1 text-xs text-red-500">{errors.reps}</p>}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Tools:
                          </label>
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={tools}
                              onChange={(e) => setTools(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter tools (alphanumeric)"
                            />
                            <CopyButton fieldName="tools" fieldValue={tools} />
                          </div>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
                
                {/* Distance-based sports (SWIM, BIKE, RUN, ROWING, SKATE, SKI, SNOWBOARD, WALKING, HIKING) */}
                {(() => {
                  const distanceBasedSports = ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                  const isDistanceBased = distanceBasedSports.includes(sport);
                  
                  if (!isDistanceBased) return null;
                  
                  return (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Distance (m): <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center">
                          {'distances' in config && (
                            <select
                              value={distance}
                              onChange={(e) => setDistance(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {config.distances.map((d: string) => (
                                <option key={d} value={d}>
                                  {d}m
                                </option>
                              ))}
                            </select>
                          )}
                          <CopyButton fieldName="distance" fieldValue={distance} />
                        </div>
                        {errors.distance && <p className="mt-1 text-xs text-red-500">{errors.distance}</p>}
                      </div>

                      {/* Style - Only for SWIM, RUN, WALKING, HIKING */}
                      {(sport === 'SWIM' || sport === 'RUN' || sport === 'WALKING' || sport === 'HIKING') && 'styles' in config && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Style:</label>
                          <div className="flex items-center">
                            <select
                              value={style}
                              onChange={(e) => setStyle(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {config.styles.map((s: string) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <CopyButton fieldName="style" fieldValue={style} />
                          </div>
                        </div>
                      )}

                      {/* Speed - For all distance-based sports */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Speed/Zone:</label>
                        <div className="flex items-center">
                          <select
                            value={speed}
                            onChange={(e) => setSpeed(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select...</option>
                            {config.speeds.map((s: string) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <CopyButton fieldName="speed" fieldValue={speed} />
                        </div>
                      </div>
                      
                      {/* R1, R2 - Only for BIKE */}
                      {sport === 'BIKE' && 'ranges' in config && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">R1 (Range 1):</label>
                            <div className="flex items-center">
                              <select
                                value={r1}
                                onChange={(e) => setR1(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                {config.ranges.map((r: string) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                              <CopyButton fieldName="r1" fieldValue={r1} />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">R2 (Range 2):</label>
                            <div className="flex items-center">
                              <select
                                value={r2}
                                onChange={(e) => setR2(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select...</option>
                                {config.ranges.map((r: string) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                              <CopyButton fieldName="r2" fieldValue={r2} />
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            
            {/* Timing Section - Only for distance-based sports */}
            {sport !== 'BODY_BUILDING' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    TIME <span className="text-gray-400 font-normal text-[10px]">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={time}
                      onChange={handleTimeChange}
                      onBlur={handleTimeBlur}
                      autoComplete="off"
                      className="flex-1 px-3 py-2 text-base border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="123456"
                    />
                    <CopyButton fieldName="time" fieldValue={time} />
                  </div>
                  <p className="mt-1 text-[10px] text-blue-600">
                    ⚡ Fast input: Type <strong>123456</strong> → <strong>12h34'56"</strong>
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pace/100: <span className="text-[10px] text-green-600 font-semibold">✨ Flexible input</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pace}
                      onChange={handlePaceChange}
                      onBlur={handlePaceBlur}
                      autoComplete="off"
                      className="flex-1 px-3 py-2 text-lg border-2 border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono bg-green-50"
                      placeholder="1234"
                    />
                    <CopyButton fieldName="pace" fieldValue={pace} />
                  </div>
                  <p className="mt-1 text-[10px] text-green-600">
                    ⚡ Fast input: Type <strong>1234</strong> → <strong>12'34"</strong>
                  </p>
                </div>
              </>
            )}
            
            {/* Rest Type - Only for BODY_BUILDING */}
            {sport === 'BODY_BUILDING' && 'restTypes' in config && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rest Type:</label>
                <div className="flex items-center">
                  <select
                    value={restType}
                    onChange={(e) => setRestType(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {config.restTypes.map((rt: string) => (
                      <option key={rt} value={rt}>
                        {rt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <CopyButton fieldName="restType" fieldValue={restType} />
                </div>
              </div>
            )}
            
            {/* Pause */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pause:</label>
              <div className="flex items-center">
                <select
                  value={pause}
                  onChange={(e) => setPause(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {config.pauses.map((p: string) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <CopyButton fieldName="pause" fieldValue={pause} />
              </div>
            </div>
            
            {/* Macro Final */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Macro Final:</label>
              <div className="flex items-center">
                <select
                  value={macroFinal}
                  onChange={(e) => setMacroFinal(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  {MACRO_FINALS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <CopyButton fieldName="macroFinal" fieldValue={macroFinal} />
              </div>
            </div>
            
            {/* Alarm */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alarm:</label>
              <div className="flex items-center">
                <select
                  value={alarm}
                  onChange={(e) => setAlarm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {ALARMS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <CopyButton fieldName="alarm" fieldValue={alarm} />
              </div>
            </div>
            
            {/* Sound */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sound:</label>
              <div className="flex items-center">
                <select
                  value={sound}
                  onChange={(e) => setSound(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  {SOUNDS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <CopyButton fieldName="sound" fieldValue={sound} />
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                Notes:
                <CopyButton fieldName="notes" fieldValue={notes} />
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes or special instructions..."
              />
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : mode === 'add' ? 'Add NutritionComponent' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

