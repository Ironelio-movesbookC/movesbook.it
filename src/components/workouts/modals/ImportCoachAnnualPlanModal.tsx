'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Download,
  CheckSquare,
  Square,
  Hash,
} from 'lucide-react';
import { isWeekEmpty } from '@/lib/workoutPlanLoad';
import type { ImportWeeklyPlansPayload } from './ImportWeeklyPlansModal';

interface ImportCoachAnnualPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  anchorWeek: { id: string; weekNumber: number };
  yearlyWeeks: any[];
  onConfirm: (payload: ImportWeeklyPlansPayload) => Promise<void>;
};

type CoachPlanInfo = {
  entryId: string | null;
  title: string;
  coach: { id: string; name: string; avatarUrl: string | null };
};

function CoachAvatar({ coach }: { coach: CoachPlanInfo['coach'] }) {
  if (coach.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coach.avatarUrl}
        alt=""
        className="w-10 h-10 rounded-full object-cover border-2 border-sky-200 shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-b from-sky-100 to-sky-200 border-2 border-sky-300 flex items-center justify-center shrink-0 overflow-hidden">
      <div className="text-center scale-75">
        <div className="w-8 h-8 mx-auto rounded-full bg-amber-700 relative">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-3 bg-red-500 rounded-t-full" />
        </div>
        <div className="w-6 h-3 mx-auto -mt-1 bg-blue-600 rounded-b-md" />
      </div>
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

export default function ImportCoachAnnualPlanModal({
  isOpen,
  onClose,
  onBack,
  anchorWeek,
  yearlyWeeks,
  onConfirm,
}: ImportCoachAnnualPlanModalProps) {
  const [copyMode, setCopyMode] = useState<'select' | 'consecutive'>('select');
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [consecutiveCount, setConsecutiveCount] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<CoachPlanInfo | null>(null);
  const [authorizedWeekNumbers, setAuthorizedWeekNumbers] = useState<number[]>([]);

  const allWeeks = useMemo(
    () => [...yearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [yearlyWeeks]
  );

  const maxWeekNumber = allWeeks.length
    ? Math.max(...allWeeks.map((w) => w.weekNumber))
    : 52;

  const loadCoachPlan = useCallback(async () => {
    setLoading(true);
    setLoadMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPlanInfo(null);
        setAuthorizedWeekNumbers([]);
        setLoadMessage('Please log in first.');
        return;
      }
      const params = new URLSearchParams({
        anchorWeekNumber: String(anchorWeek.weekNumber),
        maxWeekNumber: String(maxWeekNumber),
      });
      const res = await fetch(`/api/workouts/coach-annual-plan?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setPlanInfo(null);
        setAuthorizedWeekNumbers([]);
        setLoadMessage('Failed to load coach annual plan.');
        return;
      }
      const data = await res.json();
      setPlanInfo(data.plan ?? null);
      setAuthorizedWeekNumbers(Array.isArray(data.authorizedWeekNumbers) ? data.authorizedWeekNumbers : []);
      setLoadMessage(data.message ?? null);
    } catch {
      setPlanInfo(null);
      setAuthorizedWeekNumbers([]);
      setLoadMessage('Failed to load coach annual plan.');
    } finally {
      setLoading(false);
    }
  }, [anchorWeek.weekNumber, maxWeekNumber]);

  useEffect(() => {
    if (!isOpen) return;
    setCopyMode('select');
    setSelectedWeekIds(new Set());
    setConsecutiveCount(1);
    setConfirmOverwrite(false);
    void loadCoachPlan();
  }, [isOpen, anchorWeek.id, loadCoachPlan]);

  const isSourceWeek = (week: any) =>
    week.id === anchorWeek.id || week.weekNumber === anchorWeek.weekNumber;

  const isAuthorizedWeek = (week: any) =>
    authorizedWeekNumbers.includes(week.weekNumber);

  const canSelectWeek = (week: any) => !isSourceWeek(week) && isAuthorizedWeek(week);

  const authorizedWeeksAfterAnchor = useMemo(
    () =>
      allWeeks.filter(
        (w) =>
          w.weekNumber > anchorWeek.weekNumber &&
          authorizedWeekNumbers.includes(w.weekNumber)
      ),
    [allWeeks, anchorWeek.weekNumber, authorizedWeekNumbers]
  );

  const getConsecutiveWeeks = (count: number) =>
    authorizedWeeksAfterAnchor.slice(0, count);

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

  const maxConsecutiveWeeks = authorizedWeeksAfterAnchor.length;

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
    setSelectedWeekIds(new Set(allWeeks.filter(canSelectWeek).map((w) => w.id)));
    setConfirmOverwrite(false);
  };

  const deselectAll = () => {
    setSelectedWeekIds(new Set());
    setConfirmOverwrite(false);
  };

  const handleCopy = async () => {
    if (!planInfo?.entryId) return;

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
          type: 'coach_annual',
          entryId: planInfo.entryId,
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

  const coach = planInfo?.coach ?? { id: '', name: 'Coach', avatarUrl: null };
  const hasPlan = Boolean(planInfo?.entryId);

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
              <CoachAvatar coach={coach} />
              <span className="font-semibold text-gray-900">
                Import from <span className="text-blue-700">Your Coach&apos;s Annual Plan</span>
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              The import of annual plans can only be done if the coach has authorized this
              procedure and only for the authorized weeks. Unauthorized weeks will appear grayed
              out.
            </div>

            {loading ? (
              <p className="text-center py-8 text-gray-500 text-sm">Loading coach plan…</p>
            ) : !hasPlan ? (
              <p className="text-center py-8 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                {loadMessage ||
                  'Your coach has not shared an authorized annual plan yet. Ask your coach to share a plan and authorize import weeks.'}
              </p>
            ) : (
              <>
                {planInfo?.title && (
                  <p className="text-sm text-gray-600 text-center">
                    Plan: <span className="font-semibold text-gray-900">{planInfo.title}</span>
                    {coach.name ? (
                      <>
                        {' '}
                        · Coach: <span className="font-semibold">{coach.name}</span>
                      </>
                    ) : null}
                  </p>
                )}

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
                        const authorized = isAuthorizedWeek(week);
                        const selectable = canSelectWeek(week);
                        const isSelected = selectedWeekIds.has(week.id);
                        const disabled = sourceMatch || !authorized;

                        return (
                          <label
                            key={week.id}
                            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-200 last:border-b-0 ${
                              disabled
                                ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                : isSelected
                                  ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                  : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => selectable && toggleWeekSelection(week.id)}
                              disabled={disabled}
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
                                {!sourceMatch && !authorized && (
                                  <span className="px-2 py-0.5 bg-gray-300 text-gray-600 text-xs font-medium rounded">
                                    Not authorized
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 truncate">
                                {formatWeekMeta(week)}
                              </div>
                            </div>
                            {selectable &&
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
                        max={Math.max(1, maxConsecutiveWeeks)}
                        value={consecutiveCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setConsecutiveCount(
                            Math.min(Math.max(1, val), Math.max(1, maxConsecutiveWeeks))
                          );
                          setConfirmOverwrite(false);
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isImporting}
                      />
                      <p className="text-sm text-gray-700 flex-1">
                        Copy to the next{' '}
                        <span className="font-semibold text-blue-600">{consecutiveCount}</span>{' '}
                        authorized week(s) after Week {anchorWeek.weekNumber}.
                        {maxConsecutiveWeeks > 0 && (
                          <span className="block text-xs text-gray-500 mt-0.5">
                            Maximum: {maxConsecutiveWeeks} authorized week(s) available
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
                            <span className="font-semibold text-gray-900 text-sm">
                              Week {week.weekNumber}
                            </span>
                            <span className="text-xs text-gray-500">{formatWeekMeta(week)}</span>
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
                      with your coach&apos;s plan.
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
                  !hasPlan ||
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
