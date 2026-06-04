'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MoveNutritionFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNutritionFood: any | any[]; // Can be single or array
  sourceWorkout: any;
  nutritionPlan: any;
  onConfirm: (targetWorkoutId: string, position: 'before' | 'after' | 'replace', targetNutritionFoodId?: string) => void;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function MoveNutritionFoodModal({
  isOpen,
  onClose,
  sourceNutritionFood,
  sourceWorkout,
  nutritionPlan,
  onConfirm,
  activeSection = 'A'
}: MoveNutritionFoodModalProps) {
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedWorkout, setSelectedWorkout] = useState<string>('');
  const [position, setPosition] = useState<'before' | 'after' | 'replace'>('after');
  const [targetNutritionFood, setTargetNutritionFood] = useState<string>('');
  const [availableWorkouts, setAvailableWorkouts] = useState<any[]>([]);
  const [availableNutritionFoods, setAvailableNutritionFoods] = useState<any[]>([]);

  useEffect(() => {
    if (selectedDay && nutritionPlan) {
      // Find all workouts for the selected day
      const meals: any[] = [];
      nutritionPlan.weeks?.forEach((week: any) => {
        week.days?.forEach((day: any) => {
          if (day.id === selectedDay) {
            day.meals?.forEach((workout: any) => {
              meals.push(workout);
            });
          }
        });
      });
      setAvailableWorkouts(meals);
      setSelectedWorkout('');
      setTargetNutritionFood('');
    }
  }, [selectedDay, nutritionPlan]);

  useEffect(() => {
    if (selectedWorkout) {
      const workout = availableWorkouts.find(w => w.id === selectedWorkout);
      // Filter out the source nutritionFood(s) from available targets
      const sourceNutritionFoods = Array.isArray(sourceNutritionFood) ? sourceNutritionFood : [sourceNutritionFood];
      const sourceIds = sourceNutritionFoods.map((mf: any) => mf.id);
      const nutritionFoods = (workout?.nutritionFoods || []).filter((mf: any) => !sourceIds.includes(mf.id));
      setAvailableNutritionFoods(nutritionFoods);
      setTargetNutritionFood('');
    }
  }, [selectedWorkout, availableWorkouts, sourceNutritionFood]);

  const handleSubmit = () => {
    if (!selectedWorkout) {
      alert('Please select a target workout');
      return;
    }

    if (position !== 'after' && !targetNutritionFood) {
      alert('Please select a target nutritionFood for this position option');
      return;
    }

    // Confirm move operation
    if (confirm(`Are you sure you want to MOVE this nutritionFood? It will be removed from the current workout.`)) {
      onConfirm(selectedWorkout, position, targetNutritionFood || undefined);
    }
  };

  if (!isOpen) return null;

  // Check if we're dealing with multiple nutrition_foods
  const isMultiple = Array.isArray(sourceNutritionFood);
  const nutritionFoods = isMultiple ? sourceNutritionFood : [sourceNutritionFood];
  const totalNutritionComponents = nutritionFoods.reduce((sum, mf) => sum + (mf.nutritionComponents?.length || 0), 0);

  // Get all days from the workout plan
  const allDays: any[] = [];
  nutritionPlan?.weeks?.forEach((week: any) => {
    week.days?.forEach((day: any) => {
      allDays.push({
        id: day.id,
        date: day.date,
        weekNumber: week.weekNumber,
        dayOfWeek: day.dayOfWeek,
        hasWorkouts: day.meals && day.meals.length > 0
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
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-600 to-orange-500">
          <div>
            <h2 className="text-2xl font-bold text-white">Move NutritionFood</h2>
            <p className="text-orange-100 text-sm mt-1">
              ⚠️ Will remove from current workout
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-orange-700 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Source Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">
              Moving {isMultiple ? `${nutritionFoods.length} NutritionFoods` : 'NutritionFood'}:
            </h3>
            <div className="text-sm space-y-1">
              {isMultiple ? (
                <>
                  <p><strong>Letters:</strong> {nutritionFoods.map((mf: any) => mf.letter).join(' - ')}</p>
                  <p><strong>Total sets:</strong> {totalNutritionComponents}</p>
                  <p className="text-orange-700 mt-2"><strong>From:</strong> NutritionMeal #{sourceWorkout.sessionNumber}</p>
                </>
              ) : (
                <>
                  <p><strong>Letter:</strong> {nutritionFoods[0].letter}</p>
                  <p><strong>Sport:</strong> {nutritionFoods[0].sport?.replace('_', ' ')}</p>
                  <p><strong>Description:</strong> {nutritionFoods[0].description || 'No description'}</p>
                  <p><strong>Total sets:</strong> {nutritionFoods[0].nutritionComponents?.length || 0}</p>
                  <p className="text-orange-700 mt-2"><strong>From:</strong> NutritionMeal #{sourceWorkout.sessionNumber}</p>
                </>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Warning:</strong> Moving will remove this nutritionFood from its current workout. 
              If you want to keep it in both places, use "Copy" instead.
            </p>
          </div>

          {/* Select Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Select Target Day
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

          {/* Select NutritionMeal */}
          {selectedDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Select Target Workout
              </label>
              {availableWorkouts.length > 0 ? (
                <select
                  value={selectedWorkout}
                  onChange={(e) => setSelectedWorkout(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">-- Choose a workout --</option>
                  {availableWorkouts.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      NutritionMeal #{workout.sessionNumber}: {workout.name || 'Unnamed'} 
                      ({workout.nutritionFoods?.length || 0} nutritionFoods)
                      {workout.id === sourceWorkout.id && ' (Same workout - will reorder)'}
                    </option>
                  ))}
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
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm">Add at the end (after all nutritionFoods)</span>
                </label>
                
                {availableNutritionFoods.length > 0 && (
                  <>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="before"
                        checked={position === 'before'}
                        onChange={(e) => setPosition(e.target.value as any)}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span className="text-sm">Insert before specific nutritionFood</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        value="replace"
                        checked={position === 'replace'}
                        onChange={(e) => setPosition(e.target.value as any)}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span className="text-sm text-red-600">Replace specific nutritionFood (will delete target)</span>
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Select Target NutritionFood (if needed) */}
          {selectedWorkout && position !== 'after' && availableNutritionFoods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                4. Select Target NutritionFood
              </label>
              <select
                value={targetNutritionFood}
                onChange={(e) => setTargetNutritionFood(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">-- Choose nutritionFood --</option>
                {availableNutritionFoods.map((mf) => (
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
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move NutritionFood
          </button>
        </div>
      </div>
    </div>
  );
}

