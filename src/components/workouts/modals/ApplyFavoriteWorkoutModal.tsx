'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Archive, CheckCircle2 } from 'lucide-react';
import { fetchPlanWeeks, getDayWorkoutCount } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';

export type FavoriteWorkoutDestination = 'YEARLY_PLAN' | 'WORKOUTS_DONE' | 'ARCHIVE';

const CONFIG: Record<
  FavoriteWorkoutDestination,
  { title: string; gradient: string; planType: string; mergeWeeks: boolean }
> = {
  YEARLY_PLAN: {
    title: 'Export to Yearly Plan',
    gradient: 'from-blue-600 to-indigo-700',
    planType: 'YEARLY_PLAN',
    mergeWeeks: true,
  },
  WORKOUTS_DONE: {
    title: 'Export to Workouts Done',
    gradient: 'from-emerald-600 to-teal-700',
    planType: 'WORKOUTS_DONE',
    mergeWeeks: true,
  },
  ARCHIVE: {
    title: 'Export to Archive',
    gradient: 'from-gray-700 to-gray-900',
    planType: 'ARCHIVE',
    mergeWeeks: false,
  },
};

interface ApplyFavoriteWorkoutModalProps {
  workoutName: string;
  destination: FavoriteWorkoutDestination;
  onClose: () => void;
  onConfirm: (payload: { dayId: string; sessionNumber: number; replaceExisting: boolean }) => Promise<void>;
}

export default function ApplyFavoriteWorkoutModal({
  workoutName,
  destination,
  onClose,
  onConfirm,
}: ApplyFavoriteWorkoutModalProps) {
  const config = CONFIG[destination];
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const raw = await fetchPlanWeeks(token, config.planType);
        setWeeks(config.mergeWeeks ? mergeWeeksByWeekNumber(raw) : raw);
      } finally {
        setLoading(false);
      }
    })();
    setSelectedWeekId('');
    setSelectedDayId('');
    setSelectedSlot(null);
    setConfirmOverwrite(false);
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

  const slotInfo = useMemo(() => {
    const workouts = selectedDay?.workouts ?? [];
    return [1, 2, 3].map((slot) => {
      const existing = workouts.find((w: any) => w.sessionNumber === slot);
      return { slot, existing, occupied: Boolean(existing) };
    });
  }, [selectedDay]);

  const selectedSlotOccupied = selectedSlot
    ? slotInfo.find((s) => s.slot === selectedSlot)?.occupied
    : false;

  const handleApply = async () => {
    if (!selectedDayId || selectedSlot == null) return;
    if (selectedSlotOccupied && !confirmOverwrite) return;
    setApplying(true);
    try {
      await onConfirm({
        dayId: selectedDayId,
        sessionNumber: selectedSlot,
        replaceExisting: Boolean(selectedSlotOccupied),
      });
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`p-5 border-b bg-gradient-to-r ${config.gradient} text-white rounded-t-2xl flex justify-between items-start`}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">{config.title}</h2>
              <p className="text-sm opacity-90">{workoutName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <p className="text-gray-500 text-center py-6">Loading…</p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Target week</label>
                <select
                  value={selectedWeekId}
                  onChange={(e) => {
                    setSelectedWeekId(e.target.value);
                    setSelectedDayId('');
                    setSelectedSlot(null);
                    setConfirmOverwrite(false);
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
                      setSelectedSlot(null);
                      setConfirmOverwrite(false);
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Choose day…</option>
                    {weekDays.map((day: any) => {
                      const count = getDayWorkoutCount(day);
                      return (
                        <option key={day.id} value={day.id}>
                          {day.date
                            ? new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })
                            : `Day ${day.dayOfWeek}`}{' '}
                          ({count}/3 workouts)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {selectedDayId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Workout slot</label>
                  <div className="grid grid-cols-1 gap-2">
                    {slotInfo.map(({ slot, existing, occupied }) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setConfirmOverwrite(false);
                        }}
                        className={`px-3 py-2 text-sm rounded border text-left ${
                          selectedSlot === slot
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        Workout #{slot}{' '}
                        {occupied ? (
                          <span className="text-amber-700">— {existing?.name || 'Occupied'}</span>
                        ) : (
                          <span className="text-green-700">— Empty</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedSlotOccupied && (
                <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmOverwrite}
                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-amber-900">
                    This slot already has a workout. Replace it with the favourite export.
                  </span>
                </label>
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
            disabled={
              applying ||
              !selectedDayId ||
              selectedSlot == null ||
              (selectedSlotOccupied && !confirmOverwrite)
            }
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {applying ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
