export const LANE_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export const LANE_DAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export type LaneDayKey = (typeof LANE_DAY_KEYS)[number];

/** [dayIndex 0–6][laneIndex 0–9] */
export type LanesForDaysMatrix = boolean[][];

export function createEmptyLanesForDays(): LanesForDaysMatrix {
  return Array.from({ length: 7 }, () => Array.from({ length: 10 }, () => false));
}

type LaneAvailability = { available: boolean; limit?: string };

/** Clear per-day flags for lanes that are not marked available in the main grid. */
export function syncLanesForDaysWithAvailability(
  matrix: LanesForDaysMatrix,
  lanes: LaneAvailability[]
): LanesForDaysMatrix {
  return matrix.map((day) =>
    day.map((enabled, laneIndex) => (lanes[laneIndex]?.available ? enabled : false))
  );
}

export function parseLanesForDaysRows(rows: Array<Record<string, unknown>>): LanesForDaysMatrix {
  const matrix = createEmptyLanesForDays();

  for (const row of rows) {
    const day = String(row.day ?? '').toLowerCase();
    const dayIndex = LANE_DAY_KEYS.indexOf(day as LaneDayKey);
    if (dayIndex < 0) continue;

    for (let laneIndex = 0; laneIndex < 10; laneIndex += 1) {
      const value = row[`lane_${laneIndex + 1}`];
      matrix[dayIndex][laneIndex] = value === 1 || value === '1' || value === true;
    }
  }

  return matrix;
}
