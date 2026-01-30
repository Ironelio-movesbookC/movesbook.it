'use client';

import { X } from 'lucide-react';
import { SPORT_OPTIONS } from '@/constants/workout.constants';
import { isSeriesBasedSport, shouldShowDistance, getDistanceUnit } from '@/constants/moveframe.constants';

interface DayInfoModalProps {
  isOpen: boolean;
  day: any;
  onClose: () => void;
  isTemplate?: boolean; // True for template plans (Section A)
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

    console.log('🔍 [DayInfoModal] Calculating day sports for day:', day.id);
    console.log('🔍 [DayInfoModal] Total workouts:', day.workouts?.length || 0);

    // Aggregate from all workouts in the day
    (day.workouts || []).forEach((workout: any, wIdx: number) => {
      console.log(`  🏋️ Workout ${wIdx + 1}: ${workout.moveframes?.length || 0} moveframes`);
      
      (workout.moveframes || []).forEach((mf: any, mfIdx: number) => {
        const sport = mf.sport || 'UNKNOWN';
        const isSeries = isSeriesBasedSport(sport);
        
        console.log(`    📋 MF ${mfIdx + 1} (${mf.letter}): Sport=${sport}, isSeries=${isSeries}, Movelaps=${mf.movelaps?.length || 0}`);
        
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
          console.log(`      ✏️ Manual Distance: +${manualDist}m`);
        }
        
        if (isSeries) {
          // For series-based sports (Body Building, etc.)
          // For manual mode: use repetitions field, for standard mode: count movelaps
          const seriesCount = mf.manualMode ? (mf.repetitions || 0) : (mf.movelaps?.length || 0);
          currentTotals.series += seriesCount;
          console.log(`      📊 Series (sets): +${seriesCount}`);
          
          // Sum actual reps from all movelaps
          (mf.movelaps || []).forEach((lap: any, lapIdx: number) => {
            const reps = parseInt(lap.reps) || 0;
            if (reps > 0) {
              currentTotals.repetitions += reps;
              console.log(`      💪 Lap ${lapIdx + 1}: +${reps} reps`);
            }
          });
        } else {
          // For distance-based sports: sum distances and duration from movelaps
          (mf.movelaps || []).forEach((lap: any, lapIdx: number) => {
            // Add distance
            const dist = parseInt(lap.distance) || 0;
            if (dist > 0) {
              currentTotals.distance += dist;
              console.log(`      📏 Lap ${lapIdx + 1}: +${dist}m distance`);
            }
            
            // Add duration (parse time in various formats: "1h23'45"6", "00:05:30", or minutes)
            const timeStr = lap.time?.toString() || '';
            if (timeStr) {
              let totalMins = 0;
              
              // Check for our custom format: 1h23'45"6
              if (timeStr.includes('h') || timeStr.includes("'")) {
                const match = timeStr.match(/(\d+)h(\d+)'(\d+)"(\d)?/);
                if (match) {
                  const hours = parseInt(match[1]) || 0;
                  const minutes = parseInt(match[2]) || 0;
                  const seconds = parseInt(match[3]) || 0;
                  const deciseconds = parseInt(match[4]) || 0;
                  totalMins = (hours * 60) + minutes + (seconds / 60) + (deciseconds / 600);
                }
              }
              // Check for HH:MM:SS format
              else if (timeStr.includes(':')) {
                const parts = timeStr.split(':');
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                totalMins = (hours * 60) + minutes + (seconds / 60);
              }
              // Plain number (minutes)
              else {
                totalMins = parseFloat(timeStr) || 0;
              }
              
              if (totalMins > 0) {
                currentTotals.durationMinutes += totalMins;
                console.log(`      ⏱️ Lap ${lapIdx + 1}: +${totalMins.toFixed(2)}min time`);
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
      
      console.log(`  🏅 Sport ${sportValue}: distance=${totals.distance}m, duration=${totals.durationMinutes.toFixed(2)}min, series=${totals.series}, reps=${totals.repetitions}`);
      
      return {
        sport: sportValue,
        details: sportOption,
        isSeriesBased: isSeries,
        ...totals
      };
    });

    // Sort alphabetically
    return sportsArray.sort((a, b) => a.sport.localeCompare(b.sport));
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
  
  // Calculate day totals - include ALL sports in aggregation
  const dayTotals = {
    totalDistance: sports.reduce((sum, s) => sum + s.distance, 0), // All sports contribute distance
    totalDuration: sports.reduce((sum, s) => sum + s.durationMinutes, 0), // All sports contribute duration
    totalSeries: sports.reduce((sum, s) => sum + s.series, 0), // All sports contribute series count
    totalReps: sports.reduce((sum, s) => sum + s.repetitions, 0), // All sports contribute reps
    totalMoveframes: sports.reduce((sum, s) => sum + s.moveframeCount, 0),
    totalMovelaps: sports.reduce((sum, s) => sum + s.movelapCount, 0),
    totalWorkouts: day.workouts?.length || 0
  };
  
  console.log('📊 [DayInfoModal] Final day totals:', dayTotals);
  
  // Format duration as HH:MM or MM:SS
  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes === 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' });

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
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-600 text-white shadow-lg">
          <div>
            <h2 id="modal-title" className="text-xl font-bold flex items-center gap-2">
              <span>📅</span>
              <span>DAY INFORMATION</span>
            </h2>
            <p className="text-sm text-blue-50 mt-1 flex items-center gap-2">
              <span className="font-medium">{day.period?.name || 'No Period'}</span>
              <span className="text-blue-200">•</span>
              <span>{dayName}</span>
              <span className="text-blue-200">•</span>
              <span>Week {day.weekNumber || '?'}</span>
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
              {!isTemplate && (
                <>
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-600 font-medium">Day:</span>
                    <span className="text-sm text-gray-900 font-semibold text-right">{dayName}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-600 font-medium">Date:</span>
                    <span className="text-sm text-gray-900 font-semibold">
                      {new Date(day.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600 font-medium">Week Number:</span>
                <span className="text-sm text-gray-900 font-semibold">Week {day.weekNumber || '—'}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Sessions:</span>
                <span className="text-sm text-gray-900 font-semibold">{dayTotals.totalWorkouts}</span>
              </div>
              {mainSportsWithWorkoutNumbers.length > 0 && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-gray-600 font-medium">Main Sport{mainSportsWithWorkoutNumbers.length > 1 ? 's' : ''} (Note):</span>
                  <span className="text-sm text-gray-900 font-semibold text-right max-w-[60%]">
                    {mainSportsDisplay}
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between">
                <span className="text-sm text-gray-600 font-medium">Period:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: day.period?.color || '#9CA3AF' }}
                  />
                  <span className="text-sm text-gray-900 font-semibold">{day.period?.name || 'No Period'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Day Notes */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>📝</span>
              <span>Day Notes</span>
            </h3>
            <div className="relative">
              {dayNotes ? (
                <div 
                  className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm bg-white min-h-[100px] max-h-[300px] overflow-y-auto"
                  style={{ 
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    lineHeight: '1.6'
                  }}
                  dangerouslySetInnerHTML={{ __html: dayNotes }}
                />
              ) : (
                <div className="w-full px-3 py-2.5 border border-amber-300 rounded-lg text-sm bg-white min-h-[100px] text-gray-400 italic">
                  No notes for this day
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              These notes apply to the entire day across all workouts. Use "Edit Day" to modify notes.
            </p>
          </div>

          {/* Workouts Summary */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>🏋️</span>
              <span>Workouts Summary</span>
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Workouts:</span>
                <span className="text-sm text-gray-900 font-semibold">{dayTotals.totalWorkouts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Sports:</span>
                <span className="text-sm text-gray-900 font-semibold">{sports.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Moveframes:</span>
                <span className="text-sm text-gray-900 font-semibold">{dayTotals.totalMoveframes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Total Movelaps:</span>
                <span className="text-sm text-gray-900 font-semibold">{dayTotals.totalMovelaps}</span>
              </div>
            </div>
          </div>

          {/* Sports Breakdown */}
          {sports.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>🏅</span>
                <span>Sports in This Day ({sports.length})</span>
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Aggregated from all workouts and moveframes in this day.
              </p>
              <div className="space-y-3">
                {sports.map((sport: any, index: number) => (
                  <div 
                    key={index}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {/* Sport Icon */}
                      <div className={`w-12 h-12 rounded-full ${sport.details?.color || 'bg-gray-200'} flex items-center justify-center text-xl font-bold text-white shadow-md flex-shrink-0`}>
                        {sport.details?.icon || '?'}
                      </div>
                      
                      {/* Sport Details */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-gray-800 mb-1">
                          {sport.details?.label || sport.sport.replace(/_/g, ' ')}
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Moveframes:</span>
                            <span className="font-semibold text-purple-600">{sport.moveframeCount}</span>
                          </div>
                          
                          {sport.isSeriesBased ? (
                            // Series-based sports (Gymnastic, Stretching, etc.)
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Series:</span>
                                <span className="font-semibold text-purple-600">{sport.series}</span>
                              </div>
                              <div className="flex items-center gap-1 col-span-2">
                                <span className="text-gray-500">Total Reps:</span>
                                <span className="font-semibold text-blue-600">
                                  {sport.repetitions > 0 ? sport.repetitions : '—'}
                                </span>
                              </div>
                            </>
                          ) : (
                            // Distance-based sports (Swim, Bike, Run, etc.)
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Movelaps:</span>
                                <span className="font-semibold text-purple-600">{sport.movelapCount}</span>
                              </div>
                              {shouldShowDistance(sport.sport) && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Distance:</span>
                                  <span className="font-semibold text-blue-600">
                                    {sport.distance > 0 ? `${sport.distance}${getDistanceUnit(sport.sport)}` : '—'}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Duration:</span>
                                <span className="font-semibold text-green-600">
                                  {formatDuration(sport.durationMinutes)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day Totals */}
          {dayTotals.totalMoveframes > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>📊</span>
                <span>Day Totals</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 mb-1">Total Distance</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {dayTotals.totalDistance > 0 ? `${dayTotals.totalDistance}m` : '—'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 mb-1">Total Duration</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(dayTotals.totalDuration)}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 mb-1">Total Series</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {dayTotals.totalSeries > 0 ? dayTotals.totalSeries : '—'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="text-xs text-gray-500 mb-1">Total Reps</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {dayTotals.totalReps > 0 ? dayTotals.totalReps : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {sports.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 italic mb-2">No workouts or moveframes added yet</p>
              <p className="text-xs text-gray-400">Add workouts with moveframes to see day statistics</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gradient-to-r from-gray-50 to-cyan-50">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

