'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

interface CopyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDay: any;
  nutritionPlan: any;
  onConfirm: (targetDate: Date, targetWeekId: string) => void;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function CopyDayModal({
  isOpen,
  onClose,
  sourceDay,
  nutritionPlan,
  onConfirm,
  activeSection = 'A'
}: CopyDayModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  useEffect(() => {
    if (selectedWeek && nutritionPlan) {
      const week = nutritionPlan.weeks?.find((w: any) => w.id === selectedWeek);
      if (week && week.days && week.days.length > 0) {
        // Use actual dates from the week's days
        const dates = week.days
          .map((day: any) => new Date(day.date))
          .filter((date: Date) => !isNaN(date.getTime()))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        setAvailableDates(dates);
      } else {
        setAvailableDates([]);
      }
    }
  }, [selectedWeek, nutritionPlan]);

  const handleCopy = () => {
    if (selectedDate && selectedWeek) {
      onConfirm(new Date(selectedDate), selectedWeek);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-2">
            <Calendar size={20} />
            <h2 className="text-lg font-bold">Copy Day</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-700">
              <strong>Copying from:</strong>{' '}
              {activeSection === 'A' ? (
                `Template Day (${sourceDay.meals?.length || 0} workout(s))`
              ) : (
                new Date(sourceDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              )}
            </p>
            {activeSection !== 'A' && (
              <p className="text-xs text-gray-500 mt-1">
                {sourceDay.meals?.length || 0} workout(s) will be copied
              </p>
            )}
          </div>

          {/* Select Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Target Week:
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                setSelectedDate('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a week...</option>
              {nutritionPlan?.weeks?.map((week: any) => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber} ({new Date(week.startDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Select Date */}
          {selectedWeek && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Target Date:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableDates.map((date) => {
                  // Ensure date is a valid Date object
                  const dateObj = date instanceof Date ? date : new Date(date);
                  if (isNaN(dateObj.getTime())) {
                    console.error('Invalid date in availableDates:', date);
                    return null;
                  }
                  
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const isSource = new Date(sourceDay.date).toDateString() === dateObj.toDateString();
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      disabled={isSource}
                      className={`px-3 py-2 text-sm rounded border transition-colors ${
                        selectedDate === dateStr
                          ? 'bg-blue-500 text-white border-blue-600'
                          : isSource
                          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                      }`}
                    >
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {isSource && <span className="block text-xs">(Source)</span>}
                    </button>
                  );
                }).filter(Boolean)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={!selectedDate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Copy Day
          </button>
        </div>
      </div>
    </div>
  );
}

