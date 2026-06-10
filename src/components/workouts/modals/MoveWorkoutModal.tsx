'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, MoveHorizontal } from 'lucide-react';
import type { WorkoutMoveStrategy } from '@/lib/workoutMoveOperations';

export type MoveWorkoutConfirmPayload = {
  targetDayId: string;
  sessionNumber: number;
  strategy: WorkoutMoveStrategy;
  targetWorkoutId?: string;
};

type ConflictMode = 'add' | 'substitute';
type SubstituteMode = 'transfer' | 'exchange';

interface MoveWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWorkout: any;
  workoutPlan: any;
  onConfirm: (payload: MoveWorkoutConfirmPayload) => void;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function MoveWorkoutModal({
  isOpen,
  onClose,
  sourceWorkout,
  workoutPlan,
  onConfirm,
  activeSection = 'A',
}: MoveWorkoutModalProps) {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTargetWorkoutId, setSelectedTargetWorkoutId] = useState('');
  const [conflictMode, setConflictMode] = useState<ConflictMode>('add');
  const [substituteMode, setSubstituteMode] = useState<SubstituteMode>('transfer');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWeek('');
    setSelectedDay('');
    setSelectedTargetWorkoutId('');
    setConflictMode('add');
    setSubstituteMode('transfer');
  }, [isOpen, sourceWorkout?.id]);

  const selectedWeekData = workoutPlan?.weeks?.find((w: any) => w.id === selectedWeek);
  const availableDays = selectedWeekData?.days || [];

  const targetDay = useMemo(() => {
    if (!selectedDay) return null;
    return workoutPlan?.weeks
      ?.flatMap((w: any) => w.days || [])
      ?.find((d: any) => d.id === selectedDay);
  }, [selectedDay, workoutPlan]);

  const targetDayWorkouts = useMemo(() => {
    const list = [...(targetDay?.workouts || [])].sort(
      (a: any, b: any) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)
    );
    return list;
  }, [targetDay]);

  const otherWorkoutsOnTarget = useMemo(
    () => targetDayWorkouts.filter((w: any) => w.id !== sourceWorkout?.id),
    [targetDayWorkouts, sourceWorkout?.id]
  );

  const showConflictStep = Boolean(selectedDay && otherWorkoutsOnTarget.length > 0);

  const canAddToExisting = otherWorkoutsOnTarget.length < 3;

  useEffect(() => {
    if (!showConflictStep) {
      setSelectedTargetWorkoutId('');
      return;
    }
    const first = otherWorkoutsOnTarget[0];
    if (first?.id) {
      setSelectedTargetWorkoutId(first.id);
    }
    setConflictMode(canAddToExisting ? 'add' : 'substitute');
  }, [showConflictStep, selectedDay, canAddToExisting, otherWorkoutsOnTarget]);

  useEffect(() => {
    if (!canAddToExisting && conflictMode === 'add') {
      setConflictMode('substitute');
    }
  }, [canAddToExisting, conflictMode]);

  const handleMove = () => {
    if (!selectedDay || !targetDay) return;

    if (showConflictStep) {
      if (!selectedTargetWorkoutId) return;

      if (conflictMode === 'add') {
        const targetWorkout = targetDayWorkouts.find(
          (w: any) => w.id === selectedTargetWorkoutId
        );
        onConfirm({
          targetDayId: selectedDay,
          sessionNumber: targetWorkout?.sessionNumber ?? 1,
          strategy: 'merge',
          targetWorkoutId: selectedTargetWorkoutId,
        });
      } else {
        onConfirm({
          targetDayId: selectedDay,
          sessionNumber:
            targetDayWorkouts.find((w: any) => w.id === selectedTargetWorkoutId)
              ?.sessionNumber ?? 1,
          strategy:
            substituteMode === 'exchange'
              ? 'substitute_exchange'
              : 'substitute_transfer',
          targetWorkoutId: selectedTargetWorkoutId,
        });
      }
      onClose();
      return;
    }

    const slotsForNumbering = targetDayWorkouts.filter(
      (w: any) => w.id !== sourceWorkout?.id
    );
    const nextSession = slotsForNumbering.length
      ? Math.max(...slotsForNumbering.map((w: any) => w.sessionNumber ?? 0)) + 1
      : 1;
    onConfirm({
      targetDayId: selectedDay,
      sessionNumber: nextSession,
      strategy: 'relocate',
    });
    onClose();
  };

  const canSubmit =
    Boolean(selectedDay) &&
    (!showConflictStep || (selectedTargetWorkoutId && (conflictMode !== 'add' || canAddToExisting)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="bg-purple-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg shrink-0">
          <div className="flex items-center gap-2">
            <MoveHorizontal size={20} />
            <h2 className="text-lg font-bold">Move Workout</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <p className="text-sm text-gray-700">
              <strong>Moving:</strong>{' '}
              {sourceWorkout.name || `Workout #${sourceWorkout.sessionNumber}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {sourceWorkout.moveframes?.length || 0} moveframe(s) will be moved
            </p>
            <p className="text-xs text-purple-600 mt-2">
              This will remove the workout from its current day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Week:</label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                setSelectedDay('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Choose a week...</option>
              {workoutPlan?.weeks?.map((week: any) => {
                const dateDisplay =
                  activeSection === 'A'
                    ? ''
                    : week.startDate
                      ? ` (${new Date(week.startDate).toLocaleDateString()})`
                      : '';
                return (
                  <option key={week.id} value={week.id}>
                    Week {week.weekNumber}
                    {dateDisplay}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedWeek && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Day:</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Choose a day...</option>
                {availableDays.map((day: any) => (
                  <option key={day.id} value={day.id}>
                    {activeSection === 'A'
                      ? `Day ${availableDays.indexOf(day) + 1} (${day.workouts?.length || 0} workout(s))`
                      : `${new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })} (${day.workouts?.length || 0} workout(s))`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showConflictStep && (
            <div className="space-y-4 border-t border-purple-200 pt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-900">
                  This day already has other workouts
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Select an existing workout and choose how to apply the move.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select existing workout
                </label>
                <div className="space-y-2">
                  {otherWorkoutsOnTarget.map((w: any) => (
                    <label
                      key={w.id}
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTargetWorkoutId === w.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetWorkout"
                        value={w.id}
                        checked={selectedTargetWorkoutId === w.id}
                        onChange={() => setSelectedTargetWorkoutId(w.id)}
                        className="text-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        Workout #{w.sessionNumber}
                        {w.name ? ` — ${w.name}` : ''}
                        <span className="block text-xs text-gray-500 font-normal">
                          {w.moveframes?.length ?? 0} moveframe(s)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Choose action</p>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-2 p-3 border rounded-lg ${
                      canAddToExisting
                        ? conflictMode === 'add'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 cursor-pointer'
                        : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="radio"
                      name="conflictMode"
                      value="add"
                      checked={conflictMode === 'add'}
                      disabled={!canAddToExisting}
                      onChange={() => setConflictMode('add')}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <strong>A — Add to the workout selected</strong> (default)
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Moveframes are merged into the selected workout. The moved workout is
                        removed from its original day.
                      </span>
                      {!canAddToExisting && (
                        <span className="block text-xs text-red-600 mt-1 font-medium">
                          Not available: this day already has 3 workouts.
                        </span>
                      )}
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer ${
                      conflictMode === 'substitute'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="conflictMode"
                      value="substitute"
                      checked={conflictMode === 'substitute'}
                      onChange={() => setConflictMode('substitute')}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <strong>B — Substitute to the workout selected</strong>
                      <span className="block text-xs text-gray-600 mt-0.5">
                        Replace or swap with the selected workout on this day.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {conflictMode === 'substitute' && (
                <div className="pl-2 border-l-4 border-purple-300 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Do you want:</p>
                  <label
                    className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer ${
                      substituteMode === 'transfer'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="substituteMode"
                      value="transfer"
                      checked={substituteMode === 'transfer'}
                      onChange={() => setSubstituteMode('transfer')}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <strong>Transfer the workout selected</strong> (default)
                      <span className="block text-xs text-gray-600">
                        Your workout takes this slot; the selected workout is removed.
                      </span>
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer ${
                      substituteMode === 'exchange'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="substituteMode"
                      value="exchange"
                      checked={substituteMode === 'exchange'}
                      onChange={() => setSubstituteMode('exchange')}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <strong>Exchange the workout selected with the target workout</strong>
                      <span className="block text-xs text-gray-600">
                        Your workout and the selected workout swap days and slots.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Move Workout
          </button>
        </div>
      </div>
    </div>
  );
}
