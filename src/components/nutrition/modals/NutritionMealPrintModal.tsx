'use client';

import React, { useEffect } from 'react';
import { X, Printer, FileDown } from 'lucide-react';
import { getSportIcon } from '@/utils/sportIcons';
import { formatNutritionFoodType } from '@/constants/nutrition-food.constants';
import { sanitizeNutritionHtml } from '@/utils/sanitizeNutritionHtml';

interface MealPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any;
  day: any;
  autoPrint?: boolean;
  activeSection?: 'A' | 'B' | 'C' | 'D';
}

export default function MealPrintModal({
  isOpen,
  onClose,
  workout,
  day,
  autoPrint = false,
  activeSection = 'A'
}: MealPrintModalProps) {
  const [shouldAutoPrint, setShouldAutoPrint] = React.useState(autoPrint);

  const handlePrint = React.useCallback(() => {
    console.log('🖨️ handlePrint called for workout');
    
    // Reset auto-print flag to prevent loop
    setShouldAutoPrint(false);
    
    // Get the printable content (exclude buttons/header)
    const printableContent = document.querySelector('.workout-printable-content');
    if (!printableContent) {
      console.error('❌ Printable content not found');
      return;
    }
    console.log('✅ Printable content found, creating print window...');
    
    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    // Write the content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Workout - ${workout.name || 'Unnamed Workout'}</title>
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
            margin: 0;
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
          @page {
            size: A4;
            margin: 1.5cm;
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
  }, [workout.name]);

  // Trigger auto-print after modal content is rendered (only once)
  React.useEffect(() => {
    if (shouldAutoPrint && isOpen) {
      console.log('📋 Triggering auto-print for workout...');
      const timer = setTimeout(() => {
        handlePrint();
        // Reset flag and close modal immediately
        setShouldAutoPrint(false);
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, isOpen, handlePrint, onClose]);

  if (!isOpen || !workout) return null;

  const dayDate = day ? new Date(day.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : '';
  const workoutNotesHtml = sanitizeNutritionHtml(workout.notes);

  // Calculate workout totals
  const calculateTotals = () => {
    let totalDistance = 0;
    let totalTime = 0;
    const sports = new Set<string>();

    workout.nutritionFoods?.forEach((mf: any) => {
      sports.add(mf.sport);
      mf.nutritionComponents?.forEach((ml: any) => {
        if (ml.distance) totalDistance += parseFloat(ml.distance) || 0;
        if (ml.time) totalTime += parseFloat(ml.time) || 0;
      });
    });

    return {
      totalDistance: totalDistance > 0 ? totalDistance.toFixed(2) : null,
      totalTime: totalTime > 0 ? Math.round(totalTime) : null,
      sports: Array.from(sports)
    };
  };

  const totals = calculateTotals();

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
          .workout-print-modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.95);
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
            max-width: 1000px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      {/* Modal */}
      <div className={`workout-print-modal ${shouldAutoPrint ? 'auto-print' : ''}`} role="dialog" aria-modal="true">
        <div className="workout-print-content-wrapper">
          {/* Header - Not printed */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
            <h3 className="text-lg font-bold text-gray-900">Print Preview - Workout</h3>
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
          <div className="workout-printable-content p-6">
            {/* NutritionMeal Header */}
            <div className="mb-4">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-t">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    🏋️ {workout.name || `Workout ${workout.sessionNumber || ''}`}
                  </span>
                  {/* Show Day/Week info for sections B, C, D */}
                  {activeSection !== 'A' && day && (
                    <span className="text-sm">
                      {day.weekNumber && `Week ${day.weekNumber}`}
                      {day.weekNumber && dayDate && ' • '}
                      {dayDate}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-900">
                {workout.code || 'N/A'}
              </div>
              {workoutNotesHtml && (
                <div className="bg-yellow-50 px-4 py-2 text-sm border-l-4 border-yellow-400 mt-2">
                  <strong>Note:</strong> <span dangerouslySetInnerHTML={{ __html: workoutNotesHtml }} />
                </div>
              )}
            </div>
            
            {/* NutritionMeal Table - NutritionFoods and NutritionComponents */}
            {workout.nutritionFoods && workout.nutritionFoods.length > 0 ? (
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
                  {workout.nutritionFoods.map((mf: any, mfIdx: number) => {
                    const mfDescriptionHtml = sanitizeNutritionHtml(mf.description);
                    const mfNotesHtml = sanitizeNutritionHtml(mf.notes);
                    return (
                      <React.Fragment key={mf.id}>
                      {/* NutritionFood Row */}
                      <tr className={mfIdx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                        <td className="border border-gray-300 px-3 py-2 text-center font-semibold align-top">
                          {mf.letter || String.fromCharCode(65 + mfIdx)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center align-top">
                          {mf.sport}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center align-top">
                          {formatNutritionFoodType(mf.type || 'STANDARD')}
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
                          {mf.nutritionComponents?.length || 0}
                        </td>
                      </tr>
                      
                      {/* NutritionComponents Rows */}
                      {mf.nutritionComponents && mf.nutritionComponents.length > 0 && (
                        <>
                          {/* NutritionComponents Header */}
                          <tr className="bg-gray-100">
                            <td colSpan={5} className="border border-gray-300 px-3 py-1">
                              <div className="font-semibold text-xs">NutritionComponents Details:</div>
                            </td>
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-2 py-1 text-center text-xs">#</th>
                            <th className="border border-gray-300 px-2 py-1 text-center text-xs" colSpan={3}>Details</th>
                            <th className="border border-gray-300 px-2 py-1 text-center text-xs">Notes</th>
                          </tr>
                          {mf.nutritionComponents.map((ml: any, mlIdx: number) => {
                            const mlNotesHtml = sanitizeNutritionHtml(ml.notes);
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
              <p className="text-gray-500 italic py-8 text-center">
                No nutritionFoods in this workout.
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

