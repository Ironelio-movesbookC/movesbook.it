import React, { useState } from 'react';
import { X } from 'lucide-react';

interface MoveWeekModalProps {
  isOpen: boolean;
  sourceWeek: any;
  allWeeks: any[];
  onClose: () => void;
  onMove: (targetWeekId: string) => Promise<void>;
}

export default function MoveWeekModal({ 
  isOpen, 
  sourceWeek, 
  allWeeks, 
  onClose, 
  onMove 
}: MoveWeekModalProps) {
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !sourceWeek) return null;

  // Check if we're moving multiple weeks or a single week
  const isMultipleWeeks = sourceWeek.multipleWeeks && Array.isArray(sourceWeek.multipleWeeks);
  const weeksToMove = isMultipleWeeks ? sourceWeek.multipleWeeks : [sourceWeek];
  const sourceWeekIds = weeksToMove.map((w: any) => w.id);

  const handleMove = async () => {
    if (!selectedWeekId) {
      alert('Please select a target week');
      return;
    }

    if (sourceWeekIds.includes(selectedWeekId)) {
      alert('Cannot move to one of the source weeks');
      return;
    }

    try {
      setIsLoading(true);
      await onMove(selectedWeekId);
      onClose();
      setSelectedWeekId('');
    } catch (error) {
      console.error('Error moving week(s):', error);
      alert(`Failed to move week(s). Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Move Week</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Source:</span> {isMultipleWeeks 
              ? `Weeks ${weeksToMove.map((w: any) => w.weekNumber).join(', ')} (${weeksToMove.length} weeks)`
              : `Week ${sourceWeek.weekNumber}`
            }
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {isMultipleWeeks 
              ? `This will move all workouts, nutritionFoods, and nutrition_components from ${weeksToMove.length} week(s) to the selected target week.`
              : `This will move all workouts, nutritionFoods, and nutrition_components from Week ${sourceWeek.weekNumber} to the selected target week.`
            }
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Target Week
          </label>
          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">-- Select a week --</option>
            {allWeeks
              .filter((w) => !sourceWeekIds.includes(w.id))
              .map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber} - {week.days?.[0] ? new Date(week.days[0].date).toLocaleDateString() : 'N/A'}
                </option>
              ))}
          </select>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-xs text-red-800">
            <strong>⚠️ Warning:</strong> This will:
          </p>
          <ul className="text-xs text-red-800 mt-2 ml-4 list-disc space-y-1">
            <li>Move all workouts from Week {sourceWeek.weekNumber} to the target week</li>
            <li>Replace all existing workouts in the target week</li>
            <li>Leave Week {sourceWeek.weekNumber} empty</li>
          </ul>
        </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !selectedWeekId}
          >
            {isLoading ? 'Moving...' : 'Move Week'}
          </button>
        </div>
      </div>
    </div>
  );
}

