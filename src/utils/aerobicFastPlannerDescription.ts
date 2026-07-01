/** Rows used to build aerobic fast-planner moveframe distance line (description row 1). */
export type AerobicFastPlannerDescriptionRow = {
  distance?: string | number | null;
  style?: string | number | null;
};

function withDistanceUnit(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/[a-zA-Z]/.test(trimmed)) return trimmed;
  return `${trimmed}m`;
}

function readDistanceStyle(r: AerobicFastPlannerDescriptionRow): { distance: string; style: string } {
  const distanceRaw = r.distance;
  const styleRaw = r.style;
  const distance =
    typeof distanceRaw === 'string'
      ? distanceRaw.trim()
      : distanceRaw != null && !Number.isNaN(Number(distanceRaw))
        ? String(distanceRaw).trim()
        : '';
  const style =
    typeof styleRaw === 'string'
      ? styleRaw.trim()
      : styleRaw != null && !Number.isNaN(Number(styleRaw))
        ? String(styleRaw).trim()
        : '';
  return { distance, style };
}

/**
 * Build distance line for moveframe description.
 * Consecutive identical distance+style rows collapse to e.g. `80 Track x 11`.
 */
export function buildAerobicFastPlannerDistanceDescription(
  filled: AerobicFastPlannerDescriptionRow[]
): string {
  type Group = { distance: string; style: string; count: number };
  const groups: Group[] = [];

  for (const r of filled) {
    const { distance, style } = readDistanceStyle(r);
    if (!distance) continue;
    const last = groups[groups.length - 1];
    if (
      last &&
      last.distance === distance &&
      last.style.toLowerCase() === style.toLowerCase()
    ) {
      last.count += 1;
    } else {
      groups.push({ distance, style, count: 1 });
    }
  }

  return groups
    .map(({ distance, style, count }) => {
      if (count > 1 && style.trim()) {
        return `${distance} ${style.trim()} x ${count}`;
      }
      const formattedDistance = withDistanceUnit(distance);
      return style ? `${formattedDistance}\\${style}` : formattedDistance;
    })
    .filter(Boolean)
    .join('+');
}

/** Build condensed distance line from saved movelaps (distance + style columns). */
export function buildAerobicFastPlannerDistanceDescriptionFromMovelaps(movelaps: any[] | null | undefined): string {
  if (!Array.isArray(movelaps) || movelaps.length === 0) return '';
  return buildAerobicFastPlannerDistanceDescription(
    movelaps
      .map((lap) => ({
        distance: String(lap?.distance ?? lap?.reps ?? '').trim(),
        style: String(lap?.style ?? '').trim()
      }))
      .filter((r) => r.distance)
  );
}

export function aerobicRowsMatchForReplicate(
  a: AerobicFastPlannerDescriptionRow,
  b: AerobicFastPlannerDescriptionRow
): boolean {
  const da = readDistanceStyle(a);
  const db = readDistanceStyle(b);
  return da.distance === db.distance && da.style.toLowerCase() === db.style.toLowerCase();
}

/** True when movelaps carry aerobic style labels (Beach, Track, etc.). */
export function movelapsHaveAerobicStyle(movelaps: any[] | null | undefined): boolean {
  if (!Array.isArray(movelaps) || movelaps.length === 0) return false;
  return movelaps.some((lap) => String(lap?.style ?? '').trim().length > 0);
}

/** Aerobic fast plan when payload says so, or rows/movelaps use distance+style. */
export function isAerobicFastPlannerContext(
  payload: { plannerType?: string; rows?: AerobicFastPlannerDescriptionRow[] } | null | undefined,
  movelaps?: any[] | null
): boolean {
  if (payload?.plannerType === 'aerobic') return true;
  if (payload?.plannerType === 'anaerobic') return false;
  if (Array.isArray(payload?.rows) && payload.rows.some((r) => String(r?.style ?? '').trim())) {
    return true;
  }
  return movelapsHaveAerobicStyle(movelaps);
}

/**
 * Build grouped aerobic distance line for table/info display.
 * Prefers fast-planner rows, then movelaps.
 */
export function resolveAerobicMoveframeDistanceDescription(
  payload: { plannerType?: string; rows?: AerobicFastPlannerDescriptionRow[] } | null | undefined,
  movelaps?: any[] | null
): string {
  if (!isAerobicFastPlannerContext(payload, movelaps)) return '';
  if (Array.isArray(payload?.rows) && payload.rows.length > 0) {
    const fromRows = buildAerobicFastPlannerDistanceDescription(payload.rows);
    if (fromRows) return fromRows;
  }
  return buildAerobicFastPlannerDistanceDescriptionFromMovelaps(movelaps);
}
