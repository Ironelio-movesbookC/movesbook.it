'use client';

import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';

interface CopyWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWorkout: any;
  workoutPlan: any;
  onConfirm: (targetDayId: string, sessionNumber: number) => void;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  /** Modal title, e.g. "Clone Workout" in Archive */
  title?: string;
  actionLabel?: string;
}

export default function CopyWorkoutModal({
  isOpen,
  onClose,
  sourceWorkout,
  workoutPlan,
  onConfirm,
  activeSection = 'A',
  title = 'Copy Workout',
  actionLabel = 'Copy Workout',
}: CopyWorkoutModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const handleCopy = () => {
    if (selectedDay) {
      const targetDay = workoutPlan?.weeks
        ?.flatMap((w: any) => w.days || [])
        ?.find((d: any) => d.id === selectedDay);

      const existing = targetDay?.workouts?.length ?? 0;
      if (existing >= 3) {
        alert('Target day already has 3 workouts (maximum).');
        return;
      }
      if (existing > 0 && !confirmOverwrite) {
        return;
      }

      const nextSession = existing + 1;
      onConfirm(selectedDay, nextSession);
      onClose();
    }
  };

  const selectedWeekData = workoutPlan?.weeks?.find((w: any) => w.id === selectedWeek);
  const availableDays = selectedWeekData?.days || [];
  const selectedTargetDay = availableDays.find((d: any) => d.id === selectedDay);
  const targetHasContent = (selectedTargetDay?.workouts?.length ?? 0) > 0;
  const targetFull = (selectedTargetDay?.workouts?.length ?? 0) >= 3;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-green-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Copy size={20} />
            <h2 className="text-lg font-bold">{title}</h2>
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
          <div className="bg-green-50 p-3 rounded">
            <p className="text-sm text-gray-700">
              <strong>Copying:</strong> {sourceWorkout.name || `Workout #${sourceWorkout.sessionNumber}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {sourceWorkout.moveframes?.length || 0} moveframe(s) will be copied
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
            >
              <option value="">Choose a week...</option>
              {workoutPlan?.weeks?.map((week: any) => {
                // Get first day's date from the week if available
                const firstDay = week.days?.[0];
                const dateDisplay = activeSection === 'A' 
                  ? '' 
                  : (firstDay ? new Date(firstDay.date).toLocaleDateString() : 'No dates');
                
                return (
                  <option key={week.id} value={week.id}>
                    Week {week.weekNumber}{dateDisplay ? ` (${dateDisplay})` : ''}
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
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setConfirmOverwrite(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose a day...</option>
                {availableDays.map((day: any) => (
                  <option key={day.id} value={day.id}>
                    {activeSection === 'A' ? (
                      `Day ${availableDays.indexOf(day) + 1} (${day.workouts?.length || 0} workout(s))`
                    ) : (
                      `${new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })} (${day.workouts?.length || 0} workout(s))`
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetHasContent && !targetFull && (
            <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmOverwrite}
                onChange={(e) => setConfirmOverwrite(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-amber-900">
                Target day already has workouts. The copy will be added as an additional session.
              </span>
            </label>
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
            onClick={handleCopy}
            disabled={!selectedDay || targetFull || (targetHasContent && !confirmOverwrite)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

