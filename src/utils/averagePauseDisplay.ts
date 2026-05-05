/**
 * Parse grid pause labels (e.g. "20\"", "1'30\"", "2'") to seconds for preview averaging.
 */
export function parsePauseDisplayToSeconds(s: string): number {
  if (!s || typeof s !== 'string') return 0;
  const trimmed = s
    .trim()
    .replace(/\u2018|\u2019|\u201A|\u2032/g, "'")
    .replace(/\u201C|\u201D|\u2033/g, '"');
  if (!trimmed) return 0;

  let seconds = 0;
  const minMatch = trimmed.match(/(\d+)\s*'/);
  if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
  const secQuoteMatch = trimmed.match(/(\d+)\s*"/);
  if (secQuoteMatch) seconds += parseInt(secQuoteMatch[1], 10);
  else if (!minMatch && /^\d+$/.test(trimmed)) seconds += parseInt(trimmed, 10);

  return seconds;
}

/** Format averaged seconds for descriptions (matches common grid display). */
export function formatPauseSecondsForAverage(totalSeconds: number): string {
  if (totalSeconds <= 0) return `0"`;
  const rounded = Math.round(totalSeconds);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  if (m === 0) return `${s}"`;
  if (s === 0) return `${m}'`;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** Arithmetic mean of per-row pause displays (individual planning grid). */
export function averageIndividualPlanPauseDisplay(plans: { pause?: string }[]): string | null {
  if (!plans.length) return null;
  const secs = plans.map((p) => parsePauseDisplayToSeconds(p.pause || ''));
  const avg = secs.reduce((a, b) => a + b, 0) / secs.length;
  return formatPauseSecondsForAverage(avg);
}
