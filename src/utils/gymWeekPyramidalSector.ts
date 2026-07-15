import type { TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';
import {
  getSeriesDistribution,
  pyramidalTableRowsForArea,
  trainingLevelToCategory,
} from '@/utils/seriesDistribution';
import { computePyramidalRepsSeries, type PyramidalMode } from '@/utils/pyramidalReps';
import {
  PCT_1RM_FORMULA_COUNT,
  percentOf1RmFromReps,
  repsFromPercentOf1Rm,
} from '@/utils/percent1RmFormulas';

/** Pyramidal fields shared by manual and fast-plan sector shapes. */
export interface GymWeekPyramidalSector {
  reps: number;
  pyramidal: string;
  seriesReps: number[];
  seriesRepsRaw?: string[];
  pctFormulaIndex?: number;
  typeByPercent?: boolean;
  seriesPcts?: number[];
}

export const PYRAMIDAL_MODE_OPTIONS: { value: PyramidalMode; label: string }[] = [
  { value: 'flat', label: 'Flat (default)' },
  { value: 'ascending', label: 'Ascendent' },
  { value: 'descending', label: 'Descendent' },
  { value: 'mix', label: 'Mixed' },
];

function resizeStrings(arr: string[] | undefined, len: number): string[] {
  const out = [...(arr ?? [])];
  while (out.length < len) out.push('');
  out.length = len;
  return out;
}

function sectorPctFromReps(sec: GymWeekPyramidalSector, reps: number): number {
  return percentOf1RmFromReps(reps, sec.pctFormulaIndex ?? 0);
}

function sectorRepsFromPct(sec: GymWeekPyramidalSector, pct: number): number {
  return repsFromPercentOf1Rm(pct, sec.pctFormulaIndex ?? 0);
}

export function exerciseCountForPyramidalSector(
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
): number {
  if (totalSeries <= 0) return 0;
  if (exerciseRowCount > 0) return exerciseRowCount;
  const dist = getSeriesDistribution(totalSeries, trainingLevelToCategory(trainingLevel));
  return dist.length;
}

export function pyramidalTableRowsForGymSector(
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
): number {
  const ex = exerciseCountForPyramidalSector(totalSeries, exerciseRowCount, trainingLevel);
  return pyramidalTableRowsForArea(totalSeries, ex);
}

function computeTemplateSeriesReps(
  sec: GymWeekPyramidalSector,
  reps: number,
  pyramidal: PyramidalMode,
  templateRows: number,
): number[] {
  if (templateRows <= 0) return [];
  if (reps <= 0) return Array.from({ length: templateRows }, () => 0);
  if (pyramidal === 'flat') return Array.from({ length: templateRows }, () => reps);
  return computePyramidalRepsSeries(reps, templateRows, pyramidal);
}

/** Same value shown in the Reps column (raw string + parsed number). */
export function displayedPyramidalRepAt(
  sec: GymWeekPyramidalSector,
  rowIdx: number,
): { reps: number; raw: string } {
  const rawStored = sec.seriesRepsRaw?.[rowIdx] ?? '';
  if (rawStored.trim() !== '') {
    const p = parseInt(rawStored.trim(), 10);
    if (!Number.isNaN(p) && p > 0) {
      return { reps: Math.max(1, Math.min(99, p)), raw: rawStored.trim() };
    }
  }
  const r = sec.seriesReps?.[rowIdx];
  if (typeof r === 'number' && !Number.isNaN(r) && r > 0) {
    return { reps: r, raw: String(r) };
  }
  return { reps: 0, raw: '' };
}

export function ensureGymWeekPyramidalSector(
  sec: GymWeekPyramidalSector,
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
): GymWeekPyramidalSector {
  const series = Math.max(0, Math.min(20, totalSeries));
  const reps = Math.max(0, Math.min(99, sec.reps ?? 0));
  const templateRows = pyramidalTableRowsForGymSector(series, exerciseRowCount, trainingLevel);
  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;

  let seriesReps = sec.seriesReps;
  if (!Array.isArray(seriesReps) || seriesReps.length !== templateRows) {
    seriesReps = computeTemplateSeriesReps(sec, reps, pyramidal, templateRows);
  }

  const seriesRepsRaw = resizeStrings(sec.seriesRepsRaw, templateRows);
  const typeByPercent = sec.typeByPercent ?? false;
  let seriesPcts = sec.seriesPcts;
  if (!Array.isArray(seriesPcts) || seriesPcts.length !== templateRows) {
    seriesPcts = seriesReps.map((r) =>
      typeByPercent ? sectorPctFromReps(sec, r) : Math.max(0, parseFloat((100 - r * 2.5).toFixed(1))),
    );
  }

  return {
    ...sec,
    reps,
    pyramidal,
    seriesReps,
    seriesRepsRaw,
    typeByPercent,
    seriesPcts,
    pctFormulaIndex: sec.pctFormulaIndex ?? 0,
  };
}

function patchSingleRepRow(
  sec: GymWeekPyramidalSector,
  rowIdx: number,
  raw: string,
  repsValue: number,
  templateRows: number,
): GymWeekPyramidalSector {
  const seriesRepsRaw = resizeStrings(sec.seriesRepsRaw, templateRows);
  seriesRepsRaw[rowIdx] = raw;
  const seriesReps = [...(sec.seriesReps ?? [])];
  while (seriesReps.length < templateRows) seriesReps.push(0);
  seriesReps.length = templateRows;
  seriesReps[rowIdx] = repsValue;
  const seriesPcts = [...(sec.seriesPcts ?? [])];
  while (seriesPcts.length < templateRows) seriesPcts.push(0);
  seriesPcts.length = templateRows;
  seriesPcts[rowIdx] = sec.typeByPercent
    ? sectorPctFromReps(sec, repsValue)
    : Math.max(0, parseFloat((100 - repsValue * 2.5).toFixed(1)));
  return { ...sec, seriesReps, seriesRepsRaw, seriesPcts };
}

function syncPyramidalFromFirstRowPct(
  sec: GymWeekPyramidalSector,
  templateRows: number,
  row0Pct?: number,
  row0RepsRaw?: string,
): GymWeekPyramidalSector {
  if (templateRows <= 0) return sec;
  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  const fi = sec.pctFormulaIndex ?? 0;
  const pct0 =
    row0Pct != null && !Number.isNaN(row0Pct)
      ? Math.max(0, Math.min(100, row0Pct))
      : sec.seriesPcts?.[0] != null && !Number.isNaN(sec.seriesPcts[0])
        ? sec.seriesPcts[0]
        : sectorPctFromReps(sec, sec.seriesReps?.[0] ?? sec.reps ?? 12);

  const baseReps = repsFromPercentOf1Rm(pct0, fi);
  const seriesReps = computeTemplateSeriesReps(sec, baseReps, pyramidal, templateRows);
  if (seriesReps.length > 0) seriesReps[0] = baseReps;

  const seriesPcts = seriesReps.map((r) => percentOf1RmFromReps(r, fi));
  seriesPcts[0] = pct0;

  const seriesRepsRaw = seriesReps.map((r, i) => {
    if (i === 0 && row0RepsRaw != null && row0RepsRaw.trim() !== '') return row0RepsRaw.trim();
    return r > 0 ? String(r) : '';
  });

  return { ...sec, reps: baseReps, seriesReps, seriesPcts, seriesRepsRaw };
}

function syncPyramidalFromFirstRowReps(
  sec: GymWeekPyramidalSector,
  templateRows: number,
  baseReps: number,
  row0RepsRaw: string,
): GymWeekPyramidalSector {
  if (templateRows <= 0) return sec;
  const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
  const fi = sec.pctFormulaIndex ?? 0;
  const v = Math.max(1, Math.min(99, baseReps));
  const pct0 = percentOf1RmFromReps(v, fi);

  const seriesReps = computeTemplateSeriesReps(sec, v, pyramidal, templateRows);
  if (seriesReps.length > 0) seriesReps[0] = v;

  const seriesPcts = seriesReps.map((r) => percentOf1RmFromReps(r, fi));
  seriesPcts[0] = pct0;

  const seriesRepsRaw = seriesReps.map((r, i) =>
    i === 0 ? row0RepsRaw.trim() : r > 0 ? String(r) : '',
  );

  return { ...sec, reps: v, seriesReps, seriesPcts, seriesRepsRaw };
}

export function recalcPyramidalPctsFromReps(
  sec: GymWeekPyramidalSector,
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
  formulaIndex: number,
): GymWeekPyramidalSector {
  const templateRows = pyramidalTableRowsForGymSector(totalSeries, exerciseRowCount, trainingLevel);
  const fi = ((formulaIndex % PCT_1RM_FORMULA_COUNT) + PCT_1RM_FORMULA_COUNT) % PCT_1RM_FORMULA_COUNT;
  const base = { ...sec, pctFormulaIndex: fi };
  const seriesPcts = Array.from({ length: templateRows }, (_, i) => {
    const { reps } = displayedPyramidalRepAt(sec, i);
    return reps > 0 ? sectorPctFromReps(base, reps) : 0;
  });
  return { ...base, seriesPcts };
}

export function updatePyramidalRepAt(
  sec: GymWeekPyramidalSector,
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
  rowIdx: number,
  raw: string,
): GymWeekPyramidalSector {
  const templateRows = pyramidalTableRowsForGymSector(totalSeries, exerciseRowCount, trainingLevel);
  const seriesRepsRaw = resizeStrings(sec.seriesRepsRaw, templateRows);
  seriesRepsRaw[rowIdx] = raw;

  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return { ...sec, seriesRepsRaw };
  }

  const v = Math.max(1, Math.min(99, parsed));
  if (sec.typeByPercent) {
    if (rowIdx === 0) {
      return syncPyramidalFromFirstRowReps(
        { ...sec, seriesRepsRaw },
        templateRows,
        v,
        raw,
      );
    }
    return patchSingleRepRow({ ...sec, seriesRepsRaw }, rowIdx, raw, v, templateRows);
  }

  if (rowIdx === 0) {
    const pyramidal = (sec.pyramidal ?? 'flat') as PyramidalMode;
    const seriesReps = computeTemplateSeriesReps(sec, v, pyramidal, templateRows);
    const seriesPcts = seriesReps.map((r) =>
      sec.typeByPercent ? sectorPctFromReps(sec, r) : Math.max(0, parseFloat((100 - r * 2.5).toFixed(1))),
    );
    const nextRaw = seriesReps.map((r, i) => (i === 0 ? raw.trim() : r > 0 ? String(r) : ''));
    return { ...sec, reps: v, seriesReps, seriesPcts, seriesRepsRaw: nextRaw };
  }

  return patchSingleRepRow({ ...sec, seriesRepsRaw }, rowIdx, raw, v, templateRows);
}

export function updatePyramidalPctAt(
  sec: GymWeekPyramidalSector,
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
  rowIdx: number,
  raw: string,
): GymWeekPyramidalSector {
  const pct = parseFloat(raw);
  if (Number.isNaN(pct)) return sec;
  const clampedPct = Math.max(0, Math.min(100, pct));
  const templateRows = pyramidalTableRowsForGymSector(totalSeries, exerciseRowCount, trainingLevel);

  if (rowIdx === 0) {
    return syncPyramidalFromFirstRowPct(sec, templateRows, clampedPct);
  }

  const seriesPcts = [...(sec.seriesPcts ?? (sec.seriesReps ?? []).map((r) => sectorPctFromReps(sec, r)))];
  while (seriesPcts.length < templateRows) {
    seriesPcts.push(sectorPctFromReps(sec, sec.seriesReps?.[seriesPcts.length] ?? 1));
  }
  seriesPcts[rowIdx] = clampedPct;
  const calcReps = sectorRepsFromPct(sec, clampedPct);
  const seriesReps = [...(sec.seriesReps ?? [])];
  while (seriesReps.length < templateRows) seriesReps.push(1);
  seriesReps[rowIdx] = calcReps;
  const seriesRepsRaw = resizeStrings(sec.seriesRepsRaw, templateRows);
  seriesRepsRaw[rowIdx] = calcReps > 0 ? String(calcReps) : '';
  return { ...sec, seriesReps, seriesRepsRaw, seriesPcts };
}

export function setPyramidalTypeByPercent(
  sec: GymWeekPyramidalSector,
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
  enabled: boolean,
): GymWeekPyramidalSector {
  const templateRows = pyramidalTableRowsForGymSector(totalSeries, exerciseRowCount, trainingLevel);
  if (enabled && !sec.typeByPercent) {
    const recalc = recalcPyramidalPctsFromReps(
      { ...sec, typeByPercent: true },
      totalSeries,
      exerciseRowCount,
      trainingLevel,
      sec.pctFormulaIndex ?? 0,
    );
    return syncPyramidalFromFirstRowPct(recalc, templateRows);
  }
  return { ...sec, typeByPercent: enabled };
}

export function setPyramidalMode(
  sec: GymWeekPyramidalSector,
  totalSeries: number,
  exerciseRowCount: number,
  trainingLevel: TrainingLevel | null | undefined,
  mode: PyramidalMode,
): GymWeekPyramidalSector {
  const templateRows = pyramidalTableRowsForGymSector(totalSeries, exerciseRowCount, trainingLevel);
  const reps = sec.reps > 0 ? sec.reps : 12;
  const seriesReps = computeTemplateSeriesReps({ ...sec, pyramidal: mode }, reps, mode, templateRows);
  const seriesRepsRaw = seriesReps.map((r) => (r > 0 ? String(r) : ''));
  const seriesPcts = seriesReps.map((r) =>
    sec.typeByPercent ? sectorPctFromReps(sec, r) : Math.max(0, parseFloat((100 - r * 2.5).toFixed(1))),
  );
  return { ...sec, pyramidal: mode, seriesReps, seriesRepsRaw, seriesPcts };
}

/** First template-row reps applied to each exercise Rip/Time column. */
export function baseRepsForExerciseRows(sec: GymWeekPyramidalSector): number {
  const { reps } = displayedPyramidalRepAt(sec, 0);
  return reps > 0 ? reps : sec.reps > 0 ? sec.reps : 12;
}
