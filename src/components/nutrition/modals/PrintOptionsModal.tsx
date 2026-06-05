'use client';

import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (options: PrintOptions) => void;
  week: any;
  activeSection?: string;
}

export interface PrintOptions {
  printSummary: boolean;
  printNutritionComponents: boolean;
  printWeekNote: boolean;
  printDayNote: boolean;
  printWorkoutInfo: boolean;
  selectedDayIndex: number;
}

export default function PrintOptionsModal({
  isOpen,
  onClose,
  onPrint,
  week,
  activeSection = 'A'
}: PrintOptionsModalProps) {
  const [printSummary, setPrintSummary] = useState(true);
  const [printNutritionComponents, setPrintNutritionComponents] = useState(false);
  const [printWeekNote, setPrintWeekNote] = useState(false);
  const [printDayNote, setPrintDayNote] = useState(false);
  const [printWorkoutInfo, setPrintWorkoutInfo] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const isTemplateMode = activeSection === 'A';

  if (!isOpen) return null;

  const handlePrint = () => {
    onPrint({
      printSummary,
      printNutritionComponents,
      printWeekNote,
      printDayNote,
      printWorkoutInfo,
      selectedDayIndex
    });
    onClose();
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Printer size={28} />
              <div>
                <h2 className="text-2xl font-bold">Print a Day</h2>
                <p className="text-indigo-100 text-sm">
                  {isTemplateMode ? `Week ${week?.weekNumber || 1}` : `Week ${week?.weekNumber || 1} - ${new Date(week?.startDate).toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Day Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Day to Print
            </label>
            <select
              value={selectedDayIndex}
              onChange={(e) => setSelectedDayIndex(parseInt(e.target.value))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-base font-medium"
            >
              {week?.days?.map((day: any, index: number) => (
                <option key={index} value={index}>
                  {dayNames[index]} {!isTemplateMode && day.date ? `- ${new Date(day.date).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Print Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What to Print
            </label>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {/* Summary */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={printSummary}
                  onChange={(e) => setPrintSummary(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900 group-hover:text-indigo-600">
                    Summary
                  </span>
                  <span className="ml-2 text-xs text-green-600 font-semibold">(Default: YES)</span>
                  <p className="text-xs text-gray-500 mt-1">Workout summary and totals</p>
                </div>
              </label>

              {/* NutritionComponents */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={printNutritionComponents}
                  onChange={(e) => setPrintNutritionComponents(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900 group-hover:text-indigo-600">
                    Dietlaps
                  </span>
                  <span className="ml-2 text-xs text-gray-600 font-semibold">(Default: NO)</span>
                  <p className="text-xs text-gray-500 mt-1">Detailed nutritionComponent information</p>
                </div>
              </label>

              {/* Note of the Week */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={printWeekNote}
                  onChange={(e) => setPrintWeekNote(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900 group-hover:text-indigo-600">
                    Note of the Week
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Week-level notes and comments</p>
                </div>
              </label>

              {/* Note of the Day */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={printDayNote}
                  onChange={(e) => setPrintDayNote(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900 group-hover:text-indigo-600">
                    Note of the Day
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Day-specific notes and comments</p>
                </div>
              </label>

              {/* NutritionMeal Info */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={printWorkoutInfo}
                  onChange={(e) => setPrintWorkoutInfo(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900 group-hover:text-indigo-600">
                    NutritionMeal Info
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Context, Basic Information & NutritionMeal Annotations</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
          >
            <Printer size={18} />
            Print Day
          </button>
        </div>
      </div>
    </div>
  );
}

