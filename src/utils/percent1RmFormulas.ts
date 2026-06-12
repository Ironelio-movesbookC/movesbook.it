/**
 * % of 1RM from reps — Plan Gym Week manual (% mode).
 * Three formulas (A → B → C) cycled via "Recalc %1RM with different formula".
 */

export const PCT_1RM_FORMULA_COUNT = 3;

export const PCT_1RM_FORMULA_LABELS = [
  'A: ((37 − Reps) ÷ 36) × 100',
  'B: 100 ÷ (1 + Reps ÷ 30)',
  'C: 100 ÷ (1.013 + 0.026712 × Reps)',
] as const;

/** Linear %1RM estimate (100 − reps×2.5) — legacy display reference only. */
export const MAX_REPS_FOR_VALID_LOAD_PCT = 40;

export function getPct1RmFormulaLabel(formulaIndex: number): string {
  const idx = normalizeFormulaIndex(formulaIndex);
  return PCT_1RM_FORMULA_LABELS[idx];
}

export function nextPct1RmFormulaIndex(current: number): number {
  return (normalizeFormulaIndex(current) + 1) % PCT_1RM_FORMULA_COUNT;
}

function normalizeFormulaIndex(formulaIndex: number): number {
  const n = Math.floor(Number(formulaIndex));
  if (!Number.isFinite(n)) return 0;
  return ((n % PCT_1RM_FORMULA_COUNT) + PCT_1RM_FORMULA_COUNT) % PCT_1RM_FORMULA_COUNT;
}

function clampReps(reps: number): number {
  return Math.max(1, Math.min(99, Math.round(reps)));
}

function clampPct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, parseFloat(pct.toFixed(1))));
}

/** Formula A — %1RM = ((37 − Reps) ÷ 36) × 100 */
function pctFormulaAFromReps(reps: number): number {
  const r = clampReps(reps);
  return clampPct(((37 - r) / 36) * 100);
}

function repsFormulaAFromPct(pct: number): number {
  const p = Math.max(0.1, Math.min(100, pct));
  return clampReps(37 - (p / 100) * 36);
}

/** Formula B — %1RM = 100 ÷ (1 + Reps ÷ 30) */
function pctFormulaBFromReps(reps: number): number {
  const r = clampReps(reps);
  return clampPct(100 / (1 + r / 30));
}

function repsFormulaBFromPct(pct: number): number {
  const p = Math.max(0.1, Math.min(100, pct));
  return clampReps(30 * (100 / p - 1));
}

/** Formula C — %1RM = 100 ÷ (1.013 + 0.026712 × Reps) */
function pctFormulaCFromReps(reps: number): number {
  const r = clampReps(reps);
  return clampPct(100 / (1.013 + 0.026712 * r));
}

function repsFormulaCFromPct(pct: number): number {
  const p = Math.max(0.1, Math.min(100, pct));
  return clampReps((100 / p - 1.013) / 0.026712);
}

export function isLoadPctValidForReps(reps: number, formulaIndex = 0): boolean {
  const r = Math.round(Number(reps));
  if (!Number.isFinite(r) || r < 1) return false;
  const idx = normalizeFormulaIndex(formulaIndex);
  if (idx === 0) return r <= MAX_REPS_FOR_VALID_LOAD_PCT;
  const pct = percentOf1RmFromReps(r, idx);
  return pct > 0 && pct <= 100;
}

export function percentOf1RmFromReps(reps: number, formulaIndex: number): number {
  const r = clampReps(reps);
  const idx = normalizeFormulaIndex(formulaIndex);
  if (idx === 1) return pctFormulaBFromReps(r);
  if (idx === 2) return pctFormulaCFromReps(r);
  return pctFormulaAFromReps(r);
}

export function repsFromPercentOf1Rm(pct: number, formulaIndex: number): number {
  const idx = normalizeFormulaIndex(formulaIndex);
  if (idx === 1) return repsFormulaBFromPct(pct);
  if (idx === 2) return repsFormulaCFromPct(pct);
  return repsFormulaAFromPct(pct);
}

export function formatPercentLoad1MRFromReps(reps: number, formulaIndex: number): string {
  const pct = percentOf1RmFromReps(reps, formulaIndex);
  return `≈ ${pct}%`;
}
