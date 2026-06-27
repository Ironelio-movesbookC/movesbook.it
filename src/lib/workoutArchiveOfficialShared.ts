import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import { ARCHIVE_DISPLAY_LANGUAGES } from '@/types/workoutArchiveGrid';
import type { ArchiveTrainingCategory } from '@/lib/archiveTrainingCategory';
import { formatArchiveDuration } from '@/lib/workoutArchiveMetrics';

export const OFFICIAL_ARCHIVE_COLUMNS = [
  'Picture',
  'Type of training',
  'Class',
  'No. workouts',
  'Duration',
  'Sport',
  'Goal',
  'Level',
  'Period',
  'Title',
  'Date creation',
  'Sharing date',
  'Share expiration',
  'Language',
  'Short description',
  'User',
  'Options',
] as const;

export type ArchiveTrainingFilter = 'all' | ArchiveTrainingCategory;

export type ArchiveSearchField = 'all' | 'title' | 'author' | 'tags' | 'sport';
export type ArchiveSortKey = 'nameAsc' | 'nameDesc' | 'dateNewest' | 'dateOldest';
export type ArchiveDurationFilter = 'all' | 'short' | 'medium' | 'long' | 'extraLong';

export type ArchivePrimaryTab = 'WORKOUT_WEEKLY' | 'STRUCTURED' | 'COACH_PLANS';
export type PersonalArchiveSource = 'personal' | 'global';

export function durationBucket(seconds: number): ArchiveDurationFilter {
  if (seconds <= 0) return 'all';
  if (seconds < 30 * 60) return 'short';
  if (seconds < 60 * 60) return 'medium';
  if (seconds < 2 * 60 * 60) return 'long';
  return 'extraLong';
}

export function matchesDurationFilter(
  seconds: number | null | undefined,
  filter: ArchiveDurationFilter
): boolean {
  if (filter === 'all') return true;
  return durationBucket(seconds ?? 0) === filter;
}

export function formatArchiveExpDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function formatArchiveGridDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatArchiveLanguage(code?: string | null): string {
  if (!code?.trim()) return '—';
  const parts = code.split(/[,;|/]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return code;
  return parts
    .map((part) => {
      const match = ARCHIVE_DISPLAY_LANGUAGES.find(
        (l) => l.code.toLowerCase() === part.toLowerCase()
      );
      return match?.name ?? part;
    })
    .join(', ');
}

export function formatArchiveDurationSummary(record: WorkoutArchiveGridRecord): string {
  const parts: string[] = [];
  if (record.totalMeters != null && record.totalMeters > 0) {
    parts.push(`${record.totalMeters} m`);
  }
  if (record.totalTimeSeconds != null && record.totalTimeSeconds > 0) {
    parts.push(formatArchiveDuration(record.totalTimeSeconds));
  }
  if (record.totalSeries != null && record.totalSeries > 0) {
    parts.push(`${record.totalSeries} series`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function recordMatchesPrimaryTab(
  record: { recordType: WorkoutArchiveGridRecord['recordType'] },
  tab: ArchivePrimaryTab
): boolean {
  switch (tab) {
    case 'STRUCTURED':
      return record.recordType === 'STRUCTURED_PROGRAM';
    case 'COACH_PLANS':
      return record.recordType === 'COACH_PLAN';
    default:
      return record.recordType === 'WORKOUT' || record.recordType === 'WEEKLY_PLAN';
  }
}

export function filterArchiveRecords(
  records: WorkoutArchiveGridRecord[],
  opts: {
    recordTypeFilter: string;
    primaryTab?: ArchivePrimaryTab;
    showDisabled: boolean;
    favoritesOnly: boolean;
    sportFilter: string;
    authorFilter: string;
    countryFilter: string;
    durationFilter: ArchiveDurationFilter;
    trainingCategoryFilter?: ArchiveTrainingFilter;
    appliedSearch: string;
    searchField: ArchiveSearchField;
    sortKey: ArchiveSortKey;
    favoriteSports?: string[];
    restrictToFavoriteSportsWhenAll?: boolean;
    sportLabel: (s?: string | null) => string;
  }
): WorkoutArchiveGridRecord[] {
  const q = opts.appliedSearch.trim().toLowerCase();
  let list = records.filter((r) => {
    if (opts.primaryTab && !recordMatchesPrimaryTab(r, opts.primaryTab)) return false;
    if (opts.recordTypeFilter !== 'ALL' && r.recordType !== opts.recordTypeFilter) return false;
    if (!opts.showDisabled && r.disabled) return false;
    if (opts.favoritesOnly && !r.isFavorite) return false;
    if (opts.sportFilter !== 'all' && r.mainSport !== opts.sportFilter) return false;
    if (opts.restrictToFavoriteSportsWhenAll && opts.sportFilter === 'all' && opts.favoriteSports?.length) {
      if (r.mainSport && !opts.favoriteSports.includes(r.mainSport)) return false;
    }
    if (opts.authorFilter !== 'all' && r.sharedByUsername !== opts.authorFilter) return false;
    if (opts.countryFilter !== 'all') {
      const c = r.authorCountryName ?? r.authorCountry ?? '';
      if (c !== opts.countryFilter) return false;
    }
    if (!matchesDurationFilter(r.totalTimeSeconds, opts.durationFilter)) return false;
    if (
      opts.trainingCategoryFilter &&
      opts.trainingCategoryFilter !== 'all' &&
      r.trainingCategory !== opts.trainingCategoryFilter
    ) {
      return false;
    }
    if (q) {
      const fields: Record<ArchiveSearchField, string> = {
        all: `${r.title} ${r.tags ?? ''} ${r.sharedByUsername ?? ''} ${opts.sportLabel(r.mainSport)}`,
        title: r.title,
        author: r.sharedByUsername ?? '',
        tags: r.tags ?? '',
        sport: opts.sportLabel(r.mainSport),
      };
      if (!fields[opts.searchField].toLowerCase().includes(q)) return false;
    }
    return true;
  });

  list = [...list].sort((a, b) => {
    switch (opts.sortKey) {
      case 'nameDesc':
        return b.title.localeCompare(a.title);
      case 'dateNewest':
        return (
          new Date(b.sharedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.sharedAt ?? a.createdAt ?? 0).getTime()
        );
      case 'dateOldest':
        return (
          new Date(a.sharedAt ?? a.createdAt ?? 0).getTime() -
          new Date(b.sharedAt ?? b.createdAt ?? 0).getTime()
        );
      case 'nameAsc':
      default:
        return a.title.localeCompare(b.title);
    }
  });

  return list;
}
