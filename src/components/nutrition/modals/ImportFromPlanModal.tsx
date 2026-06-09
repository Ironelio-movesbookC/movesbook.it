'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Calendar, CheckSquare } from 'lucide-react';

interface NutritionMeal {
  id: string;
  name: string;
  code: string;
  date: Date;
  sports: string[];
}

interface ImportFromPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (workoutIds: string[], targetDate?: string) => void;
}

export default function ImportFromPlanModal({
  isOpen,
  onClose,
  onConfirm
}: ImportFromPlanModalProps) {
  const [workouts, setWorkouts] = useState<NutritionMeal[]>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [filterDate, setFilterDate] = useState<string>('');
  const [keepOriginalDate, setKeepOriginalDate] = useState(true);
  const [targetDate, setTargetDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadWorkouts();
    }
  }, [isOpen]);

  const loadWorkouts = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/nutrition/plan?section=B&planType=YEARLY_PLAN', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const workoutsList: NutritionMeal[] = [];

        data.weeks?.forEach((week: any) => {
          week.days?.forEach((day: any) => {
            day.meals?.forEach((workout: any) => {
              workoutsList.push({
                id: workout.id,
                name: workout.name,
                code: workout.code,
                date: new Date(day.date),
                sports: workout.sports?.map((s: any) => s.sport) || []
              });
            });
          });
        });

        setWorkouts(workoutsList);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWorkout = (nutritionMealId: string) => {
    const newSelected = new Set(selectedWorkouts);
    if (newSelected.has(nutritionMealId)) {
      newSelected.delete(nutritionMealId);
    } else {
      newSelected.add(nutritionMealId);
    }
    setSelectedWorkouts(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = filteredWorkouts();
    if (selectedWorkouts.size === filtered.length) {
      setSelectedWorkouts(new Set());
    } else {
      setSelectedWorkouts(new Set(filtered.map(w => w.id)));
    }
  };

  const filteredWorkouts = () => {
    if (!filterDate) return workouts;
    return workouts.filter(w => 
      w.date.toISOString().split('T')[0] === filterDate
    );
  };

  const handleConfirm = async () => {
    if (selectedWorkouts.size === 0) {
      alert('Please select at least one workout to import');
      return;
    }

    setIsImporting(true);
    try {
      await onConfirm(
        Array.from(selectedWorkouts),
        keepOriginalDate ? undefined : targetDate
      );
      onClose();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import workouts');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const filtered = filteredWorkouts();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6" />
              <h2 className="text-xl font-bold">Import from Yearly Plan</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              disabled={isImporting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                💡 Select workouts from your Yearly Plan to import into Workouts Done section
              </p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Date
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilterDate('')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            </div>

            {/* Date Options */}
            <div className="border border-gray-300 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={keepOriginalDate}
                  onChange={() => setKeepOriginalDate(true)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Keep original dates</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!keepOriginalDate}
                  onChange={() => setKeepOriginalDate(false)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Move to specific date:</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  disabled={keepOriginalDate}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                />
              </label>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-medium text-gray-700">
                {filtered.length} workout(s) available
              </span>
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-sm font-medium transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                {selectedWorkouts.size === filtered.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* NutritionMeal List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading workouts...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No workouts found {filterDate && 'for this date'}
                </div>
              ) : (
                filtered.map((workout) => (
                  <label
                    key={workout.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedWorkouts.has(workout.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkouts.has(workout.id)}
                      onChange={() => handleToggleWorkout(workout.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{workout.name}</span>
                        <span className="text-xs text-gray-500">({workout.code})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {workout.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        {workout.sports.length > 0 && (
                          <span className="text-xs text-indigo-600">
                            {workout.sports.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            {selectedWorkouts.size > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ {selectedWorkouts.size} workout(s) selected for import
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedWorkouts.size === 0 || isImporting || (!keepOriginalDate && !targetDate)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedWorkouts.size === 0 || isImporting || (!keepOriginalDate && !targetDate)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isImporting ? 'Importing...' : `Import ${selectedWorkouts.size} Workout(s)`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

