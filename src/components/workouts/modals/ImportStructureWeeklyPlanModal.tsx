'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download } from 'lucide-react';
import {
  applyWeeklyStructureBlobFromServer,
  loadWeeklyStructurePlan,
} from '@/lib/weeklyStructureStorage';
import {
  WEEKLY_STRUCTURE_PLAN_KEYS,
  WEEKLY_STRUCTURE_SESSIONS,
  type WeeklyStructureDayGrid,
  type WeeklyStructurePlanKey,
  type WeeklyStructurePlanPersist,
  type PlannedWorkout,
} from '@/lib/weeklyStructureTypes';
import {
  getStructureAssignmentCount,
  isStructureGridEmpty,
} from '@/lib/weeklyStructureMaterialize';
import { getSportIcon } from '@/utils/sportIcons';
import { isWeekEmpty } from '@/lib/workoutPlanLoad';
import type { ImportWeeklyPlansPayload } from './ImportWeeklyPlansModal';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

interface PeriodOption {
  id: string;
  name: string;
}

interface ImportStructureWeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  anchorWeek: { id: string; weekNumber: number };
  yearlyWeeks: any[];
  onConfirm: (payload: ImportWeeklyPlansPayload) => Promise<void>;
}

function sessionFilled(grid: WeeklyStructureDayGrid, day: number, session: number): boolean {
  return (grid[day]?.[session] || []).length > 0;
}

function sessionAvailable(grid: WeeklyStructureDayGrid, day: number, session: number): boolean {
  if (session === 1) return true;
  if (session === 2) return sessionFilled(grid, day, 1);
  return sessionFilled(grid, day, 2);
}

function WoStatusIcon({
  session,
  available,
  filled,
}: {
  session: number;
  available: boolean;
  filled: boolean;
}) {
  if (!available) {
    return (
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-800 bg-gray-700 shadow-inner"
        title="Locked until the previous workout is assigned"
      >
        <span className="block w-0 h-0 border-l-[3px] border-r-[3px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
      </span>
    );
  }
  if (session === 1 || filled) {
    return (
      <span
        className="inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-green-500 border-2 border-green-700 shadow-sm"
        title={filled ? 'Assigned' : 'Empty slot'}
      />
    );
  }
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm bg-orange-500 border border-orange-700 shadow-sm"
      title="Drop zone"
    />
  );
}

function Sport1Cells({
  planned,
  plannedId,
  available,
  dayStripe,
}: {
  planned: PlannedWorkout | undefined;
  plannedId: string | undefined;
  available: boolean;
  dayStripe: string;
}) {
  const tdBase = 'border border-gray-300 p-2 align-top text-xs min-w-[72px]';

  if (!available) {
    return (
      <>
        <td className={`${tdBase} ${dayStripe} bg-gray-300 text-center text-gray-500`}>—</td>
        <td className={`${tdBase} ${dayStripe} bg-gray-300 text-center text-gray-500`}>—</td>
        <td className={`${tdBase} ${dayStripe} bg-gray-300 text-center text-gray-500`}>—</td>
      </>
    );
  }

  if (!plannedId || !planned) {
    return (
      <>
        <td className={`${tdBase} ${dayStripe}`}>
          <span className="text-[10px] italic text-gray-400">Drop here</span>
        </td>
        <td className={`${tdBase} ${dayStripe}`} />
        <td className={`${tdBase} ${dayStripe}`} />
      </>
    );
  }

  return (
    <>
      <td className={`${tdBase} ${dayStripe}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-lg shrink-0">{getSportIcon(planned.sportKey, 'emoji')}</span>
          <span className="font-bold uppercase tracking-wide text-gray-900 truncate text-[11px]">
            {planned.sportKey.replace(/_/g, ' ')}
          </span>
        </div>
      </td>
      <td className={`${tdBase} ${dayStripe}`}>
        <div className="font-bold text-gray-900 leading-tight">{planned.distance?.trim() || '—'}</div>
        <div className="text-[10px] text-gray-600 tabular-nums mt-0.5">{planned.time?.trim() || '—'}</div>
      </td>
      <td className={`${tdBase} ${dayStripe}`}>
        <span className="font-bold text-gray-900 text-[11px]" title={planned.description?.trim()}>
          {planned.description?.trim() || planned.goalCode?.trim() || '—'}
        </span>
      </td>
    </>
  );
}

export default function ImportStructureWeeklyPlanModal({
  isOpen,
  onClose,
  onBack,
  anchorWeek,
  yearlyWeeks,
  onConfirm,
}: ImportStructureWeeklyPlanModalProps) {
  const [hydrated, setHydrated] = useState(false);
  const [planKey, setPlanKey] = useState<WeeklyStructurePlanKey>('A');
  const [planData, setPlanData] = useState<WeeklyStructurePlanPersist>({
    meta: { name: '', color: '#f97316', periodId: '' },
    planned: [],
    grid: {},
  });
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const loadPlanKey = useCallback((key: WeeklyStructurePlanKey) => {
    setPlanData(loadWeeklyStructurePlan(key));
    setConfirmOverwrite(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setPlanKey('A');
    setHydrated(false);
    setConfirmOverwrite(false);

    void (async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const [settingsRes, periodsRes] = await Promise.all([
            fetch('/api/user/settings', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/workouts/periods', { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (settingsRes.ok) {
            const data = await settingsRes.json();
            if (data.weeklyStructureV1 && typeof data.weeklyStructureV1 === 'object') {
              applyWeeklyStructureBlobFromServer(data.weeklyStructureV1);
            }
          }
          if (periodsRes.ok) {
            const data = await periodsRes.json();
            setPeriods(data.periods ?? []);
          }
        }
      } catch (e) {
        console.error('Failed to hydrate weekly structure:', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!hydrated || !isOpen) return;
    loadPlanKey(planKey);
  }, [hydrated, isOpen, planKey, loadPlanKey]);

  const plannedById = useMemo(
    () => new Map(planData.planned.map((p) => [p.id, p])),
    [planData.planned]
  );

  const assignmentCount = useMemo(() => getStructureAssignmentCount(planData), [planData]);
  const planIsEmpty = isStructureGridEmpty(planData);

  const targetWeek = useMemo(() => {
    const sorted = [...yearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
    return sorted.find((w) => w.weekNumber === anchorWeek.weekNumber);
  }, [yearlyWeeks, anchorWeek.weekNumber]);

  const targetHasContent = targetWeek ? !isWeekEmpty(targetWeek) : false;

  const periodName = useMemo(() => {
    const found = periods.find((p) => p.id === planData.meta.periodId);
    return found?.name ?? (planData.meta.periodId ? 'Period' : 'Period suggested…');
  }, [periods, planData.meta.periodId]);

  const handleImport = async () => {
    if (planIsEmpty) return;
    if (targetHasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        anchorWeekNumber: anchorWeek.weekNumber,
        overwrite: targetHasContent,
        source: {
          type: 'structure',
          items: [{ key: planKey, planData }],
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

  const { meta, grid } = planData;
  const displayName = meta.name?.trim() || `Week standard ${planKey}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-purple-600 to-violet-700 text-white px-5 py-3 flex items-center justify-between shrink-0">
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
              className="text-sm text-purple-700 hover:text-purple-900 underline"
            >
              ← Import mode
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Weekly Plans:</span>
              {WEEKLY_STRUCTURE_PLAN_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPlanKey(k)}
                  className={`px-4 py-1.5 rounded font-semibold text-sm border transition-colors ${
                    planKey === k
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Plan {k}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="px-2 py-1 rounded bg-purple-100 text-purple-900 font-bold text-sm">
                Plan {planKey}
              </div>
              <input
                type="text"
                readOnly
                value={displayName}
                className="border rounded px-2 py-1 text-sm min-w-[200px] bg-gray-50 text-gray-800"
                aria-label="Structure plan name"
              />
              <div
                className="h-9 w-12 rounded border border-gray-300 shrink-0"
                style={{ backgroundColor: meta.color || '#f97316' }}
                title="Plan color"
              />
              <select
                disabled
                value={meta.periodId}
                className="border rounded px-2 py-1 text-sm bg-gray-50 text-gray-800 min-w-[160px]"
                aria-label="Suggested period"
              >
                <option value="">{periodName}</option>
                {meta.periodId ? <option value={meta.periodId}>{periodName}</option> : null}
              </select>
            </div>

            {!hydrated ? (
              <p className="text-center py-8 text-gray-500 text-sm">Loading structure plans…</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-[640px] w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-sky-100">
                      <th className="p-2 text-left border border-gray-300 font-bold text-blue-900">Day</th>
                      <th className="p-2 text-center border border-gray-300 font-bold text-blue-900 w-14">
                        WO
                      </th>
                      <th
                        className="p-2 text-center border border-gray-300 font-bold text-blue-900 bg-blue-100/90"
                        colSpan={3}
                      >
                        Sport 1
                      </th>
                    </tr>
                    <tr className="text-[10px]">
                      <th className="p-1.5 border border-gray-300 bg-sky-50" colSpan={2} />
                      <th className="p-1.5 border border-gray-300 font-semibold text-center text-blue-900 bg-blue-50">
                        Sport
                      </th>
                      <th className="p-1.5 border border-gray-300 font-semibold text-center text-blue-900 bg-blue-50">
                        Duration &amp; Time
                      </th>
                      <th className="p-1.5 border border-gray-300 font-semibold text-center text-blue-900 bg-blue-50">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAY_NAMES.map((dayName, dayIndex) => {
                      const dayNum = dayIndex + 1;
                      const dayStripe = dayIndex % 2 === 0 ? 'bg-white' : 'bg-[#f2f2f2]';

                      return WEEKLY_STRUCTURE_SESSIONS.map((session) => {
                        const filled = sessionFilled(grid, dayNum, session);
                        const available = sessionAvailable(grid, dayNum, session);
                        const slot = grid[dayNum]?.[session] || [];
                        const firstPlannedId = slot[0];
                        const firstPlanned = firstPlannedId
                          ? plannedById.get(firstPlannedId)
                          : undefined;
                        const rowBg = !available ? 'bg-gray-300 text-gray-600' : dayStripe;

                        return (
                          <tr key={`${dayNum}-${session}`} className={`border-b border-gray-300 ${rowBg}`}>
                            {session === 1 && (
                              <td
                                className={`p-2 border border-gray-300 align-top font-semibold text-gray-900 ${dayStripe}`}
                                rowSpan={3}
                              >
                                {dayName}
                              </td>
                            )}
                            <td
                              className={`p-2 border border-gray-300 align-middle whitespace-nowrap ${
                                !available ? 'bg-gray-300' : dayStripe
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className={`font-bold tabular-nums ${
                                    !available
                                      ? 'text-gray-800'
                                      : session === 1 || filled
                                        ? 'text-black'
                                        : 'text-orange-600'
                                  }`}
                                >
                                  {session}
                                </span>
                                <WoStatusIcon session={session} available={available} filled={filled} />
                              </span>
                            </td>
                            <Sport1Cells
                              planned={firstPlanned}
                              plannedId={firstPlannedId}
                              available={available}
                              dayStripe={!available ? 'bg-gray-300' : dayStripe}
                            />
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {targetHasContent && !planIsEmpty && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Yearly Week {anchorWeek.weekNumber} already has workouts. Confirm to replace with this
                  structure.
                </span>
              </label>
            )}

            {!planIsEmpty && (
              <p className="text-xs text-gray-600">
                {assignmentCount} assignment{assignmentCount === 1 ? '' : 's'} will import into Yearly Plan
                Week {anchorWeek.weekNumber}.
              </p>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-500">
              {planIsEmpty
                ? 'No weeks selected'
                : `Plan ${planKey} · ${assignmentCount} assignment${assignmentCount === 1 ? '' : 's'}`}
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
                onClick={() => void handleImport()}
                disabled={
                  isImporting ||
                  !hydrated ||
                  planIsEmpty ||
                  (targetHasContent && !confirmOverwrite)
                }
                className="px-5 py-2 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
