/** Circuit movelap label: Circuit-Station-Serie (e.g. B-2-3 = circuit B, station 2, serie 3). */

export function extractCircuitMetaFromNotes(notes: unknown): Record<string, unknown> | null {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[CIRCUIT_META\](.*?)\[\/CIRCUIT_META\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function upsertCircuitMetaInNotes(notes: unknown, circuitMeta: Record<string, unknown>): string {
  const base = typeof notes === 'string' ? notes : '';
  const cleaned = base.replace(/\[CIRCUIT_META\].*?\[\/CIRCUIT_META\]/g, '').trim();
  const metaString = `[CIRCUIT_META]${JSON.stringify(circuitMeta)}[/CIRCUIT_META]`;
  return cleaned ? `${cleaned}\n${metaString}` : metaString;
}

export type CircuitRenumberConfig = {
  seriesPerCircuitByLetter?: Record<string, number>;
  defaultSeriesPerCircuit?: number;
  circuitIndexByLetter?: Record<string, number>;
};

type CircuitRenumberMovelapLike = {
  id: string;
  notes?: string;
  circuitLetter?: string | null;
};

function inferSeriesPerStationFromMetas(laps: CircuitRenumberMovelapLike[]): number {
  let maxLocal = 0;
  for (const lap of laps) {
    const meta = extractCircuitMetaFromNotes(lap.notes);
    const local = meta?.localSeriesNumber ?? meta?.seriesNumber;
    if (typeof local === 'number' && local > maxLocal) maxLocal = local;
  }
  return maxLocal > 0 ? maxLocal : 1;
}

/** Reassign Circuit-Station-Serie metadata from scratch following the given row order. */
export function buildCircuitRenumberUpdatesFromOrder<T extends CircuitRenumberMovelapLike>(
  orderedMovelaps: T[],
  config?: CircuitRenumberConfig
): Array<{ id: string; meta: Record<string, unknown>; notes: string }> {
  const circuitOrder: string[] = [];
  const byCircuit = new Map<string, T[]>();

  for (const ml of orderedMovelaps) {
    const meta = extractCircuitMetaFromNotes(ml.notes);
    const letter = String(meta?.circuitLetter ?? ml.circuitLetter ?? '')
      .trim()
      .toUpperCase();
    if (!letter) continue;
    if (!byCircuit.has(letter)) {
      byCircuit.set(letter, []);
      circuitOrder.push(letter);
    }
    byCircuit.get(letter)!.push(ml);
  }

  let workoutSeriesBase = 1;
  const updates: Array<{ id: string; meta: Record<string, unknown>; notes: string }> = [];

  for (const letter of circuitOrder) {
    const laps = byCircuit.get(letter)!;
    const firstMeta = extractCircuitMetaFromNotes(laps[0]?.notes) || {};
    const nSer =
      config?.seriesPerCircuitByLetter?.[letter] ??
      config?.defaultSeriesPerCircuit ??
      inferSeriesPerStationFromMetas(laps);
    const circuitIndex =
      config?.circuitIndexByLetter?.[letter] ??
      (typeof firstMeta.circuitIndex === 'number'
        ? firstMeta.circuitIndex
        : circuitOrder.indexOf(letter) + 1);

    laps.forEach((lap, i) => {
      const prevMeta = extractCircuitMetaFromNotes(lap.notes) || {};
      const stationNumber = Math.floor(i / nSer) + 1;
      const localSeriesNumber = (i % nSer) + 1;
      const seriesNumber = workoutSeriesBase + (localSeriesNumber - 1);
      const nextMeta: Record<string, unknown> = {
        ...prevMeta,
        circuitLetter: letter,
        circuitIndex,
        stationNumber,
        localSeriesNumber,
        seriesNumber,
      };
      updates.push({
        id: lap.id,
        meta: nextMeta,
        notes: upsertCircuitMetaInNotes(lap.notes ?? '', nextMeta),
      });
    });
    workoutSeriesBase += nSer;
  }

  return updates;
}

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
