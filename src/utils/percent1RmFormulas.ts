/**
 * Three alternative %1RM estimates from rep count (Plan gym week — manual sector).
 * A: %1RM = ((37 − reps) / 36) × 100
 * B: %1RM = 100 / (1 + reps/30)
 * C: %1RM = 100 / (1.013 + 0.026712 × reps)
 */

export const PCT_1RM_FORMULA_COUNT = 3;

export function pct1RmFormulaSummary(formulaIndex: number): string {
  const i = ((formulaIndex % PCT_1RM_FORMULA_COUNT) + PCT_1RM_FORMULA_COUNT) % PCT_1RM_FORMULA_COUNT;
  if (i === 0) return 'A: ((37−reps)/36)×100';
  if (i === 1) return 'B: 100÷(1+reps/30)';
  return 'C: 100÷(1.013+0.026712×reps)';
}

export function percentOf1RmFromReps(reps: number, formulaIndex: number): number {
  const idx =
    ((formulaIndex % PCT_1RM_FORMULA_COUNT) + PCT_1RM_FORMULA_COUNT) % PCT_1RM_FORMULA_COUNT;
  const r = Math.max(0, Number(reps) || 0);
  if (r <= 0) return 0;
  let pct: number;
  if (idx === 0) {
    pct = ((37 - r) / 36) * 100;
  } else if (idx === 1) {
    pct = 100 / (1 + r / 30);
  } else {
    pct = 100 / (1.013 + 0.026712 * r);
  }
  return Math.round(Math.max(0, Math.min(100, pct)) * 10) / 10;
}

/** Inverse of percentOf1RmFromReps for the active formula (for % → reps in Type by %1MR mode). */
export function repsFromPercentOf1Rm(pct: number, formulaIndex: number): number {
  const idx =
    ((formulaIndex % PCT_1RM_FORMULA_COUNT) + PCT_1RM_FORMULA_COUNT) % PCT_1RM_FORMULA_COUNT;
  const p = Math.max(0.5, Math.min(99.9, pct));
  let r: number;
  if (idx === 0) {
    r = 37 - (p * 36) / 100;
  } else if (idx === 1) {
    r = 30 * (100 / p - 1);
  } else {
    r = (100 / p - 1.013) / 0.026712;
  }
  return Math.max(1, Math.min(99, Math.round(r)));
}

export function formatPercentLoad1MRFromReps(
  repsValue: string | undefined,
  formulaIndex: number
): string {
  if (repsValue == null || String(repsValue).trim() === '') return '—';
  const r = parseInt(repsValue, 10);
  if (Number.isNaN(r) || r <= 0) return '—';
  const pct = percentOf1RmFromReps(r, formulaIndex);
  return `≈ ${pct}%`;
}
