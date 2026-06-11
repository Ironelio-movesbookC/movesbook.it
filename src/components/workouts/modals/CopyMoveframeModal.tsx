'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  resolveMoveframeId,
  resolveWorkoutSessionId,
  type MoveframeCopyMovePayload,
  type MoveframePosition,
} from '@/lib/moveframeCopyMove';
import {
  formatWorkoutSelectLabel,
  getSortedWorkoutsForPlanDay,
  getWorkoutDisplayNumber,
} from '@/lib/workoutDisplayOrder';

export type { MoveframeCopyMovePayload, MoveframePosition };

interface CopyMoveframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceMoveframe: any | any[]; // Can be single or array
  sourceDay?: any;
  workoutPlan: any;
  onConfirm: (payload: MoveframeCopyMovePayload) => void | Promise<void>;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function CopyMoveframeModal({
  isOpen,
  onClose,
  sourceMoveframe,
  sourceDay,
  workoutPlan,
  onConfirm,
  activeSection = 'A'
}: CopyMoveframeModalProps) {
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedWorkout, setSelectedWorkout] = useState<string>('');
  const [position, setPosition] = useState<'before' | 'after' | 'replace'>('after');
  const [targetMoveframe, setTargetMoveframe] = useState<string>('');
  const [availableWorkouts, setAvailableWorkouts] = useState<any[]>([]);
  const [availableMoveframes, setAvailableMoveframes] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (sourceDay?.id) {
      setSelectedDay(sourceDay.id);
    }
  }, [isOpen, sourceDay?.id]);

  useEffect(() => {
    if (selectedDay && workoutPlan) {
      setAvailableWorkouts(getSortedWorkoutsForPlanDay(workoutPlan, selectedDay));
      setSelectedWorkout('');
      setTargetMoveframe('');
    } else {
      setAvailableWorkouts([]);
    }
  }, [selectedDay, workoutPlan]);

  useEffect(() => {
    if (selectedWorkout) {
      const workout = availableWorkouts.find(w => w.id === selectedWorkout);
      setAvailableMoveframes(workout?.moveframes || []);
      setTargetMoveframe('');
    }
  }, [selectedWorkout, availableWorkouts]);

  const handleSubmit = () => {
    const sourceMoveframeId = resolveMoveframeId(sourceMoveframe);
    if (!sourceMoveframeId) {
      alert('Source moveframe is missing an ID. Refresh the page and try again.');
      return;
    }

    const targetWorkout = availableWorkouts.find(
      (w) => w.id === selectedWorkout || w.workoutSessionId === selectedWorkout
    );
    const targetWorkoutId =
      resolveWorkoutSessionId(targetWorkout) ||
      (selectedWorkout?.trim() ? selectedWorkout.trim() : undefined);

    if (!targetWorkoutId) {
      alert('Please select a target workout');
      return;
    }

    if (position !== 'after' && !targetMoveframe) {
      alert('Please select a target moveframe for this position option');
      return;
    }

    onConfirm({
      sourceMoveframeId,
      targetWorkoutId,
      position,
      targetMoveframeId: targetMoveframe?.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  // Check if we're dealing with multiple moveframes
  const isMultiple = Array.isArray(sourceMoveframe);
  const moveframes = isMultiple ? sourceMoveframe : [sourceMoveframe];
  const totalMovelaps = moveframes.reduce((sum, mf) => sum + (mf.movelaps?.length || 0), 0);

  // Get all days from the workout plan
  const allDays: any[] = [];
  workoutPlan?.weeks?.forEach((week: any) => {
    week.days?.forEach((day: any) => {
      allDays.push({
        id: day.id,
        date: day.date,
        weekNumber: week.weekNumber,
        dayOfWeek: day.dayOfWeek,
        hasWorkouts: day.workouts && day.workouts.length > 0
      });
    });
  });

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999999] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-purple-500">
          <div>
            <h2 className="text-2xl font-bold text-white">Copy Moveframe</h2>
            <p className="text-purple-100 text-sm mt-1">
              Select target workout and position
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-700 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Source Moveframe Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">
              Copying {isMultiple ? `${moveframes.length} Moveframes` : 'Moveframe'}:
            </h3>
            <div className="text-sm space-y-1">
              {isMultiple ? (
                <>
                  <p><strong>Letters:</strong> {moveframes.map((mf: any) => mf.letter).join(' - ')}</p>
                  <p><strong>Total sets:</strong> {totalMovelaps}</p>
                </>
              ) : (
                <>
                  <p><strong>Letter:</strong> {moveframes[0].letter}</p>
                  <p><strong>Sport:</strong> {moveframes[0].sport?.replace('_', ' ')}</p>
                  <p><strong>Description:</strong> {moveframes[0].description || 'No description'}</p>
                  <p><strong>Total sets:</strong> {moveframes[0].movelaps?.length || 0}</p>
                </>
              )}
            </div>
          </div>

          {/* Select Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Select Target Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- Choose a day --</option>
              {allDays.map((day) => (
                <option key={day.id} value={day.id}>
                  Week {day.weekNumber} - {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })} {!day.hasWorkouts && '(No workouts)'}
                </option>
              ))}
            </select>
          </div>

          {/* Select Workout */}
          {selectedDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select Target Workout
              </label>
              {availableWorkouts.length > 0 ? (
                <select
                  value={selectedWorkout}
                  onChange={(e) => setSelectedWorkout(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">-- Choose a workout --</option>
                  {availableWorkouts.map((workout) => {
                    const workoutId = resolveWorkoutSessionId(workout);
                    if (!workoutId) return null;
                    const displayNum =
                      getWorkoutDisplayNumber(availableWorkouts, workoutId) ?? 0;
                    return (
                    <option key={workoutId} value={workoutId}>
                      {formatWorkoutSelectLabel(workout, Math.max(0, displayNum - 1))}
                    </option>
                    );
                  })}
                </select>
              ) : (
                <p className="text-sm text-gray-500 italic">No workouts available for this day</p>
              )}
            </div>
          )}

          {/* Select Position */}
          {selectedWorkout && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                3. Choose Position
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="after"
                    checked={position === 'after'}
                    onChange={(e) => setPosition(e.target.value as any)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">Add at the end (after all moveframes)</span>
                </label>
                
                {availableMoveframes.length > 0 && (
                  <>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="before"
                        checked={position === 'before'}
                        onChange={(e) => setPosition(e.target.value as any)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm">Insert before specific moveframe</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="replace"
                        checked={position === 'replace'}
                        onChange={(e) => setPosition(e.target.value as any)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-red-600">Replace specific moveframe (will delete target)</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Select Target Moveframe (if needed) */}
          {selectedWorkout && position !== 'after' && availableMoveframes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4. Select Target Moveframe
              </label>
              <select
                value={targetMoveframe}
                onChange={(e) => setTargetMoveframe(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">-- Choose moveframe --</option>
                {availableMoveframes.map((mf) => (
                  <option key={mf.id} value={mf.id}>
                    {mf.letter} - {mf.sport?.replace('_', ' ')} - {mf.description?.substring(0, 50) || 'No description'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedWorkout}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Copy Moveframe
          </button>
        </div>
      </div>
    </div>
  );
}

