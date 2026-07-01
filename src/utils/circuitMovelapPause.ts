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
  pause?: number;
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
  const {
    circuit,
    circuitIndex,
    totalCircuits,
    seriesIdx,
    stationIndex,
    station,
    seriesStations,
    ctx,
  } = params;

  const producingStationIndexes = seriesStations
    .map((st, idx) => (circuitStationProducesMovelap(st) ? idx : -1))
    .filter((idx) => idx >= 0);

  const isLastProducingStationInSeries =
    producingStationIndexes.length > 0 &&
    stationIndex === producingStationIndexes[producingStationIndexes.length - 1];
  const isFirstProducingStationInSeries =
    producingStationIndexes.length > 0 && stationIndex === producingStationIndexes[0];

  const isLastSeriesOfCircuit = seriesIdx === (circuit.stationsBySeries?.length ?? 1) - 1;
  const isLastCircuit = circuitIndex === totalCircuits - 1;
  const lastSlotIdx = seriesStations.length - 1;
  const isLastStationSlot = stationIndex === lastSlotIdx;
  const lastSlotProduces = circuitStationProducesMovelap(seriesStations[lastSlotIdx]);

  /** Last grid column uses yellow Between Circuits (or macro on final workout). */
  const isBetweenCircuitsRow =
    isLastSeriesOfCircuit &&
    (isLastStationSlot || (!lastSlotProduces && isLastProducingStationInSeries));

  if (isBetweenCircuitsRow) {
    return isLastCircuit
      ? ctx.finalMacroPauseSeconds
      : (circuit.pauseAfterCircuit ?? ctx.pauseCircuits);
  }

  /** Blue "Between series of stations" → first exercise of serie 2+. */
  if (seriesIdx > 0 && isFirstProducingStationInSeries) {
    return pauseAfterSeriesGap(circuit, seriesIdx - 1, ctx);
  }

  return typeof station.pause === 'number' ? station.pause : pauseAmongStationsBase(ctx);
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

  const localSeries =
    typeof movelap.localSeriesNumber === 'number' ? movelap.localSeriesNumber : 0;
  const seriesIdx = localSeries > 0 ? localSeries - 1 : -1;
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
    const fromForm = resolveMovelapPauseFromCircuitForm({ movelap, circuits, ctx });
    if (fromForm != null && Number.isFinite(fromForm)) return fromForm;
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
