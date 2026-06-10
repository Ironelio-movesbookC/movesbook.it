'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Archive } from 'lucide-react';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';

interface ExportWorkoutToArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWorkout: any;
  onConfirm: (targetDayId: string, sessionNumber: number) => Promise<void>;
}

export default function ExportWorkoutToArchiveModal({
  isOpen,
  onClose,
  sourceWorkout,
  onConfirm,
}: ExportWorkoutToArchiveModalProps) {
  const [archiveWeeks, setArchiveWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadArchiveWeeks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setArchiveWeeks([]);
        return;
      }
      setArchiveWeeks(await fetchPlanWeeks(token, 'ARCHIVE'));
    } catch {
      setArchiveWeeks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWeekId('');
    setSelectedDayId('');
    void loadArchiveWeeks();
  }, [isOpen, sourceWorkout?.id]);

  const selectedWeek = useMemo(
    () => archiveWeeks.find((w) => w.id === selectedWeekId),
    [archiveWeeks, selectedWeekId]
  );

  const archiveDays = useMemo(() => {
    if (!selectedWeek?.days?.length) return [];
    return [...selectedWeek.days].sort(
      (a: any, b: any) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)
    );
  }, [selectedWeek]);

  const handleCreateWeek = async () => {
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
      setArchiveWeeks((prev) => [...prev, newWeek].sort((a, b) => a.weekNumber - b.weekNumber));
      setSelectedWeekId(newWeek.id);
      setSelectedDayId('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create archive week');
    } finally {
      setIsCreatingWeek(false);
    }
  };

  const handleExport = async () => {
    if (!selectedDayId) return;
    const targetDay = archiveDays.find((d: any) => d.id === selectedDayId);
    const existing = targetDay?.workouts?.length ?? 0;
    if (existing >= 3) {
      alert('Cannot export: archive day already has 3 workouts (maximum).');
      return;
    }

    setIsExporting(true);
    try {
      await onConfirm(selectedDayId, existing + 1);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !sourceWorkout) return null;

  const mfCount = sourceWorkout.moveframes?.length ?? 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Archive size={20} />
              <h2 className="text-lg font-bold">Export Workout to Archive</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isExporting}>
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800">
                <strong>Workout:</strong>{' '}
                {sourceWorkout.name || `Workout #${sourceWorkout.sessionNumber}`}
              </p>
              <p className="text-xs text-gray-600 mt-1">{mfCount} moveframe(s) will be exported.</p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Archive week</label>
              <button
                type="button"
                onClick={() => void handleCreateWeek()}
                disabled={isCreatingWeek}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {isCreatingWeek ? 'Creating…' : '+ New week'}
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading archive…</p>
            ) : (
              <select
                value={selectedWeekId}
                onChange={(e) => {
                  setSelectedWeekId(e.target.value);
                  setSelectedDayId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Choose archive week…</option>
                {archiveWeeks.map((week, idx) => (
                  <option key={week.id} value={week.id}>
                    Archive Week {week.weekNumber ?? idx + 1}
                  </option>
                ))}
              </select>
            )}

            {selectedWeekId && archiveDays.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Archive day</label>
                <div className="grid grid-cols-2 gap-2">
                  {archiveDays.map((day: any) => {
                    const workoutCount = day.workouts?.length ?? 0;
                    const full = workoutCount >= 3;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        disabled={full}
                        onClick={() => setSelectedDayId(day.id)}
                        className={`px-3 py-2 text-sm rounded border transition-colors ${
                          selectedDayId === day.id
                            ? 'bg-gray-800 text-white border-gray-900'
                            : full
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {day.date
                          ? new Date(day.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : templateDaySlotLabel(day)}
                        <span className="block text-xs opacity-80">
                          {workoutCount}/3 workout{workoutCount === 1 ? '' : 's'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedWeekId && archiveDays.length === 0 && (
              <p className="text-sm text-amber-700">This archive week has no days. Create a new archive week.</p>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg" disabled={isExporting}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting || !selectedDayId}
              className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {isExporting ? 'Exporting…' : 'Export to Archive'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
