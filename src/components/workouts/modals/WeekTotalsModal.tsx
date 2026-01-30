import React from 'react';
import { X } from 'lucide-react';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import { DISTANCE_BASED_SPORTS, shouldShowDistance, getDistanceUnit, formatMoveframeType } from '@/constants/moveframe.constants';
import PrintOptionsModal, { PrintOptions } from './PrintOptionsModal';
import { useAuth } from '@/hooks/useAuth';

interface WeekTotalsModalProps {
  isOpen: boolean;
  week: any;
  weeks?: any[]; // For multi-week view (Section B)
  isMultiWeekView?: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  activeSection?: string; // Section A = template (no dates), Section B = yearly plan (with dates)
  showMovelapsDetails?: boolean; // Toggle to show/hide movelaps in print
}

export default function WeekTotalsModal({ isOpen, week, weeks, isMultiWeekView = false, onClose, autoPrint = false, activeSection = 'A', showMovelapsDetails = false }: WeekTotalsModalProps) {
  const iconType = useSportIconType();
  const useImageIcons = isImageIcon(iconType);
  const { user } = useAuth();
  const [shouldAutoPrint, setShouldAutoPrint] = React.useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = React.useState(0);
  const [showMovelaps, setShowMovelaps] = React.useState(showMovelapsDetails);
  const [showPrintOptionsModal, setShowPrintOptionsModal] = React.useState(false);
  const [showAggregatedTotals, setShowAggregatedTotals] = React.useState(false);
  const [showWeekNotes, setShowWeekNotes] = React.useState(true); // Show week planning notes by default
  
  // Section A is template mode (no dates), Section B is yearly plan (with dates)
  const isTemplateMode = activeSection === 'A';

  // Set auto-print flag when modal opens with autoPrint prop
  React.useEffect(() => {
    if (isOpen && autoPrint) {
      console.log('🖨️ Auto-print mode activated');
      setShouldAutoPrint(true);
    } else {
      setShouldAutoPrint(false);
    }
  }, [isOpen, autoPrint]);

  // Reset week index and aggregated view when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentWeekIndex(0);
      // Show aggregated view by default when in multi-week mode
      setShowAggregatedTotals(isMultiWeekView);
      console.log('📊 WeekTotalsModal opened:', {
        activeSection,
        isMultiWeekView,
        singleWeek: week?.weekNumber || 'N/A',
        weeksArray: weeks?.length || 0,
        weekNumbers: weeks?.map((w: any) => w.weekNumber) || [],
        hasWeeks: !!weeks,
        shouldShowNavigation: isMultiWeekView && weeks && weeks.length > 1,
        showAggregatedButton: isMultiWeekView && weeks && weeks.length > 1
      });
    }
  }, [isOpen, isMultiWeekView, weeks, week, activeSection]);

  // Get the current week to display
  const displayWeek = React.useMemo(() => {
    if (isMultiWeekView && weeks && weeks.length > 0) {
      return weeks[currentWeekIndex] || weeks[0];
    }
    return week;
  }, [isMultiWeekView, weeks, currentWeekIndex, week]);

  // Navigation handlers
  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const goToNextWeek = () => {
    if (weeks && currentWeekIndex < weeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  // Format duration as 00h00'00''
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "00h00'00''";
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}h${mins.toString().padStart(2, '0')}'${secs.toString().padStart(2, '0')}''`;
  };

  // Calculate daily summaries - each sport gets its own row
  const calculateDailySummaries = () => {
    if (!displayWeek || !displayWeek.days) return { rows: [], totals: { workouts: 0, distance: 0, series: 0, time: 0 } };

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const rows: any[] = [];
    
    // Track weekly totals
    let totalWorkoutsCount = 0;
    let totalDistanceSum = 0;
    let totalSeriesSum = 0;
    let totalTimeSum = 0;
    
    displayWeek.days.forEach((day: any, index: number) => {
      const workoutsCount = day.workouts?.length || 0;
      totalWorkoutsCount += workoutsCount;
      
      // Group data by sport for this day
      const sportDataMap = new Map<string, { distance: number; series: number; time: number }>();
      
      day.workouts?.forEach((workout: any) => {
        workout.moveframes?.forEach((mf: any) => {
          const sport = mf.sport || 'UNKNOWN';
          
          if (!sportDataMap.has(sport)) {
            sportDataMap.set(sport, { distance: 0, series: 0, time: 0 });
          }
          
          const sportData = sportDataMap.get(sport)!;
          const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);
          
          if (isDistanceBased) {
            // Check if this is a manual mode aerobic moveframe
            if (mf.manualMode) {
              const manualInputType = mf.manualInputType || 'meters';
              const manualValue = mf.distance || 0;
              
              if (manualInputType === 'time') {
                // Convert deciseconds to minutes for time tracking
                sportData.time += manualValue / 600; // deciseconds to minutes
              } else {
                // Add meters to distance
                sportData.distance += manualValue;
              }
            } else {
              // Standard mode: process movelaps
            mf.movelaps?.forEach((lap: any) => {
              sportData.distance += parseInt(lap.distance) || 0;
                // Convert seconds to minutes for time tracking
                const timeInSeconds = parseFloat(lap.time) || 0;
                sportData.time += timeInSeconds / 60;
            });
            }
          } else {
            // For series-based sports
            if (mf.manualMode) {
              // For manual mode: use the repetitions field directly
              sportData.series += mf.repetitions || 0;
            } else {
              // For standard mode: count total reps/series (Rip\Series)
              // Exclude movelaps where reps=1 AND pause=0 (unless it's a macro)
              const hasMacro = mf.macroRest || mf.macroFinal;
              mf.movelaps?.forEach((lap: any) => {
                const reps = parseInt(lap.reps) || 1;
                const pause = parseFloat(lap.pause) || 0;
                
                // Count this movelap if:
                // - It's part of a macro, OR
                // - reps > 1, OR
                // - reps = 1 but pause > 0
                if (hasMacro || reps > 1 || (reps === 1 && pause > 0)) {
                  sportData.series += 1;
                }
                
                // Add time for non-distance sports - convert seconds to minutes
                const timeInSeconds = parseFloat(lap.time) || 0;
                sportData.time += timeInSeconds / 60;
              });
            }
          }
        });
      });

      const dayName = dayNames[index] || `Day ${index + 1}`;
      
      // If day has sports, create a row for each sport
      if (sportDataMap.size > 0) {
        const sportsArray = Array.from(sportDataMap.entries());
        sportsArray.forEach(([sport, data], sportIndex) => {
          const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);
          rows.push({
            dayName: sportIndex === 0 ? dayName : '', // Only show day name on first row
            workoutsCount: sportIndex === 0 ? workoutsCount : null, // Only show workout count on first row
            sport: sport.replace(/_/g, ' '),
            totalDistance: isDistanceBased ? data.distance : null,
            totalTime: data.time,
            totalSeries: !isDistanceBased ? data.series : null,
            rowSpan: sportIndex === 0 ? sportsArray.length : 0 // For potential rowspan usage
          });
          
          // Add to weekly totals
          if (isDistanceBased) {
            totalDistanceSum += data.distance;
          } else {
            totalSeriesSum += data.series;
          }
          totalTimeSum += data.time;
        });
      } else {
        // Day with no workouts
        rows.push({
          dayName,
          workoutsCount: 0,
          sport: '—',
          totalDistance: null,
          totalTime: null,
          totalSeries: null,
          rowSpan: 1
        });
      }
    });
    
    return { 
      rows, 
      totals: { 
        workouts: totalWorkoutsCount, 
        distance: totalDistanceSum, 
        series: totalSeriesSum,
        time: totalTimeSum 
      } 
    };
  };

  // Calculate totals by sport
  const calculateWeekTotals = () => {
    const sportMap = new Map<string, { 
      distance: number; 
      durationMinutes: number; 
      moveframeCount: number;
      workoutCount: number;
      totalSeries: number;
    }>();

    let totalWorkouts = 0;
    let totalMoveframes = 0;
    let totalDistance = 0;
    let totalDuration = 0;

    // Safe access - check if week and days exist
    if (!displayWeek || !displayWeek.days) {
      return { 
        sportTotals: [], 
        totalWorkouts: 0, 
        totalMoveframes: 0, 
        totalDistance: 0, 
        totalDuration: 0 
      };
    }

    // Track which sports appear in which workouts for workout count
    const sportWorkouts = new Map<string, Set<string>>();
    
    displayWeek.days.forEach((day: any) => {
      day.workouts.forEach((workout: any) => {
        totalWorkouts++;
        const workoutId = workout.id || `workout-${totalWorkouts}`;

        (workout.moveframes || []).forEach((mf: any) => {
          const sport = mf.sport || 'UNKNOWN';
          
          // Initialize sport entry if it doesn't exist
          if (!sportMap.has(sport)) {
            sportMap.set(sport, { 
              distance: 0, 
              durationMinutes: 0, 
              moveframeCount: 0,
              workoutCount: 0,
              totalSeries: 0
            });
          }
          
          const currentTotals = sportMap.get(sport)!;

          // Track that this sport appears in this workout
          if (!sportWorkouts.has(sport)) {
            sportWorkouts.set(sport, new Set());
          }
          sportWorkouts.get(sport)!.add(workoutId);

          totalMoveframes++;
          currentTotals.moveframeCount += 1;

          const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);

          // Check if this is a manual mode moveframe
          if (mf.manualMode) {
            if (isDistanceBased) {
              // Manual mode aerobic sport
              const manualInputType = mf.manualInputType || 'meters';
              const manualValue = mf.distance || 0;
              
              if (manualInputType === 'time') {
                // Convert deciseconds to minutes
                const durationMinutes = manualValue / 600;
                currentTotals.durationMinutes += durationMinutes;
                totalDuration += durationMinutes;
              } else {
                // Add meters to distance
                currentTotals.distance += manualValue;
                totalDistance += manualValue;
              }
            } else {
              // Manual mode series-based sport
              const manualSeries = mf.repetitions || 0;
              currentTotals.totalSeries += manualSeries;
            }
          } else {
            // Standard mode: process movelaps
          const hasMacro = mf.macroRest || mf.macroFinal;
          (mf.movelaps || []).forEach((lap: any) => {
            if (isDistanceBased) {
              const distance = parseInt(lap.distance) || 0;
                const timeInSeconds = parseFloat(lap.time) || 0;
                const durationMinutes = timeInSeconds / 60; // Convert seconds to minutes
              
              currentTotals.distance += distance;
                currentTotals.durationMinutes += durationMinutes;
              totalDistance += distance;
                totalDuration += durationMinutes;
            } else {
              // For series-based sports, count reps/series (Rip\Series)
              // Exclude movelaps where reps=1 AND pause=0 (unless it's a macro)
              const reps = parseInt(lap.reps) || 1;
              const pause = parseFloat(lap.pause) || 0;
              
              if (hasMacro || reps > 1 || (reps === 1 && pause > 0)) {
                currentTotals.totalSeries += 1;
              }
            }
          });
          }

          sportMap.set(sport, currentTotals);
        });
      });
    });
    
    // Update workout counts for each sport
    sportWorkouts.forEach((workoutIds, sport) => {
      const totals = sportMap.get(sport);
      if (totals) {
        totals.workoutCount = workoutIds.size;
      }
    });

    const sportTotals = Array.from(sportMap.entries())
      .map(([sport, totals]) => ({
        sport,
        ...totals,
      }))
      .sort((a, b) => b.distance - a.distance);

    return { 
      sportTotals, 
      totalWorkouts, 
      totalMoveframes, 
      totalDistance, 
      totalDuration 
    };
  };

  const { sportTotals, totalWorkouts, totalMoveframes, totalDistance, totalDuration } = calculateWeekTotals();
  const { rows: dailySummaries, totals: dailyTotals } = calculateDailySummaries();

  // Calculate aggregated totals across ALL displayed weeks
  const calculateAggregatedTotals = () => {
    if (!weeks || weeks.length === 0) {
      return {
        sportTotals: [],
        totalWorkouts: 0,
        totalMoveframes: 0,
        totalDistance: 0,
        totalDuration: 0,
        weekRange: ''
      };
    }

    const sportMap = new Map<string, {
      distance: number;
      durationMinutes: number;
      moveframeCount: number;
      workoutCount: number;
      totalSeries: number;
      workoutIds: Set<string>;
    }>();

    const allWorkoutIds = new Set<string>(); // Track all unique workout IDs across all sports
    let totalMoveframesSum = 0;
    let totalDistanceSum = 0;
    let totalDurationSum = 0;

    // Aggregate data from all weeks
    weeks.forEach((week: any) => {
      if (!week.days) return;

      week.days.forEach((day: any) => {
        if (!day.workouts) return;

        day.workouts.forEach((workout: any) => {
          if (!workout.moveframes) return;
          
          // Track all unique workouts
          allWorkoutIds.add(workout.id);

          workout.moveframes.forEach((mf: any) => {
            if (!mf.sport) return;

            totalMoveframesSum++;
            const sport = mf.sport;

            if (!sportMap.has(sport)) {
              sportMap.set(sport, {
                distance: 0,
                durationMinutes: 0,
                moveframeCount: 0,
                workoutCount: 0,
                totalSeries: 0,
                workoutIds: new Set()
              });
            }

            const currentTotals = sportMap.get(sport)!;
            currentTotals.moveframeCount++;
            currentTotals.workoutIds.add(workout.id);

            const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);

            // Check if this is a manual mode moveframe
            if (mf.manualMode) {
              if (isDistanceBased) {
                // Manual mode aerobic sport
                const manualInputType = mf.manualInputType || 'meters';
                const manualValue = mf.distance || 0;
                
                if (manualInputType === 'time') {
                  // Convert deciseconds to minutes
                  const durationMinutes = manualValue / 600;
                  currentTotals.durationMinutes += durationMinutes;
                  totalDurationSum += durationMinutes;
                } else {
                  // Add meters to distance
                  currentTotals.distance += manualValue;
                  totalDistanceSum += manualValue;
                }
              } else {
                // Manual mode series-based sport
                const manualSeries = mf.repetitions || 0;
                currentTotals.totalSeries += manualSeries;
              }
            } else {
              // Standard mode: process movelaps
            if (!mf.movelaps) return;

              const hasMacro = mf.macroRest || mf.macroFinal;
            mf.movelaps.forEach((lap: any) => {
              if (isDistanceBased) {
                const distance = parseFloat(lap.distance) || 0;
                  const timeInSeconds = parseFloat(lap.time) || 0;
                  const durationMinutes = timeInSeconds / 60; // Convert seconds to minutes

                currentTotals.distance += distance;
                  currentTotals.durationMinutes += durationMinutes;
                totalDistanceSum += distance;
                  totalDurationSum += durationMinutes;
              } else {
                const reps = parseInt(lap.reps) || 1;
                const pause = parseFloat(lap.pause) || 0;

                if (hasMacro || reps > 1 || (reps === 1 && pause > 0)) {
                  currentTotals.totalSeries += 1;
                }
              }
            });
            }
          });
        });
      });
    });

    // Update workout counts
    sportMap.forEach((totals) => {
      totals.workoutCount = totals.workoutIds.size;
    });

    const sportTotalsArray = Array.from(sportMap.entries())
      .map(([sport, totals]) => ({
        sport,
        ...totals
      }))
      .sort((a, b) => b.distance - a.distance);

    // Create week range string
    const weekNumbers = weeks.map((w: any) => w.weekNumber).sort((a: number, b: number) => a - b);
    const weekRange = `Weeks ${weekNumbers[0]}-${weekNumbers[weekNumbers.length - 1]} (${weeks.length} weeks)`;

    return {
      sportTotals: sportTotalsArray,
      totalWorkouts: allWorkoutIds.size, // Use unique workout count
      totalMoveframes: totalMoveframesSum,
      totalDistance: totalDistanceSum,
      totalDuration: totalDurationSum,
      weekRange
    };
  };

  const aggregatedData = React.useMemo(() => calculateAggregatedTotals(), [weeks]);

  const handlePrint = React.useCallback(() => {
    console.log('🖨️ handlePrint called');
    
    // Reset auto-print flag to prevent loop
    setShouldAutoPrint(false);
    
    // Get the modal content
    const modalContent = document.querySelector('[role="dialog"]');
    if (!modalContent) {
      console.error('❌ Modal content not found');
      return;
    }
    console.log('✅ Modal content found, creating print window...');
    
    // Create a new window for printing
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    // Write the content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Training Plan - Week ${week?.weekNumber || 'N/A'}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 2.5cm;
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
          h1 {
            font-size: 18pt;
            text-align: center;
            margin-bottom: 10pt;
          }
          h2 {
            font-size: 14pt;
            text-align: center;
            margin: 10pt 0 8pt 0;
          }
          h3 {
            font-size: 11pt;
            margin: 8pt 0 6pt 0;
          }
          p {
            font-size: 10pt;
            margin: 0 0 6pt 0;
          }
          table {
            width: 100%;
            max-width: 900px;
            margin: 0 auto 12pt auto;
            border-collapse: collapse;
            font-size: 9pt;
          }
          th, td {
            padding: 4pt 5pt;
            border: 1px solid #999;
            text-align: center;
          }
          th {
            background: #f3f4f6;
            font-weight: bold;
          }
          .text-center {
            text-align: center;
          }
          .border-2 {
            border: 2px solid #ccc;
            padding: 10pt;
            margin-bottom: 10pt;
          }
          button {
            display: none;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12pt;
          }
          .bg-blue-600 {
            background-color: #2563eb !important;
          }
          .bg-blue-100 {
            background-color: #dbeafe !important;
          }
          .bg-blue-50 {
            background-color: #eff6ff !important;
          }
          .text-white {
            color: white !important;
          }
          .h-px {
            height: 1px;
          }
          .bg-gray-400 {
            background-color: #9ca3af !important;
          }
          .h-4 {
            height: 12pt;
          }
        </style>
      </head>
      <body>
        ${modalContent.innerHTML}
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
  }, [week?.weekNumber]); // Safe optional chaining for dependency

  // Handler for printing a single day
  const handlePrintDay = React.useCallback((options: PrintOptions) => {
    console.log('🖨️ Printing day with options:', options);
    setShowPrintOptionsModal(false);
    
    if (!displayWeek?.days?.[options.selectedDayIndex]) {
      console.error('❌ Selected day not found');
      return;
    }

    const selectedDay = displayWeek.days[options.selectedDayIndex];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayName = dayNames[options.selectedDayIndex] || `Day ${options.selectedDayIndex + 1}`;
    
    // Create print window
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    // Build HTML content based on selected options
    let htmlContent = '';

    // Header
    htmlContent += `
      <div style="text-align: center; margin-bottom: 20pt;">
        <h1 style="font-size: 20pt; margin: 0 0 8pt 0;">${dayName}</h1>
        ${isTemplateMode ? `<h2 style="font-size: 14pt; margin: 0;">Week ${displayWeek.weekNumber || 1}</h2>` : 
          `<h2 style="font-size: 14pt; margin: 0;">Week ${displayWeek.weekNumber || 1} - ${selectedDay.date ? new Date(selectedDay.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</h2>`}
      </div>
    `;

    // Week Note (if selected)
    if (options.printWeekNote && displayWeek.note) {
      htmlContent += `
        <div style="border: 2px solid #e5e7eb; padding: 12pt; margin-bottom: 16pt; background: #f9fafb;">
          <h3 style="font-size: 12pt; margin: 0 0 8pt 0; font-weight: bold;">📝 Note of the Week</h3>
          <p style="margin: 0; font-size: 10pt; white-space: pre-wrap;">${displayWeek.note || ''}</p>
        </div>
      `;
    }

    // Day Note (if selected)
    if (options.printDayNote && selectedDay.note) {
      htmlContent += `
        <div style="border: 2px solid #e5e7eb; padding: 12pt; margin-bottom: 16pt; background: #fffbeb;">
          <h3 style="font-size: 12pt; margin: 0 0 8pt 0; font-weight: bold;">📌 Note of the Day</h3>
          <p style="margin: 0; font-size: 10pt; white-space: pre-wrap;">${selectedDay.note || ''}</p>
        </div>
      `;
    }

    // Summary (Daily Summary Table - if selected)
    if (options.printSummary && selectedDay.workouts?.length > 0) {
      htmlContent += '<h3 style="font-size: 13pt; margin: 16pt 0 10pt 0; font-weight: bold;">📊 Daily Summary</h3>';
      
      // Calculate sport totals for this day
      const sportDataMap = new Map<string, { distance: number; series: number; time: number }>();
      
      selectedDay.workouts?.forEach((workout: any) => {
        workout.moveframes?.forEach((mf: any) => {
          const sport = mf.sport || 'UNKNOWN';
          
          if (!sportDataMap.has(sport)) {
            sportDataMap.set(sport, { distance: 0, series: 0, time: 0 });
          }
          
          const sportData = sportDataMap.get(sport)!;
          const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);
          
          if (isDistanceBased) {
            // Check if this is a manual mode aerobic moveframe
            if (mf.manualMode) {
              const manualInputType = mf.manualInputType || 'meters';
              const manualValue = mf.distance || 0;
              
              if (manualInputType === 'time') {
                // Convert deciseconds to minutes
                sportData.time += manualValue / 600;
              } else {
                // Add meters to distance
                sportData.distance += manualValue;
              }
            } else {
              // Standard mode: process movelaps
            mf.movelaps?.forEach((lap: any) => {
              sportData.distance += parseInt(lap.distance) || 0;
                // Convert seconds to minutes for time tracking
                const timeInSeconds = parseFloat(lap.time) || 0;
                sportData.time += timeInSeconds / 60;
            });
            }
          } else {
            // For series-based sports
            if (mf.manualMode) {
              // Manual mode: use repetitions field
              sportData.series += mf.repetitions || 0;
            } else {
              // Standard mode: count total reps/series
            sportData.series += mf.movelaps?.length || 0;
            mf.movelaps?.forEach((lap: any) => {
                // Convert seconds to minutes for time tracking
                const timeInSeconds = parseFloat(lap.time) || 0;
                sportData.time += timeInSeconds / 60;
            });
            }
          }
        });
      });

      // Build summary table
      htmlContent += `
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 16pt;">
          <thead>
            <tr style="background: #3b82f6; color: white;">
              <th style="border: 1px solid #999; padding: 6pt; text-align: center;">Day</th>
              <th style="border: 1px solid #999; padding: 6pt; text-align: center;">Workouts</th>
              <th style="border: 1px solid #999; padding: 6pt; text-align: left;">Sport</th>
              <th style="border: 1px solid #999; padding: 6pt; text-align: center;">Total Distance (m)</th>
              <th style="border: 1px solid #999; padding: 6pt; text-align: center;">Time</th>
              <th style="border: 1px solid #999; padding: 6pt; text-align: center;">Total Series</th>
            </tr>
          </thead>
          <tbody>
      `;

      const sportsArray = Array.from(sportDataMap.entries());
      sportsArray.forEach(([sport, data], index) => {
        const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sport as any);
        const sportIcon = getSportIcon(sport, iconType);
        
        htmlContent += `
          <tr>
            ${index === 0 ? `<td rowspan="${sportsArray.length}" style="border: 1px solid #999; padding: 6pt; text-align: center; font-weight: bold;">${dayName}</td>` : ''}
            ${index === 0 ? `<td rowspan="${sportsArray.length}" style="border: 1px solid #999; padding: 6pt; text-align: center;">${selectedDay.workouts.length}</td>` : ''}
            <td style="border: 1px solid #999; padding: 6pt;">${useImageIcons ? `<img src="${sportIcon}" alt="${sport}" style="width: 14pt; height: 14pt; vertical-align: middle; margin-right: 4pt;" />` : sportIcon} ${sport.replace(/_/g, ' ')}</td>
            <td style="border: 1px solid #999; padding: 6pt; text-align: center;">${isDistanceBased ? data.distance : '—'}</td>
            <td style="border: 1px solid #999; padding: 6pt; text-align: center;">${data.time > 0 ? formatTime(data.time) : '—'}</td>
            <td style="border: 1px solid #999; padding: 6pt; text-align: center;">${!isDistanceBased ? data.series : '—'}</td>
          </tr>
        `;
      });

      htmlContent += '</tbody></table>';
    }

    // Workout Info & Movelaps (if selected)
    if ((options.printWorkoutInfo || options.printMovelaps) && selectedDay.workouts?.length > 0) {
      htmlContent += '<h3 style="font-size: 13pt; margin: 16pt 0 10pt 0; font-weight: bold;">📋 Workout Details</h3>';
      
      selectedDay.workouts.forEach((workout: any, workoutIndex: number) => {
        const sportName = workout.sport?.replace(/_/g, ' ') || 'Unknown Sport';
        const sportIcon = getSportIcon(workout.sport, iconType);
        
        htmlContent += `
          <div style="margin-bottom: 16pt; border: 1px solid #d1d5db; padding: 10pt; background: #fafafa;">
            <h4 style="font-size: 11pt; margin: 0 0 8pt 0; font-weight: bold;">${useImageIcons ? `<img src="${sportIcon}" alt="${sportName}" style="width: 16pt; height: 16pt; vertical-align: middle; margin-right: 4pt;" />` : sportIcon} Workout ${workoutIndex + 1}: ${sportName}</h4>
        `;

        // Workout Info (if selected)
        if (options.printWorkoutInfo) {
          htmlContent += '<div style="border: 1px solid #d1d5db; padding: 8pt; margin-bottom: 10pt; background: #ffffff;">';
          
          if (workout.context) {
            htmlContent += `<p style="margin: 0 0 4pt 0; font-size: 9pt;"><strong>Context:</strong> ${workout.context}</p>`;
          }
          if (workout.annotations) {
            htmlContent += `<p style="margin: 0; font-size: 9pt;"><strong>Annotations:</strong> ${workout.annotations}</p>`;
          }
          if (!workout.context && !workout.annotations) {
            htmlContent += `<p style="margin: 0; font-size: 9pt; color: #999;">No additional info</p>`;
          }
          
          htmlContent += '</div>';
        }

        // Movelaps (if selected)
        if (options.printMovelaps && workout.moveframes?.length > 0) {
          workout.moveframes.forEach((moveframe: any, mfIndex: number) => {
            if (moveframe.movelaps?.length > 0) {
              const mfSport = moveframe.sport?.replace(/_/g, ' ') || workout.sport?.replace(/_/g, ' ') || '';
              
              htmlContent += `
                <div style="margin-bottom: 10pt;">
                  <p style="margin: 0 0 4pt 0; font-size: 9pt; font-weight: bold;">Moveframe ${mfIndex + 1}: ${mfSport}</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 8pt;">
                    <thead>
                      <tr style="background: #e5e7eb;">
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Seq</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Distance</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Style</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Speed</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Pace</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Time</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: center;">Rest</th>
                        <th style="border: 1px solid #ccc; padding: 3pt; text-align: left;">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
              `;

              moveframe.movelaps.forEach((movelap: any) => {
                // Strip HTML and circuit tags from notes
                let notes = '—';
                if (movelap.notes) {
                  // First strip circuit metadata tags
                  let cleanNotes = movelap.notes
                    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
                    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
                    .trim();
                  // Then strip HTML
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = cleanNotes;
                  const strippedNotes = tempDiv.textContent || tempDiv.innerText || '';
                  notes = strippedNotes.length > 30 ? strippedNotes.substring(0, 30) + '...' : strippedNotes;
                }
                
                htmlContent += `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.repetitionNumber || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.distance || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.style || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.speed || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.pace || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.time || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; text-align: center;">${movelap.pause || '—'}</td>
                    <td style="border: 1px solid #ccc; padding: 3pt; font-size: 7pt;">${notes}</td>
                  </tr>
                `;
              });

              htmlContent += `
                    </tbody>
                  </table>
                </div>
              `;
            }
          });
        }

        htmlContent += '</div>';
      });
    }

    // Write to print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${dayName} - Week ${displayWeek.weekNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 1.5cm;
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
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
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
  }, [displayWeek, iconType, useImageIcons, isTemplateMode]);

  // Trigger auto-print after modal content is rendered (only once)
  React.useEffect(() => {
    if (shouldAutoPrint && isOpen) {
      console.log('📋 Triggering auto-print...');
      const timer = setTimeout(() => {
        handlePrint();
        // Reset flag and close modal immediately
        setShouldAutoPrint(false);
        onClose();
      }, 100); // Minimal delay just to render content
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPrint, isOpen, handlePrint, onClose]);

  // Get date range - safe access
  const startDate = displayWeek?.days?.[0] ? new Date(displayWeek.days[0].date) : null;
  const endDate = displayWeek?.days?.[displayWeek.days.length - 1] ? new Date(displayWeek.days[displayWeek.days.length - 1].date) : null;
  const dateRange = startDate && endDate 
    ? `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  // Early return check - must be after all hooks
  if (!isOpen || (!displayWeek && !week)) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 print:!p-0"
      style={{ 
        backgroundColor: shouldAutoPrint ? 'transparent' : 'rgba(0, 0, 0, 0.95)',
        display: shouldAutoPrint ? 'none' : 'flex',
        zIndex: 999999
      }}
      onClick={shouldAutoPrint ? undefined : onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-lg shadow-2xl w-full max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col print:!max-w-full print:!max-h-none print:!rounded-none print:!shadow-none print:!overflow-visible print:!block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Screen Only) */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            {/* Navigation buttons - Available when there are multiple weeks to navigate */}
            {weeks && weeks.length > 1 && !showAggregatedTotals && (
              <>
                <button
                  onClick={goToPreviousWeek}
                  disabled={currentWeekIndex === 0}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous week"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <div className="text-sm font-medium">
                  Week {currentWeekIndex + 1} of {weeks.length}
                </div>
                <button
                  onClick={goToNextWeek}
                  disabled={currentWeekIndex === weeks.length - 1}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next week"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </>
            )}
            <h2 className="text-xl font-bold">
              {showAggregatedTotals ? 'Aggregated Totals Summary' : `Week ${displayWeek.weekNumber} - Overview & Print Preview`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Totals of Weeks Displayed Button - Only show in multi-week view */}
            {isMultiWeekView && weeks && weeks.length > 1 && (
              <button
                onClick={() => setShowAggregatedTotals(!showAggregatedTotals)}
                className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${
                  showAggregatedTotals
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-white text-orange-600 hover:bg-orange-50'
                }`}
                title={showAggregatedTotals ? 'Show individual weeks' : 'Show totals of all displayed weeks'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                {showAggregatedTotals ? 'Show Weeks' : 'Totals'}
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
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
        <div className="overflow-y-auto flex-1 p-3 print:!overflow-visible print:!h-auto print:!flex-none print:!p-0">
          
          {/* AGGREGATED TOTALS VIEW - Shows totals from all displayed weeks */}
          {showAggregatedTotals && isMultiWeekView && weeks && weeks.length > 0 ? (
            <>
              {/* Aggregated Document Header */}
              <div className="mb-3 pb-2 border-b border-gray-300 print-header">
                <div className="text-center mb-2">
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    Training Plan - Totals Summary
                  </h1>
                  <p className="text-sm text-gray-600">{aggregatedData.weekRange}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-gray-700">Athlete:</span>
                    <span className="text-gray-600 ml-1">{user?.name || user?.username || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Coach:</span>
                    <span className="text-gray-600 ml-1">N/A</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Total Weeks:</span>
                    <span className="text-gray-600 ml-1">{weeks.length}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Generated:</span>
                    <span className="text-gray-600 ml-1">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Aggregated Summary Table - Week Summary by Sport */}
              <div className="mb-3">
                <h2 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">
                  Aggregated Summary by Sport ({aggregatedData.weekRange})
                </h2>
                <table className="border-collapse border border-gray-300 text-sm w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">Sport</th>
                      <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">WO</th>
                      <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">MF</th>
                      <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Dist(m)</th>
                      <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Series</th>
                      <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedData.sportTotals.map((sportData: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-2 font-medium text-xs text-center">
                          {sportData.sport.replace(/_/g, ' ')}
                        </td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                          {sportData.workoutCount}
                        </td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                          {sportData.moveframeCount}
                        </td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                          {sportData.distance > 0 ? sportData.distance.toLocaleString() : '—'}
                        </td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                          {sportData.totalSeries > 0 ? sportData.totalSeries : '—'}
                        </td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                          {sportData.durationMinutes > 0 ? formatTime(sportData.durationMinutes) : '—'}
                        </td>
                      </tr>
                    ))}
                    {/* Grand Total row */}
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-300 px-2 py-2 text-xs text-center">TOTAL</td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">{aggregatedData.sportTotals.reduce((sum: number, sport: any) => sum + sport.workoutCount, 0)}</td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">{aggregatedData.totalMoveframes}</td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">{aggregatedData.totalDistance.toLocaleString()}</td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">—</td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">{formatTime(aggregatedData.totalDuration)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* REGULAR WEEK VIEW - Shows individual week data */
            <>
              {/* Document Header (Print & Screen) */}
              <div className="mb-3 pb-2 border-b border-gray-300 print-header">
                <div className="text-center mb-2">
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {isTemplateMode ? `Weekly Template - Week ${displayWeek.weekNumber}` : `Training Plan - Week ${displayWeek.weekNumber}`}
                  </h1>
                  {!isTemplateMode && <p className="text-sm text-gray-600">{dateRange}</p>}
                </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="font-semibold text-gray-700">Athlete:</span>
                <span className="text-gray-600 ml-1">{user?.name || user?.username || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Coach:</span>
                <span className="text-gray-600 ml-1">N/A</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Period:</span>
                <span className="text-gray-600 ml-1">{displayWeek.period?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Generated:</span>
                <span className="text-gray-600 ml-1">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Week Planning Notes Section - Toggleable */}
          {showWeekNotes && displayWeek.notes && (
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <h3 className="text-base font-bold text-amber-900">Week Planning Notes</h3>
              </div>
              <div 
                className="text-sm text-gray-800 bg-white border border-amber-200 rounded-lg p-3 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: displayWeek.notes }}
              />
            </div>
          )}

          {/* Two-Column Summary Layout */}
          <div className="mb-3 print-summary grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* LEFT: Daily Summary Table */}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">Daily Summary</h2>
              <table className="border-collapse border border-gray-300 text-sm w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">Day</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">WO</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">Sport</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Dist(m)</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Time</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Rip\Series</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {row.dayName && (
                        <td className="border border-gray-300 px-2 py-2 font-medium text-xs text-center">
                          {row.dayName}
                        </td>
                      )}
                      {!row.dayName && <td className="border border-gray-300 px-2 py-2 text-xs text-center"></td>}
                      
                      {row.workoutsCount !== null ? (
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                          {row.workoutsCount || '—'}
                        </td>
                      ) : (
                        <td className="border border-gray-300 px-1 py-2 text-xs text-center"></td>
                      )}
                      
                      <td className="border border-gray-300 px-2 py-2 text-xs text-center">
                        {row.sport}
                      </td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                        {row.totalDistance !== null ? row.totalDistance.toLocaleString() : '—'}
                      </td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                        {row.totalTime !== null && row.totalTime > 0 ? formatTime(row.totalTime) : '—'}
                      </td>
                      <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                      {row.totalSeries !== null ? row.totalSeries : '—'}
                    </td>
                  </tr>
                ))}
                {/* Total of the week row */}
                <tr className="bg-yellow-100 border-t-2 border-gray-400">
                  <td className="border border-gray-300 px-2 py-2 text-xs text-center font-bold">
                    Total of the week
                  </td>
                  <td className="border border-gray-300 px-1 py-2 text-xs text-center font-bold">
                    {dailyTotals.workouts}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-xs text-center font-bold">
                    —
                  </td>
                  <td className="border border-gray-300 px-1 py-2 text-center text-xs font-bold">
                    {dailyTotals.distance > 0 ? dailyTotals.distance.toLocaleString() : '—'}
                  </td>
                  <td className="border border-gray-300 px-1 py-2 text-center text-xs font-bold">
                    {dailyTotals.time > 0 ? formatTime(dailyTotals.time) : '—'}
                  </td>
                  <td className="border border-gray-300 px-1 py-2 text-center text-xs font-bold">
                    {dailyTotals.series > 0 ? dailyTotals.series : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

            {/* RIGHT: Week Summary by Sport Table */}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-2 border-b border-gray-300 pb-1">Week Summary by Sport</h2>
              <table className="border-collapse border border-gray-300 text-sm w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-center font-semibold text-xs">Sport</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">WO</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">MF</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Dist(m)</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Series</th>
                    <th className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sportTotals.length > 0 ? (
                    <>
                      {sportTotals.map((sportData, index) => {
                        const isDistanceBased = DISTANCE_BASED_SPORTS.includes(sportData.sport as any);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-2 font-medium text-xs text-center">
                              {sportData.sport.replace(/_/g, ' ')}
                            </td>
                            <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                              {sportData.workoutCount}
                            </td>
                            <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                              {sportData.moveframeCount}
                            </td>
                            <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                              {isDistanceBased ? sportData.distance.toLocaleString() : '—'}
                            </td>
                            <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                              {!isDistanceBased ? sportData.totalSeries : '—'}
                            </td>
                            <td className="border border-gray-300 px-1 py-2 text-center text-xs">
                              {isDistanceBased ? formatTime(sportData.durationMinutes) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Grand Total Row */}
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-300 px-2 py-2 text-xs text-center">TOTAL</td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">{sportTotals.reduce((sum, sport) => sum + sport.workoutCount, 0)}</td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">{totalMoveframes}</td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">{totalDistance.toLocaleString()}</td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">—</td>
                        <td className="border border-gray-300 px-1 py-2 text-center text-xs">{formatTime(totalDuration)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-3 py-3 text-center text-gray-500">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note of the week */}
          {displayWeek.notes && displayWeek.notes.trim() && (
            <div className="mt-6 mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <h2 className="text-base font-bold text-gray-900 mb-2">Note of the week</h2>
              <div 
                className="text-sm text-gray-800"
                dangerouslySetInnerHTML={{ __html: displayWeek.notes }}
              />
            </div>
          )}

          {/* Daily Workout Details */}
          <div className="space-y-6 print-daily-details">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-300 pb-1">Daily Workout Details</h2>
            
            {displayWeek.days.map((day: any, dayIndex: number) => (
              <div key={day.id} className="border-2 border-gray-400 rounded overflow-hidden print-day-section" style={{ marginTop: dayIndex === 0 ? '0' : '3rem' }}>
                <div className="px-2 py-1 print-day-header flex items-center justify-center gap-2 bg-gray-100">
                  {/* Calendar Icon for Day */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <h3 className="font-bold text-sm text-gray-900 text-center">
                    {isTemplateMode 
                      ? `Day ${dayIndex + 1}` 
                      : `Day ${dayIndex + 1}: ${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}`
                    }
                  </h3>
                </div>

                {day.workouts && day.workouts.length > 0 ? (
                  <div className="p-2 bg-gray-50">
                    {day.workouts.map((workout: any, workoutIndex: number) => (
                      <React.Fragment key={workout.id}>
                        {/* Larger spacing between workouts (not before first workout) */}
                        {workoutIndex > 0 && (
                          <div style={{ height: '2rem' }}></div>
                        )}
                        
                        <div className="border border-gray-300 rounded bg-white">
                          {/* Blue header for workout with document icon */}
                          <div className="px-2 py-1 flex items-center justify-between bg-blue-600">
                            <div className="flex items-center gap-2">
                              {/* Document/Clipboard Icon for workout */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                                <rect x="9" y="3" width="6" height="4" rx="1"></rect>
                              </svg>
                              <span className="font-semibold text-xs text-white">
                                Workout {workout.sessionNumber}: {workout.name}
                              </span>
                            </div>
                            <span className="text-xs text-white font-medium">{workout.code}</span>
                          </div>
                          
                          {/* Workout Note */}
                          {workout.notes && workout.notes.trim() && (
                            <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                              <div className="text-xs text-gray-700 italic">
                                <strong>Note:</strong>{' '}
                                <span dangerouslySetInnerHTML={{ __html: workout.notes }} />
                              </div>
                            </div>
                          )}

                          {workout.moveframes && workout.moveframes.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="text-xs border-collapse w-full">
                                <colgroup>
                                  <col style={{ width: '40px' }} />
                                  <col style={{ width: '100px' }} />
                                  <col style={{ width: '80px' }} />
                                  <col style={{ width: '250px' }} />
                                  <col style={{ width: '50px' }} />
                                </colgroup>
                                <thead className="bg-blue-100">
                                  <tr>
                                    <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">MF</th>
                                    <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Sport</th>
                                    <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Type</th>
                                    <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Description</th>
                                    <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Laps</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {workout.moveframes.map((mf: any, mfIndex: number) => (
                                    <React.Fragment key={mf.id}>
                                      {/* Larger space between moveframes (not before first) */}
                                      {mfIndex > 0 && (
                                        <tr className="h-8">
                                          <td colSpan={5} className="border-none bg-white"></td>
                                        </tr>
                                      )}
                                      
                                      {/* Moveframe row with light background */}
                                      <tr className="hover:bg-blue-100 bg-blue-50">
                                        <td className="border border-gray-300 px-1 py-2 font-bold text-center bg-blue-100 text-xs">
                                          {mf.letter}
                                        </td>
                                        <td className="border border-gray-300 px-1 py-2 text-xs text-center">
                                          {mf.sport.replace(/_/g, ' ')}
                                        </td>
                                        <td className="border border-gray-300 px-1 py-2 text-xs text-center">
                                          {formatMoveframeType(mf.type)}
                                        </td>
                                        <td className="border border-gray-300 px-1 py-2 text-xs">
                                          {mf.description ? (
                                            <div dangerouslySetInnerHTML={{ __html: mf.description }} />
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td className="border border-gray-300 px-1 py-2 text-center font-semibold text-xs">
                                          {mf.movelaps?.length || 0}
                                        </td>
                                      </tr>
                                      
                                      {/* Space between moveframe and movelaps - Only show if toggle is enabled */}
                                      {showMovelaps && mf.movelaps && mf.movelaps.length > 0 && (
                                        <>
                                          <tr className="h-3">
                                            <td colSpan={5} className="border-none bg-white"></td>
                                          </tr>
                                          <tr>
                                            <td colSpan={5} className="border border-gray-300 p-0">
                                            <table className="text-xs bg-gray-50 w-full">
                                              <colgroup>
                                                <col style={{ width: '30px' }} />
                                                <col style={{ width: '60px' }} />
                                                <col style={{ width: '50px' }} />
                                                <col style={{ width: '60px' }} />
                                                <col style={{ width: '80px' }} />
                                                <col style={{ width: '70px' }} />
                                                <col style={{ width: '60px' }} />
                                                <col style={{ width: '60px' }} />
                                              </colgroup>
                                              <thead className="bg-gray-200">
                                                <tr>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">#</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Dist</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Reps</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Speed</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Style</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Time</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Pace</th>
                                                  <th className="border border-gray-300 px-1 py-1 text-center font-semibold text-xs">Pause</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {mf.movelaps.map((ml: any) => (
                                                  <tr key={ml.id} className="bg-white hover:bg-gray-50">
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.repetitionNumber}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.distance || '—'}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.reps || '—'}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.speed || '—'}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.style || '—'}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.time || '—'}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.pace || '—'}
                                                    </td>
                                                    <td className="border border-gray-300 px-1 py-1 text-center text-xs">
                                                      {ml.pause || '—'}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </td>
                                          </tr>
                                        </>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-3 text-center text-gray-500 text-sm">No moveframes</div>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">No workouts scheduled</div>
                )}
              </div>
            ))}
          </div>

          {/* Document Footer */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300 text-sm text-gray-600 print-footer">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-semibold text-gray-700">Notes:</p>
                {!showAggregatedTotals && displayWeek.notes ? (
                  <div dangerouslySetInnerHTML={{ __html: displayWeek.notes }} />
                ) : (
                  <p>{showAggregatedTotals ? 'Aggregated summary of all displayed weeks' : 'No notes for this week'}</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700">Contact:</p>
                <p>Coach: [Email/Phone]</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Generated by:</p>
                <p>MovesBook Training System</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer (Screen Only) */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 print:hidden">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={() => setShowPrintOptionsModal(true)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Print a Day
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Print Week
          </button>
        </div>
      </div>

      {/* Print Options Modal */}
      <PrintOptionsModal
        isOpen={showPrintOptionsModal}
        onClose={() => setShowPrintOptionsModal(false)}
        onPrint={handlePrintDay}
        week={displayWeek}
        activeSection={activeSection}
      />

      {/* Print Styles - Show ONLY modal content */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 2.5cm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          /* Hide EVERYTHING first */
          body,
          body * {
            visibility: hidden !important;
            display: none !important;
          }
          
          /* Show ONLY the modal backdrop and dialog */
          div.fixed.inset-0:has([role="dialog"]) {
            visibility: visible !important;
            display: block !important;
            position: static !important;
            background: white !important;
            padding: 0 !important;
          }
          
          /* Show the dialog */
          [role="dialog"] {
            visibility: visible !important;
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          
          /* Show ALL dialog children */
          [role="dialog"],
          [role="dialog"] *,
          [role="dialog"] > *,
          [role="dialog"] > * > *,
          [role="dialog"] > * > * > *,
          [role="dialog"] > * > * > * > * {
            visibility: visible !important;
            display: revert !important;
          }
          
          /* Hide buttons */
          [role="dialog"] button,
          [role="dialog"] .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Hide source code elements */
          [role="dialog"] pre,
          [role="dialog"] code,
          [role="dialog"] .hljs,
          [role="dialog"] .language-*,
          [role="dialog"] [class*="language-"],
          [role="dialog"] .code-block,
          [role="dialog"] .source-code {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Fix layout elements */
          [role="dialog"] .fixed,
          [role="dialog"] .absolute {
            position: static !important;
          }
          
          [role="dialog"] .overflow-y-auto,
          [role="dialog"] .overflow-x-auto,
          [role="dialog"] .overflow-hidden {
            overflow: visible !important;
            max-height: none !important;
          }
          
          [role="dialog"] .flex,
          [role="dialog"] .flex-col {
            display: block !important;
          }
          
          [role="dialog"] .flex-1 {
            height: auto !important;
            flex: none !important;
          }
          
          [role="dialog"] .rounded-lg {
            border-radius: 0 !important;
          }
          
          [role="dialog"] .shadow-2xl {
            box-shadow: none !important;
          }
          
          /* Typography */
          [role="dialog"] h1 {
            display: block !important;
            font-size: 18pt;
            margin-bottom: 10pt;
            text-align: center;
          }
          
          [role="dialog"] h2 {
            display: block !important;
            font-size: 14pt;
            margin: 10pt 0 8pt 0;
            text-align: center;
          }
          
          [role="dialog"] h3 {
            display: block !important;
            font-size: 11pt;
            margin: 8pt 0 6pt 0;
          }
          
          [role="dialog"] p {
            display: block !important;
            font-size: 10pt;
            margin: 0 0 6pt 0;
          }
          
          [role="dialog"] div {
            display: block !important;
          }
          
          [role="dialog"] span {
            display: inline !important;
          }
          
          /* Tables */
          [role="dialog"] table {
            display: table !important;
            width: 100% !important;
            max-width: 900px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            margin-bottom: 12pt !important;
            border-collapse: collapse !important;
            font-size: 9pt !important;
          }
          
          [role="dialog"] thead {
            display: table-header-group !important;
          }
          
          [role="dialog"] tbody {
            display: table-row-group !important;
          }
          
          [role="dialog"] tr {
            display: table-row !important;
            page-break-inside: avoid;
          }
          
          [role="dialog"] th,
          [role="dialog"] td {
            display: table-cell !important;
            padding: 4pt 5pt !important;
            border: 1px solid #999 !important;
            font-size: 9pt !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}
