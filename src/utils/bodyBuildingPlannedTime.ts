import { parseFastPlannerPauseToSeconds } from '@/utils/moveframeAvePause';
import {
  getSeriesDistribution,
  type SeriesLevelCategory,
} from '@/utils/seriesDistribution';

/** Seconds per rep — probable work-time range for body building sets. */
export const BODY_BUILDING_SEC_PER_REP_MIN = 0.5;
export const BODY_BUILDING_SEC_PER_REP_MAX = 0.7;

function isMeaningfulMacro(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  return s !== '' && s !== '—' && s !== "0'";
}

function restSecondsFromMacroOrPause(
  macro: unknown,
  pause: unknown,
): number {
  if (isMeaningfulMacro(macro)) {
    return parseFastPlannerPauseToSeconds(macro);
  }
  return parseFastPlannerPauseToSeconds(pause);
}

/** Format seconds as `0h00'00"`. */
export function formatBodyBuildingPlannedDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

/** Display min–max range; collapses to one value when equal. */
export function formatBodyBuildingPlannedTimeRange(minSec: number, maxSec: number): string {
  const min = Math.max(0, minSec);
  const max = Math.max(min, maxSec);
  const minLabel = formatBodyBuildingPlannedDuration(min);
  const maxLabel = formatBodyBuildingPlannedDuration(max);
  if (Math.round(min) === Math.round(max)) return minLabel;
  return `${minLabel} – ${maxLabel}`;
}

export interface BodyBuildingMovelapForTime {
  reps?: unknown;
  pause?: unknown;
  macroFinal?: unknown;
  _fastPlannerMacro?: unknown;
  _fastPlannerBreak?: unknown;
}

/** Sum reps + effective rests (macro substitutes pause) for saved movelaps. */
export function computeBodyBuildingMovelapsTimeRange(
  movelaps: BodyBuildingMovelapForTime[],
): { totalReps: number; pauseSec: number; minSec: number; maxSec: number } {
  let totalReps = 0;
  let pauseSec = 0;

  for (const lap of movelaps) {
    const reps = parseInt(String(lap.reps ?? '').trim(), 10);
    if (Number.isFinite(reps) && reps > 0) totalReps += reps;

    const macro = lap.macroFinal ?? lap._fastPlannerMacro;
    const pause = lap.pause ?? lap._fastPlannerBreak;
    pauseSec += restSecondsFromMacroOrPause(macro, pause);
  }

  const repMin = totalReps * BODY_BUILDING_SEC_PER_REP_MIN;
  const repMax = totalReps * BODY_BUILDING_SEC_PER_REP_MAX;

  return {
    totalReps,
    pauseSec,
    minSec: pauseSec + repMin,
    maxSec: pauseSec + repMax,
  };
}

export interface FastPlanSetForBodyBuildingTime {
  reps: number;
  /** Rest after this set — already resolved (macro or pause). */
  restSec: number;
}

export interface FastPlanSectorForBodyBuildingTime {
  totalSeries: number;
  reps: number;
  pause: string;
  macroExercise: string;
  macroEndOfSector: string;
  seriesReps?: number[];
  exercises: Array<{
    ripsTime: string;
    breakTime: string;
    distributedSeries?: number;
  }>;
}

function parseRepsFromRipsTime(value: string): number {
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function repsForFastPlanSet(
  sector: FastPlanSectorForBodyBuildingTime,
  globalRowIdx: number,
  ex: FastPlanSectorForBodyBuildingTime['exercises'][number],
): number {
  const fromTable = sector.seriesReps?.[globalRowIdx];
  if (typeof fromTable === 'number' && fromTable > 0) return fromTable;
  return parseRepsFromRipsTime(ex.ripsTime) || sector.reps || 0;
}

function restSecForGlobalSeriesRow(
  sector: FastPlanSectorForBodyBuildingTime,
  globalRowIdx: number,
  totalSets: number,
  levelCat: SeriesLevelCategory,
  exBreakFallback: string,
): number {
  const n = totalSets;
  if (n <= 0 || globalRowIdx < 0 || globalRowIdx >= n) return 0;

  const dist = getSeriesDistribution(sector.totalSeries, levelCat);
  const distSum = dist.reduce((a, b) => a + b, 0);
  const exerciseCount = sector.exercises.length;

  if (distSum === n && exerciseCount === dist.length) {
    let start = 0;
    for (let ex = 0; ex < dist.length; ex++) {
      const len = dist[ex];
      const endRow = start + len - 1;
      if (globalRowIdx >= start && globalRowIdx <= endRow) {
        if (globalRowIdx < endRow) {
          return (
            parseFastPlannerPauseToSeconds(exBreakFallback) ||
            parseFastPlannerPauseToSeconds(sector.pause)
          );
        }
        if (ex < dist.length - 1) {
          return parseFastPlannerPauseToSeconds(sector.macroExercise);
        }
        return parseFastPlannerPauseToSeconds(sector.macroEndOfSector);
      }
      start += len;
    }
  }

  return (
    parseFastPlannerPauseToSeconds(exBreakFallback) ||
    parseFastPlannerPauseToSeconds(sector.pause)
  );
}

function restSecForFastPlanSet(
  isLastSetInExercise: boolean,
  isLastExerciseInSector: boolean,
  exBreak: string,
  sectorPause: string,
  macroExercise: string,
  macroEndOfSector: string,
): number {
  if (isLastSetInExercise) {
    const macro = isLastExerciseInSector ? macroEndOfSector : macroExercise;
    if (isMeaningfulMacro(macro)) {
      return parseFastPlannerPauseToSeconds(macro);
    }
  }
  return (
    parseFastPlannerPauseToSeconds(exBreak) ||
    parseFastPlannerPauseToSeconds(sectorPause)
  );
}

/** Expand a fast-plan sector into per-set rows (reps + rest after each set). */
export function expandFastPlanSectorToSets(
  sector: FastPlanSectorForBodyBuildingTime,
  seriesPerExercise: (exIdx: number) => number,
  levelCat: SeriesLevelCategory = 'mid',
): FastPlanSetForBodyBuildingTime[] {
  const sets: FastPlanSetForBodyBuildingTime[] = [];
  let globalRow = 0;
  const exerciseCount = sector.exercises.length;
  const totalSets = sector.exercises.reduce(
    (sum, _ex, exIdx) => sum + Math.max(0, seriesPerExercise(exIdx)),
    0,
  );

  for (let exIdx = 0; exIdx < exerciseCount; exIdx++) {
    const ex = sector.exercises[exIdx];
    const sc = Math.max(0, seriesPerExercise(exIdx));
    const isLastExercise = exIdx === exerciseCount - 1;

    for (let k = 0; k < sc; k++) {
      const isLastSet = k === sc - 1;
      sets.push({
        reps: repsForFastPlanSet(sector, globalRow, ex),
        restSec: restSecForGlobalSeriesRow(
          sector,
          globalRow,
          totalSets,
          levelCat,
          ex.breakTime,
        ) || restSecForFastPlanSet(
          isLastSet,
          isLastExercise,
          ex.breakTime,
          sector.pause,
          sector.macroExercise,
          sector.macroEndOfSector,
        ),
      });
      globalRow++;
    }
  }

  return sets;
}

export function computeBodyBuildingSetsTimeRange(sets: FastPlanSetForBodyBuildingTime[]): {
  totalReps: number;
  pauseSec: number;
  minSec: number;
  maxSec: number;
} {
  let totalReps = 0;
  let pauseSec = 0;

  for (const set of sets) {
    if (set.reps > 0) totalReps += set.reps;
    pauseSec += set.restSec;
  }

  const repMin = totalReps * BODY_BUILDING_SEC_PER_REP_MIN;
  const repMax = totalReps * BODY_BUILDING_SEC_PER_REP_MAX;

  return {
    totalReps,
    pauseSec,
    minSec: pauseSec + repMin,
    maxSec: pauseSec + repMax,
  };
}
