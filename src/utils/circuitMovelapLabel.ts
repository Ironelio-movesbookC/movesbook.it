/** Circuit movelap label: Circuit-Station-Serie (e.g. B-2-3 = circuit B, station 2, serie 3). */

export type CircuitMovelapLike = {
  circuitLetter?: string | null;
  stationNumber?: number | null;
  localSeriesNumber?: number | null;
  seriesNumber?: number | null;
  circuitIndex?: number | null;
  repetitionNumber?: number | null;
};

export function formatCircuitMovelapLabel(movelap: CircuitMovelapLike): string | null {
  if (!movelap?.circuitLetter) return null;
  const station = movelap.stationNumber ?? '?';
  const serie = movelap.localSeriesNumber ?? movelap.seriesNumber ?? '?';
  return `${movelap.circuitLetter}-${station}-${serie}`;
}

/** Selection key in planner grids — same Circuit-Station-Serie order as display labels. */
export function circuitStationSelectionKey(
  circuitLetter: string,
  stationNumber: number,
  seriesNumber: number
): string {
  return `${circuitLetter}-${stationNumber}-${seriesNumber}`;
}

export function compareCircuitMovelapsByStationThenSerie(
  a: CircuitMovelapLike,
  b: CircuitMovelapLike
): number {
  if (!a.circuitLetter && !b.circuitLetter) {
    return (a.repetitionNumber ?? 0) - (b.repetitionNumber ?? 0);
  }
  if (!a.circuitLetter) return -1;
  if (!b.circuitLetter) return 1;

  const letterCmp = String(a.circuitLetter).localeCompare(String(b.circuitLetter));
  if (letterCmp !== 0) return letterCmp;

  const circuitIdx = (a.circuitIndex ?? 0) - (b.circuitIndex ?? 0);
  if (circuitIdx !== 0) return circuitIdx;

  const station = (a.stationNumber ?? 0) - (b.stationNumber ?? 0);
  if (station !== 0) return station;

  const serieA = a.localSeriesNumber ?? a.seriesNumber ?? 0;
  const serieB = b.localSeriesNumber ?? b.seriesNumber ?? 0;
  const serie = serieA - serieB;
  if (serie !== 0) return serie;

  return (a.repetitionNumber ?? 0) - (b.repetitionNumber ?? 0);
}

export function sortMovelapsForDisplay<T extends CircuitMovelapLike>(
  movelaps: T[],
  isCircuitBased?: boolean
): T[] {
  if (!isCircuitBased && !movelaps.some((m) => m.circuitLetter)) {
    return [...movelaps].sort(
      (a, b) => (a.repetitionNumber ?? 0) - (b.repetitionNumber ?? 0)
    );
  }
  return [...movelaps].sort(compareCircuitMovelapsByStationThenSerie);
}

function circuitLetterKey(movelap: CircuitMovelapLike): string {
  return typeof movelap.circuitLetter === 'string'
    ? movelap.circuitLetter.trim().toUpperCase()
    : '';
}

function localSerieOf(movelap: CircuitMovelapLike): number {
  return movelap.localSeriesNumber ?? movelap.seriesNumber ?? 0;
}

/**
 * Red separator after a row when the next lap starts a new station group (station-first list)
 * or a new serie (vertical list: station resets while serie increments).
 */
export function shouldShowCircuitGroupSeparatorAfter(
  current: CircuitMovelapLike | null | undefined,
  next: CircuitMovelapLike | null | undefined
): boolean {
  if (!current?.circuitLetter || !next?.circuitLetter) return false;

  const letterA = circuitLetterKey(current);
  const letterB = circuitLetterKey(next);
  if (!letterA || letterA !== letterB) return false;

  const currSta = current.stationNumber ?? 0;
  const nextSta = next.stationNumber ?? 0;
  const currSer = localSerieOf(current);
  const nextSer = localSerieOf(next);

  if (nextSta > currSta) return true;
  if (nextSer > currSer && nextSta < currSta) return true;
  return false;
}
