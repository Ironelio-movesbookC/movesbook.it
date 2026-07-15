import type { ManualDayPlan, ManualDaySector } from '@/components/workouts/modals/PlanGymWeekManualModal';
import type { GoalId, TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';
import { GYM_WEEK_MUSCLE_GROUPS } from '@/constants/gymWeekMuscleGroups';
import { pickRandomCatalogExerciseNamesForMuscleGroup } from '@/data/gymWeekExerciseCatalog';
import { getSeriesDistribution, trainingLevelToCategory } from '@/utils/seriesDistribution';

export const GYM_WEEK_MOVEFRAME_MARKER = '[GYM_WEEK_MOVEFRAME]';

export type GymWeekMovelapPayload = {
  repetitionNumber: number;
  distance: null;
  speed: string | null;
  style: null;
  pace: null;
  time: null;
  reps: number | null;
  weight: string | null;
  tools: null;
  r1: null;
  r2: null;
  muscularSector: string | null;
  exercise: string | null;
  restType: null;
  pause: string | null;
  macroFinal: string | null;
  alarm: null;
  sound: null;
  notes: string | null;
  status: 'PENDING';
  isSkipped: false;
  isDisabled: false;
};

export type GymWeekMoveframePayload = {
  sport: 'BODY_BUILDING';
  type: 'BATTERY';
  description: string;
  notes: string;
  macroFinal: string | null;
  goal?: GoalId;
  movelaps: GymWeekMovelapPayload[];
};

function muscleSectorLabel(sectorId: string): string {
  return GYM_WEEK_MUSCLE_GROUPS.find((g) => g.id === sectorId)?.sector ?? sectorId;
}

function exercisesCountForSector(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined,
): number {
  if ((sec.exercises ?? 0) > 0) return sec.exercises!;
  if (sec.series <= 0) return 0;
  return getSeriesDistribution(sec.series, trainingLevelToCategory(trainingLevel)).length;
}

function pyramidalRowsPerExercise(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined,
): number {
  const ex = exercisesCountForSector(sec, trainingLevel);
  if (ex <= 0 || sec.series <= 0) return 0;
  return Math.ceil(sec.series / ex);
}

function templateRowForAreaRow(
  sec: ManualDaySector,
  areaRowIdx: number,
  trainingLevel: TrainingLevel | null | undefined,
): number {
  const blocks = getSeriesDistribution(sec.series, trainingLevelToCategory(trainingLevel));
  let cursor = 0;
  for (const len of blocks) {
    const end = cursor + len - 1;
    if (areaRowIdx >= cursor && areaRowIdx <= end) {
      return areaRowIdx - cursor;
    }
    cursor += len;
  }
  return Math.min(areaRowIdx, pyramidalRowsPerExercise(sec, trainingLevel) - 1);
}

function repAtTemplateRow(sec: ManualDaySector, templateIdx: number): number {
  const rawStored = sec.seriesRepsRaw?.[templateIdx] ?? '';
  if (rawStored.trim() !== '') {
    const p = parseInt(rawStored.trim(), 10);
    if (!Number.isNaN(p) && p > 0) return Math.max(1, Math.min(99, p));
  }
  const r = sec.seriesReps?.[templateIdx];
  if (typeof r === 'number' && !Number.isNaN(r) && r > 0) return r;
  return sec.reps > 0 ? sec.reps : 0;
}

function pauseForAreaRow(
  sec: ManualDaySector,
  rowIdx: number,
  trainingLevel: TrainingLevel | null | undefined,
): string {
  const explicit = sec.seriesRowPauses?.[rowIdx];
  if (explicit != null && String(explicit).trim() !== '') return String(explicit).trim();

  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0 || rowIdx < 0 || rowIdx >= n) return '';
  const dist = getSeriesDistribution(n, trainingLevelToCategory(trainingLevel));
  const sum = dist.reduce((a, b) => a + b, 0);
  if (sum !== n) return String(sec.pause ?? '').trim();

  let start = 0;
  for (let ex = 0; ex < dist.length; ex++) {
    const len = dist[ex];
    const endRow = start + len - 1;
    if (rowIdx >= start && rowIdx <= endRow) {
      if (rowIdx < endRow) return String(sec.pause ?? '').trim();
      if (ex < dist.length - 1) return String(sec.macroExercise ?? '').trim();
      return String(sec.macroEndOfSector ?? '').trim();
    }
    start += len;
  }
  return String(sec.pause ?? '').trim();
}

function upsertFastPlannerDataInNotes(notes: string, data: unknown): string {
  const stripped = notes.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '').trim();
  const tag = `[FAST_PLANNER_DATA]${JSON.stringify(data)}[/FAST_PLANNER_DATA]`;
  const gymTag = GYM_WEEK_MOVEFRAME_MARKER;
  const withGym = stripped.includes(gymTag) ? stripped : stripped ? `${stripped}\n\n${gymTag}` : gymTag;
  return withGym ? `${withGym}\n\n${tag}` : tag;
}

function buildDistancesDescription(rows: { series: string; speed: string }[]): string {
  return rows
    .map((r) => {
      const series = (r.series || '').trim();
      const speed = (r.speed || '').trim();
      if (!series && !speed) return '';
      return `${series || '0'}\\${speed || '-'}`;
    })
    .filter(Boolean)
    .join('+');
}

function buildMovelapsForSector(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined,
  exerciseNames: string[],
): GymWeekMovelapPayload[] {
  const n = Math.max(0, Math.min(20, sec.series ?? 0));
  if (n <= 0) return [];

  const dist = getSeriesDistribution(n, trainingLevelToCategory(trainingLevel));
  const sectorLabel = muscleSectorLabel(sec.sectorId);
  const out: GymWeekMovelapPayload[] = [];
  let areaRowIdx = 0;

  for (let exIdx = 0; exIdx < dist.length; exIdx++) {
    const blockLen = dist[exIdx];
    const exercise = exerciseNames[exIdx] ?? exerciseNames[0] ?? sec.sectorLabel;

    for (let s = 0; s < blockLen; s++) {
      const templateIdx = templateRowForAreaRow(sec, areaRowIdx, trainingLevel);
      const reps = repAtTemplateRow(sec, templateIdx);
      const weightRaw = sec.seriesWeights?.[templateIdx] ?? sec.seriesWeights?.[0];
      const weight =
        weightRaw != null && String(weightRaw).trim() !== '' && String(weightRaw).trim().toLowerCase() !== 'nc'
          ? String(weightRaw).trim()
          : null;
      const pause = pauseForAreaRow(sec, areaRowIdx, trainingLevel);
      const isLastOverall = areaRowIdx === n - 1;

      out.push({
        repetitionNumber: out.length + 1,
        distance: null,
        speed: null,
        style: null,
        pace: null,
        time: null,
        reps: reps > 0 ? reps : null,
        weight,
        tools: null,
        r1: null,
        r2: null,
        muscularSector: sectorLabel,
        exercise,
        restType: null,
        pause: pause || null,
        macroFinal: isLastOverall ? (sec.macroEndOfSector?.trim() || null) : null,
        alarm: null,
        sound: null,
        notes: sec.pyramidal && sec.pyramidal !== 'flat' ? sec.pyramidal : null,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false,
      });
      areaRowIdx++;
    }
  }

  return out;
}

function buildMoveframeForSector(
  sec: ManualDaySector,
  trainingLevel: TrainingLevel | null | undefined,
  goalId: GoalId | undefined,
  routineDayIndex: number,
): GymWeekMoveframePayload | null {
  if ((sec.series ?? 0) <= 0) return null;

  const exerciseCount = exercisesCountForSector(sec, trainingLevel);
  const exerciseNames = pickRandomCatalogExerciseNamesForMuscleGroup(sec.sectorId, exerciseCount);
  const movelaps = buildMovelapsForSector(sec, trainingLevel, exerciseNames);
  if (!movelaps.length) return null;

  const dist = getSeriesDistribution(sec.series, trainingLevelToCategory(trainingLevel));
  const plannerRows = dist.map((blockLen, exIdx) => {
    const templateIdx = 0;
    const reps = repAtTemplateRow(sec, templateIdx);
    const weightRaw = sec.seriesWeights?.[templateIdx] ?? '';
    return {
      id: exIdx + 1,
      exercise: exerciseNames[exIdx] ?? sec.sectorLabel,
      speed: '-',
      series: String(blockLen),
      ripTime: reps > 0 ? String(reps) : String(sec.reps || ''),
      weight: weightRaw || '',
      break: String(sec.pause ?? '').trim(),
      mode: sec.pyramidal ?? 'flat',
    };
  });

  const description = buildDistancesDescription(
    plannerRows.map((r) => ({ series: r.series, speed: r.speed })),
  );
  const fastPlannerPayload = {
    sectorMode: 'single',
    goal: goalId ?? 'hypertrophy',
    execSpeed: '-',
    execSeries: String(sec.series),
    execRipTime: String(sec.reps ?? ''),
    execWeight: '',
    execBreak: String(sec.pause ?? ''),
    execMode: sec.pyramidal ?? 'flat',
    ripTimeMode: 'reps',
    rows: plannerRows,
    preferences: {},
    endMacro: sec.macroEndOfSector?.trim() || '',
    gymWeekRoutineDayIndex: routineDayIndex,
    gymWeekSectorId: sec.sectorId,
  };

  const notes = upsertFastPlannerDataInNotes('', fastPlannerPayload);

  return {
    sport: 'BODY_BUILDING',
    type: 'BATTERY',
    description: description || `${sec.sectorLabel} — ${movelaps.length} sets`,
    notes,
    macroFinal: sec.macroEndOfSector?.trim() || null,
    goal: goalId,
    movelaps,
  };
}

/** Build one BATTERY moveframe per muscular sector (same model as anaerobic Fast Planner). */
export function buildGymWeekMoveframesForRoutineDay(
  dayPlan: ManualDayPlan,
  routineDayIndex: number,
  goalId: GoalId | undefined,
  trainingLevel: TrainingLevel | null | undefined,
): GymWeekMoveframePayload[] {
  const out: GymWeekMoveframePayload[] = [];
  for (const sec of dayPlan.sectors ?? []) {
    const mf = buildMoveframeForSector(sec, trainingLevel, goalId, routineDayIndex);
    if (mf) out.push(mf);
  }
  return out;
}

export function routineLabel(dayPlan: ManualDayPlan, routineDayIndex: number): string {
  const trimmed = (dayPlan.routineName ?? '').trim();
  if (trimmed) return trimmed;
  return `Routine ${String.fromCharCode(65 + routineDayIndex)}`;
}
