'use client';

import React, { useEffect } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { sanitizeWorkoutHtml } from '@/utils/sanitizeWorkoutHtml';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import { openWorkoutPrintWindow, WORKOUT_PRINT_CSS } from '@/lib/workoutPrintHelpers';
import WorkoutPrintContent from '@/components/workouts/print/WorkoutPrintContent';

interface DayPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: any;
  autoPrint?: boolean;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function DayPrintModal({
  isOpen,
  onClose,
  day,
  autoPrint = false,
  activeSection = 'A'
}: DayPrintModalProps) {
  const [shouldAutoPrint, setShouldAutoPrint] = React.useState(autoPrint);

  const handlePrint = React.useCallback(() => {
    setShouldAutoPrint(false);
    const printableContent = document.querySelector('.day-printable-content');
    if (!printableContent) return;
    const dayDate = day
      ? new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Day plan';
    openWorkoutPrintWindow(printableContent.innerHTML, `Day Plan - ${dayDate}`);
  }, [day]);

  // Trigger auto-print after modal content is rendered (only once)
  React.useEffect(() => {
    if (shouldAutoPrint && isOpen) {
      console.log('📋 Triggering auto-print for day...');
      const timer = setTimeout(() => {
        handlePrint();
        // Reset flag and close modal immediately
        setShouldAutoPrint(false);
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, isOpen, handlePrint, onClose]);

  if (!isOpen || !day) return null;

  const isTemplate = activeSection === 'A';
  const dayDate = isTemplate
    ? `Template — ${templateDaySlotLabel(day)}${day.weekNumber ? ` (Week ${day.weekNumber})` : ''}`
    : day
      ? new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';
  const dayNotesHtml = sanitizeWorkoutHtml(day.notes);

  return (
    <>
      {/* Screen Styles */}
      <style>{`
        ${WORKOUT_PRINT_CSS}
        .day-printable-content h1 {
          font-size: 18pt;
          margin-bottom: 10pt;
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 4pt;
        }
        .period-info, .day-notes {
          margin-bottom: 10pt;
          padding: 8pt;
          background: #f3f4f6;
          border-left: 3px solid #6366f1;
        }
        .workout-separator {
          margin: 18pt 0;
          page-break-before: auto;
        }
        @media screen {
          .day-print-modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }
          .day-print-modal.auto-print {
            opacity: 0;
            pointer-events: none;
          }
          .day-print-content-wrapper {
            background: white;
            border-radius: 8px;
            max-width: 1200px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      {/* Modal */}
      <div className={`day-print-modal ${shouldAutoPrint ? 'auto-print' : ''}`} role="dialog" aria-modal="true">
        <div className="day-print-content-wrapper">
          {/* Header - Not printed */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
            <h3 className="text-lg font-bold text-gray-900">Print Preview - Day Plan</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <FileDown className="w-4 h-4" />
                Save as PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Content - This will be extracted and printed */}
          <div className="day-printable-content p-6">
            {/* Day Header */}
            <h1 className="text-3xl font-bold text-blue-600 border-b-2 border-blue-600 pb-2 mb-4">
              📅 {dayDate}
            </h1>
            
            {/* Period Info */}
            {day.period && (
              <div className="period-info mb-4 p-3 bg-gray-100 border-l-4 border-indigo-500 rounded">
                <strong className="text-gray-700">Period:</strong>{' '}
                <span className="text-gray-900">{day.period.name}</span>
              </div>
            )}
            
            {/* Day Notes */}
            {dayNotesHtml && (
              <div className="day-notes mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <strong className="text-gray-700">Day Notes:</strong>{' '}
                <span className="text-gray-900" dangerouslySetInnerHTML={{ __html: dayNotesHtml }} />
              </div>
            )}

            {/* Workouts */}
            {day.workouts && day.workouts.length > 0 ? (
              day.workouts.map((workout: any, workoutIdx: number) => (
                <div key={workout.id} className="workout-separator">
                  <WorkoutPrintContent
                    workout={workout}
                    day={day}
                    activeSection={activeSection}
                    workoutLabel={`Workout ${workoutIdx + 1}: ${workout.name || `Session ${workout.sessionNumber || ''}`}`}
                  />
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic py-8 text-center">
                No workouts planned for this day.
              </p>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
              ✨ Generated by MovesBook
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
