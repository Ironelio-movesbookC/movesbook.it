export type WorkoutArchiveRecordType = 'WORKOUT' | 'WEEKLY_PLAN' | 'STRUCTURED_PROGRAM' | 'COACH_PLAN';

export type WorkoutArchiveGridMode = 'global' | 'personal';

/** Normalized row for the shared archive grid (global + personal). */
export type WorkoutArchiveGridRecord = {
  id: string;
  recordType: WorkoutArchiveRecordType;
  /** Display code (from workout code or archive id suffix) */
  code?: string | null;
  title: string;
  /** NW — number of weeks (weekly plans) */
  numWeeks?: number | null;
  thumbnailUrl?: string | null;
  /** Additional image URLs (global archive) */
  pictureUrls?: string[] | null;
  mainSport?: string | null;
  mainGoal?: string | null;
  trainingLevel?: string | null;
  period?: string | null;
  tags?: string | null;
  /** Global archive only — set when user shares for all Movesbook users */
  originalLanguages?: string | null;
  authorCountry?: string | null;
  shortDescription?: string | null;
  expirationDate?: string | null;
  /** Author sidebar — global archive only */
  sharedByUsername?: string | null;
  authorFullName?: string | null;
  authorAvatarUrl?: string | null;
  authorCountryName?: string | null;
  authorCountryFlag?: string | null;
  workoutCount?: number;
  totalMeters?: number | null;
  totalTimeSeconds?: number | null;
  totalSeries?: number | null;
  createdAt?: string;
  sharedAt?: string | null;
  disabled?: boolean;
  isFavorite?: boolean;
  /** personal = user's archive; global = Movesbook shared catalog */
  archiveSource?: 'personal' | 'global';
  /** Original entity for action handlers (workout/week object) */
  _raw?: unknown;
  /** Aerobic / non-aerobic / weight training — derived from sport & tags */
  trainingCategory?: 'aerobic' | 'non-aerobic' | 'weight training' | null;
};

export const ARCHIVE_DISPLAY_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ja', name: '日本語' },
  { code: 'id', name: 'Indonesia' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
] as const;
