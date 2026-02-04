/**
 * TypeScript Type Definitions for Workout System
 * Replaces 'any' types with proper type safety
 */

import type { Sport, StatusColor, WorkoutStatus, RestType } from '@/config/workout.constants';

// Re-export types from constants for convenience
export type { WorkoutStatus, StatusColor, RestType, Sport } from '@/config/workout.constants';

// View mode type
export type ViewMode = 'table' | 'calendar' | 'tree';

// Section ID type
export type SectionId = 'A' | 'B' | 'C' | 'D';

// ==================== BASE TYPES ====================
export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==================== USER & AUTH ====================
export interface User extends BaseEntity {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  userType: UserType;
  subscriptionActive: boolean;
  subscriptionExpiryDate?: Date | string | null;
}

export type UserType = 
  | 'ATHLETE' 
  | 'COACH' 
  | 'TEAM' 
  | 'CLUB' 
  | 'TEAM_MANAGER' 
  | 'CLUB_TRAINER' 
  | 'ADMIN';

export interface AuthToken {
  token: string;
  expiresAt: Date | string;
}

// ==================== WORKOUT PLAN ====================
export interface WorkoutPlan extends BaseEntity {
  userId: string;
  type: 'CURRENT_WEEKS' | 'YEARLY_PLAN' | 'WORKOUTS_DONE' | 'ARCHIVE';
  startDate: Date | string;
  endDate?: Date | string | null;
  weeks: Week[];
}

export interface Week extends BaseEntity {
  workoutPlanId: string;
  weekNumber: number;
  startDate: Date | string;
  endDate: Date | string;
  days: WorkoutDay[];
}

export interface WorkoutDay extends BaseEntity {
  userId: string;
  weekId?: string | null;
  date: Date | string;
  weekNumber: number;
  weekday: number; // 1-7 (Monday = 1)
  periodId?: string | null;
  periodName?: string | null;
  periodColor?: string | null;
  weather?: string | null;
  feelingStatus?: string | null;
  notes?: string | null;
  storageZone?: string | null;
  workouts: Workout[];
}

export interface Workout extends BaseEntity {
  dayId: string;
  sessionNumber: number; // 1, 2, or 3
  name?: string | null;
  code?: string | null;
  statusColor: StatusColor;
  durationMinutes?: number | null;
  location?: string | null;
  surface?: string | null;
  weather?: string | null;
  heartRateMax?: number | null;
  heartRateAvg?: number | null;
  calories?: number | null;
  feelingStatus?: string | null;
  notes?: string | null;
  moveframes: Moveframe[];
}

export interface Moveframe extends BaseEntity {
  workoutId: string;
  code: string; // A, B, C, ..., Z, AA, AB, ...
  letter: string; // Same as code, used interchangeably
  sport: string; // SportType enum value
  type?: string | null;
  sectionId?: string | null;
  sectionName?: string | null;
  sectionColor?: string | null;
  description?: string | null;
  notes?: string | null;
  macroFinal?: string | null;
  alarm?: number | null;
  appliedTechnique?: string | null; // Body Building execution technique
  annotationBgColor?: string | null;
  annotationText?: string | null;
  annotationTextColor?: string | null;
  annotationBold?: boolean | null;
  workType?: string | null;
  manualMode?: boolean | null;
  manualPriority?: boolean | null;
  manualInputType?: string | null;
  manualRepetitions?: number | null;
  manualDistance?: number | null;
  aerobicSeries?: number | null;
  circuitConfig?: any | null;
  circuits?: any[] | null;
  rows?: any[] | null;
  isCircuitBased?: boolean | null;
  favourite?: boolean | null;
  totalDistance?: number | null;
  totalReps?: number | null;
  macroRest?: string | null;
  movelaps: Movelap[];
}

export interface Movelap extends BaseEntity {
  moveframeId: string;
  index: number; // 1..n
  mfCode?: string | null; // Parent moveframe code
  distance?: number | null;
  speedCode?: string | null; // A1, A2, B1, etc.
  style?: string | null;
  pace?: string | null;
  time?: string | null;
  pause?: string | null;
  restType?: RestType | null;
  alarm?: number | null; // -1 to -10
  sound?: string | null;
  notes?: string | null;
  isDisabled?: boolean;
  isSkippedInPlayer?: boolean;
  origin?: 'NORMAL' | 'DUPLICATE' | 'NEW' | 'PASTE';
}

// ==================== PERIODS ====================
export interface Period extends BaseEntity {
  userId: string;
  name: string;
  color: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  description?: string | null;
}

// ==================== USER SETTINGS ====================
export interface UserSettings extends BaseEntity {
  userId: string;
  workoutPreferences?: WorkoutPreferences;
  displayPreferences?: DisplayPreferences;
  columnWidths?: Record<string, number>;
  colorSettings?: ColorSettings;
}

export interface WorkoutPreferences {
  excludeStretchingFromTotals?: boolean;
  defaultViewMode?: 'table' | 'calendar';
  autoExpandNew?: boolean;
}

export interface DisplayPreferences {
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  firstDayOfWeek?: number; // 0 = Sunday, 1 = Monday
}

export interface ColorSettings {
  dayBackground?: string;
  workoutBackground?: string;
  moveframeBackground?: string;
  movelapBackground?: string;
  dayBorder?: string;
  workoutBorder?: string;
  moveframeBorder?: string;
  movelapBorder?: string;
  dayHover?: string;
  workoutHover?: string;
  moveframeHover?: string;
  movelapHover?: string;
  buttonBackground?: string;
  buttonHover?: string;
  buttonText?: string;
}

// ==================== FORM DATA TYPES ====================
export interface CreateWorkoutData {
  sessionNumber: number;
  name?: string;
  code?: string;
  durationMinutes?: number;
  location?: string;
  surface?: string;
  weather?: string;
  heartRateMax?: number;
  heartRateAvg?: number;
  calories?: number;
  feelingStatus?: string;
  notes?: string;
  statusColor?: StatusColor;
}

export interface UpdateWorkoutData extends Partial<CreateWorkoutData> {
  id: string;
}

export interface CreateMoveframeData {
  sport: Sport;
  sectionId?: string;
  description?: string;
  movelaps: CreateMovelapData[];
}

export interface CreateMovelapData {
  distance?: number;
  speedCode?: string;
  style?: string;
  pace?: string;
  time?: string;
  pause?: string;
  restType?: RestType;
  alarm?: number;
  sound?: string;
  notes?: string;
}

export interface UpdateDayData {
  weather?: string;
  feelingStatus?: string;
  notes?: string;
  periodId?: string;
}

// ==================== UI STATE TYPES ====================
export interface FeedbackMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

export interface UserSubscription {
  expiryDate: Date | null;
  isActive: boolean;
}

export interface SectionPermissions {
  canAddDays: boolean;
  canEditDays: boolean;
  canDeleteDays: boolean;
  canAddWorkouts: boolean;
  canEditWorkouts: boolean;
  canDeleteWorkouts: boolean;
}

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WorkoutPlanResponse {
  plan: WorkoutPlan;
  totalDays: number;
  totalWeeks: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
}

// ==================== DRAG & DROP TYPES ====================
export interface DragData {
  type: 'workout' | 'moveframe';
  item: Workout | Moveframe;
  sourceDay?: WorkoutDay;
  sourceWorkout?: Workout;
}

export interface DropTarget {
  type: 'day' | 'workout' | 'moveframe';
  target: WorkoutDay | Workout | Moveframe;
}

// ==================== MODAL TYPES ====================
export interface ModalState {
  isOpen: boolean;
  data?: any;
  mode?: 'add' | 'edit' | 'view';
}

export type WorkoutModalMode = 'add' | 'edit';

// ==================== HELPER TYPES ====================
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NullableOptional<T> = T | null | undefined;

// Type guard functions
export const isWorkoutDay = (item: any): item is WorkoutDay => {
  return item && typeof item === 'object' && 'date' in item && 'weekday' in item;
};

export const isWorkout = (item: any): item is Workout => {
  return item && typeof item === 'object' && 'sessionNumber' in item && 'moveframes' in item;
};

export const isMoveframe = (item: any): item is Moveframe => {
  return item && typeof item === 'object' && 'code' in item && 'sport' in item && 'movelaps' in item;
};

export const isMovelap = (item: any): item is Movelap => {
  return item && typeof item === 'object' && 'index' in item && 'moveframeId' in item;
};

