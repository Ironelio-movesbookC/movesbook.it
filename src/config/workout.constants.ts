/**
 * Workout System Configuration Constants
 * Centralized configuration for the workout planning system
 */

// ==================== SECTION CONFIGURATION ====================
export const WORKOUT_SECTIONS = {
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
    name: 'Weekly Workout Structures',
    description:
      'Outline a week with sport targets (distance, time, goal, notes). Drag planned workouts onto days; export later to Yearly Plan or Done.',
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
    name: 'Yearly Plan',
    description: 'Your complete yearly training plan - copy templates from Section A here',
    planType: 'YEARLY_PLAN',
    maxWeeks: 52,
    maxDays: 364,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar'
  },
  C: {
    id: 'C' as const,
    name: 'Done',
    description: 'Completed workouts tracking',
    planType: 'WORKOUTS_DONE',
    maxWeeks: 52,
    maxDays: 364,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar'
  },
  D: {
    id: 'D' as const,
    name: 'Archive',
    description: 'Archived workouts and historical data',
    planType: 'ARCHIVE',
    maxWeeks: 52,
    maxDays: 364,
    canAddDays: true,
    isEditable: true,
    icon: 'Calendar'
  }
} as const;

export type SectionId = keyof typeof WORKOUT_SECTIONS;

/**
 * PRODUCT RULE (remember): Weather + Feeling Status are displayed and used ONLY
 * under the WORKOUTS DONE section label (Section C / plan type WORKOUTS_DONE).
 * Never show or require them in Yearly Plan, Templates, Structures, or Archive UIs.
 */
export const WORKOUTS_DONE_ONLY_FIELDS = ['weather', 'feelingStatus'] as const;
export type WorkoutsDoneOnlyField = (typeof WORKOUTS_DONE_ONLY_FIELDS)[number];

/**
 * Full "Workout info" / Elements to save for Section C (Workouts Done).
 * Fields with kind `doneOnly` = WORKOUTS_DONE_ONLY_FIELDS (Weather, Feeling Status).
 */
export const WORKOUTS_DONE_WORKOUT_INFO_FIELDS = [
  { key: 'weekNumber', label: 'Number of week', kind: 'context' },
  { key: 'dayOfWeek', label: 'Day of the week', kind: 'context' },
  { key: 'sessionNumber', label: 'Number of the workout', kind: 'context' },
  { key: 'name', label: 'Name assigned', kind: 'core', maxLength: 40 },
  { key: 'code', label: 'Code assigned', kind: 'core', maxLength: 5 },
  { key: 'sports', label: 'Sport selected', kind: 'core' },
  { key: 'time', label: 'Time', kind: 'done' },
  { key: 'weather', label: 'Weather', kind: 'doneOnly' }, // WORKOUTS DONE only
  { key: 'location', label: 'Location', kind: 'done' },
  { key: 'surface', label: 'Surface', kind: 'done' },
  { key: 'heartRateMax', label: 'Heart rate', kind: 'done' },
  { key: 'heartRateAvg', label: 'Average HR', kind: 'done' },
  { key: 'calories', label: 'Calories', kind: 'done' },
  { key: 'feelingStatus', label: 'Feeling Status', kind: 'doneOnly' }, // WORKOUTS DONE only
  { key: 'notes', label: 'Note', kind: 'done' },
] as const;

export function isWorkoutsDoneSection(section: string | undefined | null): boolean {
  return section === 'C';
}

// ==================== API ENDPOINTS ====================
export const API_ENDPOINTS = {
  WORKOUTS: {
    PLAN: '/api/workouts/plan',
    DAYS: '/api/workouts/days',
    CREATE: '/api/workouts',
    UPDATE: (id: string) => `/api/workouts/${id}`,
    DELETE: (id: string) => `/api/workouts/${id}`
  },
  SESSIONS: {
    DUPLICATE: '/api/workouts/sessions/duplicate',
    MOVE: '/api/workouts/sessions/move',
    SWITCH: '/api/workouts/sessions/switch'
  },
  MOVEFRAMES: {
    CREATE: (workoutId: string) => `/api/workouts/${workoutId}/moveframes`,
    CREATE_WITH_MOVELAPS: '/api/workouts/moveframes/create-with-movelaps',
    UPDATE: (id: string) => `/api/workouts/moveframes/${id}`,
    DELETE: (id: string) => `/api/workouts/moveframes/${id}`,
    DUPLICATE: '/api/workouts/moveframes/duplicate',
    MOVE: '/api/workouts/moveframes/move'
  },
  MOVELAPS: {
    CREATE: '/api/workouts/movelaps',
    UPDATE: (id: string) => `/api/workouts/movelaps/${id}`,
    DELETE: (id: string) => `/api/workouts/movelaps/${id}`
  },
  DAYS: {
    UPDATE: (id: string) => `/api/workouts/days/${id}`,
    DELETE: (id: string) => `/api/workouts/days/${id}`
  },
  SECTIONS: {
    LIST: '/api/workouts/sections',
    CREATE: '/api/workouts/sections'
  },
  PERIODS: {
    LIST: '/api/workouts/periods',
    CREATE: '/api/workouts/periods'
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
  MAX_WORKOUTS_PER_DAY: 3,
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

export type WorkoutStatus = typeof WORKOUT_STATUS[keyof typeof WORKOUT_STATUS];

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

// ==================== ERROR MESSAGES ====================
export const ERROR_MESSAGES = {
  NO_TOKEN: 'Please log in first',
  UNAUTHORIZED: 'Unauthorized. Please log in again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NO_ACTIVE_DAY: 'Select a day first',
  NO_ACTIVE_WORKOUT: 'Select a workout first',
  NO_ACTIVE_MOVEFRAME: 'Select a moveframe first',
  MAX_WORKOUTS_REACHED: 'Maximum 3 workouts per day allowed',
  INVALID_DATE: 'Invalid date selected',
  DATE_OUT_OF_RANGE: 'Date is outside allowed range for this section'
} as const;

// ==================== SUCCESS MESSAGES ====================
export const SUCCESS_MESSAGES = {
  DAY_UPDATED: 'Day updated successfully',
  WORKOUT_ADDED: 'Workout added successfully',
  WORKOUT_UPDATED: 'Workout updated successfully',
  WORKOUT_DELETED: 'Workout deleted successfully',
  MOVEFRAME_ADDED: 'Moveframe added successfully',
  MOVEFRAME_UPDATED: 'Moveframe updated successfully',
  MOVEFRAME_DELETED: 'Moveframe deleted successfully',
  MOVELAP_ADDED: (code: string) => `Movelap added to ${code}`,
  MOVELAP_UPDATED: 'Movelap updated successfully',
  MOVELAP_DELETED: 'Movelap deleted successfully'
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

