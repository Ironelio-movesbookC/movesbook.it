'use client';

import { X } from 'lucide-react';

interface WorkoutActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'copy' | 'move' | 'switch') => void;
  sourceWorkout: any;
  targetDay: any;
  existingWorkout?: any;
}

export function WorkoutActionModal({
  isOpen,
  onClose,
  onAction,
  sourceWorkout,
  targetDay,
  existingWorkout
}: WorkoutActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Workout Action</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">
            You are moving <span className="font-semibold">{sourceWorkout.name || 'Unnamed Workout'}</span>
          </p>
          <p className="text-sm text-gray-700">
            to <span className="font-semibold">{new Date(targetDay.date).toLocaleDateString()}</span>
          </p>
          
          {existingWorkout && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Warning: This day already has a workout "{existingWorkout.name || 'Unnamed'}"
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                If you Copy or Move, you must confirm to remove the existing workout.
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => onAction('copy')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
          >
            <div className="font-semibold">📋 Copy</div>
            <div className="text-sm opacity-90">Create a duplicate in the target day</div>
          </button>
          
          <button
            onClick={() => onAction('move')}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
          >
            <div className="font-semibold">➡️ Move</div>
            <div className="text-sm opacity-90">Move to target day (remove from source)</div>
          </button>
          
          {existingWorkout && (
            <button
              onClick={() => onAction('switch')}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
            >
              <div className="font-semibold">🔄 Switch</div>
              <div className="text-sm opacity-90">Swap positions with existing workout</div>
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface NutritionFoodPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPosition: (position: 'before' | 'after') => void;
  sourceNutritionFood: any;
  targetNutritionFood: any;
}

export function NutritionFoodPositionModal({
  isOpen,
  onClose,
  onPosition,
  sourceNutritionFood,
  targetNutritionFood
}: NutritionFoodPositionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Insert Position</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">
            Moving nutritionFood <span className="font-semibold">{sourceNutritionFood.letter} - {sourceNutritionFood.sport}</span>
          </p>
          <p className="text-sm text-gray-700">
            relative to <span className="font-semibold">{targetNutritionFood.letter} - {targetNutritionFood.sport}</span>
          </p>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              ℹ️ The target nutritionFood will NOT be replaced. It will remain in position.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => onPosition('before')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
          >
            <div className="font-semibold">⬆️ Insert Before</div>
            <div className="text-sm opacity-90">Place above the target nutritionFood</div>
          </button>
          
          <button
            onClick={() => onPosition('after')}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
          >
            <div className="font-semibold">⬇️ Insert After</div>
            <div className="text-sm opacity-90">Place below the target nutritionFood</div>
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: 'workout' | 'nutritionFood';
  itemName: string;
}

export function ConfirmRemovalModal({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName
}: ConfirmRemovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">⚠️ Confirm Removal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            The target location already has a {itemType}:
          </p>
          <p className="font-semibold text-gray-900 text-lg">"{itemName}"</p>
          
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800 font-medium">
              This {itemType} will be permanently removed and replaced.
            </p>
            <p className="text-xs text-red-700 mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Yes, Remove and Replace
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

