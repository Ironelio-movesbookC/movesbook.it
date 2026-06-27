'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, CheckSquare, Square, Hash, Info } from 'lucide-react';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import type { GymWeekPlanSourceSection } from '@/types/gymWeekAssignment';

export type GymPlanWeekOption = {
  id: string;
  weekNumber: number;
  periodName?: string;
  startDateLabel?: string;
  days?: { id: string; dayOfWeek?: number; date?: string; workouts?: unknown[] }[];
};

export type GymPlanWeekSelectResult = {
  weekIds: string[];
  weekMetas: { id: string; weekNumber: number }[];
  targetDayNumbers: number[];
  templateKey?: 'A' | 'B' | 'C';
  /** Full week records (with day dates) for assignment UI */
  weekOptions?: GymPlanWeekOption[];
};

type Props = {
  isOpen: boolean;
  sourceSection: GymWeekPlanSourceSection;
  initialTemplateKey?: 'A' | 'B' | 'C';
  /** Number of gym-plan routine days — used to pre-select calendar days */
  planDaysCount?: number;
  /** When set, week(s) are fixed — user only picks days of the week */
  lockedWeekMetas?: { id: string; weekNumber: number }[];
  onClose: () => void;
  onConfirm: (result: GymPlanWeekSelectResult) => void;
  /** Section B with no yearly plan yet */
  onNeedYearlyPlan?: () => void;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const FULL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function formatDayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function dayRecordForWeek(week: GymPlanWeekOption, dayNum: number) {
  const byDow = week.days?.find((d) => d.dayOfWeek === dayNum);
  if (byDow) return byDow;
  return week.days?.[dayNum - 1];
}

function dayDateLabel(week: GymPlanWeekOption, dayNum: number): string | undefined {
  const rec = dayRecordForWeek(week, dayNum);
  return rec?.date ? formatDayDate(rec.date) : undefined;
}

function weekToOption(w: {
  id: string;
  weekNumber: number;
  period?: { name?: string };
  days?: { date?: string; dayOfWeek?: number; workouts?: unknown[] }[];
}): GymPlanWeekOption {
  const firstDay = w.days?.[0];
  return {
    id: w.id,
    weekNumber: w.weekNumber,
    periodName: w.period?.name,
    startDateLabel: firstDay?.date
      ? new Date(firstDay.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : undefined,
    days: w.days?.map((d) => ({
      id: (d as { id?: string }).id ?? '',
      dayOfWeek: d.dayOfWeek,
      date: d.date,
      workouts: d.workouts,
    })),
  };
}

/**
 * Pick target week(s) and calendar days for a newly built gym plan.
 * Section A → Weekly Plans A/B/C; Section B → Yearly Plan weeks.
 */
export default function SelectGymPlanWeeksModal({
  isOpen,
  sourceSection,
  initialTemplateKey = 'A',
  planDaysCount = 3,
  lockedWeekMetas,
  onClose,
  onConfirm,
  onNeedYearlyPlan,
}: Props) {
  const daysOnlyMode = Boolean(lockedWeekMetas?.length);
  const [copyMode, setCopyMode] = useState<'select' | 'consecutive'>('select');
  const [templateKey, setTemplateKey] = useState<'A' | 'B' | 'C'>(initialTemplateKey);
  const [weeks, setWeeks] = useState<GymPlanWeekOption[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWeekIds, setSelectedWeekIds] = useState<Set<string>>(new Set());
  const [consecutiveCount, setConsecutiveCount] = useState(1);
  const [previewWeekId, setPreviewWeekId] = useState<string | null>(null);
  const [selectedDayNumbers, setSelectedDayNumbers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const defaultDays = useMemo(() => {
    const n = Math.min(7, Math.max(1, planDaysCount));
    return new Set(Array.from({ length: n }, (_, i) => i + 1));
  }, [planDaysCount]);

  const loadWeeks = useCallback(async () => {
    setLoadingWeeks(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadError('Please log in first.');
        setWeeks([]);
        return;
      }
      let raw: Awaited<ReturnType<typeof fetchPlanWeeks>> = [];
      if (sourceSection === 'A') {
        raw = await fetchPlanWeeks(token, 'TEMPLATE_WEEKS', templateKey);
      } else if (sourceSection === 'B') {
        raw = await fetchPlanWeeks(token, 'YEARLY_PLAN');
      }
      const opts = raw.map(weekToOption);
      setWeeks(opts);
      if (sourceSection === 'B' && opts.length === 0) {
        onNeedYearlyPlan?.();
      }
    } catch {
      setLoadError('Could not load weeks. Try again.');
      setWeeks([]);
    } finally {
      setLoadingWeeks(false);
    }
  }, [sourceSection, templateKey, onNeedYearlyPlan]);

  useEffect(() => {
    if (!isOpen) return;
    setTemplateKey(initialTemplateKey);
    setCopyMode('select');
    setSelectedWeekIds(new Set());
    setConsecutiveCount(1);
    setSelectedDayNumbers(new Set(defaultDays));
    setPreviewWeekId(null);
  }, [isOpen, initialTemplateKey, defaultDays]);

  useEffect(() => {
    if (!isOpen || sourceSection === 'D' || daysOnlyMode) return;
    void loadWeeks();
  }, [isOpen, sourceSection, templateKey, loadWeeks, daysOnlyMode]);

  useEffect(() => {
    if (!isOpen || !daysOnlyMode || !lockedWeekMetas?.length) return;
    const applyLocked = (loaded: GymPlanWeekOption[]) => {
      const enriched = lockedWeekMetas.map((meta) => {
        const full = loaded.find((w) => w.id === meta.id);
        return full ?? { id: meta.id, weekNumber: meta.weekNumber };
      });
      setWeeks(enriched);
      setSelectedWeekIds(new Set(lockedWeekMetas.map((w) => w.id)));
      setPreviewWeekId(lockedWeekMetas[0]?.id ?? null);
    };
    if (sourceSection === 'B') {
      void (async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            applyLocked([]);
            return;
          }
          const raw = await fetchPlanWeeks(token, 'YEARLY_PLAN');
          applyLocked(raw.map(weekToOption));
        } catch {
          applyLocked([]);
        }
      })();
    } else {
      applyLocked([]);
    }
  }, [isOpen, daysOnlyMode, lockedWeekMetas, sourceSection]);

  if (!isOpen || sourceSection === 'D') return null;

  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  const getConsecutiveWeeks = (count: number) => sortedWeeks.slice(0, count);

  const toggleWeekSelection = (weekId: string) => {
    const next = new Set(selectedWeekIds);
    if (next.has(weekId)) next.delete(weekId);
    else next.add(weekId);
    setSelectedWeekIds(next);
    if (next.size === 1) setPreviewWeekId(Array.from(next)[0]);
    else if (!next.has(previewWeekId ?? '')) setPreviewWeekId(next.size ? Array.from(next)[0] : null);
  };

  const selectAllWeeks = () => {
    const ids = new Set(sortedWeeks.map((w) => w.id));
    setSelectedWeekIds(ids);
    if (sortedWeeks[0]) setPreviewWeekId(sortedWeeks[0].id);
  };
  const deselectAllWeeks = () => {
    setSelectedWeekIds(new Set());
    setPreviewWeekId(null);
  };

  const selectedWeekCount =
    copyMode === 'select' ? selectedWeekIds.size : getConsecutiveWeeks(consecutiveCount).length;

  const selectedWeeksList =
    copyMode === 'select'
      ? sortedWeeks.filter((w) => selectedWeekIds.has(w.id))
      : getConsecutiveWeeks(consecutiveCount);

  const previewWeek = sortedWeeks.find((w) => w.id === (previewWeekId ?? sortedWeeks[0]?.id));
  const singleWeekSelected = selectedWeekCount === 1;
  const previewWeekForDates = singleWeekSelected ? selectedWeeksList[0] : previewWeek;
  const showDayDates =
    singleWeekSelected &&
    sourceSection === 'B' &&
    Boolean(previewWeekForDates && dayDateLabel(previewWeekForDates, 1));

  const toggleDay = (dayNum: number) => {
    setSelectedDayNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) next.delete(dayNum);
      else next.add(dayNum);
      return next;
    });
  };

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
    const dayNums = Array.from(selectedDayNumbers).sort((a, b) => a - b);
    if (dayNums.length === 0) return;
    if (dayNums.length < planDaysCount) {
      alert(`Select at least ${planDaysCount} day(s) of the week for your ${planDaysCount} routine(s).`);
      return;
    }

    setIsLoading(true);
    try {
      const metas = ids
        .map((id) => sortedWeeks.find((w) => w.id === id))
        .filter(Boolean)
        .map((w) => ({ id: w!.id, weekNumber: w!.weekNumber }));
      onConfirm({
        weekIds: ids,
        weekMetas: metas,
        targetDayNumbers: dayNums,
        templateKey: sourceSection === 'A' ? templateKey : undefined,
        weekOptions: ids
          .map((id) => sortedWeeks.find((w) => w.id === id))
          .filter(Boolean) as GymPlanWeekOption[],
      });
      setSelectedWeekIds(new Set());
      setConsecutiveCount(1);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const sectionTitle =
    sourceSection === 'A'
      ? `Weekly Plan ${templateKey}`
      : 'Yearly Plan';

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-gym-weeks-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <h2 id="select-gym-weeks-title" className="text-xl font-bold">
            {daysOnlyMode ? 'Select days for your gym plan' : 'Select week(s) and days for your gym plan'}
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

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            {daysOnlyMode ? (
              <>
                Saving to <strong>Week {lockedWeekMetas?.[0]?.weekNumber}</strong> in {sectionTitle}.
                Pick which days of the week will receive your routines, then drag each routine onto a
                day and workout slot.
              </>
            ) : (
              <>
                Choose where to save this gym weekly plan in <strong>{sectionTitle}</strong>.
                Select one or more weeks, then pick which days of the week will receive your routines.
                On the next screen you will drag each routine onto a day and workout slot.
              </>
            )}
          </p>

          {daysOnlyMode && lockedWeekMetas?.length ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Target week: <strong>Week {lockedWeekMetas.map((w) => w.weekNumber).join(', ')}</strong>
            </div>
          ) : null}

          {!daysOnlyMode && sourceSection === 'A' && (
            <div>
              <span className="mb-2 block text-sm font-semibold text-gray-700">Weekly Plans:</span>
              <div className="flex flex-wrap gap-2">
                {(['A', 'B', 'C'] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => {
                      setTemplateKey(plan);
                      setSelectedWeekIds(new Set());
                      setPreviewWeekId(null);
                    }}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                      templateKey === plan
                        ? 'border-purple-500 bg-purple-50 text-purple-800'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Plan {plan}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
          ) : null}

          {!daysOnlyMode && loadingWeeks ? (
            <p className="text-sm text-gray-500">Loading weeks…</p>
          ) : !daysOnlyMode && sortedWeeks.length === 0 && sourceSection === 'B' ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">No Yearly Plan weeks found</p>
              <p className="mt-1 text-xs">Create your Yearly Plan first (Set Start Date), then save the gym week again.</p>
              {onNeedYearlyPlan ? (
                <button
                  type="button"
                  onClick={onNeedYearlyPlan}
                  className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Create Yearly Plan
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {!daysOnlyMode && (
                <>
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
                      </button>
                    </div>
                  </div>

                  {copyMode === 'select' ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Target weeks ({selectedWeekIds.size} selected)
                        </label>
                        <div className="flex gap-2 text-xs">
                          <button type="button" onClick={selectAllWeeks} className="font-medium text-blue-600 hover:text-blue-700">
                            Select all
                          </button>
                          <span className="text-gray-300">|</span>
                          <button type="button" onClick={deselectAllWeeks} className="font-medium text-gray-600 hover:text-gray-700">
                            Deselect all
                          </button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-300">
                        {sortedWeeks.map((week) => {
                          const isSelected = selectedWeekIds.has(week.id);
                          return (
                            <label
                              key={week.id}
                              className={`flex cursor-pointer items-center gap-3 border-b border-gray-200 px-4 py-2.5 last:border-b-0 ${
                                isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleWeekSelection(week.id)}
                                className="h-4 w-4 rounded text-blue-600"
                              />
                              <div className="flex-1">
                                <span className="font-semibold text-gray-900">Week {week.weekNumber}</span>
                                <div className="text-xs text-gray-500">
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
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Number of weeks from the start</label>
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
                    </div>
                  )}
                </>
              )}

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Days of the week ({selectedDayNumbers.size} selected)
                  </label>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500"
                    title="Pick which weekdays can receive routines"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                    Need at least {planDaysCount} for your routines
                    {singleWeekSelected && showDayDates
                      ? ' · dates shown for the selected week'
                      : selectedWeekCount > 1
                        ? ' · same days apply to every selected week'
                        : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, idx) => {
                    const dayNum = idx + 1;
                    const on = selectedDayNumbers.has(dayNum);
                    const dateLabel =
                      showDayDates && previewWeekForDates
                        ? dayDateLabel(previewWeekForDates, dayNum)
                        : undefined;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => toggleDay(dayNum)}
                        className={`min-w-[4.5rem] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                          on
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {showDayDates ? FULL_DAY_NAMES[idx] : label}
                        <span className="block text-[10px] font-normal text-gray-500">
                          {showDayDates && dateLabel
                            ? dateLabel
                            : `Day ${dayNum}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedWeekCount > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-300">
                  <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                    {singleWeekSelected && previewWeekForDates
                      ? `Week ${previewWeekForDates.weekNumber} — ${sectionTitle}`
                      : `${selectedWeekCount} weeks selected — ${sectionTitle}`}
                  </div>
                  {singleWeekSelected && previewWeekForDates ? (
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-blue-600 text-left font-semibold text-white">
                          <th className="border border-blue-500 px-2 py-1.5">Week</th>
                          <th className="border border-blue-500 px-2 py-1.5">Day</th>
                          <th className="border border-blue-500 px-2 py-1.5">Dayname &amp; Date</th>
                          <th className="border border-blue-500 px-2 py-1.5 text-center">WO 1</th>
                          <th className="border border-blue-500 px-2 py-1.5 text-center">WO 2</th>
                          <th className="border border-blue-500 px-2 py-1.5 text-center">WO 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAY_LABELS.map((label, idx) => {
                          const dayNum = idx + 1;
                          const active = selectedDayNumbers.has(dayNum);
                          const dateLabel = dayDateLabel(previewWeekForDates, dayNum);
                          return (
                            <tr
                              key={dayNum}
                              className={
                                active
                                  ? 'cursor-pointer bg-blue-50/60 hover:bg-blue-100/60'
                                  : 'cursor-pointer bg-gray-50/30 opacity-70 hover:bg-gray-100/50'
                              }
                              onClick={() => toggleDay(dayNum)}
                            >
                              <td className="border border-gray-200 px-2 py-1.5 text-center font-semibold">
                                {previewWeekForDates.weekNumber}
                              </td>
                              <td className="border border-gray-200 px-2 py-1.5 text-center">{dayNum}</td>
                              <td className="border border-gray-200 px-2 py-1.5 font-medium text-blue-800">
                                {showDayDates && dateLabel
                                  ? `${FULL_DAY_NAMES[idx]} ${dateLabel}`
                                  : `${FULL_DAY_NAMES[idx]} (Day ${dayNum})`}
                              </td>
                              {[1, 2, 3].map((wo) => (
                                <td
                                  key={wo}
                                  className={`border border-gray-200 px-2 py-1.5 text-center ${
                                    active ? 'text-gray-600' : 'text-gray-300'
                                  }`}
                                >
                                  {active ? String(wo) : '—'}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="max-h-64 space-y-3 overflow-y-auto p-2">
                      {selectedWeeksList.map((week) => (
                        <div key={week.id} className="overflow-hidden rounded border border-gray-200">
                          <div className="bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                            Week {week.weekNumber}
                          </div>
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-50 font-semibold text-gray-600">
                                <th className="border border-gray-200 px-2 py-1">Day</th>
                                <th className="border border-gray-200 px-2 py-1">Day of week</th>
                                <th className="border border-gray-200 px-2 py-1 text-center">WO 1</th>
                                <th className="border border-gray-200 px-2 py-1 text-center">WO 2</th>
                                <th className="border border-gray-200 px-2 py-1 text-center">WO 3</th>
                              </tr>
                            </thead>
                            <tbody>
                              {DAY_LABELS.map((label, idx) => {
                                const dayNum = idx + 1;
                                const active = selectedDayNumbers.has(dayNum);
                                return (
                                  <tr
                                    key={`${week.id}-${dayNum}`}
                                    className={active ? 'bg-blue-50/40' : 'bg-white opacity-60'}
                                  >
                                    <td className="border border-gray-200 px-2 py-1 text-center">{dayNum}</td>
                                    <td className="border border-gray-200 px-2 py-1 font-medium">
                                      {FULL_DAY_NAMES[idx]}
                                    </td>
                                    {[1, 2, 3].map((wo) => (
                                      <td
                                        key={wo}
                                        className="border border-gray-200 px-2 py-1 text-center text-gray-400"
                                      >
                                        {active ? String(wo) : '—'}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
          <p className="text-sm text-gray-600">
            {selectedWeekCount === 0
              ? 'No weeks selected'
              : `${selectedWeekCount} week(s), ${selectedDayNumbers.size} day(s)`}
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
              disabled={
                selectedWeekCount === 0 ||
                selectedDayNumbers.size === 0 ||
                selectedDayNumbers.size < planDaysCount ||
                isLoading ||
                loadingWeeks ||
                sortedWeeks.length === 0
              }
              onClick={() => void handleConfirm()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Please wait…' : `Continue with ${selectedWeekCount} week(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
