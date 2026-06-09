import { useState, useEffect } from 'react';

interface UseWorkoutExpansionProps {
  nutritionPlan: any;
  activeSection: string;
  selectedAthleteId?: string;
}

/**
 * Custom hook to manage expansion/collapse state for weeks, days, and workouts
 * Extracted from NutritionSection.tsx
 */
export function useNutritionExpansion({ 
  nutritionPlan, 
  activeSection, 
  selectedAthleteId 
}: UseWorkoutExpansionProps) {
  // ==================== EXPANSION STATES ====================
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [fullyExpandedWorkouts, setFullyExpandedWorkouts] = useState<Set<string>>(new Set()); // Workouts with nutritionFoods visible
  const [workoutsWithExpandedNutritionComponents, setWorkoutsWithExpandedNutritionComponents] = useState<Set<string>>(new Set()); // Workouts with nutrition_components expanded
  
  // Track last auto-expand key to prevent repeated expansion
  const [lastAutoExpandKey, setLastAutoExpandKey] = useState<string>('');
  
  // ==================== TOGGLE FUNCTIONS ====================
  
  /**
   * Toggle day expansion
   * When a day is expanded, its workouts become visible
   */
  const toggleDayExpansion = (dayId: string) => {
    // console.log(`📅 toggleDayExpansion called for day: ${dayId}`);
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(dayId);
      if (wasExpanded) {
        newSet.delete(dayId);
        // console.log(`📉 Collapsed DAY ${dayId}. This HIDES ALL WORKOUTS in this day!`);
      } else {
        newSet.add(dayId);
        // console.log(`📈 Expanded DAY ${dayId}. Workouts will be visible.`);
      }
      return newSet;
    });
  };

  /**
   * Toggle workout expansion - Simple 1-click toggle
   * Collapsed → Expanded (shows nutrition_foods)
   * Expanded → Collapsed
   */
  const toggleWorkoutExpansion = (nutritionMealId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(nutritionMealId);
      if (wasExpanded) {
        newSet.delete(nutritionMealId);
        setFullyExpandedWorkouts(prevFull => {
          const newFullSet = new Set(prevFull);
          newFullSet.delete(nutritionMealId);
          return newFullSet;
        });
        setWorkoutsWithExpandedNutritionComponents(prevMo => {
          const next = new Set(prevMo);
          next.delete(nutritionMealId);
          return next;
        });
      } else {
        newSet.add(nutritionMealId);
        setFullyExpandedWorkouts(prevFull => new Set(prevFull).add(nutritionMealId));
      }
      return newSet;
    });
  };

  /**
   * Toggle week expansion
   */
  const toggleWeekExpansion = (weekId: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekId)) {
        newSet.delete(weekId);
      } else {
        newSet.add(weekId);
      }
      return newSet;
    });
  };

  /**
   * Expand all days (but NOT workouts)
   * This shows workout headers but keeps nutritionFoods hidden
   */
  const expandAll = () => {
    if (!nutritionPlan || !nutritionPlan.weeks) return;
    
    const dayIds = new Set<string>();
    
    nutritionPlan.weeks.forEach((week: any) => {
      week.days?.forEach((day: any) => {
        dayIds.add(day.id);
      });
    });
    
    console.log(`✅ Auto-expanded ${dayIds.size} days (workouts remain collapsed)`);
    setExpandedDays(dayIds);
    // Do NOT expand workouts - keep nutritionFoods hidden
    setExpandedWorkouts(new Set()); // Explicitly collapse all workouts
    setFullyExpandedWorkouts(new Set()); // No nutritionFoods shown
  };

  /**
   * Expand all days AND all workouts (shows everything including nutrition_foods)
   */
  const expandAllWithWorkouts = () => {
    if (!nutritionPlan || !nutritionPlan.weeks) return;
    
    const dayIds = new Set<string>();
    const workoutIds = new Set<string>();
    
    nutritionPlan.weeks.forEach((week: any) => {
      week.days?.forEach((day: any) => {
        dayIds.add(day.id);
        day.meals?.forEach((meal: any) => {
          workoutIds.add(meal.id);
        });
      });
    });
    
    console.log(`✅ Expanded all: ${dayIds.size} days and ${workoutIds.size} workouts`);
    setExpandedDays(dayIds);
    setExpandedWorkouts(workoutIds);
    // Also fully expand all workouts (show nutrition_foods)
    setFullyExpandedWorkouts(workoutIds);
  };

  /**
   * Collapse all days and workouts
   */
  const collapseAll = () => {
    console.log('📉 Collapsing all days and workouts');
    setExpandedDays(new Set());
    setExpandedWorkouts(new Set());
    setFullyExpandedWorkouts(new Set());
    setWorkoutsWithExpandedNutritionComponents(new Set());
  };

  /**
   * Expand specific day and its workouts
   */
  const expandDay = (dayId: string) => {
    setExpandedDays(prev => new Set(prev).add(dayId));
  };

  /**
   * Expand specific workout
   */
  const expandWorkout = (nutritionMealId: string) => {
    setExpandedWorkouts(prev => new Set(prev).add(nutritionMealId));
    setFullyExpandedWorkouts(prev => new Set(prev).add(nutritionMealId));
  };

  /**
   * Collapse specific day
   */
  const collapseDay = (dayId: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      newSet.delete(dayId);
      return newSet;
    });
  };

  /**
   * Collapse specific workout
   */
  const collapseWorkout = (nutritionMealId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      newSet.delete(nutritionMealId);
      return newSet;
    });
    setFullyExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      newSet.delete(nutritionMealId);
      return newSet;
    });
    setWorkoutsWithExpandedNutritionComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(nutritionMealId);
      return newSet;
    });
  };

  /**
   * Expand a day but keep all workouts COLLAPSED (nutritionFoods not shown)
   * Used when clicking on the day row itself
   * This shows workout headers but keeps nutritionFood details hidden
   */
  const expandDayWithAllWorkouts = (dayId: string, meals: any[]) => {
    console.log(`📅 expandDayWithAllWorkouts called for day: ${dayId} with ${meals?.length || 0} meals`);
    
    const workoutIds = meals?.map(m => m?.id).filter(Boolean) || [];
    console.log(`🔒 Will collapse workout IDs:`, workoutIds);
    
    // Expand the day
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      newSet.add(dayId);
      console.log(`📅 Expanded day ${dayId}`);
      return newSet;
    });
    
    // Force collapse all workouts in this day (ensures nutritionFoods are hidden)
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      let collapsedCount = 0;
      
      // Remove ALL workouts from this day from the expanded set
      workoutIds.forEach(id => {
        if (newSet.has(id)) {
          newSet.delete(id);
          collapsedCount++;
          console.log(`📉 Collapsed workout ${id}`);
        }
      });
      
      console.log(`✅ Collapsed ${collapsedCount} workouts. Remaining expanded: ${newSet.size}`);
      return newSet;
    });
  };

  /**
   * 3-state cycle for workout numbers in day table:
   * State 0 (closed) → State 1 (show nutrition_foods) → State 2 (show nutrition_components) → back to State 0
   */
  const cycleWorkoutExpansion = (nutritionMealId: string, dayId: string) => {
    const isExpanded = expandedWorkouts.has(nutritionMealId);
    const hasNutritionComponents = workoutsWithExpandedNutritionComponents.has(nutritionMealId);
    
    setExpandedDays(prev => new Set(prev).add(dayId));
    
    if (!isExpanded) {
      console.log(`🔢 Cycle: State 0 → 1 (Show foods for meal ${nutritionMealId})`);
      setExpandedWorkouts(prev => new Set(prev).add(nutritionMealId));
      setFullyExpandedWorkouts(prev => new Set(prev).add(nutritionMealId));
    } else if (isExpanded && !hasNutritionComponents) {
      console.log(`🔢 Cycle: State 1 → 2 (Show components for meal ${nutritionMealId})`);
      setWorkoutsWithExpandedNutritionComponents(prev => new Set(prev).add(nutritionMealId));
    } else {
      console.log(`🔢 Cycle: State 2 → 0 (Close meal ${nutritionMealId})`);
      setExpandedWorkouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(nutritionMealId);
        return newSet;
      });
      setFullyExpandedWorkouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(nutritionMealId);
        return newSet;
      });
      setWorkoutsWithExpandedNutritionComponents(prev => {
        const newSet = new Set(prev);
        newSet.delete(nutritionMealId);
        return newSet;
      });
    }
  };

  // ==================== AUTO-EXPANSION EFFECT ====================
  
  /**
   * Auto-expand all days and workouts when section/athlete changes
   * Only runs once per section/athlete combination
   */
  useEffect(() => {
    // Create a unique key for current section + athlete combo
    const currentKey = `${activeSection}-${selectedAthleteId || 'self'}`;
    
    // If section changed, IMMEDIATELY clear old state to prevent showing stale data
    if (currentKey !== lastAutoExpandKey) {
      // console.log(`🔄 Section changed to: ${currentKey} (was: ${lastAutoExpandKey})`);
      // console.log(`🧹 Clearing old expansion state immediately...`);
      setExpandedDays(new Set());
      setExpandedWorkouts(new Set());
      setExpandedWeeks(new Set());
      setFullyExpandedWorkouts(new Set());
      setWorkoutsWithExpandedNutritionComponents(new Set());
      setLastAutoExpandKey(currentKey);
    }
    
    if (!nutritionPlan || !nutritionPlan.weeks) {
      // console.log('⏳ Waiting for nutritionPlan to load...');
      return;
    }
    
    // Auto-expand disabled - default state is collapsed
    // Users can manually expand using the "Expand All" button
    // if (currentKey === lastAutoExpandKey && expandedDays.size === 0) {
    //   expandAll();
    // }
  }, [nutritionPlan, activeSection, selectedAthleteId, lastAutoExpandKey, expandedDays.size]);

  // ==================== RETURN VALUES ====================
  return {
    // State
    expandedWeeks,
    expandedDays,
    expandedWorkouts,
    fullyExpandedWorkouts,
    workoutsWithExpandedNutritionComponents,
    
    // Actions
    toggleDayExpansion,
    toggleWorkoutExpansion,
    toggleWeekExpansion,
    expandAll,
    expandAllWithWorkouts,
    collapseAll,
    expandDay,
    expandWorkout,
    collapseDay,
    collapseWorkout,
    expandDayWithAllWorkouts,
    cycleWorkoutExpansion,
    
    // Setters (for direct control if needed)
    setExpandedWeeks,
    setExpandedDays,
    setExpandedWorkouts,
    setFullyExpandedWorkouts,
    setWorkoutsWithExpandedNutritionComponents,
  };
}

