'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Upload, Hash, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { fetchPlanWeeks, getWeekWorkoutCount, isWeekEmpty } from '@/lib/workoutPlanLoad';

export type ExportStructureToYearlyPayload = {
  targetWeekIds: string[];
  overwrite: boolean;
};

interface ExportStructureToYearlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePlanKey: string;
  sourcePlanName: string;
  sourceAssignmentCount: number;
  onConfirm: (payload: ExportStructureToYearlyPayload) => Promise<void>;
}

export default function ExportStructureToYearlyModal({
  isOpen,
  onClose,
  sourcePlanKey,
  sourcePlanName,
  sourceAssignmentCount,
  onConfirm,
}: ExportStructureToYearlyModalProps) {
  const [yearlyWeeks, setYearlyWeeks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copyMode, setCopyMode] = useState<'select' | 'consecutive'>('select');
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [consecutiveCount, setConsecutiveCount] = useState(1);
  const [startWeekId, setStartWeekId] = useState('');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCopyMode('select');
    setSelectedWeekIds(new Set());
    setConsecutiveCount(1);
    setStartWeekId('');
    setConfirmOverwrite(false);
    void loadYearlyWeeks();
  }, [isOpen, sourcePlanKey]);

  const loadYearlyWeeks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setYearlyWeeks([]);
        return;
      }
      setYearlyWeeks(await fetchPlanWeeks(token, 'YEARLY_PLAN'));
    } catch {
      setYearlyWeeks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const consecutiveTargets = useMemo(() => {
    if (!startWeekId) return [];
    const idx = yearlyWeeks.findIndex((w) => w.id === startWeekId);
    if (idx === -1) return [];
    return yearlyWeeks.slice(idx, idx + Math.max(1, consecutiveCount));
  }, [yearlyWeeks, startWeekId, consecutiveCount]);

  const effectiveTargetIds =
    copyMode === 'select' ? Array.from(selectedWeekIds) : consecutiveTargets.map((w) => w.id);

  const anyTargetHasContent = useMemo(() => {
    const ids = new Set(effectiveTargetIds);
    return yearlyWeeks.some((w) => ids.has(w.id) && !isWeekEmpty(w));
  }, [yearlyWeeks, effectiveTargetIds]);

  const toggleWeek = (weekId: string) => {
    setSelectedWeekIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
    setConfirmOverwrite(false);
  };

  const handleExport = async () => {
    if (!effectiveTargetIds.length) return;
    if (anyTargetHasContent && !confirmOverwrite) return;
    setIsExporting(true);
    try {
      await onConfirm({ targetWeekIds: effectiveTargetIds, overwrite: anyTargetHasContent });
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Upload className="w-6 h-6" />
              <h2 className="text-xl font-bold">Export Week to Yearly Plan</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isExporting}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800">
                <strong>Source:</strong> Weekly Structure Plan {sourcePlanKey}
                {sourcePlanName ? ` — ${sourcePlanName}` : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {sourceAssignmentCount} assignment{sourceAssignmentCount === 1 ? '' : 's'} will be exported to the yearly plan.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCopyMode('select');
                  setConfirmOverwrite(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                  copyMode === 'select'
                    ? 'bg-teal-100 border-teal-400 text-teal-900'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Select weeks
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopyMode('consecutive');
                  setConfirmOverwrite(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                  copyMode === 'consecutive'
                    ? 'bg-teal-100 border-teal-400 text-teal-900'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <Hash className="w-4 h-4" />
                Copy next N weeks
              </button>
            </div>

            {copyMode === 'consecutive' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  <strong>Copy Next N Weeks</strong> is active. Choose a starting week and how many consecutive weeks to fill with this structure.
                </p>
              </div>
            )}

            {isLoading ? (
              <p className="text-center py-6 text-gray-500">Loading yearly weeks…</p>
            ) : yearlyWeeks.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
                No yearly plan weeks found. Set up your yearly plan first.
              </div>
            ) : copyMode === 'select' ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {yearlyWeeks.map((week) => {
                  const count = getWeekWorkoutCount(week);
                  const isSelected = selectedWeekIds.has(week.id);
                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => toggleWeek(week.id)}
                      className={`w-full p-3 border-2 rounded-lg text-left flex items-center gap-3 ${
                        isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-300'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-teal-600 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-semibold">Week {week.weekNumber}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            count === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {count === 0 ? 'Empty' : `${count} workout${count === 1 ? '' : 's'}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Starting week</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={startWeekId}
                    onChange={(e) => {
                      setStartWeekId(e.target.value);
                      setConfirmOverwrite(false);
                    }}
                  >
                    <option value="">Select starting week…</option>
                    {yearlyWeeks.map((week) => (
                      <option key={week.id} value={week.id}>
                        Week {week.weekNumber} ({getWeekWorkoutCount(week)} workouts)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Number of consecutive weeks (N)</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={consecutiveCount}
                    onChange={(e) => {
                      setConsecutiveCount(Math.max(1, parseInt(e.target.value, 10) || 1));
                      setConfirmOverwrite(false);
                    }}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                {consecutiveTargets.length > 0 && (
                  <p className="text-xs text-gray-600">
                    Will export to weeks:{' '}
                    {consecutiveTargets.map((w) => w.weekNumber).join(', ')}
                  </p>
                )}
              </div>
            )}

            {effectiveTargetIds.length > 0 && anyTargetHasContent && (
              <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-amber-900">
                  One or more target weeks already have workouts. Replace existing content in those weeks.
                </span>
              </label>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={
                isExporting ||
                effectiveTargetIds.length === 0 ||
                (anyTargetHasContent && !confirmOverwrite)
              }
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isExporting ? 'Exporting…' : `Export to ${effectiveTargetIds.length || 0} week(s)`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
