/**
 * Circuit planner PREVIEW / effective totals — structure from grid geometry;
 * pause averages from effective slots in the grid (not Pause Settings dropdowns alone).
 */

export type CircuitPreviewStation = {
  stationNumber?: number;
  pause?: number;
};

export type CircuitPreviewCircuit = {
  letter?: string;
  pauseAfterCircuit?: number;
  pauseBetweenSeries?: number;
  seriesPauses?: number[];
  stationsBySeries?: CircuitPreviewStation[][];
};

export type CircuitPreviewStatsInput = {
  circuits: CircuitPreviewCircuit[];
  seriesMode: 'count' | 'time';
  executionMode: 'vertical' | 'horizontal';
  /** Committed inter-station default (vertical: Between Stations; horizontal: Horizontal Series). */
  pauseAmongStationsDefault: number;
  pauseCircuitsDefault: number;
  pauseSeriesDefault: number;
  macroSec: number;
  seriesTime?: number;
  /** Used only when the grid is empty (before Proceed). */
  planned?: {
    numCircuits: number;
    stationsPerCircuit: number;
    seriesCount: number;
  };
};

export function formatCircuitPreviewPauseSeconds(valueSeconds: number): string {
  const rounded = Math.max(0, Math.round(valueSeconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins > 0) {
    return secs > 0 ? `${mins}'${secs.toString().padStart(2, '0')}"` : `${mins}'`;
  }
  return `${secs}"`;
}

function seriesPauseGapCount(nSeries: number, mode: 'count' | 'time'): number {
  if (nSeries <= 0) return 0;
  return mode === 'time' ? nSeries : Math.max(0, nSeries - 1);
}

/** Inter-station pause slots (excludes end-of-serie / series / circuit bar rows). */
function accumulateStationPauseSlots(
  circuits: CircuitPreviewCircuit[],
  seriesMode: 'count' | 'time',
  executionMode: 'vertical' | 'horizontal',
  pauseAmongDefault: number
): { sum: number; count: number } {
  let sum = 0;
  let count = 0;

  for (const circuit of circuits) {
    const rows = circuit.stationsBySeries ?? [];
    rows.forEach((seriesStations, seriesIdx) => {
      const lastIdx = seriesStations.length - 1;
      seriesStations.forEach((station, stationIdx) => {
        const isLastStation = stationIdx === lastIdx;
        const isLastSeriesRow = seriesIdx === rows.length - 1;

        if (seriesMode === 'time') {
          if (isLastStation) return;
        } else if (executionMode === 'horizontal') {
          if (!isLastSeriesRow || isLastStation) return;
        } else if (isLastStation) {
          return;
        }

        count += 1;
        sum += typeof station.pause === 'number' ? station.pause : pauseAmongDefault;
      });
    });
  }

  return { sum, count };
}

function accumulateSeriesPauseSlots(
  circuits: CircuitPreviewCircuit[],
  seriesMode: 'count' | 'time',
  pauseSeriesDefault: number,
  pauseCircuitsDefault: number
): { sum: number; count: number } {
  let sum = 0;
  let count = 0;

  for (const circuit of circuits) {
    const n = circuit.stationsBySeries?.length ?? 0;
    const gaps = seriesPauseGapCount(n, seriesMode);
    const perSeriesPauses = circuit.seriesPauses ?? [];
    for (let i = 0; i < gaps; i++) {
      count += 1;
      const raw = perSeriesPauses[i];
      if (typeof raw === 'number') {
        sum += raw;
      } else if (seriesMode === 'time') {
        sum += circuit.pauseAfterCircuit ?? pauseCircuitsDefault;
      } else {
        sum += circuit.pauseBetweenSeries ?? pauseSeriesDefault;
      }
    }
  }

  return { sum, count };
}

function accumulateCircuitPauseSlots(
  circuits: CircuitPreviewCircuit[],
  pauseCircuitsDefault: number,
  macroSec: number
): { sum: number; count: number } {
  const n = circuits.length;
  if (n === 0) return { sum: 0, count: 0 };
  let sum = macroSec;
  for (const circuit of circuits) {
    sum += circuit.pauseAfterCircuit ?? pauseCircuitsDefault;
  }
  return { sum, count: n };
}

/** Planned slot counts when grid is empty — from Circuit Configuration only. */
function plannedSlotCounts(
  planned: NonNullable<CircuitPreviewStatsInput['planned']>,
  seriesMode: 'count' | 'time',
  executionMode: 'vertical' | 'horizontal'
): { stationSlots: number; seriesGaps: number; circuitEnds: number; totalStations: number } {
  const { numCircuits, stationsPerCircuit, seriesCount } = planned;
  const totalStations = numCircuits * stationsPerCircuit * seriesCount;
  let stationSlots = 0;
  if (seriesMode === 'time') {
    stationSlots =
      numCircuits * seriesCount * Math.max(0, stationsPerCircuit - 1);
  } else if (executionMode === 'horizontal') {
    stationSlots = numCircuits * Math.max(0, stationsPerCircuit - 1);
  } else {
    stationSlots =
      numCircuits * seriesCount * Math.max(0, stationsPerCircuit - 1);
  }
  const seriesGaps = numCircuits * seriesPauseGapCount(seriesCount, seriesMode);
  return {
    stationSlots,
    seriesGaps,
    circuitEnds: numCircuits,
    totalStations,
  };
}

export function computeCircuitPreviewStats(input: CircuitPreviewStatsInput): {
  line: string;
  structureLine: string;
  totalStationSlots: number;
  circuitCount: number;
  avgStationsPerSerie: number;
  avgSeriesPerCircuit: number;
} {
  const {
    circuits,
    seriesMode,
    executionMode,
    pauseAmongStationsDefault,
    pauseCircuitsDefault,
    pauseSeriesDefault,
    macroSec,
    seriesTime,
    planned,
  } = input;

  const gridCircuits = circuits.length;
  const usePlanned = gridCircuits === 0 && planned;

  let circuitCount = gridCircuits;
  let totalSeriesRows = 0;
  let totalStationSlots = 0;

  if (gridCircuits > 0) {
    for (const c of circuits) {
      const rows = c.stationsBySeries ?? [];
      totalSeriesRows += rows.length;
      for (const row of rows) {
        totalStationSlots += row?.length ?? 0;
      }
    }
  } else if (planned) {
    circuitCount = Math.max(1, planned.numCircuits);
    totalSeriesRows = circuitCount * Math.max(1, planned.seriesCount);
    totalStationSlots = plannedSlotCounts(planned, seriesMode, executionMode).totalStations;
  }

  const avgStationsPerSerie =
    totalSeriesRows > 0
      ? Math.max(1, Math.round(totalStationSlots / totalSeriesRows))
      : Math.max(1, planned?.stationsPerCircuit ?? 1);

  const avgSeriesPerCircuit =
    circuitCount > 0
      ? Math.max(1, Math.round(totalSeriesRows / circuitCount))
      : Math.max(1, planned?.seriesCount ?? 1);

  const timeSuffix =
    seriesMode === 'time' && seriesTime ? ` (${seriesTime}' continuous)` : '';

  const structureLine = usePlanned
    ? `${totalStationSlots} total station slots (${circuitCount} circuits, ${avgStationsPerSerie} stations/serie, ${avgSeriesPerCircuit} series/circuit)${timeSuffix}`
    : `${circuitCount} circuits of ${avgStationsPerSerie} stations x ${avgSeriesPerCircuit} series${timeSuffix}`;

  let stationSum = 0;
  let stationCount = 0;
  let seriesSum = 0;
  let seriesCount = 0;
  let circSum = 0;
  let circCount = 0;

  if (gridCircuits > 0) {
    const st = accumulateStationPauseSlots(
      circuits,
      seriesMode,
      executionMode,
      pauseAmongStationsDefault
    );
    stationSum = st.sum;
    stationCount = st.count;
    const se = accumulateSeriesPauseSlots(
      circuits,
      seriesMode,
      pauseSeriesDefault,
      pauseCircuitsDefault
    );
    seriesSum = se.sum;
    seriesCount = se.count;
    const ci = accumulateCircuitPauseSlots(circuits, pauseCircuitsDefault, macroSec);
    circSum = ci.sum;
    circCount = ci.count;
  } else if (planned) {
    const slots = plannedSlotCounts(planned, seriesMode, executionMode);
    stationCount = slots.stationSlots;
    stationSum = stationCount * pauseAmongStationsDefault;
    seriesCount = slots.seriesGaps;
    seriesSum =
      seriesCount > 0
        ? seriesCount *
          (seriesMode === 'time' ? pauseCircuitsDefault : pauseSeriesDefault)
        : 0;
    circCount = slots.circuitEnds;
    circSum =
      slots.circuitEnds * pauseCircuitsDefault + macroSec;
  }

  const avgStationSec =
    stationCount > 0 ? stationSum / stationCount : pauseAmongStationsDefault;
  const avgSeriesSec =
    seriesCount > 0
      ? seriesSum / seriesCount
      : 0;
  const avgCircSec =
    circCount > 0 ? circSum / circCount : pauseCircuitsDefault;

  const mMinutes =
    macroSec > 0 ? String(Math.max(1, Math.round(macroSec / 60))) : '0';

  const line =
    `Circuit: ${structureLine} ` +
    `Pause circ. ${formatCircuitPreviewPauseSeconds(avgCircSec)} - ` +
    `stations ${formatCircuitPreviewPauseSeconds(avgStationSec)} - ` +
    `series ${formatCircuitPreviewPauseSeconds(avgSeriesSec)} M${mMinutes}'`;

  return {
    line,
    structureLine,
    totalStationSlots,
    circuitCount,
    avgStationsPerSerie,
    avgSeriesPerCircuit,
  };
}
