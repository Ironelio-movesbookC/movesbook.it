import { isAerobicSport, NOT_AEROBIC_FAST_PLAN_SPORTS } from '@/constants/moveframe.constants';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';

export type ArchiveTrainingCategory = 'aerobic' | 'non-aerobic' | 'weight training';

const WEIGHT_TRAINING_SPORTS = new Set<string>(NOT_AEROBIC_FAST_PLAN_SPORTS);

export function inferArchiveTrainingCategory(
  mainSport?: string | null,
  tags?: string | null
): ArchiveTrainingCategory {
  const tagLower = (tags ?? '').toLowerCase();
  if (tagLower.includes('weight training') || tagLower.includes('weight-training')) {
    return 'weight training';
  }
  if (tagLower.includes('non-aerobic') || tagLower.includes('non aerobic')) {
    return 'non-aerobic';
  }
  if (tagLower.includes('aerobic')) {
    return 'aerobic';
  }

  const sport = mainSport?.trim();
  if (!sport) return 'non-aerobic';

  if (WEIGHT_TRAINING_SPORTS.has(sport)) return 'weight training';
  if (isAerobicSport(sport)) return 'aerobic';
  return 'non-aerobic';
}

export function archiveTrainingCategoryLabel(category: ArchiveTrainingCategory): string {
  switch (category) {
    case 'aerobic':
      return 'Aerobic';
    case 'non-aerobic':
      return 'Non-aerobic';
    case 'weight training':
      return 'Weight training';
    default:
      return category;
  }
}

export function enrichArchiveGridRecord(
  record: WorkoutArchiveGridRecord
): WorkoutArchiveGridRecord {
  return {
    ...record,
    trainingCategory: inferArchiveTrainingCategory(record.mainSport, record.tags),
  };
}
