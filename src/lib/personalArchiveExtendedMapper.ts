import type { PeriodizationTemplate } from '@/constants/tools.constants';
import { normalizePeriodizationTemplates } from '@/constants/tools.constants';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import { computeWeeklyPlanMetrics } from '@/lib/workoutArchiveMetrics';

/** Map user periodization templates → structured program archive rows. */
export function mapPeriodizationTemplatesToGridRecords(
  templates: PeriodizationTemplate[]
): WorkoutArchiveGridRecord[] {
  return templates.map((tpl) => ({
    id: `structured-${tpl.id}`,
    recordType: 'STRUCTURED_PROGRAM' as const,
    code: tpl.id.slice(-8).toUpperCase(),
    numWeeks: tpl.build?.weekPeriodByNumber
      ? Object.keys(tpl.build.weekPeriodByNumber).length
      : 52,
    title: tpl.name,
    mainSport: tpl.sport || null,
    mainGoal: tpl.level || null,
    trainingLevel: tpl.level || null,
    period: null,
    tags: tpl.tags?.join(', ') || null,
    shortDescription: tpl.notes || null,
    originalLanguages: tpl.language || null,
    workoutCount: 0,
    createdAt: tpl.createdAt,
    archiveSource: 'personal' as const,
    _raw: tpl,
  }));
}

/** Map favourite weekly plans saved from coaches / shared sources. */
export function mapFavoritePlansToCoachGridRecords(
  plans: Array<{
    id: string;
    name: string;
    description?: string;
    workoutsCount?: number;
    planData?: unknown;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }>
): WorkoutArchiveGridRecord[] {
  return plans.map((plan) => {
    let metrics = { workoutCount: plan.workoutsCount ?? 0, totalMeters: 0, totalTimeSeconds: 0, totalSeries: 0 };
    try {
      const parsed =
        typeof plan.planData === 'string' ? JSON.parse(plan.planData) : plan.planData;
      if (parsed && typeof parsed === 'object') {
        metrics = computeWeeklyPlanMetrics(parsed as Parameters<typeof computeWeeklyPlanMetrics>[0]);
      }
    } catch {
      /* keep defaults */
    }
    return {
      id: `coach-${plan.id}`,
      recordType: 'COACH_PLAN' as const,
      code: plan.id.slice(-8).toUpperCase(),
      numWeeks: 1,
      title: plan.name,
      mainSport: null,
      mainGoal: null,
      trainingLevel: null,
      period: null,
      tags: plan.description || null,
      shortDescription: plan.description || null,
      workoutCount: metrics.workoutCount,
      totalMeters: metrics.totalMeters,
      totalTimeSeconds: metrics.totalTimeSeconds,
      totalSeries: metrics.totalSeries,
      createdAt:
        typeof plan.createdAt === 'string'
          ? plan.createdAt
          : plan.createdAt?.toISOString?.() ?? undefined,
      archiveSource: 'personal' as const,
      _raw: plan,
    };
  });
}

export function parsePeriodizationTemplatesFromToolsSettings(
  toolsSettings: unknown
): PeriodizationTemplate[] {
  if (!toolsSettings || typeof toolsSettings !== 'object') return [];
  const raw = (toolsSettings as Record<string, unknown>).periodizationTemplates;
  return normalizePeriodizationTemplates(raw);
}
