import { useState, useEffect } from 'react';

interface UseWorkoutExpansionProps {
  workoutPlan: any;
  activeSection: string;
  selectedAthleteId?: string;
}

/**
 * Custom hook to manage expansion/collapse state for weeks, days, and workouts
 * Extracted from WorkoutSection.tsx
 */
export function useWorkoutExpansion({ 
  workoutPlan, 
  activeSection, 
  selectedAthleteId 
}: UseWorkoutExpansionProps) {
  // ==================== EXPANSION STATES ====================
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [fullyExpandedWorkouts, setFullyExpandedWorkouts] = useState<Set<string>>(new Set()); // Workouts with moveframes visible
  const [workoutsWithExpandedMovelaps, setWorkoutsWithExpandedMovelaps] = useState<Set<string>>(new Set()); // Workouts with movelaps expanded
  
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
   * Collapsed → Expanded (shows moveframes)
   * Expanded → Collapsed
   */
  const toggleWorkoutExpansion = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      const wasExpanded = newSet.has(workoutId);
      if (wasExpanded) {
        newSet.delete(workoutId);
        // Also remove from fully expanded
        setFullyExpandedWorkouts(prevFull => {
          const newFullSet = new Set(prevFull);
          newFullSet.delete(workoutId);
          return newFullSet;
        });
      } else {
        newSet.add(workoutId);
        // Also add to fully expanded (show moveframes immediately)
        setFullyExpandedWorkouts(prevFull => new Set(prevFull).add(workoutId));
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
   * This shows workout headers but keeps moveframes hidden
   */
  const expandAll = () => {
    if (!workoutPlan || !workoutPlan.weeks) return;
    
    const dayIds = new Set<string>();
    
    workoutPlan.weeks.forEach((week: any) => {
      week.days?.forEach((day: any) => {
        dayIds.add(day.id);
      });
    });
    
    console.log(`✅ Auto-expanded ${dayIds.size} days (workouts remain collapsed)`);
    setExpandedDays(dayIds);
    // Do NOT expand workouts - keep moveframes hidden
    setExpandedWorkouts(new Set()); // Explicitly collapse all workouts
    setFullyExpandedWorkouts(new Set()); // No moveframes shown
  };

  /**
   * Expand all days AND all workouts (shows everything including moveframes)
   */
  const expandAllWithWorkouts = () => {
    if (!workoutPlan || !workoutPlan.weeks) return;
    
    const dayIds = new Set<string>();
    const workoutIds = new Set<string>();
    
    workoutPlan.weeks.forEach((week: any) => {
      week.days?.forEach((day: any) => {
        dayIds.add(day.id);
        day.workouts?.forEach((workout: any) => {
          workoutIds.add(workout.id);
        });
      });
    });
    
    console.log(`✅ Expanded all: ${dayIds.size} days and ${workoutIds.size} workouts`);
    setExpandedDays(dayIds);
    setExpandedWorkouts(workoutIds);
    // Also fully expand all workouts (show moveframes)
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
    setWorkoutsWithExpandedMovelaps(new Set());
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
  const expandWorkout = (workoutId: string) => {
    setExpandedWorkouts(prev => new Set(prev).add(workoutId));
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
  const collapseWorkout = (workoutId: string) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      newSet.delete(workoutId);
      return newSet;
    });
  };

  /**
   * Expand a day but keep all workouts COLLAPSED (moveframes not shown)
   * Used when clicking on the day row itself
   * This shows workout headers but keeps moveframe details hidden
   */
  const expandDayWithAllWorkouts = (dayId: string, meals: any[]) => {
    console.log(`📅 expandDayWithAllWorkouts called for day: ${dayId} with ${meals?.length || 0} workouts`);
    
    // Get workout IDs to collapse
    const workoutIds = meals?.map((w: { id?: string }) => w?.id).filter((id): id is string => Boolean(id)) || [];
    console.log(`🔒 Will collapse workout IDs:`, workoutIds);
    
    // Expand the day
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      newSet.add(dayId);
      console.log(`📅 Expanded day ${dayId}`);
      return newSet;
    });
    
    // Force collapse all workouts in this day (ensures moveframes are hidden)
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
   * State 0 (closed) → State 1 (show moveframes) → State 2 (show movelaps) → back to State 0
   */
  const cycleWorkoutExpansion = (workoutId: string, dayId: string) => {
    const isExpanded = expandedWorkouts.has(workoutId);
    const hasMovelaps = workoutsWithExpandedMovelaps.has(workoutId);
    
    // Ensure day is expanded first
    setExpandedDays(prev => new Set(prev).add(dayId));
    
    // Determine current state and cycle to next
    if (!isExpanded) {
      // State 0 (closed) → State 1 (show moveframes only)
      console.log(`🔢 Cycle: State 0 → 1 (Show moveframes for workout ${workoutId})`);
      setExpandedWorkouts(prev => new Set(prev).add(workoutId));
      setFullyExpandedWorkouts(prev => new Set(prev).add(workoutId));
      // Do NOT add to workoutsWithExpandedMovelaps yet (movelaps stay collapsed)
    } else if (isExpanded && !hasMovelaps) {
      // State 1 (moveframes shown) → State 2 (show movelaps)
      console.log(`🔢 Cycle: State 1 → 2 (Show movelaps for workout ${workoutId})`);
      setWorkoutsWithExpandedMovelaps(prev => new Set(prev).add(workoutId));
    } else {
      // State 2 (movelaps shown) → State 0 (close all)
      console.log(`🔢 Cycle: State 2 → 0 (Close workout ${workoutId})`);
      setExpandedWorkouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
      setFullyExpandedWorkouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
        return newSet;
      });
      setWorkoutsWithExpandedMovelaps(prev => {
        const newSet = new Set(prev);
        newSet.delete(workoutId);
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
      setWorkoutsWithExpandedMovelaps(new Set());
      setLastAutoExpandKey(currentKey);
    }
    
    if (!workoutPlan || !workoutPlan.weeks) {
      // console.log('⏳ Waiting for workoutPlan to load...');
      return;
    }
    
    // Auto-expand disabled - default state is collapsed
    // Users can manually expand using the "Expand All" button
    // if (currentKey === lastAutoExpandKey && expandedDays.size === 0) {
    //   expandAll();
    // }
  }, [workoutPlan, activeSection, selectedAthleteId, lastAutoExpandKey, expandedDays.size]);

  // ==================== RETURN VALUES ====================
  return {
    // State
    expandedWeeks,
    expandedDays,
    expandedWorkouts,
    fullyExpandedWorkouts,
    workoutsWithExpandedMovelaps,
    
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
    setWorkoutsWithExpandedMovelaps,
  };
}

