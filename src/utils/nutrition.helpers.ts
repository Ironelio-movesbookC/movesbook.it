/**
 * NutritionMeal Helper Functions
 * Reusable utility functions for workout calculations and validations
 */

import { 
  NUTRITION_SECTIONS, 
  DATE_RANGES, 
  COACH_ROLES, 
  UI_CONFIG 
} from '@/config/nutrition.constants';
import type { 
  SectionId, 
  UserType, 
  NutritionDay, 
  Workout, 
  NutritionFood 
} from '@/types/nutrition.types';

// ==================== DATE HELPERS ====================
export const dateHelpers = {
  /**
   * Get today's date at midnight
   */
  getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  },

  /**
   * Add days to a date
   */
  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Add weeks to a date
   */
  addWeeks(date: Date, weeks: number): Date {
    return dateHelpers.addDays(date, weeks * 7);
  },

  /**
   * Check if a date is within range
   */
  isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  },

  /**
   * Get the Monday of the week containing the given date
   */
  getMonday(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  },

  /**
   * Calculate week number from start date
   */
  getWeekNumber(date: Date, yearStartDate: Date): number {
    const diffTime = Math.abs(date.getTime() - yearStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  },

  /**
   * Get weekday number (1=Monday, 7=Sunday)
   */
  getWeekday(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  },

  /**
   * Format date for display
   */
  formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (format === 'long') {
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  },

  /**
   * Parse date string to Date object
   */
  parseDate(dateString: string): Date {
    return new Date(dateString);
  }
};

// ==================== SECTION HELPERS ====================
export const sectionHelpers = {
  /**
   * Check if user can add days in a section
   */
  canAddDays(section: SectionId): boolean {
    return NUTRITION_SECTIONS[section].canAddDays;
  },

  /**
   * Check if date is allowed in section
   */
  isDateAllowedForSection(date: Date, section: SectionId): boolean {
    const today = dateHelpers.getToday();

    if (section === 'A') {
      // Section A: only current 3 weeks
      const threeWeeksAhead = dateHelpers.addDays(today, DATE_RANGES.CURRENT_WEEKS.days);
      return dateHelpers.isDateInRange(date, today, threeWeeksAhead);
    }

    if (section === 'B') {
      // Section B: day 22 onwards for one year
      const startDate = dateHelpers.addDays(today, DATE_RANGES.YEARLY_PLAN.startOffset + 1);
      const endDate = dateHelpers.addDays(startDate, DATE_RANGES.YEARLY_PLAN.days);
      return dateHelpers.isDateInRange(date, startDate, endDate);
    }

    if (section === 'C') {
      // Section C: only past dates
      return date < today;
    }

    if (section === 'D') {
      // Section D: archive - any date
      return true;
    }

    if (section === 'W') {
      return true;
    }

    return false;
  },

  /**
   * Get section configuration
   */
  getSectionConfig(section: SectionId) {
    return NUTRITION_SECTIONS[section];
  },

  /**
   * Get plan type for section
   */
  getPlanType(section: SectionId): string {
    return NUTRITION_SECTIONS[section].planType;
  }
};

// ==================== PERMISSION HELPERS ====================
export const permissionHelpers = {
  /**
   * Check if user is a coach-type role
   */
  isCoachRole(userType: UserType): boolean {
    return COACH_ROLES.includes(userType as any);
  },

  /**
   * Check if user can edit in section
   */
  canEditInSection(section: SectionId, userType: UserType): boolean {
    const config = NUTRITION_SECTIONS[section];
    
    // Archive is read-only for everyone except admins
    if (section === 'D' && userType !== 'ADMIN') {
      return false;
    }

    return config.isEditable;
  },

  /**
   * Check if user can delete in section
   */
  canDeleteInSection(section: SectionId, userType: UserType): boolean {
    // Same rules as edit for now
    return permissionHelpers.canEditInSection(section, userType);
  }
};

// ==================== WORKOUT HELPERS ====================
export const nutritionHelpers = {
  /**
   * Calculate total distance for a day
   */
  calculateDayTotalDistance(day: NutritionDay, excludeStretching: boolean = false): number {
    let total = 0;
    
    day.meals?.forEach(workout => {
      workout.nutritionFoods?.forEach(nutritionFood => {
        if (excludeStretching && nutritionFood.sport === 'STRETCHING') {
          return;
        }
        total += nutritionFood.totalDistance || 0;
      });
    });
    
    return total;
  },

  /**
   * Calculate total duration for a day (in minutes)
   */
  calculateDayTotalDuration(day: NutritionDay): number {
    let total = 0;
    day.meals?.forEach(workout => {
      total += workout.durationMinutes || 0;
    });
    return total;
  },

  /**
   * Get sports in a day
   */
  getDaySports(day: NutritionDay, excludeStretching: boolean = false): string[] {
    const sports = new Set<string>();
    
    day.meals?.forEach(workout => {
      workout.nutritionFoods?.forEach(nutritionFood => {
        if (excludeStretching && nutritionFood.sport === 'STRETCHING') {
          return;
        }
        sports.add(nutritionFood.sport);
      });
    });
    
    return Array.from(sports);
  },

  /**
   * Check if day has workouts
   */
  hasMeals(day: NutritionDay): boolean {
    return day.meals && day.meals.length > 0;
  },

  /** @deprecated use hasMeals */
  hasWorkouts(day: NutritionDay): boolean {
    return nutritionHelpers.hasMeals(day);
  },

  getMealCount(day: NutritionDay): number {
    return day.meals?.length || 0;
  },

  getWorkoutCount(day: NutritionDay): number {
    return nutritionHelpers.getMealCount(day);
  },

  canAddMealToDay(day: NutritionDay): boolean {
    return nutritionHelpers.getMealCount(day) < UI_CONFIG.MAX_MEALS_PER_DAY;
  },

  canAddWorkoutToDay(day: NutritionDay): boolean {
    return nutritionHelpers.canAddMealToDay(day);
  },

  getNextSessionNumber(day: NutritionDay): number {
    if (!day.meals || day.meals.length === 0) return 1;
    
    const usedNumbers = new Set(day.meals.map(w => w.sessionNumber));
    for (let i = 1; i <= UI_CONFIG.MAX_MEALS_PER_DAY; i++) {
      if (!usedNumbers.has(i)) return i;
    }
    return 1;
  },

  /**
   * Generate next nutritionFood code
   */
  getNextNutritionFoodCode(workout: Workout): string {
    if (!workout.nutritionFoods || workout.nutritionFoods.length === 0) {
      return 'A';
    }

    const codes = workout.nutritionFoods.map(mf => mf.code).sort();
    const lastCode = codes[codes.length - 1];

    // Single letter codes (A-Z)
    if (lastCode.length === 1) {
      if (lastCode === 'Z') {
        return 'AA';
      }
      return String.fromCharCode(lastCode.charCodeAt(0) + 1);
    }

    // Multi-letter codes (AA, AB, ...)
    let result = lastCode.split('');
    let carry = 1;
    
    for (let i = result.length - 1; i >= 0 && carry; i--) {
      const charCode = result[i].charCodeAt(0) + carry;
      if (charCode > 90) { // 'Z'
        result[i] = 'A';
      } else {
        result[i] = String.fromCharCode(charCode);
        carry = 0;
      }
    }
    
    if (carry) {
      result.unshift('A');
    }
    
    return result.join('');
  },

  /**
   * Calculate total distance for nutritionFood
   */
  calculateNutritionFoodTotalDistance(nutritionFood: NutritionFood): number {
    if (!nutritionFood.nutritionComponents) return 0;
    
    return nutritionFood.nutritionComponents.reduce((total, lap) => {
      if (lap.isDisabled) return total;
      return total + (lap.distance || 0);
    }, 0);
  }
};

// ==================== VALIDATION HELPERS ====================
export const validationHelpers = {
  /**
   * Validate workout name
   */
  isValidWorkoutName(name: string): boolean {
    return name.length > 0 && name.length <= 40;
  },

  /**
   * Validate workout code
   */
  isValidWorkoutCode(code: string): boolean {
    return code.length > 0 && code.length <= 5;
  },

  /**
   * Validate distance
   */
  isValidDistance(distance: number): boolean {
    return distance >= 0 && distance <= 999999;
  },

  /**
   * Validate duration in minutes
   */
  isValidDuration(minutes: number): boolean {
    return minutes >= 0 && minutes <= 1440;
  },

  /**
   * Validate heart rate
   */
  isValidHeartRate(bpm: number): boolean {
    return bpm >= 30 && bpm <= 220;
  }
};

// ==================== FORMATTING HELPERS ====================
export const formatHelpers = {
  /**
   * Format distance with units
   */
  formatDistance(meters: number, unit: 'meters' | 'km' | 'yards' | 'miles' = 'meters'): string {
    switch (unit) {
      case 'km':
        return `${(meters / 1000).toFixed(2)} km`;
      case 'yards':
        return `${(meters * 1.09361).toFixed(0)} yd`;
      case 'miles':
        return `${(meters / 1609.344).toFixed(2)} mi`;
      default:
        return `${meters} m`;
    }
  },

  /**
   * Format duration
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  },

  /**
   * Format time string (HH:MM:SS)
   */
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};

