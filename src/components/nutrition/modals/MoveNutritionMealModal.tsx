'use client';

import React, { useState } from 'react';
import { X, MoveHorizontal } from 'lucide-react';

interface MoveMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWorkout: any;
  nutritionPlan: any;
  onConfirm: (targetDayId: string, sessionNumber: number) => void;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function MoveMealModal({
  isOpen,
  onClose,
  sourceWorkout,
  nutritionPlan,
  onConfirm,
  activeSection = 'A'
}: MoveMealModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');

  const handleMove = () => {
    if (selectedDay) {
      const targetDay = nutritionPlan?.weeks
        ?.flatMap((w: any) => w.days || [])
        ?.find((d: any) => d.id === selectedDay);
      
      const nextSession = (targetDay?.meals?.length || 0) + 1;
      onConfirm(selectedDay, nextSession);
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedWeekData = nutritionPlan?.weeks?.find((w: any) => w.id === selectedWeek);
  const availableDays = selectedWeekData?.days || [];

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-purple-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <MoveHorizontal size={20} />
            <h2 className="text-lg font-bold">Move Workout</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <p className="text-sm text-gray-700">
              <strong>Moving:</strong> {sourceWorkout.name || `Workout #${sourceWorkout.sessionNumber}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {sourceWorkout.nutritionFoods?.length || 0} nutritionFood(s) will be moved
            </p>
            <p className="text-xs text-purple-600 mt-2">
              ⚠️ This will remove the workout from its current day
            </p>
          </div>

          {/* Select Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Target Week:
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                setSelectedDay('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Choose a week...</option>
              {nutritionPlan?.weeks?.map((week: any) => {
                const dateDisplay = activeSection === 'A' 
                  ? '' 
                  : (week.startDate ? ` (${new Date(week.startDate).toLocaleDateString()})` : '');
                
                return (
                  <option key={week.id} value={week.id}>
                    Week {week.weekNumber}{dateDisplay}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Select Day */}
          {selectedWeek && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Target Day:
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Choose a day...</option>
                {availableDays.map((day: any) => (
                  <option key={day.id} value={day.id}>
                    {activeSection === 'A' ? (
                      `Day ${availableDays.indexOf(day) + 1} (${day.meals?.length || 0} workout(s))`
                    ) : (
                      `${new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })} (${day.meals?.length || 0} workout(s))`
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedDay}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Move Workout
          </button>
        </div>
      </div>
    </div>
  );
}

