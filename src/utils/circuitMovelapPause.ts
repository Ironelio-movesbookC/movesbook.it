import { parseFastPlannerPauseToSeconds } from '@/utils/moveframeAvePause';

/**
 * Maps Circuit planner form values → Movelap Ave/Pause (vertical execution).
 *
 * - Between Stations → inter-station cells (station.pause or global default)
 * - Between series of stations → first exercise row of serie 2+ (blue row)
 * - Between Circuits → last station slot of last serie (yellow row; "↓ look down here")
 */

export type CircuitStationLike = {
  stationNumber?: number;
  sector?: string;
  exercise?: string;
  pause?: number | string;
};

export type CircuitRowLike = {
  letter?: string;
  pauseAfterCircuit?: number;
  pauseBetweenSeries?: number;
  seriesPauses?: number[];
  stationsBySeries?: CircuitStationLike[][];
};

export type CircuitPauseContext = {
  seriesMode: 'count' | 'time';
  executionMode: 'vertical' | 'horizontal';
  pauseStations: number;
  pauseHorizontalSeries: number;
  pauseSeries: number;
  pauseCircuits: number;
  finalMacroPauseSeconds: number;
};

export function circuitStationProducesMovelap(station: CircuitStationLike | null | undefined): boolean {
  const sectorS = (station?.sector || '').trim();
  const exerciseS = (station?.exercise || '').trim();
  return !!(sectorS || exerciseS);
}

function pauseAfterSeriesGap(
  circuit: CircuitRowLike,
  gapAfterSeriesIdx: number,
  ctx: CircuitPauseContext
): number {
  const raw = circuit.seriesPauses?.[gapAfterSeriesIdx];
  if (typeof raw === 'number') return raw;
  if (ctx.seriesMode === 'time') return circuit.pauseAfterCircuit ?? ctx.pauseCircuits;
  return circuit.pauseBetweenSeries ?? ctx.pauseSeries;
}

function pauseAmongStationsBase(ctx: CircuitPauseContext): number {
  return ctx.executionMode === 'horizontal' ? ctx.pauseHorizontalSeries : ctx.pauseStations;
}

/** Grid `<select>` may persist pause as number or string — normalize before resolve/display. */
export function readOptionalStationPauseSeconds(
  station: CircuitStationLike | null | undefined
): number | null {
  const raw = station?.pause;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Math.max(0, parseInt(trimmed, 10));
    if (trimmed.includes("'")) {
      return parseFastPlannerPauseToSeconds(trimmed);
    }
    const secOnly = trimmed.match(/^(\d+)\s*"?$/);
    if (secOnly) return Math.max(0, parseInt(secOnly[1], 10));
  }
  return null;
}

export function readStationPauseSeconds(
  station: CircuitStationLike | null | undefined,
  fallback: number
): number {
  return readOptionalStationPauseSeconds(station) ?? fallback;
}

/**
 * Maps Circuit planner form values → Movelap Pause / Macro columns (vertical execution).
 *
 * - Inter-station cells → Pause column (station.pause)
 * - Last station of each serie (not last serie) → Pause greyed; Macro = pause among series
 * - Last station of each circuit (not last circuit) → Pause greyed; Macro = pause among circuits
 * - Last station of last serie of last circuit → Pause greyed; Macro = footer Macro / loadOfWork
 */

export type CircuitMovelapPauseMacroSplit = {
  /** Seconds for Pause column; null = greyed (—) because value lives in Macro. */
  pauseColumnSeconds: number | null;
  macroColumnSeconds: number | null;
  macroColumnLabel: string | null;
  isLastStationOfSeriesSlot: boolean;
  isLastStationOfCircuitSlot: boolean;
};

function endOfSerieSlotForStation(
  stationIndex: number,
  seriesStations: CircuitStationLike[]
): boolean {
  const lastSlotIdx = seriesStations.length - 1;
  const isLastStationSlot = stationIndex === lastSlotIdx;
  if (isLastStationSlot) return true;
  const producingIndexes = seriesStations
    .map((st, idx) => (circuitStationProducesMovelap(st) ? idx : -1))
    .filter((idx) => idx >= 0);
  const isLastProducing =
    producingIndexes.length > 0 &&
    stationIndex === producingIndexes[producingIndexes.length - 1];
  const lastSlotEmpty = !circuitStationProducesMovelap(seriesStations[lastSlotIdx]);
  return lastSlotEmpty && isLastProducing;
}

/** Format seconds for Macro column (e.g. 2′, 15″, 2′30″). */
export function formatMacroColumnLabel(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const rounded = Math.max(0, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins > 0 && secs > 0) return `${mins}'${secs.toString().padStart(2, '0')}"`;
  if (mins > 0) return `${mins}'`;
  return `${secs}"`;
}

/** Pause column + Macro column for one vertical movelap row. */
export function resolveCircuitMovelapPauseAndMacro(params: {
  circuit: CircuitRowLike;
  circuitIndex: number;
  totalCircuits: number;
  seriesIdx: number;
  stationIndex: number;
  station: CircuitStationLike;
  seriesStations: CircuitStationLike[];
  ctx: CircuitPauseContext;
}): CircuitMovelapPauseMacroSplit {
  const { circuit, circuitIndex, totalCircuits, seriesIdx, stationIndex, station, seriesStations, ctx } =
    params;

  const isEndOfSerieSlot = endOfSerieSlotForStation(stationIndex, seriesStations);
  const isLastSeriesOfCircuit = seriesIdx === (circuit.stationsBySeries?.length ?? 1) - 1;
  const isLastStationOfCircuit = isLastSeriesOfCircuit && isEndOfSerieSlot;
  const isLastCircuitInWorkout = circuitIndex === totalCircuits - 1;
  const isAbsoluteLastWorkoutStation = isLastStationOfCircuit && isLastCircuitInWorkout;

  if (!isEndOfSerieSlot) {
    const pauseSec = readStationPauseSeconds(station, pauseAmongStationsBase(ctx));
    return {
      pauseColumnSeconds: pauseSec,
      macroColumnSeconds: null,
      macroColumnLabel: null,
      isLastStationOfSeriesSlot: false,
      isLastStationOfCircuitSlot: false,
    };
  }

  if (isLastStationOfCircuit) {
    if (isAbsoluteLastWorkoutStation) {
      const macroSec = ctx.finalMacroPauseSeconds > 0 ? ctx.finalMacroPauseSeconds : 0;
      return {
        pauseColumnSeconds: null,
        macroColumnSeconds: macroSec > 0 ? macroSec : null,
        macroColumnLabel: macroSec > 0 ? formatMacroColumnLabel(macroSec) : null,
        isLastStationOfSeriesSlot: false,
        isLastStationOfCircuitSlot: true,
      };
    }
    const macroSec = circuit.pauseAfterCircuit ?? ctx.pauseCircuits;
    return {
      pauseColumnSeconds: null,
      macroColumnSeconds: macroSec,
      macroColumnLabel: formatMacroColumnLabel(macroSec),
      isLastStationOfSeriesSlot: false,
      isLastStationOfCircuitSlot: true,
    };
  }

  const macroSec = pauseAfterSeriesGap(circuit, seriesIdx, ctx);
  return {
    pauseColumnSeconds: null,
    macroColumnSeconds: macroSec,
    macroColumnLabel: formatMacroColumnLabel(macroSec),
    isLastStationOfSeriesSlot: true,
    isLastStationOfCircuitSlot: false,
  };
}

/** Resolve Ave/Pause seconds for one vertical movelap row from circuit form data. */
export function resolveVerticalMovelapPauseSeconds(params: {
  circuit: CircuitRowLike;
  circuitIndex: number;
  totalCircuits: number;
  seriesIdx: number;
  stationIndex: number;
  station: CircuitStationLike;
  seriesStations: CircuitStationLike[];
  ctx: CircuitPauseContext;
}): number {
  const split = resolveCircuitMovelapPauseAndMacro(params);
  return split.pauseColumnSeconds ?? 0;
}

/** Macro label (1′…10′) for movelap.macroFinal from seconds and/or loadOfWork. */
export function macroFinalLabelFromPauseContext(
  pauseSeconds: number,
  loadOfWork: unknown
): string | null {
  const loadStr = String(loadOfWork ?? '').trim();
  if (/^(?:[1-9]|10)$/.test(loadStr)) return `${loadStr}'`;
  if (/^[0-9]$/.test(loadStr)) {
    const idx = parseInt(loadStr, 10);
    return idx >= 0 && idx <= 9 ? `${idx}'` : null;
  }
  if (pauseSeconds <= 0) return null;
  const mins = Math.round(pauseSeconds / 60);
  if (mins >= 1 && mins <= 10) return `${mins}'`;
  return null;
}

/** Resolve display pause for an existing movelap using saved [CIRCUIT_DATA] circuits grid. */
export function resolveMovelapPauseFromCircuitForm(params: {
  movelap: {
    circuitLetter?: string;
    circuitIndex?: number;
    localSeriesNumber?: number;
    stationNumber?: number;
  };
  circuits: CircuitRowLike[] | null | undefined;
  ctx: CircuitPauseContext;
}): number | null {
  const { movelap, circuits, ctx } = params;
  if (!Array.isArray(circuits) || circuits.length === 0) return null;
  if (ctx.executionMode === 'horizontal') return null;

  const letter =
    typeof movelap.circuitLetter === 'string' ? movelap.circuitLetter.trim().toUpperCase() : '';
  const circuitIndex =
    typeof movelap.circuitIndex === 'number'
      ? movelap.circuitIndex - 1
      : letter
        ? circuits.findIndex((c) => (c.letter || '').trim().toUpperCase() === letter)
        : -1;
  const circuit = circuitIndex >= 0 ? circuits[circuitIndex] : null;
  if (!circuit) return null;

  let localSeries =
    typeof movelap.localSeriesNumber === 'number' ? movelap.localSeriesNumber : 0;
  if (localSeries <= 0) {
    localSeries = 1;
  }
  const seriesIdx = localSeries - 1;
  const seriesStations = circuit.stationsBySeries?.[seriesIdx];
  if (!Array.isArray(seriesStations) || seriesStations.length === 0) return null;

  const stationNum =
    typeof movelap.stationNumber === 'number' ? movelap.stationNumber : 0;
  let stationIndex = seriesStations.findIndex((s) => s.stationNumber === stationNum);
  if (stationIndex < 0 && stationNum > 0) stationIndex = stationNum - 1;
  if (stationIndex < 0 || stationIndex >= seriesStations.length) return null;

  const station = seriesStations[stationIndex];
  if (!circuitStationProducesMovelap(station)) return null;

  return resolveVerticalMovelapPauseSeconds({
    circuit,
    circuitIndex,
    totalCircuits: circuits.length,
    seriesIdx,
    stationIndex,
    station,
    seriesStations,
    ctx,
  });
}

/** Macro column label from saved circuit grid (between series / between circuits). */
export function resolveMovelapMacroFromCircuitForm(params: {
  movelap: {
    circuitLetter?: string;
    circuitIndex?: number;
    localSeriesNumber?: number;
    stationNumber?: number;
  };
  circuits: CircuitRowLike[] | null | undefined;
  ctx: CircuitPauseContext;
}): string | null {
  const { movelap, circuits, ctx } = params;
  if (!Array.isArray(circuits) || circuits.length === 0) return null;
  if (ctx.executionMode === 'horizontal') return null;

  const letter =
    typeof movelap.circuitLetter === 'string' ? movelap.circuitLetter.trim().toUpperCase() : '';
  const circuitIndex =
    typeof movelap.circuitIndex === 'number'
      ? movelap.circuitIndex - 1
      : letter
        ? circuits.findIndex((c) => (c.letter || '').trim().toUpperCase() === letter)
        : -1;
  const circuit = circuitIndex >= 0 ? circuits[circuitIndex] : null;
  if (!circuit) return null;

  let localSeries =
    typeof movelap.localSeriesNumber === 'number' ? movelap.localSeriesNumber : 0;
  if (localSeries <= 0) localSeries = 1;
  const seriesIdx = localSeries - 1;
  const seriesStations = circuit.stationsBySeries?.[seriesIdx];
  if (!Array.isArray(seriesStations) || seriesStations.length === 0) return null;

  const stationNum =
    typeof movelap.stationNumber === 'number' ? movelap.stationNumber : 0;
  let stationIndex = seriesStations.findIndex((s) => s.stationNumber === stationNum);
  if (stationIndex < 0 && stationNum > 0) stationIndex = stationNum - 1;
  if (stationIndex < 0 || stationIndex >= seriesStations.length) return null;

  const station = seriesStations[stationIndex];
  if (!circuitStationProducesMovelap(station)) return null;

  return resolveCircuitMovelapPauseAndMacro({
    circuit,
    circuitIndex,
    totalCircuits: circuits.length,
    seriesIdx,
    stationIndex,
    station,
    seriesStations,
    ctx,
  }).macroColumnLabel;
}

/** Full Pause/Macro split for one movelap from saved circuit grid. */
export function resolveMovelapPauseMacroSplitFromCircuitForm(params: {
  movelap: {
    circuitLetter?: string;
    circuitIndex?: number;
    localSeriesNumber?: number;
    stationNumber?: number;
  };
  circuits: CircuitRowLike[] | null | undefined;
  ctx: CircuitPauseContext;
}): CircuitMovelapPauseMacroSplit | null {
  const { movelap, circuits, ctx } = params;
  if (!Array.isArray(circuits) || circuits.length === 0) return null;
  if (ctx.executionMode === 'horizontal') return null;

  const letter =
    typeof movelap.circuitLetter === 'string' ? movelap.circuitLetter.trim().toUpperCase() : '';
  const circuitIndex =
    typeof movelap.circuitIndex === 'number'
      ? movelap.circuitIndex - 1
      : letter
        ? circuits.findIndex((c) => (c.letter || '').trim().toUpperCase() === letter)
        : -1;
  const circuit = circuitIndex >= 0 ? circuits[circuitIndex] : null;
  if (!circuit) return null;

  let localSeries =
    typeof movelap.localSeriesNumber === 'number' ? movelap.localSeriesNumber : 0;
  if (localSeries <= 0) localSeries = 1;
  const seriesIdx = localSeries - 1;
  const seriesStations = circuit.stationsBySeries?.[seriesIdx];
  if (!Array.isArray(seriesStations) || seriesStations.length === 0) return null;

  const stationNum =
    typeof movelap.stationNumber === 'number' ? movelap.stationNumber : 0;
  let stationIndex = seriesStations.findIndex((s) => s.stationNumber === stationNum);
  if (stationIndex < 0 && stationNum > 0) stationIndex = stationNum - 1;
  if (stationIndex < 0 || stationIndex >= seriesStations.length) return null;

  const station = seriesStations[stationIndex];
  if (!circuitStationProducesMovelap(station)) return null;

  return resolveCircuitMovelapPauseAndMacro({
    circuit,
    circuitIndex,
    totalCircuits: circuits.length,
    seriesIdx,
    stationIndex,
    station,
    seriesStations,
    ctx,
  });
}

/** Direct read of station.pause from saved grid — used when legacy movelaps lack series metadata. */
export function readMovelapStationCellPauseFromGrid(params: {
  movelap: {
    circuitLetter?: string;
    circuitIndex?: number;
    localSeriesNumber?: number;
    stationNumber?: number;
  };
  circuits: CircuitRowLike[] | null | undefined;
}): number | null {
  const { movelap, circuits } = params;
  if (!Array.isArray(circuits) || circuits.length === 0) return null;

  const letter =
    typeof movelap.circuitLetter === 'string' ? movelap.circuitLetter.trim().toUpperCase() : '';
  const circuitIndex =
    typeof movelap.circuitIndex === 'number'
      ? movelap.circuitIndex - 1
      : letter
        ? circuits.findIndex((c) => (c.letter || '').trim().toUpperCase() === letter)
        : -1;
  const circuit = circuitIndex >= 0 ? circuits[circuitIndex] : null;
  if (!circuit) return null;

  let localSeries =
    typeof movelap.localSeriesNumber === 'number' ? movelap.localSeriesNumber : 0;
  if (localSeries <= 0) localSeries = 1;
  const seriesStations = circuit.stationsBySeries?.[localSeries - 1];
  if (!Array.isArray(seriesStations) || seriesStations.length === 0) return null;

  const stationNum =
    typeof movelap.stationNumber === 'number' ? movelap.stationNumber : 0;
  let stationIndex = seriesStations.findIndex((s) => s.stationNumber === stationNum);
  if (stationIndex < 0 && stationNum > 0) stationIndex = stationNum - 1;
  if (stationIndex < 0 || stationIndex >= seriesStations.length) return null;

  return readOptionalStationPauseSeconds(seriesStations[stationIndex]);
}

/** Pause seconds for Add/Edit station modal — matches grid display (circuit form first, then lap field). */
export function resolveCircuitStationPauseSecondsForModal(params: {
  movelap: {
    pause?: unknown;
    circuitLetter?: string;
    localSeriesNumber?: number;
    stationNumber?: number;
    circuitIndex?: number;
    notes?: string;
  };
  circuits: CircuitRowLike[] | null | undefined;
  ctx: CircuitPauseContext | null | undefined;
  defaultPauseSeconds?: number;
}): number {
  const { movelap, circuits, ctx, defaultPauseSeconds = 15 } = params;

  if (circuits && ctx) {
    const split = resolveMovelapPauseMacroSplitFromCircuitForm({ movelap, circuits, ctx });
    if (split) {
      if (split.pauseColumnSeconds != null) return split.pauseColumnSeconds;
      if (split.macroColumnSeconds != null) return split.macroColumnSeconds;
    }
  }

  if (movelap?.pause != null && String(movelap.pause).trim() !== '') {
    return parseFastPlannerPauseToSeconds(movelap.pause);
  }

  return defaultPauseSeconds;
}

export function buildCircuitPauseContextFromConfig(config: any, finalMacroPauseSeconds = 0): CircuitPauseContext {
  const pauseStations =
    typeof config?.pauseStations === 'number'
      ? config.pauseStations
      : typeof config?.pauses?.stations === 'number'
        ? config.pauses.stations
        : 10;
  const pauseHorizontalSeries =
    typeof config?.horizontalSeries === 'number'
      ? config.horizontalSeries
      : typeof config?.pauses?.horizontalSeries === 'number'
        ? config.pauses.horizontalSeries
        : pauseStations;
  const pauseCircuits =
    typeof config?.pauseCircuits === 'number'
      ? config.pauseCircuits * 60
      : typeof config?.pauses?.circuits === 'number'
        ? config.pauses.circuits
        : 120;
  const pauseSeries =
    typeof config?.pauseSeries === 'number'
      ? config.pauseSeries * 60
      : typeof config?.pauses?.series === 'number'
        ? config.pauses.series
        : 120;

  return {
    seriesMode: config?.seriesMode === 'time' ? 'time' : 'count',
    executionMode: config?.executionMode === 'horizontal' ? 'horizontal' : 'vertical',
    pauseStations,
    pauseHorizontalSeries,
    pauseSeries,
    pauseCircuits,
    finalMacroPauseSeconds,
  };
}

export function parseCircuitDataFromNotes(notes: unknown): { circuits?: CircuitRowLike[] } | null {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_DATA\]([\s\S]*?)\[\/CIRCUIT_DATA\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as { circuits?: CircuitRowLike[] };
  } catch {
    return null;
  }
}

/** Count station slots that produce exercises (matches circuit preview "filled station slot(s)"). */
export function countCircuitFilledStationSlots(circuits: CircuitRowLike[] | null | undefined): number {
  if (!Array.isArray(circuits)) return 0;
  let slots = 0;
  for (const c of circuits) {
    for (const row of c.stationsBySeries ?? []) {
      if (!Array.isArray(row)) continue;
      for (const st of row) {
        if (circuitStationProducesMovelap(st)) slots++;
      }
    }
  }
  return slots;
}

/** Circuit mode Rip\\sets: number of filled station slots in the circuit grid. */
export function computeCircuitRipSetsCount(params: {
  notes?: unknown;
  movelaps?: unknown[] | null;
}): number | null {
  const circuitData = parseCircuitDataFromNotes(params.notes);
  const fromGrid = countCircuitFilledStationSlots(circuitData?.circuits);
  if (fromGrid > 0) return fromGrid;
  const laps = Array.isArray(params.movelaps) ? params.movelaps : [];
  if (laps.length > 0) return laps.length;
  return null;
}
