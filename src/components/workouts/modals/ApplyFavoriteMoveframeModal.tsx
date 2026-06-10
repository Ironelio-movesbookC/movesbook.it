'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, CheckCircle2 } from 'lucide-react';
import { fetchPlanWeeks, getDayWorkoutCount } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';

export type FavoriteMoveframeDestination = 'YEARLY_PLAN' | 'WORKOUTS_DONE';

const CONFIG: Record<
  FavoriteMoveframeDestination,
  { title: string; gradient: string; planType: string }
> = {
  YEARLY_PLAN: {
    title: 'Export Moveframe to Yearly Plan',
    gradient: 'from-blue-600 to-indigo-700',
    planType: 'YEARLY_PLAN',
  },
  WORKOUTS_DONE: {
    title: 'Export Moveframe to Workouts Done',
    gradient: 'from-emerald-600 to-teal-700',
    planType: 'WORKOUTS_DONE',
  },
};

interface ApplyFavoriteMoveframeModalProps {
  moveframeName: string;
  moveframeId: string;
  destination: FavoriteMoveframeDestination;
  onClose: () => void;
  onConfirm: (targetWorkoutId: string) => Promise<void>;
}

export default function ApplyFavoriteMoveframeModal({
  moveframeName,
  destination,
  onClose,
  onConfirm,
}: ApplyFavoriteMoveframeModalProps) {
  const config = CONFIG[destination];
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const raw = await fetchPlanWeeks(token, config.planType);
        setWeeks(mergeWeeksByWeekNumber(raw));
      } finally {
        setLoading(false);
      }
    })();
    setSelectedWeekId('');
    setSelectedDayId('');
    setSelectedWorkoutId('');
  }, [destination]);

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.id === selectedWeekId),
    [weeks, selectedWeekId]
  );

  const weekDays = useMemo(() => {
    if (!selectedWeek?.days?.length) return [];
    return [...selectedWeek.days].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [selectedWeek]);

  const selectedDay = useMemo(
    () => weekDays.find((d: any) => d.id === selectedDayId),
    [weekDays, selectedDayId]
  );

  const workouts = selectedDay?.workouts ?? [];

  const handleApply = async () => {
    if (!selectedWorkoutId) return;
    setApplying(true);
    try {
      await onConfirm(selectedWorkoutId);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      setApplying(false);
    }
  };

  const Icon = destination === 'WORKOUTS_DONE' ? CheckCircle2 : Calendar;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-5 border-b bg-gradient-to-r ${config.gradient} text-white rounded-t-2xl flex justify-between`}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">{config.title}</h2>
              <p className="text-sm opacity-90">{moveframeName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <p className="text-center text-gray-500 py-6">Loading…</p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Target week</label>
                <select
                  value={selectedWeekId}
                  onChange={(e) => {
                    setSelectedWeekId(e.target.value);
                    setSelectedDayId('');
                    setSelectedWorkoutId('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Choose week…</option>
                  {weeks.map((w, i) => (
                    <option key={w.id} value={w.id}>
                      Week {w.weekNumber ?? i + 1}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWeekId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Target day</label>
                  <select
                    value={selectedDayId}
                    onChange={(e) => {
                      setSelectedDayId(e.target.value);
                      setSelectedWorkoutId('');
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Choose day…</option>
                    {weekDays.map((day: any) => (
                      <option key={day.id} value={day.id}>
                        {day.date
                          ? new Date(day.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : `Day ${day.dayOfWeek}`}{' '}
                        ({getDayWorkoutCount(day)}/3 workouts)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDayId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Target workout</label>
                  {workouts.length === 0 ? (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
                      This day has no workouts. Add a workout first, then export the moveframe into it.
                    </p>
                  ) : (
                    <select
                      value={selectedWorkoutId}
                      onChange={(e) => setSelectedWorkoutId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Choose workout…</option>
                      {workouts.map((w: any) => (
                        <option key={w.id} value={w.id}>
                          Workout #{w.sessionNumber}: {w.name || 'Untitled'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t flex gap-3 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={applying || !selectedWorkoutId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {applying ? 'Exporting…' : 'Export moveframe'}
          </button>
        </div>
      </div>
    </div>
  );
}
