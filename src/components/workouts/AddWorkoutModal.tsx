'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { 
  SPORT_OPTIONS, 
  WORKOUT_SYMBOLS, 
  getNextAvailableSessionNumber 
} from '@/constants/workout.constants';
import { useWorkoutForm } from '@/hooks/useWorkoutForm';

interface AddWorkoutModalProps {
  isOpen: boolean;
  day: any; // Day object with week, date, period info
  existingWorkouts: any[]; // Array of existing workouts in the day
  mode?: 'add' | 'edit' | 'view';
  existingWorkout?: any; // Workout to edit (when mode is 'edit' or 'view')
  activeSection?: 'A' | 'B' | 'C' | 'D'; // Which section we're in
  onClose: () => void;
  onSave: (workoutData: any) => Promise<void>;
  onEdit?: () => void; // Callback when switching from view to edit mode
}

export default function AddWorkoutModal({
  isOpen,
  day,
  existingWorkouts,
  mode = 'add',
  existingWorkout,
  activeSection = 'A',
  onClose,
  onSave,
  onEdit
}: AddWorkoutModalProps) {
  const isViewMode = mode === 'view';
  // Calculate next available workout number (1, 2, or 3)
  const workoutNumber = getNextAvailableSessionNumber(existingWorkouts);
  const workoutSymbol = WORKOUT_SYMBOLS[workoutNumber as 1 | 2 | 3];
  
  // Check if we're in Section C (WORKOUTS DONE)
  const isWorkoutsDone = activeSection === 'C';
  
  // Main Sport state (separate from the 4 moveframe sports)
  const [mainSportValue, setMainSportValue] = useState(existingWorkout?.mainSport || '');
  
  const handleMainSportChange = (value: string | null) => {
    setMainSportValue(value || '');
    // In edit mode, save immediately
    if (mode === 'edit' && existingWorkout) {
      saveMainSportToBackend(value);
    }
  };
  
  const saveMainSportToBackend = async (value: string | null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`/api/workouts/sessions/${existingWorkout.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mainSport: value || null })
      });
    } catch (error) {
      console.error('Error updating main sport:', error);
    }
  };
  
  // Get day of week name from date
  const getDayOfWeekName = (): string => {
    try {
      const date = new Date(day.date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()] || '';
    } catch (error) {
      return '';
    }
  };
  
  // Get period information
  const getPeriodInfo = () => {
    if (day.periodName && day.periodColor) {
      return { name: day.periodName, color: day.periodColor };
    }
    if (day.period) {
      return { name: day.period.name, color: day.period.color };
    }
    return null;
  };
  
  const periodInfo = getPeriodInfo();

  // Use custom hook for form management
  const {
    formData,
    validation,
    isSubmitting,
    moveframeSports,
    selectedSportsCount,
    isSportFromMoveframe,
    canManuallySelectSport,
    handleNameChange,
    handleCodeChange,
    handleSportChange,
    handleStretchingChange,
    handleSectionCFieldChange,
    handleSubmit,
    handleKeyDown
  } = useWorkoutForm({
    isOpen,
    mode,
    existingWorkout,
    existingWorkouts,
    day,
    workoutNumber,
    workoutSymbol,
    isWorkoutsDone,
    onSave,
    onClose
  });

  if (!isOpen) return null;

  // Check if maximum workouts reached (only when ADDING a new workout)
  if (mode === 'add' && existingWorkouts.length >= 3) {
    return (
      <div 
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div 
          className="bg-white rounded-lg shadow-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b bg-red-500 text-white">
            <h2 className="text-xl font-bold">⚠️ Maximum Workouts Reached</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              You can only add up to <strong>3 workouts per day</strong>. This day already has 3 workouts.
            </p>
            <p className="text-sm text-gray-600">
              Please delete an existing workout if you want to add a new one.
            </p>
          </div>
          <div className="p-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto animate-slideUp mx-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none'  /* IE and Edge */
        }}
        onKeyDown={handleKeyDown}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg">
          <div>
            <h2 id="modal-title" className="text-lg font-bold flex items-center gap-2">
              <span>{mode === 'view' ? 'WORKOUT INFO' : mode === 'edit' ? 'EDIT WORKOUT' : `ADD WORKOUT #${workoutNumber}`}</span>
              {(mode === 'edit' || mode === 'view') && existingWorkout && (
                <span className="text-2xl" aria-label={`Symbol: ${WORKOUT_SYMBOLS[existingWorkout.sessionNumber as 1 | 2 | 3]?.label || 'Circle'}`}>
                  {WORKOUT_SYMBOLS[existingWorkout.sessionNumber as 1 | 2 | 3]?.symbol || '○'}
                </span>
              )}
              {mode === 'add' && (
                <span className="text-2xl animate-pulse" aria-label={`Symbol: ${workoutSymbol.label}`}>{workoutSymbol.symbol}</span>
              )}
            </h2>
            <p id="modal-description" className="text-xs text-blue-50 mt-0.5 flex items-center gap-2">
              <span className="font-medium">{day.period?.name || 'No Period'}</span>
              <span className="text-blue-200">•</span>
              <span>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-all hover:rotate-90 duration-300"
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workout Summary - Read-only information */}
        {(mode === 'edit' || mode === 'view') && (
          <div className="mx-4 mt-4 mb-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Workout Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Week Number */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Week Number</div>
                <div className="text-lg font-bold text-gray-900">
                  Week {day.weekNumber}
                </div>
              </div>
              
              {/* Day of Week */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Day of Week</div>
                <div className="text-lg font-bold text-gray-900">
                  {getDayOfWeekName()}
                </div>
              </div>
              
              {/* Period */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Period</div>
                {periodInfo ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" 
                      style={{ backgroundColor: periodInfo.color }}
                    />
                    <div className="text-lg font-bold text-gray-900 truncate">
                      {periodInfo.name}
                    </div>
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-400 italic">
                    No period
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-4 space-y-3">
          {/* Section 1: Workout Identification */}
          <div className="space-y-2">
            {/* Workout Name */}
            <div>
              <label htmlFor="workout-name" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <span>Workout Name</span>
                <span className="text-red-500 text-sm" aria-label="required">*</span>
              </label>
              <input
                id="workout-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => handleNameChange(formData.name)}
                disabled={isViewMode}
                className={`w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm ${
                  !validation.name.valid ? 'border-red-500 bg-red-50' : isViewMode ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="e.g., Morning Run, Evening Swim"
                autoFocus={!isViewMode}
                aria-required="true"
                aria-invalid={!validation.name.valid}
                aria-describedby={!validation.name.valid ? "name-error" : undefined}
              />
              {!validation.name.valid && (
                <p id="name-error" className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
                  <span>⚠️</span>
                  <span>{validation.name.message}</span>
                </p>
              )}
            </div>

            {/* Workout Code */}
            <div>
              <label htmlFor="workout-code" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <span>Workout Code</span>
                <span className="text-red-500 text-sm" aria-label="required">*</span>
              </label>
              <input
                id="workout-code"
                type="text"
                value={formData.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onBlur={() => handleCodeChange(formData.code)}
                disabled={isViewMode}
                className={`w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm ${
                  !validation.code.valid ? 'border-red-500 bg-red-50' : isViewMode ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="e.g., WRK001, TR-123"
                aria-required="true"
                aria-invalid={!validation.code.valid}
                aria-describedby={!validation.code.valid ? "code-error" : undefined}
              />
              {!validation.code.valid && (
                <p id="code-error" className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
                  <span>⚠️</span>
                  <span>{validation.code.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Sports Selection */}
          <div className={`space-y-3 p-3 rounded-lg border ${
            mainSportValue
              ? 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200'
              : 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-300'
          }`}>
            {/* Main Type of Activity - Freely Selectable */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                <span>{mainSportValue ? '⭐' : '⚠️'}</span>
                <span>Main Type of Activity</span>
                {!mainSportValue && (
                  <span className="text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full font-semibold animate-pulse">
                    Not Set
                  </span>
                )}
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-normal">Optional - Note Only</span>
              </label>
              <select
                value={mainSportValue || ''}
                onChange={(e) => handleMainSportChange(e.target.value || null)}
                disabled={isViewMode}
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 text-sm transition-all ${
                  isViewMode
                    ? 'bg-gray-100 cursor-not-allowed text-gray-600'
                    : mainSportValue
                    ? 'bg-yellow-50 border-yellow-300 font-medium focus:ring-yellow-500 focus:border-yellow-500'
                    : 'bg-orange-50 hover:border-orange-400 border-orange-400 focus:ring-orange-500 focus:border-orange-500'
                }`}
              >
                <option value="">{mainSportValue ? 'Select main type of activity (optional)...' : '⚠️ Select main type of activity...'}</option>
                {SPORT_OPTIONS.map((sport) => (
                  <option key={sport.value} value={sport.value}>
                    {sport.icon} {sport.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {mainSportValue 
                  ? 'This can be selected independently from the 4 sports below. Used for manual mode or FREE_MOVES.'
                  : '💡 Tip: Setting the main sport helps organize and identify your workout type.'}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-300" />

            {/* Sports from Moveframes */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <span>🏅</span>
                <span>Sports from Moveframes (max 4)</span>
                <span className="text-red-500 text-sm" aria-label="required">*</span>
              </label>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                selectedSportsCount === 0 ? 'bg-gray-200 text-gray-600' :
                selectedSportsCount === 4 ? 'bg-green-200 text-green-700' :
                'bg-blue-200 text-blue-700'
              }`}>
                {selectedSportsCount}/4
              </span>
            </div>

            {/* Sports Grid (2x2 on desktop, 1 column on mobile) - READ ONLY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((index) => {
                const selectedSport = SPORT_OPTIONS.find(s => s.value === formData.sports[index]);
                
                return (
                  <div key={index} className="relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                      <span className="text-blue-500">●</span>
                      <span>Sport {index + 1}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Loaded from moveframes">
                        📋 From Moveframes
                      </span>
                    </label>
                    {/* Read-only display - no dropdown */}
                    <div className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                      selectedSport
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-400 italic'
                    }`}>
                      {selectedSport ? (
                        <span>{selectedSport.icon} {selectedSport.label}</span>
                      ) : (
                        <span>— Not set yet —</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sports validation removed - sports are auto-loaded from moveframes */}
            
            {/* Info message for sports */}
            <div className="text-xs text-blue-600 bg-blue-50 p-2.5 rounded flex items-start gap-2 border border-blue-200">
              <span className="text-sm flex-shrink-0">ℹ️</span>
              <div className="space-y-1">
                <div className="font-semibold text-blue-700">How Sports Work</div>
                <div className="text-blue-600 space-y-0.5">
                  <div>• These 4 sports are automatically loaded from your moveframes</div>
                  <div>• To add/change sports, create moveframes with those sports</div>
                  <div>• Stretching doesn't count toward the 4-sport limit (if excluded in settings)</div>
                  <div>• "Main Type of Activity" can be selected freely for manual mode</div>
                </div>
              </div>
            </div>

            {/* Include Stretching Checkbox */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="stretching"
                  checked={formData.includeStretching}
                  onChange={(e) => handleStretchingChange(e.target.checked)}
                  disabled={isViewMode}
                  className="w-4 h-4 mt-0.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <label htmlFor="stretching" className="text-sm font-medium text-gray-700 flex items-center gap-1.5 cursor-pointer">
                    <span>🧘</span>
                    <span>Include Stretching</span>
                    <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded font-normal">Optional</span>
                  </label>
                  <p className="text-xs text-purple-600 mt-1">
                    Stretching doesn't count toward the 4-sport limit
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: WORKOUTS DONE Fields (only for Section C) — see WORKOUTS_DONE_WORKOUT_INFO_FIELDS */}
          {isWorkoutsDone && (
            <div className="space-y-3 bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-sm font-bold text-green-800 flex items-center gap-2">
                <span>📊</span>
                <span>Workout info (Workouts Done)</span>
              </h3>
              <p className="text-xs text-green-700">
                Weather and Feeling Status appear only under WORKOUTS DONE (this section).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Number of week
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={day?.weekNumber ?? ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-amber-50 text-sm text-gray-700"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Day of the week
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={getDayOfWeekName()}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-amber-50 text-sm text-gray-700"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Number of the workout
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      mode === 'add'
                        ? `( ${workoutNumber}th )`
                        : existingWorkout?.sessionNumber
                          ? `( ${existingWorkout.sessionNumber}th )`
                          : `( ${workoutNumber}th )`
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-amber-50 text-sm text-gray-700"
                  />
                </div>

                {/* Time */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => handleSectionCFieldChange('time', e.target.value)}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="00:00"
                  />
                </div>

                {/* Weather — Done only */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Weather
                  </label>
                  <input
                    type="text"
                    value={formData.weather || ''}
                    onChange={(e) => handleSectionCFieldChange('weather', e.target.value)}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="in according to the Weather setting"
                    list="weather-options"
                  />
                  <datalist id="weather-options">
                    <option value="Sunny" />
                    <option value="Partly Cloudy" />
                    <option value="Cloudy" />
                    <option value="Rainy" />
                    <option value="Stormy" />
                    <option value="Snowy" />
                    <option value="Windy" />
                    <option value="Foggy" />
                    <option value="Hot" />
                    <option value="Cold" />
                  </datalist>
                </div>

                {/* Location */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => handleSectionCFieldChange('location', e.target.value)}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="Gym, Track, Park..."
                    list="location-options"
                  />
                  <datalist id="location-options">
                    <option value="Gym" />
                    <option value="Track" />
                    <option value="Park" />
                    <option value="Pool" />
                    <option value="Home" />
                    <option value="Beach" />
                    <option value="Stadium" />
                    <option value="Trail" />
                  </datalist>
                </div>

                {/* Surface */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Surface
                  </label>
                  <input
                    type="text"
                    value={formData.surface || ''}
                    onChange={(e) => handleSectionCFieldChange('surface', e.target.value)}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="Asphalt, Track, Grass..."
                    list="surface-options"
                  />
                  <datalist id="surface-options">
                    <option value="Asphalt" />
                    <option value="Track" />
                    <option value="Grass" />
                    <option value="Treadmill" />
                    <option value="Trail" />
                    <option value="Sand" />
                    <option value="Indoor" />
                    <option value="Water" />
                  </datalist>
                </div>

                {/* Heart rate (max) — two boxes in mockup map to Max / optional second reading */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Heart rate (max)
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="220"
                    value={formData.heartRateMax || ''}
                    onChange={(e) =>
                      handleSectionCFieldChange(
                        'heartRateMax',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="000"
                  />
                </div>

                {/* Average HR */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Average HR
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="220"
                    value={formData.heartRateAvg || ''}
                    onChange={(e) =>
                      handleSectionCFieldChange(
                        'heartRateAvg',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm disabled:bg-gray-100 ${
                      validation.heartRate?.valid === false
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder="000"
                  />
                  {validation.heartRate?.valid === false && (
                    <p className="text-xs text-red-600 mt-1">{validation.heartRate.message}</p>
                  )}
                </div>

                {/* Calories */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={formData.calories || ''}
                    onChange={(e) =>
                      handleSectionCFieldChange(
                        'calories',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="0000"
                  />
                </div>

                {/* Feeling Status — Done only */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Feeling Status
                  </label>
                  <input
                    type="text"
                    value={formData.feelingStatus || ''}
                    onChange={(e) => handleSectionCFieldChange('feelingStatus', e.target.value)}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
                    placeholder="Great, Good, Tired..."
                    list="feeling-options"
                  />
                  <datalist id="feeling-options">
                    <option value="Excellent" />
                    <option value="Great" />
                    <option value="Good" />
                    <option value="Average" />
                    <option value="Tired" />
                    <option value="Exhausted" />
                    <option value="Sore" />
                    <option value="Energetic" />
                  </datalist>
                </div>

                {/* Note */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleSectionCFieldChange('notes', e.target.value)}
                    disabled={isViewMode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-vertical disabled:bg-gray-100"
                    rows={3}
                    placeholder="( input )"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
          {isViewMode ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white hover:border-gray-400 transition-all font-medium order-2 sm:order-1 shadow-sm"
              >
                Close
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg hover:shadow-xl"
                >
                  <span>✏️</span>
                  <span>Edit Workout</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white hover:border-gray-400 transition-all font-medium disabled:opacity-50 order-2 sm:order-1 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !validation.name.valid || !validation.code.valid || !validation.sports.valid}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{mode === 'edit' ? 'Saving...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>{mode === 'edit' ? 'Save Changes' : 'Create Workout'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
