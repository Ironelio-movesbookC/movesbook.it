'use client';

import React from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import WorkoutPrintContent from '@/components/workouts/print/WorkoutPrintContent';
import { openWorkoutPrintWindow, WORKOUT_PRINT_CSS } from '@/lib/workoutPrintHelpers';

interface WorkoutPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  day: any;
  autoPrint?: boolean;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function WorkoutPrintModal({
  isOpen,
  onClose,
  workout,
  day,
  autoPrint = false,
  activeSection = 'A',
}: WorkoutPrintModalProps) {
  const [shouldAutoPrint, setShouldAutoPrint] = React.useState(autoPrint);

  const handlePrint = React.useCallback(() => {
    setShouldAutoPrint(false);
    const printableContent = document.querySelector('.workout-printable-content');
    if (!printableContent) return;
    const title = workout?.name || `Workout ${workout?.sessionNumber ?? ''}`;
    openWorkoutPrintWindow(printableContent.innerHTML, title);
  }, [workout?.name, workout?.sessionNumber]);

  React.useEffect(() => {
    if (shouldAutoPrint && isOpen) {
      const timer = setTimeout(() => {
        handlePrint();
        setShouldAutoPrint(false);
        onClose();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, isOpen, handlePrint, onClose]);

  if (!isOpen || !workout) return null;

  return (
    <>
      <style>{`
        @media screen {
          .workout-print-modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.92);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }
          .workout-print-modal.auto-print {
            opacity: 0;
            pointer-events: none;
          }
          .workout-print-content-wrapper {
            background: white;
            border-radius: 8px;
            max-width: 1100px;
            width: 100%;
            max-height: 92vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
          }
        }
        ${WORKOUT_PRINT_CSS}
      `}</style>

      <div
        className={`workout-print-modal ${shouldAutoPrint ? 'auto-print' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="workout-print-content-wrapper">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
            <h3 className="text-lg font-bold text-gray-900">Print preview — workout sheet</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                title="Opens print dialog — choose Save as PDF"
              >
                <FileDown className="w-4 h-4" />
                Save as PDF
              </button>
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="workout-printable-content p-6">
            <WorkoutPrintContent
              workout={workout}
              day={day}
              activeSection={activeSection}
            />
          </div>
        </div>
      </div>
    </>
  );
}
