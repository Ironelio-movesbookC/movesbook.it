import {
  AEROBIC_SPORTS,
  getSportConfig,
  isSportSectionB,
  MACRO_FINAL_OPTIONS,
  REST_TYPES,
} from '@/constants/moveframe.constants';
import { restTypeDisplayToDb } from '@/utils/restTypeDb';

export type QuickEntryInputType = 'A' | 'B' | 'C';
export type QuickEntryContext = 'A' | 'B' | 'C' | 'D' | 'W' | 'FAV';

export const QUICK_ENTRY_SPORT_SHORTCUTS = [
  { sport: 'SWIM', label: 'Swim' },
  { sport: 'BIKE', label: 'Bike' },
  { sport: 'RUN', label: 'Run' },
  { sport: 'BODY_BUILDING', label: 'Body Building' },
  { sport: 'STRETCHING', label: 'Stretching' },
] as const;

export const QUICK_ENTRY_MUSCULAR_ALL = 'All areas';

export const MUSCULAR_SECTORS_WITH_ALL = [
  QUICK_ENTRY_MUSCULAR_ALL,
  'Shoulders',
  'Anterior arms',
  'Rear arms',
  'Forearms',
  'Chest',
  'Abdominals',
  'Intercostals',
  'Trapezius',
  'Lats',
  'Lumbosacral',
  'Front thighs',
  'Hind thighs',
  'Calves',
  'Tibials',
  'Glutes',
];

export interface QuickEntryAdvancedData {
  bpm?: string;
  bpmMax?: string;
  bpmAvg?: string;
  lactateLap?: string;
  lactateMax?: string;
  lactateAvg?: string;
  wattLap?: string;
  wattsMax?: string;
  wattsAvg?: string;
  altitude?: string;
  heightDifference?: string;
  temperature?: string;
  humidity?: string;
  feelingStatus?: string;
  surface?: string;
  clothing?: string;
  shoes?: string;
}

export interface QuickTrainingEntryForm {
  sport: string;
  workoutGoal: string;
  time: string;
  warmup: string;
  /** Aerobic: meters value */
  meters: string;
  customMeters: string;
  repetitions: string;
  seriesBatteries: string;
  /** B/C: muscular area */
  muscularArea: string;
  numberOfExercises: string;
  seriesForExercise: string;
  batteriesForSeries: string;
  speed: string;
  speedTime: string;
  restType: string;
  pause: string;
  macroFinal: string;
  shortDescription: string;
  advanced: QuickEntryAdvancedData;
}

export function getQuickEntryInputType(sport: string): QuickEntryInputType {
  if (AEROBIC_SPORTS.includes(sport as (typeof AEROBIC_SPORTS)[number])) return 'A';
  if (isSportSectionB(sport)) return 'B';
  return 'C';
}

export function isMuscularAllAreas(area: string): boolean {
  return area.trim().toLowerCase() === 'all areas';
}

export function createDefaultQuickTrainingForm(
  sport = 'SWIM'
): QuickTrainingEntryForm {
  const config = getSportConfig(sport);
  const meterList =
    config && 'meters' in config && Array.isArray((config as { meters?: readonly string[] }).meters)
      ? [...(config as { meters: readonly string[] }).meters]
      : ['100'];
  const meters = meterList[0] ?? '100';
  return {
    sport,
    workoutGoal: '',
    time: '',
    warmup: '',
    meters,
    customMeters: '',
    repetitions: '4',
    seriesBatteries: '2',
    muscularArea: QUICK_ENTRY_MUSCULAR_ALL,
    numberOfExercises: '3',
    seriesForExercise: '4',
    batteriesForSeries: '1',
    speed: (getSportConfig(sport).speeds?.[1] as string | undefined) ?? 'A2',
    speedTime: '',
    restType: REST_TYPES.SET_TIME,
    pause: '20"',
    macroFinal: MACRO_FINAL_OPTIONS[0] ?? "0'",
    shortDescription: '',
    advanced: {},
  };
}

export function getAerobicTotalMeters(form: QuickTrainingEntryForm): number {
  const dist = resolveMeters(form);
  const reps = parseInt(form.repetitions, 10) || 0;
  const series = parseInt(form.seriesBatteries, 10) || 1;
  return dist * reps * series;
}

function resolveMeters(form: QuickTrainingEntryForm): number {
  const raw =
    form.meters === 'input' || form.meters === 'custom'
      ? form.customMeters
      : form.meters;
  const n = parseInt(String(raw).replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function buildPauseText(restType: string, pause: string): string {
  if (!pause) return '';
  if (restType === REST_TYPES.SET_TIME) return ` Pause ${pause}`;
  if (restType === REST_TYPES.RESTART_TIME) return ` Restart to ${pause}`;
  if (restType === REST_TYPES.RESTART_PULSE) return ` Restart to ${pause} BPM`;
  return ` Pause ${pause}`;
}

export function buildQuickEntryDescription(form: QuickTrainingEntryForm): string {
  if (form.shortDescription.trim()) return form.shortDescription.trim();

  const inputType = getQuickEntryInputType(form.sport);
  const macro =
    form.macroFinal && form.macroFinal !== "0'"
      ? ` M${form.macroFinal.trim()}`
      : '';
  const pauseText = buildPauseText(form.restType, form.pause);

  if (inputType === 'A') {
    const dist = resolveMeters(form);
    const reps = parseInt(form.repetitions, 10) || 1;
    const series = parseInt(form.seriesBatteries, 10) || 1;
    let base = `${dist}m x ${reps}`;
    if (form.speed) base += ` ${form.speed}`;
    base += pauseText + macro;
    if (series > 1) return `${series} x ( ${base} )`;
    return base;
  }

  const allAreas = isMuscularAllAreas(form.muscularArea);
  const exercises = parseInt(form.numberOfExercises, 10) || 1;
  const series = parseInt(form.seriesForExercise, 10) || 1;
  const batteries = parseInt(form.batteriesForSeries, 10) || 1;
  const sector = allAreas ? 'All areas' : form.muscularArea;
  const label = allAreas ? 'totals' : 'sets';
  return `${sector}: ${exercises} ex x ${series} ${label} x ${batteries} bat${form.speed ? ` ${form.speed}` : ''}${pauseText}${macro}`;
}

function serializeAdvanced(advanced: QuickEntryAdvancedData): string {
  const cleaned = Object.fromEntries(
    Object.entries(advanced).filter(([, v]) => v != null && String(v).trim() !== '')
  );
  if (Object.keys(cleaned).length === 0) return '';
  return `\n[QUICK_ENTRY_ADVANCED]${JSON.stringify(cleaned)}[/QUICK_ENTRY_ADVANCED]`;
}

function buildMovelaps(form: QuickTrainingEntryForm): Array<Record<string, unknown>> {
  const inputType = getQuickEntryInputType(form.sport);
  const restTypeDb = restTypeDisplayToDb(form.restType);
  const description = buildQuickEntryDescription(form);
  const advancedNotes = serializeAdvanced(form.advanced);

  if (inputType === 'A') {
    const dist = resolveMeters(form);
    const baseReps = parseInt(form.repetitions, 10) || 1;
    const series = parseInt(form.seriesBatteries, 10) || 1;
    const totalLaps = baseReps * series;
    const movelaps: Array<Record<string, unknown>> = [];
    for (let i = 0; i < totalLaps; i++) {
      movelaps.push({
        repetitionNumber: i + 1,
        distance: dist || null,
        speed: form.speed || null,
        style: null,
        pace: form.speedTime || null,
        time: form.time || null,
        reps: null,
        weight: null,
        tools: null,
        r1: null,
        r2: null,
        muscularSector: null,
        exercise: null,
        restType: restTypeDb,
        pause: form.pause || null,
        macroFinal: form.macroFinal || null,
        alarm: null,
        sound: null,
        notes: i === 0 ? advancedNotes || null : null,
        status: 'PENDING',
        isSkipped: false,
        isDisabled: false,
      });
    }
    return movelaps;
  }

  const allAreas = isMuscularAllAreas(form.muscularArea);
  const exercises = parseInt(form.numberOfExercises, 10) || 1;
  const series = parseInt(form.seriesForExercise, 10) || 1;
  const batteries = parseInt(form.batteriesForSeries, 10) || 1;
  const totalLaps = exercises * series * batteries;
  const movelaps: Array<Record<string, unknown>> = [];
  for (let i = 0; i < totalLaps; i++) {
    movelaps.push({
      repetitionNumber: i + 1,
      distance: null,
      speed: form.speed || null,
      style: null,
      pace: null,
      time: form.time || null,
      reps: 1,
      weight: null,
      tools: null,
      r1: null,
      r2: null,
      muscularSector: allAreas ? null : form.muscularArea,
      exercise: description,
      restType: restTypeDb,
      pause: form.pause || null,
      macroFinal: form.macroFinal || null,
      alarm: null,
      sound: null,
      notes: i === 0 ? advancedNotes || null : null,
      status: 'PENDING',
      isSkipped: false,
      isDisabled: false,
    });
  }
  return movelaps;
}

/** Build API payload for POST /api/workouts/moveframes */
export function buildQuickEntryMoveframePayload(
  form: QuickTrainingEntryForm,
  workoutSessionId: string,
  sectionId: string
) {
  const inputType = getQuickEntryInputType(form.sport);
  const description = buildQuickEntryDescription(form);
  const movelaps = buildMovelaps(form);
  const aerobicSeries =
    inputType === 'A' ? parseInt(form.seriesBatteries, 10) || 1 : undefined;

  return {
    workoutSessionId,
    sport: form.sport,
    sectionId,
    type: 'STANDARD',
    description,
    notes: form.shortDescription.trim() || null,
    macroFinal: form.macroFinal || null,
    manualMode: false,
    repetitions:
      inputType === 'A'
        ? parseInt(form.repetitions, 10) || 1
        : parseInt(form.seriesForExercise, 10) || 1,
    aerobicSeries,
    movelaps,
  };
}

/** Snapshot moveframe for favourite workout JSON */
export function buildQuickEntryFavoriteMoveframe(form: QuickTrainingEntryForm) {
  const movelaps = buildMovelaps(form);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return {
    letter: letters[0],
    sport: form.sport,
    type: 'STANDARD',
    description: buildQuickEntryDescription(form),
    notes: form.shortDescription.trim() || null,
    movelaps: movelaps.map((ml) => ({
      repetitionNumber: ml.repetitionNumber,
      distance: ml.distance,
      speed: ml.speed,
      style: ml.style,
      pace: ml.pace,
      time: ml.time,
      reps: ml.reps,
      restType: ml.restType,
      pause: ml.pause,
      macroFinal: ml.macroFinal,
      notes: ml.notes,
      muscularSector: ml.muscularSector,
      exercise: ml.exercise,
    })),
  };
}

export function countOptions(max: number, start = 1): string[] {
  return Array.from({ length: max - start + 1 }, (_, i) => String(i + start));
}

export function quickEntryFormToPlannedWorkout(form: QuickTrainingEntryForm) {
  const inputType = getQuickEntryInputType(form.sport);
  const dist = inputType === 'A' ? `${resolveMeters(form)}m` : '';
  return {
    id: `pw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    sportKey: form.sport,
    distance: dist,
    time: form.time,
    goalCode: form.workoutGoal || '',
    description: `[QUICK_ENTRY]${JSON.stringify(form)}[/QUICK_ENTRY]\n${buildQuickEntryDescription(form)}`,
  };
}

export function getPauseOptionsForSport(sport: string, restType: string): string[] {
  const config = getSportConfig(sport);
  if (config && 'pauses' in config) {
    const pausesMap = (config as { pauses?: Record<string, readonly string[] | string> }).pauses;
    const pauses = pausesMap?.[restType];
    if (Array.isArray(pauses)) return [...pauses];
  }
  return ['0', '10"', '20"', '30"', "1'", "2'"];
}
