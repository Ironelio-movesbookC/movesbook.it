'use client';

import React from 'react';
import { X } from 'lucide-react';
import { sanitizeNutritionHtml } from '@/utils/sanitizeNutritionHtml';

interface ActivityOverviewPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    totalWorkouts: number;
    totalDuration: number;
    totalDistance: number;
  };
  recentWorkouts: any[];
  autoPrint?: boolean;
}

export default function ActivityOverviewPrintModal({
  isOpen,
  onClose,
  stats,
  recentWorkouts,
  autoPrint = false
}: ActivityOverviewPrintModalProps) {
  // Debug logging
  React.useEffect(() => {
    console.log('🎯 ActivityOverviewPrintModal - isOpen:', isOpen);
    console.log('📊 ActivityOverviewPrintModal - stats:', stats);
    console.log('📝 ActivityOverviewPrintModal - recentWorkouts:', recentWorkouts);
  }, [isOpen, stats, recentWorkouts]);

  // Auto-trigger print if autoPrint is true
  React.useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) {
    console.log('❌ Modal not open, returning null');
    return null;
  }
  
  console.log('✅ Modal IS OPEN, rendering...');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Screen Only) */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold">Activity Overview - Print Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-8">
          {/* Document Header */}
          <div className="mb-8 pb-4 border-b-2 border-gray-300">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Overview</h1>
              <p className="text-lg text-gray-600">
                Generated on {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Statistics</h2>
            <div className="grid grid-cols-3 gap-6">
              {/* Total Workouts */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium opacity-90">Total Workouts</h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">{stats.totalWorkouts}</p>
                <p className="text-xs mt-2 opacity-75">Sessions completed</p>
              </div>

              {/* Total Duration */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium opacity-90">Total Duration</h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">{Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m</p>
                <p className="text-xs mt-2 opacity-75">Training time</p>
              </div>

              {/* Total Distance */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium opacity-90">Total Distance</h3>
                  <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-4xl font-bold">{(stats.totalDistance / 1000).toFixed(1)} km</p>
                <p className="text-xs mt-2 opacity-75">Distance covered</p>
              </div>
            </div>
          </div>

          {/* Recent Workouts */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Workouts</h2>
            <div className="space-y-3">
              {recentWorkouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent workouts found.</p>
                  <p className="text-sm mt-2">Start planning your workouts to see them here!</p>
                </div>
              ) : (
                recentWorkouts.map((workout, index) => {
                  const notesHtml = sanitizeNutritionHtml(workout.notes);
                  return (
                    <div 
                      key={workout.id || index} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{workout.name || 'Untitled Workout'}</h3>
                      <span className="text-sm text-gray-500">{workout.date}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-2 font-medium text-gray-900">{workout.duration || '0h 0m'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Distance:</span>
                        <span className="ml-2 font-medium text-gray-900">{workout.distance || '0 km'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sport:</span>
                        <span className="ml-2 font-medium text-gray-900">{workout.sport || 'N/A'}</span>
                      </div>
                    </div>
                    {notesHtml && (
                      <div className="text-sm text-gray-600 mt-2 italic">
                        <span dangerouslySetInnerHTML={{ __html: notesHtml }} />
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer (Screen Only) */}
        <div className="border-t bg-gray-50 p-4 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Overview
          </button>
        </div>
      </div>
    </div>
  );
}

