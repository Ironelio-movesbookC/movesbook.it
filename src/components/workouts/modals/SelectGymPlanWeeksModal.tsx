'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Square, Hash } from 'lucide-react';

export type GymPlanWeekOption = {
  id: string;
  weekNumber: number;
  periodName?: string;
  startDateLabel?: string;
};

type Props = {
  isOpen: boolean;
  weeks: GymPlanWeekOption[];
  onClose: () => void;
  onConfirm: (weekIds: string[]) => void;
};

/**
 * GGW — pick target week(s) for a newly built gym plan (no source-week copy UI).
 */
export default function SelectGymPlanWeeksModal({ isOpen, weeks, onClose, onConfirm }: Props) {
  const [copyMode, setCopyMode] = useState<'select' | 'consecutive'>('select');
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [consecutiveCount, setConsecutiveCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  const toggleWeekSelection = (weekId: string) => {
    const next = new Set(selectedWeekIds);
    if (next.has(weekId)) next.delete(weekId);
    else next.add(weekId);
    setSelectedWeekIds(next);
  };

  const selectAll = () => setSelectedWeekIds(new Set(sortedWeeks.map((w) => w.id)));
  const deselectAll = () => setSelectedWeekIds(new Set());

  const getConsecutiveWeeks = (count: number) => sortedWeeks.slice(0, count);

  const selectedCount =
    copyMode === 'select' ? selectedWeekIds.size : getConsecutiveWeeks(consecutiveCount).length;

  const handleConfirm = async () => {
    let ids: string[] = [];
    if (copyMode === 'select') {
      if (selectedWeekIds.size === 0) return;
      ids = Array.from(selectedWeekIds);
    } else {
      const slice = getConsecutiveWeeks(consecutiveCount);
      if (slice.length === 0) return;
      ids = slice.map((w) => w.id);
    }
    setIsLoading(true);
    try {
      onConfirm(ids);
      setSelectedWeekIds(new Set());
      setConsecutiveCount(1);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-gym-weeks-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <h2 id="select-gym-weeks-title" className="text-xl font-bold">
            Select the week(s) of your gym plan
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <p className="text-sm text-gray-600">
            Choose which calendar week(s) should receive this gym weekly plan. On the next screen you
            will drag each routine onto the day and workout slot you want.
          </p>

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">Selection mode</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCopyMode('select')}
                className={`flex-1 rounded-lg border-2 px-4 py-3 transition-all ${
                  copyMode === 'select'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <CheckSquare className="mx-auto mb-1 h-5 w-5" />
                <div className="text-sm font-semibold">Select specific weeks</div>
                <div className="mt-1 text-xs text-gray-500">Choose individual weeks</div>
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('consecutive')}
                className={`flex-1 rounded-lg border-2 px-4 py-3 transition-all ${
                  copyMode === 'consecutive'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Hash className="mx-auto mb-1 h-5 w-5" />
                <div className="text-sm font-semibold">First N weeks</div>
                <div className="mt-1 text-xs text-gray-500">From the start of the list</div>
              </button>
            </div>
          </div>

          {copyMode === 'select' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Target weeks ({selectedWeekIds.size} selected)
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={deselectAll} className="text-xs font-medium text-gray-600 hover:text-gray-700">
                    Deselect all
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-300">
                {sortedWeeks.map((week) => {
                  const isSelected = selectedWeekIds.has(week.id);
                  return (
                    <label
                      key={week.id}
                      className={`flex cursor-pointer items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0 ${
                        isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleWeekSelection(week.id)}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">Week {week.weekNumber}</span>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {week.startDateLabel ?? '—'}
                          {week.periodName ? ` • ${week.periodName}` : ''}
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {copyMode === 'consecutive' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Number of weeks from the start of the list
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, sortedWeeks.length)}
                value={consecutiveCount}
                onChange={(e) =>
                  setConsecutiveCount(
                    Math.min(sortedWeeks.length, Math.max(1, parseInt(e.target.value, 10) || 1))
                  )
                }
                className="w-32 rounded-lg border border-gray-300 px-3 py-2"
              />
              <p className="mt-2 text-xs text-gray-500">
                Will select:{' '}
                {getConsecutiveWeeks(consecutiveCount)
                  .map((w) => `Week ${w.weekNumber}`)
                  .join(', ') || '—'}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-600">
            {selectedCount === 0 ? 'No weeks selected' : `${selectedCount} week(s) selected`}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || isLoading}
              onClick={() => void handleConfirm()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Please wait…' : `Continue with ${selectedCount} week(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
