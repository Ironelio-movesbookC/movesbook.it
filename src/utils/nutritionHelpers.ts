/**
 * NutritionMeal Helper Utilities
 * Extracted from various workout components for reusability
 */

import { getSportIcon } from './sportIcons';
import { isSeriesBasedSport } from '@/constants/nutrition-food.constants';

export interface SportSummary {
  sport: string;
  icon: string;
  name: string; // Section name
  distance: number;
  duration: string;
  color: string;
  isSeriesBased?: boolean;
  descriptions?: string[]; // All nutritionFood descriptions
  mainWork?: string; // Main work nutritionFood description
  secondaryWork?: string; // Secondary work nutritionFood description
  mainWorkNutritionFood?: any | null; // Full main work nutritionFood object
  secondaryWorkNutritionFood?: any | null; // Full secondary work nutritionFood object
}

/**
 * Calculate sport summaries for a day (up to 4 sports)
 * Extracted from DayRowTable.tsx
 * 
 * @param day - Day object with workouts and nutrition_foods
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

  const sportMap = new Map<string, SportSummary & { series: number; repetitions: number; descriptions: string[]; mainWork: string; secondaryWork: string; nutrition_foods: any[]; mainWorkNutritionFood: any | null; secondaryWorkNutritionFood: any | null; durationSeconds?: number }>();

  day.workouts.forEach((workout: any) => {
    if (workout.nutrition_foods) {
      workout.nutrition_foods.forEach((nutritionFood: any) => {
        const sport = nutritionFood.sport;
        const sectionName = nutritionFood.section?.name || 'No Section';
        const sectionColor = nutritionFood.section?.color || '#E5E7EB';
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
            nutrition_foods: [],
            mainWorkNutritionFood: null,
            secondaryWorkNutritionFood: null
          });
        }

        const summary = sportMap.get(sport)!;
        
        // Store nutritionFood for later processing
        summary.nutrition_foods.push(nutritionFood);
        
        // Get display content - for manual mode, ALWAYS use notes first (full content)
        // Description might be truncated due to database constraints
        const displayContent = nutritionFood.manualMode 
          ? (nutritionFood.notes || nutritionFood.description || '') 
          : (nutritionFood.description || '');
        
        // Debug logging for manual mode
        if (nutritionFood.manualMode) {
          console.log(`   🔍 [nutritionHelpers] Manual mode nutritionFood ${nutritionFood.letter}:`, {
            manualMode: nutritionFood.manualMode,
            hasDescription: !!nutritionFood.description,
            hasNotes: !!nutritionFood.notes,
            descriptionLength: nutritionFood.description?.length || 0,
            notesLength: nutritionFood.notes?.length || 0,
            displayContentLength: displayContent?.length || 0,
            usingField: nutritionFood.notes ? 'notes (full content)' : 'description',
            workType: nutritionFood.workType
          });
        }
        
        // Add nutritionFood description if available
        if (displayContent) {
          summary.descriptions.push(displayContent);
        }
        
        // Debug: Log nutritionFood workType
        console.log(`   📋 [nutritionHelpers] NutritionFood ${nutritionFood.letter || '?'} - ID: ${nutritionFood.id}, Sport: ${nutritionFood.sport}, workType: "${nutritionFood.workType}" (type: ${typeof nutritionFood.workType}), hasWorkType: ${nutritionFood.hasOwnProperty('workType')}`);
        
        // Set main work description and nutritionFood object if this nutritionFood is marked as MAIN
        if (nutritionFood.workType === 'MAIN' && displayContent) {
          summary.mainWork = displayContent;
          summary.mainWorkNutritionFood = nutritionFood;
          console.log(`   ✅ [nutritionHelpers] Set as MAIN work for ${nutritionFood.sport}: "${displayContent.substring(0, 40)}"`);
        }
        
        // Set secondary work description and nutritionFood object if this nutritionFood is marked as SECONDARY
        if (nutritionFood.workType === 'SECONDARY' && displayContent) {
          summary.secondaryWork = displayContent;
          summary.secondaryWorkNutritionFood = nutritionFood;
          console.log(`   ✅ [nutritionHelpers] Set as SECONDARY work for ${nutritionFood.sport}: "${displayContent.substring(0, 40)}"`);
        }
        
        // For ALL sports: sum the repetitions/series from each nutritionFood
        // For distance-based sports: repetitions = number of laps planned
        // For series-based sports: repetitions = number of series planned
        
        if (isSeries) {
          // For NON-AEROBIC (series-based) sports
          if (nutritionFood.manualMode) {
            // For manual input: use the total series from nutrition_components count
            const totalSeries = nutritionFood.nutrition_components?.length || 0;
            summary.series += totalSeries;
            
            // Calculate total repetitions (sum of all reps across all series)
            (nutritionFood.nutrition_components || []).forEach((lap: any) => {
              summary.repetitions += parseInt(lap.reps) || 0;
            });
          } else {
            // For standard mode: use repetitions field
            const nutritionFoodRepetitions = parseInt(nutritionFood.repetitions) || 0;
            summary.series += nutritionFoodRepetitions;
            
            // Calculate total reps (series × reps per series)
            (nutritionFood.nutrition_components || []).forEach((lap: any) => {
              summary.repetitions += parseInt(lap.reps) || 0;
            });
          }
        } else {
          // For AEROBIC (distance-based) sports
          // Sum distances and duration from nutrition_components (works for both manual and standard mode)
          if (nutritionFood.nutrition_components) {
            nutritionFood.nutrition_components.forEach((nutritionComponent: any) => {
              if (nutritionComponent.distance) {
                summary.distance += Number(nutritionComponent.distance);
              }
              
              // Parse and sum time duration
              if (nutritionComponent.time) {
                const timeStr = nutritionComponent.time.toString();
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

  // Apply validation logic - prevent same nutritionFood from being both main and secondary
  sportMap.forEach(summary => {
    const nutrition_foods = summary.nutrition_foods;
    
    // CRITICAL: Prevent same nutritionFood from being both main and secondary
    if (summary.mainWorkNutritionFood && summary.secondaryWorkNutritionFood && 
        summary.mainWorkNutritionFood.id === summary.secondaryWorkNutritionFood.id) {
      console.warn(`⚠️ [nutritionHelpers] Same nutritionFood (${summary.mainWorkNutritionFood.letter}) set as both MAIN and SECONDARY - clearing secondary`);
      summary.secondaryWork = '';
      summary.secondaryWorkNutritionFood = null;
    }
    
    // NOTE: Removed automatic fallback logic
    // NutritionFoods will ONLY appear in main/secondary work columns when explicitly set via workType
    // Users must explicitly set workType to 'MAIN' or 'SECONDARY' for nutrition_foods to appear
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
      mainWorkNutritionFood: summary.mainWorkNutritionFood,
      secondaryWorkNutritionFood: summary.secondaryWorkNutritionFood
    };
  });

  // Return up to 4 sports
  return summaries.slice(0, 4);
}

/**
 * Calculate total distance for a day
 * 
 * @param day - Day object with workouts and nutrition_foods
 * @returns Total distance in meters
 */
export function calculateDayTotalDistance(day: any): number {
  const summaries = calculateSportSummaries(day);
  return summaries.reduce((total, summary) => total + summary.distance, 0);
}

/**
 * Get unique sports from a day
 * 
 * @param day - Day object with workouts and nutrition_foods
 * @returns Array of unique sport names
 */
export function getUniqueSportsFromDay(day: any): string[] {
  if (!day.workouts || day.workouts.length === 0) {
    return [];
  }

  const sports = new Set<string>();
  
  day.workouts.forEach((workout: any) => {
    if (workout.nutrition_foods) {
      workout.nutrition_foods.forEach((nutritionFood: any) => {
        if (nutritionFood.sport) {
          sports.add(nutritionFood.sport);
        }
      });
    }
  });

  return Array.from(sports);
}

