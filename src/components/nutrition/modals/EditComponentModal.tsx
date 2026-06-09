/**
 * EditNutritionComponentModal Component
 * Modal for editing nutritionComponent (microlap) details
 */

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { REST_TYPES } from '@/config/nutrition.constants';
import { nutritionComponentApi } from '@/utils/api.utils';
import type { NutritionComponent, NutritionFood, NutritionMeal, NutritionDay, Workout } from '@/types/nutrition.types';

// Helper function to parse flexible time input
const parseFlexibleTime = (input: string): string => {
  if (!input || input.trim() === '') return '';
  
  const cleaned = input.trim();
  
  // Already in correct format (e.g., "1'30"0" or "0h01'30"0" or "1h13'25"5")
  if (cleaned.match(/^\d+h\d{2}'\d{2}"\d$/)) {
    return cleaned;
  }
  
  // Format: "130" or "1:30" or "1.30" -> "1'30"0"
  // Format: "113255" -> "1h13'25"5"
  // Format: "1325" -> "1'32"5"
  const formats = [
    // 113255 (6 digits) -> 1h13'25"5
    { pattern: /^(\d{1,2})(\d{2})(\d{2})(\d)$/, handler: (m: RegExpMatchArray) => `${m[1]}h${m[2]}'${m[3]}"${m[4]}` },
    // 11325 (5 digits) -> 1h13'25"0
    { pattern: /^(\d{1,2})(\d{2})(\d{2})$/, handler: (m: RegExpMatchArray) => {
      const first = m[1];
      if (first.length === 1 && parseInt(first) <= 9) {
        // Treat as h:mm:ss format
        return `${first}h${m[2]}'${m[3]}"0`;
      } else {
        // Treat as mm:ss format
        return `${m[1]}'${m[2]}"${m[3].charAt(0)}`;
      }
    }},
    // 1325 (4 digits) -> 1'32"5 or 13'25"0
    { pattern: /^(\d{1,2})(\d{2})(\d?)$/, handler: (m: RegExpMatchArray) => {
      if (m[3]) {
        return `${m[1]}'${m[2]}"${m[3]}`;
      } else {
        return `${m[1]}'${m[2]}"0`;
      }
    }},
    // 130 -> 1'30"0
    { pattern: /^(\d{1,2})(\d{2})$/, handler: (m: RegExpMatchArray) => `${m[1]}'${m[2]}"0` },
    // 1:30 -> 1'30"0
    { pattern: /^(\d{1,2}):(\d{2})$/, handler: (m: RegExpMatchArray) => `${m[1]}'${m[2]}"0` },
    // 1.30 -> 1'30"0
    { pattern: /^(\d{1,2})\.(\d{2})$/, handler: (m: RegExpMatchArray) => `${m[1]}'${m[2]}"0` },
    // 1'30 -> 1'30"0
    { pattern: /^(\d{1,2})'(\d{2})$/, handler: (m: RegExpMatchArray) => `${m[1]}'${m[2]}"0` },
    // 1:30:5 -> 1h30'05"5
    { pattern: /^(\d{1,2}):(\d{2}):(\d{1,2})$/, handler: (m: RegExpMatchArray) => `${m[1]}h${m[2]}'${m[3].padStart(2, '0')}"0` },
    // 1.30.5 -> 1h30'05"5
    { pattern: /^(\d{1,2})\.(\d{2})\.(\d{1,2})$/, handler: (m: RegExpMatchArray) => `${m[1]}h${m[2]}'${m[3].padStart(2, '0')}"0` },
    // 1h30'5 -> 1h30'05"0
    { pattern: /^(\d{1,2})h(\d{2})'(\d{1,2})$/, handler: (m: RegExpMatchArray) => `${m[1]}h${m[2]}'${m[3].padStart(2, '0')}"0` },
  ];
  
  for (const { pattern, handler } of formats) {
    const match = cleaned.match(pattern);
    if (match) {
      return handler(match);
    }
  }
  
  return cleaned; // Return as-is if no pattern matches
};

interface EditNutritionComponentModalProps {
  nutritionComponent: any; // TODO: Use proper NutritionComponent type
  nutritionFood: NutritionFood;
  workout: Workout;
  day: NutritionDay;
  onClose: () => void;
  onSave: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function EditNutritionComponentModal({
  nutritionComponent,
  nutritionFood,
  workout,
  day,
  onClose,
  onSave,
  onError,
  onSuccess
}: EditNutritionComponentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paceInput, setPaceInput] = useState(nutritionComponent.pace || '');
  const [paceFormatted, setPaceFormatted] = useState(nutritionComponent.pace || '');
  const [timeInput, setTimeInput] = useState(nutritionComponent.time || '');
  const [timeFormatted, setTimeFormatted] = useState(nutritionComponent.time || '');
  
  // Initialize formatted values on mount
  useEffect(() => {
    if (nutritionComponent.pace) {
      setPaceInput(nutritionComponent.pace);
      setPaceFormatted(nutritionComponent.pace);
    }
    if (nutritionComponent.time) {
      setTimeInput(nutritionComponent.time);
      setTimeFormatted(nutritionComponent.time);
    }
  }, [nutritionComponent.pace, nutritionComponent.time]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const isManualNutritionComponent = nutritionFood.manualMode === true;

    try {
      // For manual nutritionComponents, only update notes
      // For normal nutritionComponents, update all fields
      const updateData = isManualNutritionComponent 
        ? {
            notes: formData.get('notes') as string || ''
          }
        : {
            distance: parseInt(formData.get('distance') as string) || 0,
            speedCode: formData.get('speedCode') as string || '',
            style: formData.get('style') as string || '',
            pace: paceFormatted || '',
            time: timeFormatted || '',
            pause: formData.get('pause') as string || '',
            restType: formData.get('restType') as string || 'SET_TIME',
            alarm: parseInt(formData.get('alarm') as string) || 0,
            notes: formData.get('notes') as string || ''
          };

      const response = await nutritionComponentApi.update(nutritionComponent.id, updateData);

      if (response.success) {
        onSuccess('NutritionComponent updated successfully!');
        onSave();
        onClose();
      } else {
        onError(response.error || 'Failed to update nutritionComponent');
      }
    } catch (error) {
      console.error('Error updating nutritionComponent:', error);
      onError('Error updating nutritionComponent');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if this nutritionComponent belongs to a manual nutritionFood
  const isManualNutritionComponent = nutritionFood.manualMode === true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Edit NutritionComponent #{nutritionComponent.index}
            </h2>
            <p className="text-sm text-gray-500">
              NutritionFood {nutritionFood.code} • {nutritionFood.sport} • NutritionMeal #{workout.sessionNumber}
            </p>
            {isManualNutritionComponent && (
              <p className="text-xs text-amber-600 font-semibold mt-1">
                ⚠️ Manual NutritionComponent - Only summary/notes can be edited
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show all fields for normal nutritionComponents, only notes for manual nutrition_components */}
          {!isManualNutritionComponent && (
            <div className="grid grid-cols-2 gap-4">
            {/* Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance (meters) *
              </label>
              <input
                type="number"
                name="distance"
                defaultValue={nutritionComponent.distance || 0}
                placeholder="100"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Speed Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speed Code
              </label>
              <input
                type="text"
                name="speedCode"
                defaultValue={nutritionComponent.speedCode || ''}
                placeholder="A1, A2, B1, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Style
              </label>
              <input
                type="text"
                name="style"
                defaultValue={nutritionComponent.style || ''}
                placeholder="FR, BK, BR, FL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Pace/100m */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pace/100: <span className="text-[10px] text-green-600 font-semibold">✨ Flexible input</span>
              </label>
              <input
                type="text"
                value={paceInput}
                onChange={(e) => setPaceInput(e.target.value)}
                onBlur={(e) => {
                  const formatted = parseFlexibleTime(e.target.value);
                  if (formatted) {
                    setPaceFormatted(formatted);
                    setPaceInput(formatted);
                  }
                }}
                placeholder="130 or 1:30 or 1.30"
                autoComplete="off"
                className="w-full px-3 py-2 text-lg border-2 border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono bg-green-50"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-[10px] text-green-600">
                ⚡ Fast input: Type <strong>130</strong> → <strong>1&apos;30&quot;0</strong>
              </p>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                TIME <span className="text-gray-400 font-normal text-[10px]">(optional)</span>
              </label>
              <input
                type="text"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                onBlur={(e) => {
                  const formatted = parseFlexibleTime(e.target.value);
                  if (formatted) {
                    setTimeFormatted(formatted);
                    setTimeInput(formatted);
                  }
                }}
                placeholder="0h00'00&quot;0"
                autoComplete="off"
                className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-[10px] text-blue-600">
                💡 Type: <strong>1&apos;30, 1.30.5, or 1&apos;30</strong> — formats to <strong>0h01&apos;30&quot;0</strong> or <strong>0h01&apos;30&quot;5</strong>
              </p>
            </div>

            {/* Pause */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pause/Rest
              </label>
              <input
                type="text"
                name="pause"
                defaultValue={nutritionComponent.pause || ''}
                placeholder="00:20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Rest Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rest Type
              </label>
              <select
                name="restType"
                defaultValue={nutritionComponent.restType || REST_TYPES.SET_TIME}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value={REST_TYPES.SET_TIME}>Set Time</option>
                <option value={REST_TYPES.RESTART_TIME}>Restart Time</option>
                <option value={REST_TYPES.RESTART_PULSE}>Restart Pulse</option>
              </select>
            </div>

            {/* Alarm */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alarm
              </label>
              <input
                type="number"
                name="alarm"
                defaultValue={nutritionComponent.alarm || 0}
                placeholder="-1 to -10"
                min="-10"
                max="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>
          </div>
          )}

          {/* Notes - Always show for both manual and normal nutrition_components */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isManualNutritionComponent ? 'Summary / Notes' : 'Notes'}
            </label>
            <textarea
              name="notes"
              defaultValue={nutritionComponent.notes || ''}
              placeholder={isManualNutritionComponent ? "Enter summary or notes for this manual nutritionComponent..." : "Optional notes..."}
              rows={isManualNutritionComponent ? 6 : 3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              disabled={isSubmitting}
            />
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

