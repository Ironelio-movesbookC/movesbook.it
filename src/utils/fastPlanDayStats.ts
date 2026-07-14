import {
  computeBodyBuildingSetsTimeRange,
  expandFastPlanSectorToSets,
  formatBodyBuildingPlannedTimeRange,
} from '@/utils/bodyBuildingPlannedTime';
import {
  getSeriesDistribution,
  type SeriesLevelCategory,
} from '@/utils/seriesDistribution';

export interface FastPlanExerciseForStats {
  ripsTime: string;
  weight: string;
  breakTime: string;
  distributedSeries?: number;
}

export interface FastPlanSectorForStats {
  totalSeries: number;
  reps: number;
  pause: string;
  macroExercise: string;
  macroEndOfSector: string;
  seriesReps?: number[];
  exercises: FastPlanExerciseForStats[];
}

export interface FastPlanDayForStats {
  sectors: FastPlanSectorForStats[];
}

function parseRepsFromRipsTime(value: string): number {
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function pauseToSec(p: string): number {
  const m = p?.match(/(\d+)['''](\d+)/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const s = parseFloat(p);
  return Number.isNaN(s) ? 90 : s;
}

/** Series count shown in the exercise table for one row. */
export function seriesCountForFastPlanExercise(
  ex: FastPlanExerciseForStats,
  exIdx: number,
  sector: FastPlanSectorForStats,
  levelCat: SeriesLevelCategory,
): number {
  if (ex.distributedSeries != null && ex.distributedSeries > 0) {
    return ex.distributedSeries;
  }
  const dist = getSeriesDistribution(sector.totalSeries, levelCat);
  return dist[exIdx] ?? 1;
}

/** Sum of series across all exercise rows in a sector (matches the table). */
export function actualFastPlanSectorSeries(
  sector: FastPlanSectorForStats,
  levelCat: SeriesLevelCategory,
): number {
  return sector.exercises.reduce(
    (sum, ex, i) => sum + seriesCountForFastPlanExercise(ex, i, sector, levelCat),
    0,
  );
}

export function computeFastPlanDayRealStats(
  day: FastPlanDayForStats,
  levelCat: SeriesLevelCategory,
) {
  let totalSeries = 0;
  let totalExercises = 0;
  let repSum = 0;
  let repWeight = 0;
  const pauseSecs: number[] = [];
  let totalWeights = 0;

  for (const sector of day.sectors) {
    totalExercises += sector.exercises.length;
    for (let i = 0; i < sector.exercises.length; i++) {
      const ex = sector.exercises[i];
      const sc = seriesCountForFastPlanExercise(ex, i, sector, levelCat);
      totalSeries += sc;
      totalWeights += parseFloat(ex.weight) || 0;

      const reps = parseRepsFromRipsTime(ex.ripsTime);
      if (reps > 0) {
        repSum += reps * sc;
        repWeight += sc;
      }

      const pause = pauseToSec(ex.breakTime);
      for (let k = 0; k < sc; k++) pauseSecs.push(pause);
    }
  }

  const breakAvgSec = pauseSecs.length
    ? Math.round(pauseSecs.reduce((a, b) => a + b, 0) / pauseSecs.length)
    : 0;
  const breakAvgStr = `${Math.floor(breakAvgSec / 60)}'${String(breakAvgSec % 60).padStart(2, '0')}"`;

  const avgReps = repWeight > 0 ? (repSum / repWeight).toFixed(1) : '0';
  const avgSeriesPerArea =
    day.sectors.length > 0
      ? Math.round((totalSeries / day.sectors.length) * 10) / 10
      : 0;

  const allSets = day.sectors.flatMap((sector) =>
    expandFastPlanSectorToSets(
      sector,
      (exIdx) => seriesCountForFastPlanExercise(sector.exercises[exIdx], exIdx, sector, levelCat),
      levelCat,
    ),
  );
  const { minSec, maxSec } = computeBodyBuildingSetsTimeRange(allSets);
  const totalTimePlannedStr = formatBodyBuildingPlannedTimeRange(minSec, maxSec);

  return {
    totalSeries,
    totalExercises,
    avgSeriesPerArea,
    avgReps,
    breakAvgStr,
    totalWeights,
    totalTimePlannedStr,
  };
}
