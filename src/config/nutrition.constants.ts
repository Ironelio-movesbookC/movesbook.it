/**
 * NutritionMeal System Configuration Constants
 * Centralized configuration for the workout planning system
 */

// ==================== SECTION CONFIGURATION ====================
export const NUTRITION_SECTIONS = {
  A: {
    id: 'A' as const,
    name: 'Create Template Plans',
    description: 'Create 3-week training templates (Plans A, B, C) that can be copied to Yearly Plan',
    planType: 'TEMPLATE_WEEKS',
    maxWeeks: 3,
    maxDays: 21,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar',
    subSections: ['A', 'B', 'C'] // Has Weekly Plans A, B, C as subsections
  },
  W: {
    id: 'W' as const,
    name: 'Weekly Diet Structure',
    description:
      'Outline a week with meal targets (calories, macros, notes). Drag planned meals onto days; export later to Yearly Plan or Done.',
    planType: 'TEMPLATE_WEEKS',
    maxWeeks: 1,
    maxDays: 7,
    canAddDays: false,
    isEditable: true,
    icon: 'Calendar',
    subSections: []
  },
  B: {
    id: 'B' as const,
    name: 'Yearly plan of my nutrition',
    description: 'Your complete yearly nutrition plan — copy templates from template plans here',
    planType: 'YEARLY_PLAN',
    maxWeeks: 52,
    maxDays: 364,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar'
  },
  C: {
    id: 'C' as const,
    name: 'Meals taken',
    description: 'Track meals you have taken / completed',
    planType: 'MEALS_DONE',
    maxWeeks: 52,
    maxDays: 364,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar'
  },
  D: {
    id: 'D' as const,
    name: 'Archive of weekly plans',
    description: 'Archived weekly nutrition plans and historical data',
    planType: 'MEALS_DONE',
    maxWeeks: 52,
    maxDays: 364,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar'
  }
} as const;

export type SectionId = keyof typeof NUTRITION_SECTIONS;

// ==================== API ENDPOINTS ====================
export const API_ENDPOINTS = {
  NUTRITION: {
    PLAN: '/api/nutrition/plan',
    DAYS: '/api/nutrition/days',
    CREATE: '/api/nutrition/sessions',
    UPDATE: (id: string) => `/api/nutrition/sessions/${id}`,
    DELETE: (id: string) => `/api/nutrition/sessions/${id}`
  },
  SESSIONS: {
    DUPLICATE: '/api/nutrition/sessions/duplicate',
    MOVE: '/api/nutrition/sessions/move',
    SWITCH: '/api/nutrition/sessions/switch'
  },
  FOODS: {
    CREATE: (nutritionMealId: string) => `/api/nutrition/moveframes?nutritionMealId=${nutritionMealId}`,
    CREATE_WITH_MOVELAPS: '/api/nutrition/moveframes/create-with-movelaps',
    UPDATE: (id: string) => `/api/nutrition/moveframes/${id}`,
    DELETE: (id: string) => `/api/nutrition/moveframes/${id}`,
    DUPLICATE: '/api/nutrition/moveframes/duplicate',
    MOVE: '/api/nutrition/moveframes/move'
  },
  COMPONENTS: {
    CREATE: '/api/nutrition/movelaps',
    UPDATE: (id: string) => `/api/nutrition/movelaps/${id}`,
    DELETE: (id: string) => `/api/nutrition/movelaps/${id}`
  },
  DAYS: {
    UPDATE: (id: string) => `/api/nutrition/days/${id}`,
    DELETE: (id: string) => `/api/nutrition/days/${id}`
  },
  SECTIONS: {
    LIST: '/api/nutrition/sections',
    CREATE: '/api/nutrition/sections'
  },
  PERIODS: {
    LIST: '/api/nutrition/periods',
    CREATE: '/api/nutrition/periods'
  },
  USER: {
    SETTINGS: '/api/user/settings',
    PROFILE: '/api/user/profile'
  },
  COACH: {
    ATHLETES: '/api/coach/athletes'
  }
} as const;

// ==================== UI CONSTANTS ====================
export const UI_CONFIG = {
  FEEDBACK_MESSAGE_DURATION: 4000, // milliseconds
  AUTO_EXPAND_DELAY: 500, // milliseconds
  MAX_MEALS_PER_DAY: 4,
  /** @deprecated use MAX_MEALS_PER_DAY */
  MAX_WORKOUTS_PER_DAY: 4,
  DATE_FORMAT: {
    SHORT: 'MM/DD/YYYY',
    LONG: 'dddd, MMMM D, YYYY',
    TIME: 'HH:mm:ss'
  }
} as const;

// ==================== VIEW MODES ====================
export const VIEW_MODES = {
  TABLE: 'table',
  CALENDAR: 'calendar'
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

// ==================== PERMISSION ROLES ====================
export const USER_ROLES = {
  ATHLETE: 'ATHLETE',
  COACH: 'COACH',
  TEAM: 'TEAM',
  CLUB: 'CLUB',
  TEAM_MANAGER: 'TEAM_MANAGER',
  CLUB_TRAINER: 'CLUB_TRAINER',
  ADMIN: 'ADMIN'
} as const;

export const COACH_ROLES = [
  USER_ROLES.COACH,
  USER_ROLES.TEAM,
  USER_ROLES.CLUB,
  USER_ROLES.TEAM_MANAGER,
  USER_ROLES.CLUB_TRAINER
] as const;

// ==================== DATE RANGES ====================
export const DATE_RANGES = {
  CURRENT_WEEKS: {
    days: 21,
    weeks: 3
  },
  YEARLY_PLAN: {
    days: 364,
    weeks: 52,
    startOffset: 21 // Start after current weeks period
  },
  MAX_FUTURE_DAYS: 365
} as const;

// ==================== WORKOUT STATUS ====================
export const WORKOUT_STATUS = {
  PENDING: 'PENDING',
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED'
} as const;

export type NutritionMealStatus = typeof WORKOUT_STATUS[keyof typeof WORKOUT_STATUS];

// ==================== WORKOUT STATUS COLORS ====================
export const STATUS_COLORS = {
  WHITE: 'WHITE',
  YELLOW: 'YELLOW',
  ORANGE: 'ORANGE',
  RED: 'RED',
  BLUE: 'BLUE',
  LIGHT_GREEN: 'LIGHT_GREEN',
  GREEN: 'GREEN',
  GREY: 'GREY'
} as const;

export type StatusColor = typeof STATUS_COLORS[keyof typeof STATUS_COLORS];

// ==================== MOVELAP REST TYPES ====================
export const REST_TYPES = {
  SET_TIME: 'SET_TIME',
  RESTART_TIME: 'RESTART_TIME',
  RESTART_PULSE: 'RESTART_PULSE'
} as const;

export type RestType = typeof REST_TYPES[keyof typeof REST_TYPES];

// ==================== SPORTS ====================
export const SPORTS = {
  SWIM: 'SWIM',
  RUN: 'RUN',
  BIKE: 'BIKE',
  GYM: 'GYM',
  STRETCHING: 'STRETCHING',
  WALKING: 'WALKING',
  HIKING: 'HIKING',
  YOGA: 'YOGA',
  PILATES: 'PILATES',
  OTHER: 'OTHER'
} as const;

export type Sport = typeof SPORTS[keyof typeof SPORTS];

// ==================== FEELING STATUS OPTIONS ====================
export const FEELING_STATUS_OPTIONS = [
  { value: '1', label: '1 - Very Poor' },
  { value: '2', label: '2 - Poor' },
  { value: '3', label: '3 - Below Average' },
  { value: '4', label: '4 - Below Average' },
  { value: '5', label: '5 - Average' },
  { value: '6', label: '6 - Above Average' },
  { value: '7', label: '7 - Good' },
  { value: '8', label: '8 - Very Good' },
  { value: '9', label: '9 - Excellent' },
  { value: '10', label: '10 - Perfect' }
] as const;

// ==================== NUTRITION PLANNER TERMINOLOGY ====================
/** User-facing labels: Workout→Meal, Moveframe→Dietframe, Movelap→Dietlap */
export const NUTRITION_TERMINOLOGY = {
  meal: 'Meal',
  meals: 'Meals',
  dietframe: 'Dietframe',
  dietframes: 'Dietframes',
  dietlap: 'Dietlap',
  dietlaps: 'Dietlaps',
  addDietframe: 'Add a Dietframe',
  addDietlap: 'Add a Dietlap',
  dietframeOfMeal: (mealName: string) => `Dietframe of the ${mealName}`,
  dietlapsOf: (letter: string) => `Dietlaps of ${letter}`,
  foodSelected: 'Food selected',
  componentsOfFood: 'Components of the food',
} as const;

// ==================== ERROR MESSAGES ====================
export const ERROR_MESSAGES = {
  NO_TOKEN: 'Please log in first',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NO_ACTIVE_DAY: 'Select a day first',
  NO_ACTIVE_MEAL: 'Select a meal first',
  NO_ACTIVE_DIETFRAME: 'Select a dietframe first',
  /** @deprecated use NO_ACTIVE_MEAL */
  NO_ACTIVE_WORKOUT: 'Select a meal first',
  /** @deprecated use NO_ACTIVE_DIETFRAME */
  NO_ACTIVE_MOVEFRAME: 'Select a dietframe first',
  MAX_MEALS_REACHED: 'Maximum 4 meals per day allowed',
  /** @deprecated */
  MAX_WORKOUTS_REACHED: 'Maximum 4 meals per day allowed',
  INVALID_DATE: 'Invalid date selected',
  DATE_OUT_OF_RANGE: 'Date is outside allowed range for this section'
} as const;

// ==================== SUCCESS MESSAGES ====================
export const SUCCESS_MESSAGES = {
  DAY_UPDATED: 'Day updated successfully',
  MEAL_ADDED: 'Meal added successfully',
  MEAL_UPDATED: 'Meal updated successfully',
  MEAL_DELETED: 'Meal deleted successfully',
  DIETFRAME_ADDED: 'Dietframe added successfully',
  DIETFRAME_UPDATED: 'Dietframe updated successfully',
  DIETFRAME_DELETED: 'Dietframe deleted successfully',
  DIETLAP_ADDED: (code: string) => `Dietlap added to ${code}`,
  DIETLAP_UPDATED: 'Dietlap updated successfully',
  DIETLAP_DELETED: 'Dietlap deleted successfully',
  /** @deprecated */
  WORKOUT_ADDED: 'Meal added successfully',
  WORKOUT_UPDATED: 'Meal updated successfully',
  WORKOUT_DELETED: 'Meal deleted successfully',
  MOVEFRAME_ADDED: 'Dietframe added successfully',
  MOVEFRAME_UPDATED: 'Dietframe updated successfully',
  MOVEFRAME_DELETED: 'Dietframe deleted successfully',
  MOVELAP_ADDED: (code: string) => `Dietlap added to ${code}`,
  MOVELAP_UPDATED: 'Dietlap updated successfully',
  MOVELAP_DELETED: 'Dietlap deleted successfully',
} as const;

// ==================== VALIDATION RULES ====================
export const VALIDATION = {
  WORKOUT_NAME_MAX_LENGTH: 40,
  WORKOUT_CODE_MAX_LENGTH: 5,
  MIN_DISTANCE: 0,
  MAX_DISTANCE: 999999,
  MIN_DURATION: 0,
  MAX_DURATION: 1440, // minutes in a day
  MIN_HEART_RATE: 30,
  MAX_HEART_RATE: 220
} as const;

// ==================== STORAGE KEYS ====================
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_DATA: 'user',
  EXPANDED_WEEKS: 'expandedWeeks',
  EXPANDED_DAYS: 'expandedDays',
  EXPANDED_WORKOUTS: 'expandedWorkouts',
  VIEW_MODE: 'viewMode',
  ACTIVE_SECTION: 'activeSection'
} as const;

