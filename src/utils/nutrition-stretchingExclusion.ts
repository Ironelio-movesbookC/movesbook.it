/**
 * Utility functions for stretching exclusion logic in workout totals
 */

/**
 * Determines if stretching should be excluded from sport totals
 * 
 * Rules:
 * 1. Auto-exclude if there are 4+ sports AND stretching is one of them
 * 2. Manual-exclude if user has checked the "Exclude stretching" checkbox
 * 
 * @param sports - Array of sport names
 * @param manualExclude - Whether user has manually checked the exclude box
 * @returns Filtered array of sports (with stretching potentially removed)
 */
export function filterSportsForTotals(
  sports: string[], 
  manualExclude: boolean = false
): string[] {
  const hasStretching = sports.some(s => 
    s.toLowerCase() === 'stretching' || 
    s.toLowerCase() === 'stretch'
  );
  
  // Rule 1: Auto-exclude stretching if there are 4+ sports and stretching is one of them
  if (sports.length >= 4 && hasStretching) {
    return sports.filter(s => 
      s.toLowerCase() !== 'stretching' && 
      s.toLowerCase() !== 'stretch'
    );
  }
  
  // Rule 2: Manual exclusion if checkbox is checked
  if (manualExclude && hasStretching) {
    return sports.filter(s => 
      s.toLowerCase() !== 'stretching' && 
      s.toLowerCase() !== 'stretch'
    );
  }
  
  return sports;
}

/**
 * Check if stretching should be automatically excluded
 * (Used for showing warning messages)
 */
export function shouldAutoExcludeStretching(sports: string[]): boolean {
  const hasStretching = sports.some(s => 
    s.toLowerCase() === 'stretching' || 
    s.toLowerCase() === 'stretch'
  );
  
  return sports.length >= 4 && hasStretching;
}

/**
 * Get sports count for totals (after applying stretching exclusion rules)
 */
export function getSportsCountForTotals(
  sports: string[], 
  manualExclude: boolean = false
): number {
  return filterSportsForTotals(sports, manualExclude).length;
}

