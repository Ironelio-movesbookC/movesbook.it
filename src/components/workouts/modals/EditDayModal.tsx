/**
 * EditDayModal Component
 * Extracted modal for editing workout day metadata
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { FEELING_STATUS_OPTIONS } from '@/config/workout.constants';
import { dayApi } from '@/utils/api.utils';
import { dateHelpers } from '@/utils/workout.helpers';
import type { WorkoutDay, Period } from '@/types/workout.types';

interface EditDayModalProps {
  day: WorkoutDay;
  periods: Period[];
  activeSection?: 'A' | 'B' | 'C'; // A = WORKOUT PLAN, B = WORKOUT DONE, C = REST
  onClose: () => void;
  onSave: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function EditDayModal({
  day,
  periods,
  activeSection = 'A',
  onClose,
  onSave,
  onError,
  onSuccess
}: EditDayModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notesContent, setNotesContent] = useState(day.notes || '');
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content when modal opens (like WeeklyInfoModal)
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = day.notes || '';
      setNotesContent(day.notes || '');
    }
  }, [day.id, day.notes]); // Re-initialize when day changes
  
  // Show weather and feeling status only in section C (Workouts Done)
  const showWeatherAndFeeling = activeSection === 'C';
  
  // Debug: Log day data
  console.log('📅 Edit Day Modal - Day data:', day);
  console.log('📅 Periods:', periods);
  
  // Get day of week name from date
  const getDayOfWeekName = (): string => {
    try {
      const date = new Date(day.date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()] || '';
    } catch (error) {
      console.error('Error getting day of week:', error);
      return '';
    }
  };
  
  // Get period information (from day.period or lookup in periods array)
  const getPeriodInfo = () => {
    console.log('🔍 Getting period info...');
    console.log('  - day.periodId:', day.periodId);
    
    // First try to get from day.period (nested object from Prisma) if it exists
    const dayWithPeriod = day as any;
    if (dayWithPeriod.period && dayWithPeriod.period.name && dayWithPeriod.period.color) {
      console.log('✅ Using nested period object');
      return {
        name: dayWithPeriod.period.name,
        color: dayWithPeriod.period.color
      };
    }
    
    // Fallback: try flat properties (backward compatibility)
    if (day.periodName && day.periodColor) {
      console.log('✅ Using flat properties');
      return {
        name: day.periodName,
        color: day.periodColor
      };
    }
    
    // Otherwise, look up in periods array if available
    if (periods && Array.isArray(periods) && day.periodId) {
      console.log('🔍 Looking up in periods array, count:', periods.length);
      const period = periods.find(p => p.id === day.periodId);
      console.log('  - Found period:', period);
      if (period) {
        console.log('✅ Using period from array');
        return {
          name: period.name,
          color: period.color
        };
      }
    }
    
    // No period assigned
    console.log('❌ No period found');
    return null;
  };
  
  const periodInfo = getPeriodInfo();
  console.log('📊 Final period info:', periodInfo);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await dayApi.update(day.id, {
        notes: notesContent,
        weather: formData.get('weather'),
        feelingStatus: formData.get('feelingStatus'),
        periodId: day.periodId // Keep existing period
      });

      if (response.success) {
        onSuccess('Day updated successfully!');
        onSave();
        onClose();
      } else {
        onError(response.error || 'Failed to update day');
      }
    } catch (error) {
      console.error('Error updating day:', error);
      onError('Error updating day');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Day</h2>
            <p className="text-sm text-gray-500">
              {dateHelpers.formatDate(day.date, 'long')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Day Summary - Read-only information */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Day Summary</h3>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Weather - Only show in section C (Workouts Done) */}
          {showWeatherAndFeeling && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weather
              </label>
              <input
                type="text"
                name="weather"
                defaultValue={day.weather || ''}
                placeholder="Sunny, Rainy, Cloudy, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Feeling/Status - Only show in section C (Workouts Done) */}
          {showWeatherAndFeeling && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feeling (1-10)
              </label>
              <select
                name="feelingStatus"
                defaultValue={day.feelingStatus || '5'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                {FEELING_STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes / Annotations - Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Annotations
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div 
                ref={editorRef}
                contentEditable={!isSubmitting}
                suppressContentEditableWarning
                onInput={(e) => setNotesContent(e.currentTarget.innerHTML)}
                onPaste={(e) => {
                  // Allow default paste behavior to preserve formatting from HTML
                  console.log('📋 Paste event in EditDayModal - allowing formatted paste');
                  // The contentEditable will handle the paste automatically with formatting
                  setTimeout(() => {
                    const target = e.currentTarget as HTMLDivElement;
                    if (target) {
                      setNotesContent(target.innerHTML);
                    }
                  }, 0);
                }}

                className="w-full min-h-[150px] max-h-[300px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto bg-white"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Type or paste content with formatting. Use Ctrl+B for bold, Ctrl+I for italic, etc.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



