'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import NutritionLegend from './NutritionLegend';

interface NutritionCalendarViewProps {
  nutritionPlan: any;
  periods: any[];
  excludeStretchingFromTotals: boolean;
  setExcludeStretchingFromTotals: (value: boolean) => void;
  onDayClick?: (day: any) => void;
}

export default function NutritionCalendarView({
  nutritionPlan,
  periods,
  excludeStretchingFromTotals,
  setExcludeStretchingFromTotals,
  onDayClick
}: NutritionCalendarViewProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'narrow' | 'wide'>('narrow');

  if (!nutritionPlan || !nutritionPlan.weeks || nutritionPlan.weeks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No workout plan data available for calendar view.</p>
      </div>
    );
  }

  // Get all days from the workout plan
  const allDays = nutritionPlan.weeks.flatMap((week: any) =>
    week.days.map((day: any) => ({ ...day, weekNumber: week.weekNumber }))
  );

  // Group days by month and year
  const daysByMonth: { [key: string]: any[] } = {};
  allDays.forEach((day: any) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!daysByMonth[monthKey]) {
      daysByMonth[monthKey] = [];
    }
    daysByMonth[monthKey].push(day);
  });

  // Generate calendar for a specific month
  const generateMonthCalendar = (year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    const monthDays = daysByMonth[monthKey] || [];
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const calendarDays: (any | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const nutritionDay = monthDays.find((d: any) => {
        const dDate = new Date(d.date);
        return dDate.getDate() === day;
      });
      calendarDays.push({ date, nutritionDay });
    }

    return calendarDays;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get workout status color based on plan date and completion
  const getNutritionMealStatusColor = (workout: any, dayDate: Date) => {
    if (!workout) return 'text-gray-300'; // White (not planned) - greyed out
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(dayDate);
    workoutDate.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    const diffTime = workoutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if workout is completed
    const isCompleted = workout.status === 'COMPLETED' || workout.isDone;
    const completionRate = workout.completionRate || 0;
    const isDifferent = workout.isDifferent || false;
    
    if (isCompleted) {
      if (isDifferent) {
        return 'text-blue-500'; // Blue = done but differently
      } else if (completionRate < 75) {
        return 'text-green-300'; // Light green = done at <75%
      } else {
        return 'text-green-600'; // Green = done at >75%
      }
    }
    
    // Planned but not done yet
    if (diffDays < 0) {
      return 'text-white'; // Past but not done = white
    } else if (diffDays <= 7) {
      return 'text-red-500'; // Red = planned this week
    } else if (diffDays <= 14) {
      return 'text-orange-500'; // Orange = planned next week
    } else {
      return 'text-yellow-400'; // Yellow = planned in future
    }
  };
  
  // Helper function to render workout symbols
  const renderWorkoutSymbols = (meals: any[], dayDate: Date, inline: boolean = true) => {
    const symbols = ['○', '□', '△']; // Circle, Square, Triangle
    
    if (inline) {
      return (
        <div className="flex gap-0.5 justify-center mt-0.5">
          {symbols.map((symbol, idx) => {
            const workout = meals?.[idx];
            const colorClass = getNutritionMealStatusColor(workout, dayDate);
            
            return (
              <span
                key={idx}
                className={`text-xs font-bold ${colorClass}`}
              >
                {symbol}
              </span>
            );
          })}
        </div>
      );
    }
    
    return null;
  };
  
  // Get total distance for a workout
  const getWorkoutTotal = (workout: any) => {
    if (!workout || !workout.nutritionFoods) return { distance: 0, coefficient: 1 };
    
    let totalDistance = 0;
    workout.nutritionFoods.forEach((mf: any) => {
      totalDistance += mf.totalDistance || 0;
    });
    
    return { distance: totalDistance, coefficient: 1 }; // K coefficient placeholder
  };
  
  // Helper to filter sports (applying stretching exclusion rules)
  const filterSports = (sports: string[]): string[] => {
    // Auto-exclude stretching if there are 4 sports and stretching is one of them
    if (sports.length === 4 && sports.some(s => s.toLowerCase() === 'stretching')) {
      return sports.filter(s => s.toLowerCase() !== 'stretching');
    }
    
    // Manual exclusion if checkbox is checked
    if (excludeStretchingFromTotals) {
      return sports.filter(s => s.toLowerCase() !== 'stretching');
    }
    
    return sports;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Legend */}
      <NutritionLegend showWideMode={viewMode === 'wide'} />
      
      {/* Exclude Stretching Checkbox */}
      <div className="flex items-center justify-between mb-3 px-2 py-2 bg-gray-50 border border-gray-300 rounded">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeStretchingFromTotals}
            onChange={(e) => setExcludeStretchingFromTotals(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Exclude stretching from the totals
          </span>
        </label>
        <span className="text-xs text-gray-500 italic">
          Note: Stretching is auto-excluded when 4 sports are selected
        </span>
      </div>
      
      {/* Year Header with View Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentYear(currentYear - 1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Previous Year"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900">
            {currentYear}
          </h2>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('narrow')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'narrow' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Narrow view - 12 months"
            >
              <Minimize2 className="w-4 h-4" />
              Narrow
            </button>
            <button
              onClick={() => setViewMode('wide')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'wide' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Wide view - 3 months with details"
            >
              <Maximize2 className="w-4 h-4" />
              Wide
            </button>
          </div>
        </div>
        
        <button
          onClick={() => setCurrentYear(currentYear + 1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Next Year"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Narrow Mode - 12 Months Grid (4x3) with NutritionMeal Symbols */}
      {viewMode === 'narrow' && (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const calendarDays = generateMonthCalendar(currentYear, monthIndex);
            
            return (
              <div key={monthIndex} className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                {/* Month Name */}
                <div className="text-center font-bold text-gray-800 text-sm mb-2">
                  {monthNames[monthIndex]}
                </div>

                {/* Day Names */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days with NutritionMeal Symbols */}
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((item, dayIndex) => {
                    if (!item) {
                      return <div key={`empty-${dayIndex}`} className="h-10"></div>;
                    }

                    const { date, nutritionDay } = item;
                    const hasWorkouts = nutritionDay && nutritionDay.meals && nutritionDay.meals.length > 0;
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={dayIndex}
                        onClick={() => nutritionDay && onDayClick?.(nutritionDay)}
                        className={`h-10 flex flex-col items-center justify-center text-xs rounded transition-all ${
                          hasWorkouts
                            ? 'bg-gray-50 border border-gray-300 cursor-pointer hover:bg-gray-100'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        } ${isToday ? 'ring-2 ring-green-500 ring-inset' : ''}`}
                        title={nutritionDay ? `Week ${nutritionDay.weekNumber}${hasWorkouts ? `, ${nutritionDay.meals.length} workout(s)` : ''}` : ''}
                      >
                        <span className="font-semibold text-gray-800">{date.getDate()}</span>
                        {renderWorkoutSymbols(nutritionDay?.meals || [], date)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Wide Mode - 3 Months per Row with Vertical Meal Details */}
      {viewMode === 'wide' && (
        <div className="space-y-6">
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, colIndex) => {
                const monthIndex = rowIndex * 3 + colIndex;
                if (monthIndex >= 12) return null;
                
                const calendarDays = generateMonthCalendar(currentYear, monthIndex);
                
                return (
                  <div key={monthIndex} className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    {/* Month Name */}
                    <div className="text-center font-bold text-gray-900 text-lg mb-3">
                      {monthNames[monthIndex]}
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="text-center text-sm font-semibold text-gray-700">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days with Vertical Meal Details */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((item, dayIndex) => {
                        if (!item) {
                          return <div key={`empty-${dayIndex}`} className="h-24"></div>;
                        }

                        const { date, nutritionDay } = item;
                        const workouts = nutritionDay?.meals || [];
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <div
                            key={dayIndex}
                            onClick={() => nutritionDay && onDayClick?.(nutritionDay)}
                            className={`h-24 p-1 border rounded transition-all cursor-pointer ${
                              workouts.length > 0
                                ? 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            } ${isToday ? 'ring-2 ring-green-500' : ''}`}
                            title={nutritionDay ? `Week ${nutritionDay.weekNumber}` : ''}
                          >
                            {/* Day Number */}
                            <div className="text-center font-bold text-sm text-gray-900 mb-1">
                              {date.getDate()}
                            </div>
                            
                            {/* Vertical NutritionMeal Symbols with Sports & Distance */}
                            <div className="space-y-0.5 text-xs overflow-hidden">
                              {[0, 1, 2].map((idx) => {
                                const symbols = ['○', '□', '△'];
                                const workout = workouts[idx];
                                const colorClass = getNutritionMealStatusColor(workout, date);
                                
                                if (!workout) {
                                  return (
                                    <div key={idx} className="text-gray-300 text-center">
                                      {symbols[idx]}
                                    </div>
                                  );
                                }
                                
                                const { distance, coefficient } = getWorkoutTotal(workout);
                                const allSports = Array.from(new Set(workout.nutritionFoods?.map((mf: any) => mf.sport as string) || [])) as string[];
                                const sports = filterSports(allSports);
                                
                                return (
                                  <div key={idx} className={`flex items-center gap-0.5 ${colorClass}`}>
                                    <span className="font-bold">{symbols[idx]}</span>
                                    <span className="truncate text-xs">
                                      {sports.slice(0, 2).join(',') || '-'}
                                    </span>
                                    {distance > 0 && (
                                      <span className="text-xs font-semibold">
                                        {(distance / 1000).toFixed(1)}k·K{coefficient}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

