'use client';

import React, { useState, useEffect } from 'react';
import { X, Star, ChevronsDown } from 'lucide-react';
import { SPORTS_LIST, MACRO_FINAL_OPTIONS, MUSCULAR_SECTORS, getPaceLabel, shouldShowPaceField, getSportConfig, getPauseOptions, REST_TYPES, REPS_TYPES, hasRepsTypeSelection, getSportDisplayName, DISTANCE_BASED_SPORTS, sportNeedsExerciseName, AEROBIC_SPORTS, isSportSectionB } from '@/constants/moveframe.constants';
import { useMoveframeForm } from '@/hooks/useMoveframeForm';
import { getSportIcon } from '@/utils/sportIcons';
import { useFavoriteSports } from '@/hooks/useFavoriteSports';
import { useToolsData } from '@/hooks/useToolsData';
import TimeInput from '@/components/common/TimeInput';
import { useFreeMoveExercises } from '@/hooks/useFreeMoveExercises';
import Image from 'next/image';
// 2026-01-21 20:00 UTC - Old import (kept for reference)
// import BatteryCircuitPlanner from './BatteryCircuitPlanner';
// 2026-01-21 20:00 UTC - New Circuit Planner component
// import CircuitPlanner from './CircuitPlanner';
// 2026-01-23 - Redesigned Circuit Planner matching screenshot
import BatteryCircuitPlanner from './BatteryCircuitPlanner_REDESIGNED';
// 2026-01-29 - Fast Planner of Moveframes component
import FastPlannerOfMoveframes from './FastPlannerOfMoveframes';

interface AddEditMoveframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (moveframeData: any) => void;
  mode: 'add' | 'edit';
  workout: any;
  day: any;
  existingMoveframe?: any;
  onSetInsertIndex?: (index: number | null) => void;
  editingFromMovelap?: boolean; // Flag to indicate editing was triggered from movelap edit
}

export default function AddEditMoveframeModal({
  isOpen,
  onClose,
  onSave,
  mode,
  workout,
  day,
  existingMoveframe,
  onSetInsertIndex,
  editingFromMovelap
}: AddEditMoveframeModalProps): JSX.Element | null {
  // Debug: Log mode only when it changes (moved to useEffect below)
  
  // Get sport icon type from localStorage
  const [iconType, setIconType] = React.useState<'emoji' | 'icon'>('emoji');
  
  // 2026-01-22 14:30 UTC - Battery submenu selection
  const [batterySubmenu, setBatterySubmenu] = React.useState<'circuits' | 'fast' | 'ai'>('circuits');
  
  // Debug: Log mode changes only
  React.useEffect(() => {
    if (isOpen) {
      console.log(`🔒 AddEditMoveframeModal opened - mode="${mode}", isEditMode=${mode === 'edit'}`);
      console.log('📋 Modal props:', { workout: workout?.id, day: day?.id, existingMoveframe: existingMoveframe?.id });
    } else {
      console.log('🔒 AddEditMoveframeModal closed');
    }
  }, [isOpen, mode]);
  
  // State for annotation insert position - default to last moveframe index
  const [annotationInsertAfter, setAnnotationInsertAfter] = React.useState<string>(() => {
    const lastIndex = (workout?.moveframes?.length || 0) - 1;
    return lastIndex >= 0 ? String(lastIndex) : 'last';
  });
  
  React.useEffect(() => {
    // Load icon type from localStorage on mount
    const saved = localStorage.getItem('sportIconType');
    if (saved === 'icon' || saved === 'emoji') {
      setIconType(saved);
    }
  }, []);

  // Get favorite sports
  const { favoriteSports, loading: loadingFavorites, reload: reloadFavorites } = useFavoriteSports();
  
  // Get execution techniques from settings
  const { bodyBuildingTechniques } = useToolsData();
  
  // Debug: Log loaded techniques
  React.useEffect(() => {
    console.log('🎯 Execution Techniques loaded:', bodyBuildingTechniques);
    console.log('🔍 Each technique sports field:', bodyBuildingTechniques.map(t => ({ 
      title: t.title, 
      sports: t.sports,
      sportsType: typeof t.sports,
      sportsIsArray: Array.isArray(t.sports)
    })));
  }, [bodyBuildingTechniques]);
  
  // Get FREE_MOVES exercise history
  const { 
    exercises: freeMoveExercises, 
    loading: loadingExercises, 
    addExercise: addFreeMoveExercise,
    deleteExercise: deleteFreeMoveExercise,
    reload: reloadExercises 
  } = useFreeMoveExercises();
  
  // Reload favorites when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal opened, reloading favorite sports...');
      reloadFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen, not reloadFavorites to avoid infinite loop
  
  // Debug logging (only when changed)
  useEffect(() => {
    console.log('🎯 Favorite Sports:', favoriteSports.length, 'sports, Loading:', loadingFavorites);
  }, [favoriteSports.length, loadingFavorites]);

  // Use custom hook for form management
  const {
    formData,
    setters,
    sportConfig,
    totalDistance,
    estimatedTime,
    description,
    supportsIndividualPlanning,
    canShowIndividualPlanning,
    errors,
    isSaving,
    setIsSaving,
    resetForm,
    validateForm,
    buildMoveframeData,
    generateDescription,
    initializeIndividualPlans,
    updateIndividualPlan
  } = useMoveframeForm({
    mode,
    existingMoveframe,
    isOpen,
    workout,
    day
  });
  
  // Debug: Track manualPriority state changes
  useEffect(() => {
    console.log('🔄 [MODAL] manualPriority state changed to:', formData.manualPriority);
  }, [formData.manualPriority]);
  
  // Debug: Track manualInputType state changes
  useEffect(() => {
    console.log('🔄 [MODAL] manualInputType state changed to:', formData.manualInputType);
  }, [formData.manualInputType]);

  // Copy down function: copies current row data to all rows below
  const copyDownRow = (fromIdx: number) => {
    if (fromIdx >= individualPlans.length - 1) return; // Don't copy from last row
    
    const sourceRow = individualPlans[fromIdx];
    
    // Copy to all rows below the current one
    for (let i = fromIdx + 1; i < individualPlans.length; i++) {
      // Copy all relevant fields based on what exists in the source row
      if (sourceRow.speed !== undefined) updateIndividualPlan(i, 'speed', sourceRow.speed);
      if (sourceRow.time !== undefined) updateIndividualPlan(i, 'time', sourceRow.time);
      if (sourceRow.pause !== undefined) updateIndividualPlan(i, 'pause', sourceRow.pause);
      if (sourceRow.reps !== undefined) updateIndividualPlan(i, 'reps', sourceRow.reps);
      if (sourceRow.weight !== undefined) updateIndividualPlan(i, 'weight', sourceRow.weight);
      if (sourceRow.tools !== undefined) updateIndividualPlan(i, 'tools', sourceRow.tools);
      if (sourceRow.strokes !== undefined) updateIndividualPlan(i, 'strokes', sourceRow.strokes);
      if (sourceRow.watts !== undefined) updateIndividualPlan(i, 'watts', sourceRow.watts);
      if (sourceRow.restType !== undefined) updateIndividualPlan(i, 'restType', sourceRow.restType);
      if (sourceRow.pauseMin !== undefined) updateIndividualPlan(i, 'pauseMin', sourceRow.pauseMin);
      if (sourceRow.pauseMode !== undefined) updateIndividualPlan(i, 'pauseMode', sourceRow.pauseMode);
      if (sourceRow.pausePace !== undefined) updateIndividualPlan(i, 'pausePace', sourceRow.pausePace);
    }
  };

  // Destructure for easier access
  const {
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
  } = formData;

  const {
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
  } = setters;

  // Auto-switch to 'fast' when BATTERY mode is selected for non-section B sports
  useEffect(() => {
    if (type === 'BATTERY' && batterySubmenu === 'circuits' && !isSportSectionB(sport)) {
      setBatterySubmenu('fast');
    }
  }, [type, sport, batterySubmenu]);

  // Filter techniques - ONLY for BODY_BUILDING sport
  const availableTechniques = React.useMemo(() => {
    console.log('🔍 Filtering techniques for sport:', sport);
    console.log('🔍 All techniques:', bodyBuildingTechniques);
    
    // Applied Technique is ONLY for BODY_BUILDING
    // All techniques are automatically for BODY_BUILDING, so just check the sport
    if (sport !== 'BODY_BUILDING') {
      console.log('⚠️ Not BODY_BUILDING sport, returning empty array');
      return [];
    }
    
    console.log('✅ Returning all techniques for BODY_BUILDING:', bodyBuildingTechniques);
    return bodyBuildingTechniques;
  }, [bodyBuildingTechniques, sport]);

  // Format validation helpers (NOW sport is available)
  // Fast input parser for Pace - handles quick numeric input
  const formatPace = (value: string, isKmPace: boolean = false): string => {
    if (!value) return '';
    
    // BIKE: Speed km/h format (0.0 to 999.9) - Manual decimal entry
    if (sport === 'BIKE') {
      // Allow digits and decimal point
      const numValue = value.replace(/[^\d.]/g, '');
      if (!numValue) return '';
      
      // Parse the value
      const speed = parseFloat(numValue);
        if (isNaN(speed)) return '';
      
      // Validate range: 0.0 to 999.9
      if (speed < 0) return '0.0';
      if (speed > 999.9) return '999.9';
      
      // Return with one decimal place
      return speed.toFixed(1);
    }
    
    // ROWING: Speed\500m format (0'00"0 to 9'59"9)
    if (sport === 'ROWING') {
      // Check if user typed with separators (., :, ', ", etc.)
      if (/[.:'"h]/.test(value)) {
        const parts = value.match(/(\d+)[.:'"h]?(\d+)?[.:'"h]?(\d)?/);
        if (parts) {
          const minutes = parts[1] || '0';
          const seconds = (parts[2] || '0').padStart(2, '0').slice(0, 2);
          const tenths = parts[3] || '0';
          
          const min = parseInt(minutes);
          const sec = parseInt(seconds);
          
          // Validate range: 0'00"0 to 9'59"9
          if (min > 9 || sec > 59) return value;
          
          return `${minutes}'${seconds}"${tenths}`;
        }
      }
      
      // Fallback: pure digit input like "1305" → "1'30"5
      const digits = value.replace(/\D/g, '');
      if (!digits) return '';
      
      const padded = digits.padStart(4, '0');
      const minutes = padded.slice(0, -3);
      const seconds = padded.slice(-3, -1);
      const tenths = padded.slice(-1);
      
      const min = parseInt(minutes);
      const sec = parseInt(seconds);
      
      if (min > 9 || sec > 59) return value;
      
      return `${minutes}'${seconds}"${tenths}`;
    }
    
    // SKI: Speed\500m or Pace\Refdist format (0'00" to 9'59")
    if (sport === 'SKI') {
      // Check if user typed with separators (., :, ', ", etc.)
      if (/[.:'"h]/.test(value)) {
        const parts = value.match(/(\d+)[.:'"h]?(\d+)?/);
        if (parts) {
          const minutes = parts[1] || '0';
          const seconds = (parts[2] || '0').padStart(2, '0').slice(0, 2);
          
          const min = parseInt(minutes);
          const sec = parseInt(seconds);
          
          // Validate range: 0'00" to 9'59"
          if (min > 9 || sec > 59) return value;
          
          return `${minutes}'${seconds}"`;
        }
      }
      
      // Fallback: pure digit input like "130" → "1'30"
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
      const padded = digits.padStart(3, '0');
      const minutes = padded.slice(0, -2);
      const seconds = padded.slice(-2);
      
      const min = parseInt(minutes);
      const sec = parseInt(seconds);
      
      if (min > 9 || sec > 59) return value;
      
      return `${minutes}'${seconds}"`;
    }
    
    // Other sports: Standard pace format (e.g., SWIM, RUN)
    const needsDecimal = sport !== 'BIKE' && sport !== 'SKI';
    
    // Check if user typed with separators (., :, ', ", etc.)
    if (/[.:'"h]/.test(value)) {
      const parts = value.match(/(\d+)[.:'"h]?(\d+)?[.:'"h]?(\d)?/);
      if (parts) {
        const minutes = parts[1] || '0';
        const seconds = (parts[2] || '0').padStart(2, '0').slice(0, 2);
        const decimals = needsDecimal ? (parts[3] || '0') : '';
        
        const min = parseInt(minutes);
        const sec = parseInt(seconds);
        
        // Validate ranges based on sport
        if (sport === 'RUN') {
          if (isKmPace) {
            if (min < 2) return "2'00\"0";
            if (min > 9 || sec > 59) return value;
    } else {
            if (min > 1 || sec > 59) return value;
          }
        } else {
          if (min > 9 || sec > 59) return value;
        }
        
        return needsDecimal ? `${minutes}'${seconds}"${decimals}` : `${minutes}'${seconds}"`;
    }
    }
    
    // Fallback: pure digit input
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    const padded = needsDecimal ? digits.padStart(4, '0') : digits.padStart(3, '0');
    const minutes = padded.slice(0, 1);
    const seconds = padded.slice(1, 3);
    const decimals = needsDecimal ? padded.slice(3, 4) : '';
    
    const min = parseInt(minutes);
    const sec = parseInt(seconds);
    
    // Validate ranges
    if (sport === 'RUN') {
      if (isKmPace) {
        if (min < 2) return "2'00\"0";
        if (min > 9 || sec > 59) return value;
      } else {
        if (min > 1 || sec > 59) return value;
    }
    } else {
      if (min > 9 || sec > 59) return value;
    }
    
    return needsDecimal ? `${minutes}'${seconds}"${decimals}` : `${minutes}'${seconds}"`;
  };
  
  // Fast input parser for Pause - handles quick numeric input for pause times
  const parsePauseInput = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Quick format as user types (auto-format immediately)
    // Format: MM'SS" (e.g., 1'30", 2'45")
    let formatted = '';
    
    if (digits.length === 1) {
      // Just seconds first digit: "3" → "0'3"
      formatted = `0'${digits}`;
    } else if (digits.length === 2) {
      // Full seconds: "30" → "0'30""
      formatted = `0'${digits}"`;
    } else if (digits.length === 3) {
      // Minutes + first second digit: "130" → "1'30""
      const m = digits[0];
      const s = digits.slice(1, 3);
      formatted = `${m}'${s}"`;
    } else if (digits.length >= 4) {
      // More than 3 digits: "1305" → "13'05""
      const m = digits.slice(0, -2);
      const s = digits.slice(-2);
      formatted = `${m}'${s}"`;
    }
    
    return formatted;
  };

  const formatPause = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Parse minutes and seconds
    const padded = digits.padStart(3, '0');
    const minutes = padded.slice(0, -2);
    const seconds = padded.slice(-2);
    
    const min = parseInt(minutes);
    const sec = parseInt(seconds);
    
    // Validate seconds (max 59)
    if (sec > 59) {
      return `${minutes}'59"`;
    }
    
    return `${minutes}'${seconds}"`;
  };

  // Fast input parser for Reps Time - handles quick numeric input for time-based reps (Gymnastic, etc.)
  const parseRepsTimeInput = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Quick format as user types (auto-format immediately)
    // Format: MM'SS" (e.g., 0'30", 9'59")
    // Range: 00'01" to 09'59"
    let formatted = '';
    
    if (digits.length === 1) {
      // Just seconds first digit: "3" → "0'3"
      formatted = `0'${digits}`;
    } else if (digits.length === 2) {
      // Full seconds: "30" → "0'30""
      formatted = `0'${digits}"`;
    } else if (digits.length === 3) {
      // Minutes + seconds: "130" → "1'30""
      const m = digits[0];
      const s = digits.slice(1, 3);
      formatted = `${m}'${s}"`;
    } else if (digits.length >= 4) {
      // More than 3 digits: "930" → "9'30""
      const m = digits.slice(0, -2);
      const s = digits.slice(-2);
      formatted = `${m}'${s}"`;
    }
    
    return formatted;
  };

  const formatRepsTime = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Parse minutes and seconds
    const padded = digits.padStart(3, '0');
    const minutes = padded.slice(0, -2);
    const seconds = padded.slice(-2);
    
    const min = parseInt(minutes);
    const sec = parseInt(seconds);
    
    // Validate range: 00'01" to 09'59"
    if (min > 9) {
      alert('⚠️ Time value too high!\n\nMaximum allowed: 9\'59"\nPlease enter a value within the valid range.');
      return "9'59\"";
    }
    
    if (min === 0 && sec === 0) {
      alert('⚠️ Time value too low!\n\nMinimum allowed: 0\'01"\nPlease enter a value within the valid range.');
      return "0'01\"";
    }
    
    // Validate seconds (max 59)
    if (sec > 59) {
      return `${minutes}'59"`;
    }
    
    return `${minutes}'${seconds}"`;
  };
  
  const formatTime = (value: string): string => {
    if (!value) return '';
    
    // If already formatted correctly, return as-is
    if (/^\d+h\d{2}'\d{2}"\d$/.test(value)) return value;
    
    // Extract only digits from the input
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Format based on number of digits (WITH deciseconds):
    // 1 digit: 5 → 0h00'00"5
    // 2 digits: 12 → 0h00'12"0
    // 3 digits: 125 → 0h01'25"0
    // 4 digits: 1234 → 0h12'34"0
    // 5 digits: 12345 → 1h23'45"0
    // 6 digits: 123456 → 1h23'45"6
    // 7+ digits: 1234567 → 12h34'56"7
    
    const len = digits.length;
    let hours, minutes, seconds, deciseconds;
    
    if (len === 1) {
      // 1 digit: 5 → 0h00'00"5
      hours = '0';
      minutes = '00';
      seconds = '00';
      deciseconds = digits;
    } else if (len === 2) {
      // 2 digits: 12 → 0h00'12"0
      hours = '0';
      minutes = '00';
      seconds = digits;
      deciseconds = '0';
    } else if (len === 3) {
      // 3 digits: 125 → 0h01'25"0
      hours = '0';
      minutes = digits[0].padStart(2, '0');
      seconds = digits.slice(1, 3);
      deciseconds = '0';
    } else if (len === 4) {
      // 4 digits: 1234 → 0h12'34"0
      hours = '0';
      minutes = digits.slice(0, 2);
      seconds = digits.slice(2, 4);
      deciseconds = '0';
    } else if (len === 5) {
      // 5 digits: 12345 → 1h23'45"0
      hours = digits[0];
      minutes = digits.slice(1, 3);
      seconds = digits.slice(3, 5);
      deciseconds = '0';
    } else if (len === 6) {
      // 6 digits: 123456 → 1h23'45"6
      hours = digits[0];
      minutes = digits.slice(1, 3);
      seconds = digits.slice(3, 5);
      deciseconds = digits[5];
    } else {
      // 7+ digits: 1234567 → 12h34'56"7
      hours = digits.slice(0, -5);
      minutes = digits.slice(-5, -3);
      seconds = digits.slice(-3, -1);
      deciseconds = digits.slice(-1);
    }
    
    const h = parseInt(hours);
    const m = parseInt(minutes);
    const s = parseInt(seconds);
    
    // Validate range
    if (m > 59 || s > 59) return value;
    
    return `${hours}h${minutes}'${seconds}"${deciseconds}`;
  };
  
  // R1 and R2 options for BIKE
  const R1_OPTIONS = ['', '34', '36', '38', '39', '40', '48', '50', '52', '53', '54', '55'];
  const R2_OPTIONS = ['', ...Array.from({ length: 43 }, (_, i) => (i + 10).toString())]; // 10-52

  // Workout Sections state (loaded from Personal Settings - Workout Sections)
  const [workoutSections, setWorkoutSections] = useState<any[]>([]);

  // Load workout sections from Prisma database
  useEffect(() => {
    const loadWorkoutSections = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Fetch workout sections from database (user's custom workout sections)
        const response = await fetch('/api/workouts/sections', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const sections = data.sections || [];
          console.log('✅ Loaded workout sections from Personal Settings:', sections);
          setWorkoutSections(sections);
        } else {
          console.error('Failed to load workout sections:', response.statusText);
          setWorkoutSections([]);
        }
      } catch (error) {
        console.error('❌ Error loading workout sections from database:', error);
        setWorkoutSections([]);
      }
    };
    
    if (isOpen) {
      loadWorkoutSections();
    }
  }, [isOpen]);

  // Auto-initialize sport and section for standard mode
  useEffect(() => {
    if (isOpen && type === 'STANDARD' && !manualMode && mode === 'add') {
      // Set default sport if not set
      if (!sport) {
        setSport('SWIM');
      }
    }
    
    // Set default section for STANDARD and BATTERY modes if not set and sections are loaded
    if (isOpen && (type === 'STANDARD' || type === 'BATTERY') && mode === 'add') {
      if (!sectionId && workoutSections.length > 0) {
        setSectionId(workoutSections[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, manualMode, mode, sport, sectionId, workoutSections]);

  // Debug: Log state changes
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 Modal State:', {
        type,
        manualMode,
        sport,
        sectionId,
        workoutSectionsLoaded: workoutSections.length > 0,
        workoutSectionsCount: workoutSections.length,
        shouldShowFields: type === 'STANDARD' && !manualMode
      });
    }
  }, [isOpen, type, manualMode, sport, sectionId, workoutSections]);

  // Debug: Log whenever workout sections are loaded
  useEffect(() => {
    if (workoutSections.length > 0) {
      console.log('📋 Workout Sections loaded:', workoutSections);
      console.log('📋 Workout Section count:', workoutSections.length);
      workoutSections.forEach((section, idx) => {
        console.log(`  ${idx + 1}. ${section.name} (ID: ${section.id}, Code: ${section.code || 'N/A'}, Color: ${section.color})`);
      });
    }
  }, [workoutSections]);

  // Handle save
  const handleSave = async () => {
    console.log('🔘 handleSave clicked');
    console.log('📋 Current form state:', {
      sport,
      type,
      sectionId,
      repetitions,
      distance,
      manualMode,
      manualContentLength: manualContent?.length || 0,
      manualContentPreview: manualContent?.substring(0, 200) || ''
    });
    
    // Get editor content directly to verify
    if (editorRef.current) {
      const editorHTML = editorRef.current.innerHTML;
      console.log('📝 Editor HTML content:', {
        length: editorHTML.length,
        preview: editorHTML.substring(0, 200),
        fullContent: editorHTML
      });
    }
    
    const isValid = validateForm();
    console.log('✅ Validation result:', isValid);
    console.log('📝 Validation errors:', errors);
    
    if (!isValid) {
      console.error('❌ Validation failed. Please check the following fields:', errors);
      // Scroll to top to show errors
      if (bodyRef.current) {
        bodyRef.current.scrollTop = 0;
      }
      return;
    }

    console.log('🔹 [MODAL] handleSave called, mode:', mode);
    setIsSaving(true);

    try {
      const moveframeData = buildMoveframeData();
      console.log('🔹 [MODAL] Built moveframe data:', {
        planningMode: moveframeData.planningMode,
        individualPlans: moveframeData.individualPlans,
        individualPlansLength: moveframeData.individualPlans?.length,
        repetitions: moveframeData.repetitions,
        sport: moveframeData.sport,
        manualMode: moveframeData.manualMode,
        manualInputType: moveframeData.manualInputType,
        manualRepetitions: moveframeData.manualRepetitions,
        manualDistance: moveframeData.manualDistance
      });
      
      // CRITICAL DEBUG - Check manualInputType before sending
      console.log('🚨🚨🚨 [MODAL] CRITICAL - manualInputType check:');
      console.log('  Current form state manualInputType:', manualInputType);
      console.log('  In buildMoveframeData result:', moveframeData.manualInputType);
      console.log('  Are they equal?:', manualInputType === moveframeData.manualInputType);
      console.log('  Type of form state:', typeof manualInputType);
      console.log('  Type of data:', typeof moveframeData.manualInputType);
      console.log('  Is data.manualInputType undefined?:', moveframeData.manualInputType === undefined);
      
      console.log('💾 [SAVE] Moveframe data being saved:', moveframeData);
      console.log('🔹 [MODAL] Calling onSave prop...');
      await onSave(moveframeData);
      console.log('✅ [MODAL] Save successful, closing modal');
      onClose();
      resetForm();
    } catch (error) {
      console.error('❌ [MODAL] Error saving moveframe:', error);
      alert('Error saving moveframe: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close
  const [activeTab, setActiveTab] = React.useState<'edit' | 'manual' | 'favorites'>('edit');
  const editorRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  
  // For manual mode moveframes, force manual tab and disable other tabs
  // Only restrict tabs if editing an EXISTING manual moveframe (not when creating new one)
  const isEditingManualMoveframe = mode === 'edit' && existingMoveframe?.manualMode;
  
  // Auto-switch to manual tab when editing a manual moveframe
  React.useEffect(() => {
    if (isOpen && isEditingManualMoveframe && activeTab !== 'manual') {
      setActiveTab('manual');
    }
  }, [isOpen, isEditingManualMoveframe, activeTab]);

  const handleTabChange = (tab: 'edit' | 'manual' | 'favorites') => {
    // Prevent tab change if editing an EXISTING manual moveframe (edit mode with manualMode from DB)
    // But allow tab switching when CREATING a new moveframe (add mode)
    if (mode === 'edit' && existingMoveframe?.manualMode && tab !== 'manual') {
      // This is editing an existing manual moveframe - restrict to manual tab only
      return;
    }
    
    // When switching away from manual tab in ADD mode, disable manual mode
    if (mode === 'add' && activeTab === 'manual' && tab !== 'manual' && manualMode) {
      console.log('🔄 [MODAL] Switching away from manual tab in add mode, disabling manual mode');
      setManualMode(false);
      setManualPriority(false);
    }
    
    setActiveTab(tab);
    // Immediately scroll to top when changing tabs
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
    setActiveTab('edit');
  };

  // Rich text editor commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setManualContent(editorRef.current.innerHTML);
    }
  };

  // Initialize editor content when switching to manual tab
  React.useEffect(() => {
    if (editorRef.current && activeTab === 'manual' && manualMode) {
      // Only update if we're switching to this tab or opening with content
      if (manualContent && editorRef.current.innerHTML !== manualContent) {
        // Use a timeout to avoid conflicts with React's rendering
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = manualContent || '';
          }
        }, 0);
      }
    }
  }, [activeTab, manualMode]);
  
  // Clear editor when modal closes
  React.useEffect(() => {
    if (!isOpen && editorRef.current) {
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      }, 0);
    }
  }, [isOpen]);

  // Set initial insert index for annotations when modal opens
  React.useEffect(() => {
    if (isOpen && type === 'ANNOTATION' && mode === 'add' && onSetInsertIndex) {
      const lastIndex = (workout?.moveframes?.length || 0) - 1;
      if (lastIndex >= 0) {
        onSetInsertIndex(lastIndex + 1); // Insert after last moveframe
      } else {
        onSetInsertIndex(null); // No moveframes, append at end
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, mode, workout?.moveframes?.length]);

  // Auto-enable manual mode when switching to manual tab (but never auto-disable)
  React.useEffect(() => {
    if (type === 'STANDARD' && activeTab === 'manual' && !manualMode) {
      // Enable manual mode when switching TO manual tab (only if not already enabled)
      console.log('🔄 [MODAL] Switching to manual tab, enabling manual mode');
        setManualMode(true);
      // Only set manualPriority to true for NEW manual moveframes (not when editing existing ones)
      if (mode === 'add') {
        setManualPriority(true);
      }
    }
    // NOTE: We don't automatically disable manual mode when switching to edit tab
    // because the moveframe might have been created in manual mode and we want to preserve that
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, type, manualMode, mode]);

  // Reset scroll position when switching tabs
  React.useEffect(() => {
    if (bodyRef.current) {
      // Use requestAnimationFrame for better timing with DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (bodyRef.current) {
            bodyRef.current.scrollTop = 0;
            // Force a layout recalculation
            bodyRef.current.scrollHeight;
          }
        });
      });
    }
  }, [activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[75vw] h-[85vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold">
            {mode === 'add' ? 'Add Moveframe' : 'Edit Moveframe'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {type === 'STANDARD' && (
          <div className="flex border-b border-gray-300 bg-gray-50 flex-shrink-0">
            {!isEditingManualMoveframe && (
              <button
                onClick={() => handleTabChange('edit')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'edit'
                    ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Edit Moveframe
              </button>
            )}
            <button
              onClick={() => handleTabChange('manual')}
              className={`${isEditingManualMoveframe ? 'w-full' : 'flex-1'} px-4 py-2 text-sm font-medium ${
                activeTab === 'manual'
                  ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {isEditingManualMoveframe ? 'Edit Manual Moveframe' : 'Manual input'}
            </button>
            {!isEditingManualMoveframe && (
              <button
                onClick={() => handleTabChange('favorites')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'favorites'
                    ? 'bg-white text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Favourites moveframes
              </button>
            )}
          </div>
        )}

        {/* Body - 2026-01-22 14:40 UTC - Reduced padding for Battery mode */}
        <div ref={bodyRef} className={`overflow-y-auto ${type === 'BATTERY' ? 'p-2 pb-2' : 'p-4 pb-64'}`} style={{ height: type === 'STANDARD' ? 'calc(80vh - 140px)' : 'calc(80vh - 100px)' }}>
          {/* Edit Moveframe Tab */}
          {(type !== 'STANDARD' || activeTab === 'edit') && (
            <div key="edit-tab">
          {/* Error Message */}
          {errors.general && (
            <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {errors.general}
                </div>
              )}

              {/* Favorite Sports Quick Selection */}
              {loadingFavorites && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-300">
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <div className="animate-spin">⏳</div>
                    Loading favorite sports...
                  </div>
                </div>
              )}
              
              {!loadingFavorites && favoriteSports.length === 0 && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700">
                    💡 <strong>No favorite sports set.</strong> Go to Personal Settings → Favorite Sports to select up to 5 favorite sports for quick access!
                  </div>
                </div>
              )}
              
              {!loadingFavorites && favoriteSports.length > 0 && (
                <div className={`mb-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 ${mode === 'edit' ? 'relative' : ''}`}>
                  {mode === 'edit' && (
                    <div 
                      className="absolute inset-0 z-[9999] cursor-not-allowed rounded-lg bg-gray-50 bg-opacity-60" 
                      title="Sport cannot be changed in edit mode"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-600 fill-yellow-400" />
                      <span className="text-xs font-bold text-gray-700">Favorite Sports - Quick Select ({favoriteSports.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Icon Type:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newType = iconType === 'emoji' ? 'icon' : 'emoji';
                          localStorage.setItem('sportIconType', newType);
                          setIconType(newType);
                        }}
                        className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                          iconType === 'emoji'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-700 text-white'
                        }`}
                        title="Toggle between color emoji icons and black/white image icons"
                      >
                        {iconType === 'emoji' ? '😊 Color' : '⚫ Black'}
                      </button>
                    <button
                      type="button"
                      onClick={() => reloadFavorites()}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                      title="Reload favorite sports"
                    >
                      🔄 Reload
                    </button>
                  </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {favoriteSports.slice(0, 5).map((favSport) => {
                      const icon = getSportIcon(favSport, iconType);
                      const isImage = icon.startsWith('/');
                      const isSelected = sport === favSport;
                      
                      return (
                        <button
                          key={favSport}
                          type="button"
                          onClick={() => {
                            // Only allow in add mode
                            if (mode === 'edit') return;
                            
                            // Same validation logic as the dropdown
                            if (mode === 'add') {
                              const existingSports = new Set<string>();
                              (workout.moveframes || []).forEach((mf: any) => {
                                if (mf.sport && mf.sport !== 'STRETCHING') {
                                  existingSports.add(mf.sport);
                                }
                              });
                              
                              if (workout.includeStretching === false) {
                                existingSports.delete('STRETCHING');
                              }
                              
                              if (!existingSports.has(favSport) && favSport !== 'STRETCHING' && existingSports.size >= 4) {
                                alert('⚠️ Maximum 4 sports allowed per workout!\n\nThis workout already has 4 sports. You cannot add a 5th sport.\n\nPlease select one of the existing sports or remove moveframes to change sports.');
                                return;
                              }
                            }
                            
                            setSport(favSport);
                          }}
                          disabled={mode === 'edit'}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                            mode === 'add' ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                          } ${
                            isSelected 
                              ? 'border-cyan-500 bg-cyan-50 shadow-md' 
                              : mode === 'add' 
                                ? 'border-gray-300 bg-white hover:border-yellow-400 hover:bg-yellow-50'
                                : 'border-gray-300 bg-gray-100'
                          }`}
                          title={mode === 'edit' ? 'Sport cannot be changed in edit mode' : `Select ${favSport.replace(/_/g, ' ')}`}
                        >
                          {isImage ? (
                            <div className="w-18 h-18 flex items-center justify-center flex-shrink-0">
                              <Image 
                                src={icon} 
                                alt={favSport}
                                width={72}
                                height={72}
                                className="object-contain"
                                style={{ width: '72px', height: '72px' }}
                              />
                            </div>
                          ) : (
                            <div className="w-18 h-18 flex items-center justify-center text-5xl flex-shrink-0">
                              {icon}
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-gray-700 mt-1 text-center leading-tight">
                            {favSport.replace(/_/g, ' ').substring(0, 12)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
            </div>
          )}

          {/* Sport Selection */}
          <div className={`mb-3 ${mode === 'edit' ? 'relative' : ''}`}>
            {mode === 'edit' && (
              <div 
                className="absolute inset-0 z-[9999] cursor-not-allowed bg-gray-50 bg-opacity-50" 
                title="Sport cannot be changed in edit mode"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            )}
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Sport <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center justify-center gap-3">
              <select
                value={sport}
                onChange={(e) => {
                  // Prevent any changes in edit mode
                  if (mode === 'edit') {
                    e.preventDefault();
                    return;
                  }
                  
                  const newSport = e.target.value;
                  
                  // Check if adding a new sport would exceed 4 sports limit (in ADD mode only)
                  if (mode === 'add') {
                    const existingSports = new Set<string>();
                    (workout.moveframes || []).forEach((mf: any) => {
                      if (mf.sport && mf.sport !== 'STRETCHING') {
                        existingSports.add(mf.sport);
                      }
                    });
                    
                    // Exclude STRETCHING from count if includeStretching is false
                    if (workout.includeStretching === false) {
                      existingSports.delete('STRETCHING');
                    }
                    
                    // Check if new sport would be the 5th one
                    if (!existingSports.has(newSport) && newSport !== 'STRETCHING' && existingSports.size >= 4) {
                      alert('⚠️ Maximum 4 sports allowed per workout!\n\nThis workout already has 4 sports. You cannot add a 5th sport.\n\nPlease select one of the existing sports or remove moveframes to change sports.');
                      return;
                    }
                  }
                  
                  setSport(newSport);
                }}
                onMouseDown={(e) => mode === 'edit' && e.preventDefault()}
                onKeyDown={(e) => mode === 'edit' && e.preventDefault()}
                disabled={mode === 'edit'}
                className={`w-64 px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm ${
                  mode === 'edit' ? 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none' : ''
                }`}
                style={mode === 'edit' ? { pointerEvents: 'none' } : undefined}
              >
                {SPORTS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {getSportDisplayName(s)}
                  </option>
                ))}
              </select>
              {/* Sport Icon Display */}
              {sport && (() => {
                const icon = getSportIcon(sport, iconType);
                const isImage = icon.startsWith('/');
                return isImage ? (
                  <div className="w-18 h-18 flex items-center justify-center flex-shrink-0">
                    <Image 
                      src={icon} 
                      alt={sport}
                      width={72}
                      height={72}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-18 h-18 flex items-center justify-center text-5xl flex-shrink-0">
                    {icon}
                  </div>
                );
              })()}
            </div>
            {errors.sport && <p className="mt-0.5 text-xs text-red-500">{errors.sport}</p>}
          </div>

          {/* Type Selection */}
          <div className={`mb-3 ${mode === 'edit' ? 'relative' : ''}`}>
            {mode === 'edit' && (
              <div 
                className="absolute inset-0 z-[9999] cursor-not-allowed bg-gray-50 bg-opacity-50" 
                title="Type cannot be changed in edit mode"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            )}
            <label className="block text-xs font-bold text-gray-700 mb-2">Type</label>
            <div className="flex gap-2" style={mode === 'edit' ? { pointerEvents: 'none' } : undefined}>
              <button
                type="button"
                onClick={(e) => {
                  if (mode === 'edit') {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  setType('STANDARD');
                }}
                disabled={mode === 'edit'}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
                  type === 'STANDARD'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${mode === 'edit' ? 'cursor-not-allowed opacity-50 pointer-events-none' : ''}`}
              >
                Standard Mode
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (mode === 'edit') {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  setType('BATTERY');
                }}
                disabled={mode === 'edit'}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
                  type === 'BATTERY'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${mode === 'edit' ? 'cursor-not-allowed opacity-50 pointer-events-none' : ''}`}
              >
                ⚡ Fast plannings
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (mode === 'edit') {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  setType('ANNOTATION');
                }}
                disabled={mode === 'edit'}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
                  type === 'ANNOTATION'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${mode === 'edit' ? 'cursor-not-allowed opacity-50 pointer-events-none' : ''}`}
              >
                📝 Annotation
              </button>
            </div>
          </div>

          {/* Workout Section Selection - Only for STANDARD and BATTERY modes */}
          {/* 2026-01-22 15:30 UTC - Reduced width to 50% and centered */}
          {/* 2026-01-29 - Moved above Fast plannings Mode */}
          {(type === 'STANDARD' || type === 'BATTERY') && (
          <div className="mb-3 w-1/2 mx-auto">
              {mode === 'edit' && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    ℹ️ <strong>Edit Mode:</strong> You can only edit parameters starting from "Workout Section" below. Sport and Type are locked.
                  </p>
                </div>
              )}
            <label className="block text-xs font-bold text-gray-700 mb-1">
                Workout Section <span className="text-red-500">*</span>
            </label>
              <div className="flex items-center gap-2">
            <select
              value={sectionId}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    const selected = workoutSections.find(s => s.id === selectedValue);
                    console.log('🔄 Workout section selected:', selectedValue);
                    console.log('🎨 Section color:', selected?.color);
                    console.log('🔍 Available sections:', workoutSections);
                    setSectionId(selectedValue);
                  }}
                  className="flex-1 px-2.5 py-1.5 border-2 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm font-semibold"
                  style={{ 
                    color: '#000000',
                    backgroundColor: (() => {
                      const selected = workoutSections.find(s => s.id === sectionId);
                      return selected?.color ? `${selected.color}20` : '#ffffff';
                    })(),
                    borderColor: (() => {
                      const selected = workoutSections.find(s => s.id === sectionId);
                      return selected?.color || '#d1d5db';
                    })()
                  }}
                >
                  <option value="" style={{ color: '#666666' }}>Select workout section...</option>
                  {workoutSections.length === 0 && (
                    <option disabled style={{ color: '#999999' }}>No workout sections available</option>
                  )}
                  {workoutSections.map((section, index) => {
                    // Create a visual color indicator using Unicode block character
                    const colorIndicator = '⬤'; // Circle character
                    return (
                      <option 
                        key={section.id || `section-${index}`} 
                        value={section.id}
                        style={{ 
                          color: '#000000',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        {colorIndicator} {section.name}{section.code ? ` (${section.code})` : ''}
                      </option>
                    );
                  })}
            </select>
                {/* Show selected workout section color */}
                {sectionId && (() => {
                  const selectedSection = workoutSections.find(s => s.id === sectionId);
                  return selectedSection?.color ? (
                    <div 
                      className="w-8 h-8 rounded border-2 border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: selectedSection.color }}
                      title={`${selectedSection.name}${selectedSection.code ? ` (${selectedSection.code})` : ''}`}
                    />
                  ) : null;
                })()}
              </div>
            {errors.sectionId && <p className="mt-0.5 text-xs text-red-500">{errors.sectionId}</p>}
              {workoutSections.length === 0 && (
                <p className="mt-1 text-xs text-orange-600">
                  ⚠️ No workout sections found. Please add workout sections in Personal Settings → Tools → Sections.
                </p>
              )}
          </div>
          )}

          {/* Fast plannings Submenu Selection - 2026-01-22 14:30 UTC */}
          {/* 2026-01-29 - Moved below Workout Section Selection */}
          {type === 'BATTERY' && (
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Fast plannings Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSportSectionB(sport)) {
                      return;
                    }
                    setBatterySubmenu('circuits');
                  }}
                  disabled={!isSportSectionB(sport)}
                  className={`px-3 py-2 text-sm font-medium rounded border-2 transition-colors ${
                    batterySubmenu === 'circuits'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${!isSportSectionB(sport) ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  Circuits planner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSportSectionB(sport)) {
                      return;
                    }
                    setBatterySubmenu('fast');
                  }}
                  disabled={!isSportSectionB(sport)}
                  className={`px-3 py-2 text-sm font-medium rounded border-2 transition-colors ${
                    batterySubmenu === 'fast'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${!isSportSectionB(sport) ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  Fast planner of Moveframes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSportSectionB(sport)) {
                      return;
                    }
                    setBatterySubmenu('ai');
                  }}
                  disabled={!isSportSectionB(sport)}
                  className={`px-3 py-2 text-sm font-medium rounded border-2 transition-colors ${
                    batterySubmenu === 'ai'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${!isSportSectionB(sport) ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  Plan of Moveframes with AI
                </button>
              </div>
              {!isSportSectionB(sport) && (
                <p className="mt-2 text-xs text-orange-600">
                  ℹ️ <strong>Note:</strong> Fast plannings mode (all features) is only available for non-aerobic sports with exercise catalogs (e.g., Body Building, Calisthenics, CrossFit, Gymnastic, etc.)
                </p>
              )}
            </div>
          )}
          
          {/* Annotation Section - Show when type is ANNOTATION, or optional for other types */}
          {type === 'ANNOTATION' && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h3 className="font-bold text-sm text-blue-900 mb-3">📝 Annotation</h3>
            <div className="space-y-3">
              {/* Insert Position Dropdown - Only show in add mode */}
              {mode === 'add' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    📍 Insert After Moveframe
                  </label>
                  <select
                    value={annotationInsertAfter}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAnnotationInsertAfter(value);
                      // Update parent component's insert index
                      if (onSetInsertIndex) {
                        if (value === 'last') {
                          onSetInsertIndex(null); // null means append at end
                        } else {
                          const index = parseInt(value, 10);
                          onSetInsertIndex(index + 1); // Insert AFTER the selected moveframe
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    {workout?.moveframes?.map((mf: any, index: number) => {
                      const sectionName = mf.section?.name || 'Default Section';
                      const sportIcon = getSportIcon(mf.sport || 'SWIM', iconType);
                      const sportName = getSportDisplayName(mf.sport || 'SWIM');
                      const isImage = sportIcon.startsWith('/');
                      
                      return (
                        <option key={mf.id} value={index}>
                          {index + 1}. {mf.letter || String.fromCharCode(65 + index)} • {sectionName} • {isImage ? '⚫' : sportIcon} {sportName}
                        </option>
                      );
                    })}
                    <option value="last">🔽 After last moveframe (at the end)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    ✨ Default: After last moveframe. Select a different position if needed.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annotation text
                </label>
                <input
                  type="text"
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Add a note or highlight for this moveframe..."
                />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Background color
              </label>
                    <div className="flex items-center gap-2">
                <input
                        type="color"
                        value={annotationBgColor}
                        onChange={(e) => setAnnotationBgColor(e.target.value)}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={annotationBgColor}
                        onChange={(e) => setAnnotationBgColor(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Text color
              </label>
                    <div className="flex items-center gap-2">
                <input
                        type="color"
                        value={annotationTextColor}
                        onChange={(e) => setAnnotationTextColor(e.target.value)}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={annotationTextColor}
                        onChange={(e) => setAnnotationTextColor(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Text Style Toggle */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Text Style
              </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnnotationBold(false)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded border-2 transition-colors ${
                        !annotationBold
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnotationBold(true)}
                      className={`flex-1 px-4 py-2 text-sm font-bold rounded border-2 transition-colors ${
                        annotationBold
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Bold
                    </button>
                  </div>
            </div>
          </div>

              {annotationText && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Preview:</p>
                  <div
                    style={{
                      backgroundColor: annotationBgColor,
                      color: annotationTextColor
                    }}
                    className={`p-2 rounded text-sm ${annotationBold ? 'font-bold' : 'font-normal'}`}
                  >
                    {annotationText}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Debug Info */}
          {type === 'STANDARD' && manualMode && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Manual mode is enabled. Switch to "Edit Moveframe" tab to see form fields, or use the "Manual Content" tab to enter distance for statistics.
              </p>
            </div>
          )}

          {/* Standard Mode - Simplified to 5 fields only */}
          {type === 'STANDARD' && !manualMode && (
            <div className="space-y-3">
              
              {/* Simplified form with only 5 fields */}
              <div className="space-y-3">
                {/* 1. Distance (m) */}
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <h3 className="font-bold text-xs text-gray-700 mb-2">
                    {(() => {
                      const bodyBuildingSports = ['BODY_BUILDING', 'STRETCHING', 'GYMNASTIC', 'PILATES', 'YOGA', 'CALISTENIC', 'SPARTAN', 'CROSSFIT'];
                      const aerobicSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'WALKING', 'ROWING', 'SKATE', 'SNOWBOARD', 'SKI', 'HIKING'];
                      const otherSports = !bodyBuildingSports.includes(sport) && !aerobicSports.includes(sport);
                      
                      if (bodyBuildingSports.includes(sport)) return 'EXERCISE AND REPETITIONS';
                      if (otherSports) return 'EXERCISE & STYLE/TECHNIQUE';
                      return 'DISTANCE & REPETITIONS';
                    })()}
                  </h3>
                  
                  {['BODY_BUILDING', 'CALISTENIC', 'SPARTAN', 'CROSSFIT'].includes(sport) ? (
                    <>
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Muscular Sector: <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={muscularSector}
                          onChange={(e) => setMuscularSector(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">Select muscular sector</option>
                          {MUSCULAR_SECTORS.map((sector) => (
                            <option key={sector} value={sector}>
                              {sector}
                            </option>
                          ))}
                        </select>
                        {errors.muscularSector && <p className="mt-1 text-xs text-red-500">{errors.muscularSector}</p>}
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Exercise + Picture: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={exercise}
                          onChange={(e) => setExercise(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                          placeholder="e.g., Bench Press, Bicep Curls..."
                        />
                        <p className="mt-1 text-[10px] text-blue-600 font-semibold">
                          📋 Manual entry (Sector + Exercise + Picture selection from archive coming soon)
                        </p>
                        {errors.exercise && <p className="mt-1 text-xs text-red-500">{errors.exercise}</p>}
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Applied Technique:
                        </label>
                        <select
                          value={appliedTechnique}
                          onChange={(e) => setAppliedTechnique(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="">None</option>
                          {availableTechniques.map((technique) => (
                            <option key={technique.id} value={technique.title}>
                              {technique.title}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] text-gray-500">
                          Optional: Select a technique from Tools settings to apply to this moveframe
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Number of series: <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={repetitions}
                          onChange={(e) => setRepetitions(e.target.value)}
                          min="1"
                          max="99"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                          placeholder="1"
                        />
                        <p className="mt-1 text-[10px] text-gray-500">
                          Range: 1-99 (default: 1)
                        </p>
                        {errors.repetitions && <p className="mt-1 text-xs text-red-500">{errors.repetitions}</p>}
                      </div>
                      
                      {/* Type of Execution for BODY_BUILDING */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type of execution:
                        </label>
                        <select
                          value={repsType}
                          onChange={(e) => setRepsType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="Reps">Reps</option>
                          <option value="Time">Time</option>
                        </select>
                      </div>
                      
                      <div>
                        {repsType === 'Time' ? (
                          <>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Time (per series): <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={time}
                              onChange={(e) => {
                                // Just update the value, don't format while typing
                                setTime(e.target.value);
                              }}
                              onBlur={(e) => {
                                // Only format on blur when user is done typing
                                const formatted = formatTime(e.target.value);
                                setTime(formatted);
                              }}
                              placeholder="123456"
                              autoComplete="off"
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            />
                            <p className="mt-0.5 text-[10px] text-blue-600">
                              💡 Type: 123456 → formats to 1h23'45"6 when you finish typing
                            </p>
                            {errors.reps && <p className="mt-1 text-xs text-red-500">{errors.reps}</p>}
                          </>
                        ) : (
                          <>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Reps (per series):</label>
                            <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={reps}
                              onChange={(e) => setReps(e.target.value)}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (e.target.value && value < 0) {
                                    alert('⚠️ Reps value too low!\n\nMinimum allowed: 0\nPlease enter a value within the valid range (0-99).');
                                    setReps('0');
                                  } else if (value > 99) {
                                    alert('⚠️ Reps value too high!\n\nMaximum allowed: 99\nPlease enter a value within the valid range (0-99).');
                                    setReps('99');
                                  }
                                }}
                                min="0"
                                max="99"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              placeholder="20"
                            />
                              <button
                                type="button"
                                onClick={() => {
                                  if (reps !== '' && parseInt(reps) >= 0) {
                                    // Apply reps value to all rows in individualPlans
                                    for (let i = 0; i < individualPlans.length; i++) {
                                      updateIndividualPlan(i, 'reps', reps);
                                    }
                                  }
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs font-semibold whitespace-nowrap"
                                title="Apply this value to all Reps cells below"
                              >
                                ↓ Apply to All
                              </button>
                            </div>
                            <p className="mt-0.5 text-[10px] text-gray-500">Range: 0-99</p>
                            {errors.reps && <p className="mt-1 text-xs text-red-500">{errors.reps}</p>}
                          </>
                        )}
                      </div>

                      {/* Planning mode Selection for BODY_BUILDING */}
                      {parseInt(repetitions) > 0 && canShowIndividualPlanning && (
                        <div className="mt-4 pt-3 border-t border-gray-300">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Planning mode:</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={planningMode === 'individual'}
                                onChange={(e) => setPlanningMode(e.target.checked ? 'individual' : 'all')}
                                className="w-4 h-4 text-cyan-600 rounded"
                              />
                              <span className="text-sm text-gray-700">
                                Plan one by one (until to 12 {['SWIM', 'BIKE', 'MTB', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'repetitions' : 'series'})
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (() => {
                    // Define sport categories
                    const bodyBuildingSports = ['BODY_BUILDING', 'STRETCHING', 'GYMNASTIC', 'PILATES', 'YOGA', 'CALISTENIC', 'SPARTAN', 'CROSSFIT'];
                    const aerobicSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'WALKING', 'ROWING', 'SKATE', 'SNOWBOARD', 'SKI', 'HIKING'];
                    const isOtherSport = !bodyBuildingSports.includes(sport) && !aerobicSports.includes(sport);
                    
                    // OTHER SPORTS (Soccer, Tennis, Boxing, etc.) - Similar to BODY_BUILDING but with Style field
                    if (isOtherSport) {
                      return (
                        <>
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Style: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={style}
                              onChange={(e) => setStyle(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              placeholder="Enter style..."
                            />
                            {errors.style && <p className="mt-1 text-xs text-red-500">{errors.style}</p>}
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Exercise/Drill Name: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={exercise}
                              onChange={(e) => setExercise(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              placeholder="e.g., Free kicks, Dribbling, etc..."
                            />
                            {errors.exercise && <p className="mt-1 text-xs text-red-500">{errors.exercise}</p>}
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Applied Technique:
                            </label>
                            <select
                              value={appliedTechnique}
                              onChange={(e) => setAppliedTechnique(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">None</option>
                              {availableTechniques.map((technique) => (
                                <option key={technique.id} value={technique.title}>
                                  {technique.title}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-[10px] text-gray-500">
                              Optional: Select a technique from Tools settings to apply to this moveframe
                            </p>
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Number of series: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={repetitions}
                              onChange={(e) => setRepetitions(e.target.value)}
                              min="1"
                              max="99"
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              placeholder="1"
                            />
                            <p className="mt-1 text-[10px] text-gray-500">
                              Range: 1-99 (default: 1)
                            </p>
                            {errors.repetitions && <p className="mt-1 text-xs text-red-500">{errors.repetitions}</p>}
                          </div>
                          
                          {/* Type of execution */}
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Type of execution:
                            </label>
                            <select
                              value={repsType}
                              onChange={(e) => setRepsType(e.target.value as any)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="Reps">Reps</option>
                              <option value="Time">Time</option>
                            </select>
                          </div>
                          
                          {repsType === 'Reps' ? (
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Reps per series: <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                min="1"
                                max="99"
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                placeholder="1"
                              />
                              <p className="mt-1 text-[10px] text-gray-500">
                                Range: 1-99
                              </p>
                              {errors.reps && <p className="mt-1 text-xs text-red-500">{errors.reps}</p>}
                            </div>
                          ) : (
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Time: <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                onBlur={(e) => setTime(formatTime(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 font-mono"
                                placeholder="123456"
                                autoComplete="off"
                              />
                              <p className="mt-1 text-[10px] text-blue-600">
                                💡 Type: 123456 → formats to 1h23'45"6
                              </p>
                              {errors.time && <p className="mt-1 text-xs text-red-500">{errors.time}</p>}
                            </div>
                          )}
                          
                          {/* Planning mode Selection */}
                          {parseInt(repetitions) > 0 && canShowIndividualPlanning && (
                            <div className="mt-4 pt-3 border-t border-gray-300">
                              <label className="block text-xs font-semibold text-gray-700 mb-2">Planning mode:</label>
                              <div className="space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                  checked={planningMode === 'individual'}
                                    onChange={(e) => setPlanningMode(e.target.checked ? 'individual' : 'all')}
                                    className="w-4 h-4 text-cyan-600 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                    Plan one by one (until to 12 series)
                                </span>
                              </label>
                          </div>
                        </div>
                      )}
                    </>
                      );
                    }
                    
                    // AEROBIC SPORTS and remaining sports
                    return (
                    <>
                      {/* Determine sport type */}
                      {(() => {
                        const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);
                        const hasTools = !isDistanceBased;
                        
                        // TOOLS-BASED SPORTS (Gymnastic, Stretching, Pilates, Yoga, etc.)
                        if (hasTools) {
                          return (
                            <>
                              <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  {['SWIM', 'BIKE', 'SPINNING', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'Repetitions:' : 'Series:'} <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  value={repetitions}
                                  onChange={(e) => setRepetitions(e.target.value)}
                                  min="1"
                                  max="99"
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                  placeholder="1"
                                />
                                <p className="mt-1 text-[10px] text-gray-500">
                                  Range: 1-99 (default: 1)
                                </p>
                                {errors.repetitions && <p className="mt-1 text-xs text-red-500">{errors.repetitions}</p>}
                              </div>

                              {/* Series/Batteries/Groups - for aerobic sports */}
                              {AEROBIC_SPORTS.includes(sport as any) && (
                                <div className="mb-3">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Series\Batteries\Groups:
                                  </label>
                                  <input
                                    type="number"
                                    value={aerobicSeries}
                                    onChange={(e) => setAerobicSeries(e.target.value)}
                                    min="1"
                                    max="9"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                    placeholder="1"
                                  />
                                  <p className="mt-1 text-[10px] text-gray-500">
                                    Range: 1-9 (default: 1) | Total = Distance × Series × Repetitions
                                  </p>
                                </div>
                              )}

                              {/* Type of Execution - for sports that support it */}
                              {hasRepsTypeSelection(sport) && (
                                <div className="mb-3">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Type of execution:
                                  </label>
                                  <select
                                    value={repsType}
                                    onChange={(e) => setRepsType(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                  >
                                    <option value="Reps">Reps or Minutes</option>
                                    <option value="Reps">Reps</option>
                                    <option value="Time">Minutes</option>
                                  </select>
                                </div>
                              )}
                              
                              {/* Conditional Input based on Type of Execution */}
                              {hasRepsTypeSelection(sport) && (
                                <div className="mb-3">
                                  {repsType === REPS_TYPES.REPS ? (
                                    <>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Reps (per series): <span className="text-red-500">*</span>
                                      </label>
                                      <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        value={reps}
                                        onChange={(e) => setReps(e.target.value)}
                                        onBlur={(e) => {
                                          const value = parseInt(e.target.value);
                                            if (e.target.value && value < 0) {
                                              alert('⚠️ Reps value too low!\n\nMinimum allowed: 0\nPlease enter a value within the valid range (0-99).');
                                              setReps('0');
                                          } else if (value > 99) {
                                              alert('⚠️ Reps value too high!\n\nMaximum allowed: 99\nPlease enter a value within the valid range (0-99).');
                                            setReps('99');
                                          }
                                        }}
                                          min="0"
                                        max="99"
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="12"
                                      />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (reps !== '' && parseInt(reps) >= 0) {
                                              // Apply reps value to all rows in individualPlans
                                              for (let i = 0; i < individualPlans.length; i++) {
                                                updateIndividualPlan(i, 'reps', reps);
                                              }
                                            }
                                          }}
                                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs font-semibold whitespace-nowrap"
                                          title="Apply this value to all Reps cells below"
                                        >
                                          ↓ Apply to All
                                        </button>
                                      </div>
                                      <p className="mt-0.5 text-[10px] text-gray-500">Range: 0-99</p>
                                    </>
                                  ) : (
                                    <>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Minutes (per series): <span className="text-red-500">*</span>
                                      </label>
                                      <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={time}
                                        onChange={(e) => {
                                          const input = e.target.value;
                                          if (input === '') {
                                            setTime('');
                                            return;
                                          }
                                          if (/^\d+$/.test(input)) {
                                            const digits = input.replace(/\D/g, '');
                                            const len = digits.length;
                                            let decisec = '0';
                                            let sec = '00';
                                            let min = '00';
                                            let hour = '0';
                                            
                                            if (len === 1) {
                                              decisec = digits[0];
                                            } else if (len === 2) {
                                              sec = digits[0].padStart(2, '0');
                                              decisec = digits[1];
                                            } else if (len === 3) {
                                              sec = digits.slice(0, 2);
                                              decisec = digits[2];
                                            } else if (len === 4) {
                                              min = digits[0].padStart(2, '0');
                                              sec = digits.slice(1, 3);
                                              decisec = digits[3];
                                            } else if (len === 5) {
                                              min = digits.slice(0, 2);
                                              sec = digits.slice(2, 4);
                                              decisec = digits[4];
                                            } else if (len === 6) {
                                              hour = digits[0];
                                              min = digits.slice(1, 3);
                                              sec = digits.slice(3, 5);
                                              decisec = digits[5];
                                            } else {
                                              hour = digits.slice(0, -5);
                                              min = digits.slice(-5, -3);
                                              sec = digits.slice(-3, -1);
                                              decisec = digits.slice(-1);
                                            }
                                            
                                            setTime(`${hour}h${min}'${sec}"${decisec}`);
                                          } else {
                                            setTime(input);
                                          }
                                        }}
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="1h23'45&quot;6"
                                      />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (time && time.trim() !== '') {
                                              // Apply time value to all rows in individualPlans
                                              for (let i = 0; i < individualPlans.length; i++) {
                                                updateIndividualPlan(i, 'time', time);
                                              }
                                            }
                                          }}
                                          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs font-semibold whitespace-nowrap"
                                          title="Apply this value to all Minutes cells below"
                                        >
                                          ↓ Apply to All
                                        </button>
                                      </div>
                                      <p className="mt-0.5 text-[10px] text-blue-600">
                                        💡 Type: 123456 → formats to 1h23'45"6 when you finish typing
                                      </p>
                                      </>
                                    )}
                                </div>
                              )}

                              {/* Planning mode Selection for tools-based sports */}
                              {parseInt(repetitions) > 0 && canShowIndividualPlanning && (
                                <div className="mt-4 pt-3 border-t border-gray-300">
                                  <label className="block text-xs font-semibold text-gray-700 mb-2">Planning mode:</label>
                                  <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                          checked={planningMode === 'individual'}
                                        onChange={(e) => setPlanningMode(e.target.checked ? 'individual' : 'all')}
                                        className="w-4 h-4 text-cyan-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">
                                        Plan one by one (until to 12 {['SWIM', 'BIKE', 'MTB', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'repetitions' : 'series'})
                                        </span>
                                      </label>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        }
                        
                        // DISTANCE-BASED SPORTS (Swim, Bike, Run, Rowing, Skate, Ski, Snowboard)
                        if (isDistanceBased && 'meters' in sportConfig) {
                          return (
                            <>
                      {/* Type of execution for distance-based sports */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type of execution:
                        </label>
                        <select
                          value={repsType}
                          onChange={(e) => {
                            setRepsType(e.target.value as any);
                            // Reset distance/time when switching
                            if (e.target.value === 'Time') {
                              setDistance('');
                              setTime('');
                            } else {
                              setDistance(sportConfig.meters[0] || '');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                        >
                          <option value="Reps">Distance</option>
                          <option value="Time">Time</option>
                        </select>
                      </div>
                      
                      {/* Distance-based sports fields */}
                      {repsType === 'Time' ? (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Time: <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={time}
                            onChange={(e) => {
                              // Just update the value, don't format while typing
                              setTime(e.target.value);
                            }}
                            onBlur={(e) => {
                              // Only format on blur when user is done typing
                              const input = e.target.value.trim();
                              if (input === '') {
                                setTime('');
                                return;
                              }
                              
                              // Check if it's all digits - if so, format it
                              if (/^\d+$/.test(input)) {
                                const digits = input.replace(/\D/g, '');
                                const len = digits.length;
                                let decisec = '0';
                                let sec = '00';
                                let min = '00';
                                let hour = '0';
                                
                                if (len === 1) {
                                  decisec = digits[0];
                                } else if (len === 2) {
                                  sec = digits[0].padStart(2, '0');
                                  decisec = digits[1];
                                } else if (len === 3) {
                                  sec = digits.slice(0, 2);
                                  decisec = digits[2];
                                } else if (len === 4) {
                                  min = digits[0].padStart(2, '0');
                                  sec = digits.slice(1, 3);
                                  decisec = digits[3];
                                } else if (len === 5) {
                                  min = digits.slice(0, 2);
                                  sec = digits.slice(2, 4);
                                  decisec = digits[4];
                                } else if (len === 6) {
                                  hour = digits[0];
                                  min = digits.slice(1, 3);
                                  sec = digits.slice(3, 5);
                                  decisec = digits[5];
                                } else {
                                  hour = digits.slice(0, -5);
                                  min = digits.slice(-5, -3);
                                  sec = digits.slice(-3, -1);
                                  decisec = digits.slice(-1);
                                }
                                
                                setTime(`${hour}h${min}'${sec}"${decisec}`);
                              }
                              // If it's not all digits, keep it as-is (might already be formatted)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            placeholder="123456"
                            autoComplete="off"
                          />
                          <p className="mt-0.5 text-[10px] text-blue-600">
                            💡 Type: 123456 → formats to 1h23'45"6 when you finish typing
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Meters: <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={distance}
                              onChange={(e) => setDistance(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            >
                              {sportConfig.meters.map((m) => (
                                <option key={m} value={m}>
                                {m === 'input' ? 'Custom distance...' : `${m}m`}
                                </option>
                              ))}
                            </select>
                            {errors.distance && <p className="mt-1 text-xs text-red-500">{errors.distance}</p>}
                          </div>

                          {(distance === 'custom' || distance === 'input') && (
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Custom Distance:</label>
                              <input
                                type="number"
                                value={customDistance}
                                onChange={(e) => setCustomDistance(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                placeholder="Enter custom distance"
                              />
                              {errors.customDistance && <p className="mt-1 text-xs text-red-500">{errors.customDistance}</p>}
                            </div>
                          )}
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {(['SWIM', 'BIKE', 'SPINNING', 'RUN', 'BODY_BUILDING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport)) ? 'Repetitions:' : 'Series:'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={repetitions}
                            onChange={(e) => setRepetitions(e.target.value)}
                            min="1"
                            max="99"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                          />
                          <span className="text-gray-500">×</span>
                        </div>
                        {errors.repetitions && <p className="mt-1 text-xs text-red-500">{errors.repetitions}</p>}
                        {totalDistance > 0 && (
                          <p className="mt-1 text-xs text-green-600 font-medium">
                            Total: {totalDistance}m
                          </p>
                        )}
                      </div>

                      {/* Series/Batteries/Groups - for aerobic sports */}
                      {AEROBIC_SPORTS.includes(sport as any) && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Series\Batteries\Groups:
                          </label>
                          <input
                            type="number"
                            value={aerobicSeries}
                            onChange={(e) => setAerobicSeries(e.target.value)}
                            min="1"
                            max="9"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            placeholder="1"
                          />
                          <p className="mt-1 text-[10px] text-gray-500">
                            Range: 1-9 (default: 1) | Total will be = Meters × Series × Repetitions
                          </p>
                        </div>
                      )}

                      {/* New WORK section fields: Strokes and Watts */}
                      {parseInt(repetitions) > 0 && planningMode === 'all' && (() => {
                        // Determine if this sport should have enabled (white) or disabled (gray) work settings
                        const enabledWorkSports = ['SWIM', 'BIKE', 'MTB', 'ROWING', 'CANOEING'];
                        const isWorkEnabled = enabledWorkSports.includes(sport);
                        
                        return (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-xs font-semibold text-blue-700 mb-2">⚙️ WORK SETTINGS</h4>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Strokes:</label>
                              <input
                                  type="number"
                                  min="0"
                                  step="1"
                                value={strokes}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers (remove any non-numeric characters)
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setStrokes(value);
                                  }
                                }}
                                onKeyPress={(e) => {
                                  // Prevent non-numeric characters from being entered
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                  disabled={!isWorkEnabled}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 ${
                                    isWorkEnabled ? 'bg-white' : 'bg-gray-200 cursor-not-allowed'
                                  }`}
                                placeholder="Enter strokes value..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Watts:</label>
                              <input
                                  type="number"
                                  min="0"
                                  step="1"
                                value={watts}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers (remove any non-numeric characters)
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setWatts(value);
                                  }
                                }}
                                onKeyPress={(e) => {
                                  // Prevent non-numeric characters from being entered
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                  disabled={!isWorkEnabled}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 ${
                                    isWorkEnabled ? 'bg-white' : 'bg-gray-200 cursor-not-allowed'
                                  }`}
                                placeholder="Enter watts value..."
                              />
                            </div>
                          </div>
                        </div>
                        );
                      })()}

                      {/* Planning mode Selection for distance-based sports (except BIKE and MTB) */}
                      {parseInt(repetitions) > 0 && !['BIKE', 'MTB'].includes(sport) && canShowIndividualPlanning && (
                        <div className="mt-4 pt-3 border-t border-gray-300">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Planning mode:</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                  checked={planningMode === 'individual'}
                                onChange={(e) => setPlanningMode(e.target.checked ? 'individual' : 'all')}
                                className="w-4 h-4 text-cyan-600 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                Plan one by one (until to 12 {['SWIM', 'BIKE', 'MTB', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'repetitions' : 'series'})
                                </span>
                              </label>
                          </div>
                        </div>
                      )}
                      
                      {/* Break Mode and Break fields (except for BIKE and MTB) */}
                      {parseInt(repetitions) > 0 && !['BIKE', 'MTB'].includes(sport) && (
                        <>
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Break mode:
                            </label>
                            <select
                              value={breakMode || 'stopped'}
                              onChange={(e) => setBreakMode(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">Break type between rehearsals</option>
                              <option value="stopped">Stopped</option>
                              <option value="speed">Speed</option>
                              <option value="watts">Watts</option>
                            </select>
                          </div>
                          
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Break:
                            </label>
                            {breakMode === 'stopped' && (
                              <TimeInput
                                value={breakTime || ''}
                                onChange={(val) => setBreakTime(val)}
                                label=""
                                placeholder="0h01'30&quot;0"
                                showLabel={false}
                                allowedUnits={['hours', 'minutes', 'seconds']}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              />
                            )}
                            {(breakMode === 'speed' || breakMode === 'watts') && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-600">From standstill</label>
                                  <input
                                    type="text"
                                    value={breakFromStandstill || ''}
                                    onChange={(e) => setBreakFromStandstill(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                    placeholder={breakMode === 'speed' ? 'Vel\\km or Vel\\h' : 'Watts'}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-gray-600">{breakMode === 'speed' ? 'Vel\\100' : 'Watts ( for run, bike, rowing )'}</label>
                                  <input
                                    type="text"
                                    value={breakVel100 || ''}
                                    onChange={(e) => setBreakVel100(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                    placeholder={breakMode === 'speed' ? 'Vel\\100' : 'Watts'}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* New PAUSE section fields: Rest type, Pause Min., Mode, Pace */}
                      {parseInt(repetitions) > 0 && planningMode === 'all' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <h4 className="text-xs font-semibold text-amber-700 mb-2">⏸️ PAUSE SETTINGS</h4>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Rest Type:</label>
                              <select
                                value={restType}
                                onChange={(e) => setRestType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="Set time">Set time</option>
                                {repsType === 'Time' && <option value="Restart time">Restart time</option>}
                                <option value="Restart pulse">Restart pulse</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {restType === 'Restart pulse' ? 'Pause Cardio:' : 'Pause Min.:'}
                              </label>
                              {restType === 'Set time' ? (
                                <select
                                  value={pauseMin}
                                  onChange={(e) => setPauseMin(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                >
                                  {(Array.isArray(sportConfig.pauses) ? sportConfig.pauses : (sportConfig.pauses as any)?.['Set time'] || []).map((p: string) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              ) : restType === 'Restart time' ? (
                                <input
                                  type="text"
                                  value={pauseMin}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    setPauseMin(digits);
                                  }}
                                  onBlur={(e) => {
                                    // Format as 0'18''4 on blur
                                    const digits = e.target.value.replace(/\D/g, '');
                                    if (digits.length > 0) {
                                      const len = digits.length;
                                      let formatted = '';
                                      if (len === 1) {
                                        formatted = `0'0${digits}''0`;
                                      } else if (len === 2) {
                                        formatted = `0'${digits}''0`;
                                      } else if (len === 3) {
                                        formatted = `0'${digits.slice(0, 2)}''${digits.slice(2)}`;
                                      } else {
                                        const hour = digits.slice(0, -3) || '0';
                                        const mins = digits.slice(-3, -1) || '00';
                                        const tenth = digits.slice(-1) || '0';
                                        formatted = `${hour}'${mins}''${tenth}`;
                                      }
                                      setPauseMin(formatted);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 font-mono"
                                  placeholder="e.g., 184 → 0'18''4"
                                />
                              ) : restType === 'Restart pulse' ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={pauseMin}
                                  onChange={(e) => setPauseMin(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                  placeholder="Enter heart rate..."
                                />
                              ) : (
                              <input
                                type="text"
                                value={pauseMin}
                                onChange={(e) => setPauseMin(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                placeholder="Enter pause minimum..."
                              />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Mode:</label>
                              <select
                                value={pauseMode}
                                onChange={(e) => setPauseMode(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="">Select mode...</option>
                                <option value="stopped">Stopped</option>
                                <option value="speed">Speed</option>
                                {['SWIM', 'BIKE', 'MTB', 'ROWING'].includes(sport) && (
                                <option value="watts">Watts</option>
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Pace:</label>
                              {pauseMode === 'stopped' ? (
                                <input
                                  type="text"
                                  value="0"
                                  disabled
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 bg-gray-100 cursor-not-allowed"
                                />
                              ) : pauseMode === 'speed' ? (
                              <input
                                type="text"
                                value={pausePace}
                                  onChange={(e) => {
                                    // Format: 00.0 for all sports
                                    const value = e.target.value.replace(/[^\d.]/g, '');
                                    setPausePace(value);
                                  }}
                                  onBlur={(e) => {
                                    // Format on blur: 0.0 (max 999.9)
                                    const value = parseFloat(e.target.value.replace(/[^\d.]/g, '')) || 0;
                                    if (value > 999.9) {
                                      setPausePace('999.9');
                                    } else {
                                      setPausePace(value.toFixed(1));
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 font-mono"
                                  placeholder="e.g., 35.3 (0.0 to 999.9)"
                                />
                              ) : pauseMode === 'watts' ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={pausePace}
                                  onChange={(e) => {
                                    // Limit to 3 digits
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                    setPausePace(value);
                                  }}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                  placeholder="Enter watts (000)..."
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={pausePace}
                                  disabled
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 bg-gray-100 cursor-not-allowed"
                                  placeholder="Select mode first..."
                              />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                            </>
                          );
                        }
                        
                        return null;
                      })()}
                    </>
                    );
                  })()}
                </div>

                {/* 2. Sport-Specific Fields */}
                {sport !== 'BODY_BUILDING' && (
                <div className="bg-gray-50 p-2.5 rounded-lg">
                    <h3 className="font-bold text-xs text-gray-700 mb-2">
                      {sport === 'BIKE' ? 'BIKE SETTINGS' : 
                       (['SWIM', 'SPINNING', 'RUN', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'STYLE & TECHNIQUE' : 'EXERCISE & STYLE/TECHNIQUE')}
                    </h3>
                    
                    {/* Style - For sports with styles defined */}
                    {'styles' in sportConfig && sportConfig.styles && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Style:</label>
                        {Array.isArray(sportConfig.styles) ? (
                          <select
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="">Select style...</option>
                            {sportConfig.styles.map((s: string) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                            placeholder="Enter style..."
                          />
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {sport === 'SWIM' && 'Swimming style/stroke'}
                          {sport === 'RUN' && 'Running surface/terrain'}
                          {sport === 'BIKE' && 'Bike type/terrain'}
                          {sport === 'SKATE' && 'Skating surface'}
                          {sport === 'SKI' && 'Skiing style'}
                          {sport === 'SNOWBOARD' && 'Snowboarding style'}
                        </p>
                      </div>
                    )}
                    
                    {/* R1 and R2 - Only for BIKE */}
                    {sport === 'BIKE' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">R1 (Front Gear):</label>
                          <select
                            value={r1}
                            onChange={(e) => setR1(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                          >
                            {R1_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt || 'Not set'}
                              </option>
                            ))}
                          </select>
                          <p className="mt-0.5 text-[10px] text-gray-500">Front chainring teeth</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">R2 (Rear Gear):</label>
                          <select
                            value={r2}
                            onChange={(e) => setR2(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                          >
                            {R2_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt || 'Not set'}
                              </option>
                            ))}
                          </select>
                          <p className="mt-0.5 text-[10px] text-gray-500">Rear cog teeth (10-52)</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Exercise/Drill Name Selection - For sports that need exercise names */}
                    {sportNeedsExerciseName(sport) && sport !== 'BODY_BUILDING' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {sport === 'FREE_MOVES' ? 'Exercise' : 'Exercise/Drill Name'}: <span className="text-red-500">*</span>
                          </label>
                          
                          {sport === 'FREE_MOVES' ? (
                            /* Complex input with history for FREE_MOVES */
                            <>
                              {/* Dropdown/Autocomplete with exercise history */}
                              <div className="relative">
                                <select
                                  value={exercise}
                                  onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    if (selectedValue === '__NEW__') {
                                      // User wants to add a new exercise
                                      setExercise('');
                                    } else {
                                      setExercise(selectedValue);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 text-sm"
                                >
                                  <option value="">Select or type new exercise...</option>
                                  <option value="__NEW__">➕ Add new exercise</option>
                                  {freeMoveExercises.map((ex) => (
                                    <option key={ex.id} value={ex.name}>
                                      {ex.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* Manual input field (always visible for new entries) */}
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={exercise}
                                  onChange={(e) => setExercise(e.target.value)}
                                  onBlur={async (e) => {
                                    const newExercise = e.target.value.trim();
                                    // If exercise is typed and not in history, save it
                                    if (newExercise && !freeMoveExercises.some(ex => ex.name === newExercise)) {
                                      console.log('💾 Saving new FREE_MOVES exercise:', newExercise);
                                      const success = await addFreeMoveExercise(newExercise);
                                      if (success) {
                                        console.log('✅ Exercise saved to history');
                                      }
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 text-sm"
                                  placeholder="Type exercise name..."
                                />
                                <p className="mt-1 text-[10px] text-gray-500">
                                  Type a new exercise or select from your history. New exercises are automatically saved.
                                </p>
                              </div>
                              
                              {/* Exercise history with delete option */}
                              {freeMoveExercises.length > 0 && (
                                <div className="mt-3 p-2 bg-white border border-gray-200 rounded max-h-40 overflow-y-auto">
                                  <p className="text-[10px] font-semibold text-gray-600 mb-2">Your Exercise History:</p>
                                  <div className="space-y-1">
                                    {freeMoveExercises.map((ex) => (
                                      <div key={ex.id} className="flex items-center justify-between group hover:bg-gray-50 px-2 py-1 rounded">
                                        <button
                                          type="button"
                                          onClick={() => setExercise(ex.name)}
                                          className="flex-1 text-left text-xs text-gray-700 hover:text-cyan-600"
                                        >
                                          {ex.name}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (confirm(`Delete "${ex.name}" from your exercise history?`)) {
                                              const success = await deleteFreeMoveExercise(ex.id);
                                              if (success) {
                                                console.log('✅ Exercise deleted from history');
                                                // If the deleted exercise was selected, clear the field
                                                if (exercise === ex.name) {
                                                  setExercise('');
                                                }
                                              }
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs px-2 py-0.5 transition-opacity"
                                          title="Delete from history"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {loadingExercises && (
                                <p className="mt-2 text-xs text-gray-500">Loading exercise history...</p>
                              )}
                            </>
                          ) : (
                            /* Simple input for other sports */
                            <input
                              type="text"
                              value={exercise}
                              onChange={(e) => setExercise(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 text-sm"
                              placeholder="Enter exercise or drill name..."
                            />
                          )}
                          
                          {errors.exercise && <p className="mt-1 text-xs text-red-500">{errors.exercise}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Repetition Planning Table for DISTANCE-BASED SPORTS ONLY */}
                {(() => {
                  const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);
                  
                  if (!isDistanceBased || planningMode !== 'individual' || !canShowIndividualPlanning) return null;
                  
                  return (
                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2">
                      <span>📋 INDIVIDUAL {sport === 'ROWING' ? 'SERIES' : 'REPETITION'} PLANNING</span>
                      <span className="text-[10px] bg-blue-200 text-blue-700 px-2 py-0.5 rounded font-normal">
                        {individualPlans.length} {sport === 'ROWING' ? 'series' : 'reps'}
                      </span>
                    </h3>
                    
                    {/* Pace/Speed field for reference */}
                    <div className="mb-3 p-2 bg-white rounded border border-gray-300">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {(() => {
                          if (sport === 'BIKE') return 'Speed/h:';
                          if (sport === 'ROWING') return 'Speed/500m:';
                          if (sport === 'SKI') return 'Pace/Refdist:';
                          // For other sports, use the original getPaceLabel logic
                          return 'Pace/100m:'; // Default for individual planning mode
                        })()}{' '}
                        <span className="text-[10px] text-green-600 font-semibold">✨ Flexible input</span>
                      </label>
                      <input
                        type="text"
                        value={pace}
                        onChange={(e) => setPace(e.target.value)}
                        onBlur={(e) => setPace(formatPace(e.target.value))}
                        className="w-full px-3 py-2 text-lg border-2 border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono bg-green-50"
                        placeholder={
                          sport === 'BIKE' ? 'e.g., 35.3 or 120.5' :
                          sport === 'ROWING' ? "1'30\" or 130" :
                          sport === 'SKI' ? "2'45\" or 245" :
                          "1.30 or 130 or 1:30"
                        }
                      />
                      <p className="mt-1 text-[10px] text-green-600">
                        {sport === 'BIKE' ? (
                          <>✨ Enter speed manually with decimal point: <strong>35.3</strong>, <strong>120.5</strong>, or <strong>185.0 km/h</strong> (range: 0.0 to 999.9)</>
                        ) : sport === 'ROWING' ? (
                          <>✨ Type: <strong>1:30.5</strong> or <strong>1305</strong> → <strong>1'30"5</strong> (Speed per 500m, range: 0'00"0 to 9'59"9)</>
                        ) : sport === 'SKI' ? (
                          <>✨ Type: <strong>2:45</strong> or <strong>245</strong> → <strong>2'45"</strong> (Pace per Refdist)</>
                        ) : (
                          <>✨ Type: <strong>1.30</strong>, <strong>1.30.5</strong>, or <strong>130</strong> → formats to <strong>1'30"0</strong> or <strong>1'30"5</strong></>
                        )}
                      </p>
                    </div>
                    
                    {/* Scrollable table - 6 rows visible */}
                    <div className="border border-gray-300 rounded overflow-hidden bg-white">
                      <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '300px' }}>
                        <table className="w-full text-xs">
                          <thead className="bg-gray-200 sticky top-0 z-10">
                            <tr>
                              <th className="border border-gray-300 px-2 py-2 text-center w-12">#</th>
                              <th className="border border-gray-300 px-2 py-2 text-center" colSpan={4}>WORK</th>
                              <th className="border border-gray-300 px-2 py-2 text-center" colSpan={4}>PAUSE</th>
                              <th className="border border-gray-300 px-2 py-2 text-center w-20"></th>
                            </tr>
                            <tr>
                              <th className="border-b border-gray-300"></th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-blue-50 min-w-[120px]">Speed</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-blue-50">Time</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-blue-50">Strokes</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-blue-50">Watts</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-amber-50 min-w-[120px]">Rest Type</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-amber-50 min-w-[100px]">Time</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-amber-50 min-w-[120px]">Mode</th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-amber-50 min-w-[120px]">Pace</th>
                              <th className="border-b border-gray-300"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {individualPlans.map((plan, idx) => {
                              const aerobicSeriesNum = parseInt(aerobicSeries) || 1;
                              const repsPerGroup = Math.ceil(individualPlans.length / aerobicSeriesNum);
                              const currentGroup = Math.floor(idx / repsPerGroup) + 1;
                              const isFirstInGroup = idx % repsPerGroup === 0;
                              
                              return (
                                <React.Fragment key={idx}>
                                  {/* Group Header */}
                                  {AEROBIC_SPORTS.includes(sport as any) && aerobicSeriesNum > 1 && isFirstInGroup && (
                                    <tr>
                                      <td colSpan={10} className="border border-gray-400 bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900 text-center">
                                        Serie\Group {currentGroup}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-blue-50">
                                <td className="border border-gray-300 px-2 py-2 text-center font-bold bg-gray-50">
                                  {plan.index}
                                </td>
                                {/* WORK section columns */}
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <select
                                    value={plan.speed}
                                    onChange={(e) => updateIndividualPlan(idx, 'speed', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500"
                                  >
                                    {sportConfig.speeds.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={plan.time}
                                    onChange={(e) => updateIndividualPlan(idx, 'time', e.target.value)}
                                    onBlur={(e) => updateIndividualPlan(idx, 'time', formatTime(e.target.value))}
                                    className="w-full px-2 py-1.5 border-2 border-green-300 rounded text-xs focus:ring-1 focus:ring-green-500 font-mono bg-green-50"
                                    placeholder="123456"
                                    autoComplete="off"
                                    title="Type: 123456 → formats to 1h23'45&quot;6"
                                  />
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={plan.strokes || ''}
                                    onChange={(e) => updateIndividualPlan(idx, 'strokes', e.target.value)}
                                    disabled={!['SWIM', 'BIKE', 'MTB', 'ROWING', 'CANOEING'].includes(sport)}
                                    className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 ${
                                      ['SWIM', 'BIKE', 'MTB', 'ROWING', 'CANOEING'].includes(sport) ? 'bg-white' : 'bg-gray-200 cursor-not-allowed'
                                    }`}
                                    placeholder="Strokes"
                                  />
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={plan.watts || ''}
                                    onChange={(e) => updateIndividualPlan(idx, 'watts', e.target.value)}
                                    disabled={!['SWIM', 'BIKE', 'MTB', 'ROWING', 'CANOEING'].includes(sport)}
                                    className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 ${
                                      ['SWIM', 'BIKE', 'MTB', 'ROWING', 'CANOEING'].includes(sport) ? 'bg-white' : 'bg-gray-200 cursor-not-allowed'
                                    }`}
                                    placeholder="Watts"
                                  />
                                </td>
                                {/* PAUSE section columns */}
                                {/* Rest Type */}
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <select
                                    value={plan.restType || 'Set time'}
                                    onChange={(e) => updateIndividualPlan(idx, 'restType', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500"
                                  >
                                    <option value="Set time">Set time</option>
                                    <option value="Restart time">Restart time</option>
                                    <option value="Restart pulse">Restart pulse</option>
                                  </select>
                                </td>
                                {/* Pause Time */}
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={plan.pause || ''}
                                    onChange={(e) => updateIndividualPlan(idx, 'pause', e.target.value)}
                                    onBlur={(e) => {
                                      const restType = plan.restType || 'Set time';
                                      if (restType === 'Restart time') {
                                        updateIndividualPlan(idx, 'pause', formatTime(e.target.value));
                                      } else if (restType === 'Restart pulse') {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                        updateIndividualPlan(idx, 'pause', value);
                                      } else {
                                        updateIndividualPlan(idx, 'pause', formatTime(e.target.value));
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border-2 border-green-300 rounded text-xs focus:ring-1 focus:ring-green-500 font-mono bg-green-50"
                                    placeholder={(plan.restType || 'Set time') === 'Restart pulse' ? 'bpm' : '123456'}
                                    autoComplete="off"
                                    title={(plan.restType || 'Set time') === 'Restart pulse' ? 'Enter pulse (bpm)' : 'Type: 123456 â†’ formats to 1h23\'45"6'}
                                  />
                                </td>
                                {/* Mode */}
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <select
                                    value={plan.pauseMode || ''}
                                    onChange={(e) => {
                                      updateIndividualPlan(idx, 'pauseMode', e.target.value);
                                      // If mode is "stopped", set pace to 0 and make it non-editable
                                      if (e.target.value === 'stopped') {
                                        updateIndividualPlan(idx, 'pausePace', '0');
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500"
                                  >
                                    <option value="">Mode...</option>
                                    <option value="stopped">Stopped</option>
                                    <option value="speed">Speed</option>
                                    {['SWIM', 'BIKE', 'MTB', 'ROWING'].includes(sport) && (
                                    <option value="watts">Watts</option>
                                    )}
                                  </select>
                                </td>
                                {/* Pace */}
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <input
                                    type="text"
                                    value={plan.pausePace || ''}
                                    onChange={(e) => {
                                      // Format based on mode
                                      const mode = plan.pauseMode;
                                      if (mode === 'watts') {
                                        // Format as 000 (3 digits max)
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                        updateIndividualPlan(idx, 'pausePace', value);
                                      } else if (mode === 'speed') {
                                        // Format: 00.0 for all sports
                                        const value = e.target.value.replace(/[^\d.]/g, '');
                                        updateIndividualPlan(idx, 'pausePace', value);
                                      } else {
                                        updateIndividualPlan(idx, 'pausePace', e.target.value);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Format on blur
                                      const mode = plan.pauseMode;
                                      if (mode === 'speed') {
                                        // Format: 0.0 (max 999.9) for all sports
                                        let value = parseFloat(e.target.value);
                                        if (!isNaN(value)) {
                                          if (value > 999.9) {
                                            value = 999.9;
                                          }
                                          updateIndividualPlan(idx, 'pausePace', value.toFixed(1));
                                        }
                                      } else if (mode === 'watts') {
                                        // Ensure 3 digits
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 3).padStart(3, '0');
                                        updateIndividualPlan(idx, 'pausePace', value);
                                      }
                                    }}
                                    disabled={plan.pauseMode === 'stopped'}
                                    className={`w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 ${
                                      plan.pauseMode === 'stopped' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    placeholder={
                                      plan.pauseMode === 'stopped' ? '0' :
                                      plan.pauseMode === 'watts' ? '000' :
                                      plan.pauseMode === 'speed' ? '00.0' :
                                      'Pace'
                                    }
                                  />
                                </td>
                                <td className="border border-gray-300 px-1 py-1.5 text-center">
                                  {idx > 0 && idx < individualPlans.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => copyDownRow(idx)}
                                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center gap-1 transition-all whitespace-nowrap"
                                      title="Copy this row to all rows below"
                                    >
                                      <ChevronsDown className="w-3 h-3" />
                                      <span>Copy</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <p className="mt-2 text-[10px] text-blue-600 flex items-center gap-1">
                      <span>ℹ️</span>
                      <span>Scroll to view all {individualPlans.length} {['SWIM', 'BIKE', 'SPINNING', 'RUN', 'BODY_BUILDING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'repetitions' : 'series'}. Each can have unique speed, time, and pause values.</span>
                    </p>
                  </div>
                  );
                })()}

                {/* Individual Repetition Planning Table for BODY BUILDING and similar sports */}
                {['BODY_BUILDING', 'STRETCHING', 'GYMNASTIC', 'PILATES', 'YOGA', 'CALISTENIC', 'SPARTAN', 'CROSSFIT'].includes(sport) && planningMode === 'individual' && canShowIndividualPlanning && (
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2">
                      <span>💪 {repsType === 'Time' ? 'TIME' : 'REPS'} & WEIGHTS PLANNING</span>
                      <span className="text-[10px] bg-blue-200 text-blue-700 px-2 py-0.5 rounded font-normal">
                        {individualPlans.length} series
                      </span>
                    </h3>
                    
                    {/* Scrollable table - 6 rows visible */}
                    <div className="border border-gray-300 rounded overflow-hidden bg-white">
                      <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '300px' }}>
                        <table className="w-full text-xs table-fixed">
                          <colgroup>
                            <col className="w-12" />
                            <col className="w-1/3" />
                            <col className="w-1/3" />
                            <col className="w-1/4" />
                            <col className="w-20" />
                          </colgroup>
                          <thead className="bg-gray-200 sticky top-0 z-10">
                            <tr>
                              <th className="border border-gray-300 px-2 py-2 text-center">#</th>
                              <th className="border border-gray-300 px-2 py-2 text-center" colSpan={2}>
                                {repsType === 'Time' ? 'TIME & WEIGHTS' : 'REPS & WEIGHTS'}
                              </th>
                              <th className="border border-gray-300 px-2 py-2 text-center">REST & ALERTS</th>
                              <th className="border border-gray-300 px-2 py-2 text-center"></th>
                            </tr>
                            <tr>
                              <th className="border-b border-gray-300"></th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">
                                <span className="font-semibold">{repsType === 'Time' ? 'Minutes' : 'Reps'}</span>
                              </th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">
                                <span className="font-semibold">Weights</span>
                              </th>
                              <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">
                                <span className="font-semibold">
                                  {restType === 'Set time' && 'Pause'}
                                  {restType === 'Restart time' && 'Restart to'}
                                  {restType === 'Restart pulse' && 'Restart pulse'}
                                  {!restType && 'Pause'}
                                </span>
                              </th>
                              <th className="border-b border-gray-300"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {individualPlans.map((plan, idx) => {
                              const aerobicSeriesNum = parseInt(aerobicSeries) || 1;
                              const repsPerGroup = Math.ceil(individualPlans.length / aerobicSeriesNum);
                              const currentGroup = Math.floor(idx / repsPerGroup) + 1;
                              const isFirstInGroup = idx % repsPerGroup === 0;
                              
                              return (
                                <React.Fragment key={idx}>
                                  {/* Group Header */}
                                  {AEROBIC_SPORTS.includes(sport as any) && aerobicSeriesNum > 1 && isFirstInGroup && (
                                    <tr>
                                      <td colSpan={5} className="border border-gray-400 bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900 text-center">
                                        Serie\Group {currentGroup}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-blue-50">
                                <td className="border border-gray-300 px-2 py-2 text-center font-bold bg-gray-50">
                                  {plan.index}
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                      {repsType === 'Time' ? (
                                        <input
                                          type="text"
                                          value={plan.reps ?? ''}
                                      onChange={(e) => {
                                        const input = e.target.value;
                                        if (input === '') {
                                          updateIndividualPlan(idx, 'reps', '');
                                          return;
                                        }
                                        if (/^\d+$/.test(input)) {
                                          const digits = input.replace(/\D/g, '');
                                          const len = digits.length;
                                          let decisec = '0';
                                          let sec = '00';
                                          let min = '00';
                                          let hour = '0';
                                          
                                          if (len === 1) {
                                            decisec = digits[0];
                                          } else if (len === 2) {
                                            sec = digits[0].padStart(2, '0');
                                            decisec = digits[1];
                                          } else if (len === 3) {
                                            sec = digits.slice(0, 2);
                                            decisec = digits[2];
                                          } else if (len === 4) {
                                            min = digits[0].padStart(2, '0');
                                            sec = digits.slice(1, 3);
                                            decisec = digits[3];
                                          } else if (len === 5) {
                                            min = digits.slice(0, 2);
                                            sec = digits.slice(2, 4);
                                            decisec = digits[4];
                                          } else if (len === 6) {
                                            hour = digits[0];
                                            min = digits.slice(1, 3);
                                            sec = digits.slice(3, 5);
                                            decisec = digits[5];
                                          } else {
                                            hour = digits.slice(0, -5);
                                            min = digits.slice(-5, -3);
                                            sec = digits.slice(-3, -1);
                                            decisec = digits.slice(-1);
                                          }
                                          
                                          updateIndividualPlan(idx, 'reps', `${hour}h${min}'${sec}"${decisec}`);
                                        } else {
                                          updateIndividualPlan(idx, 'reps', input);
                                        }
                                      }}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                      placeholder="1h23'45&quot;6"
                                    />
                                  ) : (
                                  <input
                                    type="number"
                                    value={plan.reps ?? ''}
                                    onInput={(e) => {
                                      // Use onInput instead of onChange for more immediate response
                                      const value = (e.target as HTMLInputElement).value;
                                      updateIndividualPlan(idx, 'reps', value);
                                    }}
                                    onChange={(e) => {
                                      // Also handle onChange as fallback
                                      const value = e.target.value;
                                      updateIndividualPlan(idx, 'reps', value);
                                    }}
                                    onBlur={(e) => {
                                      const value = parseInt(e.target.value);
                                        if (e.target.value && (value < 0 || value > 99)) {
                                          console.warn('Reps must be between 0 and 99');
                                        updateIndividualPlan(idx, 'reps', '12');
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                    placeholder="12"
                                      min="0"
                                      max="99"
                                  />
                                  )}
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  <input
                                    type="number"
                                    value={plan.weight ?? ''}
                                    onInput={(e) => {
                                      // Use onInput for more immediate response
                                      const value = (e.target as HTMLInputElement).value;
                                      if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9999)) {
                                        updateIndividualPlan(idx, 'weight', value);
                                      }
                                    }}
                                    onChange={(e) => {
                                      // Also handle onChange as fallback
                                      const value = e.target.value;
                                      if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9999)) {
                                        updateIndividualPlan(idx, 'weight', value);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const value = parseInt(e.target.value);
                                      if (e.target.value && (value < 0 || value > 9999)) {
                                        console.warn('Weight must be between 0 and 9999');
                                        updateIndividualPlan(idx, 'weight', '');
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                    placeholder="0"
                                    min="0"
                                    max="9999"
                                  />
                                </td>
                                <td className="border border-gray-300 px-2 py-1.5">
                                  {(() => {
                                    // For "Reps" mode with "Restart time" - hide/disable the field
                                    if (repsType === 'Reps' && restType === 'Restart time') {
                                      return (
                                        <input
                                          type="text"
                                          value=""
                                          disabled
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-center"
                                          placeholder="—"
                                        />
                                      );
                                    }
                                    
                                    // For "Set time" - time input (both Reps and Minutes modes)
                                    if (restType === 'Set time') {
                                      return (
                                        <input
                                          type="text"
                                          value={plan.pause ?? ''}
                                          onChange={(e) => {
                                            const input = e.target.value;
                                            if (input === '') {
                                              updateIndividualPlan(idx, 'pause', '');
                                              return;
                                            }
                                            if (/^\d+$/.test(input)) {
                                              const digits = input.replace(/\D/g, '');
                                              const len = digits.length;
                                              let decisec = '0';
                                              let sec = '00';
                                              let min = '00';
                                              let hour = '0';
                                              
                                              if (len === 1) {
                                                decisec = digits[0];
                                              } else if (len === 2) {
                                                sec = digits[0].padStart(2, '0');
                                                decisec = digits[1];
                                              } else if (len === 3) {
                                                sec = digits.slice(0, 2);
                                                decisec = digits[2];
                                              } else if (len === 4) {
                                                min = digits[0].padStart(2, '0');
                                                sec = digits.slice(1, 3);
                                                decisec = digits[3];
                                              } else if (len === 5) {
                                                min = digits.slice(0, 2);
                                                sec = digits.slice(2, 4);
                                                decisec = digits[4];
                                              } else if (len === 6) {
                                                hour = digits[0];
                                                min = digits.slice(1, 3);
                                                sec = digits.slice(3, 5);
                                                decisec = digits[5];
                                              } else {
                                                hour = digits.slice(0, -5);
                                                min = digits.slice(-5, -3);
                                                sec = digits.slice(-3, -1);
                                                decisec = digits.slice(-1);
                                              }
                                              
                                              updateIndividualPlan(idx, 'pause', `${hour}h${min}'${sec}"${decisec}`);
                                            } else {
                                              updateIndividualPlan(idx, 'pause', input);
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                          placeholder="1h23'45&quot;6"
                                        />
                                      );
                                    }
                                    
                                    // For "Restart time" (Minutes mode only) - time input with validation
                                    if (restType === 'Restart time' && repsType === 'Time') {
                                      return (
                                        <input
                                          type="text"
                                          value={plan.pause ?? ''}
                                          onChange={(e) => {
                                            const input = e.target.value;
                                            if (input === '') {
                                              updateIndividualPlan(idx, 'pause', '');
                                              return;
                                            }
                                            if (/^\d+$/.test(input)) {
                                              const digits = input.replace(/\D/g, '');
                                              const len = digits.length;
                                              let decisec = '0';
                                              let sec = '00';
                                              let min = '00';
                                              let hour = '0';
                                              
                                              if (len === 1) {
                                                decisec = digits[0];
                                              } else if (len === 2) {
                                                sec = digits[0].padStart(2, '0');
                                                decisec = digits[1];
                                              } else if (len === 3) {
                                                sec = digits.slice(0, 2);
                                                decisec = digits[2];
                                              } else if (len === 4) {
                                                min = digits[0].padStart(2, '0');
                                                sec = digits.slice(1, 3);
                                                decisec = digits[3];
                                              } else if (len === 5) {
                                                min = digits.slice(0, 2);
                                                sec = digits.slice(2, 4);
                                                decisec = digits[4];
                                              } else if (len === 6) {
                                                hour = digits[0];
                                                min = digits.slice(1, 3);
                                                sec = digits.slice(3, 5);
                                                decisec = digits[5];
                                              } else {
                                                hour = digits.slice(0, -5);
                                                min = digits.slice(-5, -3);
                                                sec = digits.slice(-3, -1);
                                                decisec = digits.slice(-1);
                                              }
                                              
                                              const formattedTime = `${hour}h${min}'${sec}"${decisec}`;
                                              updateIndividualPlan(idx, 'pause', formattedTime);
                                            } else {
                                              updateIndividualPlan(idx, 'pause', input);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Validate that restart time > minutes value
                                            const minutesValue = plan.reps ?? '';
                                            const restartValue = e.target.value;
                                            // Simple comparison - if both are formatted, compare them
                                            if (minutesValue && restartValue && restartValue <= minutesValue) {
                                              alert('⚠️ Restart time must be greater than Minutes value');
                                              updateIndividualPlan(idx, 'pause', '');
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                          placeholder="1h23'45&quot;6"
                                        />
                                      );
                                    }
                                    
                                    // For "Restart pulse" - number input (0-200)
                                    if (restType === 'Restart pulse') {
                                      return (
                                        <input
                                          type="number"
                                          value={plan.pause ?? ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 200)) {
                                              updateIndividualPlan(idx, 'pause', value);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (e.target.value && (value < 0 || value > 200)) {
                                              alert('⚠️ Pulse must be between 0 and 200 bpm');
                                              updateIndividualPlan(idx, 'pause', '120');
                                            }
                                          }}
                                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                          placeholder="120"
                                          min="0"
                                          max="200"
                                        />
                                      );
                                    }
                                    
                                    // Default - show select dropdown (fallback)
                                    return (
                                  <select
                                    value={plan.pause}
                                    onChange={(e) => updateIndividualPlan(idx, 'pause', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500"
                                  >
                                    {(Array.isArray(sportConfig.pauses) ? sportConfig.pauses : (sportConfig.pauses as any)?.['Set time'] || []).map((p: string) => (
                                      <option key={p} value={p}>{p}</option>
                                    ))}
                                  </select>
                                    );
                                  })()}
                                </td>
                                <td className="border border-gray-300 px-1 py-1.5 text-center">
                                  {idx > 0 && idx < individualPlans.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => copyDownRow(idx)}
                                      className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center gap-1 transition-all whitespace-nowrap"
                                      title="Copy this row to all rows below"
                                    >
                                      <ChevronsDown className="w-3 h-3" />
                                      <span>Copy</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <p className="mt-2 text-[10px] text-blue-600 flex items-center gap-1">
                      <span>ℹ️</span>
                      <span>Scroll to view all {individualPlans.length} series. Each can have unique reps, weights, and pause values.</span>
                    </p>
                  </div>
                )}

                {/* Individual Repetition Planning Table for OTHER SPORTS (Soccer, Tennis, Boxing, etc.) */}
                {(() => {
                  const bodyBuildingSports = ['BODY_BUILDING', 'STRETCHING', 'GYMNASTIC', 'PILATES', 'YOGA', 'CALISTENIC', 'SPARTAN', 'CROSSFIT'];
                  const aerobicSports = ['SWIM', 'BIKE', 'MTB', 'RUN', 'WALKING', 'ROWING', 'SKATE', 'SNOWBOARD', 'SKI', 'HIKING'];
                  const isOtherSport = !bodyBuildingSports.includes(sport) && !aerobicSports.includes(sport);
                  
                  if (!isOtherSport || planningMode !== 'individual' || !canShowIndividualPlanning) return null;
                  
                  return (
                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                      <h3 className="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2">
                        <span>🏋️ {repsType === 'Time' ? 'TIME' : 'REPS'} & TOOLS PLANNING</span>
                        <span className="text-[10px] bg-blue-200 text-blue-700 px-2 py-0.5 rounded font-normal">
                          {individualPlans.length} {repsType === 'Time' ? 'series' : 'reps'}
                        </span>
                      </h3>
                      
                      {/* Scrollable table - 6 rows visible */}
                      <div className="border border-gray-300 rounded overflow-hidden bg-white">
                        <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '300px' }}>
                          <table className="w-full text-xs table-fixed">
                            <colgroup>
                              <col className="w-12" />
                              <col className="w-1/3" />
                              <col className="w-1/3" />
                              <col className="w-1/4" />
                              <col className="w-20" />
                            </colgroup>
                            <thead className="bg-gray-200 sticky top-0 z-10">
                              <tr>
                                <th className="border border-gray-300 px-2 py-2 text-center">#</th>
                                <th className="border border-gray-300 px-2 py-2 text-center" colSpan={2}>
                                  {repsType === 'Time' ? 'TIME & TOOLS' : 'REPS & TOOLS'}
                                </th>
                                <th className="border border-gray-300 px-2 py-2 text-center">REST & ALERTS</th>
                                <th className="border border-gray-300 px-2 py-2 text-center"></th>
                              </tr>
                              <tr>
                                <th className="border-b border-gray-300"></th>
                                <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">
                                  <span className="font-semibold">{repsType === 'Time' ? 'Time' : 'Reps'}</span>
                                </th>
                                <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">
                                  <span className="font-semibold">Tools</span>
                                </th>
                                <th className="border border-gray-300 px-2 py-1.5 text-center bg-gray-100">
                                  <span className="font-semibold">
                                    {restType === 'Set time' && 'Pause'}
                                    {restType === 'Restart time' && 'Restart to'}
                                    {restType === 'Restart pulse' && 'Restart pulse'}
                                    {!restType && 'Pause'}
                                  </span>
                                </th>
                                <th className="border-b border-gray-300"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {individualPlans.map((plan, idx) => {
                                const aerobicSeriesNum = parseInt(aerobicSeries) || 1;
                                const repsPerGroup = Math.ceil(individualPlans.length / aerobicSeriesNum);
                                const currentGroup = Math.floor(idx / repsPerGroup) + 1;
                                const isFirstInGroup = idx % repsPerGroup === 0;
                                
                                return (
                                  <React.Fragment key={idx}>
                                    {/* Group Header */}
                                    {AEROBIC_SPORTS.includes(sport as any) && aerobicSeriesNum > 1 && isFirstInGroup && (
                                      <tr>
                                        <td colSpan={5} className="border border-gray-400 bg-rose-100 px-3 py-2 text-sm font-bold text-rose-900 text-center">
                                          Serie\Group {currentGroup}
                                        </td>
                                      </tr>
                                    )}
                                    <tr className="hover:bg-blue-50">
                                  <td className="border border-gray-300 px-2 py-2 text-center font-bold bg-gray-50">
                                    {plan.index}
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1.5">
                                    <input
                                      type="number"
                                      value={plan.reps || ''}
                                      onChange={(e) => updateIndividualPlan(idx, 'reps', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                      placeholder="12"
                                      min="1"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1.5">
                                    <input
                                      type="text"
                                      value={plan.tools || ''}
                                      onChange={(e) => updateIndividualPlan(idx, 'tools', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 text-center"
                                      placeholder="Tools"
                                    />
                                  </td>
                                  <td className="border border-gray-300 px-2 py-1.5">
                                    <select
                                      value={plan.pause}
                                      onChange={(e) => updateIndividualPlan(idx, 'pause', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-cyan-500"
                                    >
                                      {(Array.isArray(sportConfig.pauses) ? sportConfig.pauses : (sportConfig.pauses as any)?.['Set time'] || []).map((p: string) => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="border border-gray-300 px-1 py-1.5 text-center">
                                    {idx > 0 && idx < individualPlans.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => copyDownRow(idx)}
                                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded flex items-center gap-1 transition-all whitespace-nowrap"
                                        title="Copy this row to all rows below"
                                      >
                                        <ChevronsDown className="w-3 h-3" />
                                        <span>Copy</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-[10px] text-blue-600 flex items-center gap-1">
                        <span>ℹ️</span>
                        <span>Scroll to view all {individualPlans.length} {['SWIM', 'BIKE', 'SPINNING', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'repetitions' : 'series'}. Each can have unique {repsType === 'Time' ? 'time' : 'reps'}, tools, and pause values.</span>
                      </p>
                    </div>
                  );
                })()}

                {/* 3. Speed/Pace/Tempo */}
                {/* Only show this section when NOT in individual planning mode */}
                {(() => {
                  // Don't show in individual planning mode for ANY sport
                  if (planningMode === 'individual') return null;
                  
                  const bodyBuildingLikeSports = ['BODY_BUILDING', 'STRETCHING', 'GYMNASTIC', 'PILATES', 'YOGA', 'CALISTENIC', 'SPARTAN', 'CROSSFIT'];
                  const isBodyBuildingLike = bodyBuildingLikeSports.includes(sport);
                  const hasTools = !DISTANCE_BASED_SPORTS.includes(sport as any) && !isBodyBuildingLike;
                  const showSpeedSection = (isBodyBuildingLike || hasTools || planningMode === 'all');
                  
                  if (!showSpeedSection) return null;
                  
                  return (
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <h3 className="font-bold text-xs font-medium text-gray-700 mb-2">
                        {isBodyBuildingLike || hasTools ? 'SPEED OF EXECUTION' : 'SPEED / PACE'}
                      </h3>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {isBodyBuildingLike || hasTools ? 'Speed of execution:' : 'Speed:'}
                    </label>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                    >
                      {sportConfig.speeds.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {isBodyBuildingLike && (
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Exercise execution speed
                      </p>
                    )}
                  </div>

                  {/* Row/min field - ROWING only */}
                  {sport === 'ROWING' && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Row/min: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={rowPerMin}
                        onChange={(e) => setRowPerMin(e.target.value)}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (e.target.value && value < 10) {
                            alert('⚠️ Row/min value too low!\n\nMinimum allowed: 10\nPlease enter a value within the valid range (10-99).');
                            setRowPerMin('10');
                          } else if (value > 99) {
                            alert('⚠️ Row/min value too high!\n\nMaximum allowed: 99\nPlease enter a value within the valid range (10-99).');
                            setRowPerMin('99');
                          }
                        }}
                        min="10"
                        max="99"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                        placeholder="Enter rows per minute (10-99)"
                      />
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Strokes per minute (Range: 10-99)
                      </p>
                    </div>
                  )}

                  {shouldShowPaceField(sport) && (
                    <div>
                      {(() => {
                        // Get current distance/meters value
                        const currentMeters = distance === 'custom' || distance === 'input' ? customDistance : distance;
                        
                        // Use helper function to determine pace label
                        const paceLabel = getPaceLabel(sport, currentMeters);
                        const isKmPace = paceLabel === 'Pace\\km' || paceLabel === 'Pace\\mile';
                        
                        // Set range and placeholder based on pace type
                        let paceRange = "(0'00\"0 to 9'59\"0)";
                        let pacePlaceholder = "1'30\"0";
                        
                        if (isKmPace) {
                            paceRange = "(2'00\"0 to 9'59\"0)";
                            pacePlaceholder = "4'30\"0";
                          } else {
                            paceRange = "(0'00\"0 to 1'59\"0)";
                            pacePlaceholder = "0'45\"0";
                          }
                        
                        // Special handling for BIKE (no decimal)
                        if (sport === 'BIKE') {
                          paceRange = "(0'00\" to 9'59\")";
                          pacePlaceholder = "1'30\"";
                        }
                        
                        return (
                          <>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {paceLabel.replace('\\', '/')}: <span className="text-green-600 font-semibold text-[10px]">✨ Flexible input</span>
                            </label>
                            <input
                              type="text"
                              value={pace}
                              onChange={(e) => setPace(e.target.value)}
                              onBlur={(e) => {
                                if (e.target.value) {
                                  const formatted = formatPace(e.target.value, isKmPace);
                                  setPace(formatted);
                                }
                              }}
                              className="w-full px-3 py-2 text-lg border-2 border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono bg-green-50"
                              placeholder={
                                sport === 'BIKE' ? '353→35.3 or 12345→12.3' :
                                sport === 'ROWING' ? "1'30\" or 130" :
                                sport === 'SKI' ? "2'45\" or 245" :
                                "130 or 1:30 or 1.30"
                              }
                              title={
                                sport === 'BIKE' ? 'Enter speed with decimal: e.g., 35.3, 120.5 (0.0 to 999.9 km/h)' :
                                sport === 'ROWING' || sport === 'SKI' ? "Type freely: 1:30, 130, 1'30" :
                                "Type freely: 130, 1:30, 1.30"
                              }
                            />
                            <p className="mt-0.5 text-[10px] text-green-600">
                              {sport === 'BIKE' ? (
                                <>⚡ Enter speed with decimal: <strong>35.3</strong>, <strong>120.5</strong>, <strong>185.0 km/h</strong> (range: 0.0 to 999.9)</>
                              ) : (
                                <>⚡ Fast input: Type <strong>130</strong> → <strong>1'30"0</strong></>
                              )}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                  );
                })()}

                {/* 3b. Time Field - for all distance-based sports */}
                {shouldShowPaceField(sport) && planningMode === 'all' && (
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <h3 className="font-bold text-xs text-gray-700 mb-2">TIME <span className="text-gray-400 font-normal">(optional)</span></h3>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => {
                        // Just update the value, don't format while typing
                        setTime(e.target.value);
                      }}
                      onBlur={(e) => {
                        // Only format on blur when user is done typing
                        const formatted = formatTime(e.target.value);
                        setTime(formatted);
                      }}
                      placeholder="123456"
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                    />
                    <p className="mt-1 text-[10px] text-blue-600">
                      💡 Type: 123456 → formats to 1h23'45"6 when you finish typing
                    </p>
                  </div>
                )}

                {/* 4. Reset/Pause & Macropause */}
                {/* Only show pause section if NOT in individual planning mode */}
                {planningMode === 'all' && (
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <h3 className="font-bold text-xs text-gray-700 mb-2">REST\PAUSE & MACROPAUSE</h3>
                  <div className="space-y-3">
                    {/* Rest Type Selector */}
                    {sportConfig.restTypes && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Rest Type:</label>
                        <select
                          value={restType}
                          onChange={(e) => {
                            setRestType(e.target.value);
                            // Reset pause when changing rest type
                            const pauseOptions = getPauseOptions(sport, e.target.value);
                            if (Array.isArray(pauseOptions) && pauseOptions.length > 0) {
                              setPause(pauseOptions[0]);
                            } else {
                              setPause('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                        >
                          {sportConfig.restTypes
                            .filter((rt: string) => {
                              // If Minutes execution type is selected, only show Set time, Restart time, and Restart pulse
                              // If Reps execution type, show all options
                              if (repsType === 'Time') {
                                return rt === 'Set time' || rt === 'Restart time' || rt === 'Restart pulse';
                              }
                              return true;
                            })
                            .map((rt: string) => (
                              <option key={rt} value={rt}>
                                {rt === 'Restart time' && repsType === 'Time' ? 'Restart time (it must be > Minutes typed)' : rt}
                              </option>
                            ))}
                        </select>
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {restType === 'Set time' && 'Select from predefined pause values'}
                          {restType === 'Restart time' && 'Enter time > workout time'}
                          {restType === 'Restart pulse' && 'Enter pulse rate (60-200)'}
                        </p>
                      </div>
                    )}
                    
                    {/* Pause Field - Conditional based on Rest Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {restType === 'Set time' && 'Pause:'}
                      {restType === 'Restart time' && 'Restart to..:'}
                      {restType === 'Restart pulse' && 'Restart to pulse..:'}
                      {!restType && 'Pause:'}
                    </label>
                      {(() => {
                        const pauseOptions = getPauseOptions(sport, restType);
                        
                        // If it's 'input', show an input field instead of select
                        if (pauseOptions === 'input') {
                          if (restType === 'Restart time') {
                            // Helper function to convert time string to seconds for comparison
                            const timeToSeconds = (timeStr: string): number => {
                              if (!timeStr) return 0;
                              // Handle formats like "0h01'30"0" or "1h23'45"0" (with hours) or "1'30"" (legacy format)
                              const hourMatch = timeStr.match(/(\d+)h/);
                              const minMatch = timeStr.match(/(\d+)'/);
                              const secMatch = timeStr.match(/'(\d+)"/);
                              
                              const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
                              const minutes = minMatch ? parseInt(minMatch[1]) : 0;
                              const seconds = secMatch ? parseInt(secMatch[1]) : 0;
                              
                              return hours * 3600 + minutes * 60 + seconds;
                            };

                            const validateRestartTime = () => {
                              const timeSeconds = timeToSeconds(time);
                              const pauseSeconds = timeToSeconds(pause);
                              
                              if (pauseSeconds > 0 && pauseSeconds <= timeSeconds) {
                                alert('⚠️ Restart time must be greater than Time!\n\nPlease enter a restart time that is longer than the workout time.');
                                setPause('');
                                return false;
                              }
                              return true;
                            };

                            // Helper function to format digits into time
                            const formatTimeFromDigits = (digits: string): string => {
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

                            return (
                              <>
                                <input
                                  type="text"
                                  value={pause}
                                  onChange={(e) => {
                                    // Allow free typing - just store raw input
                                    setPause(e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    const input = e.target.value;
                                    
                                    // If empty, leave empty
                                    if (!input) {
                                      setPause('');
                                      // Validate after clearing
                                      setTimeout(() => validateRestartTime(), 100);
                                      return;
                                    }
                                    
                                    // Extract only digits
                                    const digits = input.replace(/\D/g, '');
                                    
                                    // If no valid digits, clear
                                    if (!digits) {
                                      setPause('');
                                      return;
                                    }
                                    
                                    // Limit to 7 digits and format
                                    const limitedDigits = digits.slice(0, 7);
                                    const formatted = formatTimeFromDigits(limitedDigits);
                                    setPause(formatted);
                                    
                                    // Validate restart time > time after formatting
                                    setTimeout(() => validateRestartTime(), 100);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 mb-1"
                                  placeholder="Type: 123456"
                                />
                                <p className="mt-0.5 text-[10px] text-red-600 font-semibold">
                                  💡 Type: <strong>123456</strong> then press Tab/Enter → formats to <strong>1h23'45"6</strong> | <span className="text-red-700 font-bold">MANDATORY: Must be &gt; Time ({time || '0h00\'00"0'})</span>
                                </p>
                              </>
                            );
                          } else if (restType === 'Restart pulse') {
                            return (
                              <>
                                <input
                                  type="number"
                                  value={pause}
                                  onChange={(e) => setPause(e.target.value)}
                                  onBlur={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (e.target.value && value < 60) {
                                      alert('⚠️ Pulse rate value too low!\n\nMinimum allowed: 60 bpm\nPlease enter a value within the valid range (60-200).');
                                      setPause('60');
                                    } else if (value > 200) {
                                      alert('⚠️ Pulse rate value too high!\n\nMaximum allowed: 200 bpm\nPlease enter a value within the valid range (60-200).');
                                      setPause('200');
                                    }
                                  }}
                                  min="60"
                                  max="200"
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                                  placeholder="60-200"
                                />
                                <p className="mt-0.5 text-[10px] text-gray-500">Pulse rate range: 60-200 bpm</p>
                              </>
                            );
                          }
                        }
                        
                        // Otherwise show dropdown
                        return (
                          <>
                    <select
                      value={pause}
                      onChange={(e) => setPause(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                    >
                              {(Array.isArray(pauseOptions) ? pauseOptions : []).map((p: string) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {parseInt(repetitions) === 1 && (
                      <p className="mt-0.5 text-[10px] text-gray-500">Pause can be 0 when repetitions = 1</p>
                    )}
                          </>
                        );
                      })()}
                  </div>

                    {/* Mode Dropdown - Available for all rest types */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mode:</label>
                      <select
                        value={pauseMode}
                        onChange={(e) => setPauseMode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="">Select mode...</option>
                        <option value="stopped">From a standstill (default)</option>
                        <option value="speed">Set speed</option>
                        {['SWIM', 'BIKE', 'MTB', 'ROWING'].includes(sport) && (
                          <option value="watts">Set Watts</option>
                        )}
                      </select>
                    </div>

                    {!['BIKE', 'MTB'].includes(sport) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Macro:</label>
                      <select
                        value={macroFinal}
                        onChange={(e) => setMacroFinal(e.target.value)}
                        disabled={manualMode}
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 ${manualMode ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                      >
                        {sportConfig.macroFinals.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Alarm:</label>
                      <select
                        value={alarm}
                        onChange={(e) => setAlarm(e.target.value)}
                        disabled={manualMode}
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 ${manualMode ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                      >
                        {sportConfig.alarms.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sound:</label>
                      <select
                        value={sound}
                        onChange={(e) => setSound(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                      >
                        {sportConfig.sounds.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                )}

                {/* Macro Final - Show always (except for BIKE and MTB) */}
                {planningMode === 'individual' && canShowIndividualPlanning && !['BIKE', 'MTB'].includes(sport) && (
                  <div className="bg-gray-50 p-2.5 rounded-lg">
                    <h3 className="font-bold text-xs text-gray-700 mb-2">MACRO FINAL</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Macro Final:</label>
                      <select
                        value={macroFinal}
                        onChange={(e) => setMacroFinal(e.target.value)}
                        disabled={manualMode}
                        className={`w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 ${manualMode ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                      >
                        {MACRO_FINAL_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. Description */}
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <h3 className="font-bold text-xs text-gray-700 mb-2">DESCRIPTION</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Note / Description:</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                      rows={3}
                      placeholder="Add notes or description..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Battery Mode - Circuit Planner */}
          {/* 2026-01-21 20:00 UTC - Replaced old BatteryCircuitPlanner with new CircuitPlanner */}
          {/* 2026-01-22 14:30 UTC - Show based on batterySubmenu selection */}
          {/* 2026-01-23 - Using redesigned BatteryCircuitPlanner_REDESIGNED */}
          {/* 2026-01-24 - Pass existingMoveframe for edit mode */}
          {type === 'BATTERY' && batterySubmenu === 'circuits' && (
            <BatteryCircuitPlanner
              sectionId={workout?.id || ''}
              sport={sport}
              workout={workout}
              day={day}
              existingMoveframe={existingMoveframe}
              startInSecondView={editingFromMovelap === true}
              onCreateCircuit={(circuitData) => {
                // 2026-01-21 20:00 UTC - Handle circuit creation
                // 2026-01-22 10:20 UTC - Include description in moveframe data
                // 2026-01-22 10:30 UTC - Include movelaps in moveframe data
                // 2026-01-23 - Updated for redesigned planner
                console.log('✅ [AddEditMoveframeModal] Circuit data received:', circuitData);
                console.log('✅ [AddEditMoveframeModal] Circuit description:', circuitData.description);
                console.log('✅ [AddEditMoveframeModal] Description length:', circuitData.description?.length || 0);
                
                // Build complete moveframe data with circuit description and movelaps
                const moveframeData = buildMoveframeData();
                
                // 2026-01-30 - Serialize circuit data into notes for future editing
                const serializedCircuitData = JSON.stringify({
                  config: circuitData.settings,
                  circuits: circuitData.circuits
                });
                const notesWithCircuitData = `[CIRCUIT_DATA]${serializedCircuitData}[/CIRCUIT_DATA]`;
                
                const finalData = {
                  ...moveframeData,
                  description: circuitData.description || '', // Use circuit description
                  notes: notesWithCircuitData, // Store circuit data in notes
                  circuitConfig: circuitData.settings, // Circuit settings
                  circuits: circuitData.circuits, // Active circuits
                  rows: circuitData.rows, // Circuit rows/stations
                  movelaps: circuitData.movelaps || [], // Include generated movelaps
                  isCircuitBased: true // Flag to indicate this is a circuit-based moveframe
                };
                
                console.log('✅ [AddEditMoveframeModal] Final moveframe data:', finalData);
                console.log('✅ [AddEditMoveframeModal] Final description:', finalData.description);
                onSave(finalData);
                // 2026-01-22 14:40 UTC - Close modal after saving circuit
                onClose();
              }}
              onCancel={onClose}
            />
          )}

          {/* Battery Mode - Fast Planner */}
          {/* 2026-01-29 - Fast planner of Moveframes - Custom keyboard for quick value selection */}
          {type === 'BATTERY' && batterySubmenu === 'fast' && (
            <FastPlannerOfMoveframes
              sport={sport}
              sectionId={sectionId}
              workout={workout}
              day={day}
              mode={mode}
              existingMoveframe={existingMoveframe}
              onSave={(moveframeData: any) => {
                onSave(moveframeData);
                onClose();
              }}
              onCancel={onClose}
            />
          )}

          {/* Battery Mode - AI Planner */}
          {/* 2026-01-22 14:30 UTC - Placeholder for AI planner */}
          {type === 'BATTERY' && batterySubmenu === 'ai' && (
            <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
              <h3 className="text-lg font-bold text-gray-700 mb-2">Plan of Moveframes with AI</h3>
              <p className="text-gray-600">Coming soon...</p>
            </div>
          )}

          {/* Preview */}
          {type === 'STANDARD' && !manualMode && (
            <div className="mt-3 bg-blue-50 border border-blue-300 p-3 rounded">
              <h4 className="text-xs font-bold text-blue-900 mb-2">PREVIEW:</h4>
              <p className="text-sm text-blue-800 font-medium break-words">{generateDescription()}</p>
              {(parseInt(repetitions) > 1 || (macroFinal && macroFinal !== "0'") || (AEROBIC_SPORTS.includes(sport as any) && parseInt(aerobicSeries) > 1)) && (
                <div className="mt-2 text-xs text-blue-600 space-y-0.5">
                  {parseInt(repetitions) > 1 && (
                    <div>• {['SWIM', 'BIKE', 'SPINNING', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'Repetitions' : 'Series'}: {repetitions} {['SWIM', 'BIKE', 'SPINNING', 'RUN', 'BODY_BUILDING', 'ROWING', 'SKATE', 'SKI', 'SNOWBOARD', 'HIKING', 'WALKING'].includes(sport) ? 'reps' : 'series'}</div>
                  )}
                  {AEROBIC_SPORTS.includes(sport as any) && parseInt(aerobicSeries) > 1 && (
                    <div>• Total Repetitions: {parseInt(repetitions) * parseInt(aerobicSeries)} ({repetitions} × {aerobicSeries} series)</div>
                  )}
                  {macroFinal && macroFinal !== "0'" && (
                    <div>• Macro Final: {macroFinal}</div>
                  )}
                    </div>
              )}
                  </div>
          )}
                    </div>
          )}

          {/* Manual Mode Tab */}
          {type === 'STANDARD' && activeTab === 'manual' && (
            <div key="manual-tab" className="space-y-4">
              {isEditingManualMoveframe ? (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-300">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-amber-100 border border-amber-300 rounded flex-shrink-0">
                      <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-amber-900 mb-1">
                        📝 Editing Manual Moveframe
                      </div>
                      <p className="text-sm text-amber-800">
                        This moveframe was created with manual input. You can edit the <strong>{DISTANCE_BASED_SPORTS.includes(sport as any) ? 'distance' : 'series'}</strong> (for statistics) and the <strong>content</strong> below. To change sport or other settings, you need to create a new moveframe.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center w-10 h-10 bg-white border border-blue-300 rounded">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">
                        Moveframe edited manually
                      </span>
                  </div>
                </div>
                  <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Distance Meters/Time field for statistics (for aerobic sports) OR Total series (for non-aerobic sports) */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-300">
                  {DISTANCE_BASED_SPORTS.includes(sport as any) ? (
                    <>
                      {/* Toggle for Meters or Time */}
                      <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Input Type - For Statistics:
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="manualInputType"
                              value="meters"
                              checked={manualInputType === 'meters'}
                              onChange={(e) => {
                                console.log('📻 [RADIO] User selected METERS');
                                setManualInputType(e.target.value as 'meters' | 'time');
                                setDistance(''); // Clear distance when switching to meters
                                console.log('🗑️ [RADIO] Cleared distance field for meters input');
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Meters</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="manualInputType"
                              value="time"
                              checked={manualInputType === 'time'}
                              onChange={(e) => {
                                console.log('📻 [RADIO] User selected TIME');
                                setManualInputType(e.target.value as 'meters' | 'time');
                                setDistance(''); // Clear distance when switching to time
                                console.log('🗑️ [RADIO] Cleared distance field for time input');
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Time</span>
                          </label>
                        </div>
                      </div>

                      {/* Input field - Meters or Time */}
                      {manualInputType === 'meters' ? (
                        <>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Distance (Meters):
                          </label>
                          <input
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            min="0"
                            step="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 text-sm"
                            placeholder="Enter distance in meters (e.g., 1000)"
                          />
                          <p className="mt-1 text-[10px] text-gray-600">
                            💡 This value is used for workout statistics and totals calculation.
                          </p>
                        </>
                      ) : (
                        <>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Time (Format: 123456 = 1h23'45"6):
                          </label>
                          <input
                            type="text"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            onBlur={(e) => {
                              const formatted = formatTime(e.target.value);
                              setDistance(formatted);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 text-sm"
                            placeholder="Type: 123456"
                          />
                          <p className="mt-1 text-[10px] text-gray-600">
                            💡 Type 123456 → formats to 1h23'45"6. Used for workout statistics.
                          </p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Total Series - For Statistics:
                      </label>
                      <input
                        type="number"
                        value={repetitions}
                        onChange={(e) => setRepetitions(e.target.value)}
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 text-sm"
                        placeholder="Enter total number of series (e.g., 4)"
                      />
                      <p className="mt-1 text-[10px] text-gray-600">
                        💡 This value is used for workout statistics and totals calculation.
                      </p>
                    </>
                  )}
                </div>

              {/* Manual Mode Preview - Show Duration/Rip\Sets */}
              {manualMode && (
                <div className="bg-blue-50 border border-blue-300 p-3 rounded-lg">
                  <h4 className="text-xs font-bold text-blue-900 mb-2">MANUAL INPUT VALUES:</h4>
                  <div className="space-y-1">
                    {DISTANCE_BASED_SPORTS.includes(sport as any) || ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SPINNING', 'SKI', 'HIKING', 'WALKING', 'MTB'].includes(sport) ? (
                      <div className="text-sm text-blue-800 font-medium">
                        • Duration: <span className="font-semibold">
                          {manualInputType === 'meters' 
                            ? `${distance || '0'} meters` 
                            : `${distance || '—'}`}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-blue-800 font-medium">
                        • Rip\Sets: <span className="font-semibold">{repetitions || '0'} series</span>
                      </div>
                    )}
                    <p className="text-[10px] text-blue-600 mt-1">
                      💡 {DISTANCE_BASED_SPORTS.includes(sport as any) || ['SWIM', 'BIKE', 'RUN', 'ROWING', 'SKATE', 'SPINNING', 'SKI', 'HIKING', 'WALKING', 'MTB'].includes(sport) 
                        ? (manualInputType === 'meters' ? 'Duration displays the distance value for aerobic sports' : 'Duration displays the time value for aerobic sports')
                        : 'Rip\\Sets displays the total series for non-aerobic sports'}
                    </p>
                  </div>
                </div>
              )}

              <>
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualPriority}
                      onChange={(e) => {
                        console.log('🔲 [CHECKBOX] Manual Priority changed:', {
                          oldValue: manualPriority,
                          newValue: e.target.checked
                        });
                        setManualPriority(e.target.checked);
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Priority 'manual' in the display (current: {String(manualPriority)})</span>
                  </label>
                  <div className="ml-2 flex items-center justify-center w-6 h-6 bg-green-500 rounded">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </>

              {/* Rich Text Editor Toolbar */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center">
                  <select 
                    onChange={(e) => execCommand('fontName', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                  <select 
                    onChange={(e) => execCommand('fontSize', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white ml-1"
                  >
                    <option value="3">Normal</option>
                    <option value="1">Very Small</option>
                    <option value="2">Small</option>
                    <option value="4">Large</option>
                    <option value="5">Very Large</option>
                    <option value="6">Huge</option>
                  </select>
                      <div className="h-4 w-px bg-gray-300 mx-1"></div>
                      <button 
                        type="button"
                        onClick={() => execCommand('bold')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Bold"
                      >
                        <span className="font-bold text-sm">B</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('italic')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Italic"
                      >
                        <span className="italic text-sm">I</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('underline')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Underline"
                      >
                        <span className="underline text-sm">U</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('strikeThrough')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Strikethrough"
                      >
                        <span className="line-through text-sm">S</span>
                      </button>
                      <div className="h-4 w-px bg-gray-300 mx-1"></div>
                      <input
                        type="color"
                        onChange={(e) => execCommand('foreColor', e.target.value)}
                        className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                        title="Text Color"
                      />
                      <input
                        type="color"
                        onChange={(e) => execCommand('backColor', e.target.value)}
                        defaultValue="#ffffff"
                        className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                        title="Background Color"
                      />
                      <div className="h-4 w-px bg-gray-300 mx-1"></div>
                      <button 
                        type="button"
                        onClick={() => execCommand('justifyLeft')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Align Left"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4h14v2H3V4zm0 4h10v2H3V8zm0 4h14v2H3v-2zm0 4h10v2H3v-2z" />
                        </svg>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('justifyCenter')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Align Center"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4h14v2H3V4zm2 4h10v2H5V8zm-2 4h14v2H3v-2zm2 4h10v2H5v-2z" />
                        </svg>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('justifyRight')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Align Right"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4h14v2H3V4zm4 4h10v2H7V8zm-4 4h14v2H3v-2zm4 4h10v2H7v-2z" />
                        </svg>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('justifyFull')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Justify"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4h14v2H3V4zm0 4h14v2H3V8zm0 4h14v2H3v-2zm0 4h14v2H3v-2z" />
                        </svg>
                      </button>
                      <div className="h-4 w-px bg-gray-300 mx-1"></div>
                      <button 
                        type="button"
                        onClick={() => execCommand('insertUnorderedList')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Bullet List"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a1 1 0 100 2 1 1 0 000-2zm3 1h10v1H7V5zm-3 4a1 1 0 100 2 1 1 0 000-2zm3 1h10v1H7v-1zm-3 4a1 1 0 100 2 1 1 0 000-2zm3 1h10v1H7v-1z" />
                        </svg>
                      </button>
                      <button 
                        type="button"
                        onClick={() => execCommand('insertOrderedList')}
                        className="p-1 hover:bg-gray-200 rounded" 
                        title="Numbered List"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4h1v2H3V4zm0 4h1v2H3V8zm0 4h1v2H3v-2zM6 5h11v1H6V5zm0 4h11v1H6V9zm0 4h11v1H6v-1z" />
                        </svg>
                      </button>
                      <div className="h-4 w-px bg-gray-300 mx-1"></div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (editorRef.current) {
                            editorRef.current.innerHTML = '';
                            setManualContent('');
                          }
                        }}
                        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="relative">
                      {(!manualContent || manualContent === '' || manualContent === '<br>') && (
                        <div className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none z-0">
                          Here you can edit freely your moveframe that will be showed in the moveframe section
                        </div>
                      )}
                      <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleEditorInput}
                        onPaste={(e) => {
                          // Allow default paste behavior to preserve formatting
                          // contentEditable will handle HTML and formatted content automatically
                          console.log('📋 Paste event captured - allowing default formatted paste');
                          // The default paste handler will preserve formatting
                          // We just update content after paste
                          setTimeout(() => {
                            if (editorRef.current) {
                              setManualContent(editorRef.current.innerHTML);
                            }
                          }, 0);
                        }}
                        className="w-full px-3 py-2 text-sm focus:outline-none focus:ring-0 min-h-[200px] max-h-[300px] overflow-y-auto relative z-10 bg-white"
                        style={{ wordBreak: 'break-word' }}
                        suppressContentEditableWarning
                      />
                    </div>
                  </div>
            </div>
          )}

          {/* Favorites Tab */}
          {type === 'STANDARD' && activeTab === 'favorites' && (
            <div key="favorites-tab" className="text-center py-12 text-gray-500 h-full">
              <p>Favourites feature coming soon...</p>
            </div>
          )}
        </div>

        {/* Footer - 2026-01-22 14:30 UTC - Hide for Battery mode */}
        {type !== 'BATTERY' && (
          <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : mode === 'add' ? 'Add Moveframe' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

