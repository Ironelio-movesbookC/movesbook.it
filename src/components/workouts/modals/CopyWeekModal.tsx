import React, { useState } from 'react';
import { X, CheckSquare, Square, Hash } from 'lucide-react';

interface CopyWeekModalProps {
  isOpen: boolean;
  sourceWeek: any;
  allWeeks: any[];
  onClose: () => void;
  onCopy: (targetWeekId: string) => Promise<void>;
}

export default function CopyWeekModal({ 
  isOpen, 
  sourceWeek, 
  allWeeks, 
  onClose, 
  onCopy 
}: CopyWeekModalProps) {
  const [copyMode, setCopyMode] = useState<'select' | 'consecutive'>('select');
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [consecutiveCount, setConsecutiveCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !sourceWeek) return null;

  // Find the source week index
  const sourceWeekIndex = allWeeks.findIndex(w => w.id === sourceWeek.id);
  
  // Get consecutive weeks starting from the source week
  const getConsecutiveWeeks = (count: number) => {
    if (sourceWeekIndex === -1) return [];
    const startIndex = sourceWeekIndex + 1; // Start from next week
    return allWeeks.slice(startIndex, startIndex + count);
  };

  const toggleWeekSelection = (weekId: string) => {
    const newSelection = new Set(selectedWeekIds);
    if (newSelection.has(weekId)) {
      newSelection.delete(weekId);
    } else {
      newSelection.add(weekId);
    }
    setSelectedWeekIds(newSelection);
  };

  const selectAll = () => {
    const newSelection = new Set(
      allWeeks
        .filter(w => w.id !== sourceWeek.id)
        .map(w => w.id)
    );
    setSelectedWeekIds(newSelection);
  };

  const deselectAll = () => {
    setSelectedWeekIds(new Set());
  };

  const handleCopy = async () => {
    let targetWeekIds: string[] = [];

    if (copyMode === 'select') {
      if (selectedWeekIds.size === 0) {
        console.error('âŒ Please select at least one target week');
        return;
      }
      targetWeekIds = Array.from(selectedWeekIds);
    } else {
      // consecutive mode
      if (consecutiveCount < 1) {
        console.error('âŒ Please enter a valid number of weeks');
        return;
      }
      const consecutiveWeeks = getConsecutiveWeeks(consecutiveCount);
      if (consecutiveWeeks.length === 0) {
        console.error('âŒ No weeks available to copy to');
        return;
      }
      targetWeekIds = consecutiveWeeks.map(w => w.id);
    }

    try {
      setIsLoading(true);
      
      // Copy to each target week sequentially
      for (let i = 0; i < targetWeekIds.length; i++) {
        const targetWeekId = targetWeekIds[i];
        console.log(`ðŸ“‹ Copying to week ${i + 1}/${targetWeekIds.length}: ${targetWeekId}`);
        await onCopy(targetWeekId);
      }

      console.log(`âœ… Successfully copied to ${targetWeekIds.length} week(s)`);
      onClose();
      setSelectedWeekIds(new Set());
      setConsecutiveCount(1);
    } catch (error) {
      console.error('Error copying week:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = copyMode === 'select' 
    ? selectedWeekIds.size 
    : getConsecutiveWeeks(consecutiveCount).length;

  const maxConsecutiveWeeks = allWeeks.length - sourceWeekIndex - 1;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">Copy Week {sourceWeek.weekNumber}</h2>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Source:</span> Week {sourceWeek.weekNumber}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              This will copy all workouts, moveframes, and movelaps from Week {sourceWeek.weekNumber} to the selected target week(s).
            </p>
          </div>

          {/* Copy Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Copy Mode
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setCopyMode('select')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  copyMode === 'select'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <CheckSquare className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-semibold">Select Specific Weeks</div>
                <div className="text-xs text-gray-500 mt-1">Choose individual weeks</div>
              </button>
              <button
                onClick={() => setCopyMode('consecutive')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  copyMode === 'consecutive'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Hash className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-semibold">Next N Weeks</div>
                <div className="text-xs text-gray-500 mt-1">Copy to consecutive weeks</div>
              </button>
            </div>
          </div>

          {/* Select Specific Weeks Mode */}
          {copyMode === 'select' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Target Weeks ({selectedWeekIds.size} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                {allWeeks.map((week, idx) => {
                  const isSourceWeek = week.id === sourceWeek.id;
                  const isSelected = selectedWeekIds.has(week.id);
                  
                  return (
                    <label
                      key={week.id}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 transition-colors ${
                        isSourceWeek 
                          ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                          : isSelected
                          ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                          : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isSourceWeek && toggleWeekSelection(week.id)}
                        disabled={isSourceWeek}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Week {week.weekNumber}</span>
                          {isSourceWeek && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                              Source
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {week.days?.[0] ? new Date(week.days[0].date).toLocaleDateString() : 'N/A'}
                          {week.period && ` â€¢ ${week.period.name}`}
                        </div>
                      </div>
                      {isSelected && !isSourceWeek && (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      )}
                      {!isSelected && !isSourceWeek && (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consecutive Weeks Mode */}
          {copyMode === 'consecutive' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Number of Consecutive Weeks
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max={maxConsecutiveWeeks}
                  value={consecutiveCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setConsecutiveCount(Math.min(Math.max(1, val), maxConsecutiveWeeks));
                  }}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Copy to the next <span className="font-semibold text-blue-600">{consecutiveCount}</span> week(s) after Week {sourceWeek.weekNumber}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {maxConsecutiveWeeks} week(s) available
                  </p>
                </div>
              </div>

              {/* Preview of consecutive weeks */}
              {consecutiveCount > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Preview of target weeks:</p>
                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                    {getConsecutiveWeeks(consecutiveCount).map((week, idx) => (
                      <div
                        key={week.id}
                        className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 last:border-b-0 bg-blue-50"
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900 text-sm">Week {week.weekNumber}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {week.days?.[0] ? new Date(week.days[0].date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-800">
              <strong>âš ï¸ Note:</strong> This will copy all workouts, moveframes, and movelaps from the source week to {selectedCount} target week(s). Day-specific info (date, notes) will remain unchanged in the target weeks.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {selectedCount > 0 ? (
              <span>
                Will copy to <span className="font-semibold text-blue-600">{selectedCount}</span> week(s)
              </span>
            ) : (
              <span className="text-gray-400">No weeks selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || selectedCount === 0}
            >
              {isLoading ? `Copying... (${selectedCount})` : `Copy to ${selectedCount} Week(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}