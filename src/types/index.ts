// User Types
export interface User {
    id: string;
    email: string;
    name: string;
    userType: UserType;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export enum UserType {
    ATHLETE = 'ATHLETE',
    COACH = 'COACH',
    TEAM = 'TEAM',
    TEAM_MANAGER = 'TEAM_MANAGER',  // Legacy
    CLUB = 'CLUB',
    CLUB_TRAINER = 'CLUB_TRAINER',  // Legacy
    CLUB_COADMIN = 'CLUB_COADMIN',
    CLUB_OPERATOR = 'CLUB_OPERATOR',
    CLUB_COLLABORATOR = 'CLUB_COLLABORATOR',
    GROUP = 'GROUP',
    GROUP_ADMIN = 'GROUP_ADMIN',
    ADMIN = 'ADMIN'
  }
  
  // Workout Types
  export interface WorkoutPlan {
    id: string;
    userId: string;
    name: string;
    type: WorkoutPlanType;
    startDate: Date;
    endDate: Date;
    weeks: WorkoutWeek[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export enum WorkoutPlanType {
    CURRENT_WEEKS = 'CURRENT_WEEKS',
    YEARLY_PLAN = 'YEARLY_PLAN',
    WORKOUTS_DONE = 'WORKOUTS_DONE'
  }
  
  export interface WorkoutWeek {
    id: string;
    weekNumber: number;
    days: WorkoutDay[];
  }
  
  export interface WorkoutDay {
    id: string;
    date: Date;
    weekNumber: number;
    dayOfWeek: number; // 1-7 (Monday=1)
    period: Period;
    weather?: string;
    feelingStatus?: string;
    notes?: string;
    workouts: WorkoutSession[];
  }
  
  export interface Period {
    id: string;
    name: string;
    description: string;
    color: string;
    userId: string;
  }
  
  // Workout Session Types
  export interface WorkoutSession {
    id: string;
    sessionNumber: number; // 1, 2, or 3
    name: string;
    code: string;
    sports: SportType[];
    time: string;
    weather?: string;
    location?: string;
    surface?: string;
    heartRateMax?: number;
    heartRateAvg?: number;
    calories?: number;
    feelingStatus?: string;
    notes?: string;
    status: WorkoutStatus;
    moveframes: Moveframe[];
  }
  
  export enum WorkoutStatus {
    NOT_PLANNED = 'NOT_PLANNED',
    PLANNED_FUTURE = 'PLANNED_FUTURE',
    PLANNED_NEXT_WEEK = 'PLANNED_NEXT_WEEK',
    PLANNED_CURRENT_WEEK = 'PLANNED_CURRENT_WEEK',
    DONE_DIFFERENTLY = 'DONE_DIFFERENTLY',
    DONE_LESS_75 = 'DONE_LESS_75',
    DONE_MORE_75 = 'DONE_MORE_75'
  }
  
  // Moveframe Types
  export interface Moveframe {
    id: string;
    letter: string; // A, B, C, ... AA, AB, etc.
    sport: SportType;
    section: WorkoutSection;
    type: MoveframeType;
    description: string;
    movelaps: Movelap[];
    totals: MoveframeTotals;
  }
  
  export enum MoveframeType {
    STANDARD = 'STANDARD',
    BATTERY = 'BATTERY',
    ANNOTATION = 'ANNOTATION'
  }
  
  export interface MoveframeTotals {
    totalDistance: number;
    totalTime: string;
    totalReps: number;
  }
  
  export interface WorkoutSection {
    id: string;
    name: string;
    description: string;
    color: string;
    userId: string;
  }
  
  // Sport-specific configurations
  export interface SportConfiguration {
    meters: number[];
    speeds: string[];
    styles: string[];
    restTypes: RestType[];
    pauseOptions: string[];
  }
  
  export enum RestType {
    SET_TIME = 'SET_TIME',
    RESTART_TIME = 'RESTART_TIME',
    RESTART_PULSE = 'RESTART_PULSE'
  }
  
  // Movelap Types
  export interface Movelap {
    id: string;
    moveframeId: string;
    repetitionNumber: number;
    distance?: number;
    speed?: string;
    style?: string;
    pace?: string;
    time?: string;
    reps?: number;
    restType?: RestType;
    pause?: string;
    alarm?: number;
    sound?: string;
    notes?: string;
    status: MovelapStatus;
    isSkipped: boolean;
    isDisabled: boolean;
  }
  
  export enum MovelapStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    SKIPPED = 'SKIPPED',
    DISABLED = 'DISABLED'
  }
  
  // Sport Types
  export enum SportType {
    SWIM = 'SWIM',
    BIKE = 'BIKE',
    RUN = 'RUN',
    BODY_BUILDING = 'BODY_BUILDING',
    ROWING = 'ROWING',
    SKATE = 'SKATE',
    GYMNASTIC = 'GYMNASTIC',
    STRETCHING = 'STRETCHING',
    PILATES = 'PILATES',
    SKI = 'SKI',
    TECHNICAL_MOVES = 'TECHNICAL_MOVES',
    FREE_MOVES = 'FREE_MOVES'
  }
  
  // Settings Types
  export interface ColorSettings {
    pageBackground: string;
    dayHeader: string;
    moveframeHeader: string;
    movelapHeader: string;
    microlapBackground: string;
    selectedRow: string;
    buttonAdd: string;
    buttonEdit: string;
    buttonDelete: string;
    buttonPrint: string;
    alternateRow: string;
  }
  
  export interface LanguageSettings {
    language: string;
    variables: Record<string, string>;
  }
  
  // API Response Types
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  
  export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }