'use client';

import { X, Info } from 'lucide-react';
import { SPORT_OPTIONS } from '@/constants/workout.constants';
import { isSeriesBasedSport, shouldShowDistance, getDistanceUnit } from '@/constants/moveframe.constants';
import { stripInternalWorkoutTags } from '@/utils/sanitizeWorkoutHtml';

interface DayInfoModalProps {
  isOpen: boolean;
  day: any;
  onClose: () => void;
  isTemplate?: boolean; // True for template plans (Section A)
}

function plainDayInfo(notes: string | null | undefined): string {
  if (!notes?.trim()) return '—';
  return stripInternalWorkoutTags(notes).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '—';
}

function formatDurationShort(minutes: number): string {
  if (!minutes || minutes === 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }
  return `${mins}m`;
}

export default function DayInfoModal({
  isOpen,
  day,
  onClose,
  isTemplate = false
}: DayInfoModalProps) {
  if (!isOpen || !day) return null;

  const dayNotes = day.notes || '';
  
  // Calculate sports from all workouts in the day
  const calculateDaySports = () => {
    const sportMap = new Map<string, {
      distance: number;
      durationMinutes: number;
      series: number;
      repetitions: number;
      moveframeCount: number;
      movelapCount: number;
      workoutCount: number;
    }>();

    // Aggregate from all workouts in the day
    (day.workouts || []).forEach((workout: any) => {
      (workout.moveframes || []).forEach((mf: any) => {
        const sport = mf.sport || 'UNKNOWN';
        const isSeries = isSeriesBasedSport(sport);

        const currentTotals = sportMap.get(sport) || {
          distance: 0,
          durationMinutes: 0,
          series: 0,
          repetitions: 0,
          moveframeCount: 0,
          movelapCount: 0,
          workoutCount: 0
        };

        currentTotals.moveframeCount += 1;
        currentTotals.movelapCount += (mf.movelaps || []).length;
        
        // Check for manualDistance if available
        if (mf.manualMode && mf.manualDistance) {
          const manualDist = parseInt(mf.manualDistance) || 0;
          currentTotals.distance += manualDist;
        }

        if (isSeries) {
          const seriesCount = mf.manualMode ? (mf.repetitions || 0) : (mf.movelaps?.length || 0);
          currentTotals.series += seriesCount;

          (mf.movelaps || []).forEach((lap: any) => {
            const reps = parseInt(lap.reps) || 0;
            if (reps > 0) {
              currentTotals.repetitions += reps;
            }
          });
        } else {
          (mf.movelaps || []).forEach((lap: any) => {
            const dist = parseInt(lap.distance) || 0;
            if (dist > 0) {
              currentTotals.distance += dist;
            }

            const timeStr = lap.time?.toString() || '';
            if (timeStr) {
              let totalMins = 0;

              if (timeStr.includes('h') || timeStr.includes("'")) {
                const match = timeStr.match(/(\d+)h(\d+)'(\d+)"(\d)?/);
                if (match) {
                  const hours = parseInt(match[1]) || 0;
                  const minutes = parseInt(match[2]) || 0;
                  const seconds = parseInt(match[3]) || 0;
                  const deciseconds = parseInt(match[4]) || 0;
                  totalMins = (hours * 60) + minutes + (seconds / 60) + (deciseconds / 600);
                }
              } else if (timeStr.includes(':')) {
                const parts = timeStr.split(':');
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                totalMins = (hours * 60) + minutes + (seconds / 60);
              } else {
                totalMins = parseFloat(timeStr) || 0;
              }

              if (totalMins > 0) {
                currentTotals.durationMinutes += totalMins;
              }
            }
          });
        }

        sportMap.set(sport, currentTotals);
      });
    });

    // Convert to array with sport details
    const sportsArray = Array.from(sportMap.entries()).map(([sportValue, totals]) => {
      const sportOption = SPORT_OPTIONS.find(s => s.value === sportValue);
      const isSeries = isSeriesBasedSport(sportValue);

      return {
        sport: sportValue,
        details: sportOption,
        isSeriesBased: isSeries,
        ...totals
      };
    });

    return sportsArray.sort((a, b) => a.sport.localeCompare(b.sport)).slice(0, 4);
  };

  const sports = calculateDaySports();
  
  // Get all main sports from workouts with their workout numbers
  const mainSportsWithWorkoutNumbers = (day.workouts || [])
    .map((workout: any, index: number) => ({
      sport: workout.mainSport,
      workoutNumber: index + 1,
      sessionNumber: workout.sessionNumber || index + 1
    }))
    .filter((item: any) => item.sport && item.sport.trim() !== '');
  
  // Format main sports as: "Sport (1), Sport (2)"
  const mainSportsDisplay = mainSportsWithWorkoutNumbers
    .map((item: any) => {
      const sportOption = SPORT_OPTIONS.find(s => s.value === item.sport);
      const sportName = sportOption?.label || item.sport;
      return `${sportName} (${item.workoutNumber})`;
    })
    .join(', ');
  
  const totalSessions = day.workouts?.length || 0;
  const dayInfoText = plainDayInfo(dayNotes);
  const dateLabel = new Date(day.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const seriesRepsLabel = (sport: any) => {
    if (sport.isSeriesBased) {
      const val = sport.repetitions > 0 ? sport.repetitions : sport.series;
      return val > 0 ? val : 0;
    }
    return sport.series > 0 ? sport.series : 0;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] animate-fadeIn p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto animate-slideUp mx-auto"
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-lg">
          <div>
            <h2 id="modal-title" className="text-xl font-bold flex items-center gap-2">
              <span>DAY INFORMATION</span>
              <Info className="w-5 h-5 opacity-80" aria-hidden />
            </h2>
            <p className="text-sm text-blue-50 mt-1 flex items-center gap-2">
              <span className="font-medium">{day.period?.name || 'No Period'}</span>
              <span className="text-blue-200">•</span>
              <span>{dateLabel}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-all hover:rotate-90 duration-300"
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>📋</span>
              <span>Basic Information</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-600 font-medium shrink-0">Day info:</span>
                <span className="text-sm text-gray-900 font-semibold text-right">{dayInfoText}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600 font-medium">Total sessions:</span>
                <span className="text-sm text-gray-900 font-semibold">#{totalSessions}</span>
              </div>
            </div>
          </div>

          {/* Main Sport (Note) — only when selected on any workout */}
          {mainSportsWithWorkoutNumbers.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>🏆</span>
                <span>Main Sport (Note)</span>
              </h3>
              <div className="w-full px-3 py-2.5 border border-indigo-300 rounded-lg text-sm bg-white text-gray-900">
                {mainSportsDisplay}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This is a note field that can be freely edited and does not affect workout structure.
              </p>
            </div>
          )}

          {/* Sports from Moveframes */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>🏅</span>
              <span>Sports from Moveframes ({sports.length}/4)</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              These sports are automatically loaded from moveframes and cannot be edited directly.
            </p>
            {sports.length > 0 ? (
              <div className="space-y-3">
                {sports.map((sport: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full ${sport.details?.color || 'bg-gray-200'} flex items-center justify-center text-xl font-bold text-white shadow-md flex-shrink-0`}>
                        {sport.details?.icon || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-gray-800 mb-2">
                          {sport.details?.label || sport.sport.replace(/_/g, ' ')}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Moveframes:</span>
                            <span className="font-semibold text-purple-600">{sport.moveframeCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Distance:</span>
                            <span className="font-semibold text-blue-600">
                              {shouldShowDistance(sport.sport) && sport.distance > 0
                                ? `${sport.distance}${getDistanceUnit(sport.sport)}`
                                : sport.distance > 0
                                  ? `${sport.distance}m`
                                  : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Series/Reps:</span>
                            <span className="font-semibold text-purple-600">{seriesRepsLabel(sport)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Duration:</span>
                            <span className="font-semibold text-green-600">
                              {formatDurationShort(sport.durationMinutes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 italic">No moveframes added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gradient-to-r from-gray-50 to-blue-50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-white hover:border-gray-400 transition-all font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

