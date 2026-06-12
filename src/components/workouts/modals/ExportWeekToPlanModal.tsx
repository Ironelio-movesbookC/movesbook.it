'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Archive, CheckCircle2, Calendar } from 'lucide-react';
import { fetchPlanWeeks, getWeekWorkoutCount, isWeekEmpty } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';

export type ExportWeekDestination = 'ARCHIVE' | 'WORKOUTS_DONE' | 'YEARLY_PLAN';

interface ExportWeekToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: any;
  sourceLabel: string;
  destination: ExportWeekDestination;
  onConfirm: (targetWeekIds: string | string[]) => Promise<void>;
}

const DESTINATION_CONFIG: Record<
  ExportWeekDestination,
  {
    title: string;
    gradient: string;
    planType: string;
    emptyHint: string;
    allowCreateWeek: boolean;
    multiSelect: boolean;
    mergeWeeks: boolean;
  }
> = {
  ARCHIVE: {
    title: 'Export Week to Archive',
    gradient: 'from-gray-700 to-gray-900',
    planType: 'ARCHIVE',
    emptyHint: 'No archive weeks yet. Create one, then export.',
    allowCreateWeek: true,
    multiSelect: false,
    mergeWeeks: false,
  },
  WORKOUTS_DONE: {
    title: 'Export Week to Workouts Done',
    gradient: 'from-emerald-600 to-teal-700',
    planType: 'WORKOUTS_DONE',
    emptyHint: 'No Workouts Done weeks found. Create your yearly plan first.',
    allowCreateWeek: false,
    multiSelect: false,
    mergeWeeks: true,
  },
  YEARLY_PLAN: {
    title: 'Export Week to Yearly Plan (Update)',
    gradient: 'from-blue-600 to-indigo-700',
    planType: 'YEARLY_PLAN',
    emptyHint: 'No Yearly Plan weeks found. Set up your yearly plan first.',
    allowCreateWeek: false,
    multiSelect: true,
    mergeWeeks: true,
  },
};

export default function ExportWeekToPlanModal({
  isOpen,
  onClose,
  sourceWeek,
  sourceLabel,
  destination,
  onConfirm,
}: ExportWeekToPlanModalProps) {
  const config = DESTINATION_CONFIG[destination];
  const planType = config.planType;
  const mergeWeeks = config.mergeWeeks;
  const [targetWeeks, setTargetWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  /** Only match by id — week numbers overlap across plans (template W1 vs archive W1). */
  const isSourceWeek = (week: any) => week.id === sourceWeek.id;

  const loadTargetWeeks = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTargetWeeks([]);
        return;
      }
      const weeks = await fetchPlanWeeks(token, planType);
      setTargetWeeks(mergeWeeks ? mergeWeeksByWeekNumber(weeks) : weeks);
    } catch {
      setTargetWeeks([]);
    } finally {
      setIsLoading(false);
    }
  }, [planType, mergeWeeks]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWeekId('');
    setSelectedWeekIds(new Set());
    setConfirmOverwrite(false);
    void loadTargetWeeks();
  }, [isOpen, sourceWeek?.id, loadTargetWeeks]);

  const selectedWeek = useMemo(
    () => targetWeeks.find((w) => w.id === selectedWeekId),
    [targetWeeks, selectedWeekId]
  );

  const selectedWeeks = useMemo(
    () => targetWeeks.filter((w) => selectedWeekIds.has(w.id)),
    [targetWeeks, selectedWeekIds]
  );

  const targetHasContent = config.multiSelect
    ? selectedWeeks.some((w) => !isWeekEmpty(w))
    : selectedWeek
      ? !isWeekEmpty(selectedWeek)
      : false;

  const sourceCount = getWeekWorkoutCount(sourceWeek);

  const toggleWeekSelection = (weekId: string) => {
    setSelectedWeekIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
    setConfirmOverwrite(false);
  };

  const handleCreateWeek = async () => {
    if (!config.allowCreateWeek) return;
    setIsCreatingWeek(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch('/api/workouts/archive/weeks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create archive week');
      }
      const data = await response.json();
      const newWeek = data.week;
      setTargetWeeks((prev) => [...prev, newWeek].sort((a, b) => a.weekNumber - b.weekNumber));
      setSelectedWeekId(newWeek.id);
      setConfirmOverwrite(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create week');
    } finally {
      setIsCreatingWeek(false);
    }
  };

  const handleExport = async () => {
    const ids = config.multiSelect
      ? Array.from(selectedWeekIds)
      : selectedWeekId
        ? [selectedWeekId]
        : [];

    if (ids.length === 0) return;
    if (targetHasContent && !confirmOverwrite) return;

    setIsExporting(true);
    try {
      await onConfirm(config.multiSelect ? ids : ids[0]);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !sourceWeek) return null;

  const weekLabel =
    destination === 'ARCHIVE'
      ? 'Archive Week'
      : destination === 'WORKOUTS_DONE'
        ? 'Done Week'
        : 'Yearly Week';

  const DestinationIcon =
    destination === 'ARCHIVE' ? Archive : destination === 'YEARLY_PLAN' ? Calendar : CheckCircle2;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`bg-gradient-to-r ${config.gradient} text-white px-6 py-4 flex items-center justify-between shrink-0`}
          >
            <div className="flex items-center gap-3">
              <DestinationIcon className="w-6 h-6" />
              <h2 className="text-xl font-bold">{config.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isExporting}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800">
                <strong>Source:</strong> {sourceLabel}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {sourceCount} workout{sourceCount === 1 ? '' : 's'} will be exported
                {config.multiSelect ? ' to the selected target week(s).' : ' (one target week only).'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {config.multiSelect
                  ? `Select target week(s) (${selectedWeekIds.size} selected):`
                  : 'Select target week:'}
              </p>
              {config.allowCreateWeek && (
                <button
                  type="button"
                  onClick={() => void handleCreateWeek()}
                  disabled={isCreatingWeek}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  {isCreatingWeek ? 'Creating…' : '+ New archive week'}
                </button>
              )}
            </div>

            {isLoading ? (
              <p className="text-center py-6 text-gray-500">Loading weeks…</p>
            ) : targetWeeks.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                {config.emptyHint}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {targetWeeks.map((week, idx) => {
                  const weekNum = week.weekNumber ?? idx + 1;
                  const count = getWeekWorkoutCount(week);
                  const sourceMatch = isSourceWeek(week);
                  const isSelected = config.multiSelect
                    ? selectedWeekIds.has(week.id)
                    : selectedWeekId === week.id;

                  if (config.multiSelect) {
                    return (
                      <label
                        key={week.id}
                        className={`flex items-center gap-3 w-full p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          sourceMatch
                            ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                            : isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={sourceMatch}
                          onChange={() => !sourceMatch && toggleWeekSelection(week.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="font-semibold">
                            {weekLabel} {weekNum}
                            {sourceMatch && (
                              <span className="ml-2 text-xs font-normal text-gray-500">(source)</span>
                            )}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              count === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {count === 0 ? 'Empty' : `${count} workout${count === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </label>
                    );
                  }

                  return (
                    <button
                      key={week.id}
                      type="button"
                      disabled={sourceMatch}
                      onClick={() => {
                        setSelectedWeekId(week.id);
                        setConfirmOverwrite(false);
                      }}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        sourceMatch
                          ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {weekLabel} {weekNum}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            count === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {count === 0 ? 'Empty' : `${count} workout${count === 1 ? '' : 's'}`}
                        </span>
                      </div>
                      {sourceMatch && (
                        <p className="text-xs text-gray-500 mt-1">Source week — choose another</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {(config.multiSelect ? selectedWeekIds.size > 0 : selectedWeek) && targetHasContent && (
              <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-amber-900">
                  {config.multiSelect
                    ? 'One or more target weeks already have workouts. Replace them with this export.'
                    : 'The target week already has workouts. Replace them with this export.'}
                </span>
              </label>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={
                isExporting ||
                (config.multiSelect ? selectedWeekIds.size === 0 : !selectedWeekId) ||
                (targetHasContent && !confirmOverwrite)
              }
              className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting
                ? 'Exporting…'
                : config.multiSelect
                  ? `Export to ${selectedWeekIds.size} week(s)`
                  : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
