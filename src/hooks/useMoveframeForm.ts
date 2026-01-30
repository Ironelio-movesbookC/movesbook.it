import React, { useState, useEffect, useRef } from 'react';
import { getSportConfig, sportNeedsExerciseName, DISTANCE_BASED_SPORTS, AEROBIC_SPORTS, isSeriesBasedSport, isAerobicSport, getRepsLabel } from '@/constants/moveframe.constants';

export interface IndividualRepetitionPlan {
  index: number;
  speed?: string; // For distance-based sports
  time?: string; // For distance-based sports
  pause: string;
  reps?: string; // For BODY_BUILDING and other sports with tools
  weight?: string; // For BODY_BUILDING
  tools?: string; // For Gymnastic, Stretching, Pilates, Yoga, etc.
  macroFinal?: string; // Macro final value per repetition
  // New fields for enhanced planning
  strokes?: string; // Strokes for work section
  watts?: string; // Watts for work section
  restType?: string; // Rest type for pause section
  pauseMin?: string; // Pause minimum for pause section
  pauseMode?: string; // Mode for pause section
  pausePace?: string; // Pace for pause section
}

export interface MoveframeFormData {
  // Basic fields
  sport: string;
  type: 'STANDARD' | 'BATTERY' | 'ANNOTATION';
  manualMode: boolean;
  manualPriority: boolean;
  manualInputType: 'meters' | 'time'; // For aerobic sports in manual mode
  
  // Planning mode
  planningMode: 'all' | 'individual'; // 'all' = Plan for all, 'individual' = Plan one by one
  individualPlans: IndividualRepetitionPlan[]; // Individual settings per repetition
  
  // Standard fields
  distance: string;
  customDistance: string;
  repetitions: string;
  speed: string;
  style: string;
  pace: string;
  time: string;
  rowPerMin: string; // Row/min for ROWING sport (range 10-99)
  note: string;
  pause: string;
  restType: string; // 'Set time', 'Restart time', or 'Restart pulse'
  repsType: string; // 'Reps' or 'Time' (for non-distance sports)
  macroFinal: string;
  alarm: string;
  sound: string;
  reps: string;
  r1: string;
  r2: string;
  
  // Break mode fields (for distance-based sports)
  breakMode: string;
  breakTime: string;
  breakFromStandstill: string;
  breakVel100: string;
  
  // New fields for enhanced work and pause planning
  strokes: string;
  watts: string;
  pauseMin: string;
  pauseMode: string;
  pausePace: string;
  
  // Body building specific fields
  muscularSector: string;
  exercise: string;
  appliedTechnique: string; // Body Building technique from settings
  
  // Annotation fields
  annotationText: string;
  annotationBgColor: string;
  annotationTextColor: string;
  annotationBold: boolean; // Text style for annotation
  
  // Battery fields
  batteryCount: number;
  batterySequence: any[];
  
  // Manual mode
  manualContent: string;
}

interface UseMoveframeFormProps {
  mode: 'add' | 'edit';
  existingMoveframe?: any;
  isOpen: boolean;
  workout: any;
  day: any;
}

/**
 * Custom hook for managing moveframe form state and validation
 * Extracted from AddEditMoveframeModal.tsx
 */
export function useMoveframeForm({
  mode,
  existingMoveframe,
  isOpen,
  workout,
  day
}: UseMoveframeFormProps) {
  // ==================== FORM STATE ====================
  // Track which moveframe has been loaded to prevent unnecessary reloads
  const loadedMoveframeId = useRef<string | null>(null);
  
  // Default sport: use first sport from workout.sports if available, otherwise 'SWIM'
  const getDefaultSport = () => {
    if (workout?.sports && workout.sports.length > 0) {
      return workout.sports[0].sport || 'SWIM';
    }
    return 'SWIM';
  };
  
  const [sport, setSport] = useState<string>(getDefaultSport());
  const [type, setType] = useState<'STANDARD' | 'BATTERY' | 'ANNOTATION'>('STANDARD');
  const [manualMode, setManualMode] = useState(false);
  const [manualPriority, setManualPriority] = useState(false);
  const [manualInputType, setManualInputTypeInternal] = useState<'meters' | 'time'>('meters');
  const [sectionId, setSectionId] = useState<string>(''); // Workout section for ALL sports
  
  // Wrapper for setManualInputType with logging
  const setManualInputType = (value: 'meters' | 'time') => {
    console.log('🎯 [SETTER] setManualInputType called with:', value);
    console.log('🎯 [SETTER] Current value before change:', manualInputType);
    console.log('🎯 [SETTER] Stack trace:', new Error().stack);
    setManualInputTypeInternal(value);
    console.log('🎯 [SETTER] setManualInputType completed');
  };

  // Planning mode
  const [planningMode, setPlanningMode] = useState<'all' | 'individual'>('all');
  const [individualPlans, setIndividualPlans] = useState<IndividualRepetitionPlan[]>([]);

  // Standard fields
  const [distance, setDistance] = useState('');
  const [customDistance, setCustomDistance] = useState('');
  const [repetitions, setRepetitions] = useState('1');
  const [speed, setSpeed] = useState('A2');
  const [style, setStyle] = useState('');
  const [pace, setPace] = useState('');
  const [time, setTime] = useState('');
  const [rowPerMin, setRowPerMin] = useState(''); // Row/min for ROWING sport (range 10-99)
  const [note, setNote] = useState('');
  const [pause, setPause] = useState('20"');
  const [restType, setRestType] = useState('Set time'); // Rest type: 'Set time', 'Restart time', 'Restart pulse'
  const [repsType, setRepsType] = useState('Reps'); // Reps type: 'Reps' or 'Time' (for non-distance sports)
  const [macroFinal, setMacroFinal] = useState("0'");
  const [alarm, setAlarm] = useState('-1');
  const [sound, setSound] = useState('Beep');
  const [reps, setReps] = useState('');
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');
  
  // Break mode fields (for distance-based sports)
  const [breakMode, setBreakMode] = useState('');
  const [breakTime, setBreakTime] = useState('');
  const [breakFromStandstill, setBreakFromStandstill] = useState('');
  const [breakVel100, setBreakVel100] = useState('');
  
  // New fields for enhanced work and pause planning
  const [strokes, setStrokes] = useState('');
  const [watts, setWatts] = useState('');
  const [pauseMin, setPauseMin] = useState('');
  const [pauseMode, setPauseMode] = useState('');
  const [pausePace, setPausePace] = useState('');
  
  // Body building specific fields
  const [muscularSector, setMuscularSector] = useState('');
  const [exercise, setExercise] = useState('');
  const [appliedTechnique, setAppliedTechnique] = useState('');

  // Aerobic sports specific fields
  const [aerobicSeries, setAerobicSeries] = useState('1'); // Series/Batteries/Groups for aerobic sports (range 1-9, default 1)

  // Annotation fields
  const [annotationText, setAnnotationText] = useState('');
  const [annotationBgColor, setAnnotationBgColor] = useState('#5168c2');
  const [annotationTextColor, setAnnotationTextColor] = useState('#000000');
  const [annotationBold, setAnnotationBold] = useState(false);

  // Battery fields
  const [batteryCount, setBatteryCount] = useState(3);
  const [batterySequence, setBatterySequence] = useState<any[]>([]);

  // Manual mode fields
  const [manualContent, setManualContent] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // ==================== COMPUTED VALUES ====================
  const sportConfig = getSportConfig(sport);

  // ==================== EFFECTS ====================
  
  /**
   * Set default distance when sport changes to a distance-based sport
   */
  useEffect(() => {
    // Only set default distance if:
    // 1. Modal is open
    // 2. Sport is distance-based
    // 3. Current distance is empty
    // 4. Not in Time mode
    // 5. Not in manual mode
    if (isOpen && !manualMode && repsType !== 'Time') {
      const distanceBasedSports = ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
      const isDistanceBased = distanceBasedSports.includes(sport);
      
      if (isDistanceBased && !distance && sportConfig && 'meters' in sportConfig) {
        const meters = (sportConfig as any).meters;
        if (meters && Array.isArray(meters) && meters.length > 0) {
          // Set first available distance as default (usually 100m)
          console.log('🏊 Setting default distance for', sport, ':', meters[0]);
          setDistance(meters[0]);
        }
      }
    }
  }, [sport, isOpen, manualMode, repsType, distance, sportConfig]);

  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setSport(getDefaultSport()); // Use workout's first sport as default
    setType('STANDARD');
    setManualMode(false);
    setManualPriority(false);
    setManualInputType('meters'); // Reset to default meters
    setSectionId(''); // Reset workout section
    setPlanningMode('all'); // Reset planning mode
    setIndividualPlans([]); // Clear individual plans
    setDistance('');
    setCustomDistance('');
    setRepetitions('1');
    setSpeed('A2');
    setStyle('');
    setPace('');
    setTime('');
    setRowPerMin(''); // Reset Row/min
    setNote('');
    setPause('20"');
    setRestType('Set time'); // Default rest type
    setRepsType('Reps'); // Default reps type
    setMacroFinal("0'");
    setAlarm('-1');
    setSound('Beep');
    setReps('');
    setR1('');
    setR2('');
    setBreakMode('');
    setBreakTime('');
    setBreakFromStandstill('');
    setBreakVel100('');
    setStrokes('');
    setWatts('');
    setPauseMin('');
    setPauseMode('');
    setPausePace('');
    setMuscularSector('');
    setExercise('');
    setAppliedTechnique('');
    setAerobicSeries('1');
    setAnnotationText('');
    setAnnotationBgColor('#5168c2');
    setAnnotationTextColor('#000000');
    setBatteryCount(3);
    setBatterySequence([]);
    setManualContent('');
    setErrors({});
    loadedMoveframeId.current = null; // Reset loaded moveframe tracking
  };

  /**
   * Calculate total distance (distance * repetitions)
   */
  const calculateTotalDistance = () => {
    const dist = distance === 'custom' ? parseInt(customDistance) || 0 : parseInt(distance) || 0;
    const repsCount = parseInt(repetitions) || 1;
    return dist * repsCount;
  };

  /**
   * Calculate estimated time based on pace and distance
   */
  const calculateEstimatedTime = () => {
    if (!pace || !distance) return '';
    const totalDist = calculateTotalDistance();
    const [min, sec] = pace.split(':').map(p => parseInt(p) || 0);
    const paceSeconds = min * 60 + sec;
    const totalSeconds = (paceSeconds / 100) * totalDist;
    const estMin = Math.floor(totalSeconds / 60);
    const estSec = Math.floor(totalSeconds % 60);
    return `${estMin}:${estSec.toString().padStart(2, '0')}`;
  };

  /**
   * Check if sport supports individual planning (all sports now support it)
   */
  const supportsIndividualPlanning = () => {
    // All sports now support individual planning
    return true;
  };

  /**
   * Check if can show individual planning (sport supports it AND reps <= 12)
   */
  const canShowIndividualPlanning = () => {
    const repsCount = parseInt(repetitions) || 0;
    return supportsIndividualPlanning() && repsCount > 0 && repsCount <= 12;
  };

  /**
   * Initialize individual plans array based on repetitions count
   */
  const initializeIndividualPlans = (repsCount: number) => {
    const plans: IndividualRepetitionPlan[] = [];
    const distanceBasedSports = ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD'];
    const isBodyBuilding = sport === 'BODY_BUILDING';
    const isToolsBased = !distanceBasedSports.includes(sport) && !isBodyBuilding;
    
    for (let i = 0; i < repsCount; i++) {
      const plan: IndividualRepetitionPlan = {
        index: i + 1,
        pause: pause || '20"',
        macroFinal: macroFinal || "0'",
        // Initialize new fields
        strokes: strokes || '',
        watts: watts || '',
        restType: restType || 'Set time',
        pauseMin: pauseMin || '',
        pauseMode: pauseMode || '',
        pausePace: pausePace || ''
      };
      
      if (isBodyBuilding) {
        // BODY_BUILDING: reps, weight
        plan.reps = reps || '12';
        plan.weight = ''; // Start blank, user can enter 0-9999
      } else if (isToolsBased) {
        // TOOLS-BASED: reps, tools
        plan.reps = repetitions || '1'; // Use repetitions from moveframe
        plan.tools = '';
      } else {
        // DISTANCE-BASED: speed, time (time should be loaded from pace field, not time field)
        plan.speed = speed || 'A2';
        plan.time = pace || time || '0h05\'30"'; // Load from pace first, then time, then default
      }
      
      plans.push(plan);
    }
    setIndividualPlans(plans);
  };

  /**
   * Update an individual plan value
   * If updating the first row (index 0), automatically copy the value to all subsequent rows
   */
  const updateIndividualPlan = (index: number, field: 'speed' | 'time' | 'pause' | 'reps' | 'weight' | 'tools' | 'macroFinal' | 'strokes' | 'watts' | 'restType' | 'pauseMin' | 'pauseMode' | 'pausePace', value: string) => {
    // Force immediate update without batching
    setIndividualPlans(prev => {
      const updated = [...prev];
      
      // Update the specified row - create a new object reference to force re-render
      if (updated[index]) {
        updated[index] = { 
          ...updated[index], 
          [field]: value 
        };
      }
      
      // If updating the first row (index 0), copy the value to all subsequent rows (2nd to last)
      if (index === 0 && updated.length > 1) {
        for (let i = 1; i < updated.length; i++) {
          updated[i] = { ...updated[i], [field]: value };
        }
      }
      
      // Return a completely new array to ensure React detects the change
      return [...updated];
    });
  };

  /**
   * Validate form fields
   */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Skip validation for ANNOTATION type - only annotation text is needed
    if (type === 'ANNOTATION') {
      setErrors(newErrors);
      return true;
    }

    // Skip sport and section validation in manual mode
    if (!manualMode) {
      if (!sport) {
        newErrors.sport = 'Sport is required';
      }

      // Workout Section is required only for STANDARD and BATTERY modes
      if ((type === 'STANDARD' || type === 'BATTERY') && !sectionId) {
        newErrors.sectionId = 'Workout section is required';
      }
    }

    if (type === 'STANDARD' && !manualMode) {
      if (sport === 'BODY_BUILDING') {
        if (!muscularSector) newErrors.muscularSector = 'Muscular sector is required';
        if (!exercise) newErrors.exercise = 'Exercise is required';
        // Reps is only required when execution type is "Reps", not when it's "Time/Minutes"
        if (repsType !== 'Time' && repsType !== 'Minutes' && !reps) {
          newErrors.reps = 'Reps is required';
        }
        // For Body Building, repetitions = number of series (1-99)
        if (!repetitions || parseInt(repetitions) < 1 || parseInt(repetitions) > 99) {
          newErrors.repetitions = 'Number of series must be between 1 and 99';
        }
      } else if (sport === 'FREE_MOVES') {
        // FREE_MOVES validation
        if (!exercise) newErrors.exercise = 'Exercise is required';
        if (!repetitions || parseInt(repetitions) < 1 || parseInt(repetitions) > 99) {
          newErrors.repetitions = 'Repetitions must be between 1 and 99';
        }
      } else {
        // Distance-based sports (SWIM, BIKE, RUN, etc.) and other sports
        const distanceBasedSports = ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'];
        const isDistanceBased = distanceBasedSports.includes(sport);
        
        if (isDistanceBased) {
          // Only require distance if repsType is NOT 'Time'
          if (repsType !== 'Time') {
            if (!distance && distance !== 'custom') newErrors.distance = 'Distance is required';
            if (distance === 'custom' && !customDistance) newErrors.customDistance = 'Custom distance is required';
          } else {
            // If repsType is 'Time', require time instead
            if (!time || time === '0h00\'00"0' || time.trim() === '') {
              newErrors.time = 'Time is required when Type of execution is Time';
            }
          }
        }
        
        if (!repetitions || parseInt(repetitions) < 1) {
          newErrors.repetitions = 'Repetitions must be at least 1';
        }
      }
    }

    // Annotation text is optional for all types

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Generate moveframe description based on current fields
   */
  const generateDescription = () => {
    // For ANNOTATION type, return the annotation text
    if (type === 'ANNOTATION') {
      return annotationText || '';
    }

    // For manual mode, return the HTML content as description
    if (manualMode) {
      return manualContent;
    }

    // Use individual plan values if in individual planning mode
    const effectivePause = (planningMode === 'individual' && individualPlans.length > 0) 
      ? individualPlans[0].pause 
      : pause;
    
    const effectiveMacroFinal = (planningMode === 'individual' && individualPlans.length > 0) 
      ? individualPlans[0].macroFinal 
      : macroFinal;

    if (sport === 'BODY_BUILDING') {
      const macroFinalText = effectiveMacroFinal ? ` M${effectiveMacroFinal}` : '';
      const sectorText = muscularSector ? `${muscularSector} - ` : '';
      const exerciseText = exercise || 'Exercise';
      const setsCount = parseInt(repetitions) || 1;
      const repsPerSet = repsType === 'Time' ? (time || '0\'') : (parseInt(reps) || 0);
      const repsLabel = repsType === 'Time' ? time || '0\'' : getRepsLabel(sport);
      const tempoText = speed ? ` ${speed}` : ''; // Speed of execution
      // Format pause text based on rest type
      let pauseText = '';
      if (effectivePause) {
        if (restType === 'Set time') {
          pauseText = ` Pause ${effectivePause}`;
        } else if (restType === 'Restart time') {
          pauseText = ` Restart to ${effectivePause}`;
        } else if (restType === 'Restart pulse') {
          pauseText = ` Restart to ${effectivePause} BPM`;
        } else {
          pauseText = ` Pause ${effectivePause}`;
        }
      }
      // Format: "Shoulders - Bench Press: 3 sets x 10 series Very slow Pause 30" M0'"
      return `${sectorText}${exerciseText}: ${setsCount} sets x ${repsPerSet} ${repsLabel}${tempoText}${pauseText}${macroFinalText}`;
    }

    // Check if this is a distance-based sport
    const isDistanceSport = DISTANCE_BASED_SPORTS.includes(sport as any);
    
    if (isDistanceSport) {
      // Distance-based sports (SWIM, RUN, BIKE, etc.)
      const dist = (distance === 'custom' || distance === 'input') ? customDistance : distance;
      const repsCount = parseInt(repetitions) || 1;
      const repsText = ` x ${repsCount}`; // Always show repetitions
      const styleText = style ? ` ${style}` : '';
      const speedText = speed ? ` ${speed}` : '';
      // Format pause text based on rest type
      let pauseText = '';
      if (effectivePause) {
        if (restType === 'Set time') {
          pauseText = ` Pause ${effectivePause}`;
        } else if (restType === 'Restart time') {
          pauseText = ` Restart to ${effectivePause}`;
        } else if (restType === 'Restart pulse') {
          pauseText = ` Restart to ${effectivePause} BPM`;
        } else {
          pauseText = ` Pause ${effectivePause}`;
        }
      }
      const macroFinalText = effectiveMacroFinal ? ` M${effectiveMacroFinal}` : '';
      
      let baseDescription = `${dist}m${repsText}${styleText}${speedText}${pauseText}${macroFinalText}`;
      
      // Wrap in series format if aerobicSeries > 1
      const aerobicSeriesNum = parseInt(aerobicSeries) || 1;
      if (aerobicSeriesNum > 1 && AEROBIC_SPORTS.includes(sport as any)) {
        baseDescription = `${aerobicSeriesNum} x ( ${baseDescription} )`;
      }
      
      return baseDescription;
    } else {
      // Non-distance sports (series-based) with exercise/drill names
      const exerciseText = exercise || 'Exercise';
      const setsCount = parseInt(repetitions) || 1;
      const repsPerSet = repsType === 'Time' ? (time || '0\'') : (parseInt(reps) || 1);
      const repsTypeText = repsType === 'Time' ? time || '0\'' : getRepsLabel(sport);
      const styleText = style ? ` ${style}` : '';
      const speedText = speed ? ` ${speed}` : '';
      // Format pause text based on rest type
      let pauseText = '';
      if (effectivePause) {
        if (restType === 'Set time') {
          pauseText = ` Pause ${effectivePause}`;
        } else if (restType === 'Restart time') {
          pauseText = ` Restart to ${effectivePause}`;
        } else if (restType === 'Restart pulse') {
          pauseText = ` Restart to ${effectivePause} BPM`;
        } else {
          pauseText = ` Pause ${effectivePause}`;
        }
      }
      const macroFinalText = effectiveMacroFinal ? ` M${effectiveMacroFinal}` : '';
      
      let baseDescription = `${exerciseText}: ${setsCount} sets x ${repsPerSet} ${repsTypeText}${styleText}${speedText}${pauseText}${macroFinalText}`;
      
      // Wrap in series format if aerobicSeries > 1
      const aerobicSeriesNum = parseInt(aerobicSeries) || 1;
      if (aerobicSeriesNum > 1 && AEROBIC_SPORTS.includes(sport as any)) {
        baseDescription = `${aerobicSeriesNum} x ( ${baseDescription} )`;
      }
      
      // Format: "Exercise name: 3 sets x 10 series Pause 30" M0'" (or time value if Time-based)
      return baseDescription;
    }
  };

  /**
   * Build moveframe data object for API submission
   */
  const buildMoveframeData = () => {
    console.log('🔸 [FORM] buildMoveframeData called with:', {
      planningMode,
      individualPlansLength: individualPlans?.length,
      repetitions,
      sport,
      manualMode,
      manualPriority
    });
    // Determine notes value based on mode
    let notesValue = note;
    let descriptionValue = generateDescription();
    
    if (manualMode && manualContent) {
      // For manual mode, clean the content
      // Strip source code tags (pre, code, script, style) and potentially dangerous content
      let cleanedContent = manualContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '')
        .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed[^>]*>/gi, '');
      
      // Use cleaned content as notes (full content)
      notesValue = cleanedContent;
      
      // For description, extract text content and limit to 190 characters (safe for database VARCHAR)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanedContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      const trimmedText = textContent.trim().replace(/\s+/g, ' '); // Normalize whitespace
      descriptionValue = trimmedText.substring(0, 190);
      if (trimmedText.length > 190) {
        descriptionValue += '...';
      }
      
      console.log('📝 [buildMoveframeData] Manual mode content:', {
        cleanedContentLength: cleanedContent.length,
        extractedTextLength: trimmedText.length,
        descriptionValue: descriptionValue,
        notesValueLength: notesValue.length
      });
    }

    // For manual mode, provide defaults for required fields
    const effectiveSport = sport || (manualMode ? 'FREE_MOVES' : 'SWIM');
    const effectiveSectionId = sectionId || null;

    // Calculate distance value - convert to string for storage
    let distanceValue = (distance === 'custom' || distance === 'input') ? customDistance : distance;
    let distanceNum = parseInt(distanceValue) || 0;
    
    // For manual mode with time input, store deciseconds separately
    let manualDistanceDeciseconds = null;
    
    console.log('🔍 [BUILD] Processing distance:', {
      manualMode,
      manualInputType,
      distanceValue,
      isSeriesBased: isSeriesBasedSport(effectiveSport)
    });
    
    if (manualMode && manualInputType === 'time' && !isSeriesBasedSport(effectiveSport)) {
      // First, ensure the time is formatted (in case user didn't blur the field)
      console.log('🕐 [BUILD] Processing TIME input');
      console.log('  Raw distanceValue from state:', distanceValue);
      console.log('  manualInputType:', manualInputType);
      
      const digits = distanceValue.replace(/\D/g, '');
      console.log('  Extracted digits:', digits);
      console.log('  Digits length:', digits.length);
      
      // If empty or zero, skip conversion
      if (!digits || digits === '0') {
        console.log('⚠️ Empty or zero time value, skipping');
        distanceNum = 0;
      } else if (digits && !distanceValue.includes('h')) {
        console.log('  ➡️ Formatting raw digits to time format...');
        // Format the raw digits to time format first
        const len = digits.length;
        let hour = '0', min = '00', sec = '00', ds = '0';
        
        if (len === 1) {
          // 1 digit: 5 → 0h00'00"5
          ds = digits;
        } else if (len === 2) {
          // 2 digits: 12 → 0h00'12"0
          sec = digits;
        } else if (len === 3) {
          // 3 digits: 125 → 0h01'25"0
          min = digits[0];
          sec = digits.slice(1, 3);
        } else if (len === 4) {
          // 4 digits: 1234 → 0h12'34"0
          min = digits.slice(0, 2);
          sec = digits.slice(2, 4);
        } else if (len === 5) {
          // 5 digits: 12345 → 1h23'45"0
          hour = digits[0];
          min = digits.slice(1, 3);
          sec = digits.slice(3, 5);
        } else if (len === 6) {
          // 6 digits: 123456 → 1h23'45"6
          hour = digits[0];
          min = digits.slice(1, 3);
          sec = digits.slice(3, 5);
          ds = digits[5];
        } else {
          // 7+ digits: 1234567 → 12h34'56"7
          hour = digits.slice(0, -5);
          min = digits.slice(-5, -3);
          sec = digits.slice(-3, -1);
          ds = digits.slice(-1);
        }
        
        distanceValue = `${hour}h${min}'${sec}"${ds}`;
        console.log('  ✅ Formatted to:', distanceValue);
      } else {
        console.log('  ℹ️ Already formatted (contains "h"):', distanceValue);
      }
      
      // Now convert time format "1h23'45"6" to deciseconds
      console.log('  🔄 Converting to deciseconds...');
      const timeMatch = distanceValue.match(/(\d+)h(\d+)'(\d+)"(\d)?/);
      console.log('  Regex match result:', timeMatch);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]) || 0;
        const minutes = parseInt(timeMatch[2]) || 0;
        const seconds = parseInt(timeMatch[3]) || 0;
        const deciseconds = parseInt(timeMatch[4]) || 0;
        // Convert to total deciseconds - store separately for manual mode
        manualDistanceDeciseconds = (hours * 36000) + (minutes * 600) + (seconds * 10) + deciseconds;
        console.log('🕐 [BUILD] Converted time to deciseconds:');
        console.log('  Input:', distanceValue);
        console.log('  Hours:', hours, '×', 36000, '=', hours * 36000);
        console.log('  Minutes:', minutes, '×', 600, '=', minutes * 600);
        console.log('  Seconds:', seconds, '×', 10, '=', seconds * 10);
        console.log('  Deciseconds:', deciseconds, '×', 1, '=', deciseconds);
        console.log('  ✅ Total Deciseconds:', manualDistanceDeciseconds);
        // For movelap generation, use 0 (manual mode doesn't need movelaps with real distance)
        distanceNum = 0;
      } else {
        console.log('  ❌ ERROR: Regex did not match! Unable to parse time format.');
        console.log('  Raw distanceValue:', distanceValue);
      }
    }

    const data = {
      sport: effectiveSport,
      type,
      description: descriptionValue,
      
      // Annotation fields (ONLY for ANNOTATION type)
      annotationText: type === 'ANNOTATION' ? (annotationText || null) : null,
      annotationBgColor: type === 'ANNOTATION' ? (annotationBgColor || null) : null,
      annotationTextColor: type === 'ANNOTATION' ? (annotationTextColor || null) : null,
      annotationBold: type === 'ANNOTATION' ? (annotationBold || false) : false,
      
      // Planning mode
      planningMode,
      individualPlans: planningMode === 'individual' ? individualPlans : [],
      
      // Standard fields (for movelap generation)
      distance: distanceNum,
      repetitions: parseInt(repetitions),
      speed,
      style,
      pace,
      time: time || calculateEstimatedTime(),
      rowPerMin: sport === 'ROWING' && rowPerMin ? parseInt(rowPerMin) : null,
      notes: notesValue,
      pause,
      restType: restType || null, // Used for movelap generation, not stored on moveframe
      repsType: repsType || null, // Used for movelap generation, not stored on moveframe
      macroFinal,
      alarm: parseInt(alarm),
      sound,
      reps: effectiveSport === 'BODY_BUILDING' ? parseInt(reps) : null,
      r1: effectiveSport === 'BIKE' ? r1 : null,
      r2: effectiveSport === 'BIKE' ? r2 : null,
      strokes: strokes || null,
      watts: watts || null,
      pauseMin: pauseMin || null,
      pauseMode: pauseMode || null,
      pausePace: pausePace || null,
      muscularSector: effectiveSport === 'BODY_BUILDING' ? muscularSector : null,
      exercise: sportNeedsExerciseName(effectiveSport) ? exercise : null,
      appliedTechnique: appliedTechnique || null, // Save technique for ANY sport (not just BODY_BUILDING)
      aerobicSeries: parseInt(aerobicSeries) || 1, // Series/Batteries/Groups for aerobic sports
      sectionId: effectiveSectionId, // Workout section (for ALL sports)
      
      // Manual mode
      manualMode,
      manualPriority,
      manualInputType, // For aerobic sports: 'meters' or 'time'
      manualContent: manualMode ? manualContent : null,
      // Manual mode specific fields for Moveframe model (different from movelap generation fields above)
      manualRepetitions: manualMode && isSeriesBasedSport(effectiveSport) ? parseInt(repetitions) : null,
      manualDistance: manualMode && !isSeriesBasedSport(effectiveSport) 
        ? (manualInputType === 'time' ? manualDistanceDeciseconds : distanceNum) 
        : null,
      
      // Metadata
      workoutSessionId: workout.id,
      dayId: day.id
    };
    
    console.log('🔸 [FORM] buildMoveframeData returning:');
    console.log('  Manual Mode:', data.manualMode);
    console.log('  Manual Priority:', data.manualPriority);
    console.log('  ⭐ Manual Input Type (STATE):', manualInputType);
    console.log('  ⭐ Manual Input Type (DATA):', data.manualInputType);
    console.log('  Sport:', data.sport);
    console.log('  Manual Repetitions:', data.manualRepetitions);
    console.log('  📊 Manual Distance (what will be saved):', data.manualDistance);
    console.log('  📝 Distance Value (formatted string):', distanceValue);
    console.log('  🕐 Distance Deciseconds (calculated):', manualDistanceDeciseconds);
    console.log('  🔍 Is manualInputType time?', manualInputType === 'time');
    console.log('  🔍 Should save deciseconds?', manualInputType === 'time' ? 'YES' : 'NO');
    
    // Verify manualInputType is actually being set
    if (data.manualMode && DISTANCE_BASED_SPORTS.includes(data.sport as any)) {
      console.log('🚨 [DEBUG] This is an aerobic sport in manual mode!');
      console.log('🚨 [DEBUG] Expected manualInputType to be saved:', manualInputType);
      console.log('🚨 [DEBUG] Actual manualInputType in data object:', data.manualInputType);
      console.log('🚨 [DEBUG] Are they equal?', manualInputType === data.manualInputType);
    }
    console.log('  Distance (for movelap gen):', data.distance);
    
    return data;
  };

  // ==================== EFFECTS ====================
  
  /**
   * Initialize form with existing data in edit mode
   * Only run when modal first opens to prevent resetting user changes
   */
  const hasResetForAddMode = useRef(false);
  
  useEffect(() => {
    // Reset form when modal closes
    if (!isOpen) {
      console.log('🔄 [FORM] Modal closed, resetting form');
      resetForm();
      loadedMoveframeId.current = null;
      hasResetForAddMode.current = false;
      return;
    }
    
    // Reset form once when entering 'add' mode (only on first open, not on every re-render)
    if (mode === 'add') {
      if (!hasResetForAddMode.current) {
        console.log('🔄 [FORM] First time in add mode, resetting form');
        resetForm();
        loadedMoveframeId.current = null;
        hasResetForAddMode.current = true;
      } else {
        console.log('✋ [FORM] Already reset for add mode, preserving user changes');
      }
      return;
    }
    
    // Load moveframe data only if we haven't loaded this specific moveframe yet
    if (mode === 'edit' && existingMoveframe && loadedMoveframeId.current !== existingMoveframe.id) {
      loadedMoveframeId.current = existingMoveframe.id;
      hasResetForAddMode.current = false; // Clear the add mode flag
      console.log('📝 Loading moveframe for editing:', existingMoveframe);
      
      // Set sport, type, and section
      setSport(existingMoveframe.sport || 'SWIM');
      setType(existingMoveframe.type || 'STANDARD');
      setSectionId(existingMoveframe.sectionId || ''); // Load workout section
      
      // Load aerobic series (for aerobic sports)
      setAerobicSeries(existingMoveframe.aerobicSeries?.toString() || '1');
      
      // Load annotation fields (available for all types)
      setAnnotationText(existingMoveframe.annotationText || '');
      setAnnotationBgColor(existingMoveframe.annotationBgColor || '#5168c2');
      setAnnotationTextColor(existingMoveframe.annotationTextColor || '#ffffff');
      setAnnotationBold(existingMoveframe.annotationBold || false);
      
      // Handle BATTERY type
      if (existingMoveframe.type === 'BATTERY') {
        setBatteryCount(existingMoveframe.movelaps?.length || 3);
        console.log('📝 Loaded BATTERY type');
      }
      // Handle STANDARD type
      else {
        // Extract data from first movelap if available
        const firstMovelap = existingMoveframe.movelaps?.[0];
        
        if (firstMovelap) {
          console.log('📋 Loading data from first movelap:', firstMovelap);
          
          // Distance and repetitions
          setDistance(firstMovelap.distance?.toString() || '100');
          
          // Calculate base repetitions from total movelaps, considering aerobic series
          const totalMovelaps = existingMoveframe.movelaps?.length || 1;
          const loadedAerobicSeries = existingMoveframe.aerobicSeries || 1;
          const baseReps = Math.ceil(totalMovelaps / loadedAerobicSeries);
          setRepetitions(baseReps.toString());
          
          // Speed, style, and notes
          setSpeed(firstMovelap.speed || 'A2');
          setStyle(firstMovelap.style || '');
          setPace(firstMovelap.pace || '');
          setTime(firstMovelap.time || '');
          setNote(firstMovelap.notes || '');
          
          // Rest and alerts
          const loadedPause = firstMovelap.pause || '20"';
          const loadedRestType = firstMovelap.restType || '';
          
          // Clean up pause value for "Restart time" - remove any malformed data
          if (loadedRestType === 'Restart time') {
            // Check if the pause value is malformed (e.g., "0h00'00"123213254")
            // A valid format should be like "1h23'45"6" with reasonable digit counts
            const isValidRestartTime = /^\d{1,2}h\d{2}'\d{2}"\d$/.test(loadedPause);
            
            if (!isValidRestartTime) {
              console.log('⚠️ Clearing malformed restart time:', loadedPause);
              setPause(''); // Clear malformed data
            } else {
              setPause(loadedPause);
            }
          } else {
            setPause(loadedPause);
          }
          
          setRestType(loadedRestType);
          setMacroFinal(firstMovelap.macroFinal || "0'");
          setAlarm(firstMovelap.alarm?.toString() || '-1');
          setSound(firstMovelap.sound || 'Beep');
          
        // Special fields
        setReps(firstMovelap.reps?.toString() || '');
        setR1(firstMovelap.r1 || '');
        setR2(firstMovelap.r2 || '');
        setMuscularSector(firstMovelap.muscularSector || '');
        setExercise(firstMovelap.exercise || '');
        
        // 🔄 RESTORE INDIVIDUAL PLANNING MODE if moveframe was created with "Plan one by one"
        // Check if there are multiple movelaps (2-12) - this indicates potential individual planning
        const movelapsCount = existingMoveframe.movelaps?.length || 0;
        if (movelapsCount >= 2 && movelapsCount <= 12) {
          console.log(`🔍 Checking if moveframe was created with individual planning (${movelapsCount} movelaps)`);
          
          // Check if movelaps have different values (indicating individual planning was used)
          const hasVariedValues = existingMoveframe.movelaps.some((lap: any, index: number) => {
            if (index === 0) return false; // Skip first lap (we compare against it)
            const firstLap = existingMoveframe.movelaps[0];
            
            // Check if ANY value differs from the first lap
            return (
              lap.speed !== firstLap.speed ||
              lap.time !== firstLap.time ||
              lap.pace !== firstLap.pace ||
              lap.pause !== firstLap.pause ||
              lap.reps !== firstLap.reps ||
              lap.weight !== firstLap.weight ||
              lap.tools !== firstLap.tools ||
              lap.macroFinal !== firstLap.macroFinal ||
              lap.strokes !== firstLap.strokes ||
              lap.watts !== firstLap.watts ||
              lap.pauseMin !== firstLap.pauseMin ||
              lap.pauseMode !== firstLap.pauseMode ||
              lap.pausePace !== firstLap.pausePace
            );
          });
          
          if (hasVariedValues) {
            console.log('✅ Detected individual planning! Restoring individual lap data...');
            
            // Set planning mode to 'individual'
            setPlanningMode('individual');
            
            // Restore individual plans from movelaps
            const restoredPlans: IndividualRepetitionPlan[] = existingMoveframe.movelaps.map((lap: any, index: number) => ({
              index: index + 1,
              speed: lap.speed || '',
              time: lap.time || lap.pace || '',
              pause: lap.pause || '20"',
              reps: lap.reps?.toString() || '',
              weight: lap.weight || '',
              tools: lap.tools || '',
              macroFinal: lap.macroFinal || "0'",
              strokes: lap.strokes || '',
              watts: lap.watts || '',
              restType: lap.restType || 'Set time',
              pauseMin: lap.pauseMin || '',
              pauseMode: lap.pauseMode || '',
              pausePace: lap.pausePace || ''
            }));
            
            setIndividualPlans(restoredPlans);
            console.log(`✅ Restored ${restoredPlans.length} individual lap plans`);
          } else {
            console.log('ℹ️ All movelaps have same values - using "Plan for all" mode');
            setPlanningMode('all');
          }
        } else {
          console.log(`ℹ️ ${movelapsCount} movelaps - using "Plan for all" mode`);
          setPlanningMode('all');
        }
        
        } else {
          console.log('⚠️ No movelaps found, loading defaults');
          setDistance('100');
          setRepetitions('1');
          setSpeed('A2');
          setPlanningMode('all');
        }
        
        // Manual content - check both description and notes fields
        // For manual mode, content might be in notes field
        // 2026-01-28 - For manual moveframes, load content from movelap.notes if available
        let manualModeContent = '';
        if (existingMoveframe.manualMode) {
          // Check if there are movelaps and load from the first movelap's notes
          if (existingMoveframe.movelaps && existingMoveframe.movelaps.length > 0) {
            manualModeContent = existingMoveframe.movelaps[0].notes || existingMoveframe.notes || existingMoveframe.description || '';
            console.log('📥 [LOAD] Loading manual content from movelap notes:', manualModeContent.substring(0, 50) + '...');
          } else {
            manualModeContent = existingMoveframe.notes || existingMoveframe.description || '';
            console.log('📥 [LOAD] Loading manual content from moveframe notes/description');
          }
        } else {
          manualModeContent = existingMoveframe.description || '';
        }
        setManualContent(manualModeContent);
        
        // Check if manual mode was used
        const loadedManualMode = existingMoveframe.manualMode || false;
        const loadedManualPriority = existingMoveframe.manualPriority || false;
        const loadedManualInputType = existingMoveframe.manualInputType || 'meters';
        console.log('📥 [LOAD] Loading existing moveframe:');
        console.log('  ID:', existingMoveframe.id);
        console.log('  Letter:', existingMoveframe.letter);
        console.log('  Sport:', existingMoveframe.sport);
        console.log('  Manual Mode (raw):', existingMoveframe.manualMode);
        console.log('  Manual Priority (raw):', existingMoveframe.manualPriority);
        console.log('  Manual Input Type (raw):', existingMoveframe.manualInputType);
        console.log('  Distance (raw):', existingMoveframe.distance);
        console.log('  Repetitions (raw):', existingMoveframe.repetitions);
        setManualMode(loadedManualMode);
        setManualPriority(loadedManualPriority);
        setManualInputType(loadedManualInputType as 'meters' | 'time');
        
        // Load manual mode specific values
        if (loadedManualMode) {
          // Load distance or repetitions based on sport type
          const isSeriesSport = ['BODY_BUILDING', 'GYMNASTIC', 'CALISTHENICS', 'CROSSFIT', 'FUNCTIONAL'].includes(existingMoveframe.sport);
          
          console.log('📥 [LOAD] Loading manual mode values:', {
            isSeriesSport,
            distance: existingMoveframe.distance,
            repetitions: existingMoveframe.repetitions,
            manualInputType: loadedManualInputType
          });
          
          if (isSeriesSport) {
            // Load repetitions for series-based sports
            if (existingMoveframe.repetitions) {
              setRepetitions(existingMoveframe.repetitions.toString());
            }
          } else {
            // Load distance for aerobic sports
            if (existingMoveframe.distance) {
              if (loadedManualInputType === 'time') {
                // Convert deciseconds back to time format
                const deciseconds = existingMoveframe.distance;
                const totalSeconds = Math.floor(deciseconds / 10);
                const ds = deciseconds % 10;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                const timeFormatted = `${hours}h${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"${ds}`;
                console.log('🕐 [LOAD] Converting deciseconds to time:');
                console.log('  Deciseconds:', deciseconds);
                console.log('  Total Seconds:', totalSeconds);
                console.log('  Hours:', hours);
                console.log('  Minutes:', minutes);
                console.log('  Seconds:', seconds);
                console.log('  DS:', ds);
                console.log('  Time Formatted:', timeFormatted);
                setDistance(timeFormatted);
              } else {
                // Load meters as-is
                console.log('📏 [LOAD] Loading meters:', existingMoveframe.distance);
                setDistance(existingMoveframe.distance.toString());
              }
            }
          }
        }
        
        console.log('✅ [LOAD] Set manualPriority state to:', loadedManualPriority);
      }
    }
    // If we've already loaded this moveframe, do nothing to preserve user changes
  }, [mode, existingMoveframe, isOpen, workout?.id]); // Reset when workout changes!

  /**
   * Initialize individual plans when planning mode changes to 'individual'
   * or when repetitions change while in individual planning mode
   */
  useEffect(() => {
    if (planningMode === 'individual' && canShowIndividualPlanning()) {
      const baseReps = parseInt(repetitions) || 0;
      const seriesMultiplier = AEROBIC_SPORTS.includes(sport as any) ? (parseInt(aerobicSeries) || 1) : 1;
      const repsCount = baseReps * seriesMultiplier;
      
      // Only initialize if plans array is empty or different size
      if (individualPlans.length !== repsCount) {
        initializeIndividualPlans(repsCount);
      }
    }
  }, [planningMode, repetitions, aerobicSeries, sport]);

  /**
   * Reset distance field when manual input type changes
   */
  useEffect(() => {
    // Skip initial load and when editing existing moveframe
    if (!isOpen || mode === 'edit') return;
    
    // Clear distance when switching input types to avoid confusion
    if (manualMode) {
      setDistance('');
    }
  }, [manualInputType]);

  /**
   * Clear pause field when rest type changes to avoid carrying over invalid formats
   */
  useEffect(() => {
    // Skip initial load (only act on user changes)
    if (!isOpen) return;
    
    // When user changes to "Restart time", clear the field for fresh input
    if (restType === 'Restart time' && pause && !/^\d{1,2}h\d{2}'\d{2}"\d$/.test(pause)) {
      setPause('');
    }
  }, [restType]);

  // ==================== RETURN VALUES ====================
  return {
    // State values
    formData: {
      sport,
      type,
      manualMode,
      manualPriority,
      manualInputType, // For aerobic sports: 'meters' or 'time'
      sectionId, // Workout section for ALL sports
      planningMode, // Planning mode: 'all' or 'individual'
      individualPlans, // Individual repetition plans
      distance,
      customDistance,
      repetitions,
      speed,
      style,
      pace,
      time,
      rowPerMin, // Row/min for ROWING
      note,
      pause,
      restType, // Rest type selection
      repsType, // Reps type selection (Reps or Time)
      macroFinal,
      alarm,
      sound,
      reps,
      r1,
      r2,
      breakMode,
      breakTime,
      breakFromStandstill,
      breakVel100,
      strokes,
      watts,
      pauseMin,
      pauseMode,
      pausePace,
      muscularSector,
      exercise,
      appliedTechnique,
      aerobicSeries,
      annotationText,
      annotationBgColor,
      annotationTextColor,
      annotationBold,
      batteryCount,
      batterySequence,
      manualContent
    },
    
    // State setters
    setters: {
      setSport,
      setType,
      setManualMode,
      setManualPriority,
      setManualInputType, // Manual input type setter
      setSectionId, // Workout section setter for ALL sports
      setPlanningMode, // Planning mode setter
      setIndividualPlans, // Individual plans setter
      setDistance,
      setCustomDistance,
      setRepetitions,
      setSpeed,
      setStyle,
      setPace,
      setTime,
      setRowPerMin, // Row/min setter
      setNote,
      setPause,
      setRestType, // Rest type setter
      setRepsType, // Reps type setter
      setMacroFinal,
      setAlarm,
      setSound,
      setReps,
      setR1,
      setR2,
      setBreakMode,
      setBreakTime,
      setBreakFromStandstill,
      setBreakVel100,
      setStrokes,
      setWatts,
      setPauseMin,
      setPauseMode,
      setPausePace,
      setMuscularSector,
      setExercise,
      setAppliedTechnique,
      setAerobicSeries,
      setAnnotationText,
      setAnnotationBgColor,
      setAnnotationTextColor,
      setAnnotationBold,
      setBatteryCount,
      setBatterySequence,
      setManualContent
    },
    
    // Computed values
    sportConfig,
    totalDistance: calculateTotalDistance(),
    estimatedTime: calculateEstimatedTime(),
    description: generateDescription(),
    supportsIndividualPlanning: supportsIndividualPlanning(),
    canShowIndividualPlanning: canShowIndividualPlanning(),
    
    // Validation
    errors,
    isSaving,
    setIsSaving,
    
    // Functions
    resetForm,
    validateForm,
    buildMoveframeData,
    calculateTotalDistance,
    calculateEstimatedTime,
    generateDescription,
    initializeIndividualPlans,
    updateIndividualPlan
  };
}

