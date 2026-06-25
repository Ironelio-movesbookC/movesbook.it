import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import type { GlobalWorkoutArchiveEntry } from '@prisma/client';
import { getSportDisplayName } from '@/constants/moveframe.constants';
import { parseGlobalArchivePictureUrls } from '@/lib/globalWorkoutArchivePictures';
import { parseWeeklyPlanShareMeta } from '@/lib/globalWeeklyPlanShare';
import { enrichArchiveGridRecord } from '@/lib/archiveTrainingCategory';

function planCreatedAtFromPayload(entry: GlobalWorkoutArchiveEntry): string | null {
  if (entry.recordType !== 'WEEKLY_PLAN') return null;
  const meta = parseWeeklyPlanShareMeta(entry.payloadData);
  return meta?.sourceCreatedAt ?? null;
}

function derivePayloadDisplayFields(entry: GlobalWorkoutArchiveEntry): {
  code: string;
  numWeeks: number | null;
} {
  let code = entry.id.slice(-8).toUpperCase();
  let numWeeks: number | null = null;
  try {
    const payload = JSON.parse(entry.payloadData) as Record<string, unknown>;
    if (entry.recordType === 'WORKOUT') {
      const workout = payload.workout as { code?: string } | undefined;
      if (workout?.code?.trim()) code = workout.code.trim();
      numWeeks = 1;
    } else if (entry.recordType === 'WEEKLY_PLAN' || entry.recordType === 'COACH_PLAN') {
      const weeks = payload.weeks as unknown[] | undefined;
      if (Array.isArray(weeks) && weeks.length > 0) numWeeks = weeks.length;
      else if (payload.weekNumber != null) numWeeks = 1;
      else numWeeks = 1;
    } else if (entry.recordType === 'STRUCTURED_PROGRAM') {
      const build = payload.build as { weekPeriodByNumber?: Record<string, string> } | undefined;
      if (build?.weekPeriodByNumber) {
        numWeeks = Object.keys(build.weekPeriodByNumber).length || 52;
      } else {
        numWeeks = 52;
      }
    }
  } catch {
    if (entry.recordType === 'WEEKLY_PLAN' || entry.recordType === 'COACH_PLAN') numWeeks = 1;
    else if (entry.recordType === 'WORKOUT') numWeeks = 1;
    else if (entry.recordType === 'STRUCTURED_PROGRAM') numWeeks = 52;
  }
  return { code, numWeeks };
}

export function recordTypeLabel(recordType: WorkoutArchiveGridRecord['recordType']): string {
  switch (recordType) {
    case 'WORKOUT':
      return 'Workout';
    case 'WEEKLY_PLAN':
      return 'Weekly plan';
    case 'STRUCTURED_PROGRAM':
      return 'Structured program';
    case 'COACH_PLAN':
      return 'Coach plan';
    default:
      return recordType;
  }
}

export function mapGlobalEntryToGridRecord(
  entry: GlobalWorkoutArchiveEntry
): WorkoutArchiveGridRecord {
  const { code, numWeeks } = derivePayloadDisplayFields(entry);
  const pictureUrls = parseGlobalArchivePictureUrls(entry.pictureUrls);
  const thumbnailUrl = entry.thumbnailUrl ?? pictureUrls[0] ?? null;

  return enrichArchiveGridRecord({
    id: entry.id,
    recordType: entry.recordType as WorkoutArchiveGridRecord['recordType'],
    code,
    numWeeks,
    title: entry.title,
    thumbnailUrl,
    pictureUrls,
    mainSport: entry.mainSport,
    mainGoal: entry.mainGoal,
    trainingLevel: entry.trainingLevel,
    period: entry.period,
    tags: entry.tags,
    originalLanguages: entry.originalLanguages,
    authorCountry: entry.authorCountry,
    shortDescription: entry.shortDescription,
    expirationDate: entry.expirationDate?.toISOString() ?? null,
    sharedByUsername: entry.sharedByUsername,
    authorFullName: entry.authorFullName,
    authorAvatarUrl: entry.authorAvatarUrl,
    authorCountryName: entry.authorCountryName,
    authorCountryFlag: entry.authorCountryFlag,
    workoutCount: entry.workoutCount,
    totalMeters: entry.totalMeters,
    totalTimeSeconds: entry.totalTimeSeconds,
    totalSeries: entry.totalSeries,
    createdAt:
      planCreatedAtFromPayload(entry) ?? entry.createdAt.toISOString(),
    sharedAt: entry.sharedAt?.toISOString() ?? null,
    disabled: entry.disabled,
    isFavorite: entry.isFavorite,
    _raw: entry,
  });
}

export function sportLabel(sport?: string | null): string {
  if (!sport) return '—';
  return getSportDisplayName(sport);
}
