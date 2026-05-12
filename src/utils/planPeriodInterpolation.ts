/** Yearly macro-period bounds for Plan Gym Week UI. */
export const PLAN_YEAR_TOTAL_PERIODS_MIN = 1;
export const PLAN_YEAR_TOTAL_PERIODS_MAX = 52;

function pauseToSeconds(label: string): number {
  const s = String(label ?? '').trim();
  if (!s || s === '0' || s === '—') return 0;
  const minMatch = s.match(/(\d+)['']/);
  const secMatch = s.match(/(\d+)"/);
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  const secs = secMatch ? parseInt(secMatch[1], 10) : 0;
  if (minMatch || secMatch) return mins * 60 + secs;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function secondsToPauseLabel(sec: number): string {
  if (sec <= 0) return '0';
  if (sec < 60) return `${Math.round(sec)}"`;
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  if (r === 0) return `${m}'`;
  return `${m}'${String(r).padStart(2, '0')}"`;
}

/** Linear blend between two pause labels by period index. */
export function interpolatedPauseForPeriod(
  pauseA: string,
  pauseB: string,
  currentPeriod: number,
  totalPeriods: number,
  _pauseOptions: string[]
): string {
  const tp = Math.max(1, Math.floor(totalPeriods));
  const cp = Math.min(tp, Math.max(1, Math.floor(currentPeriod)));
  const a = pauseToSeconds(pauseA);
  const b = pauseToSeconds(pauseB);
  if (tp <= 1) return secondsToPauseLabel(Math.round(a));
  const t = (cp - 1) / (tp - 1);
  return secondsToPauseLabel(Math.round(a + (b - a) * t));
}

export function interpolatePeriodIntRounded(
  from: number,
  to: number,
  currentPeriod: number,
  totalPeriods: number
): number {
  const tp = Math.max(1, Math.floor(totalPeriods));
  const cp = Math.min(tp, Math.max(1, Math.floor(currentPeriod)));
  if (tp <= 1) return Math.round(from);
  const t = (cp - 1) / (tp - 1);
  return Math.round(from + (to - from) * t);
}
