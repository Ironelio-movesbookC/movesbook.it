'use client';

import React, { useEffect } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { formatMoveframeType } from '@/constants/moveframe.constants';
import { sanitizeWorkoutHtml } from '@/utils/sanitizeWorkoutHtml';

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
    console.log('🖨️ handlePrint called for day');
    
    // Reset auto-print flag to prevent loop
    setShouldAutoPrint(false);
    
    // Get the printable content (exclude buttons/header)
    const printableContent = document.querySelector('.day-printable-content');
    if (!printableContent) {
      console.error('❌ Printable content not found');
      return;
    }
    console.log('✅ Printable content found, creating print window...');
    
    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const dayDate = day ? new Date(day.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : '';
    
    // Write the content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Day Plan - ${dayDate}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 20px 0;
            font-size: 9pt;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          th {
            background: #e5e7eb;
            border: 1px solid #666;
            padding: 6pt 8pt;
            text-align: center;
            font-weight: bold;
            font-size: 8pt;
          }
          td {
            border: 1px solid #666;
            padding: 6pt 8pt;
            text-align: center;
            font-size: 8pt;
            vertical-align: top;
          }
          .bg-blue-50 {
            background: #eff6ff !important;
          }
          .bg-blue-600 {
            background: #2563eb !important;
            color: white !important;
            padding: 8pt 12pt;
            font-size: 12pt;
            font-weight: bold;
          }
          .bg-blue-100 {
            background: #dbeafe !important;
            padding: 4pt 12pt;
            font-size: 9pt;
            font-weight: bold;
          }
          .bg-yellow-50 {
            background: #fefce8 !important;
          }
          .bg-yellow-100 {
            background: #fef3c7 !important;
            border-left: 2px solid #f59e0b;
          }
          .bg-gray-50 {
            background: #f9fafb !important;
          }
          .bg-gray-100 {
            background: #f3f4f6 !important;
          }
          .bg-gray-200 {
            background: #e5e7eb !important;
          }
          .bg-white {
            background: white !important;
          }
          strong {
            font-weight: 600;
          }
          .text-left {
            text-align: left !important;
          }
          .text-center {
            text-align: center !important;
          }
          .align-top {
            vertical-align: top !important;
          }
          .space-y-1 > div {
            margin-bottom: 2pt;
          }
          .font-semibold {
            font-weight: 600;
          }
          .workout-separator {
            margin: 20pt 0;
            page-break-after: avoid;
          }
          h1 {
            font-size: 16pt;
            margin-bottom: 10pt;
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 4pt;
          }
          h2 {
            font-size: 12pt;
            margin: 15pt 0 8pt 0;
            color: #059669;
          }
          .period-info, .day-notes {
            margin-bottom: 10pt;
            padding: 6pt;
            background: #f3f4f6;
            border-left: 3px solid #6366f1;
          }
        </style>
      </head>
      <body>
        ${printableContent.innerHTML}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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

  const dayDate = day ? new Date(day.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : '';
  const dayNotesHtml = sanitizeWorkoutHtml(day.notes);

  // Format time in seconds to readable format
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <>
      {/* Screen Styles */}
      <style>{`
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
              day.workouts.map((workout: any, workoutIdx: number) => {
                const workoutNotesHtml = sanitizeWorkoutHtml(workout.notes);
                return (
                  <div key={workout.id} className="workout-separator mb-6">
                  {/* Workout Header */}
                  <div className="mb-4">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">
                          🏋️ Workout {workoutIdx + 1}: {workout.name || `Workout ${workout.sessionNumber || ''}`}
                        </span>
                        {activeSection !== 'A' && day && (
                          <span className="text-sm">
                            {day.weekNumber && `Week ${day.weekNumber}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-900">
                      {workout.code || 'N/A'}
                    </div>
                    {workoutNotesHtml && (
                      <div className="bg-yellow-50 px-4 py-2 text-sm border-l-4 border-yellow-400 mt-2">
                        <strong>Workout Note:</strong> <span dangerouslySetInnerHTML={{ __html: workoutNotesHtml }} />
                      </div>
                    )}
                  </div>
                  
                  {/* Workout Table - Moveframes and Movelaps */}
                  {workout.moveframes && workout.moveframes.length > 0 ? (
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold text-xs">MF</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold text-xs">Sport</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold text-xs">Type</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold text-xs">Description</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold text-xs">Laps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workout.moveframes.map((mf: any, mfIdx: number) => {
                          const mfDescriptionHtml = sanitizeWorkoutHtml(mf.description);
                          const mfNotesHtml = sanitizeWorkoutHtml(mf.notes);
                          return (
                            <React.Fragment key={mf.id}>
                            {/* Moveframe Row */}
                            <tr className={mfIdx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                              <td className="border border-gray-300 px-3 py-2 text-center font-semibold align-top">
                                {mf.letter || String.fromCharCode(65 + mfIdx)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center align-top">
                                {mf.sport}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center align-top">
                                {formatMoveframeType(mf.type || 'STANDARD')}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-left align-top">
                                {mfDescriptionHtml ? (
                                  <div dangerouslySetInnerHTML={{ __html: mfDescriptionHtml }} />
                                ) : (
                                  '-'
                                )}
                                {mfNotesHtml && (
                                  <div className="mt-2 p-2 bg-yellow-100 border-l-2 border-yellow-500 text-xs">
                                    <strong>Note:</strong>{' '}
                                    <span dangerouslySetInnerHTML={{ __html: mfNotesHtml }} />
                                  </div>
                                )}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center align-top">
                                {mf.movelaps?.length || 0}
                              </td>
                            </tr>
                            
                            {/* Movelaps Rows */}
                            {mf.movelaps && mf.movelaps.length > 0 && (
                              <>
                                {/* Movelaps Header */}
                                <tr className="bg-gray-100">
                                  <td colSpan={5} className="border border-gray-300 px-3 py-1">
                                    <div className="font-semibold text-xs">Movelaps Details:</div>
                                  </td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <th className="border border-gray-300 px-2 py-1 text-center text-xs">#</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center text-xs" colSpan={3}>Details</th>
                                  <th className="border border-gray-300 px-2 py-1 text-center text-xs">Notes</th>
                                </tr>
                                {mf.movelaps.map((ml: any, mlIdx: number) => {
                                  const mlNotesHtml = sanitizeWorkoutHtml(ml.notes);
                                  return (
                                    <tr key={ml.id} className="bg-white">
                                    <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                                      {ml.repetitionNumber || mlIdx + 1}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-left text-xs" colSpan={3}>
                                      <div className="space-y-1">
                                        {ml.distance && (
                                          <div><strong>Distance:</strong> {ml.distance} km</div>
                                        )}
                                        {ml.time && (
                                          <div><strong>Time:</strong> {formatTime(ml.time)}</div>
                                        )}
                                        {ml.speed && (
                                          <div><strong>Speed:</strong> {ml.speed} km/h</div>
                                        )}
                                        {ml.pace && (
                                          <div><strong>Pace:</strong> {ml.pace} min/km</div>
                                        )}
                                        {ml.style && (
                                          <div><strong>Style:</strong> {ml.style}</div>
                                        )}
                                        {ml.reps && (
                                          <div><strong>Reps:</strong> {ml.reps}</div>
                                        )}
                                        {ml.exercise && (
                                          <div><strong>Exercise:</strong> {ml.exercise}</div>
                                        )}
                                        {ml.pause && (
                                          <div><strong>Rest:</strong> {formatTime(ml.pause)}</div>
                                        )}
                                        {ml.restType && (
                                          <div><strong>Rest Type:</strong> {ml.restType}</div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-left text-xs">
                                      {mlNotesHtml ? (
                                        <div dangerouslySetInnerHTML={{ __html: mlNotesHtml }} />
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                  </tr>
                                  );
                                })}
                              </>
                            )}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 italic py-4 text-center text-sm">
                      No moveframes in this workout.
                    </p>
                  )}
                  </div>
                );
              })
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
