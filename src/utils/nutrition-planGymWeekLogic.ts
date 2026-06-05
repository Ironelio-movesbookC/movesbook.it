import type { ManualDayPlan, ManualDaySector } from '@/components/nutrition/modals/PlanGymWeekManualModal';
import type { TrainingLevel } from '@/components/nutrition/modals/PlanGymWeekModal';
import { computePyramidalRepsSeries, type PyramidalMode } from '@/utils/pyramidalReps';

export type TimesPerSector = 'once' | '2' | '3' | 'all';
export type DistributionType = 'A' | 'B' | 'C' | 'D';

const TOTAL_AREAS = 12;

const SECTOR_LABELS: Record<string, string> = {
  shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  chest: 'Chest', abs: 'Abdominals', trapezius: 'Trapezius', lats: 'Lats',
  quadriceps: 'Quadriceps', hams: 'Hamstrings', calves: 'Calves', glutes: 'Glutes'
};

const SECTOR_IMAGES: Record<string, string> = {
  shoulders: '/muscular/shoulders.png', biceps: '/muscular/Biceps.png', triceps: '/muscular/Triceps.png',
  forearms: '/muscular/Forearms.png', chest: '/muscular/chest.png', abs: '/muscular/abs.png',
  trapezius: '/muscular/trapezius.png', lats: '/muscular/Lats.png', quadriceps: '/muscular/quadriceps.png',
  hams: '/muscular/hams.png', calves: '/muscular/calves.png', glutes: '/muscular/glutes.png'
};

export function getAreasToDistribute(daysCount: number): number {
  const n = Math.min(6, Math.max(1, daysCount));
  if (n === 1) return 12;
  if (n <= 3) return 11; // 12 - 1 constant
  return 10; // 12 - 2 constants
}

export function getConstantCount(daysCount: number): number {
  const n = Math.min(6, Math.max(1, daysCount));
  if (n === 1) return 0;
  if (n <= 3) return 1;
  return 2;
}

function getAreasPerDayOnce(daysCount: number): number[] {
  const areas = getAreasToDistribute(daysCount);
  const n = daysCount;
  if (n <= 0) return [];
  if (n === 1) return [12]; // 12 + 0 constant
  const base = Math.floor(areas / n);
  const remainder = areas - base * n;
  const out: number[] = [];
  if (n === 2) {
    out.push(5, 6);
    return out;
  }
  if (n === 3 && remainder === 2) {
    out.push(4, 3, 4);
    return out;
  }
  if (n === 4) {
    out.push(2, 3, 2, 3);
    return out;
  }
  if (n === 6) {
    for (let i = 0; i < 5; i++) out.push(2);
    out.push(0);
    return out;
  }
  for (let i = 0; i < n; i++) {
    out.push(base + (i < remainder ? 1 : 0));
  }
  return out;
}


function getAreasPerRoutineLetter(daysCount: number, timesPerSector: '2' | '3'): [number, number] {
  const areas = getAreasToDistribute(daysCount);
  const half = areas / 2;
  const a = Math.ceil(half);
  const b = areas - a;
  return [a, b];
}

/** Routine letter index for the day (0 = A, 1 = B, …). For once: 0,1,2,…; for 2/3: 0,1,0,1,… */
function getRoutineLetterIndex(dayIndex: number, daysCount: number, timesPerSector: TimesPerSector): number {
  if (timesPerSector === 'once' || timesPerSector === 'all') return dayIndex;
  return dayIndex % 2;
}

/** Number of distinct routine letters. Once/all: daysCount; 2/3: 2. */
function getNumRoutineLetters(daysCount: number, timesPerSector: TimesPerSector): number {
  if (timesPerSector === '2' || timesPerSector === '3') return 2;
  return Math.min(6, daysCount);
}

/** Legacy: areas per routine for a single day (for backward compatibility). */
export function getAreasPerRoutine(daysCount: number, timesPerSector: TimesPerSector): number {
  const areas = getAreasToDistribute(daysCount);
  const n = Math.min(6, Math.max(1, daysCount));
  if (timesPerSector === 'all') return 12;
  if (timesPerSector === 'once') {
    const perDay = getAreasPerDayOnce(n);
    return Math.max(...perDay, 0);
  }
  if (timesPerSector === '2' || timesPerSector === '3') {
    const [a, b] = getAreasPerRoutineLetter(n, timesPerSector);
    return Math.max(a, b);
  }
  return 4;
}

/**
 * Connections among types of combinations in muscular areas (by distribution type).
 * Used to alternate group1 with group2 when distributing sectors; selection can be random within each group.
 *
 * When "2 times a week" each sector: we have 2 routine letters (A, B) and alternate e.g. B1–B2 Agonist–Antagonist.
 * Same logic applies for "3 times a week" (5–6 workouts) and "once" (any number of workouts).
 *
 * Muscular areas: 01 Shoulders, 02 Biceps, 03 Triceps, 04 Forearms, 05 Chest, 06 Abdominals,
 * 07 Trapezius, 08 Lats, 09 Quadriceps, 10 Gluteus, 11 Hamstrings, 12 Calves.
 */

/** Group 1 and 2 sector ids per distribution type (for alternating selection). */
const DISTRIBUTION_GROUP_IDS: Record<DistributionType, { g1: string[]; g2: string[] }> = {
  A: {
    g1: ['chest', 'abs', 'lats', 'quadriceps', 'glutes', 'hams'],
    g2: ['shoulders', 'biceps', 'triceps', 'forearms', 'trapezius', 'calves']
  },
  B: {
    g1: ['shoulders', 'biceps', 'forearms', 'chest', 'abs', 'quadriceps'],
    g2: ['triceps', 'trapezius', 'lats', 'glutes', 'hams', 'calves']
  },
  C: {
    g1: ['shoulders', 'triceps', 'chest', 'quadriceps', 'glutes', 'calves'],
    g2: ['biceps', 'forearms', 'abs', 'trapezius', 'lats', 'hams']
  },
  D: {
    g1: ['chest', 'abs', 'lats', 'quadriceps', 'glutes', 'hams'],
    g2: ['shoulders', 'biceps', 'triceps', 'forearms', 'trapezius', 'calves']
  }
};

/** A – full order (Large then Small) for fallback / "all". */
function getOrderA(): string[] {
  return [...DISTRIBUTION_GROUP_IDS.A.g1, ...DISTRIBUTION_GROUP_IDS.A.g2];
}

function getOrderB(): string[] {
  return [...DISTRIBUTION_GROUP_IDS.B.g1, ...DISTRIBUTION_GROUP_IDS.B.g2];
}

function getOrderC(): string[] {
  return [...DISTRIBUTION_GROUP_IDS.C.g1, ...DISTRIBUTION_GROUP_IDS.C.g2];
}

function getOrderD(): string[] {
  return getOrderA();
}

function getSectorOrder(distributionType: DistributionType): string[] {
  switch (distributionType) {
    case 'A': return getOrderA();
    case 'B': return getOrderB();
    case 'C': return getOrderC();
    case 'D': return getOrderD();
    default: return getOrderA();
  }
}

/** Step 1: Remove the 1–2 constant area(s) from the list; rest are distributed by type A/B/C. */
function getOrderWithoutConstants(
  fullOrder: string[],
  constantSectors: string[],
  daysCount: number
): string[] {
  const numConst = getConstantCount(daysCount);
  if (numConst === 0 || constantSectors.length === 0) return [...fullOrder];
  const set = new Set(constantSectors.slice(0, numConst));
  return fullOrder.filter((id) => !set.has(id));
}

/** Shuffle array in place (Fisher–Yates); returns the same array. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Split residual sectors into group1 and group2 by distribution type (A1/A2, B1/B2, C1/C2). */
function splitResidualIntoGroups(
  residual: string[],
  distributionType: DistributionType
): { g1: string[]; g2: string[] } {
  const { g1: g1Ids, g2: g2Ids } = DISTRIBUTION_GROUP_IDS[distributionType];
  const set1 = new Set(g1Ids);
  const set2 = new Set(g2Ids);
  const g1 = residual.filter((id) => set1.has(id));
  const g2 = residual.filter((id) => set2.has(id));
  return { g1, g2 };
}

/** Interleave two arrays: alternate g1[0], g2[0], g1[1], g2[1], …; append remainder of the longer list. */
function interleave<T>(g1: T[], g2: T[]): T[] {
  const out: T[] = [];
  const len = Math.min(g1.length, g2.length);
  for (let i = 0; i < len; i++) {
    out.push(g1[i], g2[i]);
  }
  out.push(...g1.slice(len), ...g2.slice(len));
  return out;
}

/**
 * Build list to distribute: residual split into g1/g2 (e.g. B1 Agonist, B2 Antagonist), shuffled (random),
 * then interleaved (alternate 1 sector from g1 and 1 from g2). First 5 → Routine A, next 5 → Routine B.
 * The 5 sectors of Routine A and the 5 of Routine B are selected by alternating g1–g2 in random order;
 * sectors in A are not the same as in B.
 */
function getResidualOrderAlternating(
  orderToDistribute: string[],
  distributionType: DistributionType
): string[] {
  const { g1, g2 } = splitResidualIntoGroups(orderToDistribute, distributionType);
  const g1Shuffled = shuffle([...g1]);
  const g2Shuffled = shuffle([...g2]);
  return interleave(g1Shuffled, g2Shuffled);
}

/** Split array into groups with given sizes (sum of sizes should equal arr.length). */
function partitionBySizes<T>(arr: T[], sizes: number[]): T[][] {
  const out: T[][] = [];
  let idx = 0;
  for (const size of sizes) {
    out.push(arr.slice(idx, idx + size));
    idx += size;
  }
  return out;
}

const DEFAULT_SECTOR_PARAMS = {
  exercises: 3,
  series: 4,
  reps: 12,
  pause: "1'30\"",
  macroExercise: "1'",
  macroEndOfSector: "2'",
  pyramidal: 'flat' as PyramidalMode
};

export const PLAN_GYM_WEEK_WIZARD_DEFAULT_SERIES_PER_SECTOR = DEFAULT_SECTOR_PARAMS.series;
export const PLAN_GYM_WEEK_WIZARD_DEFAULT_REPS = DEFAULT_SECTOR_PARAMS.reps;
export const PLAN_GYM_WEEK_WIZARD_DEFAULT_PAUSE_LABEL = DEFAULT_SECTOR_PARAMS.pause;
export const PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_EX_LABEL = DEFAULT_SECTOR_PARAMS.macroExercise;
export const PLAN_GYM_WEEK_WIZARD_DEFAULT_MACRO_END_LABEL = DEFAULT_SECTOR_PARAMS.macroEndOfSector;

function toManualDaySector(sectorId: string): ManualDaySector {
  const { pyramidal, series, reps, ...rest } = DEFAULT_SECTOR_PARAMS;
  const seriesReps = computePyramidalRepsSeries(reps, series, pyramidal);
  return {
    sectorId,
    sectorLabel: SECTOR_LABELS[sectorId] ?? sectorId,
    image: SECTOR_IMAGES[sectorId] ?? '',
    ...rest,
    series,
    reps,
    pyramidal,
    seriesReps,
    seriesWeights: Array.from({ length: series }, () => '0')
  };
}

export interface BuildHelpedRoutinesParams {
  daysCount: number;
  timesPerSector: TimesPerSector;
  distributionType: DistributionType;
  constantSectors: string[];
  trainingLevel?: TrainingLevel | null;
  /**
   * Where to place constant muscle sectors in each day’s list.
   * false (default): at the end. true: at the beginning.
   */
  constantSectorsAtBeginning?: boolean;
}

/**
 * Which constant sector(s) for this day.
 * Routine A: 5 sectors + 1st constant area. Routine B: 5 sectors + 2nd constant area.
 * (Day index even → A → 1st constant; day index odd → B → 2nd constant. Exception: day 6 when once → both constants.)
 */
function getConstantsForDay(
  dayIndex: number,
  daysCount: number,
  constantSectors: string[]
): string[] {
  const numConst = getConstantCount(daysCount);
  if (numConst === 0 || constantSectors.length === 0) return [];
  if (numConst === 1) return [constantSectors[0]].filter(Boolean);
  const isLastDayWithTwoConstants = daysCount === 6 && dayIndex === 5;
  if (isLastDayWithTwoConstants) return constantSectors.slice(0, 2).filter(Boolean);
  return [constantSectors[dayIndex % 2]].filter(Boolean);
}

/**
 * Build automatic routines from areas to distribute and constant sectors.
 * Once: divide areas to distribute by N workouts (rounding); each day gets its share + 1 constant (or 2 for day 6 when 6 workouts).
 * Times 2/3: divide areas to distribute by 2; routine A and B get 5/6 each; pattern A,B,A,B… with 1st/2nd constant.
 */
/** Merge system-chosen sectors with constant sectors; respects A/B/C/D alternation via getResidualOrderAlternating. */
function attachConstantsToSectorIds(
  systemSectors: string[],
  constants: string[],
  atBeginning: boolean
): string[] {
  const toAdd = constants.filter((c) => c && !systemSectors.includes(c));
  if (atBeginning) return [...toAdd, ...systemSectors];
  return [...systemSectors, ...toAdd];
}

export function buildHelpedRoutines(params: BuildHelpedRoutinesParams): { daysCount: number; days: ManualDayPlan[] } {
  const { daysCount, timesPerSector, distributionType, constantSectors } = params;
  const constantSectorsAtBeginning = params.constantSectorsAtBeginning === true;
  const n = Math.min(6, Math.max(1, daysCount));
  const fullOrder = getSectorOrder(distributionType);
  const orderToDistribute = getOrderWithoutConstants(fullOrder, constantSectors, n);
  const routineLetters = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
  const days: ManualDayPlan[] = [];

  if (timesPerSector === 'all') {
    // All the times: all 12 muscles in each workout, same routine letter (A), 0 constant areas
    for (let d = 0; d < n; d++) {
      days.push({
        routineName: 'Routine A',
        sectors: fullOrder.map(toManualDaySector)
      });
    }
    return { daysCount: n, days };
  }

  if (timesPerSector === 'once') {
    const areasPerDay = getAreasPerDayOnce(n);
    const totalDistributed = areasPerDay.reduce((a, b) => a + b, 0);
    const sizes = areasPerDay.filter((s) => s > 0);
    const alternatingOrder = getResidualOrderAlternating(orderToDistribute, distributionType);
    const groups = partitionBySizes(alternatingOrder.slice(0, totalDistributed), sizes);
    for (let d = 0; d < n; d++) {
      const letter = routineLetters[d];
      const systemSectors = d < groups.length ? groups[d] ?? [] : [];
      const constants = getConstantsForDay(d, n, constantSectors);
      const sectorIds = attachConstantsToSectorIds(systemSectors, constants, constantSectorsAtBeginning);
      days.push({
        routineName: `Routine ${letter}`,
        sectors: sectorIds.map(toManualDaySector)
      });
    }
    return { daysCount: n, days };
  }

  if (timesPerSector === '2' || timesPerSector === '3') {
    const [sizeA, sizeB] = getAreasPerRoutineLetter(n, timesPerSector);
    const totalDistributed = sizeA + sizeB;
    const alternatingOrder = getResidualOrderAlternating(orderToDistribute, distributionType);
    const groups = partitionBySizes(alternatingOrder.slice(0, totalDistributed), [sizeA, sizeB]);
    for (let d = 0; d < n; d++) {
      const letterIdx = getRoutineLetterIndex(d, n, timesPerSector);
      const letter = routineLetters[letterIdx];
      const systemSectors = groups[letterIdx] ?? [];
      const constants = getConstantsForDay(d, n, constantSectors);
      const sectorIds = attachConstantsToSectorIds(systemSectors, constants, constantSectorsAtBeginning);
      days.push({
        routineName: `Routine ${letter}`,
        sectors: sectorIds.map(toManualDaySector)
      });
    }
    return { daysCount: n, days };
  }

  return { daysCount: n, days };
}