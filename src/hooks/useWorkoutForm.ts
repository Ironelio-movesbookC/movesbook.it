import { useState, useEffect, useCallback } from 'react';

export interface WorkoutFormData {
  name: string;
  code: string;
  sports: (string | null)[];
  includeStretching: boolean;
  // Section C (WORKOUTS DONE) fields
  time?: string; // HH:MM format
  weather?: string;
  location?: string;
  surface?: string;
  heartRateMax?: number;
  heartRateAvg?: number;
  calories?: number;
  feelingStatus?: string;
  notes?: string;
}

export interface WorkoutFormValidation {
  name: { valid: boolean; message: string };
  code: { valid: boolean; message: string };
  sports: { valid: boolean; message: string };
  heartRate?: { valid: boolean; message: string };
}

interface UseWorkoutFormProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  existingWorkout?: any;
  existingWorkouts: any[];
  day: any;
  workoutNumber: number;
  workoutSymbol: any;
  onSave: (workoutData: any) => Promise<void>;
  onClose: () => void;
}

/**
 * Custom hook for managing workout form state and validation
 * Extracted from AddWorkoutModal.tsx
 */
export function useWorkoutForm({
  isOpen,
  mode,
  existingWorkout,
  existingWorkouts,
  day,
  workoutNumber,
  workoutSymbol,
  onSave,
  onClose
}: UseWorkoutFormProps) {
  // ==================== STATE ====================
  const [formData, setFormData] = useState<WorkoutFormData>({
    name: '',
    code: '',
    sports: [null, null, null, null],
    includeStretching: false,
    // Section C fields
    time: '',
    weather: '',
    location: '',
    surface: '',
    heartRateMax: undefined,
    heartRateAvg: undefined,
    calories: undefined,
    feelingStatus: '',
    notes: ''
  });

  const [validation, setValidation] = useState<WorkoutFormValidation>({
    name: { valid: true, message: '' },
    code: { valid: true, message: '' },
    sports: { valid: true, message: '' },
    heartRate: { valid: true, message: '' }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Generate default workout name
   * Format: "Workout <number>"
   * Example: "Workout 1", "Workout 2", "Workout 3"
   * Note: Date is not included to allow templates for 3WEEKS PLANS
   */
  const generateDefaultName = useCallback(() => {
    return `Workout ${workoutNumber}`;
  }, [workoutNumber]);

  /**
   * Generate default workout code
   * Format: "<week number padded to 2 digits><day number padded to 2 digits>-<workout number>"
   * Example: "0101-1" (week 1, day 1, workout 1)
   */
  const generateDefaultCode = useCallback(() => {
    const weekNum = String(day.weekNumber || 1).padStart(2, '0');
    const dayNum = String(day.weekday || 1).padStart(2, '0');
    return `${weekNum}${dayNum}-${workoutNumber}`;
  }, [day.weekNumber, day.weekday, workoutNumber]);

  /**
   * Get sports from ALL moveframes in ALL workouts of the current day
   * These sports are automatically included and cannot be changed
   */
  const getSportsFromMoveframes = useCallback(() => {
    const sports = new Set<string>();
    
    // Scan ALL existing workouts in the day (including the current one being edited)
    existingWorkouts.forEach((workout: any) => {
      if (workout.moveframes && Array.isArray(workout.moveframes)) {
        workout.moveframes.forEach((mf: any) => {
          if (mf.sport) {
            sports.add(mf.sport);
          }
        });
      }
    });
    
    // If editing, also check the current workout's moveframes
    if ((mode === 'edit' || mode === 'view') && existingWorkout && existingWorkout.moveframes) {
      existingWorkout.moveframes.forEach((mf: any) => {
        if (mf.sport) {
          sports.add(mf.sport);
        }
      });
    }
    
    return Array.from(sports).sort(); // Sort alphabetically for consistency
  }, [existingWorkouts, existingWorkout, mode]);

  /**
   * Get moveframe sports (memoized)
   */
  const moveframeSports = getSportsFromMoveframes();

  /**
   * Count selected sports (excluding stretching if not included)
   */
  const countSelectedSports = () => {
    return formData.sports.filter(s => {
      if (!s) return false;
      // If includeStretching is false, don't count STRETCHING towards the limit
      if (!formData.includeStretching && s === 'STRETCHING') return false;
      return true;
    }).length;
  };

  const selectedSportsCount = countSelectedSports();

  /**
   * Check if a sport at a specific index is from moveframes (read-only)
   */
  const isSportFromMoveframe = (index: number) => {
    const sport = formData.sports[index];
    return sport !== null && moveframeSports.includes(sport);
  };

  /**
   * Check if we can manually select a sport at this index
   */
  const canManuallySelectSport = (index: number) => {
    // If this slot already has a moveframe sport, it's read-only
    if (isSportFromMoveframe(index)) return false;
    
    // Can select manually only if:
    // 1. We have less than 4 non-stretching sports, OR
    // 2. This sport is STRETCHING and includeStretching is true
    const sport = formData.sports[index];
    
    // If it's stretching, allow selection regardless of count
    if (sport === 'STRETCHING' && formData.includeStretching) {
      return true;
    }
    
    // Otherwise, can only select if under the 4-sport limit
    return selectedSportsCount < 4;
  };

  // ==================== VALIDATION FUNCTIONS ====================

  /**
   * Validate workout name
   */
  const validateName = (value: string) => {
    if (!value.trim()) {
      return { valid: false, message: 'Workout name is required' };
    }
    
    // Check uniqueness (case-insensitive), excluding current workout in edit mode
    const isDuplicate = existingWorkouts.some(
      w => w.id !== existingWorkout?.id && w.name?.toLowerCase() === value.toLowerCase()
    );
    
    if (isDuplicate) {
      return { valid: false, message: 'This name already exists for today' };
    }
    
    return { valid: true, message: '' };
  };

  /**
   * Validate workout code
   */
  const validateCode = (value: string) => {
    if (!value.trim()) {
      return { valid: false, message: 'Workout code is required' };
    }
    
    // Check uniqueness (case-insensitive), excluding current workout in edit mode
    const isDuplicate = existingWorkouts.some(
      w => w.id !== existingWorkout?.id && w.code?.toLowerCase() === value.toLowerCase()
    );
    
    if (isDuplicate) {
      return { valid: false, message: 'This code already exists for today' };
    }
    
    return { valid: true, message: '' };
  };

  /**
   * Validate sports selection
   * NOTE: Sports are now auto-loaded from moveframes, so validation is not required
   */
  const validateSports = (sports: (string | null)[]) => {
    // Always valid - sports will be loaded from moveframes
    return { valid: true, message: '' };
  };

  /**
   * Validate heart rate values
   */
  const validateHeartRate = (maxHR?: number, avgHR?: number) => {
    if (avgHR && maxHR && avgHR >= maxHR) {
      return { valid: false, message: 'Average HR must be less than Heart Rate Max' };
    }
    return { valid: true, message: '' };
  };

  /**
   * Check if entire form is valid
   */
  const isFormValid = () => {
    const nameVal = validateName(formData.name);
    const codeVal = validateCode(formData.code);
    const sportsVal = validateSports(formData.sports);
    const hrVal = validateHeartRate(formData.heartRateMax, formData.heartRateAvg);
    
    setValidation({
      name: nameVal,
      code: codeVal,
      sports: sportsVal,
      heartRate: hrVal
    });
    
    return nameVal.valid && codeVal.valid && sportsVal.valid && hrVal.valid;
  };

  // ==================== HANDLERS ====================

  /**
   * Handle name change with validation
   */
  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    const nameValidation = validateName(value);
    setValidation({ ...validation, name: nameValidation });
  };

  /**
   * Handle code change with validation
   */
  const handleCodeChange = (value: string) => {
    setFormData({ ...formData, code: value });
    const codeValidation = validateCode(value);
    setValidation({ ...validation, code: codeValidation });
  };

  /**
   * Handle sport selection
   */
  const handleSportChange = (index: number, value: string | null) => {
    const newSports = [...formData.sports];
    newSports[index] = value;
    setFormData({ ...formData, sports: newSports });
    
    const sportsValidation = validateSports(newSports);
    setValidation({ ...validation, sports: sportsValidation });
  };

  /**
   * Handle stretching checkbox change
   */
  const handleStretchingChange = (checked: boolean) => {
    setFormData({ ...formData, includeStretching: checked });
  };

  /**
   * Generic handler for Section C fields
   */
  const handleSectionCFieldChange = (field: keyof WorkoutFormData, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate heart rate if applicable
    if (field === 'heartRateMax' || field === 'heartRateAvg') {
      const hrValidation = validateHeartRate(
        field === 'heartRateMax' ? value : formData.heartRateMax,
        field === 'heartRateAvg' ? value : formData.heartRateAvg
      );
      setValidation({ ...validation, heartRate: hrValidation });
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const workoutData: any = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        sessionNumber: workoutNumber,
        symbol: workoutSymbol.symbol,
        sports: formData.sports.filter(s => s !== null),
        includeStretching: formData.includeStretching,
        dayId: day.id,
        weekNumber: day.weekNumber,
        date: day.date,
        periodId: day.periodId
      };
      
      // Add Section C fields if they have values
      if (formData.time) workoutData.time = formData.time;
      if (formData.weather) workoutData.weather = formData.weather;
      if (formData.location) workoutData.location = formData.location;
      if (formData.surface) workoutData.surface = formData.surface;
      if (formData.heartRateMax) workoutData.heartRateMax = formData.heartRateMax;
      if (formData.heartRateAvg) workoutData.heartRateAvg = formData.heartRateAvg;
      if (formData.calories) workoutData.calories = formData.calories;
      if (formData.feelingStatus) workoutData.feelingStatus = formData.feelingStatus;
      if (formData.notes) workoutData.notes = formData.notes;
      
      await onSave(workoutData);
      onClose();
    } catch (error) {
      console.error('Error creating workout:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  // ==================== EFFECTS ====================

  /**
   * Initialize form when modal opens or mode changes
   */
  useEffect(() => {
    if (isOpen) {
      if ((mode === 'edit' || mode === 'view') && existingWorkout) {
        // Load existing workout data
        setFormData({
          name: existingWorkout.name || '',
          code: existingWorkout.code || '',
          sports: existingWorkout.sports || [null, null, null, null],
          includeStretching: existingWorkout.includeStretching || false,
          // Section C fields
          time: existingWorkout.time || '',
          weather: existingWorkout.weather || '',
          location: existingWorkout.location || '',
          surface: existingWorkout.surface || '',
          heartRateMax: existingWorkout.heartRateMax || undefined,
          heartRateAvg: existingWorkout.heartRateAvg || undefined,
          calories: existingWorkout.calories || undefined,
          feelingStatus: existingWorkout.feelingStatus || '',
          notes: existingWorkout.notes || ''
        });
      } else {
        // In add mode, pre-populate with moveframe sports from the day
        const moveframeSportsFromDay = getSportsFromMoveframes();
        const initialSports: (string | null)[] = [null, null, null, null];
        
        // Fill first N slots with moveframe sports (these will be read-only)
        moveframeSportsFromDay.forEach((sport, index) => {
          if (index < 4) {
            initialSports[index] = sport;
          }
        });
        
        // Generate default name and code
        const defaultName = generateDefaultName();
        const defaultCode = generateDefaultCode();
        
        setFormData({
          name: defaultName,
          code: defaultCode,
          sports: initialSports,
          includeStretching: false,
          // Section C fields (empty for new workout)
          time: '',
          weather: '',
          location: '',
          surface: '',
          heartRateMax: undefined,
          heartRateAvg: undefined,
          calories: undefined,
          feelingStatus: '',
          notes: ''
        });
      }
      // Reset validation state
      setValidation({
        name: { valid: true, message: '' },
        code: { valid: true, message: '' },
        sports: { valid: true, message: '' },
        heartRate: { valid: true, message: '' }
      });
      setIsSubmitting(false);
    }
  }, [isOpen, mode, existingWorkout, existingWorkouts, generateDefaultCode, generateDefaultName, getSportsFromMoveframes]);

  // ==================== RETURN VALUES ====================
  return {
    // State
    formData,
    validation,
    isSubmitting,
    
    // Computed values
    moveframeSports,
    selectedSportsCount,
    
    // Helper functions
    isSportFromMoveframe,
    canManuallySelectSport,
    isFormValid,
    
    // Handlers
    handleNameChange,
    handleCodeChange,
    handleSportChange,
    handleStretchingChange,
    handleSectionCFieldChange,
    handleSubmit,
    handleKeyDown,
    
    // Direct setters (if needed)
    setFormData,
    setValidation
  };
}

