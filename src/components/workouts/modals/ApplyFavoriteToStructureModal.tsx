'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Layers } from 'lucide-react';
import {
  WEEKLY_STRUCTURE_PLAN_KEYS,
  WEEKLY_STRUCTURE_SESSIONS,
  type WeeklyStructurePlanKey,
} from '@/lib/weeklyStructureTypes';
import {
  collectWeeklyStructureBlobForServer,
  loadWeeklyStructurePlan,
  saveWeeklyStructurePlan,
} from '@/lib/weeklyStructureStorage';
import {
  favoritePlanDataToStructurePlan,
  favoriteWorkoutDataToPlannedWorkout,
  getStructureAssignmentCount,
  isStructureSlotEmpty,
} from '@/lib/favoriteToWeeklyStructure';

export type StructureExportMode = 'week' | 'workout';

interface ApplyFavoriteToStructureModalProps {
  mode: StructureExportMode;
  itemName: string;
  planData?: any;
  workoutData?: any;
  onClose: () => void;
  onApplied?: () => void;
}

export default function ApplyFavoriteToStructureModal({
  mode,
  itemName,
  planData,
  workoutData,
  onClose,
  onApplied,
}: ApplyFavoriteToStructureModalProps) {
  const [selectedKey, setSelectedKey] = useState<WeeklyStructurePlanKey | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setSelectedKey(null);
    setSelectedDay(null);
    setSelectedSession(null);
    setConfirmOverwrite(false);
    setRefresh((n) => n + 1);
  }, [mode, itemName]);

  const targetPlan = useMemo(() => {
    void refresh;
    return selectedKey ? loadWeeklyStructurePlan(selectedKey) : null;
  }, [selectedKey, refresh]);

  const targetHasContent =
    mode === 'week'
      ? targetPlan
        ? getStructureAssignmentCount(targetPlan) > 0
        : false
      : targetPlan && selectedDay && selectedSession
        ? !isStructureSlotEmpty(targetPlan, selectedDay, selectedSession)
        : false;

  const syncStructure = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const blob = collectWeeklyStructureBlobForServer();
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ weeklyStructureV1: blob }),
    });
  };

  const handleApply = async () => {
    if (!selectedKey) return;
    if (targetHasContent && !confirmOverwrite) return;

    setApplying(true);
    try {
      if (mode === 'week') {
        if (!planData) throw new Error('Missing plan data');
        const imported = favoritePlanDataToStructurePlan(planData, itemName);
        if (getStructureAssignmentCount(imported) === 0) {
          throw new Error('This favourite has no content to export');
        }
        const existing = loadWeeklyStructurePlan(selectedKey);
        if (getStructureAssignmentCount(existing) > 0 && !confirmOverwrite) return;
        saveWeeklyStructurePlan(selectedKey, imported);
      } else {
        if (!workoutData) throw new Error('Missing workout data');
        const row = favoriteWorkoutDataToPlannedWorkout(workoutData);
        if (!row) throw new Error('Invalid workout data');
        if (!selectedDay || !selectedSession) throw new Error('Select day and session');

        const plan = loadWeeklyStructurePlan(selectedKey);
        const slotTaken = !isStructureSlotEmpty(plan, selectedDay, selectedSession);
        if (slotTaken && !confirmOverwrite) return;

        const next = {
          ...plan,
          planned: [...plan.planned, row],
          grid: { ...plan.grid },
        };
        if (!next.grid[selectedDay]) next.grid[selectedDay] = {};
        next.grid[selectedDay] = { ...next.grid[selectedDay] };
        next.grid[selectedDay][selectedSession] = [row.id];

        saveWeeklyStructurePlan(selectedKey, next);
      }

      await syncStructure();
      alert(
        mode === 'week'
          ? `Week exported to Structure Plan ${selectedKey}.`
          : `Workout exported to Plan ${selectedKey}, day ${selectedDay}, session ${selectedSession}.`
      );
      onApplied?.();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-t-2xl flex justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">Export to Weekly Structure</h2>
              <p className="text-sm opacity-90">{itemName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Structure plan</label>
            <select
              value={selectedKey ?? ''}
              onChange={(e) => {
                setSelectedKey((e.target.value || null) as WeeklyStructurePlanKey | null);
                setSelectedDay(null);
                setSelectedSession(null);
                setConfirmOverwrite(false);
                setRefresh((n) => n + 1);
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Choose plan…</option>
              {WEEKLY_STRUCTURE_PLAN_KEYS.map((key) => {
                const plan = loadWeeklyStructurePlan(key);
                const count = getStructureAssignmentCount(plan);
                return (
                  <option key={key} value={key}>
                    Plan {key} {count === 0 ? '(empty)' : `(${count} assignments)`}
                  </option>
                );
              })}
            </select>
          </div>

          {mode === 'workout' && selectedKey && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Day</label>
                <select
                  value={selectedDay ?? ''}
                  onChange={(e) => {
                    setSelectedDay(e.target.value ? Number(e.target.value) : null);
                    setSelectedSession(null);
                    setConfirmOverwrite(false);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Choose day…</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDay && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Session</label>
                  <div className="grid grid-cols-1 gap-2">
                    {WEEKLY_STRUCTURE_SESSIONS.map((sn) => {
                      const empty =
                        !targetPlan || isStructureSlotEmpty(targetPlan, selectedDay, sn);
                      return (
                        <button
                          key={sn}
                          type="button"
                          onClick={() => {
                            setSelectedSession(sn);
                            setConfirmOverwrite(false);
                          }}
                          className={`px-3 py-2 text-sm rounded border text-left ${
                            selectedSession === sn
                              ? 'bg-violet-50 border-violet-500'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          Session {sn}{' '}
                          {empty ? (
                            <span className="text-green-700">— Empty</span>
                          ) : (
                            <span className="text-amber-700">— Occupied</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {targetHasContent && (
            <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmOverwrite}
                onChange={(e) => setConfirmOverwrite(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-amber-900">
                {mode === 'week'
                  ? 'Target plan already has assignments. Replace them with this favourite week.'
                  : 'Target session is occupied. Replace it with this favourite workout.'}
              </span>
            </label>
          )}
        </div>

        <div className="p-5 border-t flex gap-3 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={
              applying ||
              !selectedKey ||
              (mode === 'workout' && (!selectedDay || !selectedSession)) ||
              (targetHasContent && !confirmOverwrite)
            }
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg disabled:opacity-50"
          >
            {applying ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
