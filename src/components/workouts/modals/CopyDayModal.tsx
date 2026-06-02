'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';

export type CopyDayConfirmPayload = {
  targetWeekId: string;
  targetDayId?: string;
  targetDate?: Date;
};

interface CopyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDay: any;
  workoutPlan: any;
  onConfirm: (payload: CopyDayConfirmPayload) => void;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function CopyDayModal({
  isOpen,
  onClose,
  sourceDay,
  workoutPlan,
  onConfirm,
  activeSection = 'A',
}: CopyDayModalProps) {
  const isTemplate = activeSection === 'A';
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTargetDayId, setSelectedTargetDayId] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  const selectedWeekData = useMemo(
    () => workoutPlan?.weeks?.find((w: any) => w.id === selectedWeek),
    [workoutPlan, selectedWeek]
  );

  const templateDaysInWeek = useMemo(() => {
    if (!selectedWeekData?.days?.length) return [];
    return [...selectedWeekData.days].sort(
      (a: any, b: any) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)
    );
  }, [selectedWeekData]);

  const yearlyDaysInWeek = useMemo(() => {
    if (!selectedWeekData?.days?.length) return [];
    return [...selectedWeekData.days].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [selectedWeekData]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWeek('');
    setSelectedDate('');
    setSelectedTargetDayId('');
    setAvailableDates([]);
  }, [isOpen, sourceDay?.id]);

  useEffect(() => {
    if (isTemplate || !selectedWeek || !workoutPlan) {
      setAvailableDates([]);
      return;
    }
    const week = workoutPlan.weeks?.find((w: any) => w.id === selectedWeek);
    if (week?.days?.length) {
      const dates = week.days
        .map((day: any) => new Date(day.date))
        .filter((date: Date) => !isNaN(date.getTime()))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      setAvailableDates(dates);
    } else {
      setAvailableDates([]);
    }
  }, [selectedWeek, workoutPlan, isTemplate]);

  const handleCopy = () => {
    if (!selectedWeek) return;
    if (isTemplate) {
      if (!selectedTargetDayId) return;
      onConfirm({ targetWeekId: selectedWeek, targetDayId: selectedTargetDayId });
      onClose();
      return;
    }
    if (selectedTargetDayId) {
      const targetDay = yearlyDaysInWeek.find((d: any) => d.id === selectedTargetDayId);
      onConfirm({
        targetWeekId: selectedWeek,
        targetDayId: selectedTargetDayId,
        targetDate: targetDay?.date ? new Date(targetDay.date) : undefined,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const canSubmit = Boolean(selectedWeek && selectedTargetDayId);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <h2 className="text-lg font-bold">Copy Day</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-700">
              <strong>Copying from:</strong>{' '}
              {isTemplate
                ? `${templateDaySlotLabel(sourceDay)} (${sourceDay.workouts?.length || 0} workout(s))`
                : new Date(sourceDay.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
            </p>
            {!isTemplate && (
              <p className="text-xs text-gray-500 mt-1">
                {sourceDay.workouts?.length || 0} workout(s) will be copied
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Week:</label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                setSelectedDate('');
                setSelectedTargetDayId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a week...</option>
              {workoutPlan?.weeks?.map((week: any) => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber}
                </option>
              ))}
            </select>
          </div>

          {selectedWeek && isTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Day:</label>
              <div className="grid grid-cols-2 gap-2">
                {templateDaysInWeek.map((day: any) => {
                  const isSource = day.id === sourceDay.id;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setSelectedTargetDayId(day.id)}
                      disabled={isSource}
                      className={`px-3 py-2 text-sm rounded border transition-colors ${
                        selectedTargetDayId === day.id
                          ? 'bg-blue-500 text-white border-blue-600'
                          : isSource
                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                      }`}
                    >
                      {templateDaySlotLabel(day)}
                      {isSource && <span className="block text-xs">(Source)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedWeek && !isTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Target Date:</label>
              <p className="text-xs text-gray-500 mb-2">
                Workouts are copied into the existing day on your yearly plan (empty days are fine).
              </p>
              <div className="grid grid-cols-2 gap-2">
                {yearlyDaysInWeek.map((day: any) => {
                  const dateObj = new Date(day.date);
                  if (isNaN(dateObj.getTime())) return null;
                  const isSource = day.id === sourceDay.id;
                  const workoutCount = day.workouts?.length ?? 0;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setSelectedTargetDayId(day.id);
                        setSelectedDate(dateObj.toISOString().split('T')[0]);
                      }}
                      disabled={isSource}
                      className={`px-3 py-2 text-sm rounded border transition-colors ${
                        selectedTargetDayId === day.id
                          ? 'bg-blue-500 text-white border-blue-600'
                          : isSource
                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                      }`}
                    >
                      {dateObj.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      <span className="block text-xs opacity-80">
                        {workoutCount} workout{workoutCount === 1 ? '' : 's'}
                      </span>
                      {isSource && <span className="block text-xs">(Source)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Copy Day
          </button>
        </div>
      </div>
    </div>
  );
}
