/**
 * Workout Helper Utilities
 * Extracted from various workout components for reusability
 */

import { getSportIcon } from './sportIcons';
import { isSeriesBasedSport } from '@/constants/moveframe.constants';

export interface SportSummary {
  sport: string;
  icon: string;
  name: string; // Section name
  distance: number;
  duration: string;
  color: string;
  isSeriesBased?: boolean;
  descriptions?: string[]; // All moveframe descriptions
  mainWork?: string; // Main work moveframe description
  secondaryWork?: string; // Secondary work moveframe description
  mainWorkMoveframe?: any | null; // Full main work moveframe object
  secondaryWorkMoveframe?: any | null; // Full secondary work moveframe object
}

/**
 * Calculate sport summaries for a day (up to 4 sports)
 * Extracted from DayRowTable.tsx
 * 
 * @param day - Day object with workouts and moveframes
 * @param iconType - Type of icon to use ('emoji' or 'icon')
 * @returns Array of sport summaries (max 4)
 */
export function calculateSportSummaries(
  day: any, 
  iconType: 'emoji' | 'icon' = 'emoji'
): SportSummary[] {
  if (!day.workouts || day.workouts.length === 0) {
    return [];
  }

  const sportMap = new Map<string, SportSummary & { series: number; repetitions: number; descriptions: string[]; mainWork: string; secondaryWork: string; moveframes: any[]; mainWorkMoveframe: any | null; secondaryWorkMoveframe: any | null; durationSeconds?: number }>();

  day.workouts.forEach((workout: any) => {
    if (workout.moveframes) {
      workout.moveframes.forEach((moveframe: any) => {
        const sport = moveframe.sport;
        const sectionName = moveframe.section?.name || 'No Section';
        const sectionColor = moveframe.section?.color || '#E5E7EB';
        const isSeries = isSeriesBasedSport(sport);
        
        if (!sportMap.has(sport)) {
          sportMap.set(sport, {
            sport,
            icon: getSportIcon(sport, iconType),
            name: sectionName,
            distance: 0,
            duration: '0:00',
            color: sectionColor,
            isSeriesBased: isSeries,
            series: 0,
            repetitions: 0,
            descriptions: [],
            mainWork: '',
            secondaryWork: '',
            moveframes: [],
            mainWorkMoveframe: null,
            secondaryWorkMoveframe: null
          });
        }

        const summary = sportMap.get(sport)!;
        
        // Store moveframe for later processing
        summary.moveframes.push(moveframe);
        
        // Get display content - for manual mode, ALWAYS use notes first (full content)
        // Description might be truncated due to database constraints
        const displayContent = moveframe.manualMode 
          ? (moveframe.notes || moveframe.description || '') 
          : (moveframe.description || '');
        
        // Debug logging for manual mode
        if (moveframe.manualMode) {
          console.log(`   🔍 [workoutHelpers] Manual mode moveframe ${moveframe.letter}:`, {
            manualMode: moveframe.manualMode,
            hasDescription: !!moveframe.description,
            hasNotes: !!moveframe.notes,
            descriptionLength: moveframe.description?.length || 0,
            notesLength: moveframe.notes?.length || 0,
            displayContentLength: displayContent?.length || 0,
            usingField: moveframe.notes ? 'notes (full content)' : 'description',
            workType: moveframe.workType
          });
        }
        
        // Add moveframe description if available
        if (displayContent) {
          summary.descriptions.push(displayContent);
        }
        
        // Debug: Log moveframe workType
        console.log(`   📋 [workoutHelpers] Moveframe ${moveframe.letter || '?'} - ID: ${moveframe.id}, Sport: ${moveframe.sport}, workType: "${moveframe.workType}" (type: ${typeof moveframe.workType}), hasWorkType: ${moveframe.hasOwnProperty('workType')}`);
        
        // Set main work description and moveframe object if this moveframe is marked as MAIN
        if (moveframe.workType === 'MAIN' && displayContent) {
          summary.mainWork = displayContent;
          summary.mainWorkMoveframe = moveframe;
          console.log(`   ✅ [workoutHelpers] Set as MAIN work for ${moveframe.sport}: "${displayContent.substring(0, 40)}"`);
        }
        
        // Set secondary work description and moveframe object if this moveframe is marked as SECONDARY
        if (moveframe.workType === 'SECONDARY' && displayContent) {
          summary.secondaryWork = displayContent;
          summary.secondaryWorkMoveframe = moveframe;
          console.log(`   ✅ [workoutHelpers] Set as SECONDARY work for ${moveframe.sport}: "${displayContent.substring(0, 40)}"`);
        }
        
        // For ALL sports: sum the repetitions/series from each moveframe
        // For distance-based sports: repetitions = number of laps planned
        // For series-based sports: repetitions = number of series planned
        
        if (isSeries) {
          // For NON-AEROBIC (series-based) sports
          if (moveframe.manualMode) {
            // For manual input: use the total series from movelaps count
            const totalSeries = moveframe.movelaps?.length || 0;
            summary.series += totalSeries;
            
            // Calculate total repetitions (sum of all reps across all series)
            (moveframe.movelaps || []).forEach((lap: any) => {
              summary.repetitions += parseInt(lap.reps) || 0;
            });
          } else {
            // For standard mode: use repetitions field
            const moveframeRepetitions = parseInt(moveframe.repetitions) || 0;
            summary.series += moveframeRepetitions;
            
            // Calculate total reps (series × reps per series)
            (moveframe.movelaps || []).forEach((lap: any) => {
              summary.repetitions += parseInt(lap.reps) || 0;
            });
          }
        } else {
          // For AEROBIC (distance-based) sports
          // Sum distances and duration from movelaps (works for both manual and standard mode)
          if (moveframe.movelaps) {
            moveframe.movelaps.forEach((movelap: any) => {
              if (movelap.distance) {
                summary.distance += Number(movelap.distance);
              }
              
              // Parse and sum time duration
              if (movelap.time) {
                const timeStr = movelap.time.toString();
                let totalSeconds = 0;
                
                // Check for our custom format: 1h23'45"6
                if (timeStr.includes('h') || timeStr.includes("'")) {
                  const match = timeStr.match(/(\d+)h(\d+)'(\d+)"(\d)?/);
                  if (match) {
                    const hours = parseInt(match[1]) || 0;
                    const minutes = parseInt(match[2]) || 0;
                    const seconds = parseInt(match[3]) || 0;
                    totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
                  }
                }
                // Check for HH:MM:SS format
                else if (timeStr.includes(':')) {
                  const parts = timeStr.split(':');
                  const hours = parseInt(parts[0]) || 0;
                  const minutes = parseInt(parts[1]) || 0;
                  const seconds = parseInt(parts[2]) || 0;
                  totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
                }
                // Plain number (assume minutes)
                else {
                  const mins = parseFloat(timeStr) || 0;
                  totalSeconds = mins * 60;
                }
                
                // Add to duration (stored in summary as total seconds for now)
                if (!summary.durationSeconds) {
                  summary.durationSeconds = 0;
                }
                summary.durationSeconds += totalSeconds;
              }
            });
          }
        }
      });
    }
  });

  // Apply validation logic - prevent same moveframe from being both main and secondary
  sportMap.forEach(summary => {
    const moveframes = summary.moveframes;
    
    // CRITICAL: Prevent same moveframe from being both main and secondary
    if (summary.mainWorkMoveframe && summary.secondaryWorkMoveframe && 
        summary.mainWorkMoveframe.id === summary.secondaryWorkMoveframe.id) {
      console.warn(`⚠️ [workoutHelpers] Same moveframe (${summary.mainWorkMoveframe.letter}) set as both MAIN and SECONDARY - clearing secondary`);
      summary.secondaryWork = '';
      summary.secondaryWorkMoveframe = null;
    }
    
    // NOTE: Removed automatic fallback logic
    // Moveframes will ONLY appear in main/secondary work columns when explicitly set via workType
    // Users must explicitly set workType to 'MAIN' or 'SECONDARY' for moveframes to appear
  });

  // Convert to final format
  const summaries = Array.from(sportMap.values()).map(summary => {
    // Format duration as HH:MM:SS for distance-based sports
    let durationDisplay = '0:00:00';
    if (summary.isSeriesBased) {
      durationDisplay = summary.repetitions.toString();
    } else if (summary.durationSeconds && summary.durationSeconds > 0) {
      const hours = Math.floor(summary.durationSeconds / 3600);
      const minutes = Math.floor((summary.durationSeconds % 3600) / 60);
      const seconds = Math.floor(summary.durationSeconds % 60);
      
      // Format as HH:MM:SS
      durationDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return {
      sport: summary.sport,
      icon: summary.icon,
      name: summary.name,
      distance: summary.isSeriesBased ? summary.series : summary.distance,
      duration: durationDisplay,
      color: summary.color,
      isSeriesBased: summary.isSeriesBased,
      descriptions: summary.descriptions,
      mainWork: summary.mainWork,
      secondaryWork: summary.secondaryWork,
      mainWorkMoveframe: summary.mainWorkMoveframe,
      secondaryWorkMoveframe: summary.secondaryWorkMoveframe
    };
  });

  // Return up to 4 sports
  return summaries.slice(0, 4);
}

/** Sport icons/totals for a single workout (tree view, etc.) */
export function calculateWorkoutSportSummaries(
  workout: any,
  iconType: 'emoji' | 'icon' = 'emoji'
): SportSummary[] {
  if (!workout?.moveframes?.length) return [];
  return calculateSportSummaries({ workouts: [workout] }, iconType);
}

/** Display label for sport total in tree / compact UIs */
export function formatSportSummaryTotal(summary: SportSummary): string {
  if (summary.isSeriesBased) {
    return summary.distance > 0 ? `${summary.distance} series` : '—';
  }
  return summary.distance > 0 ? `${summary.distance}m` : '—';
}

/**
 * Calculate total distance for a day
 * 
 * @param day - Day object with workouts and moveframes
 * @returns Total distance in meters
 */
export function calculateDayTotalDistance(day: any): number {
  const summaries = calculateSportSummaries(day);
  return summaries.reduce((total, summary) => total + summary.distance, 0);
}

/**
 * Get unique sports from a day
 * 
 * @param day - Day object with workouts and moveframes
 * @returns Array of unique sport names
 */
export function getUniqueSportsFromDay(day: any): string[] {
  if (!day.workouts || day.workouts.length === 0) {
    return [];
  }

  const sports = new Set<string>();
  
  day.workouts.forEach((workout: any) => {
    if (workout.moveframes) {
      workout.moveframes.forEach((moveframe: any) => {
        if (moveframe.sport) {
          sports.add(moveframe.sport);
        }
      });
    }
  });

  return Array.from(sports);
}

