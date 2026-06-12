'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Archive } from 'lucide-react';
import { fetchPlanWeeks, getWeekWorkoutCount, isWeekEmpty } from '@/lib/workoutPlanLoad';

interface ExportWeekToArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceWeek: any;
  sourceTemplate: 'A' | 'B' | 'C';
  onConfirm: (targetWeekId: string) => Promise<void>;
}

export default function ExportWeekToArchiveModal({
  isOpen,
  onClose,
  sourceWeek,
  sourceTemplate,
  onConfirm,
}: ExportWeekToArchiveModalProps) {
  const [archiveWeeks, setArchiveWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

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
    setConfirmOverwrite(false);
    void loadArchiveWeeks();
  }, [isOpen, sourceWeek?.id]);

  const selectedWeek = useMemo(
    () => archiveWeeks.find((w) => w.id === selectedWeekId),
    [archiveWeeks, selectedWeekId]
  );

  const targetHasContent = selectedWeek ? !isWeekEmpty(selectedWeek) : false;

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
      setConfirmOverwrite(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create archive week');
    } finally {
      setIsCreatingWeek(false);
    }
  };

  const handleExport = async () => {
    if (!selectedWeekId) return;
    if (targetHasContent && !confirmOverwrite) return;

    setIsExporting(true);
    try {
      await onConfirm(selectedWeekId);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !sourceWeek) return null;

  const sourceCount = getWeekWorkoutCount(sourceWeek);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Archive className="w-6 h-6" />
              <h2 className="text-xl font-bold">Export Week to Archive</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isExporting}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800">
                <strong>Source:</strong> Weekly Plan {sourceTemplate}, Week {sourceWeek.weekNumber}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {sourceCount} workout{sourceCount === 1 ? '' : 's'} will be saved in Archive workouts & weekly plans.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Select archive week:</p>
              <button
                type="button"
                onClick={() => void handleCreateWeek()}
                disabled={isCreatingWeek}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {isCreatingWeek ? 'Creating…' : '+ New archive week'}
              </button>
            </div>

            {isLoading ? (
              <p className="text-center py-6 text-gray-500">Loading archive…</p>
            ) : archiveWeeks.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                No archive weeks yet. Click <strong>New archive week</strong> to create one, then export.
              </div>
            ) : (
              <div className="space-y-2">
                {archiveWeeks.map((week, idx) => {
                  const weekNum = week.weekNumber ?? idx + 1;
                  const count = getWeekWorkoutCount(week);
                  const isSelected = selectedWeekId === week.id;
                  return (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => {
                        setSelectedWeekId(week.id);
                        setConfirmOverwrite(false);
                      }}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'border-gray-700 bg-gray-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Archive Week {weekNum}</span>
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
            )}

            {selectedWeek && targetHasContent && (
              <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-amber-900">
                  The archive week already has content. Replace it with this export.
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
                !selectedWeekId ||
                (targetHasContent && !confirmOverwrite)
              }
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting…' : 'Export to Archive'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
