'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Calendar, Archive, CheckCircle2 } from 'lucide-react';
import { fetchPlanWeeks, getWeekWorkoutCount, isWeekEmpty } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';

export type FavoriteWeekDestination = 'YEARLY_PLAN' | 'WORKOUTS_DONE' | 'ARCHIVE';

const CONFIG: Record<
  FavoriteWeekDestination,
  {
    title: string;
    gradient: string;
    planType: string;
    mergeWeeks: boolean;
    maxWeeks: number | null;
    weekLabel: string;
    allowCreateWeek: boolean;
  }
> = {
  YEARLY_PLAN: {
    title: 'Export to Yearly Plan',
    gradient: 'from-blue-600 to-indigo-700',
    planType: 'YEARLY_PLAN',
    mergeWeeks: true,
    maxWeeks: null,
    weekLabel: 'Yearly Week',
    allowCreateWeek: false,
  },
  WORKOUTS_DONE: {
    title: 'Export to Workouts Done',
    gradient: 'from-emerald-600 to-teal-700',
    planType: 'WORKOUTS_DONE',
    mergeWeeks: true,
    maxWeeks: 1,
    weekLabel: 'Done Week',
    allowCreateWeek: false,
  },
  ARCHIVE: {
    title: 'Export to Archive',
    gradient: 'from-gray-700 to-gray-900',
    planType: 'ARCHIVE',
    mergeWeeks: false,
    maxWeeks: 1,
    weekLabel: 'Archive Week',
    allowCreateWeek: true,
  },
};

interface ApplyFavoriteWeekModalProps {
  planName: string;
  destination: FavoriteWeekDestination;
  onClose: () => void;
  onConfirm: (targetWeekIds: string[]) => Promise<void>;
}

export default function ApplyFavoriteWeekModal({
  planName,
  destination,
  onClose,
  onConfirm,
}: ApplyFavoriteWeekModalProps) {
  const config = CONFIG[destination];
  const planType = config.planType;
  const mergeWeeks = config.mergeWeeks;
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [error, setError] = useState('');

  const loadWeeks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in');
        return;
      }
      const raw = await fetchPlanWeeks(token, planType);
      setWeeks(mergeWeeks ? mergeWeeksByWeekNumber(raw) : raw);
    } catch {
      setError('Failed to load target weeks');
    } finally {
      setLoading(false);
    }
  }, [planType, mergeWeeks]);

  useEffect(() => {
    void loadWeeks();
    setSelectedIds(new Set());
    setConfirmOverwrite(false);
  }, [loadWeeks]);

  const selectedWeeks = useMemo(
    () => weeks.filter((w) => selectedIds.has(w.id)),
    [weeks, selectedIds]
  );

  const anyTargetHasContent = selectedWeeks.some((w) => !isWeekEmpty(w));

  const toggleWeek = (weekId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        if (config.maxWeeks === 1) {
          return new Set([weekId]);
        }
        next.add(weekId);
      }
      return next;
    });
    setConfirmOverwrite(false);
  };

  const handleCreateArchiveWeek = async () => {
    setCreatingWeek(true);
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
      setWeeks((prev) => [...prev, data.week].sort((a, b) => a.weekNumber - b.weekNumber));
      setSelectedIds(new Set([data.week.id]));
      setConfirmOverwrite(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create week');
    } finally {
      setCreatingWeek(false);
    }
  };

  const handleApply = async () => {
    if (selectedIds.size === 0) return;
    if (anyTargetHasContent && !confirmOverwrite) return;
    setApplying(true);
    try {
      await onConfirm(Array.from(selectedIds));
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      setApplying(false);
    }
  };

  const Icon =
    destination === 'ARCHIVE' ? Archive : destination === 'WORKOUTS_DONE' ? CheckCircle2 : Calendar;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between p-5 border-b bg-gradient-to-r ${config.gradient} text-white rounded-t-2xl`}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">{config.title}</h2>
              <p className="text-sm opacity-90">{planName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {loading && <p className="text-center text-gray-500 py-8">Loading weeks…</p>}
          {error && <p className="text-center text-red-600 py-4">{error}</p>}
          {!loading && !error && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                {config.maxWeeks === 1
                  ? 'Select one target week. Existing workouts will be replaced.'
                  : 'Select one or more target weeks. Empty/full status is shown for each week.'}
              </p>
              {config.allowCreateWeek && (
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => void handleCreateArchiveWeek()}
                    disabled={creatingWeek}
                    className="text-sm text-blue-600 font-medium disabled:opacity-50"
                  >
                    {creatingWeek ? 'Creating…' : '+ New archive week'}
                  </button>
                </div>
              )}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto border rounded-lg p-2">
                {weeks.map((week, idx) => {
                  const count = getWeekWorkoutCount(week);
                  const isSelected = selectedIds.has(week.id);
                  return (
                    <label
                      key={week.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                        isSelected ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type={config.maxWeeks === 1 ? 'radio' : 'checkbox'}
                        name="fav-week-target"
                        checked={isSelected}
                        onChange={() => toggleWeek(week.id)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-gray-900 flex-1">
                        {config.weekLabel} {week.weekNumber ?? idx + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          count === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {count === 0 ? 'Empty' : `${count} workout${count === 1 ? '' : 's'}`}
                      </span>
                    </label>
                  );
                })}
              </div>
              {anyTargetHasContent && (
                <label className="flex items-start gap-2 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmOverwrite}
                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-amber-900">
                    Target week(s) already have workouts. Replace them with this favourite week.
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t flex gap-3 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={
              applying ||
              loading ||
              !!error ||
              selectedIds.size === 0 ||
              (anyTargetHasContent && !confirmOverwrite)
            }
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {applying ? 'Exporting…' : `Export to ${selectedIds.size || 0} week(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
