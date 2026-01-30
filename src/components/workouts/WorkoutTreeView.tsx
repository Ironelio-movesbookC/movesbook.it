'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Dumbbell, Flag } from 'lucide-react';
import { useColorSettings } from '@/hooks/useColorSettings';
import { useSportIconType } from '@/hooks/useSportIconType';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';

// 2026-01-22 14:45 UTC - Helper to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface WorkoutTreeViewProps {
  workoutPlan: any;
  activeSection?: 'A' | 'B' | 'C' | 'D';
  iconType?: 'emoji' | 'icon'; // Optional icon type override from parent
  expandedDays?: Set<string>;
  expandedWorkouts?: Set<string>;
  expandedWeeks?: Set<number>; // External week expansion control
  expandState?: number; // 0 = collapsed, 1 = workouts visible, 2 = moveframes visible
  onWeekClick?: (weekNumber: number) => void;
  onDayClick?: (day: any) => void;
  onToggleDay?: (dayId: string) => void;
  onToggleWorkout?: (workoutId: string) => void;
  onToggleWeek?: (weekNumber: number) => void;
  onSaveFavoriteWeek?: (week: any) => void;
}

export default function WorkoutTreeView({
  workoutPlan,
  activeSection = 'A',
  iconType: iconTypeProp,
  expandedDays: externalExpandedDays,
  expandedWorkouts: externalExpandedWorkouts,
  expandedWeeks: externalExpandedWeeks,
  expandState = 0,
  onWeekClick,
  onDayClick,
  onToggleDay,
  onToggleWorkout,
  onToggleWeek,
  onSaveFavoriteWeek
}: WorkoutTreeViewProps) {
  // Use external expansion states if provided, otherwise use local state
  const [localExpandedWeeks, setLocalExpandedWeeks] = useState<Set<number>>(new Set());
  const [localExpandedDays, setLocalExpandedDays] = useState<Set<string>>(new Set());
  const [localExpandedWorkouts, setLocalExpandedWorkouts] = useState<Set<string>>(new Set());
  const [expandedMoveframes, setExpandedMoveframes] = useState<Set<string>>(new Set());
  
  // Use external states if provided, otherwise use local state
  const expandedWeeks = externalExpandedWeeks || localExpandedWeeks;
  const expandedDays = externalExpandedDays || localExpandedDays;
  const expandedWorkouts = externalExpandedWorkouts || localExpandedWorkouts;
  const { colors, getBorderStyle } = useColorSettings();
  const defaultIconType = useSportIconType();
  const [localIconType, setLocalIconType] = useState<'emoji' | 'icon'>(defaultIconType);
  const iconType = iconTypeProp || localIconType;
  const useImageIcons = isImageIcon(iconType);
  
  // Helper to get contrast color for values (text should be visible against backgrounds)
  const getValueTextColor = () => colors.workoutHeaderText || '#2386d1';
  const getMainWorkColor = () => colors.moveframeHeaderText || '#f61909';
  const getSecondaryWorkColor = () => colors.workout2HeaderText || '#9a3412';
  const getToolsColor = () => colors.buttonAdd || '#10b981';
  const getIndicatorActiveColor = () => colors.buttonAdd || '#10b981';
  const getIndicatorInactiveColor = () => colors.alternateRowText || '#64748b';
  
  // Load icon type from localStorage on mount (only if no prop provided)
  useEffect(() => {
    if (!iconTypeProp) {
      const saved = localStorage.getItem('sportIconType');
      if (saved === 'icon' || saved === 'emoji') {
        setLocalIconType(saved);
      }
    }
  }, [iconTypeProp]);

  const toggleWeek = (weekNumber: number) => {
    // If parent provided a toggle callback, use it
    if (onToggleWeek) {
      onToggleWeek(weekNumber);
      return;
    }
    
    // Otherwise use local state
    setLocalExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekNumber)) {
        newSet.delete(weekNumber);
      } else {
        newSet.add(weekNumber);
      }
      return newSet;
    });
  };

  const toggleDay = (dayId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent triggering onDayClick
    if (onToggleDay) {
      onToggleDay(dayId);
    } else {
      setLocalExpandedDays(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dayId)) {
          newSet.delete(dayId);
        } else {
          newSet.add(dayId);
        }
        return newSet;
      });
    }
  };

  const toggleWorkout = (workoutId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onToggleWorkout) {
      onToggleWorkout(workoutId);
    } else {
      setLocalExpandedWorkouts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(workoutId)) {
          newSet.delete(workoutId);
        } else {
          newSet.add(workoutId);
        }
        return newSet;
      });
    }
  };

  const toggleMoveframe = (moveframeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMoveframes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moveframeId)) {
        newSet.delete(moveframeId);
      } else {
        newSet.add(moveframeId);
      }
      return newSet;
    });
  };

  // Get weeks from the workout plan (already filtered by WorkoutSection)
  const weeks = workoutPlan?.weeks || [];

  // Get date range for a week (hide for Section A - template mode)
  const getWeekDateRange = (week: any) => {
    // Section A is template mode - don't show dates
    if (activeSection === 'A') return '';
    
    if (!week.days || week.days.length === 0) return '';
    
    const firstDay = new Date(week.days[0].date);
    const lastDay = new Date(week.days[week.days.length - 1].date);
    
    return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Count total workouts in a week
  const countWeekWorkouts = (week: any) => {
    if (!week.days) return 0;
    return week.days.reduce((total: number, day: any) => {
      return total + (day.workouts?.length || 0);
    }, 0);
  };

  return (
    <div className="space-y-2 p-4">
      {weeks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No weeks planned for Section {activeSection}</p>
          <p className="text-sm mt-2">Click "Add New Day" to start planning</p>
        </div>
      ) : (
        weeks.map((week: any) => {
          const isExpanded = expandedWeeks.has(week.weekNumber);
          const totalWorkouts = countWeekWorkouts(week);
          const dateRange = getWeekDateRange(week);
          
          const borderStyle = getBorderStyle('day');
          
          return (
            <div 
              key={week.id} 
              className="rounded-lg overflow-hidden shadow-lg"
              style={{ 
                border: borderStyle || '2px solid #d1d5db',
                backgroundColor: colors.pageBackground || '#ffffff'
              }}
            >
              {/* Week Header - Level 1 (Thickest) */}
              <div className="w-full flex items-center justify-between px-4 py-4" style={{
                backgroundColor: colors.weekHeader,
                color: colors.weekHeaderText,
                borderBottom: '3px solid rgba(0,0,0,0.15)',
                fontWeight: '700'
              }}>
                <button
                  onClick={() => toggleWeek(week.weekNumber)}
                  className="flex items-center gap-3 hover:opacity-80 transition-all"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-6 h-6 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-6 h-6 flex-shrink-0" />
                  )}
                  <div className="text-left">
                    <div className="font-bold text-xl">WEEK {week.weekNumber}</div>
                    <div className="text-xs opacity-80 mt-1">
                      {week.days?.length || 0} days • {totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''} planned
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold opacity-90">
                    {dateRange}
                  </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      if (onSaveFavoriteWeek) {
                        onSaveFavoriteWeek(week);
                      }
                      }}
                      className="px-3 py-1.5 text-xs rounded-md transition-colors bg-yellow-500 bg-opacity-90 hover:bg-opacity-100 text-white font-semibold shadow-md hover:shadow-lg flex items-center gap-1.5"
                      title="Save this week in favourites"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      Save
                    </button>
                </div>
              </div>

              {/* Expanded Days */}
              {isExpanded && week.days && (
                <div>
                  {week.days.map((day: any, index: number) => {
                    // Section A is template mode - use generic day names
                    const isTemplateMode = activeSection === 'A';
                    const dayDate = new Date(day.date);
                    const dayName = isTemplateMode 
                      ? `Day ${index + 1}` 
                      : dayDate.toLocaleDateString('en-US', { weekday: 'long' });
                    const dayDateStr = isTemplateMode 
                      ? '' 
                      : dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const workoutCount = day.workouts?.length || 0;
                    const isEvenDay = index % 2 === 0;
                    const isDayExpanded = expandedDays.has(day.id);

                    return (
                      <div key={day.id}>
                        {/* Day Header - Level 2 */}
                        <div
                          onClick={(e) => {
                            // Only toggle if not clicking on a button
                            const target = e.target as HTMLElement;
                            if (!target.closest('button')) {
                              toggleDay(day.id);
                            }
                          }}
                          className="border-t px-6 py-3 hover:bg-opacity-95 cursor-pointer transition-all"
                          style={{
                            backgroundColor: isEvenDay ? colors.dayAlternateRow : colors.dayHeader,
                            color: isEvenDay ? colors.dayAlternateRowText : colors.dayHeaderText,
                            borderTop: getBorderStyle('day') || '2px solid rgba(0,0,0,0.12)',
                            fontWeight: '600'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Expand/Collapse icon */}
                              <button
                                onClick={(e) => toggleDay(day.id, e)}
                                className="hover:opacity-70"
                              >
                                {isDayExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: workoutCount > 0 ? getIndicatorActiveColor() : getIndicatorInactiveColor()
                                }}
                              />
                              <div>
                                <div className="font-semibold">{dayName}</div>
                                {dayDateStr && <div className="text-xs opacity-70">{dayDateStr}</div>}
                              </div>
                              
                              {/* Workout count and summaries with visual style */}
                              <div className="flex items-center gap-2 ml-4 flex-wrap">
                                <span className="text-sm font-medium">
                                  {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
                                </span>
                                {workoutCount > 0 && (
                                  <>
                                    {day.workouts.map((workout: any, workoutIndex: number) => {
                                      // Calculate sport summaries for this workout
                                      const sportData = new Map<string, { value: number; isSeriesBased: boolean }>();
                                      
                                      if (workout.moveframes) {
                                        workout.moveframes.forEach((mf: any) => {
                                          if (mf.sport) {
                                            const isSeriesBased = !['SWIM', 'BIKE', 'SPINNING', 'RUN', 'ROWING', 'SKATE', 'SKI', 'HIKING', 'WALKING'].includes(mf.sport);
                                            
                                            if (!sportData.has(mf.sport)) {
                                              sportData.set(mf.sport, { value: 0, isSeriesBased });
                                            }
                                            
                                            const data = sportData.get(mf.sport)!;
                                            
                                            if (isSeriesBased) {
                                              data.value += mf.movelaps?.length || 0;
                                            } else {
                                              if (mf.movelaps) {
                                                mf.movelaps.forEach((lap: any) => {
                                                  data.value += lap.distance || 0;
                                                });
                                              }
                                            }
                                          }
                                        });
                                      }
                                      
                                      return (
                                        <React.Fragment key={workout.id}>
                                          {workoutIndex > 0 && (
                                            <span className="text-sm font-bold mx-1">+</span>
                                          )}
                                          {Array.from(sportData.entries()).map(([sport, data]) => {
                                            const sportIcon = getSportIcon(sport, iconType);
                                            const displayValue = data.value > 0 
                                              ? (data.isSeriesBased ? `${data.value} series` : `${data.value}m`)
                                              : '—';
                                            return (
                                              <div
                                                key={`${workout.id}-${sport}`}
                                                className="flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold"
                                                style={{ 
                                                  backgroundColor: 'rgba(255,255,255,0.25)',
                                                  border: '1px solid rgba(0,0,0,0.1)'
                                                }}
                                              >
                                                {useImageIcons ? (
                                                  <img src={sportIcon} alt={sport} className="w-12 h-12 object-cover rounded" />
                                                ) : (
                                                  <span className="text-5xl">{sportIcon}</span>
                                                )}
                                                <span className="text-xs">{sport.replace(/_/g, ' ')}</span>
                                                {data.value > 0 && (
                                                  <span className="text-sm font-bold ml-1" style={{ color: getValueTextColor() }}>
                                                    {displayValue}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </React.Fragment>
                                      );
                                    })}
                                  </>
                                )}
                            </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDayClick?.(day);
                                }}
                                className="text-xs px-3 py-1 rounded font-medium transition-colors"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.2)',
                                  color: 'inherit'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                                }}
                                title="Switch to table view"
                              >
                                Open →
                              </button>
                          </div>
                        </div>

                        {/* Expanded Workouts */}
                        {isDayExpanded && workoutCount > 0 && (
                          <div style={{ backgroundColor: colors.pageBackground || '#f9fafb' }}>
                            {day.workouts.map((workout: any, workoutIndex: number) => {
                              // Get unique sports from moveframes and calculate total distance/series per sport
                              const sportData = new Map<string, { value: number; isSeriesBased: boolean }>();
                              let totalMoveframes = 0;
                              
                              if (workout.moveframes) {
                                workout.moveframes.forEach((mf: any) => {
                                  if (mf.sport) {
                                    const isSeriesBased = !['SWIM', 'BIKE', 'SPINNING', 'RUN', 'ROWING', 'SKATE', 'SKI', 'HIKING', 'WALKING'].includes(mf.sport);
                                    
                                    if (!sportData.has(mf.sport)) {
                                      sportData.set(mf.sport, { value: 0, isSeriesBased });
                                    }
                                    
                                    const data = sportData.get(mf.sport)!;
                                    
                                    if (isSeriesBased) {
                                      // For NON-AEROBIC sports: count total series
                                      if (mf.manualMode) {
                                        // For manual input: use movelaps count as series
                                        data.value += mf.movelaps?.length || 0;
                                      } else {
                                        // For standard mode: use movelaps count
                                        data.value += mf.movelaps?.length || 0;
                                      }
                                    } else {
                                      // For AEROBIC sports: sum distances from all movelaps
                                      if (mf.movelaps) {
                                        mf.movelaps.forEach((lap: any) => {
                                          data.value += lap.distance || 0;
                                        });
                                      }
                                    }
                                  }
                                });
                                totalMoveframes = workout.moveframes.length;
                              }
                              
                              // Find main and secondary work descriptions per sport
                              const workDescriptions = new Map<string, { main: string | null; secondary: string | null }>();
                              if (workout.moveframes) {
                                workout.moveframes.forEach((mf: any) => {
                                  if (mf.sport && mf.workType) {
                                    if (!workDescriptions.has(mf.sport)) {
                                      workDescriptions.set(mf.sport, { main: null, secondary: null });
                                    }
                                    const desc = workDescriptions.get(mf.sport)!;
                                    
                                    // Get description (prefer manual content over regular description)
                                    const mfDescription = mf.manualMode && mf.notes ? mf.notes : mf.description;
                                    
                                    if (mf.workType === 'MAIN' && !desc.main) {
                                      desc.main = mfDescription || 'Main work';
                                    } else if (mf.workType === 'SECONDARY' && !desc.secondary) {
                                      desc.secondary = mfDescription || 'Secondary work';
                                    }
                                  }
                                });
                              }
                              
                              const isWorkoutExpanded = expandedWorkouts.has(workout.id);

                              return (
                                <div key={workout.id}>
                                  {/* Workout Row - Third Level (Indented from Day) */}
                                  <div>
                                    <button
                                      onClick={(e) => toggleWorkout(workout.id, e)}
                                      className="w-full flex flex-col px-4 py-2.5 border-t hover:bg-opacity-90 transition-all cursor-pointer"
                                      style={{
                                        paddingLeft: '3rem', // Indent from day
                                        backgroundColor: workoutIndex % 3 === 0 ? colors.workoutHeader : (workoutIndex % 3 === 1 ? colors.workout2Header : colors.workout3Header),
                                        color: workoutIndex % 3 === 0 ? colors.workoutHeaderText : (workoutIndex % 3 === 1 ? colors.workout2HeaderText : colors.workout3HeaderText),
                                        borderTop: getBorderStyle('workout') || '1.5px solid rgba(0,0,0,0.1)',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {/* First Row - Workout Title and Sports */}
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                          {isWorkoutExpanded ? (
                                            <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                          )}
                                          <Dumbbell className="w-4 h-4" />
                                          <span className="font-semibold text-sm">Workout #{workoutIndex + 1}</span>
                                          <span className="text-xs opacity-70">
                                            ({totalMoveframes} moveframe{totalMoveframes !== 1 ? 's' : ''})
                                          </span>
                                        </div>
                                        {/* Sport summaries now shown on day row - removed from here to avoid duplication */}
                                      </div>
                                      
                                      {/* Second Row - Main and Secondary Work Descriptions */}
                                      {workDescriptions.size > 0 && (
                                        <div className="mt-2 ml-8 flex flex-wrap gap-3 text-xs">
                                          {Array.from(workDescriptions.entries()).map(([sport, work]) => (
                                            <div key={sport} className="flex flex-col gap-1">
                                              {work.main && (
                                                <div className="flex items-start gap-2 bg-white bg-opacity-20 px-2 py-1 rounded">
                                                  <Flag className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" style={{ color: getMainWorkColor() }} />
                                                  <div className="flex flex-col">
                                                    <span className="font-semibold text-[10px] opacity-80">{sport} - MAIN</span>
                                                    <span className="text-[10px] opacity-90 max-w-md line-clamp-2">
                                                      {work.main.replace(/<[^>]*>/g, '').substring(0, 100)}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                              {work.secondary && (
                                                <div className="flex items-start gap-2 bg-white bg-opacity-20 px-2 py-1 rounded">
                                                  <Flag className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" style={{ color: getSecondaryWorkColor() }} />
                                                  <div className="flex flex-col">
                                                    <span className="font-semibold text-[10px] opacity-80">{sport} - SECONDARY</span>
                                                    <span className="text-[10px] opacity-90 max-w-md line-clamp-2">
                                                      {work.secondary.replace(/<[^>]*>/g, '').substring(0, 100)}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </button>
                                  </div>

                                  {/* Expanded Moveframes */}
                                  {isWorkoutExpanded && workout.moveframes && workout.moveframes.length > 0 && (
                                    <div>
                                      {workout.moveframes.map((moveframe: any, moveframeIndex: number) => {
                                        const isMoveframeExpanded = expandedMoveframes.has(moveframe.id);
                                        const sportIcon = getSportIcon(moveframe.sport, iconType);
                                        const movelapsCount = moveframe.movelaps?.length || 0;
                                        const isEvenMoveframe = moveframeIndex % 2 === 0;

                                        return (
                                          <div key={moveframe.id}>
                                            {/* Moveframe Row - Fourth Level (Double Indent from Day) */}
                                            <button
                                              onClick={(e) => toggleMoveframe(moveframe.id, e)}
                                              className="w-full flex items-center justify-between px-4 py-1.5 border-t hover:bg-opacity-90 transition-all"
                                              style={{
                                                paddingLeft: '5rem', // Double indent
                                                backgroundColor: isEvenMoveframe ? colors.moveframeHeader : colors.alternateRowMoveframe,
                                                color: isEvenMoveframe ? colors.moveframeHeaderText : colors.alternateRowTextMoveframe,
                                                borderTop: getBorderStyle('moveframe') || '1px solid rgba(0,0,0,0.08)',
                                                fontWeight: '500'
                                              }}
                                            >
                                              <div className="flex items-center gap-2">
                                                {isMoveframeExpanded ? (
                                                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                                ) : (
                                                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                                )}
                                                {useImageIcons ? (
                                                  <img src={sportIcon} alt={moveframe.sport} className="w-12 h-12 object-cover rounded" />
                                                ) : (
                                                  <span className="text-4xl">{sportIcon}</span>
                                                )}
                                                <div className="relative inline-block">
                                                  <span className="text-xs font-medium">{moveframe.letter}</span>
                                                  {/* Red-Yellow circle indicator for moveframes with applied technique */}
                                                  {moveframe.appliedTechnique && (
                                                    <div 
                                                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-sm"
                                                      style={{ 
                                                        background: 'linear-gradient(135deg, #ef4444 50%, #eab308 50%)'
                                                      }}
                                                      title={`Technique: ${moveframe.appliedTechnique}`}
                                                    />
                                                  )}
                                                </div>
                                                <span className="text-xs opacity-70">{moveframe.sport}</span>
                                                {moveframe.workType === 'MAIN' && (
                                                  <div className="flex items-center gap-1 ml-1">
                                                    <Flag className="w-3 h-3 flex-shrink-0" fill="currentColor" style={{ color: getMainWorkColor() }} />
                                                    <span className="text-xs font-medium" style={{ color: getMainWorkColor() }}>Main work</span>
                                                  </div>
                                                )}
                                                {moveframe.workType === 'SECONDARY' && (
                                                  <div className="flex items-center gap-1 ml-1">
                                                    <Flag className="w-3 h-3 flex-shrink-0" fill="currentColor" style={{ color: getSecondaryWorkColor() }} />
                                                    <span className="text-xs font-medium" style={{ color: getSecondaryWorkColor() }}>Secondary work</span>
                                                  </div>
                                                )}
                                                <span className="text-xs opacity-60 ml-1">
                                                  ({movelapsCount} lap{movelapsCount !== 1 ? 's' : ''})
                                                </span>
                                              </div>
                                              <div className="text-xs opacity-70 max-w-md truncate">
                                                {stripCircuitTags(moveframe.description) || 'No description'}
                                              </div>
                                            </button>

                                            {/* Expanded Movelaps */}
                                            {isMoveframeExpanded && moveframe.movelaps && moveframe.movelaps.length > 0 && (
                                              <div>
                                                {moveframe.movelaps.map((movelap: any, lapIndex: number) => {
                                                  const isEvenLap = lapIndex % 2 === 0;
                                                  // Check if sport is aerobic or not
                                                  const AEROBIC_SPORTS = ['SWIM', 'BIKE', 'MTB', 'SPINNING', 'RUN', 'ROWING', 'CANOEING', 'KAYAKING', 'SKATE', 'SKI', 'SNOWBOARD', 'WALKING', 'HIKING'];
                                                  const isAerobic = AEROBIC_SPORTS.includes(moveframe.sport);
                                                  
                                                  return (
                                                    <div
                                                      key={movelap.id}
                                                      className="flex items-center gap-3 px-4 py-1.5 border-t text-xs hover:bg-opacity-80 transition-all cursor-default"
                                                      style={{
                                                        paddingLeft: '7rem', // Triple indent
                                                        backgroundColor: isEvenLap ? colors.movelapHeader : colors.alternateRowMovelap,
                                                        color: isEvenLap ? colors.movelapHeaderText : colors.alternateRowTextMovelap,
                                                        borderTop: getBorderStyle('movelap') || '0.5px solid rgba(0,0,0,0.05)'
                                                      }}
                                                    >
                                                      <span className="w-6 text-center font-medium text-gray-500">
                                                        #{lapIndex + 1}
                                                      </span>
                                                      <span className="text-gray-700 font-medium">
                                                        {isAerobic ? (
                                                          <>
                                                            {movelap.distance ? `${movelap.distance}m` : ''}
                                                            {movelap.repetitions ? `${movelap.repetitions} reps` : ''}
                                                          </>
                                                        ) : (
                                                          // For non-aerobic sports (body building, gymnastics, etc.), show exercise name
                                                          <>
                                                            {movelap.muscularSector && (
                                                              <span className="text-purple-700">{movelap.muscularSector} - </span>
                                                            )}
                                                            {movelap.exercise || 'Exercise'}
                                                          </>
                                                        )}
                                                      </span>
                                                      {movelap.time && (
                                                        <span className="text-gray-600">⏱️ {movelap.time}</span>
                                                      )}
                                                      {movelap.pause && (
                                                        <span className="text-gray-600">⏸️ {movelap.pause}</span>
                                                      )}
                                                      {movelap.speed && (
                                                        <span className="text-gray-600">🏃 {movelap.speed}</span>
                                                      )}
                                                      {!isAerobic && movelap.reps && (
                                                        <span className="text-gray-700">📊 {movelap.reps} reps</span>
                                                      )}
                                                      {movelap.weight && (
                                                        <span className="font-semibold" style={{ color: getSecondaryWorkColor() }}>💪 {movelap.weight}kg</span>
                                                      )}
                                                      {movelap.tools && (
                                                        <span className="font-semibold" style={{ color: getToolsColor() }}>🔧 {movelap.tools}</span>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

