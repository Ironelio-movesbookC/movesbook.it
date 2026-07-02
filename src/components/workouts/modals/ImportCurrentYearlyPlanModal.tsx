'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Download,
  CheckSquare,
  Square,
  Hash,
} from 'lucide-react';
import { isWeekEmpty } from '@/lib/workoutPlanLoad';
import type { ImportWeeklyPlansPayload } from './ImportWeeklyPlansModal';

interface ImportCurrentYearlyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  anchorWeek: { id: string; weekNumber: number };
  yearlyWeeks: any[];
  onConfirm: (payload: ImportWeeklyPlansPayload) => Promise<void>;
}

function YearlySourceIcon() {
  return (
    <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden shrink-0 grid grid-rows-4">
      <div className="bg-blue-500" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid grid-cols-3 border-t border-blue-100">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className={`border-r border-blue-50 ${row === 1 && col === 1 ? 'bg-orange-300' : 'bg-orange-50'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatWeekMeta(week: any): string {
  const date = week?.days?.[0]?.date
    ? new Date(week.days[0].date).toLocaleDateString(undefined, {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    : 'N/A';
  const period = week?.period?.name || week?.periodName || 'No Period';
  return `${date} • ${period}`;
}

export default function ImportCurrentYearlyPlanModal({
  isOpen,
  onClose,
  onBack,
  anchorWeek,
  yearlyWeeks,
  onConfirm,
}: ImportCurrentYearlyPlanModalProps) {
  const [copyMode, setCopyMode] = useState<'select' | 'consecutive'>('select');
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [consecutiveCount, setConsecutiveCount] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const allWeeks = useMemo(
    () => [...yearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [yearlyWeeks]
  );

  const sourceWeek = useMemo(
    () =>
      allWeeks.find((w) => w.id === anchorWeek.id) ??
      allWeeks.find((w) => w.weekNumber === anchorWeek.weekNumber) ??
      null,
    [allWeeks, anchorWeek.id, anchorWeek.weekNumber]
  );

  const sourceWeekIndex = sourceWeek
    ? allWeeks.findIndex((w) => w.id === sourceWeek.id)
    : -1;

  const getConsecutiveWeeks = (count: number) => {
    if (sourceWeekIndex === -1) return [];
    return allWeeks.slice(sourceWeekIndex + 1, sourceWeekIndex + 1 + count);
  };

  useEffect(() => {
    if (!isOpen) return;
    setCopyMode('select');
    setSelectedWeekIds(new Set());
    setConsecutiveCount(1);
    setConfirmOverwrite(false);
  }, [isOpen, anchorWeek.id]);

  const isSourceWeek = (week: any) => week.id === sourceWeek?.id;

  const selectedCount =
    copyMode === 'select' ? selectedWeekIds.size : getConsecutiveWeeks(consecutiveCount).length;

  const targetWeekIdsForCheck =
    copyMode === 'select'
      ? Array.from(selectedWeekIds)
      : getConsecutiveWeeks(consecutiveCount).map((w) => w.id);

  const anyTargetHasContent = useMemo(() => {
    const idSet = new Set(targetWeekIdsForCheck);
    return allWeeks.some((w) => idSet.has(w.id) && !isWeekEmpty(w));
  }, [allWeeks, targetWeekIdsForCheck]);

  const maxConsecutiveWeeks = Math.max(0, allWeeks.length - sourceWeekIndex - 1);

  const toggleWeekSelection = (weekId: string) => {
    setSelectedWeekIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
    setConfirmOverwrite(false);
  };

  const selectAll = () => {
    setSelectedWeekIds(new Set(allWeeks.filter((w) => !isSourceWeek(w)).map((w) => w.id)));
    setConfirmOverwrite(false);
  };

  const deselectAll = () => {
    setSelectedWeekIds(new Set());
    setConfirmOverwrite(false);
  };

  const handleCopy = async () => {
    if (!sourceWeek) return;

    let targetWeekIds: string[] = [];
    if (copyMode === 'select') {
      if (selectedWeekIds.size === 0) return;
      targetWeekIds = allWeeks
        .filter((w) => selectedWeekIds.has(w.id))
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map((w) => w.id);
    } else {
      if (consecutiveCount < 1) return;
      targetWeekIds = getConsecutiveWeeks(consecutiveCount).map((w) => w.id);
      if (targetWeekIds.length === 0) return;
    }

    if (anyTargetHasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        anchorWeekNumber: anchorWeek.weekNumber,
        overwrite: anyTargetHasContent,
        source: {
          type: 'yearly_plan_copy',
          sourceWeekId: sourceWeek.id,
          targetWeekIds,
        },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a weekly plan</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full"
              disabled={isImporting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Import mode
            </button>

            <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-xl">
              <YearlySourceIcon />
              <span className="font-semibold text-gray-900">Import from Current Yearly Plan</span>
            </div>

            {!sourceWeek ? (
              <p className="text-center py-8 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                Source week not found in your yearly plan.
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Copy Mode</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
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
                      type="button"
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

                {copyMode === 'select' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Select Target Weeks ({selectedWeekIds.size} selected)
                      </label>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAll}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={deselectAll}
                          className="text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="border border-gray-300 rounded-lg max-h-80 overflow-y-auto">
                      {allWeeks.map((week) => {
                        const sourceMatch = isSourceWeek(week);
                        const isSelected = selectedWeekIds.has(week.id);
                        return (
                          <label
                            key={week.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 ${
                              sourceMatch
                                ? 'bg-gray-50 cursor-default'
                                : isSelected
                                  ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                  : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => !sourceMatch && toggleWeekSelection(week.id)}
                              disabled={sourceMatch}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  Week {week.weekNumber}
                                </span>
                                {sourceMatch && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                                    Source
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate">
                                {formatWeekMeta(week)}
                              </div>
                            </div>
                            {!sourceMatch &&
                              (isSelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600 shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 shrink-0" />
                              ))}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {copyMode === 'consecutive' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Number of Consecutive Weeks
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        min={1}
                        max={maxConsecutiveWeeks}
                        value={consecutiveCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setConsecutiveCount(
                            Math.min(Math.max(1, val), Math.max(1, maxConsecutiveWeeks))
                          );
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isImporting}
                      />
                      <p className="text-sm text-gray-700 flex-1">
                        Copy Week {sourceWeek.weekNumber} to the next{' '}
                        <span className="font-semibold text-blue-600">{consecutiveCount}</span>{' '}
                        week(s)
                        {maxConsecutiveWeeks > 0 && (
                          <span className="block text-xs text-gray-500 mt-0.5">
                            Maximum: {maxConsecutiveWeeks} week(s) available
                          </span>
                        )}
                      </p>
                    </div>

                    {consecutiveCount > 0 && getConsecutiveWeeks(consecutiveCount).length > 0 && (
                      <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                        {getConsecutiveWeeks(consecutiveCount).map((week, idx) => (
                          <div
                            key={week.id}
                            className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 last:border-b-0 bg-blue-50"
                          >
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 text-sm">
                                Week {week.weekNumber}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {formatWeekMeta(week)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedCount > 0 && anyTargetHasContent && (
                  <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmOverwrite}
                      onChange={(e) => setConfirmOverwrite(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-amber-900">
                      One or more target weeks already contain workouts. Confirm to replace them
                      with the source week plan.
                    </span>
                  </label>
                )}
              </>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-500">
              {selectedCount === 0 ? 'No weeks selected' : `${selectedCount} week(s) selected`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={
                  isImporting ||
                  !sourceWeek ||
                  selectedCount === 0 ||
                  (anyTargetHasContent && !confirmOverwrite)
                }
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Copying…' : `Copy to ${selectedCount} Week(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
