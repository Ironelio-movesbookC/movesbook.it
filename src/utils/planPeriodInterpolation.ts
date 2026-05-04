/**
 * Yearly-plan period interpolation for weekly gym planning:
 * period 1 → "from", last period → "to", intermediate values linear in between.
 */

export const PLAN_YEAR_TOTAL_PERIODS_MIN = 2;
export const PLAN_YEAR_TOTAL_PERIODS_MAX = 9;

/** Parse pause labels like 0", 30", 1', 1'30" to seconds (same rules as Plan gym week manual). */
export function parsePauseLabelToSeconds(p: string): number {
  if (!p || p === '0') return 0;
  const minMatch = p.match(/(\d+)'/);
  const secMatch = p.match(/(\d+)"/);
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
  return mins * 60 + secs;
}

/**
 * Linear scalar for period `currentPeriod1Based` in `1..totalPeriods`.
 * Period 1 → `from`, period `totalPeriods` → `to`.
 */
export function interpolatePeriodLinear(
  from: number,
  to: number,
  currentPeriod1Based: number,
  totalPeriods: number
): number {
  const tp = Math.floor(totalPeriods);
  if (tp < 2) return from;
  const p = Math.min(tp, Math.max(1, Math.floor(currentPeriod1Based)));
  const t = (p - 1) / (tp - 1);
  return from + t * (to - from);
}

export function interpolatePeriodIntRounded(
  from: number,
  to: number,
  currentPeriod1Based: number,
  totalPeriods: number
): number {
  return Math.round(
    interpolatePeriodLinear(from, to, currentPeriod1Based, totalPeriods)
  );
}

/** Pick the pause option whose duration in seconds is closest to `sec`. */
export function snapSecondsToNearestPauseOption(
  sec: number,
  options: readonly string[]
): string {
  if (!options.length) return '0"';
  let best = options[0];
  let bestD = Infinity;
  for (const o of options) {
    const d = Math.abs(parsePauseLabelToSeconds(o) - sec);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

export function interpolatedPauseForPeriod(
  pauseFromLabel: string,
  pauseToLabel: string,
  currentPeriod1Based: number,
  totalPeriods: number,
  pauseOptions: readonly string[]
): string {
  const fromS = parsePauseLabelToSeconds(pauseFromLabel.trim());
  const toS = parsePauseLabelToSeconds(pauseToLabel.trim());
  const raw = interpolatePeriodLinear(fromS, toS, currentPeriod1Based, totalPeriods);
  return snapSecondsToNearestPauseOption(Math.round(raw), pauseOptions);
}
