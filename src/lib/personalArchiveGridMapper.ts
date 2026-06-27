import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';
import { computeWorkoutArchiveMetrics } from '@/lib/workoutArchiveMetrics';
import { getSportDisplayName } from '@/constants/moveframe.constants';
import { parseGymWeekArchivePayload } from '@/types/gymWeekArchive';
import {
  getGoalLabel,
  getPlanGymWeekTrainingLevelLabel,
  type GoalId,
  type TrainingLevel,
} from '@/components/workouts/modals/PlanGymWeekModal';
import { enrichArchiveGridRecord } from '@/lib/archiveTrainingCategory';

function extractSports(workout: any): string[] {
  const sports = new Set<string>();
  workout?.sports?.forEach((s: { sport?: string }) => {
    if (s?.sport) sports.add(s.sport);
  });
  workout?.moveframes?.forEach((mf: { sport?: string }) => {
    if (mf?.sport) sports.add(mf.sport);
  });
  return Array.from(sports);
}

/** Map personal archive plan weeks + workouts into grid rows. */
export function mapPersonalArchiveToGridRecords(workoutPlan: {
  weeks?: any[];
} | null): WorkoutArchiveGridRecord[] {
  const records: WorkoutArchiveGridRecord[] = [];
  const weeks = [...(workoutPlan?.weeks ?? [])].sort(
    (a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0)
  );

  for (const week of weeks) {
    const gymPayload = parseGymWeekArchivePayload(week.notes);
    const meta = gymPayload?.metadata;

    const weekSports = new Set<string>();
    let weekMetrics = { workoutCount: 0, totalMeters: 0, totalTimeSeconds: 0, totalSeries: 0 };

    for (const day of week.days ?? []) {
      for (const workout of day.workouts ?? []) {
        extractSports(workout).forEach((s) => weekSports.add(s));
        weekMetrics.workoutCount += 1;
        const m = computeWorkoutArchiveMetrics(workout);
        weekMetrics.totalMeters += m.totalMeters;
        weekMetrics.totalTimeSeconds += m.totalTimeSeconds;
        weekMetrics.totalSeries += m.totalSeries;
      }
    }

    records.push({
      id: `week-${week.id}`,
      recordType: 'WEEKLY_PLAN',
      code: meta?.code ?? `W${week.weekNumber ?? '?'}`,
      numWeeks: 1,
      title: meta?.title ?? (week.notes?.trim() || `Archive Week ${week.weekNumber ?? '?'}`),
      mainSport: meta?.workoutType ?? (Array.from(weekSports)[0] ?? week.period?.name ?? null),
      mainGoal: meta?.goal
        ? getGoalLabel(meta.goal as GoalId)
        : null,
      trainingLevel: meta?.level
        ? getPlanGymWeekTrainingLevelLabel(meta.level as TrainingLevel)
        : null,
      period: meta?.periodName ?? week.period?.name ?? null,
      tags: meta?.tags ?? null,
      shortDescription: meta?.description ?? null,
      expirationDate: meta?.expirationDate ?? null,
      authorCountry: meta?.authorCountry ?? null,
      workoutCount: meta?.workoutCount ?? weekMetrics.workoutCount,
      totalMeters: weekMetrics.totalMeters,
      totalTimeSeconds: weekMetrics.totalTimeSeconds,
      totalSeries: weekMetrics.totalSeries,
      createdAt: meta?.createdAt ?? week.createdAt,
      archiveSource: 'personal',
      _raw: week,
    });

    for (const day of week.days ?? []) {
      for (const workout of day.workouts ?? []) {
        const sports = extractSports(workout);
        const metrics = computeWorkoutArchiveMetrics(workout);
        records.push({
          id: workout.id,
          recordType: 'WORKOUT',
          code: workout.code?.trim() || workout.id.slice(-6).toUpperCase(),
          numWeeks: 1,
          title: workout.name || `Workout #${workout.sessionNumber ?? '?'}`,
          mainSport: workout.mainSport ?? sports[0] ?? null,
          mainGoal: workout.mainGoal ?? null,
          trainingLevel: workout.intensity ?? null,
          period: day.period?.name ?? week.period?.name ?? null,
          tags: workout.tags ?? null,
          workoutCount: 1,
          totalMeters: metrics.totalMeters,
          totalTimeSeconds: metrics.totalTimeSeconds,
          totalSeries: metrics.totalSeries,
          archiveSource: 'personal',
          _raw: { workout, day, week },
        });
      }
    }
  }

  return records.map(enrichArchiveGridRecord);
}

export { getSportDisplayName };
