/**
 * Legacy connection-chart credit display.
 * Up to 3 whole digits (leading zeros allowed, e.g. 03) + 2 fractional digits (truncated, not rounded).
 */
export function formatChartCredits(credits: number): string {
  if (!Number.isFinite(credits)) return '00.00';

  const sign = credits < 0 ? '-' : '';
  const abs = Math.abs(credits);
  const [wholeRaw = '0', fracRaw = ''] = abs.toFixed(10).split('.');
  const whole =
    wholeRaw.length <= 3 ? wholeRaw.padStart(2, '0') : wholeRaw.slice(-3);
  const frac = (fracRaw + '00').slice(0, 2);

  return `${sign}${whole}.${frac}`;
}
